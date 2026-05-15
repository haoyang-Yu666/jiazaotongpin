const { userApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
    roleLabel: '',
    isDesigner: false
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    try {
      const profile = await userApi.getProfile()
      if (profile) {
        const isDesigner = profile.role === 'designer'
        this.setData({
          userInfo: profile,
          isDesigner,
          roleLabel: isDesigner ? '设计师' : '客户'
        })
      }
    } catch (err) {
      console.error('加载个人信息失败:', err)
      // 使用本地缓存
      const localInfo = auth.getUserInfo()
      if (localInfo) {
        const isDesigner = localInfo.role === 'designer'
        this.setData({
          userInfo: localInfo,
          isDesigner,
          roleLabel: isDesigner ? '设计师' : '客户'
        })
      }
    }
  },

  onEditProfile() {
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    })
  },

  onAboutTap() {
    wx.showModal({
      title: '关于家造同频',
      content: '家造同频 v1.0.0\n让设计与生活同频共振',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#1A6D5C'
    })
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录，确定退出吗？',
      confirmText: '退出登录',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          auth.clearAuth()
          wx.redirectTo({
            url: '/pages/index/index'
          })
        }
      }
    })
  }
})