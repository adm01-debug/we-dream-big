#!/usr/bin/env bash
# =====================================================================
# run_all.sh — Executa os blocos do supabase-export na ordem correta
# =====================================================================
# Uso:
#   ./run_all.sh "postgresql://user:pass@host:5432/postgres"
#   DATABASE_URL=postgresql://... ./run_all.sh
#
# Flags:
#   --dry-run       Mostra a ordem sem executar
#   --from N        Começa a partir do bloco N (1..11)
#   --only N        Executa apenas o bloco N
#   --stop-on-error Para no primeiro erro (default: continua)
#   --resume        Continua a partir do último bloco bem-sucedido
#                   (lê /tmp/_block_<N>.ok + /tmp/_block_<N>.log).
#                   Conflita com --from / --only.
#   --reset         Apaga marcadores /tmp/_block_*.ok e /tmp/_block_*.log
#                   antes de rodar (recomeça do zero).
# =====================================================================
set -u
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=0
FROM=1
ONLY=0
STOP_ON_ERROR=0
RESUME=0
RESET=0
DB_URL="${DATABASE_URL:-}"

# --- Ordem de execução (respeita dependências) ---------------------
# 8  → extensions   (base de tudo: pgcrypto, pg_cron, pg_net, etc)
# 2  → types        (enums consumidos por tabelas/funcs)
# 1  → tables + indexes + RLS enable
# 4  → functions    (incl. SECURITY DEFINER usadas em triggers/policies)
# 5  → triggers     (dependem de funcs do bloco 4)
# 7  → sequences    (ajustes de start/restart, se houver)
# 6  → views        (dependem de tabelas/funcs)
# 3  → policies     (RLS — dependem de funcs has_role etc)
# 9  → storage      (buckets + policies)
# 10 → realtime     (publication supabase_realtime)
# 11 → cron jobs    (templates — geralmente comentados)
ORDER=(8 2 1 4 5 7 6 3 9 10 11)

declare -A FILES=(
  [1]="block01_tables_indexes_rls.sql"
  [2]="block02_types.sql"
  [3]="block03_policies.sql"
  [4]="block04_functions.sql"
  [5]="block05_triggers.sql"
  [6]="block06_views.sql"
  [7]="block07_sequences.sql"
  [8]="block08_extensions.sql"
  [9]="block09_storage.sql"
  [10]="block10_realtime.sql"
  [11]="block11_cron_jobs.sql"
)

# --- Parse args ----------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)        DRY_RUN=1; shift ;;
    --stop-on-error)  STOP_ON_ERROR=1; shift ;;
    --from)           FROM="$2"; shift 2 ;;
    --only)           ONLY="$2"; shift 2 ;;
    --resume)         RESUME=1; shift ;;
    --reset)          RESET=1; shift ;;
    -h|--help)
      sed -n '2,21p' "$0"; exit 0 ;;
    postgresql://*|postgres://*)
      DB_URL="$1"; shift ;;
    *)
      echo "Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

if [[ $RESUME -eq 1 && ( $ONLY -gt 0 || $FROM -ne 1 ) ]]; then
  echo "❌ --resume não pode ser combinado com --from / --only" >&2
  exit 2
fi

# --- Reset opcional ------------------------------------------------
if [[ $RESET -eq 1 ]]; then
  rm -f /tmp/_block_*.log /tmp/_block_*.ok
  echo "🧹 marcadores /tmp/_block_*.{log,ok} removidos"
fi

# --- Resume: detecta último bloco OK e ajusta posição inicial -----
# Um bloco é considerado bem-sucedido quando existe /tmp/_block_<N>.ok.
# Para retro-compatibilidade (execuções antigas sem .ok), aceitamos
# também .log SEM a string "ERROR:" como sucesso.
is_block_ok() {
  local n=$1
  [[ -f "/tmp/_block_${n}.ok" ]] && return 0
  [[ -f "/tmp/_block_${n}.log" ]] && ! grep -q "^ERROR:" "/tmp/_block_${n}.log" && return 0
  return 1
}

