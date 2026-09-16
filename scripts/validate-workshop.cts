import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import { deleteAsset, findReferenceIssues } from '../src/创意工坊/assets/model';
import { createPackage, listConflicts, mergePackage, parsePackage } from '../src/创意工坊/assets/package';
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
console.info('创意工坊定向验证通过：引用、级联删除、包解析、冲突与复制重映射。');
