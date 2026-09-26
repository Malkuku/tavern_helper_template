/**
 * 唯一开局组装后写入 stat_data.角色 的数据结构。
 */

export interface 魔法少女形态 {
  正常: string;
  恶堕: string;
}

export interface 外貌 {
  整体印象: string;
  日常外貌: string;
  魔法少女形态: 魔法少女形态;
}

export interface 身体部位开发状态 {
  当前状态: string;
  当前等级: number;
  累计经验: number;
  特征: string;
  描述: Record<string, string>;
}

export interface 身体开发状态 {
  小穴: 身体部位开发状态;
  口穴: 身体部位开发状态;
  菊穴: 身体部位开发状态;
  胸部: 身体部位开发状态;
}

export interface 身体 {
  特殊状态: unknown[];
  开发状态: 身体开发状态;
}

export interface 阶段状态 {
  当前等级: number;
  累计经验: number;
  /** 键可以包含负数等级，例如好感度的 "-2"。 */
  描述: Record<string, string>;
}

export interface 人设阶段 {
  创伤稳定度: 阶段状态;
  好感度: 阶段状态;
  恶堕度: 阶段状态;
}

export interface 魔法少女能力 {
  基础能力?: string;
  核心能力: string;
  核心能力限制: Record<string, string>;
}

export interface 角色人设 {
  在场: boolean;
  是否变身魔法少女: boolean;
  名称检索词: string[];
  区域检索词: string[];
  基础信息: string;
  外貌: 外貌;
  身体: 身体;
  性格: string;
  背景: string;
  核心创伤: string;
  人设阶段: 人设阶段;
  魔法少女能力: 魔法少女能力;
}

export interface 性格分段 {
  社交表现: string;
  行动逻辑: string;
  思维习惯: string;
  人际距离: string;
  道德底色: string;
}

export interface 次要角色人设 {
  名称: string;
  名称检索词: string[];
  区域检索词: string[];
  在场: boolean;
  简介: string;
  性格: 性格分段;
  能力描述: string;
}

export interface 地图节点 {
  名称检索词: string[];
  描述: string;
  详情: string[];
  危机等级: string;
  危机描述: string;
  方位: { x: [number, number]; y: [number, number]; z: [number, number] };
  子地图: Record<string, 地图节点>;
}

/** 标准格式：2026-9-26T03:10[6]；[1]~[7] 对应周一~周日。 */
export type 世界时间 = string;

export interface 世界数据 {
  时间: 世界时间;
  /** 具体叙事地点，可比地图节点更细，例如“中央广场-喷泉东侧”。 */
  地点: string;
  天气: string;
  /** user 当前所在的正式地图节点 key；区域检索依赖此字段。 */
  地图索引: string;
}

export interface 技能等级 {
  战力评分: number;
  描述: string;
  升级消耗: number;
}

export interface 技能 {
  当前等级: number;
  等级表: Record<string, 技能等级>;
}

export interface 物品 {
  描述: string;
  作用: string;
  数量: number;
}

export interface 任务 {
  描述: string;
  目标: string;
  当前进度: string;
  奖励: unknown[];
  过期时间: 世界时间;
}

export interface 商店道具 {
  描述: string;
  作用: string;
  价格: number;
  数量: number;
  类别: '战斗' | '成人BDSM' | '特殊';
}

export interface 可购技能 {
  描述: string;
  作用: string;
  价格: number;
  适用评级: string;
  等级表: Record<string, 技能等级>;
}

export interface 系统数据 {
  /** 当前已应用的主世界书版本。 */
  版本: string;
  /** 前端维护；到期时 EJS 显示商店生成规则。格式同世界.时间。 */
  商店下次刷新时间: 世界时间;
  /** 前端维护；主动刷新第 n 次花费 2 * 2^(n-1) 积分，每日自动刷新后归零。 */
  商店主动刷新次数: number;
  /** 前端维护；到期时 EJS 显示任务生成规则。 */
  任务下次刷新时间: 世界时间;
  /** 前端维护；主动刷新第 n 次花费 4 * 2^(n-1) 积分，每日自动刷新后归零。 */
  任务主动刷新次数: number;
  /** 前端维护；到期时 EJS 显示技能生成规则。每周一 00:00 刷新。 */
  技能下次刷新时间: 世界时间;
  /** 前端维护；主动刷新第 n 次花费 20 * 2^(n-1) 积分，每周自动刷新后归零。 */
  技能主动刷新次数: number;
}

