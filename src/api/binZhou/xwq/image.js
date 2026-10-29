import request from '@/utils/request'

// 查询图片信息列表
export function listImage(query) {
  return request({
    url: '/xwq/image/list',
    method: 'get',
    params: query
  })
}

// 查询图片信息详细
export function getImage(imageId) {
  return request({
    url: '/xwq/image/' + imageId,
    method: 'get'
  })
}

// 新增图片信息
export function addImage(data) {
  return request({
    url: '/xwq/image',
    method: 'post',
    data: data
  })
}

// 修改图片信息
export function updateImage(data) {
  return request({
    url: '/xwq/image',
    method: 'put',
    data: data
  })
}

// 删除图片信息
export function delImage(imageId) {
  return request({
    url: '/xwq/image/' + imageId,
    method: 'delete'
  })
}

// 导出原始图片 ZIP
export function exportOriginalImages(query) {
  return request({
    url: '/xwq/image/exportOriginalImages',
    method: 'get',
    params: query,
    responseType: 'blob',
    timeout: 120000
  })
}

// 导出虫情识别结果图 ZIP
export function exportPestResultImages(query) {
  return request({
    url: '/xwq/image/exportPestResultImages',
    method: 'get',
    params: query,
    responseType: 'blob',
    timeout: 120000
  })
}
