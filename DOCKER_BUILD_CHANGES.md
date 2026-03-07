# Docker Build Changes for OKP

## Summary

This change fixes monorepo Docker builds for `planner-api` by:

- building from repository root (`context: .`)
- installing workspace dependencies with `npm install --workspaces`
- compiling required workspace libraries before API startup
- switching to `node:22-slim` and installing `openssl` for Prisma runtime
- running API commands via workspace selector (`--workspace=planner-api`)

## Changed Files

- `planner-api/Dockerfile.dev`
- `docker-compose.yml`

## Why

The previous setup built only from `planner-api`, which excluded workspace
packages and caused runtime module resolution failures. The Alpine image also
missed OpenSSL requirements for Prisma in this setup.

## Validation Checklist

1. `docker-compose build api`
2. `docker-compose up -d`
3. `docker-compose logs -f api`
4. `docker-compose exec -T api curl http://localhost:3000/health`
5. `docker-compose exec postgres psql -U okp -d okp -c "\dt"`

## Notes

- `volumes` for the API service are intentionally disabled to avoid host mounts
  shadowing built `node_modules` and workspace symlinks during this workflow.
- This Dockerfile is development-oriented (`npm run dev` entrypoint).
