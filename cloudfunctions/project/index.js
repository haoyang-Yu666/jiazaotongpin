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
    case 'leave':
      return handleLeave(openid, event.projectId)
    case 'list':
      return handleList(openid, event)
    case 'getDetail':
      return handleGetDetail(event.projectId)
    case 'updateStage':
      return handleUpdateStage(openid, event.projectId, event.stageIndex)
    case 'getStats':
      return handleGetStats(event.projectId)
    case 'getQrCode':
      return handleGetQrCode(openid, event.projectId)
    // V3.0 项目管理
    case 'update':
      return handleUpdate(openid, event.projectId, event)
    case 'archive':
      return handleArchive(openid, event.projectId)
    case 'unarchive':
      return handleUnarchive(openid, event.projectId)
    case 'delete':
      return handleDelete(openid, event.projectId)
    // V3.0 项目内聊天
    case 'sendMessage':
      return handleSendMessage(openid, event)
    case 'getMessages':
      return handleGetMessages(openid, event)
    case 'markMessagesRead':
      return handleMarkMessagesRead(openid, event.projectId)
    case 'getUnreadMessageCount':
      return handleGetUnreadMessageCount(openid)
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

    // 禁止创建者加入自己的项目
    if (project.designer_openid === openid) {
      return { code: -1, message: '您是该项目的创建者，无需加入' }
    }

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

// 客户退出项目
async function handleLeave(openid, projectId) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project) {
      return { code: -1, message: '项目不存在' }
    }

    // 只有项目客户可以退出（设计师应使用删除）
    if (project.client_openid !== openid) {
      return { code: -1, message: '无权限操作' }
    }

    await db.collection('jt_projects').doc(projectId).update({
      data: {
        client_id: '',
        client_openid: '',
        client_info: { nickname: '', avatar: '' },
        status: 'waiting',
        updated_at: db.serverDate()
      }
    })

    // 通知设计师
    try {
      if (project.designer_openid) {
        await db.collection('jt_notifications').add({
          data: {
            user_openid: project.designer_openid,
            project_id: projectId,
            project_name: project.name,
            type: 'project_leave',
            title: '客户已退出',
            content: (project.client_info && project.client_info.nickname || '客户') + ' 已退出项目「' + project.name + '」',
            related_id: projectId,
            is_read: false,
            created_at: db.serverDate()
          }
        })
      }
    } catch (e) {}

    return { code: 0, data: null, message: '已退出项目' }
  } catch (err) {
    return { code: -1, message: '退出失败: ' + err.message }
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

async function handleGetStats(projectId) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project) {
      return { code: -1, message: '项目不存在' }
    }

    // 文件统计（使用 count 避免受 get 20条限制）
    const { total: fileTotal } = await db.collection('jt_design_files')
      .where({ project_id: projectId }).count()
    const { total: fileConfirmed } = await db.collection('jt_design_files')
      .where({ project_id: projectId, status: 'confirmed' }).count()
    const { total: filePending } = await db.collection('jt_design_files')
      .where({ project_id: projectId, status: 'pending' }).count()
    const { total: fileRejected } = await db.collection('jt_design_files')
      .where({ project_id: projectId, status: 'rejected' }).count()

    // 进度日志数
    const { total: logCount } = await db.collection('jt_progress_logs')
      .where({ project_id: projectId })
      .count()

    // 最近5条日志
    const { data: recentLogs } = await db.collection('jt_progress_logs')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc')
      .limit(5)
      .get()

    // 问卷状态
    const { data: questionnaires } = await db.collection('jt_questionnaires')
      .where({ project_id: projectId })
      .get()
    const questionnaireStatus = questionnaires.length > 0 ? questionnaires[0].status : ''

    return {
      code: 0,
      data: {
        project,
        fileStats: {
          total: fileTotal,
          confirmed: fileConfirmed,
          pending: filePending,
          rejected: fileRejected,
          confirmRate: fileTotal > 0 ? Math.round((fileConfirmed / fileTotal) * 100) : 0
        },
        logCount,
        recentLogs,
        questionnaireStatus
      }
    }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}

async function handleGetQrCode(openid, projectId) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project) {
      return { code: -1, message: '项目不存在' }
    }

    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: project.invite_code,
      page: 'pages/projects/invite/invite',
      width: 280,
      isHyaline: false
    })

    const uploadResult = await cloud.uploadFile({
      cloudPath: `qrcodes/${projectId}_${Date.now()}.png`,
      fileContent: result.buffer
    })

    return { code: 0, data: { fileID: uploadResult.fileID } }
  } catch (err) {
    return { code: -1, message: '生成二维码失败: ' + err.message }
  }
}

// ========== V3.0 项目管理 ==========

