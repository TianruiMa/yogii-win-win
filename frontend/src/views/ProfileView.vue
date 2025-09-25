<template>
  <div class="profile-view">
    <!-- 用户信息卡片 -->
    <div class="user-info-card">
      <div class="user-details">
        <div class="username-section">
          <span v-if="!editingNickname" class="username" @click="startEditNickname">
            {{ userStore.nickname || t('records.setNickname') }}
          </span>
          <input 
            v-else
            v-model="tempNickname"
            @blur="saveNickname"
            @keyup.enter="saveNickname"
            class="nickname-input"
            type="text"
            maxlength="20"
            :placeholder="t('records.enterNickname')"
            ref="nicknameInput"
          >
          <span class="edit-icon" @click="startEditNickname">✏️</span>
        </div>
        <div class="user-id">ID: {{ userStore.userId || '未初始化' }}</div>
      </div>
      <div class="preference-buttons">
        <button class="preference-btn" @click="cycleCurrency">
          {{ getCurrencyDisplay() }}
        </button>
        <button class="preference-btn" @click="cycleLanguage">
          {{ getLanguageDisplay() }}
        </button>
      </div>
    </div>

    <!-- 统计数据卡片 -->
    <div class="stats-grid-new">
      <!-- 第一行 -->
      <div class="stat-card">
        <div class="stat-value">{{ userStats.totalHours }}{{ t('common.hour') }}</div>
        <div class="stat-label">{{ t('records.totalHours') }}</div>
      </div>
      
      <!-- 环形胜率图 - 占两行，上方显示总游戏数 -->
      <div class="win-rate-circle">
        <div class="games-count">{{ userStats.totalGames }} {{ t('records.games') }}</div>
        <div class="circle-container">
          <svg class="circle-chart" viewBox="0 0 120 120">
            <!-- 背景圆圈 -->
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" stroke-width="10"/>
            
            <!-- 胜率圆弧 (绿色) - 从12点开始 -->
            <circle 
              v-if="winRate > 0"
              cx="60" cy="60" r="50" 
              fill="none" 
              stroke="#4CAF50" 
              stroke-width="10"
              :stroke-dasharray="`${winArcLength} ${totalCircumference - winArcLength}`"
              :stroke-dashoffset="0"
              transform="rotate(-90 60 60)"
            />
            
            <!-- 败率圆弧 (红色) - 跟在绿色后面 -->
            <circle 
              v-if="loseRate > 0"
              cx="60" cy="60" r="50" 
              fill="none" 
              stroke="#f44336" 
              stroke-width="10"
              :stroke-dasharray="`${loseArcLength} ${totalCircumference - loseArcLength}`"
              :stroke-dashoffset="loseOffset"
              transform="rotate(-90 60 60)"
            />
            
            <!-- 平局圆弧 (橙色) - 最后 -->
            <circle 
              v-if="drawRate > 0"
              cx="60" cy="60" r="50" 
              fill="none" 
              stroke="#FF9800" 
              stroke-width="10"
              :stroke-dasharray="`${drawArcLength} ${totalCircumference - drawArcLength}`"
              :stroke-dashoffset="drawOffset"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div class="win-rate-text">
            <div class="rate-value">{{ winRate }}%</div>
          </div>
        </div>
        <div class="rate-label-external">{{ t('records.winRate') }}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value" :class="{ 
          'positive': parseFloat(bbPerHour) > 0, 
          'negative': parseFloat(bbPerHour) < 0 
        }">{{ bbPerHour }}</div>
        <div class="stat-label" v-html="t('records.bbPerHour')"></div>
      </div>
      
      <!-- 第二行 -->
      <div class="stat-card">
        <div class="stat-value" :class="{ 
          'positive': userStats.totalProfit > 0, 
          'negative': userStats.totalProfit < 0 
        }">
          {{ formatProfitWithCurrencyFourDigits(userStats.totalProfit) }}
        </div>
        <div class="stat-label">{{ t('records.totalProfit') }}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value" :class="{ 
          'positive': profitPerHour > 0, 
          'negative': profitPerHour < 0 
        }">
          {{ formatProfitWithCurrencyFourDigits(profitPerHour) }}
        </div>
        <div class="stat-label" v-html="t('records.profitPerHour')"></div>
      </div>
    </div>

    <!-- 最近游戏记录 -->
    <div class="recent-games-section">
      <div class="section-header">
        <h2>{{ t('records.recentGames') }}</h2>
        <button class="add-record-btn" @click="showAddRecord">{{ t('records.addRecord') }}</button>
      </div>
      
      <!-- 盈亏趋势图 -->
      <div class="trend-chart-container">
        <div v-if="recentGames.length > 0">
          <svg 
            ref="chartRef"
            class="trend-chart" 
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseLeave"
          >
            <!-- 背景渐变和剪切路径 -->
            <defs>
              <!-- 正收益渐变（绿色） -->
              <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:0.3"/>
                <stop offset="100%" style="stop-color:#4CAF50;stop-opacity:0"/>
              </linearGradient>
              <!-- 负收益渐变（红色） -->
              <linearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#f44336;stop-opacity:0"/>
                <stop offset="100%" style="stop-color:#f44336;stop-opacity:0.3"/>
              </linearGradient>
              <!-- 正收益区域剪切路径 -->
              <clipPath id="positiveClip">
                <rect 
                  :x="chartPaddingX" 
                  :y="chartPaddingY" 
                  :width="chartWidth - chartPaddingX - chartPaddingRight" 
                  :height="zeroLineY - chartPaddingY" 
                />
              </clipPath>
              <!-- 负收益区域剪切路径 -->
              <clipPath id="negativeClip">
                <rect 
                  :x="chartPaddingX" 
                  :y="zeroLineY" 
                  :width="chartWidth - chartPaddingX - chartPaddingRight" 
                  :height="chartHeight - chartPaddingBottom - zeroLineY" 
                />
              </clipPath>
            </defs>
            
            <!-- X轴 (改为虚线) -->
            <line 
              :x1="chartPaddingX" 
              :y1="chartHeight - chartPaddingBottom" 
              :x2="chartWidth - chartPaddingRight" 
              :y2="chartHeight - chartPaddingBottom" 
              stroke="#e0e0e0" 
              stroke-width="1"
              stroke-dasharray="3,3"
            />
            
            <!-- 零线 -->
            <line 
              :x1="chartPaddingX" 
              :y1="zeroLineY" 
              :x2="chartWidth - chartPaddingRight" 
              :y2="zeroLineY" 
              stroke="#e0e0e0" 
              stroke-width="1"
              stroke-dasharray="2,2"
            />
            
            <!-- Y轴标签已移除，数值信息通过气泡显示 -->
            
            <!-- X轴刻度和标签 -->
            <g v-for="point in xAxisPoints" :key="point.dateLabel">
              <line 
                :x1="point.x" 
                :y1="chartHeight - chartPaddingBottom" 
                :x2="point.x" 
                :y2="chartHeight - chartPaddingBottom + 3" 
                stroke="#ccc" 
                stroke-width="1"
              />
              <text 
                :x="point.x" 
                :y="chartHeight - chartPaddingBottom + 18" 
                font-size="11" 
                fill="#999" 
                text-anchor="middle"
              >
                {{ point.dateLabel }}
              </text>
            </g>
            
            <!-- 趋势线 -->
            <polyline 
              :points="trendLinePoints" 
              fill="none" 
              stroke="#6b9bd2" 
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            
            <!-- 正收益填充区域 -->
            <polygon 
              :points="trendAreaPoints.positive" 
              fill="url(#profitGradient)"
              opacity="0.6"
              clip-path="url(#positiveClip)"
            />
            
            <!-- 负收益填充区域 -->
            <polygon 
              :points="trendAreaPoints.negative" 
              fill="url(#lossGradient)"
              opacity="0.6"
              clip-path="url(#negativeClip)"
            />
            
            <!-- 数据点 -->
            <circle 
              v-for="(point, index) in chartPoints" 
              :key="index"
              :cx="point.x" 
              :cy="point.y" 
              r="3" 
              :fill="point.profit > 0 ? '#4CAF50' : (point.profit < 0 ? '#f44336' : '#FF9800')"
              stroke="white"
              stroke-width="2"
            />
            
            <!-- 数据气泡 (方向性设计 + 边界检测) -->
            <g v-for="bubble in bubblePoints.filter(b => b.showBubble)" :key="`bubble-${bubble.index}`">
              <!-- 正收益气泡 (向上) 或强制向上的负收益气泡 或0收益气泡 -->
              <g v-if="bubble.profit > 0 || bubble.forceUpward || bubble.profit === 0">
                <!-- 气泡背景 -->
                <rect 
                  :x="bubble.x - 15" 
                  :y="bubble.y - 32" 
                  width="30" 
                  height="18" 
                  rx="4" 
                  ry="4" 
                  :fill="bubble.profit > 0 ? '#4CAF50' : (bubble.profit < 0 ? '#f44336' : '#FF9800')" 
                  :stroke="bubble.profit > 0 ? '#4CAF50' : (bubble.profit < 0 ? '#f44336' : '#FF9800')" 
                  stroke-width="1"
                />
                <!-- 向下指向的尖角 -->
                <polygon 
                  :points="`${bubble.x - 3},${bubble.y - 14} ${bubble.x + 3},${bubble.y - 14} ${bubble.x},${bubble.y - 8}`"
                  :fill="bubble.profit > 0 ? '#4CAF50' : (bubble.profit < 0 ? '#f44336' : '#FF9800')"
                  stroke="none"
                />
                <!-- 气泡文字 -->
                <text 
                  :x="bubble.x" 
                  :y="bubble.y - 20" 
                  font-size="9" 
                  fill="white" 
                  text-anchor="middle"
                  font-weight="600"
                >
                  {{ formatBubbleValueSimple(bubble.profit) }}
                </text>
              </g>
              
              <!-- 负收益气泡 (向下) - 仅当不被强制向上时 -->
              <g v-else-if="bubble.profit < 0 && !bubble.forceUpward">
                <!-- 气泡背景 -->
                <rect 
                  :x="bubble.x - 15" 
                  :y="bubble.y + 14" 
                  width="30" 
                  height="18" 
                  rx="4" 
                  ry="4" 
                  fill="#f44336" 
                  stroke="#f44336" 
                  stroke-width="1"
                />
                <!-- 向上指向的尖角 -->
                <polygon 
                  :points="`${bubble.x - 3},${bubble.y + 14} ${bubble.x + 3},${bubble.y + 14} ${bubble.x},${bubble.y + 8}`"
                  fill="#f44336"
                  stroke="none"
                />
                <!-- 气泡文字 -->
                <text 
                  :x="bubble.x" 
                  :y="bubble.y + 26" 
                  font-size="9" 
                  fill="white" 
                  text-anchor="middle"
                  font-weight="600"
                >
                  {{ formatBubbleValueSimple(bubble.profit) }}
                </text>
              </g>
            </g>
            
            <!-- 交互详情显示 -->
            <g v-if="isInteracting && selectedDataPoint && interactionPoint">
              <!-- 垂直指示线 -->
              <line 
                :x1="interactionPoint.x" 
                :y1="chartPaddingY" 
                :x2="interactionPoint.x" 
                :y2="chartHeight - chartPaddingBottom" 
                stroke="#6b9bd2" 
                stroke-width="1" 
                stroke-dasharray="3,3"
                opacity="0.8"
              />
              
              <!-- 数据点高亮 -->
              <circle 
                :cx="selectedDataPoint.x" 
                :cy="selectedDataPoint.y" 
                r="5" 
                :fill="selectedDataPoint.profit > 0 ? '#4CAF50' : (selectedDataPoint.profit < 0 ? '#f44336' : '#FF9800')"
                stroke="white"
                stroke-width="3"
                opacity="0.9"
              />
              
              <!-- 详细信息气泡 -->
              <g>
                <!-- 气泡背景 -->
                <rect 
                  :x="interactionPoint.x - getBubbleWidth(selectedDataPoint) / 2" 
                  :y="chartPaddingY - 25" 
                  :width="getBubbleWidth(selectedDataPoint)" 
                  height="40" 
                  rx="8" 
                  ry="8" 
                  fill="white" 
                  stroke="#6b9bd2" 
                  stroke-width="1"
                />
                
                <!-- 日期 -->
                <text 
                  :x="interactionPoint.x" 
                  :y="chartPaddingY - 10" 
                  font-size="10" 
                  fill="#666666" 
                  text-anchor="middle"
                  font-weight="500"
                >
                  {{ formatInteractionDate(selectedDataPoint.game) }}
                </text>
                
                <!-- 收益值 -->
                <text 
                  :x="interactionPoint.x" 
                  :y="chartPaddingY + 5" 
                  font-size="12" 
                  :fill="selectedDataPoint.profit > 0 ? '#4CAF50' : (selectedDataPoint.profit < 0 ? '#f44336' : '#FF9800')"
                  text-anchor="middle"
                  font-weight="600"
                >
                  {{ formatInteractionValue(selectedDataPoint.profit) }}
                </text>
              </g>
            </g>
          </svg>
        </div>
        <div v-else class="no-chart-placeholder">
          <div class="placeholder-icon">🎲</div>
          <p class="placeholder-text">{{ t('records.noGamesYet') }}</p>
          <p class="placeholder-subtext">{{ t('records.startFirstGame') }}</p>
        </div>
      </div>
      
      <!-- 图表切换按钮 -->
      <div class="chart-toggle-buttons">
        <button 
          class="chart-toggle-btn" 
          :class="{ active: chartMode === 'profit' }"
          @click="chartMode = 'profit'"
        >
          {{ t('records.profit') }}
        </button>
        <button 
          class="chart-toggle-btn" 
          :class="{ active: chartMode === 'totalProfit' }"
          @click="chartMode = 'totalProfit'"
        >
          {{ t('records.totalProfit') }}
        </button>
        <button 
          class="chart-toggle-btn" 
          :class="{ active: chartMode === 'profitPerHour' }"
          @click="chartMode = 'profitPerHour'"
        >
          {{ t('records.profitPerHourChart') }}
        </button>
        <button 
          class="chart-toggle-btn" 
          :class="{ active: chartMode === 'bbPerHour' }"
          @click="chartMode = 'bbPerHour'"
        >
          {{ t('records.bbPerHourChart') }}
        </button>
      </div>
    </div>
    
    <div v-if="recentGames.length > 0" class="games-list" @click="handleGamesListClick">
      <div 
        v-for="game in paginatedGames" 
        :key="game.id" 
        class="game-item-wrapper"
        :class="{ 'swiped': swipedItems[game.id] }"
      >
        <div class="game-item-container">
          <div 
            class="game-item"
            @touchstart="handleGameItemTouchStart($event, game)"
            @touchmove="handleGameItemTouchMove($event, game)"
            @touchend="handleGameItemTouchEnd($event, game)"
            @click="handleGameItemClick(game)"
            :style="getItemStyle(game.id)"
          >
            <div class="game-info" :style="getGameInfoStyle(game.id)">
              <div class="game-date">{{ formatGameDate(game.joined_at || game.created_at || game.createdAt) }}</div>
              <div class="game-details">
                Room: {{ game.chips_per_hand }} | {{ game.big_blind }} | {{ userStore.preferredCurrency === 'CAD' ? '$' : '¥' }}{{ convertCurrency(game.cost_per_hand, game.currency, userStore.preferredCurrency) }}
              </div>
            </div>
            <div class="game-result-wrapper">
              <div class="game-result" :class="{
                'positive': game.profit > 0,
                'negative': game.profit < 0,
                'neutral': game.profit === 0
              }" :style="getGameResultStyle(game.id)">
                {{ userStore.preferredCurrency === 'CAD' ? '$' : '¥' }}{{ Math.abs(Math.round(game.profit)) }}
              </div>
            </div>
          </div>
          
          <!-- 详情按钮 -->
          <div class="detail-actions" :style="getDetailActionStyle(game.id)">
            <button 
              class="detail-btn"
              @click="handleDetailClick(game)"
            >
              <!-- 按钮内容为空，文字单独放置 -->
            </button>
            <span class="detail-text">{{ t('records.detail') }}</span>
          </div>
          
          <!-- 删除按钮 -->
          <div class="delete-actions" :style="getDeleteActionStyle(game.id)">
            <button 
              class="delete-btn"
              :class="{ 'disabled': !game.canDelete }"
              :disabled="!game.canDelete"
              @click="confirmDeleteRecord(game)"
            >
              <!-- 按钮内容为空，文字单独放置 -->
            </button>
            <span class="delete-text">{{ t('records.remove') }}</span>
          </div>
        </div>
      </div>
      
      <!-- 翻页控件 -->
      <div v-if="totalPages > 1" class="pagination-controls">
        <button 
          class="pagination-btn first-page" 
          :disabled="currentPage === 1"
          @click="currentPage = 1"
          title="第一页"
        >
          <span class="double-arrow-left"></span>
        </button>
        
        <button 
          class="pagination-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
          title="上一页"
        >
          ◀
        </button>
        
        <span class="pagination-info">
          {{ currentPage }} / {{ totalPages }}
        </span>
        
        <button 
          class="pagination-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
          title="下一页"
        >
          ▶
        </button>
        
        <button 
          class="pagination-btn last-page" 
          :disabled="currentPage === totalPages"
          @click="currentPage = totalPages"
          title="最后一页"
        >
          <span class="double-arrow-right"></span>
        </button>
      </div>
    </div>
    
    <!-- 添加记录弹窗 -->
    <Teleport to="body">
      <div v-if="showAddRecordDialog" class="modal-overlay" @click="closeAddRecord">
        <div class="modal-content add-record-modal" @click.stop>
          <!-- 游戏信息部分 -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-group">
                <label class="date-label">{{ t('common.startDate') }}</label>
                <div class="date-input-wrapper">
                  <svg class="custom-calendar-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                  </svg>
                  <input 
                    v-model="addRecordForm.date" 
                    type="date" 
                    class="form-input borderless-date-input"
                    @focus="onDateInputFocus"
                    @blur="onDateInputBlur"
                  >
                </div>
              </div>
              <div class="form-group">
                <label>{{ t('common.duration') }} ({{ t('common.hour') }})</label>
                <div class="duration-input-wrapper">
                  <svg class="custom-clock-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                  </svg>
                  <input 
                    v-model="addRecordForm.duration" 
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    inputmode="decimal"
                    class="borderless-duration-input"
                    @focus="handleInputFocus($event)"
                    @blur="handleInputBlur($event)"
                    @input="validateDuration"
                    placeholder="2.0"
                  >
                </div>
              </div>
            </div>
            
            <!-- 分割线 -->
            <div class="form-divider"></div>
            
            <div class="form-row">
              <div class="form-group">
                <label>{{ t('game.chipsPerHand') }}</label>
                <input 
                  v-model.number="addRecordForm.chipsPerHand" 
                  type="number" 
                  inputmode="numeric"
                  class="form-input"
                  placeholder="1000"
                  @focus="handleInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
              <div class="form-group">
                <label>{{ t('game.bbSize') }}</label>
                <input 
                  v-model.number="addRecordForm.bigBlind" 
                  type="number" 
                  inputmode="numeric"
                  class="form-input"
                  placeholder="10"
                  @focus="handleInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>{{ t('game.costPerHand') }}</label>
                <input 
                  v-model.number="addRecordForm.costPerHand" 
                  type="number" 
                  step="0.01"
                  inputmode="decimal"
                  class="form-input"
                  placeholder="20"
                  @focus="handleInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
              <div class="form-group currency-toggle">
                <label>&nbsp;</label>
                <button 
                  class="currency-toggle-btn"
                  @click="toggleCurrency"
                >
                  {{ addRecordForm.currency === 'CAD' ? 'CAD($)' : 'RMB(¥)' }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- 分割线 -->
          <div class="divider"></div>
          
          <!-- 个人数据部分 -->
          <div class="form-section">
            <div class="form-row">
              <div class="form-group">
                <label>{{ t('game.hands') }}</label>
                <input 
                  v-model.number="addRecordForm.hands" 
                  type="number" 
                  min="0"
                  inputmode="numeric"
                  class="form-input"
                  placeholder="1"
                  @focus="handleInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
              <div class="form-group">
                <label>{{ t('game.finalChips') }}</label>
                <input 
                  v-model.number="addRecordForm.finalChips" 
                  type="number" 
                  min="0"
                  inputmode="numeric"
                  class="form-input"
                  placeholder="1000"
                  @focus="handleInputFocus($event)"
                  @blur="handleInputBlur($event)"
                >
              </div>
            </div>
          </div>
          
          <!-- 按钮 -->
          <div class="modal-buttons">
          <button class="btn-confirm-single" @click="showConfirm">
            {{ t('common.confirm') }}
          </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 日期选择器遮罩层 -->
    <Teleport to="body">
      <div v-if="showDateMask" class="date-mask-overlay"></div>
    </Teleport>

    <!-- 底部确认对话框 -->
    <Teleport to="body">
      <div v-if="showConfirmDialog" class="confirm-overlay" @click="showConfirmDialog = false">
        <div class="confirm-sheet" @click.stop>
          <div class="confirm-content">
            <div class="confirm-header">
              <h3 class="confirm-title">{{ t('records.addRecord') }}</h3>
              <p class="confirm-message">{{ t('records.confirmAddRecord') }}</p>
            </div>
            
            <div class="confirm-actions">
              <button 
                @click="submitAddRecord" 
                class="confirm-btn"
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
  
  <!-- 删除确认弹窗 -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDeleteRecord">
      <div class="confirm-dialog" @click.stop>
        <div class="confirm-header">
          <h3>{{ t('common.confirmDelete') }}</h3>
        </div>
        <div class="confirm-content">
          <p>{{ t('records.deleteConfirmMessage') }}</p>
          <div class="game-summary" v-if="recordToDelete">
            <div>{{ formatGameDate(recordToDelete.joined_at || recordToDelete.created_at || recordToDelete.createdAt) }}</div>
            <div>{{ userStore.preferredCurrency === 'CAD' ? '$' : '¥' }}{{ Math.abs(Math.round(recordToDelete.profit)) }}</div>
          </div>
        </div>
        <div class="confirm-actions">
          <button class="cancel-btn" @click="cancelDeleteRecord" :disabled="isDeleting">
            {{ t('common.cancel') }}
          </button>
          <button class="delete-btn" @click="deleteRecord" :disabled="isDeleting">
            {{ isDeleting ? t('common.deleting') || '删除中...' : t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 游戏详情弹窗 -->
  <Teleport to="body">
    <div v-if="showGameDetail" class="settlement-overlay" @click="closeGameDetail">
      <div class="settlement-sheet" @click.stop>
        <div class="settlement-header">
          <h3>{{ t('settlement.title') }}</h3>
          <div class="game-date-header" v-if="gameDetail">
            {{ formatGameDate(gameDetail.joined_at || gameDetail.created_at || gameDetail.createdAt) }}
          </div>
        </div>
        
        <div class="settlement-content" v-if="gameDetail">
          <!-- 加载状态 -->
          <div v-if="isLoadingPlayers" class="loading-players">
            <div class="loading-text">{{ t('common.loading') }}...</div>
          </div>
          
          <!-- 玩家表格 -->
          <div v-else-if="gameDetailPlayers.length > 0" class="settlement-table">
            <!-- 表头 -->
            <div class="settlement-row header">
              <div class="col-name">{{ t('game.player') }}</div>
              <div class="col-duration">时长</div>
              <div class="col-profit">总盈亏</div>
              <div class="col-avg-profit">平均盈亏</div>
              <div class="col-avg-bb">平均BB收益</div>
            </div>
            
            <!-- 玩家列表 -->
            <div 
              v-for="(player, index) in gameDetailPlayers" 
              :key="player.id"
              class="settlement-row"
              :class="{ 'highlight': player.user_id === userStore.userId }"
            >
              <div class="col-name">
                {{ player.user_nickname || `User_${player.user_id.slice(-4)}` }}
              </div>
              <div class="col-duration">
                {{ calculatePlayerDuration(player) }}
              </div>
              <div class="col-profit" :class="getProfitClass(player.profit)">
                {{ formatCurrencyDisplay(convertCurrency(player.profit, gameDetail.currency, userStore.preferredCurrency)) }}
              </div>
              <div class="col-avg-profit" :class="getProfitClass(calculateHourlyProfit(player))">
                {{ formatCurrencyDisplay(Math.round(convertCurrency(calculateHourlyProfit(player), gameDetail.currency, userStore.preferredCurrency))) }}
              </div>
              <div class="col-avg-bb" :class="getProfitClass(calculateHourlyBBProfit(player))">
                {{ formatNumberDisplay(Math.round(calculateHourlyBBProfit(player) * 10) / 10) }}
              </div>
            </div>
          </div>
          
          <!-- 无数据状态 -->
          <div v-else class="no-players">
            <div class="no-data-text">{{ t('records.noPlayersData') }}</div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, reactive } from 'vue'
import { useUserStore } from '../stores/user'
import { useI18n } from '../composables/useI18n'
import api from '../services/api'

// 类型定义
interface ChartPoint {
  x: number
  y: number
  profit: number
  index: number
  game: any
}

interface BubblePoint extends ChartPoint {
  showBubble: boolean
  forceUpward?: boolean
}

interface UserStatsExtended {
  totalGames: number
  totalProfit: number
  winGames: number
  drawGames: number
  totalHours: number
  bbPerHour: number
}

const userStore = useUserStore()
const { t, setLanguage } = useI18n()

// 响应式数据
const editingNickname = ref(false)
const tempNickname = ref('')
const nicknameInput = ref<HTMLInputElement>()
const chartMode = ref<'profit' | 'totalProfit' | 'profitPerHour' | 'bbPerHour'>('profit')

// 图表交互相关
const isInteracting = ref(false)
const interactionPoint = ref<{ x: number, y: number } | null>(null)
const selectedDataPoint = ref<any>(null)
const chartRef = ref<HTMLElement>()

// 长按检测相关
const longPressTimer = ref<number | null>(null)
const longPressThreshold = 500 // 长按时间阈值（毫秒）
const touchStartPos = ref<{ x: number, y: number } | null>(null)
const moveThreshold = 10 // 移动距离阈值（像素）

// 用户统计数据
const userStats = ref<UserStatsExtended>({
  totalGames: 0,
  totalProfit: 0,
  winGames: 0,
  drawGames: 0,
  totalHours: 0,
  bbPerHour: 0
})

const recentGames = ref<any[]>([])

// 翻页相关数据
const currentPage = ref(1)
const recordsPerPage = 10

// 滑动删除相关数据
const swipedItems = reactive<Record<string, boolean>>({})
const detailSwipedItems = reactive<Record<string, boolean>>({})
const touchData = reactive<Record<string, {
  startX: number
  startY: number
  currentX: number
  isDragging: boolean
  translateX: number
}>>({})

// 删除确认弹窗相关
const showDeleteConfirm = ref(false)
const recordToDelete = ref<any>(null)
const isDeleting = ref(false)

// 游戏详情弹窗相关
const showGameDetail = ref(false)
const gameDetail = ref<any>(null)
const gameDetailPlayers = ref<any[]>([])
const isLoadingPlayers = ref(false)

// 图表相关数据
const chartWidth = 380
const chartHeight = 200
const chartPaddingX = 15
const chartPaddingRight = 15
const chartPaddingY = 20
const chartPaddingBottom = 30

// 计算属性

// 分页相关计算属性
const totalPages = computed(() => Math.ceil(recentGames.value.length / recordsPerPage))

const gamesForList = computed(() => {
  return [...recentGames.value].sort((a, b) => {
    const dateA = new Date(a.joined_at || a.created_at || a.createdAt)
    const dateB = new Date(b.joined_at || b.created_at || b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })
})

const paginatedGames = computed(() => {
  const start = (currentPage.value - 1) * recordsPerPage
  const end = start + recordsPerPage
  return gamesForList.value.slice(start, end)
})

// 计算精确的比率，确保总和为100%
const gameRates = computed(() => {
  if (userStats.value.totalGames === 0) return { win: 0, lose: 0, draw: 0 }
  
  const totalGames = userStats.value.totalGames
  const winGames = userStats.value.winGames
  const drawGames = userStats.value.drawGames || 0
  const loseGames = totalGames - winGames - drawGames
  
  // 计算精确比率
  const winRateRaw = (winGames / totalGames) * 100
  const drawRateRaw = (drawGames / totalGames) * 100
  const loseRateRaw = (loseGames / totalGames) * 100
  
  // 四舍五入
  let winRateRounded = Math.round(winRateRaw)
  let drawRateRounded = Math.round(drawRateRaw)
  let loseRateRounded = Math.round(loseRateRaw)
  
  // 确保总和为100%
  const total = winRateRounded + drawRateRounded + loseRateRounded
  if (total !== 100) {
    // 找到最大的误差并调整
    const winError = Math.abs(winRateRaw - winRateRounded)
    const drawError = Math.abs(drawRateRaw - drawRateRounded)
    const loseError = Math.abs(loseRateRaw - loseRateRounded)
    
    const diff = 100 - total
    if (winError >= drawError && winError >= loseError) {
      winRateRounded += diff
    } else if (drawError >= loseError) {
      drawRateRounded += diff
    } else {
      loseRateRounded += diff
    }
  }
  
  return {
    win: Math.max(0, winRateRounded),
    lose: Math.max(0, loseRateRounded), 
    draw: Math.max(0, drawRateRounded)
  }
})

const winRate = computed(() => gameRates.value.win)
const loseRate = computed(() => gameRates.value.lose) 
const drawRate = computed(() => gameRates.value.draw)

// 环形图弧长计算
const totalCircumference = 314 // 2 * π * r = 2 * 3.14 * 50

const winArcLength = computed(() => {
  return (winRate.value / 100) * totalCircumference
})

const loseArcLength = computed(() => {
  return (loseRate.value / 100) * totalCircumference
})

const drawArcLength = computed(() => {
  return (drawRate.value / 100) * totalCircumference
})

// 偏移量计算
const loseOffset = computed(() => {
  return -winArcLength.value
})

const drawOffset = computed(() => {
  return -(winArcLength.value + loseArcLength.value)
})

const averageProfit = computed(() => {
  if (userStats.value.totalGames === 0) return 0
  return Math.round(userStats.value.totalProfit / userStats.value.totalGames)
})

// BB/小时统计
const bbPerHour = computed(() => {
  const bbPerHourValue = userStats.value.bbPerHour || 0
  // 使用新的四位数字规则，正数不显示正号
  const formattedValue = formatNumberFourDigits(Math.abs(bbPerHourValue))
  if (bbPerHourValue > 0) {
    return formattedValue
  } else if (bbPerHourValue < 0) {
    return `-${formattedValue}`
  } else {
    return formattedValue
  }
})

// 每小时收益统计
const profitPerHour = computed(() => {
  if (userStats.value.totalHours === 0) return 0
  const hourlyProfit = userStats.value.totalProfit / userStats.value.totalHours
  return Math.round(hourlyProfit * 10) / 10
})

const chartData = computed(() => {
  if (recentGames.value.length === 0) return []
  
  const baseData = [...recentGames.value].sort((a, b) => {
    const dateA = new Date(a.joined_at || a.created_at || a.createdAt)
    const dateB = new Date(b.joined_at || b.created_at || b.createdAt)
    return dateA.getTime() - dateB.getTime()
  })
  
  
  
  switch (chartMode.value) {
    case 'totalProfit':
      let accumulator = 0
      return baseData.map(game => {
        accumulator += game.profit
        return { ...game, profit: accumulator }
      })
    
    case 'profitPerHour':
      return baseData.map(game => {
        const duration = game.game_duration_hours || 1
        const originalProfit = game.profit || 0
        const profitPerHour = duration > 0 ? Math.round((originalProfit / duration) * 100) / 100 : 0
        return { ...game, profit: profitPerHour }
      })
    
    case 'bbPerHour':
      return baseData.map(game => {
        const duration = game.game_duration_hours || 1
        const chipProfit = game.chip_profit || 0
        const bigBlind = game.big_blind || 1
        const bbProfit = chipProfit / bigBlind
        const bbPerHourValue = duration > 0 ? Math.round((bbProfit / duration) * 10) / 10 : 0
        return { ...game, profit: bbPerHourValue }
      })
    
    case 'profit':
    default:
      return baseData
  }
})

const chartPoints = computed((): ChartPoint[] => {
  if (chartData.value.length === 0) return []
  
  const data = chartData.value
  const maxProfit = Math.max(...data.map(g => g.profit))
  const minProfit = Math.min(...data.map(g => g.profit))
  const range = Math.max(Math.abs(maxProfit), Math.abs(minProfit)) || 100
  
  return data.map((game, index) => {
    const x = chartPaddingX + (index * (chartWidth - chartPaddingX - chartPaddingRight)) / (data.length - 1 || 1)
    const y = chartPaddingY + (chartHeight - chartPaddingY - chartPaddingBottom) / 2 - (game.profit * (chartHeight - chartPaddingY - chartPaddingBottom)) / (2 * range)
    return { x, y, profit: game.profit, index, game }
  })
})

const zeroLineY = computed(() => chartPaddingY + (chartHeight - chartPaddingY - chartPaddingBottom) / 2)

// 图表标题
const chartTitle = computed(() => {
  switch (chartMode.value) {
    case 'totalProfit':
      return '累计盈亏趋势'
    case 'profitPerHour':
      return '每小时盈亏趋势'
    case 'bbPerHour':
      return '每小时大盲收益趋势'
    case 'profit':
    default:
      return '单局盈亏趋势'
  }
})

const trendLinePoints = computed(() => {
  return chartPoints.value.map(point => `${point.x},${point.y}`).join(' ')
})

// 分别计算正负收益的填充区域
const trendAreaPoints = computed(() => {
  if (chartPoints.value.length === 0) return { positive: '', negative: '' }
  
  const points = chartPoints.value
  const firstX = points[0]?.x || chartPaddingX
  const lastX = points[points.length - 1]?.x || chartWidth - chartPaddingRight
  
  // 构建完整的数据点路径
  const dataPoints = points.map(point => `${point.x},${point.y}`).join(' ')
  
  // 创建与零线相交的完整填充区域
  const positiveArea = `${firstX},${zeroLineY.value} ${dataPoints} ${lastX},${zeroLineY.value}`
  const negativeArea = `${firstX},${zeroLineY.value} ${dataPoints} ${lastX},${zeroLineY.value}`
  
  return {
    positive: positiveArea,
    negative: negativeArea
  }
})

// 坐标轴计算
const xAxisPoints = computed(() => {
  if (chartData.value.length === 0) return []
  
  const data = chartData.value
  const step = Math.max(1, Math.floor(data.length / 4)) // 最多显示5个点
  
  return data.filter((_, index) => index % step === 0 || index === data.length - 1)
    .map((game, i, arr) => {
      const originalIndex = data.findIndex(g => g === game)
      const x = chartPaddingX + (originalIndex * (chartWidth - chartPaddingX - chartPaddingRight)) / (data.length - 1 || 1)
      
      const dateField = game.joined_at || game.created_at || game.createdAt
      const date = new Date(dateField)
      
      if (isNaN(date.getTime())) {
        return { x, dateLabel: 'N/A' }
      }
      
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
      return { x, dateLabel }
    })
})

const yAxisPoints = computed(() => {
  if (chartData.value.length === 0) return []
  
  const data = chartData.value
  const maxProfit = Math.max(...data.map(g => g.profit))
  const minProfit = Math.min(...data.map(g => g.profit))
  const range = Math.max(Math.abs(maxProfit), Math.abs(minProfit)) || 100
  
  const rawStep = range / 3
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalizedStep = rawStep / magnitude
  let step = magnitude
  
  if (normalizedStep <= 1) step = magnitude
  else if (normalizedStep <= 2) step = 2 * magnitude
  else if (normalizedStep <= 5) step = 5 * magnitude
  else step = 10 * magnitude
  
  const values = []
  for (let value = -Math.ceil(range / step) * step; value <= Math.ceil(range / step) * step; value += step) {
    if (Math.abs(value) <= range * 1.1) {
      values.push(value)
    }
  }
  
  return values.map(value => {
    const y = chartPaddingY + (chartHeight - chartPaddingY - chartPaddingBottom) / 2 - (value * (chartHeight - chartPaddingY - chartPaddingBottom)) / (2 * range)
    const label = value >= 0 ? Math.round(value).toString() : Math.round(value).toString()
    return { y, label }
  })
})

const bubblePoints = computed((): BubblePoint[] => {
  const points = chartPoints.value
  if (points.length === 0) return []
  
  const bottomBoundary = chartHeight - chartPaddingBottom - 20
  let bubbles: BubblePoint[] = points.map((point, index) => {
    let showBubble = false
    
    if (points.length === 1) {
      // 只有1个点，显示它
      showBubble = true
    } else if (points.length < 5) {
      // 少于5个点，只显示首尾（避免太拥挤）
      showBubble = index === 0 || index === points.length - 1
    } else {
      const firstIndex = 0
      const lastIndex = points.length - 1
      const middleIndex = Math.floor(points.length / 2)
      
      showBubble = index === firstIndex || 
                  index === middleIndex || 
                  index === lastIndex
    }
    
    return { ...point, showBubble }
  })
  
  return bubbles.map(bubble => {
    let adjustedBubble: BubblePoint = { ...bubble }
    
    if (bubble.profit < 0 && bubble.showBubble) {
      const bubbleBottom = bubble.y + 32
      if (bubbleBottom > bottomBoundary) {
        adjustedBubble.forceUpward = true
      }
    }
    
    return adjustedBubble
  })
})


function getClosestDataPoint(clientX: number): any {
  if (!chartRef.value || chartPoints.value.length === 0) return null
  
  const rect = chartRef.value.getBoundingClientRect()
  const svgX = ((clientX - rect.left) / rect.width) * chartWidth
  
  let closestPoint = chartPoints.value[0]
  let minDistance = Math.abs(svgX - chartPoints.value[0].x)
  
  for (const point of chartPoints.value) {
    const distance = Math.abs(svgX - point.x)
    if (distance < minDistance) {
      minDistance = distance
      closestPoint = point
    }
  }
  
  return closestPoint
}

function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    touchStartPos.value = { x: touch.clientX, y: touch.clientY }
    
    // 开始长按计时器
    longPressTimer.value = window.setTimeout(() => {
      // 长按时间到达，开始交互
      isInteracting.value = true
      updateInteraction(touch.clientX)
    }, longPressThreshold)
  }
}

function handleTouchMove(event: TouchEvent) {
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    
    // 检查是否移动距离过大
    if (touchStartPos.value) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.value.x)
      const deltaY = Math.abs(touch.clientY - touchStartPos.value.y)
      
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        // 移动距离过大，取消长按
        clearLongPressTimer()
        if (!isInteracting.value) {
          // 如果还没开始交互，则让事件继续传播用于页面滚动
          return
        }
      }
    }
    
    // 如果已经在交互状态，更新交互位置
    if (isInteracting.value) {
      event.preventDefault()
      updateInteraction(touch.clientX)
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  clearLongPressTimer()
  if (isInteracting.value) {
    event.preventDefault()
    endInteraction()
  }
}

