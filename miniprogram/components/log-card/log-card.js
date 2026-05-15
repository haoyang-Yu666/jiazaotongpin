const app = getApp()

Component({
  properties: {
    log: {
      type: Object,
      value: {}
    }
  },

  data: {
    timeText: '',
    liked: false
  },

  observers: {
    'log': function (log) {
      if (!log) return
      this._updateComputed(log)
    }
  },

  lifetimes: {
    attached: function () {
      if (this.data.log) {
        this._updateComputed(this.data.log)
      }
    }
  },

  methods: {
    _updateComputed: function (log) {
      // 格式化时间
      var timeText = this._formatTime(log.created_at)

      // 检查当前用户是否已点赞
      var liked = false
      try {
        var userId = app.globalData && app.globalData.userInfo && app.globalData.userInfo._id
        if (userId && log.likes && Array.isArray(log.likes)) {
          liked = log.likes.indexOf(userId) !== -1
        }
      } catch (e) {
        liked = false
      }

      this.setData({
        timeText: timeText,
        liked: liked
      })
    },

    _formatTime: function (date) {
      if (!date) return ''
      var d = new Date(date)
      var now = new Date()
      var diff = now.getTime() - d.getTime()

      // 1分钟内
      if (diff < 60 * 1000) {
        return '刚刚'
      }
      // 1小时内
      if (diff < 60 * 60 * 1000) {
        return Math.floor(diff / (60 * 1000)) + '分钟前'
      }
      // 今天
      if (this._isSameDay(d, now)) {
        return this._padZero(d.getHours()) + ':' + this._padZero(d.getMinutes())
      }
      // 昨天
      var yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      if (this._isSameDay(d, yesterday)) {
        return '昨天 ' + this._padZero(d.getHours()) + ':' + this._padZero(d.getMinutes())
      }
      // 今年
      if (d.getFullYear() === now.getFullYear()) {
        return (d.getMonth() + 1) + '月' + d.getDate() + '日'
      }
      // 更早
      return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
    },

    _isSameDay: function (d1, d2) {
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate()
    },

    _padZero: function (num) {
      return num < 10 ? '0' + num : '' + num
    },

    onImageTap: function (e) {
      var index = e.currentTarget.dataset.index
      var images = this.data.log.images || []
      wx.previewImage({
        current: images[index],
        urls: images
      })
    },

    onLikeTap: function () {
      this.triggerEvent('like', { id: this.data.log._id, liked: !this.data.liked })
    },

    onCommentTap: function () {
      this.triggerEvent('comment', { id: this.data.log._id })
    }
  }
})