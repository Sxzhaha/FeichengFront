import request from '@/utils/request'

// 🔥 获取作物分类（只查询展示用）
export function getCropCategoriesForDisplay() {
    return request({
        url: '/binZhou/ld/knowledge/display/categories',
        method: 'get'
    })
}

// 🔥 根据作物ID获取品种列表（只查询展示用）
export function getVarietiesForDisplay(cropNodeId) {
    return request({
        url: '/binZhou/ld/knowledge/display/varieties',
        method: 'get',
        params: { cropNodeId }
    })
}

// 🔥 搜索品种（只查询展示用）
export function searchVarietiesForDisplay(keyword) {
    return request({
        url: '/binZhou/ld/knowledge/display/search',
        method: 'get',
        params: { keyword }
    })
}

// 🔥 根据品种名称获取详情（只查询展示用）
export function getVarietyDetailByName(varietyName) {
    return request({
        url: '/binZhou/ld/knowledge/display/variety',
        method: 'get',
        params: { name: varietyName }
    })
}