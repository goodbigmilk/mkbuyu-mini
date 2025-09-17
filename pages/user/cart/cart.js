// pages/user/cart/cart.js
const cartApi = require('../../../api/cart')
const orderApi = require('../../../api/order')

Page({
  data: {
    // 购物车数据
    cartItems: [],
    cartCount: 0,
    
    // 总价信息
    totalPrice: 0,
    totalOriginPrice: 0,
    discountAmount: 0,
    selectedCount: 0,
    selectedItemsCount: 0,
    isAllSelected: false,
    
    // 格式化价格字段
    formattedTotalPrice: '0.00',
    formattedDiscountAmount: '0.00',
    
    // UI状态
    loading: false,
    loadingMore: false,
    editMode: false,
    
    // 失效商品
    invalidItems: [],
    showInvalid: false
  },

  onLoad(options) {
    this.loadCartData()
  },

  onShow() {
    // 更新tabbar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 1
      })
    }
    
    // 重置编辑模式状态
    this.setData({ editMode: false })
    
    // 重新加载购物车数据
    this.loadCartData()
  },

  onPullDownRefresh() {
    this.loadCartData()
  },

  // 加载购物车数据
  async loadCartData() {
    try {
      this.setData({ loading: true })
      
      const response = await cartApi.getCartList()
      
      if (response.code === 200) {
        const data = response.data
        const cartItems = (data.items || []).map(item => ({
          ...item,
          formattedPrice: ((item.product?.price || 0) / 100).toFixed(2),
          formattedOriginPrice: ((item.product?.origin_price || item.product?.price || 0) / 100).toFixed(2)
        }))
        const invalidItems = (data.invalid_items || []).map(item => ({
          ...item,
          formattedPrice: ((item.product?.price || 0) / 100).toFixed(2)
        }))
        
        this.setData({
          cartItems,
          invalidItems,
          cartCount: cartItems.length,
          showInvalid: invalidItems.length > 0
        })
        
        // 计算总价
        this.calculateTotal()
        
        // 更新tabbar购物车数量
        this.updateTabBarCount()
      } else {
        throw new Error(response.message || '加载购物车失败')
      }
    } catch (error) {
      console.error('加载购物车数据失败:', error)
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 获取选中的商品列表
  getSelectedItems() {
    return this.data.cartItems.filter(item => item.selected)
  },

  // 获取选中商品的数量
  getSelectedCount() {
    return this.getSelectedItems().length
  },

  // 检查是否全选
  isAllSelected() {
    const cartItems = this.data.cartItems
    return cartItems.length > 0 && cartItems.every(item => item.selected)
  },

  // 商品点击 - 跳转到详情页
  onProductTap(e) {
    const { productId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/user/product/detail/detail?id=${productId}`
    })
  },

  // 选择商品
  async onSelectItem(e) {
    const { cartId } = e.currentTarget.dataset
    const newSelected = e.detail // checkbox的新状态
    
    try {
      // 更新数据库中的选中状态
      await cartApi.updateCartSelected(cartId, newSelected)
      
      // 更新本地状态
      const cartItems = this.data.cartItems.map(item => {
        if (item.id === cartId) {
          return { ...item, selected: newSelected }
        }
        return item
      })
      
      this.setData({ cartItems })
      
      // 重新计算总价
      this.calculateTotal()
    } catch (error) {
      console.error('更新选中状态失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
      
      // 如果更新失败，重新加载数据恢复状态
      this.loadCartData()
    }
  },

  // 全选/取消全选
  async onSelectAll(e) {
    const newSelected = e.detail // checkbox的新状态
    
    if (this.data.cartItems.length === 0) {
      return
    }
    
    try {
      wx.showLoading({ title: '操作中...' })
      
      // 批量更新数据库中的选中状态
      await cartApi.batchUpdateSelected(newSelected)
      
      // 更新本地状态 - 所有商品设置为相同的选中状态
      const cartItems = this.data.cartItems.map(item => ({
        ...item,
        selected: newSelected
      }))
      
      this.setData({ cartItems })
      
      // 重新计算总价
      this.calculateTotal()
    } catch (error) {
      console.error('全选操作失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
      
      // 如果更新失败，重新加载数据恢复状态
      this.loadCartData()
    } finally {
      wx.hideLoading()
    }
  },

  // 删除商品
  onDeleteItem(e) {
    const { cartId } = e.currentTarget.dataset
    const cartItem = this.data.cartItems.find(item => item.id === cartId)
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${cartItem?.product?.name || '该商品'}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.deleteCartItem(cartId)
        }
      }
    })
  },

  // 执行删除操作
  async deleteCartItem(cartId) {
    try {
      wx.showLoading({ title: '删除中...' })
      
      await cartApi.deleteCartItem(cartId)
      
      // 更新本地状态
      const cartItems = this.data.cartItems.filter(item => item.id !== cartId)
      
      this.setData({
        cartItems,
        cartCount: cartItems.length
      })
      
      this.calculateTotal()
      this.updateTabBarCount()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('删除商品失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 批量删除选中商品
  onBatchDelete() {
    const selectedItems = this.getSelectedItems()
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要删除的商品',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的${selectedItems.length}件商品吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.batchDeleteItems()
        }
      }
    })
  },

  // 执行批量删除
  async batchDeleteItems() {
    const selectedItems = this.getSelectedItems()
    const selectedIds = selectedItems.map(item => item.id)
    
    try {
      wx.showLoading({ title: '删除中...' })
      
      await cartApi.batchDeleteCart(selectedIds)
      
      // 更新本地状态
      const cartItems = this.data.cartItems.filter(item => !selectedIds.includes(item.id))
      
      this.setData({
        cartItems,
        cartCount: cartItems.length
      })
      
      this.calculateTotal()
      this.updateTabBarCount()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('批量删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 清理失效商品
  async onClearInvalid() {
    try {
      wx.showLoading({ title: '清理中...' })
      
      const invalidIds = this.data.invalidItems.map(item => item.id)
      await cartApi.batchDeleteCart(invalidIds)
      
      this.setData({
        invalidItems: [],
        showInvalid: false
      })
      
      wx.showToast({
        title: '清理完成',
        icon: 'success'
      })
    } catch (error) {
      console.error('清理失效商品失败:', error)
      wx.showToast({
        title: '清理失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 计算总价
  calculateTotal() {
    const selectedItems = this.getSelectedItems()
    
    let totalPrice = 0
    let totalOriginPrice = 0
    let selectedCount = 0
    let selectedItemsCount = selectedItems.length // 选中的商品项数量
    
    selectedItems.forEach(item => {
      const price = item.product?.price || 0
      const originPrice = item.product?.origin_price || price
      const quantity = item.quantity || 1
      
      totalPrice += price * quantity
      totalOriginPrice += originPrice * quantity
      selectedCount += quantity
    })
    
    const discountAmount = totalOriginPrice - totalPrice
    const isAllSelected = this.isAllSelected()
    
    this.setData({
      totalPrice,
      totalOriginPrice,
      discountAmount,
      selectedCount,
      selectedItemsCount,
      isAllSelected,
      // 添加格式化后的价格字段
      formattedTotalPrice: (totalPrice / 100).toFixed(2),
      formattedDiscountAmount: (discountAmount / 100).toFixed(2)
    })
  },

  // 立即购买
  onBuyNow() {
    const selectedItems = this.getSelectedItems()
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要购买的商品',
        icon: 'none'
      })
      return
    }
    
    // 显示订单确认信息
    const totalPrice = this.data.formattedTotalPrice
    const itemCount = this.data.selectedCount
    
    wx.showModal({
      title: '确认订单',
      content: `共${itemCount}件商品，合计￥${totalPrice}元，确认购买吗？`,
      confirmText: '立即购买',
      cancelText: '再想想',
      success: async (res) => {
        if (res.confirm) {
          await this.createOrderFromCart(selectedItems)
        }
      }
    })
  },

  // 从购物车创建订单
  async createOrderFromCart(selectedItems) {
    try {
      wx.showLoading({ title: '正在下单...' })
      
      // 准备订单数据 - 使用购物车ID列表
      const orderData = {
        cart_ids: selectedItems.map(item => item.id), // 使用购物车记录的ID
        remark: ''
      }
      
      const response = await orderApi.createOrderFromCart(orderData)
      
      if (response.code === 200) {
        const { order_id, order_no } = response.data
        
        // 订单创建成功，刷新购物车数据
        await this.loadCartData()
        
        wx.hideLoading()
        
        wx.showToast({
          title: '下单成功',
          icon: 'success'
        })
        
        // 跳转到订单详情页面
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/common/order-detail/order-detail?id=${order_id}&type=user`
          })
        }, 1500)
        
      } else {
        throw new Error(response.message || '下单失败')
      }
    } catch (error) {
      console.error('创建订单失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '下单失败，请重试',
        icon: 'none'
      })
    }
  },

  // 从购物车中移除已下单的商品
  async removeOrderedItemsFromCart() {
    try {
      const selectedItems = this.getSelectedItems()
      const selectedIds = selectedItems.map(item => item.id)
      
      if (selectedIds.length > 0) {
        await cartApi.batchDeleteCart(selectedIds)
        
        // 重新加载购物车数据
        await this.loadCartData()
      }
    } catch (error) {
      console.error('移除已购买商品失败:', error)
      // 即使移除失败也不影响订单创建
    }
  },

  // 切换编辑模式
  onToggleEdit() {
    this.setData({
      editMode: !this.data.editMode
    })
  },

  // 更新tabbar购物车数量
  updateTabBarCount() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateCartCount()
    }
  },

  // 格式化价格显示
  formatPrice(price) {
    return (price / 100).toFixed(2)
  },

  // 阻止事件冒泡
  onStopPropagation(e) {
    // 阻止事件向上冒泡
    e.stopPropagation()
  },

  // 去购物
  onGoShopping() {
    wx.switchTab({
      url: '/pages/user/home/home'
    })
  },

  // 修改商品数量 - stepper组件专用
  onQuantityChangeStepper(e) {
    const { cartId } = e.currentTarget.dataset
    const newQuantity = e.detail
    
    this.updateCartQuantity(cartId, newQuantity)
  },

  // 通用的数量更新方法
  async updateCartQuantity(cartId, newQuantity) {
    try {
      await cartApi.updateCartQuantity(cartId, newQuantity)
      
      // 更新本地状态
      const cartItems = this.data.cartItems.map(item => {
        if (item.id === cartId) {
          return { ...item, quantity: newQuantity }
        }
        return item
      })
      
      this.setData({ cartItems })
      this.calculateTotal()
    } catch (error) {
      console.error('更新数量失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的购物车',
      path: '/pages/user/cart/cart'
    }
  }
})