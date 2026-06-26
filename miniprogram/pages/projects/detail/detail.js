const { projectApi, fileApi, questionnaireApi, progressApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const constants = require('../../../utils/constants')
const format = require('../../../utils/format')

Page({
  data: {
    projectId: '',
    project: null,
    isDesigner: false,
    isProjectOwner: false,
    isProjectClient: false,
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
    milestones: constants.MILESTONES,

    // 聊天 tab
    unreadMessages: 0,
    activeTabIndex: 0,
    tabCount: 3
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

    this.loadProjectDetail(true)
  },

  onShow() {
    if (this.data.projectId) {
      this.loadProjectDetail(false)
    }
  },

  async loadProjectDetail(showLoading) {
    if (showLoading) {
      this.setData({ loading: true })
    }
    try {
      const project = await projectApi.getDetail(this.data.projectId)

      // 计算当前用户与项目的关系
      const userInfo = auth.getUserInfo()
      const currentOpenid = userInfo ? userInfo.openid : ''
      const isProjectOwner = currentOpenid && currentOpenid === project.designer_openid
      const isProjectClient = currentOpenid && currentOpenid === project.client_openid

      // 根据是否有客户决定是否显示沟通 Tab
      const hasClient = !!project.client_openid
      const tabs = [
        { key: 'needs', label: '需求' },
        { key: 'files', label: '图纸' },
        { key: 'progress', label: '进度' }
      ]
      if (hasClient) {
        tabs.push({ key: 'chat', label: '沟通' })
      }

      // 如果当前 activeTab 是 chat 但没有客户，回退到 needs
      let activeTab = this.data.activeTab
      if (activeTab === 'chat' && !hasClient) {
        activeTab = 'needs'
      }

      this.setData({
        project,
        isProjectOwner,
        isProjectClient,
        tabs,
        activeTab,
        activeTabIndex: tabs.findIndex(t => t.key === activeTab),
        tabCount: tabs.length,
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
    if (this.data.project && this.data.project.client_openid) {
      this.loadUnreadMessages()
    }
  },

  async loadQuestionnaire() {
    try {
      const res = await questionnaireApi.get(this.data.projectId)
      const status = res && res.status ? res.status : 'pending'
      this.setData({
        questionnaireData: res,
        questionnaireStatus: status
      })
    } catch (err) {
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
    this.setData({
      activeTab: tab,
      activeTabIndex: this.data.tabs.findIndex(t => t.key === tab)
    })
  },

  onSwiperChange(e) {
    const index = e.detail.current
    const tab = this.data.tabs[index].key
    this.setData({ activeTab: tab, activeTabIndex: index })
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

  onEditTemplate() {
    wx.navigateTo({
      url: `/pages/questionnaire/edit-template/edit-template?projectId=${this.data.projectId}`
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
  },

  // V3.0 编辑项目
  onEditProject() {
    wx.navigateTo({
      url: `/pages/projects/edit/edit?id=${this.data.projectId}`
    })
  },

  // V3.0 生成报告
  onGenerateReport() {
    wx.navigateTo({
      url: `/pages/projects/report/report?projectId=${this.data.projectId}`
    })
  },

  // V3.0 聊天
  async loadUnreadMessages() {
    try {
      const res = await projectApi.getUnreadMessageCount()
      this.setData({ unreadMessages: res.total || 0 })
    } catch (err) {}
  },

  onOpenChat() {
    wx.navigateTo({
      url: `/pages/projects/chat/chat?projectId=${this.data.projectId}`
    })
  },

  // 退出项目（仅参与者可用）
  onLeaveProject() {
    const that = this
    wx.showModal({
      title: '退出项目',
      content: '退出后您将无法查看该项目的内容，确定要退出吗？',
      confirmText: '确认退出',
      confirmColor: '#e34d59',
      success(res) {
        if (res.confirm) {
          that.doLeaveProject()
        }
      }
    })
  },

  async doLeaveProject() {
    try {
      await projectApi.leave(this.data.projectId)
      wx.showToast({ title: '已退出项目', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      wx.showToast({ title: err.message || '退出失败', icon: 'none' })
    }
  }
})