function handleMouseDown(event: MouseEvent) {
  event.preventDefault()
  // 桌面端保持即时响应
  isInteracting.value = true
  updateInteraction(event.clientX)
}

function handleMouseMove(event: MouseEvent) {
  if (isInteracting.value) {
    updateInteraction(event.clientX)
  }
}

function handleMouseUp(event: MouseEvent) {
  endInteraction()
}

function handleMouseLeave(event: MouseEvent) {
  clearLongPressTimer()
  endInteraction()
}

function clearLongPressTimer() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

function handleGameItemTouchStart(event: TouchEvent, game: any) {
  const touch = event.touches[0]
  const gameId = game.id.toString()
  
  touchData[gameId] = {
    startX: touch.clientX,
    startY: touch.clientY,
    currentX: touch.clientX,
    isDragging: false,
    translateX: 0
  }
}

function handleGameItemTouchMove(event: TouchEvent, game: any) {
  const touch = event.touches[0]
  const gameId = game.id.toString()
  
  if (!touchData[gameId]) return
  
  const deltaX = touch.clientX - touchData[gameId].startX
  const deltaY = touch.clientY - touchData[gameId].startY
  const isSwiped = swipedItems[gameId] // 检查删除按钮是否已经滑开
  const isDetailSwiped = detailSwipedItems[gameId] // 检查详情按钮是否已经滑开
  
  if (!touchData[gameId].isDragging) {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    let shouldStartDragging = false
    
    if (isSwiped) {
      shouldStartDragging = (absX > 10 && absX > absY && deltaX > 3)
    } else if (isDetailSwiped) {
      shouldStartDragging = (absX > 10 && absX > absY && deltaX < -3)
    } else {
      shouldStartDragging = (absX > 10 && absX > absY && (deltaX < -3 || deltaX > 3))
    }
    
    if (shouldStartDragging) {
      touchData[gameId].isDragging = true
      event.preventDefault()
      event.stopPropagation()
    } else if (absY > 15) {
      delete touchData[gameId]
      return
    } else {
      return
    }
  }
  
  if (touchData[gameId].isDragging) {
    event.preventDefault()
    event.stopPropagation()
    
    if (isSwiped) {
      touchData[gameId].translateX = Math.max(-70, Math.min(0, deltaX - 70))
    } else if (isDetailSwiped) {
      touchData[gameId].translateX = Math.max(0, Math.min(70, deltaX + 70))
    } else {
      touchData[gameId].translateX = deltaX
    }
    touchData[gameId].currentX = touch.clientX
  }
}

