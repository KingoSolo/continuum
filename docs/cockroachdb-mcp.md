# CockroachDB Cloud Managed MCP Server

Continuum connects an AI coding agent (Claude Code) to its **live** CockroachDB
Cloud cluster through CockroachDB's **Managed MCP Server** — a hosted Model
Context Protocol endpoint. The agent inspects schemas and runs **read-only**
queries against Continuum's mission memory directly, instead of a SQL shell.

- **Endpoint:** `https://cockroachlabs.cloud/mcp`
- **Auth:** OAuth 2.1 (Authorization Code + PKCE), scoped to `mcp:read`.
- **Access:** read-only by default — write tools require explicit `mcp:write`
  consent, and `DROP`/`TRUNCATE` are unsupported. System tables are deny-listed.
- **Config:** the project-scoped [`.mcp.json`](../.mcp.json) at the repo root.
  It contains **no secret** — only the cluster ID (an identifier, not a
  credential). Do not add API keys to this file.

## Prerequisites

- The existing Continuum CockroachDB Cloud (Serverless) cluster — the one behind
  `DATABASE_URL`.
- A CockroachDB Cloud account with access to that cluster.
- Claude Code installed.
- Your **cluster ID** (a UUID, not the hostname).

## Setup

1. **Enable the Managed MCP Server** in the CockroachDB Cloud Console: open the
   Continuum cluster → **Connect** → select the **MCP integration** option, and
   copy the generated snippet. It contains the endpoint above and your
   `mcp-cluster-id`. (If the MCP option is not shown, confirm the Managed MCP
   Server is enabled for your organization.)
2. **Use the project config.** `.mcp.json` is already in the repo root with the
   cluster ID set (a cluster ID is an identifier, not a secret):

   ```json
   {
     "mcpServers": {
       "cockroachdb-cloud": {
         "type": "http",
         "url": "https://cockroachlabs.cloud/mcp",
         "headers": { "mcp-cluster-id": "<your-cluster-id>" }
       }
     }
   }
   ```

   To point at a different cluster, replace the `mcp-cluster-id` value. (If you
   prefer not to commit an ID, use `"${CRDB_CLUSTER_ID}"` and set that env var
   before launching Claude Code.)

3. **Restart Claude Code** so it loads `.mcp.json`.

4. **Authenticate.** On first use, OAuth opens a browser for consent. Grant
   **`mcp:read`** only — this keeps the connection read-only. Do not grant
   `mcp:write` for the demo.

## Verify

In Claude Code, with the `cockroachdb-cloud` server connected, ask it to list
databases or describe a table (it should use the MCP `list_databases` /
`get_table_schema` / `select_query` tools against `defaultdb`). Seed the mission
first with `pnpm db:seed` (it prints the mission ID). See
[`mcp-demo.md`](mcp-demo.md) for Continuum-specific prompts.

## Notes

- **Headless/CI only:** a service-account API key may be used instead of OAuth by
  adding an `Authorization: Bearer <key>` header — but **never commit the key**.
  Keep it in the environment and out of `.mcp.json`.
- This integration adds no application code and no runtime dependency; it is an
  agent-tooling connection to the same cluster the API already uses.

## Sources

- Managed MCP Server for AI Agents — CockroachDB Cloud:
  <https://www.cockroachlabs.com/blog/cockroachdb-ai-agents-managed-mcp-server/>
- CockroachDB plugin for Claude Code:
  <https://github.com/cockroachdb/claude-plugin>
- CockroachDB and AI: <https://www.cockroachlabs.com/docs/stable/cockroachdb-and-ai>
