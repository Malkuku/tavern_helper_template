import type { stat_data } from '../types';

type PatchOperation = { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown };

/** 只记录本次阶段结算改变的字段，供楼层变量重算时重放。 */
export function stageSettlementPatch(before: stat_data, after: stat_data): string {
  const patch: PatchOperation[] = [];
  const escape = (key: string) => key.replace(/~/g, '~0').replace(/\//g, '~1');

  function visit(oldValue: unknown, newValue: unknown, path: string) {
    if (Object.is(oldValue, newValue)) return;
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) patch.push({ op: 'replace', path, value: newValue });
      return;
    }
    if (
      oldValue &&
      newValue &&
      typeof oldValue === 'object' &&
      typeof newValue === 'object' &&
      !Array.isArray(oldValue) &&
      !Array.isArray(newValue)
    ) {
      const oldRecord = oldValue as Record<string, unknown>;
      const newRecord = newValue as Record<string, unknown>;
      for (const [key, value] of Object.entries(oldRecord)) {
        const childPath = `${path}/${escape(key)}`;
        if (Object.hasOwn(newRecord, key)) visit(value, newRecord[key], childPath);
        else patch.push({ op: 'remove', path: childPath });
      }
      for (const [key, value] of Object.entries(newRecord)) {
        if (!Object.hasOwn(oldRecord, key)) patch.push({ op: 'add', path: `${path}/${escape(key)}`, value });
      }
      return;
    }
    patch.push({ op: 'replace', path, value: newValue });
  }

  visit(before, after, '');
  return patch.length ? `<UpdateVariable><JSONPatch>${JSON.stringify(patch)}</JSONPatch></UpdateVariable>` : '';
}
