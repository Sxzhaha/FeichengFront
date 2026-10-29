import request from '@/utils/request'

// 获取枣树简易列表（卡片展示用）
export function getSimpleList(query) {
  return request({
    url: '/binZhou/ld/jujubebaike/simpleList',
    method: 'get',
    params: query
  })
}

// 获取详细信息
export function getJujubebaike(id) {
  return request({
    url: '/binZhou/ld/jujubebaike/' + id,
    method: 'get'
  })
}
