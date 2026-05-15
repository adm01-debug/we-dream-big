#!/usr/bin/env bash
# Gera tabela markdown com contagem de objetos + tamanho por bloco
set -euo pipefail
DIR="${1:-supabase-export}"

count() { local n; n=$(grep -ciE "$1" "$2" 2>/dev/null || true); echo "${n:-0}"; }

human_size() {
  local b=$1
  if   [ "$b" -lt 1024 ];   then echo "${b} B"
  elif [ "$b" -lt 1048576 ]; then awk -v b="$b" 'BEGIN{printf "%.1f KB", b/1024}'
  else                            awk -v b="$b" 'BEGIN{printf "%.1f MB", b/1048576}'
  fi
}

declare -A METRIC=(
  [01]="CREATE TABLE|CREATE INDEX|ENABLE ROW LEVEL SECURITY"
  [02]="CREATE TYPE"
  [03]="CREATE POLICY"
  [04]="CREATE (OR REPLACE )?FUNCTION"
  [05]="CREATE TRIGGER"
  [06]="CREATE (OR REPLACE )?(MATERIALIZED )?VIEW"
  [07]="setval|ALTER SEQUENCE"
  [08]="CREATE EXTENSION"
  [09]="CREATE POLICY|storage\.buckets"
  [10]="ALTER PUBLICATION|ADD TABLE"
  [11]="cron\.schedule"
)

declare -A LABEL=(
  [01]="tables / índices / RLS"
  [02]="CREATE TYPE"
  [03]="CREATE POLICY"
  [04]="funções"
  [05]="triggers"
  [06]="views"
  [07]="ajustes de sequence"
  [08]="extensões"
  [09]="policies + buckets"
  [10]="ALTER PUBLICATION"
  [11]="cron.schedule()"
)

printf "| #  | Arquivo | Tamanho | Linhas | Objetos (%s) |\n" "métrica principal"
printf "|----|---------|--------:|-------:|-------------:|\n"

for n in 01 02 03 04 05 06 07 08 09 10 11; do
  f=$(ls "$DIR"/block${n}_*.sql 2>/dev/null | head -1 || true)
  if [ -z "$f" ] || [ ! -f "$f" ]; then
    printf "| %s | _(ausente)_ | — | — | — |\n" "$n"
    continue
  fi
  base=$(basename "$f")
  bytes=$(wc -c < "$f")
  lines=$(wc -l < "$f")
  c=$(count "${METRIC[$n]}" "$f")
  printf "| %s | \`%s\` | %s | %s | %s (%s) |\n" \
    "$n" "$base" "$(human_size "$bytes")" "$lines" "$c" "${LABEL[$n]}"
done
