#!/usr/bin/env bash
# =====================================================================
# diff_validation.sh — comparador de validação SQL entre ambientes
# =====================================================================
# Roda um arquivo .sql de validação (ex.: block16_auth_hooks_validation.sql,
# block11_cron_status_report.sql, block18_realtime_diagnostics.sql) contra
# 2+ ambientes e produz um diff side-by-side destacando linhas cujo
# status (OK/MISSING/WARN/FAIL) difere entre os ambientes.
#
# Uso:
#   ./diff_validation.sh <arquivo.sql> <env1=DSN1> <env2=DSN2> [env3=DSN3 ...]
#
# Exemplo:
#   ./diff_validation.sh ../block16_auth_hooks_validation.sql \
#       dev="$DEV_URL" staging="$STAGING_URL" prod="$PROD_URL"
#
# Saída: tabela em /tmp/diff_validation_<ts>/ + relatório no stdout.
# Exit code: 0 se todos os ambientes coincidem, 1 se há divergências,
# 2 em erro de uso, 3 em erro de psql.
# =====================================================================
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "uso: $0 <arquivo.sql> <env1=DSN1> <env2=DSN2> [env3=DSN3 ...]" >&2
  exit 2
fi

SQL_FILE="$1"; shift
[[ -r "$SQL_FILE" ]] || { echo "erro: arquivo SQL '$SQL_FILE' não legível" >&2; exit 2; }
command -v psql >/dev/null || { echo "erro: psql não encontrado no PATH" >&2; exit 2; }

TS=$(date +%Y%m%d_%H%M%S)
OUT_DIR="/tmp/diff_validation_${TS}"
mkdir -p "$OUT_DIR"

declare -a ENV_NAMES=()

# --- 1) Roda o SQL em cada ambiente, captura saída tab-separated ---
for arg in "$@"; do
  name="${arg%%=*}"
  dsn="${arg#*=}"
  if [[ -z "$name" || -z "$dsn" || "$name" == "$arg" ]]; then
    echo "erro: argumento inválido '$arg' (esperado nome=DSN)" >&2; exit 2
  fi
  ENV_NAMES+=("$name")
  out="$OUT_DIR/${name}.tsv"
  echo "▶ rodando em $name …" >&2
  # -A tuples-only sem alinhar; -F\t separador tab; -P pager=off; -X ignora .psqlrc
  if ! psql "$dsn" -X -A -t -F $'\t' -P pager=off \
        -v ON_ERROR_STOP=1 -f "$SQL_FILE" > "$out" 2> "$OUT_DIR/${name}.err"; then
    echo "❌ psql falhou em '$name' — veja $OUT_DIR/${name}.err" >&2
    exit 3
  fi
done

# --- 2) Normaliza: extrai apenas linhas "STATUS<TAB>chave..." ---
# Convenção: 1ª coluna é status (OK|MISSING|WARN|FAIL), 2ª coluna é a chave
# que identifica o item (table_name, hook_name, etc). Linhas que não casam
# são ignoradas (echo de seções, contagens etc).
STATUS_RE='^(OK|MISSING|WARN|FAIL|ERROR)\t'
for name in "${ENV_NAMES[@]}"; do
  grep -E "$STATUS_RE" "$OUT_DIR/${name}.tsv" \
    | awk -F'\t' '{print $2 "\t" $1}' \
    | sort -k1,1 > "$OUT_DIR/${name}.norm"
done

# --- 3) Une todas as chaves observadas em qualquer ambiente ---
cat "$OUT_DIR"/*.norm | awk -F'\t' '{print $1}' | sort -u > "$OUT_DIR/_keys.txt"

# --- 4) Monta tabela: chave | status_env1 | status_env2 | … | DIFF? ---
report="$OUT_DIR/report.tsv"
{
  printf "key"
  for n in "${ENV_NAMES[@]}"; do printf "\t%s" "$n"; done
  printf "\tdiff\n"

  while IFS= read -r key; do
    line="$key"
    declare -A vals=()
    for n in "${ENV_NAMES[@]}"; do
      v=$(awk -F'\t' -v k="$key" '$1==k{print $2; exit}' "$OUT_DIR/${n}.norm")
      [[ -z "$v" ]] && v="ABSENT"
      vals[$n]="$v"
      line+=$'\t'"$v"
    done
    # diff = 'YES' se algum status difere de outro, senão 'no'
    first=""; diff="no"
    for n in "${ENV_NAMES[@]}"; do
      if [[ -z "$first" ]]; then first="${vals[$n]}"; continue; fi
      [[ "${vals[$n]}" != "$first" ]] && { diff="YES"; break; }
    done
    line+=$'\t'"$diff"
    echo "$line"
  done < "$OUT_DIR/_keys.txt"
} > "$report"

# --- 5) Render legível no stdout (column -t) ---
echo
echo "=========================================================="
echo "  Comparação de validação — $SQL_FILE"
echo "  Ambientes: ${ENV_NAMES[*]}"
echo "  Saída completa: $report"
echo "=========================================================="
column -t -s $'\t' "$report" | awk '
  NR==1 { print; next }
  $NF=="YES" { printf "\033[31m%s\033[0m\n", $0; next }   # vermelho p/ divergência
  $NF=="no"  { printf "\033[32m%s\033[0m\n", $0; next }   # verde p/ igual
  { print }
'

# --- 6) Resumo + exit code ---
total=$(wc -l < "$OUT_DIR/_keys.txt")
diffs=$(awk -F'\t' 'NR>1 && $NF=="YES"' "$report" | wc -l)

echo
echo "→ $total chave(s) verificada(s) | $diffs divergente(s)"

if [[ $diffs -gt 0 ]]; then
  echo "❌ ambientes divergem — investigue as linhas em vermelho"
  exit 1
fi
echo "✅ todos os ambientes coincidem"
exit 0
