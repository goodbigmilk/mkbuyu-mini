// 店铺信息编辑页面
const { showToast, showModal, showLoading, hideLoading } = require('../../../../utils/index.js')
const { shopState } = require('../../../../utils/state.js')
const { createShop, updateShopInfo, getMyShopInfo } = require('../../../../api/shop.js')
const { uploadImage } = require('../../../../api/upload.js')

Page({
  data: {
    // 页面模式：create（创建）、edit（编辑）
    mode: 'edit',
    
    // 表单数据
    formData: {
      name: '',
      description: '',
      logo: '',
      banner: '',
      phone: '',
      email: '',
      owner_name: '',
      owner_email: ''
    },
    
    // 原始数据（用于编辑模式）
    originalData: {},
    
    // 上传状态
    uploading: {
      logo: false,
      banner: false
    },
    
    // 表单验证
    errors: {},
    
    // 保存状态
    saving: false
  },

  onLoad(options) {
    const { mode = 'edit' } = options
    
    this.setData({ mode })
    
    if (mode === 'create') {
      wx.setNavigationBarTitle({
        title: '创建店铺'
      })
      this.initCreateMode()
    } else {
      wx.setNavigationBarTitle({
        title: '编辑店铺信息'
      })
      this.loadShopInfo()
    }
  },

  // 初始化创建模式
  initCreateMode() {
    // 创建模式下，设置一些默认值
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        'formData.owner_name': userInfo.displayName || userInfo.nickname || '',
        'formData.owner_email': userInfo.email || '',
        'formData.email': userInfo.email || ''
      })
    }
  },

  // 加载店铺信息（编辑模式）
  async loadShopInfo() {
    try {
      showLoading('加载中...')
      
      const response = await getMyShopInfo()
      if (response.code === 200 && response.data) {
        const shopInfo = response.data
        
        this.setData({
          formData: {
            name: shopInfo.name || '',
            description: shopInfo.description || '',
            logo: shopInfo.logo || '',
            banner: shopInfo.banner || '',
            phone: shopInfo.contact_phone || '',
            email: shopInfo.email || '',
            owner_name: shopInfo.owner_name || '',
            owner_email: shopInfo.owner_email || ''
          },
          originalData: { ...shopInfo }
        })
      }
    } catch (error) {
      console.error('加载店铺信息失败:', error)
      showToast('加载失败')
    } finally {
      hideLoading()
    }
  },

  // 表单输入处理
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`formData.${field}`]: value,
      [`errors.${field}`]: '' // 清除错误信息
    })
  },

  // 上传图片
  async onUploadImage(e) {
    const { type } = e.currentTarget.dataset // logo 或 banner
    
    try {
      // 选择图片
      const { tempFilePaths } = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (tempFilePaths.length === 0) return
      
      // 设置上传状态
      this.setData({
        [`uploading.${type}`]: true
      })
      
      // 上传图片
      const uploadResponse = await uploadImage(tempFilePaths[0], type === 'logo' ? 'avatar' : 'shop')
      
      if (uploadResponse.code === 200) {
        this.setData({
          [`formData.${type}`]: uploadResponse.data.url
        })
        showToast('上传成功')
      } else {
        throw new Error(uploadResponse.message || '上传失败')
      }
      
    } catch (error) {
      console.error('上传图片失败:', error)
      showToast(error.message || '上传失败')
    } finally {
      // 清除上传状态
      this.setData({
        [`uploading.${type}`]: false
      })
    }
  },

  // 删除图片
  onDeleteImage(e) {
    const { type } = e.currentTarget.dataset
    
    showModal('确认删除', '确定要删除这张图片吗？').then((confirmed) => {
      if (confirmed) {
        this.setData({
          [`formData.${type}`]: ''
        })
      }
    })
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data
    const errors = {}
    
    // 必填字段验证
    if (!formData.name.trim()) {
      errors.name = '请输入店铺名称'
    }
    
    if (!formData.description.trim()) {
      errors.description = '请输入店铺简介'
    }
    
    if (!formData.owner_name.trim()) {
      errors.owner_name = '请输入店主姓名'
    }
    
    // 邮箱格式验证
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '邮箱格式不正确'
    }
    
    if (formData.owner_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) {
      errors.owner_email = '邮箱格式不正确'
    }
    
    // 手机号格式验证（如果有填写）
    if (formData.phone && !/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '手机号格式不正确'
    }
    
    this.setData({ errors })
    
    return Object.keys(errors).length === 0
  },

  // 保存店铺信息
  async onSave() {
    if (!this.validateForm()) {
      showToast('请检查表单信息')
      return
    }
    
    const { mode, formData } = this.data
    
    try {
      this.setData({ saving: true })
      showLoading(mode === 'create' ? '创建中...' : '保存中...')
      
      let response
      
      if (mode === 'create') {
        // 创建店铺 [[memory:8641036]]
        response = await createShop(formData)
      } else {
        // 更新店铺信息
        response = await updateShopInfo(formData)
      }
      
      if (response.code === 200) {
        showToast(mode === 'create' ? '店铺创建成功' : '保存成功')
        
        // 更新全局状态
        if (response.data) {
          shopState.setShopInfo(response.data)
        }
        
        // 延迟返回，确保toast显示
        setTimeout(() => {
          if (mode === 'create') {
            // 创建成功后跳转到dashboard
            wx.reLaunch({
              url: '/pages/merchant/dashboard/dashboard'
            })
          } else {
            // 编辑模式返回上一页
            wx.navigateBack()
          }
        }, 1500)
        
      } else {
        throw new Error(response.message || '操作失败')
      }
      
    } catch (error) {
      console.error('保存失败:', error)
      showToast(error.message || '操作失败')
    } finally {
      this.setData({ saving: false })
      hideLoading()
    }
  },

  // 取消操作
  onCancel() {
    if (this.data.mode === 'create') {
      showModal('确认取消', '取消创建将返回上一页，确定要取消吗？').then((confirmed) => {
        if (confirmed) {
          wx.navigateBack()
        }
      })
    } else {
      wx.navigateBack()
    }
  }
})
