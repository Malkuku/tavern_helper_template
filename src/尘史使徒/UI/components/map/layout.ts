export interface MapLayoutNode {
  key: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
}

export interface MapLayoutItem extends MapLayoutNode {
  visualX: number;
  visualY: number;
  renderWidth: number;
  renderHeight: number;
}

export interface MapLayoutOptions {
  coordinateScale: number;
  iconScale: number;
  minimumIconSize?: number;
  gap?: number;
  iterations?: number;
}

const stableAngle = (left: string, right: string) => {
  let hash = 2166136261;
  for (const char of `${left}\0${right}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) / 4294967296) * Math.PI * 2;
};

function collisionDirection(left: MapLayoutItem, right: MapLayoutItem): [number, number] {
  const dx = right.x - left.x,
    dy = right.y - left.y,
    distance = Math.hypot(dx, dy);
  if (distance > 1e-6) return [dx / distance, dy / distance];
  if (Math.abs(right.z - left.z) > 1e-6) return [0, right.z > left.z ? -1 : 1];
  const angle = stableAngle(left.key, right.key);
  return [Math.cos(angle), Math.sin(angle)];
}

/** Projects semantic map positions into screen space, then adds only the displacement needed to separate icon boxes. */
export function layoutMapNodes(nodes: MapLayoutNode[], options: MapLayoutOptions): MapLayoutItem[] {
  const minimumIconSize = options.minimumIconSize ?? 18,
    gap = options.gap ?? 10,
    iconScale = Math.max(options.iconScale, 0),
    items = nodes
      .map(node => {
        const naturalWidth = node.width * iconScale,
          naturalHeight = node.height * iconScale,
          readableScale = Math.max(1, minimumIconSize / Math.max(Math.min(naturalWidth, naturalHeight), 1));
        return {
          ...node,
          visualX: node.x * options.coordinateScale,
          visualY: node.y * options.coordinateScale,
          renderWidth: naturalWidth * readableScale,
          renderHeight: naturalHeight * readableScale,
        };
      })
      .sort((left, right) => left.key.localeCompare(right.key));

  for (let iteration = 0; iteration < (options.iterations ?? 32); iteration++) {
    let moved = false;
    for (let leftIndex = 0; leftIndex < items.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex++) {
        const left = items[leftIndex],
          right = items[rightIndex],
          overlapX = (left.renderWidth + right.renderWidth) / 2 + gap - Math.abs(right.visualX - left.visualX),
          overlapY = (left.renderHeight + right.renderHeight) / 2 + gap - Math.abs(right.visualY - left.visualY);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const [directionX, directionY] = collisionDirection(left, right),
          candidates = [
            Math.abs(directionX) > 1e-6 ? overlapX / Math.abs(directionX) : Number.POSITIVE_INFINITY,
            Math.abs(directionY) > 1e-6 ? overlapY / Math.abs(directionY) : Number.POSITIVE_INFINITY,
          ],
          separation = Math.min(...candidates) + 0.01,
          shiftX = (directionX * separation) / 2,
          shiftY = (directionY * separation) / 2;
        left.visualX -= shiftX;
        left.visualY -= shiftY;
        right.visualX += shiftX;
        right.visualY += shiftY;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return items;
}

export function mapLayoutBounds(items: MapLayoutItem[]) {
  if (!items.length) return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
  const left = Math.min(...items.map(item => item.visualX - item.renderWidth / 2)),
    right = Math.max(...items.map(item => item.visualX + item.renderWidth / 2)),
    top = Math.min(...items.map(item => item.visualY - item.renderHeight / 2)),
    bottom = Math.max(...items.map(item => item.visualY + item.renderHeight / 2));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}
