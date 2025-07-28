// 购物车相关API
const { request } = require('../utils/request')

// 获取购物车列表
function getCartList() {
  return request({
    url: '/user/cart',
    method: 'GET'
  })
}

// 添加商品到购物车
function addToCart(data) {
  return request({
    url: '/user/cart',
    method: 'POST',
    data
  })
}

// 获取购物车数量
function getCartCount() {
  return request({
    url: '/user/cart/count',
    method: 'GET'
  })
}

// 更新购物车商品数量
function updateCartQuantity(cartId, quantity) {
  return request({
    url: `/user/cart/${cartId}/quantity`,
    method: 'PUT',
    data: { quantity }
  })
}

// 更新购物车商品选中状态
function updateCartSelected(cartId, selected) {
  return request({
    url: `/user/cart/${cartId}/selected`,
    method: 'PUT',
    data: { selected }
  })
}

// 批量更新选中状态
function batchUpdateSelected(selected) {
  return request({
    url: '/user/cart/selected',
    method: 'PUT',
    data: { selected }
  })
}

// 删除购物车商品
function deleteCartItem(cartId) {
  return request({
    url: `/user/cart/${cartId}`,
    method: 'DELETE'
  })
}

// 批量删除购物车商品
function batchDeleteCart(cartIds) {
  return request({
    url: '/user/cart/batch',
    method: 'DELETE',
    data: { cart_ids: cartIds }
  })
}

// 清空购物车
function clearCart() {
  return request({
    url: '/user/cart/clear',
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