import { klona } from 'klona';
import { z } from 'zod';

import type { PackageConflictDecision, ScenarioSourceBundle, WorkshopPackage } from '../scenario/types';
import { CollectionEntrySchema, MapEntrySchema, ScenarioEntrySchema, SingletonEntrySchema, TextEntrySchema, TypedCollectionEntrySchema } from '../scenario/schemas';
import { assetsOf, normalizeScenarioAvailability, type WorkshopCategory } from './model';

const PackageSchema = z.object({
  format: z.literal('dust-history-workshop-package'),
  version: z.literal(1),
  exportedAt: z.string(),
  assets: z.partialRecord(z.enum(['开场白', '世界', '世界经济', '主线', '事件', '任务', '势力', '地图', '地图节点', '季节与节日', '开场文本', '种族', '角色']), z.record(z.string(), z.unknown())),
}).strict();

export interface PackageConflict { category: WorkshopCategory; id: string; incoming: unknown; current: unknown }

export function createPackage(source: ScenarioSourceBundle, selection: Partial<Record<WorkshopCategory, string[]>>): WorkshopPackage {
  const all = assetsOf(source);
  const assets: WorkshopPackage['assets'] = {};
  for (const [category, ids] of Object.entries(selection) as [WorkshopCategory, string[]][]) {
    const selected = Object.fromEntries(ids.filter(id => id in all[category]).map(id => [id, klona(all[category][id])]));
    if (Object.keys(selected).length) assets[category] = selected;
  }
  return { format: 'dust-history-workshop-package', version: 1, exportedAt: new Date().toISOString(), assets };
}

export function parsePackage(text: string): WorkshopPackage {
  const pkg = PackageSchema.parse(JSON.parse(text)) as WorkshopPackage;
  const schemas: Record<WorkshopCategory, z.ZodType> = {
    开场白: ScenarioEntrySchema, 世界: SingletonEntrySchema, 世界经济: CollectionEntrySchema,
    主线: SingletonEntrySchema, 事件: CollectionEntrySchema, 任务: CollectionEntrySchema,
    势力: CollectionEntrySchema, 地图: MapEntrySchema, 地图节点: CollectionEntrySchema,
    '季节与节日': CollectionEntrySchema, 开场文本: TextEntrySchema, 种族: TypedCollectionEntrySchema,
    角色: TypedCollectionEntrySchema,
  };
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    for (const entry of Object.values(entries)) schemas[category].parse(entry);
  }
  return pkg;
}

export function listConflicts(source: ScenarioSourceBundle, pkg: WorkshopPackage): PackageConflict[] {
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

function rewriteTopology(topology: Record<string, unknown>, remap: Map<string, string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(topology).map(([id, children]) => [remap.get(id) ?? id, rewriteTopology(children as Record<string, unknown>, remap)]));
}

function rewriteReferences(pkg: WorkshopPackage, remaps: Map<WorkshopCategory, Map<string, string>>): void {
  for (const scenario of Object.values(pkg.assets.开场白 ?? {}) as any[]) {
    for (const field of ['开场文本', '世界', '地图', '主线'] as const) scenario.内容配置[field] = remaps.get(field)?.get(scenario.内容配置[field]) ?? scenario.内容配置[field];
    for (const field of ['角色', '世界经济', '季节与节日', '势力', '种族', '任务', '事件'] as const) scenario.内容配置[field] = scenario.内容配置[field].map((id: string) => remaps.get(field)?.get(id) ?? id);
  }
  for (const map of Object.values(pkg.assets.地图 ?? {}) as any[]) map.root = rewriteTopology(map.root, remaps.get('地图节点') ?? new Map());
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
      const hasRewrittenReferences = remaps.size > 0 && (category === '开场白' || category === '地图') && !conflictKeys.has(`${category}:${oldId}`);
      if (existing === undefined || JSON.stringify(existing) === JSON.stringify(incoming) || decision === 'overwrite' || decision === 'copy' || hasRewrittenReferences) target[category][id] = incoming;
    }
  }
  normalizeScenarioAvailability(result);
  return result;
}

export function downloadPackage(pkg: WorkshopPackage, name = '尘史创意工坊资产包'): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name}.json`; anchor.click(); URL.revokeObjectURL(url);
}
