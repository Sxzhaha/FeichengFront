import request from '@/utils/request'

export function listDiseaseAutoTasks(params) {
  return request({
    url: '/sxz/disease-auto-task/list',
    method: 'get',
    params
  })
}

export function getDiseaseAutoTask(taskId) {
  return request({
    url: `/sxz/disease-auto-task/${taskId}`,
    method: 'get'
  })
}

export function addDiseaseAutoTask(data) {
  return request({
    url: '/sxz/disease-auto-task',
    method: 'post',
    data
  })
}

export function updateDiseaseAutoTask(data) {
  return request({
    url: '/sxz/disease-auto-task',
    method: 'put',
    data
  })
}

export function deleteDiseaseAutoTask(taskIds) {
  return request({
    url: `/sxz/disease-auto-task/${taskIds}`,
    method: 'delete'
  })
}

export function changeDiseaseAutoTaskStatus(taskId, taskStatus) {
  return request({
    url: `/sxz/disease-auto-task/${taskId}/status`,
    method: 'put',
    data: { taskStatus }
  })
}

export function runDiseaseAutoTask(taskId) {
  return request({
    url: `/sxz/disease-auto-task/${taskId}/run`,
    method: 'post'
  })
}

export function listDiseaseAutoTaskRuns(taskId, params) {
  return request({
    url: `/sxz/disease-auto-task/${taskId}/runs`,
    method: 'get',
    params
  })
}

export function listDiseaseAutoTaskRunItems(runId, params) {
  return request({
    url: `/sxz/disease-auto-task/runs/${runId}/items`,
    method: 'get',
    params
  })
}

export function getDiseaseAutoTaskSummary() {
  return request({
    url: '/sxz/disease-auto-task/summary',
    method: 'get'
  })
}

export function listDiseaseAutoTaskResults(params) {
  return request({
    url: '/sxz/disease-auto-task/results',
    method: 'get',
    params
  })
}

export function getDiseaseAutoTaskResult(itemId) {
  return request({
    url: `/sxz/disease-auto-task/results/${itemId}`,
    method: 'get'
  })
}

export function getDiseaseAutoTaskOptions(params) {
  return request({
    url: '/sxz/disease-auto-task/options',
    method: 'get',
    params
  })
}
