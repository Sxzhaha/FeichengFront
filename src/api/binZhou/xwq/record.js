import request from '@/utils/request'

// 查询识别记录列表
export function listRecord(query) {
  return request({
    url: '/xwq/record/list',
    method: 'get',
    params: query
  })
}

// 查询识别记录详细
export function getRecord(recordId) {
  return request({
    url: '/xwq/record/' + recordId,
    method: 'get'
  })
}

// 新增识别记录
export function addRecord(data) {
  return request({
    url: '/xwq/record',
    method: 'post',
    data: data
  })
}

// 修改识别记录
export function updateRecord(data) {
  return request({
    url: '/xwq/record',
    method: 'put',
    data: data
  })
}

// 删除识别记录
export function delRecord(recordId) {
  return request({
    url: '/xwq/record/' + recordId,
    method: 'delete'
  })
}
