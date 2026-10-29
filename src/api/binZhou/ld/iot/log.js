import request from '@/utils/request'

// 查询设备通信日志列表
export function listLog(query) {
  return request({
    url: '/binZhou/ld/iot/log/list',
    method: 'get',
    params: query
  })
}

// 查询设备通信日志详细
export function getLog(logId) {
  return request({
    url: '/binZhou/ld/iot/log/' + logId,
    method: 'get'
  })
}

// 新增设备通信日志
export function addLog(data) {
  return request({
    url: '/binZhou/ld/iot/log',
    method: 'post',
    data: data
  })
}

// 修改设备通信日志
export function updateLog(data) {
  return request({
    url: '/binZhou/ld/iot/log',
    method: 'put',
    data: data
  })
}

// 删除设备通信日志
export function delLog(logId) {
  return request({
    url: '/binZhou/ld/iot/log/' + logId,
    method: 'delete'
  })
}
