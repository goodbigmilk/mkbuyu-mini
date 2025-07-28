// 导入API接口
const orderApi = require('../../../api/order')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    // Tab切换
    activeTab: 'all',
    tabs: [
      { key: 'all', title: '全部', status: 0 },
      { key: 'pending', title: '待付款', status: 1 },
      { key: 'paid', title: '待发货', status: 2 },
      { key: 'shipped', title: '待收货', status: 3 },
      { key: 'completed', title: '已完成', status: 4 },
      { key: 'cancelled', title: '已取消', status: 5 }
    ],
    
    // 订单列表
    orderList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 搜索
    searchKeyword: '',
    showSearch: false,
    
    // 统计数据
    statistics: {}
  },

  onLoad(options) {
    // 从参数中获取状态筛选
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    
    this.loadOrderList()
    this.loadStatistics()
  },

  onShow() {
    // 设置tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 2
      })
    }
    
    // 刷新数据
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.loading && this.data.hasMore) {
      this.loadMoreOrders()
    }
  },

  // 切换Tab
  onTabChange(e) {
    const { key } = e.currentTarget.dataset
    this.setData({
      activeTab: key,
      page: 1,
      orderList: [],
      hasMore: true
    })
    this.loadOrderList()
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      orderList: [],
      hasMore: true
    })
    
    await Promise.all([
      this.loadOrderList(),
      this.loadStatistics()
    ])
  },

  // 加载订单列表
  async loadOrderList() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
      const params = {
        page: this.data.page,
        page_size: this.data.pageSize,
        status: currentTab.status
      }
      
      const result = await orderApi.getUserOrderList(params)
      
      if (result.code === 200) {
        const newOrderList = this.data.page === 1 ? result.data.list : [...this.data.orderList, ...result.data.list]
        
        this.setData({
          orderList: newOrderList,
          hasMore: newOrderList.length < result.data.total,
          loading: false
        })
      } else {
        showToast(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载订单列表失败:', error)
      showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 加载更多订单
  async loadMoreOrders() {
    this.setData({
      page: this.data.page + 1
    })
    await this.loadOrderList()
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const result = await orderApi.getUserOrderStatistics()
      if (result.code === 200) {
        this.setData({ statistics: result.data })
        
        // 更新tab上的数量显示
        const tabs = this.data.tabs.map(tab => {
          const count = result.data[tab.key] || 0
          return { ...tab, count }
        })
        this.setData({ tabs })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 搜索订单
  async onSearch() {
    if (!this.data.searchKeyword.trim()) {
      showToast('请输入搜索关键词')
      return
    }
    
    this.setData({
      page: 1,
      orderList: [],
      hasMore: true,
      loading: true
    })
    
    try {
      const params = {
        keyword: this.data.searchKeyword,
        page: 1,
        page_size: this.data.pageSize
      }
      
      const result = await orderApi.searchUserOrders(params)
      
      if (result.code === 200) {
        this.setData({
          orderList: result.data.list,
          hasMore: result.data.list.length < result.data.total,
          loading: false
        })
      } else {
        showToast(result.message || '搜索失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('搜索订单失败:', error)
      showToast('搜索失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 切换搜索显示
  toggleSearch() {
    this.setData({
      showSearch: !this.data.showSearch,
      searchKeyword: ''
    })
    
    if (!this.data.showSearch) {
      this.refreshData()
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 查看订单详情
  viewOrderDetail(e) {
    const { orderId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/common/order-detail/order-detail?id=${orderId}&type=user`
    })
  },

  // 取消订单
  async cancelOrder(e) {
    const { orderId, orderNo } = e.currentTarget.dataset
    
    const confirmed = await showModal('确认取消', '确定要取消该订单吗？')
    if (!confirmed) return
    
    try {
      const result = await orderApi.cancelOrder(orderId)
      
      if (result.code === 200) {
        showToast('订单已取消')
        this.refreshData()
      } else {
        showToast(result.message || '取消失败')
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      showToast('取消失败，请重试')
    }
  },

  // 确认收货
  async confirmReceipt(e) {
    const { orderId } = e.currentTarget.dataset
    
    const confirmed = await showModal('确认收货', '确定已收到商品吗？')
    if (!confirmed) return
    
    try {
      const result = await orderApi.confirmReceipt(orderId)
      
      if (result.code === 200) {
        showToast('确认收货成功')
        this.refreshData()
      } else {
        showToast(result.message || '确认收货失败')
      }
    } catch (error) {
      console.error('确认收货失败:', error)
      showToast('确认收货失败，请重试')
    }
  },

  // 去支付
  async goPay(e) {
    const { orderId, orderNo } = e.currentTarget.dataset
    
    wx.navigateTo({
      url: `/pages/common/payment/payment?orderNo=${orderNo}&orderId=${orderId}`
    })
  },

  // 联系客服
  contactService(e) {
    const { orderId } = e.currentTarget.dataset
    // TODO: 实现联系客服功能
    showToast('客服功能开发中')
  },

  // 删除订单
  async deleteOrder(e) {
    const { orderId } = e.currentTarget.dataset
    
    const confirmed = await showModal('删除订单', '确定要删除该订单吗？')
    if (!confirmed) return
    
    // TODO: 实现删除订单功能
    showToast('删除功能开发中')
  },

  // 格式化价格
  formatPrice,
  
  // 格式化时间
  formatTime,
  
  // 获取订单状态文本
  getStatusText(status) {
    const statusMap = {
      1: '待付款',
      2: '待发货', 
      3: '待收货',
      4: '已完成',
      5: '已取消'
    }
    return statusMap[status] || '未知状态'
  },
  
  // 获取订单状态样式
  getStatusClass(status) {
    const classMap = {
      1: 'status-pending',
      2: 'status-paid',
      3: 'status-shipped', 
      4: 'status-completed',
      5: 'status-cancelled'
    }
    return classMap[status] || ''
  },

  // 去购物
  goShopping() {
    wx.switchTab({
      url: '/pages/user/home/home'
    })
  }
})