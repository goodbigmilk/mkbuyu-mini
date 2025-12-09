// 订单相关API
const { get, post, put } = require('../utils/request')

// ==================== 用户订单相关 ====================

// 从购物车创建订单
function createOrderFromCart(data) {
  // 确保cart_ids是字符串数组
  if (data.cart_ids && Array.isArray(data.cart_ids)) {
    data.cart_ids = data.cart_ids.map(id => String(id))
  }
  return post('/order/cart', data)
}

// 立即购买创建订单
function createOrderNow(data) {
  return post('/order/now', data)
}

// 获取用户订单列表
function getUserOrderList(params = {}) {
  return get('/order/my', params)
}

// 获取订单详情
function getOrderDetail(orderId) {
  return get(`/order/${orderId}`)
}

// 取消订单
function cancelOrder(orderId) {
  return put(`/order/${orderId}/cancel`)
}

// 确认收货
function confirmReceipt(orderId) {
  return put(`/order/${orderId}/receipt`)
}

// 搜索用户订单
function searchUserOrders(params = {}) {
  return get('/order/search', params)
}

// 获取订单可用优惠券
function getAvailableCoupons(orderAmount) {
  return get('/order/coupons', { order_amount: orderAmount })
}

// 支付订单回调
function payOrder(orderNo, paymentAmount, paymentMethod) {
  return post('/payment/pay', { 
    order_no: orderNo,
    payment_amount: paymentAmount,
    payment_method: paymentMethod
  })
}

// ==================== 商家订单相关 ====================

// 获取店铺订单列表
function getShopOrderList(params = {}) {
  return get('/order/manage', params)
}

// 更新订单状态
function updateOrderStatus(orderId, status) {
  return put(`/order/${orderId}/status`, { status })
}

// 订单发货
function shipOrder(orderId, data) {
  return put(`/order/${orderId}/ship`, data)
}

// 获取店铺订单统计
function getShopOrderStatistics() {
  return get('/order/statistics')
}

// 搜索店铺订单
function searchShopOrders(params = {}) {
  return get('/order/search', params)
}

// ==================== 支付相关 (TODO) ====================

// TODO: 微信支付统一下单
function wxPayUnifiedOrder(orderNo) {
  // TODO: 调用微信支付统一下单接口
  // 返回支付参数用于调起微信支付
  return Promise.resolve({
    timeStamp: '',
    nonceStr: '',
    package: '',
    signType: 'MD5',
    paySign: ''
  })
}

// TODO: 支付宝支付
function alipayOrder(orderNo) {
  // TODO: 调用支付宝支付接口
  return Promise.resolve()
}

// TODO: 其他支付方式
function otherPayOrder(orderNo, paymentMethod) {
  // TODO: 根据支付方式调用相应接口
  return Promise.resolve()
}

module.exports = {
  // 用户订单
  createOrderFromCart,
  createOrderNow,
  getUserOrderList,
  getOrderDetail,
  cancelOrder,
  confirmReceipt,
  searchUserOrders,
  getAvailableCoupons,
  payOrder,
  
  // 商家订单
  getShopOrderList,
  updateOrderStatus,
  shipOrder,
  getShopOrderStatistics,
  searchShopOrders,
  
  // 支付相关 (TODO)
  wxPayUnifiedOrder,
  alipayOrder,
  otherPayOrder
} 