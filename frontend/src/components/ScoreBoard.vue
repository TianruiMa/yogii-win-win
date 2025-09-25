<template>
  <div class="scoreboard-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <!-- Left Side Content -->
        <div class="left-content">
          <span class="chips-label">{{ t('game.chipsPerHand') }}</span>
          <span class="chips-display">{{ roomStore.currentRoom?.chipsPerHand || 0 }}</span>
        </div>
        
        <!-- Right Side Content -->
        <div class="right-content">
          <span class="chips-label">{{ t('game.costPerHand') }} ({{ displayCurrencySymbol }})</span>
          <span class="cost-display">{{ displayCurrencySymbol }}{{ displayCostPerHand }}</span>
        </div>
      </div>
    </div>

    <!-- Table Container -->
    <div class="table-container">
      <!-- Table Header -->
      <div class="table-header">
        <div class="header-name">{{ t('game.player') }} ({{ gameStore.gameData.players.length }})</div>
        <div class="header-hands">{{ t('game.hands') }}</div>
        <div class="header-chips">RM-{{ t('game.chips') }}</div>
        <div class="header-balance">{{ t('game.balance') }}</div>
      </div>

      <!-- Players List -->
      <div class="players-container">
        <div 
          v-for="(player, index) in gameStore.playersWithCalculatedBalance" 
          :key="player.id"
          class="player-item"
        >
        <!-- Player Name -->
        <div class="player-name">
          <div class="name-content">
            <span 
              class="name-display"
              :class="getNameColor(player)"
            >
              {{ player.nickname }}
            </span>
          </div>
        </div>

        <!-- Hands -->
        <div class="hands-section" :class="{ 'readonly': !gameStore.isCurrentUserAdmin }">
          <!-- Left: Down arrow (decrease) -->
          <button 
            v-if="gameStore.isCurrentUserAdmin"
            @touchstart.prevent="startLongPress(player.id)"
            @touchend.prevent="stopLongPress"
            @touchcancel.prevent="stopLongPress"
            @mousedown="startLongPress(player.id)"
            @mouseup="stopLongPress"
            @mouseleave="stopLongPress"
            class="adjust-btn down-arrow"
          >
            <img src="/icons/arrow-down-red.svg" alt="down" class="arrow-icon" />
          </button>
          
          <!-- Center: Count display -->
          <span class="hands-count">{{ player.hands }}</span>
          
          <!-- Right side: Up arrows -->
          <div v-if="gameStore.isCurrentUserAdmin" class="up-arrows-group">
            <button 
              @click="adjustHands(player.id, 1)"
              class="adjust-btn up-arrow"
            >
              <img src="/icons/arrow-up-orange.svg" alt="up" class="arrow-icon" />
            </button>
            <button 
              @click="openAddHandsDialog(player.id)"
              class="adjust-btn double-up-arrow"
            >
              <img src="/icons/arrow-double-up-green.svg" alt="double up" class="arrow-icon" />
            </button>
          </div>
        </div>

        <!-- RM-Chips -->
        <div class="chips-section">
          <input
            :value="player.chips === null || player.chips === undefined ? '' : String(player.chips)"
            @input="updatePlayerChips(player.id, $event)"
            @focus="clearChipsOnFocus($event)"
            type="number"
            inputmode="numeric"
            :placeholder="canEditChips(player.id) ? t('game.enterChips') : ''"
            class="chips-input"
            :class="{ 'readonly': !canEditChips(player.id) }"
            :disabled="!canEditChips(player.id)"
            :readonly="!canEditChips(player.id)"
          />
        </div>

        <!-- Balance -->
        <div class="balance-section">
          <span class="balance-value" :class="{ 
            'positive': player.balance !== null && player.balance > 0, 
            'negative': player.balance !== null && player.balance < 0,
            'neutral': player.balance === null || player.balance === 0
          }">
            {{ player.balance === null ? '--' : player.balance }}
          </span>
        </div>

        </div>
      </div>
    </div>

    <!-- Bottom Stats -->
    <div class="bottom-stats">
      <div class="stats-row">
        <div class="stat-column">
          <span class="stat-label">Expected</span>
          <span class="stat-expected">{{ gameStore.calculatedStats.totalUp }}</span>
        </div>
        <div class="stat-column">
          <span class="stat-label">Actual</span>
          <span class="stat-actual">{{ gameStore.calculatedStats.totalDown }}</span>
        </div>
        <div class="stat-column">
          <span class="stat-label">Result</span>
          <span 
            class="stat-result"
            :class="{ 
              'positive': gameStore.calculatedStats.finalResult === 0,
              'negative': gameStore.calculatedStats.finalResult !== 0 
            }"
          >
            {{ gameStore.calculatedStats.finalResult === 0 ? 'Balanced' : gameStore.calculatedStats.finalResult }}
          </span>
        </div>
      </div>
    </div>


    <!-- Room Action Card (only show when in a room) -->
    <div v-if="roomStore.isInRoom" class="room-action-card">
      <div class="room-invite-section">
        <button class="copy-btn" :class="{ 'copied': showCopyToast }" @click="copyRoomCode">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <rect x="5" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <div class="invite-code">{{ roomStore.currentRoom?.roomId }}</div>
      </div>
      <button 
        v-if="gameStore.isCurrentUserAdmin"
        class="settle-room-btn" 
        :class="{ 'disabled': !allPlayersHaveChips }"
        :disabled="!allPlayersHaveChips"
        @click="settleRoom"
      >
        {{ t('game.settleRoom') }}
      </button>
    </div>



    <!-- Add Hands Dialog -->
    <Teleport to="body">
      <div v-if="showAddHandsDialog" class="dialog-overlay" @click="showAddHandsDialog = false">
      <div class="dialog-content" @click.stop>
        <h3>Add Hands</h3>
        
        <!-- Quick Action Buttons -->
        <div class="quick-buttons">
          <button @click="addHandsQuick(3)" class="quick-btn">+3</button>
          <button @click="addHandsQuick(5)" class="quick-btn">+5</button>
          <button @click="addHandsQuick(10)" class="quick-btn">+10</button>
        </div>
        
        <!-- Custom Input -->
        <div class="custom-input-section">
          <input
            v-model="customHandsAmount"
            @keyup.enter="addHandsCustom"
            placeholder="Enter custom amount"
            type="number"
            inputmode="numeric"
            class="dialog-input"
          />
        </div>
        
         <div class="dialog-actions">
           <button @click="addHandsCustom" class="dialog-btn confirm">{{ t('common.confirm') }}</button>
         </div>
      </div>
      </div>
    </Teleport>

    <!-- iOS Style Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="showConfirmDialog" class="confirm-overlay" @click="showConfirmDialog = false">
      <div class="confirm-sheet" @click.stop>
        <div class="confirm-content">
          <div class="confirm-header">
            <h3 class="confirm-title">{{ confirmDialogData.title }}</h3>
            <p class="confirm-message">{{ confirmDialogData.message }}</p>
          </div>
          
          <div class="confirm-actions">
            <button 
              @click="confirmDialogData.action(); showConfirmDialog = false" 
              class="confirm-btn"
              :class="confirmDialogData.type"
            >
              {{ t('common.confirm') }}
            </button>
            <button 
              @click="showConfirmDialog = false" 
              class="cancel-btn"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useRoomStore } from '@/stores/room'
