const authAPI = require('../../../api/auth.js')
const userAPI = require('../../../api/user.js')
const groupPricingAPI = require('../../../api/group-pricing.js')
const agentAPI = require('../../../api/agent.js')
const referralAPI = require('../../../api/referral.js')
const { userState } = require('../../../utils/state.js')

Page({
  data: {
    userInfo: {},
    hasGroupPricing: false, // 用户是否有分组定价权限
    isInUserGroup: false, // 用户是否在任何用户分组中
    hasDualRole: false, // 用户是否同时具有商家和用户双重角色
    // 推荐码相关
    showReferralModal: false, // 是否显示推荐码模态框
    showInputDialog: false, // 是否显示输入推荐码对话框
    inputDialogTitle: '', // 输入对话框标题
    inputReferralCode: '', // 输入的推荐码
    referralInfo: {}, // 推荐信息

    menuGroups: [
      {
        title: '我的服务',
        items: [
          { key: 'referral', label: '推荐码', icon: 'share-o' },
          { key: 'distribution', label: '分销管理', icon: 'friends-o', show: false },
          { key: 'apply-agent', label: '申请成为推广员', icon: 'add-o', show: false },
          { key: 'group-pricing', label: '用户特权', icon: 'vip-card-o', show: false },

          { key: 'wallet', label: '我的钱包', icon: 'balance-o' }
        ]
      },
      {
        title: '购物助手',
        items: [

          { key: 'follow', label: '关注店铺', icon: 'shop-o' },
          { key: 'feedback', label: '意见反馈', icon: 'comment-o' }
        ]
      },
      {
        title: '客户服务',
        items: [
          { key: 'service', label: '联系客服', icon: 'service-o' },
          { key: 'help', label: '帮助中心', icon: 'question-o' },
          { key: 'about', label: '关于我们', icon: 'info-o' },
          { key: 'logout', label: '退出登录', icon: 'sign-out' }
        ]
      }
    ],
    isLogin: false
  },

  onLoad() {
    this.checkLoginStatus()
    this.loadUserInfo()
    this.checkGroupPricingAccess()
    this.checkUserGroupStatus()
    this.checkDualRole()
  },

  onShow() {
    // 每次显示时刷新数据
    this.checkLoginStatus()
    this.loadUserInfo()
    this.checkGroupPricingAccess()
    this.checkUserGroupStatus()
    this.checkDualRole()
    
    // 更新自定义 tabbar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 3
      })
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.checkGroupPricingAccess(),
      this.checkUserGroupStatus(),
      this.checkDualRole()
    ]).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLogin = userState.isLoggedIn()
    this.setData({ isLogin })
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      if (!this.data.isLogin) {
        this.setData({ 
          userInfo: {
            nickname: '未登录',
            avatar: ''
          }
        })
        return
      }

      const response = await authAPI.getUserInfo()
      
      if (response.code === 200) {
        const userInfo = response.data
        this.setData({ userInfo })
      } else if (response.code === 401) {
        // token失效，清除登录状态
        this.handleLogout()
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      // 显示加载失败提示
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      })
    }
  },



  // 检查用户是否有分组定价权限
  async checkGroupPricingAccess() {
    try {
      if (!this.data.isLogin) {
        this.setData({ hasGroupPricing: false })
        this.updateMenuGroupVisibility()
        return
      }

      const response = await groupPricingAPI.getUserGroupPricingSummary()
      
      if (response.code === 200) {
        const hasAccess = response.data && response.data.group_count > 0
        this.setData({ hasGroupPricing: hasAccess })
        this.updateMenuGroupVisibility()
      } else {
        this.setData({ hasGroupPricing: false })
        this.updateMenuGroupVisibility()
      }
    } catch (error) {
      console.error('检查分组定价权限失败:', error)
      this.setData({ hasGroupPricing: false })
      this.updateMenuGroupVisibility()
    }
  },

  // 检查用户是否在任何用户分组中
  async checkUserGroupStatus() {
    try {
      if (!this.data.isLogin) {
        this.setData({ isInUserGroup: false })
        this.updateMenuGroupVisibility()
        return
      }

      const response = await agentAPI.checkUserInGroup()
      
      if (response.code === 200) {
        const isInGroup = response.data && response.data.is_in_group
        this.setData({ isInUserGroup: isInGroup })
        this.updateMenuGroupVisibility()
      } else {
        this.setData({ isInUserGroup: false })
        this.updateMenuGroupVisibility()
      }
    } catch (error) {
      console.error('检查用户分组状态失败:', error)
      this.setData({ isInUserGroup: false })
      this.updateMenuGroupVisibility()
    }
  },


  // 更新菜单项显示状态
  updateMenuGroupVisibility() {
    const menuGroups = this.data.menuGroups.map(group => ({
      ...group,
      items: group.items.map(item => {
        if (item.key === 'group-pricing') {
          return { ...item, show: this.data.hasGroupPricing }
        } else if (item.key === 'distribution') {
          // 用户在分组中才显示分销管理
          return { ...item, show: this.data.isInUserGroup }
        } else if (item.key === 'apply-agent') {
          // 用户不在分组中才显示申请成为推广员
          return { ...item, show: !this.data.isInUserGroup }
        }
        return item
      })
    }))
    
    this.setData({ menuGroups })
  },

  // 头像点击 - 显示编辑选项
  onAvatarTap() {
    if (!this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
      return
    }

    wx.showActionSheet({
      itemList: ['更换头像', '修改昵称'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.chooseAvatar()
            break
          case 1:
            this.editNickname()
            break
        }
      }
    })
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadAvatar(tempFilePath)
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 上传头像
  async uploadAvatar(filePath) {
    try {
      wx.showLoading({ title: '上传中...' })
      
      // 调用上传头像的API
      const response = await userAPI.uploadAvatar(filePath)
      
      if (response.code === 200) {
        // 更新用户信息
        const userInfo = { ...this.data.userInfo, avatar: response.data.url || response.data.avatar }
        this.setData({ userInfo })
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      } else {
        throw new Error(response.message || '上传失败')
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 编辑昵称
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: this.data.userInfo.nickname || '',
      success: async (res) => {
        if (res.confirm && res.content) {
          const newNickname = res.content.trim()
          if (newNickname) {
            await this.updateNickname(newNickname)
          }
        }
      }
    })
  },

  // 更新昵称
  async updateNickname(nickname) {
    try {
      wx.showLoading({ title: '更新中...' })
      
      // 调用更新用户资料的API
      const response = await userAPI.updateUserProfile({ nickname })
      
      if (response.code === 200) {
        // 更新用户信息
        const userInfo = { ...this.data.userInfo, nickname }
        this.setData({ userInfo })
        
        wx.showToast({
          title: '昵称更新成功',
          icon: 'success'
        })
      } else {
        throw new Error(response.message || '更新失败')
      }
    } catch (error) {
      console.error('更新昵称失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },







  // 菜单项点击
  onMenuTap(e) {
    const { key } = e.currentTarget.dataset
    
    // 部分功能需要登录
    const needLogin = ['distribution', 'apply-agent', 'wallet', 'follow']
    if (needLogin.includes(key) && !this.data.isLogin) {
      wx.navigateTo({
        url: '/pages/auth/login/login'
      })
      return
    }
    
    switch (key) {
      case 'referral':
        this.showReferralModal()
        break
      case 'distribution':
        wx.navigateTo({
          url: '/pages/user/distribution/distribution'
        })
        break
      case 'apply-agent':
        wx.navigateTo({
          url: '/pages/user/apply-agent/apply-agent'
        })
        break
      case 'group-pricing':
        wx.navigateTo({
          url: '/pages/user/group-pricing/index'
        })
        break

      case 'wallet':
        wx.navigateTo({
          url: '/pages/user/wallet/wallet'
        })
        break

      case 'follow':
        wx.navigateTo({
          url: '/pages/user/follow/follow'
        })
        break
      case 'feedback':
        wx.navigateTo({
          url: '/pages/user/feedback/feedback'
        })
        break
      case 'service':
        // 联系客服
        this.contactService()
        break
      case 'help':
        wx.navigateTo({
          url: '/pages/user/help/help'
        })
        break
      case 'about':
        wx.navigateTo({
          url: '/pages/user/about/about'
        })
        break
      case 'logout':
        this.showLogoutConfirm()
        break
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
    }
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      fail: () => {
        wx.showModal({
          title: '客服电话',
          content: '400-123-4567',
          showCancel: false
        })
      }
    })
  },

  // 显示退出登录确认
  showLogoutConfirm() {
    if (!this.data.isLogin) {
      return
    }

    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.handleLogout()
        }
      }
    })
  },

  // 处理退出登录
  async handleLogout() {
    try {
      // 使用统一的登出逻辑
      await authAPI.logoutLogic()
      
      // 更新页面状态
      this.setData({
        isLogin: false,
        userInfo: {
          nickname: '未登录',
          avatar: ''
        }
      })
      
      // 延迟跳转到登录页面
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/auth/login/login'
        })
      }, 1500)
    } catch (error) {
      console.error('退出登录失败:', error)
      wx.showToast({
        title: '退出登录失败',
        icon: 'none'
      })
    }
  },

  // 设置
  onSettings() {
    wx.navigateTo({
      url: '/pages/user/settings/settings'
    })
  },

  // ==================== 推荐码相关方法 ====================

  // 显示推荐码模态框
  async showReferralModal() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // 获取推荐信息
      const response = await referralAPI.getReferralInfo()
      
      if (response.code === 200) {
        this.setData({
          referralInfo: response.data || {},
          showReferralModal: true
        })
      } else {
        wx.showToast({
          title: response.message || '获取推荐信息失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('获取推荐信息失败:', error)
      wx.showToast({
        title: '获取推荐信息失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 关闭推荐码模态框
  closeReferralModal() {
    this.setData({
      showReferralModal: false
    })
  },

  // 复制我的推荐码
  copyReferralCode() {
    const referralCode = this.data.referralInfo.referral_code
    if (!referralCode) {
      wx.showToast({
        title: '推荐码获取中，请稍候',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: referralCode,
      success: () => {
        wx.showToast({
          title: '推荐码已复制',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 复制推荐人的推荐码
  copyReferrerCode() {
    const referrerCode = this.data.referralInfo.referrer_info?.referral_code
    if (!referrerCode) {
      wx.showToast({
        title: '推荐人推荐码不存在',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: referrerCode,
      success: () => {
        wx.showToast({
          title: '推荐人推荐码已复制',
          icon: 'none'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 显示绑定推荐人模态框
  showBindReferrerModal() {
    console.log('显示绑定推荐人对话框')
    this.setData({
      showInputDialog: true,
      inputDialogTitle: '绑定推荐人',
      inputReferralCode: ''
    })
  },

  // 显示修改推荐人模态框
  showUpdateReferrerModal() {
    console.log('显示修改推荐人对话框')
    this.setData({
      showInputDialog: true,
      inputDialogTitle: '修改推荐人',
      inputReferralCode: ''
    })
  },

  // 推荐码输入变化
  onReferralCodeInput(e) {
    const value = e.detail.value || e.detail || ''
    console.log('推荐码输入事件:', {
      原始事件: e,
      detail: e.detail,
      值: value
    })
    
    this.setData({
      inputReferralCode: value
    })
  },

  // 确认推荐码
  async confirmReferralCode() {
    // 安全地获取输入的推荐码
    const inputCode = this.data.inputReferralCode || ''
    const referralCode = inputCode.trim()
    
    console.log('确认推荐码 - 输入值检查:', {
      原始输入: this.data.inputReferralCode,
      处理后: referralCode
    })
    
    if (!referralCode) {
      wx.showToast({
        title: '请输入推荐码',
        icon: 'none'
      })
      return
    }

    const isUpdate = this.data.inputDialogTitle === '修改推荐人'

    try {
      wx.showLoading({ title: isUpdate ? '修改中...' : '绑定中...' })

      const response = isUpdate 
        ? await referralAPI.updateReferrer(referralCode)
        : await referralAPI.bindReferrer(referralCode)

      if (response.code === 200) {
        wx.showToast({
          title: isUpdate ? '推荐人修改成功' : '推荐人绑定成功',
          icon: 'none'
        })

        // 关闭输入对话框
        this.setData({
          showInputDialog: false,
          inputReferralCode: ''
        })

        // 重新获取推荐信息
        await this.refreshReferralInfo()
      } else {
        wx.showToast({
          title: response.message || (isUpdate ? '修改失败' : '绑定失败'),
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('推荐人操作失败:', error)
      wx.showToast({
        title: error.message || (isUpdate ? '修改失败' : '绑定失败'),
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 取消推荐码输入
  cancelReferralInput() {
    this.setData({
      showInputDialog: false,
      inputReferralCode: ''
    })
  },

  // 刷新推荐信息
  async refreshReferralInfo() {
    try {
      const response = await referralAPI.getReferralInfo()
      if (response.code === 200) {
        this.setData({
          referralInfo: response.data || {}
        })
      }
    } catch (error) {
      console.error('刷新推荐信息失败:', error)
    }
  },

  // ==================== 双重角色管理相关方法 ====================

  // 检查用户是否同时具有商家和用户双重角色
  async checkDualRole() {
    try {
      if (!this.data.isLogin) {
        this.setData({ hasDualRole: false })
        return
      }

      // 直接从本地存储获取 roles 数组
      const roles = wx.getStorageSync('roles') || []
      console.log('👤 用户端角色数据:', roles)
      
      // 检查是否同时有 user 和 shop 角色
      const hasUserRole = roles.includes('user')
      const hasShopRole = roles.includes('shop')
      const hasDualRole = hasUserRole && hasShopRole
      
      this.setData({ hasDualRole })
      
      console.log('👤 用户端双重角色检查结果:', {
        roles: roles,
        hasUserRole: hasUserRole,
        hasShopRole: hasShopRole,
        hasDualRole: hasDualRole
      })
      
    } catch (error) {
      console.error('检查双重角色失败:', error)
      this.setData({ hasDualRole: false })
    }
  },

  // 切换到商家端
  onSwitchToMerchant() {
    // 直接从本地存储检查角色
    const roles = wx.getStorageSync('roles') || []
    const hasShopRole = roles.includes('shop')
    
    console.log('🔄 切换到商家端检查:', {
      roles: roles,
      hasShopRole: hasShopRole
    })
    
    if (hasShopRole) {
      // 使用统一的状态管理切换到商家端上下文
      const success = userState.switchContext('shop')
      if (success) {
        wx.reLaunch({
          url: '/pages/merchant/dashboard/dashboard'
        })
      } else {
        wx.showToast({
          title: '切换失败',
          icon: 'none'
        })
      }
    } else {
      wx.showToast({
        title: '您没有商家权限',
        icon: 'none'
      })
    }
  }
}) 