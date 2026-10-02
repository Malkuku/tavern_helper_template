import { z } from 'zod';
import type { 地图节点, 角色人设, stat_data, 微信会话, 微信消息内容 } from '../types';
import { sanitizeMapSvg } from '../../创意工坊/scenario/map';

const stringRecord = z.record(z.string(), z.string());
const number = z.number().finite();
const svgIcon = z.string().refine(value => {
  try {
    sanitizeMapSvg(value);
    return true;
  } catch {
    return false;
  }
}, '图标必须是安全的完整 SVG');
export const itemSchema = z.strictObject({
  图标: svgIcon.optional(),
  描述: z.string(),
  作用: z.string(),
  评级: z.enum(['D', 'C', 'B', 'A', 'S']),
  价格: z.number().int().nonnegative().safe(),
  数量: z.number().int().positive().safe(),
  耐久: z.number().int().nonnegative().safe(),
});
export const skillSchema = z.strictObject({
  图标: svgIcon.optional(),
  描述: z.string(),
  作用: z.string(),
  价格: number,
  评级: z.enum(['D', 'C', 'B', 'A', 'S']),
});
export const ownedSkillSchema = skillSchema.extend({ 启用: z.boolean().optional() });
export const questSchema = z.strictObject({
  描述: z.string(),
  目标: z.string(),
  当前进度: z.string(),
  评级: z.enum(['D', 'C', 'B', 'A', 'S']),
  奖励: z.number().int().positive().safe(),
  已完成: z.boolean(),
  已失败: z.boolean().optional(),
  失败惩罚: z.string().optional(),
});
const ratingCountsSchema = z.strictObject({
  D: z.number().int().nonnegative().safe(),
  C: z.number().int().nonnegative().safe(),
  B: z.number().int().nonnegative().safe(),
  A: z.number().int().nonnegative().safe(),
  S: z.number().int().nonnegative().safe(),
});
const questWeekSchema = z.strictObject({
  周起始: z.string(),
  完成: z.number().int().nonnegative().safe(),
  放弃: z.number().int().nonnegative().safe(),
  完成评级: ratingCountsSchema,
  放弃评级: ratingCountsSchema,
});
export const stage = z.strictObject({ 当前等级: number, 累计经验: number, 描述: stringRecord });
const bodyPart = z.strictObject({
  当前状态: z.string(),
  特征: z.string(),
  开发程度: z.string(),
});
const bodySchema = z.strictObject({
  特殊状态: z.array(z.unknown()),
  小穴: bodyPart,
  口穴: bodyPart,
  菊穴: bodyPart,
  胸部: bodyPart,
});

export const roleMetaSchema = z.strictObject({
  avatar: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  avatarStyle: z.enum(['auto', '0', '1', '2', '3', '4', '5']).optional(),
});

export const mainRoleSchema = z.strictObject({
  meta: roleMetaSchema.optional(),
  在场: z.boolean(),
  当前评级: z.string().optional(),
  名称检索词: z.array(z.string()),
  区域检索词: z.array(z.string()),
  基础信息: z.strictObject({ 姓名: z.string(), 身份: z.array(z.string()), 背景: z.string() }),
  外貌: z.strictObject({
    整体印象: z.string(),
    日常外貌: z.string(),
    魔法少女形态: z.strictObject({ 正常: z.string(), 恶堕: z.string() }),
  }),
  身体: bodySchema,
  性格: z.string(),
  核心创伤: z.string(),
  人设阶段: z.strictObject({ 创伤稳定度: stage, 好感度: stage, 恶堕度: stage }),
  魔法少女能力: z.strictObject({
    基础能力: z.string().optional(),
    核心能力: z.string(),
    核心能力限制: stringRecord,
  }),
}) satisfies z.ZodType<角色人设>;

