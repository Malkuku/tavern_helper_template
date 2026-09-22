import { klona } from 'klona';

import { ScenarioEntrySchema } from '../scenario/schemas';
import type { ReferenceIssue, ResourceCategory, ScenarioSourceBundle, TypedCollectionEntry } from '../scenario/types';
import { mapContainsLocation } from '../scenario/map';
import { applyRoleDerivedStats } from './roleStats';

export type WorkshopCategory = '开场白' | ResourceCategory;

const singleReferences = {
  地图: '地图',
} as const;
const collectionReferences = {
  角色: '角色',
  世界经济: '世界经济',
  季节与节日: '季节与节日',
  势力: '势力',
  种族: '种族',
} as const;

export function assetsOf(source: ScenarioSourceBundle): Record<WorkshopCategory, Record<string, unknown>> {
  return { 开场白: source.scenarios, ...source.registries };
}

export function syncRoleVitalsToMaximum(source: ScenarioSourceBundle): void {
  for (const role of Object.values(source.registries.角色)) {
    applyRoleDerivedStats(role.data as Record<string, unknown>);
  }
}

export function normalizeRoleEnums(source: ScenarioSourceBundle): void {
  const artTypes = new Set(['灯', '铸', '刃', '冬', '心', '杯', '蛾', '启']);
  const itemTypes = new Set(['器具', '药食', '证明', '秘传', '仪式', '杂物']);
  const standardQualities = new Set(['凡庸', '遗物', '佚品', '珍品', '禁忌', '神造', '未知']);
  const documentQualities = new Set(['遗片', '佚存', '残卷', '蛀损', '完帙', '未知']);
  for (const role of Object.values(source.registries.角色)) {
    const data = role.data as Record<string, any>;
    const arts = data?.术之等级;
    if (arts && typeof arts === 'object') {
      for (const [key, value] of Object.entries(arts)) {
        if (!artTypes.has(key) || !value || typeof value !== 'object' || Number((value as any).等级) <= 0)
          delete arts[key];
      }
    }
    const items = data?.物品;
    if (!items || typeof items !== 'object') continue;
    for (const item of Object.values(items) as Record<string, any>[]) {
      if (!item || typeof item !== 'object') continue;
      if (!itemTypes.has(item.类型)) item.类型 = '杂物';
      const isDocument = item.类型 === '秘传' || item.类型 === '仪式';
      const qualities = isDocument ? documentQualities : standardQualities;
      if (!qualities.has(item.品质)) item.品质 = isDocument ? '遗片' : '凡庸';
    }
  }
}

export function findReferenceIssues(source: ScenarioSourceBundle): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  for (const [ownerId, scenario] of Object.entries(source.scenarios)) {
    for (const [field, category] of Object.entries(singleReferences) as [
      keyof typeof singleReferences,
      ResourceCategory,
    ][]) {
      const targetId = scenario.内容配置[field];
      if (!targetId || !source.registries[category][targetId]) {
        issues.push({ ownerCategory: '开场白', ownerId, field, targetCategory: category, targetId });
      }
    }
    const selectedMap = source.registries.地图[scenario.内容配置.地图];
    const location = String(scenario.内容配置.世界.地图索引 ?? '');
    if (selectedMap && !mapContainsLocation(selectedMap, location)) {
      issues.push({
        ownerCategory: '开场白',
        ownerId,
        field: '世界.地图索引',
        targetCategory: '地图',
        targetId: scenario.内容配置.地图,
      });
    }
    for (const [field, category] of Object.entries(collectionReferences) as [
      keyof typeof collectionReferences,
      ResourceCategory,
    ][]) {
      for (const targetId of scenario.内容配置[field]) {
        if (!source.registries[category][targetId]) {
          issues.push({ ownerCategory: '开场白', ownerId, field, targetCategory: category, targetId });
        }
      }
    }
    const resolvedUsers = scenario.内容配置.角色.filter(id => source.registries.角色[id]?.type === 'user');
    if (resolvedUsers.length !== 1) {
      issues.push({
        ownerCategory: '开场白',
        ownerId,
        field: '角色.user',
        targetCategory: '角色',
        targetId: resolvedUsers.length === 0 ? '' : resolvedUsers[1],
      });
    }
    const roleIdentities = new Map<string, string>();
    for (const targetId of scenario.内容配置.角色) {
      const role = source.registries.角色[targetId];
      if (!role || role.type === 'user') continue;
      const identity = `${role.type}\u0000${role.key}`;
      if (roleIdentities.has(identity)) {
        issues.push({ ownerCategory: '开场白', ownerId, field: '角色.版本互斥', targetCategory: '角色', targetId });
      } else roleIdentities.set(identity, targetId);
    }
  }
  return issues;
}

export function normalizeScenarioAvailability(source: ScenarioSourceBundle): ReferenceIssue[] {
  const issues = findReferenceIssues(source);
  const invalid = new Set(issues.filter(issue => issue.ownerCategory === '开场白').map(issue => issue.ownerId));
  for (const [id, scenario] of Object.entries(source.scenarios)) {
    if (invalid.has(id)) scenario.可用 = false;
  }
  return issues;
}

export function deleteAsset(
  source: ScenarioSourceBundle,
  category: ResourceCategory,
  id: string,
  force: boolean,
): ReferenceIssue[] {
  const impacts = findReferencesTo(source, category, id);
  if (impacts.length && !force) return impacts;
  delete source.registries[category][id];
  if (force) removeReferences(source, category, id);
  normalizeScenarioAvailability(source);
  return [];
}

export function findReferencesTo(
  source: ScenarioSourceBundle,
  category: ResourceCategory,
  id: string,
): ReferenceIssue[] {
  const all = findReferenceIssues({
    ...source,
    registries: { ...source.registries, [category]: { ...source.registries[category], [id]: undefined } },
  } as ScenarioSourceBundle);
  return all.filter(issue => issue.targetCategory === category && issue.targetId === id);
}

function removeReferences(source: ScenarioSourceBundle, category: ResourceCategory, id: string): void {
  for (const scenario of Object.values(source.scenarios)) {
    for (const [field, target] of Object.entries(singleReferences)) {
      if (target === category && scenario.内容配置[field as keyof typeof singleReferences] === id) {
        scenario.内容配置[field as keyof typeof singleReferences] = '';
        scenario.可用 = false;
      }
    }
    for (const [field, target] of Object.entries(collectionReferences)) {
      if (target === category) {
        const key = field as keyof typeof collectionReferences;
        scenario.内容配置[key] = scenario.内容配置[key].filter(value => value !== id);
      }
    }
  }
}

export function validateDraft(source: ScenarioSourceBundle): ReferenceIssue[] {
  for (const scenario of Object.values(source.scenarios)) ScenarioEntrySchema.parse(scenario);
  return normalizeScenarioAvailability(source);
}

export function cloneSource(source: ScenarioSourceBundle): ScenarioSourceBundle {
  return klona(source);
}

export function roleIdentityOf(role: Pick<TypedCollectionEntry, 'type' | 'key'>): string {
  return role.type === 'user' ? 'user' : `${role.type}\u0000${role.key}`;
}

export function normalizeRoleSelection(ids: string[], roles: ScenarioSourceBundle['registries']['角色']): string[] {
  const winners = new Map<string, { id: string; index: number }>();
  ids.forEach((id, index) => {
    const role = roles[id];
    if (!role) return;
    const identity = roleIdentityOf(role);
    winners.set(identity, { id, index });
  });
  return [...winners.values()].sort((a, b) => a.index - b.index).map(value => value.id);
}
