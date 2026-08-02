# MCP demo — querying Continuum's live memory through CockroachDB

These prompts are typed to **Claude Code** with the `cockroachdb-cloud` Managed
MCP Server connected (see [`cockroachdb-mcp.md`](cockroachdb-mcp.md)). The agent
answers by inspecting schemas and running **read-only** queries against the live
Continuum `defaultdb` via MCP — not a SQL shell, and no application code.

Seed and run the demo first so there is state to inspect:

```bash
pnpm db:seed        # prints the ARES-7 mission ID
# then press Start Demo in Mission Control, or run the simulator
```

All three prompts require only `mcp:read`.

## 1. Explain the mission state after the Navigation agent failure

> Using the `cockroachdb-cloud` MCP server, inspect the ARES-7 mission and
> explain its current state after the Navigation agent failure: which agent is
> `SUSPENDED`, which replacement agent is `ACTIVE`, the mission's open hazards,
> and the decision that was executed. Base every statement on rows you queried.

_Expected tool use:_ `get_table_schema` on `Agent`, `MissionAssignment`,
`Hazard`, `Decision`; read-only `select_query` joining on the ARES-7 mission
(`Mission.code = 'ARES-7'`), filtering assignments by `status`.

## 2. Summarize the inherited context for the replacement agent

> Through the `cockroachdb-cloud` MCP server, summarize the Mission Context the
> replacement Navigation agent inherited: the current `MissionContext` version
> for ARES-7 and how many Memory Capsules it selected, and confirm the executed
> reroute decision and the open hazard are represented. Read-only queries only.

_Expected tool use:_ `select_query` on `MissionContext` (latest `isCurrent`
version for the mission) and its linked capsules, cross-checked against
`Decision` and `Hazard`.

## 3. Show the latest Mission Snapshot and its S3 archival status

> Using the `cockroachdb-cloud` MCP server, show the most recent Mission Snapshot
> for ARES-7 — its `version`, `status`, `archiveStatus`, and `archiveUri` — and
> state whether it was archived to Amazon S3, skipped, or failed.

_Expected tool use:_ read-only `select_query` on `MissionSnapshot` for the
ARES-7 mission, ordered by `version DESC LIMIT 1`. This surfaces the outcome of
the S3 archival integration (`SKIPPED` when S3 is unconfigured, `UPLOADED` with
an `s3://…` URI on success, `FAILED` on error).
