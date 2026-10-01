import { klona } from 'klona';
import { z } from 'zod';
import { stage } from './initialDataSchema';
import { completeCurrentRating } from './roleRating';

export const MINOR_CORRUPTION_TEMPLATE = '<模板>通用恶堕值';
export const MINOR_AFFECTION_TEMPLATE = '<模板>通用好感度';
export type MinorCorruptionTemplate = z.infer<typeof stage>;
export type MinorStageTemplates = { 恶堕度: MinorCorruptionTemplate; 好感度: MinorCorruptionTemplate };

function parseMinorStageTemplate(
  entries: Pick<WorldbookEntry, 'name' | 'content'>[],
  name: string,
  levels: number[],
): MinorCorruptionTemplate {
  const matches = entries.filter(entry => entry.name === name);
  if (matches.length !== 1) throw new Error(`主世界书需要且只能有一个 ${name} 条目。`);
  let value: unknown;
  try {
    value = JSON.parse(matches[0].content);
  } catch (cause) {
    throw new Error(`${name} 不是有效 JSON。`, { cause });
  }
  const parsed = stage.safeParse(value);
  if (
    !parsed.success ||
    !Number.isSafeInteger(parsed.data.当前等级) ||
    !Object.hasOwn(parsed.data.描述, String(parsed.data.当前等级)) ||
    !levels.every(level => parsed.data.描述[String(level)])
  )
    throw new Error(`${name} 必须包含有效的当前等级、累计经验和 ${levels[0]}～${levels.at(-1)} 级描述。`);
  return parsed.data;
}

export function parseMinorCorruptionTemplate(
  entries: Pick<WorldbookEntry, 'name' | 'content'>[],
): MinorCorruptionTemplate {
  return parseMinorStageTemplate(entries, MINOR_CORRUPTION_TEMPLATE, [0, 1, 2, 3, 4, 5, 6]);
}

export function parseMinorStageTemplates(entries: Pick<WorldbookEntry, 'name' | 'content'>[]): MinorStageTemplates {
  const affection = parseMinorStageTemplate(entries, MINOR_AFFECTION_TEMPLATE, [-2, -1, 0, 1, 2, 3, 4, 5]);
  if (
    affection.当前等级 !== 0 ||
    affection.累计经验 !== 0 ||
    Object.keys(affection.描述).length !== 8
  )
    throw new Error(`${MINOR_AFFECTION_TEMPLATE} 必须以 0 级、0 经验开始，描述等级恰为 -2～5。`);
  return {
    恶堕度: parseMinorCorruptionTemplate(entries),
    好感度: affection,
  };
}

export async function loadMinorStageTemplates(): Promise<MinorStageTemplates> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书。');
  return parseMinorStageTemplates(await getWorldbook(primary));
}

export function completeMinorRole<T extends Record<string, any>>(
  role: T,
  templates: MinorStageTemplates,
  existing?: Record<string, any>,
): T {
  const stages: Record<string, MinorCorruptionTemplate> = {};
  for (const kind of ['恶堕度', '好感度'] as const) {
    const stageValue = klona(stage.parse(role.人设阶段?.[kind] ?? templates[kind]));
    if (existing?.人设阶段?.[kind]) {
      const progress = stage.parse(existing.人设阶段[kind]);
      stageValue.当前等级 = progress.当前等级;
      stageValue.累计经验 = progress.累计经验;
    }
    if (!Object.hasOwn(stageValue.描述, String(stageValue.当前等级)))
      throw new Error(`次要角色${kind}当前等级缺少描述。`);
    stages[kind] = stageValue;
  }
  return completeCurrentRating({ ...role, 人设阶段: stages }, existing);
}
