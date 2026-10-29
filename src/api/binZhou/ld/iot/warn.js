import request from '@/utils/request'

// 查询预警列表
export function listWarn(query) {
  return request({
    url: '/binZhou/ld/iot/warn/list',
    method: 'get',
    params: query
  })
}

// 查询预警详细
export function getWarn(warnId) {
  return request({
    url: '/binZhou/ld/iot/warn/' + warnId,
    method: 'get'
  })
}

// 新增预警
export function addWarn(data) {
  return request({
    url: '/binZhou/ld/iot/warn',
    method: 'post',
    data: data
  })
}

// 修改预警
export function updateWarn(data) {
  return request({
    url: '/binZhou/ld/iot/warn',
    method: 'put',
    data: data
  })
}

// 删除预警
export function delWarn(warnId) {
  return request({
    url: '/binZhou/ld/iot/warn/' + warnId,
    method: 'delete'
  })
}
