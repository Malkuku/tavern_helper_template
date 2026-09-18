import { z } from 'zod';

import type {
  CollectionEntry,
  MapEntry,
  ScenarioEntry,
  SingletonEntry,
  TextEntry,
  TypedCollectionEntry,
} from './types';

const JsonObjectSchema = z.record(z.string(), z.unknown());
const EntryBaseSchema = z.object({
  author: z.string(),
  desc: z.string(),
});

export const SingletonEntrySchema: z.ZodType<SingletonEntry> = EntryBaseSchema.extend({
  data: JsonObjectSchema,
}).strict();

export const TextEntrySchema: z.ZodType<TextEntry> = EntryBaseSchema.extend({
  data: z.string(),
}).strict();

export const CollectionEntrySchema: z.ZodType<CollectionEntry> = EntryBaseSchema.extend({
  key: z.string().min(1),
  data: z.unknown(),
}).strict();

export const TypedCollectionEntrySchema: z.ZodType<TypedCollectionEntry> = EntryBaseSchema.extend({
  key: z.string().min(1),
  type: z.string().min(1),
  meta: z
    .object({
      avatar: z.string(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '角色颜色必须是六位十六进制颜色。'),
      avatarStyle: z.enum(['auto', '0', '1', '2', '3', '4', '5']).optional(),
    })
    .strict()
    .optional(),
  data: z.unknown(),
}).strict();

export const MapEntrySchema: z.ZodType<MapEntry> = EntryBaseSchema.extend({
  data: JsonObjectSchema,
}).strict();

const EmbeddedNarrativeEntrySchema = z.object({ key: z.string().min(1), data: JsonObjectSchema }).strict();

const ContentConfigSchema = z
  .object({
    开场文本: z.string(),
    世界: JsonObjectSchema,
    角色: z.array(z.string().min(1)),
    地图: z.string(),
    世界经济: z.array(z.string().min(1)),
    季节与节日: z.array(z.string().min(1)),
    势力: z.array(z.string().min(1)),
    种族: z.array(z.string().min(1)),
    主线: JsonObjectSchema,
    任务: z.array(EmbeddedNarrativeEntrySchema),
    事件: z.array(EmbeddedNarrativeEntrySchema),
  })
  .strict();

export const ScenarioEntrySchema: z.ZodType<ScenarioEntry> = z
  .object({
    author: z.string(),
    key: z.string().min(1),
    desc: z.string(),
    可用: z.boolean(),
    视觉方案: z.enum([
      '灯',
      '铸',
      '刃',
      '冬',
      '心',
      '杯',
      '蛾',
      '启',
      '破镜',
      '秘月',
      '六芒星',
      '蠕虫',
      '林地',
      '白骨门',
    ]),
    自定义主角: z.boolean(),
    内容配置: ContentConfigSchema,
  })
  .strict();

const MapNodeSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z
    .object({
      名称检索词: z.array(z.string()).optional(),
      描述: z.string(),
      详情: z.array(z.string()),
      图标: z.string(),
      方位: z.object({
        x: z.array(z.number()),
        y: z.array(z.number()),
        z: z.array(z.number()),
      }),
      子地图: z.record(z.string(), MapNodeSchema).optional(),
    })
    .passthrough(),
);

export const RuntimeStatDataSchema = z
  .object({
    世界: JsonObjectSchema,
    角色: z
      .object({
        user: JsonObjectSchema,
        主要角色: JsonObjectSchema,
        次要角色: JsonObjectSchema,
      })
      .strict(),
    仓库: JsonObjectSchema,
    技能库: JsonObjectSchema,
    地图: z.record(z.string(), MapNodeSchema),
    世界经济: JsonObjectSchema,
    季节与节日: JsonObjectSchema,
    势力: JsonObjectSchema,
    种族: JsonObjectSchema,
    主线: JsonObjectSchema,
    任务: JsonObjectSchema,
    事件: JsonObjectSchema,
    术: JsonObjectSchema,
    图书馆: JsonObjectSchema,
    system: z
      .object({
        关注角色列表: z.object({
          主要角色: z.array(z.string()),
          次要角色: z.array(z.string()),
        }),
        当前版本: z.number(),
        当前剧本: z.string(),
        插图模式: z.string(),
        玩家插图: z.number(),
        叙事节奏: z.string(),
        战斗策略: z.string(),
        战斗策略自定义内容: z.string(),
      })
      .passthrough(),
    总结概括: JsonObjectSchema,
    总结详细: JsonObjectSchema,
  })
  .strict();
