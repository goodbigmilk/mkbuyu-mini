const userStore = require('../../../store/user.js');
const authApi = require('../../../api/auth.js');
const { validatePhone, validatePassword } = require('../../../utils/index.js');

Page({
  data: {
    // 身份类型：user(用户) | shop(商家)
    role: 'user',
    
    // 表单数据
    phone: '',
    smsCode: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
    
    // 卖家专用字段
    shopName: '',
    ownerName: '',
    
    // 状态控制
    registering: false,
    sendingSms: false,
    smsCountdown: 0,
    agreePolicy: false,
    canSendSms: false,
    canRegister: false,
    
    // 定时器
    smsTimer: null
  },

  // 更新计算状态
  updateComputedState() {
    const { role, phone, smsCode, password, confirmPassword, agreePolicy, shopName, ownerName } = this.data;
    
    // 防止 undefined，给默认值
    const phoneValue = phone || '';
    const passwordValue = password || '';
    const confirmPasswordValue = confirmPassword || '';
    const shopNameValue = shopName || '';
    const ownerNameValue = ownerName || '';
    
    // 计算是否可以发送短信
    const canSendSms = validatePhone(phoneValue) && agreePolicy;
    
    // 计算是否可以注册
    let canRegister = false;
    if (agreePolicy && validatePhone(phoneValue) && passwordValue.length >= 6 && passwordValue === confirmPasswordValue) {
      if (role === 'shop') {
        // 卖家注册需要额外验证店铺信息
        canRegister = shopNameValue.trim().length > 0 && ownerNameValue.trim().length > 0;
      } else {
        // 买家注册
        canRegister = true;
      }
    }
    
    this.setData({
      canSendSms,
      canRegister
    });
  },

  onLoad(options) {
    this.initPage(options);
    // 初始化计算状态
    this.updateComputedState();
  },

  onUnload() {
    // 清理定时器
    if (this.data.smsTimer) {
      clearInterval(this.data.smsTimer);
    }
  },

  // 初始化页面
  initPage(options) {
    // 如果有邀请码，自动填入
    if (options.inviteCode) {
      this.setData({ inviteCode: options.inviteCode });
    }
    
    // 从参数中获取用户角色
    if (options.type) {
      this.setData({ role: options.type });
    }
    
    // 默认同意协议（测试阶段方便调试）
    this.setData({ agreePolicy: true });
    
    this.updateComputedState(); // 初始化时也更新计算状态
  },

  // 切换身份类型
  switchRole(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 
      role: type,
      // 清空卖家专用字段
      shopName: '',
      ownerName: ''
    });
    this.updateComputedState(); // 切换身份类型时也更新计算状态
  },

  // 输入框变化处理
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
    this.updateComputedState(); // 手机号变化时更新计算状态
  },

  onSmsCodeInput(e) {
    this.setData({ smsCode: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
    this.updateComputedState(); // 密码变化时更新计算状态
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
    this.updateComputedState(); // 确认密码变化时更新计算状态
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value });
  },

  onShopNameInput(e) {
    this.setData({ shopName: e.detail.value });
    this.updateComputedState(); // 店铺名称变化时更新计算状态
  },

  onOwnerNameInput(e) {
    this.setData({ ownerName: e.detail.value });
    this.updateComputedState(); // 店主姓名变化时更新计算状态
  },

  // 发送短信验证码
  async onSendSms() {
    const { phone, agreePolicy } = this.data;
    
    const phoneValue = phone || '';  // 防止 undefined
    
    // 验证手机号
    if (!validatePhone(phoneValue)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'error'
      });
      return;
    }
    
    // 验证协议同意
    if (!agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'error'
      });
      return;
    }
    
    try {
      this.setData({ sendingSms: true });
      
      await authApi.sendSmsCode(phoneValue, 'register');
      
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

  // 注册
  async onRegister() {
    const { role, phone, smsCode, password, confirmPassword, inviteCode, shopName, ownerName, agreePolicy } = this.data;
    
    // 防止 undefined，给默认值
    const phoneValue = phone || '';
    const smsCodeValue = smsCode || '';
    const passwordValue = password || '';
    const confirmPasswordValue = confirmPassword || '';
    const shopNameValue = shopName || '';
    const ownerNameValue = ownerName || '';
    
    // 验证协议同意
    if (!agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'error'
      });
      return;
    }
    
    // 验证手机号
    if (!validatePhone(phoneValue)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'error'
      });
      return;
    }
    
    // 验证验证码
    if (smsCodeValue.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'error'
      });
      return;
    }
    
    // 验证密码
    if (passwordValue.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'error'
      });
      return;
    }
    
    // 验证确认密码
    if (passwordValue !== confirmPasswordValue) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'error'
      });
      return;
    }
    
    // 如果是卖家，验证卖家专用字段
    if (role === 'shop') {
      if (!shopNameValue.trim()) {
        wx.showToast({
          title: '请输入店铺名称',
          icon: 'error'
        });
        return;
      }
      
      if (!ownerNameValue.trim()) {
        wx.showToast({
          title: '请输入店主姓名',
          icon: 'error'
        });
        return;
      }
    }
    
    this.setData({ registering: true });
    
    try {
      let registerResult;
      
      console.log('开始注册，用户类型:', role);
      
      if (role === 'shop') {
        // 卖家注册
        const registerData = {
          phone: phoneValue,
          password: passwordValue,
          shop_name: shopNameValue.trim(),
          owner_name: ownerNameValue.trim()
        };
        
        console.log('卖家注册数据:', registerData);
        registerResult = await userStore.registerShop(registerData);
      } else {
        // 买家注册
        const registerData = {
          phone: phoneValue,
          password: passwordValue,
          nickname: '', // 可以添加昵称字段
        };
        
        console.log('买家注册数据:', registerData);
        registerResult = await userStore.register(registerData);
      }
      
      console.log('注册结果:', registerResult);
      
      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });
      
      // 注册成功后的处理
      this.handleRegisterSuccess(registerResult);
      
    } catch (error) {
      console.error('注册失败:', error);
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'error'
      });
    } finally {
      this.setData({ registering: false });
    }
  },

  // 注册成功处理
  handleRegisterSuccess(registerResult) {
    // 延迟跳转，让用户看到成功提示
    setTimeout(() => {
      if (this.data.role === 'shop') {
        // 卖家注册成功，提示审核信息并跳转到登录页
        wx.showModal({
          title: '注册成功',
          content: '您的店铺正在审核中，审核通过后即可登录使用',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        // 买家注册成功，直接跳转到登录页
        wx.showToast({
          title: '注册成功，请登录',
          icon: 'success',
          duration: 2000
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    }, 1500);
  },

  // 协议同意状态变化
  onAgreePolicyChange(e) {
    this.setData({ agreePolicy: e.detail });
    this.updateComputedState(); // 协议同意状态变化时更新计算状态
  },

  // 查看协议
  onViewPolicy(e) {
    const type = e.currentTarget.dataset.type;
    const url = type === 'user' 
      ? '/pages/policy/user-agreement/user-agreement'
      : '/pages/policy/privacy-policy/privacy-policy';
      
    wx.navigateTo({ url });
  },

  // 跳转到登录页面
  onLogin() {
    wx.navigateBack();
  }
}); 