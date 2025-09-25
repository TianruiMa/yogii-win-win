interface Player {
  id: number;
  nickname: string;
  hands: number;
  chips: number;
  profit: number;
  isAdmin: boolean;
}

Component({
  data: {
    currentChips: 1000,
    showAddSetsDialog: false,
    showQRDialog: false,
    currentPlayerIndex: -1,
    customSetsAmount: '',
    longPressTimer: null as any,
    longPressPlayerIndex: -1,
    longPressInterval: 500, // Initial interval in ms
    isTestMode: false, // Test mode for development
    currentAdminId: 1, // Current admin ID
    currentUserId: 1, // Current logged-in user ID (for testing purposes)
    isCurrentUserAdmin: true, // Computed: Whether current user has admin privileges
    editingPlayerId: -1, // ID of player being edited (-1 means none)
    editingPlayerName: '', // Temporary name being edited
    totalProfit: 0, // Total profit/loss
    totalUp: 0, // Expected chips from bank (all sets * per set)
    totalDown: 0, // Actual chips on table (sum of all player chips)
    finalResult: 0, // Final result: totalDown - totalUp
    players: [
      {
        id: 1,
        nickname: 'Bird',
        hands: 3,
        chips: 0,
        profit: 0,
        isAdmin: true
      },
      {
        id: 2,
        nickname: 'Rex',
        hands: 3,
        chips: 0,
        profit: 0,
        isAdmin: false
      },
      {
        id: 3,
        nickname: 'Keith',
        hands: 1,
        chips: 0,
        profit: 0,
        isAdmin: false
      },
      {
        id: 4,
        nickname: 'Gaojin',
        hands: 2,
        chips: 0,
        profit: 0,
        isAdmin: false
      },
      {
        id: 5,
        nickname: 'CL',
        hands: 2,
        chips: 0,
        profit: 0,
        isAdmin: false
      },
      {
        id: 6,
        nickname: 'Telensu',
        hands: 5,
        chips: 0,
        profit: 0,
        isAdmin: false
      },
      {
        id: 7,
        nickname: 'Toronto',
        hands: 1,
        chips: 0,
        profit: 0,
        isAdmin: false
      }
    ] as Player[]
  },

  methods: {

    // Adjust sets - down (-1)
    adjustHandsDown(e: any) {
      if (!this.isCurrentUserAdmin()) {
        return; // Admin only function
      }

      const index = e.currentTarget.dataset.index;
      const players = [...this.data.players];
      players[index].hands = Math.max(0, players[index].hands - 1);
      // Recalculate balance for this player
      players[index].profit = players[index].chips === 0 ? 0 : players[index].chips - (this.data.currentChips * players[index].hands);
      this.setData({ players });
      this.calculateStats();
    },

    // Adjust sets - up (+1)
    adjustHandsUp(e: any) {
      if (!this.isCurrentUserAdmin()) {
        return; // Admin only function
      }

      const index = e.currentTarget.dataset.index;
      const players = [...this.data.players];
      players[index].hands += 1;
      // Recalculate balance for this player
      players[index].profit = players[index].chips === 0 ? 0 : players[index].chips - (this.data.currentChips * players[index].hands);
      this.setData({ players });
      this.calculateStats();
    },

    // Adjust sets - show custom dialog
    adjustHandsDoubleUp(e: any) {
      if (!this.isCurrentUserAdmin()) {
        return; // Admin only function
      }

      const index = e.currentTarget.dataset.index;
      this.setData({
        showAddSetsDialog: true,
        currentPlayerIndex: index,
        customSetsAmount: ''
      });
    },

    // Helper method to add sets to player
    addSetsToPlayer(index: number, amount: number) {
      const players = [...this.data.players];
      players[index].hands += amount;
      // Recalculate balance for this player
      players[index].profit = players[index].chips === 0 ? 0 : players[index].chips - (this.data.currentChips * players[index].hands);
      this.setData({ players });
    },

    // Hide add sets dialog
    hideAddSetsDialog() {
      this.setData({
        showAddSetsDialog: false,
        currentPlayerIndex: -1,
        customSetsAmount: ''
      });
    },

    // Stop event propagation
    stopPropagation() {
      // This method is used to prevent event bubbling
      // The actual event stopping is handled by catchtap/catchfocus
    },

    // Start long press down (continuous decrement)
    startLongPressDown(e: any) {
      if (!this.isCurrentUserAdmin()) {
        return; // Admin only function
      }

      const index = e.currentTarget.dataset.index;
      this.setData({
        longPressPlayerIndex: index,
        longPressInterval: 500 // Reset to initial speed
      });
      
      // Start the continuous decrement
      this.continuousDecrement();
    },

    // Stop long press
    stopLongPress() {
      if (this.data.longPressTimer) {
        clearTimeout(this.data.longPressTimer);
        this.setData({
          longPressTimer: null,
          longPressPlayerIndex: -1,
          longPressInterval: 500
        });
      }
    },

    // Continuous decrement with accelerating speed
    continuousDecrement() {
      if (this.data.longPressPlayerIndex >= 0) {
        // Perform decrement
        const index = this.data.longPressPlayerIndex;
        const players = [...this.data.players];
        if (players[index].hands > 0) {
          players[index].hands = Math.max(0, players[index].hands - 1);
          // Recalculate balance for this player
          players[index].profit = players[index].chips === 0 ? 0 : players[index].chips - (this.data.currentChips * players[index].hands);
          this.setData({ players });
        }

        // Schedule next decrement with faster speed
        const newInterval = Math.max(100, this.data.longPressInterval * 0.85); // Speed up by 15% each time, minimum 100ms
        this.setData({ longPressInterval: newInterval });

        const timer = setTimeout(() => {
          this.continuousDecrement();
        }, newInterval);

        this.setData({ longPressTimer: timer });
      }
    },

    // Quick add sets (from buttons)
    addQuickSets(e: any) {
      const amount = parseInt(e.currentTarget.dataset.amount) || 0;
      if (amount > 0 && this.data.currentPlayerIndex >= 0) {
        this.addSetsToPlayer(this.data.currentPlayerIndex, amount);
        this.hideAddSetsDialog();
      }
    },

    // Handle custom sets input
    onCustomSetsInput(e: any) {
      let value = e.detail.value;
      // Remove any non-digit characters
      value = value.replace(/[^0-9]/g, '');
      // Limit to reasonable range (1-999)
      if (value.length > 3) {
        value = value.slice(0, 3);
      }
      this.setData({
        customSetsAmount: value
      });
    },

    // Confirm add custom sets
    confirmAddSets() {
      const amount = parseInt(this.data.customSetsAmount) || 0;
      if (amount > 0 && this.data.currentPlayerIndex >= 0) {
        this.addSetsToPlayer(this.data.currentPlayerIndex, amount);
        this.hideAddSetsDialog();
      } else if (amount <= 0) {
        wx.showToast({
          title: 'Please enter a valid amount',
          icon: 'none'
        });
      } else {
        this.hideAddSetsDialog();
      }
    },

    // Input remaining points
    onChipsInput(e: any) {
      const index = e.currentTarget.dataset.index;
      const inputValue = e.detail.value;
      const players = [...this.data.players];
      
      if (inputValue === '' || inputValue === null || inputValue === undefined) {
        // Empty input - set chips to 0 and balance to 0
        players[index].chips = 0;
        players[index].profit = 0;
      } else {
        // Check if input is a valid number
        const numericValue = parseInt(inputValue);
        if (isNaN(numericValue) || inputValue.trim() === '') {
          // Invalid input - set chips to 0 and balance to 0
          players[index].chips = 0;
          players[index].profit = 0;
        } else {
          // Valid number input - calculate normally
          players[index].chips = numericValue;
          players[index].profit = numericValue - (this.data.currentChips * players[index].hands);
        }
      }
      
      this.setData({ players });
      this.calculateStats();
    },

    // Handle current per set amount change
    onChipsAmountChange(e: any) {
      const newAmount = parseInt(e.detail.value) || 0;
      if (newAmount >= 0) {
        // Update current points amount
        this.setData({ currentChips: newAmount });
        
        // Recalculate all players' balance
        const players = this.data.players.map(player => ({
          ...player,
          profit: player.chips === 0 ? 0 : player.chips - (newAmount * player.hands)
        }));
        this.setData({ players });
        this.calculateStats();
      }
    },

    // Clear all data
    clearData() {
      wx.showModal({
        title: 'Confirm Clear',
        content: 'Are you sure you want to clear all data?',
        success: (res) => {
          if (res.confirm) {
            const players = this.data.players.map(player => ({
              ...player,
              hands: 0,
              chips: 0,
              profit: 0
            }));
            this.setData({ players });
          }
        }
      });
    },

    // Add player manually
    addPlayer() {
      wx.showModal({
        title: 'Add Player',
        content: '',
        editable: true,
        placeholderText: 'Enter player nickname',
        success: (res) => {
          if (res.confirm && res.content) {
            const players = [...this.data.players];
             const newPlayer: Player = {
               id: Date.now(),
               nickname: res.content,
               hands: 0,
               chips: 0,
               profit: 0,
               isAdmin: false
             };
            players.push(newPlayer);
            this.setData({ players });
          }
        }
      });
    },

    // Record game results
    recordResults() {
      // Save to local storage or server
      const results = {
        date: new Date().toISOString(),
        players: this.data.players,
        currentChips: this.data.currentChips
      };
      
      wx.getStorage({
        key: 'game_results',
        success: (res) => {
          const allResults = res.data || [];
          allResults.push(results);
          wx.setStorage({
            key: 'game_results',
            data: allResults
          });
        },
        fail: () => {
          wx.setStorage({
            key: 'game_results',
            data: [results]
          });
        }
      });

      wx.showToast({
        title: 'Results Recorded',
        icon: 'success'
      });
    },

    // Check if current user is admin
    isCurrentUserAdmin(): boolean {
      // Check if current user ID matches the current admin ID
      const currentUserId = this.getCurrentUserId();
      return this.data.currentAdminId === currentUserId;
    },

    // Get current user ID
    getCurrentUserId(): number {
      // In test mode, use the stored current user ID
      // In production, this would be retrieved from user session/token
      return this.data.currentUserId;
    },

    // Switch current user (for testing purposes only)
    switchCurrentUser(userId: number) {
      if (this.data.isTestMode) {
        this.setData({
          currentUserId: userId
        });
        this.updateAdminStatus();
      }
    },

    // Update isCurrentUserAdmin based on current state
    updateAdminStatus() {
      this.setData({
        isCurrentUserAdmin: this.data.currentAdminId === this.data.currentUserId
      });
    },

    // Calculate statistics (total profit, up/down counts)
    calculateStats() {
      const players = this.data.players;
      let totalProfit = 0;
      let totalUp = 0;
      let totalDown = 0;

      players.forEach(player => {
        totalProfit += player.profit;
        totalUp += player.hands; // Sum of all sets
        totalDown += player.chips; // Sum of actual chips on table
      });

      // totalUp = all sets combined * current per set (chips taken from bank)
      totalUp = totalUp * this.data.currentChips;
      // totalDown = actual chips on table (sum of all player chips)

      // Calculate final result: totalDown - totalUp (chips taken out - chips on table)
      const finalResult = totalDown - totalUp;

      this.setData({
        totalProfit,
        totalUp,
        totalDown,
        finalResult
      });
    },



    // Start editing player name
    startNameEdit(e: any) {
      const playerId = parseInt(e.currentTarget.dataset.playerId);
      const playerName = e.currentTarget.dataset.playerName;
      
      // Check if user can edit this player's name
      const canEdit = this.canEditPlayerName(playerId);
      if (!canEdit) {
        return;
      }

      this.setData({
        editingPlayerId: playerId,
        editingPlayerName: playerName
      });
    },

    // Check if current user can edit player name
    canEditPlayerName(playerId: number): boolean {
      // Admin can edit anyone's name
      if (this.isCurrentUserAdmin()) {
        return true;
      }
      
      // Non-admin can only edit their own name
      const currentUserId = this.getCurrentUserId();
      return playerId === currentUserId;
    },

    // Handle name input change
    onEditNameInput(e: any) {
      this.setData({
        editingPlayerName: e.detail.value
      });
    },

    // Confirm name edit
    confirmNameEdit() {
      const playerId = this.data.editingPlayerId;
      const newName = this.data.editingPlayerName.trim();
      
      if (playerId === -1 || !newName) {
        // Cancel editing if no valid name
        this.setData({
          editingPlayerId: -1,
          editingPlayerName: ''
        });
        return;
      }

      // Update player name
      const players = [...this.data.players];
      const targetPlayer = players.find(player => player.id === playerId);
      if (targetPlayer) {
        targetPlayer.nickname = newName;
        this.setData({ 
          players,
          editingPlayerId: -1,
          editingPlayerName: ''
        });
        
        wx.showToast({
          title: 'Name updated',
          icon: 'success',
          duration: 1000
        });
      }
    },

    // Handle long press on player name (admin transfer)
    onPlayerNameLongPress(e: any) {
      // In test mode, anyone can transfer admin. In production, only admin can.
      if (!this.data.isTestMode && !this.isCurrentUserAdmin()) {
        return;
      }

      const playerId = parseInt(e.currentTarget.dataset.playerId);
      const playerName = e.currentTarget.dataset.playerName;
      
      // Find the target player
      const targetPlayer = this.data.players.find(player => player.id === playerId);
      if (!targetPlayer) {
        return;
      }

      // Don't show dialog if target is already admin
      if (targetPlayer.isAdmin) {
        return;
      }

      // Show confirmation dialog
      wx.showModal({
        title: 'Transfer Admin',
        content: `Transfer admin privileges to ${playerName}?`,
        confirmText: 'Transfer',
        cancelText: 'Cancel',
        success: (res) => {
          if (res.confirm) {
            this.transferAdminTo(playerId);
          }
        }
      });
    },

    // Transfer admin privileges to target player
    transferAdminTo(playerId: number) {
      const players = [...this.data.players];
      
      // Remove admin status from all players
      players.forEach(player => {
        player.isAdmin = false;
      });
      
      // Set target player as admin
      const targetPlayer = players.find(player => player.id === playerId);
      if (targetPlayer) {
        targetPlayer.isAdmin = true;
        
        this.setData({ 
          players,
          currentAdminId: playerId
        });
        this.updateAdminStatus();
        
        wx.showToast({
          title: `${targetPlayer.nickname} is now admin`,
          icon: 'success',
          duration: 2000
        });
      }
    },

    // Delete player (admin only)
    deletePlayer(e: any) {
      // Only admin can delete players
      if (!this.isCurrentUserAdmin()) {
        return;
      }

      const playerId = parseInt(e.currentTarget.dataset.playerId);
      const playerName = e.currentTarget.dataset.playerName;
      
      // Find the target player
      const targetPlayer = this.data.players.find(player => player.id === playerId);
      if (!targetPlayer) {
        return;
      }

      // Cannot delete admin players
      if (targetPlayer.isAdmin) {
        wx.showToast({
          title: 'Cannot delete admin player',
          icon: 'none'
        });
        return;
      }

      // Show confirmation dialog
      wx.showModal({
        title: 'Delete Player',
        content: `Are you sure you want to remove ${playerName} from the game?`,
        confirmText: 'Delete',
        confirmColor: '#ff4444',
        cancelText: 'Cancel',
        success: (res) => {
          if (res.confirm) {
            this.confirmDeletePlayer(playerId);
          }
        }
      });
    },

    // Confirm delete player
    confirmDeletePlayer(playerId: number) {
      const players = this.data.players.filter(player => player.id !== playerId);
      this.setData({ players });
      
      wx.showToast({
        title: 'Player removed',
        icon: 'success',
        duration: 1500
      });
    },

    // Show QR code dialog
    showQRCode() {
      this.setData({
        showQRDialog: true
      });
    },

    // Hide QR code dialog
    hideQRCode() {
      this.setData({
        showQRDialog: false
      });
    },

    // Handle share app message (triggered by open-type="share")
    onShareAppMessage() {
      return {
        title: 'Yogii-win-win Game - Join our game!',
        path: '/pages/scoreboard/scoreboard',
        imageUrl: '/images/qrcode.png'
      };
    },

    // Test cloud development connection
    testCloudConnection() {
      if (this.data.isTestMode) {
        // 延迟测试，确保云开发已初始化
        setTimeout(() => {
          wx.cloud.callFunction({
            name: 'login',
            success: (res) => {
              console.log('✅ 云开发连接成功:', res);
              wx.showToast({
                title: '云开发已连接',
                icon: 'success',
                duration: 2000
              });
            },
            fail: (err) => {
              console.error('❌ 云开发连接失败:', err);
              console.error('错误详情:', err);
              wx.showToast({
                title: '云开发连接失败',
                icon: 'error',
                duration: 2000
              });
            }
          });
        }, 1000);
      }
    }
  },

  lifetimes: {
    attached() {
      // Calculate initial statistics when component is attached
      this.calculateStats();
      
      // Test cloud development connection (disabled for now)
      // this.testCloudConnection();
    }
  }
})
