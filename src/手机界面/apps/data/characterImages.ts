import type { 角色人设 } from '../../types';

const baseUrl = 'https://gitgud.io/mouse789/magical-girl-corruption/-/raw/master';

/** 图片仓库的目录名与运行态主要角色 key 相同。 */
export const characterImages = {
  鹭见凛: { 日常: 1, 魔法少女: 1, 恶堕: 1 },
  雨宫雫: { 日常: 1, 魔法少女: 2, 恶堕: 1 },
  索菲亚: { 日常: 1, 魔法少女: 1, 恶堕: 1 },
  小鸟游琉璃: { 日常: 1, 魔法少女: 1, 恶堕: 1 },
  林沐沐: { 日常: 1, 魔法少女: 1, 恶堕: 1 },
} as const;

export type CharacterImageForm = keyof (typeof characterImages)['鹭见凛'];

export function characterImageUrl(key: string, form: CharacterImageForm, index = 1): string | null {
  const images = characterImages[key as keyof typeof characterImages];
  if (!images || !Number.isInteger(index) || index < 1 || index > images[form]) return null;
  const filename = form === '日常' ? '日常形态' : form === '恶堕' ? '恶堕形态' : '魔法少女形态';
  return `${baseUrl}/${encodeURIComponent(key)}/${encodeURIComponent(`${filename}${index}.webp`)}`;
}

export function availableCharacterImageForms(role: Pick<角色人设, '人设阶段'>): CharacterImageForm[] {
  return role.人设阶段.恶堕度.当前等级 >= 4 ? ['日常', '魔法少女', '恶堕'] : ['日常', '魔法少女'];
}
