// 用户相关API
const { get, post, put, delete: del } = require('../utils/request')

/**
 * 更新用户资料
 * @param {Object} data 用户资料
 * @param {string} data.nickname 昵称
 * @param {string} data.avatar 头像
 * @param {string} data.email 邮箱
 * @returns {Promise} 更新结果
 */
const updateUserProfile = (data) => {
  return put('/auth/profile', data)
}

/**
 * 上传头像
 * @param {string} filePath 头像文件路径
 * @returns {Promise} 上传结果
 */
const uploadAvatar = (filePath) => {
  const { upload } = require('../utils/request')
  return upload('/upload/avatar', filePath, {}, {
    name: 'avatar',
    showLoading: true,
    loadingText: '上传头像中...'
  })
}

/**
 * 获取用户统计
 * @returns {Promise} 用户统计数据
 */
const getUserStats = () => {
  return get('/auth/stats')
}

/**
 * 获取余额记录
 * @param {Object} params 查询参数
 * @returns {Promise} 余额记录
 */
const getBalanceHistory = (params = {}) => {
  return get('/user/balance/logs', params)
}

/**
 * 通过手机号搜索用户（用于商家添加用户到分组）
 * @param {Object} params 查询参数
 * @param {string} params.phone 手机号
 * @returns {Promise} 用户信息
 */
const getUserByPhone = (phone) => {
  return get('/user/search', { phone })
}

/**
 * 获取商家绑定的用户列表(从Casdoor获取完整用户信息)
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1
 * @param {number} params.page_size 每页数量，默认 20
 * @param {string} params.keyword 搜索关键词（用户ID）
 * @param {number} params.exclude_group_id 排除已在该分组中的用户
 * @returns {Promise} 用户列表
 */
const getShopBoundUsers = (params = {}) => {
  return get('/user/shop-users', params)
}

/**
 * 获取分销统计数据
 * @returns {Promise} 分销统计数据
 */
const getDistributionStats = () => {
  return get('/marketing/distribution/stats')
}

/**
 * 获取推荐用户列表（已废弃，请使用 getDistributionCustomers）
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1  
 * @param {number} params.page_size 每页数量，默认 20
 * @returns {Promise} 推荐用户列表
 */
const getReferredUsers = (params = {}) => {
  return get('/marketing/distribution/customers', params)
}

/**
 * 获取分账订单列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1  
 * @param {number} params.page_size 每页数量，默认 10
 * @returns {Promise} 分账订单列表
 */
const getDistributionOrders = (params = {}) => {
  return get('/marketing/distribution/orders', params)
}

/**
 * 获取推荐客户列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1  
 * @param {number} params.page_size 每页数量，默认 20
 * @returns {Promise} 推荐客户列表
 */
const getDistributionCustomers = (params = {}) => {
  return get('/marketing/distribution/customers', params)
}

/**
 * 获取分账详情
 * @param {string} distributionId 分账业务ID（字符串类型，避免大数精度丢失）
 * @returns {Promise} 分账详情
 */
const getDistributionDetail = (distributionId) => {
  return get(`/marketing/distribution/${distributionId}`)
}

module.exports = {
  updateUserProfile,
  uploadAvatar,
  getUserStats,
  getBalanceHistory,
  getUserByPhone,
  getShopBoundUsers,
  getDistributionStats,
  getReferredUsers,
  getDistributionOrders,
  getDistributionCustomers,
  getDistributionDetail
} 