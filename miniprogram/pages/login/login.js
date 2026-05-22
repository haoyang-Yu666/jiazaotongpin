const { userApi } = require('../../utils/cloud')
const auth = require('../../utils/auth')

Page({
  data: {
    role: '',
    roleLabel: '',
    avatarUrl: '',
    nickName: '',
    loading: false,
    showPrivacy: false
  },

  onLoad(options) {
    // 已登录用户直接跳走，登录页只给新用户用
    if (auth.isLoggedIn()) {
      wx.switchTab({ url: '/pages/projects/list/list' })
      return
    }

    const role = options.role || 'client'
    const roleLabel = role === 'designer' ? '设计师' : '客户'
    this.setData({ role, roleLabel })
  },

  onChooseAvatar(e) {
    if (this._choosingAvatar) return
    this._choosingAvatar = true
    const avatarUrl = e.detail.avatarUrl
    if (avatarUrl) {
      this.setData({ avatarUrl })
    }
    this._choosingAvatar = false
  },

  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  async onLogin() {
    const { nickName } = this.data

    if (!nickName || !nickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    if (this.data.loading) return

    // 检查是否需要隐私授权
    try {
      const res = await wx.getPrivacySetting()
      if (res.needAuthorization) {
        this.setData({ showPrivacy: true })
        return
      }
    } catch (e) {
      // API 不可用，直接继续
    }

    this.doLogin()
  },

  onPrivacyAgree() {
    this.setData({ showPrivacy: false })
    this.doLogin()
  },

  onPrivacyDisagree() {
    this.setData({ showPrivacy: false })
    wx.showToast({ title: '需要同意隐私协议才能使用', icon: 'none' })
  },

  async doLogin() {
    const { role, nickName, avatarUrl } = this.data
    this.setData({ loading: true })

    try {
      let finalAvatar = ''

      // 上传头像到云存储
      if (avatarUrl && (avatarUrl.indexOf('tmp') > -1 || avatarUrl.indexOf('wxfile') > -1)) {
        try {
          const ext = avatarUrl.split('.').pop() || 'png'
          const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: avatarUrl
          })
          finalAvatar = uploadRes.fileID
        } catch (uploadErr) {
          console.error('头像上传失败:', uploadErr)
        }
      } else if (avatarUrl) {
        finalAvatar = avatarUrl
      }

      const loginRes = await userApi.login({
        role: role,
        nickname: nickName.trim(),
        avatar: finalAvatar
      })

      // 保存登录态
      auth.saveUserInfo({
        ...loginRes,
        role: role
      })

      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/projects/list/list' })
      }, 1000)
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
