import request from '@/utils/request'

// 查询物候期识别结果列表
export function listPhenology(query) {
  return request({
    url: '/xwq/phenology/list',
    method: 'get',
    params: query
  })
}

// 查询物候期识别结果详细
export function getPhenology(phenologyId) {
  return request({
    url: '/xwq/phenology/' + phenologyId,
    method: 'get'
  })
}

// 新增物候期识别结果
export function addPhenology(data) {
  return request({
    url: '/xwq/phenology',
    method: 'post',
    data: data
  })
}

// 修改物候期识别结果
export function updatePhenology(data) {
  return request({
    url: '/xwq/phenology',
    method: 'put',
    data: data
  })
}

// 删除物候期识别结果
export function delPhenology(phenologyId) {
  return request({
    url: '/xwq/phenology/' + phenologyId,
    method: 'delete'
  })
}

// 根据勾选记录或当前筛选条件，由后端读取真实历史数据并生成报告文本
export function generatePhenologyReportText(data) {
  return request({
    url: '/xwq/phenology/generateReportText',
    method: 'post',
    data,
    headers: {
      repeatSubmit: false
    },
    timeout: 120000
  })
}
