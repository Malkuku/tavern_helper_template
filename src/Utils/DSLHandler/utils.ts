// utils.ts
import { DSLEngine } from './dsl-engine';
import { EvalContext } from './types/dsl';

/**
 * 通过路径获取值（支持通配符）
 */
export function getValueByPath(data: any, path: string, snapshot?: any): any[] {
  // 如果包含通配符，展开所有路径
  if (path.includes('.*.')) {
    const paths = DSLEngine.expandWildcardPaths(data, path);
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
    getValueByPath: (path: string, fromSnapshot = false) => {
      const target = fromSnapshot ? snapshot : data;
      return getValueByPathDirect(target, path);
    }
  };
}
