# Good First Issues

Use this list to open `good first issue` tickets quickly.
Each issue below includes scope, Definition of Done (DoD), and validation command.

## 1) Add healthcheck timestamp and version fields

- Title: `api: enrich /health with timestamp and version`
- Labels: `good first issue`, `backend`, `help wanted`
- Scope:
  - `planner-api/src/index.ts`
- DoD:
  - `/health` includes `timestamp` and `version`
  - Existing health behavior stays backward compatible
- Validation:
  - `npm run build --workspace planner-api`

## 2) Add unit tests for workflow guard edge cases

- Title: `test: add workflow guard edge case coverage`
- Labels: `good first issue`, `tests`, `help wanted`
- Scope:
  - `planner-api/src/services/workflowEngineService.ts`
  - `planner-api/src/routes/workflows.test.ts`
- DoD:
  - Add tests for invalid transition and guard mismatch paths
  - No production code behavior regression
- Validation:
  - `npm run test --workspace planner-api -- src/routes/workflows.test.ts`

## 3) Add validation test for masterdata conflict resolution payload

- Title: `test: validate masterdata conflict resolve request`
- Labels: `good first issue`, `tests`, `help wanted`
- Scope:
  - `planner-api/src/routes/masterdata.test.ts`
- DoD:
  - Add negative tests for invalid `resolution` and missing `resolved_by`
- Validation:
  - `npm run test --workspace planner-api -- src/routes/masterdata.test.ts`

## 4) Add process reporting date-range guard

- Title: `api: reject invalid process report date ranges`
- Labels: `good first issue`, `backend`, `help wanted`
- Scope:
  - `planner-api/src/routes/processReporting.ts`
- DoD:
  - Return `400` when `from > to`
  - Add tests covering this validation
- Validation:
  - `npm run test --workspace planner-api -- src/routes/processReporting.test.ts`

## 5) Add integration outbox filter by endpoint_id

- Title: `api: support endpoint_id filter on integrations/outbox`
- Labels: `good first issue`, `backend`, `help wanted`
- Scope:
  - `planner-api/src/routes/integrationHooks.ts`
  - `planner-api/src/routes/integrationHooks.test.ts`
- DoD:
  - New optional query param `endpoint_id`
  - Query applies tenant + endpoint filter correctly
- Validation:
  - `npm run test --workspace planner-api -- src/routes/integrationHooks.test.ts`

## 6) Add mobile notifications unread_only query

- Title: `api: add unread_only filter to mobile notifications`
- Labels: `good first issue`, `backend`, `help wanted`
- Scope:
  - `planner-api/src/routes/mobile.ts`
  - `planner-api/src/routes/mobile.test.ts`
- DoD:
  - Add optional `unread_only=true|false`
  - Keep default behavior unchanged
- Validation:
  - `npm run test --workspace planner-api -- src/routes/mobile.test.ts`

## 7) Add docs section for contribution flow in README

- Title: `docs: add contributor quick flow to README`
- Labels: `good first issue`, `documentation`, `help wanted`
- Scope:
  - `README.md`
  - `CONTRIBUTING.md`
- DoD:
  - README links to CONTRIBUTING and issue templates
  - Keep bilingual style consistent
- Validation:
  - `rg -n "Contributing|Issue Templates|GOOD_FIRST_ISSUES" README.md CONTRIBUTING.md`

## 8) Add route test for OFML ocd invalid xml body

- Title: `test: cover invalid xml payload on /import/ocd`
- Labels: `good first issue`, `tests`, `help wanted`
- Scope:
  - `planner-api/src/routes/orders.test.ts`
- DoD:
  - Add cases for non-string `xml` payload and malformed xml string
- Validation:
  - `npm run test --workspace planner-api -- src/routes/orders.test.ts`

## 9) Add explicit type alias for tenant-aware headers helper

- Title: `refactor: unify tenant-aware request helper types`
- Labels: `good first issue`, `refactor`, `help wanted`
- Scope:
  - `planner-api/src/routes/workflows.ts`
  - `planner-api/src/routes/masterdata.ts`
  - `planner-api/src/routes/processReporting.ts`
  - `planner-api/src/routes/integrationHooks.ts`
- DoD:
  - Introduce shared helper type or utility
  - No behavior change
- Validation:
  - `npm run build --workspace planner-api`

## 10) Add issue template for task execution tickets

- Title: `meta: add issue template for scoped implementation tasks`
- Labels: `good first issue`, `documentation`, `meta`, `help wanted`
- Scope:
  - `.github/ISSUE_TEMPLATE/`
- DoD:
  - New issue template includes scope, DoD, and test command fields
  - Template visible in GitHub issue chooser
- Validation:
  - Check `.github/ISSUE_TEMPLATE/*.yml` contains new template