RESUME_SKIP_SET=""
if [[ $RESUME -eq 1 ]]; then
  echo "🔁 modo --resume — varrendo logs anteriores em /tmp/_block_*.log…"
  last_ok_pos=-1
  for i in "${!ORDER[@]}"; do
    n="${ORDER[$i]}"
    if is_block_ok "$n"; then
      RESUME_SKIP_SET="${RESUME_SKIP_SET} $n"
      last_ok_pos=$i
      printf "    ✓ bloco %02d já concluído\n" "$n"
    fi
  done
  if [[ $last_ok_pos -lt 0 ]]; then
    echo "    (nenhum bloco bem-sucedido encontrado — começando do início)"
  else
    next_pos=$((last_ok_pos + 1))
    if [[ $next_pos -ge ${#ORDER[@]} ]]; then
      echo "✅ todos os blocos já foram executados com sucesso. Use --reset para refazer."
      exit 0
    fi
    echo "    ▶ retomando a partir do bloco ${ORDER[$next_pos]}"
  fi
  echo
fi

if [[ $DRY_RUN -eq 0 && -z "$DB_URL" ]]; then
  echo "❌ DATABASE_URL não definida. Passe a URL como argumento ou via env." >&2
  exit 2
fi

command -v psql >/dev/null 2>&1 || { echo "❌ psql não encontrado no PATH" >&2; exit 2; }

# --- Preflight: env vars + conexão ---------------------------------
# Valida formato da URL, tenta conectar e checa permissões mínimas
# (CREATE em public + leitura de pg_publication) ANTES de tocar nos
# blocos. Falha cedo com mensagem acionável.
preflight() {
  echo "🔎 preflight — validando env e conexão…"

  # 1) Formato da URL
  if [[ ! "$DB_URL" =~ ^postgres(ql)?:// ]]; then
    echo "    ❌ DATABASE_URL inválida (esperado postgres:// ou postgresql://)" >&2
    return 1
  fi

  # 2) Heurística: avisa se a URL contém placeholders óbvios
  if [[ "$DB_URL" == *"<SENHA>"* || "$DB_URL" == *"<PROJECT_REF>"* || "$DB_URL" == *"YOUR_"* ]]; then
    echo "    ❌ DATABASE_URL contém placeholders não substituídos (<SENHA>, <PROJECT_REF>, YOUR_…)" >&2
    return 1
  fi

  # 3) Mascara senha para log seguro
  masked="$(printf '%s' "$DB_URL" | sed -E 's#(://[^:]+:)[^@]+(@)#\1********\2#')"
  echo "    • alvo: $masked"

  # 4) Conectividade + identidade do servidor
  local info
  if ! info=$(psql "$DB_URL" -Atc \
        "select current_database()||'|'||current_user||'|'||inet_server_addr()||'|'||current_setting('server_version')" \
        2>/tmp/_preflight.err); then
    echo "    ❌ não foi possível conectar. Detalhes:" >&2
    sed 's/^/       /' /tmp/_preflight.err >&2
    return 1
  fi
  IFS='|' read -r db usr host pgver <<<"$info"
  echo "    • conectado: db=$db user=$usr host=${host:-?} pg=$pgver"

  # 5) Permissões mínimas — CREATE no schema public
  if ! psql "$DB_URL" -Atc "select has_schema_privilege(current_user,'public','CREATE')" \
        2>/dev/null | grep -qx 't'; then
    echo "    ❌ usuário '$usr' não tem CREATE em schema public (necessário para tables/funcs)" >&2
    return 1
  fi
  echo "    • permissão CREATE em public ✓"

  # 6) Acesso a catálogos de Realtime (não bloqueia, apenas avisa)
  if ! psql "$DB_URL" -Atc \
        "select 1 from pg_publication where pubname='supabase_realtime'" \
        2>/dev/null | grep -qx '1'; then
    echo "    ⚠️  publication 'supabase_realtime' não existe ainda (será criada pelo bloco 10 se aplicável)"
  else
    echo "    • publication supabase_realtime ✓"
  fi

  # 7) Avisa se DATABASE_URL aponta pra localhost mas o ref do projeto sugere remoto
  if [[ "$DB_URL" == *"@localhost"* || "$DB_URL" == *"@127.0.0.1"* ]]; then
    echo "    ⚠️  você está conectando em localhost — confirme que é o destino correto"
  fi

  echo "    ✅ preflight ok"
  echo
  return 0
}

if [[ $DRY_RUN -eq 0 ]]; then
  if ! preflight; then
    echo >&2
    echo "🛑 abortado no preflight. Corrija os itens acima e rode novamente." >&2
    echo "    Dica: ./run_all.sh --dry-run para inspecionar a ordem sem conectar." >&2
    exit 2
  fi
fi

# --- Execução ------------------------------------------------------
echo "📦 supabase-export — execução em ordem"
echo "    diretório: $SCRIPT_DIR"
[[ $DRY_RUN -eq 1 ]] && echo "    modo: DRY-RUN (nada será executado)"
echo

# Relatório consolidado: status por bloco, duração, log path
declare -A R_STATUS R_DURATION R_LOG R_SIZE
RUN_START_EPOCH=$(date +%s)
RUN_START_HUMAN=$(date '+%Y-%m-%d %H:%M:%S %Z')

# Helper: format ms -> "1m23.4s" / "456ms"
fmt_ms() {
  local ms=$1
  if (( ms < 1000 )); then printf "%dms" "$ms"
  elif (( ms < 60000 )); then awk -v ms="$ms" 'BEGIN{printf "%.2fs", ms/1000}'
  else awk -v ms="$ms" 'BEGIN{m=int(ms/60000); s=(ms%60000)/1000; printf "%dm%05.2fs", m, s}'
  fi
}

OK=0; FAIL=0; SKIP=0
for n in "${ORDER[@]}"; do
  if [[ $ONLY -gt 0 && $n -ne $ONLY ]]; then R_STATUS[$n]="filtered"; continue; fi
  if [[ $n -lt $FROM ]]; then R_STATUS[$n]="filtered"; continue; fi
  if [[ $RESUME -eq 1 && " $RESUME_SKIP_SET " == *" $n "* ]]; then
    printf "⏭️  Bloco %02d — já concluído anteriormente (resume)\n" "$n"
    R_STATUS[$n]="resumed"
    R_LOG[$n]="/tmp/_block_${n}.log"
    SKIP=$((SKIP+1))
    continue
  fi

  file="${FILES[$n]}"
  path="$SCRIPT_DIR/$file"
  label=$(printf "Bloco %02d" "$n")

  if [[ ! -f "$path" ]]; then
    echo "⚠️  $label — $file NÃO ENCONTRADO (skip)"
    R_STATUS[$n]="missing"
    SKIP=$((SKIP+1))
    continue
  fi

  size=$(wc -c < "$path" | tr -d ' ')
  R_SIZE[$n]="$size"
  echo "▶️  $label — $file (${size} bytes)"

  if [[ $DRY_RUN -eq 1 ]]; then
    R_STATUS[$n]="dry-run"; OK=$((OK+1)); continue
  fi

  start_ms=$(date +%s%3N 2>/dev/null || echo $(( $(date +%s) * 1000 )))
  if psql "$DB_URL" \
       --set=ON_ERROR_STOP=on \
       --single-transaction \
       -v ON_ERROR_STOP=1 \
       -f "$path" >/tmp/_block_${n}.log 2>&1; then
    end_ms=$(date +%s%3N 2>/dev/null || echo $(( $(date +%s) * 1000 )))
    dur=$(( end_ms - start_ms ))
    R_STATUS[$n]="ok"; R_DURATION[$n]="$dur"; R_LOG[$n]="/tmp/_block_${n}.log"
    echo "    ✅ ok ($(fmt_ms $dur))"
    : > "/tmp/_block_${n}.ok"
    OK=$((OK+1))
  else
    end_ms=$(date +%s%3N 2>/dev/null || echo $(( $(date +%s) * 1000 )))
    dur=$(( end_ms - start_ms ))
    R_STATUS[$n]="failed"; R_DURATION[$n]="$dur"; R_LOG[$n]="/tmp/_block_${n}.log"
    echo "    ❌ FALHOU — log: /tmp/_block_${n}.log"
    rm -f "/tmp/_block_${n}.ok"
    tail -n 20 /tmp/_block_${n}.log | sed 's/^/       /'
    FAIL=$((FAIL+1))
    [[ $STOP_ON_ERROR -eq 1 ]] && { echo; echo "🛑 abortado (--stop-on-error)"; exit 1; }
  fi
done

RUN_END_EPOCH=$(date +%s)
TOTAL_S=$(( RUN_END_EPOCH - RUN_START_EPOCH ))

# --- Relatório consolidado ----------------------------------------
echo
echo "═══════════════════════════════════════════════════════════════════"
echo "  📊 Relatório consolidado — supabase-export"
echo "═══════════════════════════════════════════════════════════════════"
printf "  Início : %s\n" "$RUN_START_HUMAN"
printf "  Fim    : %s\n" "$(date '+%Y-%m-%d %H:%M:%S %Z')"
printf "  Total  : %dm%02ds\n" $((TOTAL_S/60)) $((TOTAL_S%60))
[[ $DRY_RUN -eq 1 ]] && echo "  Modo   : DRY-RUN"
echo "  ───────────────────────────────────────────────────────────────"
printf "  %-9s %-10s %-12s %-10s %s\n" "Bloco" "Status" "Duração" "Tamanho" "Log"
echo "  ───────────────────────────────────────────────────────────────"
for n in "${ORDER[@]}"; do
  st="${R_STATUS[$n]:-skipped}"
  case "$st" in
    ok)        icon="✅" ;;
    failed)    icon="❌" ;;
    resumed)   icon="⏭️ " ;;
    missing)   icon="⚠️ " ;;
    filtered)  continue ;;  # não exibe blocos filtrados por --from/--only
    dry-run)   icon="🟦" ;;
    *)         icon="·"  ;;
  esac
  dur="${R_DURATION[$n]:-}"
  dur_fmt=$([[ -n "$dur" ]] && fmt_ms "$dur" || echo "—")
  size="${R_SIZE[$n]:-—}"
  [[ "$size" != "—" ]] && size="${size}B"
  log="${R_LOG[$n]:-—}"
  printf "  %s %-7s %-10s %-12s %-10s %s\n" \
    "$icon" "$(printf 'Bl %02d' "$n")" "$st" "$dur_fmt" "$size" "$log"
