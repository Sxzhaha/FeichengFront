import request from '@/utils/request'

// 查询品种信息列表
export function listCropVariety(query) {
  return request({
    url: '/binZhou/ld/cropVariety/list',
    method: 'get',
    params: query
  })
}

// 查询品种信息详细
export function getCropVariety(id) {
  return request({
    url: '/binZhou/ld/cropVariety/' + id,
    method: 'get'
  })
}

// 新增品种信息
export function addCropVariety(data) {
  return request({
    url: '/binZhou/ld/cropVariety',
    method: 'post',
    data: data
  })
}

// 修改品种信息
export function updateCropVariety(data) {
  return request({
    url: '/binZhou/ld/cropVariety',
    method: 'put',
    data: data
  })
}

// 删除品种信息
export function delCropVariety(id) {
  return request({
    url: '/binZhou/ld/cropVariety/' + id,
    method: 'delete'
  })
}
