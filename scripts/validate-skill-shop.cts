// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'node:fs';
import {
  applySkillRefresh,
  buySkill,
  MAX_SKILL_SLOT_PRICE,
  nextSkillSlotPrice,
  enabledSkillCount,
  setSkillEnabled,
  refreshQuote,
  sellSkill,
  skillSlotCount,
  unlockSkillSlot,
} from '../src/手机界面/apps/skillShop/skillShop';
import { initialStatDataSchema, userRoleSchema } from '../src/手机界面/store/initialDataSchema';
import { settleUserRating, userRatingFromContribution } from '../src/手机界面/store/userRating';
import { buildUsePrompt } from '../src/变量卷轴/UI/usePrompt';

const root = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕';
const roles = JSON.parse(readFileSync(`${root}\\系统配置\\角色资源.json`, 'utf8'));
const user = Object.values(roles).find((item: any) => item.type === 'user') as any;
assert.ok(userRoleSchema.safeParse(user.data).success, '开局用户使用新技能契约和累计贡献');
assert.ok(
  Object.values(user.data.技能).every((item: any) => item.启用 === true),
  '开局技能明确启用',
);
const opening = JSON.parse(readFileSync(`${root}\\系统配置\\唯一开局.json`, 'utf8'));
assert.ok(initialStatDataSchema.shape.技能商店.safeParse(opening.固定数据.技能商店).success);
const rule = readFileSync(`${root}\\更新规则\\生成技能.ini`, 'utf8');
assert.ok(rule.includes('D级：建议 25～35'));
assert.ok(rule.includes('不得高于玩家当前评级一档'));
assert.ok(!rule.includes('战力评级贡献'));
assert.ok(!rule.includes('适用评级'));
const example = /<skillVariable>\s*(\{[\s\S]*?\})\s*<\/skillVariable>/.exec(rule);
assert.ok(example);
assert.ok(initialStatDataSchema.shape.技能商店.safeParse(JSON.parse(example[1])).success, '生成规则示例符合新技能字段');

for (const [points, expected] of [
  [0, 'D'],
  [9, 'D'],
  [10, 'C'],
  [39, 'C'],
  [40, 'B'],
  [119, 'B'],
  [120, 'A'],
  [359, 'A'],
  [360, 'S'],
] as const)
  assert.equal(userRatingFromContribution(points), expected);

const skill = (rating: 'D' | 'C' | 'B' | 'A' | 'S', price = 30) => ({
  描述: '测试技能',
  作用: '在五米内生效，持续一分钟。',
  价格: price,
  评级: rating,
});
const data: any = {
  世界: { 时间: '2026-9-26T03:10[6]' },
  系统: { 技能下次刷新时间: '', 技能主动刷新次数: 0 },
  角色: { user: { 当前评级: 'D', 评级贡献: 0, 恶堕积分: 200, 技能栏位: 6, 技能: { 旧技能: skill('D', 0) } } },
  技能商店: {},
};
const stock = { 旧技能: skill('C', 80), 新技能: skill('D', 30), 越级技能: skill('B', 220) };
assert.equal(refreshQuote(data).price, 5, '技能首次刷新收取 5 积分');
applySkillRefresh(data, `<skillVariable>${JSON.stringify(stock)}</skillVariable>`);
assert.equal(data.角色.user.恶堕积分, 195, '技能首次刷新扣除 5 积分');
assert.equal(refreshQuote(data).price, 10, '第二次刷新报价 10 积分');
for (const [count, price] of [
  [2, 15],
  [3, 20],
  [4, 20],
] as const) {
  data.系统.技能主动刷新次数 = count;
  assert.equal(refreshQuote(data).price, price);
}
data.系统.技能主动刷新次数 = 1;
assert.equal(data.技能商店.越级技能, undefined, 'D 玩家不能刷出 B 技能');
assert.equal(data.技能商店.旧技能.评级, 'C', '高一档技能可出现');
assert.equal(data.系统.技能主动刷新次数, 1, '部分有效仍结算刷新');
buySkill(data, '旧技能');
assert.equal(data.角色.user.技能.旧技能.评级, 'C', '同名技能升级为完整新版本');
assert.equal(data.角色.user.当前评级, 'D', '技能升级不改变玩家评级');
assert.equal(data.角色.user.评级贡献, 0);
assert.equal(sellSkill(data, '旧技能'), 40);
assert.equal(data.角色.user.当前评级, 'D', '出售技能不降级');
data.角色.user.评级贡献 = 40;
assert.equal(settleUserRating(data), true);
assert.equal(data.角色.user.当前评级, 'B');
assert.equal(settleUserRating(data), false);
const highStock = { A技能: skill('A', 230), S技能: skill('S', 2200) };
data.系统.技能下次刷新时间 = '';
data.系统.技能主动刷新次数 = 0;
applySkillRefresh(data, `<skillVariable>${JSON.stringify(highStock)}</skillVariable>`);
assert.ok(data.技能商店.A技能);
assert.equal(data.技能商店.S技能, undefined, 'B 玩家不能刷出 S 技能');

