const { projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    currentRole: 'designer',
    viewTabs: [
      { key: 'designer', label: '我设计的' },
      { key: 'client', label: '我参与的' }
    ],
    projects: [],
    loading: true,
    isEmpty: false,
    page: 1,
    pageSize: 10,
    hasMore: true,
    // 搜索筛选
    keyword: '',
    statusFilter: '',
    sortBy: 'updated_at',
    statusFilters: [
      { key: '', label: '全部' },
      { key: 'active', label: '进行中' },
      { key: 'waiting', label: '等待中' },
      { key: 'completed', label: '已完成' }
    ],
    // 加入项目
    showJoinDialog: false,
    inviteCode: '',
    joining: false
  },

  onLoad() {
    // 默认显示设计师视角
    this.setData({ currentRole: 'designer' })
  },

  onShow() {
    this.resetAndLoad()
  },

  onPullDownRefresh() {
    this.resetAndLoad().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  resetAndLoad() {
    this.setData({ page: 1, projects: [], hasMore: true })
    return this.loadProjects()
  },

  async loadProjects() {
    this.setData({ loading: true })
    try {
      const params = {
        role: this.data.currentRole,
        page: this.data.page,
        pageSize: this.data.pageSize,
        sortBy: this.data.sortBy
      }
      if (this.data.keyword.trim()) {
        params.keyword = this.data.keyword.trim()
      }
      if (this.data.statusFilter) {
        params.status = this.data.statusFilter
      }

      const res = await projectApi.list(params)
      const list = (res && res.list) || []
      const total = (res && res.total) || 0
      const projects = this.data.page === 1 ? list : this.data.projects.concat(list)

      this.setData({
        projects,
        isEmpty: projects.length === 0,
        hasMore: projects.length < total,
        loading: false
      })
    } catch (err) {
      console.error('加载项目列表失败:', err)
      this.setData({ loading: false, isEmpty: this.data.projects.length === 0 })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadProjects()
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearchConfirm() {
    this.resetAndLoad()
  },

  onStatusFilter(e) {
    const status = e.currentTarget.dataset.status
    this.setData({ statusFilter: status })
    this.resetAndLoad()
  },

  onSortToggle() {
    const newSort = this.data.sortBy === 'updated_at' ? 'created_at' : 'updated_at'
    this.setData({ sortBy: newSort })
    this.resetAndLoad()
  },

  onViewSwitch(e) {
    const role = e.currentTarget.dataset.role
    if (role === this.data.currentRole) return
    this.setData({ currentRole: role })
    this.resetAndLoad()
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
      this.resetAndLoad()
    } catch (err) {
      wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    } finally {
      this.setData({ joining: false })
    }
  }
})
