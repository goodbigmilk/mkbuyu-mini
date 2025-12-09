// api/agent.js - 推广员相关API
const request = require('../utils/request')

// ==================== 商户端接口 ====================

// 获取推广员申请条件
function getAgentConditions() {
  return request.get('/agent/manage/conditions')
}

// 创建单个推广员申请条件
function createAgentCondition(condition) {
  return request.post('/agent/manage/condition', condition)
}

// 更新推广员申请条件
function updateAgentCondition(conditionId, data) {
  return request.put(`/agent/manage/conditions/${conditionId}`, data)
}

// 删除推广员申请条件
function deleteAgentCondition(conditionId) {
  return request.delete(`/agent/manage/conditions/${conditionId}`)
}

// 获取推广员申请列表
function getAgentApplications(params = {}) {
  return request.get('/agent/manage/applications', params)
}

// 处理推广员申请
function processAgentApplication(applicationId, data) {
  return request.put(`/agent/manage/applications/${applicationId}/process`, data)
}

// ==================== 用户端接口 ====================

// 提交推广员申请
function submitAgentApplication(data = {}) {
  return request.post('/agent/apply', data)
}

// 取消推广员申请
function cancelAgentApplication() {
  return request.post('/agent/cancel', {})
}

// 获取用户申请状态
function getUserApplicationStatus(params = {}) {
  return request.get('/agent/status', params)
}

// 获取用户统计数据
function getUserStats(params = {}) {
  return request.get('/agent/stats', params)
}

// 检查是否可以申请
function checkCanApply() {
  return request.get('/agent/can-apply', {})
}

// 检查用户分组状态
function checkUserInGroup() {
  return request.get('/agent/group-status')
}

// 获取推广员申请条件（用户查看）
function getAgentConditionsForUser(params = {}) {
  return request.get('/agent/conditions', params)
}

module.exports = {
  // 商户端
  getAgentConditions,
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
