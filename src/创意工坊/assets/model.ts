import { klona } from 'klona';

import { ScenarioEntrySchema } from '../scenario/schemas';
import type {
  MapTopology,
  ReferenceIssue,
  ResourceCategory,
  ScenarioSourceBundle,
} from '../scenario/types';

export type WorkshopCategory = '开场白' | ResourceCategory;

const singleReferences = {
  开场文本: '开场文本',
  世界: '世界',
  地图: '地图',
  主线: '主线',
} as const;
const collectionReferences = {
  角色: '角色',
  世界经济: '世界经济',
  季节与节日: '季节与节日',
  势力: '势力',
  种族: '种族',
  任务: '任务',
  事件: '事件',
} as const;

export function assetsOf(source: ScenarioSourceBundle): Record<WorkshopCategory, Record<string, unknown>> {
  return { 开场白: source.scenarios, ...source.registries };
}

function walkTopology(topology: MapTopology, ownerId: string, issues: ReferenceIssue[], nodes: Set<string>): void {
  for (const [nodeId, children] of Object.entries(topology)) {
    if (!nodes.has(nodeId)) {
      issues.push({ ownerCategory: '地图', ownerId, field: 'root', targetCategory: '地图节点', targetId: nodeId });
    }
    walkTopology(children, ownerId, issues, nodes);
  }
}

export function findReferenceIssues(source: ScenarioSourceBundle): ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  for (const [ownerId, scenario] of Object.entries(source.scenarios)) {
    for (const [field, category] of Object.entries(singleReferences) as [keyof typeof singleReferences, ResourceCategory][]) {
      const targetId = scenario.内容配置[field];
      if (targetId && !source.registries[category][targetId]) {
        issues.push({ ownerCategory: '开场白', ownerId, field, targetCategory: category, targetId });
      }
    }
    for (const [field, category] of Object.entries(collectionReferences) as [keyof typeof collectionReferences, ResourceCategory][]) {
      for (const targetId of scenario.内容配置[field]) {
        if (!source.registries[category][targetId]) {
          issues.push({ ownerCategory: '开场白', ownerId, field, targetCategory: category, targetId });
        }
      }
    }
  }
  const nodes = new Set(Object.keys(source.registries.地图节点));
  for (const [ownerId, map] of Object.entries(source.registries.地图)) walkTopology(map.root, ownerId, issues, nodes);
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

export function deleteAsset(source: ScenarioSourceBundle, category: ResourceCategory, id: string, force: boolean): ReferenceIssue[] {
  const impacts = findReferencesTo(source, category, id);
  if (impacts.length && !force) return impacts;
  delete source.registries[category][id];
  if (force) removeReferences(source, category, id);
  normalizeScenarioAvailability(source);
  return [];
}

export function findReferencesTo(source: ScenarioSourceBundle, category: ResourceCategory, id: string): ReferenceIssue[] {
  const all = findReferenceIssues({
    ...source,
    registries: { ...source.registries, [category]: { ...source.registries[category], [id]: undefined } },
  } as ScenarioSourceBundle);
  return all.filter(issue => issue.targetCategory === category && issue.targetId === id);
}

function removeNode(topology: MapTopology, id: string): void {
  delete topology[id];
  for (const children of Object.values(topology)) removeNode(children, id);
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
  if (category === '地图节点') for (const map of Object.values(source.registries.地图)) removeNode(map.root, id);
}

export function validateDraft(source: ScenarioSourceBundle): ReferenceIssue[] {
  for (const scenario of Object.values(source.scenarios)) ScenarioEntrySchema.parse(scenario);
  return normalizeScenarioAvailability(source);
}

export function cloneSource(source: ScenarioSourceBundle): ScenarioSourceBundle {
  return klona(source);
}
