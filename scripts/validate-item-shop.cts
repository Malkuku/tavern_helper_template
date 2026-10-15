// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import {
  applyItemRefresh,
  buyItem,
  itemRefreshQuote,
  parseItemResult,
  discardItem,
} from '../src/手机界面/apps/itemShop/itemShop';
import { initialStatDataSchema } from '../src/手机界面/store/initialDataSchema';
import type { stat_data } from '../src/手机界面/types';
import { directedRefreshSurcharge } from '../src/手机界面/apps/shopRefresh';
import { applyInventoryTransfers } from '../src/手机界面/apps/data/inventoryTransfer';

const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#5274a2" d="M8 12h32v24H8z"/></svg>';
const item = (price: number, quantity: number, durability = 1) => ({
  图标: icon,
  描述: '固定规格',
  作用: '使用后阻挡一次冲击。',
  评级: 'D' as const,
  价格: price,
  数量: quantity,
  耐久: durability,
});
const rule = readFileSync('O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕\\更新规则\\生成商店道具.ini', 'utf8');
assert.ok(rule.includes("getvar('stat_data.手机.定向刷新')"), '道具规则读取本次定向偏好');
const example = /<shopVariable>\s*(\{[\s\S]*?\})\s*<\/shopVariable>/.exec(rule);
assert.ok(example, '生成规则必须提供 shopVariable 示例');
assert.equal(
  initialStatDataSchema.shape.商店.safeParse(JSON.parse(example[1])).success,
  true,
  'INI 示例必须符合道具字段契约',
);
assert.ok(rule.includes("getvar('stat_data.仓库')"), '生成规则必须向 AI 提供仓库道具');
assert.ok(!rule.includes('商店下次刷新时间'), '手动刷新规则不得保留世界时间自动触发条件');
const data = {
  世界: { 时间: '2026-9-26T03:10[6]' },
  系统: { 商店下次刷新时间: '', 商店主动刷新次数: 0 },
  角色: { user: { 当前评级: 'D', 评级贡献: 0, 恶堕积分: 200, 物品: { 旧扣: item(3, 1, 2) } } },
  仓库: { 仓库药剂: item(5, 2, 1) },
  商店: { 旧扣: item(3, 2, 10) },
} as unknown as stat_data;
for (const [contribution, itemSurcharge, skillSurcharge] of [
  [0, 5, 20],
  [12, 10, 30],
  [48, 15, 40],
  [144, 20, 50],
  [432, 25, 60],
]) {
  const ranked = structuredClone(data);
  ranked.角色.user.评级贡献 = contribution;
  assert.equal(directedRefreshSurcharge(ranked, '道具'), itemSurcharge);
  assert.equal(directedRefreshSurcharge(ranked, '技能'), skillSurcharge, '技能定向价格保持原规则');
}
const stock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`道具${index}`, item(3 + index, 2, 10)]));
stock.旧扣 = { ...item(9, 2, 8), 图标: icon.replace('#5274a2', '#ffffff'), 描述: '错误的新描述' };
delete stock.道具0;
const message = `<shopVariable>${JSON.stringify(stock)}</shopVariable>`;
assert.equal(initialStatDataSchema.shape.商店.safeParse({ 道具: item(3, 1) }).success, true);
const freeItemData = structuredClone(data);
freeItemData.角色.user.恶堕积分 = 0;
freeItemData.商店 = { 免费道具: item(0, 2) };
freeItemData.商店.免费道具.评级 = 'N';
assert.equal(initialStatDataSchema.shape.商店.safeParse(freeItemData.商店).success, true, 'N 级道具可通过货架校验');
assert.equal(initialStatDataSchema.shape.仓库.safeParse(freeItemData.商店).success, true, 'N 级道具可通过仓库校验');
assert.equal(initialStatDataSchema.shape.角色.shape.user.shape.物品.safeParse(freeItemData.商店).success, true);
assert.equal(
  initialStatDataSchema.shape.技能商店.safeParse({ 测试技能: { 描述: '测试', 作用: '测试', 评级: 'N', 价格: 0 } })
    .success,
  false,
  '道具 N 级不扩展技能评级',
);
assert.ok(parseItemResult(`<shopVariable>${JSON.stringify(freeItemData.商店)}</shopVariable>`, freeItemData).免费道具);
buyItem(freeItemData, '免费道具', 1);
assert.equal(freeItemData.角色.user.物品.免费道具.数量, 1, '零积分可购买免费道具');
assert.equal(freeItemData.角色.user.物品.免费道具.评级, 'N', 'N 级道具购买后保留评级');
const nTransferData = structuredClone(freeItemData);
applyInventoryTransfers(nTransferData, [{ from: '随身物品', name: '免费道具', quantity: 1 }]);
assert.equal(nTransferData.仓库.免费道具.评级, 'N', 'N 级道具可转入仓库');
applyInventoryTransfers(nTransferData, [{ from: '仓库', name: '免费道具', quantity: 1 }]);
buyItem(nTransferData, '免费道具', 1);
assert.equal(nTransferData.角色.user.物品.免费道具.数量, 2, 'N 级同名道具正常合并');
assert.equal(freeItemData.角色.user.恶堕积分, 0, '购买免费道具不扣积分');
discardItem(freeItemData, '随身物品', '免费道具', 1);
assert.equal(freeItemData.角色.user.物品.免费道具, undefined, '全部丢弃后删除条目');
assert.equal(freeItemData.角色.user.恶堕积分, 0, '丢弃不返还积分');
assert.equal(itemRefreshQuote(data).price, 2, '道具普通刷新固定 2 点');
const directedData = structuredClone(data);
directedData.手机 = {
  定向刷新: { 类型: '道具', 要求: '适合调查的工具', 普通报价: 2 },
};
applyItemRefresh(
  directedData,
  `<shopVariable>${JSON.stringify(Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`测试${i}`, item(3, 1)])))}</shopVariable>`,
  true,
);
assert.equal(directedData.角色.user.恶堕积分, 193, 'D 级定向刷新收取 2 点普通费与 5 点附加费');
assert.equal(directedData.手机.定向刷新, null, '成功结算后清除本次偏好');
const directedInsufficient = structuredClone(data);
directedInsufficient.角色.user.恶堕积分 = 4;
directedInsufficient.手机 = {
  定向刷新: { 类型: '道具', 要求: '适合调查的工具', 普通报价: 2 },
};
const directedInsufficientBefore = structuredClone(directedInsufficient);
assert.throws(() => applyItemRefresh(directedInsufficient, message, true), /积分不足，需要 7 点/);
assert.deepEqual(directedInsufficient, directedInsufficientBefore, '定向余额不足时不扣费、不改货架或请求');
const parsed = parseItemResult(message, data);
assert.equal(Object.keys(parsed).length, 6);
for (const count of [7, 8]) {
  const extra = Object.fromEntries(Array.from({ length: count - 6 }, (_, index) => [`额外道具${index}`, item(3, 1)]));
  assert.equal(
    Object.keys(parseItemResult(`<shopVariable>${JSON.stringify({ ...stock, ...extra })}</shopVariable>`, data)).length,
    count,
    `有效的 ${count} 件道具可直接上架`,
  );
}
assert.equal(parsed.旧扣.价格, 9, '同名道具保留本次解析价格');
const priceMismatch = structuredClone(data);
priceMismatch.仓库.旧扣 = item(7, 1, 2);
assert.equal(parseItemResult(message, priceMismatch).旧扣.价格, 9, '随身、仓库与货架价格不一致仍使用解析价格');
assert.equal(parsed.旧扣.图标, icon, '同名道具保持旧 SVG');
const conflictingSources = structuredClone(data);
conflictingSources.仓库.旧扣 = { ...item(5, 1), 描述: '不同规格' };
assert.equal(parseItemResult(message, conflictingSources).旧扣, undefined, '同名规格冲突只跳过该商品');
assert.equal(Object.keys(parseItemResult(message, conflictingSources)).length, 5);
const partlyInvalid = { ...stock, 道具1: { ...stock.道具1, 数量: 0 } };
const partlyValidData = structuredClone(data);
applyItemRefresh(partlyValidData, `<shopVariable>${JSON.stringify(partlyInvalid)}</shopVariable>`);
assert.equal(partlyValidData.商店.道具1, undefined, '无效商品不写入货架');
assert.equal(Object.keys(partlyValidData.商店).length, 5);
assert.equal(partlyValidData.角色.user.恶堕积分, 198, '部分有效仍收固定刷新费');
const higherRank = { ...stock, 道具1: { ...stock.道具1, 评级: 'S' } };
assert.equal(
  parseItemResult(`<shopVariable>${JSON.stringify(higherRank)}</shopVariable>`, data).道具1,
  undefined,
  '超过玩家当前评级一档的道具不得上架',
);
assert.throws(() => parseItemResult('<shopVariable>{}</shopVariable>', data), /没有可上架的商品/);
assert.equal(parseItemResult(message + message, data).旧扣.价格, 9, '同楼旧标签不阻断最新结果');
const unsafeItem = { ...stock, 道具1: { ...stock.道具1, 图标: '<svg onload="alert(1)"></svg>', 备注: '额外说明' } };
const sanitized = parseItemResult(`<shopVariable>${JSON.stringify(unsafeItem)}</shopVariable>`, data);
assert.equal(sanitized.道具1.图标, undefined, '无效图标回退为默认图标');
assert.equal(sanitized.道具1.备注, undefined, '额外字段不写入变量');
const before = structuredClone(data);
assert.throws(() => applyItemRefresh(data, '<shopVariable>{}</shopVariable>'));
assert.deepEqual(data, before, '无效生成不得部分写入');
const insufficient = structuredClone(data);
insufficient.系统.商店下次刷新时间 = '2026-9-28T00:00[1]';
insufficient.系统.商店主动刷新次数 = 3;
insufficient.角色.user.恶堕积分 = 1;
const insufficientBefore = structuredClone(insufficient);
assert.throws(() => applyItemRefresh(insufficient, message), /积分不足/);
assert.deepEqual(insufficient, insufficientBefore, '不足当前报价不得刷新或改写货架');
applyItemRefresh(data, message);
assert.equal(data.系统.商店主动刷新次数, 0, '旧计次字段不再更新');
assert.equal(itemRefreshQuote(data).price, 2);
assert.equal(data.角色.user.恶堕积分, 198, '每次刷新固定扣 2 点');
const repeated = structuredClone(data);
for (let index = 0; index < 4; index++) applyItemRefresh(repeated, message);
assert.equal(repeated.角色.user.恶堕积分, 190, '五次刷新累计扣 10 点');
assert.equal(itemRefreshQuote(repeated).price, 2);
buyItem(data, '旧扣', 2);
assert.equal(data.角色.user.物品.旧扣.数量, 3);
assert.equal(data.角色.user.物品.旧扣.耐久, 6, '一件耐久 2 与两件耐久 8 加权向上取整');
assert.equal(data.商店.旧扣, undefined);
assert.equal(data.角色.user.恶堕积分, 180, '按解析价格结算购买并合并不同价格的持有物');
discardItem(data, '随身物品', '旧扣', 2);
assert.equal(data.角色.user.物品.旧扣.数量, 1);
discardItem(data, '仓库', '仓库药剂', 1);
assert.equal(data.仓库.仓库药剂.数量, 1);
const unchanged = structuredClone(data);
assert.throws(() => buyItem(data, '道具1', 99), /数量/);
for (const quantity of [0, -1, 0.5, 99, NaN]) {
  assert.throws(() => discardItem(data, '仓库', '仓库药剂', quantity), /数量/);
}
assert.throws(() => discardItem(data, '仓库', '不存在', 1), /没有/);
assert.deepEqual(data, unchanged, '失败购买和丢弃不得改变量');
assert.equal(data.角色.user.恶堕积分, 180, '丢弃随身及仓库物品均不变更积分');
const damagedPrice = structuredClone(data);
damagedPrice.仓库.仓库药剂.价格 = NaN;
discardItem(damagedPrice, '仓库', '仓库药剂', 1);
assert.equal(damagedPrice.仓库.仓库药剂, undefined, '丢弃不依赖价格字段');
data.系统.商店主动刷新次数 = 200;
assert.equal(itemRefreshQuote(data).price, 2, '多次刷新固定 2 点');
data.世界.时间 = '2026-9-28T00:00[1]';
assert.equal(itemRefreshQuote(data).price, 2, '跨周不改变报价');
assert.ok(Object.keys(data.商店).length > 0, '跨周保留货架');
const balanceAfterWeekChange = data.角色.user.恶堕积分;
applyItemRefresh(data, message);
assert.equal(data.系统.商店主动刷新次数, 200, '跨周不重置旧计次字段');
assert.equal(data.角色.user.恶堕积分, balanceAfterWeekChange - 2, '跨周刷新仍收 2 点');
console.info('组织道具商店定向验证通过。');
