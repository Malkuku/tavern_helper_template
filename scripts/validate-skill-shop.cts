import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applySkillRefresh, buySkill, refreshQuote, sellSkill } from '../src/手机界面/apps/skillShop/skillShop';
import { initialStatDataSchema, userRoleSchema } from '../src/手机界面/store/initialDataSchema';

const resourceRoot = 'O:\\St Working\\角色卡开发\\魔法少女恶堕\\魔法少女恶堕\\系统配置';
const roleResource = JSON.parse(readFileSync(`${resourceRoot}\\角色资源.json`, 'utf8'));
const user = Object.values(roleResource).find((item: any) => item.type === 'user') as any;
assert.ok(userRoleSchema.safeParse(user.data).success, '初始 user 技能必须符合单版本结构');
const opening = JSON.parse(readFileSync(`${resourceRoot}\\唯一开局.json`, 'utf8'));
assert.ok(initialStatDataSchema.shape.系统.safeParse(opening.固定数据.系统).success, '刷新状态必须符合系统变量契约');

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
const data: any = {
  世界: { 时间: '2026-9-26T03:10[6]' },
  系统: { 技能下次刷新时间: '', 技能主动刷新次数: 0 },
  角色: { user: { 恶堕积分: 200, 技能: { 战败收容: skill(2, 0) } } },
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
assert.throws(
  () => applySkillRefresh(structuredClone(data), `<skillVariable>${JSON.stringify(weaker)}</skillVariable>`),
  /必须提高/,
);
const missingIcon = { ...stock, 新技能一: { ...stock.新技能一, 图标: '' } };
assert.throws(
  () => applySkillRefresh(structuredClone(data), `<skillVariable>${JSON.stringify(missingIcon)}</skillVariable>`),
  /字段无效/,
);
assert.equal(refreshQuote(data).price, 0);
applySkillRefresh(data, result);
assert.equal(data.角色.user.恶堕积分, 200);
assert.equal(data.系统.技能主动刷新次数, 1);
assert.equal(data.系统.技能下次刷新时间, '2026-9-28T00:00[1]');
assert.equal(refreshQuote(data).price, 20);
buySkill(data, '战败收容');
assert.equal(data.角色.user.技能.战败收容.价格, 25, '升级售价加入累计价格');
assert.equal(data.角色.user.恶堕积分, 175);
assert.equal(data.技能商店.战败收容, undefined);
assert.equal(sellSkill(data, '战败收容'), 12, '出售价格向下取整');
assert.equal(data.角色.user.恶堕积分, 187);
assert.equal(data.角色.user.技能.战败收容, undefined);
buySkill(data, '新技能一');
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
