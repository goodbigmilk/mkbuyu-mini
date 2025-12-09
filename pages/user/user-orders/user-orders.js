// 导入API接口
const orderApi = require('../../../api/order')
const { formatPrice, formatTime, showToast } = require('../../../utils/index.js')

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
    searchTimer: null,
    
    // 用户筛选相关（专门用于查看特定用户订单）
    viewUserId: null, // 要查看订单的用户ID
    viewUserName: '', // 要查看订单的用户名
    isViewingUserOrders: true // 固定为true，因为这个页面专门用于查看特定用户订单
  },

  onLoad(options) {
    // 处理用户参数 - 必须要有这些参数
    if (!options.userId || !options.userName) {
      wx.showToast({
        title: '缺少用户参数',
        icon: 'none'
      })
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    const userName = decodeURIComponent(options.userName || '')
    // 保持 userId 为字符串，避免大数精度丢失
    const userId = options.userId
    
    this.setData({
      viewUserId: userId,
      viewUserName: userName
    })
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: `${userName}的订单`
    })
    
    // 从参数中获取状态筛选
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    
    this.loadOrderList()
  },

  onShow() {
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
        status: currentTab.status,
        user_id: this.data.viewUserId // 必须传递用户ID
      }
      
      const result = await orderApi.getUserOrderList(params)
      
      if (result.code === 200) {
        // 预处理订单数据，格式化时间和总金额
        const processedList = result.data.list.map(order => ({
          ...order,
          formatted_time: formatTime(order.created_at),
          formatted_total_amount: (order.total_amount / 100).toFixed(2)
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
          page_size: this.data.pageSize,
          user_id: this.data.viewUserId // 必须传递用户ID
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
          page_size: this.data.pageSize,
          user_id: this.data.viewUserId // 必须传递用户ID
        }
        
        // 如果当前Tab有状态筛选，添加到搜索参数中
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await orderApi.searchUserOrders(params)
      }
      
      if (result.code === 200) {
        // 预处理新加载的订单数据，格式化时间和总金额
        const processedList = result.data.list.map(order => ({
          ...order,
          formatted_time: formatTime(order.created_at),
          formatted_total_amount: (order.total_amount / 100).toFixed(2)
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
          page_size: this.data.pageSize,
          user_id: this.data.viewUserId // 必须传递用户ID
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
          page_size: this.data.pageSize,
          user_id: this.data.viewUserId // 必须传递用户ID
        }
        
        // 如果当前Tab有状态筛选，添加到搜索参数中
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await orderApi.searchUserOrders(params)
      }
      
      if (result.code === 200) {
        // 预处理搜索结果数据，格式化时间和总金额
        const processedList = result.data.list.map(order => ({
          ...order,
          formatted_time: formatTime(order.created_at),
          formatted_total_amount: (order.total_amount / 100).toFixed(2)
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

})
