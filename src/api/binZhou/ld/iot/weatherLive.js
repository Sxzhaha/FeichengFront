import request from '@/utils/request'

// 查询园区实时与当天天气实况记录列表
export function listWeatherLive(query) {
  return request({
    url: '/ld/weatherLive/list',
    method: 'get',
    params: query
  })
}

// 查询园区实时与当天天气实况记录详细
export function getWeatherLive(id) {
  return request({
    url: '/ld/weatherLive/' + id,
    method: 'get'
  })
}

// 新增园区实时与当天天气实况记录
export function addWeatherLive(data) {
  return request({
    url: '/ld/weatherLive',
    method: 'post',
    data: data
  })
}

// 修改园区实时与当天天气实况记录
export function updateWeatherLive(data) {
  return request({
    url: '/ld/weatherLive',
    method: 'put',
    data: data
  })
}

// 删除园区实时与当天天气实况记录
export function delWeatherLive(id) {
  return request({
    url: '/ld/weatherLive/' + id,
    method: 'delete'
  })
}

// 手动同步抓取所有园区的实时天气数据
export function syncLiveWeather() {
  return request({
    url: '/ld/weatherLive/syncLive',
    method: 'get'
  })
}

// 手动同步抓取所有园区未来七天的天气预报数据
export function syncForecastWeather() {
  return request({
    url: '/ld/weatherLive/syncForecast',
    method: 'get'
  })
}