import { useUserStore } from '@/stores/user'
import { convertAndFormatCurrency, CURRENCY_SYMBOLS } from '@/utils/currency'
import { useI18n } from '@/composables/useI18n'

const gameStore = useGameStore()
const roomStore = useRoomStore()
const userStore = useUserStore()
const { t } = useI18n()

// Computed properties
const getNameColor = computed(() => {
  return (player: any) => {
    const isCurrentUser = player.userId === userStore.userId
    const isAdmin = player.isAdmin
    
    // 如果是管理员（无论是否是自己），显示红色
    if (isAdmin) {
      return 'name-admin'
    }
    // 如果是自己但不是管理员，显示蓝色
    else if (isCurrentUser) {
      return 'name-self'
    }
    // 其他玩家显示默认颜色
    else {
      return 'name-default'
    }
  }
})

// 检查是否所有玩家都输入了chips
const allPlayersHaveChips = computed(() => {
  const players = gameStore.gameData?.players || []
  if (players.length === 0) return false
  return players.every(player => player.chips !== null && player.chips !== undefined)
})

// 根据用户偏好显示货币
const displayCurrencySymbol = computed(() => {
  const userCurrency = userStore.preferredCurrency
  return CURRENCY_SYMBOLS[userCurrency]
})

const displayCostPerHand = computed(() => {
  if (!roomStore.currentRoom) return '0'
  
  const roomCurrency = roomStore.currentRoom.currency || 'CAD'
  const userCurrency = userStore.preferredCurrency
  
  return convertAndFormatCurrency(
    roomStore.currentRoom.costPerHand,
    roomCurrency,
    userCurrency,
    false // 不显示符号，我们单独显示
  )
})

