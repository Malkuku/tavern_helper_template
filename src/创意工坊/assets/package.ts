import { klona } from 'klona';
import { z } from 'zod';

import type { PackageConflictDecision, ScenarioEntry, ScenarioSourceBundle, WorkshopPackage } from '../scenario/types';
import {
  CollectionEntrySchema,
  MapEntrySchema,
  ScenarioEntrySchema,
  TypedCollectionEntrySchema,
} from '../scenario/schemas';
import { assetsOf, normalizeScenarioAvailability, type WorkshopCategory } from './model';
import { synchronizeAutomaticReferences } from '../scenario/worldbookSource';

const PackageSchema = z
  .object({
    format: z.literal('dust-history-workshop-package'),
    version: z.literal(2),
    exportedAt: z.string(),
    assets: z.partialRecord(
      z.enum(['开场白', '世界经济', '势力', '地图', '季节与节日', '种族', '角色']),
      z.record(z.string(), z.unknown()),
    ),
  })
  .strict();

export interface PackageConflict {
  category: WorkshopCategory;
  id: string;
  incoming: unknown;
  current: unknown;
}

export function createPackage(
  source: ScenarioSourceBundle,
  selection: Partial<Record<WorkshopCategory, string[]>>,
): WorkshopPackage {
  const all = assetsOf(source);
  const expanded = expandPackageSelection(source, selection);
  const assets: WorkshopPackage['assets'] = {};
  for (const [category, ids] of Object.entries(expanded) as [WorkshopCategory, string[]][]) {
    const selected = Object.fromEntries(
      ids.filter(id => id in all[category]).map(id => [id, klona(all[category][id])]),
    );
    if (Object.keys(selected).length) assets[category] = selected;
  }
  return { format: 'dust-history-workshop-package', version: 2, exportedAt: new Date().toISOString(), assets };
}

export function expandPackageSelection(
  source: ScenarioSourceBundle,
  selection: Partial<Record<WorkshopCategory, string[]>>,
): Partial<Record<WorkshopCategory, string[]>> {
  const selected = new Map<WorkshopCategory, Set<string>>();
  for (const [category, ids] of Object.entries(selection) as [WorkshopCategory, string[]][]) {
    selected.set(category, new Set(ids));
  }
  const add = (category: WorkshopCategory, id: string) => {
    if (!id) return;
    const ids = selected.get(category) ?? new Set<string>();
    ids.add(id);
    selected.set(category, ids);
  };
  for (const scenarioId of selected.get('开场白') ?? []) {
    const scenario = source.scenarios[scenarioId];
    if (!scenario) continue;
    add('地图', scenario.内容配置.地图);
    for (const category of ['角色', '世界经济', '季节与节日', '势力', '种族'] as const) {
      for (const id of scenario.内容配置[category]) add(category, id);
    }
  }
  return Object.fromEntries([...selected].map(([category, ids]) => [category, [...ids]]));
}

export function parsePackage(text: string): WorkshopPackage {
  const pkg = PackageSchema.parse(JSON.parse(text)) as WorkshopPackage;
  const schemas: Record<WorkshopCategory, z.ZodType> = {
    开场白: ScenarioEntrySchema,
    世界经济: CollectionEntrySchema,
    势力: CollectionEntrySchema,
    地图: MapEntrySchema,
    季节与节日: CollectionEntrySchema,
    种族: TypedCollectionEntrySchema,
    角色: TypedCollectionEntrySchema,
  };
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const entry of Object.values(entries)) schemas[category].parse(entry);
  }
  return pkg;
}

export function parseScenarioJson(text: string): ScenarioEntry {
  try {
    return ScenarioEntrySchema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('剧本 JSON 语法无效，请检查逗号、引号和括号。');
    throw new Error('文件不是有效的完整剧本 JSON。');
  }
}

export function listConflicts(source: ScenarioSourceBundle, pkg: WorkshopPackage): PackageConflict[] {
  const current = assetsOf(source);
  const conflicts: PackageConflict[] = [];
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const [id, incoming] of Object.entries(entries)) {
      const existing = current[category][id];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(incoming))
        conflicts.push({ category, id, incoming, current: existing });
    }
  }
  return conflicts;
}

export function assertPackageMapCompatibility(source: ScenarioSourceBundle, pkg: WorkshopPackage): void {
  void source;
  void pkg;
}

export function parseMapJson(text: string) {
  try {
    return MapEntrySchema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('地图 JSON 语法无效，请检查逗号、引号和括号。');
    throw new Error('文件不是有效的完整地图 JSON，或包含不安全的 SVG。');
  }
}

function rewriteReferences(pkg: WorkshopPackage, remaps: Map<WorkshopCategory, Map<string, string>>): void {
  for (const scenario of Object.values(pkg.assets.开场白 ?? {}) as any[]) {
    scenario.内容配置.地图 = remaps.get('地图')?.get(scenario.内容配置.地图) ?? scenario.内容配置.地图;
    for (const field of ['角色', '世界经济', '季节与节日', '势力', '种族'] as const)
      scenario.内容配置[field] = scenario.内容配置[field].map((id: string) => remaps.get(field)?.get(id) ?? id);
  }
}

export function mergePackage(
  source: ScenarioSourceBundle,
  original: WorkshopPackage,
  decisions: Record<string, PackageConflictDecision>,
): ScenarioSourceBundle {
  const pkg = klona(original);
  const result = klona(source);
  const target = assetsOf(result);
  const remaps = new Map<WorkshopCategory, Map<string, string>>();
  const conflicts = listConflicts(source, pkg);
  const conflictKeys = new Set(conflicts.map(conflict => `${conflict.category}:${conflict.id}`));
  for (const conflict of conflicts) {
    if (decisions[`${conflict.category}:${conflict.id}`] === 'copy') {
      const nextId = crypto.randomUUID();
      (remaps.get(conflict.category) ?? remaps.set(conflict.category, new Map()).get(conflict.category)!).set(
        conflict.id,
        nextId,
      );
    }
  }
  rewriteReferences(pkg, remaps);
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const [oldId, incoming] of Object.entries(entries)) {
      const id = remaps.get(category)?.get(oldId) ?? oldId;
      const existing = target[category][id];
      const decision = decisions[`${category}:${oldId}`];
      const hasRewrittenReferences =
        remaps.size > 0 && category === '开场白' && !conflictKeys.has(`${category}:${oldId}`);
      if (
        existing === undefined ||
        JSON.stringify(existing) === JSON.stringify(incoming) ||
        decision === 'overwrite' ||
        decision === 'copy' ||
        hasRewrittenReferences
      )
        target[category][id] = incoming;
    }
  }
  synchronizeAutomaticReferences(result);
  normalizeScenarioAvailability(result);
  return result;
}

export function downloadPackage(pkg: WorkshopPackage, name = '尘史创意工坊资产包'): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadScenarioJson(scenario: ScenarioEntry): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${scenario.key || '未命名剧本'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadMapJson(map: import('../scenario/types').MapEntry, name = '地图'): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(map, null, 2)], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
