const format = require('../../utils/format')

Component({
  properties: {
    message: {
      type: Object,
      value: {}
    },
    currentUserOpenid: {
      type: String,
      value: ''
    }
  },

  data: {
    isSelf: false,
    timeText: ''
  },

  observers: {
    'message, currentUserOpenid': function (message, currentUserOpenid) {
      if (!message || !currentUserOpenid) return
      this.setData({
        isSelf: message.sender_openid === currentUserOpenid,
        timeText: format.timeAgo(message.created_at)
      })
    }
  },

  methods: {
    onImageTap() {
      const msg = this.data.message
      if (msg && msg.content) {
        wx.previewImage({
          current: msg.content,
          urls: [msg.content]
        })
      }
    }
  }
})
