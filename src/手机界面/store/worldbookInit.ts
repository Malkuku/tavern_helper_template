import { klona } from 'klona';

type JsonRecord = Record<string, any>;
type TaggedValue = { path: string[]; value: unknown; dynamic: boolean };
type ConfigEntry = Pick<WorldbookEntry, 'name' | 'content'>;

const rolePrefix = '<人设配置>';

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseTags(entry: ConfigEntry): TaggedValue[] {
  const tags = [...entry.content.matchAll(/<JSON\b([^>]*)>([\s\S]*?)<\/JSON>/g)];
  const openCount = [...entry.content.matchAll(/<JSON\b/g)].length;
  if (tags.length !== openCount || (!tags.length && entry.name !== '[initvar]'))
    throw new Error(`世界书条目 ${entry.name} 的 JSON 标签缺失或未闭合。`);
  const paths = new Set<string>();
  return tags.map(([, attributes, raw]) => {
    const attrs = Object.fromEntries(
      [...attributes.matchAll(/([\w]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
    );
    const path = attrs.path;
    if (!path?.startsWith('$.') || !attrs.type)
      throw new Error(`世界书条目 ${entry.name} 的 JSON 标签缺少 path 或 type。`);
    if (paths.has(path)) throw new Error(`世界书条目 ${entry.name} 重复声明 ${path}。`);
    paths.add(path);
    const segments = path.slice(2).split('.');
    if (
      segments.some(
        segment => !segment || segment === '__proto__' || segment === 'prototype' || segment === 'constructor',
      )
    ) {
      throw new Error(`世界书条目 ${entry.name} 的路径无效：${path}。`);
    }
    const content = raw.trim();
    let value: unknown;
    switch (attrs.type) {
      case 'string':
        value = content;
        break;
      case 'number':
        value = Number(content);
        if (!content || !Number.isFinite(value)) throw new Error(`${path} 不是有效数字。`);
        break;
      case 'boolean':
        if (content !== 'true' && content !== 'false') throw new Error(`${path} 不是有效布尔值。`);
        value = content === 'true';
        break;
      case 'json':
        try {
          value = JSON.parse(content);
        } catch (cause) {
          throw new Error(`${path} 不是有效 JSON。`, { cause });
        }
        break;
      default:
        throw new Error(`${path} 使用了未知类型 ${attrs.type}。`);
    }
    return { path: segments, value, dynamic: attrs.dynamic === 'true' };
  });
}

function fillMissing(target: JsonRecord, source: JsonRecord): void {
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) target[key] = klona(value);
    else if (isRecord(target[key]) && isRecord(value)) fillMissing(target[key], value);
  }
}

function migrateBasicInfo(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return Object.entries(value)
    .map(([key, item]) => `${key}：${typeof item === 'string' ? item : JSON.stringify(item)}`)
    .join('\n');
}

function applyTag(target: JsonRecord, tag: TaggedValue, updateStatic: boolean): void {
  let parent = target;
  for (const segment of tag.path.slice(0, -1)) {
    if (!isRecord(parent[segment])) parent[segment] = {};
    parent = parent[segment];
  }
  const key = tag.path.at(-1)!;
  if (!(key in parent)) parent[key] = klona(tag.value);
  else if (tag.dynamic || !updateStatic) {
    if (isRecord(parent[key]) && isRecord(tag.value)) fillMissing(parent[key], tag.value);
  } else parent[key] = klona(tag.value);
}

function uniqueEntry(entries: ConfigEntry[], name: string): ConfigEntry {
  const matches = entries.filter(entry => entry.name === name);
  if (matches.length !== 1) throw new Error(`主世界书需要且只能有一个 ${name} 条目。`);
  return matches[0];
}

function readVersion(content: string): string {
  const matches = [...content.matchAll(/^version:\s*([^\s#]+)\s*$/gm)];
  if (matches.length !== 1) throw new Error('当前世界书版本条目需要且只能声明一个 version。');
  return matches[0][1];
}

const missingDefaults: JsonRecord = {
  角色: { 主要角色: {}, 次要角色: {} },
  地图: {},
  世界: { 时间: '', 地点: '', 天气: '', 地图索引: '' },
  仓库: {},
  任务: {},
  商店: {},
  技能商店: {},
  系统: {
    商店下次刷新时间: '',
    商店主动刷新次数: 0,
    任务下次刷新时间: '',
    任务主动刷新次数: 0,
    技能下次刷新时间: '',
    技能主动刷新次数: 0,
  },
  手机: { 微信: { 账号: {}, 会话: {}, 准备发送: null } },
};

/** 只依据主世界书配置生成下一份变量；发生解析错误时不修改原对象。 */
export function reconcileWorldbookStatData(
  current: unknown,
  entries: ConfigEntry[],
): { data: JsonRecord; changed: boolean } {
  const initTags = parseTags(uniqueEntry(entries, '[initvar]'));
  const version = readVersion(uniqueEntry(entries, '当前世界书版本').content);
  const roleEntries = entries.filter(entry => entry.name.startsWith(rolePrefix));
  if (!roleEntries.some(entry => entry.name === `${rolePrefix}user`)) throw new Error('主世界书缺少 <人设配置>user。');

  const roleConfigs = roleEntries.map(entry => {
    const name = entry.name.slice(rolePrefix.length);
    if (!name || name.includes('.')) throw new Error(`无效的人设配置名称：${entry.name}。`);
    if (roleEntries.filter(candidate => candidate.name === entry.name).length !== 1)
      throw new Error(`重复的人设配置：${entry.name}。`);
    const root = name === 'user' ? ['角色', 'user'] : ['角色', '主要角色', name];
    const tags = parseTags(entry);
    if (
      tags.some(tag => {
        if (name === 'user' && ['仓库', '任务'].includes(tag.path[0]) && tag.path.length === 1) return false;
        return root.some((segment, index) => tag.path[index] !== segment) || tag.path.length <= root.length;
      })
    ) {
      throw new Error(`${entry.name} 包含不属于该人物的 JSON path。`);
    }
    return { root, tags };
  });

  const data = isRecord(current) ? klona(current) : {};
  const before = JSON.stringify(data);
  const updateStatic = data.系统?.版本 !== version;
  if (isRecord(data.系统)) {
    delete data.系统.商店待刷新;
    delete data.系统.任务待刷新;
    delete data.系统.技能待刷新;
  }
  if (isRecord(data.角色)) {
    if (isRecord(data.角色.user) && '基础信息' in data.角色.user)
      data.角色.user.基础信息 = migrateBasicInfo(data.角色.user.基础信息);
    if (isRecord(data.角色.主要角色)) {
      for (const role of Object.values(data.角色.主要角色)) {
        if (isRecord(role) && '基础信息' in role) role.基础信息 = migrateBasicInfo(role.基础信息);
      }
    }
  }
  for (const tag of initTags) applyTag(data, tag, updateStatic);
  for (const { root, tags } of roleConfigs) {
    const original = root.reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), current);
    if (original === undefined) {
      // 人物不存在时完整采用模板，动态默认值也必须写入。
      for (const tag of tags) applyTag(data, tag, true);
    } else {
      for (const tag of tags) applyTag(data, tag, updateStatic);
    }
  }
  fillMissing(data, missingDefaults);
  data.系统.版本 = version;
  return { data, changed: JSON.stringify(data) !== before };
}
