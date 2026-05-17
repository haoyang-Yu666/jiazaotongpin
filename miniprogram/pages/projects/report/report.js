const { projectApi } = require('../../../utils/cloud')
const constants = require('../../../utils/constants')

Page({
  data: {
    projectId: '',
    stats: null,
    reportUrl: '',
    generating: false,
    saved: false
  },

  onLoad(options) {
    this.setData({ projectId: options.projectId || '' })
    this.loadStats()
  },

  async loadStats() {
    try {
      const stats = await projectApi.getStats(this.data.projectId)
      this.setData({ stats })
      this.generateReport()
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  generateReport() {
    this.setData({ generating: true })
    const query = wx.createSelectorQuery()
    query.select('#reportCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) {
        this.setData({ generating: false })
        return
      }

      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getWindowInfo().pixelRatio
      const W = 540
      const H = 1200
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.scale(dpr, dpr)

      const stats = this.data.stats
      const project = stats.project

      // === 1. 头部绿色渐变 ===
      const headerH = 260
      const grad = ctx.createLinearGradient(0, 0, 0, headerH)
      grad.addColorStop(0, '#1A6D5C')
      grad.addColorStop(1, '#0D4F42')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, headerH)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('家造同频 · 项目报告', W / 2, 50)

      ctx.font = 'bold 32px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(project.name || '', W / 2, 110)

      ctx.font = '18px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      const meta = [project.community, project.area ? project.area + 'm²' : '', project.style].filter(Boolean).join(' · ')
      ctx.fillText(meta, W / 2, 150)

      if (project.budget) {
        ctx.fillText('预算: ' + project.budget, W / 2, 185)
      }

      // 状态
      const statusText = { waiting: '等待加入', active: '进行中', completed: '已完成', archived: '已归档' }
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      this._roundRect(ctx, W / 2 - 60, 200, 120, 36, 18)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '16px sans-serif'
      ctx.fillText(statusText[project.status] || '', W / 2, 224)

      // === 2. 进度概览 ===
      let y = headerH + 40
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('施工进度', 40, y)

      y += 30
      const stage = project.current_stage || 0
      const stageName = constants.MILESTONES[stage] ? constants.MILESTONES[stage].name : ''
      const progress = project.status === 'completed' ? 100 : Math.round(((stage + 1) / 8) * 100)

      // 进度条背景
      ctx.fillStyle = '#F0F0F0'
      this._roundRect(ctx, 40, y, W - 80, 20, 10)
      ctx.fill()

      // 进度条填充
      const fillW = Math.max(20, (W - 80) * progress / 100)
      const barGrad = ctx.createLinearGradient(40, 0, 40 + fillW, 0)
      barGrad.addColorStop(0, '#1A6D5C')
      barGrad.addColorStop(1, '#2A9D8F')
      ctx.fillStyle = barGrad
      this._roundRect(ctx, 40, y, fillW, 20, 10)
      ctx.fill()

      ctx.fillStyle = '#666666'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(progress + '%', W - 40, y + 15)
      ctx.textAlign = 'left'
      ctx.fillStyle = '#1A6D5C'
      ctx.font = '14px sans-serif'
      ctx.fillText(stageName || '未开始', 40, y + 40)

      // === 3. 文件统计 2x2 ===
      y += 70
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('文件统计', 40, y)

      y += 25
      const fs = stats.fileStats
      const gridData = [
        { label: '总文件', value: fs.total, color: '#1A6D5C' },
        { label: '已确认', value: fs.confirmed, color: '#52C41A' },
        { label: '待确认', value: fs.pending, color: '#FAAD14' },
        { label: '确认率', value: fs.confirmRate + '%', color: '#1890FF' }
      ]

      const cellW = (W - 100) / 2
      const cellH = 80
      gridData.forEach((item, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const cx = 40 + col * (cellW + 20)
        const cy = y + row * (cellH + 16)

        ctx.fillStyle = '#F8F8F8'
        this._roundRect(ctx, cx, cy, cellW, cellH, 12)
        ctx.fill()

        ctx.fillStyle = item.color
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(String(item.value), cx + cellW / 2, cy + 42)

        ctx.fillStyle = '#999999'
        ctx.font = '14px sans-serif'
        ctx.fillText(item.label, cx + cellW / 2, cy + 66)
      })

      // === 4. 问卷状态 ===
      ctx.textAlign = 'left'
      y += 2 * (cellH + 16) + 30
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('问卷状态', 40, y)

      y += 30
      const qsMap = { pending: '待填写', submitted: '已提交', reviewed: '已审阅', template: '模板已创建' }
      ctx.fillStyle = '#666666'
      ctx.font = '16px sans-serif'
      ctx.fillText(qsMap[stats.questionnaireStatus] || '暂无问卷', 40, y)

      // === 5. 最近动态 ===
      y += 40
      ctx.fillStyle = '#333333'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('最近动态', 40, y)

      y += 20
      const logs = stats.recentLogs || []
      if (logs.length > 0) {
        logs.slice(0, 5).forEach((log) => {
          y += 30
          ctx.fillStyle = '#333333'
          ctx.font = '15px sans-serif'
          const content = log.content.length > 25 ? log.content.substring(0, 25) + '...' : log.content
          ctx.fillText(content, 40, y)

          y += 22
          ctx.fillStyle = '#999999'
          ctx.font = '12px sans-serif'
          const author = log.author_info ? log.author_info.nickname : ''
          const dateStr = this._formatDate(log.created_at)
          ctx.fillText(author + ' · ' + dateStr, 40, y)

          y += 10
          ctx.strokeStyle = '#F0F0F0'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(40, y)
          ctx.lineTo(W - 40, y)
          ctx.stroke()
        })
      } else {
        y += 30
        ctx.fillStyle = '#CCCCCC'
        ctx.font = '14px sans-serif'
        ctx.fillText('暂无动态', 40, y)
      }

      // === 6. 页脚 ===
      ctx.fillStyle = '#F5F5F5'
      ctx.fillRect(0, H - 80, W, 80)
      ctx.fillStyle = '#CCCCCC'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      const now = new Date()
      const dateStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate()
      ctx.fillText('家造同频 · 项目报告 · ' + dateStr, W / 2, H - 40)

      this._finalize(canvas, W, H)
    })
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  },

  _finalize(canvas, width, height) {
    setTimeout(() => {
      wx.canvasToTempFilePath({
        canvas,
        width,
        height,
        success: (res) => {
          this.setData({ reportUrl: res.tempFilePath, generating: false })
        },
        fail: () => {
          this.setData({ generating: false })
          wx.showToast({ title: '生成失败', icon: 'none' })
        }
      })
    }, 300)
  },

  _formatDate(d) {
    if (!d) return ''
    const date = new Date(d)
    return (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0')
  },

  onSaveReport() {
    if (!this.data.reportUrl) return
    wx.saveImageToPhotosAlbum({
      filePath: this.data.reportUrl,
      success: () => {
        this.setData({ saved: true })
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: () => wx.showToast({ title: '保存失败，请授权', icon: 'none' })
    })
  },

  onShareAppMessage() {
    const project = this.data.stats ? this.data.stats.project : null
    return {
      title: '项目报告「' + (project ? project.name : '') + '」',
      path: '/pages/projects/detail/detail?id=' + this.data.projectId
    }
  }
})
