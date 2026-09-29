export type CheckState = 'idle' | 'checking' | 'ok' | 'error';
export type CheckResult = { state: 'ok' | 'error'; detail: string };

export const DEFAULT_IMAGE_URL = 'https://gitgud.io/mouse789/dust-laden-obdurant/-/raw/main/头像/希尔.webp';

export function checkTavern(): CheckResult {
  try {
    if (typeof SillyTavern.getCurrentChatId !== 'function' || typeof SillyTavern.getRequestHeaders !== 'function')
      throw new Error('宿主接口不完整');
    SillyTavern.getRequestHeaders();
    return { state: 'ok', detail: '酒馆宿主接口可用' };
  } catch (error) {
    return { state: 'error', detail: error instanceof Error ? error.message : '无法访问酒馆宿主接口' };
  }
}

type EjsTemplateApi = { evalTemplate: (code: string, context: Record<string, never>) => Promise<unknown> };

export async function checkPromptTemplate(host: Window = window.parent): Promise<CheckResult> {
  try {
    const plugin = (host as Window & { EjsTemplate?: EjsTemplateApi }).EjsTemplate;
    if (typeof plugin?.evalTemplate !== 'function')
      return { state: 'error', detail: '未检测到提示词模板扩展，请确认已安装并启用' };
    const output = await plugin.evalTemplate('<%- 6 * 7 %>', {});
    if (String(output).trim() !== '42') throw new Error('扩展已加载，但模板执行结果不正确');
    return { state: 'ok', detail: '提示词模板可执行 EJS' };
  } catch (error) {
    return { state: 'error', detail: error instanceof Error ? error.message : '提示词模板执行失败' };
  }
}

export function normalizeImageUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('请输入 http 或 https 图片地址');
  return url.href;
}

export function checkImage(url: string, timeoutMs = 10000): Promise<CheckResult> {
  let normalized: string;
  try {
    normalized = normalizeImageUrl(url);
  } catch {
    return Promise.resolve({ state: 'error', detail: '请输入有效的 http 或 https 图片地址' });
  }
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = (result: CheckResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const timer = setTimeout(() => finish({ state: 'error', detail: '图片加载超时，请检查图床或网络' }), timeoutMs);
    image.onload = () =>
      finish(
        image.naturalWidth > 0
          ? { state: 'ok', detail: `图片已加载（${image.naturalWidth} × ${image.naturalHeight}）` }
          : { state: 'error', detail: '图片已返回，但无法解码' },
      );
    image.onerror = () => finish({ state: 'error', detail: '图片加载失败，请检查地址、访问权限或网络' });
    image.src = normalized;
  });
}
