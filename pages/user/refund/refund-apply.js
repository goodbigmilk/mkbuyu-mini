// 导入API接口
const orderApi = require('../../../api/order')
const refundApi = require('../../../api/refund')
const uploadApi = require('../../../api/upload')
const { showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    orderId: null,
    orderInfo: null,
    maxRefundAmount: 0,
    refundAmount: '',
    selectedReason: '',
    customReason: '',
    uploadedImages: [],
    submitting: false,
    canSubmit: false,
    
    // 退款原因选项
    reasonOptions: [
      { value: 'quality', label: '商品质量问题' },
      { value: 'description', label: '商品与描述不符' },
      { value: 'size', label: '尺寸不合适' },
      { value: 'damage', label: '商品损坏' },
      { value: 'delay', label: '发货延迟' },
      { value: 'wrong', label: '发错商品' },
      { value: 'change_mind', label: '不想要了' },
      { value: 'other', label: '其他原因' }
    ]
  },

  onLoad(options) {
    if (options.orderId) {
      // 保持 ID 为字符串，避免大数精度丢失
      this.setData({
        orderId: options.orderId
      })
      this.loadOrderInfo()
    } else {
      showToast('缺少订单信息')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 加载订单信息
  async loadOrderInfo() {
    try {
      // 这里应该调用订单详情接口，暂时模拟
      const result = await orderApi.getOrderDetail(this.data.orderId)
      
      if (result.code === 200) {
        const orderInfo = result.data
        const maxRefundAmount = orderInfo.payment_amount || orderInfo.total_amount
        
        this.setData({
          orderInfo,
          maxRefundAmount,
          refundAmount: (maxRefundAmount / 100).toString()
        })
        
        this.checkCanSubmit()
      } else {
        showToast(result.message || '获取订单信息失败')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载订单信息失败:', error)
      showToast('获取订单信息失败，请重试')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 退款金额输入
  onRefundAmountInput(e) {
    let value = e.detail.value
    
    // 限制输入格式为数字和小数点
    value = value.replace(/[^\d.]/g, '')
    
    // 限制只能有一个小数点
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts[1]
    }
    
    // 限制小数位数为2位
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    
    // 检查金额是否超出最大可退金额
    const numValue = parseFloat(value)
    const maxAmount = this.data.maxRefundAmount / 100
    
    if (numValue > maxAmount) {
      value = maxAmount.toString()
      showToast(`退款金额不能超过¥${maxAmount}`)
    }
    
    this.setData({
      refundAmount: value
    })
    
    this.checkCanSubmit()
  },

  // 设置最大退款金额
  setMaxAmount() {
    const maxAmount = (this.data.maxRefundAmount / 100).toString()
    this.setData({
      refundAmount: maxAmount
    })
    this.checkCanSubmit()
  },

  // 选择退款原因
  selectReason(e) {
    const value = e.currentTarget.dataset.value
    this.setData({
      selectedReason: value,
      customReason: '' // 切换原因时清空详细说明
    })
    
    this.checkCanSubmit()
  },

  // 自定义原因输入
  onCustomReasonInput(e) {
    this.setData({
      customReason: e.detail.value
    })
    this.checkCanSubmit()
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 9 - this.data.uploadedImages.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        maxDuration: 30,
        sizeType: ['compressed']
      })

      // 上传图片
      const uploadPromises = res.tempFiles.map(file => this.uploadImage(file.tempFilePath))
      
      wx.showLoading({ title: '上传中...' })
      
      try {
        const uploadResults = await Promise.all(uploadPromises)
        const newImages = uploadResults.filter(url => url).map(url => url)
        
        this.setData({
          uploadedImages: [...this.data.uploadedImages, ...newImages]
        })
        
        wx.hideLoading()
        showToast('上传成功')
      } catch (uploadError) {
        wx.hideLoading()
        console.error('上传图片失败:', uploadError)
        showToast('上传失败，请重试')
      }
    } catch (error) {
      if (error.errMsg !== 'chooseMedia:fail cancel') {
        console.error('选择图片失败:', error)
        showToast('选择图片失败')
      }
    }
  },

  // 上传单个图片
  async uploadImage(filePath) {
    try {
      const result = await uploadApi.uploadImage(filePath)
      if (result.code === 200) {
        return result.data.url
      } else {
        throw new Error(result.message || '上传失败')
      }
    } catch (error) {
      console.error('上传图片失败:', error)
      return null
    }
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      current: url,
      urls: this.data.uploadedImages
    })
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.uploadedImages]
    images.splice(index, 1)
    this.setData({
      uploadedImages: images
    })
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { refundAmount, selectedReason, customReason } = this.data
    
    // 检查退款金额
    const amount = parseFloat(refundAmount)
    if (!amount || amount <= 0) {
      this.setData({ canSubmit: false })
      return
    }
    
    // 检查是否选择了退款原因
    if (!selectedReason) {
      this.setData({ canSubmit: false })
      return
    }
    
    // 所有选项都需要填写详细说明
    if (!customReason.trim()) {
      this.setData({ canSubmit: false })
      return
    }
    
    this.setData({ canSubmit: true })
  },

  // 获取最终的退款原因
  getFinalReason() {
    const { selectedReason, customReason, reasonOptions } = this.data
    
    if (selectedReason === 'other') {
      return customReason.trim()
    } else {
      const option = reasonOptions.find(item => item.value === selectedReason)
      const reasonLabel = option ? option.label : ''
      const detailedReason = customReason.trim()
      return `${reasonLabel}：${detailedReason}`
    }
  },

  // 提交退款申请
  async submitRefund() {
    if (!this.data.canSubmit || this.data.submitting) return
    
    const confirmed = await showModal('确认申请', '确定要提交退款申请吗？')
    if (!confirmed) return
    
    this.setData({ submitting: true })
    
    try {
      const refundData = {
        order_id: this.data.orderId,
        refund_amount: Math.round(parseFloat(this.data.refundAmount) * 100), // 转换为分
        reason: this.getFinalReason(),
        images: this.data.uploadedImages
      }
      
      // 调用退款申请接口
      const result = await refundApi.createRefund(refundData)
      
      if (result.code === 200) {
        showToast('退款申请提交成功')
        
        // 延迟跳转回订单页面
        setTimeout(() => {
          wx.navigateBack({
            delta: 1
          })
        }, 1500)
      } else {
        showToast(result.message || '提交失败，请重试')
      }
    } catch (error) {
      console.error('提交退款申请失败:', error)
      showToast('提交失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  }
})
