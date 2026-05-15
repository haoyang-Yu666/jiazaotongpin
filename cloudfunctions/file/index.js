const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'save':
      return handleSave(openid, event)
    case 'list':
      return handleList(event)
    case 'getFile':
      return handleGetFile(event)
    case 'confirm':
      return handleConfirm(openid, event)
    case 'getVersions':
      return handleGetVersions(event)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleSave(openid, event) {
  try {
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()
    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    if (users[0].role !== 'designer') {
      return { code: -1, message: '仅设计师可上传文件' }
    }

    const fileRecord = {
      project_id: event.projectId,
      uploader_id: users[0]._id,
      uploader_openid: openid,
      title: event.title || '',
      description: event.description || '',
      file_type: event.fileType || 'image',
      file_ids: event.fileIds || [],
      category: event.category || 'other',
      version: event.version || 'V1',
      version_number: event.versionNumber || 1,
      status: 'pending',
      confirmations: [],
      created_at: db.serverDate()
    }

    const result = await db.collection('jt_design_files').add({ data: fileRecord })

    return { code: 0, data: { _id: result._id }, message: '文件上传成功' }
  } catch (err) {
    return { code: -1, message: '上传失败: ' + err.message }
  }
}

async function handleList(event) {
  try {
    const page = event.page || 1
    const pageSize = event.pageSize || 10
    const category = event.category

    let whereCondition = { project_id: event.projectId }
    if (category) {
      whereCondition.category = category
    }

    const countResult = await db.collection('jt_design_files')
      .where(whereCondition)
      .count()

    const { data: list } = await db.collection('jt_design_files')
      .where(whereCondition)
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

async function handleGetFile(event) {
  try {
    const { data: file } = await db.collection('jt_design_files')
      .doc(event.fileId)
      .get()

    return { code: 0, data: file }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleConfirm(openid, event) {
  try {
    const { data: file } = await db.collection('jt_design_files')
      .doc(event.fileId)
      .get()

    if (!file) {
      return { code: -1, message: '文件不存在' }
    }

    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    // 校验：只有项目的客户可以确认文件
    const { data: project } = await db.collection('jt_projects')
      .doc(file.project_id)
      .get()

    if (!project || project.client_openid !== openid) {
      return { code: -1, message: '无权操作，仅项目客户可确认文件' }
    }

    const confirmation = {
      confirmer_id: users[0]._id,
      action: event.actionType,
      timestamp: new Date()
    }

    const newStatus = event.actionType === 'confirmed' ? 'confirmed' : 'rejected'

    await db.collection('jt_design_files').doc(event.fileId).update({
      data: {
        status: newStatus,
        confirmations: _.push(confirmation)
      }
    })

    return { code: 0, data: null, message: event.actionType === 'confirmed' ? '已确认' : '已拒绝' }
  } catch (err) {
    return { code: -1, message: '操作失败: ' + err.message }
  }
}

async function handleGetVersions(event) {
  try {
    const { data: list } = await db.collection('jt_design_files')
      .where({
        project_id: event.projectId,
        category: event.category || _.exists(true)
      })
      .orderBy('version_number', 'desc')
      .field({
        title: true,
        version: true,
        version_number: true,
        status: true,
        created_at: true,
        file_type: true,
        file_ids: true
      })
      .get()

    return { code: 0, data: list }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}
