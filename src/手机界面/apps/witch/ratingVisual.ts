/** 仅将明确的单一评级映射到卡片外观，避免把适用范围文案误判为等级。 */
export function ratingVisualClass(rating: string): string | undefined {
  const match = /^([DCBAS])(?:级)?$/i.exec(rating.trim());
  return match ? `witch-grade-${match[1].toLowerCase()}` : undefined;
}
