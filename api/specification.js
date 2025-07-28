// 规格管理API
const { request } = require('../utils/request')

// 规格管理API
const specificationApi = {
  // 获取分类下的规格列表
  getSpecificationsByCategory(categoryId) {
    return request({
      url: `/shop/specifications/category/${categoryId}`,
      method: 'GET'
    })
  },

  // 获取规格列表
  getSpecificationList(params) {
    return request({
      url: '/shop/specifications',
      method: 'GET',
      data: params
    })
  },

  // 创建规格
  createSpecification(data) {
    return request({
      url: '/shop/specifications',
      method: 'POST',
      data
    })
  },

  // 更新规格
  updateSpecification(id, data) {
    return request({
      url: `/shop/specifications/${id}`,
      method: 'PUT',
      data
    })
  },

  // 删除规格
  deleteSpecification(id) {
    return request({
      url: `/shop/specifications/${id}`,
      method: 'DELETE'
    })
  },

  // 获取规格值列表
  getSpecificationValues(specId) {
    return request({
      url: `/shop/specifications/${specId}/values`,
      method: 'GET'
    })
  },

  // 创建规格值
  createSpecificationValue(data) {
    return request({
      url: '/shop/specification-values',
      method: 'POST',
      data
    })
  },

  // 更新规格值
  updateSpecificationValue(id, data) {
    return request({
      url: `/shop/specification-values/${id}`,
      method: 'PUT',
      data
    })
  },

  // 删除规格值
  deleteSpecificationValue(id) {
    return request({
      url: `/shop/specification-values/${id}`,
      method: 'DELETE'
    })
  }
}

module.exports = specificationApi 