import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reconcileWorldbookStatData } from '../src/手机界面/store/worldbookInit';

const fixtureRoot = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const entry = (name: string, content: string) => ({ name, content });
const load = (name: string) => readFileSync(join(fixtureRoot, '系统配置', name + '.json'), 'utf8');
const entries = [
  ...['唯一开局', '角色资源', '地图资源'].map(name => entry('<配置>' + name, load(name))),
  entry('<模板>通用恶堕值', load('通用恶堕值')),
];
const withEntry = (name: string, value: unknown) =>
  entries.map(item => (item.name === '<配置>' + name ? entry('<配置>' + name, JSON.stringify(value)) : item));
const openingDocument = JSON.parse(load('唯一开局'));
const openingRegistry = openingDocument.开场白;
const opening = Object.values(openingRegistry)[0] as any;
const roleRegistry = JSON.parse(load('角色资源'));
const firstId = opening.内容配置.角色[0];
const minorId = '00000000-0000-4000-8000-000000000001';
const withMinor = structuredClone(roleRegistry);
withMinor[minorId] = {
  author: 'test',
  key: '测试次要角色',
  desc: '',
  type: '次要角色',
  data: {
    名称检索词: [],
    区域检索词: [],
    在场: true,
    身份: [],
    背景: '',
    外貌: '',
    性格: '',
    身体开发状态: [],
    能力描述: [],
  },
};
const openingWithMinor = structuredClone(openingDocument);
(Object.values(openingWithMinor.开场白)[0] as any).内容配置.角色.push(minorId);
const minorEntries = withEntry('唯一开局', openingWithMinor).map(item =>
  item.name === '<配置>角色资源' ? entry(item.name, JSON.stringify(withMinor)) : item,
);
const minorResult = reconcileWorldbookStatData({ 作者: 987 }, minorEntries).data as any;
assert.deepEqual(minorResult.角色.次要角色.测试次要角色.人设阶段.恶堕度, JSON.parse(load('通用恶堕值')));
assert.equal(minorResult.角色.次要角色.测试次要角色.当前评级, '');
assert.deepEqual(minorResult.角色.次要角色.测试次要角色.身份, []);
assert.throws(
  () =>
    reconcileWorldbookStatData(
      { 作者: 987 },
      minorEntries.filter(item => item.name !== '<模板>通用恶堕值'),
    ),
  /通用恶堕值/,
);
const legacyMain = structuredClone(roleRegistry);
const firstMainId = opening.内容配置.角色.find((id: string) => legacyMain[id]?.type === '主要角色');
delete legacyMain[firstMainId].data.当前评级;
const legacyMainEntries = entries.map(item =>
  item.name === '<配置>角色资源' ? entry(item.name, JSON.stringify(legacyMain)) : item,
);
const legacyMainResult = reconcileWorldbookStatData({ 作者: 987 }, legacyMainEntries).data as any;
assert.equal(legacyMainResult.角色.主要角色[legacyMain[firstMainId].key].当前评级, '');

const assembled = reconcileWorldbookStatData({ 作者: 987 }, entries);
assert.equal(assembled.changed, true);
assert.equal(reconcileWorldbookStatData({}, entries).changed, false);
assert.equal(reconcileWorldbookStatData({ 作者: 987, 角色: {} }, entries).changed, false);
assert.throws(() => reconcileWorldbookStatData(undefined, entries), /stat_data 缺失/);
assert.equal(
  Object.keys(assembled.data.角色.主要角色).length,
  opening.内容配置.角色.filter((id: string) => roleRegistry[id]?.type === '主要角色').length,
);
assert.ok(Object.keys(assembled.data.地图).length > 0);
assert.equal(assembled.data.系统.版本, '1.0.0');
assert.equal(assembled.data.角色.user.技能.战败收容.战力评级贡献, 2);
assert.equal(assembled.data.角色.user.技能.战败收容.价格, 0);
assert.deepEqual(assembled.data.仓库, opening.内容配置.仓库);
function checkMapIcons(nodes: Record<string, { 图标: string; 子地图: Record<string, any> }>) {
  for (const node of Object.values(nodes)) {
    assert.match(node.图标, /^<svg\b[\s\S]*<\/svg>$/);
    checkMapIcons(node.子地图);
  }
}
checkMapIcons(assembled.data.地图);
for (const table of [assembled.data.仓库, assembled.data.角色.user.物品, assembled.data.角色.user.技能]) {
  for (const value of Object.values(table) as { 图标?: string }[]) {
    assert.match(value.图标 ?? '', /^<svg\b[\s\S]*<\/svg>$/);
  }
}
for (const name of Object.keys(assembled.data.角色.主要角色)) {
  assert.ok(assembled.data.角色.主要角色[name].基础信息);
  const asset = Object.values(roleRegistry).find(
    (value: any) => value.type === '主要角色' && value.key === name,
  ) as any;
  assert.equal(assembled.data.角色.主要角色[name].当前评级, asset.data.当前评级);
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
const badMapIcon = JSON.parse(load('地图资源'));
const firstMapNode = Object.values(badMapIcon[opening.内容配置.地图].data)[0] as any;
firstMapNode.图标 = '<svg onload="alert(1)"></svg>';
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('地图资源', badMapIcon)), /图标/);
delete firstMapNode.图标;
assert.throws(() => reconcileWorldbookStatData({ 作者: 987 }, withEntry('地图资源', badMapIcon)), /图标/);
console.log('魔法少女唯一开局资产组装验证通过');
