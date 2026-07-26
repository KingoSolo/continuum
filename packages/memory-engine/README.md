# @continuum/memory-engine

Framework-agnostic persistence service for Cognitive Continuity. It depends only on Prisma Client and returns typed `Result` values.

## Public methods

- `recordMemoryCapsule` — validates a supported source artifact and persists its capsule.
- `buildMissionContext` — curates and persists a new current Mission Context.
- `generateMissionSnapshot` — publishes an immutable capsule selection for handoff.
- `retrieveMissionTimeline` — returns chronological capsules for Mission Replay.
- `retrieveContextForAgent` — returns the current context for an active assignment.
- `retrieveOperationalKnowledge` — returns active, admitted Knowledge Vault lessons using relational queries.
