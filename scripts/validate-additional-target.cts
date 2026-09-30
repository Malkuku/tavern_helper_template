import assert from 'node:assert/strict';
import { selectAdditionalTarget, additionalTargetPrice } from '../src/手机界面/apps/data/selectTarget';
import { observationRoster } from '../src/手机界面/apps/data/observationTargets';
import type { stat_data } from '../src/手机界面/types';

const base = () =>
  ({
    系统: { 已发现目标: ['鹭见凛'] },
    角色: {
      user: { 恶堕积分: 30 },
      主要角色: { 鹭见凛: {}, 林沐沐: {} },
      次要角色: { 路人: {} },
    },
  }) as unknown as stat_data;

const selected = base();
assert.deepEqual(
  observationRoster(selected).map(target => target.key),
  ['鹭见凛', '林沐沐', '路人'],
);
selectAdditionalTarget(selected, '主要角色', '林沐沐');
assert.deepEqual(selected.系统.已发现目标, ['鹭见凛', '林沐沐']);
assert.deepEqual(
  observationRoster(selected).map(target => target.key),
  ['鹭见凛', '林沐沐', '路人'],
);
assert.equal(selected.角色.user.恶堕积分, 30 - additionalTargetPrice);
assert.throws(() => selectAdditionalTarget(selected, '主要角色', '林沐沐'), /已经是目标/);
assert.equal(selected.角色.user.恶堕积分, 10);

const insufficient = base();
insufficient.角色.user.恶堕积分 = 19;
assert.throws(() => selectAdditionalTarget(insufficient, '次要角色', '路人'), /积分不足/);
assert.deepEqual(insufficient.系统.已发现目标, ['鹭见凛']);
assert.equal(insufficient.角色.user.恶堕积分, 19);

const absent = base();
assert.throws(() => selectAdditionalTarget(absent, '主要角色', '不存在'), /角色已不存在/);
assert.equal(absent.角色.user.恶堕积分, 30);

const noFirst = base();
noFirst.系统.已发现目标 = [];
assert.throws(() => selectAdditionalTarget(noFirst, '主要角色', '林沐沐'), /首位/);
assert.equal(noFirst.角色.user.恶堕积分, 30);

console.log('additional target selection passed');
