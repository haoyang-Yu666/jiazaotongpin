const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'list':
      return handleList(openid, event)
    case 'getUnreadCount':
      return handleGetUnreadCount(openid)
    case 'markRead':
      return handleMarkRead(openid, event.notificationId)
    case 'markAllRead':
      return handleMarkAllRead(openid)
    case 'remove':
      return handleRemove(openid, event.notificationId)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleList(openid, event) {
  try {
    const page = event.page || 1
    const pageSize = event.pageSize || 10

    const countResult = await db.collection('jt_notifications')
      .where({ user_openid: openid })
      .count()

    const unreadResult = await db.collection('jt_notifications')
      .where({ user_openid: openid, is_read: false })
      .count()

    const { data: list } = await db.collection('jt_notifications')
      .where({ user_openid: openid })
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list,
        total: countResult.total,
        unreadCount: unreadResult.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleGetUnreadCount(openid) {
  try {
    const { total } = await db.collection('jt_notifications')
      .where({ user_openid: openid, is_read: false })
      .count()
    return { code: 0, data: { count: total } }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleMarkRead(openid, notificationId) {
  try {
    const { data: notification } = await db.collection('jt_notifications')
      .doc(notificationId)
      .get()

    if (!notification || notification.user_openid !== openid) {
      return { code: -1, message: '无权操作' }
    }

    await db.collection('jt_notifications').doc(notificationId).update({
      data: { is_read: true }
    })

    return { code: 0, data: null, message: '已标记已读' }
  } catch (err) {
    return { code: -1, message: '操作失败: ' + err.message }
  }
}

async function handleMarkAllRead(openid) {
  try {
    const { data: unread } = await db.collection('jt_notifications')
      .where({ user_openid: openid, is_read: false })
      .get()

    const tasks = unread.map(item =>
      db.collection('jt_notifications').doc(item._id).update({
        data: { is_read: true }
      })
    )
    await Promise.all(tasks)

    return { code: 0, data: null, message: '全部已读' }
  } catch (err) {
    return { code: -1, message: '操作失败: ' + err.message }
  }
}

async function handleRemove(openid, notificationId) {
  try {
    const { data: notification } = await db.collection('jt_notifications')
      .doc(notificationId)
      .get()

    if (!notification || notification.user_openid !== openid) {
      return { code: -1, message: '无权操作' }
    }

    await db.collection('jt_notifications').doc(notificationId).remove()
    return { code: 0, data: null, message: '已删除' }
  } catch (err) {
    return { code: -1, message: '删除失败: ' + err.message }
  }
}
