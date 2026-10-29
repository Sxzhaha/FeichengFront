import request from '@/utils/request'

export function getDiseaseReportSummary(params) {
  return request({
    url: '/sxz/disease-report/summary',
    method: 'get',
    params
  })
}
