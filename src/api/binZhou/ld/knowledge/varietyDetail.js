// ==================== API 接口文件 (api/knowledge/varietyDetail.js) ====================
import request from '@/utils/request'

// 🔥 根据品种名称查询详细信息（使用现有的 zs_crop_variety 表）
export function getVarietyDetailByName(name) {
    return request({
        url: '/binZhou/ld/cropVariety/query',
        method: 'get',
        params: { varietyName: name }
    })
}

// 根据ID查询品种详细信息 (备用)
export function getVarietyDetailById(id) {
    return request({
        url: '/binZhou/ld/cropVariety/' + id,
        method: 'get'
    })
}

// 搜索品种详情
export function searchVarietyDetail(keyword) {
    return request({
        url: '/binZhou/ld/cropVariety/search',
        method: 'get',
        params: { keyword }
    })
}

// 获取品种列表（分页）
export function getVarietyDetailList(query) {
    return request({
        url: '/binZhou/ld/cropVariety/list',
        method: 'get',
        params: query
    })
}

// 新增品种详情
export function addVarietyDetail(data) {
    return request({
        url: '/binZhou/ld/cropVariety',
        method: 'post',
        data: data
    })
}

// 修改品种详情
export function updateVarietyDetail(data) {
    return request({
        url: '/binZhou/ld/cropVariety',
        method: 'put',
        data: data
    })
}

// 删除品种详情
export function delVarietyDetail(id) {
    return request({
        url: '/binZhou/ld/cropVariety/' + id,
        method: 'delete'
    })
}