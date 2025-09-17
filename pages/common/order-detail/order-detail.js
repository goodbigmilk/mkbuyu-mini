// pages/common/order-detail/order-detail.js
const orderApi = require('../../../api/order')
const { formatTime } = require('../../../utils/index')

Page({
  data: {
    orderId: null,
    orderDetail: null,
    loading: false,
    
    // 倒计时相关
    countdownTime: 0,
    countdownTimer: null,
    countdownDisplay: '',
    
    // 支付弹窗
    showPaymentModal: false
  },

  onLoad(options) {
    const { orderId, id, showPayment } = options
    const finalOrderId = orderId || id
    
    if (!finalOrderId) {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'error'
      })
      wx.navigateBack()
      return
    }
    
    this.setData({ 
      orderId: parseInt(finalOrderId),
      autoShowPayment: showPayment === 'true' // 记录是否需要自动显示支付弹窗
    })
    this.loadOrderDetail()
  },

  onShow() {
    // 页面显示时刷新订单状态
    if (this.data.orderId) {
      this.loadOrderDetail()
    }
  },

  onUnload() {
    // 页面卸载时清除倒计时
    this.clearCountdown()
  },

  // 加载订单详情
  async loadOrderDetail() {
    try {
      this.setData({ loading: true })
      
      const result = await orderApi.getOrderDetail(this.data.orderId)
      const orderDetail = result.data
      
      console.log('订单详情:', orderDetail)
      
      // 格式化时间
      if (orderDetail.created_at) {
        orderDetail.created_at = this.formatTime(orderDetail.created_at)
      }
      
      // 状态文本和颜色现在在WXML中直接处理，无需在JS中设置
      
      this.setData({ 
        orderDetail,
        loading: false 
      })
      
      // 如果是待付款状态，启动倒计时
      if (orderDetail.status === 1) {
        this.startCountdown()
        
        // 如果需要自动显示支付弹窗
        if (this.data.autoShowPayment) {
          setTimeout(() => {
            this.onShowPayment()
            this.setData({ autoShowPayment: false }) // 重置标记
          }, 500) // 稍作延迟确保页面渲染完成
        }
      }
      
    } catch (error) {
      console.error('加载订单详情失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'error'
      })
    }
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '';
    
    try {
      const date = new Date(timeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return timeStr;
    }
  },



  // 启动倒计时
  startCountdown() {
    const { orderDetail } = this.data
    if (!orderDetail || orderDetail.status !== 1) return
    
    // 计算剩余时间（订单创建后30分钟内可支付）
    const createTime = new Date(orderDetail.created_at).getTime()
    const now = Date.now()
    const timeLimit = 30 * 60 * 1000 // 30分钟
    const remainingTime = Math.max(0, createTime + timeLimit - now)
    
    if (remainingTime <= 0) {
      // 订单已超时，应该自动取消
      this.setData({ countdownDisplay: '订单已超时' })
      return
    }
    
    this.setData({ countdownTime: Math.floor(remainingTime / 1000) })
    this.updateCountdownDisplay()
    
    // 启动定时器
    this.data.countdownTimer = setInterval(() => {
      const { countdownTime } = this.data
      if (countdownTime <= 0) {
        this.clearCountdown()
        this.setData({ countdownDisplay: '订单已超时' })
        // 刷新订单状态
        this.loadOrderDetail()
        return
      }
      
      this.setData({ countdownTime: countdownTime - 1 })
      this.updateCountdownDisplay()
    }, 1000)
  },

  // 更新倒计时显示
  updateCountdownDisplay() {
    const { countdownTime } = this.data
    const minutes = Math.floor(countdownTime / 60)
    const seconds = countdownTime % 60
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    this.setData({ countdownDisplay: display })
  },

  // 清除倒计时
  clearCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
      this.setData({ countdownTimer: null })
    }
  },

  // 取消订单
  async onCancelOrder() {
    const { orderDetail } = this.data
    
    if (!orderDetail || orderDetail.status !== 1) {
      wx.showToast({
        title: '当前订单状态不允许取消',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      confirmText: '确认取消',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })
            
            await orderApi.cancelOrder(orderDetail.id)
            
            wx.hideLoading()
            wx.showToast({
              title: '订单已取消',
              icon: 'success'
            })
            
            // 刷新订单详情
            this.loadOrderDetail()
            this.clearCountdown()
            
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: error.message || '取消失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 显示支付弹窗
  onShowPayment() {
    const { orderDetail } = this.data
    
    if (!orderDetail || orderDetail.status !== 1) {
      wx.showToast({
        title: '当前订单状态不允许支付',
        icon: 'none'
      })
      return
    }
    
    this.setData({ showPaymentModal: true })
  },

  // 隐藏支付弹窗
  onHidePayment() {
    this.setData({ showPaymentModal: false })
  },

  // 支付成功回调
  onPaymentSuccess(e) {
    // 隐藏支付弹窗
    this.setData({ showPaymentModal: false })
    
    // 刷新订单详情
    this.loadOrderDetail()
    this.clearCountdown()
  },

  // 支付失败回调
  onPaymentError(e) {
    console.error('支付失败:', e.detail.error)
    // 支付失败的处理已经在组件内部完成，这里可以做额外的处理
  },

  // 跳转到商品详情
  onProductTap(e) {
    const { product } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/user/product/detail/detail?id=${product.id}`
    })
  },

  // 复制订单号
  onCopyOrderNo() {
    const { orderDetail } = this.data
    wx.setClipboardData({
      data: orderDetail.order_no,
      success: () => {
        wx.showToast({
          title: '订单号已复制',
          icon: 'success'
        })
      }
    })
  },

  // 确认收货
  async onConfirmReceipt() {
    const { orderDetail } = this.data
    
    if (!orderDetail || orderDetail.status !== 3) {
      wx.showToast({
        title: '当前订单状态不允许确认收货',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认收货',
      content: '请确认您已收到商品，确认后订单将完成',
      confirmText: '确认收货',
      confirmColor: '#07c160',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            await orderApi.confirmReceipt(orderDetail.id)
            
            wx.hideLoading()
            wx.showToast({
              title: '收货成功',
              icon: 'success'
            })
            
            // 刷新订单详情
            this.loadOrderDetail()
            
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: error.message || '确认收货失败',
              icon: 'error'
            })
          }
        }
      }
    })
  }
}) 