const slots: any = {
  角色: {
    user: {
      当前评级: 'D',
      评级贡献: 0,
      恶堕积分: 1100,
      技能栏位: 6,
      技能: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`技能${i}`, skill('D', 0)])),
    },
  },
  技能商店: { 新技能: skill('D', 30), 技能0: skill('C', 80) },
};
assert.equal(skillSlotCount(slots), 6);
buySkill(slots, '新技能');
assert.equal(slots.角色.user.技能.新技能.启用, false, '满位购买后新技能保持关闭');
assert.equal(enabledSkillCount(slots), 6);
assert.throws(() => buildUsePrompt(slots, 'skills', '新技能', 1), /尚未启用/);
assert.throws(() => setSkillEnabled(slots, '新技能', true), /技能栏位已满/);
setSkillEnabled(slots, '技能1', false);
setSkillEnabled(slots, '新技能', true);
assert.equal(enabledSkillCount(slots), 6);
assert.equal(slots.角色.user.技能.新技能.启用, true);
assert.match(buildUsePrompt(slots, 'skills', '新技能', 1), /新技能/);
setSkillEnabled(slots, '新技能', false);
buySkill(slots, '技能0');
assert.equal(Object.keys(slots.角色.user.技能).length, 7, '满位仍可升级');
assert.equal(slots.角色.user.技能.技能0.启用, true, '升级保留启用状态');
assert.equal(nextSkillSlotPrice(slots), 50);
assert.equal(unlockSkillSlot(slots), 50);
setSkillEnabled(slots, '新技能', true);
assert.equal(Object.keys(slots.角色.user.技能).length, 7);
assert.equal(enabledSkillCount(slots), 6);
assert.equal(MAX_SKILL_SLOT_PRICE, 700);
slots.角色.user.恶堕积分 = 10000;
for (let target = 8; target <= 23; target++) {
  assert.equal(nextSkillSlotPrice(slots), Math.min((target - 6) * 50, 700));
  assert.equal(unlockSkillSlot(slots), Math.min((target - 6) * 50, 700));
  assert.equal(skillSlotCount(slots), target);
}
assert.equal(nextSkillSlotPrice(slots), 700);
assert.ok(userRoleSchema.shape.技能栏位.safeParse(23).success);
const roleList = readFileSync(`${root}\\人设\\角色列表.ini`, 'utf8');
const roleListCode = roleList.split('<%_\nconst messages')[1]?.split('_%>')[0];
assert.ok(roleListCode, '角色列表包含可执行的角色筛选逻辑');
const renderRoleList = new Function('getChatMessages', 'getvar', `const messages${roleListCode}; return output;`);
const visible = renderRoleList(
  () => [],
  (path: string) => (path === 'stat_data.角色.user' ? slots.角色.user : {}),
);
assert.ok(visible.user.技能.技能0, '启用技能进入上下文');
assert.equal(visible.user.技能.技能1, undefined, '关闭技能不进入上下文');
console.info('技能商店与贡献评级定向验证通过。');
