import { z } from 'zod';
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

// 运行期只检查会被脚本直接遍历或参与计算的形状。looseObject 保留剧情和旧存档的附加字段。
const object = z.looseObject;
const number = z.number().finite();
const map = <T extends z.ZodType>(value: T) => z.record(z.string(), value);
const worldTime = z.string().refine(value => {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}):(\d{2})\[([1-7])\]$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, weekday] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    ((date.getUTCDay() + 6) % 7) + 1 === weekday
  );
}, '时间应为 YYYY-M-DTHH:mm[星期数字]，且日期与星期一致');

const stage = object({ 当前等级: number.optional(), 累计经验: number.optional(), 描述: map(z.string()).optional() });
const item = object({ 数量: number.optional(), 耐久: number.optional(), 价格: number.optional() });
const skill = object({ 价格: number.optional() });
const quest = object({ 奖励: number.optional(), 已完成: z.boolean().optional() });
const mapNode: z.ZodType = z.lazy(() =>
  object({
    详情: z.array(z.string()).optional(),
    方位: object({
      x: z.array(number).optional(),
      y: z.array(number).optional(),
      z: z.array(number).optional(),
    }).optional(),
    子地图: map(mapNode).optional(),
  }),
);

export const Schema = object({
  角色: object({
    user: object({
      金钱: number.optional(),
      恶堕积分: number.optional(),
      评级贡献: number.optional(),
      技能: map(skill).optional(),
      物品: map(item).optional(),
    }).optional(),
    主要角色: map(
      object({
        人设阶段: object({
          创伤稳定度: stage.optional(),
          好感度: stage.optional(),
          恶堕度: stage.optional(),
        }).optional(),
      }),
    ).optional(),
    次要角色: map(object({ 人设阶段: object({ 恶堕度: stage.optional() }).optional() })).optional(),
  }).optional(),
  地图: map(mapNode).optional(),
  世界: object({ 时间: worldTime, 地图索引: z.string().optional() }).optional(),
  仓库: map(item).optional(),
  任务: map(quest).optional(),
  任务候选: map(quest).optional(),
  商店: map(item).optional(),
  技能商店: map(skill).optional(),
  任务统计: object({ 周记录: map(object({ 完成: number.optional(), 放弃: number.optional() })).optional() }).optional(),
  系统: object({
    已发现目标: z.array(z.string()).optional(),
    商店下次刷新时间: worldTime.optional(),
    任务下次刷新时间: worldTime.optional(),
    技能下次刷新时间: worldTime.optional(),
    商店主动刷新次数: number.optional(),
    任务主动刷新次数: number.optional(),
    技能主动刷新次数: number.optional(),
  }).optional(),
  手机: object({
    微信: object({
      账号: map(object({ 好友: z.array(z.string()).optional(), 表情包: map(z.string()).optional() })).optional(),
      会话: map(object({ 成员: z.array(z.string()).optional(), 消息: z.array(z.unknown()).optional() })).optional(),
    }).optional(),
    恶堕奖励: object({ 已奖励等级: map(number).optional(), 邮件: z.array(z.unknown()).optional() }).optional(),
  }).optional(),
});

$(() => registerMvuSchema(Schema));
