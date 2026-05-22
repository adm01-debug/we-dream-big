#!/usr/bin/env bash
# ============================================================================
# sentinel-validate-history.sh — auditoria retroativa
#
# Roda o sentinel-check.sh contra os últimos N commits da main.
# Útil quando se altera a lógica do sentinel para garantir que commits
# legítimos antigos ainda passam (zero falso positivo) e que pushes
# diretos antigos continuam sendo detectados (zero falso negativo).
#
# Uso: bash scripts/sentinel-validate-history.sh [N]
# Default: N=30
# ============================================================================

set -euo pipefail

N="${1:-30}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$SCRIPT_DIR/sentinel-check.sh"

if [[ ! -x "$CHECK" ]]; then
  chmod +x "$CHECK"
fi

PASS=0
FAIL=0

printf "%-9s  %-32s  %-10s  %s\n" "SHA" "AUTOR" "VEREDITO" "MOTIVO"
printf "%-9s  %-32s  %-10s  %s\n" "---------" "--------------------------------" "----------" "----------------------"

while read -r SHA; do
  SUBJECT=$(git log -1 --pretty=%s "$SHA")
  FULL_MSG=$(git log -1 --pretty=%B "$SHA")
  AUTHOR=$(git log -1 --pretty=%an "$SHA")

  if RESULT=$(bash "$CHECK" "$SUBJECT" "$FULL_MSG" "$AUTHOR" 2>&1); then
    printf "%-9s  %-32s  %-10s  %s\n" "${SHA:0:7}" "${AUTHOR:0:32}" "✅ PASS" "$RESULT"
    PASS=$((PASS + 1))
  else
    printf "%-9s  %-32s  %-10s  %s\n" "${SHA:0:7}" "${AUTHOR:0:32}" "❌ FAIL" "$RESULT"
    FAIL=$((FAIL + 1))
  fi
done < <(git log -n "$N" --pretty=%H)

echo ""
echo "Total auditado: $((PASS + FAIL))   |   Passou: $PASS   |   Falhou: $FAIL"
