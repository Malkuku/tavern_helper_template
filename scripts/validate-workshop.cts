import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { deleteAsset, findReferenceIssues, normalizeScenarioAvailability } from '../src/创意工坊/assets/model';
import { createPackage, listConflicts, mergePackage, parsePackage } from '../src/创意工坊/assets/package';
import { createDefaultAsset, diffSources, previewPackage, workshopCategories } from '../src/创意工坊/assets/presentation';
import { serializeScenarioSource } from '../src/创意工坊/assets/repository';
import { parseScenarioSourceEntries, scenarioWorldbookEntryNames, synchronizeAutomaticReferences } from '../src/创意工坊/scenario/worldbookSource';
import type { ScenarioSourceBundle } from '../src/创意工坊/scenario/types';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const entry = { author: 'a', desc: 'd', key: 'k', data: {} };
const source: ScenarioSourceBundle = {
  fixedData: {},
  scenarios: { s: { author: 'a', key: 's', desc: '', 可用: true, 主题: '', 图标: '', 自定义主角: false, 内容配置: { 开场文本: 'text', 世界: 'world', 角色: ['role'], 地图: 'map', 世界经济: [], '季节与节日': [], 势力: [], 种族: [], 主线: 'main', 任务: [], 事件: [] } } },
  registries: {
    世界: { world: { author: 'a', desc: '', data: {} } }, 世界经济: {}, 主线: { main: { author: 'a', desc: '', data: {} } }, 事件: {}, 任务: {}, 势力: {},
    地图: { map: { author: 'a', desc: '', data: { 城市: { 描述: '城' } } } }, '季节与节日': {}, 开场文本: { text: { author: 'a', desc: '', data: 'hello' } }, 种族: {}, 角色: { role: { ...entry, type: 'user' } },
  },
};
assert.deepEqual(findReferenceIssues(source), []);
const unavailable = structuredClone(source); unavailable.scenarios.s.内容配置 = { 开场文本: '', 世界: '', 角色: [], 地图: '', 世界经济: [], '季节与节日': [], 势力: [], 种族: [], 主线: '', 任务: [], 事件: [] }; normalizeScenarioAvailability(unavailable); assert.equal(unavailable.scenarios.s.可用, false);
const blocked = structuredClone(source); assert.equal(deleteAsset(blocked, '角色', 'role', false).length, 1); assert.ok(blocked.registries.角色.role);
deleteAsset(blocked, '角色', 'role', true); assert.deepEqual(blocked.scenarios.s.内容配置.角色, []);
const pkg = createPackage(source, { 开场白: ['s'], 角色: ['role'] }); assert.equal(parsePackage(JSON.stringify(pkg)).version, 2);
const legacyPackage = { format: 'dust-history-workshop-package', version: 1, exportedAt: new Date().toISOString(), assets: { 地图: { legacy: { author: 'a', desc: '旧地图', root: { node: {} } } }, 地图节点: { node: entry } } };
assert.throws(() => parsePackage(JSON.stringify(legacyPackage)));
const sourceEntries = Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({ name, content: JSON.stringify(category === '开场白' ? { 固定数据: source.fixedData, 开场白: source.scenarios } : { [category]: source.registries[category as keyof typeof source.registries] }) }));
assert.throws(() => parseScenarioSourceEntries([...sourceEntries, { name: '<地图节点>配置', content: JSON.stringify({ 地图节点: {} }) }]), /不支持旧地图节点配置/);
const legacyMapEntries = sourceEntries.map(entry => entry.name === '<地图>配置' ? { ...entry, content: JSON.stringify({ 地图: { map: { author: 'a', desc: '', root: {} } } }) } : entry);
assert.throws(() => parseScenarioSourceEntries(legacyMapEntries));
const target = structuredClone(source); target.registries.角色.role.data = { changed: true }; assert.equal(listConflicts(target, pkg).length, 1);
const merged = mergePackage(target, pkg, { '角色:role': 'copy' }); const copied = Object.keys(merged.registries.角色).find(id => id !== 'role'); assert.ok(copied); assert.deepEqual(merged.scenarios.s.内容配置.角色, [copied]);

for (const category of workshopCategories) {
  const value = createDefaultAsset(category);
  assert.equal(typeof value.author, 'string', `${category} 默认值应包含作者`);
  if (category === '开场白') assert.equal(Object.keys(value.内容配置).length, 11);
  else if (category === '地图') assert.deepEqual(value.data, {});
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
const automatic = structuredClone(source); automatic.registries.世界经济.economy = { ...entry, key: '经济' }; automatic.registries.势力.faction = { ...entry, key: '势力' }; synchronizeAutomaticReferences(automatic);
assert.deepEqual(automatic.scenarios.s.内容配置.世界经济, ['economy']); assert.deepEqual(automatic.scenarios.s.内容配置.势力, ['faction']);

const betaDir = process.argv[2];
if (betaDir) {
  const entries = Object.entries(scenarioWorldbookEntryNames).map(([category, name]) => ({ name, content: readFileSync(join(betaDir, `${category}.json`), 'utf8') }));
  const beta = parseScenarioSourceEntries(entries);
  assert.deepEqual(serializeScenarioSource(beta), beta, '当前格式数据应无损往返');
}
console.info('创意工坊定向验证通过：嵌套地图、共享资源同步、旧格式拒绝、v2 包往返、引用、冲突与复制重映射。');
