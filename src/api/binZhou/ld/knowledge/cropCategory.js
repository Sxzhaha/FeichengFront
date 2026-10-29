import request from '@/utils/request'

// 查询作物分类列表
export function listCropCategory(query) {
  return request({
    url: '/binZhou/ld/cropCategory/list',
    method: 'get',
    params: query
  })
}

// 查询作物分类详细
export function getCropCategory(id) {
  return request({
    url: '/binZhou/ld/cropCategory/' + id,
    method: 'get'
  })
}

// 新增作物分类
export function addCropCategory(data) {
  return request({
    url: '/binZhou/ld/cropCategory',
    method: 'post',
    data: data
  })
}

// 修改作物分类
export function updateCropCategory(data) {
  return request({
    url: '/binZhou/ld/cropCategory',
    method: 'put',
    data: data
  })
}

// 删除作物分类
export function delCropCategory(id) {
  return request({
    url: '/binZhou/ld/cropCategory/' + id,
    method: 'delete'
  })
}
