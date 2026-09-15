export interface VariableLog {
  type: string;
  data: unknown;
}

export interface ParseVariableLogsOptions {
  includeUpdateVariable?: boolean;
}

interface PatchOperation {
  op?: unknown;
  path?: unknown;
  value?: unknown;
}

function parsePath(path: string): string[] {
  if (path === '') return [];

  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return normalized.split('/').map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isNumericIndex(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function setOwn(target: Record<string, unknown> | unknown[], key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function ensureParent(
  root: Record<string, unknown>,
  segments: string[],
  createMissing: boolean,
): { parent: Record<string, unknown> | unknown[]; key: string } | null {
  let current: unknown = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (typeof current !== 'object' || current === null) {
      throw new TypeError('Patch path traverses a non-container value');
    }

    const parent = current as Record<string, unknown> | unknown[];
    const segment = segments[index];
    if (!hasOwn(parent, segment)) {
      if (!createMissing) return null;
      const nextSegment = segments[index + 1];
      setOwn(parent, segment, nextSegment === '-' || isNumericIndex(nextSegment) ? [] : {});
    }
    current = parent[segment as keyof typeof parent];
  }

  if (typeof current !== 'object' || current === null) {
    throw new TypeError('Patch parent is not a container');
  }

  return { parent: current as Record<string, unknown> | unknown[], key: segments[segments.length - 1] };
}

function setAtPath(root: Record<string, unknown>, segments: string[], value: unknown, append: boolean): void {
  if (segments.length === 0) {
    if (typeof value === 'object' && value !== null) Object.assign(root, value);
    return;
  }

  const parentInfo = ensureParent(root, segments, true);
  if (!parentInfo) return;

  const { parent, key } = parentInfo;
  if (append && key === '-') {
    if (Array.isArray(parent)) parent.push(value);
    else console.warn('Path expects array for append, but parent is not array.');
    return;
  }

  setOwn(parent, key, value);
}

function removeAtPath(root: Record<string, unknown>, segments: string[]): void {
  if (segments.length === 0) return;

  const parentInfo = ensureParent(root, segments, false);
  if (!parentInfo) return;

  const { parent, key } = parentInfo;
  if (Array.isArray(parent)) {
    const index = Number(key);
    if (Number.isInteger(index) && index >= 0 && index < parent.length) parent.splice(index, 1);
  } else {
    delete parent[key];
  }
}

function deltaAtPath(root: Record<string, unknown>, segments: string[], delta: unknown): void {
  const parentInfo = ensureParent(root, segments, false);
  if (!parentInfo) {
    setAtPath(root, segments, 0, false);
    deltaAtPath(root, segments, delta);
    return;
  }

  const { parent, key } = parentInfo;
  const currentValue = parent[key as keyof typeof parent];
  setOwn(parent, key, typeof currentValue === 'number' && typeof delta === 'number' ? currentValue + delta : delta);
}

export function applyVariablePatch(patchArray: unknown[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const candidate of patchArray) {
    try {
      if (typeof candidate !== 'object' || candidate === null) throw new TypeError('Patch operation must be an object');
      const { op, path, value } = candidate as PatchOperation;
      if (typeof op !== 'string' || typeof path !== 'string')
        throw new TypeError('Patch operation requires string op and path');

      const segments = parsePath(path);
      switch (op) {
        case 'replace':
        case 'insert':
          setAtPath(root, segments, value, op === 'insert' && segments.at(-1) === '-');
          break;
        case 'delta':
          deltaAtPath(root, segments, value);
          break;
        case 'remove':
          removeAtPath(root, segments);
          break;
        default:
          console.warn('Unknown patch op:', op);
      }
    } catch (error) {
      console.error('Error applying patch operation:', candidate, error);
    }
  }

  return root;
}

function appendPatchLog(results: VariableLog[], content: string): void {
  try {
    const patch = JSON.parse(content) as unknown;
    results.push(
      Array.isArray(patch)
        ? { type: 'variableedit', data: applyVariablePatch(patch) }
        : { type: 'jsonpatch', data: patch },
    );
  } catch {
    results.push({ type: 'jsonpatch', data: content });
  }
}

function appendUpdateVariableLogs(results: VariableLog[], text: string): void {
  const updateVariablePattern = /<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/gi;
  for (const match of text.matchAll(updateVariablePattern)) {
    let content = match[1];
    const analysisMatch = /<Analysis>([\s\S]*?)<\/Analysis>/i.exec(content);
    if (analysisMatch) {
      results.push({ type: 'variablethink', data: analysisMatch[1].trim() });
      content = content.replace(analysisMatch[0], '');
    }

    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    if (start === -1 || end <= start) continue;

    try {
      const patch = JSON.parse(content.slice(start, end + 1)) as unknown;
      if (Array.isArray(patch)) results.push({ type: 'variableedit', data: applyVariablePatch(patch) });
    } catch (error) {
      console.warn('Failed to parse JSON in UpdateVariable:', error);
    }
  }
}

export function parseVariableLogs(text: string, options: ParseVariableLogsOptions = {}): VariableLog[] {
  if (!text) return [];

  const results: VariableLog[] = [];
  const variablePattern = /<(variable(?:insert|edit|delete|think))>(.*?)<\/\1>/gis;
  for (const match of text.matchAll(variablePattern)) {
    const type = match[1].toLowerCase();
    const content = match[2];
    let data: unknown = type === 'variablethink' ? content.trim() : content;
    if (type !== 'variablethink') {
      try {
        data = JSON.parse(content) as unknown;
      } catch {
        // Existing display behavior keeps malformed legacy payloads as text.
      }
    }
    results.push({ type, data });
  }

  const patchPattern = /<JSONPatch>([\s\S]*?)<\/JSONPatch>/gi;
  for (const match of text.matchAll(patchPattern)) appendPatchLog(results, match[1].trim());

  if (options.includeUpdateVariable) appendUpdateVariableLogs(results, text);
  return results;
}
