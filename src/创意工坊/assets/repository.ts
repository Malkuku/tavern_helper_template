import { klona } from 'klona';

import type { ScenarioSourceBundle } from '../scenario/types';
import { scenarioWorldbookEntryNames, parseScenarioSourceEntries } from '../scenario/worldbookSource';

function documents(source: ScenarioSourceBundle): Record<keyof typeof scenarioWorldbookEntryNames, unknown> {
  return {
    开场白: { 固定数据: source.fixedData, 开场白: source.scenarios },
    ...Object.fromEntries(Object.entries(source.registries).map(([category, registry]) => [category, { [category]: registry }])),
  } as Record<keyof typeof scenarioWorldbookEntryNames, unknown>;
}

export async function saveScenarioSource(source: ScenarioSourceBundle): Promise<void> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书。');
  const previous = await getWorldbook(primary);
  const next = klona(previous);
  const docs = documents(source);
  for (const [category, name] of Object.entries(scenarioWorldbookEntryNames) as [keyof typeof scenarioWorldbookEntryNames, string][]) {
    const matches = next.filter(entry => entry.name === name);
    if (matches.length !== 1) throw new Error(`世界书配置条目数量异常：${name}`);
    matches[0].content = JSON.stringify(docs[category], null, 2);
  }
  try {
    await replaceWorldbook(primary, next, { render: 'immediate' });
  } catch (error) {
    try {
      await replaceWorldbook(primary, previous, { render: 'immediate' });
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], '保存失败，且世界书回滚失败。');
    }
    throw new Error('保存失败，世界书已恢复。', { cause: error });
  }
}

export function serializeScenarioSource(source: ScenarioSourceBundle): ScenarioSourceBundle {
  return parseScenarioSourceEntries(
    Object.entries(documents(source)).map(([category, document]) => ({
      name: scenarioWorldbookEntryNames[category as keyof typeof scenarioWorldbookEntryNames],
      content: JSON.stringify(document),
    })),
  );
}
