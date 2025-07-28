// store/product.js - 商品状态管理

class ProductStore {
  constructor() {
    this.state = {
      favoriteList: [],
      loading: false
    }
    this.init()
  }

  // 初始化
  init() {
    try {
      const favoriteList = wx.getStorageSync('favorite_list')
      if (favoriteList && Array.isArray(favoriteList)) {
        this.state.favoriteList = favoriteList
      }
    } catch (error) {
      console.error('读取收藏列表失败:', error)
    }
  }

  // 获取状态
  getState() {
    return { ...this.state }
  }

  // 切换收藏状态
  async toggleFavorite(productId) {
    const index = this.state.favoriteList.indexOf(productId)
    
    if (index > -1) {
      // 取消收藏
      this.state.favoriteList.splice(index, 1)
    } else {
      // 添加收藏
      this.state.favoriteList.push(productId)
    }
    
    this.saveToCache()
    return index === -1 // 返回是否添加了收藏
  }

  // 检查是否已收藏
  isFavorite(productId) {
    return this.state.favoriteList.includes(productId)
  }

  // 获取收藏列表
  getFavoriteList() {
    return this.state.favoriteList
  }

  // 保存到缓存
  saveToCache() {
    try {
      wx.setStorageSync('favorite_list', this.state.favoriteList)
    } catch (error) {
      console.error('保存收藏列表失败:', error)
    }
  }

  // 重置状态
  reset() {
    this.state = {
      favoriteList: [],
      loading: false
    }
    wx.removeStorageSync('favorite_list')
  }
}

// 创建单例实例
const productStore = new ProductStore()

module.exports = productStore 