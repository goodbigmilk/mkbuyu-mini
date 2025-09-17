// 分组定价相关API
const { post, get } = require('../utils/request')

/**
 * 获取用户分组定价汇总信息
 * 用于判断用户是否有分组定价权限
 */
function getUserGroupPricingSummary() {
  return get('/user/group-pricing/summary')
}

/**
 * 构建查询字符串
 * @param {Object} params - 参数对象
 * @returns {string} - 查询字符串
 */
function buildQueryString(params) {
  const pairs = []
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    }
  })
  return pairs.join('&')
}

/**
 * 获取用户分组商品列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认1
 * @param {number} params.page_size - 每页数量，默认10
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.category_id - 分类ID
 * @param {string} params.sort - 排序方式 (price_asc, price_desc, sales_desc)
 */
function getUserGroupProducts(params = {}) {
  // 设置默认值
  const defaultParams = {
    page: 1,
    page_size: 10
  }
  
  const finalParams = { ...defaultParams, ...params }
  
  // 构建查询字符串
  const queryString = buildQueryString(finalParams)
  const url = queryString ? `/user/group-pricing/products?${queryString}` : '/user/group-pricing/products'
  
  return get(url)
}

/**
 * 获取用户商品价格
 * @param {number} productId - 商品ID
 */
function getUserProductPrice(productId) {
  return get(`/user/group-pricing/product-price?product_id=${productId}`)
}

/**
 * 检查用户是否有分组价格
 * @param {number} productId - 商品ID
 */
function checkUserHasGroupPrice(productId) {
  return get(`/user/group-pricing/check-price?product_id=${productId}`)
}

/**
 * 计算分组定价订单
 * @param {Object} data - 订单数据
 * @param {Array} data.items - 商品列表
 * @param {number} data.items[].product_id - 商品ID
 * @param {number} data.items[].quantity - 数量
 */
function calculateGroupPricingOrder(data) {
  return post('/user/group-pricing/calculate-order', data)
}

/**
 * 创建分组定价订单
 * @param {Object} data - 订单数据
 * @param {Array} data.items - 商品列表
 * @param {number} data.items[].product_id - 商品ID
 * @param {number} data.items[].quantity - 数量
 */
function createGroupPricingOrder(data) {
  return post('/user/group-pricing/create-order', data)
}

module.exports = {
  getUserGroupPricingSummary,
  getUserGroupProducts,
  getUserProductPrice,
  checkUserHasGroupPrice,
  calculateGroupPricingOrder,
  createGroupPricingOrder
}