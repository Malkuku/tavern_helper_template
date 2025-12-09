// logger.ts
export class KatLogger {
  private readonly prefix: string;

  constructor(prefix: string = '[app] ') {
    this.prefix = prefix;
  }

  log(...args: any[]): void {
    console.log(`%c🗒️ ${this.prefix}`, 'color: green; font-weight: bold;', ...args);
  }

  debug(...args: any[]): void {
    console.log(`%c⚙️ ${this.prefix}`, 'color: orange; font-weight: bold;', ...args);
  }

  info(...args: any[]): void {
    console.log(`%cℹ️ ${this.prefix}`, 'color: blue; font-weight: bold;', ...args);
  }

  warn(...args: any[]): void {
    console.log(`%c⚠️ ${this.prefix}`, 'color: orange; font-weight: bold;', ...args);
  }

  error(...args: any[]): void {
    console.log(`%c❌ ${this.prefix}`, 'color: red; font-weight: bold;', ...args);
  }
}
