const { MILESTONES } = require('../../utils/constants')

Component({
  properties: {
    currentStage: {
      type: Number,
      value: 0
    },
    editable: {
      type: Boolean,
      value: false
    }
  },

  data: {
    milestones: []
  },

  lifetimes: {
    attached: function () {
      this.setData({
        milestones: MILESTONES
      })
    }
  },

  methods: {
    onStageTap: function (e) {
      var index = e.currentTarget.dataset.index
      var currentStage = this.data.currentStage

      // 只有可编辑且点击的是当前阶段的下一步时才触发
      if (this.data.editable && index === currentStage + 1) {
        this.triggerEvent('advance', {
          fromStage: currentStage,
          toStage: index
        })
      }
    }
  }
})