const { request } = require('../../../utils/request.js')
const { showToast, showModal } = require('../../../utils/index.js')

Page({
  data: {
    categories: [],
    categoryTree: [], // 新增：分类树结构
    loading: false,
    refreshing: false,
    
    // 搜索
    keyword: '',
    
    // 分页
    page: 1,
    pageSize: 20,
    hasMore: true,
    
    // 筛选
    status: 0, // 0全部 1显示 2隐藏
    
    // 新增/编辑弹窗
    showForm: false,
    isEdit: false,
    currentCategory: null,
    formData: {
      parent_id: "",
      name: '',
      sort: 0,
      status: 1,
      description: ''
    },
    
    // 父分类显示
    selectedParentCategory: null, // 新增：保存选中的父分类信息
    
    // 父分类选择 - 保留兼容性
    parentCategories: [],
    showParentPicker: false,
    parentIndex: 0,
    
    // 树形展示相关 - 新增
    expandedMap: {}, // 展开状态的映射对象
    viewMode: 'tree', // 视图模式：tree（树形）或 list（列表）
    
    // 内联编辑相关 - 新增
    editingCategoryId: null, // 当前正在编辑的分类ID
    editingName: '', // 正在编辑的分类名称
    originalName: '' // 原始分类名称（用于取消编辑时恢复）
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '商品分类管理'
    })
    
    // 检查登录状态
    this.checkLoginStatus()
  },
  
  onShow() {
    console.log('分类页面 onShow 被调用')
    
    // 每次显示时刷新数据
    this.refreshData()
    
    // 处理从父分类选择页面返回的数据
    this.handleReturnFromParentSelection()
  },

  // 处理从父分类选择页面返回的数据
  handleReturnFromParentSelection() {
    console.log('处理父分类选择返回的数据')
    
    try {
      // 方式1: 检查全局数据
      const app = getApp()
      if (app.globalData && app.globalData.hasOwnProperty('selectedParentCategory')) {
        const selectedCategory = app.globalData.selectedParentCategory
        console.log('从全局数据获取到选择的分类:', selectedCategory)
        
        this.handleParentCategorySelected(selectedCategory)
        
        // 清除全局数据，避免重复使用
        delete app.globalData.selectedParentCategory
        return
      }
      
      // 方式2: 检查本地存储
      try {
        const storedCategory = wx.getStorageSync('selectedParentCategory')
        if (storedCategory) {
          console.log('从本地存储获取到选择的分类:', storedCategory)
          
          this.handleParentCategorySelected(storedCategory)
          
          // 清除存储数据
          wx.removeStorageSync('selectedParentCategory')
          return
        }
      } catch (storageError) {
        console.log('读取本地存储失败:', storageError)
      }
      
      console.log('没有找到父分类选择数据')
      
    } catch (error) {
      console.error('处理父分类选择返回数据时出错:', error)
    }
  },

  // 处理父分类选择结果（供选择页面调用）
  handleParentCategorySelected(selectedCategory) {
    console.log('handleParentCategorySelected 被调用:', selectedCategory)
    
    // 只有在表单打开时才处理选择结果
    if (!this.data.showForm) {
      console.log('表单未打开，忽略父分类选择')
      return
    }
    
    if (selectedCategory) {
      // 选择了具体的分类
      this.setData({
        'formData.parent_id': selectedCategory.category_id,
        selectedParentCategory: selectedCategory
      }, () => {
        console.log('父分类数据更新完成:', {
          parentId: this.data.formData.parent_id,
          selectedCategory: this.data.selectedParentCategory
        })
      })
    } else {
      // 选择了"无父分类"
      this.setData({
        'formData.parent_id': "0",
        selectedParentCategory: null
      }, () => {
        console.log('清除父分类选择完成')
      })
    }
  },

  // 检查登录状态
  checkLoginStatus() {
        const { userState } = require('../../../utils/state.js')
        const token = userState.getToken()
        const userId = userState.getUserId()
    
    console.log('分类页面 - 登录状态检查:', {
      hasToken: !!token,
      hasUserId: !!userId,
      tokenLength: token ? token.length : 0
    })
    
    if (!token || !userId) {
      console.log('未登录，跳转到登录页')
      wx.showModal({
        title: '未登录',
        content: '请先登录后再访问商家功能',
        showCancel: false,
        confirmText: '去登录',
        success: () => {
          wx.reLaunch({
            url: '/pages/auth/login/login'
          })
        }
      })
      return false
    }
    
    // 直接从本地存储检查角色权限
    const roles = wx.getStorageSync('roles') || []
    const hasShopRole = roles.includes('shop')
    
    console.log('🏪 分类页面权限检查:', {
      roles: roles,
      hasShopRole: hasShopRole
    })
    
    if (!hasShopRole) {
      console.log('用户没有商家权限')
      wx.showModal({
        title: '权限不足',
        content: '此功能仅供商家使用',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          wx.navigateBack()
        }
      })
      return false
    }
    
    // 使用统一的状态管理切换到商家端上下文
    userState.switchContext('shop')
    
    // 状态检查通过，加载数据
    this.loadCategories()
    return true
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreCategories()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      refreshing: true
    })
    await this.loadCategories()
    this.setData({ refreshing: false })
  },

  // 加载分类列表 - 修改为支持树形结构
  async loadCategories() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const params = {
        page: this.data.page,
        page_size: this.data.pageSize
      }

      if (this.data.keyword) {
        params.keyword = this.data.keyword
      }
      if (this.data.status > 0) {
        params.status = this.data.status
      }

      // 优先使用树形接口
      let response
      try {
        response = await request({
          url: '/product/categories/tree',
          method: 'GET',
          data: params
        })
      } catch (error) {
        // 如果树形接口不存在，回退到普通接口
        console.log('树形接口不可用，使用普通接口:', error)
        response = await request({
          url: '/product/categories',
          method: 'GET',
          data: params
        })
      }

      if (response.code === 200) {
        let newCategories = []
        let total = 0
        
        if (response.data && typeof response.data === 'object') {
          if (response.data.list) {
            // 如果有分页结构
            newCategories = response.data.list || []
            total = response.data.total || 0
          } else if (Array.isArray(response.data)) {
            // 如果直接是数组
            newCategories = response.data
            total = newCategories.length
          }
        }
        
        const categories = this.data.page === 1 ? newCategories : [...this.data.categories, ...newCategories]
        
        // 构建分类树
        const categoryTree = this.buildCategoryTree(categories)
        
        this.setData({
          categories,
          categoryTree, // 新增：设置分类树
          hasMore: newCategories.length === this.data.pageSize,
          loading: false
        })
        
        console.log('分类加载成功:', {
          page: this.data.page,
          newCount: newCategories.length,
          totalCount: categories.length,
          treeCount: categoryTree.length,
          hasMore: this.data.hasMore
        })
      } else {
        this.setData({ loading: false })
        this.handleBusinessError(response.message || '加载失败', false)
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({ loading: false })
      this.handleBusinessError(error.message || error, false)
    }
  },

  // 新增：构建分类树结构（从select-parent复制并修改）
  buildCategoryTree(categories) {
    console.log('开始构建分类树，原始数据:', categories)
    
    if (!categories || categories.length === 0) {
      console.warn('分类数据为空')
      return []
    }
    
    const categoryMap = {}
    const tree = []
    
    // 先创建所有分类的映射，并初始化children数组
    categories.forEach(category => {
      // 保持原始的 category_id（可能是数字或字符串）
      const categoryId = category.category_id
      const parentId = category.parent_id || 0
      
      categoryMap[categoryId] = {
        ...category,
        category_id: categoryId,
        parent_id: parentId,
        children: []
      }
      console.log(`映射分类 ID:${categoryId}, 名称:${category.name}, 父ID:${parentId}, 层级:${category.level}`)
    })
    
    console.log('分类映射表:', categoryMap)
    
    // 构建树形结构
    categories.forEach(category => {
      const categoryId = category.category_id
      const parentId = category.parent_id || 0
      
      // 判断是否为根级分类
      if (parentId === 0 || parentId === '0' || !parentId) {
        // 根级分类（父ID为0或空）
        tree.push(categoryMap[categoryId])
        console.log(`添加根级分类: ID:${categoryId}, 名称:${category.name}`)
      } else {
        // 子分类
        const parent = categoryMap[parentId]
        if (parent) {
          parent.children.push(categoryMap[categoryId])
          console.log(`添加子分类: ID:${categoryId}, 名称:${category.name}, 父分类:${parent.name}(ID:${parentId})`)
        } else {
          console.warn(`找不到父分类 ID:${parentId} 对于分类 ${category.name}(ID:${categoryId})`)
          // 如果找不到父分类，将其作为根级分类
          tree.push(categoryMap[categoryId])
        }
      }
    })
    
    console.log('构建完成的分类树:', tree)
    return tree
  },

  // 新增：切换分类展开/收起状态
  toggleCategory(e) {
    const categoryIdRaw = e.currentTarget.dataset.categoryId
    // 统一转换为字符串类型，因为对象的键总是字符串
    const categoryId = String(categoryIdRaw)
    
    console.log('切换分类展开状态:', {
      原始ID: categoryIdRaw,
      转换后ID: categoryId,
      转换后类型: typeof categoryId,
      当前展开映射: this.data.expandedMap
    })
    
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
      console.error('无效的分类ID:', categoryIdRaw)
      return
    }
    
    const expandedMap = { ...this.data.expandedMap } // 复制映射对象
    
    // 切换展开状态
    if (expandedMap[categoryId]) {
      // 当前是展开状态，改为收起
      delete expandedMap[categoryId]
      console.log(`收起分类 ${categoryId}`)
    } else {
      // 当前是收起状态，改为展开
      expandedMap[categoryId] = true
      console.log(`展开分类 ${categoryId}`)
    }
    
    this.setData({
      expandedMap: expandedMap
    }, () => {
      console.log('展开状态更新完成:', this.data.expandedMap)
    })
  },


  // 新增：切换视图模式
  switchViewMode() {
    const newMode = this.data.viewMode === 'tree' ? 'list' : 'tree'
    this.setData({ viewMode: newMode })
  },

  // 新增：展开所有分类
  expandAll() {
    const expandedMap = {}
    
    const collectAllIds = (categories) => {
      categories.forEach(category => {
        if (category.children && category.children.length > 0) {
          // 使用字符串类型的ID作为键
          expandedMap[String(category.category_id)] = true
          collectAllIds(category.children)
        }
      })
    }
    
    collectAllIds(this.data.categoryTree)
    
    this.setData({
      expandedMap
    })
  },

  // 新增：收起所有分类
  collapseAll() {
    this.setData({
      expandedMap: {}
    })
  },

  // 新增：查找分类通过ID
  findCategoryById(categoryId) {
    const targetId = parseInt(categoryId)
    
    // 先在categoryTree中查找（树形结构）
    const findInTree = (categories) => {
      for (let category of categories) {
        if (parseInt(category.category_id) === targetId) {
          return category
        }
        if (category.children && category.children.length > 0) {
          const found = findInTree(category.children)
          if (found) return found
        }
      }
      return null
    }
    
    // 先尝试在分类树中查找
    if (this.data.categoryTree && this.data.categoryTree.length > 0) {
      const found = findInTree(this.data.categoryTree)
      if (found) return found
    }
    
    // 如果在分类树中找不到，再在普通分类列表中查找
    if (this.data.categories && this.data.categories.length > 0) {
      const found = this.data.categories.find(category => 
        parseInt(category.category_id) === targetId
      )
      if (found) return found
    }
    
    console.warn('找不到指定ID的分类:', categoryId)
    return null
  },

  // 加载更多分类
  async loadMoreCategories() {
    this.setData({
      page: this.data.page + 1
    })
    await this.loadCategories()
  },

  // 输入搜索关键字
  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  // 搜索处理
  onSearch() {
    this.setData({ page: 1, hasMore: true })
    this.refreshData()
  },

  // 状态筛选
  onStatusChange(e) {
    this.setData({ status: parseInt(e.detail.value) })
    this.refreshData()
  },

  // 显示新增表单
  showAddForm() {
    this.setData({
      showForm: true,
      isEdit: false,
      currentCategory: null,
      selectedParentCategory: null, // 清空父分类选择
      formData: {
        parent_id: "0",
        name: '',
        sort: 0,
        status: 1,
        description: ''
      },
      parentIndex: 0
    })
  },

  // 跳转到选择分类页面
  selectParentCategory() {
    const currentId = this.data.isEdit && this.data.currentCategory ? this.data.currentCategory.category_id : 0
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

  // 新增：开始编辑分类名称
  startEditing(e) {
    const { category } = e.currentTarget.dataset
    
    console.log('开始编辑分类:', category)
    
    if (!category || !category.category_id) {
      console.error('无效的分类数据')
      return
    }
    
    console.log('设置编辑状态:', {
      categoryId: category.category_id,
      categoryName: category.name,
      currentEditingId: this.data.editingCategoryId
    })
    
    this.setData({
      editingCategoryId: category.category_id,
      editingName: category.name,
      originalName: category.name
    }, () => {
      console.log('编辑状态已设置完成:', {
        editingCategoryId: this.data.editingCategoryId,
        editingName: this.data.editingName,
        originalName: this.data.originalName
      })
    })
  },

  // 新增：处理编辑名称输入
  onEditingNameInput(e) {
    const value = e.detail.value || ''
    console.log('编辑名称输入:', value)
    
    this.setData({
      editingName: value
    })
  },

  // 新增：保存编辑的名称
  async saveEditingName() {
    const { editingCategoryId, editingName, originalName } = this.data
    
    console.log('保存编辑:', {
      editingCategoryId,
      editingName,
      originalName
    })
    
    if (!editingCategoryId) {
      console.error('没有正在编辑的分类')
      return
    }
    
    // 验证输入
    const trimmedName = (editingName || '').trim()
    
    if (!trimmedName) {
      showToast('分类名称不能为空')
      return
    }
    
    if (trimmedName.length < 2) {
      showToast('分类名称至少2个字符')
      return
    }
    
    if (trimmedName.length > 50) {
      showToast('分类名称不能超过50个字符')
      return
    }
    
    // 如果名称没有变化，直接取消编辑
    if (trimmedName === originalName) {
      console.log('名称没有变化，取消编辑')
      this.cancelEditing()
      return
    }
    
    // 查找当前编辑的分类完整信息
    const currentCategory = this.findCategoryById(editingCategoryId)
    if (!currentCategory) {
      console.error('找不到当前编辑的分类信息')
      showToast('分类信息异常，请刷新页面重试')
      return
    }
    
    try {
      wx.showLoading({
        title: '保存中...'
      })
      
      // 构建完整的更新数据，保持原有字段不变，只修改名称
      const updateData = {
        parent_id: String(currentCategory.parent_id || 0),
        name: trimmedName,
        sort: currentCategory.sort || 0,
        status: currentCategory.status || 1,
        description: currentCategory.description || ''
      }
      
      console.log('发送更新请求:', {
        url: `/product/categories/${editingCategoryId}`,
        data: updateData
      })
      
      const response = await request({
        url: `/product/categories/${editingCategoryId}`,
        method: 'PUT',
        data: updateData
      })
      
      wx.hideLoading()
      
      console.log('分类名称更新响应:', response)
      
      if (response.code === 200) {
        showToast('分类名称更新成功')
        
        // 取消编辑状态
        this.setData({
          editingCategoryId: null,
          editingName: '',
          originalName: ''
        })
        
        // 刷新分类数据
        this.refreshData()
      } else {
        const errorMsg = response.message || '更新失败'
        console.error('分类名称更新失败:', response)
        this.handleBusinessError(errorMsg, true)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('分类名称更新异常:', error)
      this.handleBusinessError(error.message || error, true)
    }
  },

  // 新增：取消编辑
  cancelEditing() {
    console.log('取消编辑')
    
    this.setData({
      editingCategoryId: null,
      editingName: '',
      originalName: ''
    })
  },

  // 表单输入处理
  onFormInput(e) {
    const { field } = e.currentTarget.dataset

    let value = ''
    value = e.detail
    
    // 确保值是字符串类型
    if (typeof value !== 'string') {
      value = value ? String(value) : ''
    }
    
    console.log('表单输入处理:', {
      field: field,
      value: value,
      valueType: typeof value,
      'e.detail': e.detail,
      'e.type': e.type,
      'currentFormData': this.data.formData
    })
    
    if (!field) {
      console.error('表单输入处理: 缺少data-field属性')
      return
    }
    
    // 动态更新表单数据
    const updateData = {}
    updateData[`formData.${field}`] = value
    
    this.setData(updateData, () => {
      console.log('表单数据更新完成:', {
        field: field,
        newValue: value,
        updatedFormData: this.data.formData
      })
    })
  },

  // 数字输入处理
  onNumberInput(e) {
    const { field } = e.currentTarget.dataset
    const value = parseInt(e.detail.value) || 0
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 状态选择器变化
  onStatusPickerChange(e) {
    const status = parseInt(e.detail.value) + 1
    this.setData({
      'formData.status': status
    })
  },

  // 取消表单
  cancelForm() {
    this.setData({ 
      showForm: false,
      selectedParentCategory: null
    })
  },

  // 提交表单
  async submitForm() {
    const { formData, isEdit, currentCategory } = this.data

    // 验证表单
    if (!(formData.name || '').trim()) {
      showToast('请输入分类名称')
      return
    }

    if ((formData.name || '').trim().length < 2) {
      showToast('分类名称至少2个字符')
      return
    }

    if ((formData.name || '').trim().length > 50) {
      showToast('分类名称不能超过50个字符')
      return
    }

    try {
      wx.showLoading({
        title: isEdit ? '更新中...' : '创建中...'
      })

      const requestData = {
        parent_id: String(formData.parent_id || "0"),
        name: (formData.name || '').trim(),
        sort: formData.sort,
        status: formData.status,
        description: (formData.description || '').trim()
      }

      console.log('提交分类数据:', requestData)

      let response
      if (isEdit) {
        response = await request({
          url: `/product/categories/${currentCategory.category_id}`,
          method: 'PUT',
          data: requestData
        })
      } else {
        response = await request({
          url: '/product/categories',
          method: 'POST',
          data: requestData
        })
      }

      wx.hideLoading()

      console.log('分类操作响应:', response)

      if (response.code === 200) {
        showToast(isEdit ? '分类更新成功' : '分类创建成功')
        this.setData({ 
          showForm: false,
          selectedParentCategory: null
        })
        this.refreshData()
      } else {
        const errorMsg = response.message || '操作失败'
        console.error('分类操作失败:', response)
        this.handleBusinessError(errorMsg, isEdit)
      }
    } catch (error) {
      wx.hideLoading()
      console.error('分类操作异常:', error)
      this.handleBusinessError(error.message || error, isEdit)
    }
  },

  // 错误处理
  handleBusinessError(errorMessage, isEdit) {
    console.log('处理业务错误:', { errorMessage, isEdit })
    
    // 在方法顶部统一引入 userState
    const { userState } = require('../../../utils/state.js')
    
    if (typeof errorMessage !== 'string') {
      errorMessage = '操作失败，请稍后重试'
    }
    
    // 根据错误信息类型进行处理
    if (errorMessage.includes('未认证') || errorMessage.includes('token') || errorMessage.includes('认证失败')) {
      wx.showModal({
        title: '登录已过期',
        content: '请重新登录后继续操作',
        showCancel: false,
        confirmText: '重新登录',
        success: () => {
          userState.logout()
          wx.reLaunch({
            url: '/pages/auth/login/login'
          })
        }
      })
    } else if (errorMessage.includes('需要卖家权限') || errorMessage.includes('权限不足')) {
      wx.showModal({
        title: '权限不足',
        content: '此功能需要商家权限，请确认您的账户类型。',
        showCancel: false,
        confirmText: '我知道了'
      })
    } else if (errorMessage.includes('店铺已被禁用或审核中')) {
      wx.showModal({
        title: '店铺审核中',
        content: '您的店铺正在审核中，审核通过后即可正常使用所有功能。',
        showCancel: false,
        confirmText: '我知道了'
      })
    } else if (errorMessage.includes('店铺不存在')) {
      wx.showModal({
        title: '店铺信息异常',
        content: '店铺信息有误，请重新登录或联系客服。',
        showCancel: false,
        confirmText: '重新登录',
        success: () => {
          userState.logout()
          wx.reLaunch({
            url: '/pages/auth/login/login'
          })
        }
      })
    } else if (errorMessage.includes('同级分类名称已存在')) {
      showToast('分类名称已存在，请换个名称')
    } else if (errorMessage.includes('分类层级不能超过3级')) {
      showToast('分类层级不能超过3级')
    } else if (errorMessage.includes('请求参数错误')) {
      showToast('输入信息有误，请检查后重试')
    } else if (errorMessage.includes('该分类下还有商品')) {
      showToast('该分类下还有商品，无法删除')
    } else if (errorMessage.includes('请先删除子分类')) {
      showToast('请先删除子分类')
    } else {
      // 其他未知错误，显示具体的错误信息
      let displayMessage = errorMessage
      if (typeof errorMessage === 'string') {
        displayMessage = errorMessage.replace(/^操作失败:\s*/, '')
      }
      showToast(displayMessage)
    }
  },

  // 删除分类
  async deleteCategory(e) {
    console.log('deleteCategory 方法被触发:', e)
    
    // 获取分类数据
    const { category } = e.currentTarget.dataset
    
    console.log('删除分类被调用，分类数据:', category)
    console.log('事件对象:', {
      type: e.type,
      currentTarget: e.currentTarget,
      dataset: e.currentTarget.dataset
    })
    
    if (!category || !category.category_id) {
      console.error('删除分类: 缺少分类数据或ID')
      showToast('分类信息异常，请刷新页面重试')
      return
    }

    try {
      // 显示确认弹窗
      const confirmed = await showModal({
        title: '确认删除',
        content: `确定要删除分类"${category.name}"吗？删除后无法恢复`,
        showCancel: true,
        cancelText: '取消',
        confirmText: '删除'
      })
      if (!confirmed) {
        console.log('用户取消删除操作')
        return
      }

      console.log('开始删除分类，ID:', category.category_id, '名称:', category.name)
      
      wx.showLoading({
        title: '删除中...',
        mask: true
      })

      // 调用删除接口
      const response = await request({
        url: `/product/categories/${category.category_id}`,
        method: 'DELETE'
      })

      console.log('删除分类接口响应:', response)
      wx.hideLoading()

      // 检查响应
      if (response && response.code === 200) {
        console.log('删除成功，准备刷新数据')
        showToast('分类删除成功')
        
        // 立即刷新数据
        await this.refreshData()
        
        console.log('分类删除成功，数据已刷新')
      } else if (response && response.code !== 200) {
        // 业务错误
        const errorMsg = response.message || response.msg || '删除失败'
        console.error('删除分类业务错误:', {
          code: response.code,
          message: errorMsg,
          response: response
        })
        this.handleBusinessError(errorMsg, false)
      } else {
        // 响应格式异常
        console.error('删除分类响应异常:', response)
        showToast('服务器响应异常，请稍后重试')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('删除分类发生异常:', error)
      
      // 处理网络错误或其他异常
      let errorMessage = '删除失败，请检查网络连接'
      
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message
        } else if (error.errMsg) {
          errorMessage = error.errMsg
        } else if (error.code) {
          errorMessage = `请求失败 (${error.code})`
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      console.log('处理删除错误:', errorMessage)
      this.handleBusinessError(errorMessage, false)
    }
  },

  // 以下保留原有的兼容性方法
  
  // 加载父分类选项（旧版本兼容）
  async loadParentCategories() {
    try {
      const response = await request({
        url: '/product/categories/all',
        method: 'GET'
      })

      if (response.code === 200) {
        // 只显示一级分类作为父分类选项
        const parentCategories = (response.data || []).filter(cat => cat.level === 1)
        this.setData({ parentCategories })
      } else {
        console.error('加载父分类失败:', response)
        this.handleBusinessError(response.message || '加载父分类失败', false)
      }
    } catch (error) {
      console.error('加载父分类失败:', error)
      this.handleBusinessError(error.message || error, false)
    }
  },

  // 显示父分类选择器（旧版本兼容）
  showParentPicker() {
    this.loadParentCategories().then(() => {
      this.setData({ showParentPicker: true })
    })
  },

  // 父分类选择器变化（旧版本兼容）
  onParentPickerChange(e) {
    const { index } = e.currentTarget.dataset
    let parentId = "0"
    let selectedParentCategory = null
    
    if (index > 0) {
      const category = this.data.parentCategories[index - 1]
      parentId = category.category_id
      selectedParentCategory = category
    }
    
    this.setData({
      parentIndex: index,
      'formData.parent_id': parentId,
      selectedParentCategory,
      showParentPicker: false
    })
  },

  // 关闭父分类选择器（旧版本兼容）
  onParentPickerClose() {
    this.setData({ showParentPicker: false })
  },

  // 分类详情
  viewDetail(e) {
    const { category } = e.currentTarget.dataset
    
    wx.showModal({
      title: '分类详情',
      content: `名称：${category.name}\n描述：${category.description || '暂无描述'}\n状态：${category.status === 1 ? '显示' : '隐藏'}\n排序：${category.sort}\n层级：${category.level}`,
      showCancel: false
    })
  }
}) 