const { fileApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')

Page({
  data: {
    projectId: '',
    categories: [
      { key: '', label: '全部' },
      { key: 'floor_plan', label: '平面图' },
      { key: 'rendering', label: '效果图' },
      { key: 'budget', label: '预算单' }
    ],
    currentCategory: '',
    files: [],
    loading: false,
    isEmpty: false,
    isDesigner: false,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad(options) {
    this.setData({
      projectId: options.projectId || '',
      isDesigner: auth.isDesigner()
    })
    this.loadFiles()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, files: [], hasMore: true })
    this.loadFiles().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.currentCategory) return
    this.setData({ currentCategory: key, page: 1, files: [], hasMore: true })
    this.loadFiles()
  },

  async loadFiles() {
    this.setData({ loading: true })
    try {
      const data = {
        projectId: this.data.projectId,
        page: this.data.page,
        pageSize: this.data.pageSize
      }
      if (this.data.currentCategory) {
        data.category = this.data.currentCategory
      }
      const res = await fileApi.list(data)
      const list = (res && res.list) || []
      const total = (res && res.total) || 0
      const files = this.data.page === 1 ? list : this.data.files.concat(list)

      this.setData({
        files,
        isEmpty: files.length === 0,
        hasMore: files.length < total,
        loading: false
      })
    } catch (err) {
      console.error('加载文件失败:', err)
      this.setData({ loading: false, isEmpty: this.data.files.length === 0 })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadFiles()
  },

  onFileTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/files/preview/preview?fileId=${id}&projectId=${this.data.projectId}`
    })
  },

  onUploadTap() {
    wx.navigateTo({
      url: `/pages/files/upload/upload?projectId=${this.data.projectId}`
    })
  }
})
