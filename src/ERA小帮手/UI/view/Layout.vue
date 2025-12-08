<template>
    <div v-if="visible" class="mask" @click.self="close">
      <div class="card">
        <button class="close-x" title="关闭" @click="close">&times;</button>
        <div class="content">
          <router-view/> <!-- 显示子路由的内容 -->
        </div>
        <div class="button-group">
          <!-- 按键组 -->
          <button class="btn" @click="goToRoute('/AsyncAnalyze')">分步分析配置</button>
          <button class="btn" @click="goToRoute('/EraDataHandle')">Era变量处理配置</button>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/UIStore';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const UiStore = useUiStore();
const visible = computed(() => UiStore.showUI); // 控制遮罩的显示和隐藏
const router = useRouter();

const close = () => {
  UiStore.showUI = false;
};

const goToRoute = (path: string) => {
  router.push(path); // 跳转到指定路由
};
</script>

<style scoped lang="scss">
/* 遮罩样式 */
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow-y: auto;
  height: 100vh;
}

::v-deep(.card) {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  animation: slide 0.25s ease;
  margin: 10vh 0;
  z-index: 10000;
  min-height: 300px;
  display: flex;        /* 新增 */
  flex-direction: column;
  max-height: 50vh;     /* 原来 50% 改成 50vh 更直观 */
}

.close-x {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.close-x:hover {
  color: #000;
  background: rgba(0, 0, 0, 0.06);
}

.content {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover {
  background: #4338ca;
}

@keyframes fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slide {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
