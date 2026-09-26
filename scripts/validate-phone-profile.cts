import assert from 'node:assert/strict';
import { applyCharacterUnlock, unlockPrice } from '../src/手机界面/apps/data/profileUnlock';
import { currentLevelDescription } from '../src/手机界面/apps/data/entries';
import type { stat_data } from '../src/手机界面/types';

function state(balance: number): stat_data {
  return {
    角色: {
      user: { 恶堕积分: balance },
      主要角色: { 甲: {}, 乙: {} },
      次要角色: { 丙: {} },
    },
    手机: {},
  } as stat_data;
}

const data = state(40);
assert.equal(unlockPrice('主要角色', '核心创伤'), 20);
assert.equal(applyCharacterUnlock(data, '主要角色', '甲', '核心创伤'), true);
assert.equal(data.角色.user.恶堕积分, 20);
assert.deepEqual(data.手机.档案解锁?.主要角色?.甲, ['核心创伤']);
assert.equal(applyCharacterUnlock(data, '主要角色', '甲', '核心创伤'), false);
assert.equal(data.角色.user.恶堕积分, 20, '重复点击不重复扣费');
assert.equal(applyCharacterUnlock(data, '次要角色', '丙', '性格侧写'), true);
assert.equal(data.角色.user.恶堕积分, 15);
assert.equal(data.手机.档案解锁?.主要角色?.乙, undefined, '角色之间不共享解锁');

const poor = state(3);
assert.throws(() => applyCharacterUnlock(poor, '主要角色', '甲', '核心创伤'), /积分不足/);
assert.equal(poor.角色.user.恶堕积分, 3);
assert.equal(poor.手机.档案解锁, undefined, '失败时不写入解锁记录');
assert.throws(() => applyCharacterUnlock(poor, '主要角色', '不存在', '性格'), /角色已不存在/);
assert.throws(() => applyCharacterUnlock(poor, '主要角色', '甲', '不支持字段'), /无法解锁/);

assert.equal(currentLevelDescription({ 当前等级: -2, 描述: { '-2': '此刻', '0': '未来' } }), '此刻');
assert.equal(currentLevelDescription({ 当前等级: 1, 描述: { '2': '未来' } }), undefined);

console.log('手机档案：扣费、去重、角色隔离、失败路径与当前等级描述通过。');
