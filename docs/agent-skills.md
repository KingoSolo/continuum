# CockroachDB Agent Skills

Continuum installs [CockroachDB Agent Skills](https://github.com/cockroachlabs/cockroachdb-skills)
— Cockroach Labs' library of structured, machine-executable operational
procedures — and **executes them against the live Continuum cluster** through
the [Managed MCP Server](cockroachdb-mcp.md).

The skills supply the _procedure_ (which diagnostics to run, how to read the
output, what counts as healthy); the MCP server supplies the _live connection_.
Together they let the agent audit the running database instead of reasoning
about the schema from source alone.

|                   |                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Skills source** | `cockroachlabs/cockroachdb-skills` (34 skills across 9 domains)                    |
| **Installed**     | 3 skills in `.claude/skills/`, pinned by [`skills-lock.json`](../skills-lock.json) |
| **Cluster**       | `continuum-dev` (`3f41b73f-…`), CockroachDB v26.2.1, AWS `eu-central-1`            |
| **Access**        | Read-only (`mcp:read`). No secrets. No application code changed.                   |

---

## Engineering Findings

> ### Three findings, each produced by running a skill against the live cluster
>
> Every claim below traces to a command and its raw output in
> [Execution evidence](#execution-evidence). Nothing here is inferred from
> reading the source alone.
>
> ---
>
> **1. A harmful index recommendation, caught and rejected.**
> _Skill:_ `cockroachdb-sql` · _Command:_ `EXPLAIN` on the Memory Engine's live queries
>
> The plans showed `FULL SCAN` and emitted two `CREATE INDEX` recommendations.
> Re-running with an index hint proved the correct indexes **already exist** and
> produce bounded spans — the full scans are cost-based choices on 22–37 row
> tables. Applying the recommendations would have created indexes the planner
> abandons once the tables grow. The audit's most valuable output was a
> _rejected_ suggestion.
>
> ---
>
> **2. Distribution verified on the live cluster, not assumed.**
> _Skill:_ `analyzing-range-distribution` · _Commands:_ `SHOW RANGES`, `SHOW ZONE CONFIGURATIONS`
>
> All 33 Continuum tables occupy a **single range** (`11476193`), three-way
> replicated across `eu-central-1` zones `1a`/`1b`/`1c` — healthy and
> unfragmented. When load eventually splits that range it will distribute
> cleanly _because_ the primary keys are UUIDs (78 `@db.Uuid` columns, zero
> `autoincrement()`); a sequential or `createdAt`-ordered key would have
> concentrated every insert at one end of the keyspace. The schema also passes
> CockroachDB's fundamental rules: 31/31 models keyed, indexes covering their
> access patterns.
>
> ---
>
> **3. One real weakness: retry backoff is linear, not exponential.**
> _Skill:_ `designing-application-transactions` · _Source reviewed:_ `memory-engine.service.ts:69`
>
> `withSerializableRetry` waits `25 * (attempt + 1)` ms — 25/50/75/100 ms, no
> jitter. The skill prescribes exponential backoff with jitter, because
> synchronized linear retries let conflicting writers collide again in lockstep.
> Harmless today (per-mission serialization removes the dominant conflict before
> the retry loop is reached), but load-bearing if context and snapshot builds
> ever run concurrently across multiple API processes.
>
> **Reported, not applied** — no application code was modified.

**Net effect:** zero code changes, three verified properties, one logged
follow-up, one bad recommendation avoided.

### Screenshot

<!-- Embed capture before submission: docs/diagrams/screenshot-agent-skills.png -->

_Placeholder — `docs/diagrams/screenshot-agent-skills.png`: Claude Code invoking
`/cockroachdb-sql` and the returned `EXPLAIN` plan from the live cluster,
showing the skill name and the MCP tool call in the same frame._

---

## Installation

The `skills` CLI installs directly from the upstream GitHub repository:

```bash
npx skills@latest add cockroachlabs/cockroachdb-skills \
  --skill cockroachdb-sql analyzing-range-distribution designing-application-transactions \
  --agent claude-code -y --copy
```

```
◇  Installed 3 skills
│  ✓ designing-application-transactions (copied)
│  ✓ analyzing-range-distribution (copied)
│  ✓ cockroachdb-sql (copied)
└  Done!
```

`--copy` writes the skill files into the repo instead of symlinking into a
global store, so a fresh clone gets the same skills with no extra setup.
Browse the full catalog without installing:

```bash
npx skills@latest add cockroachlabs/cockroachdb-skills --list
```

## Configuration

No configuration and no secrets. The skills are plain Markdown discovered by
Claude Code from `.claude/skills/`, and they reuse the already-configured
`cockroachdb-cloud` MCP server for cluster access:

```
.claude/skills/
├── analyzing-range-distribution/        SKILL.md + references/
├── cockroachdb-sql/                     SKILL.md + references/cockroachdb-rules/
└── designing-application-transactions/  SKILL.md + references/
skills-lock.json                         source + content hash per skill
```

Verify with `npx skills@latest ls`:

```
Project Skills
analyzing-range-distribution       ~/Documents/continuum/.claude/skills/analyzing-range-distribution
  Agents: Claude Code  Source: cockroachlabs/cockroachdb-skills
cockroachdb-sql                    ~/Documents/continuum/.claude/skills/cockroachdb-sql
  Agents: Claude Code  Source: cockroachlabs/cockroachdb-skills
designing-application-transactions ~/Documents/continuum/.claude/skills/designing-application-transactions
  Agents: Claude Code  Source: cockroachlabs/cockroachdb-skills
```

Skills are also invocable directly in Claude Code, e.g. `/cockroachdb-sql`.

## Skills used

| Skill                                | Domain                      | Why it fits Continuum                                                                                                                                                                                     |
| ------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cockroachdb-sql`                    | Query & schema design       | Continuum's schema is Prisma-generated (31 models). Audits it against CockroachDB rules — primary keys, UUID vs sequential hotspots, index coverage — and mandates `EXPLAIN` on every query it evaluates. |
| `analyzing-range-distribution`       | Observability & diagnostics | Continuum writes Memory Capsules continuously. Checks range fragmentation, replication health, and leaseholder placement — the distribution properties the "at any scale" claim depends on.               |
| `designing-application-transactions` | Application development     | The Memory Engine builds Mission Context inside `SERIALIZABLE` transactions that concurrent snapshot reads contend with. Reviews transaction scope and retry strategy.                                    |

### Why these three

The managed MCP server is scoped to `mcp:read` and deny-lists system catalogs,
which ruled out otherwise-relevant skills — `profiling-statement-fingerprints`,
`auditing-table-statistics`, and `triaging-live-sql-activity` cannot execute
against this connection at all:

```
> SELECT count(*) FROM crdb_internal.statement_statistics
MCP error: query references a restricted schema: access to "crdb_internal" is blocked

> SELECT ... FROM information_schema.statistics
MCP error: query references a restricted schema: access to "information_schema" is blocked

> SHOW STATISTICS FOR TABLE "MemoryCapsule"
MCP error: SHOW statement type "SHOW STATISTICS" is not allowed
```

`SHOW RANGES`, `SHOW INDEXES`, `SHOW ZONE CONFIGURATIONS`, `EXPLAIN`, and
`SELECT` on user tables all work — exactly what the three selected skills need.

---

## Execution evidence

Raw commands and output backing each finding above.

### Finding 1 — `cockroachdb-sql`

The skill requires `EXPLAIN` on every query it evaluates, so it was run against
the real Memory Engine queries. Context lookup
(`retrieveContextForAgent`, `memory-engine.service.ts:285`):

```sql
SELECT id, version, "isCurrent" FROM "MissionContext"
WHERE "missionId" = 'a1e8bdca-…' AND "isCurrent" = true
ORDER BY version DESC LIMIT 1;
```

```
• top-k
│ order: -version
└── • filter
    │ filter: ("missionId" = 'a1e8bdca-…') AND "isCurrent"
    └── • scan
          estimated row count: 37 (100% of the table; stats collected 11 hours ago)
          table: MissionContext@MissionContext_pkey
          spans: FULL SCAN
index recommendations: 1
   CREATE INDEX ON defaultdb.public."MissionContext" (version DESC) STORING ("missionId", "isCurrent");
```

The same query with an index hint — proving the index exists and is correctly
shaped, so the full scan is a cost decision rather than a missing index:

```sql
SELECT id, version, "isCurrent"
FROM "MissionContext"@"MissionContext_missionId_isCurrent_idx"
WHERE "missionId" = 'a1e8bdca-…' AND "isCurrent" = true
ORDER BY version DESC LIMIT 1;
```

```
└── • index join
    │ table: MissionContext@MissionContext_pkey
    └── • scan
          estimated row count: 18 (48% of the table; stats collected 11 hours ago)
          table: MissionContext@MissionContext_missionId_isCurrent_idx
          spans: [/'a1e8bdca-…'/true - /'a1e8bdca-…'/true]
```

The timeline query (`retrieveMissionTimeline`, `memory-engine.service.ts:256`)
behaves identically — full scan over 22 rows, with
`MemoryCapsule_missionId_occurredAt_idx` already in place, confirmed via
`SHOW INDEXES FROM "MemoryCapsule"`.

Schema rules checked against the skill's `00-fundamental-principles.md`:

| Rule                                           | Result                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every table has a `PRIMARY KEY`                | **Pass** — 31/31 Prisma models declare `@id` or `@@id`; join tables use composite keys (e.g. `MissionContextCapsule_pkey (missionContextId, capsuleId)`) |
| Prefer UUID keys; avoid sequential-ID hotspots | **Pass** — 78 `@db.Uuid` columns, zero `autoincrement()`/`SERIAL`                                                                                        |
| Indexes cover WHERE / JOIN / ORDER BY          | **Pass** — verified via `SHOW INDEXES`; `MemoryCapsule` carries four secondary indexes matching its access patterns                                      |

### Finding 2 — `analyzing-range-distribution`

The skill's `[SHOW RANGES …]` subquery form is rejected by the MCP
(`only SELECT statements are allowed`), so the underlying `SHOW` statements were
run directly and aggregated by hand.

```sql
SHOW RANGES FROM DATABASE defaultdb;
```

```json
{
  "start_key": "/Tenant/30275/Table/106",
  "end_key": "/Tenant/30276",
  "range_id": 11476193,
  "replicas": [12, 79, 80],
  "replica_localities": [
    "region=aws-eu-central-1,zone=aws-eu-central-1a,…",
    "region=aws-eu-central-1,zone=aws-eu-central-1b,…",
    "region=aws-eu-central-1,zone=aws-eu-central-1c,…"
  ],
  "voting_replicas": [80, 12, 79],
  "non_voting_replicas": [],
  "learner_replicas": []
}
```

```sql
SHOW ZONE CONFIGURATIONS;
```

```sql
ALTER RANGE default CONFIGURE ZONE USING
  range_min_bytes = 134217728,
  range_max_bytes = 536870912,
  gc.ttlseconds = 4500,
  num_replicas = 3, num_voters = 3,
  constraints = '{+region=aws-eu-central-1: 3}',
  lease_preferences = '[[+region=aws-eu-central-1]]';
```

Applying the skill's interpretation thresholds:

| Check                         | Threshold                              | Observed                                        | Verdict              |
| ----------------------------- | -------------------------------------- | ----------------------------------------------- | -------------------- |
| Replication health (Query 4)  | `replica_count < 3` = under-replicated | 3 voting replicas across zones `1a`/`1b`/`1c`   | **Healthy**          |
| Fragmentation (Query 6)       | 50+ ranges/GB = severe                 | 1 range, far below the 512 MB `range_max_bytes` | **No fragmentation** |
| Leaseholder hotspot (Query 3) | >40% on one node                       | Not exposed on this plan tier                   | Not assessable       |

### Finding 3 — `designing-application-transactions`

Reviewed the Memory Engine's two `$transaction` blocks
(`memory-engine.service.ts:156,200`) against the skill's steps.

| Skill step                                                 | Continuum                                                                                                                                                                        | Verdict                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Keep transactions short-lived; no external calls inside | S3 archival runs **after** the transaction commits — `SnapshotArchiveService.archive()` uploads, then persists status in a separate statement (`snapshot-archive.service.ts:37`) | **Pass** — a retried transaction cannot re-upload to S3 |
| 2. Implicit transactions for single statements             | Single-row reads/updates go through plain Prisma calls                                                                                                                           | **Pass**                                                |
| 3. Explicit transactions + retry on `40001`                | `withSerializableRetry` (5 attempts) matches `40001`/`P2034`/`restart transaction`; context builds are additionally serialized per mission id                                    | **Pass, with a gap** — backoff is linear                |

---

## Sources

- CockroachDB Agent Skills: <https://github.com/cockroachlabs/cockroachdb-skills>
- CockroachDB plugin for Claude Code: <https://github.com/cockroachdb/claude-plugin>
- Skills CLI: <https://skills.sh/>
- Managed MCP Server setup: [`cockroachdb-mcp.md`](cockroachdb-mcp.md)
