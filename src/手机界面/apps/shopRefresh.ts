import type { stat_data } from '../types';
import { userRatingFromContribution } from '../store/userRating';

const directedSurchargeByRating = {
  技能: { D: 20, C: 30, B: 40, A: 50, S: 60 },
  道具: { D: 5, C: 10, B: 15, A: 20, S: 25 },
} as const;

export function directedRefreshSurcharge(data: stat_data, kind: '技能' | '道具'): number {
  return directedSurchargeByRating[kind][userRatingFromContribution(data.角色.user.评级贡献)];
}

export function directedRefreshPrice(data: stat_data, kind: '技能' | '道具', ordinaryPrice: number): number {
  const request = data.手机.定向刷新;
  if (request?.类型 !== kind || !request.要求.trim() || request.普通报价 !== ordinaryPrice)
    throw new Error(`${kind}定向刷新请求或报价已变化，请重新提交。`);
  return ordinaryPrice + directedRefreshSurcharge(data, kind);
}

export function shopRefreshPrice(kind: '技能' | '道具'): number {
  return kind === '技能' ? 5 : 2;
}
