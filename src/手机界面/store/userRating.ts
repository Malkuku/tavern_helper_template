import type { stat_data, 任务 } from '../types';

export type Rating = 任务['评级'];
export const ratings: readonly Rating[] = ['D', 'C', 'B', 'A', 'S'];
export const ratingContribution: Record<Rating, number> = { D: 1, C: 3, B: 8, A: 24, S: 72 };
export const ratingThreshold: Record<Rating, number> = { D: 0, C: 10, B: 40, A: 120, S: 360 };

export function userRatingFromContribution(total: number): Rating {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('累计评级贡献无效。');
  if (total >= 360) return 'S';
  if (total >= 120) return 'A';
  if (total >= 40) return 'B';
  if (total >= 10) return 'C';
  return 'D';
}

export function isWithinGeneratedRating(player: Rating, generated: Rating): boolean {
  return (
    ratings.indexOf(player) >= 0 &&
    ratings.indexOf(generated) >= 0 &&
    ratings.indexOf(generated) <= ratings.indexOf(player) + 1
  );
}

export function settleUserRating(data: stat_data): boolean {
  const user = data.角色?.user;
  if (!user) return false;
  const rating = userRatingFromContribution(user.评级贡献);
  if (user.当前评级 === rating) return false;
  user.当前评级 = rating;
  return true;
}
