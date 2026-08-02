import type { MissionContext, TimelineItem } from '../types/mission';
const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
export const missionId = process.env.NEXT_PUBLIC_MISSION_ID ?? '';
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}/missions/${missionId}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}
export const api = {
  timeline: () =>
    request<
      Array<{
        id: string;
        occurredAt: string;
        importance: TimelineItem['importance'];
        referencedEntityType: string;
        authorAgentId: string;
      }>
    >('/timeline'),
  context: () => request<MissionContext>('/context'),
  knowledge: () => request<unknown[]>('/knowledge'),
  snapshot: () => request<{ snapshot: { id: string } }>('/snapshots', { method: 'POST' }),
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};
