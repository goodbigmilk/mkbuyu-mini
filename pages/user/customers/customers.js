const { formatTime } = require('../../../utils/index.js')
const userAPI = require('../../../api/user.js')

Page({
  data: {
    customerList: [], // 客户列表
    customerStats: {}, // 客户统计
    loading: false, // 加载状态
    page: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad() {
    this.loadCustomerData()
  },

  onShow() {
    // 每次显示时刷新数据
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreCustomers()
    }
  },

  // 加载客户数据
  async loadCustomerData() {
    this.setData({ loading: true })
    
    try {
      await this.loadCustomerList()
    } catch (error) {
      console.error('加载客户数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载客户列表
  async loadCustomerList() {
    try {
      const response = await userAPI.getDistributionCustomers({
        page: this.data.page,
        page_size: this.data.pageSize
      })
      
      if (response.code === 200) {
        const customerData = response.data || {}
        const customers = customerData.items || []
        
        // 格式化时间和处理数据
        const processedList = customers.map(customer => ({
          ...customer,
          formatted_referred_at: formatTime(customer.referred_at),
          formatted_created_at: formatTime(customer.created_at)
        }))
        
        // 计算统计数据
        const stats = this.calculateStats(customers)
        
        this.setData({
          customerList: processedList,
          customerStats: stats,
          hasMore: customers.length >= this.data.pageSize
        })
      }
    } catch (error) {
      console.error('加载客户列表失败:', error)
    }
  },

  // 加载更多客户
  async loadMoreCustomers() {
    if (this.data.loading || !this.data.hasMore) {
      return
    }

    this.setData({ loading: true })

    try {
      const nextPage = this.data.page + 1
      const response = await userAPI.getDistributionCustomers({
        page: nextPage,
        page_size: this.data.pageSize
      })
      
      if (response.code === 200) {
        const customerData = response.data || {}
        const newCustomers = customerData.items || []
        
        // 格式化时间和处理数据
        const processedList = newCustomers.map(customer => ({
          ...customer,
          formatted_referred_at: formatTime(customer.referred_at),
          formatted_created_at: formatTime(customer.created_at)
        }))
        
        const customerList = [...this.data.customerList, ...processedList]
        
        // 重新计算统计数据
        const allCustomers = [...this.data.customerList.map(c => ({ stats: c.stats })), ...newCustomers]
        const stats = this.calculateStats(allCustomers)
        
        this.setData({
          customerList,
          customerStats: stats,
          page: nextPage,
          hasMore: newCustomers.length >= this.data.pageSize
        })
      }
    } catch (error) {
      console.error('加载更多客户失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 计算统计数据
  calculateStats(customers) {
    let totalCustomers = customers.length
    let totalAmount = 0

    customers.forEach(customer => {
      if (customer.stats) {
        totalAmount += customer.stats.total_amount || 0
      }
    })

    return {
      total_customers: totalCustomers,
      total_amount: (totalAmount / 100).toFixed(2)
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      customerList: []
    })
    
    try {
      await this.loadCustomerData()
    } finally {
      wx.stopPullDownRefresh()
    }
  },

})
