import type { stat_data } from '../types';

export function isDiscoveredTarget(data: stat_data | null | undefined, key: string): boolean {
  return key === 'user' || data?.系统?.已发现目标?.includes(key) === true;
}
