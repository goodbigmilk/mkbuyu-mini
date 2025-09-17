const groupPricingAPI = require('../../../api/group-pricing.js')

Page({
  data: {
    // 分组信息
    groupSummary: null,
    
    // 商品列表相关
    productList: [],
    keyword: '',
    sortType: 'default',
    sortOptions: [
      { text: '默认排序', value: 'default' },
      { text: '价格从低到高', value: 'price_asc' },
      { text: '价格从高到低', value: 'price_desc' },
      { text: '销量从高到低', value: 'sales_desc' }
    ],
    
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    
    // 选择相关
    selectedProducts: [],
    totalSelectedQuantity: 0,
    estimatedTotalAmount: 0,
    estimatedTotalAmountDisplay: '0.00',
    
    // 快速购买弹窗
    showQuickBuyPopup: false,
    selectedProduct: null,
    quickBuyQuantity: 1,
    quickBuyLoading: false,
    
    // 批量下单
    batchOrderLoading: false
  },

  onStopTap() {},

  onLoad() {
    this.loadGroupSummary()
    this.loadProductList(true)
  },

  onShow() {
    // 重新加载数据以确保最新状态
    this.loadGroupSummary()
  },

  onPullDownRefresh() {
    this.loadProductList(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadProductList()
    }
  },

  // 加载用户分组汇总信息
  async loadGroupSummary() {
    try {
      const response = await groupPricingAPI.getUserGroupPricingSummary()
      
      if (response.code === 200) {
        this.setData({ groupSummary: response.data })
      }
    } catch (error) {
      console.error('加载分组信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载商品列表
  async loadProductList(reset = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const page = reset ? 1 : this.data.currentPage + 1
      const params = {
        page,
        page_size: this.data.pageSize,
        keyword: this.data.keyword,
        sort: this.data.sortType === 'default' ? undefined : this.data.sortType
      }

      const response = await groupPricingAPI.getUserGroupProducts(params)
      
      if (response.code === 200) {
        const { list, total } = response.data
        
        // 为每个商品添加选择状态与默认数量
        const products = list.map(item => ({
          ...item,
          selected: false,
          batch_quantity: 1
        }))

        if (reset) {
          this.setData({
            productList: products,
            currentPage: 1,
            hasMore: products.length < total,
            selectedProducts: [],
            totalSelectedQuantity: 0,
            estimatedTotalAmount: 0,
            estimatedTotalAmountDisplay: '0.00'
          })
        } else {
          this.setData({
            productList: [...this.data.productList, ...products],
            currentPage: page,
            hasMore: this.data.productList.length + products.length < total
          })
        }
      }
    } catch (error) {
      console.error('加载商品列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 搜索商品
  onSearch() {
    this.loadProductList(true)
  },

  // 搜索内容变化
  onSearchChange(e) {
    this.setData({ keyword: e.detail })
  },

  // 排序变化
  onSortChange(e) {
    this.setData({ sortType: e.detail })
    this.loadProductList(true)
  },

  // 商品点击
  onProductTap(e) {
    const product = e.currentTarget.dataset.product
    wx.navigateTo({
      url: `/pages/user/product/detail?id=${product.id}&from=groupPricing`
    })
  },

  // 选择商品
  onSelectProduct(e) {
    const index = e.currentTarget.dataset.index
    const productList = [...this.data.productList]
    productList[index].selected = !productList[index].selected

    // 更新选中的商品列表
    const selectedProducts = productList.filter(item => item.selected)

    this.setData({
      productList,
      selectedProducts
    })

    this.recalculateBatchSummary()
  },

  // 批量数量变化
  onBatchQuantityChange(e) {
    const index = e.currentTarget.dataset.index
    const value = e.detail
    const productList = [...this.data.productList]
    productList[index].batch_quantity = value

    // 如果未选中则同时选中
    if (!productList[index].selected) {
      productList[index].selected = true
    }

    const selectedProducts = productList.filter(item => item.selected)

    this.setData({
      productList,
      selectedProducts
    })

    this.recalculateBatchSummary()
  },

  // 重新计算底部合计
  recalculateBatchSummary() {
    const { selectedProducts } = this.data
    let totalQty = 0
    let totalAmount = 0
    selectedProducts.forEach(p => {
      const qty = p.batch_quantity || 1
      totalQty += qty
      totalAmount += (p.group_price || 0) * qty
    })
    this.setData({
      totalSelectedQuantity: totalQty,
      estimatedTotalAmount: totalAmount,
      estimatedTotalAmountDisplay: (totalAmount / 100).toFixed(2)
    })
  },

  // 快速购买
  onQuickBuy(e) {
    const product = e.currentTarget.dataset.product
    this.setData({
      selectedProduct: product,
      quickBuyQuantity: 1,
      showQuickBuyPopup: true
    })
  },

  // 关闭快速购买弹窗
  onCloseQuickBuy() {
    this.setData({
      showQuickBuyPopup: false,
      selectedProduct: null,
      quickBuyQuantity: 1
    })
  },

  // 购买数量变化
  onQuantityChange(e) {
    this.setData({ quickBuyQuantity: e.detail })
  },

  // 确认快速购买
  async onConfirmQuickBuy() {
    if (this.data.quickBuyLoading) return

    const { selectedProduct, quickBuyQuantity } = this.data

    if (!selectedProduct || quickBuyQuantity < 1) {
      wx.showToast({
        title: '请选择商品和数量',
        icon: 'none'
      })
      return
    }

    this.setData({ quickBuyLoading: true })

    try {
      const orderData = {
        items: [{
          product_id: selectedProduct.id,
          quantity: quickBuyQuantity
        }]
      }

      // 先计算订单金额
      const calculateResponse = await groupPricingAPI.calculateGroupPricingOrder(orderData)
      
      if (calculateResponse.code !== 200) {
        throw new Error(calculateResponse.message || '计算订单失败')
      }

      // 创建订单
      const createResponse = await groupPricingAPI.createGroupPricingOrder(orderData)
      
      if (createResponse.code === 200) {
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        })

        // 关闭弹窗
        this.onCloseQuickBuy()

        // 跳转到订单详情页面
        const orderId = createResponse.data.order_id
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/user/order/detail?id=${orderId}`
          })
        }, 1500)
      } else {
        throw new Error(createResponse.message || '下单失败')
      }
    } catch (error) {
      console.error('快速购买失败:', error)
      wx.showToast({
        title: error.message || '下单失败',
        icon: 'none'
      })
    } finally {
      this.setData({ quickBuyLoading: false })
    }
  },

  // 批量下单
  async onBatchOrder() {
    if (this.data.batchOrderLoading) return

    const { selectedProducts } = this.data

    if (selectedProducts.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      })
      return
    }

    // 显示确认对话框
    const totalQty = this.data.totalSelectedQuantity
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '确认下单',
        content: `确定要购买${totalQty}件商品吗？`,
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirmResult) return

    this.setData({ batchOrderLoading: true })

    try {
      const orderData = {
        items: selectedProducts.map(product => ({
          product_id: product.id,
          quantity: product.batch_quantity || 1
        }))
      }

      // 先计算订单金额
      const calculateResponse = await groupPricingAPI.calculateGroupPricingOrder(orderData)
      
      if (calculateResponse.code !== 200) {
        throw new Error(calculateResponse.message || '计算订单失败')
      }

      // 创建订单
      const createResponse = await groupPricingAPI.createGroupPricingOrder(orderData)
      
      if (createResponse.code === 200) {
        wx.showToast({
          title: '批量下单成功',
          icon: 'none'
        })

        // 清除选择状态
        const productList = this.data.productList.map(item => ({
          ...item,
          selected: false,
          batch_quantity: 1
        }))

        this.setData({
          productList,
          selectedProducts: [],
          totalSelectedQuantity: 0,
          estimatedTotalAmount: 0,
          estimatedTotalAmountDisplay: '0.00'
        })

        // 跳转到订单详情页面
        const orderId = createResponse.data.order_id
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/user/order/detail?id=${orderId}`
          })
        }, 1500)
      } else {
        throw new Error(createResponse.message || '批量下单失败')
      }
    } catch (error) {
      console.error('批量下单失败:', error)
      wx.showToast({
        title: error.message || '下单失败',
        icon: 'none'
      })
    } finally {
      this.setData({ batchOrderLoading: false })
    }
  }
})