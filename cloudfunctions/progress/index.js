const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'createLog':
      return handleCreateLog(openid, event)
    case 'listLogs':
      return handleListLogs(event)
    case 'getLog':
      return handleGetLog(event)
    case 'toggleLike':
      return handleToggleLike(openid, event.logId)
    case 'addComment':
      return handleAddComment(openid, event)
    case 'getComments':
      return handleGetComments(event)
    case 'deleteLog':
      return handleDeleteLog(openid, event)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleCreateLog(openid, event) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()
    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    if (users[0].role !== 'designer') {
      return { code: -1, message: '仅设计师可发布进度日志' }
    }

    const log = {
      project_id: event.projectId,
      author_id: users[0]._id,
      author_openid: openid,
      author_info: {
        nickname: users[0].nickname,
        avatar: users[0].avatar
      },
      milestone_id: event.milestoneId || '',
      content: event.content || '',
      images: event.images || [],
      likes: [],
      comment_count: 0,
      created_at: db.serverDate()
    }

    const result = await db.collection('jt_progress_logs').add({ data: log })

    // 通知客户
    try {
      const { data: project } = await db.collection('jt_projects').doc(event.projectId).get()
      if (project && project.client_openid) {
        await db.collection('jt_notifications').add({
          data: {
            user_openid: project.client_openid,
            project_id: event.projectId,
            project_name: project.name,
            type: 'progress_publish',
            title: '新进度发布',
            content: '设计师发布了新的施工进度',
            related_id: result._id,
            is_read: false,
            created_at: db.serverDate()
          }
        })
      }
    } catch (e) {}

    return { code: 0, data: { _id: result._id }, message: '发布成功' }
  } catch (err) {
    return { code: -1, message: '发布失败: ' + err.message }
  }
}

async function handleListLogs(event) {
  try {
    const page = event.page || 1
    const pageSize = event.pageSize || 10

    const countResult = await db.collection('jt_progress_logs')
      .where({ project_id: event.projectId })
      .count()

    const { data: list } = await db.collection('jt_progress_logs')
      .where({ project_id: event.projectId })
      .orderBy('created_at', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: { list, total: countResult.total, page, pageSize }
    }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleGetLog(event) {
  try {
    const { data: log } = await db.collection('jt_progress_logs')
      .doc(event.logId)
      .get()

    return { code: 0, data: log }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleToggleLike(openid, logId) {
  try {
    const { data: log } = await db.collection('jt_progress_logs')
      .doc(logId)
      .get()

    if (!log) {
      return { code: -1, message: '日志不存在' }
    }

    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    const userId = users[0]._id
    const hasLiked = log.likes && log.likes.includes(userId)

    if (hasLiked) {
      await db.collection('jt_progress_logs').doc(logId).update({
        data: { likes: _.pull(userId) }
      })
      return { code: 0, data: { liked: false }, message: '取消点赞' }
    } else {
      await db.collection('jt_progress_logs').doc(logId).update({
        data: { likes: _.push(userId) }
      })
      return { code: 0, data: { liked: true }, message: '点赞成功' }
    }
  } catch (err) {
    return { code: -1, message: '操作失败: ' + err.message }
  }
}

async function handleAddComment(openid, event) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()
    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    const comment = {
      log_id: event.logId,
      author_id: users[0]._id,
      author_openid: openid,
      author_info: {
        nickname: users[0].nickname,
        avatar: users[0].avatar
      },
      content: event.content,
      created_at: db.serverDate()
    }

    const result = await db.collection('jt_comments').add({ data: comment })

    await db.collection('jt_progress_logs').doc(event.logId).update({
      data: { comment_count: _.inc(1) }
    })

    return { code: 0, data: { _id: result._id }, message: '评论成功' }
  } catch (err) {
    return { code: -1, message: '评论失败: ' + err.message }
  }
}

async function handleGetComments(event) {
  try {
    const page = event.page || 1
    const pageSize = event.pageSize || 20

    const { data: list } = await db.collection('jt_comments')
      .where({ log_id: event.logId })
      .orderBy('created_at', 'asc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { code: 0, data: { list, page, pageSize } }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleDeleteLog(openid, event) {
  try {
    const logId = event.logId
    if (!logId) {
      return { code: -1, message: '缺少日志ID' }
    }

    // 查询用户
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()
    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    // 查询日志
    const { data: log } = await db.collection('jt_progress_logs')
      .doc(logId)
      .get()
    if (!log) {
      return { code: -1, message: '日志不存在' }
    }

    // 权限校验：只有作者本人或对应项目的设计师可删除
    const { data: project } = await db.collection('jt_projects')
      .doc(log.project_id)
      .get()

    const isAuthor = log.author_openid === openid
    const isProjectDesigner = project && project.designer_openid === openid

    if (!isAuthor && !isProjectDesigner) {
      return { code: -1, message: '无权删除此日志' }
    }

    // 删除图片（如有）
    if (log.images && log.images.length > 0) {
      try {
        await cloud.deleteFile({ fileList: log.images })
      } catch (e) {
        console.error('删除进度图片失败:', e)
      }
    }

    // 删除关联评论
    try {
      await db.collection('jt_comments')
        .where({ log_id: logId })
        .remove()
    } catch (e) {
      console.error('删除进度评论失败:', e)
    }

    // 删除日志
    await db.collection('jt_progress_logs').doc(logId).remove()

    return { code: 0, data: null, message: '日志已删除' }
  } catch (err) {
    return { code: -1, message: '删除失败: ' + err.message }
  }
}
