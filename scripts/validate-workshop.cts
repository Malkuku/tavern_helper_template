import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { deleteAsset, findReferenceIssues } from '../src/创意工坊/assets/model';
import { createPackage, listConflicts, mergePackage, parsePackage } from '../src/创意工坊/assets/package';
import { createDefaultAsset, diffSources, previewPackage, workshopCategories } from '../src/创意工坊/assets/presentation';
import { serializeScenarioSource } from '../src/创意工坊/assets/repository';
import { parseScenarioSourceEntries, scenarioWorldbookEntryNames } from '../src/创意工坊/scenario/worldbookSource';
import type { ScenarioSourceBundle } from '../src/创意工坊/scenario/types';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const entry = { author: 'a', desc: 'd', key: 'k', data: {} };
const source: ScenarioSourceBundle = {
  fixedData: {},
  scenarios: { s: { author: 'a', key: 's', desc: '', 可用: true, 主题: '', 图标: '', 自定义主角: false, 内容配置: { 开场文本: 'text', 世界: 'world', 角色: ['role'], 地图: 'map', 世界经济: [], '季节与节日': [], 势力: [], 种族: [], 主线: 'main', 任务: [], 事件: [] } } },
  registries: {
    世界: { world: { author: 'a', desc: '', data: {} } }, 世界经济: {}, 主线: { main: { author: 'a', desc: '', data: {} } }, 事件: {}, 任务: {}, 势力: {},
    地图: { map: { author: 'a', desc: '', root: { node: {} } } }, 地图节点: { node: entry }, '季节与节日': {}, 开场文本: { text: { author: 'a', desc: '', data: 'hello' } }, 种族: {}, 角色: { role: { ...entry, type: '主要角色' } },
  },
};
assert.deepEqual(findReferenceIssues(source), []);
const blocked = structuredClone(source); assert.equal(deleteAsset(blocked, '角色', 'role', false).length, 1); assert.ok(blocked.registries.角色.role);
deleteAsset(blocked, '角色', 'role', true); assert.deepEqual(blocked.scenarios.s.内容配置.角色, []);
const brokenMap = structuredClone(source); deleteAsset(brokenMap, '地图节点', 'node', true); assert.deepEqual(brokenMap.registries.地图.map.root, {});
const pkg = createPackage(source, { 开场白: ['s'], 角色: ['role'] }); assert.equal(parsePackage(JSON.stringify(pkg)).version, 1);
const target = structuredClone(source); target.registries.角色.role.data = { changed: true }; assert.equal(listConflicts(target, pkg).length, 1);
const merged = mergePackage(target, pkg, { '角色:role': 'copy' }); const copied = Object.keys(merged.registries.角色).find(id => id !== 'role'); assert.ok(copied); assert.deepEqual(merged.scenarios.s.内容配置.角色, [copied]);

for (const category of workshopCategories) {
  const value = createDefaultAsset(category);
  assert.equal(typeof value.author, 'string', `${category} 默认值应包含作者`);
  if (category === '开场白') assert.equal(Object.keys(value.内容配置).length, 11);
  else if (category === '地图') assert.deepEqual(value.root, {});
  else assert.ok('data' in value, `${category} 默认值应包含领域数据`);
}
const roleTypes = ['user', '主要角色', '次要角色'];
for (const type of roleTypes) {
  const role = createDefaultAsset('角色'); role.type = type;
  assert.ok(role.data.基础数值 && role.data.生命状态 && role.data.技能 && role.data.物品);
}
const changed = structuredClone(source); changed.registries.世界.world.data = { 时间: '午后' };
const diff = diffSources(source, changed); assert.equal(diff.length, 1); assert.equal(diff[0].fields[0].path, 'data.时间');
const preview = previewPackage(target, pkg); assert.equal(preview.conflicts, 1); assert.equal(preview.identical, 1);
assert.deepEqual(serializeScenarioSource(source), source, '内存结构应无损往返');

const betaDir = process.argv[2];
if (betaDir) {
  const entries = Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({ name, content: readFileSync(join(betaDir, `${category}.json`), 'utf8') }));
  const beta = parseScenarioSourceEntries(entries);
  assert.deepEqual(serializeScenarioSource(beta), beta, 'Beta 十三类真实数据应无损往返');
}
console.info('创意工坊定向验证通过：13 类默认值、无损往返、字段差异、导入预览、引用、级联删除、冲突与复制重映射。');
