// pages/merchant/group-members/group-members.js
const { showToast, showModal } = require('../../../utils/index.js')
const { userGroups: userGroupsApi, user: userApi } = require('../../../api/index.js')

Page({
  data: {
    groupId: 0,
    groupName: '',
    memberList: [],
    allUserList: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    total: 0,
    showAddDialog: false,
    selectedUsers: [],
    searchKeyword: '',
    
    // 批量删除相关
    isBatchMode: false,
    selectedMembers: [],
    
    // merchant-tabbar当前选中状态 
    tabbarCurrent: 3
  },

  onLoad(options) {
    const { groupId, groupName } = options
    
    // 验证 groupId 是否有效
    const parsedGroupId = parseInt(groupId)
    if (!groupId || isNaN(parsedGroupId) || parsedGroupId <= 0) {
      showToast('分组ID无效')
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({
      groupId: parsedGroupId,
      groupName: decodeURIComponent(groupName || '')
    })
    
    this.loadMemberList()
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
      await this.loadMemberList(true)
    } finally {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    }
  },

  // 加载成员列表
  async loadMemberList(reset = false) {
    if (this.data.loading) return
    
    // 验证 groupId 是否有效
    if (!this.data.groupId || isNaN(this.data.groupId) || this.data.groupId <= 0) {
      showToast('分组ID无效')
      return
    }
    
    this.setData({ loading: true })
    
    try {
      const page = reset ? 1 : this.data.page
      const res = await userGroupsApi.getGroupMembers(this.data.groupId, {
        page,
        page_size: this.data.pageSize
      })
      
      if (res.code === 200) {
        const list = res.data?.list ?? [];  // 如果 res.data 或 res.data.data 是 null/undefined，则返回 []
        const total = res.data?.total ?? 0;
        let memberList;

        console.log(list)

        if (reset) {
          memberList = list || [];
        } else {
          memberList = [...(this.data.memberList || [])];
          if (list) {
            memberList.push(...list);
          }
        }

        // 更新成员列表时，重置选中状态
        const updatedMemberList = memberList.map(member => ({
          ...member,
          isSelected: false
        }))

        this.setData({
          memberList: updatedMemberList,
          total,
          page: page + 1,
          hasMore: memberList.length < total,
          selectedMembers: [] // 重置选中成员
        })
      } else {
        throw new Error(res.message || '获取成员列表失败')
      }
    } catch (error) {
      console.error('获取成员列表失败:', error)
      showToast(error.message || '获取成员列表失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多
  loadMore() {
    this.loadMemberList()
  },

  // 显示添加成员对话框
  async showAddDialog() {
    // 加载所有用户列表
    await this.loadAllUsers()
    this.setData({
      showAddDialog: true,
      selectedUsers: []
    })
  },

  // 加载所有用户列表
  async loadAllUsers() {
    try {
      const params = {
        page: 1,
        page_size: 20, // 暂时加载较多用户，实际可分页
        group_id: this.data.groupId // 传入当前分组ID，后端会自动过滤已在分组中的用户
      }
      
      // 如果有搜索关键词，添加到参数中
      if (this.data.searchKeyword && this.data.searchKeyword.trim()) {
        params.keyword = this.data.searchKeyword.trim()
      }
      
      console.log('调用用户列表API，参数:', params)
      const res = await userApi.getUserList(params)
      console.log('用户列表API响应:', res)
      
      if (res.code === 200 && res.data && res.data.items) {
        console.log('用户原始数据:', res.data.items)
        
        // 后端已经过滤掉分组中的用户，直接处理选中状态
        const processedUsers = res.data.items.map(user => ({
          ...user,
          isSelected: this.data.selectedUsers.some(u => u.id === user.id)
        }))
        console.log('处理后的用户列表:', processedUsers)
        
        this.setData({
          allUserList: processedUsers
        })
        console.log('设置到页面的用户列表:', processedUsers)
      } else {
        console.log('API响应格式不正确或无数据')
        this.setData({
          allUserList: []
        })
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      showToast('获取用户列表失败')
      this.setData({
        allUserList: []
      })
    }
  },

  // 关闭添加对话框
  closeAddDialog() {
    this.setData({
      showAddDialog: false,
      selectedUsers: [],
      searchKeyword: ''
    })
  },

  // 搜索用户 - 只保存关键词，不调用接口
  onSearchUser(e) {
    const keyword = e.detail
    this.setData({ searchKeyword: keyword })
    
    // 清除之前的定时器（如果有）
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
  },

  // 点击搜索按钮
  onSearchClick() {
    this.loadAllUsers()
  },

  // 选择/取消选择用户
  toggleUserSelection(e) {
    const { user } = e.currentTarget.dataset
    const { selectedUsers, allUserList } = this.data
    const index = selectedUsers.findIndex(u => u.id === user.id)
    
    if (index > -1) {
      selectedUsers.splice(index, 1)
    } else {
      selectedUsers.push(user)
    }
    
    // 更新用户列表中的选中状态
    const updatedUserList = allUserList.map(u => ({
      ...u,
      isSelected: selectedUsers.some(su => su.id === u.id)
    }))
    
    this.setData({ 
      selectedUsers: [...selectedUsers],
      allUserList: updatedUserList
    })
  },

  // 添加选中的用户到分组
  async addSelectedUsers() {
    const { selectedUsers, groupId } = this.data
    
    if (selectedUsers.length === 0) {
      showToast('请选择要添加的用户')
      return
    }
    
    try {
      const userIds = selectedUsers.map(user => user.id)
      await userGroupsApi.addGroupMembers({
        group_id: groupId,
        user_ids: userIds
      })
      
      showToast('添加成功')
      this.closeAddDialog()
      this.refreshData()
    } catch (error) {
      console.error('添加成员失败:', error)
      showToast(error.message || '添加成员失败')
    }
  },

  // 移除成员
  async removeMember(e) {
    const { member } = e.currentTarget.dataset
    
    const confirmed = await showModal('移除确认', `确定要将"${member.nickname || member.phone || '用户'}"移出分组吗？`)
    if (!confirmed) return
    
    try {
      console.log('调用移除成员接口，参数:', {
        group_id: this.data.groupId,
        user_ids: [member.user_id]
      })
      
      const res = await userGroupsApi.removeGroupMembers({
        group_id: this.data.groupId,
        user_ids: [member.user_id]
      })
      
      console.log('移除成员接口响应:', res)
      
      if (res.code === 200) {
        showToast('移除成功')
        this.refreshData()
      } else {
        throw new Error(res.message || '移除失败')
      }
    } catch (error) {
      console.error('移除成员失败:', error)
      showToast(error.message || '移除成员失败')
    }
  },

  // 查看用户详情
  viewUserDetail(e) {
    const { member } = e.currentTarget.dataset
    // 可以跳转到用户详情页面
    showToast('功能开发中')
  },

  // 切换批量模式
  toggleBatchMode() {
    const isBatchMode = !this.data.isBatchMode
    
    // 退出批量模式时重置选中状态
    if (!isBatchMode) {
      const updatedMemberList = this.data.memberList.map(member => ({
        ...member,
        isSelected: false
      }))
      
      this.setData({
        isBatchMode,
        selectedMembers: [],
        memberList: updatedMemberList
      })
    } else {
      // 进入批量模式时也重置选中状态
      this.setData({
        isBatchMode,
        selectedMembers: []
      })
    }
  },

  // 全选/取消全选
  toggleSelectAll() {
    const { memberList, selectedMembers } = this.data
    const isAllSelected = selectedMembers.length === memberList.length
    
    if (isAllSelected) {
      // 取消全选
      const updatedMemberList = memberList.map(member => ({
        ...member,
        isSelected: false
      }))
      
      this.setData({
        selectedMembers: [],
        memberList: updatedMemberList
      })
    } else {
      // 全选
      const updatedMemberList = memberList.map(member => ({
        ...member,
        isSelected: true
      }))
      
      this.setData({
        selectedMembers: [...memberList],
        memberList: updatedMemberList
      })
    }
  },

  // 选择/取消选择成员（批量删除模式）
  toggleMemberSelection(e) {
    if (!this.data.isBatchMode) return
    
    const { member } = e.currentTarget.dataset
    const { selectedMembers, memberList } = this.data
    const index = selectedMembers.findIndex(m => m.user_id === member.user_id)
    
    if (index > -1) {
      selectedMembers.splice(index, 1)
    } else {
      selectedMembers.push(member)
    }
    
    // 更新成员列表中的选中状态
    const updatedMemberList = memberList.map(m => ({
      ...m,
      isSelected: selectedMembers.some(sm => sm.user_id === m.user_id)
    }))
    
    this.setData({ 
      selectedMembers: [...selectedMembers],
      memberList: updatedMemberList
    })
  },

  // 批量移除选中的成员
  async batchRemoveSelectedMembers() {
    const { selectedMembers, groupId } = this.data
    
    if (selectedMembers.length === 0) {
      showToast('请选择要移除的成员')
      return
    }
    
    const confirmed = await showModal('批量移除', `确定要移除选中的 ${selectedMembers.length} 名成员吗？`)
    if (!confirmed) return
    
    try {
      const userIds = selectedMembers.map(member => member.user_id)
      console.log('调用批量移除成员接口，参数:', {
        group_id: groupId,
        user_ids: userIds
      })
      
      const res = await userGroupsApi.removeGroupMembers({
        group_id: groupId,
        user_ids: userIds
      })
      
      console.log('批量移除成员接口响应:', res)
      
      if (res.code === 200) {
        showToast('批量移除成功')
        this.setData({
          isBatchMode: false,
          selectedMembers: []
        })
        this.refreshData()
      } else {
        throw new Error(res.message || '批量移除失败')
      }
    } catch (error) {
      console.error('批量移除失败:', error)
      showToast(error.message || '批量移除失败')
    }
  },


})