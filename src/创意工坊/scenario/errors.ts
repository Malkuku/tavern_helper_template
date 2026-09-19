import type { ResourceCategory } from './types';

export type ScenarioDataErrorCode =
  | 'WORLD_BOOK_MISSING'
  | 'WORLD_BOOK_DUPLICATE'
  | 'INVALID_JSON'
  | 'INVALID_DOCUMENT'
  | 'SCENARIO_NOT_FOUND'
  | 'SCENARIO_UNAVAILABLE'
  | 'RESOURCE_NOT_FOUND'
  | 'DUPLICATE_REFERENCE'
  | 'DUPLICATE_KEY'
  | 'UNKNOWN_ROLE_TYPE'
  | 'DUPLICATE_USER'
  | 'INVALID_MAP_LOCATION'
  | 'INVALID_RUNTIME_DATA'
  | 'HOST_APPLY_FAILED'
  | 'HOST_ROLLBACK_FAILED';

interface ScenarioDataErrorOptions {
  category?: ResourceCategory | '开场白' | '宿主';
  resourceId?: string;
  cause?: unknown;
}

export class ScenarioDataError extends Error {
  readonly code: ScenarioDataErrorCode;
  readonly category?: ResourceCategory | '开场白' | '宿主';
  readonly resourceId?: string;

  constructor(code: ScenarioDataErrorCode, message: string, options: ScenarioDataErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'ScenarioDataError';
    this.code = code;
    this.category = options.category;
    this.resourceId = options.resourceId;
  }
}

export function formatScenarioError(error: unknown): string {
  if (error instanceof ScenarioDataError) {
    const context = [error.category, error.resourceId].filter(Boolean).join(' / ');
    return context ? `${error.message}\n位置：${context}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
