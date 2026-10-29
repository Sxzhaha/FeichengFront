import request from '@/utils/request'

/**
 * =========================
 * 管理端接口
 * =========================
 */

// 管理员列表
export function listTask(query) {
  return request({
    url: '/ylm/task/list',
    method: 'get',
    params: query
  })
}

// 园区-地块-角落三级区域树
export async function listRegionTree() {
  return request({
    url: '/ylm/task/region/tree',
    method: 'get'
  })
}

// 生成农事任务编号
export function generateTaskNo() {
  return request({
    url: '/ylm/task/generate/taskNo',
    method: 'get'
  })
}


/**
 * =========================
 * 农户端接口（卡片流页面用）
 * =========================
 */

// 农户任务列表（卡片流）
export function listFarmerTask(query) {
  return request({
    url: '/ylm/task/farmer/list',
    method: 'get',
    params: query
  })
}

export function listMyFarmerTask(query) {
  return request({
    url: '/ylm/task/farmer/my/list',
    method: 'get',
    params: query
  })
}

// 鍐滄埛浠诲姟璇︽儏锛堜粎鏈汉锛?
export function getFarmerTask(id) {
  return request({
    url: '/ylm/task/farmer/' + id,
    method: 'get'
  })
}

// 农户新增本人农事记录
export function addFarmerTask(data) {
  return request({
    url: '/ylm/task/farmer',
    method: 'post',
    data
  })
}

export function delFarmerTask(id) {
  return request({
    url: '/ylm/task/farmer/' + id,
    method: 'delete'
  })
}

// 批量导入农事记录
export function importFarmerTask(data) {
  return request({
    url: '/ylm/task/farmer/import/data',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
    rawResult: true
  })
}

// 下载农事记录导入模板
export function downloadFarmerImportTemplate() {
  return request({
    url: '/ylm/task/farmer/import/template',
    method: 'get',
    responseType: 'blob',
    timeout: 60000,
    rawResponse: true
  })
}

// 导出农户端全部农事记录
export function exportFarmerTask(query) {
  return request({
    url: '/ylm/task/farmer/export',
    method: 'get',
    params: query,
    responseType: 'blob',
    timeout: 60000,
    rawResponse: true
  })
}

// 导出农户端当前账号农事记录
export function exportMyFarmerTask(query) {
  return request({
    url: '/ylm/task/farmer/my/export',
    method: 'get',
    params: query,
    responseType: 'blob',
    timeout: 60000,
    rawResponse: true
  })
}


/**
 * =========================
 * 通用任务接口
 * =========================
 */

// 查询任务详情
export function getTask(id) {
  return request({
    url: '/ylm/task/' + id,
    method: 'get'
  })
}

// 新增任务（管理员 / 系统创建）
export function addTask(data) {
  return request({
    url: '/ylm/task',
    method: 'post',
    data
  })
}

// 修改任务（管理员编辑）
export function updateTask(data) {
  return request({
    url: '/ylm/task',
    method: 'put',
    data
  })
}

// 删除任务
export function delTask(ids) {
  const idParam = Array.isArray(ids) ? ids.join(',') : ids
  return request({
    url: '/ylm/task/' + idParam,
    method: 'delete'
  })
}


/**
 * =========================
 * 农户行为接口（未来扩展）
 * =========================
 */

// 农户提交作业 / 完成任务
export function submitTask(data) {
  return request({
    url: '/ylm/task/submit',
    method: 'put',
    data
  })
}


/**
 * =========================
 * 导出
 * =========================
 */

export function exportTask(query) {
  return request({
    url: '/ylm/task/export',
    method: 'get',
    params: query,
    responseType: 'blob',
    timeout: 60000,
    rawResponse: true
  })
}
