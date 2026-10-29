import request from '@/utils/request'

// 查询物模型产品预警规则配置列表
export function listWarnConfig(query) {
  return request({
    url: '/ld/warnConfig/list',
    method: 'get',
    params: query
  })
}

// 查询物模型产品预警规则配置详细
export function getWarnConfig(id) {
  return request({
    url: '/ld/warnConfig/' + id,
    method: 'get'
  })
}

// 新增物模型产品预警规则配置
export function addWarnConfig(data) {
  return request({
    url: '/ld/warnConfig',
    method: 'post',
    data: data
  })
}

// 修改物模型产品预警规则配置
export function updateWarnConfig(data) {
  return request({
    url: '/ld/warnConfig',
    method: 'put',
    data: data
  })
}

// 删除物模型产品预警规则配置
export function delWarnConfig(id) {
  return request({
    url: '/ld/warnConfig/' + id,
    method: 'delete'
  })
}