export interface 用户数据 {
  基础信息: string;
  当前评级: string;
  金钱: number;
  恶堕积分: number;
  技能: Record<string, 技能>;
  物品: Record<string, 物品>;
}

/**
 * =================================================
 * 微信
 * =================================================
 */

export type 微信账号ID = string;

export type 微信时间 = 世界时间;

export interface 微信账号 {
  昵称: string;
  头像: string;
  /** key 为 AI 使用的表情包名称，value 为前端资源 ref。 */
  表情包: Record<string, string>;
  好友: 微信账号ID[];
}

export interface 微信消息 {
  楼层ID: number;
  发送者: 微信账号ID;
  时间: 微信时间;
  /**
   * string：普通文本，或 <语音>/<表情包>/<红包>/<转账>/<名片> 标签。
   * object：转发的嵌套消息结构。
   */
  内容: 微信消息内容[];
  引用?: 微信引用快照;
  /** 内容数组下标对应红包或转账的处理结果。 */
  特殊内容状态?: Record<number, '已领取' | '已收款' | '已退回'>;
}

export interface 微信引用快照 {
  楼层ID: number;
  内容下标?: number;
  发送者: 微信账号ID;
  时间: 微信时间;
  内容: 微信消息内容[];
}

export interface 微信转发私聊 {
  私聊: {
    成员: 微信账号ID[];
    消息: 微信消息[];
  };
}

export interface 微信转发群聊 {
  群聊: {
    名称: string;
    成员: 微信账号ID[];
    消息: 微信消息[];
  };
}

export interface 微信转发内容 {
  转发: 微信转发私聊 | 微信转发群聊;
}

export type 微信消息内容 = string | 微信转发内容;

export interface 微信操作 {
  楼层ID: number;
  时间: 微信时间;
  操作:
    | '好友申请'
    | '通过好友申请'
    | '拒绝好友申请'
    | '拍一拍'
    | '创建群聊'
    | '邀请进群'
    | '领取红包'
    | '领取转账'
    | '退回转账';
  操作者: 微信账号ID;
  目标?: 微信账号ID | { 楼层ID: number; 内容下标: number };
  验证消息?: string;
  名称?: string;
}

export type 微信消息流项 = 微信消息 | 微信操作;

export interface 微信会话 {
  类型: '私聊' | '群聊';
  /** 群聊使用；私聊显示名由前端根据另一方账号昵称生成。 */
  名称?: string;
  成员: 微信账号ID[];
  群主?: 微信账号ID;
  消息: 微信消息流项[];
}

/** user 在微信界面连续添加的暂存内容；显式确认后触发正文生成。 */
export interface 微信准备发送 {
  楼层ID: number;
  会话: string;
  时间: 微信时间;
  内容: 微信消息内容[];
  引用?: 微信引用快照;
  /** 旧缓冲缺少此字段时按已确认处理。 */
  已确认?: boolean;
}

export interface 微信数据 {
  账号: Record<微信账号ID, 微信账号>;
  /**
   * 私聊 key：私聊:<账号A>&<账号B>。
   * 若包含 user，则 user 固定在前；否则按账号ID稳定排序。
   * 群聊 key 独立于显示名，由创建事件给出唯一值。
   */
  会话: Record<string, 微信会话>;
  /** 一次性输入缓冲；没有待发送内容时为 null。 */
  准备发送: 微信准备发送 | null;
}

export interface 手机数据 {
  微信: 微信数据;
  /** 已用恶堕积分解锁的档案字段，按角色类型和实际 key 分开存储。 */
  档案解锁?: {
    主要角色?: Record<string, string[]>;
    次要角色?: Record<string, string[]>;
  };
}

export interface stat_data {
  角色: {
    主要角色: Record<string, 角色人设>;
    次要角色: Record<string, 次要角色人设>;
    user: 用户数据;
  };
  地图: Record<string, 地图节点>;
  世界: 世界数据;
  仓库: Record<string, 物品>;
  任务: Record<string, 任务>;
  商店: Record<string, 商店道具>;
  技能商店: Record<string, 可购技能>;
  系统: 系统数据;
  手机: 手机数据;
}