function handleGameItemTouchEnd(event: TouchEvent, game: any) {
  const gameId = game.id.toString()
  
  if (!touchData[gameId]) return
  
  if (touchData[gameId].isDragging) {
    event.preventDefault()
    event.stopPropagation()
    
    const isSwiped = swipedItems[gameId]
    const isDetailSwiped = detailSwipedItems[gameId]
    const translateX = touchData[gameId].translateX
    
    if (isSwiped) {
      const closeThreshold = -50
      if (translateX > closeThreshold) {
        swipedItems[gameId] = false
      }
    } else if (isDetailSwiped) {
      const closeThreshold = 50
      if (translateX < closeThreshold) {
        detailSwipedItems[gameId] = false
      }
    } else {
      if (translateX < -50) {
        closeAllSwipeExcept(gameId)
        swipedItems[gameId] = true
      } else if (translateX > 50) {
        closeAllSwipeExcept(gameId)
        detailSwipedItems[gameId] = true
      }
    }
  }
  
  delete touchData[gameId]
}

function getItemStyle(gameId: number) {
  return {}
}

function getGameInfoStyle(gameId: number) {
  const id = gameId.toString()
  const data = touchData[id]
  const isDetailSwiped = detailSwipedItems[id]
  
  if (data && data.isDragging) {
    if (isDetailSwiped) {
      const offset = Math.max(0, Math.min(70, 70 - data.translateX))
      return {
        transform: `translateX(${70 - offset}px)`,
        transition: 'none'
      }
    } else {
      if (data.translateX > 0) {
        const offset = Math.min(70, data.translateX)
        return {
          transform: `translateX(${offset}px)`,
          transition: 'none'
        }
      } else {
        return {
          transform: 'translateX(0)',
          transition: 'none'
        }
      }
    }
  } else if (isDetailSwiped) {
    return {
      transform: 'translateX(70px)',
      transition: 'transform 0.3s ease'
    }
  } else {
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.3s ease'
    }
  }
}

