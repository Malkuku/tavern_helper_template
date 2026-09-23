import { klona } from 'klona';

import { defaultRoleData } from './presentation';
import { applyRoleDerivedStats } from './roleStats';
import type { JsonObject, RoleMeta, ScenarioSourceBundle, TypedCollectionEntry } from '../scenario/types';

export type GeneratedRoleType = 'user' | '主要角色' | '次要角色';

const commonRuleNames = ['角色面板说明', '技能生成标准', '性格偏移矩阵'] as const;
const settingRuleNames = ['八大准则', '灯', '铸', '刃', '冬', '心', '杯', '蛾', '启', '物品参考表'] as const;

function uniqueEntry(entries: WorldbookEntry[], name: string): WorldbookEntry | undefined {
  const matches = entries.filter(entry => entry.name === name);
  if (matches.length > 1) throw new Error(`世界书存在重复生成规则：${name}`);
  return matches[0];
}

export async function loadRoleGenerationRules(type: GeneratedRoleType): Promise<string> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书，无法读取角色生成规则。');
  const entries = await getWorldbook(primary);
  const required = [...commonRuleNames, ...settingRuleNames];
  const missing = required.filter(name => !uniqueEntry(entries, name));
  if (missing.length) throw new Error(`主世界书缺少角色生成规则：${missing.join('、')}`);
  return required
    .map(name => uniqueEntry(entries, name))
    .filter((entry): entry is WorldbookEntry => !!entry)
    .map(entry => `## ${entry.name}\n${entry.content}`)
    .join('\n\n');
}

function runtimeCollection(registry: Record<string, { key: string; data: unknown }>): JsonObject {
  return Object.fromEntries(Object.values(registry).map(entry => [entry.key, klona(entry.data)]));
}

function runtimeTypedCollection(registry: Record<string, { type: string; key: string; data: unknown }>): JsonObject {
  const result: JsonObject = {};
  for (const entry of Object.values(registry)) {
    const bucket = (result[entry.type] ??= {}) as JsonObject;
    bucket[entry.key] = klona(entry.data);
  }
  return result;
}

function aiMapNodes(nodes: JsonObject, depth = 1): JsonObject {
  return Object.fromEntries(
    Object.entries(nodes).map(([name, rawNode]) => {
      if (!isObject(rawNode)) return [name, {}];
      const children = isObject(rawNode.子地图) ? aiMapNodes(rawNode.子地图, depth + 1) : undefined;
      const node: JsonObject = {};
      if (depth <= 3) {
        if (Array.isArray(rawNode.名称检索词)) node.名称检索词 = klona(rawNode.名称检索词);
        if (typeof rawNode.描述 === 'string') node.描述 = rawNode.描述;
        if (Array.isArray(rawNode.详情)) node.详情 = klona(rawNode.详情);
      }
      if (children && Object.keys(children).length) node.子地图 = children;
      return [name, node];
    }),
  );
}

export function roleGenerationMap(source: ScenarioSourceBundle): JsonObject {
  const map = Object.values(source.registries.地图)[0];
  return map ? aiMapNodes(map.data) : {};
}

function betaRoleTemplate(type: GeneratedRoleType): JsonObject {
  const template = klona(defaultRoleData(type));
  delete template.当前想法;
  if (type !== 'user') {
    template.名称检索词 = ['$all'];
    template.区域检索词 = ['$all'];
    template.在场 = false;
  }
  if ('人际关系' in template) template.人际关系 = {};
  if ('性经验' in template) template.性经验 = {};
  normalizeRoleStats(template, type);
  return template;
}

