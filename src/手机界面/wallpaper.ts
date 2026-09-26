export function readPhoneWallpaper(): string {
  const value = getVariables({ type: 'script', script_id: getScriptId() })?.magicGirlPhoneWallpaper;
  return typeof value === 'string' && /^\/?user\/files\/[\w.-]+$/.test(value) ? value : '';
}

export function savePhoneWallpaper(path: string): void {
  updateVariablesWith(variables => ({ ...variables, magicGirlPhoneWallpaper: path }), {
    type: 'script',
    script_id: getScriptId(),
  });
}

export async function uploadPhoneWallpaper(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  const extension = extensions[file.type];
  if (!extension) throw new Error('请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片');
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result.split(',')[1]) : reject(new Error('图片读取失败'));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: SillyTavern.getRequestHeaders(),
    body: JSON.stringify({ name: `magic-girl-phone-wallpaper-${crypto.randomUUID()}.${extension}`, data }),
  });
  if (!response.ok) throw new Error(`壁纸上传失败（${response.status}）`);
  const result: unknown = await response.json();
  if (!result || typeof result !== 'object' || !('path' in result) || typeof result.path !== 'string')
    throw new Error('酒馆未返回壁纸路径');
  return result.path;
}
