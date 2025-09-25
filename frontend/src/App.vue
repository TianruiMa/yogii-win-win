<template>
  <div id="app">
    <router-view />
    
    <!-- Global Settlement Dialog -->
    <Teleport to="body">
      <div v-if="gameStore.showSettlementDialog" class="settlement-overlay" @click="gameStore.clearSettlementData()">
        <div class="settlement-sheet" @click.stop>
          <div class="settlement-header">
            <h3>{{ t('settlement.title') }}</h3>
            <button @click="toggleSettlementCurrency" class="currency-toggle-btn">
              {{ settlementDisplayCurrency === 'CAD' ? 'CAD($)' : 'RMB(¥)' }}
            </button>
          </div>
          
          <div class="settlement-content">
            <div class="settlement-table">
              <div class="settlement-row header">
                <div class="col-name">{{ t('game.player') }}</div>
                <div class="col-balance">{{ t('game.balance') }}</div>
                <div class="col-profit">{{ t('game.profit') }}</div>
              </div>
              
              <div 
                v-for="(player, index) in gameStore.settlementData" 
                :key="player.id"
                class="settlement-row"
                :class="{ 'highlight': index === 0 && player.profit !== null && player.profit > 0 }"
              >
                <div class="col-name">{{ player.nickname }}</div>
                <div class="col-balance" :class="getBalanceClass(player.balance)">
                  {{ player.balance === null ? '--' : player.balance }}
                </div>
                <div class="col-profit" :class="getProfitClass(player.profit)">
                  {{ formatProfitDisplay(player.profit) }}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from './stores/game'
import { useUserStore } from './stores/user'
import { useRoomStore } from './stores/room'
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { convertAndFormatCurrency, CURRENCY_SYMBOLS } from './utils/currency'
import { useI18n } from './composables/useI18n'

const gameStore = useGameStore()
const userStore = useUserStore()
const roomStore = useRoomStore()
const { t } = useI18n()

// 结算弹窗的货币显示状态（独立于用户偏好）
const settlementDisplayCurrency = ref<'CAD' | 'RMB'>('CAD')

// 监控结算弹窗状态变化
watch(
  () => gameStore.showSettlementDialog,
  (newValue, oldValue) => {
    console.log('🎯 App.vue - 结算弹窗状态变化:', oldValue, '->', newValue)
    console.log('🎯 App.vue - 当前结算数据:', gameStore.settlementData)
    console.log('🎯 App.vue - 当前房间信息:', gameStore.settlementRoomInfo)
    
    // 当弹窗打开时，设置为用户的偏好货币
    if (newValue) {
      settlementDisplayCurrency.value = userStore.preferredCurrency
    }
  },
  { immediate: true }
)

// Helper functions for styling
const getBalanceClass = (balance: number | null) => {
  if (balance === null) return 'neutral'
  if (balance > 0) return 'positive'
  if (balance < 0) return 'negative'
  return 'neutral'
}

const getProfitClass = (profit: number | null) => {
  if (profit === null) return 'neutral'
  if (profit > 0) return 'positive'
  if (profit < 0) return 'negative'
  return 'neutral'
}

// 切换结算弹窗的货币显示
function toggleSettlementCurrency() {
  settlementDisplayCurrency.value = settlementDisplayCurrency.value === 'CAD' ? 'RMB' : 'CAD'
}

// 格式化利润显示
function formatProfitDisplay(profit: number | null): string {
  if (profit === null) return '--'
  
  // 使用结算弹窗的独立货币状态，而不是用户偏好
  const roomCurrency = gameStore.settlementRoomInfo?.currency || 'CAD'
  const displayCurrency = settlementDisplayCurrency.value
  
  return convertAndFormatCurrency(profit, roomCurrency, displayCurrency, true)
}


// 键盘处理相关变量
let originalViewportHeight = window.innerHeight
let isKeyboardOpen = false

// 检测键盘是否打开
function detectKeyboard() {
  const currentHeight = window.innerHeight
  const heightDifference = originalViewportHeight - currentHeight
  const threshold = 150 // 键盘打开的阈值（像素）
  
  const wasKeyboardOpen = isKeyboardOpen
  isKeyboardOpen = heightDifference > threshold
  
  if (isKeyboardOpen !== wasKeyboardOpen) {
    handleKeyboardChange(isKeyboardOpen)
  }
}

