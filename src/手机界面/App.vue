<template>
  <div class="phone-module">
    <button v-if="!open" class="phone-launcher" type="button" aria-label="打开手机界面" @click="open = true">
      <span class="launcher-symbol">◉</span>
      <span>手机</span>
    </button>

    <div v-else class="phone-overlay" @click.self="open = false">
      <div class="phone-frame">
        <div class="phone-screen">
          <div class="wallpaper"></div>
          <header class="status-bar" :class="{ 'status-bar-light': activeApp }" aria-label="状态栏">
            <span>{{ time }}</span>
            <span class="dynamic-island" aria-hidden="true"></span>
            <span class="status-icons" aria-hidden="true">●●● ᯤ ▰</span>
          </header>

          <button class="close-phone" type="button" aria-label="收起手机界面" @click="open = false">×</button>

          <main v-if="!activeApp" class="home-screen">
            <div class="home-heading">
              <span>今天</span>
              <strong>{{ dateLabel }}</strong>
            </div>
            <div class="app-grid">
              <button v-for="app in apps" :key="app.name" class="app-tile" type="button" @click="activeApp = app.name">
                <span class="app-icon" :style="{ background: app.color }" aria-hidden="true">{{ app.icon }}</span>
                <span>{{ app.name }}</span>
              </button>
            </div>
            <div class="home-spacer"></div>
            <div class="page-dots" aria-hidden="true"><span></span><span></span></div>
            <div class="dock">
              <button
                v-for="app in dockApps"
                :key="app.name"
                class="dock-tile"
                type="button"
                :aria-label="app.name"
                @click="activeApp = app.name"
              >
                <span class="app-icon" :style="{ background: app.color }" aria-hidden="true">{{ app.icon }}</span>
              </button>
            </div>
          </main>

          <main v-else class="app-screen">
            <button class="back-button" type="button" @click="activeApp = null">‹ 桌面</button>
            <div class="app-placeholder">
              <span class="placeholder-icon" :style="{ background: selectedApp?.color }">{{ selectedApp?.icon }}</span>
              <h1>{{ activeApp }}</h1>
              <p>应用内容待接入</p>
            </div>
          </main>

          <button class="home-indicator" type="button" aria-label="返回桌面" @click="activeApp = null"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const apps = [
  { name: '信息', icon: '●', color: 'linear-gradient(145deg, #73e878, #19ae45)' },
  { name: '照片', icon: '✿', color: 'linear-gradient(145deg, #fff, #e6e8ed)' },
  { name: '相机', icon: '◎', color: 'linear-gradient(145deg, #8e929a, #525761)' },
  { name: '日历', icon: '25', color: 'linear-gradient(145deg, #fff, #eef0f2)' },
  { name: '地图', icon: '⌖', color: 'linear-gradient(145deg, #6ad5b7, #4b8ef4)' },
  { name: '天气', icon: '☀', color: 'linear-gradient(145deg, #68c6ff, #2277e8)' },
  { name: '备忘录', icon: '≡', color: 'linear-gradient(180deg, #ffd95e 22%, #fff 22%)' },
  { name: '设置', icon: '⚙', color: 'linear-gradient(145deg, #a9aeb8, #626976)' },
];
const dockApps = [
  { name: '电话', icon: '☎', color: 'linear-gradient(145deg, #72e978, #21ad4a)' },
  { name: '浏览器', icon: '◉', color: 'linear-gradient(145deg, #9cdeff, #2584ed)' },
  { name: '音乐', icon: '♫', color: 'linear-gradient(145deg, #ff898a, #ee3157)' },
  { name: '文件', icon: '▣', color: 'linear-gradient(145deg, #91c8ff, #3788f5)' },
];
const open = ref(false);
const activeApp = ref<string | null>(null);
const now = ref(new Date());
const time = computed(() =>
  now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
);
const dateLabel = computed(() =>
  now.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }),
);
const selectedApp = computed(() => [...apps, ...dockApps].find(app => app.name === activeApp.value));
let clock: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  clock = setInterval(() => {
    now.value = new Date();
  }, 60_000);
});
onUnmounted(() => {
  if (clock) clearInterval(clock);
});
</script>

