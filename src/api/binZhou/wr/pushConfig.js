import request from '@/utils/request'

// 查询农情报推送配置列表
export function listPushConfig(query) {
  return request({
    url: '/wr/pushConfig/list',
    method: 'get',
    params: query
  })
}

// 查询农情报推送配置详细
export function getPushConfig(configId) {
  return request({
    url: '/wr/pushConfig/' + configId,
    method: 'get'
  })
}

// 新增农情报推送配置
export function addPushConfig(data) {
  return request({
    url: '/wr/pushConfig',
    method: 'post',
    data: data
  })
}

// 修改农情报推送配置
export function updatePushConfig(data) {
  return request({
    url: '/wr/pushConfig',
    method: 'put',
    data: data
  })
}

// 删除农情报推送配置
export function delPushConfig(configId) {
  return request({
    url: '/wr/pushConfig/' + configId,
    method: 'delete'
  })
}

// 查询我自己的配置
export function getMyConfig() {
  return request({
    url: '/wr/pushConfig/getLatestConfig', // 对应你在Controller里配的RequestMapping和GetMapping
    method: 'get'
  })
}

// 保存我自己的配置
export function saveMyConfig(data) {
  return request({
    url: '/wr/pushConfig/saveConfig',
    method: 'post',
    data: data
  })
}