# Contributing to OKP

Thanks for your interest in contributing to OpenKitchenPlanner.

## Quick Start (First PR in ~30 minutes)

1. Pick an issue labeled `good first issue`.
2. Comment on the issue that you are taking it.
3. Create a branch from `main`.
4. Implement only the scoped change.
5. Run the relevant test command from the issue.
6. Open a PR with the PR template checklist completed.

## Prerequisites

- Node.js `20+`
- npm `10+`
- Git

## Local Setup

```bash
git clone https://github.com/DKFuH/OKP.git
cd OKP
npm install
npm run db:generate --workspace planner-api
npm run build --workspace planner-api
```

## Development Workflow

1. Create or pick an issue first.
2. Use a focused branch name:
   - `feat/<short-topic>`
   - `fix/<short-topic>`
   - `docs/<short-topic>`
3. Keep changes small and reviewable.
4. Add tests for behavior changes.
5. Update docs when API, workflow, or setup changes.
6. Open one PR per concern.

## Engineering Rules

- Language in code and commits: English.
- TypeScript strict mode is mandatory.
- Avoid `any` unless justified in code comments.
- Validate API payloads with `zod`.
- Keep tenant scoping explicit for backend routes.
- Add or adjust Vitest tests for new behavior.

## Validation Checklist Before PR

Run what is relevant for your change:

```bash
npm run test --workspace planner-api -- <target-test-file>
npm run build --workspace planner-api
```

For Prisma schema changes:

```bash
npm run db:generate --workspace planner-api
```

## Commit Style

Use Conventional Commits:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`

## Pull Request Expectations

- Reference the issue (`Closes #123`).
- Explain what changed and why.
- Include exact test/build commands you ran.
- Call out risks and follow-ups.
- Keep unrelated changes out of scope.

## Starter Tasks

See ready-to-pick tasks:
- `Docs/GOOD_FIRST_ISSUES.md`

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree your contributions are licensed under [Apache License 2.0](LICENSE).
