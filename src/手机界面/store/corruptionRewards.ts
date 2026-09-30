import type { stat_data } from '../types';

const ratingReward = { D: 60, C: 100, B: 150, A: 220, S: 300 } as const;

export function corruptionRewardForRating(rating: string | undefined): number | undefined {
  return rating && Object.hasOwn(ratingReward, rating) ? ratingReward[rating as keyof typeof ratingReward] : undefined;
}

function corruptionRoles(data: stat_data) {
  return [
    ...Object.entries(data.角色.主要角色).map(([key, role]) => ({ id: `主要角色:${key}`, key, role })),
    ...Object.entries(data.角色.次要角色).map(([key, role]) => ({ id: `次要角色:${key}`, key, role })),
  ];
}

/** 新加入角色以加入时等级为起点；新开局角色的起点由唯一开局组装写入。 */
export function establishNewRoleRewardBaselines(data: stat_data): boolean {
  const records = data.手机.恶堕奖励;
  let changed = false;
  for (const { id, role } of corruptionRoles(data)) {
    const level = role.人设阶段?.恶堕度?.当前等级;
    if (Object.hasOwn(records.已奖励等级, id)) continue;
    if (typeof level !== 'number' || !Number.isSafeInteger(level)) throw new Error(`${id} 的恶堕等级无效。`);
    records.已奖励等级[id] = level;
    changed = true;
  }
  return changed;
}

/** 与等级结算、余额一同写入最新楼层，重入时由已奖励等级阻止重复发放。 */
export function settleCorruptionRewards(data: stat_data): boolean {
  const records = data.手机.恶堕奖励;
  let changed = false;
  for (const { id, key, role } of corruptionRoles(data)) {
    const stage = role.人设阶段?.恶堕度;
    if (!stage) continue;
    const previous = records.已奖励等级[id];
    if (!Number.isSafeInteger(previous)) throw new Error(`${id} 的奖励记录无效。`);
    const current = stage.当前等级;
    if (!Number.isSafeInteger(current) || current < previous) throw new Error(`${id} 的恶堕等级低于已奖励等级。`);
    const rating = role.当前评级;
    if (!rating) continue;
    const points = corruptionRewardForRating(rating);
    if (points === undefined) throw new Error(`${id} 的当前评级无效。`);
    for (let level = previous + 1; level <= Math.min(current, 6); level++) {
      if (level < 1) continue;
      if (!Number.isSafeInteger(data.角色.user.恶堕积分) || data.角色.user.恶堕积分 < 0)
        throw new Error('恶堕积分余额无效。');
      if (!Number.isSafeInteger(data.角色.user.恶堕积分 + points)) throw new Error('恶堕积分余额超出安全范围。');
      data.角色.user.恶堕积分 += points;
      records.邮件.unshift({
        id: `${id}:${level}`,
        角色: key,
        评级: rating as keyof typeof ratingReward,
        等级: level,
        积分: points,
        时间: data.世界.时间,
        已读: false,
      });
      changed = true;
    }
    const paidThrough = Math.min(current, 6);
    if (paidThrough > previous) {
      records.已奖励等级[id] = paidThrough;
      changed = true;
    }
  }
  return changed;
}

export function markCorruptionRewardMailRead(data: stat_data, id: string): boolean {
  const mail = data.手机.恶堕奖励.邮件.find(item => item.id === id);
  if (!mail) throw new Error('奖励邮件已不存在。');
  if (mail.已读) return false;
  mail.已读 = true;
  return true;
}
