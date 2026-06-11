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
  },

  onLogLongPress(e) {
    // 仅设计师可删除进度日志
    if (!this.data.isDesigner) return

    const { id, content } = e.currentTarget.dataset
    // 截取内容前20字作为提示
    const preview = (content || '').substring(0, 20) + ((content || '').length > 20 ? '...' : '')
    const that = this

    wx.showModal({
      title: '删除进度',
      content: `确定要删除「${preview || '该进度'}」吗？\n相关评论也将一并删除，不可恢复。`,
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中' })
            await progressApi.deleteLog(id)
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            // 从列表中移除
            const logs = that.data.logs.filter(l => l._id !== id)
            that.setData({
              logs,
              isEmpty: logs.length === 0
            })
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})