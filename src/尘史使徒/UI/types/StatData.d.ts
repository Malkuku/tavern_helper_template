export interface StatData {
  "世界": WorldData;
  "角色": RolesData;
  "仓库": Record<string, ItemData>;
  "技能库": Record<string, SkillData>;
  "地图": Record<string, MapNodeData>;
  "世界经济": Record<string, EconomyData>;
  "季节与节日": Record<string, TimeEventData>;
  "势力": Record<string, FactionData>;
  "种族": Record<string, Record<string, string[]>>;
  "主线": Record<string, MainQuestData | MainlineMetaData>;
  "任务": Record<string, TaskData>;
  "事件": Record<string, EventData>;
  "术": Record<string, Record<string, string>>;
  "图书馆": LibraryData;
  "system": SystemSettings;
  "总结概括": Record<string, SummaryOverview>;
  "总结详细": Record<string, SummaryDetails>;
}

/**
 * 图书馆数据
 */
export interface LibraryData {
  "玩家输入": string;
  "爱丽丝设定": "女儿爱丽丝" | "妹妹爱丽丝" | "妈妈爱丽丝"
}

/**
 * 世界环境数据
 */
export interface WorldData {
  "时间": string;
  "地点": string;
  "季节": string;
  "天气": string;
  "地图索引": string;
  "危险场景": boolean;
}

/**
 * 角色总览
 */
export interface RolesData {
  "user": UserCharacterData;
  "主要角色": Record<string, MainCharacterData>;
  "次要角色": Record<string, MinorCharacterData>;
}

/**
 * =================================================
 * 1. User (玩家) 专属数据结构
 * =================================================
 */
export interface UserCharacterData {
  "年龄": string;
  "当前身份": string;
  "外貌": string[];
  "背景": string[];
  "性格": PersonalityData;
  "人际关系": Record<string, RelationshipData>;
  "性经验": Record<string, number>;
  "基础数值": BaseStats;
  "生命状态": LifeStatus;
  "特殊状态": Record<string, SpecialStatusData>;
  "术之等级": Record<string, ArtLevelData>;
  "技能": Record<string, SkillData>;
  "物品": Record<string, ItemData>;
  "金钱": number;
  "缥缈异质": number;
}

/**
 * =================================================
 * 2. 主要角色 (Main Character) 数据结构
 * =================================================
 */
export interface MainCharacterData {
  "姓名": string;
  "名称检索词": string[];
  "区域检索词": string[];
  "在场": boolean;
  "年龄": string;
  "当前身份": string;
  "外貌": string[];
  "外貌概括"?: string;
  "背景": string[];
  "战斗风格"?: string[];
  "性格": PersonalityData;
  "语料": Record<string, string[]>;
  "人际关系": Record<string, RelationshipData>;
  "性经验": Record<string, number> | string; // 支持类似 "与露娜共享" 的字符串
  "基础数值": BaseStats;
  "生命状态": LifeStatus;
  "特殊状态": Record<string, SpecialStatusData> | string; // 支持类似 "与露娜共享" 的字符串
  "术之等级": Record<string, ArtLevelData>;
  "技能": Record<string, SkillData>;
  "物品"?: Record<string, ItemData> | string; // 支持类似 "与露娜共享" 的字符串
}

/**
 * =================================================
 * 3. 次要角色 (Minor Character) 数据结构
 * =================================================
 */
export interface MinorCharacterData {
  "姓名": string;
  "名称检索词": string[];
  "区域检索词": string[];
  "简介": string;
  "在场": boolean;
  "性格标签": string[];
  "基础数值": BaseStats;
  "生命状态": LifeStatus;
  "技能": Record<string, SkillData>;
  "特殊状态": Record<string, SpecialStatusData>;
  "物品": Record<string, ItemData>;
  "术之等级": Record<string, ArtLevelData>;
}

/**
 * =================================================
 * 角色通用属性接口
 * =================================================
 */
export interface BaseStats {
  "力量": number;
  "敏捷": number;
  "智慧": number;
  "魅力": number;
}

