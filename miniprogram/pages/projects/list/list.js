const { projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    currentRole: 'designer',
    roleTabs: [
      { key: 'designer', label: '设计师' },
      { key: 'client', label: '客户' }
    ],
    projects: [],
    loading: true,
    isEmpty: false,
    isDesigner: false,
    showJoinDialog: false,
    inviteCode: '',
    joining: false
  },

  onLoad() {
    const role = auth.getRole() || 'client'
    const isDesigner = role === 'designer'
    this.setData({ currentRole: role, isDesigner })
  },

  onShow() {
    this.loadProjects()
  },

  onPullDownRefresh() {
    this.loadProjects().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadProjects() {
    this.setData({ loading: true, isEmpty: false })
    try {
      const res = await projectApi.list({
        role: this.data.currentRole
      })
      const projects = (res && res.list) || []
      this.setData({
        projects: projects,
        isEmpty: projects.length === 0,
        loading: false
      })
    } catch (err) {
      console.error('加载项目列表失败:', err)
      this.setData({ loading: false, isEmpty: true })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onRoleSwitch(e) {
    const role = e.currentTarget.dataset.role
    if (role === this.data.currentRole) return
    this.setData({ currentRole: role, isDesigner: role === 'designer' })
    this.loadProjects()
  },

  onProjectTap(e) {
    const id = e.detail.id || e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/projects/detail/detail?id=${id}`
    })
  },

  onCreateProject() {
    wx.navigateTo({
      url: '/pages/projects/create/create'
    })
  },

  onShowJoinDialog() {
    this.setData({ showJoinDialog: true, inviteCode: '' })
  },

  onHideJoinDialog() {
    this.setData({ showJoinDialog: false })
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() })
  },

  async onJoinProject() {
    const code = this.data.inviteCode.trim()
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' })
      return
    }

    if (this.data.joining) return
    this.setData({ joining: true })

    try {
      await projectApi.join(code)
      wx.showToast({ title: '加入成功', icon: 'success' })
      this.setData({ showJoinDialog: false })
      this.loadProjects()
    } catch (err) {
      wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    } finally {
      this.setData({ joining: false })
    }
  }
})
