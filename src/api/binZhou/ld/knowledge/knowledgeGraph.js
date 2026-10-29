import request from '@/utils/request'

// 重建知识图谱数据
export function rebuildKnowledgeGraph() {
  return request({
    url: '/binZhou/ld/knowledge/graph/rebuild',
    method: 'get'
  })
}

// 🔥 获取知识图谱数据 - 后端默认展开到第三级，包含优化布局
export function getKnowledgeGraphData(centerNode) {
  return request({
    url: '/binZhou/ld/knowledge/unified/data',
    method: 'get',
    params: { 
      centerNode
    }
  })
}

// 🔥 新增：获取节点的子节点（第四级展开功能）
export function getNodeChildren(parentNodeId) {
  return request({
    url: `/binZhou/ld/knowledge/unified/children/${parentNodeId}`,
    method: 'get'
  })
}

// 搜索节点
export function searchGraphNodes(keyword, nodeId) {
  return request({
    url: '/binZhou/ld/knowledge/unified/search',
    method: 'get',
    params: { keyword, nodeId }
  })
}

// 获取搜索建议
export function getSearchSuggestions(keyword) {
  return request({
    url: '/binZhou/ld/knowledge/unified/suggestions',
    method: 'get',
    params: { keyword }
  })
}

// 获取节点详情
export function getGraphNodeDetail(nodeId) {
  return request({
    url: '/binZhou/ld/knowledge/unified/node/' + nodeId,
    method: 'get'
  })
}

// 🔥 新增：获取包含指定节点的知识图谱数据（用于详情页）
export function getKnowledgeGraphDataWithSpecificNode(params) {
  return request({
    url: '/binZhou/ld/knowledge/unified/dataWithSpecificNode',
    method: 'get',
    params: {
      centerNode: params.centerNode || 'crop_1',
      specificNodeName: params.specificNodeName,
      nodeType: params.nodeType
    }
  })
}