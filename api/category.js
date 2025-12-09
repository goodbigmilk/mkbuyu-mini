// 分类管理API
const { request } = require('../utils/request')

const categoryApi = {
  // 获取分类列表(商家端,需要分页参数)
  getCategoryList(params = {}) {
    // 确保有默认的分页参数
    const queryParams = {
      page: params.page || 1,
      page_size: params.page_size || 100,
      ...params
    }
    return request({
      url: '/product/categories',
      method: 'GET',
      data: queryParams
    })
  },

  // 获取分类树(商家端,不需要分页)
  getCategoryTree() {
    return request({
      url: '/product/categories/tree',
      method: 'GET'
    })
  },

  // 获取所有启用的分类(商家端,不需要分页)
  getAllCategories() {
    return request({
      url: '/product/categories/all',
      method: 'GET'
    })
  },

  // 创建分类
  createCategory(data) {
    return request({
      url: '/product/categories',
      method: 'POST',
      data
    })
  },

  // 更新分类
  updateCategory(id, data) {
    return request({
      url: `/product/categories/${id}`,
      method: 'PUT',
      data
    })
  },

  // 删除分类
  deleteCategory(id) {
    return request({
      url: `/product/categories/${id}`,
      method: 'DELETE'
    })
  },

  // 获取分类详情
  getCategoryDetail(id) {
    return request({
      url: `/product/categories/${id}`,
      method: 'GET'
    })
  },

  // 更新分类状态
  updateCategoryStatus(id, status) {
    return request({
      url: `/product/categories/${id}/status`,
      method: 'PUT',
      data: { status }
    })
  },

  // 获取用户可见的指定店铺分类（用户端）
  getUserCategoriesByShop(shopId) {
    return request({
      url: '/product/categories/user/shop',
      method: 'GET',
      data: { shop_id: shopId }
    })
  },

  // 获取用户可见的所有绑定店铺分类（用户端）
  getUserAllCategories() {
    return request({
      url: '/product/categories/user/all',
      method: 'GET'
    })
  }
}

module.exports = categoryApi 