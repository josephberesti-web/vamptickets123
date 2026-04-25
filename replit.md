# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/discord-bot run start` — run Discord bot

## Discord Bot

Located at `artifacts/discord-bot/` (CommonJS, discord.js v14).

- Slash commands in `src/commands/` (ban, kick, mute, warn, purge, lock, automod, etc.)
- Event modules in `src/modules/` (auditlog, automod)
- Ticket system + transcript saving in `src/index.js`
- Required secrets: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- Optional config: see `artifacts/discord-bot/.env.example` (channel/role IDs, automod settings)
- Health endpoint runs on `PORT` (default 3030)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
