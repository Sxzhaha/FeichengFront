import request from '@/utils/request'

// 查询摄像头预置点列表
export function listCameraPreset(query) {
  return request({
    url: '/binZhou/ld/iot/cameraPreset/list',
    method: 'get',
    params: query
  })
}

// 查询摄像头预置点详细
export function getCameraPreset(deviceId) {
  return request({
    url: '/binZhou/ld/iot/cameraPreset/' + deviceId,
    method: 'get'
  })
}

// 新增摄像头预置点
export function addCameraPreset(data) {
  return request({
    url: '/binZhou/ld/iot/cameraPreset',
    method: 'post',
    data: data
  })
}

// 修改摄像头预置点
export function updateCameraPreset(data) {
  return request({
    url: '/binZhou/ld/iot/cameraPreset',
    method: 'put',
    data: data
  })
}

// 删除摄像头预置点
export function delCameraPreset(deviceId) {
  return request({
    url: '/binZhou/ld/iot/cameraPreset/' + deviceId,
    method: 'delete'
  })
}
