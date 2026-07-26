# ARES-7 Demo Scenario Simulator

This deterministic simulator demonstrates Cognitive Continuity during a Martian lava-tube survey. It uses only Continuum's public REST API; it never imports Prisma or accesses CockroachDB.

## Run

Start the API against the seeded database, copy `.env.example` to `.env`, and set `MISSION_ID` to the UUID of ARES-7. Then run:

```bash
pnpm --filter @continuum/simulator demo
```

Use a new `SIMULATOR_RUN_ID` when repeating a demo against the same database because agent handles are unique. The same configuration always produces the same request sequence and logs.

## Scenario

The simulator registers Navigation, Science, Power, and Communications agents. It records initial observations, detects unstable terrain, convenes and resolves a route debate, executes a safe-route decision, fails Navigation permanently, creates a replacement, retrieves curated Mission Context, records a continuity lesson, promotes it to Operational Knowledge, and generates a Mission Snapshot.

All observations, hazards, reasoning, debates, decisions, and lessons invoke their domain endpoints, which automatically record Memory Capsules. The replacement receives curated context via `GET /missions/:missionId/agents/:agentId/context` and does not replay the timeline.
