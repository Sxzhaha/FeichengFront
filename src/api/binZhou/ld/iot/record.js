import request from '@/utils/request'

// 查询抓拍图片记录列表
export function listRecord(query) {
  return request({
    url: '/binZhou/ld/iot/record/list',
    method: 'get',
    params: query
  })
}

// 查询抓拍图片记录详细
export function getRecord(id) {
  return request({
    url: '/binZhou/ld/iot/record/' + id,
    method: 'get'
  })
}

// 新增抓拍图片记录
export function addRecord(data) {
  return request({
    url: '/binZhou/ld/iot/record',
    method: 'post',
    data: data
  })
}

// 修改抓拍图片记录
export function updateRecord(data) {
  return request({
    url: '/binZhou/ld/iot/record',
    method: 'put',
    data: data
  })
}

// 删除抓拍图片记录
export function delRecord(id) {
  return request({
    url: '/binZhou/ld/iot/record/' + id,
    method: 'delete'
  })
}
