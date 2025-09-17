// pages/merchant/orders/orders.js
const orderApi = require('../../../api/order')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    // Tab切换
    activeTab: 'all',
    tabs: [
      { key: 'all', title: '全部', status: 0, count: 0 },
      { key: 'pending', title: '待付款', status: 1, count: 0 },
      { key: 'paid', title: '待发货', status: 2, count: 0 },
      { key: 'shipped', title: '已发货', status: 3, count: 0 },
      { key: 'completed', title: '已完成', status: 4, count: 0 },
      { key: 'cancelled', title: '已取消', status: 5, count: 0 },
      { key: 'refunding', title: '退款中', status: 6, count: 0 },
      { key: 'refunded', title: '已退款', status: 7, count: 0 }
    ],
    
    // 订单列表
    orderList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 搜索
    searchKeyword: '',
    searchTimer: null,
    
    // merchant-tabbar当前选中状态（订单页面对应索引2）
    tabbarCurrent: 2
  },

  onLoad(options) {
    // 从参数中获取状态筛选
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    
    this.loadOrderList()
  },

  onShow() {
    // 设置merchant-tabbar的选中状态（订单页面对应索引2）
    this.setData({
      tabbarCurrent: 2
    });
    
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
      
      const result = await orderApi.getShopOrderList(params)
      
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
        
        result = await orderApi.getShopOrderList(params)
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
        
        result = await orderApi.searchShopOrders(params)
      }
      
      if (result.code === 200) {
        const newList = this.data.orderList.concat(result.data.list)
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
        
        result = await orderApi.getShopOrderList(params)
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
        
        result = await orderApi.searchShopOrders(params)
      }
      
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
      url: `/pages/common/order-detail/order-detail?id=${orderId}&type=merchant`
    })
  },

  // 发货功能 - 商家特有
  async shipOrder(e) {
    const { orderId, order } = e.currentTarget.dataset
    
    // 简化版发货，直接更新状态，不需要物流信息
    const confirmed = await showModal('确认发货', `确定要发货订单"${order.order_no}"吗？`)
    if (!confirmed) return
    
    try {
      const result = await orderApi.updateOrderStatus(orderId, 3) // 3 = 已发货
      
      if (result.code === 200) {
        showToast('发货成功')
        this.refreshData()
      } else {
        showToast(result.message || '发货失败')
      }
    } catch (error) {
      console.error('发货失败:', error)
      showToast('发货失败，请重试')
    }
  },

  // 联系买家
  contactBuyer(e) {
    const { orderId } = e.currentTarget.dataset
    // TODO: 实现联系买家功能
    showToast('功能开发中')
  },

  // 查看物流
  viewExpress(e) {
    const { order } = e.currentTarget.dataset
    // TODO: 实现查看物流功能
    showToast('功能开发中')
  },

  // 去管理商品
  goManageProducts() {
    wx.switchTab({
      url: '/pages/merchant/products/products'
    })
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
      3: '已发货',
      4: '已完成',
      5: '已取消',
      6: '退款中',
      7: '已退款'
    }
    return statusMap[status] || '未知状态'
  },

  format1 (price, decimals = 2) {
    if (typeof price !== 'number') {
      return '0.00'
    }
    return (price / 100).toFixed(decimals)
  },
  
  // 获取订单状态样式
  getStatusClass(status) {
    const classMap = {
      1: 'status-pending',
      2: 'status-paid',
      3: 'status-shipped', 
      4: 'status-completed',
      5: 'status-cancelled',
      6: 'status-refunding',
      7: 'status-refunded'
    }
    return classMap[status] || ''
  }
})