// 用户相关API
const { get, post, put, delete: del } = require('../utils/request')

/**
 * 获取用户资料
 * @returns {Promise} 用户资料
 */
const getUserProfile = () => {
  return get('/user/profile')
}

/**
 * 更新用户资料
 * @param {Object} data 用户资料
 * @param {string} data.nickname 昵称
 * @param {string} data.avatar 头像
 * @param {string} data.email 邮箱
 * @returns {Promise} 更新结果
 */
const updateUserProfile = (data) => {
  return put('/user/profile', data)
}

/**
 * 上传头像
 * @param {string} filePath 头像文件路径
 * @returns {Promise} 上传结果
 */
const uploadAvatar = (filePath) => {
  const { upload } = require('../utils/request')
  return upload('/user/avatar', filePath, {}, {
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
  return get('/user/stats')
}

/**
 * 获取用户等级信息
 * @returns {Promise} 等级信息
 */
const getUserLevel = () => {
  return get('/user/level')
}

/**
 * 获取积分记录
 * @param {Object} params 查询参数
 * @param {number} params.page 页码
 * @param {number} params.page_size 每页数量
 * @param {string} params.type 类型
 * @returns {Promise} 积分记录
 */
const getPointsHistory = (params = {}) => {
  return get('/user/points/history', params)
}

/**
 * 获取余额记录
 * @param {Object} params 查询参数
 * @returns {Promise} 余额记录
 */
const getBalanceHistory = (params = {}) => {
  return get('/user/balance/history', params)
}

/**
 * 申请提现
 * @param {Object} data 提现数据
 * @param {number} data.amount 提现金额
 * @param {string} data.account 提现账户
 * @param {string} data.account_type 账户类型
 * @returns {Promise} 申请结果
 */
const applyWithdraw = (data) => {
  return post('/user/withdraw', data)
}

/**
 * 获取提现记录
 * @param {Object} params 查询参数
 * @returns {Promise} 提现记录
 */
const getWithdrawHistory = (params = {}) => {
  return get('/user/withdraw/history', params)
}

/**
 * 获取优惠券列表
 * @param {Object} params 查询参数
 * @param {string} params.status 状态 available|used|expired
 * @returns {Promise} 优惠券列表
 */
const getUserCoupons = (params = {}) => {
  return get('/user/coupons', params)
}

/**
 * 领取优惠券
 * @param {number} couponId 优惠券ID
 * @returns {Promise} 领取结果
 */
const claimCoupon = (couponId) => {
  return post(`/user/coupons/${couponId}/claim`)
}

/**
 * 获取消息列表
 * @param {Object} params 查询参数
 * @param {string} params.type 消息类型
 * @param {boolean} params.is_read 是否已读
 * @returns {Promise} 消息列表
 */
const getUserMessages = (params = {}) => {
  return get('/user/messages', params)
}

/**
 * 标记消息已读
 * @param {number} messageId 消息ID
 * @returns {Promise} 标记结果
 */
const markMessageRead = (messageId) => {
  return put(`/user/messages/${messageId}/read`)
}

/**
 * 批量标记消息已读
 * @param {Object} data 标记数据
 * @param {Array} data.message_ids 消息ID列表
 * @returns {Promise} 标记结果
 */
const batchMarkMessagesRead = (data) => {
  return put('/user/messages/batch-read', data)
}

/**
 * 删除消息
 * @param {number} messageId 消息ID
 * @returns {Promise} 删除结果
 */
const deleteMessage = (messageId) => {
  return del(`/user/messages/${messageId}`)
}

/**
 * 获取关注的店铺
 * @param {Object} params 查询参数
 * @returns {Promise} 关注的店铺列表
 */
const getFollowedShops = (params = {}) => {
  return get('/user/followed-shops', params)
}

/**
 * 关注店铺
 * @param {number} shopId 店铺ID
 * @returns {Promise} 关注结果
 */
const followShop = (shopId) => {
  return post(`/user/follow-shop/${shopId}`)
}

/**
 * 取消关注店铺
 * @param {number} shopId 店铺ID
 * @returns {Promise} 取消关注结果
 */
const unfollowShop = (shopId) => {
  return del(`/user/follow-shop/${shopId}`)
}

/**
 * 获取用户反馈列表
 * @param {Object} params 查询参数
 * @returns {Promise} 反馈列表
 */
const getUserFeedbacks = (params = {}) => {
  return get('/user/feedbacks', params)
}

/**
 * 提交反馈
 * @param {Object} data 反馈数据
 * @param {string} data.type 反馈类型
 * @param {string} data.content 反馈内容
 * @param {Array} data.images 反馈图片
 * @param {string} data.contact 联系方式
 * @returns {Promise} 提交结果
 */
const submitFeedback = (data) => {
  return post('/user/feedback', data)
}

/**
 * 注销账户
 * @param {Object} data 注销数据
 * @param {string} data.reason 注销原因
 * @param {string} data.password 密码确认
 * @returns {Promise} 注销结果
 */
const deleteAccount = (data) => {
  return post('/user/delete-account', data)
}

/**
 * 通过手机号搜索用户（用于商家添加用户到分组）
 * @param {Object} params 查询参数
 * @param {string} params.phone 手机号
 * @returns {Promise} 用户信息
 */
const getUserByPhone = (phone) => {
  return get('/shop/user-info/search-by-phone', { phone })
}

/**
 * 获取用户列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1
 * @param {number} params.page_size 每页数量，默认 20
 * @param {string} params.keyword 搜索关键词（用户名、昵称或手机号）
 * @returns {Promise} 用户列表
 */
const getUserList = (params = {}) => {
  // 直接调用后端用户列表API，支持搜索和分页
  return get('/shop/user-info/list', params)
}

/**
 * 获取分销统计数据
 * @returns {Promise} 分销统计数据
 */
const getDistributionStats = () => {
  return get('/user/distribution/stats')
}

/**
 * 获取推荐用户列表（已废弃，请使用 getDistributionCustomers）
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1  
 * @param {number} params.page_size 每页数量，默认 20
 * @returns {Promise} 推荐用户列表
 */
const getReferredUsers = (params = {}) => {
  return get('/user/distribution/customers', params)
}

/**
 * 获取分账订单列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1  
 * @param {number} params.page_size 每页数量，默认 10
 * @returns {Promise} 分账订单列表
 */
const getDistributionOrders = (params = {}) => {
  return get('/user/distribution/orders', params)
}

/**
 * 获取推荐客户列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认 1  
 * @param {number} params.page_size 每页数量，默认 20
 * @returns {Promise} 推荐客户列表
 */
const getDistributionCustomers = (params = {}) => {
  return get('/user/distribution/customers', params)
}

/**
 * 获取分账详情
 * @param {number} distributionId 分账ID
 * @returns {Promise} 分账详情
 */
const getDistributionDetail = (distributionId) => {
  return get(`/user/distribution/${distributionId}`)
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserStats,
  getUserLevel,
  getPointsHistory,
  getBalanceHistory,
  applyWithdraw,
  getWithdrawHistory,
  getUserCoupons,
  claimCoupon,
  getUserMessages,
  markMessageRead,
  batchMarkMessagesRead,
  deleteMessage,
  getFollowedShops,
  followShop,
  unfollowShop,
  getUserFeedbacks,
  submitFeedback,
  deleteAccount,
  getUserByPhone,
  getUserList,
  getDistributionStats,
  getReferredUsers,
  getDistributionOrders,
  getDistributionCustomers,
  getDistributionDetail
} 