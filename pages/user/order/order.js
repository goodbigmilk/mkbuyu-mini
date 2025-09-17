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
      { key: 'cancelled', title: '已取消', status: 5 },
      { key: 'refunding', title: '退款中', status: 6 },
      { key: 'refunded', title: '已退款', status: 7 }
    ],
    
    // 订单列表
    orderList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 搜索
    searchKeyword: '',
    searchTimer: null
  },

  onLoad(options) {
    // 从参数中获取状态筛选
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    
    this.loadOrderList()
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
      // 保持搜索关键词不变
    })
    
    // 如果有搜索关键词，在新的Tab状态下重新搜索；否则正常加载
    if (this.data.searchKeyword.trim()) {
      this.onSearch()
    } else {
      this.loadOrderList()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      orderList: [],
      hasMore: true
    })
    
    // 如果有搜索关键词，执行搜索，否则加载正常列表
    if (this.data.searchKeyword.trim()) {
      await this.performSearch()
    } else {
      await this.loadOrderList()
    }
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
        // 预处理订单数据，格式化时间
        const processedList = result.data.list.map(order => ({
          ...order,
          formatted_time: formatTime(order.created_at)
        }))
        
        const newOrderList = this.data.page === 1 ? processedList : [...this.data.orderList, ...processedList]
        
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
    if (this.data.loading) return
    
    this.setData({
      page: this.data.page + 1,
      loading: true
    })
    
    try {
      const keyword = this.data.searchKeyword.trim()
      let result
      
      if (!keyword) {
        // 正常列表的加载更多，按Tab状态筛选
        const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
        const params = {
          page: this.data.page,
          page_size: this.data.pageSize
        }
        
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await orderApi.getUserOrderList(params)
      } else {
        // 搜索状态的加载更多，在当前Tab状态下搜索
        const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
        const params = {
          keyword: keyword,
          page: this.data.page,
          page_size: this.data.pageSize
        }
        
        // 如果当前Tab有状态筛选，添加到搜索参数中
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await orderApi.searchUserOrders(params)
      }
      
      if (result.code === 200) {
        // 预处理新加载的订单数据，格式化时间
        const processedList = result.data.list.map(order => ({
          ...order,
          formatted_time: formatTime(order.created_at)
        }))
        
        const newList = this.data.orderList.concat(processedList)
        this.setData({
          orderList: newList,
          hasMore: result.data.list.length >= this.data.pageSize,
          loading: false
        })
      } else {
        showToast(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载更多订单失败:', error)
      showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 搜索订单
  async onSearch() {
    const keyword = this.data.searchKeyword.trim()
    
    this.setData({
      page: 1,
      orderList: [],
      hasMore: true,
      loading: true
    })
    
    try {
      let result
      
      if (!keyword) {
        // 没有搜索关键词时，加载正常的订单列表，按Tab状态筛选
        const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
        const params = {
          page: 1,
          page_size: this.data.pageSize
        }
        
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await orderApi.getUserOrderList(params)
      } else {
        // 有搜索关键词时，在当前Tab状态下搜索
        const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
        const params = {
          keyword: keyword,
          page: 1,
          page_size: this.data.pageSize
        }
        
        // 如果当前Tab有状态筛选，添加到搜索参数中
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await orderApi.searchUserOrders(params)
      }
      
      if (result.code === 200) {
        // 预处理搜索结果数据，格式化时间
        const processedList = result.data.list.map(order => ({
          ...order,
          formatted_time: formatTime(order.created_at)
        }))
        
        this.setData({
          orderList: processedList,
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

  // 实时搜索
  performSearch() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }

    this.data.searchTimer = setTimeout(async () => {
      await this.onSearch()
    }, 500) // 500ms 延迟
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.performSearch() // 实时搜索
  },

  // 清空搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    })
    this.performSearch() // 清空后重新加载列表
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

  // 去支付/立即付款
  goPay(e) {
    const { orderId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/common/order-detail/order-detail?id=${orderId}&showPayment=true`
    })
  },

  // 联系客服
  contactService(e) {
    const { orderId } = e.currentTarget.dataset
    // TODO: 实现联系客服功能
    showToast('功能开发中')
  },

  // 删除订单
  async deleteOrder(e) {
    const { orderId } = e.currentTarget.dataset
    
    const confirmed = await showModal('删除订单', '确定要删除该订单吗？')
    if (!confirmed) return
    
    // TODO: 实现删除订单功能
    showToast('删除功能开发中')
  },

  // 申请退款
  applyRefund(e) {
    const { orderId } = e.currentTarget.dataset
    
    // 跳转到退款信息填写页面
    wx.navigateTo({
      url: `/pages/user/refund/refund-apply?orderId=${orderId}`
    })
  },

  // 去购物
  goShopping() {
    wx.switchTab({
      url: '/pages/user/home/home'
    })
  }
})