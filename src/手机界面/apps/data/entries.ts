export function entries<T extends object>(record: T | undefined | null): [Extract<keyof T, string>, T[keyof T]][] {
  return Object.entries(record ?? {}) as [Extract<keyof T, string>, T[keyof T]][];
}
