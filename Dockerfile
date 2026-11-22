FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS node

FROM node AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm i -g --ignore-scripts "$(node -p "require('./package.json').packageManager")" \
    && pnpm install --frozen-lockfile
COPY . .
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
ENV NEXT_TELEMETRY_DISABLED=1
# The secret is a placeholder for lib/env.ts. The strip is by hand because Turbopack ignores
# outputFileTracingExcludes.
RUN AUTH_SECRET=insecure-build-time-placeholder pnpm build \
    && rm -rf .next/standalone/node_modules/@typescript .next/standalone/node_modules/typescript \
    && find .next/standalone \
        \( -name '*.test.ts' -o -name '*.d.ts' -o -name '*.d.cts' -o -name '*.d.mts' -o -name '*.map' \) \
        -delete

FROM node
WORKDIR /app
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
