#!/usr/bin/env bash
# Lista rulesets activos y reglas que aplican a main.
set -euo pipefail

OWNER="${GITHUB_OWNER:-mauriciosoyastor}"
REPO="${GITHUB_REPO:-servigas}"

echo "=== Rulesets en ${OWNER}/${REPO} ==="
gh api "repos/${OWNER}/${REPO}/rulesets" --jq '.[] | {id, name, enforcement, target}'

echo ""
echo "=== Reglas activas en refs/heads/main ==="
gh api "repos/${OWNER}/${REPO}/rules/branches/main" --jq '.[] | {type, parameters}' 2>/dev/null || echo "(ninguna — ruleset aún no aplicado o sin permisos de lectura)"
