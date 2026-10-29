import request from '@/utils/request'

// 查询摄像头定时抓拍任务列表
export function listCameraTask(query) {
  return request({
    url: '/binZhou/ld/iot/cameraTask/list',
    method: 'get',
    params: query
  })
}

// 查询摄像头定时抓拍任务详细
export function getCameraTask(taskId) {
  return request({
    url: '/binZhou/ld/iot/cameraTask/' + taskId,
    method: 'get'
  })
}

// 新增摄像头定时抓拍任务
export function addCameraTask(data) {
  return request({
    url: '/binZhou/ld/iot/cameraTask',
    method: 'post',
    data: data
  })
}

// 修改摄像头定时抓拍任务
export function updateCameraTask(data) {
  return request({
    url: '/binZhou/ld/iot/cameraTask',
    method: 'put',
    data: data
  })
}

// 删除摄像头定时抓拍任务
export function delCameraTask(taskId) {
  return request({
    url: '/binZhou/ld/iot/cameraTask/' + taskId,
    method: 'delete'
  })
}
