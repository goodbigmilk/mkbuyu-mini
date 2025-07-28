const { store, getStore } = require('../../../store/index.js')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    shopInfo: {},
    todayStats: {
      orderCount: 0,
      sales: 0,
      visitorCount: 0,
      conversionRate: 0,
      orderChange: 0,
      salesChange: 0,
      visitorChange: 0,
      conversionChange: 0
    },
    chartPeriod: 'week',
    chartData: {
      totalSales: 0,
      data: []
    },
    pendingCounts: {
      orders: 0,
      refunds: 0,
      lowStock: 0,
      reviews: 0
    },
    activities: [],
    loading: false,
    
    // merchant-tabbar当前选中状态
    tabbarCurrent: 0
  },

  onLoad() {
    this.checkMerchantAuth()
    this.initDashboard()
  },

  onShow() {
    // 设置merchant-tabbar的选中状态（工作台页面对应索引0）
    this.setData({
      tabbarCurrent: 0
    });
    
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 检查商家权限
  checkMerchantAuth() {
    const userStore = getStore('user')
    const userInfo = userStore.getUserInfo()
    
    // 检查用户角色是否为商家(shop)或管理员(admin)
    if (!userInfo.id || (userInfo.role !== 'shop' && userInfo.role !== 'admin')) {
      showModal('权限不足', '您没有商家权限，请联系管理员开通。').then(() => {
        wx.switchTab({
          url: '/pages/home/home'
        })
      })
      return false
    }
    
    return true
  },

  // 初始化仪表板
  async initDashboard() {
    if (!this.checkMerchantAuth()) return
    
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadShopInfo(),
        this.loadTodayStats(),
        this.loadChartData(),
        this.loadPendingCounts(),
        this.loadRecentActivities()
      ])
    } catch (error) {
      console.error('初始化仪表板失败:', error)
      showToast('加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 刷新数据
  async refreshData() {
    try {
      await Promise.all([
        this.loadTodayStats(),
        this.loadPendingCounts(),
        this.loadRecentActivities()
      ])
    } catch (error) {
      console.error('刷新数据失败:', error)
    }
  },

  // 加载店铺信息
  async loadShopInfo() {
    try {
      const shopStore = getStore('shop')
      await shopStore.loadShopInfo()
      
      const shopInfo = shopStore.getShopInfo()
      this.setData({ shopInfo })
    } catch (error) {
      console.error('加载店铺信息失败:', error)
    }
  },

  // 加载今日统计数据
  async loadTodayStats() {
    try {
      const shopStore = getStore('shop')
      const stats = await shopStore.getTodayStats()
      
      this.setData({ todayStats: stats })
    } catch (error) {
      console.error('加载今日统计失败:', error)
    }
  },

  // 加载图表数据
  async loadChartData() {
    try {
      const shopStore = getStore('shop')
      const chartData = await shopStore.getSalesChart(this.data.chartPeriod)
      
      this.setData({ chartData })
    } catch (error) {
      console.error('加载图表数据失败:', error)
    }
  },

  // 加载待处理数量
  async loadPendingCounts() {
    try {
      const shopStore = getStore('shop')
      const counts = await shopStore.getPendingCounts()
      
      this.setData({ pendingCounts: counts })
    } catch (error) {
      console.error('加载待处理数量失败:', error)
    }
  },

  // 加载最新动态
  async loadRecentActivities() {
    try {
      const shopStore = getStore('shop')
      const activities = await shopStore.getRecentActivities()
      
      this.setData({ activities })
    } catch (error) {
      console.error('加载最新动态失败:', error)
    }
  },

  // 切换店铺营业状态
  async onToggleShopStatus() {
    const { shopInfo } = this.data
    const newStatus = shopInfo.status === 'open' ? 'closed' : 'open'
    const statusText = newStatus === 'open' ? '营业' : '打烊'
    
    const confirmed = await showModal('确认操作', `确定要${statusText}吗？`)
    if (!confirmed) return
    
    try {
      const shopStore = getStore('shop')
      await shopStore.updateShopStatus(newStatus)
      
      this.setData({
        'shopInfo.status': newStatus
      })
      
      showToast(`已${statusText}`)
    } catch (error) {
      console.error('切换营业状态失败:', error)
      showToast('操作失败')
    }
  },

  // 统计数据点击
  onStatTap(e) {
    const { type } = e.currentTarget.dataset
    
    switch (type) {
      case 'orders':
        wx.navigateTo({
          url: '/pages/merchant/orders/orders'
        })
        break
      case 'sales':
        wx.navigateTo({
          url: '/pages/merchant/analytics/analytics?tab=sales'
        })
        break
      case 'visitors':
        wx.navigateTo({
          url: '/pages/merchant/analytics/analytics?tab=traffic'
        })
        break
      case 'conversion':
        wx.navigateTo({
          url: '/pages/merchant/analytics/analytics?tab=conversion'
        })
        break
    }
  },

  // 图表周期切换
  async onChartPeriodChange(e) {
    const { period } = e.currentTarget.dataset
    this.setData({ chartPeriod: period })
    await this.loadChartData()
  },

  // 待处理事务点击
  onPendingTap(e) {
    const { type } = e.currentTarget.dataset
    
    switch (type) {
      case 'orders':
        wx.navigateTo({
          url: '/pages/merchant/orders/orders?status=paid'
        })
        break
      case 'refunds':
        wx.navigateTo({
          url: '/pages/merchant/refunds/refunds'
        })
        break
      case 'stock':
        wx.navigateTo({
          url: '/pages/merchant/products/products?filter=low_stock'
        })
        break
      case 'reviews':
        wx.navigateTo({
          url: '/pages/merchant/reviews/reviews?status=pending'
        })
        break
    }
  },

  // 快捷操作点击
  onShortcutTap(e) {
    const { type } = e.currentTarget.dataset
    
    switch (type) {
      case 'add-product':
        wx.navigateTo({
          url: '/pages/merchant/products/edit/edit'
        })
        break
      case 'manage-products':
        wx.navigateTo({
          url: '/pages/merchant/products/products'
        })
        break
      case 'order-management':
        wx.navigateTo({
          url: '/pages/merchant/orders/orders'
        })
        break
      case 'data-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/analytics'
        })
        break
      case 'customer-service':
        wx.navigateTo({
          url: '/pages/merchant/service/service'
        })
        break
      case 'marketing':
        wx.navigateTo({
          url: '/pages/merchant/marketing/marketing'
        })
        break
      case 'finance':
        wx.navigateTo({
          url: '/pages/merchant/finance/finance'
        })
        break
      case 'settings':
        wx.navigateTo({
          url: '/pages/merchant/settings/settings'
        })
        break
      default:
        showToast('功能开发中')
    }
  },

  // 设置按钮点击
  onSettings() {
    wx.navigateTo({
      url: '/pages/merchant/settings/settings'
    })
  },

  // 工具方法
  formatPrice,
  formatTime
}) 