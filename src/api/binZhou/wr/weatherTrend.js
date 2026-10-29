import request from '@/utils/request'

/**
 * 查询天气趋势数据
 *
 * @param {Object} params 查询参数
 * @param {number} params.parkId 园区ID
 * @param {number} params.historyDays 历史天数
 * @param {number} params.forecastDays 未来预报天数
 */
export function getWeatherTrend(params) {
  return request({
    url: '/binZhou/wr/weatherTrend',
    method: 'get',
    params
  })
}