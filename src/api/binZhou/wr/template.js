import request from '@/utils/request'

// 查询预警模板列表
export function listTemplate(query) {
  return request({
    url: '/wr/template/list',
    method: 'get',
    params: query
  })
}

// 查询预警模板详细
export function getTemplate(id) {
  return request({
    url: '/wr/template/' + id,
    method: 'get'
  })
}

// 新增预警模板
export function addTemplate(data) {
  return request({
    url: '/wr/template',
    method: 'post',
    data: data
  })
}

// 修改预警模板
export function updateTemplate(data) {
  return request({
    url: '/wr/template',
    method: 'put',
    data: data
  })
}

// 删除预警模板
export function delTemplate(id) {
  return request({
    url: '/wr/template/' + id,
    method: 'delete'
  })
}
