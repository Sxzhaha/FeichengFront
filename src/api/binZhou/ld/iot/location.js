import request from '@/utils/request'

// 查询位置列表
export function listLocation(query) {
  return request({
    url: '/binZhou/ld/iot/location/list',
    method: 'get',
    params: query
  })
}

// 根据区域ID查询位置列表
export function listLocationByAreaId(areaId) {
  return request({
    url: '/binZhou/ld/iot/location/area/' + areaId,
    method: 'get'
  })
}

// 查询位置详情
export function getLocation(locationId) {
  return request({
    url: '/binZhou/ld/iot/location/' + locationId,
    method: 'get'
  })
}

// 新增位置
export function addLocation(data) {
  return request({
    url: '/binZhou/ld/iot/location',
    method: 'post',
    data: data
  })
}

// 修改位置
export function updateLocation(data) {
  return request({
    url: '/binZhou/ld/iot/location',
    method: 'put',
    data: data
  })
}

// 删除位置
export function delLocation(locationId) {
  return request({
    url: '/binZhou/ld/iot/location/' + locationId,
    method: 'delete'
  })
}