export interface SkillData {
  "性相": string;
  "技能等级": number;
  "描述": string;
  "消耗": string;
  "作用": string;
}

export interface PersonalityData {
  "社交表现": string;
  "行动逻辑": string;
  "思维习惯": string;
  "人际距离": string;
  "道德底色": string;
}

export interface RelationshipData {
  "认知了解": string;
  "情感羁绊": string;
  "利益纽带": string;
}

export interface LifeStatus {
  "生命": {
    "最大值": number;
    "当前": number;
  };
  "体力": {
    "最大值": number;
    "当前": number;
  };
  "精神": {
    "最大值": number;
    "当前": number;
  };
}

export interface SpecialStatusData {
  "描述": string;
  "效果": string;
  "持续时间": string;
}

export interface ArtLevelData {
  "等级": number;
  "经验": number;
}

export interface ItemData {
  "类型": string;
  "品质": "凡庸" | "遗物" | "珍品" | "禁忌" | "神造" | "遗片" | "佚存" | "残卷" | "蛀损" | "完帙" | "未知";
  "描述": string;
  "作用": string | Array<string>;
  "数量": number;
  "耐久": number;
}

/**
 * 地图数据 (递归结构)
 */
export interface MapNodeData {
  "名称检索词"?: string[];
  "描述": string;
  "详情": string[];
  "图标": string;
  "方位": {
    "x": number[];
    "y": number[];
    "z": number[];
  };
  "子地图"?: Record<string, MapNodeData>;
}

/**
 * 经济体系
 */
export interface EconomyData {
  "名称检索词": string[];
  "区域检索词": string[];
  "物价": Record<string, string[]>;
  "平均收入": Record<string, string>;
}

/**
 * 季节与节日
 */
export interface TimeEventData {
  "名称检索词": string[];
  "区域检索词": string[];
  "类型": "季节" | "节日" | "会议" | "禁忌";
  "描述": string[];
  "开始日期": string;
  "截止日期": string;
}

/**
 * 势力数据
 */
export interface FactionData {
  "名称检索词": string[];
  "区域检索词": string[];
  "描述": string;
}

/**
 * 主线任务
 */
export interface MainQuestData {
  [key: string]: unknown;
  "描述"?: string;
  "警惕度"?: number;
  "详细"?: string[];
  "已交融的魂质"?: string[];
}

export interface MainlineMetaData {
  version: 1;
  layouts: Record<string, unknown>;
}

/**
 * 普通任务
 */
export interface TaskData {
  "描述": string;
  "目标": string;
  "阻碍": string;
  "取得成果": string[];
  "期望奖励": string;
}

/**
 * 事件
 */
export interface EventData {
  "描述": string;
  "作用": string;
  "进度": string;
}

/**
 * 系统设置
 */
export interface SystemSettings {
  "关注角色列表": {
    "主要角色": string[];
    "次要角色": string[];
  },
  "当前版本": number;
  "当前剧本": string;
  "插图模式": "男性" | "女性";
  "玩家插图": number;
  "叙事节奏": "轻松奇幻" | "诡秘现实" | string;
  "战斗策略": "节省体力" | "伤害灌注" | "防御优先" | "自定义"
  "战斗策略自定义内容": ""
}

/**
 * =================================================
 * 4. 总结概括数据结构
 * =================================================
 */
export interface SummaryData {
  "总结概括": Record<string, SummaryOverview>;
  "总结详细": Record<string, SummaryDetails>;
}

/**
 * 总结概括 - 单个条目（如 AM1, AM2, AMxx）
 */
export interface SummaryOverview {
  "时间范围": string;  // 格式："yyyy-mm-ddTxx:xx[s]" [s]表示星期s
  "标签": string;
  "概括": string;
  "重要度": number; //0~1
}

/**
 * 总结详细 - 单个条目（如 AM1, AM2）
 */
export interface SummaryDetails {
  [eventName: string]: SummaryEvent;
}

/**
 * 总结详细 - 单个事件
 */
export interface SummaryEvent {
  "时间": string;
  "地点": string;
  "人物": string;
  "事件经过": string;
}