// 处理键盘状态变化
function handleKeyboardChange(keyboardOpen: boolean) {
  const html = document.documentElement
  const body = document.body
  
  if (keyboardOpen) {
    // 键盘打开时
    html.classList.add('keyboard-open')
    body.classList.add('keyboard-open')
    // 阻止页面滚动到输入框
    body.style.position = 'fixed'
    body.style.width = '100%'
    body.style.height = '100%'
    body.style.overflow = 'hidden'
  } else {
    // 键盘关闭时，恢复页面状态
    html.classList.remove('keyboard-open')
    body.classList.remove('keyboard-open')
    body.style.position = ''
    body.style.width = ''
    body.style.height = ''
    body.style.overflow = ''
    
    // 强制重新计算布局和滚动位置
    setTimeout(() => {
      window.scrollTo(0, 0)
      // 触发重新渲染
      const app = document.getElementById('app')
      if (app) {
        app.style.height = '100vh'
        app.style.height = '100dvh'
      }
    }, 100)
  }
}

// 输入框焦点事件处理
function handleInputFocus(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    // 检查是否在弹窗内，如果是则跳过全局键盘处理
    const isInDialog = target.closest('.dialog-overlay') !== null
    if (isInDialog) {
      return // 弹窗内的输入框不使用全局键盘处理
    }
    
    // 短暂延迟后检测键盘
    setTimeout(() => {
      detectKeyboard()
    }, 300)
  }
}

// 输入框失焦事件处理
function handleInputBlur(event: FocusEvent) {
  const target = event.target as HTMLElement
  if (target) {
    // 检查是否在弹窗内，如果是则跳过全局键盘处理
    const isInDialog = target.closest('.dialog-overlay') !== null
    if (isInDialog) {
      return // 弹窗内的输入框不使用全局键盘处理
    }
  }
  
  // 延迟检测，因为键盘关闭需要时间
  setTimeout(() => {
    detectKeyboard()
  }, 500)
}

// 防止缩放的JavaScript函数
function preventZoom() {
  // 防止双击缩放，但允许编辑元素的正常点击
  let lastTouchEnd = 0
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime()
    const target = event.target as HTMLElement
    
    // 如果点击的是可编辑元素，不阻止事件
    if (target && (
      target.classList.contains('name-display') ||
      target.classList.contains('chips-input') ||
      target.classList.contains('chips-amount-input') ||
      target.closest('.name-display') ||
      target.closest('.chips-input') ||
      target.closest('.chips-amount-input')
    )) {
      lastTouchEnd = now
      return
    }
    
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  }, false)

  // 防止手势缩放
  document.addEventListener('gesturestart', function (e) {
    e.preventDefault()
  }, false)

  document.addEventListener('gesturechange', function (e) {
    e.preventDefault()
  }, false)

  document.addEventListener('gestureend', function (e) {
    e.preventDefault()
  }, false)

  // 防止键盘缩放快捷键
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.keyCode === 61 || e.keyCode === 107 || e.keyCode === 173 || e.keyCode === 109 || e.keyCode === 187 || e.keyCode === 189)) {
      e.preventDefault()
    }
  }, false)

  // 防止鼠标滚轮缩放
  document.addEventListener('wheel', function (e) {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }, { passive: false })
}

onMounted(async () => {
  // 初始化用户和房间状态
  await userStore.restoreUserState()
  roomStore.initializeRoom()
  
  // 设置gameStore的当前用户ID
  gameStore.setCurrentUserId(userStore.userId)
  
  // 注意：游戏相关功能会在用户进入房间时初始化
  // 不在这里直接初始化，避免没有roomId的调用
  
  // 防止缩放
  preventZoom()
  
  // 键盘相关事件监听
  originalViewportHeight = window.innerHeight
  
  // 监听窗口大小变化（键盘弹出/收起）
  window.addEventListener('resize', detectKeyboard)
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      originalViewportHeight = window.innerHeight
      detectKeyboard()
    }, 500)
  })
  
  // 监听输入框焦点事件
  document.addEventListener('focusin', handleInputFocus)
  document.addEventListener('focusout', handleInputBlur)
  
  // Visual Viewport API 支持（更准确的键盘检测）
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight
      const heightDifference = originalViewportHeight - currentHeight
      const wasKeyboardOpen = isKeyboardOpen
      isKeyboardOpen = heightDifference > 150
      
      if (isKeyboardOpen !== wasKeyboardOpen) {
        handleKeyboardChange(isKeyboardOpen)
      }
    })
  }
})

