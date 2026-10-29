import request from '@/utils/request'

// 获取首页统计数据 - 与现有API风格保持一致
export function getHomeStatistics() {
  return request({
    url: '/binZhou/ld/knowledge/statistics/home',
    method: 'get'
  })
}

// 获取详细统计数据（按作物分类）
export function getDetailedStatistics() {
  return request({
    url: '/binZhou/ld/knowledge/statistics/detailed',
    method: 'get'
  })
}

// 获取作物品种统计
export function getCropVarietyStatistics() {
  return request({
    url: '/binZhou/ld/knowledge/statistics/variety',
    method: 'get'
  })
}

// 获取病虫害统计
export function getPestDiseaseStatistics() {
  return request({
    url: '/binZhou/ld/knowledge/statistics/pestdisease',
    method: 'get'
  })
}