<style>
.phone-module,
.phone-module * {
  box-sizing: border-box;
}
.phone-module {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}
.phone-module button {
  font: inherit;
  cursor: pointer;
}
.phone-launcher {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 22px;
  background: #232733;
  color: #fff;
  box-shadow: 0 7px 22px #0005;
  font-size: 13px;
}
.launcher-symbol {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 8px;
  background: linear-gradient(145deg, #81b7ff, #6556c8);
  font-size: 19px;
}
.phone-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  background: rgba(13, 15, 25, 0.57);
}
.phone-frame {
  width: min(390px, calc(100vw - 32px));
  height: min(844px, calc(100dvh - 32px));
  padding: 7px;
  border-radius: 48px;
  background: #111318;
  box-shadow:
    0 25px 75px #0008,
    inset 0 0 0 2px #70737a;
}
.phone-screen {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 41px;
  color: #fff;
  background: #182342;
}
.wallpaper {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 78% 20%, #aeb4eb 0, transparent 35%),
    radial-gradient(ellipse at 15% 66%, #7659ae 0, transparent 40%),
    linear-gradient(160deg, #23486a, #283863 45%, #141b44);
}
.wallpaper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #07132720, transparent 42%, #07132755);
}
.status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 25px;
  font-size: 14px;
  font-weight: 650;
}
.status-bar-light {
  color: #151820;
}
.dynamic-island {
  position: absolute;
  left: 50%;
  top: 10px;
  width: 103px;
  height: 29px;
  transform: translateX(-50%);
  border-radius: 18px;
  background: #08090d;
}
.status-icons {
  font-size: 12px;
  letter-spacing: -2px;
}
.close-phone {
  position: absolute;
  z-index: 5;
  top: 59px;
  right: 17px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #0005;
  color: #fff;
  font-size: 22px !important;
  line-height: 1;
}
.home-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 88px 20px 32px;
}
.home-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 4px 31px;
  text-shadow: 0 2px 10px #0004;
}
.home-heading span {
  font-size: 16px;
  font-weight: 600;
}
.home-heading strong {
  font-size: 28px;
  font-weight: 650;
}
.app-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px 8px;
}
.app-tile,
.dock-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 0;
  background: none;
  color: #fff;
  font-size: 12px !important;
  text-shadow: 0 1px 5px #0006;
}
.app-icon,
.placeholder-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 15px;
  color: #fff;
  box-shadow: 0 3px 12px #0003;
  font-size: 32px;
  font-weight: 500;
  text-shadow: none;
}
.app-tile:nth-child(2) .app-icon {
  color: #ee627a;
}
.app-tile:nth-child(4) .app-icon {
  color: #d4494b;
  font-size: 26px;
  font-weight: 650;
}
.app-tile:nth-child(7) .app-icon {
  color: #454b57;
}
.home-spacer {
  flex: 1;
}
.page-dots {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-bottom: 14px;
}
.page-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff70;
}
.page-dots span:first-child {
  background: #fff;
}
.dock {
  display: flex;
  justify-content: space-around;
  align-items: center;
  min-height: 81px;
  border: 1px solid #ffffff32;
  border-radius: 26px;
  background: #ffffff3b;
  backdrop-filter: blur(20px);
}
.app-screen {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 67px 22px 30px;
  background: #f5f5f8;
  color: #151820;
}
.back-button {
  align-self: flex-start;
  border: 0;
  background: none;
  color: #3478ee;
  font-size: 16px !important;
}
.app-placeholder {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 55px;
}
.placeholder-icon {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  font-size: 42px;
}
.app-placeholder h1 {
  margin: 20px 0 7px;
  font-size: 25px;
}
.app-placeholder p {
  margin: 0;
  color: #8a8f9c;
  font-size: 14px;
}
.home-indicator {
  position: absolute;
  z-index: 4;
  bottom: 9px;
  left: 50%;
  width: 125px;
  height: 5px;
  transform: translateX(-50%);
  border: 0;
  border-radius: 9px;
  background: #fff;
  padding: 0;
}
.app-screen ~ .home-indicator {
  background: #16191f;
}
@media (max-width: 600px) {
  .phone-overlay {
    background: #111318;
  }
  .phone-frame {
    width: 100vw;
    height: 100dvh;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .phone-screen {
    border-radius: 0;
  }
  .status-bar {
    padding-top: env(safe-area-inset-top);
    height: calc(52px + env(safe-area-inset-top));
  }
  .dynamic-island {
    top: calc(10px + env(safe-area-inset-top));
  }
  .home-screen {
    padding-top: calc(88px + env(safe-area-inset-top));
    padding-bottom: max(32px, env(safe-area-inset-bottom));
  }
  .app-screen {
    padding-top: calc(67px + env(safe-area-inset-top));
  }
  .close-phone {
    top: calc(59px + env(safe-area-inset-top));
  }
  .home-indicator {
    bottom: max(9px, env(safe-area-inset-bottom));
  }
}
@media (max-height: 690px) {
  .home-heading {
    margin-bottom: 16px;
  }
  .app-grid {
    gap: 12px 8px;
  }
  .home-screen {
    padding-top: 66px;
  }
}
</style>