function getGameResultStyle(gameId: number) {
  const id = gameId.toString()
  const data = touchData[id]
  const isSwiped = swipedItems[id]
  const isDetailSwiped = detailSwipedItems[id]
  
  if (data && data.isDragging) {
    if (isSwiped) {
      const offset = Math.max(0, Math.min(70, data.translateX + 70))
      return {
        transform: `translateX(-${70 - offset}px)`,
        transition: 'none'
      }
    } else if (isDetailSwiped) {
      return {
        transform: 'translateX(0)',
        transition: 'none'
      }
    } else {
      if (data.translateX < 0) {
        const offset = Math.min(70, Math.abs(data.translateX))
        return {
          transform: `translateX(-${offset}px)`,
          transition: 'none'
        }
      } else {
        return {
          transform: 'translateX(0)',
          transition: 'none'
        }
      }
    }
  } else if (isSwiped) {
    return {
      transform: 'translateX(-70px)',
      transition: 'transform 0.3s ease'
    }
  } else if (isDetailSwiped) {
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.3s ease'
    }
  } else {
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.3s ease'
    }
  }
}

function getDetailActionStyle(gameId: number) {
  const id = gameId.toString()
  const data = touchData[id]
  const isDetailSwiped = detailSwipedItems[id]
  const isSwiped = swipedItems[id]
  
  if (data && data.isDragging) {
    if (isDetailSwiped) {
      const progress = Math.max(0, Math.min(70, 70 - data.translateX))
      return {
        transform: `translateX(-${progress}px)`,
        transition: 'none'
      }
    } else if (isSwiped) {
      return {
        transform: 'translateX(-70px)',
        transition: 'transform 0.3s ease'
      }
    } else {
      if (data.translateX > 0) {
        const progress = Math.min(70, data.translateX)
        return {
          transform: `translateX(-${70 - progress}px)`,
          transition: 'none'
        }
      } else {
        return {
          transform: 'translateX(-70px)',
          transition: 'none'
        }
      }
    }
  } else if (isDetailSwiped) {
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.3s ease'
    }
  } else {
    return {
      transform: 'translateX(-70px)',
      transition: 'transform 0.3s ease'
    }
  }
}

