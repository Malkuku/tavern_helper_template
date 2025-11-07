export interface StatData {
  "世界": {
    "日期": string;
    "地点": string;
    "时间": string;
    "当前人物": string;
    "$meta": {
      "necessary": "all";
    };
  };
  "角色": {
    [key: string]: {
      "已出场"?: boolean;
      "特殊状态": {
        "好感度": number;
        "好感度变化原因": string;
        "暴露度"?: number;
        "暴露度变化原因"?: string;
        "调教经验值"?: number;
        "偏执度"?: number;
        "偏执度变化原因"?: string;
        "开发经验值": {
          "胸部": number;
          "小穴"?: number;
          "口穴"?: number;
          "菊穴"?: number;
          "左手"?: number;
          "右手"?: number;
          "左脚"?: number;
        };
      };
      "服装"?: {
        "外套": string;
        "下身": string;
        "内衣": string;
        "内裤": string;
        "袜子": string;
        "配饰": string;
        "玩具": string;
      };
      "身体状态"?: {
        "全身": string;
        "胸部": string;
        "左手"?: string;
        "右手"?: string;
        "左脚"?: string;
      };
      "身体开发描述"?: {
        "全身": string;
        "胸部": string;
        "小穴": string;
        "口穴": string;
        "菊穴": string;
      };
      "当前想法": string;
    };
  };
  "身体开发等级": {
    [key: string]: {
      "胸部": number;
      "小穴"?: number;
      "口穴"?: number;
      "菊穴"?: number;
      "左手"?: number;
      "右手"?: number;
      "左脚"?: number;
    };
  };
  "调教等级"?: number;
  "任务"?: {
    [key: string]: {
      "目标": string;
      "截止时间": string;
      "已完成": boolean;
      "已失败": boolean;
    };
    "$template": {
      "目标": string;
      "截止时间": "未知";
      "已完成": false;
      "已失败": false;
    };
  };
  "数据总览"?: {
    [key: string]: {
      "性交次数": object;
      "调教回忆": object;
    };
  };
  "好感度事件"?: {
    [key: string]: {
      "事件描述": string;
      "已解决": boolean;
    };
  };
  "好感度阶段": {
    [key: string]: {
      [stage: string]: number;
    };
  };
  "偏执度阶段"?: {
    [key: string]: {
      [stage: string]: number;
    };
  };
  "暴露度阶段"?: {
    [key: string]: {
      [stage: string]: number;
    };
  };
  "调教等级阶段"?: {
    [key: string]: {
      [stage: string]: number;
    };
  };
  "开发度阶段": {
    [key: string]: {
      [stage: string]: number;
    };
  };
  "数值变化限制"?: {
    "好感度": {
      "最大增值": number;
      "最大减值": number;
    };
    "暴露度"?: {
      "最大增值": number;
      "最大减值": number;
    };
    "经验值": {
      "最大增值": number;
      "最大减值": number;
    };
  };
  "增值限制"?: {
    "好感度": {
      "最大增值": number;
      "最大减值": number;
    };
    "经验值": {
      "最大增值": number;
      "最大减值": number;
    };
  };
  "theme": string;
  "version": string;
}
