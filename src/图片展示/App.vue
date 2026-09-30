<template>
  <div class="app-container">
    <div class="gallery-card" :class="{ active: isOpen }">
      <!-- 卡片头部 -->
      <button class="card-header" type="button" :aria-expanded="isOpen" @click="toggleCard">
        <span class="header-mark" aria-hidden="true">✦</span>
        <span class="header-copy">
          <span class="header-kicker">魔法少女 · 影像记录</span>
          <span class="header-title">{{ formattedTitle }}</span>
        </span>
        <span class="arrow-icon" aria-hidden="true">⌄</span>
      </button>

      <!-- 卡片内容 -->
      <div v-show="isOpen" class="card-content">
        <div class="img-wrapper" :class="{ 'has-error': hasError }" @click="openLightbox">
          <!-- 加载圈 -->
          <div v-if="isLoading && !hasError" class="img-loader" role="status" aria-label="图片加载中"></div>

          <!-- 图片 -->
          <img
            v-if="shouldLoadImage && !hasError"
            :src="currentSrc"
            :alt="rawName"
            class="gallery-image"
            :class="{ loaded: isLoaded }"
            @load="onImageLoad"
            @error="handleImgError"
          />

          <div v-if="hasError" class="image-error" role="status">影像暂时无法读取</div>
          <div v-if="isLoaded && !hasError" class="zoom-hint">🔍 点击放大</div>
        </div>
      </div>
    </div>

    <!-- 灯箱组件 -->
    <Teleport to="body">
      <div
        v-if="lightboxShow"
        class="custom-lightbox-overlay show"
        @click.self="closeLightbox"
        @wheel.prevent="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <button class="lightbox-close-btn" type="button" aria-label="关闭图片预览" @click="closeLightbox">
          &times;
        </button>
        <div class="lightbox-tip">滚轮/双指缩放 · 拖拽移动</div>

        <img
          :src="currentSrc"
          class="custom-lightbox-content"
          :style="lightboxTransformStyle"
          :alt="formattedTitle"
          draggable="false"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onUnmounted } from 'vue';

const rawName = '$1';

let fixedName = rawName || '';
fixedName = fixedName.replace(/\s+/g, '');
fixedName = fixedName.replace(/-/g, '/');
if (fixedName.length > 0 && !/\d$/.test(fixedName)) {
  fixedName += '1';
}

const BASE_URL = 'https://gitgud.io/mouse789/magical-girl-corruption/-/raw/master/';
const EXTENSION = '.webp';

const formattedTitle = computed(() => {
  return fixedName.replace(/\//g, ' · ');
});

const currentSrc = `${BASE_URL}${fixedName.split('/').map(encodeURIComponent).join('/')}${EXTENSION}`;

const isOpen = ref(false);
const shouldLoadImage = ref(false);
const isLoading = ref(true);
const isLoaded = ref(false);
const hasError = ref(false);
const lightboxShow = ref(false);

const toggleCard = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value && !shouldLoadImage.value) {
    shouldLoadImage.value = true;
  }
};

const onImageLoad = () => {
  isLoading.value = false;
  isLoaded.value = true;
};

const handleImgError = () => {
  isLoading.value = false;
  hasError.value = true;
};

const zoomState = reactive({
  scale: 1,
  pX: 0,
  pY: 0,
  isDragging: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
});

let initialDistance = 0;
let initialScale = 1;

const lightboxTransformStyle = computed(() => ({
  transform: `translate(${zoomState.pX}px, ${zoomState.pY}px) scale(${zoomState.scale})`,
  transition: zoomState.isDragging ? 'none' : 'transform 0.1s ease-out',
}));

const openLightbox = () => {
  if (hasError.value || !isLoaded.value) return;
  Object.assign(zoomState, { scale: 1, pX: 0, pY: 0, isDragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0 });
  lightboxShow.value = true;
  document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
  lightboxShow.value = false;
  document.body.style.overflow = '';
};

// --- 鼠标/触摸事件 ---
const handleWheel = e => {
  const delta = -Math.sign(e.deltaY);
  const step = 0.15;
  let newScale = zoomState.scale + delta * step * zoomState.scale;
  if (newScale < 0.5) newScale = 0.5;
  if (newScale > 10) newScale = 10;
  zoomState.scale = newScale;
};

const handleMouseDown = e => {
  e.preventDefault();
  zoomState.isDragging = true;
  zoomState.startX = e.clientX;
  zoomState.startY = e.clientY;
  zoomState.lastX = zoomState.pX;
  zoomState.lastY = zoomState.pY;
};

const handleMouseMove = e => {
  if (!zoomState.isDragging) return;
  zoomState.pX = zoomState.lastX + (e.clientX - zoomState.startX);
  zoomState.pY = zoomState.lastY + (e.clientY - zoomState.startY);
};

const handleMouseUp = () => {
  zoomState.isDragging = false;
};

const handleTouchStart = e => {
  if (e.touches.length === 1) {
    zoomState.isDragging = true;
    zoomState.startX = e.touches[0].clientX;
    zoomState.startY = e.touches[0].clientY;
    zoomState.lastX = zoomState.pX;
    zoomState.lastY = zoomState.pY;
  } else if (e.touches.length === 2) {
    zoomState.isDragging = false;
    initialDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    initialScale = zoomState.scale;
  }
};

