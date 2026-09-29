// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import {
  applyItemRefresh,
  buyItem,
  itemRefreshQuote,
  parseItemResult,
  sellItem,
} from '../src/手机界面/apps/itemShop/itemShop';
import { initialStatDataSchema } from '../src/手机界面/store/initialDataSchema';
import type { stat_data } from '../src/手机界面/types';

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
  角色: { user: { 恶堕积分: 200, 物品: { 旧扣: item(3, 1, 2) } } },
  仓库: { 仓库药剂: item(5, 2, 1) },
  商店: { 旧扣: item(3, 2, 10) },
} as unknown as stat_data;
const stock = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`道具${index}`, item(3 + index, 2, 10)]));
stock.旧扣 = { ...item(999, 2, 8), 图标: icon.replace('#5274a2', '#ffffff'), 描述: '错误的新描述' };
delete stock.道具0;
const message = `<shopVariable>${JSON.stringify(stock)}</shopVariable>`;
assert.equal(initialStatDataSchema.shape.商店.safeParse({ 道具: item(3, 1) }).success, true);
assert.equal(itemRefreshQuote(data).price, 0, '每周首次刷新免费');
const directedData = structuredClone(data);
directedData.手机 = {
  定向刷新: { 请求ID: 'item-request', 类型: '道具', 要求: '适合调查的工具', 普通报价: 0 },
};
applyItemRefresh(
  directedData,
  `<shopVariable>${JSON.stringify(Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`测试${i}`, item(3, 1)])))}</shopVariable>`,
  true,
);
assert.equal(directedData.角色.user.恶堕积分, 170, '定向道具刷新加收 30 点');
assert.equal(directedData.手机.定向刷新, null, '成功结算后清除本次偏好');
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
assert.equal(parsed.旧扣.价格, 3, '同名道具保持旧规格');
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
assert.equal(partlyValidData.系统.商店主动刷新次数, 1, '部分有效仍只结算一次');
const higherRank = { ...stock, 道具1: { ...stock.道具1, 评级: 'S' } };
assert.equal(
  parseItemResult(`<shopVariable>${JSON.stringify(higherRank)}</shopVariable>`, data).道具1.评级,
  'S',
  '软评级上限不阻止生成',
);
assert.throws(() => parseItemResult('<shopVariable>{}</shopVariable>', data), /没有可上架的商品/);
assert.equal(parseItemResult(message + message, data).旧扣.价格, 3, '同楼旧标签不阻断最新结果');
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
insufficient.角色.user.恶堕积分 = 4;
const insufficientBefore = structuredClone(insufficient);
assert.throws(() => applyItemRefresh(insufficient, message), /积分不足/);
assert.deepEqual(insufficient, insufficientBefore, '不足 5 积分不得刷新或改写货架');
applyItemRefresh(data, message);
assert.equal(data.系统.商店主动刷新次数, 1);
assert.equal(data.系统.商店下次刷新时间, '2026-9-28T00:00[1]');
assert.equal(itemRefreshQuote(data).price, 0);
assert.equal(data.角色.user.恶堕积分, 200, '首次刷新不扣积分');
const repeated = structuredClone(data);
applyItemRefresh(repeated, message);
assert.equal(repeated.系统.商店主动刷新次数, 2);
assert.equal(itemRefreshQuote(repeated).price, 0, '第三次刷新仍免费');
applyItemRefresh(repeated, message);
assert.equal(repeated.系统.商店主动刷新次数, 3);
assert.equal(repeated.角色.user.恶堕积分, 200, '前三次刷新均不扣积分');
assert.equal(itemRefreshQuote(repeated).price, 5, '第四次刷新起收取 5 积分');
applyItemRefresh(repeated, message);
assert.equal(repeated.角色.user.恶堕积分, 195, '第四次刷新扣除 5 积分');
applyItemRefresh(repeated, message);
assert.equal(repeated.角色.user.恶堕积分, 190, '第五次刷新仍扣除 5 积分');
buyItem(data, '旧扣', 2);
assert.equal(data.角色.user.物品.旧扣.数量, 3);
assert.equal(data.角色.user.物品.旧扣.耐久, 6, '一件耐久 2 与两件耐久 8 加权向上取整');
assert.equal(data.商店.旧扣, undefined);
assert.equal(data.角色.user.恶堕积分, 194);
assert.equal(sellItem(data, '随身物品', '旧扣', 2), 2, '奇数单件价格先向下取整再乘数量');
assert.equal(data.角色.user.物品.旧扣.数量, 1);
assert.equal(sellItem(data, '仓库', '仓库药剂', 1), 2);
assert.equal(data.仓库.仓库药剂.数量, 1);
const unchanged = structuredClone(data);
assert.throws(() => buyItem(data, '道具1', 99), /数量/);
assert.throws(() => sellItem(data, '仓库', '仓库药剂', 99), /数量/);
assert.deepEqual(data, unchanged, '失败购买和出售不得改变量');
data.系统.商店主动刷新次数 = 200;
assert.equal(itemRefreshQuote(data).price, 5, '多次刷新费用保持 5 积分');
data.世界.时间 = '2026-9-28T00:00[1]';
assert.equal(itemRefreshQuote(data).price, 0, '周一重置前三次免费额度');
assert.ok(Object.keys(data.商店).length > 0, '跨周保留货架');
const balanceAfterWeekChange = data.角色.user.恶堕积分;
applyItemRefresh(data, message);
assert.equal(data.系统.商店主动刷新次数, 1, '跨周成功刷新从第一次重新计数');
assert.equal(data.角色.user.恶堕积分, balanceAfterWeekChange, '跨周第一次刷新免费');
console.info('组织道具商店定向验证通过。');
