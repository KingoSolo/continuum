import { ConsoleDemoLogger } from './presentation-logger.js';
import { RestMissionApi } from './rest-mission-api.js';
import { Ares7LavaTubeScenario } from './scenario.js';
import type { ScenarioConfig } from './types.js';

function configFromEnvironment(environment: NodeJS.ProcessEnv): ScenarioConfig {
  const missionId = environment.MISSION_ID;
  if (!missionId)
    throw new Error('MISSION_ID must be set to the UUID of the seeded ARES-7 mission.');
  return {
    apiBaseUrl: (environment.API_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, ''),
    missionId,
    runId: environment.SIMULATOR_RUN_ID ?? 'demo-001',
  };
}

async function main() {
  const config = configFromEnvironment(process.env);
  await new Ares7LavaTubeScenario(
    new RestMissionApi(config.apiBaseUrl),
    config,
    new ConsoleDemoLogger(),
  ).run();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
