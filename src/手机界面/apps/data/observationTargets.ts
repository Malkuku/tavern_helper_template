import type { stat_data } from '../../types';
import { firstTargetKeys } from './firstTarget';

export type ObservationTarget = { id: string; key: string; kind: '主要角色' | '次要角色' | '档案待建立' };

export function visibleObservationTargets(data: stat_data): ObservationTarget[] {
  return (data.系统?.已发现目标 ?? []).flatMap(key => {
    const kind = data.角色?.主要角色?.[key]
      ? '主要角色'
      : data.角色?.次要角色?.[key]
        ? '次要角色'
        : firstTargetKeys.includes(key as (typeof firstTargetKeys)[number])
          ? '档案待建立'
          : null;
    return kind ? [{ id: `${kind}:${key}`, key, kind }] : [];
  });
}
