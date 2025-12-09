/**
 * 推荐关系相关API
 * 
 * 功能说明:
 * 1. 获取推荐信息: 获取我的推荐码、推荐人信息和客户列表
 * 2. 绑定推荐人: 使用推荐码绑定推荐人
 * 3. 修改推荐人: 修改已绑定的推荐人
 * 4. 获取客户列表: 分页获取我推荐的客户列表
 * 5. 检查推荐码: 验证推荐码是否有效
 */

const { get, post, put } = require('../utils/request')

/**
 * 获取推荐信息
 * @returns {Promise} 推荐信息
 * @returns {string} data.referral_code - 我的推荐码
 * @returns {boolean} data.has_referrer - 是否有推荐人
 * @returns {object} data.referrer_info - 推荐人信息
 * @returns {array} data.customer_list - 客户列表
 * @returns {number} data.total_count - 总客户数
 */
function getReferralInfo() {
  return get('/referral/info')
}

/**
 * 绑定推荐人
 * @param {string} referralCode - 推荐码(推荐人的用户ID)
 * @returns {Promise} 绑定结果
 */
function bindReferrer(referralCode) {
  return post('/referral/bind', {
    referral_code: referralCode
  })
}

/**
 * 修改推荐人
 * @param {string} referralCode - 新推荐码(新推荐人的用户ID)
 * @returns {Promise} 修改结果
 */
function updateReferrer(referralCode) {
  return put('/referral/update', {
    referral_code: referralCode
  })
}

/**
 * 获取客户列表(分页)
 * @param {number} page - 页码，默认1
 * @param {number} pageSize - 每页数量，默认10
 * @returns {Promise} 客户列表
 * @returns {array} data.list - 客户列表
 * @returns {number} data.total - 总数
 * @returns {number} data.page - 当前页
 * @returns {number} data.page_size - 每页数量
 * @returns {number} data.total_pages - 总页数
 */
function getCustomerList(page = 1, pageSize = 10) {
  return get('/referral/customers', {
    page,
    page_size: pageSize
  })
}

/**
 * 检查推荐码是否有效
 * @param {string} referralCode - 推荐码
 * @returns {Promise} 检查结果
 * @returns {boolean} data.valid - 是否有效
 * @returns {string} data.user_id - 推荐人用户ID
 * @returns {string} data.nickname - 推荐人昵称
 * @returns {string} data.avatar - 推荐人头像
 */
function checkReferralCode(referralCode) {
  return get('/referral/check', {
    referral_code: referralCode
  })
}

module.exports = {
  getReferralInfo,
  bindReferrer,
  updateReferrer,
  getCustomerList,
  checkReferralCode
}

