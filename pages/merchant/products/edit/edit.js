// pages/merchant/products/edit/edit.js
const { createProduct, updateProduct, getProductDetail, uploadImage } = require('../../../../api/product')
const { getAllCategories } = require('../../../../api/category')
const { showToast, showModal, showLoading, hideLoading } = require('../../../../utils/index')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 是否编辑模式
    isEdit: false,
    productId: null,
    
    // 表单数据
    formData: {
      name: '',
      sub_title: '',
      description: '',
      keywords: '',
      price: '',
      stock: 0,
      weight: '',
      category_id: 0,
      is_hot: false,
      is_new: false,
      is_recommend: false,
      sort: 0
    },
    
    // 图片相关
    fileList: [],
    uploadedImages: [], // 已上传的图片URL列表
    
    // 分类相关
    categories: [],
    selectedCategory: null,
    selectedCategoryId: 0,
    showCategoryPicker: false,
    
    // 状态
    loading: false,
    saving: false,
    canSave: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('商品编辑页面加载，参数:', options)
    
    const { id } = options
    
    if (id) {
      this.setData({
        isEdit: true,
        productId: parseInt(id)
      })
      
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: '编辑商品'
      })
      
      this.loadProductDetail(parseInt(id))
    } else {
      wx.setNavigationBarTitle({
        title: '创建商品'
      })
    }
    
    this.checkLoginStatus()
    this.loadCategories()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从分类选择页面返回时的处理
    this.handleCategorySelectionResult()
  },

  // 处理分类选择结果
  handleCategorySelectionResult() {
    const app = getApp()
    if (app.globalData && app.globalData.selectedParentCategory !== undefined) {
      const selectedCategory = app.globalData.selectedParentCategory
      
      if (selectedCategory) {
        this.setData({
          selectedCategory,
          selectedCategoryId: selectedCategory.id,
          'formData.category_id': selectedCategory.id
        })
      } else {
        // 选择了"无父分类"
        this.setData({
          selectedCategory: null,
          selectedCategoryId: 0,
          'formData.category_id': 0
        })
      }
      
      // 清除全局数据
      delete app.globalData.selectedParentCategory
      this.checkCanSave()
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (!token || !userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/auth/login/login'
          })
        }
      })
      return false
    }
    
    if (userInfo.role !== 'shop') {
      wx.showModal({
        title: '提示',
        content: '需要商家权限',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return false
    }
    
    return true
  },

  // 加载商品详情（编辑模式）
  async loadProductDetail(productId) {
    try {
      this.setData({ loading: true })
      
      const response = await getProductDetail(productId)
      console.log('商品详情响应:', response)
      
      if (response.code === 200 && response.data) {
        const product = response.data
        
        // 处理图片列表
        const fileList = product.images ? product.images.map((img, index) => ({
          url: img.url,
          name: `image_${index}`,
          isImage: true
        })) : []
        
        const uploadedImages = product.images ? product.images.map(img => img.url) : []
        
        // 查找对应的分类
        const selectedCategory = this.data.categories.find(cat => cat.id === product.category_id)
        
        this.setData({
          formData: {
            name: product.name || '',
            sub_title: product.sub_title || '',
            description: product.description || '',
            keywords: product.keywords || '',
            price: (product.price / 100).toFixed(2), // 分转元
            stock: product.stock || 0,
            weight: product.weight ? product.weight.toString() : '',
            category_id: product.category_id || 0,
            is_hot: product.is_hot || false,
            is_new: product.is_new || false,
            is_recommend: product.is_recommend || false,
            sort: product.sort || 0
          },
          fileList,
          uploadedImages,
          selectedCategory,
          selectedCategoryId: product.category_id || 0
        })
        
        this.checkCanSave()
      } else {
        showToast(response.message || '加载商品详情失败')
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载商品详情失败:', error)
      showToast('加载失败，请重试')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载分类列表
  async loadCategories() {
    try {
      const response = await getAllCategories()
      console.log('分类列表响应:', response)
      
      if (response.code === 200 && response.data) {
        // 构建分类树结构
        const categoryTree = this.buildCategoryTree(response.data)
        
        // 将层级分类展开为平面数组，显示层级缩进
        const flatCategories = []
        const flattenCategories = (categoryList, level = 0) => {
          categoryList.forEach(item => {
            const prefix = '　'.repeat(level) // 使用全角空格缩进
            flatCategories.push({
              ...item,
              displayName: prefix + item.name,
              level: level
            })
            
            if (item.children && item.children.length > 0) {
              flattenCategories(item.children, level + 1)
            }
          })
        }
        
        flattenCategories(categoryTree)
        
        this.setData({
          categories: flatCategories,
          originalCategories: response.data
        })
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 构建分类树结构
  buildCategoryTree(categories) {
    const categoryMap = {}
    const rootCategories = []
    
    // 创建分类映射
    categories.forEach(category => {
      categoryMap[category.id] = { ...category, children: [] }
    })
    
    // 构建树结构
    categories.forEach(category => {
      if (category.parent_id === 0 || !categoryMap[category.parent_id]) {
        // 根分类
        rootCategories.push(categoryMap[category.id])
      } else {
        // 子分类
        categoryMap[category.parent_id].children.push(categoryMap[category.id])
      }
    })
    
    return rootCategories
  },

  // 表单字段变化处理
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const { detail } = e
    
    this.setData({
      [`formData.${field}`]: detail
    })
    
    this.checkCanSave()
  },

  // 库存变化处理
  onStockChange(e) {
    this.setData({
      'formData.stock': e.detail
    })
    this.checkCanSave()
  },

  // 开关变化处理
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset
    const { detail } = e
    
    this.setData({
      [`formData.${field}`]: detail
    })
    this.checkCanSave()
  },

  // 检查是否可以保存
  checkCanSave() {
    const { formData, uploadedImages } = this.data
    const canSave = formData.name.trim() && 
                   formData.price && 
                   parseFloat(formData.price) > 0 && 
                   formData.category_id > 0
    
    this.setData({ canSave })
  },

  // 图片上传后处理
  async afterRead(e) {
    const { file } = e.detail
    const files = Array.isArray(file) ? file : [file]
    
    if (!files || files.length === 0) {
      showToast('请选择要上传的文件')
      return
    }
    
    showLoading('上传中...')
    
    try {
      const uploadPromises = files.map(fileItem => {
        if (!fileItem.url) {
          throw new Error('文件路径无效')
        }
        return uploadImage(fileItem.url)
      })
      
      const responses = await Promise.all(uploadPromises)
      
      const newImages = []
      const newFileList = []
      
      responses.forEach((response, index) => {
        if (response && response.code === 200 && response.data) {
          const imageUrl = response.data.url
          newImages.push(imageUrl)
          newFileList.push({
            url: imageUrl,
            name: `image_${Date.now()}_${index}`,
            isImage: true
          })
        } else {
          console.warn(`第${index + 1}个文件上传失败:`, response)
        }
      })
      
      if (newImages.length > 0) {
        this.setData({
          fileList: [...this.data.fileList, ...newFileList],
          uploadedImages: [...this.data.uploadedImages, ...newImages]
        })
        
        if (newImages.length === files.length) {
          showToast('上传成功')
        } else {
          showToast(`成功上传${newImages.length}张图片，${files.length - newImages.length}张失败`)
        }
      } else {
        showToast('所有图片上传失败')
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      showToast(error.message || '上传失败，请重试')
    } finally {
      hideLoading()
    }
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.detail
    const fileList = this.data.fileList
    const uploadedImages = this.data.uploadedImages
    
    fileList.splice(index, 1)
    uploadedImages.splice(index, 1)
    
    this.setData({
      fileList,
      uploadedImages
    })
  },

  // 选择分类
  selectCategory() {
    console.log('选择分类')
    this.setData({
      showCategoryPicker: true
    })
  },

  // 关闭分类选择器
  closeCategoryPicker() {
    this.setData({
      showCategoryPicker: false
    })
  },

  // 分类选择
  onCategorySelect(e) {
    const { category } = e.currentTarget.dataset
    this.setData({
      selectedCategoryId: category.id
    })
  },

  // 确认分类选择
  confirmCategory() {
    const selectedCategory = this.data.categories.find(cat => cat.id === this.data.selectedCategoryId)
    
    if (selectedCategory) {
      this.setData({
        selectedCategory,
        'formData.category_id': selectedCategory.id,
        showCategoryPicker: false
      })
      this.checkCanSave()
    } else {
      showToast('请选择分类')
    }
  },

  // 跳转到分类选择页面
  selectParentCategory() {
    const currentId = this.data.isEdit && this.data.selectedCategory ? this.data.selectedCategory.id : 0
    console.log('跳转到父分类选择页面，当前分类ID:', currentId)
    
    wx.navigateTo({
      url: `/pages/merchant/categories/select-parent/select-parent?currentId=${currentId}`,
      success: () => {
        console.log('跳转到父分类选择页面成功')
      },
      fail: (error) => {
        console.error('跳转到父分类选择页面失败:', error)
        showToast('页面跳转失败')
      }
    })
  },

  // 预览商品
  onPreview() {
    if (!this.data.formData.name.trim()) {
      showToast('请输入商品名称')
      return
    }
    
    // 这里可以实现商品预览功能
    showToast('预览功能开发中')
  },

  // 保存商品
  async onSave() {
    if (!this.validateForm()) {
      return
    }

    try {
      this.setData({ saving: true })
      showLoading(this.data.isEdit ? '更新中...' : '创建中...')

      const formData = this.buildSubmitData()
      console.log('提交数据:', formData)

      let response
      if (this.data.isEdit) {
        response = await updateProduct(this.data.productId, formData)
      } else {
        response = await createProduct(formData)
      }

      console.log('保存响应:', response)

      if (response.code === 200) {
        showToast(this.data.isEdit ? '更新成功' : '创建成功')
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        showToast(response.message || '保存失败')
      }
    } catch (error) {
      console.error('保存商品失败:', error)
      showToast('保存失败，请重试')
    } finally {
      this.setData({ saving: false })
      hideLoading()
    }
  },

  // 验证表单
  validateForm() {
    const { formData } = this.data

    if (!formData.name.trim()) {
      showToast('请输入商品名称')
      return false
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      showToast('请输入正确的价格')
      return false
    }

    if (!formData.category_id || formData.category_id <= 0) {
      showToast('请选择商品分类')
      return false
    }

    return true
  },

  // 构建提交数据
  buildSubmitData() {
    const { formData, uploadedImages } = this.data

    return {
      name: formData.name.trim(),
      sub_title: formData.sub_title.trim(),
      description: formData.description.trim(),
      keywords: formData.keywords.trim(),
      price: Math.round(parseFloat(formData.price) * 100), // 元转分
      stock: parseInt(formData.stock) || 0,
      weight: parseFloat(formData.weight) || 0,
      category_id: parseInt(formData.category_id),
      is_hot: !!formData.is_hot,
      is_new: !!formData.is_new,
      is_recommend: !!formData.is_recommend,
      sort: parseInt(formData.sort) || 0,
      images: uploadedImages
    }
  }
}) 