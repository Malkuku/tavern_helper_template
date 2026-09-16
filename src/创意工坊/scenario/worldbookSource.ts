import { z } from 'zod';

import { ScenarioDataError } from './errors';
import {
  CollectionEntrySchema,
  MapEntrySchema,
  ScenarioEntrySchema,
  SingletonEntrySchema,
  TextEntrySchema,
  TypedCollectionEntrySchema,
} from './schemas';
import type { ScenarioSourceBundle } from './types';

export const scenarioWorldbookEntryNames = {
  开场白: '<开场白>配置',
  世界: '<世界>配置',
  世界经济: '<世界经济>配置',
  主线: '<主线>配置',
  事件: '<事件>配置',
  任务: '<任务>配置',
  势力: '<势力>配置',
  地图: '<地图>配置',
  季节与节日: '<季节与节日>配置',
  开场文本: '<开场文本>配置',
  种族: '<种族>配置',
  角色: '<角色>配置',
} as const;

type SourceCategory = keyof typeof scenarioWorldbookEntryNames;
type ConfigEntry = Pick<WorldbookEntry, 'name' | 'content'>;

function parseJsonEntry(entries: ConfigEntry[], category: SourceCategory): unknown {
  const name = scenarioWorldbookEntryNames[category];
  const matches = entries.filter(entry => entry.name === name);
  if (matches.length === 0) {
    throw new ScenarioDataError('WORLD_BOOK_MISSING', `世界书缺少配置条目：${name}`, { category });
  }
  if (matches.length > 1) {
    throw new ScenarioDataError('WORLD_BOOK_DUPLICATE', `世界书存在重复配置条目：${name}`, { category });
  }
  try {
    return JSON.parse(matches[0].content);
  } catch (error) {
    throw new ScenarioDataError('INVALID_JSON', `配置条目不是合法 JSON：${name}`, {
      category,
      cause: error,
    });
  }
}

function parseRoot<T>(
  entries: ConfigEntry[],
  category: SourceCategory,
  schema: z.ZodType<T>,
): T {
  const document = parseJsonEntry(entries, category);
  const result = z.object({ [category]: schema }).strict().safeParse(document);
  if (!result.success) {
    throw new ScenarioDataError('INVALID_DOCUMENT', `配置条目结构无效：${scenarioWorldbookEntryNames[category]}\n${z.prettifyError(result.error)}`, {
      category,
      cause: result.error,
    });
  }
  return result.data[category];
}

export function parseScenarioSourceEntries(entries: ConfigEntry[]): ScenarioSourceBundle {
  if (entries.some(entry => entry.name === '<地图节点>配置')) {
    throw new ScenarioDataError('INVALID_DOCUMENT', '不支持旧地图节点配置；请提供 data 完整嵌套地图。', { category: '地图' });
  }
  const openingDocument = parseJsonEntry(entries, '开场白');
  const openingResult = z
    .object({
      固定数据: z.record(z.string(), z.unknown()),
      开场白: z.record(z.string(), ScenarioEntrySchema),
    })
    .strict()
    .safeParse(openingDocument);
  if (!openingResult.success) {
    throw new ScenarioDataError(
      'INVALID_DOCUMENT',
      `配置条目结构无效：${scenarioWorldbookEntryNames.开场白}\n${z.prettifyError(openingResult.error)}`,
      { category: '开场白', cause: openingResult.error },
    );
  }

  const worlds = parseRoot(entries, '世界', z.record(z.string(), SingletonEntrySchema));
  const rawMaps = parseJsonEntry(entries, '地图');
  const mapDocument = z.object({ 地图: z.record(z.string(), z.unknown()) }).strict().parse(rawMaps);
  const maps = z.record(z.string(), MapEntrySchema).parse(mapDocument.地图);
  if (Object.keys(maps).length !== 1) {
    throw new ScenarioDataError('INVALID_DOCUMENT', `地图配置必须且只能包含一张地图，当前为 ${Object.keys(maps).length} 张。`, { category: '地图' });
  }

  const result: ScenarioSourceBundle = {
    fixedData: openingResult.data.固定数据,
    scenarios: openingResult.data.开场白,
    registries: {
      世界: worlds,
      世界经济: parseRoot(entries, '世界经济', z.record(z.string(), CollectionEntrySchema)),
      主线: parseRoot(entries, '主线', z.record(z.string(), SingletonEntrySchema)),
      事件: parseRoot(entries, '事件', z.record(z.string(), CollectionEntrySchema)),
      任务: parseRoot(entries, '任务', z.record(z.string(), CollectionEntrySchema)),
      势力: parseRoot(entries, '势力', z.record(z.string(), CollectionEntrySchema)),
      地图: maps,
      季节与节日: parseRoot(entries, '季节与节日', z.record(z.string(), CollectionEntrySchema)),
      开场文本: parseRoot(entries, '开场文本', z.record(z.string(), TextEntrySchema)),
      种族: parseRoot(entries, '种族', z.record(z.string(), TypedCollectionEntrySchema)),
      角色: parseRoot(entries, '角色', z.record(z.string(), TypedCollectionEntrySchema)),
    },
  };
  synchronizeAutomaticReferences(result);
  return result;
}

export function synchronizeAutomaticReferences(source: ScenarioSourceBundle): void {
  const onlyMap = Object.keys(source.registries.地图);
  for (const scenario of Object.values(source.scenarios)) {
    scenario.内容配置.世界经济 = Object.keys(source.registries.世界经济);
    scenario.内容配置['季节与节日'] = Object.keys(source.registries['季节与节日']);
    scenario.内容配置.势力 = Object.keys(source.registries.势力);
    scenario.内容配置.种族 = Object.keys(source.registries.种族);
    if (onlyMap.length === 1) scenario.内容配置.地图 = onlyMap[0];
  }
}

export async function loadScenarioSourceFromWorldbook(): Promise<ScenarioSourceBundle> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) {
    throw new ScenarioDataError('WORLD_BOOK_MISSING', '当前角色没有绑定主世界书。', { category: '开场白' });
  }

  return parseScenarioSourceEntries(await getWorldbook(primary));
}
