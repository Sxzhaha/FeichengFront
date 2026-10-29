import request from '@/utils/request'

// 查询极端天气突发预警与防灾建议列表
export function listWeatherWarn(query) {
  return request({
    url: '/ld/weatherWarn/list',
    method: 'get',
    params: query
  })
}

// 查询极端天气突发预警与防灾建议详细
export function getWeatherWarn(id) {
  return request({
    url: '/ld/weatherWarn/' + id,
    method: 'get'
  })
}

// 新增极端天气突发预警与防灾建议
export function addWeatherWarn(data) {
  return request({
    url: '/ld/weatherWarn',
    method: 'post',
    data: data
  })
}

// 修改极端天气突发预警与防灾建议
export function updateWeatherWarn(data) {
  return request({
    url: '/ld/weatherWarn',
    method: 'put',
    data: data
  })
}

// 删除极端天气突发预警与防灾建议
export function delWeatherWarn(id) {
  return request({
    url: '/ld/weatherWarn/' + id,
    method: 'delete'
  })
}
