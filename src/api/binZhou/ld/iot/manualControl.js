import request from '@/utils/request'

// 查询手动控制下发记录列表
export function listManualControl(query) {
  return request({
    url: '/ld/manualControl/list',
    method: 'get',
    params: query
  })
}

// 查询手动控制下发记录详情
export function getManualControl(eventId) {
  return request({
    url: '/ld/manualControl/' + eventId,
    method: 'get'
  })
}

// 新增手动控制下发记录
export function addManualControl(data) {
  return request({
    url: '/ld/manualControl',
    method: 'post',
    data
  })
}

// 立即下发手动控制指令
export function sendManualControl(data) {
  return request({
    url: '/ld/manualControl/send',
    method: 'post',
    data
  })
}

// 修改手动控制下发记录
export function updateManualControl(data) {
  return request({
    url: '/ld/manualControl',
    method: 'put',
    data
  })
}

// 删除手动控制下发记录
export function delManualControl(eventId) {
  return request({
    url: '/ld/manualControl/' + eventId,
    method: 'delete'
  })
}
