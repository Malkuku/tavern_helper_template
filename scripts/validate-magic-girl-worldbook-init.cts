import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const fixtureRoot = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const entry = (name: string, content: string) => ({ name, content });
const load = (name: string) => readFileSync(join(fixtureRoot, '系统配置', name + '.json'), 'utf8');
const entries = ['唯一开局', '角色资源', '地图资源'].map(name => entry('<配置>' + name, load(name)));
const withEntry = (name: string, value: unknown) =>
  entries.map(item => (item.name === '<配置>' + name ? entry('<配置>' + name, JSON.stringify(value)) : item));
const openingDocument = JSON.parse(load('唯一开局'));
const openingRegistry = openingDocument.开场白;
const opening = Object.values(openingRegistry)[0] as any;
const roleRegistry = JSON.parse(load('角色资源'));
const firstId = opening.内容配置.角色[0];

const assembled = reconcileWorldbookStatData({ 作者: 987 }, entries);
assert.equal(assembled.changed, true);
assert.equal(reconcileWorldbookStatData({}, entries).changed, false);
assert.equal(reconcileWorldbookStatData({ 作者: 987, 角色: {} }, entries).changed, false);
assert.throws(() => reconcileWorldbookStatData(undefined, entries), /stat_data 缺失/);
assert.equal(Object.keys(assembled.data.角色.主要角色).length, 3);
assert.ok(Object.keys(assembled.data.地图).length > 0);
assert.equal(assembled.data.系统.版本, '1.0.0');
assert.equal(assembled.data.角色.user.技能.战败收容.当前等级, 1);
assert.equal(assembled.data.仓库.组织制恢复剂.数量, 3);
for (const name of Object.keys(assembled.data.角色.主要角色)) {
  assert.ok(assembled.data.角色.主要角色[name].基础信息);
  assert.ok(assembled.data.手机.微信.账号.user.好友.includes(name));
  assert.deepEqual(assembled.data.手机.微信.账号[name].好友, ['user']);
}
assembled.data.角色.主要角色.鹭见凛.在场 = true;
assert.equal(reconcileWorldbookStatData(assembled.data, entries).data.角色.主要角色.鹭见凛.在场, true);
assert.equal(reconcileWorldbookStatData(assembled.data, entries).changed, false);
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, [...entries, entries[0]]), /需要且只能有一个/);
const brokenOpening = structuredClone(openingDocument);
(Object.values(brokenOpening.开场白)[0] as any).内容配置.角色.push(firstId);
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('唯一开局', brokenOpening)), /重复引用/);
const missingMap = structuredClone(openingDocument);
(Object.values(missingMap.开场白)[0] as any).内容配置.地图 = '00000000-0000-4000-8000-000000000000';
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('唯一开局', missingMap)), /地图资源不存在/);
const brokenRegistry = structuredClone(roleRegistry);
delete brokenRegistry[firstId];
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('角色资源', brokenRegistry)), /不存在/);
const invalidRole = structuredClone(roleRegistry);
delete invalidRole[firstId].data.基础信息;
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('角色资源', invalidRole)), /手机变量契约/);
const extraField = structuredClone(roleRegistry);
extraField[opening.内容配置.角色[1]].data.身份认知描述 = { 当前状态: false };
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('角色资源', extraField)), /身份认知描述/);
console.log('魔法少女唯一开局资产组装验证通过');
