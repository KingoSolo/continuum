# Continuum Mission Control

Mission Control is the operator-facing Next.js interface for the ARES-7 lava-tube survey. It is an aerospace-style operational surface, not an admin dashboard.

## Run

Set the public API URL and seeded ARES-7 UUID in `.env` (see `.env.example`), then start the API and run:

```bash
pnpm --filter @continuum/web dev
```

## Demo

Select **Start Demo** to run the deterministic ARES-7 event sequence through the public REST API. The screen polls the Mission Timeline, Mission Context, and Operational Knowledge endpoints while the scenario progresses. It visualises the Navigation Agent failure, replacement registration, context handoff, route continuation, lesson promotion, and snapshot creation.

The UI does not access CockroachDB or Prisma. Static mission labels and the code-native Mars terrain treatment are presentation placeholders where the current public API does not expose overview or map data.

## Structure

- `src/components` — layout, timeline, agents, mission, replay, and common composition
- `src/hooks` — live Mission Control orchestration and query refresh
- `src/services` — REST API boundary
- `src/types` — UI-facing contracts
