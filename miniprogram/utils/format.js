/**
 * 格式化工具
 */

const format = {
  // 格式化时间为友好文本
  timeAgo(date) {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d

    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const week = 7 * day

    if (diff < minute) return '刚刚'
    if (diff < hour) return Math.floor(diff / minute) + '分钟前'
    if (diff < day) return Math.floor(diff / hour) + '小时前'
    if (diff < week) return Math.floor(diff / day) + '天前'

    return this.date(date)
  },

  // 格式化日期 YYYY-MM-DD
  date(date) {
    if (!date) return ''
    const d = new Date(date)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  // 格式化日期时间 YYYY-MM-DD HH:mm
  dateTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const dateStr = this.date(date)
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dateStr} ${h}:${min}`
  },

  // 格式化面积
  area(value) {
    if (!value) return ''
    return value + '㎡'
  },

  // 生成邀请码
  generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  },

  // 截断文本
  truncate(text, maxLen = 50) {
    if (!text) return ''
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
  }
}

module.exports = format
