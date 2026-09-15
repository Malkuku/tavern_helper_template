<template>
  <transition name="fade">
    <div v-if="visible" class="quick-setup-overlay">
      <div class="quick-setup-modal">
        <header class="modal-header">
          <h2>基础设定确认</h2>
          <div class="subtitle">CONFIRM YOUR IDENTITY</div>
        </header>

        <div class="modal-content" v-if="formData">
          <!-- 身份 (只读) -->
          <div class="form-group">
            <label>当前身份</label>
            <div class="readonly-text">{{ formData.identity || '无' }}</div>
          </div>

          <!-- 外貌 (可修改) -->
          <div class="form-group">
            <label>外貌 (每行一条)</label>
            <textarea v-model="formData.appearance" rows="3" class="text-input" placeholder="例如：黑色的短发..."></textarea>
          </div>

          <!-- 背景 (可修改) -->
          <div class="form-group">
            <label>背景 (每行一条)</label>
            <textarea v-model="formData.background" rows="4" class="text-input" placeholder="例如：出生于偏远的小镇..."></textarea>
          </div>

          <!-- 性格 (可修改) -->
          <div class="form-group">
            <label>性格特征</label>
            <div class="personality-grid">
              <div class="p-item">
                <span>社交表现</span>
                <input type="text" v-model="formData.personality['社交表现']" class="text-input mini">
              </div>
              <div class="p-item">
                <span>行动逻辑</span>
                <input type="text" v-model="formData.personality['行动逻辑']" class="text-input mini">
              </div>
              <div class="p-item">
                <span>思维习惯</span>
                <input type="text" v-model="formData.personality['思维习惯']" class="text-input mini">
              </div>
              <div class="p-item">
                <span>人际距离</span>
                <input type="text" v-model="formData.personality['人际距离']" class="text-input mini">
              </div>
              <div class="p-item">
                <span>道德底色</span>
                <input type="text" v-model="formData.personality['道德底色']" class="text-input mini">
              </div>
            </div>
          </div>

          <!-- 人际关系 (只读) -->
          <div class="form-group">
            <label>初始人际关系</label>
            <div class="relations-list">
              <div v-for="(rel, name) in formData.relationships" :key="name" class="rel-item">
                <div class="rel-name">{{ name }}</div>
                <div class="rel-desc">
                  <div><strong>认知了解:</strong> {{ rel['认知了解'] || '无' }}</div>
                  <div><strong>情感羁绊:</strong> {{ rel['情感羁绊'] || '无' }}</div>
                  <div><strong>利益纽带:</strong> {{ rel['利益纽带'] || '无' }}</div>
                </div>
              </div>
              <div v-if="!formData.relationships || Object.keys(formData.relationships).length === 0" class="readonly-text">
                孤身一人，暂无羁绊
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="action-btn cancel-btn" @click="close" :disabled="submitting">返回</button>
          <button class="action-btn confirm-btn" @click="submit" :disabled="submitting">
            {{ submitting ? '铭刻中...' : '确认并启程' }}
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useStatStore } from '@/尘史使徒/UI/store/StatStore';
import { MvuUtil } from '@/Utils/MvuUtil';

const props = defineProps({
  visible: Boolean,
  initialUser: {
    type: Object,
    default: null,
  },
});
const emit = defineEmits(['update:visible', 'complete']);

const statStore = useStatStore();
const submitting = ref(false);

const formData = ref(null);

// 监听弹窗打开，初始化数据
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initData();
  }
});

// 监听 statStore 数据变化，处理数据延迟加载的情况
watch(() => statStore.stat_data, (newVal) => {
  if (props.visible) {
    initData();
  }
}, { deep: true });

const initData = () => {
  const sourceData = statStore.stat_data || {};
  // 打开弹窗时，Store 可能尚未收到 MVU 写入后的更新事件；本次组装结果是这里的即时权威数据。
  const user = props.initialUser || sourceData?.["角色"]?.["user"] || {};

  formData.value = {
    identity: user["当前身份"] || "",
    appearance: Array.isArray(user["外貌"]) ? user["外貌"].join('\n') : (user["外貌"] || ""),
    background: Array.isArray(user["背景"]) ? user["背景"].join('\n') : (user["背景"] || ""),
    personality: {
      "社交表现": user["性格"]?.["社交表现"] || "",
      "行动逻辑": user["性格"]?.["行动逻辑"] || "",
      "思维习惯": user["性格"]?.["思维习惯"] || "",
      "人际距离": user["性格"]?.["人际距离"] || "",
      "道德底色": user["性格"]?.["道德底色"] || ""
    },
    relationships: user["人际关系"] || {}
  };
};

const close = () => {
  emit('update:visible', false);
};

