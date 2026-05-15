const { projectApi } = require('../../../utils/cloud')
const constants = require('../../../utils/constants')
const format = require('../../../utils/format')

Page({
  data: {
    projectId: '',
    loading: true,
    project: null,
    fileStats: null,
    logCount: 0,
    questionnaireStatus: '',
    recentLogs: [],
    milestones: constants.MILESTONES,
    currentStageName: ''
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
    this.loadStats()
  },

  async loadStats() {
    this.setData({ loading: true })
    try {
      const res = await projectApi.getStats(this.data.projectId)
      const project = res.project || {}
      const currentMilestone = constants.MILESTONES.find(m => m.order === project.current_stage)

      const recentLogs = (res.recentLogs || []).map(log => ({
        ...log,
        timeText: format.timeAgo(log.created_at)
      }))

      this.setData({
        project,
        fileStats: res.fileStats,
        logCount: res.logCount,
        questionnaireStatus: res.questionnaireStatus,
        recentLogs,
        currentStageName: currentMilestone ? currentMilestone.name : '',
        loading: false
      })
    } catch (err) {
      console.error('加载统计失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onViewFiles() {
    wx.navigateTo({
      url: `/pages/files/list/list?projectId=${this.data.projectId}`
    })
  },

  onViewProgress() {
    wx.navigateTo({
      url: `/pages/progress/timeline/timeline?projectId=${this.data.projectId}`
    })
  },

  onViewQuestionnaire() {
    wx.navigateTo({
      url: `/pages/questionnaire/view/view?projectId=${this.data.projectId}`
    })
  }
})
