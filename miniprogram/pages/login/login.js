const { userApi } = require('../../utils/cloud')
const auth = require('../../utils/auth')

Page({
  data: {
    role: '',
    roleLabel: '',
    avatarUrl: '',
    nickName: '',
    loading: false
  },

  onLoad(options) {
    const role = options.role || auth.getRole() || 'client'
    const roleLabel = role === 'designer' ? '设计师' : '客户'
    this.setData({ role, roleLabel })

    if (auth.isLoggedIn()) {
      this._navigateAfterLogin()
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (avatarUrl) {
      this.setData({ avatarUrl })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  async onLogin() {
    const { role, nickName, avatarUrl } = this.data

    if (!nickName || !nickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      let finalAvatar = ''

      // 上传头像到云存储（临时文件才上传）
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
          // 上传失败继续登录，使用空头像
        }
      } else if (avatarUrl) {
        finalAvatar = avatarUrl
      }

      const loginRes = await userApi.login({
        role: role,
        nickname: nickName.trim(),
        avatar: finalAvatar
      })

      auth.saveUserInfo({
        ...loginRes,
        nickname: nickName.trim(),
        avatar: finalAvatar,
        role: role
      })

      wx.showToast({ title: '登录成功', icon: 'success' })

      setTimeout(() => {
        this._navigateAfterLogin()
      }, 1000)
    } catch (err) {
      console.error('登录失败:', err)
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  _navigateAfterLogin() {
    wx.switchTab({
      url: '/pages/projects/list/list'
    })
  }
})
