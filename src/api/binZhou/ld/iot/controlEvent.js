import request from '@/utils/request'

// 查询控制事件下发记录列表
export function listControlEvent(query) {
  return request({
    url: '/ld/controlEvent/list',
    method: 'get',
    params: query
  })
}

// 查询控制事件下发记录详情
export function getControlEvent(eventId) {
  return request({
    url: '/ld/controlEvent/' + eventId,
    method: 'get'
  })
}

// 修改控制事件下发状态
export function changeControlEventStatus(eventId, status) {
  return request({
    url: '/ld/controlEvent',
    method: 'put',
    data: {
      eventId,
      status
    }
  })
}

// 删除控制事件下发记录
export function delControlEvent(eventId) {
  return request({
    url: '/ld/controlEvent/' + eventId,
    method: 'delete'
  })
}