async function handleUpdate(openid, projectId, event) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project || project.designer_openid !== openid) {
      return { code: -1, message: '无权限操作' }
    }

    const allowedFields = ['name', 'community', 'area', 'style', 'budget', 'address']
    const updateData = { updated_at: db.serverDate() }
    for (const field of allowedFields) {
      if (event[field] !== undefined) {
        updateData[field] = event[field]
      }
    }

    await db.collection('jt_projects').doc(projectId).update({ data: updateData })
    return { code: 0, data: null, message: '更新成功' }
  } catch (err) {
    return { code: -1, message: '更新失败: ' + err.message }
  }
}

async function handleArchive(openid, projectId) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project || project.designer_openid !== openid) {
      return { code: -1, message: '无权限操作' }
    }
    if (project.status !== 'completed') {
      return { code: -1, message: '仅已完成的项目可归档' }
    }

    await db.collection('jt_projects').doc(projectId).update({
      data: { status: 'archived', updated_at: db.serverDate() }
    })
    return { code: 0, data: null, message: '归档成功' }
  } catch (err) {
    return { code: -1, message: '归档失败: ' + err.message }
  }
}

async function handleUnarchive(openid, projectId) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project || project.designer_openid !== openid) {
      return { code: -1, message: '无权限操作' }
    }
    if (project.status !== 'archived') {
      return { code: -1, message: '仅归档项目可恢复' }
    }

    await db.collection('jt_projects').doc(projectId).update({
      data: { status: 'completed', updated_at: db.serverDate() }
    })
    return { code: 0, data: null, message: '恢复成功' }
  } catch (err) {
    return { code: -1, message: '恢复失败: ' + err.message }
  }
}

async function handleDelete(openid, projectId) {
  try {
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project || project.designer_openid !== openid) {
      return { code: -1, message: '无权限操作' }
    }

    // 先删除关联评论（依赖日志ID，必须在日志删除前执行）
    try {
      const { data: logs } = await db.collection('jt_progress_logs')
        .where({ project_id: projectId }).get()
      for (const log of logs) {
        try {
          const { data: comments } = await db.collection('jt_comments').where({ log_id: log._id }).get()
          for (const comment of comments) {
            await db.collection('jt_comments').doc(comment._id).remove()
          }
        } catch (e) {}
      }
    } catch (e) {}

    // 再清理其他关联数据（每个集合独立容错）
    const collections = ['jt_design_files', 'jt_progress_logs', 'jt_questionnaires', 'jt_notifications', 'jt_inspirations', 'jt_messages']
    for (const col of collections) {
      try {
        const { data: records } = await db.collection(col).where({ project_id: projectId }).get()
        for (const record of records) {
          await db.collection(col).doc(record._id).remove()
        }
      } catch (e) {}
    }

    // 最后删除项目
    await db.collection('jt_projects').doc(projectId).remove()

    return { code: 0, data: null, message: '删除成功' }
  } catch (err) {
    return { code: -1, message: '删除失败: ' + err.message }
  }
}

// ========== V3.0 项目内聊天 ==========

