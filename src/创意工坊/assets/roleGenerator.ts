import { klona } from 'klona';

import { defaultRoleData } from './presentation';
import type { JsonObject, ScenarioSourceBundle } from '../scenario/types';

export type GeneratedRoleType = 'user' | '主要角色' | '次要角色';

const commonRuleNames = ['角色面板说明', '技能生成标准', '人际关系矩阵', '性格偏移矩阵'] as const;
const worldRuleNames = ['🗺️世界地图', '🌐世界经济', '🪻季节与节日', '🔥种族', '⚖️势力'] as const;

function uniqueEntry(entries: WorldbookEntry[], name: string): WorldbookEntry | undefined {
  const matches = entries.filter(entry => entry.name === name);
  if (matches.length > 1) throw new Error(`世界书存在重复生成规则：${name}`);
  return matches[0];
}

export async function loadRoleGenerationRules(type: GeneratedRoleType): Promise<string> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书，无法读取角色生成规则。');
  const entries = await getWorldbook(primary);
  const required = [...commonRuleNames, ...(type === '次要角色' ? ['次要角色生成'] : [])];
  const missing = required.filter(name => !uniqueEntry(entries, name));
  if (missing.length) throw new Error(`主世界书缺少角色生成规则：${missing.join('、')}`);
  const names = [...required, ...worldRuleNames];
  return names
    .map(name => uniqueEntry(entries, name))
    .filter((entry): entry is WorldbookEntry => !!entry)
    .map(entry => `## ${entry.name}\n${entry.content}`)
    .join('\n\n');
}

export function buildRoleGenerationPrompt(
  type: GeneratedRoleType,
  idea: string,
  enhancement: string,
  rules: string,
  source: ScenarioSourceBundle,
): string {
  const shape = defaultRoleData(type);
  const context = {
    地图: source.registries.地图,
    世界经济: source.registries.世界经济,
    季节与节日: source.registries['季节与节日'],
    势力: source.registries.势力,
    种族: source.registries.种族,
  };
  return [
    `你正在为“尘史使徒”创意工坊创建一个${type}资产。`,
    '只返回一个合法 JSON 对象，不要 Markdown、代码围栏、解释或 VariableInsert/VariableEdit 标签。',
    'JSON 顶层必须包含 author、desc、key、data；data 只能使用给定模板中的字段和类型。姓名与 key 应保持一致且便于检索。',
    `用户创意：\n${idea.trim()}`,
    enhancement.trim() ? `提升词：\n${enhancement.trim()}` : '',
    `目标 data 模板：\n${JSON.stringify(shape, null, 2)}`,
    `当前工坊世界资料：\n${JSON.stringify(context)}`,
    `世界书规则：\n${rules}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  const candidate = fenced ?? trimmed;
  try {
    const value = JSON.parse(candidate);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('结果不是 JSON 对象。');
    return value;
  } catch (error) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const value = JSON.parse(candidate.slice(start, end + 1));
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    }
    throw new Error('AI 返回内容不是可解析的角色 JSON。', { cause: error });
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeTemplate(template: unknown, generated: unknown): unknown {
  if (Array.isArray(template)) return Array.isArray(generated) ? klona(generated) : klona(template);
  if (isObject(template)) {
    const input = isObject(generated) ? generated : {};
    return Object.fromEntries(Object.entries(template).map(([key, value]) => [key, mergeTemplate(value, input[key])]));
  }
  return typeof generated === typeof template ? generated : template;
}

export function parseGeneratedRole(text: string, type: GeneratedRoleType) {
  const value = parseJsonObject(text);
  const rawData = isObject(value.data) ? value.data : value;
  const data = mergeTemplate(defaultRoleData(type), rawData) as JsonObject;
  const name = String(data.姓名 || value.key || '').trim();
  if (!name) throw new Error('AI 结果缺少角色姓名或 key。');
  if ('姓名' in data) data.姓名 = name;
  return {
    author: String(value.author || 'AI 辅助生成'),
    desc: String(value.desc || ''),
    key: type === 'user' ? 'user' : String(value.key || name),
    type,
    meta: { avatar: '', color: '#C9B485', avatarStyle: 'auto' },
    data,
  };
}

export async function generateRoleDraft(
  type: GeneratedRoleType,
  idea: string,
  enhancement: string,
  source: ScenarioSourceBundle,
) {
  if (!idea.trim()) throw new Error('请先填写角色创意。');
  const rules = await loadRoleGenerationRules(type);
  const result = await generateRaw({
    ordered_prompts: [
      { role: 'system', content: '你是结构化角色设计助手，必须严格遵守用户给出的 JSON 结构和世界设定。' },
      { role: 'user', content: buildRoleGenerationPrompt(type, idea, enhancement, rules, source) },
    ],
    max_chat_history: 0,
  });
  return parseGeneratedRole(result, type);
}
