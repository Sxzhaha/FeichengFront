import request from '@/utils/request'

// 识别病虫害，并使用知识库补充危害症状和防治建议
export function predictDiseaseByImage(data) {
  return request({
    url: '/sxz/disease-recognition/predictByImage',
    method: 'post',
    data,
    headers: {
      repeatSubmit: false
    },
    timeout: 60000
  })
}
