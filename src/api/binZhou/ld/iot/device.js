import request from '@/utils/request'

// 查询设备列表
export function listDevice(query) {
  return request({
    url: '/binZhou/ld/iot/device/list',
    method: 'get',
    params: query
  })
}

export function getDevice(deviceId) {
  return request({
    url: '/binZhou/ld/iot/device/' + deviceId,
    method: 'get'
  })
}

export function addDevice(data) {
  return request({
    url: '/binZhou/ld/iot/device',
    method: 'post',
    data: data
  })
}

export function updateDevice(data) {
  return request({
    url: '/binZhou/ld/iot/device',
    method: 'put',
    data: data
  })
}

export function delDevice(deviceId) {
  return request({
    url: '/binZhou/ld/iot/device/' + deviceId,
    method: 'delete'
  })
}

// 【模拟发送】
export function simulateReport(sn, payload) {
  return request({
    url: '/binZhou/ld/iot/api/report', 
    method: 'post',
    // 1. query 参数对应后端 @RequestParam String sn
    params: { 
      sn: sn 
    },
    // 2. data 对应后端 @RequestBody String bodyStr
    // 注意：因为 payload 在前端已经是 JSON 字符串了，直接传即可
    data: payload, 
    headers: {
      // 告诉后端发送的是 JSON 格式，Spring 会将其读取为 String
      'Content-Type': 'application/json' 
    }
  })
}

// 【新增：查询设备日志】用于验证是否收到了信息
export function listDeviceLog(query) {
  return request({
    url: '/binZhou/ld/iot/log/list', // 注意：后端需要对应实现这个Controller
    method: 'get',
    params: query
  })
}
// 获取萤石云AccessToken
export function getYs7Token() {
  return request({
    url: '/binZhou/ld/iot/device/getToken',
    method: 'get'
  })
}
// 抓拍
export function batchCapture(data) {
  return request({
    url: '/binZhou/ld/iot/device/batchCapture',
    method: 'post',
    data: data
  })
}