import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applySkillRefresh, buySkill, refreshQuote, sellSkill } from '../src/手机界面/apps/skillShop/skillShop';
import { initialStatDataSchema, userRoleSchema } from '../src/手机界面/store/initialDataSchema';
import { settleUserRating, userRatingFromSkills } from '../src/手机界面/store/userRating';

const resourceRoot = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕\\系统配置';
const roleResource = JSON.parse(readFileSync(`${resourceRoot}\\角色资源.json`, 'utf8'));
const user = Object.values(roleResource).find((item: any) => item.type === 'user') as any;
assert.ok(userRoleSchema.safeParse(user.data).success, '初始 user 技能必须符合单版本结构');
const opening = JSON.parse(readFileSync(`${resourceRoot}\\唯一开局.json`, 'utf8'));
assert.ok(initialStatDataSchema.shape.系统.safeParse(opening.固定数据.系统).success, '刷新状态必须符合系统变量契约');
const generationRule = readFileSync(`${resourceRoot}\\..\\更新规则\\生成技能.ini`, 'utf8');
assert.match(generationRule, /总贡献 0~39 为 D，40~179 为 C，180~999 为 B，1000~2999 为 A，3000 及以上为 S/);

const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#31204b" d="M2 2h20v20H2z"/></svg>';
const skill = (power: number, price: number) => ({
  图标: icon,
  描述: '技能介绍',
  战力评级贡献: power,
  作用: '在五米内对目标产生持续一分钟的效果，强光下失效。',
  价格: price,
  适用评级: 'D',
});
for (const [score, rating] of [
  [0, 'D'],
  [30, 'D'],
  [39, 'D'],
  [40, 'C'],
  [150, 'C'],
  [179, 'C'],
  [180, 'B'],
  [800, 'B'],
  [999, 'B'],
  [1000, 'A'],
  [2999, 'A'],
  [3000, 'S'],
] as const) {
  assert.equal(userRatingFromSkills({ 测试技能: skill(score, 0) }), rating, `${score} 分的评级`);
}
const data: any = {
  世界: { 时间: '2026-9-26T03:10[6]' },
  系统: { 技能下次刷新时间: '', 技能主动刷新次数: 0 },
  角色: { user: { 当前评级: 'D', 恶堕积分: 200, 技能: { 战败收容: skill(2, 0) } } },
  技能商店: {},
};
const stock = {
  战败收容: skill(3, 25),
  新技能一: skill(1, 20),
  新技能二: skill(1, 20),
  新技能三: skill(1, 20),
  新技能四: skill(1, 20),
  新技能五: skill(1, 20),
};
const result = `<skillVariable>${JSON.stringify(stock)}</skillVariable>`;
const weaker = { ...stock, 战败收容: skill(2, 25) };
const flatData = structuredClone(data);
applySkillRefresh(flatData, `<skillVariable>${JSON.stringify(weaker)}</skillVariable>`);
assert.equal(flatData.技能商店.战败收容.战力评级贡献, 2, '贡献持平的新版本仍可上架');
buySkill(flatData, '战败收容');
assert.equal(flatData.角色.user.技能.战败收容.战力评级贡献, 2, '玩家可以购买贡献持平的新版本');
const missingIcon = { ...stock, 新技能一: { ...stock.新技能一, 图标: '' } };
const iconData = structuredClone(data);
applySkillRefresh(iconData, `<skillVariable>${JSON.stringify(missingIcon)}</skillVariable>`);
assert.equal(iconData.技能商店.新技能一.图标, undefined, '无效图标回退为默认图标');
const extraData = structuredClone(data);
applySkillRefresh(
  extraData,
  `${result}<skillVariable>${JSON.stringify({ ...stock, 新技能一: { ...stock.新技能一, 备注: '额外说明' } })}</skillVariable>`,
);
assert.equal(extraData.技能商店.新技能一.备注, undefined, '额外字段不写入变量');
assert.equal(refreshQuote(data).price, 0);
applySkillRefresh(data, result);
assert.equal(data.角色.user.恶堕积分, 200);
assert.equal(data.系统.技能主动刷新次数, 1);
assert.equal(data.系统.技能下次刷新时间, '2026-9-28T00:00[1]');
assert.equal(refreshQuote(data).price, 20);
data.系统.技能主动刷新次数 = 200;
assert.equal(refreshQuote(data).price, 80, '技能刷新费封顶 80');
data.系统.技能主动刷新次数 = 1;
buySkill(data, '战败收容');
assert.equal(data.角色.user.技能.战败收容.价格, 25, '升级售价加入累计价格');
assert.equal(data.角色.user.恶堕积分, 175);
assert.equal(data.技能商店.战败收容, undefined);
assert.equal(sellSkill(data, '战败收容'), 12, '出售价格向下取整');
assert.equal(data.角色.user.恶堕积分, 187);
assert.equal(data.角色.user.技能.战败收容, undefined);
buySkill(data, '新技能一');
assert.equal(data.角色.user.当前评级, 'D');
const cSkillData: any = {
  角色: { user: { 当前评级: 'D', 恶堕积分: 200, 技能: { 战败收容: skill(2, 0) } } },
  技能商店: { 初次购买: skill(25, 20), 再次购买: skill(20, 20) },
};
buySkill(cSkillData, '初次购买');
assert.equal(cSkillData.角色.user.当前评级, 'D', '单买一项 C 级贡献技能不直接升 C');
buySkill(cSkillData, '再次购买');
assert.equal(cSkillData.角色.user.当前评级, 'C', '多项技能累计贡献达到门槛才升 C');
sellSkill(cSkillData, '再次购买');
assert.equal(cSkillData.角色.user.当前评级, 'D', '跌破门槛时降级');
const ratingData: any = {
  角色: { user: { 当前评级: 'D', 恶堕积分: 200, 技能: { 战败收容: skill(2, 0) } } },
  技能商店: { 强化: skill(80, 20) },
};
buySkill(ratingData, '强化');
assert.equal(ratingData.角色.user.当前评级, 'C', '新购技能后评级同步上升，但不直接到技能自身的 B 级');
ratingData.技能商店.强化 = skill(180, 20);
buySkill(ratingData, '强化');
assert.equal(ratingData.角色.user.当前评级, 'B', '升级技能后评级同步上升');
sellSkill(ratingData, '强化');
assert.equal(ratingData.角色.user.当前评级, 'D', '出售技能后评级同步下降');
ratingData.角色.user.技能.剧情技能 = skill(3000, 0);
assert.equal(settleUserRating(ratingData), true, '剧情直接修改技能后可结算评级');
assert.equal(ratingData.角色.user.当前评级, 'S');
assert.equal(settleUserRating(ratingData), false, '评级无变化时不重复写回');
const invalidRatingData = structuredClone(ratingData);
invalidRatingData.技能商店.异常技能 = skill(NaN, 0);
assert.throws(() => buySkill(invalidRatingData, '异常技能'), /战力评级贡献无效/);
assert.equal(invalidRatingData.角色.user.恶堕积分, ratingData.角色.user.恶堕积分, '评级计算失败不扣费');
const before = structuredClone(data);
assert.throws(() => applySkillRefresh(data, '<skillVariable>{}</skillVariable>'));
assert.deepEqual(data, before, '无效生成不得部分结算');
const nextStock = { ...stock, 战败收容: skill(3, 25), 新技能一: skill(2, 20) };
applySkillRefresh(data, `<skillVariable>${JSON.stringify(nextStock)}</skillVariable>`);
assert.equal(data.角色.user.恶堕积分, 147, '本周第二次刷新花费 20');
data.世界.时间 = '2026-9-28T00:00[1]';
assert.equal(refreshQuote(data).price, 0, '周一报价重置');
assert.equal(Object.keys(data.技能商店).length, 6, '跨周保留货架');
applySkillRefresh(data, `<skillVariable>${JSON.stringify(nextStock)}</skillVariable>`);
assert.equal(data.系统.技能主动刷新次数, 1);
assert.equal(data.系统.技能下次刷新时间, '2026-10-5T00:00[1]');
console.info('技能商店定向验证通过。');
