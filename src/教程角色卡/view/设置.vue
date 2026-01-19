<template>
  <div class="settings-container">
    <h2 class="settings-title">⚙️ 设置</h2>
    
    <div class="settings-section">
      <div class="setting-item">
        <div class="setting-header">
          <h3>常规设置</h3>
        </div>
        <div class="setting-content">
          <p class="setting-description">当前版本暂无可用设置项，后续功能将逐步添加</p>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-header">
          <h3>数据管理</h3>
        </div>
        <div class="setting-content">
          <button class="action-button" @click="refreshData">
            <span>🔄 刷新数据</span>
          </button>
          <p class="setting-description">点击按钮可手动刷新当前显示的数据</p>
        </div>
      </div>
      
      <div class="setting-item">
        <div class="setting-header">
          <h3>关于</h3>
        </div>
        <div class="setting-content">
          <p class="setting-description">甜美日记助手 v1.0</p>
          <p class="setting-description">为您提供舒适的记录体验</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStatStore } from '@/教程角色卡/store/StatStore';
import { ERAUtil } from '@/Utils/ERAUtil';

const statStore = useStatStore();

const refreshData = async () => {
  try {
    await statStore.initData();
    toastr.success('数据已刷新');
  } catch (error) {
    console.error('刷新数据失败:', error);
    toastr.error('数据刷新失败');
  }
};
</script>

<style scoped>
.settings-container {
  padding: 20px;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 15px var(--shadow-color);
  border: 1px solid var(--border-color);
}

.settings-title {
  color: var(--text-primary);
  font-size: 1.5rem;
  margin-bottom: 25px;
  text-align: center;
  font-weight: 600;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.setting-item {
  background: linear-gradient(135deg, #ffffff 0%, var(--bg-secondary) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 10px var(--shadow-color);
}

.setting-header {
  border-bottom: 2px dashed var(--accent-primary);
  padding-bottom: 12px;
  margin-bottom: 15px;
}

.setting-header h3 {
  color: var(--accent-pink);
  font-size: 1.2rem;
  margin: 0;
  font-weight: 600;
}

.setting-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-description {
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.action-button {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-light));
  border: none;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  width: fit-content;
  box-shadow: 0 4px 10px var(--shadow-color);
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px var(--shadow-color);
  background: linear-gradient(135deg, var(--accent-light), var(--accent-primary));
}
</style>