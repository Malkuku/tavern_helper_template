// lexer.ts
import { Token, TokenType, LiteralValue } from './types/dsl';

export class DSLLexer {
  private position = 0;
  private tokens: Token[] = [];

  constructor(private input: string) {}

  tokenize(): Token[] {
    this.position = 0;
    this.tokens = [];

    while (this.position < this.input.length) {
      const char = this.input[this.position];

      if (this.isWhitespace(char)) {
        this.position++;
        continue;
      }

      if (char === '(') {
        this.addToken('LPAREN', '(');
        continue;
      }

      if (char === ')') {
        this.addToken('RPAREN', ')');
        continue;
      }

      if (char === '?') {
        this.tokenizeQuestion();
        continue;
      }

      if (char === '#') {
        this.tokenizeHash();
        continue;
      }

      if (char === '$') {
        this.tokenizeDollar();
        continue;
      }

      if (char === '&') {
        this.tokenizeAmpersand();
        continue;
      }

      throw new Error(`Unexpected character: ${char} at position ${this.position}`);
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  private tokenizeQuestion() {
    const start = this.position;
    this.position++; // 跳过 '?'

    if (this.peek() === '[') {
      this.position++; // 跳过 '['
      const opStart = this.position;

      // 读取到 ']'
      while (this.position < this.input.length && this.peek() !== ']') {
        this.position++;
      }

      const op = this.input.slice(opStart, this.position);
      if (this.peek() === ']') {
        this.position++; // 跳过 ']'
      }

      // 判断是逻辑运算符还是比较运算符
      const tokenType = (op === '&&' || op === '||') ? 'LOGICAL_OP' : 'OPERATOR';
      this.tokens.push({
        type: tokenType,
        value: op,
        start,
        end: this.position
      });
    } else {
      throw new Error('Expected "[" after "?"');
    }
  }

  private tokenizeHash() {
    const start = this.position;
    this.position++; // 跳过 '#'

    if (this.peek() === '[') {
      this.position++; // 跳过 '['
      const opStart = this.position;

      // 检查是否是函数调用
      if (this.peek() === '{') {
        this.position++; // 跳过 '{'
        while (this.position < this.input.length && this.peek() !== '}') {
          this.position++;
        }
        if (this.peek() === '}') {
          this.position++; // 跳过 '}'
        }
      }

      // 读取到 ']'
      while (this.position < this.input.length && this.peek() !== ']') {
        this.position++;
      }

      const op = this.input.slice(opStart, this.position);
      if (this.peek() === ']') {
        this.position++; // 跳过 ']'
      }

      this.tokens.push({
        type: 'OPERATOR',
        value: op,
        start,
        end: this.position
      });
    } else {
      throw new Error('Expected "[" after "#"');
    }
  }

  private tokenizeDollar() {
    const start = this.position;
    this.position++; // 跳过 '$'

    if (this.peek() === '[') {
      this.position++; // 跳过 '['
      const pathStart = this.position;

      // 读取到 ']'
      while (this.position < this.input.length && this.peek() !== ']') {
        this.position++;
      }

      const path = this.input.slice(pathStart, this.position);
      if (this.peek() === ']') {
        this.position++; // 跳过 ']'
      }

      this.tokens.push({
        type: 'IDENTIFIER',
        value: path,
        start,
        end: this.position
      });
    } else {
      throw new Error('Expected "[" after "$"');
    }
  }

  private tokenizeAmpersand() {
    const start = this.position;
    this.position++; // 跳过 '&'

    if (this.peek() === '[') {
      this.position++; // 跳过 '['
      const valueStart = this.position;

      // 读取到 ']'
      while (this.position < this.input.length && this.peek() !== ']') {
        this.position++;
      }

      const literalStr = this.input.slice(valueStart, this.position);
      if (this.peek() === ']') {
        this.position++; // 跳过 ']'
      }

      this.tokens.push({
        type: 'LITERAL',
        value: this.parseLiteral(literalStr),
        start,
        end: this.position
      });
    } else {
      throw new Error('Expected "[" after "&"');
    }
  }

  private parseLiteral(str: string): LiteralValue {
    // 解析 &[{num}1] 或 &[{str}hello] 等格式
    if (str.startsWith('{') && str.includes('}')) {
      const endBraceIndex = str.indexOf('}');
      const type = str.slice(1, endBraceIndex);
      const valueStr = str.slice(endBraceIndex + 1);

      switch (type) {
        case 'num':
          { const numValue = parseFloat(valueStr);
          if (isNaN(numValue)) {
            throw new Error(`Invalid number literal: ${valueStr}`);
          }
          return { type: 'number', value: numValue }; }
        case 'str':
          return { type: 'string', value: valueStr };
        case 'bool':
          return { type: 'boolean', value: valueStr === 'true' };
        case 'null':
          return { type: 'null', value: null };
        case 'arr':
          try {
            return { type: 'array', value: JSON.parse(valueStr) };
          } catch {
            throw new Error(`Invalid array literal: ${valueStr}`);
          }
        case 'obj':
          try {
            return { type: 'object', value: JSON.parse(valueStr) };
          } catch {
            throw new Error(`Invalid object literal: ${valueStr}`);
          }
        default:
          throw new Error(`Unknown literal type: ${type}`);
      }
    }

    // 简单数值（兼容老格式）
    const num = parseFloat(str);
    if (!isNaN(num)) {
      return { type: 'number', value: num };
    }

    throw new Error(`Invalid literal: ${str}`);
  }

  private addToken(type: TokenType, value: string) {
    this.tokens.push({
      type,
      value,
      start: this.position,
      end: this.position + value.length
    });
    this.position += value.length;
  }

  private peek(): string {
    return this.position < this.input.length ? this.input[this.position] : '\0';
  }

  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }
}
