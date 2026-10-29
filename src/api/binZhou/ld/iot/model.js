import request from '@/utils/request'

// 查询物模型定义列表
export function listModel(query) {
  return request({
    url: '/binZhou/ld/iot/model/list',
    method: 'get',
    params: query
  })
}

// 查询物模型定义详细
export function getModel(modelId) {
  return request({
    url: '/binZhou/ld/iot/model/' + modelId,
    method: 'get'
  })
}

// 新增物模型定义
export function addModel(data) {
  return request({
    url: '/binZhou/ld/iot/model',
    method: 'post',
    data: data
  })
}

// 修改物模型定义
export function updateModel(data) {
  return request({
    url: '/binZhou/ld/iot/model',
    method: 'put',
    data: data
  })
}

// 删除物模型定义
export function delModel(modelId) {
  return request({
    url: '/binZhou/ld/iot/model/' + modelId,
    method: 'delete'
  })
}
