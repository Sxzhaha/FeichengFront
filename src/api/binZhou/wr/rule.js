import request from '@/utils/request'

// 查询预警模板规则列表
export function listRule(query) {
  return request({
    url: '/wr/rule/list',
    method: 'get',
    params: query
  })
}

// 查询预警模板规则详细
export function getRule(id) {
  return request({
    url: '/wr/rule/' + id,
    method: 'get'
  })
}

// 新增预警模板规则
export function addRule(data) {
  return request({
    url: '/wr/rule',
    method: 'post',
    data: data
  })
}

// 修改预警模板规则
export function updateRule(data) {
  return request({
    url: '/wr/rule',
    method: 'put',
    data: data
  })
}

// 删除预警模板规则
export function delRule(id) {
  return request({
    url: '/wr/rule/' + id,
    method: 'delete'
  })
}
