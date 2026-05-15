const { userApi, projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
    projectCount: 0
  },

  onLoad() {
    if (!auth.isDesigner()) {
      wx.showToast({ title: '仅设计师可用', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    this.loadCardInfo()
  },

  async loadCardInfo() {
    try {
      const profile = await userApi.getProfile()
      const res = await projectApi.list({ role: 'designer' })
      const projectCount = res && res.total ? res.total : 0

      this.setData({
        userInfo: profile,
        projectCount
      })
    } catch (err) {
      const localInfo = auth.getUserInfo()
      this.setData({ userInfo: localInfo })
    }
  },

  onShareAppMessage() {
    const user = this.data.userInfo
    return {
      title: '设计师' + (user ? user.nickname : '') + ' - 家造同频',
      path: '/pages/index/index'
    }
  }
})
