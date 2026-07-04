# Protección de rama `main` — GitHub Rulesets

Configuración versionada para que `main` no reciba pushes directos ni force-push, y solo se actualice vía pull request.

## Reglas incluidas

| Regla | Efecto |
|-------|--------|
| **Restrict deletions** (`deletion`) | Impide borrar `main` |
| **Block force pushes** (`non_fast_forward`) | Impide reescribir historial |
| **Require pull request** (`pull_request`) | Merge solo por PR con 1 aprobación, resolución de conversaciones y descarte de reviews obsoletas |

> **Nota:** Los *status checks* de CI no están incluidos todavía porque el repo aún no tiene workflows. Cuando existan, agregar la regla `required_status_checks` al JSON (ver bitácora A8).

## Aplicar por script (recomendado)

Desde la raíz del repo, con `gh` autenticado como **admin** del repositorio:

```bash
chmod +x infra/github/apply-rulesets.sh infra/github/verify-rulesets.sh
./infra/github/apply-rulesets.sh
./infra/github/verify-rulesets.sh
```

Variables opcionales:

```bash
GITHUB_OWNER=mauriciosoyastor GITHUB_REPO=servigas ./infra/github/apply-rulesets.sh
```

## Aplicar manualmente en GitHub (UI)

Si preferís la pantalla de **Settings → Rules → Rulesets → New branch ruleset**:

1. **Ruleset Name:** `Protección main — Servigas`
2. **Enforcement status:** `Active`
3. **Bypass list:** vacío (solo admins del repo pueden omitir reglas por defecto)
4. **Target branches → Branch targeting criteria:** `Include by pattern` → `main`
5. **Rules:**
   - Restrict deletions
   - Block force pushes
   - Require a pull request before merging
     - Required approvals: **1**
     - Dismiss stale pull request approvals when new commits are pushed: **sí**
     - Require conversation resolution before merging: **sí**
6. Guardar

## Archivos

| Archivo | Uso |
|---------|-----|
| `rulesets/main-protection.json` | Payload para la API de GitHub |
| `apply-rulesets.sh` | Crea o actualiza el ruleset |
| `verify-rulesets.sh` | Comprueba que las reglas estén activas |

## Futuro: status checks

Cuando exista CI (p. ej. lint en `web/` o tests Odoo), extender `main-protection.json`:

```json
{
  "type": "required_status_checks",
  "parameters": {
    "strict_required_status_checks_policy": true,
    "required_status_checks": [
      { "context": "nombre-del-check" }
    ]
  }
}
```
