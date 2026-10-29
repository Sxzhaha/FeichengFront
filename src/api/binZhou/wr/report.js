import request from '@/utils/request'

// 1. 获取最新合并的四维农情周报正文数据
export function getLatestReport(query) {
  return request({
    url: '/binZhou/wr/report/getLatest',
    method: 'get',
    params: query
  })
}

// 2. 查：拉取当前登录农户在 wr_report_push_config 表中的真实物理记录
export function getMyPushConfig() {
  return request({
    url: '/wr/pushConfig/getLatestConfig',
    method: 'get'
  })
}

// 3. 增/改：保存更新当前农户的推送接收偏好设置
export function saveMyPushConfig(data) {
  return request({
    url: '/wr/pushConfig/saveConfig',
    method: 'post',
    data: data
  })
}

// 获取综合农情监测报告
export function getAgriReport(params) {
  return request({
    url: '/binZhou/wr/report/agri',
    method: 'get',
    params
  })
}