const handleTouchMove = e => {
  if (e.touches.length === 1 && zoomState.isDragging) {
    zoomState.pX = zoomState.lastX + (e.touches[0].clientX - zoomState.startX);
    zoomState.pY = zoomState.lastY + (e.touches[0].clientY - zoomState.startY);
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (initialDistance > 0) {
      let newScale = initialScale * (dist / initialDistance);
      if (newScale < 0.5) newScale = 0.5;
      if (newScale > 10) newScale = 10;
      zoomState.scale = newScale;
    }
  }
};

const handleTouchEnd = e => {
  zoomState.isDragging = false;
  if (e.touches.length < 2) initialDistance = 0;
};

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style>
html,
body {
  margin: 0;
  background: transparent;
}
.app-container,
.app-container * {
  box-sizing: border-box;
}
.app-container {
  --gallery-bg: #100b16;
  --gallery-surface: #1c1322;
  --gallery-line: #68405d;
  --gallery-text: #f8eef4;
  --gallery-muted: #b49eae;
  --gallery-pink: #f08bb7;
  width: 100%;
  padding: 14px;
  color: var(--gallery-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
}
.gallery-card {
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--gallery-line);
  border-radius: 16px;
  background: linear-gradient(135deg, #27172b, var(--gallery-surface) 60%);
  box-shadow:
    0 12px 32px #10061466,
    inset 0 1px #ffffff13;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.gallery-card.active {
  border-color: #cc5d94;
  box-shadow:
    0 14px 38px #10061488,
    0 0 0 1px #e36fa033;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  min-height: 68px;
  padding: 11px 17px;
  border: 0;
  background: transparent;
  color: var(--gallery-text);
  text-align: left;
  cursor: pointer;
}
.card-header:hover,
.card-header:focus-visible {
  background: #ffffff0a;
}
.card-header:focus-visible,
.lightbox-close-btn:focus-visible {
  outline: 2px solid #ffc0da;
  outline-offset: -3px;
}
.header-mark {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #d9679c8c;
  border-radius: 11px;
  background: radial-gradient(circle at 35% 25%, #7d315e, #321b39 75%);
  color: #ffd5e9;
  font-size: 20px;
  box-shadow: 0 0 18px #cb427e33;
}
.header-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.header-kicker {
  color: var(--gallery-pink);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.header-title {
  overflow: hidden;
  color: var(--gallery-text);
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow-icon {
  margin-left: auto;
  color: var(--gallery-pink);
  font-size: 25px;
  line-height: 1;
  transition: transform 0.2s;
}
.gallery-card.active .arrow-icon {
  transform: rotate(180deg);
}
.card-content {
  padding: 16px;
  border-top: 1px solid #ffffff16;
  background: radial-gradient(circle at 50% 0%, #4c24444d, transparent 65%), var(--gallery-bg);
  text-align: center;
}
.img-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid #6e3c61;
  border-radius: 12px;
  background: linear-gradient(155deg, #201124, #100b16 70%);
  cursor: zoom-in;
}
.img-wrapper.has-error {
  cursor: default;
}
.gallery-image {
  display: block;
  max-width: 100%;
  max-height: min(65vh, 550px);
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.25s;
}
.gallery-image.loaded {
  opacity: 1;
}
.img-loader {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 2px solid #f08bb733;
  border-top-color: var(--gallery-pink);
  border-radius: 50%;
  animation: gallery-spin 0.9s linear infinite;
}
.image-error {
  color: var(--gallery-muted);
  font-size: 13px;
}
.zoom-hint {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 6px 10px;
  border: 1px solid #f08bb755;
  border-radius: 999px;
  background: #100b16d9;
  color: #ffe0ec;
  font-size: 11px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.img-wrapper:hover .zoom-hint {
  opacity: 1;
}
.custom-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #100b16f5;
  backdrop-filter: blur(10px);
  touch-action: none;
}
.custom-lightbox-content {
  max-width: 95vw;
  max-height: 95vh;
  border: 1px solid #cf6396;
  border-radius: 4px;
  box-shadow: 0 0 40px #9a366544;
  object-fit: contain;
  transform-origin: center;
  will-change: transform;
  cursor: grab;
  user-select: none;
  -webkit-user-drag: none;
}
.custom-lightbox-content:active {
  cursor: grabbing;
}
.lightbox-close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 10000;
  width: 42px;
  height: 42px;
  border: 1px solid #b96990;
  border-radius: 50%;
  background: #241526e8;
  color: #ffe0ec;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.lightbox-close-btn:hover {
  background: #68304f;
}
.lightbox-tip {
  position: absolute;
  bottom: 18px;
  left: 50%;
  z-index: 10000;
  width: max-content;
  max-width: calc(100vw - 32px);
  transform: translateX(-50%);
  padding: 7px 12px;
  border-radius: 999px;
  background: #241526d9;
  color: #dec4d1;
  font-size: 12px;
  pointer-events: none;
}
@keyframes gallery-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-container *,
  .app-container *::before,
  .app-container *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
