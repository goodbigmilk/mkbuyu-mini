const { request } = require('../../../../utils/request.js')
const { showToast } = require('../../../../utils/index.js')

Page({
  data: {
    categoryTree: [], // 分类树结构
    loading: false,
    expandedMap: {}, // 展开状态的映射对象
    currentCategoryId: null, // 当前编辑的分类ID（不能选择自己）
  },

  onLoad(options) {
    wx.setNavigationBarTitle({
      title: '选择分类'
    })
    
    // 获取传入的参数
    if (options.currentId) {
      this.setData({
        currentCategoryId: parseInt(options.currentId)
      })
    }
    
    // 加载分类数据
    this.loadCategories()
  },

  // 加载所有分类
  async loadCategories() {
    this.setData({ loading: true })
    
    try {
      const response = await request({
        url: '/shop/categories/tree',
        method: 'GET'
      })
      
      if (response.code === 200) {
        const categories = response.data || []
        const categoryTree = this.buildCategoryTree(categories)
        
        this.setData({
          categoryTree,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        showToast(response.message || '加载失败')
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      this.setData({ loading: false })
      showToast('加载失败，请重试')
    }
  },

  // 构建分类树结构
  buildCategoryTree(categories) {
    if (!categories || categories.length === 0) {
      return []
    }
    
    const categoryMap = {}
    const tree = []
    
    // 创建分类映射
    categories.forEach(category => {
      const categoryId = parseInt(category.id)
      const parentId = parseInt(category.parent_id || 0)
      
      categoryMap[categoryId] = {
        ...category,
        id: categoryId,
        parent_id: parentId,
        children: []
      }
    })
    
    // 构建树形结构
    categories.forEach(category => {
      const categoryId = parseInt(category.id)
      const parentId = parseInt(category.parent_id || 0)
      
      if (parentId === 0 || !parentId) {
        tree.push(categoryMap[categoryId])
      } else {
        const parent = categoryMap[parentId]
        if (parent) {
          parent.children.push(categoryMap[categoryId])
        } else {
          tree.push(categoryMap[categoryId])
        }
      }
    })
    
    return tree
  },

  // 切换分类展开/收起状态
  toggleCategory(e) {
    const categoryId = parseInt(e.currentTarget.dataset.categoryId)
    
    if (!categoryId) return
    
    const expandedMap = { ...this.data.expandedMap }
    expandedMap[categoryId] = !expandedMap[categoryId]
    
    this.setData({ expandedMap })
  },

  // 选择分类
  selectCategory(e) {
    const { category } = e.currentTarget.dataset
    
    // 不能选择自己作为父分类
    if (category.id === this.data.currentCategoryId) {
      showToast('不能选择自己作为父分类')
      return
    }
    
    this.handleSelection(category)
  },

  // 选择"无父分类"
  selectNoParent() {
    this.handleSelection(null)
  },

  // 处理选择结果
  handleSelection(category) {
    // 使用全局数据传递
    const app = getApp()
    app.globalData = app.globalData || {}
    app.globalData.selectedParentCategory = category
    
    // 显示选择结果
    const categoryName = category ? category.name : '无父分类'
    showToast(`已选择：${categoryName}`)
    
    // 返回上一页
    setTimeout(() => {
      wx.navigateBack()
    }, 500)
  },

  // 跳转到分类管理
  goToCategoryManage() {
    wx.navigateTo({
      url: '/pages/merchant/categories/categories'
    })
  }
}) 