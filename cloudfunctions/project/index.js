const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  switch (event.action) {
    case 'create':
      return handleCreate(openid, event)
    case 'getInviteInfo':
      return handleGetInviteInfo(event.inviteCode)
    case 'join':
      return handleJoin(openid, event.inviteCode)
    case 'list':
      return handleList(openid, event)
    case 'getDetail':
      return handleGetDetail(event.projectId)
    case 'updateStage':
      return handleUpdateStage(openid, event.projectId, event.stageIndex)
    default:
      return { code: -1, message: '未知操作' }
  }
}

async function handleCreate(openid, event) {
  try {
    // 获取设计师信息
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    const designer = users[0]

    // 生成邀请码
    let inviteCode = generateInviteCode()
    let codeExists = true
    while (codeExists) {
      const { data: existing } = await db.collection('jt_projects')
        .where({ invite_code: inviteCode })
        .get()
      if (existing.length === 0) {
        codeExists = false
      } else {
        inviteCode = generateInviteCode()
      }
    }

    const project = {
      name: event.name,
      designer_id: designer._id,
      designer_openid: openid,
      designer_info: {
        nickname: designer.nickname,
        avatar: designer.avatar
      },
      client_id: '',
      client_openid: '',
      client_info: {
        nickname: '',
        avatar: ''
      },
      invite_code: inviteCode,
      community: event.community || '',
      address: event.address || '',
      area: event.area || '',
      style: event.style || '',
      budget: event.budget || '',
      status: 'waiting',
      current_stage: 0,
      created_at: db.serverDate(),
      updated_at: db.serverDate()
    }

    const result = await db.collection('jt_projects').add({ data: project })

    return {
      code: 0,
      data: { _id: result._id, invite_code: inviteCode, ...project },
      message: '创建成功'
    }
  } catch (err) {
    return { code: -1, message: '创建失败: ' + err.message }
  }
}

async function handleGetInviteInfo(inviteCode) {
  try {
    const { data: projects } = await db.collection('jt_projects')
      .where({ invite_code: inviteCode })
      .get()

    if (projects.length === 0) {
      return { code: -1, message: '邀请码无效' }
    }

    const project = projects[0]
    return {
      code: 0,
      data: {
        _id: project._id,
        name: project.name,
        community: project.community,
        area: project.area,
        style: project.style,
        designer_info: project.designer_info
      }
    }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleJoin(openid, inviteCode) {
  try {
    // 获取客户信息
    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0) {
      return { code: -1, message: '请先注册' }
    }

    const client = users[0]

    const { data: projects } = await db.collection('jt_projects')
      .where({ invite_code: inviteCode })
      .get()

    if (projects.length === 0) {
      return { code: -1, message: '邀请码无效' }
    }

    const project = projects[0]

    if (project.status !== 'waiting') {
      return { code: -1, message: '该项目已绑定客户' }
    }

    await db.collection('jt_projects').doc(project._id).update({
      data: {
        client_id: client._id,
        client_openid: openid,
        client_info: {
          nickname: client.nickname,
          avatar: client.avatar
        },
        status: 'active',
        updated_at: db.serverDate()
      }
    })

    // 通知设计师
    try {
      if (project.designer_openid) {
        await db.collection('jt_notifications').add({
          data: {
            user_openid: project.designer_openid,
            project_id: project._id,
            project_name: project.name,
            type: 'project_join',
            title: '客户已加入',
            content: (client.nickname || '客户') + ' 已加入项目「' + project.name + '」',
            related_id: project._id,
            is_read: false,
            created_at: db.serverDate()
          }
        })
      }
    } catch (e) {}

    return {
      code: 0,
      data: { project_id: project._id },
      message: '加入项目成功'
    }
  } catch (err) {
    return { code: -1, message: '加入失败: ' + err.message }
  }
}

async function handleList(openid, event) {
  try {
    const page = event.page || 1
    const pageSize = event.pageSize || 10
    const status = event.status
    const keyword = event.keyword || ''
    const sortBy = event.sortBy || 'updated_at'

    const { data: users } = await db.collection('jt_users')
      .where({ openid })
      .get()

    if (users.length === 0) {
      return { code: 0, data: { list: [], total: 0 } }
    }

    const user = users[0]
    const userId = user._id
    const role = event.role || user.role

    let whereCondition = {}
    if (role === 'designer') {
      whereCondition.designer_id = userId
    } else {
      whereCondition.client_id = userId
    }

    if (status) {
      whereCondition.status = status
    }

    if (keyword) {
      whereCondition.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }

    const countResult = await db.collection('jt_projects')
      .where(whereCondition)
      .count()

    const sortField = sortBy === 'created_at' ? 'created_at' : 'updated_at'
    const { data: list } = await db.collection('jt_projects')
      .where(whereCondition)
      .orderBy(sortField, 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list,
        total: countResult.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleGetDetail(projectId) {
  try {
    const { data: project } = await db.collection('jt_projects')
      .doc(projectId)
      .get()

    if (!project) {
      return { code: -1, message: '项目不存在' }
    }

    return { code: 0, data: project }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleUpdateStage(openid, projectId, stageIndex) {
  try {
    const { data: project } = await db.collection('jt_projects')
      .doc(projectId)
      .get()

    if (!project || project.designer_openid !== openid) {
      return { code: -1, message: '无权限操作' }
    }

    await db.collection('jt_projects').doc(projectId).update({
      data: {
        current_stage: stageIndex,
        updated_at: db.serverDate()
      }
    })

    // 检查是否完成最后一个阶段
    if (stageIndex >= 7) {
      await db.collection('jt_projects').doc(projectId).update({
        data: { status: 'completed' }
      })
    }

    return { code: 0, data: null, message: '阶段更新成功' }
  } catch (err) {
    return { code: -1, message: '更新失败: ' + err.message }
  }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
