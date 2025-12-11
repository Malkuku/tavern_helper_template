/**
 * 将DSL表达式转换为人类可读的格式
 * 优化了函数、路径、值和运算符的显示
 */
export const exprToHumanView = ((localExpression :  string) => {
  let expr = localExpression;
  if (!expr) return '';

  // 1. 移除外部的 <<if>> 或 <<op>> 标签
  expr = expr.replace(/<<(?:if|op)>\s*(.*?)\s*>(?:\s|$)/g, '$1');

  // 辅助函数：用于处理函数内部的参数字符串
  // 例如，将 '$[path1]$[path2]&[{num}10]' 转换为 'path1, path2, 10'
  const processArgs = (argsStr: string): string => {
    const args = [];
    // 匹配所有路径和值
    const argRegex = /\$\[(.*?)\]|&\[\{str\}(.*?)\]|&\[\{(?:num|bool)\}(.*?)\]|&\[\{null\}\]/g;
    let match;
    while ((match = argRegex.exec(argsStr)) !== null) {
      if (match[1] !== undefined) { // 匹配 $[path]
        args.push(match[1]);
      } else if (match[2] !== undefined) { // 匹配 &[{str}value]
        args.push(`"${match[2]}"`);
      } else if (match[3] !== undefined) { // 匹配 &[{num|bool}value]
        args.push(match[3]);
      } else { // 匹配 &[{null}]
        args.push('null');
      }
    }
    return args.join(', ');
  };

  // 2. 优先处理函数格式，例如 #[{ln}$[path]] -> ln(path)
  expr = expr.replace(/#\[\{(ln|log2|sqrt|abs|floor|ceil|max|min)\}(.*?)\]/g, (match, func, args) => {
    return `${func}(${processArgs(args)})`;
  });

  // 3. 处理简单的算术/赋值运算符，例如 #[+] -> +
  expr = expr.replace(/#\[([+\-*/%]|(?:\*\*)|=)\]/g, ' $1 ');

  // 4. 处理比较/逻辑运算符，例如 ?[==] -> ==
  expr = expr.replace(/\?\[(==|>|<|>=|<=|&&|\|\|)\]/g, ' $1 ');

  // 5. 处理未在函数中处理的、独立的路径和值
  expr = expr.replace(/\$\[(.*?)\]/g, '$1');
  expr = expr.replace(/&\[\{str\}(.*?)\]/g, '"$1"');
  expr = expr.replace(/&\[\{(?:num|bool)\}(.*?)\]/g, '$1');
  expr = expr.replace(/&\[\{null\}\]/g, 'null');

  // 6. 清理多余的空格，使表达式更紧凑
  return expr.replace(/\s+/g, ' ').trim();
});
