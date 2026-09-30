import { shallowRef } from 'vue';

export type CropAspect = 'original' | 'square' | 'landscape' | 'wallpaper';
export interface ImageCropRequest {
  file: File;
  aspect: CropAspect;
  squareAvatar?: boolean;
}

export const imageCropRequest = shallowRef<ImageCropRequest | null>(null);
let resolveCrop: ((file: File | null) => void) | null = null;

export function chooseImageCrop(
  file: File,
  aspect: CropAspect = 'original',
  squareAvatar = false,
): Promise<File | null> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件。');
  if (resolveCrop) throw new Error('请先完成当前图片裁剪。');
  return new Promise(resolve => {
    resolveCrop = resolve;
    imageCropRequest.value = { file, aspect, squareAvatar };
  });
}

export function finishImageCrop(file: File | null): void {
  const finish = resolveCrop;
  resolveCrop = null;
  imageCropRequest.value = null;
  finish?.(file);
}

export function cropGeometry(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  const dx = Math.max((frameWidth - displayWidth) / 2, Math.min(offsetX, (displayWidth - frameWidth) / 2));
  const dy = Math.max((frameHeight - displayHeight) / 2, Math.min(offsetY, (displayHeight - frameHeight) / 2));
  return {
    displayWidth,
    displayHeight,
    left: (frameWidth - displayWidth) / 2 + dx,
    top: (frameHeight - displayHeight) / 2 + dy,
    sourceX: ((displayWidth - frameWidth) / 2 - dx) / scale,
    sourceY: ((displayHeight - frameHeight) / 2 - dy) / scale,
    sourceWidth: frameWidth / scale,
    sourceHeight: frameHeight / scale,
    offsetX: dx,
    offsetY: dy,
  };
}
