import request from '@/utils/request'

// 查询园区列表
export function listPark(query) {
  return request({
    url: '/binZhou/ld/iot/park/list',
    method: 'get',
    params: query
  })
}

// 查询园区详情
export function getPark(parkId) {
  return request({
    url: '/binZhou/ld/iot/park/' + parkId,
    method: 'get'
  })
}

// 新增园区
export function addPark(data) {
  return request({
    url: '/binZhou/ld/iot/park',
    method: 'post',
    data: data
  })
}

// 修改园区
export function updatePark(data) {
  return request({
    url: '/binZhou/ld/iot/park',
    method: 'put',
    data: data
  })
}

// 删除园区
export function delPark(parkId) {
  return request({
    url: '/binZhou/ld/iot/park/' + parkId,
    method: 'delete'
  })
}