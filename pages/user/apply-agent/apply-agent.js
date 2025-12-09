// pages/user/apply-agent/apply-agent.js
const { showToast, showModal } = require('../../../utils/index.js')
const agentAPI = require('../../../api/agent.js')
const shopAPI = require('../../../api/shop.js')

Page({
  data: {
    loading: false,
    conditions: [], // 推广员申请条件
    userStats: {}, // 用户统计数据
    canApply: false, // 是否可以申请
    hasApplication: false, // 是否已有申请
    applicationStatus: 0, // 申请状态
    
    // 店铺相关
    shops: [],
    selectedShopId: '',
    selectedShopIndex: 0,
    
    // 申请状态文字
    statusText: {
      0: '无申请',
      1: '待审核',
      2: '已同意',
      3: '已拒绝'
    },
    
    // 申请状态颜色
    statusColor: {
      0: 'default',
      1: 'orange',
      2: 'green',
      3: 'red'
    }
  },

  onLoad() {
    this.loadInitialData()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载初始数据
  async loadInitialData() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // 先加载店铺列表
      await this.loadShops()
      
      // 再加载其他数据
      await Promise.all([
        this.loadConditions(),
        this.loadUserStats(),
        this.checkApplicationStatus()
      ])
      
      // 在数据加载完成后，格式化条件数据
      this.formatConditionsData()
      this.checkCanApply()
    } catch (error) {
      console.error('加载初始数据失败:', error)
      showToast('加载数据失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 加载店铺列表
  async loadShops() {
    try {
      const response = await shopAPI.getMyBoundShops()
      if (response.code === 200 && response.data) {
        const shops = response.data.map(binding => ({
          shop_id: binding.shop.shop_id,
          name: binding.shop.name,
          logo: binding.shop.logo
        }))
        
        this.setData({
          shops: shops,
          selectedShopId: shops.length > 0 ? String(shops[0].shop_id) : '',
          selectedShopIndex: 0
        })
      } else {
        console.error('获取店铺列表失败:', response.message)
      }
    } catch (error) {
      console.error('加载店铺列表失败:', error)
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ loading: true })
    await this.loadInitialData()
    this.setData({ loading: false })
  },

  // 加载申请条件
  async loadConditions() {
    // 如果没有选择店铺，不加载
    if (!this.data.selectedShopId) return
    
    try {
      const response = await agentAPI.getAgentConditionsForUser({
        shop_id: this.data.selectedShopId
      })
      
      if (response.code === 200) {
        // 延迟格式化，在获取用户统计数据后进行
        this.setData({
          conditions: response.data || []
        })
      } else {
        console.error('获取推广员申请条件失败:', response.message)
      }
    } catch (error) {
      console.error('加载申请条件失败:', error)
    }
  },

  // 格式化条件数据
  formatConditionsData() {
    const { conditions, userStats } = this.data
    const formattedConditions = conditions.map(item => {
      const isMet = this.checkConditionMet(item)
      const currentAmount = item.type === 1 ? (userStats.personal_consume || 0) : (userStats.team_consume || 0)
      
      return {
        ...item,
        typeText: item.type === 1 ? '个人消费' : '团队消费',
        amountText: this.formatAmount(item.amount),
        isMet: isMet,
        currentAmountText: this.formatAmount(currentAmount)
      }
    })
    
    this.setData({
      conditions: formattedConditions
    })
  },

  // 加载用户统计数据
  async loadUserStats() {
    // 如果没有选择店铺，不加载
    if (!this.data.selectedShopId) return
    
    try {
      const response = await agentAPI.getUserStats({
        shop_id: this.data.selectedShopId
      })
      
      if (response.code === 200) {
        const data = response.data || {}
        // 格式化用户统计数据
        const formattedStats = {
          ...data,
          personalConsumeText: this.formatAmount(data.personal_consume || 0),
          teamConsumeText: this.formatAmount(data.team_consume || 0),
          customerCountText: `${data.customer_count || 0}人`
        }
        
        this.setData({
          userStats: formattedStats
        })
      } else {
        console.error('获取用户统计数据失败:', response.message)
      }
    } catch (error) {
      console.error('加载用户统计数据失败:', error)
    }
  },

  // 检查申请状态
  async checkApplicationStatus() {
    // 如果没有选择店铺，不加载
    if (!this.data.selectedShopId) return
    
    try {
      const response = await agentAPI.getUserApplicationStatus({
        shop_id: this.data.selectedShopId
      })
      
      if (response.code === 200) {
        const data = response.data
        this.setData({
          hasApplication: data.has_application,
          applicationStatus: data.status || 0
        })
      } else {
        console.error('获取申请状态失败:', response.message)
      }
    } catch (error) {
      console.error('检查申请状态失败:', error)
    }
  },

  // 检查是否可以申请
  checkCanApply() {
    const { conditions, userStats, hasApplication, applicationStatus } = this.data
    
    // 如果已有待审核的申请，不能再次申请
    if (hasApplication && applicationStatus === 1) {
      this.setData({ canApply: false })
      return
    }
    
    // 检查是否满足条件
    let canApply = false
    
    for (const condition of conditions) {
      if (condition.type === 1) { // 个人消费条件
        if ((userStats.personal_consume || 0) >= condition.amount) {
          canApply = true
          break
        }
      } else if (condition.type === 2) { // 团队消费条件
        if ((userStats.team_consume || 0) >= condition.amount) {
          canApply = true
          break
        }
      }
    }
    
    this.setData({ canApply })
  },

  // 申请成为推广员
  async onApply() {
    const confirmed = await showModal('确认申请', '确定要申请成为推广员吗？申请提交后需要等待商家审核。')
    if (!confirmed) return

    try {
      wx.showLoading({ title: '提交申请中...' })
      
      const response = await agentAPI.submitAgentApplication({
        shop_id: this.data.selectedShopId
      })
      
      if (response.code === 200) {
        showToast('申请已提交，请等待商家审核')
        
        // 刷新申请状态
        await this.checkApplicationStatus()
        this.checkCanApply()
      } else {
        showToast(response.message || '申请提交失败')
      }
    } catch (error) {
      console.error('提交申请失败:', error)
      showToast('申请提交失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 取消申请
  async onCancelApplication() {
    const confirmed = await showModal('取消申请', '确定要取消申请吗？取消后可以重新申请。')
    if (!confirmed) return

    try {
      wx.showLoading({ title: '取消申请中...' })
      
      const response = await agentAPI.cancelAgentApplication()
      
      if (response.code === 200) {
        showToast('申请已取消')
        
        // 刷新申请状态
        await this.checkApplicationStatus()
        this.checkCanApply()
      } else {
        showToast(response.message || '取消申请失败')
      }
    } catch (error) {
      console.error('取消申请失败:', error)
      showToast('取消申请失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 前往分销中心
  onGoToDistribution() {
    wx.navigateTo({
      url: '/pages/user/distribution/distribution'
    })
  },

  // 店铺选择器变化
  onShopPickerChange(event) {
    const index = event.detail.value
    const shops = this.data.shops
    
    if (index < shops.length) {
      const selectedShop = shops[index]
      console.log('切换店铺:', selectedShop)
      
      this.setData({
        selectedShopIndex: index,
        selectedShopId: String(selectedShop.shop_id)
      })
      
      // 重新加载数据（不重新加载店铺列表）
      this.reloadDataForSelectedShop()
    }
  },

  // 为选中的店铺重新加载数据
  async reloadDataForSelectedShop() {
    try {
      this.setData({ loading: true })
      wx.showLoading({ title: '加载中...' })
      
      await Promise.all([
        this.loadConditions(),
        this.loadUserStats(),
        this.checkApplicationStatus()
      ])
      
      // 在数据加载完成后，格式化条件数据
      this.formatConditionsData()
      this.checkCanApply()
    } catch (error) {
      console.error('加载数据失败:', error)
      showToast('加载数据失败')
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  // 格式化金额
  formatAmount(amount) {
    return (amount / 100).toFixed(2)
  },


  // 检查条件是否满足
  checkConditionMet(condition) {
    const { userStats } = this.data
    
    if (condition.type === 1) { // 个人消费
      return (userStats.personal_consume || 0) >= condition.amount
    } else if (condition.type === 2) { // 团队消费
      return (userStats.team_consume || 0) >= condition.amount
    }
    
    return false
  },

})
