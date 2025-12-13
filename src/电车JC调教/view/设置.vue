<template>
  <div class="affection-panel" :class="theme">
    <!-- 顶部标题 -->
    <header class="panel-header">
      <h2 class="title">好感度设置</h2>
    </header>

    <!-- 主体 -->
    <main class="panel-body">
      <!-- 好感度池 -->
      <section class="section">
        <h3 class="section-title">好感度池</h3>
        <div class="pool-grid">
          <div
            v-for="(val, name) in pool"
            :key="name"
            class="pool-item"
          >
            <label>{{ name }}</label>
            <input
              type="number"
              v-model.number="pool[name]"
              :min="0"
              :max="9999"
              class="pool-input"
            />
          </div>
        </div>
        <p class="tips">
          实际增加 = min(变化值, 池剩余值)，池不足时只扣池不溢出。
        </p>
      </section>

      <!-- 增长限制 -->
      <section class="section">
        <h3 class="section-title">增长限制</h3>
        <div class="limit-grid">
          <div class="limit-group">
            <h4>好感度</h4>
            <label>
              最大增值
              <input
                type="number"
                v-model.number="limits.好感度.最大增值"
                :min="1"
                :max="1000"
              />
            </label>
            <label>
              最大减值
              <input
                type="number"
                v-model.number="limits.好感度.最大减值"
                :min="-1000"
                :max="0"
              />
            </label>
          </div>
          <div class="limit-group">
            <h4>经验值</h4>
            <label>
              最大增值
              <input
                type="number"
                v-model.number="limits.经验值.最大增值"
                :min="1"
                :max="1000"
              />
            </label>
            <label>
              最大减值
              <input
                type="number"
                v-model.number="limits.经验值.最大减值"
                :min="0"
                :max="0"
              />
            </label>
          </div>
        </div>
      </section>

      <!-- 好感度事件 -->
      <section class="section">
        <h3 class="section-title">好感度事件</h3>
        <div class="event-list">
          <div
            v-for="(evt, key) in events"
            :key="key"
            class="event-card"
            :class="{ resolved: evt.已解决 }"
          >
            <div class="event-desc">{{ evt.事件描述 }}</div>
            <div class="event-actions">
              <button
                class="btn-resolve"
                :disabled="evt.已解决"
                @click="resolveEvent(key)"
              >
                {{ evt.已解决 ? '已解决' : '标记解决' }}
              </button>
            </div>
          </div>
          <p v-if="!Object.keys(events).length" class="empty">暂无事件</p>
        </div>
      </section>

      <!-- 保存 -->
      <footer class="panel-footer">
        <button class="btn-primary" @click="save">保存配置</button>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watchEffect } from 'vue'
import { useStatStore } from '../store/StatStore'

const statStore = useStatStore()
const theme = computed(() => (statStore.stat_data?.theme === 'dark' ? 'dark' : 'light'))

/* ---------------- 本地副本 ---------------- */
const pool = reactive<Record<string, number>>({})
const limits = reactive({
  好感度: { 最大增值: 20, 最大减值: 20 },
  经验值: { 最大增值: 15, 最大减值: 15 }
})
const events = reactive<Record<string, { 事件描述: string; 已解决: boolean }>>({})

/* ---------------- 同步初始数据 ---------------- */
watchEffect(() => {
  const src = statStore.stat_data
  if (!src) return

  // 池
  Object.assign(pool, src.好感度池 ?? {})

  // 限制
  const lim = src.数值变化限制 ?? src.增值限制
  if (lim) {
    limits.好感度.最大增值 = lim.好感度?.最大增值 ?? 20
    limits.好感度.最大减值 = lim.好感度?.最大减值 ?? 20
    limits.经验值.最大增值 = lim.经验值?.最大增值 ?? 15
    limits.经验值.最大减值 = lim.经验值?.最大减值 ?? 15
  }

  // 事件
  Object.keys(events).forEach(k => delete events[k])
  Object.assign(events, src.好感度事件 ?? {})
})

/* ---------------- 保存 ---------------- */
const save = async () => {
  if (!statStore.stat_data) return

  /* 1. 把 reactive 数据转成普通对象（脱 Proxy） */
  const rawPool      = JSON.parse(JSON.stringify(pool))      // 纯 JSON
  const rawLimits    = JSON.parse(JSON.stringify(limits))    // 纯 JSON
  const rawEvents    = JSON.parse(JSON.stringify(events))    // 纯 JSON

  /* 2. 只深克隆即将被覆盖的三枝（防止把 Proxy 带进去） */
  const poolClone   = JSON.parse(JSON.stringify(statStore.stat_data.好感度池   ?? {}))
  const limitClone  = JSON.parse(JSON.stringify(statStore.stat_data.数值变化限制 ?? {}))
  const eventClone  = JSON.parse(JSON.stringify(statStore.stat_data.好感度事件   ?? {}))

  /* 3. 用脱敏后的数据改副本 */
  Object.assign(poolClone,   rawPool)
  Object.assign(limitClone, rawLimits)
  Object.assign(eventClone, rawEvents)

  await eventEmit('era:updateByObject', {
      好感度池:      poolClone,
      数值变化限制:  limitClone,
      好感度事件:    eventClone
  });

  toastr.success('保存配置成功')
}

/* ---------------- 标记事件解决 ---------------- */
const resolveEvent = async (key: string) => {
  if (!statStore.stat_data) return
  events[key].已解决 = true
}
</script>

<style lang="scss" scoped>
.affection-panel {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow);
  color: var(--text-primary);
  transition: var(--transition);
}

.panel-header {
  margin-bottom: 24px;
  .title {
    font-size: 22px;
    font-weight: 600;
  }
  .subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
}

.section {
  margin-bottom: 32px;
  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--accent);
  }
}

/* 好感度池 */
.pool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  .pool-item {
    display: flex;
    flex-direction: column;
    label {
      font-size: 13px;
      margin-bottom: 4px;
      color: var(--text-secondary);
    }
    .pool-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 14px;
    }
  }
  .tips {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 8px;
  }
}

/* 增长限制 */
.limit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  .limit-group {
    background: var(--bg-secondary);
    padding: 12px;
    border-radius: 8px;
    h4 {
      font-size: 14px;
      margin-bottom: 8px;
      color: var(--text-primary);
    }
    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 6px;
      color: var(--text-secondary);
      input {
        width: 60px;
        margin-left: 8px;
        padding: 4px 6px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: var(--bg-primary);
        color: var(--text-primary);
      }
    }
  }
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .event-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    &.resolved {
      opacity: 0.6;
    }
    .event-desc {
      font-size: 14px;
      flex: 1;
      margin-right: 12px;
    }
    .btn-resolve {
      padding: 6px 12px;
      font-size: 13px;
      border: none;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
      transition: var(--transition);
      &:hover:not(:disabled) {
        background: var(--accent-hover);
      }
      &:disabled {
        background: var(--text-tertiary);
        cursor: not-allowed;
      }
    }
  }
  .empty {
    font-size: 13px;
    color: var(--text-tertiary);
    text-align: center;
    padding: 16px 0;
  }
}

/* 保存按钮 */
.panel-footer {
  text-align: right;
  .btn-primary {
    padding: 8px 20px;
    font-size: 14px;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: var(--transition);
    &:hover {
      background: var(--accent-hover);
    }
  }
}
</style>