async function handleSendMessage(openid, event) {
  try {
    const { projectId, type, content } = event

    // ========== 内容校验 ==========

    // 文本消息长度限制
    if (type !== 'image' && content && content.length > 500) {
      return { code: -1, message: '消息内容过长，最多500字' }
    }

    // 验证项目成员
    const { data: project } = await db.collection('jt_projects').doc(projectId).get()
    if (!project) {
      return { code: -1, message: '项目不存在' }
    }

    const isMember = project.designer_openid === openid || project.client_openid === openid
    if (!isMember) {
      return { code: -1, message: '非项目成员' }
    }

    // 获取发送者信息
    const { data: users } = await db.collection('jt_users').where({ openid }).get()
    if (users.length === 0) {
      return { code: -1, message: '用户不存在' }
    }
    const sender = users[0]

    // ========== 频率限制 ==========
    // 查询同一用户在该项目的最后一条消息，1秒内不允许重复发送
    const { data: recentMsgs } = await db.collection('jt_messages')
      .where({ project_id: projectId, sender_openid: openid })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()
    if (recentMsgs && recentMsgs.length > 0 && recentMsgs[0].created_at) {
      const lastTime = new Date(recentMsgs[0].created_at).getTime()
      const now = Date.now()
      if (now - lastTime < 1000) {
        return { code: -1, message: '发送过快，请稍后再试' }
      }
    }

    // ========== 内容安全审查 ==========
    if (type === 'image') {
      // 图片消息：下载云存储文件并审查
      try {
        const downloadRes = await cloud.downloadFile({ fileID: content })
        if (downloadRes && downloadRes.fileContent) {
          const checkRes = await cloud.openapi.security.imgSecCheck({
            media: {
              contentType: 'image/png',
              value: downloadRes.fileContent
            }
          })
          if (checkRes && checkRes.errCode !== 0) {
            return { code: -1, message: '图片包含违规内容，无法发送' }
          }
        }
      } catch (secErr) {
        // errCode 87014 表示内容违规
        if (secErr.errCode === 87014) {
          return { code: -1, message: '图片包含违规内容，无法发送' }
        }
        // 其他错误（如API不可用）不阻塞发送，记录并继续
        console.error('imgSecCheck error:', secErr)
      }
    } else {
      // 文本消息：审查文本内容
      if (content) {
        try {
          const checkRes = await cloud.openapi.security.msgSecCheck({ content })
          if (checkRes && checkRes.errCode !== 0) {
            return { code: -1, message: '消息包含违规内容，无法发送' }
          }
        } catch (secErr) {
          if (secErr.errCode === 87014) {
            return { code: -1, message: '消息包含违规内容，无法发送' }
          }
          console.error('msgSecCheck error:', secErr)
        }
      }
    }

    // ========== 写入消息 ==========
    const message = {
      project_id: projectId,
      sender_id: sender._id,
      sender_openid: openid,
      sender_info: { nickname: sender.nickname, avatar: sender.avatar },
      type: type || 'text',
      content,
      is_read: false,
      created_at: db.serverDate()
    }

    const result = await db.collection('jt_messages').add({ data: message })

    // 通知对方
    try {
      const receiverOpenid = project.designer_openid === openid ? project.client_openid : project.designer_openid
      if (receiverOpenid) {
        await db.collection('jt_notifications').add({
          data: {
            user_openid: receiverOpenid,
            project_id: projectId,
            project_name: project.name,
            type: 'new_message',
            title: '新消息',
            content: (sender.nickname || '用户') + '：' + (type === 'image' ? '[图片]' : content.substring(0, 30)),
            related_id: result._id,
            is_read: false,
            created_at: db.serverDate()
          }
        })
      }
    } catch (e) {}

    return { code: 0, data: { _id: result._id }, message: '发送成功' }
  } catch (err) {
    return { code: -1, message: '发送失败: ' + err.message }
  }
}

async function handleGetMessages(openid, event) {
  try {
    const { projectId, page = 1, pageSize = 20, afterTimestamp } = event

    let whereCondition = { project_id: projectId }
    if (afterTimestamp) {
      whereCondition.created_at = _.gt(new Date(afterTimestamp))
    }

    const { total } = await db.collection('jt_messages').where(whereCondition).count()

    let list = []
    if (afterTimestamp) {
      // 轮询新消息：按时间正序返回
      const { data } = await db.collection('jt_messages')
        .where(whereCondition)
        .orderBy('created_at', 'asc')
        .limit(pageSize)
        .get()
      list = data
    } else {
      // 分页加载：倒序取最新一页，再翻转
      const skip = Math.max(0, total - page * pageSize)
      const take = total - (page - 1) * pageSize
      const { data } = await db.collection('jt_messages')
        .where(whereCondition)
        .orderBy('created_at', 'desc')
        .skip(skip)
        .limit(Math.min(take, pageSize))
        .get()
      list = data.reverse()
    }

    // 获取未读数
    const { total: unreadCount } = await db.collection('jt_messages').where({
      project_id: projectId,
      sender_openid: _.neq(openid),
      is_read: false
    }).count()

    // hasMore: 是否还有更早的消息
    const oldestInList = list.length > 0 ? list[0] : null
    const hasOlder = oldestInList ? (page * pageSize < total) : false

    return {
      code: 0,
      data: { list, total, page, pageSize, hasMore: hasOlder, unreadCount }
    }
  } catch (err) {
    return { code: -1, message: '获取消息失败: ' + err.message }
  }
}

async function handleMarkMessagesRead(openid, projectId) {
  try {
    const { data: messages } = await db.collection('jt_messages').where({
      project_id: projectId,
      sender_openid: _.neq(openid),
      is_read: false
    }).get()

    for (const msg of messages) {
      await db.collection('jt_messages').doc(msg._id).update({
        data: { is_read: true }
      })
    }

    return { code: 0, data: { count: messages.length } }
  } catch (err) {
    return { code: -1, message: '标记失败: ' + err.message }
  }
}

async function handleGetUnreadMessageCount(openid) {
  try {
    // 先查用户参与的项目
    const { data: projects } = await db.collection('jt_projects')
      .where(_.or([
        { designer_openid: openid },
        { client_openid: openid }
      ]))
      .field({ _id: true })
      .get()

    const projectIds = projects.map(p => p._id)
    if (projectIds.length === 0) {
      return { code: 0, data: { total: 0 } }
    }

    const { total } = await db.collection('jt_messages').where({
      project_id: _.in(projectIds),
      sender_openid: _.neq(openid),
      is_read: false
    }).count()

    return { code: 0, data: { total } }
  } catch (err) {
    return { code: -1, message: '查询失败: ' + err.message }
  }
}
