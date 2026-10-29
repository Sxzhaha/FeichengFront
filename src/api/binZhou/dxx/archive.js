import request from '@/utils/request'

// 查询GeoJSON存档列表
export function listArchive(query) {
  return request({
    url: '/dxx/archive/list',
    method: 'get',
    params: query
  })
}

// 查询GeoJSON存档详细
export function getArchive(archiveId) {
  return request({
    url: '/dxx/archive/' + archiveId,
    method: 'get'
  })
}

// 新增GeoJSON存档
export function addArchive(data) {
  return request({
    url: '/dxx/archive',
    method: 'post',
    data: data
  })
}

// 修改GeoJSON存档
export function updateArchive(data) {
  return request({
    url: '/dxx/archive',
    method: 'put',
    data: data
  })
}

// 删除GeoJSON存档
export function delArchive(archiveId, deleteSourceFile = false) {
  return request({
    url: '/dxx/archive/' + archiveId,
    method: 'delete',
    params: {
      deleteSourceFile
    }
  })
}

// 读取存档关联的 GeoJSON 文件
export function getArchiveGeojson(filePath) {
  return request({
    url: filePath,
    method: 'get',
    timeout: 30000
  })
}
