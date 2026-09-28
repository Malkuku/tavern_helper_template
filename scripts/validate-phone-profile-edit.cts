import assert from 'node:assert/strict';
import { applyProfileEdit, profileFieldValue } from '../src/手机界面/apps/data/profileEdit';
import type { stat_data } from '../src/手机界面/types';

const data = {
  角色: {
    user: {
      基础信息: { 身份: ['学生'], 背景: '原背景' },
      外貌: '原外貌',
      性格: '原性格',
      当前评级: 'D',
      恶堕积分: 5,
    },
  },
} as stat_data;

for (const [field, value] of [
  ['背景', '新背景'],
  ['外貌', '新外貌'],
  ['性格', '新性格'],
] as const) {
  const before = JSON.parse(JSON.stringify(data)) as stat_data;
  applyProfileEdit(data, field, value);
  assert.equal(profileFieldValue(data.角色.user, field), value);
  for (const other of ['背景', '外貌', '性格'] as const) {
    if (other !== field)
      assert.equal(profileFieldValue(data.角色.user, other), profileFieldValue(before.角色.user, other));
  }
  assert.deepEqual(data.角色.user.基础信息.身份, ['学生']);
  assert.equal(data.角色.user.当前评级, 'D');
  assert.equal(data.角色.user.恶堕积分, 5);
}

console.log('我的档案：背景、外貌、性格分别保存且其他字段不变。');
