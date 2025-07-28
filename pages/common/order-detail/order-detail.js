// 订单详情页面
const orderApi = require('../../../api/order')
const { formatPrice, formatTime, showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    orderId: '',
    orderType: 'user', // user | merchant
    orderDetail: null,
    loading: true,
    
    // 物流信息
    showLogistics: false,
    
    // 支付方式选择
    showPayment: false,
    paymentMethods: [
      { key: 'wechat', name: '微信支付', icon: '/assets/images/wechat-pay.png' },
      { key: 'alipay', name: '支付宝', icon: '/assets/images/alipay.png' }
    ],
    selectedPayment: 'wechat'
  },

  onLoad(options) {
    const { id, type = 'user' } = options
    this.setData({
      orderId: id,
      orderType: type
    })
    
    if (id) {
      this.loadOrderDetail()
    }
  },

  onShow() {
    // 可能从支付页面返回，需要刷新订单状态
    if (this.data.orderId) {
      this.loadOrderDetail()
    }
  },

  // 加载订单详情
  async loadOrderDetail() {
    if (!this.data.orderId) return
    
    this.setData({ loading: true })
    
    try {
      const result = await orderApi.getOrderDetail(this.data.orderId)
      
      if (result.code === 200) {
        this.setData({
          orderDetail: result.data,
          loading: false
        })
        
        // 设置页面标题
        wx.setNavigationBarTitle({
          title: `订单详情 - ${this.getStatusText(result.data.status)}`
        })
      } else {
        showToast(result.message || '加载失败')
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('加载订单详情失败:', error)
      showToast('加载失败，请重试')
      this.setData({ loading: false })
      
      // 加载失败返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 复制订单号
  copyOrderNo() {
    if (!this.data.orderDetail) return
    
    wx.setClipboardData({
      data: this.data.orderDetail.order_no,
      success: () => {
        showToast('订单号已复制')
      }
    })
  },

  // 查看物流信息
  viewLogistics() {
    if (!this.data.orderDetail || !this.data.orderDetail.shipping_no) {
      showToast('暂无物流信息')
      return
    }
    
    // TODO: 跳转到物流查询页面或显示物流弹窗
    this.setData({ showLogistics: true })
  },

  // 关闭物流信息
  closeLogistics() {
    this.setData({ showLogistics: false })
  },

  // 取消订单
  async cancelOrder() {
    if (!this.data.orderDetail) return
    
    const confirmed = await showModal('确认取消', '确定要取消该订单吗？')
    if (!confirmed) return
    
    try {
      const result = await orderApi.cancelOrder(this.data.orderId)
      
      if (result.code === 200) {
        showToast('订单已取消')
        this.loadOrderDetail()
      } else {
        showToast(result.message || '取消失败')
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      showToast('取消失败，请重试')
    }
  },

  // 确认收货
  async confirmReceipt() {
    if (!this.data.orderDetail) return
    
    const confirmed = await showModal('确认收货', '确定已收到商品吗？')
    if (!confirmed) return
    
    try {
      const result = await orderApi.confirmReceipt(this.data.orderId)
      
      if (result.code === 200) {
        showToast('确认收货成功')
        this.loadOrderDetail()
      } else {
        showToast(result.message || '确认收货失败')
      }
    } catch (error) {
      console.error('确认收货失败:', error)
      showToast('确认收货失败，请重试')
    }
  },

  // 显示支付方式选择
  showPaymentMethods() {
    this.setData({ showPayment: true })
  },

  // 隐藏支付方式选择
  hidePaymentMethods() {
    this.setData({ showPayment: false })
  },

  // 选择支付方式
  selectPayment(e) {
    const { method } = e.currentTarget.dataset
    this.setData({ selectedPayment: method })
  },

  // 确认支付
  async confirmPayment() {
    if (!this.data.orderDetail) return
    
    const { order_no } = this.data.orderDetail
    const paymentMethod = this.data.selectedPayment
    
    this.setData({ showPayment: false })
    
    // TODO: 根据支付方式调用不同的支付接口
    try {
      if (paymentMethod === 'wechat') {
        await this.wxPay(order_no)
      } else if (paymentMethod === 'alipay') {
        await this.aliPay(order_no)
      } else {
        showToast('暂不支持该支付方式')
      }
    } catch (error) {
      console.error('支付失败:', error)
      showToast('支付失败，请重试')
    }
  },

  // 微信支付
  async wxPay(orderNo) {
    try {
      // TODO: 调用微信支付统一下单接口
      const payParams = await orderApi.wxPayUnifiedOrder(orderNo)
      
      // 调起微信支付
      wx.requestPayment({
        ...payParams,
        success: (res) => {
          console.log('支付成功:', res)
          this.handlePaymentSuccess(orderNo)
        },
        fail: (err) => {
          console.error('支付失败:', err)
          if (err.errMsg !== 'requestPayment:fail cancel') {
            showToast('支付失败')
          }
        }
      })
    } catch (error) {
      console.error('微信支付失败:', error)
      showToast('支付失败，请重试')
    }
  },

  // 支付宝支付
  async aliPay(orderNo) {
    // TODO: 实现支付宝支付逻辑
    showToast('支付宝支付功能开发中')
  },

  // 处理支付成功
  async handlePaymentSuccess(orderNo) {
    try {
      // 调用支付成功回调接口
      await orderApi.payOrder(orderNo)
      
      showToast('支付成功')
      
      // 刷新订单详情
      setTimeout(() => {
        this.loadOrderDetail()
      }, 1000)
    } catch (error) {
      console.error('支付回调失败:', error)
      // 虽然支付成功，但回调失败，仍需刷新页面
      this.loadOrderDetail()
    }
  },

  // 商家发货
  async merchantShipOrder() {
    if (this.data.orderType !== 'merchant') return
    
    // TODO: 显示发货弹窗，输入物流公司和运单号
    wx.showModal({
      title: '订单发货',
      content: '请在管理后台进行发货操作',
      showCancel: false
    })
  },

  // 更新订单状态（商家用）
  async updateOrderStatus(e) {
    if (this.data.orderType !== 'merchant') return
    
    const { status } = e.currentTarget.dataset
    
    try {
      const result = await orderApi.updateOrderStatus(this.data.orderId, status)
      
      if (result.code === 200) {
        showToast('状态更新成功')
        this.loadOrderDetail()
      } else {
        showToast(result.message || '更新失败')
      }
    } catch (error) {
      console.error('更新订单状态失败:', error)
      showToast('更新失败，请重试')
    }
  },

  // 联系客服
  contactService() {
    // TODO: 实现联系客服功能
    showToast('客服功能开发中')
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

  // 获取订单可操作的按钮
  getOrderActions() {
    if (!this.data.orderDetail) return []
    
    const { status } = this.data.orderDetail
    const { orderType } = this.data
    const actions = []
    
    if (orderType === 'user') {
      // 用户端操作按钮
      switch (status) {
        case 1: // 待付款
          actions.push({ key: 'cancel', text: '取消订单', type: 'default' })
          actions.push({ key: 'pay', text: '立即支付', type: 'primary' })
          break
        case 2: // 待发货
          actions.push({ key: 'service', text: '联系客服', type: 'default' })
          break
        case 3: // 待收货
          actions.push({ key: 'logistics', text: '查看物流', type: 'default' })
          actions.push({ key: 'confirm', text: '确认收货', type: 'primary' })
          break
        case 4: // 已完成
          actions.push({ key: 'service', text: '联系客服', type: 'default' })
          break
      }
    } else if (orderType === 'merchant') {
      // 商家端操作按钮
      switch (status) {
        case 2: // 待发货
          actions.push({ key: 'ship', text: '立即发货', type: 'primary' })
          break
        case 3: // 待收货
          actions.push({ key: 'logistics', text: '查看物流', type: 'default' })
          break
      }
    }
    
    return actions
  }
}) 