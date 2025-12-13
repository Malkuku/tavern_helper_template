<template>
  <div class="options-container" :class="theme">
    <div class="options-header">
      <div class="options-icon">✉️</div>
      <span class="options-title">请选择您的回应</span>
    </div>

    <div v-if="showOptions" class="options-list">
      <div
        v-for="(option, index) in optionsList"
        :key="index"
        class="option-item"
        @click="selectOption(option)"
      >
        <div class="option-sticker"></div>
        <span class="option-text">{{ option }}</span>
      </div>
    </div>
    <div v-else>
      你的未来是一片荒原
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMessageStore } from '../store/MessageStore';
import { useStatStore } from '../store/StatStore';

const statStore = useStatStore();
// 主题状态
const theme = computed(() => (statStore.stat_data?.theme ? statStore.stat_data.theme : 'autumn'));

// 选项状态
const showOptions = ref(false);
const optionsList = ref<string[]>([]);

// 选择选项
const selectOption = (option: string) => {
  // 获取输入框元素
  const input = window.parent.document.querySelector('#send_textarea') as HTMLTextAreaElement;

  if (input) {
    const currentValue = input.value.trim();
    // 将选项文本追加到输入框
    input.value = currentValue ? `${currentValue} ${option}` : option;

    // 触发输入事件，确保SillyTavern能检测到变化
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // 可选：自动聚焦到输入框
    input.focus();
  } else {
    console.warn('未找到SillyTavern输入框 #send_textarea');
    // 备用方案：如果找不到输入框，使用原来的方法
    // createChatMessages([{ role: 'user', message: option }]);
  }
};

// 解析选项内容
const parseOptions = (message: string) => {
  try {
    // 匹配 <options> 标签内容，支持多行
    const regex = /<options>([\s\S]*?)<\/options>/;
    const match = message.match(regex);

    if (match && match[1]) {
      showOptions.value = true;
      const optionsContent = match[1].trim();
      // 匹配所有 <op>...</op> 标签
      const optionRegex = /<op>(.*?)<\/op>/g;
      const options = [];
      let optionMatch;

      while ((optionMatch = optionRegex.exec(optionsContent)) !== null) {
        options.push(optionMatch[1].trim());
      }

      return options;
    } else {
      showOptions.value = false;
    }
  } catch (error) {
    console.error('解析选项失败:', error);
  }

  return [];
};

// 使用现有的 messageStore
const massageStore = useMessageStore();

// 更新选项
const updateOptions = () => {
  const messageContent = massageStore.message;
  const options = parseOptions(messageContent);
  optionsList.value = options;
  showOptions.value = options.length > 0;
};

// 监听消息变化
watch(() => massageStore.message, updateOptions, { immediate: true });
</script>

<style lang="scss" scoped>
.options-container {
  margin: 2rem 0;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.options-container.autumn {
  background: linear-gradient(135deg, #fffaf0 0%, #f9f3e9 100%);
  border: 1px solid #e8d5b7;
}

.options-container.starry {
  background: linear-gradient(135deg, #0f3460 0%, #1e3a5f 100%);
  border: 1px solid #1a1a2e;
}

.options-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid;
}

.autumn .options-header {
  border-color: rgba(139, 69, 19, 0.3);
}

.starry .options-header {
  border-color: rgba(168, 216, 234, 0.3);
}

.options-icon {
  font-size: 1.2rem;
}

.options-title {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 1px;
}

.autumn .options-title {
  color: #8b4513;
}

.starry .options-title {
  color: #a8d8ea;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.option-item {
  position: relative;
  padding: 0.8rem 1rem 0.8rem 1.5rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s ease;
  border: 1px solid;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.autumn .option-item {
  background: linear-gradient(135deg, #f9f3e9 0%, #f5e8c8 100%);
  border-color: #d4b78c;
  color: #5c4b37;
}

.autumn .option-item:hover {
  background: linear-gradient(135deg, #f5e8c8 0%, #f0dfb4 100%);
  transform: translateX(5px);
  box-shadow: 0 4px 8px rgba(139, 69, 19, 0.2);
}

.starry .option-item {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d4d7a 100%);
  border-color: #3a5a80;
  color: #e6e6ff;
}

.starry .option-item:hover {
  background: linear-gradient(135deg, #2d4d7a 0%, #3a5a80 100%);
  transform: translateX(5px);
  box-shadow: 0 4px 8px rgba(168, 216, 234, 0.2);
}

.option-sticker {
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 32px;
  border-radius: 4px 0 0 4px;
  transition: all 0.3s ease;
}

.autumn .option-sticker {
  background: linear-gradient(135deg, #d4b78c 0%, #c4a57a 100%);
  border: 1px solid #b3956a;
  border-right: none;
}

.starry .option-sticker {
  background: linear-gradient(135deg, #3a5a80 0%, #4a6a90 100%);
  border: 1px solid #5a7aa0;
  border-right: none;
}

.option-item:hover .option-sticker {
  width: 20px;
}

.option-text {
  font-size: 0.85rem;
  line-height: 1.4;
  display: block;
  position: relative;
  z-index: 2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .options-container {
    margin: 1rem 0;
    padding: 1rem;
  }

  .options-list {
    gap: 0.6rem;
  }

  .option-item {
    padding: 0.7rem 1rem 0.7rem 1.2rem;
  }

  .option-sticker {
    width: 12px;
    height: 28px;
  }

  .option-item:hover .option-sticker {
    width: 16px;
  }

  .option-item:hover {
    transform: translateX(3px);
  }
}
</style>
