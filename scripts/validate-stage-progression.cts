import assert from 'node:assert/strict';
import {
  settleCharacterStages,
  stageExperienceCost,
  stageExperienceProgress,
} from '../src/手机界面/store/stageProgression';
import type { stat_data, 阶段状态 } from '../src/手机界面/types';
import { adjacentLevelDescription } from '../src/手机界面/apps/data/entries';

function stage(min: number, max: number, level: number, experience: number): 阶段状态 {
  return {
    当前等级: level,
    累计经验: experience,
    描述: Object.fromEntries(Array.from({ length: max - min + 1 }, (_, index) => [String(min + index), '阶段描述'])),
  };
}

function data(stability: 阶段状态, affection = stage(-2, 3, 1, 0), corruption = stage(0, 8, 2, 0)): stat_data {
  return {
    角色: {
      主要角色: { 索菲亚: { 人设阶段: { 创伤稳定度: stability, 好感度: affection, 恶堕度: corruption } } },
      次要角色: { 旧存档角色: {}, 新角色: { 人设阶段: { 恶堕度: stage(0, 6, 0, 0) } } },
    },
  } as stat_data;
}

assert.deepEqual(
  [4, 3, 2, 1, 0].map(level => stageExperienceCost('创伤稳定度', level, 0, 5)),
  [33, 26, 28, 40, 62],
  '稳定度中间易变、两端阻尼，极端边界最难',
);
assert.equal(stageExperienceCost('创伤稳定度', -2, -2, 7), 68, '自定义负等级范围仍按比例计算');
assert.equal(stageExperienceCost('恶堕度', 6, 0, 8), 459, '恶堕度 6 级以上继续使用公式');
assert.deepEqual(
  (['D', 'C', 'B', 'A', 'S'] as const).map(rating =>
    Array.from({ length: 6 }, (_, level) => stageExperienceCost('恶堕度', level, 0, 6, rating)),
  ),
  [
    [33, 52, 81, 124, 192, 296],
    [36, 57, 88, 135, 209, 323],
    [42, 66, 103, 157, 244, 377],
    [48, 76, 117, 180, 279, 431],
    [54, 85, 132, 202, 314, 485],
  ],
  '恶堕经验按角色评级提高',
);
assert.equal(stageExperienceCost('恶堕度', 0, 0, 6, ''), 33, '评级未确定时沿用 D 级需求');
assert.throws(() => stageExperienceCost('恶堕度', 0, 0, 6, 'A级'), /当前评级.*无效/);
assert.equal(stageExperienceCost('好感度', -2, -2, 3), 32, '好感度负极端边界与正极端对称');
assert.deepEqual(stageExperienceProgress(stage(0, 5, 3, 13), '创伤稳定度'), {
  direction: 'forward',
  percent: 50,
});
assert.deepEqual(stageExperienceProgress(stage(0, 5, 4, -13), '创伤稳定度'), {
  direction: 'backward',
  percent: 50,
});
assert.deepEqual(stageExperienceProgress(stage(0, 5, 5, 0), '创伤稳定度'), {
  direction: 'forward',
  percent: 100,
});
assert.deepEqual(stageExperienceProgress(stage(0, 5, 0, -10), '创伤稳定度'), {
  direction: 'none',
  percent: 0,
});
assert.deepEqual(stageExperienceProgress(stage(0, 6, 2, -10), '恶堕度'), {
  direction: 'none',
  percent: 0,
});
assert.deepEqual(stageExperienceProgress(stage(0, 6, 0, 27), '恶堕度', 'S'), {
  direction: 'forward',
  percent: 50,
});
const previewStage = { 当前等级: 1, 累计经验: 5, 描述: { '0': '上一阶段', '1': '当前阶段', '2': '下一阶段' } };
assert.deepEqual(adjacentLevelDescription(previewStage, '好感度'), {
  level: 2,
  direction: '前进',
  description: '下一阶段',
});
previewStage.累计经验 = -5;
assert.deepEqual(adjacentLevelDescription(previewStage, '创伤稳定度'), {
  level: 0,
  direction: '回退',
  description: '上一阶段',
});
assert.deepEqual(adjacentLevelDescription(previewStage, '恶堕度'), {
  level: 2,
  direction: '前进',
  description: '下一阶段',
});
previewStage.当前等级 = 0;
assert.equal(adjacentLevelDescription(previewStage, '好感度'), undefined);

const mildPressure = data(stage(0, 5, 5, -30));
assert.equal(settleCharacterStages(mildPressure), false, '单轮重大影响不能从全新 5 级直接降级');
assert.equal(mildPressure.角色.主要角色.索菲亚.人设阶段.创伤稳定度.累计经验, -30);

