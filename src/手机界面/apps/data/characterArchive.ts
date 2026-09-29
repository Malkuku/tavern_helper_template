import type { 角色人设 } from '../../types';

export function currentAbilityLimit(role: Pick<角色人设, '人设阶段' | '魔法少女能力'>): string | undefined {
  const level = role.人设阶段.创伤稳定度.当前等级;
  return role.魔法少女能力.核心能力限制[String(level)];
}
