<template>
  <div class="tab-navigation">
    <div class="tab-content">
      <router-view />
    </div>
    <div class="tab-bar">
      <router-link to="/game" class="tab-item" :class="{ active: $route.path === '/game' }">
        <div class="tab-icon">♠️</div>
        <div class="tab-label">{{ t('navigation.game') }}</div>
      </router-link>
      <router-link to="/profile" class="tab-item" :class="{ active: $route.path === '/profile' }">
        <div class="tab-icon">🏆</div>
        <div class="tab-label">{{ t('navigation.records') }}</div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
</script>

<style scoped>
.tab-navigation {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* 动态视窗高度，支持移动端键盘 */
  background-color: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 90px !important; /* Space for tab bar + safety margin */
  /* Fix iOS scroll bounce */
  -webkit-overflow-scrolling: touch;
  /* Improve scroll behavior */
  overscroll-behavior-y: contain;
  /* Prevent scroll momentum interference */
  position: relative;
  height: calc(100vh - 70px);
  height: calc(100dvh - 70px); /* 动态视窗高度 */
  /* Force layout recalculation */
  transform: translateZ(0);
  /* 键盘处理 */
  will-change: height;
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: white;
  display: flex;
  border-top: 1px solid #e9ecef;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #8e8e93;
  transition: color 0.2s ease;
  padding: 8px 4px;
}

.tab-item.active {
  color: #007bff;
}

.tab-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 11px;
  font-weight: 500;
}

.tab-item:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}

/* 防止tab导航被缩放 */
.tab-bar {
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

/* 确保tab-content不干扰滚动 */
.tab-content {
  position: relative;
  z-index: 1;
}

/* 键盘打开时的样式调整 */
@media screen and (max-width: 767px) {
  .keyboard-open .tab-navigation {
    height: 100vh !important;
    overflow: hidden;
  }
  
  .keyboard-open .tab-content {
    height: calc(100vh - 70px) !important;
    overflow-y: auto;
  }
  
  .keyboard-open .tab-bar {
    position: fixed !important;
    bottom: 0 !important;
    z-index: 1001 !important;
  }
}

/* 支持动态视窗单位的现代浏览器 */
@supports (height: 100dvh) {
  .tab-navigation {
    height: 100dvh;
  }
  
  .tab-content {
    height: calc(100dvh - 70px);
  }
}

/* 键盘相关的特殊处理 */
.tab-content.keyboard-adjusted {
  /* 当键盘打开时应用的特殊样式 */
  max-height: calc(100vh - 70px - env(keyboard-inset-height, 0px));
}
</style>
