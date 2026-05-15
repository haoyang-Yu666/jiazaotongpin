const { MILESTONES, PROJECT_STATUS } = require('../../utils/constants')

Component({
  properties: {
    project: {
      type: Object,
      value: {}
    }
  },

  data: {
    statusText: '',
    progressPercent: 0,
    currentStageName: ''
  },

  observers: {
    'project': function (project) {
      if (!project) return
      this._updateComputed(project)
    }
  },

  lifetimes: {
    attached: function () {
      if (this.data.project) {
        this._updateComputed(this.data.project)
      }
    }
  },

  methods: {
    _updateComputed: function (project) {
      // 状态文本映射
      const statusMap = {
        waiting: '等待中',
        active: '进行中',
        completed: '已完成'
      }

      // 计算进度百分比和当前阶段名称
      let progressPercent = 0
      let currentStageName = ''

      if (project.status === 'completed') {
        progressPercent = 100
        currentStageName = '已完成'
      } else if (project.status === 'active' && project.current_stage !== undefined && project.current_stage !== null) {
        const totalStages = MILESTONES.length
        progressPercent = Math.round(((project.current_stage + 1) / totalStages) * 100)
        const currentMilestone = MILESTONES.find(function (m) { return m.order === project.current_stage })
        if (currentMilestone) {
          currentStageName = currentMilestone.name
        }
      }

      this.setData({
        statusText: statusMap[project.status] || '未知',
        progressPercent: progressPercent,
        currentStageName: currentStageName
      })
    },

    onTap: function () {
      var project = this.data.project
      if (project && project._id) {
        this.triggerEvent('tap', { id: project._id })
      }
    }
  }
})