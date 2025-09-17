// api/agent.js - 推广员相关API
const request = require('../utils/request')

// ==================== 商户端接口 ====================

// 获取推广员申请条件
function getAgentConditions() {
  return request.get('/shop/agent/conditions')
}

// 保存推广员申请条件
function saveAgentConditions(conditions) {
  return request.post('/shop/agent/conditions', {
    conditions: conditions
  })
}

// 创建单个推广员申请条件
function createAgentCondition(condition) {
  return request.post('/shop/agent/condition', condition)
}

// 更新推广员申请条件
function updateAgentCondition(conditionId, data) {
  return request.put(`/shop/agent/conditions/${conditionId}`, data)
}

// 删除推广员申请条件
function deleteAgentCondition(conditionId) {
  return request.delete(`/shop/agent/conditions/${conditionId}`)
}

// 获取推广员申请列表
function getAgentApplications(params = {}) {
  return request.get('/shop/agent/applications', params)
}

// 处理推广员申请
function processAgentApplication(applicationId, data) {
  return request.put(`/shop/agent/applications/${applicationId}/process`, data)
}

// ==================== 用户端接口 ====================

// 提交推广员申请
function submitAgentApplication() {
  return request.post('/user/agent/apply', {})
}

// 取消推广员申请
function cancelAgentApplication() {
  return request.post('/user/agent/cancel', {})
}

// 获取用户申请状态
function getUserApplicationStatus() {
  return request.get('/user/agent/status', {})
}

// 获取用户统计数据
function getUserStats() {
  return request.get('/user/agent/stats')
}

// 检查是否可以申请
function checkCanApply() {
  return request.get('/user/agent/can-apply', {})
}

// 检查用户分组状态
function checkUserInGroup() {
  return request.get('/user/agent/group-status')
}

// 获取推广员申请条件（用户查看）
function getAgentConditionsForUser() {
  return request.get('/user/agent/conditions', {})
}

module.exports = {
  // 商户端
  getAgentConditions,
  saveAgentConditions,
  createAgentCondition,
  updateAgentCondition,
  deleteAgentCondition,
  getAgentApplications,
  processAgentApplication,
  
  // 用户端
  submitAgentApplication,
  cancelAgentApplication,
  getUserApplicationStatus,
  getUserStats,
  checkCanApply,
  checkUserInGroup,
  getAgentConditionsForUser
}
