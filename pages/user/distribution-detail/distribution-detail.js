const userAPI = require('../../../api/user.js')
const { formatTime } = require('../../../utils/index.js')

Page({
  data: {
    distributionId: null, // 分账ID
    distributionDetail: {}, // 分账基本信息
    productDetails: [], // 商品分账明细
    loading: true, // 加载状态
    totalQuantity: 0, // 商品总数量
    totalOriginalPrice: '0.00', // 原价总计
    totalPrivilegePrice: '0.00' // 特权价总计
  },

  onLoad(options) {
    const { id } = options
    if (!id) {
      wx.showToast({
        title: '分账ID无效',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.setData({
      distributionId: parseInt(id)
    })

    this.loadDistributionDetail()
  },

  onShow() {
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '分账明细'
    })
  },

  onPullDownRefresh() {
    this.loadDistributionDetail()
  },

  // 加载分账明细数据
  async loadDistributionDetail() {
    if (!this.data.distributionId) {
      return
    }

    this.setData({ loading: true })

    try {
      const response = await userAPI.getDistributionDetail(this.data.distributionId)
      
      if (response.code === 200) {
        const data = response.data || {}
        
        // 处理时间格式
        if (data.settled_at) {
          data.settled_at = formatTime(data.settled_at)
        }
        
        // 处理商品明细数据
        const details = data.details || []
        
        // 计算汇总数据
        let totalQuantity = 0
        let totalOriginalAmount = 0
        let totalPrivilegeAmount = 0
        
        details.forEach(detail => {
          totalQuantity += detail.quantity || 0
          totalOriginalAmount += (detail.original_price || 0) * (detail.quantity || 0)
          totalPrivilegeAmount += (detail.privilege_price || 0) * (detail.quantity || 0)
        })

        this.setData({
          distributionDetail: data,
          productDetails: details,
          totalQuantity: totalQuantity,
          totalOriginalPrice: (totalOriginalAmount / 100).toFixed(2),
          totalPrivilegePrice: (totalPrivilegeAmount / 100).toFixed(2)
        })
      } else {
        wx.showToast({
          title: response.message || '获取分账明细失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('加载分账明细失败:', error)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `分账明细 - 订单${this.data.distributionDetail.order_no}`,
      path: `/pages/user/distribution-detail/distribution-detail?id=${this.data.distributionId}`,
      imageUrl: ''
    }
  },

  onShareTimeline() {
    return {
      title: `我的分账明细 - 订单${this.data.distributionDetail.order_no}`,
      query: `id=${this.data.distributionId}`,
      imageUrl: ''
    }
  }
})
