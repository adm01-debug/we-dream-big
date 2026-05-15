#!/usr/bin/env bash
# =====================================================================
# run_blocks.sh — Executa os blocos do supabase-export na ORDEM DO README
#                 e ABORTA no primeiro erro (fail-fast).
# =====================================================================
# Diferenças vs. run_all.sh:
#   - Versão minimalista, sem flags exóticas
#   - Sempre fail-fast (psql --single-transaction + ON_ERROR_STOP=on)
#   - Ordem espelha exatamente o "Diagrama de dependências" do README
#
# Uso:
#   ./run_blocks.sh "postgresql://postgres:<SENHA>@db.<REF>.supabase.co:5432/postgres"
#   DATABASE_URL="postgresql://..." ./run_blocks.sh
#   ./run_blocks.sh --dry-run        # só lista a ordem, não executa
# =====================================================================
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=0
DB_URL="${DATABASE_URL:-}"

# Ordem canônica (= README "Opção B — manual via psql"):
#   08 → 02 → 01 → 04 → 05 → 07 → 06 → 03 → 09 → 10 → 11
ORDER=(
  "block08_extensions.sql"
  "block02_types.sql"
  "block01_tables_indexes_rls.sql"
  "block04_functions.sql"
  "block05_triggers.sql"
  "block07_sequences.sql"
  "block06_views.sql"
  "block03_policies.sql"
  "block09_storage.sql"
  "block10_realtime.sql"
  "block11_cron_jobs.sql"
)

# ---------- args ----------
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    postgres://*|postgresql://*) DB_URL="$arg" ;;
    *) echo "✗ argumento desconhecido: $arg" >&2; exit 2 ;;
  esac
done

# ---------- helpers ----------
c_red()  { printf "\033[31m%s\033[0m" "$*"; }
c_grn()  { printf "\033[32m%s\033[0m" "$*"; }
c_ylw()  { printf "\033[33m%s\033[0m" "$*"; }
c_dim()  { printf "\033[2m%s\033[0m" "$*"; }

# ---------- pre-flight ----------
missing=0
echo "▶ Verificando arquivos em $SCRIPT_DIR …"
for f in "${ORDER[@]}"; do
  if [ -f "$SCRIPT_DIR/$f" ]; then
    printf "  %s %s %s\n" "$(c_grn ✓)" "$f" "$(c_dim "($(wc -c < "$SCRIPT_DIR/$f") bytes)")"
  else
    printf "  %s %s %s\n" "$(c_red ✗)" "$f" "$(c_red "(AUSENTE)")"
    missing=$((missing+1))
  fi
done

if [ "$missing" -gt 0 ]; then
  echo
  c_red "✗ $missing arquivo(s) ausente(s) — abortando."; echo
  echo "  Materialize-os em supabase-export/ antes de rodar."
  exit 3
fi

# ---------- dry-run ----------
if [ "$DRY_RUN" -eq 1 ]; then
  echo
  c_ylw "🔎 DRY-RUN — nenhuma query executada."; echo
  echo "Ordem que SERIA aplicada:"
  i=1; for f in "${ORDER[@]}"; do printf "  %2d. %s\n" "$i" "$f"; i=$((i+1)); done
  exit 0
fi

# ---------- DB URL ----------
if [ -z "$DB_URL" ]; then
  c_red "✗ Faltou DATABASE_URL (ou passe a string como 1º argumento)."; echo
  echo "  Ex: ./run_blocks.sh \"postgresql://postgres:<SENHA>@db.<REF>.supabase.co:5432/postgres\""
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  c_red "✗ psql não encontrado no PATH."; echo
  exit 4
fi

# Sanity: ping
echo
echo "▶ Testando conexão …"
if ! psql "$DB_URL" -tAc "select 1" >/dev/null 2>&1; then
  c_red "✗ Não consegui conectar com a DATABASE_URL fornecida."; echo
  exit 5
fi
c_grn "✓ Conexão OK."; echo

# ---------- execução ----------
mkdir -p /tmp
TS=$(date +%Y%m%d_%H%M%S)
SUMMARY="/tmp/run_blocks_${TS}.summary"
: > "$SUMMARY"

i=1
START_TS=$(date +%s)
for f in "${ORDER[@]}"; do
  step=$(printf "%02d" "$i")
  log="/tmp/run_blocks_${TS}_${step}_${f%.sql}.log"
  printf "\n[%s/%d] ▶ %s  %s\n" "$step" "${#ORDER[@]}" "$f" "$(c_dim "→ log: $log")"

  t0=$(date +%s)
  if psql "$DB_URL" \
        --single-transaction \
        --set ON_ERROR_STOP=on \
        --no-psqlrc \
        --quiet \
        -f "$SCRIPT_DIR/$f" \
        > "$log" 2>&1
  then
    dt=$(( $(date +%s) - t0 ))
    printf "      %s %s\n" "$(c_grn OK)" "$(c_dim "(${dt}s)")"
    echo "OK  ${step} ${f} (${dt}s)" >> "$SUMMARY"
  else
    rc=$?
    dt=$(( $(date +%s) - t0 ))
    printf "      %s %s\n" "$(c_red "FAIL (rc=$rc)")" "$(c_dim "(${dt}s)")"
    echo "FAIL ${step} ${f} (rc=${rc}, ${dt}s)" >> "$SUMMARY"
    echo
    c_red "─── últimas 25 linhas do log ───"; echo
    tail -n 25 "$log"
    echo
    c_red "✗ Abortando — fail-fast ativo."; echo
    echo "  Resumo parcial: $SUMMARY"
    echo "  Log completo:   $log"
    exit "$rc"
  fi
  i=$((i+1))
done

TOTAL=$(( $(date +%s) - START_TS ))
echo
c_grn "✓ Todos os ${#ORDER[@]} blocos aplicados com sucesso em ${TOTAL}s."; echo
echo "  Resumo: $SUMMARY"