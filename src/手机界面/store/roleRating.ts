/** 新角色始终有独立评级；旧资源缺字段时不从身份或背景猜测。 */
export function completeCurrentRating<T extends Record<string, any>>(role: T, existing?: Record<string, any>): T {
  return { ...role, 当前评级: role.当前评级 ?? existing?.当前评级 ?? '' };
}
