import { klona } from 'klona';
import { z } from 'zod';

import type { PackageConflictDecision, ScenarioSourceBundle, WorkshopPackage } from '../scenario/types';
import { CollectionEntrySchema, MapEntrySchema, ScenarioEntrySchema, SingletonEntrySchema, TextEntrySchema, TypedCollectionEntrySchema } from '../scenario/schemas';
import { assetsOf, normalizeScenarioAvailability, type WorkshopCategory } from './model';
import { synchronizeAutomaticReferences } from '../scenario/worldbookSource';

const PackageSchema = z.object({
  format: z.literal('dust-history-workshop-package'),
  version: z.literal(2),
  exportedAt: z.string(),
  assets: z.partialRecord(z.enum(['开场白', '世界', '世界经济', '主线', '事件', '任务', '势力', '地图', '季节与节日', '开场文本', '种族', '角色']), z.record(z.string(), z.unknown())),
}).strict();

export interface PackageConflict { category: WorkshopCategory; id: string; incoming: unknown; current: unknown }

export function createPackage(source: ScenarioSourceBundle, selection: Partial<Record<WorkshopCategory, string[]>>): WorkshopPackage {
  const all = assetsOf(source);
  const assets: WorkshopPackage['assets'] = {};
  for (const [category, ids] of Object.entries(selection) as [WorkshopCategory, string[]][]) {
    const selected = Object.fromEntries(ids.filter(id => id in all[category]).map(id => [id, klona(all[category][id])]));
    if (Object.keys(selected).length) assets[category] = selected;
  }
  return { format: 'dust-history-workshop-package', version: 2, exportedAt: new Date().toISOString(), assets };
}

export function parsePackage(text: string): WorkshopPackage {
  const pkg = PackageSchema.parse(JSON.parse(text)) as WorkshopPackage;
  if (Object.keys(pkg.assets.地图 ?? {}).length > 1) throw new Error('资产包只能包含一张地图。');
  const schemas: Record<WorkshopCategory, z.ZodType> = {
    开场白: ScenarioEntrySchema, 世界: SingletonEntrySchema, 世界经济: CollectionEntrySchema,
    主线: SingletonEntrySchema, 事件: CollectionEntrySchema, 任务: CollectionEntrySchema,
    势力: CollectionEntrySchema, 地图: MapEntrySchema,
    '季节与节日': CollectionEntrySchema, 开场文本: TextEntrySchema, 种族: TypedCollectionEntrySchema,
    角色: TypedCollectionEntrySchema,
  };
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const entry of Object.values(entries)) schemas[category].parse(entry);
  }
  return pkg;
}

export function listConflicts(source: ScenarioSourceBundle, pkg: WorkshopPackage): PackageConflict[] {
  assertPackageMapCompatibility(source, pkg);
  const current = assetsOf(source);
  const conflicts: PackageConflict[] = [];
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const [id, incoming] of Object.entries(entries)) {
      const existing = current[category][id];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(incoming)) conflicts.push({ category, id, incoming, current: existing });
    }
  }
  return conflicts;
}

export function assertPackageMapCompatibility(source: ScenarioSourceBundle, pkg: WorkshopPackage): void {
  const currentIds = new Set(Object.keys(source.registries.地图));
  const incomingIds = Object.keys(pkg.assets.地图 ?? {});
  const resultingIds = new Set([...currentIds, ...incomingIds]);
  if (resultingIds.size > 1) {
    throw new Error(`资产包会使项目出现 ${resultingIds.size} 张地图；项目只允许唯一地图。请仅覆盖现有地图 UUID，或先移除包内地图。`);
  }
}

function rewriteReferences(pkg: WorkshopPackage, remaps: Map<WorkshopCategory, Map<string, string>>): void {
  for (const scenario of Object.values(pkg.assets.开场白 ?? {}) as any[]) {
    for (const field of ['开场文本', '世界', '地图', '主线'] as const) scenario.内容配置[field] = remaps.get(field)?.get(scenario.内容配置[field]) ?? scenario.内容配置[field];
    for (const field of ['角色', '世界经济', '季节与节日', '势力', '种族', '任务', '事件'] as const) scenario.内容配置[field] = scenario.内容配置[field].map((id: string) => remaps.get(field)?.get(id) ?? id);
  }
}

export function mergePackage(source: ScenarioSourceBundle, original: WorkshopPackage, decisions: Record<string, PackageConflictDecision>): ScenarioSourceBundle {
  const pkg = klona(original);
  const result = klona(source);
  const target = assetsOf(result);
  const remaps = new Map<WorkshopCategory, Map<string, string>>();
  const conflicts = listConflicts(source, pkg);
  const conflictKeys = new Set(conflicts.map(conflict => `${conflict.category}:${conflict.id}`));
  for (const conflict of conflicts) {
    if (decisions[`${conflict.category}:${conflict.id}`] === 'copy') {
      const nextId = crypto.randomUUID();
      (remaps.get(conflict.category) ?? remaps.set(conflict.category, new Map()).get(conflict.category)!).set(conflict.id, nextId);
    }
  }
  rewriteReferences(pkg, remaps);
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const [oldId, incoming] of Object.entries(entries)) {
      const id = remaps.get(category)?.get(oldId) ?? oldId;
      const existing = target[category][id];
      const decision = decisions[`${category}:${oldId}`];
      const hasRewrittenReferences = remaps.size > 0 && category === '开场白' && !conflictKeys.has(`${category}:${oldId}`);
      if (existing === undefined || JSON.stringify(existing) === JSON.stringify(incoming) || decision === 'overwrite' || decision === 'copy' || hasRewrittenReferences) target[category][id] = incoming;
    }
  }
  synchronizeAutomaticReferences(result);
  normalizeScenarioAvailability(result);
  return result;
}

export function downloadPackage(pkg: WorkshopPackage, name = '尘史创意工坊资产包'): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name}.json`; anchor.click(); URL.revokeObjectURL(url);
}
