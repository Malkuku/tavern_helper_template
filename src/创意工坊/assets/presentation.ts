import { klona } from 'klona';

import type {
  JsonObject,
  ReferenceIssue,
  ScenarioEntry,
  ScenarioSourceBundle,
  WorkshopPackage,
} from '../scenario/types';
import { assetsOf, findReferenceIssues, type WorkshopCategory } from './model';
import { assertPackageMapCompatibility } from './package';

export const workshopCategories: WorkshopCategory[] = [
  '开场白',
  '世界',
  '世界经济',
  '主线',
  '事件',
  '任务',
  '势力',
  '地图',
  '季节与节日',
  '开场文本',
  '种族',
  '角色',
];

export function createDefaultAsset(category: WorkshopCategory): any {
  if (category === '开场白')
    return {
      author: '',
      key: '',
      desc: '',
      可用: false,
      主题: '',
      图标: '',
      自定义主角: false,
      内容配置: {
        开场文本: '',
        世界: '',
        角色: [],
        地图: '',
        世界经济: [],
        季节与节日: [],
        势力: [],
        种族: [],
        主线: '',
        任务: [],
        事件: [],
      },
    } satisfies ScenarioEntry;
  if (category === '地图') return { author: '', desc: '', data: {} };
  if (category === '开场文本') return { author: '', desc: '', data: '' };
  if (category === '世界')
    return { author: '', desc: '', data: { 时间: '', 地点: '', 季节: '', 天气: '', 地图索引: '', 危险场景: false } };
  if (category === '世界经济') return collection({ 名称检索词: [], 区域检索词: [], 物价: {}, 平均收入: {} });
  if (category === '主线') return { author: '', desc: '', data: {} };
  if (category === '事件') return collection({ 描述: '', 作用: '', 进度: '' });
  if (category === '任务') return collection({ 描述: '', 目标: '', 阻碍: '', 期望奖励: '', 取得成果: [] });
  if (category === '势力') return collection({ 名称检索词: [], 区域检索词: [], 描述: '' });
  if (category === '季节与节日')
    return collection({ 名称检索词: [], 区域检索词: [], 描述: [], 类型: '季节', 开始日期: '', 截止日期: '' });
  if (category === '种族') return { ...collection([]), type: '类人种' };
  return {
    ...collection(defaultRoleData('user')),
    type: 'user',
    meta: { avatar: '', color: '#C9B485', avatarStyle: 'auto' },
  };
}

function collection(data: unknown) {
  return { author: '', desc: '', key: '', data };
}

export function defaultRoleData(type: string): JsonObject {
  const common: JsonObject = {
    基础数值: { 力量: 0, 敏捷: 0, 智慧: 0, 魅力: 0 },
    生命状态: { 生命: { 当前: 0, 最大值: 0 }, 体力: { 当前: 0, 最大值: 0 }, 精神: { 当前: 0, 最大值: 0 } },
    技能: {},
    术之等级: {},
    特殊状态: {},
    物品: {},
  };
  if (type === '次要角色')
    return { 姓名: '', 名称检索词: [], 区域检索词: [], 在场: false, 简介: '', 性格标签: [], ...common };
  const shared = {
    年龄: '',
    当前身份: '',
    外貌: [],
    背景: [],
    性格: { 社交表现: '', 行动逻辑: '', 思维习惯: '', 人际距离: '', 道德底色: '' },
    人际关系: {},
    性经验: {},
  };
  if (type === '主要角色')
    return {
      姓名: '',
      名称检索词: [],
      区域检索词: [],
      在场: false,
      ...shared,
      当前想法: '',
      外貌概括: '',
      战斗风格: [],
      语料: {},
      ...common,
    };
  return { ...shared, ...common, 金钱: 0, 缥缈异质: 0 };
}

export function assetTitle(category: WorkshopCategory, value: any): string {
  if (category === '世界')
    return [value?.data?.地点, value?.data?.时间].filter(Boolean).join(' · ') || value?.desc || '未命名世界';
  if (category === '角色') return value?.data?.姓名 || value?.key || '未命名角色';
  if (category === '地图') return value?.desc || `${countMapNodes(value?.data ?? {})} 个地点`;
  if (category === '主线') return value?.desc || `${Object.keys(value?.data ?? {}).length} 条主线`;
  return value?.key || value?.desc || `未命名${category}`;
}

export function assetSummary(category: WorkshopCategory, value: any): string {
  if (category === '开场文本') return `${String(value?.data ?? '').length} 字`;
  if (category === '种族' || category === '角色') return value?.type || '';
  if (category === '地图') return `${countMapNodes(value?.data ?? {})} 个地点`;
  return value?.desc || '';
}

function countMapNodes(root: Record<string, any>): number {
  return Object.values(root).reduce((n, node) => n + 1 + countMapNodes(node?.子地图 ?? {}), 0);
}

export interface FieldChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}
export interface AssetChange {
  category: WorkshopCategory;
  id: string;
  kind: 'added' | 'removed' | 'modified';
  title: string;
  fields: FieldChange[];
}

export function diffSources(before: ScenarioSourceBundle, after: ScenarioSourceBundle): AssetChange[] {
  const left = assetsOf(before),
    right = assetsOf(after),
    changes: AssetChange[] = [];
  for (const category of workshopCategories) {
    for (const id of new Set([...Object.keys(left[category]), ...Object.keys(right[category])])) {
      const oldValue = left[category][id],
        newValue = right[category][id];
      if (oldValue === undefined)
        changes.push({
          category,
          id,
          kind: 'added',
          title: assetTitle(category, newValue),
          fields: flattenDiff(undefined, newValue),
        });
      else if (newValue === undefined)
        changes.push({
          category,
          id,
          kind: 'removed',
          title: assetTitle(category, oldValue),
          fields: flattenDiff(oldValue, undefined),
        });
      else {
        const fields = flattenDiff(oldValue, newValue);
        if (fields.length)
          changes.push({ category, id, kind: 'modified', title: assetTitle(category, newValue), fields });
      }
    }
  }
  return changes;
}

function flattenDiff(oldValue: unknown, newValue: unknown, path = ''): FieldChange[] {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
  if (isRecord(oldValue) && isRecord(newValue))
    return [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].flatMap(key =>
      flattenDiff(oldValue[key], newValue[key], path ? `${path}.${key}` : key),
    );
  return [{ path: path || '整体', oldValue: klona(oldValue), newValue: klona(newValue) }];
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export interface ImportPreview {
  counts: Partial<Record<WorkshopCategory, number>>;
  added: number;
  identical: number;
  conflicts: number;
  issues: ReferenceIssue[];
}
export function previewPackage(source: ScenarioSourceBundle, pkg: WorkshopPackage): ImportPreview {
  assertPackageMapCompatibility(source, pkg);
  const current = assetsOf(source);
  let added = 0,
    identical = 0,
    conflicts = 0;
  const counts: Partial<Record<WorkshopCategory, number>> = {};
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][]) {
    counts[category] = Object.keys(entries).length;
    for (const [id, value] of Object.entries(entries)) {
      if (current[category][id] === undefined) added++;
      else if (JSON.stringify(current[category][id]) === JSON.stringify(value)) identical++;
      else conflicts++;
    }
  }
  const merged = klona(source);
  const target = assetsOf(merged);
  for (const [category, entries] of Object.entries(pkg.assets) as [WorkshopCategory, Record<string, unknown>][])
    Object.assign(target[category], klona(entries));
  return { counts, added, identical, conflicts, issues: findReferenceIssues(merged) };
}
