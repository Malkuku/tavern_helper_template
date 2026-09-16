export const resourceCategories = [
  '世界',
  '世界经济',
  '主线',
  '事件',
  '任务',
  '势力',
  '地图',
  '地图节点',
  '季节与节日',
  '开场文本',
  '种族',
  '角色',
] as const;

export type ResourceCategory = (typeof resourceCategories)[number];

export type JsonObject = Record<string, unknown>;
export type Registry<T> = Record<string, T>;
export interface MapTopology {
  [resourceId: string]: MapTopology;
}

export interface BaseEntry {
  author: string;
  desc: string;
}

export interface SingletonEntry extends BaseEntry {
  data: JsonObject;
}

export interface TextEntry extends BaseEntry {
  data: string;
}

export interface CollectionEntry extends BaseEntry {
  key: string;
  data: unknown;
}

export interface TypedCollectionEntry extends CollectionEntry {
  type: string;
}

export interface MapEntry extends BaseEntry {
  root: MapTopology;
}

export interface ContentConfig {
  开场文本: string;
  世界: string;
  角色: string[];
  地图: string;
  世界经济: string[];
  季节与节日: string[];
  势力: string[];
  种族: string[];
  主线: string;
  任务: string[];
  事件: string[];
}

export interface ScenarioEntry {
  author: string;
  key: string;
  desc: string;
  可用: boolean;
  主题: string;
  图标: string;
  自定义主角: boolean;
  内容配置: ContentConfig;
}

export interface ScenarioSourceBundle {
  fixedData: JsonObject;
  scenarios: Registry<ScenarioEntry>;
  registries: {
    世界: Registry<SingletonEntry>;
    世界经济: Registry<CollectionEntry>;
    主线: Registry<SingletonEntry>;
    事件: Registry<CollectionEntry>;
    任务: Registry<CollectionEntry>;
    势力: Registry<CollectionEntry>;
    地图: Registry<MapEntry>;
    地图节点: Registry<CollectionEntry>;
    季节与节日: Registry<CollectionEntry>;
    开场文本: Registry<TextEntry>;
    种族: Registry<TypedCollectionEntry>;
    角色: Registry<TypedCollectionEntry>;
  };
}

export interface RuntimeStatData extends JsonObject {
  世界: JsonObject;
  角色: {
    user: JsonObject;
    主要角色: JsonObject;
    次要角色: JsonObject;
  };
  地图: JsonObject;
  世界经济: JsonObject;
  季节与节日: JsonObject;
  势力: JsonObject;
  种族: JsonObject;
  主线: JsonObject;
  任务: JsonObject;
  事件: JsonObject;
  system: JsonObject;
}

export interface AssemblyResult {
  scenarioId: string;
  scenario: ScenarioEntry;
  statData: RuntimeStatData;
  openingText: string;
}

export interface WorkshopPackage {
  format: 'dust-history-workshop-package';
  version: 1;
  exportedAt: string;
  assets: Partial<Record<'开场白' | ResourceCategory, Registry<unknown>>>;
}

export type PackageConflictDecision = 'overwrite' | 'skip' | 'copy';

export interface ReferenceIssue {
  ownerCategory: '开场白' | '地图';
  ownerId: string;
  field: string;
  targetCategory: ResourceCategory;
  targetId: string;
}
