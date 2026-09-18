import { klona } from 'klona';
import { z } from 'zod';

import { ScenarioDataError } from './errors';
import { RuntimeStatDataSchema } from './schemas';
import type {
  AssemblyResult,
  CollectionEntry,
  JsonObject,
  Registry,
  ResourceCategory,
  RuntimeStatData,
  ScenarioSourceBundle,
  TypedCollectionEntry,
} from './types';

function requireEntry<T>(registry: Registry<T>, category: ResourceCategory, resourceId: string): T {
  const entry = registry[resourceId];
  if (!entry) {
    throw new ScenarioDataError('RESOURCE_NOT_FOUND', `未找到${category}资源。`, {
      category,
      resourceId,
    });
  }
  return entry;
}

function assembleCollection(
  category: ResourceCategory,
  registry: Registry<CollectionEntry>,
  ids = Object.keys(registry),
): JsonObject {
  const result: JsonObject = {};
  const referenced = new Set<string>();

  for (const id of ids) {
    if (referenced.has(id)) {
      throw new ScenarioDataError('DUPLICATE_REFERENCE', `重复引用${category}资源。`, {
        category,
        resourceId: id,
      });
    }
    referenced.add(id);
    const entry = requireEntry(registry, category, id);
    if (Object.hasOwn(result, entry.key)) {
      throw new ScenarioDataError('DUPLICATE_KEY', `${category}存在重复 key：${entry.key}`, {
        category,
        resourceId: id,
      });
    }
    result[entry.key] = klona(entry.data);
  }
  return result;
}

function assembleTypedCollection(
  category: ResourceCategory,
  registry: Registry<TypedCollectionEntry>,
  ids = Object.keys(registry),
): JsonObject {
  const result: JsonObject = {};
  const referenced = new Set<string>();

  for (const id of ids) {
    if (referenced.has(id)) {
      throw new ScenarioDataError('DUPLICATE_REFERENCE', `重复引用${category}资源。`, {
        category,
        resourceId: id,
      });
    }
    referenced.add(id);
    const entry = requireEntry(registry, category, id);
    const bucket = (result[entry.type] ??= {}) as JsonObject;
    if (Object.hasOwn(bucket, entry.key))
      throw new ScenarioDataError('DUPLICATE_KEY', `${category}存在重复 type/key：${entry.type}/${entry.key}`, {
        category,
        resourceId: id,
      });
    bucket[entry.key] = klona(entry.data);
  }
  return result;
}

function assembleEmbedded(category: '任务' | '事件', entries: { key: string; data: JsonObject }[]): JsonObject {
  const result: JsonObject = {};
  for (const entry of entries) {
    if (Object.hasOwn(result, entry.key)) {
      throw new ScenarioDataError('DUPLICATE_KEY', `${category}存在重复 key：${entry.key}`, { category });
    }
    result[entry.key] = klona(entry.data);
  }
  return result;
}

function assembleRoles(ids: string[], registry: Registry<TypedCollectionEntry>): RuntimeStatData['角色'] {
  const result: Partial<RuntimeStatData['角色']> = {
    主要角色: {},
    次要角色: {},
  };
  const referenced = new Set<string>();

  for (const id of ids) {
    if (referenced.has(id)) {
      throw new ScenarioDataError('DUPLICATE_REFERENCE', '重复引用角色资源。', {
        category: '角色',
        resourceId: id,
      });
    }
    referenced.add(id);
    const entry = requireEntry(registry, '角色', id);
    const data = z.record(z.string(), z.unknown()).parse(entry.data);
    const runtimeData = {
      ...klona(data),
      meta: klona(entry.meta ?? { avatar: '', color: '#C9B485' }),
    };

    if (entry.type === 'user') {
      if (result.user) {
        throw new ScenarioDataError('DUPLICATE_USER', '同一剧本只能引用一个 user 角色。', {
          category: '角色',
          resourceId: id,
        });
      }
      result.user = runtimeData;
      continue;
    }

    if (entry.type !== '主要角色' && entry.type !== '次要角色') {
      throw new ScenarioDataError('UNKNOWN_ROLE_TYPE', `未知角色类型：${entry.type}`, {
        category: '角色',
        resourceId: id,
      });
    }

    const bucket = result[entry.type] as JsonObject;
    if (Object.hasOwn(bucket, entry.key)) {
      throw new ScenarioDataError('DUPLICATE_KEY', `同一剧本只能选择角色“${entry.key}”的一个版本。`, {
        category: '角色',
        resourceId: id,
      });
    }
    bucket[entry.key] = runtimeData;
  }

  if (!result.user) {
    throw new ScenarioDataError('RESOURCE_NOT_FOUND', '剧本未配置 user 角色。', { category: '角色' });
  }
  return result as RuntimeStatData['角色'];
}

export function assembleScenario(source: ScenarioSourceBundle, scenarioId: string): AssemblyResult {
  const scenario = source.scenarios[scenarioId];
  if (!scenario) {
    throw new ScenarioDataError('SCENARIO_NOT_FOUND', '未找到开场白。', {
      category: '开场白',
      resourceId: scenarioId,
    });
  }
  if (!scenario.可用) {
    throw new ScenarioDataError('SCENARIO_UNAVAILABLE', `开场白“${scenario.key}”当前不可用。`, {
      category: '开场白',
      resourceId: scenarioId,
    });
  }

  const config = scenario.内容配置;
  const map = requireEntry(source.registries.地图, '地图', config.地图);
  const fixedData = klona(source.fixedData);
  const system = z.record(z.string(), z.unknown()).parse(fixedData.system);

  const candidate = {
    ...fixedData,
    世界: klona(config.世界),
    角色: assembleRoles(config.角色, source.registries.角色),
    地图: klona(map.data),
    世界经济: assembleCollection('世界经济', source.registries.世界经济),
    季节与节日: assembleCollection('季节与节日', source.registries.季节与节日),
    势力: assembleCollection('势力', source.registries.势力),
    种族: assembleTypedCollection('种族', source.registries.种族),
    主线: klona(config.主线),
    任务: assembleEmbedded('任务', config.任务),
    事件: assembleEmbedded('事件', config.事件),
    system: {
      ...system,
      当前剧本: scenario.key,
    },
  };

  const parsed = RuntimeStatDataSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ScenarioDataError('INVALID_RUNTIME_DATA', `运行时数据校验失败：${z.prettifyError(parsed.error)}`, {
      category: '开场白',
      resourceId: scenarioId,
      cause: parsed.error,
    });
  }

  return {
    scenarioId,
    scenario: klona(scenario),
    statData: parsed.data as RuntimeStatData,
    openingText: config.开场文本,
  };
}
