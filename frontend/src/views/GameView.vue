<template>
  <div class="game-view">
    <!-- 没有房间时显示房间页面 -->
    <div v-if="!roomStore.isInRoom" class="room-section">
      <div class="no-room-state">
        <div class="welcome-card">
          <div class="welcome-icon">🎯</div>
          <h2>{{ t('game.welcomeTitle') }}</h2>
          <p>{{ t('game.welcomeMessage') }}</p>
        </div>

        <div class="action-buttons">
          <button class="action-btn create-btn" @click="showCreateDialog = true">
            <div class="btn-icon">➕</div>
            <div class="btn-text">
              <div class="btn-title">{{ t('game.createRoom') }}</div>
              <div class="btn-subtitle">{{ t('game.setGameParameters') }}</div>
            </div>
          </button>

          <button class="action-btn join-btn" @click="showJoinDialog = true">
            <div class="btn-icon">🔍</div>
            <div class="btn-text">
              <div class="btn-title">{{ t('game.joinRoom') }}</div>
              <div class="btn-subtitle">{{ t('game.enterRoomCodeMsg') }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- 创建房间对话框 -->
      <Teleport to="body">
        <div v-if="showCreateDialog" class="dialog-overlay" @click="closeCreateDialog">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>{{ t('game.createRoomTitle') }}</h3>
          </div>
          
          <div class="dialog-body">
            <!-- 第一行：每手筹码 和 大盲尺寸 -->
            <div class="input-row">
              <div class="input-group-half">
                <label>{{ t('game.chipsPerHand') }}</label>
                <input 
                  v-model.number="createForm.chipsPerHand" 
                  type="number" 
                  class="dialog-input"
                  inputmode="numeric"
                  placeholder="e.g: 1000"
                  @focus="handleCreateInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
              
              <div class="input-group-half">
                <label>{{ t('game.bbSize') }}</label>
                <input 
                  v-model.number="createForm.bigBlind" 
                  type="number" 
                  class="dialog-input"
                  inputmode="numeric"
                  placeholder="e.g: 10"
                  @focus="handleCreateInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
            </div>
            
            <div class="input-group">
              <label>{{ t('game.costPerHand') }}</label>
              <div class="input-with-currency">
                <input 
                  v-model.number="createForm.costPerHand" 
                  type="number" 
                  class="dialog-input currency-input"
                  inputmode="numeric"
                  placeholder="e.g: 20"
                  @focus="handleCreateInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
                <button class="currency-btn" @click="toggleCurrency">
                  <span v-if="currencyType === 'CAD'">CAD $</span>
                  <span v-else>RMB ¥</span>
                </button>
              </div>
            </div>
          </div>
          
          <div class="dialog-actions">
            <button class="dialog-btn confirm" @click="createRoom">{{ t('game.createRoom') }}</button>
          </div>
        </div>
        </div>
      </Teleport>

      <!-- 加入房间对话框 -->
      <Teleport to="body">
        <div v-if="showJoinDialog" class="dialog-overlay" @click="closeJoinDialog">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>{{ t('game.joinRoomTitle') }}</h3>
          </div>
          
          <div class="dialog-body">
            <div class="input-group">
              <label>{{ t('game.roomCode') }}</label>
              <input 
                v-model="joinForm.roomId" 
                type="text" 
                class="dialog-input"
                inputmode="numeric"
                :placeholder="t('game.enterRoomCode')"
                maxlength="6"
                @focus="handleJoinInputFocus($event)"
                @blur="handleInputBlur($event)"
                :class="{ 'error': joinErrorMessage }"
              >
              <div v-show="joinErrorMessage" class="error-message">
                {{ joinErrorMessage }}
              </div>
            </div>
          </div>
          
          <div class="dialog-actions">
            <button class="dialog-btn confirm" @click="joinRoom">{{ t('game.joinRoom') }}</button>
          </div>
        </div>
        </div>
      </Teleport>
    </div>

    <!-- 有房间时显示计分板 -->
    <div v-else class="scoreboard-section">
      <!-- 计分板组件 -->
      <ScoreBoard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import ScoreBoard from '../components/ScoreBoard.vue'
import { useRoomStore } from '../stores/room'
import { useGameStore } from '../stores/game'
import { useUserStore } from '../stores/user'
import { useI18n } from '../composables/useI18n'

const roomStore = useRoomStore()
const gameStore = useGameStore()
const userStore = useUserStore()
const { t } = useI18n()

// 对话框状态
const showCreateDialog = ref(false)
const showJoinDialog = ref(false)

// 表单数据
const createForm = ref({
  chipsPerHand: 1000,
  bigBlind: 10,
  costPerHand: 20
})

const joinForm = ref({
  roomId: ''
})

// 错误消息
const joinErrorMessage = ref('')

// 货币切换状态 - 默认为CAD
const currencyType = ref<'CAD' | 'RMB'>('CAD')

// 方法
function closeCreateDialog() {
  showCreateDialog.value = false
}

function closeJoinDialog() {
  showJoinDialog.value = false
  joinErrorMessage.value = '' // 清除错误消息
}

// 创建房间弹窗的输入框焦点处理
function handleCreateInputFocus(event: Event) {
  const input = event.target as HTMLInputElement
  input.select() // 选择全部内容，用户输入时会自动替换
  
  // 简化处理 - 和ProfileView.vue保持一致
  setTimeout(() => {
    if (input) {
      input.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })
    }
  }, 300) // 等待键盘弹出
}

