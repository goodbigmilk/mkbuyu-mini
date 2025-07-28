// 分类管理API
const { request } = require('../utils/request')

const categoryApi = {
  // 获取分类列表
  getCategoryList(params) {
    return request({
      url: '/shop/categories',
      method: 'GET',
      data: params
    })
  },

  // 获取分类树
  getCategoryTree() {
    return request({
      url: '/shop/categories/tree',
      method: 'GET'
    })
  },

  // 获取所有启用的分类
  getAllCategories() {
    return request({
      url: '/shop/categories/all',
      method: 'GET'
    })
  },

  // 创建分类
  createCategory(data) {
    return request({
      url: '/shop/categories',
      method: 'POST',
      data
    })
  },

  // 更新分类
  updateCategory(id, data) {
    return request({
      url: `/shop/categories/${id}`,
      method: 'PUT',
      data
    })
  },

  // 删除分类
  deleteCategory(id) {
    return request({
      url: `/shop/categories/${id}`,
      method: 'DELETE'
    })
  },

  // 获取分类详情
  getCategoryDetail(id) {
    return request({
      url: `/shop/categories/${id}`,
      method: 'GET'
    })
  },

  // 更新分类状态
  updateCategoryStatus(id, status) {
    return request({
      url: `/shop/categories/${id}/status`,
      method: 'PUT',
      data: { status }
    })
  }
}

module.exports = categoryApi 