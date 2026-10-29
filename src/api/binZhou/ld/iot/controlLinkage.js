import request from '@/utils/request'

// 查询预警控制联动列表
export function listControlLinkage(query) {
  return request({
    url: '/ld/controlLinkage/list',
    method: 'get',
    params: query
  })
}

// 查询预警控制联动详细
export function getControlLinkage(id) {
  return request({
    url: '/ld/controlLinkage/' + id,
    method: 'get'
  })
}

// 新增预警控制联动
export function addControlLinkage(data) {
  return request({
    url: '/ld/controlLinkage',
    method: 'post',
    data: data
  })
}

// 修改预警控制联动
export function updateControlLinkage(data) {
  return request({
    url: '/ld/controlLinkage',
    method: 'put',
    data: data
  })
}

// 删除预警控制联动
export function delControlLinkage(id) {
  return request({
    url: '/ld/controlLinkage/' + id,
    method: 'delete'
  })
}
