// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { sanitizeMapSvg } from '../src/创意工坊/scenario/map';
import { findPhoneMapPath, layoutPhoneMap, listPhoneMap } from '../src/手机界面/apps/map/phoneMap';
import type { 地图节点 } from '../src/手机界面/types';

const root = 'O:/St Working/角色卡开发/魔法少女恶堕/魔法少女恶堕/系统配置/地图资源.json';
const registry = JSON.parse(readFileSync(root, 'utf8'));
const map = Object.values(registry)[0].data;
const all = listPhoneMap(map);
assert.deepEqual(
  all.map(entry => entry.name),
  ['故事城市', '学园区', '学校', '大学区', '居民区', '金融区'],
);
assert.deepEqual(
  findPhoneMapPath(map, '学校')?.map(entry => entry.name),
  ['故事城市', '学园区', '学校'],
);
for (const entry of all) {
  assert.equal(sanitizeMapSvg(entry.path.at(-1).node.图标), entry.path.at(-1).node.图标);
}
assert.match(map.故事城市.图标, /#[0-9a-f]{6}/i);
assert.throws(() => sanitizeMapSvg('<svg><script>alert(1)</script></svg>'));

const districts = map.故事城市.子地图;
const positioned = layoutPhoneMap(districts, 320, 320);
assert.equal(positioned.length, 4);
for (const item of positioned) {
  assert.ok(Math.abs(item.x) + 41 <= 160);
  assert.ok(Math.abs(item.y) + 39 <= 160);
}
const place = { ...districts.大学区, 方位: { x: [0, 0], y: [0, 0], z: [0, 0] } } as 地图节点;
const coincident = layoutPhoneMap({ A: place, B: place }, 320, 320);
assert.ok(Math.abs(coincident[0].x - coincident[1].x) >= 82 || Math.abs(coincident[0].y - coincident[1].y) >= 78);
console.log('手机彩色地图资源、层级与布局验证通过');
