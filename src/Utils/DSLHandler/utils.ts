// utils.ts
import { DSLEngine } from './dsl-engine';
import { EvalContext } from './types/dsl';

/**
 * 通过路径获取值（支持通配符）
 * @param data 数据对象
 * @param path 路径
 * @param snapshot 快照对象
 * @param wildcardMapping 通配符映射，用于保持同一层级的一致性
 */
export function getValueByPath(data: any, path: string, snapshot?: any, wildcardMapping?: Record<string, string>): {path: string, value: any}[] {
  // 如果包含通配符，展开所有路径
  // 修改判断条件，使其能够匹配以 .* 结尾的路径
  if (path.includes('.*.') || path.endsWith('.*') || path.includes('*.')) {
    const paths = DSLEngine.expandWildcardPaths(data, path, wildcardMapping);
    return paths.map(p => {
      const value = getValueByPathDirect(data, p, snapshot);
      return { path: p, value };
    });
  }

  // 普通路径
  return [{ path, value: getValueByPathDirect(data, path, snapshot) }];
}

/**
 * 直接通过路径获取值（不支持通配符）
 */
export function getValueByPathDirect(data: any, path: string, snapshot?: any): {path: string, value: any}[] {
  const target = snapshot || data;
  const value = path.split('.').reduce((obj, key) => obj?.[key], target);
  return [{ path, value }];
}

/**
 * 创建求值上下文
 */
export function createEvalContext(
  data: any,
  snapshot: any,
  thisPath: string
): EvalContext {
  return {
    data,
    snapshot,
    thisPath,
    getValueByPath: (path: string, fromSnapshot = false, wildcardMapping?: Record<string, string>) => {
      const target = fromSnapshot ? snapshot : data;
      // 如果有通配符映射，则使用它
      // 修改判断条件，使其能够匹配以 .* 结尾的路径
      if (wildcardMapping && (path.includes('.*.') || path.endsWith('.*') || path.includes('*.'))) {
        const expandedPaths = DSLEngine.expandWildcardPaths(target, path, wildcardMapping);
        // 返回所有匹配的值
        if (expandedPaths.length > 0) {
          return expandedPaths.map(p => ({
            path: p,
            value: getValueByPathDirect(target, p)[0].value
          }));
        }
      }
      return getValueByPathDirect(target, path);
    }
  };
}

/**
 * 通过路径设置值
 * @param data 数据对象
 * @param path 路径
 * @param value 值
 */
export function setValueByPath(data: any, path: string, value: any): void {
  const pathSegments = path.split('.');
  let current = data;

  // 遍历到倒数第二个路径段
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];
    if (!(segment in current) || typeof current[segment] !== 'object') {
      current[segment] = {};
    }
    current = current[segment];
  }

  // 设置最后一个路径段的值
  current[pathSegments[pathSegments.length - 1]] = value;
}
