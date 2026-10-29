import request from '@/utils/request'

export function listDiseaseImages(query) {
  return request({
    url: '/sxz/disease-images/list',
    method: 'get',
    params: query
  })
}
