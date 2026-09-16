<template>
  <div class="message-scroll-area" ref="scrollContainer">
    <div class="message-paper">
      <div class="message-content" :style="{ fontSize: fontSize + 'px' }">
        <div class="text-body" v-html="processedHtml"></div>
        <span v-if="isStreaming" class="typing-cursor">_</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';

const props = defineProps<{
  displayHtml: string;
  isStreaming: boolean;
  fontSize: number;
}>();

const scrollContainer = ref<HTMLElement | null>(null);
const statStore = useStatStore();

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
const resolveCharacter = (rawName: string) => {
  const roles = statStore.stat_data?.角色?.主要角色 ?? {};
  for (const [key, data] of Object.entries(roles) as [string, any][]) {
    const names = [key, data?.姓名, ...(Array.isArray(data?.名称检索词) ? data.名称检索词 : [])].filter(Boolean).map(String);
    if (!names.some(name => rawName.includes(name))) continue;
    const color = /^#[0-9a-fA-F]{6}$/.test(data?.meta?.color) ? data.meta.color : '#C9B485';
    return { fixedName: String(data?.姓名 || key), avatarUrl: String(data?.meta?.avatar || ''), color };
  }
  return { fixedName: rawName, avatarUrl: '', color: '#C9B485' };
};

// 将名字拆解为错落有致的HTML结构
const formatStaggeredName = (name: string) => {
  let result = '';
  let charIndex = 0; // 用于跳过标点符号的计数

  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    // 如果是间隔号，单独处理且不影响首字判断
    if (char === '·') {
      result += `<span class="name-dot">${char}</span>`;
      charIndex = 0; // 遇到圆点后，下一个字再次视为"首字"
      continue;
    }

    const isFirst = charIndex === 0;
    // 根据奇偶数进行高低错落
    const offsetClass = charIndex % 2 === 0 ? 'name-char-even' : 'name-char-odd';
    const charClass = isFirst ? 'name-first-char' : offsetClass;

    result += `<span class="name-char ${charClass}">${escapeHtml(char)}</span>`;
    charIndex++;
  }
  return result;
};

const processedHtml = computed(() => {
  if (!props.displayHtml) return '';

  const defaultSvg = `
    <svg class="avatar-fallback-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-dasharray="2 4"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"/>
      <polygon points="50,15 80,67 20,67" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.8"/>
      <polygon points="50,85 80,33 20,33" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.8"/>
      <circle cx="50" cy="50" r="23" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 2" opacity="0.4"/>
      <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.9"/>
      <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" stroke-width="1" opacity="0.6"/>
    </svg>
  `;

  const regex = /【([^】]+)】\s*(?:<q>(.*?)<\/q>|([「『].*?[」』])|<em>\s*\*?(.*?)\*?\s*<\/em>|\*(.*?)\*)/gs;

  const html = props.displayHtml.replace(regex, (match, rawName, qText, quoteText, emText, starText) => {
    let content = '';
    let isDialogue = false;

    if (qText !== undefined) { content = qText; isDialogue = true; }
    else if (quoteText !== undefined) { content = quoteText; isDialogue = true; }
    else if (emText !== undefined) { content = emText; }
    else if (starText !== undefined) { content = starText; }

    content = content.trim().replace(/^([「『"])|([」』"])$/g, '').trim();
    const charInfo = resolveCharacter(rawName);
    const safeAvatar = escapeHtml(charInfo.avatarUrl);
    const safeName = escapeHtml(charInfo.fixedName);

    const avatarHtml = charInfo.avatarUrl
      ? `<img src="${safeAvatar}" class="avatar-img" alt="${safeName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <span class="avatar-fallback-wrapper" style="display:none;">${defaultSvg}</span>`
      : `<span class="avatar-fallback-wrapper">${defaultSvg}</span>`;

    const textClass = isDialogue ? 'role-text is-dialogue' : 'role-text is-thought';

    return `
      <span class="role-block">
        <span class="role-avatar">${avatarHtml}</span>
        <span class="role-main">
          <span class="role-name-wrapper char-default" style="color: ${charInfo.color}">${formatStaggeredName(charInfo.fixedName)}</span>
          <span class="${textClass}">${content}</span>
        </span>
      </span>
    `;
  });

  return html;
});

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' });
    }
  });
};

defineExpose({ scrollContainer, scrollToBottom });
</script>

