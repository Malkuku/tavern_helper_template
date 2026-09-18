export const resourceCategories = ['世界经济', '势力', '地图', '季节与节日', '种族', '角色'] as const;

export type ResourceCategory = (typeof resourceCategories)[number];

export type JsonObject = Record<string, unknown>;
export type Registry<T> = Record<string, T>;
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

export interface RoleMeta {
  avatar: string;
  color: string;
  avatarStyle?: string;
}

export interface TypedCollectionEntry extends CollectionEntry {
  type: string;
  meta?: RoleMeta;
}

export interface MapEntry extends BaseEntry {
  data: JsonObject;
}

export interface EmbeddedNarrativeEntry {
  key: string;
  data: JsonObject;
}

export interface ScenarioContent {
  开场文本: string;
  世界: JsonObject;
  角色: string[];
  地图: string;
  世界经济: string[];
  季节与节日: string[];
  势力: string[];
  种族: string[];
  主线: JsonObject;
  任务: EmbeddedNarrativeEntry[];
  事件: EmbeddedNarrativeEntry[];
}

export interface ScenarioEntry {
  author: string;
  key: string;
  desc: string;
  可用: boolean;
  视觉方案: ScenarioThemeId;
  自定义主角: boolean;
  内容配置: ScenarioContent;
}

export type ScenarioThemeId = '灯' | '铸' | '刃' | '冬' | '心' | '杯' | '蛾' | '启' | '破镜';

export interface ScenarioSourceBundle {
  fixedData: JsonObject;
  scenarios: Registry<ScenarioEntry>;
  registries: {
    世界经济: Registry<CollectionEntry>;
    势力: Registry<CollectionEntry>;
    地图: Registry<MapEntry>;
    季节与节日: Registry<CollectionEntry>;
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
  version: 2;
  exportedAt: string;
  assets: Partial<Record<'开场白' | ResourceCategory, Registry<unknown>>>;
}

export type PackageConflictDecision = 'overwrite' | 'skip' | 'copy';

export interface ReferenceIssue {
  ownerCategory: '开场白';
  ownerId: string;
  field: string;
  targetCategory: ResourceCategory;
  targetId: string;
}