onUnmounted(() => {
  gameStore.disconnectSocket()
  
  // 清理键盘相关事件监听器
  window.removeEventListener('resize', detectKeyboard)
  document.removeEventListener('focusin', handleInputFocus)
  document.removeEventListener('focusout', handleInputBlur)
  
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', detectKeyboard)
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f5f5f5;
  color: #333;
  /* Prevent zoom and touch gestures on mobile */
  touch-action: manipulation;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  text-size-adjust: 100%;
  /* Additional iOS zoom prevention */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* Smooth scrolling on iOS */
  -webkit-overflow-scrolling: touch;
}

html {
  /* Prevent zoom on orientation change */
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  text-size-adjust: 100%;
  /* Allow normal scrolling but prevent double-tap zoom */
  touch-action: pan-y pinch-zoom;
}

#app {
  width: 100%;
  min-height: 100vh;
  /* Use dynamic viewport height for mobile keyboard support */
  min-height: 100dvh;
  /* Allow normal scrolling, prevent zoom */
  touch-action: pan-y pinch-zoom;
  /* Additional iOS prevention */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  /* Allow gentle overscroll for natural feel */
  overscroll-behavior-x: none;
  overscroll-behavior-y: auto;
  /* Fix keyboard issues */
  position: relative;
  overflow-x: hidden;
}

/* Global prevention of zoom on all inputs and buttons */
input,
button,
select,
textarea {
  font-size: 16px !important;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Remove spinner buttons and focus styles from number inputs */
input[type="number"] {
  -webkit-appearance: none;
  -moz-appearance: textfield;
  text-align: center;
}

input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"]:focus {
  outline: none;
  box-shadow: none;
}

/* Specifically prevent double-tap zoom on all clickable elements */
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

/* Ensure all interactive elements have minimum 16px font size on mobile */
@media screen and (max-width: 767px) {
  input[type="text"],
  input[type="number"],
  input[type="email"],
  input[type="password"],
  textarea {
    font-size: 16px !important;
  }
}

/* Mobile keyboard handling */
@supports (height: 100dvh) {
  #app {
    min-height: 100dvh;
  }
}

/* Enhanced keyboard viewport handling */
@media screen and (max-width: 767px) {
  html {
    /* Prevent viewport changes when keyboard opens */
    height: 100%;
    overflow: hidden;
  }
  
  body {
    height: 100%;
    overflow: hidden;
    position: fixed;
    width: 100%;
  }
  
  #app {
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    position: relative;
  }
}

/* Keyboard-specific input handling */
.keyboard-open {
  /* Applied when virtual keyboard is open */
  position: fixed !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

.keyboard-open #app {
  height: 100% !important;
  overflow: hidden !important;
}

/* Settlement Dialog */
.settlement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
  padding: 20px;
}

.settlement-sheet {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  margin: 0;
  animation: scaleIn 0.3s ease-out;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.settlement-header {
  padding: 20px 20px 10px 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settlement-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  flex: 1;
}

.currency-toggle-btn {
  background: #ff8c00;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
  text-align: center;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.currency-toggle-btn:active {
  transform: scale(0.95);
  background: #e67e00;
}

.settlement-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 20px 0;
}

.settlement-table {
  width: 100%;
}

.settlement-row {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f1f3f4;
  border-left: 4px solid transparent; /* 为所有行添加透明border，保持对齐一致 */
}

.settlement-row.header {
  background: #f8f9fa;
  font-weight: 600;
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 20px;
}

.settlement-row.highlight {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border-left: 4px solid #ffc107; /* 高亮行使用黄色border */
}

.col-name {
  flex: 2;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.col-balance,
.col-profit {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.col-balance.positive,
.col-profit.positive {
  color: #28a745;
}

.col-balance.negative,
.col-profit.negative {
  color: #dc3545;
}

.col-balance.neutral,
.col-profit.neutral {
  color: #6c757d;
}


@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.7);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>