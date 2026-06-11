const { progressApi } = require('../../../utils/cloud')
const auth = require('../../../utils/auth')
const format = require('../../../utils/format')
const constants = require('../../../utils/constants')

Page({
  data: {
    logId: '',
    projectId: '',
    log: null,
    comments: [],
    commentPage: 1,
    hasMoreComments: true,
    commentContent: '',
    loading: true,
    isLiked: false,
    likeCount: 0,
    isDesigner: false
  },

  onLoad(options) {
    this.setData({
      logId: options.logId,
      projectId: options.projectId,
      isDesigner: auth.isDesigner()
    })
    this.loadLog()
    this.loadComments()
  },

  async loadLog() {
    try {
      const rawLog = await progressApi.getLog(this.data.logId)
      if (rawLog) {
        const app = getApp()
        const currentUserId = app.globalData && app.globalData.userInfo && app.globalData.userInfo._id
        const likes = rawLog.likes || []
        const isLiked = currentUserId ? likes.includes(currentUserId) : false
        const stageName = (constants.MILESTONES[rawLog.milestone_id] && constants.MILESTONES[rawLog.milestone_id].name) || ''

        this.setData({
          log: {
            ...rawLog,
            authorAvatar: (rawLog.author_info && rawLog.author_info.avatar) || '',
            authorName: (rawLog.author_info && rawLog.author_info.nickname) || '设计师',
            createdAtText: format.dateTime(rawLog.created_at),
            stageName: stageName
          },
          loading: false,
          isLiked: isLiked,
          likeCount: likes.length
        })
      }
    } catch (err) {
      console.error('加载日志失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadComments() {
    try {
      const res = await progressApi.getComments(this.data.logId, this.data.commentPage)
      const list = (res && res.list) || []

      const comments = list.map(c => ({
        ...c,
        userAvatar: (c.author_info && c.author_info.avatar) || '',
        userName: (c.author_info && c.author_info.nickname) || '用户',
        timeText: format.dateTime(c.created_at)
      }))

      this.setData({
        comments: this.data.comments.concat(comments),
        hasMoreComments: list.length >= 20,
        commentPage: this.data.commentPage + 1
      })
    } catch (err) {
      console.error('加载评论失败:', err)
    }
  },

  onImagePreview(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      current: url,
      urls: this.data.log.images || []
    })
  },

  async onLikeTap() {
    try {
      await progressApi.toggleLike(this.data.logId)
      const isLiked = !this.data.isLiked
      this.setData({
        isLiked,
        likeCount: isLiked ? this.data.likeCount + 1 : this.data.likeCount - 1
      })
    } catch (err) {
      console.error('点赞失败:', err)
    }
  },

  onCommentInput(e) {
    this.setData({ commentContent: e.detail.value })
  },

  async onSubmitComment() {
    const { commentContent, logId } = this.data
    if (!commentContent.trim()) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }

    try {
      await progressApi.addComment(logId, commentContent.trim())
      wx.showToast({ title: '评论成功', icon: 'success' })
      this.setData({
        commentContent: '',
        comments: [],
        commentPage: 1,
        hasMoreComments: true
      })
      this.loadComments()
    } catch (err) {
      console.error('评论失败:', err)
      wx.showToast({ title: '评论失败', icon: 'none' })
    }
  },

  onScrollToLower() {
    if (this.data.hasMoreComments) {
      this.loadComments()
    }
  },

  onDeleteLog() {
    const content = (this.data.log && this.data.log.content) || ''
    const preview = content.substring(0, 20) + (content.length > 20 ? '...' : '')
    const that = this

    wx.showModal({
      title: '删除进度',
      content: `确定要删除「${preview || '该进度'}」吗？\n相关评论也将一并删除，不可恢复。`,
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中' })
            await progressApi.deleteLog(that.data.logId)
            wx.hideLoading()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => {
              wx.navigateBack()
            }, 1000)
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
