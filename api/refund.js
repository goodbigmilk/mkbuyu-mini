// 退款相关API
const { get, post, put } = require('../utils/request')

// ==================== 用户退款相关 ====================

// 创建退款申请
function createRefund(data) {
  return post('/user/refunds', data)
}

// 获取用户退款申请列表
function getUserRefundRequests(params = {}) {
  return get('/user/refunds', params)
}

// 获取退款申请详情
function getRefundDetail(refundId) {
  return get(`/user/refunds/${refundId}`)
}

// 搜索用户退款申请
function searchRefundRequests(params = {}) {
  return get('/user/refunds/search', params)
}

// ==================== 商家退款相关 ====================

// 获取店铺退款申请列表
function getShopRefundRequests(params = {}) {
  return get('/shop/refunds', params)
}

// 获取店铺退款申请详情
function getShopRefundDetail(refundId) {
  return get(`/shop/refunds/${refundId}`)
}

// 处理退款申请（同意/拒绝）
function processRefundRequest(refundId, data) {
  return put(`/shop/refunds/${refundId}/process`, data)
}

// 获取店铺退款统计
function getRefundStatistics() {
  return get('/shop/refunds/statistics')
}

// 搜索店铺退款申请
function searchShopRefunds(params = {}) {
  return get('/shop/refunds/search', params)
}

module.exports = {
  // 用户退款
  createRefund,
  getUserRefundRequests,
  getRefundDetail,
  searchRefundRequests,
  
  // 商家退款
  getShopRefundRequests,
  getShopRefundDetail,
  processRefundRequest,
  getRefundStatistics,
  searchShopRefunds
}
