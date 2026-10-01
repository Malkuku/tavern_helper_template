import assert from 'node:assert/strict';
import {
  refreshSuccessNotice,
  stageChangeNotices,
  stageLevelSnapshot,
} from '../src/手机界面/apps/witch/witchNotifications';
import type { stat_data } from '../src/手机界面/types';

const stage = (level: number, experience = 0) => ({ 当前等级: level, 累计经验: experience, 描述: {} });
const data = () =>
  ({
    角色: {
      主要角色: {
        甲: { 人设阶段: { 创伤稳定度: stage(4), 好感度: stage(1), 恶堕度: stage(0) } },
      },
      次要角色: { 乙: { 人设阶段: { 好感度: stage(0), 恶堕度: stage(0) } } },
    },
  }) as unknown as stat_data;

const initial = data();
const before = stageLevelSnapshot(initial);
assert.equal(stageChangeNotices(before, stageLevelSnapshot(initial)).length, 0);
const changed = data();
changed.角色.主要角色.甲.人设阶段.创伤稳定度.当前等级 = 2;
changed.角色.主要角色.甲.人设阶段.好感度.当前等级 = 2;
changed.角色.主要角色.甲.人设阶段.恶堕度.累计经验 = 12;
changed.角色.次要角色.乙.人设阶段!.恶堕度.当前等级 = 1;
changed.角色.次要角色.乙.人设阶段!.好感度!.当前等级 = -1;
const notices = stageChangeNotices(before, stageLevelSnapshot(changed));
assert.equal(notices.length, 4);
assert.deepEqual(
  notices.map(notice => [notice.title, notice.message, notice.warning ?? false, notice.target]),
  [
    ['甲的创伤稳定度等级下降', '4 级 → 2 级，点击查看当前状态。', true, '甲'],
    ['甲的好感度等级提升', '1 级 → 2 级，点击查看当前状态。', false, '甲'],
    ['乙的好感度等级下降', '0 级 → -1 级，点击查看当前状态。', false, '乙'],
    ['乙的恶堕度等级提升', '0 级 → 1 级，点击查看当前状态。', false, '乙'],
  ],
);
const added = data();
added.角色.主要角色.丙 = { 人设阶段: { 创伤稳定度: stage(5), 好感度: stage(0), 恶堕度: stage(0) } } as any;
assert.equal(stageChangeNotices(before, stageLevelSnapshot(added)).length, 0);
assert.deepEqual(
  (['任务', '技能', '道具'] as const).map(kind => {
    const notice = refreshSuccessNotice(kind);
    return [notice.title, notice.tab, notice.shop];
  }),
  [
    ['任务刷新成功', 'tasks', undefined],
    ['技能商店刷新成功', 'shop', '技能商店'],
    ['道具商店刷新成功', 'shop', '道具商店'],
  ],
);
console.log('stage level notification diff passed');
