# Plan — Create/archive partners Astro

## Tasks

- [x] TDD `record-writes` create/archive defs (customers + vendors)
- [x] TDD adapter `createRecord` / `archiveRecord`
- [x] API `action: create|update|archive`
- [x] UI create pages + list CTA + archive button
- [x] Suite + smoke create cliente

## Seams

| Seam | Test |
|------|------|
| Allowlist | createFields, defaults, archive flag |
| Adapter | create → id; archive → write active=false |
| API | 401; create returns id; unknown slug 404 |
| UI | `/new`, CTA, archive control |

## Smoke

- Create cliente → id 7, ficha con **Archivar**
- Archive → `{ ok: true }`
- Create proveedor → id 8
