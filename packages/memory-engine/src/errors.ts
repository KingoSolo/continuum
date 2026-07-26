export type MemoryEngineErrorCode =
  | 'AGENT_NOT_ASSIGNED'
  | 'ARTIFACT_NOT_FOUND'
  | 'CONTEXT_NOT_FOUND'
  | 'MISSION_NOT_FOUND'
  | 'PERSISTENCE_FAILURE';

export class MemoryEngineError extends Error {
  readonly name = 'MemoryEngineError';

  constructor(
    readonly code: MemoryEngineErrorCode,
    message: string,
    readonly details: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: MemoryEngineError };

export const success = <T>(value: T): Result<T> => ({ ok: true, value });

export const failure = <T = never>(
  code: MemoryEngineErrorCode,
  message: string,
  details?: Readonly<Record<string, string>>,
): Result<T> => ({ ok: false, error: new MemoryEngineError(code, message, details) });
