// 退款相关API
const { get, post, put } = require('../utils/request')

// ==================== 用户退款相关 ====================

// 创建退款申请
function createRefund(data) {
  return post('/refund', data)
}

// 获取用户退款申请列表
function getUserRefundRequests(params = {}) {
  return get('/refund/my', params)
}

// 获取退款申请详情
function getRefundDetail(refundId) {
  return get(`/refund/${refundId}`)
}

// 搜索用户退款申请
function searchRefundRequests(params = {}) {
  return get('/refund/search', params)
}

// ==================== 商家退款相关 ====================

// 获取店铺退款申请列表
function getShopRefundRequests(params = {}) {
  return get('/refund/manage', params)
}

// 获取店铺退款申请详情
function getShopRefundDetail(refundId) {
  return get(`/refund/${refundId}`)
}

// 处理退款申请（同意/拒绝）
function processRefundRequest(refundId, data) {
  return put(`/refund/${refundId}/process`, data)
}

// 获取店铺退款统计
function getRefundStatistics() {
  return get('/refund/statistics')
}

// 搜索店铺退款申请
function searchShopRefunds(params = {}) {
  return get('/refund/search', params)
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
