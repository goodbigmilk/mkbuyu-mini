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
    referralCode: '',
    
    // 卖家专用字段
    shopName: '',
    ownerName: '',
    
    // 状态控制
    registering: false,
    sendingSms: false,
    smsCountdown: 0,
    agreePolicy: false,
    canSendSms: false,
    
    // 定时器
    smsTimer: null
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
    // 如果有推荐码，自动填入
    if (options.referralCode) {
      this.setData({ referralCode: options.referralCode});
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
  },

  // 统一的输入框变化处理（模仿编辑页面）
  onFieldChange(e) {
    const { field } = e.currentTarget.dataset;
    const { detail } = e;
    
    console.log(`${field}输入变化:`, detail);
    
    this.setData({
      [field]: detail
    });
    
    // 如果是手机号变化，需要更新计算状态
    if (field === 'phone') {
      this.updateComputedState();
    }
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
    const { role, phone, smsCode, password, confirmPassword, referralCode, shopName, ownerName, agreePolicy } = this.data;
    
    console.log('开始注册 - 当前数据状态:', {
      role,
      phone,
      smsCode,
      password: password ? '已输入' : '未输入',
      confirmPassword: confirmPassword ? '已输入' : '未输入',
      referralCode,
      shopName,
      ownerName,
      agreePolicy
    });
    
    // 防止 undefined，给默认值
    const phoneValue = phone || '';
    const smsCodeValue = smsCode || '';
    const passwordValue = password || '';
    const confirmPasswordValue = confirmPassword || '';
    const referralCodeValue = referralCode || '';
    const shopNameValue = shopName || '';
    const ownerNameValue = ownerName || '';
    
    // 验证协议同意
    if (!agreePolicy) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
    
    // 验证手机号
    if (!validatePhone(phoneValue)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 验证验证码
    if (smsCodeValue.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none'
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
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }
    
    // 如果是卖家，验证卖家专用字段
    if (role === 'shop') {
      if (!shopNameValue.trim()) {
        wx.showToast({
          title: '请输入店铺名称',
          icon: 'none'
        });
        return;
      }
      
      if (!ownerNameValue.trim()) {
        wx.showToast({
          title: '请输入店主姓名',
          icon: 'none'
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
        registerResult = await authApi.registerShop(registerData);
      } else {
        // 买家注册
        const registerData = {
          phone: phoneValue,
          password: passwordValue,
          nickname: '', // 可以添加昵称字段
        };
        
        console.log('买家注册数据:', registerData);
        registerResult = await authApi.register(registerData);
      }
      
      console.log('注册结果:', registerResult);
      
      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });
      
      // 注册成功后的处理
      this.handleRegisterSuccess(registerResult, referralCodeValue);
      
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
  async handleRegisterSuccess(registerResult, referralCode) {
    // 如果是买家注册且有推荐码，尝试绑定推荐人
    if (this.data.role === 'user' && referralCode && referralCode.trim()) {
      try {
        console.log('尝试绑定推荐人，推荐码:', referralCode);
        
        // 先登录获取token（注册成功但未登录状态）
        const loginData = {
          phone: this.data.phone,
          password: this.data.password,
          role: 'user'
        };
        
        const loginResult = await authApi.login(loginData);
        
        if (loginResult.code === 200) {
          // 登录成功，保存token
          wx.setStorageSync('token', loginResult.data.token);
          wx.setStorageSync('userInfo', loginResult.data.user_info);
          
          // 绑定推荐人
          const bindResult = await authApi.bindReferrer(referralCode.trim());
          
          if (bindResult.code === 200) {
            console.log('推荐人绑定成功');
            wx.showModal({
              title: '注册成功',
              content: '推荐人绑定成功，欢迎加入买不语！',
              showCancel: false,
              confirmText: '好的'
            });
          } else {
            console.log('推荐人绑定失败:', bindResult.message);
            wx.showModal({
              title: '注册成功',
              content: '推荐码无效或已过期，注册已完成！',
              showCancel: false,
              confirmText: '知道了'
            });
          }
        } else {
          console.log('自动登录失败，跳过推荐人绑定');
          wx.showToast({
            title: '注册成功',
            icon: 'success',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('绑定推荐人失败:', error);
        wx.showModal({
          title: '注册成功',
          content: '推荐码处理异常，但注册已完成！',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    }

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
        // 买家注册成功，跳转到登录页或主页
        const hasToken = wx.getStorageSync('token');
        if (hasToken) {
          // 如果已经有token（推荐人绑定成功），跳转到主页
          wx.reLaunch({
            url: '/pages/user/home/home'
          });
        } else {
          // 否则跳转到登录页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      }
    }, referralCode && referralCode.trim() ? 3500 : 1500);
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