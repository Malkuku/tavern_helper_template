import { z } from 'zod';
import type { 地图节点, 角色人设, stat_data, 微信会话, 微信消息内容 } from '../types';

const stringRecord = z.record(z.string(), z.string());
const number = z.number().finite();
const item = z.strictObject({ 描述: z.string(), 作用: z.string(), 数量: number });
const skillLevel = z.strictObject({ 战力评分: number, 描述: z.string(), 升级消耗: number });
const stage = z.strictObject({ 当前等级: number, 累计经验: number, 描述: stringRecord });
const bodyPart = z.strictObject({
  当前状态: z.string(),
  当前等级: number,
  累计经验: number,
  特征: z.string(),
  描述: stringRecord,
});

export const mainRoleSchema = z.strictObject({
  在场: z.boolean(),
  是否变身魔法少女: z.boolean(),
  名称检索词: z.array(z.string()),
  区域检索词: z.array(z.string()),
  基础信息: z.string(),
  外貌: z.strictObject({
    整体印象: z.string(),
    日常外貌: z.string(),
    魔法少女形态: z.strictObject({ 正常: z.string(), 恶堕: z.string() }),
  }),
  身体: z.strictObject({
    特殊状态: z.array(z.unknown()),
    开发状态: z.strictObject({ 小穴: bodyPart, 口穴: bodyPart, 菊穴: bodyPart, 胸部: bodyPart }),
  }),
  性格: z.string(),
  背景: z.string(),
  核心创伤: z.string(),
  人设阶段: z.strictObject({ 创伤稳定度: stage, 好感度: stage, 恶堕度: stage }),
  魔法少女能力: z.strictObject({
    基础能力: z.string().optional(),
    核心能力: z.string(),
    核心能力限制: stringRecord,
  }),
}) satisfies z.ZodType<角色人设>;

const mapNode: z.ZodType<地图节点> = z.lazy(() =>
  z.strictObject({
    名称检索词: z.array(z.string()),
    描述: z.string(),
    详情: z.array(z.string()),
    危机等级: z.string(),
    危机描述: z.string(),
    方位: z.strictObject({ x: z.tuple([number, number]), y: z.tuple([number, number]), z: z.tuple([number, number]) }),
    子地图: z.record(z.string(), mapNode),
  }),
);

const session: z.ZodType<微信会话> = z.custom<微信会话>(
  value =>
    value !== null &&
    typeof value === 'object' &&
    '类型' in value &&
    (value.类型 === '私聊' || value.类型 === '群聊') &&
    '成员' in value &&
    Array.isArray(value.成员) &&
    '消息' in value &&
    Array.isArray(value.消息),
  '微信会话结构无效',
);

/** 新开局的最终变量必须与手机界面的 stat_data 类型保持一致。 */
export const initialStatDataSchema = z.strictObject({
  角色: z.strictObject({
    主要角色: z.record(z.string(), mainRoleSchema),
    次要角色: z.record(
      z.string(),
      z.strictObject({
        名称: z.string(),
        名称检索词: z.array(z.string()),
        区域检索词: z.array(z.string()),
        在场: z.boolean(),
        简介: z.string(),
        性格: z.strictObject({
          社交表现: z.string(),
          行动逻辑: z.string(),
          思维习惯: z.string(),
          人际距离: z.string(),
          道德底色: z.string(),
        }),
        能力描述: z.string(),
      }),
    ),
    user: z.strictObject({
      基础信息: z.string(),
      当前评级: z.string(),
      金钱: number,
      恶堕积分: number,
      技能: z.record(z.string(), z.strictObject({ 当前等级: number, 等级表: z.record(z.string(), skillLevel) })),
      物品: z.record(z.string(), item),
    }),
  }),
  地图: z.record(z.string(), mapNode),
  世界: z.strictObject({ 时间: z.string().min(1), 地点: z.string(), 天气: z.string(), 地图索引: z.string() }),
  仓库: z.record(z.string(), item),
  任务: z.record(
    z.string(),
    z.strictObject({
      描述: z.string(),
      目标: z.string(),
      当前进度: z.string(),
      奖励: z.array(z.unknown()),
      过期时间: z.string(),
    }),
  ),
  商店: z.record(
    z.string(),
    z.strictObject({
      描述: z.string(),
      作用: z.string(),
      价格: number,
      数量: number,
      类别: z.enum(['战斗', '成人BDSM', '特殊']),
    }),
  ),
  技能商店: z.record(
    z.string(),
    z.strictObject({
      描述: z.string(),
      作用: z.string(),
      价格: number,
      适用评级: z.string(),
      等级表: z.record(z.string(), skillLevel),
    }),
  ),
  系统: z.strictObject({
    版本: z.string(),
    商店下次刷新时间: z.string(),
    商店主动刷新次数: number,
    任务下次刷新时间: z.string(),
    任务主动刷新次数: number,
    技能下次刷新时间: z.string(),
    技能主动刷新次数: number,
  }),
  手机: z.strictObject({
    微信: z.strictObject({
      账号: z.record(
        z.string(),
        z.strictObject({ 昵称: z.string(), 头像: z.string(), 表情包: stringRecord, 好友: z.array(z.string()) }),
      ),
      会话: z.record(z.string(), session),
      准备发送: z
        .strictObject({ 会话: z.string(), 时间: z.string(), 内容: z.array(z.custom<微信消息内容>()) })
        .nullable(),
    }),
  }),
}) satisfies z.ZodType<stat_data>;

type SameShape<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type RoleSchemaMatchesContract = Assert<SameShape<z.output<typeof mainRoleSchema>, 角色人设>>;
export type InitialSchemaMatchesContract = Assert<SameShape<z.output<typeof initialStatDataSchema>, stat_data>>;
