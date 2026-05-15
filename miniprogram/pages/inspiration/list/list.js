const { inspirationApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const format = require('../../../utils/format')

Page({
  data: {
    projectId: '',
    inspirations: [],
    page: 1,
    hasMore: true,
    loading: false,
    isEmpty: false
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
    this.loadInspirations()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, inspirations: [] })
    this.loadInspirations().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadInspirations()
    }
  },

  async loadInspirations() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const res = await inspirationApi.list(this.data.projectId, this.data.page)
      const rawList = (res && res.list) || []
      const total = (res && res.total) || 0

      const list = rawList.map(item => ({
        ...item,
        uploaderName: item.uploader_name || '匿名',
        uploaderAvatar: item.uploader_avatar || '',
        timeAgoText: format.timeAgo(item.created_at)
      }))

      this.setData({
        inspirations: this.data.inspirations.concat(list),
        hasMore: this.data.inspirations.length + list.length < total,
        page: this.data.page + 1,
        isEmpty: this.data.inspirations.length === 0 && list.length === 0,
        loading: false
      })
    } catch (err) {
      console.error('加载灵感失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onImagePreview(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({
      current,
      urls
    })
  },

  onAddTap() {
    wx.navigateTo({
      url: `/pages/inspiration/add/add?projectId=${this.data.projectId}`
    })
  },

  onItemLongPress(e) {
    const { id } = e.currentTarget.dataset
    const canDelete = auth.isDesigner()
    if (!canDelete) return

    wx.showActionSheet({
      itemList: ['删除此灵感'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deleteInspiration(id)
        }
      }
    })
  },

  async deleteInspiration(id) {
    try {
      await inspirationApi.remove(id)
      wx.showToast({ title: '已删除', icon: 'success' })
      this.setData({ page: 1, inspirations: [], hasMore: true })
      this.loadInspirations()
    } catch (err) {
      console.error('删除失败:', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  }
})