const sustainedPressure = data(stage(0, 5, 5, -100));
assert.equal(settleCharacterStages(sustainedPressure), true);
assert.deepEqual(
  sustainedPressure.角色.主要角色.索菲亚.人设阶段.创伤稳定度,
  stage(0, 5, 2, -13),
  '连续跨过 5→4、4→3、3→2，逐级扣除 33+26+28',
);
assert.equal(settleCharacterStages(sustainedPressure), false, '重复变量事件不能再次降级');

const extreme = data(stage(0, 5, 1, -62));
assert.equal(settleCharacterStages(extreme), true);
assert.equal(extreme.角色.主要角色.索菲亚.人设阶段.创伤稳定度.当前等级, 0);
extreme.角色.主要角色.索菲亚.人设阶段.创伤稳定度.累计经验 = 62;
assert.equal(settleCharacterStages(extreme), true);
assert.equal(extreme.角色.主要角色.索菲亚.人设阶段.创伤稳定度.当前等级, 1);

const relationships = data(stage(0, 5, 5, 0), stage(-2, 3, 1, -60));
assert.equal(settleCharacterStages(relationships), true);
assert.equal(relationships.角色.主要角色.索菲亚.人设阶段.好感度.当前等级, -1);
assert.equal(relationships.角色.主要角色.索菲亚.人设阶段.好感度.累计经验, -20);

const corruption = data(stage(0, 5, 5, 0), stage(-2, 3, 1, 0), stage(0, 8, 2, -10));
assert.equal(settleCharacterStages(corruption), false, '恶堕负经验不使等级回退');
corruption.角色.主要角色.索菲亚.人设阶段.恶堕度.累计经验 += 91;
assert.equal(settleCharacterStages(corruption), true);
assert.equal(corruption.角色.主要角色.索菲亚.人设阶段.恶堕度.当前等级, 3);
assert.equal(corruption.角色.主要角色.索菲亚.人设阶段.恶堕度.累计经验, 0);

const rated = data(stage(0, 5, 5, 0), stage(-2, 3, 1, 0), stage(0, 8, 0, 124));
rated.角色.主要角色.索菲亚.当前评级 = 'A';
assert.equal(settleCharacterStages(rated), true);
assert.equal(rated.角色.主要角色.索菲亚.人设阶段.恶堕度.当前等级, 2);
assert.equal(rated.角色.主要角色.索菲亚.人设阶段.恶堕度.累计经验, 0);
const ratedMinor = data(stage(0, 5, 5, 0));
ratedMinor.角色.次要角色.新角色.当前评级 = 'S';
ratedMinor.角色.次要角色.新角色.人设阶段!.恶堕度.累计经验 = 53;
assert.equal(settleCharacterStages(ratedMinor), false, 'S 级次要角色在 53 点时尚未晋级');
ratedMinor.角色.次要角色.新角色.人设阶段!.恶堕度.累计经验 = 54;
assert.equal(settleCharacterStages(ratedMinor), true, 'S 级次要角色按 54 点晋级');

const minor = data(stage(0, 5, 5, 0));
minor.角色.次要角色.新角色.人设阶段!.恶堕度.累计经验 = 33;
assert.equal(settleCharacterStages(minor), true, '新次要角色参与结算，旧存档缺字段可继续读取');
assert.equal(minor.角色.次要角色.新角色.人设阶段!.恶堕度.当前等级, 1);
minor.角色.次要角色.新角色.人设阶段!.好感度 = stage(-2, 5, 0, 20);
assert.equal(settleCharacterStages(minor), true, '次要角色好感度沿用主要角色跨级规则');
assert.equal(minor.角色.次要角色.新角色.人设阶段!.好感度!.当前等级, 1);
minor.角色.次要角色.新角色.人设阶段!.好感度!.累计经验 = -20;
assert.equal(settleCharacterStages(minor), true, '次要角色好感度允许回退');
assert.equal(minor.角色.次要角色.新角色.人设阶段!.好感度!.当前等级, 0);

const limits = data(stage(0, 5, 5, 1000), stage(-2, 3, -2, -1000));
assert.equal(settleCharacterStages(limits), false, '范围端点保留超出经验，不产生不存在的描述等级');

const invalid = data(stage(0, 5, 5, Number.NaN));
assert.throws(() => settleCharacterStages(invalid), /累计经验无效/);
const missingLevel = data(stage(0, 5, 5, -33));
delete missingLevel.角色.主要角色.索菲亚.人设阶段.创伤稳定度.描述['3'];
assert.throws(() => settleCharacterStages(missingLevel), /描述等级必须连续/);

console.log('人设阶段：三条曲线、负经验、多级、端点、恶堕锁级及次要角色结算通过。');
