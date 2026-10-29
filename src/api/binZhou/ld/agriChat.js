import request from '@/utils/request'

// 获取历史会话列表 (包含对应的消息内容)
export function getSessionList() {
  return request({
    url: '/binZhou/ld/chat/list',
    method: 'get'
  })
}

// 创建新会话
export function createSession(data) {
  return request({
    url: '/binZhou/ld/chat/session',
    method: 'post',
    data: data
  })
}

// 更新会话 (如修改标题)
export function updateSession(data) {
  return request({
    url: '/binZhou/ld/chat/session',
    method: 'put',
    data: data
  })
}

// 删除会话
export function deleteSession(sessionId) {
  return request({
    url: '/binZhou/ld/chat/session/' + sessionId,
    method: 'delete'
  })
}

// 保存一轮对话记录
export function saveChatRound(data) {
  return request({
    url: '/binZhou/ld/chat/saveRound',
    method: 'post',
    data: data
  })
}

// === 新增：调用若依自带的通用上传接口 ===
export function uploadImage(data) {
  return request({
    url: '/common/upload',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}