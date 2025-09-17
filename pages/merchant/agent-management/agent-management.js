// pages/merchant/agent-management/agent-management.js
const { showToast, showModal } = require('../../../utils/index.js')
const userGroupAPI = require('../../../api/user-groups.js')
const agentAPI = require('../../../api/agent.js')

Page({
  data: {
    activeTab: 0,
    applications: [],
    conditions: [],
    userGroups: [],
    
    // 分页相关
    page: 1,
    pageSize: 10,
    hasMoreData: true,
    loading: false,
    
    // 申请处理弹窗相关
    showProcessDialog: false,
    currentApplication: null,
    selectedGroupId: '',
    processReason: '',
    isApproving: false,
    
    // 添加条件弹窗相关
    showAddConditionDialog: false,
    addConditionForm: {
      type: '', // '1' 个人消费，'2' 团队消费
      amount: ''
    },

    // 编辑条件弹窗相关
    showEditConditionDialog: false,
    editConditionForm: {
      id: null,
      type: 1,
      amount: ''
    }
  },

  onLoad() {
    this.loadInitialData()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.activeTab === 0) {
      this.loadMoreApplications()
    }
  },

  // 加载初始数据
  async loadInitialData() {
    try {
      await Promise.all([
        this.loadApplications(),
        this.loadConditions(),
        this.loadUserGroups()
      ])
    } catch (error) {
      console.error('加载初始数据失败:', error)
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({
      page: 1,
      hasMoreData: true,
      applications: []
    })
    await this.loadInitialData()
  },

  // 加载申请列表
  async loadApplications() {
    if (this.data.loading || !this.data.hasMoreData) return

    this.setData({ loading: true })

    try {
      const response = await agentAPI.getAgentApplications({
        page: this.data.page,
        pageSize: this.data.pageSize
      })
      
      if (response.code === 200) {
        const newApplications = response.data.list || []
        // 格式化申请列表中的数据
        const formattedApplications = newApplications.map(item => {
          console.log('格式化申请数据:', item)
          const formatted = {
            ...item,
            formattedPersonalConsume: this.formatAmount(item.personal_consume || 0),
            formattedTeamConsume: this.formatAmount(item.team_consume || 0),
            formattedTime: this.formatTime(item.created_at),
            formattedStatus: this.formatStatus(item.status)
          }
          console.log('格式化后的状态:', formatted.formattedStatus)
          return formatted
        })
        
        const allApplications = this.data.page === 1 ? formattedApplications : [...this.data.applications, ...formattedApplications]
        
        this.setData({
          applications: allApplications,
          hasMoreData: newApplications.length === this.data.pageSize,
          page: this.data.page + 1
        })
      } else {
        showToast(response.message || '获取申请列表失败')
      }
    } catch (error) {
      console.error('加载申请列表失败:', error)
      showToast('加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多申请
  async loadMoreApplications() {
    await this.loadApplications()
  },

  // 加载条件设置
  async loadConditions() {
    try {
      const response = await agentAPI.getAgentConditions()
      
      if (response.code === 200) {
        const conditions = response.data || []
        // 格式化金额数据
        const formattedConditions = conditions.map(item => ({
          ...item,
          formattedAmount: this.formatAmount(item.amount)
        }))
        
        this.setData({ 
          conditions: formattedConditions
        })
      } else {
        console.error('获取推广员条件失败:', response.message)
      }
    } catch (error) {
      console.error('加载条件设置失败:', error)
    }
  },

  // 加载用户分组
  async loadUserGroups() {
    try {
      const response = await userGroupAPI.getUserGroups({ page: 1, pageSize: 100 })
      
      if (response.code === 200) {
        this.setData({
          userGroups: response.data.list || []
        })
      }
    } catch (error) {
      console.error('加载用户分组失败:', error)
    }
  },

  // Tab切换
  onTabChange(event) {
    const activeTab = event.detail.index
    this.setData({ activeTab })
    
    if (activeTab === 0) {
      this.refreshData()
    } else if (activeTab === 1) {
      this.loadConditions()
    }
  },

  // 同意申请（直接显示选择分组弹窗）
  onApproveApplication(e) {
    const { application } = e.currentTarget.dataset
    this.setData({
      showProcessDialog: true,
      currentApplication: application,
      selectedGroupId: '',
      processReason: '',
      isApproving: true
    })
  },

  // 拒绝申请（直接拒绝）
  async onRejectApplication(e) {
    const { application } = e.currentTarget.dataset
    
    const confirmed = await showModal('确认拒绝', '确定要拒绝此推广员申请吗？')
    if (!confirmed) return
    
    try {
      wx.showLoading({ title: '处理中...' })
      
      const response = await agentAPI.processAgentApplication(application.id, {
        status: 3, // 拒绝
        reason: '不符合要求'
      })
      
      if (response.code === 200) {
        showToast('申请已拒绝')
        this.refreshData()
      } else {
        showToast(response.message || '处理失败')
      }
    } catch (error) {
      console.error('拒绝申请失败:', error)
      showToast('处理失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 关闭处理弹窗
  onCloseProcessDialog() {
    this.setData({
      showProcessDialog: false,
      currentApplication: null,
      selectedGroupId: '',
      processReason: '',
      isApproving: false
    })
  },

  // 选择用户分组
  onGroupSelect(e) {
    console.log('选择分组事件:', e.detail)
    this.setData({
      selectedGroupId: e.detail.value || e.detail
    })
  },

  // 输入处理理由
  onReasonInput(e) {
    this.setData({
      processReason: e.detail
    })
  },

  // 确认同意申请（选择分组后调用）
  async onConfirmApprove() {
    const { currentApplication, selectedGroupId } = this.data
    
    if (!selectedGroupId) {
      showToast('请选择用户分组')
      return
    }

    try {
      wx.showLoading({ title: '处理中...' })
      
      const response = await agentAPI.processAgentApplication(currentApplication.id, {
        status: 2, // 同意
        selected_group_id: selectedGroupId,
        reason: '申请通过'
      })
      
      if (response.code === 200) {
        showToast('申请已同意')
        this.onCloseProcessDialog()
        this.refreshData()
      } else {
        showToast(response.message || '处理失败')
      }
    } catch (error) {
      console.error('同意申请失败:', error)
      showToast('处理失败')
    } finally {
      wx.hideLoading()
    }
  },


  // 添加条件
  onAddCondition() {
    // 检查是否已有两种类型的条件
    const existingTypes = this.data.conditions.map(item => item.type)
    if (existingTypes.length >= 2) {
      showToast('已设置所有类型的条件')
      return
    }
    
    this.setData({ 
      showAddConditionDialog: true,
      addConditionForm: {
        type: '',
        amount: ''
      }
    })
  },

  // 关闭添加条件弹窗
  onCloseAddConditionDialog() {
    console.log('关闭添加条件弹窗')
    this.setData({ 
      showAddConditionDialog: false,
      addConditionForm: {
        type: '',
        amount: ''
      }
    })
  },

  // 选择条件类型
  onConditionTypeSelect(e) {
    console.log('选择条件类型:', e.detail, e)
    const type = e.detail
    
    if (!type) {
      console.log('未获取到选择的条件类型')
      return
    }
    
    console.log('当前条件列表:', this.data.conditions)
    // 检查是否已存在该类型的条件
    const existingTypes = this.data.conditions.map(item => item.type)
    console.log('已存在的条件类型:', existingTypes)
    
    if (existingTypes.includes(parseInt(type))) {
      showToast(type === '1' ? '个人消费条件已存在' : '团队消费条件已存在')
      // 重置选择
      setTimeout(() => {
        this.setData({
          'addConditionForm.type': ''
        })
      }, 100)
      return
    }
    
    console.log('设置条件类型:', type)
    const newForm = { ...this.data.addConditionForm }
    newForm.type = type
    this.setData({
      addConditionForm: newForm
    })
  },

  // 输入添加条件金额
  onAddConditionAmountInput(e) {
    console.log('输入金额:', e.detail)
    const value = e.detail.value || e.detail || ''
    const newForm = { ...this.data.addConditionForm }
    newForm.amount = String(value)
    this.setData({
      addConditionForm: newForm
    })
  },

  // 确认添加条件
  async onConfirmAddCondition() {
    const { addConditionForm } = this.data
    console.log('确认添加条件，当前表单数据:', addConditionForm)
    
    if (!addConditionForm.type) {
      console.log('条件类型为空')
      showToast('请选择条件类型')
      return
    }
    
    if (!addConditionForm.amount || parseFloat(addConditionForm.amount) <= 0) {
      console.log('金额无效:', addConditionForm.amount)
      showToast('请输入有效金额')
      return
    }
    
    try {
      wx.showLoading({ title: '添加中...' })
      
      const response = await agentAPI.createAgentCondition({
        type: parseInt(addConditionForm.type),
        amount: Math.round(parseFloat(addConditionForm.amount) * 100)
      })
      
      if (response.code === 200) {
        console.log('条件添加成功')
        showToast('条件添加成功')
        this.onCloseAddConditionDialog()
        this.loadConditions()
      } else {
        console.log('添加失败:', response)
        showToast(response.message || '添加失败')
      }
    } catch (error) {
      console.error('添加条件失败:', error)
      showToast('添加失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 编辑条件
  onEditCondition(e) {
    const { condition } = e.currentTarget.dataset
    this.setData({
      showEditConditionDialog: true,
      editConditionForm: {
        id: condition.id,
        type: condition.type,
        amount: (condition.amount / 100).toString()
      }
    })
  },

  // 关闭编辑条件弹窗
  onCloseEditConditionDialog() {
    this.setData({ 
      showEditConditionDialog: false,
      editConditionForm: {
        id: null,
        type: 1,
        amount: ''
      }
    })
  },

  // 输入编辑条件金额
  onEditConditionAmountInput(e) {
    console.log('编辑金额:', e.detail)
    const value = e.detail.value || e.detail || ''
    const newForm = { ...this.data.editConditionForm }
    newForm.amount = String(value)
    this.setData({
      editConditionForm: newForm
    })
  },

  // 确认编辑条件
  async onConfirmEditCondition() {
    const { editConditionForm } = this.data
    
    if (!editConditionForm.amount || parseFloat(editConditionForm.amount) <= 0) {
      showToast('请输入有效金额')
      return
    }
    
    try {
      wx.showLoading({ title: '更新中...' })
      
      const response = await agentAPI.updateAgentCondition(editConditionForm.id, {
        amount: Math.round(parseFloat(editConditionForm.amount) * 100)
      })
      
      if (response.code === 200) {
        showToast('条件更新成功')
        this.onCloseEditConditionDialog()
        this.loadConditions()
      } else {
        showToast(response.message || '更新失败')
      }
    } catch (error) {
      console.error('更新条件失败:', error)
      showToast('更新失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 删除条件
  async onDeleteCondition(e) {
    const { condition } = e.currentTarget.dataset
    
    const confirmed = await showModal('确认删除', `确定要删除${condition.type === 1 ? '个人消费' : '团队消费'}条件吗？`)
    if (!confirmed) return
    
    try {
      wx.showLoading({ title: '删除中...' })
      
      const response = await agentAPI.deleteAgentCondition(condition.id)
      
      if (response.code === 200) {
        showToast('条件删除成功')
        this.loadConditions()
      } else {
        showToast(response.message || '删除失败')
      }
    } catch (error) {
      console.error('删除条件失败:', error)
      showToast('删除失败')
    } finally {
      wx.hideLoading()
    }
  },

  // 格式化状态文字
  formatStatus(status) {
    const statusMap = {
      1: { text: '待审核', color: 'orange' },
      2: { text: '已同意', color: 'green' },
      3: { text: '已拒绝', color: 'red' }
    }
    return statusMap[status] || { text: '未知', color: 'gray' }
  },

  // 格式化金额
  formatAmount(amount) {
    return (amount / 100).toFixed(2)
  },

  // 格式化时间
  formatTime(time) {
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  },

})
