const authAPI = require('../../../api/auth.js')
const orderAPI = require('../../../api/order.js')
const userAPI = require('../../../api/user.js')
const { formatTime } = require('../../../utils/index.js')

Page({
  data: {
    distributionList: [], // 分账订单列表
    stats: {}, // 分账统计
    loading: false, // 加载状态
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad() {
    this.loadDistributionData()
  },

  onShow() {
    // 设置tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 3 // 分销页面索引
      })
    }
    
    // 每次显示时刷新数据
    this.loadDistributionData()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreDistributions()
    }
  },

  // 加载分销数据
  async loadDistributionData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadDistributionStats(),
        this.loadDistributionOrders()
      ])
    } catch (error) {
      console.error('加载分销数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载分销统计数据
  async loadDistributionStats() {
    try {
      const response = await userAPI.getDistributionStats()
      
      if (response.code === 200) {
        this.setData({
          stats: response.data || {}
        })
      }
    } catch (error) {
      console.error('加载分销统计失败:', error)
    }
  },

  // 加载分账订单列表
  async loadDistributionOrders() {
    try {
      const response = await userAPI.getDistributionOrders({
        page: this.data.page,
        page_size: this.data.pageSize
      })
      
      if (response.code === 200) {
        const distributionData = response.data || {}
        const distributions = distributionData.list || []
        
        // 格式化时间和处理数据
        const processedList = distributions.map(distribution => ({
          ...distribution,
          formatted_time: formatTime(distribution.created_at)
        }))
        
        this.setData({
          distributionList: processedList,
          hasMore: processedList.length >= this.data.pageSize
        })
      }
    } catch (error) {
      console.error('加载分账订单列表失败:', error)
    }
  },

  // 加载更多分账订单
  async loadMoreDistributions() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }

    this.setData({ loading: true })

    try {
      const nextPage = this.data.page + 1
      const response = await userAPI.getDistributionOrders({
        page: nextPage,
        page_size: this.data.pageSize
      })
      
      if (response.code === 200) {
        const distributionData = response.data || {}
        const newDistributions = distributionData.list || []
        
        // 格式化时间和处理数据
        const processedList = newDistributions.map(distribution => ({
          ...distribution,
          formatted_time: formatTime(distribution.created_at)
        }))
        
        const distributionList = [...this.data.distributionList, ...processedList]
        
        this.setData({
          distributionList,
          page: nextPage,
          hasMore: newDistributions.length >= this.data.pageSize
        })
      }
    } catch (error) {
      console.error('加载更多分账订单失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      distributionList: []
    })
    
    try {
      await this.loadDistributionData()
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 跳转到推荐用户页面
  goToCustomers() {
    wx.navigateTo({
      url: '/pages/user/customers/customers'
    })
  },

  // 查看分账明细
  viewDistributionDetail(e) {
    const { distributionId } = e.currentTarget.dataset
    
    if (!distributionId) {
      wx.showToast({
        title: '分账ID无效',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/user/distribution-detail/distribution-detail?id=${distributionId}`
    })
  }
})
