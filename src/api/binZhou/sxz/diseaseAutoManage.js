import request from '@/utils/request'

const baseUrl = '/sxz/disease-auto-manage'

export function getAutoManageSummary() {
  return request({ url: `${baseUrl}/summary`, method: 'get' })
}

export function listAutoManageTasks(params) {
  return request({ url: `${baseUrl}/tasks`, method: 'get', params })
}

export function getAutoManageTask(taskId) {
  return request({ url: `${baseUrl}/tasks/${taskId}`, method: 'get' })
}

export function addAutoManageTask(data) {
  return request({ url: `${baseUrl}/tasks`, method: 'post', data })
}

export function updateAutoManageTask(data) {
  return request({ url: `${baseUrl}/tasks`, method: 'put', data })
}

export function deleteAutoManageTasks(taskIds) {
  return request({ url: `${baseUrl}/tasks/${taskIds}`, method: 'delete' })
}

export function changeAutoManageTaskStatus(taskId, taskStatus) {
  return request({ url: `${baseUrl}/tasks/${taskId}/status`, method: 'put', data: { taskStatus } })
}

export function runAutoManageTask(taskId) {
  return request({ url: `${baseUrl}/tasks/${taskId}/run`, method: 'post' })
}

export function listAutoManageRuns(params) {
  return request({ url: `${baseUrl}/runs`, method: 'get', params })
}

export function listAutoManageItems(params) {
  return request({ url: `${baseUrl}/items`, method: 'get', params })
}

export function getAutoManageOptions(params) {
  return request({ url: `${baseUrl}/options`, method: 'get', params })
}
