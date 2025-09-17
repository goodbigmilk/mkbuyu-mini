// 店铺相关API
const { get, post, put, delete: del } = require('../utils/request')

/**
 * 获取店铺信息
 * @param {number} shopId 店铺ID
 * @returns {Promise} 店铺信息
 */
const getShopInfo = (shopId) => {
  return get(`/shop/${shopId}`)
}

/**
 * 获取我的店铺信息
 * @returns {Promise} 我的店铺信息
 */
const getMyShopInfo = () => {
  return get('/shop/info')
}

/**
 * 创建店铺
 * @param {Object} data 店铺数据 
 * @param {string} data.name 店铺名称
 * @param {string} data.description 店铺描述
 * @param {string} data.logo 店铺LOGO
 * @param {string} data.banner 店铺横幅
 * @param {string} data.phone 联系电话
 * @param {string} data.email 联系邮箱
 * @returns {Promise} 创建结果
 */
const createShop = (data) => {
  return post('/shop/create', data)
}

/**
 * 更新店铺信息
 * @param {Object} data 店铺数据
 * @returns {Promise} 更新结果
 */
const updateShopInfo = (data) => {
  return put('/shop/info', data)
}

/**
 * 获取店铺商品列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码
 * @param {number} params.pageSize 每页数量
 * @param {string} params.status 商品状态
 * @param {string} params.keyword 关键词
 * @returns {Promise} 商品列表
 */
const getShopProducts = (params = {}) => {
  return get('/shop/products', params)
}

/**
 * 上架商品
 * @param {number} productId 商品ID
 * @returns {Promise} 操作结果
 */
const publishProduct = (productId) => {
  return put(`/shop/products/${productId}/publish`)
}

/**
 * 下架商品
 * @param {number} productId 商品ID
 * @returns {Promise} 操作结果
 */
const unpublishProduct = (productId) => {
  return put(`/shop/products/${productId}/unpublish`)
}

/**
 * 删除商品
 * @param {number} productId 商品ID
 * @returns {Promise} 操作结果
 */
const deleteProduct = (productId) => {
  return del(`/shop/products/${productId}`)
}

/**
 * 批量操作商品
 * @param {Array} productIds 商品ID数组
 * @param {string} operation 操作类型 publish|unpublish|delete
 * @returns {Promise} 操作结果
 */
const batchProductOperation = (productIds, operation) => {
  return post('/shop/products/batch', { productIds, operation })
}

/**
 * 获取店铺分类
 * @param {number} shopId 店铺ID
 * @returns {Promise} 店铺分类
 */
const getShopCategories = (shopId) => {
  return get(`/shop/${shopId}/categories`)
}

/**
 * 获取店铺统计数据
 * @param {Object} params 查询参数
 * @param {string} params.timeRange 统计周期 7d|30d|90d
 * @returns {Promise} 统计数据
 */
const getShopStatistics = (params = {}) => {
  return get('/shop/stats', params)
}

/**
 * 获取店铺订单列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码
 * @param {number} params.page_size 每页数量
 * @param {number} params.status 订单状态
 * @param {string} params.keyword 关键词
 * @returns {Promise} 订单列表
 */
const getShopOrders = (params = {}) => {
  return get('/shop/orders', params)
}

/**
 * 获取店铺评价列表
 * @param {Object} params 查询参数
 * @returns {Promise} 评价列表
 */
const getShopReviews = (params = {}) => {
  return get('/shop/reviews', params)
}

/**
 * 回复评价
 * @param {number} reviewId 评价ID
 * @param {Object} data 回复数据
 * @param {string} data.content 回复内容
 * @returns {Promise} 回复结果
 */
const replyReview = (reviewId, data) => {
  return post(`/shop/reviews/${reviewId}/reply`, data)
}

/**
 * 获取店铺装修配置
 * @returns {Promise} 装修配置
 */
const getShopDecoration = () => {
  return get('/shop/decoration')
}

/**
 * 更新店铺装修配置
 * @param {Object} data 装修配置
 * @param {Array} data.banners 轮播图
 * @param {Array} data.notices 公告
 * @param {Array} data.nav_items 导航项
 * @param {Object} data.theme 主题配置
 * @returns {Promise} 更新结果
 */
