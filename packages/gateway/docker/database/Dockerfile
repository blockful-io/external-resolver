FROM node:18 AS base

FROM base AS builder
WORKDIR /app
COPY . .
RUN npx turbo@1.13.3 prune @blockful/gateway --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
WORKDIR /app
# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY package-lock.json package-lock.json
COPY --from=builder /app/out/json/ .
RUN npm install

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN npx turbo@1.13.3 build --filter=@blockful/gateway...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs
USER expressjs
COPY --from=installer /app .

EXPOSE 3000
CMD node packages/gateway/dist/database.js
