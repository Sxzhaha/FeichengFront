import request from '@/utils/request'

// 查询虫情识别结果列表
export function listPest(query) {
  return request({
    url: '/xwq/pest/list',
    method: 'get',
    params: query
  })
}

// 查询虫情识别结果详细
export function getPest(pestId) {
  return request({
    url: '/xwq/pest/' + pestId,
    method: 'get'
  })
}

// 新增虫情识别结果
export function addPest(data) {
  return request({
    url: '/xwq/pest',
    method: 'post',
    data: data
  })
}

// 修改虫情识别结果
export function updatePest(data) {
  return request({
    url: '/xwq/pest',
    method: 'put',
    data: data
  })
}

// 删除虫情识别结果
export function delPest(pestId) {
  return request({
    url: '/xwq/pest/' + pestId,
    method: 'delete'
  })
}

// 根据数据库中的图片ID识别虫情
export function predictPestByImage(data) {
  return request({
    url: '/xwq/pest/predictByImage',
    method: 'post',
    data,
    headers: {
      repeatSubmit: false
    },
    timeout: 60000
  })
}

// 识别临时上传图片。
// 模型识别成功后，后端才在同一事务中写入图片表、记录表和虫情结果表。
export function predictUploadedPest(data) {
  return request({
    url: '/xwq/pest/predictUploadedImage',
    method: 'post',
    data,
    headers: {
      repeatSubmit: false
    },
    timeout: 120000
  })
}

// 查询待识别图片，读取 xwq_ai_image
export function listPestImages(params) {
  return request({
    url: '/xwq/image/list',
    method: 'get',
    params: {
      ...params,
      imageAiType: 'pest'
    }
  })
}

// 查询虫情识别结果，读取 xwq_ai_pest
export function listPestResult(params) {
  return request({
    url: '/xwq/pest/list',
    method: 'get',
    params
  })
}

// 根据勾选记录或当前筛选条件，由后端读取真实历史数据并生成报告文本
export function generatePestReportText(data) {
  return request({
    url: '/xwq/pest/generateReportText',
    method: 'post',
    data,
    headers: {
      repeatSubmit: false
    },
    timeout: 120000
  })
}

// 基于天气预测未来虫情趋势
export function predictPestTrend(params) {
  return request({
    url: '/xwq/pest/predict',
    method: 'get',
    params,
    timeout: 60000
  })
}
