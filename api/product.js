// 商品相关API
const { request } = require('../utils/request')

// 获取商品列表（店铺商品管理）
function getProductList(params = {}) {
  return request({
    url: '/shop/products',
    method: 'GET',
    data: params
  })
}

// 创建商品
function createProduct(data) {
  return request({
    url: '/shop/products',
    method: 'POST',
    data
  })
}

// 更新商品
function updateProduct(id, data) {
  return request({
    url: `/shop/products/${id}`,
    method: 'PUT',
    data
  })
}

// 删除商品
function deleteProduct(id) {
  return request({
    url: `/shop/products/${id}`,
    method: 'DELETE'
  })
}

// 获取商品详情
function getProductDetail(id) {
  return request({
    url: `/products/${id}`,
    method: 'GET'
  })
}

// 上架商品
function publishProduct(id) {
  return request({
    url: `/shop/products/${id}/publish`,
    method: 'PUT'
  })
}

// 下架商品
function unpublishProduct(id) {
  return request({
    url: `/shop/products/${id}/unpublish`,
    method: 'PUT'
  })
}

// 批量操作商品
function batchProductOperation(data) {
  return request({
    url: '/shop/products/batch',
    method: 'POST',
    data
  })
}

// 更新库存
function updateStock(id, data) {
  return request({
    url: `/admin/products/${id}/stock`,
    method: 'PUT',
    data
  })
}

// 获取公开商品列表（用户浏览）
function getPublicProductList(params = {}) {
  return request({
    url: '/products/list',
    method: 'GET',
    data: params
  })
}

// 获取热门商品
function getHotProducts(params = {}) {
  return request({
    url: '/products/hot',
    method: 'GET',
    data: params
  })
}

// 获取推荐商品
function getRecommendProducts(params = {}) {
  return request({
    url: '/products/recommend',
    method: 'GET',
    data: params
  })
}

// 获取轮播图
function getBanners(params = {}) {
  return request({
    url: '/products/banners',
    method: 'GET',
    data: params
  })
}

// 获取商品分类
function getCategories(params = {}) {
  return request({
    url: '/products/categories',
    method: 'GET',
    data: params
  })
}

// 上传图片
function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.uploadFile({
      url: 'http://localhost:8080/api/upload/image',
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      formData: {
        category: 'product'
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (error) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

module.exports = {
  getProductList,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductDetail,
  publishProduct,
  unpublishProduct,
  batchProductOperation,
  updateStock,
  getPublicProductList,
  getHotProducts,
  getRecommendProducts,
  getBanners,
  getCategories,
  uploadImage
} 