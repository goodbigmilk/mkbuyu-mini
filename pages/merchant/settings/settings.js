// pages/merchant/settings/settings.js
const { showToast, showModal } = require('../../../utils/index.js')
const { userState, shopState } = require('../../../utils/state.js')
const uploadAPI = require('../../../api/upload.js')
const shopAPI = require('../../../api/shop.js')
const authAPI = require('../../../api/auth.js')

Page({
  data: {
    userInfo: {},
    shopInfo: {},
    todayStats: {
      orderCount: 0,
      sales: 0,
      viewCount: 0
    },
    
    // merchant-tabbar当前选中状态
    tabbarCurrent: 3,
    
    menuGroups: [
      {
        title: '店铺管理',
        items: [
          { key: 'shop-info', icon: 'shop-o', title: '店铺信息', desc: '店铺基本信息设置' },
          { key: 'product-categories', icon: 'label-o', title: '商品分类', desc: '管理店铺商品分类' },
          { key: 'user-groups', icon: 'friends-o', title: '分组管理', desc: '管理用户分组' },
          { key: 'agent-management', icon: 'manager-o', title: '推广员管理', desc: '管理推广员申请和设置条件' },
          { key: 'shop-decoration', icon: 'brush-o', title: '店铺装修', desc: '自定义店铺页面' },
          { key: 'shop-notice', icon: 'volume-o', title: '店铺公告', desc: '发布店铺公告' }
        ]
      },
      {
        title: '数据分析',
        items: [
          { key: 'sales-analysis', icon: 'bar-chart-o', title: '销售分析', desc: '查看销售数据' },
          { key: 'customer-analysis', icon: 'user-circle-o', title: '客户分析', desc: '客户行为数据' },
          { key: 'product-analysis', icon: 'goods-collect-o', title: '商品分析', desc: '商品销售情况' }
        ]
      },
      {
        title: '营销工具',
        items: [
          { key: 'coupons', icon: 'coupon-o', title: '优惠券', desc: '创建和管理优惠券' },
          { key: 'activities', icon: 'gift-o', title: '营销活动', desc: '秒杀、拼团等活动' },
          { key: 'live-stream', icon: 'video-o', title: '直播带货', desc: '开启直播销售' }
        ]
      },
      {
        title: '客服工具',
        items: [
          { key: 'customer-service', icon: 'service-o', title: '客服中心', desc: '处理客户咨询' },
          { key: 'reviews', icon: 'comment-o', title: '评价管理', desc: '查看和回复评价' },
          { key: 'complaints', icon: 'warning-o', title: '投诉处理', desc: '处理客户投诉' }
        ]
      },
      {
        title: '财务管理',
        items: [
          { key: 'finance', icon: 'balance-o', title: '财务账户', desc: '查看账户余额' },
          { key: 'withdraw', icon: 'cash-o', title: '提现管理', desc: '申请资金提现' },
          { key: 'bills', icon: 'bill-o', title: '账单明细', desc: '查看收支明细' }
        ]
      },
      {
        title: '系统设置',
        items: [
          { key: 'account', icon: 'user-o', title: '账号设置', desc: '修改密码等' },
          { key: 'notification', icon: 'bell-o', title: '消息通知', desc: '通知设置' },
          { key: 'help', icon: 'question-o', title: '帮助中心', desc: '使用说明和常见问题' }
        ]
      }
    ]
  },

  onLoad() {
    this.loadUserInfo();
    this.loadShopInfo();
    this.loadTodayStats();
  },

  onShow() {
    // 设置merchant-tabbar的选中状态（设置页面对应索引3）
    this.setData({
      tabbarCurrent: 3
    });
    
    this.refreshData();
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 刷新数据
  async refreshData() {
    await Promise.all([
      this.loadUserInfo(),
      this.loadShopInfo(),
      this.loadTodayStats()
    ]);
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const userInfo = userState.getUserInfo();
      this.setData({ userInfo });
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  // 加载店铺信息
  async loadShopInfo() {
    try {
      const response = await shopAPI.getMyShopInfo();
      
      if (response.code === 200 && response.data) {
        const shopInfo = response.data;
        console.log('加载到的店铺信息:', shopInfo);

        const processedShopInfo = {
          ...shopInfo,
          avatar: shopInfo.logo
        };
        
        // 更新状态管理中的店铺信息
        shopState.setShopInfo(processedShopInfo);
        this.setData({ shopInfo: processedShopInfo });
      }
    } catch (error) {
      console.error('加载店铺信息失败:', error);
      // 如果获取失败，尝试从用户信息中获取
      try {
        const userInfo = userState.getUserInfo();
        if (userInfo && (userInfo.role === 'shop' || userInfo.role === 'merchant')) {
          this.setData({ 
            shopInfo: {
              name: userInfo.name || userInfo.username || '未设置店铺名称',
              avatar: userInfo.avatar,
              description: userInfo.description || '暂无店铺简介',
              owner_name: userInfo.owner_name || userInfo.username || '未设置'
            }
          });
        } else {
          // 设置默认信息
          this.setData({
            shopInfo: {
              name: '未设置店铺名称',
              avatar: '',
              description: '暂无店铺简介',
              owner_name: '未设置'
            }
          });
        }
      } catch (userError) {
        console.error('从用户信息获取店铺信息也失败:', userError);
        // 设置默认信息
        this.setData({
          shopInfo: {
            name: '未设置店铺名称',
            avatar: '',
            description: '暂无店铺简介',
            owner_name: '未设置'
          }
        });
      }
    }
  },

  // 加载今日统计
  async loadTodayStats() {
    try {
      const response = await shopAPI.getShopStatistics({ timeRange: '1d' });
      
      if (response.code === 200 && response.data) {
        const data = response.data;
        this.setData({ 
          todayStats: {
            orderCount: data.today_orders || 0,
            sales: data.today_revenue || 0,
            viewCount: data.today_visitors || 0
          }
        });
      }
    } catch (error) {
      console.error('加载今日统计失败:', error);
    }
  },

  // 菜单项点击
  onMenuTap(e) {
    const { key } = e.currentTarget.dataset;
    
    switch (key) {
      case 'shop-info':
        wx.navigateTo({
          url: '/pages/merchant/shop/info/info'
        });
        break;
      case 'product-categories':
        wx.navigateTo({
          url: '/pages/merchant/categories/categories'
        });
        break;
      case 'user-groups':
        wx.navigateTo({
          url: '/pages/merchant/user-groups/user-groups'
        });
        break;
      case 'agent-management':
        wx.navigateTo({
          url: '/pages/merchant/agent-management/agent-management'
        });
        break;
      case 'shop-decoration':
        wx.navigateTo({
          url: '/pages/merchant/shop/decoration/decoration'
        });
        break;
      case 'shop-notice':
        wx.navigateTo({
          url: '/pages/merchant/shop/notice/notice'
        });
        break;
      case 'sales-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/sales/sales'
        });
        break;
      case 'customer-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/customer/customer'
        });
        break;
      case 'product-analysis':
        wx.navigateTo({
          url: '/pages/merchant/analytics/product/product'
        });
        break;
      case 'coupons':
        wx.navigateTo({
          url: '/pages/merchant/marketing/coupons/coupons'
        });
        break;
      case 'activities':
        wx.navigateTo({
          url: '/pages/merchant/marketing/activities/activities'
        });
        break;
      case 'live-stream':
        wx.navigateTo({
          url: '/pages/merchant/marketing/live/live'
        });
        break;
      case 'customer-service':
        wx.navigateTo({
          url: '/pages/merchant/service/chat/chat'
        });
        break;
      case 'reviews':
        wx.navigateTo({
          url: '/pages/merchant/service/reviews/reviews'
        });
        break;
      case 'complaints':
        wx.navigateTo({
          url: '/pages/merchant/service/complaints/complaints'
        });
        break;
      case 'finance':
        wx.navigateTo({
          url: '/pages/merchant/finance/account/account'
        });
        break;
      case 'withdraw':
        wx.navigateTo({
          url: '/pages/merchant/finance/withdraw/withdraw'
        });
        break;
      case 'bills':
        wx.navigateTo({
          url: '/pages/merchant/finance/bills/bills'
        });
        break;
      case 'account':
        wx.navigateTo({
          url: '/pages/merchant/account/account'
        });
        break;
      case 'notification':
        wx.navigateTo({
          url: '/pages/merchant/notification/notification'
        });
        break;
      case 'help':
        wx.navigateTo({
          url: '/pages/merchant/help/help'
        });
        break;
      default:
        showToast('功能开发中');
    }
  },

  // 编辑店铺信息 - 显示编辑选项
  onEditShopInfo() {
    wx.showActionSheet({
      itemList: ['更换头像', '修改店铺名称', '修改店铺简介'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.chooseShopAvatar()
            break
          case 1:
            this.editShopName()
            break
          case 2:
            this.editShopDescription()
            break
        }
      }
    })
  },

  // 编辑店铺信息 (原有方法)
  onEditShop() {
    wx.navigateTo({
      url: '/pages/merchant/shop/info/info'
    });
  },

  // 选择店铺头像
  chooseShopAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadShopAvatar(tempFilePath)
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

  // 上传店铺头像
  async uploadShopAvatar(filePath) {
    try {
      wx.showLoading({ title: '上传中...' })
      
      // 调用上传图片的API，使用shop分类
      const response = await uploadAPI.uploadImage(filePath, { category: 'shop' })
      
      if (response && response.code === 200) {
        // 获取上传后的图片URL
        const avatarUrl = response.data.url
        
        // 更新店铺信息中的头像
        const updateResponse = await shopAPI.updateShopInfo({ logo: avatarUrl })
        
        if (updateResponse && updateResponse.code === 200) {
          // 更新页面显示
          const shopInfo = { ...this.data.shopInfo, avatar: avatarUrl, logo: avatarUrl }
          this.setData({ shopInfo })
          
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          })
        } else {
          throw new Error('更新店铺头像失败')
        }
      } else {
        throw new Error(response?.message || '上传失败')
      }
    } catch (error) {
      console.error('上传店铺头像失败:', error)
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 编辑店铺名称
  editShopName() {
    wx.showModal({
      title: '修改店铺名称',
      editable: true,
      placeholderText: '请输入新店铺名称',
      content: this.data.shopInfo.name || '',
      success: async (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim()
          if (newName) {
            await this.updateShopName(newName)
          }
        }
      }
    })
  },

  // 更新店铺名称
  async updateShopName(name) {
    try {
      wx.showLoading({ title: '更新中...' })
      
      // 调用更新店铺信息的API
      const response = await shopAPI.updateShopInfo({ name })
      
      if (response && response.code === 200) {
        // 更新店铺信息
        const shopInfo = { ...this.data.shopInfo, name }
        this.setData({ shopInfo })
        
        wx.showToast({
          title: '店铺名称更新成功',
          icon: 'none'
        })
      } else {
        throw new Error(response?.message || '更新失败')
      }
    } catch (error) {
      console.error('更新店铺名称失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 编辑店铺简介
  editShopDescription() {
    wx.showModal({
      title: '修改店铺简介',
      editable: true,
      placeholderText: '请输入店铺简介（建议50字以内）',
      content: this.data.shopInfo.description || '',
      success: async (res) => {
        if (res.confirm && res.content !== undefined) {
          const newDescription = res.content.trim()
          await this.updateShopDescription(newDescription)
        }
      }
    })
  },

  // 更新店铺简介
  async updateShopDescription(description) {
    try {
      wx.showLoading({ title: '更新中...' })
      
      // 调用更新店铺信息的API
      const response = await shopAPI.updateShopInfo({ description })
      
      if (response && response.code === 200) {
        // 更新店铺信息
        const shopInfo = { ...this.data.shopInfo, description }
        this.setData({ shopInfo })
        
        wx.showToast({
          title: '店铺简介更新成功',
          icon: 'none'
        })
      } else {
        throw new Error(response?.message || '更新失败')
      }
    } catch (error) {
      console.error('更新店铺简介失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 查看完整数据
  onViewFullStats() {
    wx.navigateTo({
      url: '/pages/merchant/analytics/overview/overview'
    });
  },

  // 切换用户端
  onSwitchToUser() {
    wx.reLaunch({
      url: '/pages/user/home/home'
    });
  },

  // 退出登录
  async onLogout() {
    const confirmed = await showModal('确认退出', '确定要退出登录吗？');
    if (!confirmed) return;
    
    try {
      await authAPI.logoutLogic();
      
      wx.reLaunch({
        url: '/pages/auth/login/login'
      });
    } catch (error) {
      console.error('退出登录失败:', error);
      showToast('退出失败');
    }
  },

  // 联系客服
  onContactService() {
    wx.navigateTo({
      url: '/pages/common/service/service'
    });
  },

  // 意见反馈
  onFeedback() {
    wx.navigateTo({
      url: '/pages/common/feedback/feedback'
    });
  },

  // 关于我们
  onAbout() {
    wx.navigateTo({
      url: '/pages/common/about/about'
    });
  }
});