// Helper functions for styling
const getBalanceClass = (balance: number) => {
  if (balance > 0) return 'positive'
  if (balance < 0) return 'negative'
  return 'neutral'
}

const getProfitClass = (profit: number) => {
  if (profit > 0) return 'positive'
  if (profit < 0) return 'negative'
  return 'neutral'
}

// 结算房间功能（只有管理员可以使用）
function settleRoom() {
  showConfirmation(
    t('game.settleRoom'),
    t('messages.settleRoomConfirm'),
    executeSettleRoom,
    'danger'
  )
}

// 实际执行结算的函数
async function executeSettleRoom() {
  try {
    // 直接结算房间，结算数据将通过Socket事件发送给所有玩家
    if (roomStore.currentRoom) {
      await roomStore.settleRoom(roomStore.currentRoom.roomId)
    }
  } catch (error) {
    console.error('Failed to settle room:', error)
    // 可以在这里显示错误提示
  }
}


// Reactive data
const showCopyToast = ref(false)
const showAddHandsDialog = ref(false)
const currentPlayerId = ref<number | null>(null)
const customHandsAmount = ref('')

// iOS style confirmation dialog
const showConfirmDialog = ref(false)
const confirmDialogData = ref({
  title: '',
  message: '',
  action: () => {},
  type: 'danger' as 'danger' | 'warning'
})


// Long press state
const longPressTimer = ref<number | null>(null)
const longPressInterval = ref<number | null>(null)
const longPressSpeed = ref(500) // Starting interval in ms
const isLongPressing = ref(false)
const isButtonPressed = ref(false)
const currentPressPlayerId = ref<number | null>(null)

// Refs

// Methods

function canEditChips(playerId: number): boolean {
  // 管理员可以编辑所有人的chips，普通玩家只能编辑自己的
  return gameStore.isCurrentUserAdmin || playerId === gameStore.currentUserPlayerId
}



async function adjustHands(playerId: number, delta: number) {
  const player = gameStore.getPlayerById(playerId)
  if (!player || !roomStore.currentRoom?.roomId) return
  
  const newHands = Math.max(0, player.hands + delta)
  await gameStore.updatePlayer(roomStore.currentRoom.roomId, playerId, { hands: newHands })
}

function clearChipsOnFocus(event: Event) {
  const target = event.target as HTMLInputElement
  target.select() // 选中所有内容，这样用户输入时会自动替换
}


async function updatePlayerChips(playerId: number, event: Event) {
  if (!canEditChips(playerId)) return
  
  const target = event.target as HTMLInputElement
  let chips: number | null
  
  if (target.value === '') {
    // 空字符串表示未输入
    chips = null
  } else {
    // 有值的情况，包括0
    const parsedValue = parseInt(target.value)
    chips = isNaN(parsedValue) ? null : parsedValue
  }
  
  // 只更新 chips，balance 会通过计算自动更新
  await gameStore.updatePlayer(roomStore.currentRoom?.roomId || '', playerId, { chips })
}