function getDeleteActionStyle(gameId: number) {
  const id = gameId.toString()
  const data = touchData[id]
  const isSwiped = swipedItems[id]
  const isDetailSwiped = detailSwipedItems[id]
  
  if (data && data.isDragging) {
    if (isSwiped) {
      const progress = Math.max(0, Math.min(70, data.translateX + 70))
      return {
        transform: `translateX(${progress}px)`,
        transition: 'none'
      }
    } else if (isDetailSwiped) {
      return {
        transform: 'translateX(70px)',
        transition: 'transform 0.3s ease'
      }
    } else {
      if (data.translateX < 0) {
        const progress = Math.min(70, Math.abs(data.translateX))
        return {
          transform: `translateX(${70 - progress}px)`,
          transition: 'none'
        }
      } else {
        return {
          transform: 'translateX(70px)',
          transition: 'none'
        }
      }
    }
  } else if (isSwiped) {
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.3s ease'
    }
  } else {
    return {
      transform: 'translateX(70px)',
      transition: 'transform 0.3s ease'
    }
  }
}

function calculateGameStats(game: any) {
  if (!game) return { profitPerHour: 0, bbPerHour: 0 }
  
  const duration = game.duration || 0
  const hours = duration / 60 || 1
  const profit = convertCurrency(game.profit, game.currency, userStore.preferredCurrency)
  const bigBlind = convertCurrency(game.big_blind, game.currency, userStore.preferredCurrency)
  
  const profitPerHour = profit / hours
  const bbPerHour = bigBlind > 0 ? (profit / bigBlind) / hours : 0
  
  return { profitPerHour, bbPerHour }
}

async function handleDetailClick(game: any) {
  // 显示游戏详情弹窗
  gameDetail.value = game
  showGameDetail.value = true
  gameDetailPlayers.value = []
  isLoadingPlayers.value = true
  
  
  try {
    // 加载房间的所有玩家数据
    const players = await api.getRoomPlayers(game.room_id)
    
    // 按盈亏排序：赢->平->输
    const sortedPlayers = players.sort((a, b) => {
      if (a.profit > 0 && b.profit <= 0) return -1
      if (a.profit <= 0 && b.profit > 0) return 1
      if (a.profit === 0 && b.profit < 0) return -1
      if (a.profit < 0 && b.profit === 0) return 1
      return b.profit - a.profit // 同类型内按盈亏从高到低
    })
    
    gameDetailPlayers.value = sortedPlayers
  } catch (error) {
    console.error('Failed to load players:', error)
    gameDetailPlayers.value = []
  } finally {
    isLoadingPlayers.value = false
  }
}

function closeGameDetail() {
  showGameDetail.value = false
  gameDetail.value = null
}

function getProfitClass(profit: number | null) {
  if (profit === null) return 'neutral'
  if (profit > 0) return 'positive'
  if (profit < 0) return 'negative'
  return 'neutral'
}

function formatCurrencyDisplay(amount: number): string {
  const symbol = userStore.preferredCurrency === 'CAD' ? '$' : '¥'
  const absAmount = Math.abs(amount)
  
  if (amount < 0) {
    return `-${symbol}${absAmount}`
  } else {
    return `${symbol}${absAmount}`
  }
}

function formatNumberDisplay(amount: number): string {
  if (amount < 0) {
    return `-${Math.abs(amount)}`
  } else {
    return `${amount}`
  }
}

function calculateHourlyProfit(player: any): number {
  if (!player.joined_at || !gameDetail.value?.settled_at || !player.profit) return 0
  
  const joinedTime = new Date(player.joined_at)
  const settledTime = new Date(gameDetail.value.settled_at)
  const diffMs = settledTime.getTime() - joinedTime.getTime()
  
  if (diffMs <= 0) return 0
  
  const hours = diffMs / (1000 * 60 * 60)
  return player.profit / hours
}

function calculateHourlyBBProfit(player: any): number {
  if (!player.joined_at || !gameDetail.value?.settled_at || !gameDetail.value?.big_blind) return 0
  
  const joinedTime = new Date(player.joined_at)
  const settledTime = new Date(gameDetail.value.settled_at)
  const diffMs = settledTime.getTime() - joinedTime.getTime()
  
  if (diffMs <= 0) return 0
  
  const hours = diffMs / (1000 * 60 * 60)
  const chipProfit = player.final_chips - (player.hands * gameDetail.value.chips_per_hand)
  const bbProfit = chipProfit / gameDetail.value.big_blind
  return bbProfit / hours
}

function calculatePlayerDuration(player: any): string {
  try {
    if (!player.joined_at || !gameDetail.value?.settled_at) {
      return '--'
    }

    const joinedTime = new Date(player.joined_at)
    const settledTime = new Date(gameDetail.value.settled_at)
    const diffMs = settledTime.getTime() - joinedTime.getTime()
    
    if (diffMs < 0) return '--'
    
    const hours = diffMs / (1000 * 60 * 60)
    
    if (hours < 1) {
      const minutes = Math.round(diffMs / (1000 * 60))
      return `${minutes}分`
    } else {
      const wholeHours = Math.floor(hours)
      const remainingMinutes = Math.round((hours - wholeHours) * 60)
      
      if (remainingMinutes === 0) {
        return `${wholeHours}h`
      } else {
        return `${wholeHours}h${remainingMinutes}m`
      }
    }
  } catch (error) {
    console.error('计算玩家时长失败:', error)
    return '--'
  }
}

function confirmDeleteRecord(game: any) {
  recordToDelete.value = game
  showDeleteConfirm.value = true
}

async function deleteRecord() {
  if (!recordToDelete.value || isDeleting.value) return
  
  const gameId = recordToDelete.value.id.toString()
  isDeleting.value = true
  
  try {
    await api.deleteRecord(recordToDelete.value.id, userStore.userId)
    
    await Promise.all([
      loadUserStats(),
      loadRecentGames()
    ])
    
    delete swipedItems[gameId]
    delete touchData[gameId]
    
    showDeleteConfirm.value = false
    recordToDelete.value = null
    
  } catch (error) {
    console.error('删除记录失败:', error)
  } finally {
    isDeleting.value = false
  }
}

function cancelDeleteRecord() {
  const gameId = recordToDelete.value?.id?.toString()
  if (gameId) {
    swipedItems[gameId] = false
  }
  
  showDeleteConfirm.value = false
  recordToDelete.value = null
}

function resetAllSwipeStates() {
  Object.keys(swipedItems).forEach(gameId => {
    swipedItems[gameId] = false
  })
  Object.keys(detailSwipedItems).forEach(gameId => {
    detailSwipedItems[gameId] = false
  })
  Object.keys(touchData).forEach(gameId => {
    delete touchData[gameId]
  })
}

function closeAllSwipeExcept(exceptGameId: string) {
  Object.keys(swipedItems).forEach(gameId => {
    if (gameId !== exceptGameId) {
      swipedItems[gameId] = false
      if (touchData[gameId]) {
        delete touchData[gameId]
      }
    }
  })
  
  Object.keys(detailSwipedItems).forEach(gameId => {
    if (gameId !== exceptGameId) {
      detailSwipedItems[gameId] = false
      if (touchData[gameId]) {
        delete touchData[gameId]
      }
    }
  })
}

function handleGameItemClick(game: any) {
  const gameId = game.id.toString()
  
  if (swipedItems[gameId]) {
    swipedItems[gameId] = false
  } else {
    resetAllSwipeStates()
  }
}

