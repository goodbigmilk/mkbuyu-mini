// pages/merchant/user-groups/user-groups.js
const { showToast, showModal } = require('../../../utils/index.js')
const { userGroups: userGroupsApi } = require('../../../api/index.js')

Page({
  data: {
    groupList: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    total: 0,
    showCreateDialog: false,
    
    // 创建/编辑分组表单
    formData: {
      name: '',
      description: ''
    },
    editingGroup: null, // 当前编辑的分组
    
    // merchant-tabbar当前选中状态 
    tabbarCurrent: 3
  },

  onLoad() {
    this.loadGroupList()
  },

  onShow() {
    // 设置merchant-tabbar的选中状态
    this.setData({
      tabbarCurrent: 3
    })
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      refreshing: true,
      page: 1,
      hasMore: true
    })
    
    try {
      await this.loadGroupList(true)
    } finally {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载分组列表
  async loadGroupList(reset = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const page = reset ? 1 : this.data.page
      const res = await userGroupsApi.getUserGroupList({
        page,
        page_size: this.data.pageSize
      })
      
      if (res.code === 200) {
        const { list=[], total=0 } = res.data
        let groupList;

        if (reset) {
          groupList = list || [];
        } else {
          groupList = [...(this.data.groupList || [])];
          if (list) {
            groupList.push(...list);
          }
        }

        this.setData({
          groupList,
          total,
          page: page + 1,
          hasMore: groupList.length < total
        })
      } else {
        throw new Error(res.message || '获取分组列表失败')
      }
    } catch (error) {
      console.error('获取分组列表失败:', error)
      showToast(error.message || '获取分组列表失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多
  loadMore() {
    this.loadGroupList()
  },

  // 显示创建分组对话框
  showCreateDialog() {
    this.setData({
      showCreateDialog: true,
      editingGroup: null,
      formData: {
        name: '',
        description: ''
      }
    })
  },

  // 显示编辑分组对话框
  showEditDialog(e) {
    const { group } = e.currentTarget.dataset
    // 保存完整的group对象,group_id已经是字符串类型
    this.setData({
      showCreateDialog: true,
      editingGroup: group,
      formData: {
        name: group.name,
        description: group.description || ''
      }
    })
  },

  // 关闭对话框
  closeDialog() {
    this.setData({
      showCreateDialog: false,
      editingGroup: null,
      formData: {
        name: '',
        description: ''
      }
    })
  },

  // 表单输入处理
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    
    // 检查field是否存在
    if (!field) {
      console.error('缺少data-field属性')
      return
    }

    // 对于van-field的input事件，值在e.detail中
    const value = e.detail

    console.log('表单输入:', field, value) // 调试日志
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 提交表单
  async submitForm() {
    const { formData, editingGroup } = this.data
    
    if (!formData.name.trim()) {
      showToast('请输入分组名称')
      return
    }
    
    try {
      if (editingGroup) {
        // 编辑分组 - 使用group_id(字符串类型)
        if (!editingGroup.group_id) {
          showToast('分组ID无效')
          console.error('editingGroup缺少group_id:', editingGroup)
          return
        }
        await userGroupsApi.updateUserGroup(editingGroup.group_id, formData)
        showToast('更新成功')
      } else {
        // 创建分组 - shop_id由后端从token中获取
        await userGroupsApi.createUserGroup(formData)
        showToast('创建成功')
      }
      
      this.closeDialog()
      this.refreshData()
    } catch (error) {
      console.error('操作失败:', error)
      showToast(error.message || '操作失败')
    }
  },

  // 删除分组
  async deleteGroup(e) {
    const { group } = e.currentTarget.dataset
    
    if (!group || !group.group_id) {
      showToast('分组ID无效')
      console.error('group缺少group_id:', group)
      return
    }
    
    const confirmed = await showModal('删除确认', `确定要删除分组"${group.name}"吗？`)
    if (!confirmed) return
    
    try {
      // 使用group_id(字符串类型)
      await userGroupsApi.deleteUserGroup(group.group_id)
      showToast('删除成功')
      this.refreshData()
    } catch (error) {
      console.error('删除失败:', error)
      showToast(error.message || '删除失败')
    }
  },

  // 切换分组状态
  async toggleGroupStatus(e) {
    const { group } = e.currentTarget.dataset
    
    if (!group || !group.group_id) {
      showToast('分组ID无效')
      console.error('group缺少group_id:', group)
      return
    }
    
    const newStatus = group.status === 1 ? 2 : 1
    
    try {
      // 使用group_id(字符串类型)
      await userGroupsApi.updateUserGroup(group.group_id, {
        name: group.name,
        description: group.description,
        status: newStatus
      })
      
      showToast(newStatus === 1 ? '已启用' : '已禁用')
      this.refreshData()
    } catch (error) {
      console.error('状态更新失败:', error)
      showToast(error.message || '状态更新失败')
    }
  },

  // 查看分组成员
  viewGroupMembers(e) {
    const { group } = e.currentTarget.dataset
    
    if (!group || !group.group_id) {
      showToast('分组ID无效')
      console.error('group缺少group_id:', group)
      return
    }
    
    // 确保group_id作为字符串传递,避免大数精度丢失
    wx.navigateTo({
      url: `/pages/merchant/group-members/group-members?groupId=${group.group_id}&groupName=${encodeURIComponent(group.name)}`
    })
  },

  // 设置分组定价
  setGroupPricing(e) {
    const { group } = e.currentTarget.dataset
    
    if (!group || !group.group_id) {
      showToast('分组ID无效')
      console.error('group缺少group_id:', group)
      return
    }
    
    // 确保group_id作为字符串传递,避免大数精度丢失
    wx.navigateTo({
      url: `/pages/merchant/group-pricing/group-pricing?groupId=${group.group_id}&groupName=${encodeURIComponent(group.name)}`
    })
  }
})