// store/index.js - 状态管理入口文件
const cartStore = require('./cart.js')
const userStore = require('./user.js')
const productStore = require('./product.js')
const orderStore = require('./order.js')
const shopStore = require('./shop.js')

// 存储所有的store实例
const stores = {}

// 初始化所有store
function initStores() {
  stores.cart = cartStore
  stores.user = userStore  
  stores.product = productStore
  stores.order = orderStore
  stores.shop = shopStore
}

// 获取指定的store
function getStore(storeName) {
  if (!stores[storeName]) {
    console.warn(`Store '${storeName}' not found`)
    return null
  }
  return stores[storeName]
}

// 获取所有store
function getAllStores() {
  return stores
}

// 初始化store
initStores()

module.exports = {
  store: stores,
  getStore,
  getAllStores,
  initStores
} 