<style scoped>
.message-scroll-area {
  flex: 1; overflow-y: auto; padding: 20px 0;
  scrollbar-width: thin; scrollbar-color: var(--c-gold) transparent;
}
.message-paper { max-width: 1024px; margin: 0 auto; padding: 0 30px; }
.message-content {
  line-height: 1.7; /* 从 1.8 稍微收紧 */
  color: var(--c-text-main);
  font-family: 'EB Garamond', 'Noto Serif SC', serif; /* 加入衬线体 */
  transition: font-size 0.2s ease;
}

/* ================= 基础标签优化 ================= */

.text-body :deep(q) {
  quotes: none; display: inline; background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(164, 139, 87, 0.15); border-radius: 4px;
  padding: 2px 6px; margin: 0 2px; color: #fff5e6;
  font-family: 'EB Garamond', serif; font-style: italic;
  text-shadow: 0 0 2px rgba(0,0,0,0.5); box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  box-decoration-break: clone; -webkit-box-decoration-break: clone;
  transition: all 0.3s ease;
}
.text-body :deep(q):hover {
  background: rgba(164, 139, 87, 0.15); border-color: rgba(164, 139, 87, 0.4);
  text-shadow: 0 0 5px rgba(164, 139, 87, 0.5); cursor: default;
}
.text-body :deep(q)::before { content: ""; color: var(--c-gold); margin-right: 3px; font-weight: bold; opacity: 0.8; text-shadow: none; }
.text-body :deep(q)::after { content: ""; color: var(--c-gold); margin-left: 3px; font-weight: bold; opacity: 0.8; text-shadow: none; }
.text-body :deep(p) { margin-bottom: 1em; text-align: justify; }
.text-body :deep(em) { color: var(--c-gold); font-style: italic; }
.text-body :deep(strong) { color: #fff; font-weight: 600; }
.text-body :deep(em) {
  color: var(--c-gold, #C9B485);
  font-style: italic;
  text-shadow: 0 0 5px rgba(201, 180, 133, 0.3);
}
.text-body :deep(strong) {
  color: #FFFFFF;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

/* ================= 角色气泡与排版 ================= */
.text-body :deep(.role-block) {
  display: flex;
  align-items: flex-start;
  gap: 16px; /* 从 20px 缩小 */
  margin: 1.2em 0; /* 从 1.8em 缩小，减小气泡间距 */
  padding: 16px 20px; /* 从 20px 24px 缩小，压缩内部上下空间 */
  background: linear-gradient(145deg, rgba(20, 20, 24, 0.6) 0%, rgba(10, 10, 12, 0.3) 100%);
  border-radius: 16px;
  border-top: 1px solid rgba(164, 139, 87, 0.1);
  border-bottom: 1px solid rgba(164, 139, 87, 0.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.text-body :deep(.role-block:hover) {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(164, 139, 87, 0.05);
}

.text-body :deep(.role-avatar) {
  width: 65px; /* 从 72px 缩小 */
  height: 65px; /* 从 72px 缩小 */
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid rgba(164, 139, 87, 0.4);
  background: radial-gradient(circle, rgba(164, 139, 87, 0.15), rgba(0, 0, 0, 0.8));
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(0,0,0,0.6), inset 0 0 10px rgba(164, 139, 87, 0.3);
}

.text-body :deep(.avatar-img) { width: 100%; height: 100%; object-fit: cover; display: block; }
.text-body :deep(.avatar-fallback-wrapper) { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--c-gold, #a48b57); }
.text-body :deep(.avatar-fallback-svg) { width: 65%; height: 65%; display: block; opacity: 0.8; }

.text-body :deep(.role-main) {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px; /* 从 10px 缩小，拉近名字和文本的距离 */
  padding-top: 0px; /* 从 2px 缩小 */
}

/* ================= 错落有致的名字排版 ================= */
.text-body :deep(.role-name-wrapper) {
  display: flex;
  align-items: baseline;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: capitalize; /* 英文首字母大写 */
  font-family: 'Georgia', 'Noto Serif SC', serif;
  text-shadow: 0 2px 4px rgba(0,0,0,0.9); /* 默认阴影，可被下方专属特效覆盖 */
}
.text-body :deep(.name-char) {
  display: inline-block;
  transition: all 0.2s ease;
  text-shadow: inherit; /* 继承外层特效，确保角色专属发光生效 */
}
/* 首字大写 */
.text-body :deep(.name-first-char) {
  font-size: 1.15em;
  margin-right: 1px;
  font-style: italic; /* 保留奇幻手稿质感 */
}
/* 偶数字位 */
.text-body :deep(.name-char-even) {
  font-size: 0.95em;
  transform: translateY(0px);
}
/* 奇数字位（稍微上浮，略小一点） */
.text-body :deep(.name-char-odd) {
  font-size: 0.88em;
  transform: translateY(-1.5px);
}
/* 圆点间隔 */
.text-body :deep(.name-dot) {
  font-size: 0.8em;
  margin: 0 2px;
  opacity: 0.7;
  transform: translateY(-2px);
  text-shadow: none;
}

/* ================= 沉浸式文本展示优化 ================= */

/* 对话：饱满温暖、悬挂式的华丽引用符号 */
.text-body :deep(.is-dialogue) {
  color: #FDF5E6; /* 老旧蕾丝白，极高阅读舒适度 */
  font-size: 1.08em;
  font-weight: 500;
  line-height: 1.75; /* 从 1.9 缩小 */
  letter-spacing: 0.5px;
  text-shadow: 0 0 2px rgba(253, 245, 230, 0.1);
  display: block;
  position: relative;
}
.text-body :deep(.is-dialogue::before) {
  content: '「';
  color: var(--c-gold, #C9B485);
  font-size: 1.25em;
  font-weight: normal;
  margin-right: 2px;
  vertical-align: -0.1em;
  opacity: 0.8;
}
.text-body :deep(.is-dialogue::after) {
  content: '」';
  color: var(--c-gold, #C9B485);
  font-size: 1.25em;
  font-weight: normal;
  margin-left: 2px;
  vertical-align: -0.15em;
  opacity: 0.8;
}

/* 心理描写 */
.text-body :deep(.is-thought) {
  color: #A3AAB5;
  font-size: 0.98em;
  font-style: italic;
  line-height: 1.65; /* 从 1.8 缩小 */
  opacity: 0.85;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  display: block;
  padding-left: 12px;
  border-left: 2px dashed rgba(163, 170, 181, 0.25);
}

/* ================= 角色专属名称特效 ================= */
.text-body :deep(.char-aliya) { text-shadow: 0 0 6px rgba(224,224,224,0.4), 0 2px 4px rgba(0,0,0,0.9); }
.text-body :deep(.char-lilith) { text-shadow: 0 0 10px rgba(211,47,47,0.7), 0 2px 4px rgba(0,0,0,0.9); } /* 血红 */
.text-body :deep(.char-whitedust) { text-shadow: 0 0 10px rgba(244,244,250,0.6), 0 2px 4px rgba(0,0,0,0.9); letter-spacing: 4px; }
.text-body :deep(.char-luna) { text-shadow: 0 0 10px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.9); }
.text-body :deep(.char-hill) { text-shadow: 0 0 10px rgba(168,185,204,0.6), 0 2px 4px rgba(0,0,0,0.9); } /* 冷银蓝 */
.text-body :deep(.char-hyacinth) { text-shadow: 0 0 8px rgba(174,238,238,0.5); }
.text-body :deep(.char-flora) { text-shadow: 0 0 8px rgba(255,182,193,0.5); }
.text-body :deep(.char-hecate) { text-shadow: 0 0 8px rgba(255,69,0,0.6); }
.text-body :deep(.char-kira) { text-shadow: 0 0 8px rgba(169,176,179,0.5); } /* 刃灰 */
.text-body :deep(.char-elena) { text-shadow: 0 0 10px rgba(171,71,188,0.6); } /* 紫色 */
.text-body :deep(.char-ashlia) { text-shadow: 0 0 10px rgba(142,36,170,0.7); } /* 黑紫 */
.text-body :deep(.char-aurora) { text-shadow: 0 0 8px rgba(218,165,32,0.6); }
.text-body :deep(.char-suri) { text-shadow: 0 0 10px rgba(255,112,67,0.6); } /* 赤金 */
.text-body :deep(.char-ode) { text-shadow: 0 0 8px rgba(176,141,106,0.6); } /* 咖啡棕 */
.text-body :deep(.char-default) { text-shadow: 0 2px 4px rgba(0,0,0,0.9); }

.typing-cursor { display: inline-block; color: var(--c-gold); font-weight: bold; animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
</style>
