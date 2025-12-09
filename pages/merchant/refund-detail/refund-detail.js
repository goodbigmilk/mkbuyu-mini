// 导入API接口
const refundApi = require('../../../api/refund')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    refundId: null,
    refundDetail: null,
    loading: true,
    processing: false
  },

  onLoad(options) {
    if (options.id) {
      // 保持 ID 为字符串，避免大数精度丢失
      this.setData({
        refundId: options.id
      })
      this.loadRefundDetail()
    } else {
      showToast('退款申请ID无效')
      wx.navigateBack()
    }
  },

  // 加载退款申请详情
  async loadRefundDetail() {
    if (!this.data.refundId) return
    
    this.setData({ loading: true })
    
    try {
      const result = await refundApi.getShopRefundDetail(this.data.refundId)
      
      if (result.code === 200) {
        this.setData({
          refundDetail: result.data,
          loading: false
        })
        
        // 设置页面标题
        const statusText = this.getRefundStatusText(result.data.status)
        wx.setNavigationBarTitle({
          title: `退款详情 - ${statusText}`
        })
      } else {
        showToast(result.message || '加载失败')
        this.setData({ loading: false })
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      }
    } catch (error) {
      console.error('加载退款详情失败:', error)
      showToast('加载失败，请重试')
      this.setData({ loading: false })
      setTimeout(() => {
        wx.navigateBack()
      }, 2000)
    }
  },

  // 处理退款申请
  async processRefund(e) {
    const { approved } = e.currentTarget.dataset
    const { refundDetail } = this.data
    
    if (!refundDetail) {
      showToast('退款申请信息不存在')
      return
    }

    // 只有待处理状态的退款申请可以操作
    if (refundDetail.status !== 1) {
      showToast('当前状态不允许操作')
      return
    }

    const actionText = approved ? '同意' : '拒绝'
    const confirmed = await showModal(`确认${actionText}`, `确定要${actionText}此退款申请吗？`)
    if (!confirmed) return

    this.setData({ processing: true })

    try {
      const params = {
        approved: approved,
        admin_remark: approved ? '商家同意退款申请' : '商家拒绝退款申请'
      }

      // TODO: 如果同意退款，这里应该调用支付系统进行实际退款操作
      // 暂时只更新状态，不进行实际退款
      
      const result = await refundApi.processRefundRequest(this.data.refundId, params)
      
      if (result.code === 200) {
        showToast(`${actionText}成功`)
        
        // 重新加载详情页面
        setTimeout(() => {
          this.loadRefundDetail()
        }, 1500)
      } else {
        showToast(result.message || `${actionText}失败`)
      }
    } catch (error) {
      console.error(`${actionText}退款申请失败:`, error)
      showToast(`${actionText}失败，请重试`)
    } finally {
      this.setData({ processing: false })
    }
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    const { refundDetail } = this.data
    
    if (!refundDetail || !refundDetail.images) return
    
    const urls = refundDetail.images.map(img => img.url)
    const current = url
    
    wx.previewImage({
      current,
      urls
    })
  },

  // 查看关联订单详情
  viewOrderDetail() {
    const { refundDetail } = this.data
    
    if (!refundDetail || !refundDetail.order) {
      showToast('订单信息不存在')
      return
    }

    wx.navigateTo({
      url: `/pages/common/order-detail/order-detail?id=${refundDetail.order.id}`
    })
  },

  // 联系用户
  contactUser() {
    const { refundDetail } = this.data
    
    if (!refundDetail || !refundDetail.user) {
      showToast('用户信息不存在')
      return
    }

    // TODO: 这里可以实现联系用户的功能，比如跳转到客服页面
    // 现在暂时显示用户手机号
    if (refundDetail.user.phone) {
      wx.makePhoneCall({
        phoneNumber: refundDetail.user.phone
      }).catch(() => {
        // 用户取消了通话，这是正常情况，不需要处理
      })
    } else {
      showToast('用户未提供联系方式')
    }
  },

  // 获取退款状态文本
  getRefundStatusText(status) {
    const statusMap = {
      1: '待处理',
      2: '已同意',
      3: '已拒绝'
    }
    return statusMap[status] || '未知状态'
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

  // 获取订单状态文本
  getOrderStatusText(status) {
    const statusMap = {
      1: '待支付',
      2: '待发货',
      3: '待收货',
      4: '待评价',
      5: '已完成',
      6: '退款中',
      7: '已退款',
      8: '已取消'
    }
    return statusMap[status] || '未知状态'
  },

  // 格式化价格
  formatPrice,
  
  // 格式化时间
  formatTime
})
