#!/usr/bin/env bash
# Aplica el ruleset de protección de main vía GitHub REST API.
# Requiere: gh CLI autenticado con permisos admin en el repositorio.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OWNER="${GITHUB_OWNER:-mauriciosoyastor}"
REPO="${GITHUB_REPO:-servigas}"
RULESET="${RULESET_FILE:-${SCRIPT_DIR}/rulesets/main-protection.json}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI no está instalado." >&2
  exit 1
fi

if [[ ! -f "$RULESET" ]]; then
  echo "Error: no se encontró el ruleset en $RULESET" >&2
  exit 1
fi

echo "Aplicando ruleset desde $RULESET en ${OWNER}/${REPO}..."

EXISTING_ID="$(gh api "repos/${OWNER}/${REPO}/rulesets" --jq '.[] | select(.name == "Protección main — Servigas") | .id' 2>/dev/null || true)"

if [[ -n "$EXISTING_ID" ]]; then
  echo "Ruleset existente (id=${EXISTING_ID}). Actualizando..."
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    --input "$RULESET" \
    "repos/${OWNER}/${REPO}/rulesets/${EXISTING_ID}"
else
  echo "Creando ruleset nuevo..."
  gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    --input "$RULESET" \
    "repos/${OWNER}/${REPO}/rulesets"
fi

echo "Listo. Verificá con: ${SCRIPT_DIR}/verify-rulesets.sh"
