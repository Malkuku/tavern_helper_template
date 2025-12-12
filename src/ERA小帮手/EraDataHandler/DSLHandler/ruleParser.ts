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
   */
  wildcardOrdinalMap: Map<number, number>;
}

export class RuleParser {
  private readonly data: any;
  private pathInfos: PathInfo[] = [];

  // 修改：核心存储结构改为存储上下文 Map
  // 每个 Map 代表一组解析出来的通配符值，例如 { 1: "101", 2: "HP" }
  private foundContexts: Map<number, string>[] = [];

  private maxWildcardOrdinal = 0;

  constructor(data: any) {
    this.data = data;
  }

  /**
   * 新增核心方法：获取满足表达式结构的所有有效上下文
   * @param expression 表达式字符串
   * @returns 上下文映射数组
   */
  public getContexts(expression: string): Map<number, string>[] {
    this.parseExpressionStructure(expression);

    // 如果没有通配符，返回一个空上下文，表示"执行一次，无参数"
    if (this.maxWildcardOrdinal === 0) {
      return [new Map()];
    }

    // 递归解析，结果会存储在 this.foundContexts
    this.resolveWildcards(1, new Map<number, string>());

    return this.foundContexts;
  }

  /**
   * 原有的 expand 方法现在基于 getContexts 实现
   */
  public expand(expression: string): string[] {
    const contexts = this.getContexts(expression);

    // 将上下文填回表达式
    return contexts.map(context => {
      let tempExpr = expression;
      this.pathInfos.forEach(info => {
        tempExpr = tempExpr.replace(info.originalPath, this.reconstructPath(info, context));
      });
      return tempExpr;
    });
  }

  /**
   * 内部方法：解析表达式结构，填充 pathInfos
   */
  private parseExpressionStructure(expression: string) {
    this.pathInfos = [];
    this.foundContexts = [];
    this.maxWildcardOrdinal = 0;

    const pathRegex = /\$\[([^\]]+)\]/g;
    expression.match(pathRegex)?.forEach(match => {
      const path = match.slice(2, -1);
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
  }

  /**
   * 递归解析通配符
   */
  private resolveWildcards(ordinal: number, context: Map<number, string>): void {
    if (ordinal > this.maxWildcardOrdinal) {
      // 终点：保存当前找到的完整上下文
      this.foundContexts.push(new Map(context));
      return;
    }

    const bindingGroup = this.pathInfos.filter(info => info.wildcardOrdinalMap.size >= ordinal);

    if (bindingGroup.length === 0) {
      this.resolveWildcards(ordinal + 1, context);
      return;
    }

    const leaderPath = bindingGroup[0];
    const prefixSegmentsToLeader = this.getPathPrefixSegments(leaderPath, ordinal, context);
    const leaderObject = getValueByPath(this.data, prefixSegmentsToLeader);

    if (typeof leaderObject !== 'object' || leaderObject === null) {
      return;
    }
    const candidateKeys = Object.keys(leaderObject);

    const validKeys = candidateKeys.filter(key => {
      return bindingGroup.every(memberPath => {
        const prefixSegmentsToMember = this.getPathPrefixSegments(memberPath, ordinal, context);
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

  // ... getPathPrefixSegments 和 reconstructPath 保持不变 ...
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
