// 商家端用户分组管理相关API
const { post, get, put, delete: del } = require('../utils/request')

/**
 * 创建用户分组
 * @param {Object} data - 分组数据
 * @param {string} data.name - 分组名称
 * @param {string} data.description - 分组描述
 * @param {number} data.shop_id - 店铺ID
 */
function createUserGroup(data) {
  return post('/shop/user-groups', data)
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
 * 获取用户分组列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认1
 * @param {number} params.page_size - 每页数量，默认10
 */
function getUserGroupList(params = {}) {
  // 设置默认值
  const defaultParams = {
    page: 1,
    page_size: 10
  }
  
  const finalParams = { ...defaultParams, ...params }
  
  // 构建查询字符串
  const queryString = buildQueryString(finalParams)
  const url = queryString ? `/shop/user-groups?${queryString}` : '/shop/user-groups'
  
  return get(url)
}

/**
 * 获取用户分组详情
 * @param {number} id - 分组ID
 */
function getUserGroupDetail(id) {
  return get(`/shop/user-groups/${id}`)
}

/**
 * 更新用户分组
 * @param {number} id - 分组ID
 * @param {Object} data - 更新数据
 * @param {string} data.name - 分组名称
 * @param {string} data.description - 分组描述
 * @param {number} data.status - 状态
 */
function updateUserGroup(id, data) {
  return put(`/shop/user-groups/${id}`, data)
}

/**
 * 删除用户分组
 * @param {number} id - 分组ID
 */
function deleteUserGroup(id) {
  return del(`/shop/user-groups/${id}`)
}

/**
 * 添加分组成员
 * @param {Object} data - 成员数据
 * @param {number} data.group_id - 分组ID
 * @param {Array} data.user_ids - 用户ID列表
 */
function addGroupMembers(data) {
  return post('/shop/user-groups/members', data)
}

/**
 * 移除分组成员
 * @param {Object} data - 成员数据
 * @param {number} data.group_id - 分组ID
 * @param {Array} data.user_ids - 用户ID列表
 */
function removeGroupMembers(data) {
  return del('/shop/user-groups/members', data)
}

/**
 * 获取分组成员列表
 * @param {number} groupId - 分组ID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认1
 * @param {number} params.page_size - 每页数量，默认10
 */
function getGroupMembers(groupId, params = {}) {
  // 设置默认值
  const defaultParams = {
    page: 1,
    page_size: 10
  }
  
  const finalParams = { ...defaultParams, ...params }
  
  // 构建查询字符串
  const queryString = buildQueryString(finalParams)
  const url = queryString ? `/shop/user-groups/${groupId}/members?${queryString}` : `/shop/user-groups/${groupId}/members`
  
  return get(url)
}

/**
 * 创建分组商品定价
 * @param {Object} data - 定价数据
 * @param {number} data.group_id - 分组ID
 * @param {number} data.product_id - 商品ID
 * @param {number} data.price - 价格(分)
 * @param {string} data.start_time - 生效开始时间
 * @param {string} data.end_time - 生效结束时间
 */
function createGroupProductPrice(data) {
  return post('/shop/user-groups/prices', data)
}

/**
 * 批量创建分组商品定价
 * @param {Object} data - 批量定价数据
 * @param {number} data.group_id - 分组ID
 * @param {Array} data.products - 商品列表
 * @param {string} data.start_time - 生效开始时间
 * @param {string} data.end_time - 生效结束时间
 */
function batchCreateGroupProductPrice(data) {
  return post('/shop/user-groups/prices/batch', data)
}

/**
 * 获取分组商品定价列表
 * @param {number} groupId - 分组ID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认1
 * @param {number} params.page_size - 每页数量，默认10
 */
function getGroupProductPrices(groupId, params = {}) {
  // 设置默认值
  const defaultParams = {
    page: 1,
    page_size: 10
  }
  
  const finalParams = { ...defaultParams, ...params }
  
  // 构建查询字符串
  const queryString = buildQueryString(finalParams)
  const url = queryString ? `/shop/user-groups/${groupId}/prices?${queryString}` : `/shop/user-groups/${groupId}/prices`
  
  return get(url)
}

/**
 * 更新分组商品定价
 * @param {number} id - 定价ID
 * @param {Object} data - 更新数据
 * @param {number} data.price - 价格(分)
 * @param {string} data.start_time - 生效开始时间
 * @param {string} data.end_time - 生效结束时间
 * @param {number} data.status - 状态
 */
function updateGroupProductPrice(id, data) {
  return put(`/shop/user-groups/prices/${id}`, data)
}

/**
 * 删除分组商品定价
 * @param {number} id - 定价ID
 */
function deleteGroupProductPrice(id) {
  return del(`/shop/user-groups/prices/${id}`)
}

/**
 * 获取用户分组列表（别名方法，兼容旧调用方式）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码，默认1
 * @param {number} params.pageSize - 每页数量，默认10（会自动转换为page_size）
 */
function getUserGroups(params = {}) {
  // 参数名映射：pageSize -> page_size
  const mappedParams = { ...params }
  if (mappedParams.pageSize !== undefined) {
    mappedParams.page_size = mappedParams.pageSize
    delete mappedParams.pageSize
  }
  
  return getUserGroupList(mappedParams)
}

module.exports = {
  createUserGroup,
  getUserGroups,
  getUserGroupList,
  getUserGroupDetail,
  updateUserGroup,
  deleteUserGroup,
  addGroupMembers,
  removeGroupMembers,
  getGroupMembers,
  createGroupProductPrice,
  batchCreateGroupProductPrice,
  getGroupProductPrices,
  updateGroupProductPrice,
  deleteGroupProductPrice
}