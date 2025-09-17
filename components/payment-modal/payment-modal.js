// 支付弹窗组件
const orderApi = require('../../api/order')

Component({
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    },
    // 支付金额（分）
    paymentAmount: {
      type: Number,
      value: 0
    },
    // 订单信息
    orderInfo: {
      type: Object,
      value: null
    }
  },

  data: {
    // 支付方式列表
    paymentMethods: [
      { id: 'wechat', name: '微信支付', icon: 'wechat', disabled: false },
      { id: 'alipay', name: '支付宝', icon: 'alipay', disabled: false },
      { id: 'balance', name: '余额支付', icon: 'gold-coin-o', disabled: true }
    ],
    // 当前选中的支付方式
    selectedPaymentMethod: 'wechat'
  },

  methods: {
    // 隐藏支付弹窗
    onHidePayment() {
      this.triggerEvent('close')
    },

    // 选择支付方式
    onSelectPaymentMethod(e) {
      let method = ''
      
      if (e.detail) {
        // 来自 van-radio-group 的 change 事件
        method = e.detail
      } else if (e.currentTarget && e.currentTarget.dataset) {
        // 来自 van-cell 的 click 事件
        method = e.currentTarget.dataset.method
      }
      
      if (method) {
        // 检查是否是禁用的支付方式
        const paymentMethod = this.data.paymentMethods.find(item => item.id === method)
        if (!paymentMethod || paymentMethod.disabled) {
          return
        }
        
        this.setData({ selectedPaymentMethod: method })
      }
    },

    // 确认支付
    async onConfirmPayment() {
      const { orderInfo, selectedPaymentMethod, paymentAmount } = this.data
      
      if (!orderInfo) {
        wx.showToast({
          title: '订单信息缺失',
          icon: 'error'
        })
        return
      }
      
      // 计算实际支付金额（订单总金额）
      // 优先使用传入的paymentAmount，如果没有则使用订单的total_amount
      const actualPaymentAmount = orderInfo.total_amount || 0
      
      console.log('支付组件 - 支付金额信息:', {
        paymentAmount: paymentAmount,
        paymentAmountType: typeof paymentAmount,
        orderTotalAmount: orderInfo.total_amount,
        orderTotalAmountType: typeof orderInfo.total_amount,
        actualPaymentAmount: actualPaymentAmount,
        actualPaymentAmountType: typeof actualPaymentAmount,
        orderNo: orderInfo.order_no || orderInfo.orderNo,
        orderInfo: orderInfo
      })
      
      if (actualPaymentAmount <= 0) {
        wx.showToast({
          title: '支付金额错误',
          icon: 'error'
        })
        return
      }
      
      try {
        wx.showLoading({ title: '支付中...' })
        
        // 模拟支付处理，实际项目中这里应该调用真实的支付接口
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 调用支付成功回调接口
        const orderNo = orderInfo.order_no || orderInfo.orderNo
        
        console.log('支付API调用参数:', {
          orderNo: orderNo,
          paymentAmount: actualPaymentAmount,
          paymentMethod: selectedPaymentMethod
        })
        
        await orderApi.payOrder(orderNo, actualPaymentAmount, selectedPaymentMethod)
        
        wx.hideLoading()
        
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        })
        
        // 隐藏弹窗
        this.onHidePayment()
        
        // 触发支付成功事件
        this.triggerEvent('paymentSuccess', {
          orderInfo,
          paymentMethod: selectedPaymentMethod,
          amount: actualPaymentAmount
        })
        
      } catch (error) {
        wx.hideLoading()
        wx.showToast({
          title: error.message || '支付失败',
          icon: 'error'
        })
        
        // 触发支付失败事件
        this.triggerEvent('paymentError', {
          error: error.message || '支付失败',
          orderInfo,
          paymentMethod: selectedPaymentMethod
        })
      }
    }
  }
})
