/**
 * 核心 Interface：StatData
 * 根据 era变量.json 文件结构定义
 */
export interface StatData {
  "世界信息": {
    "日期": string;
    "天气": string;
    "温度": string;
    "在场人物": string;
  };
  "人物信息": {
    [characterName: string]: {
      "性别": string;
      "年龄": string;
      "身高": string;
      "职业": string;
      "体力": number;
      "性欲": number;
    };
  };
  "theme": string;
}