function showConfirmation(title: string, message: string, action: () => void, type: 'danger' | 'warning' = 'danger') {
  confirmDialogData.value = {
    title,
    message,
    action,
    type
  }
  showConfirmDialog.value = true
}

// Add Hands Dialog Methods
function openAddHandsDialog(playerId: number) {
  currentPlayerId.value = playerId
  customHandsAmount.value = ''
  showAddHandsDialog.value = true
}

async function addHandsQuick(amount: number) {
  if (currentPlayerId.value !== null) {
    await adjustHands(currentPlayerId.value, amount)
    showAddHandsDialog.value = false
  }
}

async function addHandsCustom() {
  if (currentPlayerId.value !== null && customHandsAmount.value) {
    const amount = parseInt(customHandsAmount.value)
    if (amount > 0) {
      await adjustHands(currentPlayerId.value, amount)
      showAddHandsDialog.value = false
    }
  }
}

// Long press functionality
function startLongPress(playerId: number, event?: Event) {
  // Prevent multiple triggers for the same button press
  if (isButtonPressed.value) {
    return
  }
  
  // Stop event propagation to prevent double triggering
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  
  // Set button as pressed
  isButtonPressed.value = true
  currentPressPlayerId.value = playerId
  isLongPressing.value = false
  longPressSpeed.value = 500
  
  // First immediate decrease for single click
  adjustHands(playerId, -1)
  
  // Start long press after 700ms delay
  longPressTimer.value = setTimeout(() => {
    if (isButtonPressed.value && currentPressPlayerId.value === playerId) {
      isLongPressing.value = true
      startContinuousDecrease(playerId)
    }
  }, 700)
}

function startContinuousDecrease(playerId: number) {
  const decreaseFunction = () => {
    // Only continue if we're still in long press mode
    if (!isLongPressing.value) {
      return
    }
    
    const player = gameStore.getPlayerById(playerId)
    if (player && player.hands > 0) {
      adjustHands(playerId, -1)
      
      // Increase speed (decrease interval) - get faster over time
      longPressSpeed.value = Math.max(50, longPressSpeed.value * 0.85)
      
      // Set next decrease with new speed
      longPressInterval.value = setTimeout(decreaseFunction, longPressSpeed.value)
    } else {
      stopLongPress()
    }
  }
  
  // Start the continuous decrease
  longPressInterval.value = setTimeout(decreaseFunction, longPressSpeed.value)
}

function stopLongPress() {
  // Clear timers
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  
  if (longPressInterval.value) {
    clearTimeout(longPressInterval.value)
    longPressInterval.value = null
  }
  
  // Reset all state
  isLongPressing.value = false
  isButtonPressed.value = false
  currentPressPlayerId.value = null
  longPressSpeed.value = 500
}

// Room operations

// Copy room code to clipboard
async function copyRoomCode() {
  try {
    const roomId = roomStore.currentRoom?.roomId
    if (roomId) {
      await navigator.clipboard.writeText(roomId)
      
      // Show button animation
      showCopyToast.value = true
      
      // Reset button after 2 seconds (matches animation duration)
      setTimeout(() => {
        showCopyToast.value = false
      }, 2000)
    }
  } catch (error) {
    console.error('Failed to copy room code:', error)
    
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = roomStore.currentRoom?.roomId || ''
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      // Show button animation
      showCopyToast.value = true
      setTimeout(() => {
        showCopyToast.value = false
      }, 2000)
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError)
    }
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  stopLongPress()
})
</script>

<style scoped>
/* Mobile-First Design - All styles optimized for mobile */

/* Container */
.scoreboard-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
  padding-bottom: 20px;
  /* Prevent zoom and touch gestures */
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Header */
.header {
  background: #f8f9fa;
  padding: 6px 15px;
}

.header-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 10px 16px;
  position: relative;
  display: flex;
  align-items: stretch;
}

/* 中间分割线 */
.header-content::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 15px;
  bottom: 15px;
  width: 1px;
  background: #e9ecef;
  transform: translateX(-50%);
}