// 加入房间弹窗的输入框焦点处理
function handleJoinInputFocus(event: Event) {
  const input = event.target as HTMLInputElement
  input.select() // 选择全部内容，用户输入时会自动替换
  joinErrorMessage.value = '' // 清除错误消息
  
  // 简化处理 - 和ProfileView.vue保持一致
  setTimeout(() => {
    if (input) {
      input.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })
    }
  }, 300) // 等待键盘弹出
}

// 弹窗输入框失焦处理 - 和ProfileView.vue保持一致
function handleInputBlur(event: Event) {
  // 键盘收起后，不强制滚动，让页面保持用户最后的滚动位置
  // 这样用户可以继续填写其他字段
}

async function createRoom() {
  try {
    await roomStore.createRoom(createForm.value.chipsPerHand, createForm.value.bigBlind, createForm.value.costPerHand, currencyType.value as 'CAD' | 'RMB')
    closeCreateDialog()
  } catch (error) {
    console.error('Failed to create room:', error)
    alert(t('messages.createRoomFailed'))
  }
}

async function joinRoom() {
  try {
    joinErrorMessage.value = '' // 清除之前的错误消息
    await roomStore.joinRoom(joinForm.value.roomId)
    closeJoinDialog()
    joinForm.value.roomId = ''
  } catch (error: any) {
    console.error('Failed to join room:', error)
    
    // 在对话框内显示错误信息
    if (error.name === 'RoomNotFoundError') {
      joinErrorMessage.value = t('messages.roomNotFound')
    } else {
      joinErrorMessage.value = t('messages.joinRoomFailed')
    }
  }
}

function toggleCurrency() {
  currencyType.value = currencyType.value === 'CAD' ? 'RMB' : 'CAD'
}

