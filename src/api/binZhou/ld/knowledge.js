import request from '@/utils/request'

// 获取三级目录树
export function getCategoryTree() {
  return request({
    url: '/binZhou/ld/knowledge/menu',
    method: 'get'
  })
}

// 获取病虫害列表（分页 + 筛选）
export function getKnowledgeList(params) {
  return request({
    url: '/binZhou/ld/knowledge/list',
    method: 'get',
    params
  })
}

// 获取病虫害详情
export function getKnowledgeDetail(id) {
  return request({
    url: `/binZhou/ld/knowledge/${id}`,
    method: 'get'
  })
}

// 新增
export function addKnowledge(data) {
  return request({
    url: '/binZhou/ld/knowledge',
    method: 'post',
    data
  })
}

// 修改
export function updateKnowledge(data) {
  return request({
    url: '/binZhou/ld/knowledge',
    method: 'put',
    data
  })
}

// 删除
export function deleteKnowledge(ids) {
  return request({
    url: `/binZhou/ld/knowledge/${ids}`,
    method: 'delete'
  })
}