function handleGamesListClick(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.delete-btn') && !target.closest('.game-item')) {
    resetAllSwipeStates()
  }
}

function updateInteraction(clientX: number) {
  if (!chartRef.value) return
  
  const rect = chartRef.value.getBoundingClientRect()
  const svgX = ((clientX - rect.left) / rect.width) * chartWidth
  
  const constrainedX = Math.max(chartPaddingX, Math.min(svgX, chartWidth - chartPaddingRight))
  
  interactionPoint.value = { x: constrainedX, y: 0 }
  selectedDataPoint.value = getClosestDataPoint(clientX)
}

function endInteraction() {
  clearLongPressTimer()
  isInteracting.value = false
  interactionPoint.value = null
  selectedDataPoint.value = null
  touchStartPos.value = null
}

function formatInteractionDate(game: any): string {
  const dateField = game.joined_at || game.created_at || game.createdAt
  const date = new Date(dateField)
  
  if (isNaN(date.getTime())) return 'N/A'
  
  const year = date.getFullYear().toString().slice(-2)
  return `${year}/${date.getMonth() + 1}/${date.getDate()}`
}

function formatInteractionValue(profit: number): string {
  const roundedProfit = Math.round(profit * 100) / 100 // 保留两位小数
  
  switch (chartMode.value) {
    case 'profitPerHour':
      return formatProfitWithCurrencyFourDigits(roundedProfit)
    case 'bbPerHour':
      const formattedBB = formatNumberFourDigits(Math.abs(roundedProfit))
      if (roundedProfit >= 0) {
        return formattedBB
      } else {
        return `-${formattedBB}`
      }
    case 'totalProfit':
      return formatProfitWithCurrencyFourDigits(roundedProfit)
    case 'profit':
    default:
      return formatProfitWithCurrencyFourDigits(roundedProfit)
  }
}

function formatProfitWithCurrencyOneDecimal(profit: number): string {
  const currency = userStore.preferredCurrency || 'CAD'
  const symbol = currency === 'CAD' ? '$' : '¥'
  
  if (profit > 0) {
    if (profit.toFixed(1).endsWith('.0')) {
      return `${symbol}${Math.round(profit)}`
    } else {
      return `${symbol}${profit.toFixed(1)}`
    }
  } else if (profit < 0) {
    const absProfit = Math.abs(profit)
    if (absProfit.toFixed(1).endsWith('.0')) {
      return `-${symbol}${Math.round(absProfit)}`
    } else {
      return `-${symbol}${absProfit.toFixed(1)}`
    }
  } else {
    return `${symbol}0`
  }
}

function formatProfitWithCurrencyPrecise(profit: number): string {
  const currency = userStore.preferredCurrency || 'CAD'
  const symbol = currency === 'CAD' ? '$' : '¥'
  
  const formattedNumber = formatLargeNumberPrecise(profit)
  
  if (profit > 0) {
    return `${symbol}${formattedNumber}`
  } else if (profit < 0) {
    return `-${symbol}${formattedNumber}`
  } else {
    return `${symbol}0`
  }
}

function getBubbleWidth(dataPoint: any): number {
  if (!dataPoint) return 80
  
  const dateText = formatInteractionDate(dataPoint.game)
  const valueText = formatInteractionValue(dataPoint.profit)
  
  const dateWidth = dateText.length * 6
  const valueWidth = valueText.length * 7.5
  const maxTextWidth = Math.max(dateWidth, valueWidth)
  const bubbleWidth = maxTextWidth + 24
  return Math.max(60, Math.min(bubbleWidth, 160))
}

async function startEditNickname() {
  editingNickname.value = true
  tempNickname.value = userStore.nickname || ''
  await nextTick()
  if (nicknameInput.value) {
    nicknameInput.value.focus()
    nicknameInput.value.select()
    
    setTimeout(() => {
      if (nicknameInput.value) {
        nicknameInput.value.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
      }
    }, 300)
  }
}

async function saveNickname() {
  if (tempNickname.value.trim()) {
    try {
      await userStore.updateNickname(tempNickname.value.trim())
    } catch (error: any) {
      console.error('更新昵称失败:', error)
      
      // 根据错误类型显示不同的错误信息
      let errorMessage = t('messages.nicknameUpdateFailed')
      
      if (error.message?.includes('昵称不能为空')) {
        errorMessage = '昵称不能为空'
      } else if (error.message?.includes('昵称长度不能超过')) {
        errorMessage = '昵称长度不能超过20个字符'
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || '昵称格式不正确'
      } else if (error.response?.status >= 500 || error.message?.includes('网络')) {
        errorMessage = '网络错误，昵称已在本地保存，请稍后重试同步到服务器'
      }
      
      alert(errorMessage)
    }
  }
  editingNickname.value = false
}

function formatProfit(profit: number): string {
  return `${profit}`
}

function formatProfitWithCurrency(profit: number): string {
  const symbol = userStore.preferredCurrency === 'CAD' ? '$' : '¥'
  
  // 确保显示一位小数，但整数不显示.0
  const rounded = Math.round(profit * 10) / 10
  const absRounded = Math.abs(rounded)
  const formattedValue = absRounded.toFixed(1).endsWith('.0') ? 
    Math.round(absRounded).toString() : 
    absRounded.toFixed(1)
  
  if (profit > 0) return `${symbol}${formattedValue}`
  if (profit < 0) return `-${symbol}${formattedValue}`
  return `${symbol}${formattedValue}`
}

function formatGameDate(dateString: string): string {
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) return 'N/A'
  
  // 统一显示年月日格式 - 使用本地时区
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    timeZone: undefined // 使用本地时区
  })
}

function formatDetailedDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadUserStats() {
  try {
    const stats = await userStore.getUserStats()
    // 确保所有字段都有值，使用默认值补充缺失的字段
    userStats.value = {
      totalGames: stats.totalGames || 0,
      totalProfit: stats.totalProfit || 0,
      winGames: stats.winGames || 0,
      drawGames: stats.drawGames || 0,
      totalHours: stats.totalHours || 0,
      bbPerHour: stats.bbPerHour || 0
    }
  } catch (error) {
    console.error('加载用户统计失败:', error)
  }
}

async function loadRecentGames() {
  try {
    const games = await userStore.getAllGames() // 获取所有游戏记录以支持图表
    
    // 根据用户偏好货币转换profit值并检查是否可以删除
    const convertedGames = await Promise.all(games.map(async game => {
      const convertedProfit = convertCurrency(game.profit || 0, game.currency || 'CAD', userStore.preferredCurrency)
      
      // 检查是否可以删除
      let canDelete = false
      try {
        const deleteCheck = await api.canDeleteRecord(game.id, userStore.userId)
        canDelete = deleteCheck.canDelete
      } catch (error) {
        console.warn(`检查记录 ${game.id} 是否可删除失败:`, error)
      }
      
      return {
        ...game,
        profit: convertedProfit,
        canDelete
      }
    }))
    
    recentGames.value = convertedGames
  } catch (error) {
    console.error('加载最近游戏失败:', error)
  }
}

// 前端货币转换函数（与后端逻辑保持一致）
function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const EXCHANGE_RATES = {
    CAD_TO_RMB: 5.2,
    RMB_TO_CAD: 1 / 5.2
  }

  if (fromCurrency === 'CAD' && toCurrency === 'RMB') {
    return Number((amount * EXCHANGE_RATES.CAD_TO_RMB).toFixed(2))
  } else if (fromCurrency === 'RMB' && toCurrency === 'CAD') {
    return Number((amount * EXCHANGE_RATES.RMB_TO_CAD).toFixed(2))
  }

  return amount // 默认不转换
}

// 格式化气泡显示的数值
function formatBubbleValue(profit: number): string {
  const symbol = userStore.preferredCurrency === 'CAD' ? '$' : '¥'
  
  // 根据图表模式调整显示格式
  switch (chartMode.value) {
    case 'bbPerHour':
      // BB/小时模式，使用四位数字规则
      const formattedBB = formatNumberFourDigits(Math.abs(profit))
      if (profit >= 0) return formattedBB
      return `-${formattedBB}`
    
    case 'profitPerHour':
      // 每小时盈亏，使用四位数字规则
      return formatProfitWithCurrencyFourDigits(profit)
    
    case 'totalProfit':
    case 'profit':
    default:
      // 盈亏模式，使用四位数字规则
      return formatProfitWithCurrencyFourDigits(profit)
  }
}

function formatLargeNumber(value: number): string {
  const absValue = Math.abs(value)
  
  if (absValue < 1520) {
    return Math.round(absValue).toString()
  } else if (absValue < 1000000) {
    const thousands = absValue / 1000
    return (Math.round(thousands * 10) / 10).toFixed(1).replace('.0', '') + 'k'
  } else if (absValue < 1000000000) {
    const millions = absValue / 1000000
    return (Math.round(millions * 10) / 10).toFixed(1).replace('.0', '') + 'M'
  } else {
    const billions = absValue / 1000000000
    return (Math.round(billions * 10) / 10).toFixed(1).replace('.0', '') + 'B'
  }
}

function formatLargeNumberPrecise(value: number): string {
  const absValue = Math.abs(value)
  
  if (absValue < 1520) {
    const rounded = Math.round(absValue * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '')
  } else if (absValue < 1000000) {
    const thousands = absValue / 1000
    const rounded = Math.round(thousands * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '') + 'k'
  } else if (absValue < 1000000000) {
    const millions = absValue / 1000000
    const rounded = Math.round(millions * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '') + 'M'
  } else {
    const billions = absValue / 1000000000
    const rounded = Math.round(billions * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '') + 'B'
  }
}

function formatNumberFourDigits(value: number): string {
  const absValue = Math.abs(value)
  
  if (absValue < 10000) {
    const rounded = Math.round(absValue * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '')
  } else if (absValue < 1000000) {
    const thousands = absValue / 1000
    const rounded = Math.round(thousands * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '') + 'K'
  } else if (absValue < 1000000000) {
    const millions = absValue / 1000000
    const rounded = Math.round(millions * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '') + 'M'
  } else {
    const billions = absValue / 1000000000
    const rounded = Math.round(billions * 100) / 100
    return rounded.toFixed(2).replace(/\.?0+$/, '') + 'B'
  }
}

function formatProfitWithCurrencyFourDigits(profit: number): string {
  const currency = userStore.preferredCurrency || 'CAD'
  const symbol = currency === 'CAD' ? '$' : '¥'
  
  const formattedNumber = formatNumberFourDigits(Math.abs(profit))
  
  if (profit > 0) {
    return `${symbol}${formattedNumber}`
  } else if (profit < 0) {
    return `-${symbol}${formattedNumber}`
  } else {
    return `${symbol}0`
  }
}