const updateShopDecoration = (data) => {
  return put('/shop/decoration', data)
}

/**
 * 获取店铺运营数据
 * @param {Object} params 查询参数
 * @returns {Promise} 运营数据
 */
const getShopAnalytics = (params = {}) => {
  return get('/shop/analytics', params)
}

/**
 * 获取热销商品
 * @param {Object} params 查询参数
 * @returns {Promise} 热销商品
 */
const getHotProducts = (params = {}) => {
  return get('/shop/hot-products', params)
}

/**
 * 获取客户列表
 * @param {Object} params 查询参数
 * @returns {Promise} 客户列表
 */
const getShopCustomers = (params = {}) => {
  return get('/shop/customers', params)
}

/**
 * 获取粉丝列表
 * @param {Object} params 查询参数
 * @returns {Promise} 粉丝列表
 */
const getShopFollowers = (params = {}) => {
  return get('/shop/followers', params)
}

/**
 * 发送店铺消息
 * @param {Object} data 消息数据
 * @param {Array} data.user_ids 用户ID列表
 * @param {string} data.content 消息内容
 * @param {string} data.type 消息类型
 * @returns {Promise} 发送结果
 */
const sendShopMessage = (data) => {
  return post('/shop/messages', data)
}

/**
 * 获取店铺设置
 * @returns {Promise} 店铺设置
 */
const getShopSettings = () => {
  return get('/shop/settings')
}

/**
 * 更新店铺设置
 * @param {Object} data 设置数据
 * @returns {Promise} 更新结果
 */
const updateShopSettings = (data) => {
  return put('/shop/settings', data)
}

/**
 * 申请店铺认证
 * @param {Object} data 认证数据
 * @param {string} data.business_license 营业执照
 * @param {string} data.id_card_front 身份证正面
 * @param {string} data.id_card_back 身份证背面
 * @param {string} data.bank_card 银行卡
 * @returns {Promise} 申请结果
 */
const applyShopVerification = (data) => {
  return post('/shop/verification', data)
}

/**
 * 获取店铺认证状态
 * @returns {Promise} 认证状态
 */
const getShopVerificationStatus = () => {
  return get('/shop/verification/status')
}

/**
 * 暂停/恢复营业
 * @param {Object} data 操作数据
 * @param {boolean} data.is_open 是否营业
 * @param {string} data.reason 原因
 * @returns {Promise} 操作结果
 */
const toggleShopStatus = (data) => {
  return put('/shop/toggle-status', data)
}

/**
 * 获取店铺公告列表
 * @param {Object} params 查询参数
 * @returns {Promise} 公告列表
 */
const getShopNotices = (params = {}) => {
  return get('/shop/notices', params)
}

/**
 * 创建店铺公告
 * @param {Object} data 公告数据
 * @param {string} data.title 标题
 * @param {string} data.content 内容
 * @param {boolean} data.is_top 是否置顶
 * @returns {Promise} 创建结果
 */
const createShopNotice = (data) => {
  return post('/shop/notices', data)
}

/**
 * 更新店铺公告
 * @param {number} noticeId 公告ID
 * @param {Object} data 公告数据
 * @returns {Promise} 更新结果
 */
const updateShopNotice = (noticeId, data) => {
  return put(`/shop/notices/${noticeId}`, data)
}

/**
 * 删除店铺公告
 * @param {number} noticeId 公告ID
 * @returns {Promise} 删除结果
 */
const deleteShopNotice = (noticeId) => {
  return del(`/shop/notices/${noticeId}`)
}

module.exports = {
  getShopInfo,
  getMyShopInfo,
  createShop,
  updateShopInfo,
  getShopProducts,
  publishProduct,
  unpublishProduct,
  deleteProduct,
  batchProductOperation,
  getShopCategories,
  getShopStatistics,
  getShopOrders,
  getShopReviews,
  replyReview,
  getShopDecoration,
  updateShopDecoration,
  getShopAnalytics,
  getHotProducts,
  getShopCustomers,
  getShopFollowers,
  sendShopMessage,
  getShopSettings,
  updateShopSettings,
  applyShopVerification,
  getShopVerificationStatus,
  toggleShopStatus,
  getShopNotices,
  createShopNotice,
  updateShopNotice,
  deleteShopNotice
} 