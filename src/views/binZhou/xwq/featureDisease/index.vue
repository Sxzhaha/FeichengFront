<template>
  <div class="disease-recognition-container smart-agri-theme" ref="containerRef">
    <div class="top-section">
      <el-row :gutter="20" class="full-height-row">
        <!-- 左侧：图片资源 -->
        <el-col :span="5" class="full-height-col">
          <el-card class="box-card full-height-card side-card" shadow="hover">
            <template #header>
              <div class="card-header simple-header">
                <span class="header-title">图像资源</span>
                <div class="upload-actions">
                  <el-button type="primary" plain size="small" @click="triggerFileInput">
                    手动上传图片
                  </el-button>
                  <el-button type="success" plain size="small" @click="triggerFolderInput">
                    上传文件夹
                  </el-button>
                  <el-button
                    type="danger"
                    plain
                    size="small"
                    @click="clearAllImages"
                    :disabled="fileList.length === 0"
                  >
                    清空
                  </el-button>

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref="fileInput"
                    class="hidden-input"
                    @change="handleFileChange"
                  />
                  <input
                    type="file"
                    webkitdirectory
                    directory
                    multiple
                    ref="folderInput"
                    class="hidden-input"
                    @change="handleFileChange"
                  />
                </div>
              </div>
            </template>

            <div class="list-stats">
              <span>总数: {{ fileList.length }}</span>
              <span>已识别: <span class="text-success">{{ completedCount }}</span></span>
            </div>

            <div class="list-scroll-wrapper">
              <el-scrollbar>
                <div v-if="fileList.length === 0" class="empty-tip">
                  暂无待识别病虫害图像
                </div>

                <ul class="file-list">
                  <li
                    v-for="(item, index) in fileList"
                    :key="item.id || item.imageId || index"
                    :class="{
                      'is-active': currentImageIndex === index,
                      'is-diagnosed': item.status === '已识别'
                    }"
                    @click="selectImage(index)"
                  >
                    <el-image :src="item.url" class="thumbnail" fit="cover" />

                    <div class="file-info">
                      <span class="file-name" :title="item.name">{{ item.name }}</span>
                      <el-tag
                        :type="getStatusTagType(item.status)"
                        size="small"
                        effect="plain"
                      >
                        {{ item.status }}
                      </el-tag>
                    </div>

                    <el-icon class="delete-item-icon" @click.stop="removeImage(index)">
                      <Close />
                    </el-icon>
                  </li>
                </ul>
              </el-scrollbar>
            </div>
          </el-card>
        </el-col>

        <!-- 中间：视觉终端 -->
        <el-col :span="13" class="full-height-col">
          <el-card class="box-card full-height-card main-preview-card" shadow="hover">
            <template #header>
              <div class="card-header simple-header">
                <span class="header-title">视觉终端</span>

                <div class="action-group">
                  <el-select
                    v-model="selectedModelId"
                    placeholder="选择病虫害模型"
                    filterable
                    class="model-select"
                  >
                    <el-option
                      v-for="item in modelOptions"
                      :key="item.modelId"
                      :label="item.modelName"
                      :value="item.modelId"
                    />
                  </el-select>

                  <el-button plain @click="goBackToPest">
                    返回虫情识别
                  </el-button>

                  <el-button plain @click="goToDiseaseResult">
                    <el-icon style="margin-right:4px"><Clock /></el-icon>
                    查看病虫害识别结果
                  </el-button>

                  <el-button
                    type="primary"
                    :disabled="!currentImage || isDiagnosing || isBatchDiagnosing"
                    @click="runDiagnosis"
                  >
                    单张识别
                  </el-button>

                  <el-button
                    type="primary"
                    plain
                    :disabled="
                      fileList.length === 0 ||
                      isDiagnosing ||
                      isBatchDiagnosing
                    "
                    @click="runBatchDiagnosis"
                  >
                    一键全部识别
                  </el-button>
                </div>
              </div>
            </template>

            <div
              class="image-viewer"
              v-loading="isDiagnosing || isBatchDiagnosing || isUploading"
              :element-loading-text="loadingText"
              element-loading-background="rgba(245, 247, 250, 0.9)"
            >
              <div v-if="currentImage" class="image-wrapper">
                <el-image
                  :src="currentImage.url"
                  fit="contain"
                  class="main-image"
                  :preview-src-list="[currentImage.url]"
                />
                <div v-if="isDiagnosing || isBatchDiagnosing" class="scan-line"></div>
              </div>

              <el-empty
                v-else
                description="请上传图片入库或从图片信息表加载待识别图像"
                :image-size="120"
              />
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：识别报告 -->
        <el-col :span="6" class="full-height-col">
          <el-card class="box-card full-height-card side-card result-card" shadow="hover">
            <template #header>
              <div class="card-header simple-header">
                <span class="header-title">病虫害识别报告</span>
              </div>
            </template>

            <div v-if="currentResult" class="result-content">
              <div class="result-box">
                <div class="label">病虫害类别</div>
                <div class="value highlight-danger">
                  {{ currentResult.diseaseName }}
                </div>
              </div>

              <div class="result-box">
                <div class="label">模型置信度</div>
                <div class="value">
                  <el-progress
                    :percentage="toPercent(currentResult.diseaseConfidence)"
                    :color="customColors"
                    :stroke-width="12"
                  />
                </div>
              </div>

              <div class="result-box">
                <div class="label">预警等级</div>
                <div class="value">
                  <el-tag :type="getWarningTag(currentResult.warningLevel)" effect="plain">
                    {{ currentResult.warningLevel || '无' }}
                  </el-tag>
                </div>
              </div>

              <div class="result-box suggestion-box">
                <div class="label">症状表现</div>
                <div class="value text-desc scrollable-text">
                  {{ currentResult.diseaseDesc || '暂无症状描述' }}
                </div>
              </div>

              <div class="result-box suggestion-box">
                <div class="label">识别结论</div>
                <div class="value text-desc scrollable-text">
                  {{ currentResult.diseaseResult || '暂无识别结论' }}
                </div>
              </div>

              <div class="result-box prevention-box">
                <div class="label">防治建议</div>
                <div class="value text-desc scrollable-text">
                  {{ currentResult.diseaseAdvice || '暂无防治建议' }}
                </div>
              </div>
            </div>

            <div v-else class="empty-result">
              <el-icon class="empty-icon"><Monitor /></el-icon>
              <span>等待接收病虫害识别结果</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 下方：结果详情 -->
    <div class="bottom-section" ref="bottomSectionRef">
      <div class="resize-handle" @mousedown="startResize"></div>

      <el-card class="box-card table-card" shadow="hover">
        <template #header>
          <div class="card-header simple-header">
            <span class="header-title">结果详情</span>

            <div class="action-group">
              <el-button type="primary" plain disabled>
                仅显示本次识别结果
              </el-button>

              <el-button type="success" plain @click="exportToExcel">
                <el-icon><Download /></el-icon>
                导出为 Excel
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="tableData"
          style="width: 100%"
          :height="tableHeight"
          border
          stripe
          class="agri-table"
          empty-text="暂无本次识别结果，请先点击单张识别或一键全部识别"
          :row-style="{ height: '55px' }"
        >
          <el-table-column label="序号" width="60" align="center">
            <template #default="{ $index }">
              {{ tableData.length - $index }}
            </template>
          </el-table-column>

          <el-table-column
            prop="fileName"
            label="图像源文件"
            width="220"
            show-overflow-tooltip
          />

          <el-table-column
            prop="diseaseName"
            label="病虫害类别"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              <el-tag type="danger" effect="plain" disable-transitions>
                {{ row.diseaseName || '未知病虫害' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            prop="diseaseConfidence"
            label="置信度"
            width="120"
            align="center"
          >
            <template #default="{ row }">
              <span class="confidence-text">{{ toPercent(row.diseaseConfidence) }}%</span>
            </template>
          </el-table-column>

          <el-table-column
            prop="warningLevel"
            label="预警等级"
            width="120"
            align="center"
          >
            <template #default="{ row }">
              <el-tag :type="getWarningTag(row.warningLevel)" effect="plain">
                {{ row.warningLevel || '无' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            prop="diseaseDesc"
            label="症状表现"
            min-width="240"
            show-overflow-tooltip
          />

          <el-table-column
            prop="diseaseResult"
            label="识别结论"
            min-width="260"
            show-overflow-tooltip
          />

          <el-table-column
            prop="diseaseAdvice"
            label="防治建议"
            min-width="360"
            show-overflow-tooltip
          />

          <!-- <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row, $index }">
              <el-button link type="primary" size="small" @click="viewDetails(row)">
                查看
              </el-button>
              <el-button link type="danger" size="small" @click="deleteRecord($index, row)">
                移除
              </el-button>
            </template>
          </el-table-column> -->
        </el-table>
      </el-card>
    </div>

    <el-image
      v-show="false"
      ref="previewRef"
      :src="previewUrl"
      :preview-src-list="[previewUrl]"
      :initial-index="0"
      fit="cover"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Monitor, Close, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

import { listImage, addImage } from '@/api/binZhou/xwq/image'
import { predictDiseaseByImage, listDiseaseResult } from '@/api/binZhou/xwq/disease'
import { listModel } from '@/api/binZhou/xwq/model'

const router = useRouter()

// 临时默认病虫害模型 ID：数据库 xwq_ai_model 中 model_id = 2。
// 当前可以把 model_id=2 的 model_url 临时配置为虫情模型地址，后续替换为真实病虫害模型地址。
const DEFAULT_DISEASE_MODEL_ID = 2

const selectedModelId = ref(DEFAULT_DISEASE_MODEL_ID)
const modelOptions = ref([])
const folderInput = ref(null)

const STORAGE_KEY = 'disease_recognition_data'

const fileInput = ref(null)
const fileList = ref([])
const currentImageIndex = ref(-1)
const isDiagnosing = ref(false)
const isBatchDiagnosing = ref(false)
const isUploading = ref(false)
const tableData = ref([])
const previewRef = ref(null)
const previewUrl = ref('')
const bottomSectionRef = ref(null)
const tableHeight = ref(280)
const sectionHeight = ref(320)
const containerRef = ref(null)

const loadingText = computed(() => {
  if (isUploading.value) return '图片正在上传并写入图片信息表...'
  if (isDiagnosing.value || isBatchDiagnosing.value) return 'AI 模型正在连接服务器推理中...'
  return '处理中...'
})

const goToDiseaseResult = () => {
  saveToStorage()
  router.push('/diseaseHistory')
}

// 返回虫情识别独立页面
const goBackToPest = () => {
  saveToStorage()
  router.push('/xwq/featurePest')
}

const currentImage = computed(() => {
  if (currentImageIndex.value >= 0 && fileList.value.length > 0) {
    return fileList.value[currentImageIndex.value]
  }
  return null
})

const currentResult = computed(() => currentImage.value?.result ?? null)

const completedCount = computed(() => {
  return fileList.value.filter(item => item.status === '已识别').length
})

const customColors = [
  { color: '#f56c6c', percentage: 60 },
  { color: '#e6a23c', percentage: 85 },
  { color: '#67c23a', percentage: 100 }
]

onMounted(() => {
  loadFromStorage()
  loadModelOptions()
  loadImageList()

  // 结果详情只显示当前页面本次识别产生的数据，不再自动加载历史识别结果
  tableData.value = []
})

watch([tableData, currentImageIndex, selectedModelId], () => {
  saveToStorage()
}, { deep: true })

const saveToStorage = () => {
  const data = {
    currentImageIndex: currentImageIndex.value,
    selectedModelId: selectedModelId.value
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const loadFromStorage = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return

    const data = JSON.parse(saved)

    // 不恢复 tableData，防止底部结果详情显示上一次或历史识别记录
    tableData.value = []
    currentImageIndex.value = data.currentImageIndex ?? -1
    if (data.selectedModelId) selectedModelId.value = data.selectedModelId
  } catch (e) {
    console.error('恢复数据失败', e)
  }
}

// 加载病虫害识别模型列表
const loadModelOptions = async () => {
  try {
    let res = await listModel({
      pageNum: 1,
      pageSize: 100,
      modelType: '病虫害',
      modelStatus: 1
    })

    let rows = res.rows || []

    // 兼容：如果模型类型字段没有按“病虫害”维护，则退回加载所有启用模型
    if (rows.length === 0) {
      res = await listModel({
        pageNum: 1,
        pageSize: 100,
        modelStatus: 1
      })
      rows = res.rows || []
    }

    modelOptions.value = rows

    const exists = rows.some(item => item.modelId === selectedModelId.value)
    if (!exists && rows.length > 0) {
      selectedModelId.value = rows[0].modelId
    }
  } catch (e) {
    console.error('加载病虫害模型列表失败：', e)
    ElMessage.warning('模型列表加载失败，将继续使用默认病虫害模型')
  }
}

// 从 AiImage 表加载病虫害图片
const loadImageList = async () => {
  try {
    const res = await listImage({
      pageNum: 1,
      pageSize: 100,
      imageAiType: 'disease'
    })

    const rows = res.rows || []

    fileList.value = rows.map(item => ({
      id: item.imageId,
      imageId: item.imageId,
      name: item.imageName,
      url: normalizeImageUrl(item.imageUrl),
      rawUrl: item.imageUrl,
      imageAiType: item.imageAiType,
      imageSource: item.imageSource,
      cropType: item.imageA || '小麦',
      status: getImageStatusText(item.imageStatus),
      result: null
    }))

    if (fileList.value.length > 0 && currentImageIndex.value < 0) {
      currentImageIndex.value = 0
    }
  } catch (e) {
    console.error('加载图片列表失败：', e)
    ElMessage.error('加载病虫害图片列表失败，请检查 /xwq/image/list 接口')
  }
}

// 从 xwq_ai_disease 加载最近病虫害识别结果
// 注意：当前识别页面不再主动调用该方法，避免“结果详情”显示历史记录。
// 历史记录请进入 /diseaseHistory 页面查看。
const loadRecentDiseaseResults = async () => {
  try {
    const res = await listDiseaseResult({
      pageNum: 1,
      pageSize: 20
    })

    const rows = res.rows || []

    tableData.value = rows.map(row => ({
      imageId: row.imageId,
      recordId: row.recordId,
      diseaseId: row.diseaseId,
      fileName: row.imageName || `图片ID：${row.imageId}`,
      imageUrl: normalizeImageUrl(row.imageUrl || row.diseaseResultImgUrl),
      diseaseName: row.diseaseName || '未知病虫害',
      diseaseConfidence: Number(row.diseaseConfidence || 0),
      diseaseResult: row.diseaseResult || '',
      diseaseDesc: row.diseaseDesc || '',
      diseaseAdvice: row.diseaseAdvice || '',
      warningLevel: row.warningLevel || '无'
    }))
  } catch (e) {
    console.error('加载病虫害识别结果失败：', e)
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const triggerFolderInput = () => {
  folderInput.value?.click()
}

const handleFileChange = async (event) => {
  const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'))
  if (files.length === 0) return

  isUploading.value = true

  try {
    for (const file of files) {
      await uploadAndCreateImage(file)
    }

    ElMessage.success(`成功上传并入库 ${files.length} 张图片`)
    await loadImageList()
  } catch (e) {
    console.error('图片上传入库失败：', e)
    ElMessage.error('图片上传入库失败：' + e.message)
  } finally {
    isUploading.value = false
    event.target.value = ''
  }
}

const uploadFileToServer = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await request({
    url: '/common/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      repeatSubmit: false
    },
    timeout: 60000
  })

  if (res.code !== 200) {
    throw new Error(res.msg || '文件上传失败')
  }

  const fileUrl = res.url || res.fileName
  if (!fileUrl) {
    throw new Error('上传接口未返回 url 或 fileName')
  }

  return fileUrl
}

// 写入 xwq_ai_image，注意 imageAiType = disease
const uploadAndCreateImage = async (file) => {
  const imageUrl = await uploadFileToServer(file)
  const uniqueName = buildUniqueImageName(file.name)

  const imageData = {
    imageName: uniqueName,
    imageUrl,
    imageAiType: 'disease',
    imageSource: '手动上传',
    imageSize: file.size,
    imageFormat: getFileSuffix(file.name),
    imageStatus: 0,
    imageA: '小麦'
  }

  const addRes = await addImage(imageData)
  if (addRes.code !== 200) {
    throw new Error(addRes.msg || '图片信息入库失败')
  }

  if (addRes.data?.imageId) {
    return addRes.data
  }

  const queryRes = await listImage({
    pageNum: 1,
    pageSize: 10,
    imageName: uniqueName,
    imageAiType: 'disease'
  })

  const saved = (queryRes.rows || []).find(item => item.imageName === uniqueName) || (queryRes.rows || [])[0]

  if (!saved || !saved.imageId) {
    throw new Error('图片已入库，但未能查询到 imageId，请检查 addImage 接口是否返回主键')
  }

  return saved
}

// 病虫害识别：读取 AiImage，后端写 AiRecord + AiDisease
const processImage = async (index) => {
  const imageItem = fileList.value[index]

  if (!imageItem || !imageItem.imageId) {
    ElMessage.warning('当前图片缺少 imageId，无法识别')
    return
  }

  if (!selectedModelId.value) {
    ElMessage.warning('请先选择病虫害识别模型')
    return
  }

  try {
    const response = await predictDiseaseByImage({
      imageId: imageItem.imageId,
      modelId: selectedModelId.value,
      cropType: imageItem.cropType || '小麦',
      recordMode: '手动上传'
    })

    if (response.code === 200 && response.data) {
      const result = response.data

      fileList.value[index].status = '已识别'
      fileList.value[index].result = {
        diseaseName: result.diseaseName || '未知病虫害',
        diseaseConfidence: Number(result.diseaseConfidence || 0),
        diseaseResult: result.diseaseResult || '',
        diseaseDesc: result.diseaseDesc || '',
        diseaseAdvice: result.diseaseAdvice || '',
        warningLevel: result.warningLevel || '无'
      }

      const newRecord = {
        imageId: result.imageId,
        recordId: result.recordId,
        diseaseId: result.diseaseId,
        fileName: result.imageName || imageItem.name,
        imageUrl: normalizeImageUrl(result.imageUrl || imageItem.rawUrl || imageItem.url),
        diseaseName: result.diseaseName || '未知病虫害',
        diseaseConfidence: Number(result.diseaseConfidence || 0),
        diseaseResult: result.diseaseResult || '',
        diseaseDesc: result.diseaseDesc || '',
        diseaseAdvice: result.diseaseAdvice || '',
        warningLevel: result.warningLevel || '无'
      }

      // 同一张图片重复识别时更新原行，避免重复追加历史结果。
      const existIdx = tableData.value.findIndex(item =>
        String(item.imageId) === String(newRecord.imageId)
      )
      if (existIdx > -1) {
        tableData.value[existIdx] = newRecord
      } else {
        tableData.value.unshift(newRecord)
      }

      ElMessage.success('病虫害识别完成，结果已写入 AiRecord 和 AiDisease')
    } else {
      throw new Error(response.msg || '后端接口返回异常')
    }
  } catch (e) {
    console.error('病虫害识别异常：', e)
    ElMessage.error('病虫害识别失败：' + e.message)
    fileList.value[index].status = '识别失败'
  }
}

const runDiagnosis = async () => {
  if (!currentImage.value) return

  isDiagnosing.value = true
  await processImage(currentImageIndex.value)
  isDiagnosing.value = false
}

const runBatchDiagnosis = async () => {
  isBatchDiagnosing.value = true
  ElMessage.warning(`开始批量重新识别，共 ${fileList.value.length} 张图像...`)

  for (let i = 0; i < fileList.value.length; i++) {
    currentImageIndex.value = i
    await processImage(i)
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  isBatchDiagnosing.value = false
  ElMessage.success('批量识别流程结束')
}

const selectImage = (index) => {
  if (isBatchDiagnosing.value) return
  currentImageIndex.value = index
}

const removeImage = (index) => {
  const deleted = fileList.value[index]

  tableData.value = tableData.value.filter(row => row.imageId !== deleted.imageId)
  fileList.value.splice(index, 1)

  if (fileList.value.length === 0) {
    currentImageIndex.value = -1
  } else if (currentImageIndex.value === index) {
    currentImageIndex.value = Math.max(0, index - 1)
  } else if (currentImageIndex.value > index) {
    currentImageIndex.value--
  }
}

const clearAllImages = () => {
  ElMessageBox.confirm('确定要清空当前页面图片列表和识别结果吗？不会删除数据库图片记录。', '清空确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    fileList.value = []
    tableData.value = []
    currentImageIndex.value = -1
    sessionStorage.removeItem(STORAGE_KEY)
    ElMessage.success('已清空当前页面数据')
  }).catch(() => {})
}

const exportToExcel = () => {
  if (tableData.value.length === 0) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const total = tableData.value.length
  const headers = [
    '序号',
    '图像源文件',
    '病虫害类别',
    '置信度(%)',
    '预警等级',
    '症状表现',
    '识别结论',
    '防治建议'
  ]

  const rows = tableData.value.map((r, i) => [
    total - i,
    r.fileName,
    r.diseaseName,
    toPercent(r.diseaseConfidence),
    r.warningLevel,
    r.diseaseDesc,
    r.diseaseResult,
    r.diseaseAdvice
  ])

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head>
    <body><table border="1">
    <tr>${headers.map(h => `<th style="background:#3a7d3a;color:#fff;font-weight:bold;">${h}</th>`).join('')}</tr>
    ${rows.map(row => `<tr>${row.map(c => `<td style="mso-number-format:'\\@';">${c ?? ''}</td>`).join('')}</tr>`).join('')}
    </table></body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `病虫害识别结果_${Date.now()}.xls`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

const viewDetails = (row) => {
  if (row.imageUrl) {
    previewUrl.value = row.imageUrl
    setTimeout(() => {
      previewRef.value?.showViewer()
    }, 0)
  } else {
    ElMessage.warning('该图片地址不可用')
  }
}

const deleteRecord = (index, row) => {
  ElMessageBox.confirm(`确定要从当前页面移除 "${row.fileName}" 的识别结果吗？不会删除数据库记录。`, '移除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    tableData.value.splice(index, 1)

    const fileIdx = fileList.value.findIndex(item => item.imageId === row.imageId)
    if (fileIdx > -1) {
      fileList.value[fileIdx].status = '未识别'
      fileList.value[fileIdx].result = null
    }

    ElMessage.success('已从当前页面移除')
  }).catch(() => {})
}

const getStatusTagType = (status) => {
  if (status === '已识别') return 'success'
  if (status === '识别失败') return 'danger'
  if (status === '识别中') return 'warning'
  return 'info'
}

const getImageStatusText = (status) => {
  const value = Number(status)
  if (value === 0) return '未识别'
  if (value === 1) return '识别中'
  if (value === 2) return '已识别'
  if (value === 3) return '识别失败'
  return '未识别'
}

const getWarningTag = (level) => {
  if (!level || level === '无') return 'info'
  if (level === '低') return 'success'
  if (level === '中') return 'warning'
  if (level === '高') return 'danger'
  return 'info'
}

const toPercent = (value) => {
  const num = Number(value || 0)
  if (num <= 1) return Math.round(num * 100)
  return Math.round(num)
}

const getFileSuffix = (fileName) => {
  if (!fileName || !fileName.includes('.')) return ''
  return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase()
}

const buildUniqueImageName = (name) => {
  const suffix = getFileSuffix(name)
  const base = suffix ? name.substring(0, name.lastIndexOf('.')) : name
  return `${base}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${suffix ? '.' + suffix : ''}`
}

const normalizeImageUrl = (url) => {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url

  return `${baseApi}/${url}`
}

const startResize = (e) => {
  e.preventDefault()

  const startY = e.clientY
  const startHeight = sectionHeight.value

  const onMouseMove = (moveEvent) => {
    const deltaY = startY - moveEvent.clientY
    const newHeight = Math.max(150, Math.min(window.innerHeight - 200, startHeight + deltaY))

    sectionHeight.value = newHeight
    tableHeight.value = newHeight - 40

    if (bottomSectionRef.value) {
      bottomSectionRef.value.style.height = `${newHeight}px`
    }
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>

<style scoped>
.smart-agri-theme {
  --agri-primary: #2f7d4f;
  --agri-primary-soft: #eef8f1;
  --tech-blue: #409eff;
  --panel-bg: #ffffff;
  --page-bg: #f5f7fa;
  --border-color: #e6ebf2;
  --text-main: #1f2d3d;
  --text-sub: #7a869a;
  --danger-color: #f56c6c;
  --warning-color: #e6a23c;
  --success-color: #67c23a;
  --card-shadow: 0 10px 26px rgba(31, 45, 61, 0.07);
}

/* 页面容器：取消底部绝对定位造成的挤压，整体更清爽 */
.pest-container,
.disease-recognition-container {
  box-sizing: border-box;
  min-height: calc(100vh - 84px);
  padding: 16px;
  background:
    radial-gradient(circle at 0 0, rgba(103, 194, 58, 0.10), transparent 260px),
    linear-gradient(180deg, #f7fbf8 0%, var(--page-bg) 320px);
  position: relative;
}

/* 上方识别区域 */
.top-section {
  height: 520px;
  min-height: 480px;
}

.full-height-row,
.full-height-col {
  height: 100%;
}

.full-height-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 14px;
  overflow: hidden;
  background: var(--panel-bg);
  box-shadow: var(--card-shadow);
}

/* Element Plus Card */
:deep(.el-card__header) {
  padding: 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--panel-bg);
}

:deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* 卡片头部 */
.card-header {
  min-height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 12px 16px;
  background: #fff;
}

.simple-header {
  border-left: none;
}

.header-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.header-title::before {
  content: "";
  width: 4px;
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--agri-primary), var(--tech-blue));
}

/* 操作区：允许换行，解决按钮过多时拥挤 */
.action-group,
.upload-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.action-group :deep(.el-button),
.upload-actions :deep(.el-button) {
  margin-left: 0;
  border-radius: 8px;
}

.action-group :deep(.el-button--primary),
.upload-actions :deep(.el-button--primary) {
  font-weight: 500;
}

.model-select {
  width: 210px;
  flex-shrink: 0;
}

.model-select :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.hidden-input {
  display: none;
}

/* 左侧图片列表 */
.list-stats {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  background: #f8fafc;
  font-size: 13px;
  color: var(--text-sub);
  border-bottom: 1px solid var(--border-color);
}

.text-success {
  color: var(--success-color);
  font-weight: 700;
}

.list-scroll-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 8px 0;
}

.list-scroll-wrapper :deep(.el-scrollbar) {
  height: 100%;
}

.file-list {
  list-style: none;
  padding: 0 8px;
  margin: 0;
}

.file-list li {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 64px;
  margin-bottom: 8px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  transition: all 0.18s ease;
}

.file-list li:hover {
  background: #f8fbff;
  border-color: #d9ecff;
}

.file-list li.is-active {
  background: #eef6ff;
  border-color: #b9dcff;
  box-shadow: inset 3px 0 0 var(--tech-blue);
}

.file-list li.is-diagnosed {
  background: #f3fbf5;
  border-color: #dcefe1;
}

.file-list li.is-diagnosed .file-name {
  color: var(--agri-primary);
}

.thumbnail {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  margin-right: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: #f5f7fa;
}

.file-info {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-name {
  max-width: 100%;
  font-size: 13px;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-item-icon {
  position: absolute;
  top: 7px;
  right: 7px;
  font-size: 18px;
  color: var(--danger-color);
  opacity: 0;
  padding: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  transition: all 0.18s ease;
  z-index: 10;
}

.delete-item-icon:hover {
  transform: scale(1.08);
  color: #fff;
  background: var(--danger-color);
}

.file-list li:hover .delete-item-icon {
  opacity: 1;
}

.empty-tip {
  text-align: center;
  color: #a8abb2;
  padding: 56px 0;
  font-size: 14px;
}

/* 中间视觉终端 */
.main-preview-card :deep(.el-card__body) {
  background:
    linear-gradient(45deg, rgba(64, 158, 255, 0.04) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(64, 158, 255, 0.04) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(64, 158, 255, 0.04) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(64, 158, 255, 0.04) 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
  position: relative;
}

.image-viewer {
  width: 100%;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px var(--border-color);
}

.main-image {
  width: 100%;
  height: 100%;
}

.main-image :deep(.el-image__inner) {
  object-fit: contain;
}

.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  height: 2px;
  background: var(--tech-blue);
  box-shadow: 0 0 14px var(--tech-blue);
  animation: scan 1.5s infinite linear;
}

@keyframes scan {
  0%   { top: 0%;   opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

/* 右侧识别报告 */
.result-card :deep(.el-card__body) {
  padding: 14px;
  background: #ffffff;
  overflow: hidden;
}

.result-content {
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 2px;
}

.result-box {
  flex-shrink: 0;
  padding: 12px 13px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: #f8fafc;
}

.result-box .label {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-sub);
}

.result-box .value {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.highlight-danger {
  color: var(--danger-color) !important;
  font-size: 17px !important;
}

.highlight-success {
  color: var(--success-color) !important;
  font-size: 17px !important;
}

.suggestion-box {
  background: #f8fbff;
  border-left: 3px solid var(--tech-blue);
}

.prevention-box {
  background: #f6fff8;
  border-left: 3px solid var(--success-color);
}

.text-desc {
  font-size: 13px !important;
  line-height: 1.65;
  font-weight: 400 !important;
  color: #5f6b7a !important;
}

.scrollable-text {
  word-break: break-word;
}

.empty-result {
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  color: #b7bdc6;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.72;
}

/* 下方表格：改为正常文档流，避免绝对定位遮挡 */
.bottom-section {
  position: relative;
  height: 320px;
  min-height: 180px;
  margin-top: 16px;
  z-index: 1;
}

.resize-handle {
  position: absolute;
  top: -7px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  background: transparent;
  z-index: 10;
}

.resize-handle::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  width: 54px;
  height: 4px;
  transform: translateX(-50%);
  border-radius: 4px;
  background: #d9e2ec;
}

.table-card {
  height: 100%;
  border: none;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.agri-table {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #566477;
  --el-table-border-color: #edf1f6;
  font-size: 13px;
}

.agri-table :deep(.el-table__header th) {
  font-weight: 700;
}

.agri-table :deep(.el-table__row) {
  height: 52px;
}

.confidence-text {
  font-weight: 700;
  color: var(--text-main);
}

/* 响应式适配 */
@media (max-width: 1500px) {
  .top-section {
    height: 500px;
  }

  .model-select {
    width: 180px;
  }

  .card-header {
    padding: 10px 14px;
  }
}

@media (max-width: 1280px) {
  .top-section {
    height: auto;
    min-height: 0;
  }

  .full-height-row {
    height: auto;
  }

  .full-height-col {
    height: 420px;
    margin-bottom: 16px;
  }

  .bottom-section {
    margin-top: 0;
  }
}
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
.disease-recognition-container {
--ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-green-soft: #edf5e9;
  --ft-green-pale: #f8fbf5;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e5eee2;
  --ft-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
  min-height: calc(100vh - 84px);
  padding: 20px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.18), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.disease-recognition-container *,
.disease-recognition-container *::before,
.disease-recognition-container *::after {
  box-sizing: border-box;
}

.disease-recognition-container .top-section {
  margin-bottom: 16px;
}

.disease-recognition-container .full-height-row {
  align-items: stretch;
}

.disease-recognition-container .full-height-col {
  display: flex;
}

.disease-recognition-container .box-card {
  width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: var(--ft-shadow);
}

.disease-recognition-container .box-card :deep(.el-card__header) {
  min-height: 60px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbf5 100%);
  border-bottom: 1px solid #e2ece0;
}

.disease-recognition-container .box-card :deep(.el-card__body) {
  padding: 16px;
}

.disease-recognition-container .card-header,
.disease-recognition-container .simple-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 12px;
}

.disease-recognition-container .header-title {
  position: relative;
  padding-left: 13px;
  color: #294635;
  font-size: 16px;
  font-weight: 800;
}

.disease-recognition-container .header-title::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 18px;
  content: "";
  background: linear-gradient(180deg, var(--ft-green), #7da68a);
  border-radius: 999px;
  transform: translateY(-50%);
}

.disease-recognition-container .upload-actions,
.disease-recognition-container .action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.disease-recognition-container .model-select {
  min-width: 190px;
}

.disease-recognition-container .list-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  margin-bottom: 12px;
  color: #667b6b;
  font-size: 12px;
  background: #f1f6ee;
  border: 1px solid #dfeadd;
  border-radius: 9px;
}

.disease-recognition-container .text-success {
  color: var(--ft-green);
  font-weight: 800;
}

.disease-recognition-container .list-scroll-wrapper {
  height: 500px;
}

.disease-recognition-container .list-scroll-wrapper :deep(.el-scrollbar) {
  height: 100%;
}

.disease-recognition-container .file-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.disease-recognition-container .file-list li {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 24px;
  align-items: center;
  min-height: 82px;
  padding: 8px;
  margin-bottom: 8px;
  gap: 10px;
  background: #fbfcfa;
  border: 1px solid #e2ebe0;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.disease-recognition-container .file-list li:hover {
  border-color: #b9d1bb;
  box-shadow: 0 7px 16px rgba(58, 88, 63, 0.08);
  transform: translateY(-1px);
}

.disease-recognition-container .file-list li.is-active {
  background: #eaf3e7;
  border-color: #8db598;
  box-shadow: inset 3px 0 0 var(--ft-green);
}

.disease-recognition-container .file-list li.is-diagnosed {
  border-right: 3px solid #76a987;
}

.disease-recognition-container .thumbnail {
  width: 72px;
  height: 60px;
  overflow: hidden;
  border: 1px solid #dce7da;
  border-radius: 8px;
}

.disease-recognition-container .file-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.disease-recognition-container .file-name {
  overflow: hidden;
  color: #344e3e;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disease-recognition-container .delete-item-icon {
  color: #9aa89d;
  cursor: pointer;
}

.disease-recognition-container .delete-item-icon:hover {
  color: #c65f5f;
}

.disease-recognition-container .empty-tip {
  padding: 56px 12px;
  color: var(--ft-muted);
  text-align: center;
  background: #fafcf9;
  border: 1px dashed #d5e2d3;
  border-radius: 10px;
}

.disease-recognition-container .image-viewer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  overflow: hidden;
  background:
    linear-gradient(rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    #f5f8f3;
  background-size: 24px 24px;
  border: 1px solid #dce8da;
  border-radius: 12px;
}

.disease-recognition-container .image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.disease-recognition-container .main-image {
  width: 100%;
  height: 490px;
}

.disease-recognition-container .scan-line {
  position: absolute;
  right: 4%;
  left: 4%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #5aa177, transparent);
  box-shadow: 0 0 12px rgba(47, 125, 92, 0.5);
}

.disease-recognition-container .result-content {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.disease-recognition-container .result-box {
  padding: 13px 14px;
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-radius: 11px;
}

.disease-recognition-container .result-box .label {
  margin-bottom: 7px;
  color: var(--ft-muted);
  font-size: 12px;
}

.disease-recognition-container .result-box .value {
  color: #355541;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.6;
}

.disease-recognition-container .result-box .highlight-danger {
  color: #bd5353;
  font-size: 21px;
  font-weight: 800;
}

.disease-recognition-container .suggestion-box {
  background: #fafbf8;
}

.disease-recognition-container .prevention-box {
  background: #eef7eb;
  border-color: #cfe1cd;
}

.disease-recognition-container .scrollable-text {
  max-height: 112px;
  overflow-y: auto;
}

.disease-recognition-container .empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 410px;
  flex-direction: column;
  gap: 12px;
  color: #91a095;
}

.disease-recognition-container .empty-icon {
  color: #7fa88a;
  font-size: 46px;
}

.disease-recognition-container .bottom-section {
  position: relative;
}

.disease-recognition-container .resize-handle {
  height: 8px;
  margin: 0 18px -4px;
  cursor: row-resize;
  background: linear-gradient(90deg, transparent, #afc6b2, transparent);
  border-radius: 999px;
}

.disease-recognition-container .table-card :deep(.el-card__body) {
  padding: 0;
}

.disease-recognition-container :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
}

.disease-recognition-container :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.disease-recognition-container .confidence-text {
  color: var(--ft-green);
  font-weight: 800;
}

.disease-recognition-container :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.disease-recognition-container :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

@media (max-width: 1200px) {
  .disease-recognition-container .full-height-col {
    margin-bottom: 16px;
  }

  .disease-recognition-container .list-scroll-wrapper,
  .disease-recognition-container .image-viewer {
    height: auto;
    min-height: 360px;
  }

  .disease-recognition-container .main-image {
    height: 350px;
  }
}

@media (max-width: 760px) {
  .disease-recognition-container {
    padding: 12px;
  }

  .disease-recognition-container .card-header,
  .disease-recognition-container .simple-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .disease-recognition-container .upload-actions,
  .disease-recognition-container .action-group,
  .disease-recognition-container .model-select {
    width: 100%;
  }
}
</style>
