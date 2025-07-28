// 购物车状态管理
const api = require('../api/index.js')

// 购物车状态
const state = {
  // 购物车商品列表
  items: [],
  // 购物车商品数量
  count: 0,
  // 选中的商品ID列表
  selectedIds: [],
  // 总价信息
  total: {
    productAmount: 0, // 商品总金额
    discountAmount: 0, // 优惠金额
    totalAmount: 0 // 实付金额
  },
  // 失效商品列表
  invalidItems: [],
  // 加载状态
  loading: false
}

// 更新状态的辅助函数
const updateState = (newState) => {
  Object.assign(state, newState)
  // 触发页面更新
  wx.getApp().globalData.cartStore = { ...state }
}

// 购物车状态管理器
const cartStore = {
  // 初始化
  init() {
    this.loadCartData()
  },

  // 获取状态
  getState() {
    return { ...state }
  },

  // 重置状态
  reset() {
    updateState({
      items: [],
      count: 0,
      selectedIds: [],
      total: {
        productAmount: 0,
        discountAmount: 0,
        totalAmount: 0
      },
      invalidItems: [],
      loading: false
    })
  },

  // 加载购物车数据
  async loadCartData() {
    try {
      updateState({ loading: true })
      
      const [listResponse, countResponse] = await Promise.all([
        api.cart.getCartList(),
        api.cart.getCartCount()
      ])
      
      if (listResponse.code === 200) {
        const items = listResponse.data.items || []
        const selectedIds = items.filter(item => item.selected).map(item => item.id)
        
        updateState({
          items,
          selectedIds
        })
        
        // 计算总价
        this.calculateTotal()
      }
      
      if (countResponse.code === 200) {
        updateState({
          count: countResponse.data.count || 0
        })
      }
    } catch (error) {
      console.error('加载购物车数据失败', error)
    } finally {
      updateState({ loading: false })
    }
  },

  // 添加商品到购物车
  async addToCart(data) {
    try {
      const response = await api.cart.addToCart(data)
      
      if (response.code === 200) {
        // 重新加载购物车数据
        await this.loadCartData()
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        
        return response.data
      } else {
        throw new Error(response.message || '添加失败')
      }
    } catch (error) {
      console.error('添加到购物车失败', error)
      throw error
    }
  },

  // 更新商品数量
  async updateQuantity(cartId, quantity) {
    try {
      const response = await api.cart.updateCartQuantity(cartId, { quantity })
      
      if (response.code === 200) {
        // 更新本地状态
        const items = state.items.map(item => {
          if (item.id === cartId) {
            return { ...item, quantity }
          }
          return item
        })
        
        updateState({ items })
        
        // 重新计算总价
        this.calculateTotal()
        
        return response.data
      } else {
        throw new Error(response.message || '更新失败')
      }
    } catch (error) {
      console.error('更新购物车数量失败', error)
      throw error
    }
  },

  // 删除购物车商品
  async removeFromCart(cartId) {
    try {
      const response = await api.cart.removeFromCart(cartId)
      
      if (response.code === 200) {
        // 更新本地状态
        const items = state.items.filter(item => item.id !== cartId)
        const selectedIds = state.selectedIds.filter(id => id !== cartId)
        
        updateState({
          items,
          selectedIds,
          count: state.count - 1
        })
        
        // 重新计算总价
        this.calculateTotal()
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        
        return response.data
      } else {
        throw new Error(response.message || '删除失败')
      }
    } catch (error) {
      console.error('删除购物车商品失败', error)
      throw error
    }
  },

  // 批量删除购物车商品
  async batchRemove(cartIds) {
    try {
      const response = await api.cart.batchRemoveFromCart({ cart_ids: cartIds })
      
      if (response.code === 200) {
        // 更新本地状态
        const items = state.items.filter(item => !cartIds.includes(item.id))
        const selectedIds = state.selectedIds.filter(id => !cartIds.includes(id))
        
        updateState({
          items,
          selectedIds,
          count: state.count - cartIds.length
        })
        
        // 重新计算总价
        this.calculateTotal()
        
        wx.showToast({
          title: `删除${cartIds.length}件商品`,
          icon: 'success'
        })
        
        return response.data
      } else {
        throw new Error(response.message || '批量删除失败')
      }
    } catch (error) {
      console.error('批量删除购物车商品失败', error)
      throw error
    }
  },

  // 清空购物车
  async clearCart() {
    try {
      const response = await api.cart.clearCart()
      
      if (response.code === 200) {
        this.reset()
        
        wx.showToast({
          title: '购物车已清空',
          icon: 'success'
        })
        
        return response.data
      } else {
        throw new Error(response.message || '清空失败')
      }
    } catch (error) {
      console.error('清空购物车失败', error)
      throw error
    }
  },

  // 选择/取消选择商品
  async selectItem(cartId, selected) {
    try {
      const response = await api.cart.selectCartItem(cartId, { selected })
      
      if (response.code === 200) {
        // 更新本地状态
        const items = state.items.map(item => {
          if (item.id === cartId) {
            return { ...item, selected }
          }
          return item
        })
        
        const selectedIds = selected
          ? [...state.selectedIds, cartId]
          : state.selectedIds.filter(id => id !== cartId)
        
        updateState({
          items,
          selectedIds
        })
        
        // 重新计算总价
        this.calculateTotal()
        
        return response.data
      } else {
        throw new Error(response.message || '操作失败')
      }
    } catch (error) {
      console.error('选择购物车商品失败', error)
      throw error
    }
  },

  // 全选/取消全选
  async selectAll(selected) {
    try {
      const response = await api.cart.selectAllCartItems({ selected })
      
      if (response.code === 200) {
        // 更新本地状态
        const items = state.items.map(item => ({ ...item, selected }))
        const selectedIds = selected ? items.map(item => item.id) : []
        
        updateState({
          items,
          selectedIds
        })
        
        // 重新计算总价
        this.calculateTotal()
        
        return response.data
      } else {
        throw new Error(response.message || '操作失败')
      }
    } catch (error) {
      console.error('全选购物车商品失败', error)
      throw error
    }
  },

  // 计算总价
  async calculateTotal() {
    try {
      if (state.selectedIds.length === 0) {
        updateState({
          total: {
            productAmount: 0,
            discountAmount: 0,
            totalAmount: 0
          }
        })
        return
      }
      
      const response = await api.cart.getCartTotal({ cart_ids: state.selectedIds })
      
      if (response.code === 200) {
        updateState({
          total: response.data
        })
      }
    } catch (error) {
      console.error('计算购物车总价失败', error)
    }
  },

  // 获取失效商品
  async getInvalidItems() {
    try {
      const response = await api.cart.getInvalidCartItems()
      
      if (response.code === 200) {
        updateState({
          invalidItems: response.data.items || []
        })
        
        return response.data
      } else {
        throw new Error(response.message || '获取失败')
      }
    } catch (error) {
      console.error('获取失效商品失败', error)
      throw error
    }
  },

  // 清理失效商品
  async clearInvalidItems() {
    try {
      const response = await api.cart.clearInvalidCartItems()
      
      if (response.code === 200) {
        updateState({
          invalidItems: []
        })
        
        // 重新加载购物车数据
        await this.loadCartData()
        
        wx.showToast({
          title: '失效商品已清理',
          icon: 'success'
        })
        
        return response.data
      } else {
        throw new Error(response.message || '清理失败')
      }
    } catch (error) {
      console.error('清理失效商品失败', error)
      throw error
    }
  },

  // 同步购物车数据
  async syncCart(cartItems) {
    try {
      const response = await api.cart.syncCart({ cart_items: cartItems })
      
      if (response.code === 200) {
        // 重新加载购物车数据
        await this.loadCartData()
        return response.data
      } else {
        throw new Error(response.message || '同步失败')
      }
    } catch (error) {
      console.error('同步购物车数据失败', error)
      throw error
    }
  },

  // 获取购物车商品列表
  getItems() {
    return state.items
  },

  // 获取选中的商品列表
  getSelectedItems() {
    return state.items.filter(item => state.selectedIds.includes(item.id))
  },

  // 获取购物车商品数量
  getCount() {
    return state.count
  },

  // 获取选中商品数量
  getSelectedCount() {
    return state.selectedIds.length
  },

  // 获取总价信息
  getTotal() {
    return state.total
  },

  // 检查是否全选
  isAllSelected() {
    if (state.items.length === 0) return false
    return state.selectedIds.length === state.items.length
  },

  // 检查是否有选中商品
  hasSelectedItems() {
    return state.selectedIds.length > 0
  },

  // 检查商品是否在购物车中
  hasProduct(productId, skuId) {
    return state.items.some(item => 
      item.product_id === productId && 
      (skuId ? item.sku_id === skuId : true)
    )
  },

  // 获取商品在购物车中的数量
  getProductQuantity(productId, skuId) {
    const item = state.items.find(item => 
      item.product_id === productId && 
      (skuId ? item.sku_id === skuId : true)
    )
    return item ? item.quantity : 0
  }
}

module.exports = cartStore 