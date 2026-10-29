import request from '@/utils/request'

// 查询预警任务列表
export function listTask(query) {
  return request({
    url: '/wr/task/list',
    method: 'get',
    params: query
  })
}

// 查询预警任务详细
export function getTask(id) {
  return request({
    url: '/wr/task/' + id,
    method: 'get'
  })
}

// 新增预警任务
export function addTask(data) {
  return request({
    url: '/wr/task',
    method: 'post',
    data: data
  })
}

// 修改预警任务
export function updateTask(data) {
  return request({
    url: '/wr/task',
    method: 'put',
    data: data
  })
}

// 删除预警任务
export function delTask(id) {
  return request({
    url: '/wr/task/' + id,
    method: 'delete'
  })
}