.left-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-right: 15px;
}

.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-left: 15px;
}

.chips-label {
  font-size: 13px;
  color: #8e8e93;
  font-weight: 500;
  margin-bottom: 8px;
  text-align: center;
}

.chips-amount-input {
  font-size: 18px !important;
  font-weight: 600;
  text-align: center;
  border: none;
  background: transparent;
  color: #1d1d1f;
  width: 100%;
  outline: none;
}

.chips-amount-input:disabled {
  opacity: 0.6;
}

.chips-display,
.cost-display {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  text-align: center;
}

/* Table Container */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin: 6px 15px;
  overflow: hidden;
}

/* Table Header */
.table-header {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  font-size: 12px;
  color: #8e8e93;
  gap: 8px;
}

.header-name {
  width: 90px;
  min-width: 70px;
  padding-left: 10px;
}

.header-hands {
  width: 120px;
  text-align: center;
}

.header-chips,
.header-balance {
  flex: 1;
  min-width: 60px;
  text-align: center;
}

/* Players */
.players-container {
  background: white;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}

.player-item:last-child {
  border-bottom: none;
}

.player-name {
  width: 90px;
  min-width: 70px;
  position: relative;
}

.name-content {
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.name-display {
  font-weight: 500;
  cursor: default;
  margin-left: 8px;
  font-size: 14px;
  user-select: none;
  -webkit-user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: calc(100% - 16px);
  display: block;
}

/* 名字颜色样式 */
.name-default {
  color: #333; /* 默认颜色 */
}

.name-self {
  color: #007bff; /* 自己的名字 - 蓝色 */
  font-weight: 600;
}

.name-admin {
  color: #ff1744; /* 管理员名字 - 红色 */
  font-weight: 600;
}



/* Hands Section */
.hands-section {
  display: flex;
  align-items: center;
  width: 120px;
  gap: 8px;
  justify-content: space-between;
}

/* 当普通玩家只能看到数字时，数字居中对齐 */
.hands-section.readonly {
  justify-content: center;
}

.up-arrows-group {
  display: flex;
  gap: 4px;
}

.adjust-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  padding: 0;
}

.arrow-icon {
  width: 14px;
  height: 14px;
  pointer-events: none;
}

.adjust-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Arrow button colors are now defined directly in SVG files */

.hands-count {
  font-size: 16px;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
}

/* Chips Section */
.chips-section,
.balance-section {
  flex: 1;
  min-width: 60px;
}

.chips-input {
  width: 70px;
  padding: 2px 1px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 14px !important;
  font-weight: 500;
  color: #333;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}

.chips-input:focus {
  outline: none;
  background: transparent;
  border: none;
  box-shadow: none;
}

.chips-input::-webkit-outer-spin-button,
.chips-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.chips-input:disabled,
.chips-input.readonly {
  background-color: transparent;
  color: #333;
  opacity: 1;
  cursor: default;
  pointer-events: none;
}

.chips-input::placeholder {
  color: #e0e0e0;
  font-weight: 300;
}

/* Balance Section */
.balance-section {
  text-align: center;
}

.balance-value {
  font-size: 14px;
  font-weight: bold;
}

.balance-value.positive {
  color: #7a9b7f;
}

.balance-value.negative {
  color: #b8747e;
}

.balance-value.neutral {
  color: #6c757d;
}

/* Bottom Stats */
.bottom-stats {
  background: #f8f9fa;
  padding: 6px 15px;
}

.stats-row {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 10px 16px;
  position: relative;
  display: flex;
  align-items: stretch;
}

/* 分割线 */
.stats-row::before {
  content: '';
  position: absolute;
  left: 33.33%;
  top: 15px;
  bottom: 15px;
  width: 1px;
  background: #e9ecef;
}

.stats-row::after {
  content: '';
  position: absolute;
  left: 66.66%;
  top: 15px;
  bottom: 15px;
  width: 1px;
  background: #e9ecef;
}


.stat-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
}

