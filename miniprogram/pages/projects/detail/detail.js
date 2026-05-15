const { projectApi, fileApi, questionnaireApi, progressApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')
const format = require('../../../utils/format')

Page({
  data: {
    projectId: '',
    project: null,
    isDesigner: false,
    loading: true,

    // Tab
    tabs: [
      { key: 'needs', label: '需求' },
      { key: 'files', label: '图纸' },
      { key: 'progress', label: '进度' }
    ],
    activeTab: 'needs',

    // 需求 tab
    questionnaireStatus: '',
    questionnaireData: null,

    // 图纸 tab
    fileList: [],
    fileCategory: 'all',
    fileCategoryOptions: [
      { key: 'all', label: '全部' },
      { key: 'floor_plan', label: '平面图' },
      { key: 'rendering', label: '效果图' },
      { key: 'budget', label: '预算单' },
      { key: 'other', label: '其他' }
    ],

    // 进度 tab
    currentStage: 0,
    logs: [],
    milestones: constants.MILESTONES
  },

  onLoad(options) {
    const projectId = options.id
    if (!projectId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }

    this.setData({
      projectId,
      isDesigner: auth.isDesigner()
    })

    this.loadProjectDetail()
  },

  onShow() {
    if (this.data.projectId) {
      this.loadProjectDetail()
    }
  },

  async loadProjectDetail() {
    this.setData({ loading: true })
    try {
      const project = await projectApi.getDetail(this.data.projectId)
      this.setData({
        project,
        loading: false,
        currentStage: project.current_stage || 0
      })

      // 加载各 tab 数据
      this.loadTabData()
    } catch (err) {
      console.error('加载项目详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  loadTabData() {
    this.loadQuestionnaire()
    this.loadFiles()
    this.loadLogs()
  },

  async loadQuestionnaire() {
    try {
      const res = await questionnaireApi.get(this.data.projectId)
      this.setData({
        questionnaireData: res,
        questionnaireStatus: res ? res.status : ''
      })
    } catch (err) {
      // 问卷可能尚未提交
      this.setData({ questionnaireStatus: 'pending' })
    }
  },

  async loadFiles() {
    try {
      const params = { projectId: this.data.projectId }
      if (this.data.fileCategory !== 'all') {
        params.category = this.data.fileCategory
      }
      const res = await fileApi.list(params)
      this.setData({ fileList: (res && res.list) || [] })
    } catch (err) {
      console.error('加载文件列表失败:', err)
    }
  },

  async loadLogs() {
    try {
      const logRes = await progressApi.listLogs({
        projectId: this.data.projectId
      })
      this.setData({ logs: (logRes && logRes.list) || [] })
    } catch (err) {
      console.error('加载进度日志失败:', err)
    }
  },

  onTabSwitch(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  onSwiperChange(e) {
    const index = e.detail.current
    const tab = this.data.tabs[index].key
    this.setData({ activeTab: tab })
  },

  // 需求 tab 操作
  onFillQuestionnaire() {
    wx.navigateTo({
      url: `/pages/questionnaire/fill/fill?projectId=${this.data.projectId}`
    })
  },

  onViewQuestionnaire() {
    wx.navigateTo({
      url: `/pages/questionnaire/view/view?projectId=${this.data.projectId}`
    })
  },

  onViewInspiration() {
    wx.navigateTo({
      url: `/pages/inspiration/list/list?projectId=${this.data.projectId}`
    })
  },

  // 图纸 tab 操作
  onFileCategoryChange(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ fileCategory: category })
    this.loadFiles()
  },

  onUploadFile() {
    wx.navigateTo({
      url: `/pages/files/upload/upload?projectId=${this.data.projectId}`
    })
  },

  onFileTap(e) {
    const fileId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/files/preview/preview?fileId=${fileId}`
    })
  },

  // 进度 tab 操作
  onStageChange(e) {
    const stageIndex = e.detail.stageIndex
    this.setData({ currentStage: stageIndex })
  },

  onPublishLog() {
    wx.navigateTo({
      url: `/pages/progress/publish/publish?projectId=${this.data.projectId}`
    })
  },

  onLogTap(e) {
    const logId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/progress/log-detail/log-detail?logId=${logId}`
    })
  },

  // 分享/邀请
  onShareAppMessage() {
    return {
      title: `邀请你加入项目「${this.data.project.name}」`,
      path: `/pages/projects/invite/invite?code=${this.data.project.invite_code}`
    }
  },

  onCopyInviteCode() {
    wx.setClipboardData({
      data: this.data.project.invite_code,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'success' })
      }
    })
  },

  onViewDashboard() {
    wx.navigateTo({
      url: `/pages/projects/dashboard/dashboard?projectId=${this.data.projectId}`
    })
  },

  onGeneratePoster() {
    wx.navigateTo({
      url: `/pages/projects/poster/poster?projectId=${this.data.projectId}`
    })
  }
})