function formatBubbleValueSimple(profit: number): string {
  switch (chartMode.value) {
    case 'bbPerHour':
      return formatNumberFourDigits(Math.abs(profit))
    
    case 'profitPerHour':
    case 'totalProfit':
    case 'profit':
    default:
      return formatNumberFourDigits(Math.abs(profit))
  }
}

// 添加记录相关状态
const showAddRecordDialog = ref(false)
const showDateMask = ref(false)
const showConfirmDialog = ref(false)
const addRecordForm = ref({
  date: new Date().toLocaleDateString('sv-SE'), // 默认今天，格式: YYYY-MM-DD，使用瑞典格式避免时区问题
  duration: 2.0, // 默认2小时
  chipsPerHand: 1000,
  bigBlind: 10,
  costPerHand: 20,
  currency: 'CAD' as 'CAD' | 'RMB',
  hands: 1,
  finalChips: 1000
})

// 显示添加记录弹窗
function showAddRecord() {
  showAddRecordDialog.value = true
}

// 关闭添加记录弹窗
function closeAddRecord() {
  showAddRecordDialog.value = false
}

// 切换货币
function toggleCurrency() {
  addRecordForm.value.currency = addRecordForm.value.currency === 'CAD' ? 'RMB' : 'CAD'
}

function validateDuration(event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value
  
  if (value.includes('.')) {
    const parts = value.split('.')
    if (parts[1] && parts[1].length > 1) {
      value = parts[0] + '.' + parts[1].charAt(0)
      input.value = value
      addRecordForm.value.duration = parseFloat(value)
    }
  }
}

// 通用输入框焦点处理（键盘处理）
function handleInputFocus(event: Event) {
  const input = event.target as HTMLInputElement
  if (input) {
    input.select() // 选择全部内容
    
    setTimeout(() => {
      input.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })
    }, 300)
  }
}

function handleInputBlur(event: Event) {
  // 保持用户当前的滚动位置
}

// 处理日期输入框焦点
function onDateInputFocus() {
  setTimeout(() => {
    showDateMask.value = true
  }, 100)
  
  setTimeout(() => {
    const dateInput = document.querySelector('.borderless-date-input') as HTMLInputElement
    if (dateInput) {
      dateInput.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })
    }
  }, 300)
}

function onDateInputBlur() {
  showDateMask.value = false
}

// 显示确认对话框
function showConfirm() {
  showConfirmDialog.value = true
}

// 提交添加记录
async function submitAddRecord() {
  try {
    
    const response = await userStore.addManualRecord(addRecordForm.value)
    if (response.success) {
      // 成功后刷新数据
      await loadUserStats()
      await loadRecentGames()
      
      // 重置到第一页
      currentPage.value = 1
      
      // 关闭所有弹窗
      showConfirmDialog.value = false
      closeAddRecord()
      
      // 等待DOM更新后滚动到顶部
      await nextTick()
      window.scrollTo(0, 0)
      
      // 强制重新计算页面布局
      setTimeout(() => {
        const element = document.querySelector('.profile-view') as HTMLElement
        if (element) {
          element.style.transform = 'translateZ(0)'
          requestAnimationFrame(() => {
            element.style.transform = ''
          })
        }
        window.scrollTo(0, 0)
      }, 100)
      
    }
  } catch (error) {
    console.error('添加记录失败:', error)
  }
}


// 货币偏好循环切换
async function cycleCurrency() {
  const currencies: ('CAD' | 'RMB')[] = ['CAD', 'RMB']
  const currentIndex = currencies.indexOf(userStore.preferredCurrency)
  const nextIndex = (currentIndex + 1) % currencies.length
  userStore.updatePreferredCurrency(currencies[nextIndex])
  
  // 货币切换后重新加载统计数据和趋势图数据
  await loadUserStats()
  await loadRecentGames()
}

// 语言偏好循环切换
function cycleLanguage() {
  const languages: ('zh' | 'en')[] = ['zh', 'en']
  const currentIndex = languages.indexOf(userStore.preferredLanguage)
  const nextIndex = (currentIndex + 1) % languages.length
  const nextLanguage = languages[nextIndex]
  
  // 同时更新 userStore 和 i18n 系统
  userStore.updatePreferredLanguage(nextLanguage)
  setLanguage(nextLanguage)
}

// 获取货币显示文本
function getCurrencyDisplay(): string {
  return userStore.preferredCurrency === 'CAD' ? 'CAD($)' : 'RMB(¥)'
}

// 获取语言显示文本
function getLanguageDisplay(): string {
  return userStore.preferredLanguage === 'zh' ? '中文' : 'English'
}

// 生命周期
onMounted(async () => {
  // 确保恢复用户状态（包括语言偏好）
  userStore.restoreUserState()
  
  // 确保用户已初始化
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }
  
  await loadUserStats()
  await loadRecentGames()
})
</script>

<style scoped>
.profile-view {
  background-color: #f5f5f5;
  padding: 15px;
  padding-bottom: 5px !important; /* Ensure bottom space for navbar */
  /* Ensure proper content flow */
  overflow: visible;
}

/* 用户信息卡片 */
.user-info-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.user-details {
  flex: 1;
}

