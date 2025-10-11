<template>
  <div class="diary-container">
    <h2 class="page-title">多多日记</h2>
    <div class="diary-content">
      <div v-if="diaryContent" class="diary-entry">
        <h3 class="entry-date">{{ currentDateTime }}</h3>
        <p class="entry-text">{{ diaryContent }}</p>
      </div>
      <div v-else class="no-diary">
        <p>暂无日记内容</p>
      </div>
    </div>

    <!-- 落叶特效 - 使用 key 强制重新创建 -->
    <div :key="leavesKey" class="falling-leaves">
      <div class="leaf leaf-1">🍂</div>
      <div class="leaf leaf-2">🍁</div>
      <div class="leaf leaf-3">🍂</div>
      <div class="leaf leaf-4">🍁</div>
      <div class="leaf leaf-5">🍂</div>
      <div class="leaf leaf-6">🍁</div>
      <div class="leaf leaf-7">🍂</div>
      <div class="leaf leaf-8">🍁</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated } from 'vue';

const diaryContent = ref('');
const currentDateTime = ref('');
const leavesKey = ref(0);

function updateDiary() {
  try {
    const message_id = getCurrentMessageId();
    const chat_messages = getChatMessages(message_id);

    if (!chat_messages || chat_messages.length === 0) {
      diaryContent.value = '';
      return;
    }

    const currentMessage = chat_messages[0];
    const messageText = currentMessage.message;

    // 从字符串末尾开始查找最后一个 <duoduo> 标签
    const lastOpeningTag = messageText.lastIndexOf('<duoduo>');
    const lastClosingTag = messageText.lastIndexOf('</duoduo>');

    if (lastOpeningTag !== -1 && lastClosingTag !== -1 && lastClosingTag > lastOpeningTag) {
      const contentStart = lastOpeningTag + '<duoduo>'.length;
      const content = messageText.substring(contentStart, lastClosingTag).trim();
      diaryContent.value = content;
    } else {
      diaryContent.value = '';
    }

    // 更新日期时间
    updateDateTime();

  } catch (error) {
    console.error('获取日记内容失败:', error);
    diaryContent.value = '';
  }
}

// 从MVU变量获取日期时间信息
function updateDateTime() {
  try {
    const variables = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });
    const date = _.get(variables, 'stat_data.世界.日期');
    const time = _.get(variables, 'stat_data.世界.时间');

    if (date && time) {
      currentDateTime.value = `${date} ${time}`;
    } else if (date) {
      currentDateTime.value = date;
    } else if (time) {
      currentDateTime.value = time;
    } else {
      currentDateTime.value = '未知时间';
    }
  } catch (error) {
    console.error('获取MVU日期时间失败:', error);
    currentDateTime.value = '未知时间';
  }
}

// 重置落叶动画
function resetLeaves() {
  leavesKey.value++;
}

// 组件激活时重置动画
onActivated(() => {
  resetLeaves();
});

// 组件挂载时
onMounted(() => {
  updateDiary();
  resetLeaves();
});

// 组件卸载时
onUnmounted(() => {
  // 强制重置 key，确保下次创建时是新的实例
  leavesKey.value = 0;
});
</script>

<style lang="scss" scoped>
.diary-container {
  background: linear-gradient(135deg,
    rgba(217, 119, 6, 0.2),
    rgba(180, 83, 9, 0.25),
    rgba(146, 64, 14, 0.2)
  );
  border-radius: 18px;
  border: 1px solid rgba(180, 83, 9, 0.5);
  box-shadow:
    0 12px 40px rgba(180, 83, 9, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 4px 12px rgba(146, 64, 14, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px;
  min-width: 400px;
  max-width: 600px;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Microsoft YaHei', Arial, sans-serif;
  position: relative;
  z-index: 2;
  overflow: hidden;
}

.page-title {
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 20px 0;
  text-shadow: 0px 2px 4px rgba(146, 64, 14, 0.4);
}

.diary-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 3;
}

.diary-entry {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(180, 83, 9, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    border-color: rgba(180, 83, 9, 0.5);
    box-shadow: 0 6px 20px rgba(180, 83, 9, 0.25);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(180, 83, 9, 0.1), transparent);
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
}

.entry-date {
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-shadow: 0px 1px 3px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;

  &::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 16px;
    background: linear-gradient(135deg, #d97706, #b45309);
    border-radius: 2px;
    margin-right: 8px;
    box-shadow: 0 0 8px rgba(180, 83, 9, 0.4);
  }
}

.entry-text {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(180, 83, 9, 0.2);
  transition: all 0.3s ease;

  white-space: pre-wrap;
  word-wrap: break-word;

  .diary-entry:hover & {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(180, 83, 9, 0.3);
    color: #ffffff;
  }
}

.no-diary {
  text-align: center;
  padding: 40px 20px;
  color: #fbbf24;
  font-style: italic;
  text-shadow: 0px 1px 2px rgba(146, 64, 14, 0.3);
  position: relative;
  z-index: 3;
}

/* 落叶特效 */
.falling-leaves {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.leaf {
  position: absolute;
  font-size: 18px;
  opacity: 0;
  animation: fall linear infinite;
  filter: drop-shadow(0 2px 4px rgba(146, 64, 14, 0.3));
  z-index: 1;
  animation-fill-mode: forwards;
}

.leaf-1 {
  left: 10%;
  animation-duration: 8s;
  animation-delay: 0s;
}

.leaf-2 {
  left: 25%;
  animation-duration: 10s;
  animation-delay: 2s;
}

.leaf-3 {
  left: 40%;
  animation-duration: 12s;
  animation-delay: 4s;
}

.leaf-4 {
  left: 55%;
  animation-duration: 9s;
  animation-delay: 1s;
}

.leaf-5 {
  left: 70%;
  animation-duration: 11s;
  animation-delay: 3s;
}

.leaf-6 {
  left: 85%;
  animation-duration: 13s;
  animation-delay: 5s;
}

.leaf-7 {
  left: 20%;
  animation-duration: 7s;
  animation-delay: 6s;
}

.leaf-8 {
  left: 65%;
  animation-duration: 14s;
  animation-delay: 7s;
}

@keyframes fall {
  0% {
    transform: translateY(-50px) translateX(0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(calc(100% + 50px)) translateX(20px) rotate(360deg);
    opacity: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .diary-container {
    min-width: 300px;
    max-width: 100%;
    padding: 16px;
    margin: 0 12px;
    border-radius: 14px;
  }

  .diary-entry {
    padding: 16px;
    border-radius: 10px;
  }

  .entry-date {
    font-size: 15px;
    margin-bottom: 10px;

    &::before {
      height: 14px;
      margin-right: 6px;
    }
  }

  .entry-text {
    font-size: 13px;
    padding: 10px;
  }

  .leaf {
    font-size: 16px;
  }
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.diary-container {
  animation: fadeInUp 0.5s ease-out;
}

.diary-entry {
  animation: fadeInUp 0.6s ease-out;
}
</style>