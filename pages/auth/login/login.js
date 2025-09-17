const authApi = require('../../../api/auth.js');
const { validatePhone } = require('../../../utils/index.js');
const { userState } = require('../../../utils/state.js');

Page({
  data: {
    // 身份类型：user(用户) | shop(商家)
    role: 'user',
    
    // 登录方式：phone(手机号) | password(密码)
    loginType: 'password',
    
    // 手机号登录
    phone: '',
    smsCode: '',
    
    // 密码登录
    username: '',
    password: '',
    
    // 状态控制
    logging: false,
    wechatLogging: false,
    sendingSms: false,
    smsCountdown: 0,
    agreePolicy: false,
    canSendSms: false,
    
    // 定时器
    smsTimer: null,
    
    // ========== 临时自动登录开关 - 测试用，后续删除 ==========
    // TODO: 删除这个开关 - 设置为 false 可以关闭自动登录
    enableAutoLogin: true,
    // ========================================================
  },

  // 数据监听器
  observers: {
    'phone, agreePolicy': function() {
      console.log('数据监听器触发 - phone:', this.data.phone, 'agreePolicy:', this.data.agreePolicy);
      this.updateComputedState();
    }
  },

  onLoad(options) {
    this.initPage(options);
    this.checkLoginStatus();
    // 初始化计算状态
    this.updateComputedState();
    
    // ========== 临时自动登录功能 - 测试用，后续删除 ==========
    // TODO: 删除这个自动登录功能
    this.autoLoginForTesting();
    // ========================================================
  },
  
  // ========== 临时自动登录方法 - 测试用，后续删除 ==========
  // TODO: 删除这个方法
  async autoLoginForTesting() {
    // 检查自动登录开关
    if (!this.data.enableAutoLogin) {
      console.log('🚫 自动登录已关闭');
      return;
    }
    
    console.log('🚀 开始自动登录测试...');
    
    // 设置为商家密码登录模式
    this.setData({
      role: 'user',              // 商家身份
      loginType: 'password',     // 密码登录
      username: '15629981111',   // 商家手机号
      password: 'a123456',       // 商家密码
      agreePolicy: true          // 同意协议
    });
    
    // 更新计算状态
    this.updateComputedState();
    
    // 延迟2秒自动执行登录，给用户看到填入的信息
    setTimeout(() => {
      console.log('🚀 自动执行登录...');
      this.onLogin();
    }, 2000);
  },
  // ========================================================

  onUnload() {
    // 清理定时器
    if (this.data.smsTimer) {
      clearInterval(this.data.smsTimer);
    }
  },

  // 更新计算状态
  updateComputedState() {
    const { phone, agreePolicy } = this.data;
    
    // 防止 undefined，给默认值
    const phoneValue = phone || '';
    
    // 计算是否可以发送短信
    const canSendSms = validatePhone(phoneValue) && agreePolicy;
    
    this.setData({
      canSendSms
    });
  },

  // 输入框数据变化处理
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
    this.updateComputedState();
  },

  onSmsCodeInput(e) {
    this.setData({ smsCode: e.detail.value });
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 输入框数据变化处理（兼容性方法）
  onPhoneChange(e) {
    this.onPhoneInput(e);
  },

  onSmsCodeChange(e) {
    this.onSmsCodeInput(e);
  },

  onUsernameChange(e) {
    this.onUsernameInput(e);
  },

  onPasswordChange(e) {
    this.onPasswordInput(e);
  },

  // 初始化页面
  initPage(options) {
    // 从选项中获取默认登录方式
    if (options.type) {
      this.setData({ loginType: options.type });
    }
    
    // 从选项中获取用户角色
    if (options.role) {
      this.setData({ role: options.role });
    }
    
    // 默认同意协议（测试阶段方便调试）
    this.setData({ agreePolicy: true });
  },

  // 检查登录状态
  checkLoginStatus() {
    try {
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (token && userInfo) {
        // 用户已登录，根据角色类型跳转
        setTimeout(() => {
          if (userInfo.role === 'shop') {
            // 卖家用户，跳转到商家端首页
            wx.reLaunch({
              url: '/pages/merchant/dashboard/dashboard'
            });
          } else if (userInfo.role === 'admin') {
            // 管理员用户，跳转到管理端首页
            wx.reLaunch({
              url: '/pages/merchant/dashboard/dashboard' // 临时使用商家页面
            });
          } else {
            // 买家用户，跳转到用户端首页
            wx.switchTab({
              url: '/pages/user/home/home'
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error('检查登录状态失败', error);
    }
  },

  // 切换身份类型
  switchRole(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 
      role: type,
      // 确保清空表单数据时使用空字符串而不是undefined
      phone: '',
      smsCode: '',
      username: '',
      password: ''
    });
  },

  // 切换登录方式
  switchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    console.log('切换登录类型 - 原类型:', this.data.loginType, '新类型:', type);
    
    this.setData({ 
      loginType: type,
      // 确保清空表单数据时使用空字符串而不是undefined
      phone: '',
      smsCode: '',
      username: '',
      password: ''
    });
    
    console.log('登录类型切换完成，当前loginType:', this.data.loginType);
  },

  // 发送短信验证码
  async onSendSms() {
    const { phone, agreePolicy } = this.data;
    
    const phoneValue = phone || '';  // 防止 undefined
    
    // 验证手机号
    if (!validatePhone(phoneValue)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 验证协议同意
    if (!agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ sendingSms: true });
      
      await authApi.sendSmsCode(phoneValue, 'login');
      
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      });
      
      // 开始倒计时
      this.startSmsCountdown();
      
    } catch (error) {
      console.error('发送验证码失败:', error);
      wx.showToast({
        title: error.message || '发送失败',
        icon: 'error'
      });
    } finally {
      this.setData({ sendingSms: false });
    }
  },

  // 开始短信倒计时
  startSmsCountdown() {
    let countdown = 60;
    this.setData({ smsCountdown: countdown });
    
    const timer = setInterval(() => {
      countdown--;
      this.setData({ smsCountdown: countdown });
      
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({ smsTimer: null });
      }
    }, 1000);
    
    this.setData({ smsTimer: timer });
  },

  // 登录
  async onLogin() {
    const { role, loginType, phone, smsCode, username, password, agreePolicy } = this.data;
    
    console.log('开始登录，参数:', { role, loginType, phone, smsCode, username, password, agreePolicy });
    
    // 验证协议同意
    if (!agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ logging: true });
    
    try {
      let loginData;
      let loginResult;
      
      // 直接使用角色，无需转换
      const role = this.data.role;
      console.log('使用的角色:', role);
      
      if (loginType === 'phone') {
        // 手机号验证码登录
        const phoneValue = phone || '';  // 防止 undefined
        const smsCodeValue = smsCode || '';  // 防止 undefined
        
        if (!validatePhone(phoneValue)) {
          throw new Error('请输入正确的手机号');
        }
        if (smsCodeValue.length !== 6) {
          throw new Error('请输入6位验证码');
        }
        
        loginData = { 
          phone: phoneValue, 
          smsCode: smsCodeValue, 
          role 
        };
        console.log('短信登录数据:', loginData);
        loginResult = await authApi.loginWithSmsLogic(loginData);
        
      } else {
        // 用户名密码登录（实际是手机号密码登录）
        const usernameValue = username || '';  // 防止 undefined
        if (!validatePhone(usernameValue.trim())) {
          throw new Error('手机号错误');
        }
        if (!password || password.length < 6) {
          throw new Error('密码至少6位');
        }
        
        loginData = { 
          phone: usernameValue.trim(), 
          password, 
          role 
        };
        console.log('密码登录数据:', loginData);
        loginResult = await authApi.loginWithLogic(loginData);
      }
      
      console.log('登录结果:', loginResult);
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      // 登录成功后的跳转
      this.handleLoginSuccess(loginResult);

    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'error'
      });
    } finally {
      this.setData({ logging: false });
    }
  },

  // 微信登录
  async onWechatLogin() {
    if (!this.data.agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ wechatLogging: true });
    
    try {
      const loginResult = await authApi.wxLoginLogic();
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      this.handleLoginSuccess(loginResult);
      
    } catch (error) {
      console.error('微信登录失败:', error);
      wx.showToast({
        title: error.message || '微信登录失败',
        icon: 'error'
      });
    } finally {
      this.setData({ wechatLogging: false });
    }
  },

  // 登录成功处理
  handleLoginSuccess(loginResult) {
    // 延迟跳转，让用户看到成功提示
    setTimeout(() => {
      // 根据角色类型跳转
      if (loginResult && loginResult.role) {
        const role = loginResult.role;
        if (role === 'shop') {
          // 卖家登录，跳转到商家端首页
          wx.reLaunch({
            url: '/pages/merchant/dashboard/dashboard'
          });
        } else if (role === 'admin') {
          // 管理员登录，跳转到管理端首页（如果有的话）
          wx.reLaunch({
            url: '/pages/merchant/dashboard/dashboard' // 临时使用商家页面
          });
        } else {
          // 买家登录，跳转到用户端首页
          wx.switchTab({
            url: '/pages/user/home/home'
          });
        }
      } else {
        // 如果没有角色数据，根据选择的登录类型跳转
        if (this.data.role === 'shop') {
          wx.reLaunch({
            url: '/pages/merchant/dashboard/dashboard'
          });
        } else {
          wx.switchTab({
            url: '/pages/user/home/home'
          });
        }
      }
    }, 1500);
  },

  // 协议同意状态变化
  onAgreePolicyChange(e) {
    this.setData({ agreePolicy: e.detail });
    this.updateComputedState();
  },

  // 查看协议
  onViewPolicy(e) {
    const type = e.currentTarget.dataset.type;
    const url = type === 'user' 
      ? '/pages/policy/user-agreement/user-agreement'
      : '/pages/policy/privacy-policy/privacy-policy';
      
    wx.navigateTo({ url });
  },

  // 忘记密码
  onForgetPassword() {
    wx.navigateTo({
      url: '/pages/auth/forgot-password/forgot-password'
    });
  },

  // 注册
  onRegister() {
    wx.navigateTo({
      url: '/pages/auth/register/register'
    });
  },

  // 联系客服
  onContactService() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
}); 