.preference-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preference-btn {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 85px;
  height: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preference-btn:active {
  transform: scale(0.95);
  background: #0056b3;
}

.username-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.username {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  border-bottom: 1px dashed transparent;
  transition: border-color 0.2s ease;
}

.username:hover {
  border-bottom-color: #ccc;
}

.nickname-input {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  border: none;
  outline: none;
  background: transparent;
  border-bottom: 2px solid #007bff;
  padding: 2px 0;
  width: 150px;
}

.edit-icon {
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.edit-icon:hover {
  opacity: 1;
}

.user-id {
  font-size: 12px;
  color: #8e8e93;
}

/* 统计数据网格 */
/* 旧布局 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

/* 新统计网格布局 */
.stats-grid-new {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
  height: 200px;
  width: 100%;
  min-width: 0; /* 防止内容撑大网格 */
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.stat-value {
  font-size: clamp(14px, 4vw, 20px); /* 响应式字体大小 */
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.stat-value.positive {
  color: #27ae60;
}

.stat-value.negative {
  color: #ff1744;
}

/* 环形胜率图 */
.win-rate-circle {
  grid-row: 1 / 3; /* 占两行 */
  grid-column: 2; /* 中间列 */
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center; /* 改为居中 */
  align-items: center;
  gap: 12px; /* 增加间距 */
}

.games-count {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin: 0; /* 移除边距 */
}

.circle-container {
  position: relative;
  flex: 0 0 auto; /* 不拉伸 */
}

.circle-chart {
  width: 100px;
  height: 100px;
}

.win-rate-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.rate-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.rate-label-external {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  margin: 0; /* 移除自动边距 */
}


.stat-label {
  font-size: clamp(10px, 3vw, 12px); /* 响应式字体大小 */
  color: #8e8e93;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
  overflow: hidden;
  max-width: 100%;
  white-space: normal; /* 允许换行 */
  line-height: 1.3;
}

/* 最近游戏部分 */
.recent-games-section {
  margin-bottom: 10px;
}

/* 趋势图容器 */
.trend-chart-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.trend-chart {
  width: 100%;
  height: 200px;
  overflow: visible;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* 占位符样式 */
.no-chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.placeholder-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 14px;
  color: #333;
  margin: 0 0 4px 0;
  font-weight: 500;
}

.placeholder-subtext {
  font-size: 12px;
  color: #8e8e93;
  margin: 0;
  font-weight: 400;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.add-record-btn {
  background: #ff9800;
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  transition: background 0.2s ease;
}

.add-record-btn:active {
  background: #f57c00;
}

/* 图表切换按钮 */
.chart-toggle-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  margin-top: 16px;
  margin-bottom: 20px;
  width: 100%;
}

.chart-toggle-btn {
  background: white;
  border: 1px solid #dee2e6;
  color: #007bff;
  font-size: 12px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
}

.chart-toggle-btn:active {
  background: #f8f9fa;
}

.chart-toggle-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}


.games-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.game-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.game-item:last-child {
  border-bottom: none;
}

.game-item.detailed {
  align-items: flex-start;
  padding: 16px;
}

.game-info {
  flex: 1;
}

.game-date {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.game-details {
  font-size: 12px;
  color: #8e8e93;
}

.game-item.detailed .game-details div {
  margin-bottom: 2px;
}

.game-result {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
}

.game-result.positive {
  color: #27ae60;
}

.game-result.negative {
  color: #ff1744;
}

.game-result.neutral {
  color: #FF9800;
}

/* 翻页控件 */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  background: white;
}

.pagination-btn {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled) {
  background: #0056b3;
}

.pagination-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.pagination-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.pagination-info {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  min-width: 40px;
  text-align: center;
}

/* 自定义双箭头 */
.double-arrow-left,
.double-arrow-right {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 16px;
}

.double-arrow-left::before,
.double-arrow-left::after,
.double-arrow-right::before,
.double-arrow-right::after {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

/* 左双箭头 */
.double-arrow-left::before {
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 5px 7px 5px 0;
  border-color: transparent currentColor transparent transparent;
}

.double-arrow-left::after {
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 5px 7px 5px 0;
  border-color: transparent currentColor transparent transparent;
}

/* 右双箭头 */
.double-arrow-right::before {
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 5px 0 5px 7px;
  border-color: transparent transparent transparent currentColor;
}

.double-arrow-right::after {
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 5px 0 5px 7px;
  border-color: transparent transparent transparent currentColor;
}

/* 滑动删除相关样式 */
.game-item-wrapper {
  position: relative;
  overflow: hidden;
}

.game-item-container {
  position: relative;
  display: flex;
  align-items: center;
}

.game-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: white;
  position: relative;
  z-index: 1;
  width: 100%;
}

.game-result-wrapper {
  position: relative;
  flex-shrink: 0;
}

.game-result {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex-shrink: 0;
}

.detail-actions {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px; /* 与删除按钮相同宽度 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #007bff; /* 蓝色 */
  z-index: 2;
  transform: translateX(-70px); /* 隐藏位置：左侧隐藏 */
  transition: transform 0.3s ease;
}

.detail-actions::after {
  content: '';
  position: absolute;
  right: -30px; /* 向右延伸30px (圆形半径) */
  top: 0;
  bottom: 0;
  width: 60px; /* 圆形直径等于按钮高度 */
  height: 100%; /* 与按钮高度一致 */
  background: #007bff; /* 蓝色 */
  border-radius: 50%; /* 完全圆形 */
  z-index: -1; /* 在按钮主体下方 */
}

.delete-actions {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px; /* 进一步缩小到40px */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dc3545;
  z-index: 2;
  transform: translateX(70px); /* 隐藏位置：40px矩形 + 30px圆形 = 70px */
  transition: transform 0.3s ease;
}

.delete-actions::before {
  content: '';
  position: absolute;
  left: -30px; /* 向左延伸30px (圆形半径) */
  top: 0;
  bottom: 0;
  width: 60px; /* 圆形直径等于按钮高度 */
  height: 100%; /* 与按钮高度一致 */
  background: #dc3545;
  border-radius: 50%; /* 完全圆形 */
  z-index: -1; /* 在按钮主体下方 */
}

/* 取消这个CSS规则，因为我们通过JavaScript动态控制样式 */

.detail-btn {
  background: transparent;
  color: transparent; /* 隐藏按钮内容 */
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0; /* 移除内边距 */
  border-radius: 4px;
  transition: all 0.2s ease;
  width: 100%;
  height: 100%;
}

.detail-text {
  position: absolute;
  left: 0;
  right: -25px; /* 向右延伸25px，覆盖圆形部分 */
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px; /* 与删除按钮相同字体大小 */
  font-weight: 600;
  pointer-events: none; /* 不阻挡按钮点击 */
  z-index: 1;
}

.delete-btn {
  background: transparent;
  color: transparent; /* 隐藏按钮内容 */
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0; /* 移除内边距 */
  border-radius: 4px;
  transition: all 0.2s ease;
  width: 100%;
  height: 100%;
}

.delete-text {
  position: absolute;
  left: -25px; /* 调整左边界，让文字整体靠左 */
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px; /* 缩小字体到12px */
  font-weight: 600;
  pointer-events: none; /* 不阻挡按钮点击 */
  z-index: 1;
}

.detail-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.delete-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.delete-btn:disabled,
.delete-btn.disabled {
  background: #6c757d;
  color: rgba(255, 255, 255, 0.6);
  cursor: not-allowed;
}


/* Settlement Dialog Styles (copied from App.vue) */
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

.game-date-header {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  white-space: nowrap;
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
  border-left: 4px solid transparent;
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
  border-left: 4px solid #ffc107;
}

.col-name {
  flex: 1.5;
  font-size: 11px;
  font-weight: 500;
  text-align: left;
}

.col-duration {
  flex: 0.8;
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  color: #666;
}

.col-avg-profit,
.col-profit,
.col-avg-bb {
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  text-align: right;
}

.col-avg-profit.positive,
.col-profit.positive,
.col-avg-bb.positive {
  color: #28a745;
}

.col-avg-profit.negative,
.col-profit.negative,
.col-avg-bb.negative {
  color: #dc3545;
}

.col-avg-profit.neutral,
.col-profit.neutral,
.col-avg-bb.neutral {
  color: #6c757d;
}


.loading-players {
  padding: 40px 20px;
  text-align: center;
}

.loading-text {
  color: #6c757d;
  font-size: 14px;
}

.no-players {
  padding: 40px 20px;
  text-align: center;
}

.no-data-text {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 8px;
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
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}


.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-weight: 500;
  color: #666;
  flex: 1;
}

.info-row .value {
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: right;
}

.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 24px 0;
}

.game-stats {
  margin-bottom: 0;
}

.stats-title, .settlement-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.players-settlement {
  margin-bottom: 0;
}

.settlement-note {
  padding: 12px 16px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  font-size: 14px;
  color: #1976d2;
}

.loading-players {
  text-align: center;
  padding: 32px 16px;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.players-list {
  margin-top: 16px;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: white;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.player-item.current-user {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border-color: #ffd700;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.player-item.winner {
  border-left: 4px solid #27ae60;
}

.player-item.loser {
  border-left: 4px solid #ff1744;
}

.player-item.neutral {
  border-left: 4px solid #FF9800;
}

.player-rank {
  font-size: 18px;
  font-weight: bold;
  color: #666;
  width: 32px;
  text-align: center;
  margin-right: 16px;
}

.player-item.current-user .player-rank {
  color: #b8860b;
}

.player-info {
  flex: 1;
  margin-right: 16px;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-item.current-user .player-name {
  color: #b8860b;
}

.you-tag {
  background: #b8860b;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

.player-details {
  font-size: 12px;
  color: #666;
}

.player-item.current-user .player-details {
  color: #8b7355;
}

.player-profit {
  text-align: right;
}

.profit-amount {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.profit-amount.positive {
  color: #27ae60;
}

.profit-amount.negative {
  color: #ff1744;
}

.profit-amount.neutral {
  color: #FF9800;
}

.player-item.current-user .profit-amount {
  color: #b8860b;
}

.chip-profit {
  font-size: 12px;
  color: #666;
}

.player-item.current-user .chip-profit {
  color: #8b7355;
}

.no-players {
  text-align: center;
  padding: 32px 16px;
}

.no-data-text {
  color: #999;
  font-size: 14px;
}

/* 删除确认弹窗样式 */
.confirm-dialog {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 350px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.confirm-header h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.confirm-content {
  margin-bottom: 24px;
}

.confirm-content p {
  margin: 0 0 12px 0;
  color: #666;
  text-align: center;
  line-height: 1.5;
}

.game-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  border-left: 4px solid #007bff;
}

.game-summary div:first-child {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.game-summary div:last-child {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-actions button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: #f8f9fa;
  color: #666;
}

.cancel-btn:hover {
  background: #e9ecef;
}

.confirm-actions .delete-btn {
  background: #dc3545;
  color: white;
}

.confirm-actions .delete-btn:hover {
  background: #c82333;
}

/* 操作按钮 */
.action-section {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  background: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn.danger {
  color: #ff4757;
}

.action-btn span:first-child {
  font-size: 20px;
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
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-content.large {
  max-width: 500px;
  max-height: 90vh;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e9ecef;
}

.dialog-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #8e8e93;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:active {
  background: #f0f0f0;
}

.dialog-body {
  padding: 20px 24px 24px;
}

/* 月度选择器 */
.month-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.month-selector select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.monthly-stats {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.monthly-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-item .label {
  font-size: 14px;
  color: #8e8e93;
}

.summary-item .value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.summary-item .value.positive {
  color: #27ae60;
}

.summary-item .value.negative {
  color: #ff1744;
}

/* 防止缩放 */
.dialog-overlay,
.action-btn,
.add-record-btn,
.chart-toggle-btn,
.edit-icon,
.username,
.close-btn,
.preference-btn {
  touch-action: manipulation;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.nickname-input {
  -webkit-user-select: text;
  user-select: text;
}

/* 添加记录弹窗样式 */
.modal-overlay {
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
  padding: 20px;
}

.add-record-modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.add-record-modal h2 {
  margin: 0 0 24px 0;
  text-align: center;
  color: #333;
  font-size: 20px;
  font-weight: 600;
}

.form-section {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-end;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  transition: all 0.2s;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

/* 日期输入包装器 */
.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

/* 无边框日期输入框 */
.borderless-date-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 16px 0 6px !important;
  height: 48px !important;
  line-height: 48px !important;
  font-size: clamp(12px, 4vw, 16px) !important;
  color: #333 !important;
  display: flex !important;
  align-items: center !important;
  cursor: pointer !important;
  width: 100% !important;
  flex: 1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
}

.borderless-date-input:focus {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* 隐藏原生日期选择器图标 */
.borderless-date-input::-webkit-calendar-picker-indicator {
  display: none;
  opacity: 0;
  width: 0;
  height: 0;
}

/* 自定义日历图标 */
.custom-calendar-icon {
  width: 18px;
  height: 18px;
  color: #333;
  cursor: pointer;
  pointer-events: none;
  flex-shrink: 0;
  margin-right: 8px;
}

/* 日期选择器内部文本样式 */
.borderless-date-input::-webkit-datetime-edit {
  padding: 0;
  line-height: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  font-size: clamp(12px, 4vw, 16px);
  white-space: nowrap;
  overflow: hidden;
}

.borderless-date-input::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 1;
}

.borderless-date-input::-webkit-datetime-edit-text,
.borderless-date-input::-webkit-datetime-edit-year-field,
.borderless-date-input::-webkit-datetime-edit-month-field,
.borderless-date-input::-webkit-datetime-edit-day-field {
  padding: 0 1px;
  font-size: clamp(12px, 4vw, 16px);
  line-height: 48px;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 1;
}

/* 日期标签特殊定位 */
.date-label {
  transform: translateY(2px);
}


/* 货币切换按钮 */
.currency-toggle {
  flex: 0 0 auto;
  min-width: 100px;
}

.currency-toggle-btn {
  width: 100%;
  height: 48px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: #ff9500;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.currency-toggle-btn:active {
  background: #e6850e;
  transform: scale(0.95);
}

.divider {
  height: 1px;
  background: #eee;
  margin: 20px 0;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.btn-confirm-single {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: #007bff;
  color: white;
}

.btn-confirm-single:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-confirm-single:active {
  transform: translateY(0);
}

/* 时长输入包装器 */
.duration-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
  padding: 0 16px;
}

/* 自定义时钟图标 */
.custom-clock-icon {
  width: 18px;
  height: 18px;
  color: #333;
  cursor: pointer;
  flex-shrink: 0;
  margin-right: 2px;
}

/* 无边框时长数字输入框 */
.borderless-duration-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  height: 48px !important;
  line-height: 48px !important;
  font-size: clamp(12px, 4vw, 16px) !important;
  color: #333 !important;
  cursor: pointer !important;
  width: 100% !important;
  flex: 1 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  font-weight: 500 !important;
}

.borderless-duration-input:focus {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* 隐藏数字输入框的上下箭头 */
.borderless-duration-input::-webkit-outer-spin-button,
.borderless-duration-input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  appearance: none !important;
  margin: 0 !important;
}

/* Firefox数字输入框样式 */
.borderless-duration-input[type=number] {
  -moz-appearance: textfield !important;
  appearance: textfield !important;
}

/* placeholder样式 */
.borderless-duration-input::placeholder {
  color: #999 !important;
  opacity: 0.6 !important;
}

/* 表单分割线 */
.form-divider {
  width: 100%;
  height: 1px;
  background-color: #e0e0e0;
  margin: 16px 0;
}

/* 日期选择器遮罩层 */
.date-mask-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  z-index: 9999;
  pointer-events: auto;
}

/* 底部确认对话框 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
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
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.confirm-message {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.confirm-actions {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.confirm-btn,
.cancel-btn {
  width: 100%;
  height: 50px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  border-bottom: 1px solid #f0f0f0;
}

.confirm-btn {
  background: white;
  color: #007bff;
  border-bottom: 1px solid #f0f0f0;
}

.cancel-btn {
  background: white;
  color: #666;
  border-bottom: none;
  border-radius: 0 0 16px 16px;
}

.confirm-btn:active {
  background: #f8f9fa;
  transform: scale(0.98);
}

.cancel-btn:active {
  background: #f8f9fa;
  transform: scale(0.98);
}

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

</style>
