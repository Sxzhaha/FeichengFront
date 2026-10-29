import request from '@/utils/request'

// 查询预警记录列表
export function listWarningRecord(query) {
  return request({
    url: '/wr/warningRecord/list',
    method: 'get',
    params: query
  })
}

// 查询预警记录详细
export function getWarningRecord(id) {
  return request({
    url: '/wr/warningRecord/' + id,
    method: 'get'
  })
}

// 新增预警记录
export function addWarningRecord(data) {
  return request({
    url: '/wr/warningRecord',
    method: 'post',
    data: data
  })
}

// 修改预警记录
export function updateWarningRecord(data) {
  return request({
    url: '/wr/warningRecord',
    method: 'put',
    data: data
  })
}

// 删除预警记录
export function delWarningRecord(id) {
  return request({
    url: '/wr/warningRecord/' + id,
    method: 'delete'
  })
}
