// 导入API接口
const refundApi = require('../../../api/refund')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    // Tab切换
    activeTab: 'all',
    tabs: [
      { key: 'all', title: '全部', status: 0, count: 0 },
      { key: 'pending', title: '待处理', status: 1, count: 0 },
      { key: 'approved', title: '已同意', status: 2, count: 0 },
      { key: 'rejected', title: '已拒绝', status: 3, count: 0 }
    ],
    
    // 退款申请列表
    refundList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    
    // 搜索
    searchKeyword: '',
    searchTimer: null,
    
    // merchant-tabbar当前选中状态
    tabbarCurrent: -1 // 非标准tabbar页面
  },

  onLoad(options) {
    // 从参数中获取状态筛选
    if (options.status) {
      this.setData({ activeTab: options.status })
    }
    
    this.loadRefundList()
    this.loadRefundStats()
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
      this.loadMoreRefunds()
    }
  },

  // 切换Tab
  onTabChange(e) {
    const { key } = e.currentTarget.dataset
    this.setData({
      activeTab: key,
      page: 1,
      refundList: [],
      hasMore: true
    })
    
    // 如果有搜索关键词，在新的Tab状态下重新搜索；否则正常加载
    if (this.data.searchKeyword.trim()) {
      this.onSearch()
    } else {
      this.loadRefundList()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      refundList: [],
      hasMore: true
    })
    
    // 如果有搜索关键词，执行搜索，否则加载正常列表
    if (this.data.searchKeyword.trim()) {
      await this.performSearch()
    } else {
      await this.loadRefundList()
    }
    
    // 同时刷新统计数据
    await this.loadRefundStats()
  },

  // 加载退款申请列表
  async loadRefundList() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
      const params = {
        page: this.data.page,
        page_size: this.data.pageSize,
        status: currentTab.status
      }
      
      const result = await refundApi.getShopRefundRequests(params)
      
      if (result.code === 200) {
        const newRefundList = this.data.page === 1 ? result.data.list : [...this.data.refundList, ...result.data.list]
        
        this.setData({
          refundList: newRefundList,
          hasMore: newRefundList.length < result.data.total,
          loading: false
        })
      } else {
        showToast(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载退款申请列表失败:', error)
      showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 加载更多退款申请
  async loadMoreRefunds() {
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
        
        result = await refundApi.getShopRefundRequests(params)
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
        
        result = await refundApi.searchShopRefunds(params)
      }
      
      if (result.code === 200) {
        const newList = this.data.refundList.concat(result.data.list)
        this.setData({
          refundList: newList,
          hasMore: result.data.list.length >= this.data.pageSize,
          loading: false
        })
      } else {
        showToast(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载更多退款申请失败:', error)
      showToast('加载失败，请重试')
      this.setData({ loading: false })
    }
  },

  // 加载退款统计
  async loadRefundStats() {
    try {
      const result = await refundApi.getRefundStatistics()
      
      if (result.code === 200) {
        const stats = result.data
        const tabs = this.data.tabs.map(tab => {
          switch (tab.key) {
            case 'all':
              tab.count = stats.total || 0
              break
            case 'pending':
              tab.count = stats.pending || 0
              break
            case 'approved':
              tab.count = stats.approved || 0
              break
            case 'rejected':
              tab.count = stats.rejected || 0
              break
          }
          return tab
        })
        
        this.setData({ tabs })
      }
    } catch (error) {
      console.error('加载退款统计失败:', error)
    }
  },

  // 搜索退款申请
  async onSearch() {
    const keyword = this.data.searchKeyword.trim()
    
    this.setData({
      page: 1,
      refundList: [],
      hasMore: true,
      loading: true
    })
    
    try {
      let result
      
      if (!keyword) {
        // 没有搜索关键词时，加载正常的退款申请列表，按Tab状态筛选
        const currentTab = this.data.tabs.find(tab => tab.key === this.data.activeTab)
        const params = {
          page: 1,
          page_size: this.data.pageSize
        }
        
        if (currentTab && currentTab.status > 0) {
          params.status = currentTab.status
        }
        
        result = await refundApi.getShopRefundRequests(params)
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
        
        result = await refundApi.searchShopRefunds(params)
      }
      
      if (result.code === 200) {
        this.setData({
          refundList: result.data.list,
          hasMore: result.data.list.length < result.data.total,
          loading: false
        })
      } else {
        showToast(result.message || '搜索失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('搜索退款申请失败:', error)
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

  // 查看退款申请详情
  viewRefundDetail(e) {
    const { refundId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/merchant/refund-detail/refund-detail?id=${refundId}`
    })
  },

  // 处理退款申请
  async processRefund(e) {
    const { refundId, approved } = e.currentTarget.dataset
    const refund = this.data.refundList.find(r => r.id === refundId)
    
    if (!refund) {
      showToast('退款申请不存在')
      return
    }

    const actionText = approved ? '同意' : '拒绝'
    const confirmed = await showModal(`确认${actionText}`, `确定要${actionText}此退款申请吗？`)
    if (!confirmed) return

    try {
      const params = {
        approved: approved,
        admin_remark: approved ? '商家同意退款' : '商家拒绝退款'
      }

      // TODO: 如果同意退款，这里应该调用支付系统进行实际退款操作
      // 暂时只更新状态，不进行实际退款
      
      const result = await refundApi.processRefundRequest(refundId, params)
      
      if (result.code === 200) {
        showToast(`${actionText}成功`)
        
        // 刷新列表
        this.refreshData()
      } else {
        showToast(result.message || `${actionText}失败`)
      }
    } catch (error) {
      console.error(`${actionText}退款申请失败:`, error)
      showToast(`${actionText}失败，请重试`)
    }
  },

  // 获取退款状态文本
  getRefundStatusText(status) {
    const statusMap = {
      1: '待处理',
      2: '已同意',
      3: '已拒绝'
    }
    return statusMap[status] || '未知'
  },

  // 获取退款状态样式
  getRefundStatusClass(status) {
    const classMap = {
      1: 'status-pending',
      2: 'status-approved',
      3: 'status-rejected'
    }
    return classMap[status] || ''
  },

  // 格式化价格
  formatPrice,
  
  // 格式化时间
  formatTime
})
