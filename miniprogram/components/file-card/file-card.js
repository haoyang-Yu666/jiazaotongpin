const { FILE_CATEGORY_LABELS, FILE_STATUS } = require('../../utils/constants')

Component({
  properties: {
    file: {
      type: Object,
      value: {}
    }
  },

  data: {
    categoryText: '',
    statusText: '',
    dateText: ''
  },

  observers: {
    'file': function (file) {
      if (!file) return
      this._updateComputed(file)
    }
  },

  lifetimes: {
    attached: function () {
      if (this.data.file) {
        this._updateComputed(this.data.file)
      }
    }
  },

  methods: {
    _updateComputed: function (file) {
      // 分类文本
      var categoryText = FILE_CATEGORY_LABELS[file.category] || '其他'

      // 状态文本映射
      var statusMap = {
        pending: '待确认',
        confirmed: '已确认',
        rejected: '已拒绝'
      }
      var statusText = statusMap[file.status] || '待确认'

      // 日期格式化
      var dateText = ''
      if (file.created_at) {
        dateText = this._formatDate(file.created_at)
      }

      this.setData({
        categoryText: categoryText,
        statusText: statusText,
        dateText: dateText
      })
    },

    _formatDate: function (date) {
      if (!date) return ''
      var d = new Date(date)
      var year = d.getFullYear()
      var month = this._padZero(d.getMonth() + 1)
      var day = this._padZero(d.getDate())
      return year + '-' + month + '-' + day
    },

    _padZero: function (num) {
      return num < 10 ? '0' + num : '' + num
    },

    onTap: function () {
      var file = this.data.file
      if (file && file._id) {
        this.triggerEvent('tap', { id: file._id, file: file })
      }
    }
  }
})