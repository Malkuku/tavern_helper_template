import type { 地图节点 } from '../../types';
import { layoutMapNodes, mapLayoutBounds } from '../../../尘史使徒/UI/components/map/layout';

export type PhoneMap = Record<string, 地图节点>;
export interface MapEntry {
  name: string;
  node: 地图节点;
}

export function findPhoneMapPath(map: PhoneMap, target: string, path: MapEntry[] = []): MapEntry[] | undefined {
  for (const [name, node] of Object.entries(map)) {
    const next = [...path, { name, node }];
    if (name === target) return next;
    const nested = findPhoneMapPath(node.子地图 ?? {}, target, next);
    if (nested) return nested;
  }
  return undefined;
}

export function listPhoneMap(map: PhoneMap, path: MapEntry[] = []): { name: string; path: MapEntry[] }[] {
  return Object.entries(map).flatMap(([name, node]) => {
    const next = [...path, { name, node }];
    return [{ name, path: next }, ...listPhoneMap(node.子地图 ?? {}, next)];
  });
}

/** 与尘史地图使用同一坐标投影及碰撞避让，按手机视口重新适配比例。 */
export function layoutPhoneMap(map: PhoneMap, width: number, height: number) {
  const input = Object.entries(map).map(([name, node]) => ({
    key: name,
    x: (node.方位.x[0] + node.方位.x[1]) / 2,
    y: -(node.方位.y[0] + node.方位.y[1]) / 2,
    z: (node.方位.z[0] + node.方位.z[1]) / 2,
    width: 82,
    height: 78,
  }));
  if (!input.length) return [];
  const availableWidth = Math.max(100, width - 28);
  const availableHeight = Math.max(100, height - 28);
  let low = 0;
  let high = 150;
  for (let i = 0; i < 24; i++) {
    const scale = (low + high) / 2;
    const bounds = mapLayoutBounds(layoutMapNodes(input, { coordinateScale: scale, iconScale: 1, gap: 8 }));
    if (bounds.width <= availableWidth && bounds.height <= availableHeight) low = scale;
    else high = scale;
  }
  const items = layoutMapNodes(input, { coordinateScale: low, iconScale: 1, gap: 8 });
  const bounds = mapLayoutBounds(items);
  const offsetX = (bounds.left + bounds.right) / 2;
  const offsetY = (bounds.top + bounds.bottom) / 2;
  return items.map(item => ({ name: item.key, x: item.visualX - offsetX, y: item.visualY - offsetY, z: item.z }));
}
