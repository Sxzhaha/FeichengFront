import request from '@/utils/request'

// 查询地图图层列表
export function listDataset(query) {
  return request({
    url: '/dxx/dataset/list',
    method: 'get',
    params: query
  })
}

// 查询地图图层详细
export function getDataset(datasetId) {
  return request({
    url: '/dxx/dataset/' + datasetId,
    method: 'get'
  })
}

// 新增地图图层
export function addDataset(data) {
  return request({
    url: '/dxx/dataset',
    method: 'post',
    data: data
  })
}

// 修改地图图层
export function updateDataset(data) {
  return request({
    url: '/dxx/dataset',
    method: 'put',
    data: data
  })
}

// 删除地图图层
export function delDataset(datasetId) {
  return request({
    url: '/dxx/dataset/' + datasetId,
    method: 'delete'
  })
}