// 监听房间变化，加载对应的游戏数据
watch(() => roomStore.currentRoom, async (newRoom, oldRoom) => {
  console.log('🏠 房间状态变化:', { oldRoom: oldRoom?.roomId, newRoom: newRoom?.roomId })
  
  // 如果房间ID相同，说明只是房间对象更新，不需要重新加载数据
  if (oldRoom?.roomId === newRoom?.roomId) {
    console.log('🔄 房间ID相同，跳过数据重新加载')
    return
  }
  
  // 现在我们总是重新加载数据，确保能看到最新的玩家
  // 这解决了addPlayer后数据不显示的问题
  
  if (oldRoom?.roomId) {
    console.log('🚪 断开旧房间Socket:', oldRoom.roomId)
    gameStore.disconnectSocket(oldRoom.roomId)
  }
  
  if (newRoom?.roomId) {
    console.log('📊 加载新房间数据:', newRoom.roomId)
    // 确保用户已初始化
    if (!userStore.isInitialized) {
      await userStore.initializeUser()
    }
    console.log('🎮 房间变化 - 用户ID:', userStore.userId, '已初始化:', userStore.isInitialized)
    
    // 确保在加载数据前设置正确的用户ID
    gameStore.setCurrentUserId(userStore.userId)
    await gameStore.loadGameData(newRoom.roomId)
    console.log('🔌 连接新房间Socket:', newRoom.roomId)
    gameStore.connectSocket(newRoom.roomId)
  }
}, { immediate: true })

// 组件挂载时连接socket
onMounted(async () => {
  // 确保用户状态已恢复和初始化
  userStore.restoreUserState()
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }
  
  console.log('🎮 GameView挂载 - 用户ID:', userStore.userId, '已初始化:', userStore.isInitialized)
  
  // 确保gameStore有最新的用户ID
  gameStore.setCurrentUserId(userStore.userId)
  
  if (roomStore.currentRoom?.roomId) {
    gameStore.loadGameData(roomStore.currentRoom.roomId)
    gameStore.connectSocket(roomStore.currentRoom.roomId)
  }
})
</script>

<style scoped>
.game-view {
  min-height: calc(100vh - 70px); /* Subtract navbar height */
  background-color: #f5f5f5;
  padding-bottom: 100px !important; /* Ensure bottom space for navbar */
  /* Ensure proper content flow */
  overflow: visible;
}

/* 房间部分样式 */
.room-section {
  padding: 15px;
}

/* 无房间状态 */
.no-room-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 40px 20px;
}

.welcome-card {
  background: white;
  border-radius: 16px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  width: 100%;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-card h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.welcome-card p {
  font-size: 14px;
  color: #8e8e93;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 300px;
}

.action-btn {
  background: white;
  border: none;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
  text-align: left;
  width: 100%;
}

.action-btn:active {
  transform: scale(0.98);
}

.btn-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.btn-text {
  flex: 1;
}

.btn-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.btn-subtitle {
  font-size: 13px;
  color: #8e8e93;
}

.create-btn .btn-icon {
  color: #27ae60;
}

.join-btn .btn-icon {
  color: #007bff;
}

/* 计分板部分样式 */
.scoreboard-section {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}




/* 对话框样式 */
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
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  text-align: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e9ecef;
}

.dialog-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}


.dialog-body {
  padding: 20px 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

/* 输入框行布局 */
.input-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.input-group-half {
  flex: 1;
}

.input-group-half label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.dialog-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  background: white;
  transition: border-color 0.2s ease;
}

.dialog-input:focus {
  border-color: #007bff;
}

.dialog-input.error {
  border-color: #dc3545;
  background-color: #f8f9fa;
}

.dialog-input.error:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 6px;
  margin-bottom: 0;
  padding-left: 4px;
}

/* 带货币按钮的输入框容器 */
.input-with-currency {
  display: flex;
  align-items: center;
  gap: 8px;
}

.currency-input {
  flex: 1;
  min-width: 0;
}

.currency-btn {
  background: #ff9500;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  white-space: nowrap;
  flex-shrink: 0;
  width: 90px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.currency-btn:active {
  background: #e6850e;
  transform: scale(0.95);
}

.dialog-actions {
  padding: 16px 24px 24px;
  text-align: center;
}

.dialog-btn {
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dialog-btn.confirm {
  background: #007bff;
  color: white;
}

.dialog-btn.confirm:active {
  background: #0056b3;
}

/* 防止缩放 */
.dialog-overlay,
.action-btn,
.dialog-input,
.currency-btn {
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.dialog-input {
  -webkit-user-select: text;
  user-select: text;
}

</style>
