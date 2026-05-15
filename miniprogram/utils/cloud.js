/**
 * 云函数统一调用封装
 */

const callFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data
    }).then(res => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        const errMsg = (res.result && res.result.message) || '请求失败'
        reject(new Error(errMsg))
      }
    }).catch(err => {
      console.error(`云函数 [${name}] 调用失败:`, err)
      reject(err)
    })
  })
}

// user 模块
const userApi = {
  login: (data) => callFunction('user', { action: 'login', ...data }),
  getProfile: () => callFunction('user', { action: 'getProfile' }),
  updateProfile: (data) => callFunction('user', { action: 'updateProfile', ...data })
}

// project 模块
const projectApi = {
  create: (data) => callFunction('project', { action: 'create', ...data }),
  getInviteInfo: (inviteCode) => callFunction('project', { action: 'getInviteInfo', inviteCode }),
  join: (inviteCode) => callFunction('project', { action: 'join', inviteCode }),
  list: (data) => callFunction('project', { action: 'list', ...data }),
  getDetail: (projectId) => callFunction('project', { action: 'getDetail', projectId }),
  updateStage: (projectId, stageIndex) => callFunction('project', { action: 'updateStage', projectId, stageIndex })
}

// questionnaire 模块
const questionnaireApi = {
  submit: (data) => callFunction('questionnaire', { action: 'submit', ...data }),
  get: (projectId) => callFunction('questionnaire', { action: 'get', projectId }),
  markReviewed: (projectId) => callFunction('questionnaire', { action: 'markReviewed', projectId })
}

// file 模块
const fileApi = {
  save: (data) => callFunction('file', { action: 'save', ...data }),
  list: (data) => callFunction('file', { action: 'list', ...data }),
  getFile: (fileId) => callFunction('file', { action: 'getFile', fileId }),
  confirm: (fileId, actionType) => callFunction('file', { action: 'confirm', fileId, actionType }),
  getVersions: (projectId, category) => callFunction('file', { action: 'getVersions', projectId, category })
}

// inspiration 模块
const inspirationApi = {
  add: (data) => callFunction('inspiration', { action: 'add', ...data }),
  list: (projectId, page) => callFunction('inspiration', { action: 'list', projectId, page }),
  remove: (inspirationId) => callFunction('inspiration', { action: 'remove', inspirationId })
}

// progress 模块
const progressApi = {
  createLog: (data) => callFunction('progress', { action: 'createLog', ...data }),
  listLogs: (data) => callFunction('progress', { action: 'listLogs', ...data }),
  getLog: (logId) => callFunction('progress', { action: 'getLog', logId }),
  toggleLike: (logId) => callFunction('progress', { action: 'toggleLike', logId }),
  addComment: (logId, content) => callFunction('progress', { action: 'addComment', logId, content }),
  getComments: (logId, page) => callFunction('progress', { action: 'getComments', logId, page })
}

module.exports = {
  userApi,
  projectApi,
  questionnaireApi,
  fileApi,
  inspirationApi,
  progressApi
}
