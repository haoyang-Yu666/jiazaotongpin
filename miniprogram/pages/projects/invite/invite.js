const { projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    inviteCode: '',
    projectInfo: null,
    loading: true,
    joining: false,
    error: ''
  },

  onLoad(options) {
    const inviteCode = options.code || ''
    if (!inviteCode) {
      this.setData({
        loading: false,
        error: '邀请码无效'
      })
      return
    }

    this.setData({ inviteCode })
    this.loadInviteInfo()
  },

  async loadInviteInfo() {
    this.setData({ loading: true, error: '' })
    try {
      const info = await projectApi.getInviteInfo(this.data.inviteCode)
      this.setData({
        projectInfo: info,
        loading: false
      })
    } catch (err) {
      console.error('获取邀请信息失败:', err)
      this.setData({
        loading: false,
        error: err.message || '获取项目信息失败'
      })
    }
  },

  async onJoinProject() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({
        url: `/pages/login/login?role=client`
      })
      return
    }

    if (this.data.joining) return
    this.setData({ joining: true })

    try {
      await projectApi.join(this.data.inviteCode)
      wx.showToast({ title: '加入成功', icon: 'success' })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/projects/list/list'
        })
      }, 1000)
    } catch (err) {
      console.error('加入项目失败:', err)
      wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    } finally {
      this.setData({ joining: false })
    }
  }
})
