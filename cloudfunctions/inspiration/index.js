const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'add':
      return handleAdd(openid, event)
    case 'list':
      return handleList(event)
    case 'remove':
      return handleRemove(openid, event.inspirationId)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleAdd(openid, event) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()
    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    const record = {
      project_id: event.projectId,
      uploader_id: users[0]._id,
      uploader_openid: openid,
      uploader_role: users[0].role,
      uploader_name: users[0].nickname,
      images: event.images || [],
      description: event.description || '',
      created_at: db.serverDate()
    }

    const result = await db.collection('jt_inspirations').add({ data: record })

    return { code: 0, data: { _id: result._id }, message: '添加成功' }
  } catch (err) {
    return { code: -1, message: '添加失败: ' + err.message }
  }
}

async function handleList(event) {
  try {
    const page = event.page || 1
    const pageSize = event.pageSize || 10

    const countResult = await db.collection('jt_inspirations')
      .where({ project_id: event.projectId })
      .count()

    const { data: list } = await db.collection('jt_inspirations')
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

async function handleRemove(openid, inspirationId) {
  try {
    const { data: record } = await db.collection('jt_inspirations')
      .doc(inspirationId)
      .get()

    if (!record) {
      return { code: -1, message: '记录不存在' }
    }

    if (record.uploader_openid !== openid) {
      return { code: -1, message: '只能删除自己上传的内容' }
    }

    await db.collection('jt_inspirations').doc(inspirationId).remove()

    return { code: 0, data: null, message: '删除成功' }
  } catch (err) {
    return { code: -1, message: '删除失败: ' + err.message }
  }
}
