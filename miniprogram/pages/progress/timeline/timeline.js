const { progressApi, projectApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    project: null,
    currentStage: 0,
    milestones: constants.MILESTONES,
    logs: [],
    page: 1,
    hasMore: true,
    loading: false,
    isEmpty: false,
    isDesigner: false
  },

  onLoad(options) {
    this.setData({
      projectId: options.projectId || '',
      isDesigner: auth.isDesigner()
    })
    this.loadProject()
    this.loadLogs()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, logs: [] })
    Promise.all([this.loadProject(), this.loadLogs()]).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLogs()
    }
  },

  async loadProject() {
    try {
      const project = await projectApi.getDetail(this.data.projectId)
      if (project) {
        this.setData({
          project,
          currentStage: project.current_stage || 0
        })
      }
    } catch (err) {
      console.error('加载项目失败:', err)
    }
  },

  async loadLogs() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const res = await progressApi.listLogs({
        projectId: this.data.projectId,
        page: this.data.page,
        pageSize: constants.PAGE_SIZE
      })
      const list = (res && res.list) || []
      const total = (res && res.total) || 0

      this.setData({
        logs: this.data.logs.concat(list),
        hasMore: this.data.logs.length + list.length < total,
        page: this.data.page + 1,
        isEmpty: this.data.logs.length === 0 && list.length === 0,
        loading: false
      })
    } catch (err) {
      console.error('加载日志失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onLogTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/progress/log-detail/log-detail?logId=${id}&projectId=${this.data.projectId}`
    })
  },

  onPublishTap() {
    wx.navigateTo({
      url: `/pages/progress/publish/publish?projectId=${this.data.projectId}&currentStage=${this.data.currentStage}`
    })
  }
})