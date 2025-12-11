import { getValueByPath } from './pathUtils';

/**
 * 描述一个被解析出的路径信息
 */
interface PathInfo {
  /** 原始路径字符串，如 `$[角色.*.状态]` */
  originalPath: string;
  /** 按 . 分割后的路径片段 */
  segments: string[];
  /**
   * 记录每个通配符在该路径中是第几个出现。
   * Key: 路径深度(segments的索引)
   * Value: 通配符的顺序号 (从1开始)
   * 例如: 角色.*.经验.*  -> Map { 1 => 1, 3 => 2 }
   */
  wildcardOrdinalMap: Map<number, number>;
}

export class RuleParser {
  private readonly data: any;
  private pathInfos: PathInfo[] = [];
  // 将 results 的类型改为存储解析后的路径数组集合，更清晰
  private results: string[][] = [];
  private maxWildcardOrdinal = 0;

  constructor(data: any) {
    this.data = data;
  }

  /**
   * 展开包含通配符的表达式字符串。
   * 这是该类的主要入口点。
   * @param expression - 表达式字符串，例如 "$[角色.*.状态] == '良好' && $[装备.*.耐久] > 50"
   * @returns 返回一个包含所有具体表达式的数组
   */
  public expand(expression: string): string[] {
    this.results = [];
    this.pathInfos = [];
    this.maxWildcardOrdinal = 0;

    // 1. 解析表达式，提取所有路径信息
    const pathRegex = /\$\[([^\]]+)\]/g;
    expression.match(pathRegex)?.forEach(match => {
      const path = match.slice(2, -1); // 移除 "$[" 和 "]"
      const segments = path.split('.');

      const wildcardOrdinalMap = new Map<number, number>();
      let currentOrdinal = 0;
      segments.forEach((segment, index) => {
        if (segment === '*') {
          currentOrdinal++;
          wildcardOrdinalMap.set(index, currentOrdinal);
        }
      });

      this.pathInfos.push({
        originalPath: match,
        segments,
        wildcardOrdinalMap,
      });

      if (currentOrdinal > this.maxWildcardOrdinal) {
        this.maxWildcardOrdinal = currentOrdinal;
      }
    });

    // 如果没有通配符，直接返回原始表达式
    if (this.maxWildcardOrdinal === 0) {
      return [expression];
    }

    // 2. 从第一个通配符开始递归解析
    this.resolveWildcards(1, new Map<number, string>());

    // 3. 使用解析出的结果构建最终的表达式列表 (优化后的逻辑)
    const finalExpressions = this.results.map(resolvedPathSet => {
      let tempExpr = expression;
      // 对于每个原始路径 (如 $[角色.*...])，用其解析后的具体路径 (如 $[角色.小明...]) 进行替换
      this.pathInfos.forEach((info, index) => {
        tempExpr = tempExpr.replace(info.originalPath, resolvedPathSet[index]);
      });
      return tempExpr;
    });

    return finalExpressions;
  }

  /**
   * 递归解析通配符。
   * 核心逻辑：按顺序（第1个*，第2个*...）解析，而不是按深度。
   * @param ordinal - 当前正在解析的通配符顺序号 (从1开始)
   * @param context - 已解析的通配符的值. Map<顺序号, 值>
   */
  private resolveWildcards(ordinal: number, context: Map<number, string>): void {
    if (ordinal > this.maxWildcardOrdinal) {
      const resolvedPaths = this.pathInfos.map(info => this.reconstructPath(info, context));
      this.results.push(resolvedPaths); // 直接存入解析后的路径数组
      return;
    }

    const bindingGroup = this.pathInfos.filter(info => info.wildcardOrdinalMap.size >= ordinal);

    if (bindingGroup.length === 0) {
      this.resolveWildcards(ordinal + 1, context);
      return;
    }

    const leaderPath = bindingGroup[0];
    // 获取前缀路径数组
    const prefixSegmentsToLeader = this.getPathPrefixSegments(leaderPath, ordinal, context);
    // 使用您提供的 getValueByPath 函数
    const leaderObject = getValueByPath(this.data, prefixSegmentsToLeader);

    if (typeof leaderObject !== 'object' || leaderObject === null) {
      return;
    }
    const candidateKeys = Object.keys(leaderObject);

    const validKeys = candidateKeys.filter(key => {
      return bindingGroup.every(memberPath => {
        const prefixSegmentsToMember = this.getPathPrefixSegments(memberPath, ordinal, context);
        // 使用您提供的 getValueByPath 函数
        const memberObject = getValueByPath(this.data, prefixSegmentsToMember);
        return typeof memberObject === 'object' && memberObject !== null && Object.prototype.hasOwnProperty.call(memberObject, key);
      });
    });

    for (const key of validKeys) {
      const newContext = new Map(context);
      newContext.set(ordinal, key);
      this.resolveWildcards(ordinal + 1, newContext);
    }
  }

  /**
   * 获取路径中，到达指定顺序通配符之前的前缀路径片段数组。
   * @param pathInfo - 路径信息
   * @param targetOrdinal - 目标通配符的顺序号
   * @param context - 当前已解析的通配符上下文
   * @returns 路径前缀的片段数组，例如 ['角色', '小明', '开发经验值']
   */
  private getPathPrefixSegments(pathInfo: PathInfo, targetOrdinal: number, context: Map<number, string>): string[] {
    let targetDepth = -1;
    for (const [depth, ordinal] of pathInfo.wildcardOrdinalMap.entries()) {
      if (ordinal === targetOrdinal) {
        targetDepth = depth;
        break;
      }
    }

    if (targetDepth === -1) return [];

    const prefixSegments: string[] = [];
    for (let i = 0; i < targetDepth; i++) {
      const segment = pathInfo.segments[i];
      if (segment === '*') {
        const ordinal = pathInfo.wildcardOrdinalMap.get(i)!;
        prefixSegments.push(context.get(ordinal)!);
      } else {
        prefixSegments.push(segment);
      }
    }
    return prefixSegments;
  }

  /**
   * 使用已解析的上下文，重建一个具体的路径字符串。
   */
  private reconstructPath(pathInfo: PathInfo, context: Map<number, string>): string {
    const resolvedSegments = pathInfo.segments.map((segment, index) => {
      if (segment === '*') {
        const ordinal = pathInfo.wildcardOrdinalMap.get(index)!;
        return context.get(ordinal)!;
      }
      return segment;
    });
    return `$[${resolvedSegments.join('.')}]`;
  }
}
