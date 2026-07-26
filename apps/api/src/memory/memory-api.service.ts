import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { MemoryEngineError, Result } from '@continuum/memory-engine';

@Injectable()
export class MemoryApiService {
  unwrap<T>(result: Result<T>): T {
    if (result.ok) {
      return result.value;
    }

    throw this.toHttpException(result.error);
  }

  private toHttpException(error: MemoryEngineError): Error {
    switch (error.code) {
      case 'MISSION_NOT_FOUND':
      case 'ARTIFACT_NOT_FOUND':
      case 'CONTEXT_NOT_FOUND':
        return new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case 'AGENT_NOT_ASSIGNED':
        return new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case 'PERSISTENCE_FAILURE':
        return new ServiceUnavailableException({ code: error.code, message: error.message });
    }
  }
}
