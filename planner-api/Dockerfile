FROM node:22-alpine AS build
WORKDIR /app

COPY . .

RUN npm ci
RUN npm run -w shared-schemas build \
  && npm run -w interop-cad/dxf-export build \
  && npm run -w interop-cad/dxf-import build \
  && npm run -w interop-sketchup/skp-import build \
  && npm run -w planner-api db:generate \
  && npm run -w planner-api build \
  && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared-schemas ./shared-schemas
COPY --from=build /app/interop-cad ./interop-cad
COPY --from=build /app/interop-sketchup ./interop-sketchup
COPY --from=build /app/planner-api ./planner-api

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "planner-api"]