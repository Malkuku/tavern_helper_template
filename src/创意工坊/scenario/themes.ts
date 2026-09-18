import { ScenarioIconPaths } from '../../尘史使徒/UI/types/剧本数据';
import type { ScenarioThemeId } from './types';

export interface ScenarioTheme {
  id: ScenarioThemeId;
  name: string;
  className: string;
  iconKey: keyof typeof ScenarioIconPaths;
  iconMarkup: string;
  tagline: string;
}

const defineTheme = (
  id: ScenarioThemeId,
  className: string,
  iconKey: keyof typeof ScenarioIconPaths,
  tagline: string,
): ScenarioTheme => ({ id, name: id, className, iconKey, iconMarkup: ScenarioIconPaths[iconKey], tagline });

export const scenarioThemes: readonly ScenarioTheme[] = [
  defineTheme('灯', 'theme-lamp', 'lamp', '揭示与理性'),
  defineTheme('铸', 'theme-forge', 'forge', '熔炼与重塑'),
  defineTheme('刃', 'theme-blade', 'edge', '决断与冲突'),
  defineTheme('冬', 'theme-winter', 'winter', '寂静与终结'),
  defineTheme('心', 'theme-heart', 'heart', '生命与不息'),
  defineTheme('杯', 'theme-cup', 'cup', '欲望与吞噬'),
  defineTheme('蛾', 'theme-moth', 'moth', '蜕变与混沌'),
  defineTheme('启', 'theme-key', 'knock', '门径与越界'),
  defineTheme('破镜', 'theme-broken-mirror', 'broken-mirror', '裂隙与倒影'),
];

export const scenarioThemeById = Object.fromEntries(scenarioThemes.map(theme => [theme.id, theme])) as Record<
  ScenarioThemeId,
  ScenarioTheme
>;
