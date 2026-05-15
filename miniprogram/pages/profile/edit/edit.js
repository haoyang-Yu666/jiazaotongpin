const { userApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    avatar: '',
    nickname: '',
    phone: '',
    company: '',
    submitting: false
  },

  onLoad() {
    const userInfo = auth.getUserInfo()
    if (userInfo) {
      this.setData({
        avatar: userInfo.avatar || '',
        nickname: userInfo.nickname || '',
        phone: userInfo.phone || '',
        company: userInfo.company || ''
      })
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      this.setData({ avatar: avatarUrl })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onCompanyInput(e) {
    this.setData({ company: e.detail.value })
  },

  async onSubmit() {
    const { nickname, phone, company, avatar } = this.data

    if (!nickname || !nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    if (this.data.submitting) return
    this.setData({ submitting: true })

    try {
      let finalAvatar = avatar

      // 上传新头像到云存储
      if (avatar && (avatar.startsWith('http://tmp/') || avatar.startsWith('wxfile://'))) {
        const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: avatar
        })
        finalAvatar = uploadRes.fileID
      }

      await userApi.updateProfile({
        nickname: nickname.trim(),
        avatar: finalAvatar,
        phone: phone.trim(),
        company: company.trim()
      })

      // 更新本地缓存
      const localInfo = auth.getUserInfo() || {}
      auth.saveUserInfo({
        ...localInfo,
        nickname: nickname.trim(),
        avatar: finalAvatar,
        phone: phone.trim(),
        company: company.trim()
      })

      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) {
      console.error('保存失败:', err)
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
