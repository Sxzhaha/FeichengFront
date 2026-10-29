import request from '@/utils/request'

// 查询病虫害识别结果列表
export function listDisease(query) {
  return request({
    url: '/xwq/disease/list',
    method: 'get',
    params: query
  })
}

// 查询病虫害识别结果详细
export function getDisease(diseaseId) {
  return request({
    url: '/xwq/disease/' + diseaseId,
    method: 'get'
  })
}

// 新增病虫害识别结果
export function addDisease(data) {
  return request({
    url: '/xwq/disease',
    method: 'post',
    data
  })
}

// 修改病虫害识别结果
export function updateDisease(data) {
  return request({
    url: '/xwq/disease',
    method: 'put',
    data
  })
}

// 删除病虫害识别结果
export function delDisease(diseaseId) {
  return request({
    url: '/xwq/disease/' + diseaseId,
    method: 'delete'
  })
}

// 根据图片ID识别病虫害
export function predictDiseaseByImage(data) {
  return request({
    url: '/xwq/disease/predictByImage',
    method: 'post',
    data,
    headers: {
      repeatSubmit: false
    },
    timeout: 60000
  })
}

// 查询待识别病虫害图片，读取 xwq_ai_image
export function listDiseaseImages(params) {
  return request({
    url: '/xwq/image/list',
    method: 'get',
    params: {
      ...params,
      imageAiType: 'disease'
    }
  })
}

// 查询病虫害识别结果，读取 xwq_ai_disease
export function listDiseaseResult(params) {
  return request({
    url: '/xwq/disease/list',
    method: 'get',
    params
  })
}