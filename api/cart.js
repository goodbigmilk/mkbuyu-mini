// 购物车相关API
const { request } = require('../utils/request')

// 获取购物车列表
function getCartList() {
  return request({
    url: '/cart',
    method: 'GET'
  })
}

// 添加商品到购物车
function addToCart(data) {
  return request({
    url: '/cart',
    method: 'POST',
    data
  })
}

// 获取购物车数量
function getCartCount() {
  return request({
    url: '/cart/count',
    method: 'GET'
  })
}

// 更新购物车商品数量
function updateCartQuantity(cartId, quantity) {
  // 确保使用字符串格式的ID
  const stringId = String(cartId)
  return request({
    url: `/cart/${stringId}/quantity`,
    method: 'PUT',
    data: { quantity }
  })
}

// 更新购物车商品选中状态
function updateCartSelected(cartId, selected) {
  // 确保使用字符串格式的ID
  const stringId = String(cartId)
  return request({
    url: `/cart/${stringId}/selected`,
    method: 'PUT',
    data: { selected }
  })
}

// 批量更新选中状态
function batchUpdateSelected(selected) {
  return request({
    url: '/cart/selected',
    method: 'PUT',
    data: { selected }
  })
}

// 删除购物车商品
function deleteCartItem(cartId) {
  // 确保使用字符串格式的ID
  const stringId = String(cartId)
  return request({
    url: `/cart/${stringId}`,
    method: 'DELETE'
  })
}

// 批量删除购物车商品
function batchDeleteCart(cartIds) {
  // 确保传递字符串格式的ID数组
  const stringIds = cartIds.map(id => String(id))
  return request({
    url: '/cart/batch',
    method: 'DELETE',
    data: { cart_ids: stringIds }
  })
}

// 清空购物车
function clearCart() {
  return request({
    url: '/cart/clear',
    method: 'DELETE'
  })
}

module.exports = {
  getCartList,
  addToCart,
  getCartCount,
  updateCartQuantity,
  updateCartSelected,
  batchUpdateSelected,
  deleteCartItem,
  batchDeleteCart,
  clearCart
} 