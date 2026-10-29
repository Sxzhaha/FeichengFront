import request from '@/utils/request'

// 查询物候期识别结果列表
export function listPhenology(query) {
  return request({
    url: '/xwq/phenology/list',
    method: 'get',
    params: query
  })
}
// 查询物候期识别工作台关联历史记录
export function listPhenologyRecognition(query) {
  return request({
    url: '/xwq/phenology/recognition/list',
    method: 'get',
    params: query
  })
}
// 查询物候期识别结果详细信息
export function getPhenology(phenologyId) {
  return request({
    url: '/xwq/phenology/' + phenologyId,
    method: 'get'
  })
}

// 新增物候期识别结果
export function addPhenology(data) {
  return request({
    url: '/xwq/phenology',
    method: 'post',
    data: data
  })
}

// 修改物候期识别结果
export function updatePhenology(data) {
  return request({
    url: '/xwq/phenology',
    method: 'put',
    data: data
  })
}

// 删除物候期识别结果
export function delPhenology(phenologyIds) {
  return request({
    url: '/xwq/phenology/' + phenologyIds,
    method: 'delete'
  })
}

// 导出物候期识别结果
export function exportPhenology(query) {
  return request({
    url: '/xwq/phenology/export',
    method: 'post',
    params: query,
    responseType: 'blob'
  })
}

// 调用物候期识别模型
export function predictPhenologyByImage(data) {
  return request({
    url: '/xwq/phenology/predict',
    method: 'post',
    data: data,
    timeout: 120000
  })
}

export function listWorkspaceHidden() {
  return request({ url: '/xwq/phenology/workspace/hidden', method: 'get' })
}

export function hideWorkspaceItems(data) {
  return request({ url: '/xwq/phenology/workspace/hide', method: 'post', data })
}

export function restoreWorkspaceItem(targetType, targetId) {
  return request({
    url: `/xwq/phenology/workspace/hidden/${targetType}/${targetId}`,
    method: 'delete'
  })
}
