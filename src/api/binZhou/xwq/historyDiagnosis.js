import request from '@/utils/request'

const BASE = '/binZhou/xwq/history'

export const listHistory    = (params) => request({ url: `${BASE}/list`,       method: 'get',  params })
export const listAllHistory = (params) => request({ url: `${BASE}/list`,       method: 'get',  params: { ...params, pageNum: 1, pageSize: 10000 } })
export const getStatistics  = (params) => request({ url: `${BASE}/statistics`, method: 'get',  params })
export const getHistory     = (id)     => request({ url: `${BASE}/${id}`,      method: 'get'          })
export const addHistory     = (data)   => request({ url: BASE,                 method: 'post', data   })
export const batchAddHistory= (data)   => request({ url: `${BASE}/batch`,      method: 'post', data, timeout: 60000 })
export const updateHistory  = (data)   => request({ url: BASE,                 method: 'put',  data   })
export const deleteHistory  = (ids)    => request({ url: `${BASE}/${ids}`,     method: 'delete'       })
export const exportHistory  = (params) => request({ url: `${BASE}/export`,     method: 'post', params, responseType: 'blob' })
export function predictImage(data) {
  return request({
    url: `${BASE}/predict`,
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data',
      'repeatSubmit': false //  告诉若依拦截器放行连续请求
    }
  })
}
