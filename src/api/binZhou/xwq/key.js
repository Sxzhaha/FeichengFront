import request from '@/utils/request'

// 查询密钥管理列表
export function listKey(query) {
  return request({
    url: '/xwq/key/list',
    method: 'get',
    params: query
  })
}

// 查询密钥管理详细
export function getKey(keyId) {
  return request({
    url: '/xwq/key/' + keyId,
    method: 'get'
  })
}

// 新增密钥管理
export function addKey(data) {
  return request({
    url: '/xwq/key',
    method: 'post',
    data: data
  })
}

// 修改密钥管理
export function updateKey(data) {
  return request({
    url: '/xwq/key',
    method: 'put',
    data: data
  })
}

// 删除密钥管理
export function delKey(keyId) {
  return request({
    url: '/xwq/key/' + keyId,
    method: 'delete'
  })
}
