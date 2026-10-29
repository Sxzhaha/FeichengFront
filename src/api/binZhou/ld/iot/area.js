import request from '@/utils/request'

// 查询区域列表
export function listArea(query) {
  return request({
    url: '/binZhou/ld/iot/area/list',
    method: 'get',
    params: query
  })
}

// 根据园区ID查询区域列表
export function listAreaByParkId(parkId) {
  return request({
    url: '/binZhou/ld/iot/area/park/' + parkId,
    method: 'get'
  })
}

// 查询区域详情
export function getArea(areaId) {
  return request({
    url: '/binZhou/ld/iot/area/' + areaId,
    method: 'get'
  })
}

// 新增区域
export function addArea(data) {
  return request({
    url: '/binZhou/ld/iot/area',
    method: 'post',
    data: data
  })
}

// 修改区域
export function updateArea(data) {
  return request({
    url: '/binZhou/ld/iot/area',
    method: 'put',
    data: data
  })
}

// 删除区域
export function delArea(areaId) {
  return request({
    url: '/binZhou/ld/iot/area/' + areaId,
    method: 'delete'
  })
}