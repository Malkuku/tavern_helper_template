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
const stock = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`道具${index}`, item(3 + index, 2, 10)]));
stock.旧扣 = { ...item(999, 2, 8), 图标: icon.replace('#5274a2', '#ffffff'), 描述: '错误的新描述' };
delete stock.道具0;
const message = `<shopVariable>${JSON.stringify(stock)}</shopVariable>`;
assert.equal(initialStatDataSchema.shape.商店.safeParse({ 道具: item(3, 1) }).success, true);
assert.equal(itemRefreshQuote(data).price, 0);
const parsed = parseItemResult(message, data);
assert.equal(Object.keys(parsed).length, 9);
assert.equal(parsed.旧扣.价格, 3, '同名道具保持旧规格');
assert.equal(parsed.旧扣.图标, icon, '同名道具保持旧 SVG');
const conflictingSources = structuredClone(data);
conflictingSources.仓库.旧扣 = { ...item(5, 1), 描述: '不同规格' };
assert.throws(() => parseItemResult(message, conflictingSources), /规格不一致/);
const higherRank = { ...stock, 道具1: { ...stock.道具1, 评级: 'S' } };
assert.equal(
  parseItemResult(`<shopVariable>${JSON.stringify(higherRank)}</shopVariable>`, data).道具1.评级,
  'S',
  '软评级上限不阻止生成',
);
assert.throws(() => parseItemResult('<shopVariable>{}</shopVariable>', data), /9 个/);
assert.equal(parseItemResult(message + message, data).旧扣.价格, 3, '同楼旧标签不阻断最新结果');
const unsafeItem = { ...stock, 道具1: { ...stock.道具1, 图标: '<svg onload="alert(1)"></svg>', 备注: '额外说明' } };
const sanitized = parseItemResult(`<shopVariable>${JSON.stringify(unsafeItem)}</shopVariable>`, data);
assert.equal(sanitized.道具1.图标, undefined, '无效图标回退为默认图标');
assert.equal(sanitized.道具1.备注, undefined, '额外字段不写入变量');
const before = structuredClone(data);
assert.throws(() => applyItemRefresh(data, '<shopVariable>{}</shopVariable>'));
assert.deepEqual(data, before, '无效生成不得部分写入');
applyItemRefresh(data, message);
assert.equal(data.系统.商店主动刷新次数, 1);
assert.equal(data.系统.商店下次刷新时间, '2026-9-28T00:00[1]');
assert.equal(itemRefreshQuote(data).price, 5);
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
assert.equal(itemRefreshQuote(data).price, 20, '道具刷新费封顶 20');
data.世界.时间 = '2026-9-28T00:00[1]';
assert.equal(itemRefreshQuote(data).price, 0, '周一仅重置报价');
assert.ok(Object.keys(data.商店).length > 0, '跨周保留货架');
console.info('组织道具商店定向验证通过。');
