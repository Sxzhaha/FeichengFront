import request from '@/utils/request'

// 查询产品预警触发与历史处理记录列表
export function listWarnRecord(query) {
  return request({
    url: '/ld/warnRecord/list',
    method: 'get',
    params: query
  })
}

// 查询产品预警触发与历史处理记录详细
export function getWarnRecord(id) {
  return request({
    url: '/ld/warnRecord/' + id,
    method: 'get'
  })
}

// 新增产品预警触发与历史处理记录
export function addWarnRecord(data) {
  return request({
    url: '/ld/warnRecord',
    method: 'post',
    data: data
  })
}

// 修改产品预警触发与历史处理记录
export function updateWarnRecord(data) {
  return request({
    url: '/ld/warnRecord',
    method: 'put',
    data: data
  })
}

// 删除产品预警触发与历史处理记录
export function delWarnRecord(id) {
  return request({
    url: '/ld/warnRecord/' + id,
    method: 'delete'
  })
}
