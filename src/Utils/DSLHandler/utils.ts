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
export function getValueByPath(data: any, path: string, snapshot?: any, wildcardMapping?: Record<string, string>): any[] {
  // 如果包含通配符，展开所有路径
  if (path.includes('.*.')) {
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
export function getValueByPathDirect(data: any, path: string, snapshot?: any): any {
  const target = snapshot || data;
  return path.split('.').reduce((obj, key) => obj?.[key], target);
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
      if (wildcardMapping && path.includes('.*.')) {
        const expandedPaths = DSLEngine.expandWildcardPaths(target, path, wildcardMapping);
        // 返回第一个匹配的值
        if (expandedPaths.length > 0) {
          return getValueByPathDirect(target, expandedPaths[0]);
        }
      }
      return getValueByPathDirect(target, path);
    }
  };
}
