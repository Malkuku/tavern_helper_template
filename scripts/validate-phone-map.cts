// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { sanitizeMapSvg } from '../src/创意工坊/scenario/map';
import { findPhoneMapPath, layoutPhoneMap, listPhoneMap } from '../src/手机界面/apps/map/phoneMap';
import { locationShare, parseLocationShare } from '../src/手机界面/apps/map/locationShare';
import type { 地图节点 } from '../src/手机界面/types';

const root = 'O:/St Working/角色卡开发/魔法少女恶堕/魔法少女恶堕/系统配置/地图资源.json';
const registry = JSON.parse(readFileSync(root, 'utf8'));
const map = Object.values(registry)[0].data;
const all = listPhoneMap(map);
assert.ok(all.length > 0);
const selected = all.find(entry => entry.path.length > 1)!;
assert.deepEqual(
  findPhoneMapPath(map, selected.name)?.map(entry => entry.name),
  selected.path.map(entry => entry.name),
);
const shared = locationShare(selected.name);
assert.equal(parseLocationShare(shared), selected.name);
assert.equal(findPhoneMapPath(map, parseLocationShare(shared)!)?.at(-1)?.name, selected.name);
assert.equal(parseLocationShare('<位置 key="不存在" />'), null);
assert.equal(parseLocationShare(locationShare('引号"与\\')), '引号"与\\');
for (const entry of all) {
  assert.equal(sanitizeMapSvg(entry.path.at(-1).node.图标), entry.path.at(-1).node.图标);
}
assert.match(Object.values(map)[0].图标, /#[0-9a-f]{6}/i);
assert.throws(() => sanitizeMapSvg('<svg><script>alert(1)</script></svg>'));

const districts = Object.values(map)[0].子地图;
const positioned = layoutPhoneMap(districts, 320, 320);
assert.equal(positioned.length, Object.keys(districts).length);
for (let i = 0; i < positioned.length; i++) {
  for (let j = i + 1; j < positioned.length; j++) {
    const a = positioned[i];
    const b = positioned[j];
    assert.ok(Math.abs(a.x - b.x) >= 108 || Math.abs(a.y - b.y) >= 112);
  }
}
const place = { ...districts.大学区, 方位: { x: [0, 0], y: [0, 0], z: [0, 0] } } as 地图节点;
const coincident = layoutPhoneMap({ A: place, B: place }, 320, 320);
assert.ok(Math.abs(coincident[0].x - coincident[1].x) >= 108 || Math.abs(coincident[0].y - coincident[1].y) >= 112);
console.log('手机彩色地图资源、层级与布局验证通过');
