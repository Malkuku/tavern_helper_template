import { klona } from 'klona';
import { z } from 'zod';
import { stage } from './initialDataSchema';
import { completeCurrentRating } from './roleRating';

export const MINOR_CORRUPTION_TEMPLATE = '<模板>通用恶堕值';
export type MinorCorruptionTemplate = z.infer<typeof stage>;

export function parseMinorCorruptionTemplate(
  entries: Pick<WorldbookEntry, 'name' | 'content'>[],
): MinorCorruptionTemplate {
  const matches = entries.filter(entry => entry.name === MINOR_CORRUPTION_TEMPLATE);
  if (matches.length !== 1) throw new Error(`主世界书需要且只能有一个 ${MINOR_CORRUPTION_TEMPLATE} 条目。`);
  let value: unknown;
  try {
    value = JSON.parse(matches[0].content);
  } catch (cause) {
    throw new Error(`${MINOR_CORRUPTION_TEMPLATE} 不是有效 JSON。`, { cause });
  }
  const parsed = stage.safeParse(value);
  if (!parsed.success || !Array.from({ length: 7 }, (_, index) => String(index)).every(key => parsed.data.描述[key]))
    throw new Error(`${MINOR_CORRUPTION_TEMPLATE} 必须包含有效的当前等级、累计经验和 0～6 级描述。`);
  return parsed.data;
}

export async function loadMinorCorruptionTemplate(): Promise<MinorCorruptionTemplate> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书。');
  return parseMinorCorruptionTemplate(await getWorldbook(primary));
}

export function completeMinorRole<T extends Record<string, any>>(
  role: T,
  template: MinorCorruptionTemplate,
  existing?: Record<string, any>,
): T {
  const stageValue = klona(stage.parse(role.人设阶段?.恶堕度 ?? template));
  if (existing?.人设阶段?.恶堕度) {
    const progress = stage.parse(existing.人设阶段.恶堕度);
    stageValue.当前等级 = progress.当前等级;
    stageValue.累计经验 = progress.累计经验;
  }
  return completeCurrentRating({ ...role, 人设阶段: { 恶堕度: stageValue } }, existing);
}