export const minorRoleSchema = z.strictObject({
  meta: roleMetaSchema.optional(),
  名称检索词: z.array(z.string()),
  区域检索词: z.array(z.string()),
  在场: z.boolean(),
  身份: z.array(z.string()),
  当前评级: z.string().optional(),
  背景: z.string(),
  外貌: z.string(),
  性格: z.string(),
  身体: bodySchema,
  能力描述: z.array(z.string()),
  人设阶段: z.strictObject({ 恶堕度: stage.optional(), 好感度: stage.optional() }).optional(),
});

export const userRoleSchema = z.strictObject({
  meta: roleMetaSchema.optional(),
  基础信息: z.strictObject({ 身份: z.array(z.string()), 背景: z.string() }),
  外貌: z.string(),
  性格: z.string(),
  当前评级: z.string(),
  评级贡献: z.number().int().nonnegative().safe(),
  金钱: number,
  恶堕积分: number,
  技能栏位: z.number().int().min(6).safe().optional(),
  技能: z.record(z.string(), ownedSkillSchema),
  物品: z.record(z.string(), itemSchema),
});

const mapNode: z.ZodType<地图节点> = z.lazy(() =>
  z.strictObject({
    图标: svgIcon,
    名称检索词: z.array(z.string()),
    区域检索词: z.array(z.string()),
    描述: z.string(),
    详情: z.array(z.string()),
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
    次要角色: z.record(z.string(), minorRoleSchema),
    user: userRoleSchema,
  }),
  地图: z.record(z.string(), mapNode),
  世界: z.strictObject({ 时间: z.string().min(1), 地点: z.string(), 天气: z.string(), 地图索引: z.string() }),
  仓库: z.record(z.string(), itemSchema),
  任务: z.record(z.string(), questSchema),
  任务候选: z.record(z.string(), questSchema),
  任务统计: z.strictObject({ 开始周: z.string(), 周记录: z.record(z.string(), questWeekSchema) }),
  商店: z.record(z.string(), itemSchema),
  技能商店: z.record(z.string(), skillSchema),
  系统: z.strictObject({
    版本: z.string(),
    已发现目标: z.array(z.string()).optional(),
    商店下次刷新时间: z.string(),
    商店主动刷新次数: number,
    任务下次刷新时间: z.string(),
    任务主动刷新次数: number,
    技能下次刷新时间: z.string(),
    技能主动刷新次数: number,
  }),
  手机: z.strictObject({
    定向刷新: z
      .strictObject({
        请求ID: z.string().min(1),
        类型: z.enum(['技能', '道具']),
        要求: z.string().trim().min(1),
        普通报价: z.number().int().nonnegative().safe(),
      })
      .nullable(),
    恶堕奖励: z.strictObject({
      已奖励等级: z.record(z.string(), z.number().int().safe()),
      邮件: z.array(
        z.strictObject({
          id: z.string(),
          角色: z.string(),
          评级: z.enum(['D', 'C', 'B', 'A', 'S']),
          等级: z.number().int().min(1).max(6),
          积分: z.number().int().positive().safe(),
          时间: z.string(),
          已读: z.boolean(),
        }),
      ),
    }),
    档案解锁: z
      .strictObject({
        主要角色: z.record(z.string(), z.array(z.string())).optional(),
        次要角色: z.record(z.string(), z.array(z.string())).optional(),
      })
      .optional(),
    微信: z.strictObject({
      账号: z.record(
        z.string(),
        z.strictObject({ 昵称: z.string(), 头像: z.string(), 表情包: stringRecord, 好友: z.array(z.string()) }),
      ),
      会话: z.record(z.string(), session),
      准备发送: z
        .strictObject({
          楼层ID: z.number().int().positive(),
          会话: z.string(),
          时间: z.string(),
          内容: z.array(z.custom<微信消息内容>()),
          已确认: z.boolean().optional(),
        })
        .nullable(),
    }),
  }),
}) satisfies z.ZodType<stat_data>;

type SameShape<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type RoleSchemaMatchesContract = Assert<SameShape<z.output<typeof mainRoleSchema>, 角色人设>>;
export type InitialSchemaMatchesContract = Assert<SameShape<z.output<typeof initialStatDataSchema>, stat_data>>;