.stat-label {
  font-size: 13px;
  color: #8e8e93;
  font-weight: 500;
  margin-bottom: 8px;
  text-align: center;
}

.stat-expected,
.stat-actual,
.stat-result {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

.stat-expected {
  color: #7a9b7f;
}

.stat-actual {
  color: #7a8b9b;
}

.stat-result.positive {
  color: #7a9b7f;
}

.stat-result.negative {
  color: #b8747e;
}


/* Dialogs */
.dialog-overlay {
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
}

.dialog-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 300px;
}

.dialog-content h3 {
  margin-bottom: 16px;
  text-align: center;
}

.dialog-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  outline: none;
  background: white;
  transition: border-color 0.2s;
}

.dialog-input:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: none;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  touch-action: manipulation;
  transition: background-color 0.2s;
  min-width: 120px;
}


.dialog-btn.confirm {
  background: #007bff;
  color: white;
}

.dialog-btn.confirm:hover {
  background: #0056b3;
}

.dialog-btn.confirm:active {
  background: #004085;
}

/* Add Hands Dialog Specific Styles */
.quick-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.quick-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: #27ae60;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 0.2s;
}

.quick-btn:hover {
  background: #219a52;
}

.quick-btn:active {
  background: #1e8449;
}

.custom-input-section {
  margin-bottom: 16px;
}

/* iOS Style Confirmation Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

.confirm-sheet {
  background: white;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 500px;
  margin: 0;
  transform: translateY(0);
  animation: slideUp 0.3s ease-out;
}

.confirm-content {
  padding: 0;
}

.confirm-header {
  padding: 24px 20px 16px;
  text-align: center;
  border-bottom: 1px solid #e9ecef;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 8px 0;
}

.confirm-message {
  font-size: 14px;
  color: #8e8e93;
  margin: 0;
  line-height: 1.4;
}

.confirm-actions {
  padding: 0;
}

.confirm-btn,
.cancel-btn {
  width: 100%;
  padding: 18px;
  border: none;
  background: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 1px solid #e9ecef;
  touch-action: manipulation;
  transition: background-color 0.2s;
}

.confirm-btn:last-child,
.cancel-btn:last-child {
  border-bottom: none;
  border-radius: 0 0 16px 16px;
}

.confirm-btn.danger {
  color: #ff3b30;
}

.confirm-btn.warning {
  color: #ff9500;
}

.cancel-btn {
  color: #007aff;
  font-weight: 400;
}

.confirm-btn:active,
.cancel-btn:active {
  background: #f0f0f0;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Add exit animations */
.confirm-overlay.exit {
  animation: fadeOut 0.3s ease-out;
}

.confirm-sheet.exit {
  animation: slideDown 0.3s ease-out;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

/* Room Action Card */
.room-action-card {
  background: white;
  border-radius: 12px;
  margin: 6px 15px 15px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.room-invite-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.copy-btn {
  background: white;
  color: #5dade2;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.copy-btn:active {
  background: #f8f9fa;
  transform: scale(0.95);
}

.copy-btn.copied {
  background: #27ae60;
  color: white;
  border-color: #27ae60;
  animation: copySuccess 2s ease-out;
}

@keyframes copySuccess {
  0% {
    background: #27ae60;
    color: white;
    border-color: #27ae60;
  }
  70% {
    background: #27ae60;
    color: white;
    border-color: #27ae60;
  }
  100% {
    background: white;
    color: #5dade2;
    border-color: #e0e6ed;
  }
}

.invite-code {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  letter-spacing: 2px;
  flex: 1;
}

.settle-room-btn {
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.settle-room-btn:active {
  background: #f57c00;
}

.settle-room-btn.disabled,
.settle-room-btn:disabled {
  background: #ccc;
  color: #999;
  cursor: not-allowed;
  opacity: 0.6;
}

.settle-room-btn.disabled:hover,
.settle-room-btn:disabled:hover {
  background: #ccc;
}

.settle-room-btn.disabled:active,
.settle-room-btn:disabled:active {
  background: #ccc;
}

</style>