done
echo "  ───────────────────────────────────────────────────────────────"
printf "  ✅ ok: %d   ❌ falhou: %d   ⚠️  skip: %d\n" "$OK" "$FAIL" "$SKIP"
echo "═══════════════════════════════════════════════════════════════════"

# Persiste relatório legível em arquivo (e JSON para parsing)
REPORT_TXT="/tmp/supabase-export-report.txt"
REPORT_JSON="/tmp/supabase-export-report.json"
{
  echo "supabase-export — relatório"
  echo "início: $RUN_START_HUMAN"
  echo "total : ${TOTAL_S}s"
  echo "ok=$OK fail=$FAIL skip=$SKIP"
  echo
  for n in "${ORDER[@]}"; do
    st="${R_STATUS[$n]:-skipped}"
    [[ "$st" == "filtered" ]] && continue
    printf "Bloco %02d  %-8s  %-10s  %s\n" \
      "$n" "$st" "${R_DURATION[$n]:-}ms" "${R_LOG[$n]:-}"
  done
} > "$REPORT_TXT"

{
  printf '{"started_at":"%s","total_seconds":%d,"ok":%d,"failed":%d,"skipped":%d,"blocks":[' \
    "$RUN_START_HUMAN" "$TOTAL_S" "$OK" "$FAIL" "$SKIP"
  first=1
  for n in "${ORDER[@]}"; do
    st="${R_STATUS[$n]:-skipped}"
    [[ "$st" == "filtered" ]] && continue
    [[ $first -eq 1 ]] || printf ','
    first=0
    printf '{"block":%d,"file":"%s","status":"%s","duration_ms":%s,"log":"%s"}' \
      "$n" "${FILES[$n]}" "$st" "${R_DURATION[$n]:-null}" "${R_LOG[$n]:-}"
  done
  printf ']}\n'
} > "$REPORT_JSON"

echo "  📝 relatório salvo em:"
echo "     • $REPORT_TXT"
echo "     • $REPORT_JSON"
echo

[[ $FAIL -gt 0 ]] && exit 1 || exit 0
