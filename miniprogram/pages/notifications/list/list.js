const { notificationApi } = require('../../../utils/cloud')
const format = require('../../../utils/format')

Page({
  data: {
    notifications: [],
    loading: true,
    isEmpty: false,
    page: 1,
    hasMore: true,
    unreadCount: 0
  },

  onShow() {
    this.setData({ page: 1, notifications: [], hasMore: true })
    this.loadNotifications()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, notifications: [], hasMore: true })
    this.loadNotifications().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadNotifications() {
    this.setData({ loading: true })
    try {
      const res = await notificationApi.list({
        page: this.data.page,
        pageSize: 10
      })
      const rawList = (res && res.list) || []
      const total = (res && res.total) || 0
      const unreadCount = (res && res.unreadCount) || 0

      const list = rawList.map(item => ({
        ...item,
        timeText: format.timeAgo(item.created_at),
        iconText: this._getIconText(item.type)
      }))

      const notifications = this.data.page === 1
        ? list
        : this.data.notifications.concat(list)

      this.setData({
        notifications,
        isEmpty: notifications.length === 0,
        hasMore: notifications.length < total,
        unreadCount,
        loading: false
      })

      // 同步更新 tabBar 红点
      this._updateBadge()
    } catch (err) {
      console.error('加载通知失败:', err)
      this.setData({ loading: false, isEmpty: this.data.notifications.length === 0 })
    }
  },

  _getIconText(type) {
    const map = {
      file_upload: '📄',
      file_confirm: '✅',
      file_reject: '↩️',
      progress_publish: '📋',
      questionnaire_submit: '📝',
      project_join: '🤝'
    }
    return map[type] || '🔔'
  },

  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.loadNotifications()
  },

  async onNotificationTap(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return

    if (!item.is_read) {
      try {
        await notificationApi.markRead(item._id)
        // 使用 _id 查找而非 indexOf（dataset 会反序列化对象，引用不相等）
        const idx = this.data.notifications.findIndex(n => n._id === item._id)
        if (idx >= 0) {
          const key = `notifications[${idx}].is_read`
          this.setData({
            [key]: true,
            unreadCount: Math.max(0, this.data.unreadCount - 1)
          })
        }
        this._updateBadge()
      } catch (err) {
        console.error('标记已读失败:', err)
      }
    }

    this._navigateByType(item)
  },

  _navigateByType(item) {
    if (!item.project_id) return
    const types = ['file_upload', 'file_confirm', 'file_reject']
    if (types.indexOf(item.type) > -1 && item.related_id) {
      wx.navigateTo({
        url: `/pages/files/preview/preview?fileId=${item.related_id}&projectId=${item.project_id}`
      })
    } else if (item.type === 'progress_publish' && item.related_id) {
      wx.navigateTo({
        url: `/pages/progress/log-detail/log-detail?logId=${item.related_id}`
      })
    } else if (item.type === 'questionnaire_submit') {
      wx.navigateTo({
        url: `/pages/questionnaire/view/view?projectId=${item.project_id}`
      })
    } else if (item.type === 'project_join') {
      wx.navigateTo({
        url: `/pages/projects/detail/detail?id=${item.project_id}`
      })
    }
  },

  async onMarkAllRead() {
    if (this.data.unreadCount === 0) return
    try {
      await notificationApi.markAllRead()
      const notifications = this.data.notifications.map(n => ({ ...n, is_read: true }))
      this.setData({ notifications, unreadCount: 0 })
      this._updateBadge()
      wx.showToast({ title: '全部已读', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onDeleteTap(e) {
    const id = e.currentTarget.dataset.id
    try {
      await notificationApi.remove(id)
      const notifications = this.data.notifications.filter(n => n._id !== id)
      this.setData({ notifications, isEmpty: notifications.length === 0 })
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  _updateBadge() {
    if (this.data.unreadCount > 0) {
      wx.setTabBarBadge({ index: 1, text: String(this.data.unreadCount) })
    } else {
      wx.removeTabBarBadge({ index: 1 })
    }
  }
})
