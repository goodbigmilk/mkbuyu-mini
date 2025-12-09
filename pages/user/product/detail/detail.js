// pages/user/product/detail/detail.js
const productApi = require('../../../../api/product')
const cartApi = require('../../../../api/cart')
const orderApi = require('../../../../api/order')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    productId: null,
    productDetail: null,
    loading: false,
    buyQuantity: 1, // 购买数量
    currentImageIndex: 0, // 当前图片索引
    
    // 购买方式弹窗
    showBuyModal: false,
    buyType: 'cart' // cart: 加入购物车, now: 立即购买
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options
    if (id) {
      // 保持 ID 为字符串，避免大数精度丢失
      this.setData({ productId: id })
      this.loadProductDetail()
    }
  },

  // 加载商品详情
  async loadProductDetail() {
    try {
      this.setData({ loading: true })

      // 调用商品详情API
      const resp = await productApi.getProductDetail(this.data.productId)
      const data = resp && resp.data ? resp.data : null

      if (!data) {
        throw new Error('empty product detail')
      }

      // 映射图片数组（后端返回 images: [{url, ...}]）
      const imageUrls = Array.isArray(data.images) && data.images.length > 0
        ? data.images.map(img => img.url).filter(Boolean)
        : []

      const detail = {
        id: data.id,
        product_id: data.product_id, // 使用后端返回的product_id字符串（JSON标签设置为string）
        name: data.name,
        price: data.price,
        displayPrice: (data.price / 100).toFixed(2),
        stock: data.stock,
        salesCount: data.sales_count || 0,
        description: data.description || '',
        images: imageUrls.length > 0 ? imageUrls : ['https://via.placeholder.com/600x600?text=No+Image']
      }

      this.setData({ 
        productDetail: detail,
        currentImageIndex: 0
      })
    } catch (error) {
      console.error('load product detail failed:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示购买弹窗
  onShowBuyModal(e) {
    const { type } = e.currentTarget.dataset
    this.setData({ 
      showBuyModal: true,
      buyType: type 
    })
  },

  // 隐藏购买弹窗
  onHideBuyModal() {
    this.setData({ showBuyModal: false })
  },

  // 修改购买数量
  onQuantityChange(e) {
    this.setData({ buyQuantity: e.detail })
  },

  // swiper 切换监听
  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current })
  },

  // 确认购买
  async onConfirmBuy() {
    const { productDetail, buyQuantity, buyType } = this.data

    // 兜底校验库存
    if (productDetail && productDetail.stock && buyQuantity > productDetail.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }
    
    if (buyType === 'cart') {
      // 加入购物车
      await this.addToCart()
    } else {
      // 立即购买
      await this.buyNow()
    }
  },

  // 加入购物车
  async addToCart() {
    try {
      wx.showLoading({ title: '加入中...' })
      
      // 使用product_id业务ID,后端会自动将字符串转为int64
      const response = await cartApi.addToCart({
        product_id: this.data.productDetail.product_id,
        quantity: this.data.buyQuantity
      })
      
      if (response.code === 200) {
        wx.showToast({
          title: '已加入购物车',
          icon: 'success'
        })
        this.setData({ showBuyModal: false })
      } else {
        throw new Error(response.message || '加入购物车失败')
      }
      
    } catch (error) {
      wx.showToast({
        title: error.message || '加入购物车失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 立即购买
  async buyNow() {
    try {
      wx.showLoading({ title: '正在下单...' })
      
      // 准备订单数据，使用product_id字符串避免精度丢失
      const orderData = {
        product_id: this.data.productDetail.product_id,
        quantity: this.data.buyQuantity,
        remark: ''
      }
      
      const response = await orderApi.createOrderNow(orderData)
      
      if (response.code === 200) {
        const { order_id } = response.data
        
        wx.hideLoading()
        this.setData({ showBuyModal: false })
        
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        })
        
        // 跳转到订单详情页面
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/common/order-detail/order-detail?id=${order_id}&type=user`
          })
        }, 1200)
        
      } else {
        throw new Error(response.message || '下单失败')
      }
      
    } catch (error) {
      console.error('buy now failed:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '下单失败，请重试',
        icon: 'none'
      })
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {}
})