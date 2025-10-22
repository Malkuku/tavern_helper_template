<template>
  <div class="world-info-page">
    <div class="info-content">
      <!-- 日期时间信息 -->
      <div class="info-item">
        <div class="item-icon">📅</div>
        <div class="item-content">
          <div class="item-label">记录时间</div>
          <div class="item-value">{{ formattedDateTime }}</div>
        </div>
        <div class="item-decoration"></div>
      </div>

      <!-- 地点信息 -->
      <div class="info-item">
        <div class="item-icon">📍</div>
        <div class="item-content">
          <div class="item-label">所在位置</div>
          <div class="item-value">{{ statData?.世界?.地点 || '未知领域' }}</div>
        </div>
        <div class="item-decoration"></div>
      </div>

      <!-- 人物信息 -->
      <div class="info-item featured">
        <div class="item-icon">👤</div>
        <div class="item-content">
          <div class="item-label">焦点人物</div>
          <div class="item-value">{{ statData?.世界?.当前人物 || '空荡如也' }}</div>
        </div>
        <div class="item-decoration"></div>
      </div>
    </div>

    <div class="info-footer">
      <div class="footer-seal">
        <div class="seal-content">活动<br>记录</div>
      </div>
      <div class="footer-text">档案编号: {{ archiveId }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStatStore } from '../store/StatStore'

const statStore = useStatStore()

// 计算属性获取世界数据
const statData = computed(() => statStore.stat_data)

// 合并日期和时间
const formattedDateTime = computed(() => {
  const date = statData.value?.世界?.日期
  const time = statData.value?.世界?.时间

  if (date && time) {
    return `${date} ${time}`
  } else if (date) {
    return `${date} 时间未记录`
  } else if (time) {
    return `日期未记录 ${time}`
  } else {
    return '时空未记录'
  }
})

// 生成档案编号
const archiveId = computed(() => {
  const date = statData.value?.世界?.日期 || 'XXXX-XX-XX'
  const location = statData.value?.世界?.地点 || 'HAJIMI'
  return `${date}-${location}`
})
</script>

<style lang="scss" scoped>
.world-info-page {
  position: relative;
  min-height: 500px;
  padding: 2rem;
  font-family: 'SimSun', 'STKaiti', serif;
}

.info-content {
  max-width: 600px;
  margin: 0 auto;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 1.5rem 2rem;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;

  :deep(.autumn) & {
    background: rgba(255, 250, 240, 0.8);
    border: 1px solid rgba(210, 180, 140, 0.3);
    box-shadow: 0 2px 8px rgba(139, 69, 19, 0.1);
  }

  :deep(.starry) & {
    background: rgba(26, 26, 46, 0.6);
    border: 1px solid rgba(168, 216, 234, 0.2);
    box-shadow: 0 2px 8px rgba(168, 216, 234, 0.1);
  }

  &.featured {
    transform: scale(1.02);

    :deep(.autumn) & {
      background: rgba(255, 245, 230, 0.9);
      border: 1px solid rgba(210, 180, 140, 0.5);
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.15);
    }

    :deep(.starry) & {
      background: rgba(31, 41, 85, 0.7);
      border: 1px solid rgba(168, 216, 234, 0.3);
      box-shadow: 0 4px 12px rgba(168, 216, 234, 0.15);
    }
  }

  &:hover {
    transform: translateX(5px);

    :deep(.autumn) & {
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
    }

    :deep(.starry) & {
      box-shadow: 0 4px 12px rgba(168, 216, 234, 0.2);
    }
  }

  .item-icon {
    font-size: 2rem;
    margin-right: 1.5rem;
    opacity: 0.7;
  }

  .item-content {
    flex: 1;
  }

  .item-label {
    font-size: 0.9rem;
    opacity: 0.7;
    margin-bottom: 0.5rem;
    letter-spacing: 0.1rem;

    :deep(.autumn) & {
      color: #8b4513;
    }

    :deep(.starry) & {
      color: #a8d8ea;
    }
  }

  .item-value {
    font-size: 1.3rem;
    font-weight: 500;

    :deep(.autumn) & {
      color: #5c4b37;
    }

    :deep(.starry) & {
      color: #e6e6ff;
    }
  }

  .item-decoration {
    position: absolute;
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 60%;
    border-radius: 2px;

    :deep(.autumn) & {
      background: linear-gradient(to bottom, transparent, #d4b78c, transparent);
    }

    :deep(.starry) & {
      background: linear-gradient(to bottom, transparent, #a8d8ea, transparent);
    }
  }
}

.info-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid;

  :deep(.autumn) & {
    border-color: rgba(210, 180, 140, 0.3);
  }

  :deep(.starry) & {
    border-color: rgba(168, 216, 234, 0.3);
  }

  .footer-seal {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    :deep(.autumn) & {
      background: linear-gradient(135deg, #f5e8c8 0%, #e8d5b7 100%);
      border: 2px solid #d4b78c;
      box-shadow: 0 4px 12px rgba(139, 69, 19, 0.2);
    }

    :deep(.starry) & {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #a8d8ea;
      box-shadow: 0 4px 12px rgba(168, 216, 234, 0.2);
    }

    &::before {
      content: '';
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border-radius: 50%;
      z-index: -1;

      :deep(.autumn) & {
        background: linear-gradient(135deg, #8b4513, #d4b78c);
        opacity: 0.3;
      }

      :deep(.starry) & {
        background: linear-gradient(135deg, #a8d8ea, #16213e);
        opacity: 0.3;
      }
    }

    .seal-content {
      font-size: 1.2rem;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;

      :deep(.autumn) & {
        color: #8b4513;
      }

      :deep(.starry) & {
        color: #a8d8ea;
      }
    }
  }

  .footer-text {
    font-size: 0.9rem;
    opacity: 0.6;

    :deep(.autumn) & {
      color: #8b4513;
    }

    :deep(.starry) & {
      color: #a8d8ea;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .world-info-page {
    padding: 1rem;
  }

  .info-item {
    padding: 1rem 1.5rem;
    margin-bottom: 1rem;

    .item-icon {
      font-size: 1.5rem;
      margin-right: 1rem;
    }

    .item-value {
      font-size: 1.1rem;
    }
  }

  .info-footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    flex-direction: column;
    gap: 1rem;

    .footer-seal {
      width: 60px;
      height: 60px;

      .seal-content {
        font-size: 1rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .info-item {
    padding: 0.8rem 1rem;

    .item-icon {
      font-size: 1.3rem;
    }

    .item-value {
      font-size: 1rem;
    }
  }
}
</style>