function roleFieldGuide(type: GeneratedRoleType, editing: boolean): string {
  const identity =
    type === 'user'
      ? '- user 没有“姓名/名称检索词/区域检索词/在场”字段。'
      : [
          '- 姓名：角色实际姓名。不要用称号堆砌代替姓名。',
          '- 名称检索词：正文最近三条消息包含任一词时，EJS 加载完整角色资料。新建默认 ["$all"]；$all 表示不依赖正文命中、始终加载。可填写姓名、简称、别名或稳定称呼。',
          '- 区域检索词：当前地图索引等于该节点或位于该节点子树时，EJS 加载简略角色资料。新建默认 ["$all"]；$all 表示不依赖地点、始终匹配。需要限定区域时只能使用所提供地图 JSON 中的真实节点名。',
          '- 在场：运行时状态，新建固定 false；修改时保持原值。',
        ].join('\n');
  const typeSpecific =
    type === '主要角色'
      ? '- 主要角色应完整设计年龄、身份、外貌、背景、五维性格、语料、术、技能、状态与物品。外貌概括是一句可直接用于简略上下文的辨识描述。语料按明确场景分组，每组给出自然、可复用且彼此有差异的台词。'
      : type === '次要角色'
        ? '- 次要角色保持轻量：简介说明身份与剧情用途；性格标签使用少量可观察特征，不扩写主要角色专属的背景、五维性格、关系或语料。'
        : '- user 代表玩家初始档案；不要替玩家编造人格、关系史或性经历。只写用户明确提供的外貌、背景与身份信息。';
  return [
    '## 字段职责与写法',
    identity,
    typeSpecific,
    '- 术之等级：键只能是灯、铸、刃、冬、心、杯、蛾、启；值为 {"等级": 数字, "经验": 数字}。0 级不写入。术代表角色对相应准则力量的掌握，不是技能列表。多数人只掌握一到两种，不要为了全面而八相齐全。',
    '- 技能：对象键是技能名；值必须包含性相、技能等级、描述、消耗、作用。技能必须源于角色经历与术，效果使用明确数值，遵守技能生成标准；禁止同义技能换皮、万能解法和只写氛围没有机制。',
    '- 特殊状态：对象键使用“类别:名称”；值包含描述、效果、持续时间。只写能改变角色处境的长期特质、伤病、印记、契约等，不把普通性格和穿着塞进状态。',
    '- 物品：对象键是物品名；值包含类型、品质、描述、作用、数量、耐久。物品必须服务身份、经历或玩法；禁止无来源神器、同功能重复装备和纯装饰库存堆砌。',
    type === '次要角色'
      ? '- 基础数值、生命状态：参考数值表按角色实际强度填写，这些数值会作为最终结果保留，不会由术之等级重算。'
      : '- 基础数值、生命状态：程序根据术之等级重算。JSON 中保留完整结构，但不得据此反推或夸大角色能力。',
    '- 人际关系、性经验：暂时锁定。新建必须是空对象；修改必须逐字保持当前 JSON，不得新增、删除或改写。',
    '- meta：由工坊媒体编辑器维护；修改时保持当前值，新建使用模板默认值。',
    type === 'user' ? '- 金钱、缥缈异质：新建使用模板默认值；修改时保持当前值，除非用户明确要求手工修改。' : '',
    '- 势力资料只用于约束角色的出身、身份、资源与立场。只有用户明确选择或角色创意确实需要时才关联现有势力；不得为了显得重要而强行挂靠势力，也不得臆造资料中不存在的组织事实。',
    '- 地图资料是供角色选取生活区域和填写区域检索词的精简参考。前三层含设定详情，更深层只列真实节点；不得把节点层级或省略详情误写成角色设定。',
    '- 种族资料仅作为世界观参考，不是角色模板或封闭选项。角色可以采用现有种族、合理变体或符合世界规则的新设计；不得机械复制种族概述，也不得把种族倾向写成每个个体的固定人格。',
    '## 结构示例（只说明格式，不得照抄内容）',
    '术之等级示例：{"灯":{"等级":4,"经验":0}}。错误：写成 {"灯":4}，或加入八种性相凑全。',
    '技能示例：{"辨伪微光":{"性相":"灯","技能等级":3,"描述":"借微光观察纸面改写痕迹。","消耗":"20点精神","作用":"发现视野内等级不高于3的文字伪造。"}}。',
    '特殊状态示例：{"伤病:左臂骨裂":{"描述":"左前臂骨裂并已固定。","效果":"需要双手完成的动作受到限制。","持续时间":"接受治疗前"}}。',
    '物品示例：{"旧校徽":{"类型":"证明","品质":"凡庸","描述":"边缘磨损的学院铜徽。","作用":"证明曾在四艺学院就读。","数量":1,"耐久":70}}。',
    '检索词示例：姓名“莉莉丝·维尔薇拉”可用名称检索词 ["莉莉丝","维尔薇拉"]；不知道真实地图节点时，区域检索词保持 ["$all"]。',
    '## 防八股要求',
    '- 先确定欲望、恐惧、现实约束、惯用手段和自我矛盾，再写字段；每一项应能从经历或身份找到原因。',
    '- 禁止“外冷内热、神秘过去、嘴硬心软、强大但低调”等无具体行为证据的套话；禁止各字段重复同一句人设。',
    '- 缺少会显著影响角色的事实时必须提问，不得用常见模板自动补洞。',
    '## 工作流程',
    '1. 先检查用户信息能否确定身份经历、核心动机、行为逻辑、外貌辨识点、术的倾向及玩法定位。',
    '2. 信息不足时只向用户提出最少且高影响的问题，不输出 JSON。可以分多轮追问。',
    '3. 信息充分后先自检字段约束、锁定字段和防八股要求，再只输出一个完整 JSON 对象。',
    editing
      ? '4. 这是修改任务：未被修改要求点名的内容应保留；锁定字段即使被要求也不要修改，并解释应由工坊或运行时维护。'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildRoleGenerationPrompt(
  type: GeneratedRoleType,
  idea: string,
  enhancement: string,
  rules: string,
  source: ScenarioSourceBundle,
  currentRole?: JsonObject,
): string {
  const shape = { ...betaRoleTemplate(type), meta: { avatar: '', color: '#C9B485' } };
  return [
    `你正在为“尘史使徒”创意工坊${currentRole ? '修改' : '创建'}一个${type}角色。`,
    '这是一个可多轮对话的角色设计任务。资料不足时先提问；只有信息充分后才输出最终 JSON。',
    '最终阶段只返回一个合法 JSON 对象，不要 Markdown、代码围栏、解释或 VariableInsert/VariableEdit 标签。',
    'JSON 直接使用 stat_data.角色 中单个角色对象的结构，不要包含 author、desc、key、type 或 data 包装层。',
    '输出必须包含模板中的全部字段并保持字段类型；不要添加模板以外的字段。meta 也属于角色对象。',
    type === '次要角色'
      ? '基础数值与生命状态由你参考数值表决定，程序会保留你填写的最终数值，不会根据术之等级重算。'
      : '基础数值与生命状态由程序根据术之等级重算。请保留这两个完整字段以满足 JSON 结构，但不要把自行填写的数值视为最终结果。',
    roleFieldGuide(type, !!currentRole),
    currentRole ? `待修改角色 JSON：\n${JSON.stringify(currentRole, null, 2)}` : '',
    `${currentRole ? '修改要求' : '用户创意'}：\n${idea.trim()}`,
    enhancement.trim() ? `提升词：\n${enhancement.trim()}` : '',
    `目标 stat_data 角色模板：\n${JSON.stringify(shape, null, 2)}`,
    `世界观中的势力资料（运行态 JSON，仅用于角色出身、身份和立场设计）：\n${JSON.stringify(runtimeCollection(source.registries.势力), null, 2)}`,
    `世界地图（AI 特供精简 JSON：前三层保留设定，后续仅保留节点层级）：\n${JSON.stringify(roleGenerationMap(source), null, 2)}`,
    `世界观中的种族资料（运行态 JSON，仅作参考，不限制角色设计）：\n${JSON.stringify(runtimeTypedCollection(source.registries.种族), null, 2)}`,
    `字段规则与创作参考：\n${rules}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function normalizeMeta(value: unknown): RoleMeta {
  const meta = isObject(value) ? value : {};
  const color = String(meta.color || '#C9B485');
  return {
    avatar: String(meta.avatar || ''),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#C9B485',
  };
}

export function roleToRuntimeJson(role: TypedCollectionEntry): JsonObject {
  const meta = normalizeMeta(role.meta);
  return { ...(klona(role.data) as JsonObject), meta };
}

const roleFields: Record<GeneratedRoleType, readonly string[]> = {
  user: [
    '年龄',
    '当前身份',
    '外貌',
    '背景',
    '性格',
    '人际关系',
    '性经验',
    '基础数值',
    '生命状态',
    '特殊状态',
    '术之等级',
    '技能',
    '物品',
    '金钱',
    '缥缈异质',
  ],
  主要角色: [
    '姓名',
    '名称检索词',
    '区域检索词',
    '在场',
    '年龄',
    '当前身份',
    '外貌',
    '背景',
    '性格',
    '语料',
    '人际关系',
    '性经验',
    '基础数值',
    '生命状态',
    '特殊状态',
    '术之等级',
    '技能',
  ],
  次要角色: [
    '姓名',
    '名称检索词',
    '区域检索词',
    '简介',
    '在场',
    '性格标签',
    '基础数值',
    '生命状态',
    '技能',
    '特殊状态',
    '术之等级',
  ],
};
const optionalRoleFields: Record<GeneratedRoleType, readonly string[]> = {
  user: [],
  主要角色: ['外貌概括', '战斗风格', '物品'],
  次要角色: ['物品'],
};

function expectObjectField(data: JsonObject, key: string): void {
  if (!isObject(data[key])) throw new Error(`角色 JSON 字段“${key}”必须是对象。`);
}

function expectArrayField(data: JsonObject, key: string): void {
  if (!Array.isArray(data[key])) throw new Error(`角色 JSON 字段“${key}”必须是数组。`);
}

function validateCompleteRoleData(data: JsonObject, type: GeneratedRoleType): void {
  const required = roleFields[type];
  const allowed = new Set([...required, ...optionalRoleFields[type]]);
  const missing = required.filter(key => !(key in data));
  if (missing.length) throw new Error(`角色 JSON 缺少完整字段：${missing.join('、')}。`);
  const unknown = Object.keys(data).filter(key => !allowed.has(key));
  if (unknown.length) throw new Error(`角色 JSON 包含 ${type} 不支持的字段：${unknown.join('、')}。`);

  for (const key of ['基础数值', '生命状态', '技能', '术之等级']) expectObjectField(data, key);
  if (type !== '主要角色' || typeof data.特殊状态 !== 'string') expectObjectField(data, '特殊状态');
  if ('物品' in data && typeof data.物品 !== 'string') expectObjectField(data, '物品');
  for (const key of type === '次要角色'
    ? ['名称检索词', '区域检索词', '性格标签']
    : type === '主要角色'
      ? ['名称检索词', '区域检索词', '外貌', '背景']
      : ['外貌', '背景'])
    expectArrayField(data, key);
  if (type !== '次要角色') {
    expectObjectField(data, '性格');
    expectObjectField(data, '人际关系');
  }
  if (type === 'user') expectObjectField(data, '性经验');
  if (type === '主要角色') {
    expectObjectField(data, '语料');
    if (typeof data.性经验 !== 'string') expectObjectField(data, '性经验');
  }
  for (const key of type === 'user'
    ? ['年龄', '当前身份']
    : type === '主要角色'
      ? ['姓名', '年龄', '当前身份']
      : ['姓名', '简介'])
    if (typeof data[key] !== 'string') throw new Error(`角色 JSON 字段“${key}”必须是字符串。`);
  if (type !== 'user' && typeof data.在场 !== 'boolean') throw new Error('角色 JSON 字段“在场”必须是布尔值。');
  if (type === 'user' && (!Number.isFinite(Number(data.金钱)) || !Number.isFinite(Number(data.缥缈异质))))
    throw new Error('user 的金钱与缥缈异质必须是数字。');
}

function normalizeArts(value: unknown): Record<string, { 等级: number; 经验: number }> {
  if (!isObject(value)) throw new Error('角色 JSON 字段“术之等级”必须是对象。');
  const allowed = new Set(['灯', '铸', '刃', '冬', '心', '杯', '蛾', '启']);
  const result: Record<string, { 等级: number; 经验: number }> = {};
  for (const [name, raw] of Object.entries(value)) {
    if (!allowed.has(name)) throw new Error(`术之等级包含未知性相：${name}。`);
    if (!isObject(raw) || !Number.isFinite(Number(raw.等级)) || !Number.isFinite(Number(raw.经验)))
      throw new Error(`术之等级“${name}”必须包含数字等级与经验。`);
    const level = Number(raw.等级);
    if (level > 0) result[name] = { 等级: level, 经验: Number(raw.经验) };
  }
  return result;
}

function normalizeRoleStats(data: JsonObject, type: GeneratedRoleType): void {
  const arts = normalizeArts(data.术之等级);
  data.术之等级 = arts;
  applyRoleDerivedStats(data, type);
}

export function parseRoleRuntimeJson(text: string, type: GeneratedRoleType) {
  const value = parseJsonObject(text);
  if ('data' in value || 'author' in value || 'type' in value) {
    throw new Error('请粘贴单个 stat_data 角色对象，不要使用工坊资产包装层。');
  }
  const { meta, ...rawData } = value;
  const data = klona(rawData) as JsonObject;
  validateCompleteRoleData(data, type);
  normalizeRoleStats(data, type);
  const name = type === 'user' ? 'user' : String(data.姓名 || '').trim();
  if (!name) throw new Error('AI 结果缺少角色姓名。');
  if ('姓名' in data) data.姓名 = name;
  return { data, meta: normalizeMeta(meta), name };
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

export function parseGeneratedRole(text: string, type: GeneratedRoleType) {
  const { data, meta, name } = parseRoleRuntimeJson(text, type);
  return {
    author: 'AI 辅助生成',
    desc: '',
    key: type === 'user' ? 'user' : name,
    type,
    meta,
    data,
  };
}

export async function buildDownloadableRolePrompt(
  type: GeneratedRoleType,
  idea: string,
  enhancement: string,
  source: ScenarioSourceBundle,
  currentRole?: JsonObject,
): Promise<string> {
  if (!idea.trim()) throw new Error('请先填写角色创意。');
  const rules = await loadRoleGenerationRules(type);
  return [
    '系统要求：你是结构化角色设计助手，必须严格遵守下方 JSON 结构和世界设定。',
    buildRoleGenerationPrompt(type, idea, enhancement, rules, source, currentRole),
  ].join('\n\n');
}