const submit = async () => {
  submitting.value = true;
  try {
    // 构造更新 Payload
    // 注意：这里提交时仍需基于最新的 store 或 global 数据结构
    const currentStatData = window.stat_data || statStore.stat_data;
    const currentPersonality = currentStatData?.["角色"]?.["user"]?.["性格"] || {};

    const updatePayload = {
      "角色": {
        "user": {
          "外貌": formData.value.appearance.split('\n').map(s => s.trim()).filter(Boolean),
          "背景": formData.value.background.split('\n').map(s => s.trim()).filter(Boolean),
          "性格": {
            ...currentPersonality, // 保留其他可能存在的字段
            "社交表现": formData.value.personality["社交表现"],
            "行动逻辑": formData.value.personality["行动逻辑"],
            "思维习惯": formData.value.personality["思维习惯"],
            "人际距离": formData.value.personality["人际距离"],
            "道德底色": formData.value.personality["道德底色"]
          }
        }
      }
    };

    // 提交 MVU 变量修改
    await MvuUtil.updateMvuDataByDiff(updatePayload);

    if (window.toastr) window.toastr.success("设定已铭刻");
    emit('complete');
  } catch (e) {
    console.error(e);
    if (window.toastr) window.toastr.error("铭刻失败");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.quick-setup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.quick-setup-modal {
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  background: #0a0a0a;
  border: 1px solid var(--theme-color, #a48b57);
  box-shadow: 0 0 30px var(--theme-glow, rgba(164, 139, 87, 0.2));
  display: flex;
  flex-direction: column;
  font-family: 'EB Garamond', serif;
  color: #e0e0e0;
}

.modal-header {
  text-align: center;
  padding: 20px;
  border-bottom: 1px solid rgba(164, 139, 87, 0.3);
  flex-shrink: 0;
}

.modal-header h2 {
  font-family: 'Cinzel', serif;
  color: var(--theme-color, #a48b57);
  margin: 0;
  font-size: 1.8rem;
}

.modal-header .subtitle {
  font-size: 0.8rem;
  color: #888;
  letter-spacing: 2px;
  margin-top: 5px;
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

/* 自定义滚动条 */
.modal-content::-webkit-scrollbar {
  width: 6px;
}
.modal-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}
.modal-content::-webkit-scrollbar-thumb {
  background: var(--theme-color, #a48b57);
  border-radius: 3px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-family: 'Cinzel', serif;
  color: var(--theme-color, #a48b57);
  margin-bottom: 8px;
  font-size: 1rem;
  border-bottom: 1px solid rgba(164, 139, 87, 0.2);
  padding-bottom: 4px;
}

.text-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #444;
  color: #fff;
  padding: 10px;
  font-family: inherit;
  box-sizing: border-box;
  resize: vertical;
}

.text-input:focus {
  outline: none;
  border-color: var(--theme-color, #a48b57);
}

.readonly-text {
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed #444;
  color: #aaa;
}

.personality-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.p-item {
  display: flex;
  flex-direction: column;
}

.p-item span {
  font-size: 0.85rem;
  color: #aaa;
  margin-bottom: 4px;
}

.relations-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rel-item {
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-left: 3px solid var(--theme-color, #a48b57);
}

.rel-name {
  font-weight: bold;
  color: var(--theme-color, #a48b57);
  margin-bottom: 5px;
  font-size: 1.1rem;
}

.rel-desc {
  font-size: 0.9rem;
  color: #ccc;
  line-height: 1.4;
}

.rel-desc strong {
  color: #aaa;
  font-weight: normal;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid rgba(164, 139, 87, 0.3);
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  flex-shrink: 0;
}

.action-btn {
  background: transparent;
  border: 1px solid var(--theme-color, #a48b57);
  color: var(--theme-color, #a48b57);
  font-family: 'Cinzel', serif;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.action-btn:hover:not(:disabled) {
  background: var(--theme-color, #a48b57);
  color: #000;
  box-shadow: 0 0 10px var(--theme-glow, rgba(164, 139, 87, 0.5));
}

.cancel-btn {
  border-color: #555;
  color: #aaa;
}

.cancel-btn:hover:not(:disabled) {
  background: #333;
  color: #fff;
  box-shadow: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  /* 1. 调整遮罩层：去除 Flex 布局对子元素的影响，确保背景纯黑 */
  .quick-setup-overlay {
    display: block; /* 不再使用 flex center，避免键盘弹出时计算错位 */
    padding: 0;
    background: #0a0a0a; /* 强制背景不透明，解决透明度问题 */
    overflow: hidden; /* 防止遮罩层本身滚动 */
  }

  /* 2. 调整弹窗主体：强制撑满视口，使用 dvh 适配动态地址栏 */
  .quick-setup-modal {
    position: fixed; /* 强制固定定位 */
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh; /* 兼容旧浏览器 */
    height: 100dvh; /* 关键：适配移动端动态视口高度，实现真·全屏 */

    max-width: none;
    max-height: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: #0a0a0a; /* 确保弹窗本身背景不透明 */

    display: flex;
    flex-direction: column;
  }

  /* 3. 头部调整 */
  .modal-header {
    padding: 15px;
    background: #0a0a0a; /* 防止滚动内容透视 */
    z-index: 2;
    flex-shrink: 0; /* 防止被压缩 */
  }

  .modal-header h2 {
    font-size: 1.4rem;
  }

  /* 4. 内容区：作为弹性容器占据剩余空间 */
  .modal-content {
    flex: 1; /* 自动占据剩余高度 */
    padding: 15px;
    overflow-y: auto; /* 只有中间区域滚动 */
    -webkit-overflow-scrolling: touch; /* iOS 顺滑滚动 */
  }

  /* 5. 底部按钮区：固定在底部 */
  .modal-footer {
    padding: 12px 15px;
    background: #0a0a0a; /* 防止透视 */
    z-index: 2;
    flex-shrink: 0; /* 防止被压缩 */
    /* 适配 iPhone X 底部横条 */
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }

  /* 6. 表单元素优化 */
  .personality-grid {
    grid-template-columns: 1fr; /* 单列布局 */
    gap: 10px;
  }

  /* 关键：防止 iOS 输入框点击放大和键盘遮挡 */
  .text-input {
    font-size: 16px !important; /* 强制 16px 防止 iOS 缩放 */
    padding: 12px;
  }

  .action-btn {
    flex: 1; /* 按钮等宽撑满 */
    padding: 12px 0;
  }
}

</style>
