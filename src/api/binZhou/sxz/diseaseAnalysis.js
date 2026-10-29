import request from '@/utils/request'

export function getDiseaseAnalysisDashboard(params) {
  return request({
    url: '/sxz/disease-analysis/dashboard',
    method: 'get',
    params
  })
}
