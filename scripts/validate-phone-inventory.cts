// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
import { applyInventoryTransfers } from '../src/手机界面/apps/data/inventoryTransfer';
import { sanitizeMapSvg } from '../src/创意工坊/scenario/map';
import type { stat_data } from '../src/手机界面/types';

const icon = '<svg viewBox="0 0 24 24"><path d="M1 1h20" stroke="currentColor"/></svg>';
assert.equal(sanitizeMapSvg(icon), icon);
assert.throws(() => sanitizeMapSvg('<svg onload="alert(1)"></svg>'));

const data = {
  角色: { user: { 物品: { 药瓶: { 图标: icon, 描述: '随身', 作用: '恢复', 数量: 4 } } } },
  仓库: { 药瓶: { 图标: icon, 描述: '仓库', 作用: '恢复', 数量: 2 } },
} as unknown as stat_data;
applyInventoryTransfers(data, [{ from: '随身物品', name: '药瓶', quantity: 3 }]);
assert.equal(data.角色.user.物品.药瓶.数量, 1);
assert.equal(data.仓库.药瓶.数量, 5);
assert.equal(data.仓库.药瓶.描述, '仓库');
applyInventoryTransfers(data, [{ from: '仓库', name: '药瓶', quantity: 5 }]);
assert.equal(data.角色.user.物品.药瓶.数量, 6);
assert.equal(data.仓库.药瓶, undefined);
assert.throws(() => applyInventoryTransfers(data, [{ from: '仓库', name: '药瓶', quantity: 1 }]));
assert.throws(() => applyInventoryTransfers(data, [{ from: '随身物品', name: '药瓶', quantity: 0 }]));
assert.throws(() => applyInventoryTransfers(data, [{ from: '随身物品', name: '药瓶', quantity: 7 }]));
assert.equal(data.角色.user.物品.药瓶.数量, 6);
const emptyTarget = {
  角色: { user: { 物品: { 钥匙: { 描述: '开门', 作用: '', 数量: 1 } } } },
  仓库: {},
} as unknown as stat_data;
applyInventoryTransfers(emptyTarget, [{ from: '随身物品', name: '钥匙', quantity: 1 }]);
assert.equal(emptyTarget.角色.user.物品.钥匙, undefined);
assert.equal(emptyTarget.仓库.钥匙.描述, '开门');
assert.throws(() =>
  applyInventoryTransfers({ 角色: { user: { 物品: {} } } } as stat_data, [
    { from: '随身物品', name: '钥匙', quantity: 1 },
  ]),
);
console.log('手机库存转移与 SVG 校验通过');
