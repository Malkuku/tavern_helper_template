import assert from 'node:assert/strict';
import { klona } from 'klona';
import {
  establishNewRoleRewardBaselines,
  markCorruptionRewardMailRead,
  settleCorruptionRewards,
} from '../src/手机界面/store/corruptionRewards';
import { settleCharacterStages } from '../src/手机界面/store/stageProgression';
import type { stat_data, 阶段状态 } from '../src/手机界面/types';

function stage(level: number, experience = 0): 阶段状态 {
  return {
    当前等级: level,
    累计经验: experience,
    描述: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, '阶段'])),
  };
}
function fixture(): stat_data {
  return {
    世界: { 时间: '2026-9-29T12:00[2]' },
    角色: {
      user: { 恶堕积分: 10 },
      主要角色: {
        A角色: { 当前评级: 'A', 人设阶段: { 创伤稳定度: stage(5), 好感度: stage(0), 恶堕度: stage(0, 77) } },
        S角色: { 当前评级: 'S', 人设阶段: { 创伤稳定度: stage(5), 好感度: stage(0), 恶堕度: stage(4) } },
      },
      次要角色: { 未知评级: { 当前评级: '', 人设阶段: { 恶堕度: stage(0, 30) } } },
    },
    手机: {
      微信: {},
      恶堕奖励: { 已奖励等级: { '主要角色:A角色': 0, '主要角色:S角色': 4 }, 邮件: [] },
    },
  } as stat_data;
}

const data = fixture();
assert.equal(establishNewRoleRewardBaselines(data), true, '新加入角色建立基线');
assert.equal(data.手机.恶堕奖励.已奖励等级['主要角色:S角色'], 4, '初始等级不发奖');
assert.equal(settleCharacterStages(data), true);
assert.equal(settleCorruptionRewards(data), true);
assert.equal(data.角色.user.恶堕积分, 450, 'A 级跨入 1/2 级均发放 220 点');
assert.deepEqual(
  data.手机.恶堕奖励.邮件.map(mail => mail.积分),
  [220, 220],
);
assert.equal(data.手机.恶堕奖励.邮件[0].已读, false);
assert.equal(data.手机.恶堕奖励.已奖励等级['次要角色:未知评级'], 0, '评级未知时保留待发等级');
assert.equal(settleCorruptionRewards(data), false, '重复事件不重复发放');
assert.equal(data.角色.user.恶堕积分, 450);

data.角色.次要角色.未知评级.当前评级 = 'D';
assert.equal(settleCorruptionRewards(data), true, '评级确定后补发新晋级');
assert.equal(data.角色.user.恶堕积分, 510);
assert.equal(markCorruptionRewardMailRead(data, '次要角色:未知评级:1'), true);
assert.equal(markCorruptionRewardMailRead(data, '次要角色:未知评级:1'), false);
assert.equal(data.手机.恶堕奖励.邮件.filter(mail => !mail.已读).length, 2);

const replay = klona(data);
assert.equal(establishNewRoleRewardBaselines(replay), false);
assert.equal(settleCorruptionRewards(replay), false, '存档重载后不重复发放');
assert.throws(() => markCorruptionRewardMailRead(replay, 'missing'), /已不存在/);

const sGrade = fixture();
sGrade.角色.主要角色.S角色.人设阶段.恶堕度.累计经验 = 174;
establishNewRoleRewardBaselines(sGrade);
settleCharacterStages(sGrade);
settleCorruptionRewards(sGrade);
assert.equal(sGrade.手机.恶堕奖励.邮件.find(mail => mail.角色 === 'S角色')?.积分, 300);
assert.equal(sGrade.手机.恶堕奖励.已奖励等级['主要角色:S角色'], 5);

for (const [rating, each] of [
  ['D', 60],
  ['C', 100],
  ['B', 150],
  ['A', 220],
  ['S', 300],
] as const) {
  const fullProgression = fixture();
  fullProgression.角色.主要角色.A角色.当前评级 = rating;
  fullProgression.角色.主要角色.A角色.人设阶段.恶堕度.当前等级 = 6;
  establishNewRoleRewardBaselines(fullProgression);
  assert.equal(settleCorruptionRewards(fullProgression), true);
  assert.equal(fullProgression.角色.user.恶堕积分, 10 + 6 * each, `${rating} 级从恶堕 0 到 6 级的累计奖励`);
  assert.deepEqual(
    fullProgression.手机.恶堕奖励.邮件.filter(mail => mail.角色 === 'A角色').map(mail => mail.积分),
    Array(6).fill(each),
    `${rating} 级前后六次晋级奖励相同`,
  );
}

const invalidRating = fixture();
invalidRating.角色.主要角色.A角色.当前评级 = 'A级';
establishNewRoleRewardBaselines(invalidRating);
settleCharacterStages(invalidRating);
assert.throws(() => settleCorruptionRewards(invalidRating), /当前评级无效/);

console.log('恶堕晋级奖励：初始及新角色基线、跨级、评级、一次性、邮件已读和重载通过。');
