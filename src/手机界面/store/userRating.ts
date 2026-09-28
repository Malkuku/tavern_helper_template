import type { stat_data, 技能 } from '../types';

/** 总贡献门槛高于单项技能的等级贡献参考；0 分保留初始 D 级。 */
export function userRatingFromSkills(skills: Record<string, 技能>): 'D' | 'C' | 'B' | 'A' | 'S' {
  const total = Object.values(skills).reduce((sum, skill) => {
    const contribution = skill?.战力评级贡献;
    if (typeof contribution !== 'number' || !Number.isFinite(contribution) || contribution < 0)
      throw new Error('持有技能的战力评级贡献无效。');
    return sum + contribution;
  }, 0);
  if (!Number.isFinite(total)) throw new Error('技能战力总贡献无效。');
  if (total >= 3000) return 'S';
  if (total >= 1000) return 'A';
  if (total >= 180) return 'B';
  if (total >= 40) return 'C';
  return 'D';
}

export function settleUserRating(data: stat_data): boolean {
  const user = data.角色?.user;
  if (!user) return false;
  if (!user.技能 || typeof user.技能 !== 'object' || Array.isArray(user.技能))
    throw new Error('持有技能数据无效，无法计算当前评级。');
  const rating = userRatingFromSkills(user.技能);
  if (user.当前评级 === rating) return false;
  user.当前评级 = rating;
  return true;
}
