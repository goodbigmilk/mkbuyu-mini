const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')
const { shopState } = require('../../../utils/state.js')

Page({
  data: {
    shopInfo: {},
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
    
    // 隐藏home按钮
    if (wx.hideHomeButton) {
      wx.hideHomeButton()
    }
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
    const userInfo = wx.getStorageSync('userInfo')
    
    // 检查用户角色是否为商家(shop)或管理员(admin)
    if (!userInfo.id || (userInfo.role !== 'shop' && userInfo.role !== 'admin')) {
      showModal('权限不足', '您没有商家权限，请联系管理员开通。').then(() => {
        wx.switchTab({
          url: '/pages/login/login'
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
      const { getMyShopInfo } = require('../../../api/shop.js')
      const response = await getMyShopInfo()
      
      if (response.code === 200 && response.data) {
        shopState.setShopInfo(response.data)
        this.setData({ shopInfo: response.data })
      }
    } catch (error) {
      console.error('加载店铺信息失败:', error)
    }
  },



  // 加载待处理数量
  async loadPendingCounts() {
    try {
      const { getShopAnalytics } = require('../../../api/shop.js')
      const response = await getShopAnalytics({ type: 'order_stats' })
      
      if (response.code === 200 && response.data) {
        const counts = {
          orders: response.data.pending_orders || 0,
          refunds: response.data.pending_refunds || 0,
          lowStock: response.data.low_stock_products || 0,
          reviews: response.data.pending_reviews || 0
        }
        this.setData({ pendingCounts: counts })
      }
    } catch (error) {
      console.error('加载待处理数量失败:', error)
    }
  },

  // 加载最新动态
  async loadRecentActivities() {
    try {
      const { getShopAnalytics } = require('../../../api/shop.js')
      const response = await getShopAnalytics({ 
        type: 'recent_activities',
        limit: 10
      })
      
      if (response.code === 200 && response.data) {
        this.setData({ activities: response.data.activities || [] })
      }
    } catch (error) {
      console.error('加载最新动态失败:', error)
    }
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

  // 最新动态点击
  onActivityTap(e) {
    const { activity } = e.currentTarget.dataset
    
    if (activity && activity.type === 'order' && activity.order_id) {
      // 跳转到订单详情页面
      wx.navigateTo({
        url: `/pages/merchant/orders/detail/detail?id=${activity.order_id}`
      })
    } else {
      // 其他类型的动态暂不处理
      console.log('点击了动态:', activity)
    }
  },

  // 工具方法
  formatPrice,
  formatTime
}) 