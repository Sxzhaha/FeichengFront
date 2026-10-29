import request from '@/utils/request'

// 查询园区未来天气预报趋势列表
export function listWeatherForecast(query) {
  return request({
    url: '/ld/weatherForecast/list',
    method: 'get',
    params: query
  })
}

// 查询园区未来天气预报趋势详细
export function getWeatherForecast(id) {
  return request({
    url: '/ld/weatherForecast/' + id,
    method: 'get'
  })
}

// 新增园区未来天气预报趋势
export function addWeatherForecast(data) {
  return request({
    url: '/ld/weatherForecast',
    method: 'post',
    data: data
  })
}

// 修改园区未来天气预报趋势
export function updateWeatherForecast(data) {
  return request({
    url: '/ld/weatherForecast',
    method: 'put',
    data: data
  })
}

// 删除园区未来天气预报趋势
export function delWeatherForecast(id) {
  return request({
    url: '/ld/weatherForecast/' + id,
    method: 'delete'
  })
}
