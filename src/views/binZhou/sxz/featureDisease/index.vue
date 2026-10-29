<template>
  <div class="disease-recognition-container smart-agri-theme" ref="containerRef">
    <header class="topbar">
      <div class="brand-area">
        <div class="brand" />
        <nav class="nav-list" aria-label="病害功能导航">
          <router-link class="nav-item" to="/disease-analysis">病害分析</router-link>
          <div class="nav-dropdown active">
            <button type="button" class="nav-item nav-trigger active" aria-current="page">
              <span>病害识别</span>
              <ElIcon class="nav-caret"><ArrowDown /></ElIcon>
            </button>
            <div class="nav-menu">
              <router-link class="nav-menu-item active" to="/featureDisease">手动上传</router-link>
              <router-link class="nav-menu-item" to="/sxz/disease-auto-task">自动识别</router-link>
            </div>
          </div>
        <router-link class="nav-item" to="/disease-images">识别历史</router-link>
          <router-link class="nav-item" to="/disease-report">病害报告</router-link>
        </nav>
      </div>
      <div class="top-actions">
        <button type="button" class="home-button" @click="router.push('/home')">
          <ElIcon><House /></ElIcon>
          <span>返回首页</span>
        </button>
      </div>
    </header>

    <div class="top-section">
      <el-row :gutter="20" class="full-height-row">
        <!-- 左侧：图片资源 -->
        <el-col :span="6" class="full-height-col">
          <el-card class="box-card full-height-card side-card" shadow="hover">
            <template #header>
              <div class="card-header simple-header image-resource-header">
                <div class="resource-title-row">
                  <span class="header-title">图像资源</span>
                </div>

                <div class="upload-actions">
                  <el-button
                    class="upload-single-btn"
                    type="primary"
                    @click="triggerFileInput"
                  >
                    单张上传
                  </el-button>

                  <el-button
                    class="upload-batch-btn"
                    type="primary"
                    plain
                    @click="triggerFolderInput"
                  >
                    批量上传
                  </el-button>

                  <el-button
                    class="upload-delete-btn"
                    type="danger"
                    plain
                    @click="clearAllImages"
                    :disabled="fileList.length === 0"
                  >
                    删除
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
                  <el-icon class="empty-icon"><Picture /></el-icon>
                  <span>暂无待识别病虫害图像</span>
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
        <el-col :span="12" class="full-height-col">
          <el-card class="box-card full-height-card main-preview-card" shadow="hover">
            <template #header>
              <div class="card-header simple-header">
                <span class="header-title">视觉终端</span>

                <div class="action-group">
                  <el-select
                    v-model="selectedModelId"
                    class="model-select"
                    placeholder="选择识别模型"
                    filterable
                    :loading="isModelLoading"
                    :disabled="isDiagnosing || isBatchDiagnosing"
                    aria-label="选择病虫害识别模型"
                  >
                    <el-option
                      v-for="model in modelOptions"
                      :key="model.modelId"
                      :label="model.modelName || `模型 ${model.modelId}`"
                      :value="model.modelId"
                    />
                  </el-select>

                  <!-- <el-button plain @click="goToDiseaseResult">
                    <el-icon style="margin-right:4px"><Clock /></el-icon>
                    查看病虫害识别结果
                  </el-button> -->

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
                      isBatchDiagnosing ||
                      completedCount === fileList.length
                    "
                    @click="runBatchDiagnosis"
                  >
                    全部识别
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
                <span class="header-title">识别结果</span>
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
      <!-- <div class="resize-handle" @mousedown="startResize"></div> -->

      <el-card class="box-card table-card" shadow="hover">
        <template #header>
          <div class="card-header simple-header">
            <span class="header-title">结果详情</span>

            <div class="action-group">
              
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
import { ref, computed, onActivated, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, Download, Monitor, Picture, Close, Clock, House } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

import { listImage, addImage } from '@/api/binZhou/xwq/image'
import { listDiseaseImages as listDiseaseHistory } from '@/api/binZhou/sxz/diseaseImage'
import { predictDiseaseByImage } from '@/api/binZhou/sxz/diseaseRecognition'
import { listModel } from '@/api/binZhou/xwq/model'

const router = useRouter()

// 临时默认病虫害模型 ID：数据库 xwq_ai_model 中 model_id = 2。
// 当前可以把 model_id=2 的 model_url 临时配置为虫情模型地址，后续替换为真实病虫害模型地址。
const DEFAULT_DISEASE_MODEL_ID = 2

const selectedModelId = ref(DEFAULT_DISEASE_MODEL_ID)
const modelOptions = ref([])
const isModelLoading = ref(false)
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

const resetCurrentSession = () => {
  fileList.value = []
  tableData.value = []
  currentImageIndex.value = -1
  previewUrl.value = ''
  sessionStorage.removeItem(STORAGE_KEY)
}

const hasInitialized = ref(false)

const initializePage = async () => {
  resetCurrentSession()
  await Promise.all([
    loadModelOptions(),
    loadRecentDiseaseResults()
  ])
}

onMounted(async () => {
  await initializePage()
  hasInitialized.value = true
})

onActivated(() => {
  if (hasInitialized.value) initializePage()
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

// 加载病虫害识别模型列表
const loadModelOptions = async () => {
  isModelLoading.value = true
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
  } finally {
    isModelLoading.value = false
  }
}

// 默认展示最近一条手动识别记录，方便进入页面后直接演示完整流程。
const loadRecentDiseaseResults = async () => {
  try {
    const res = await listDiseaseHistory({
      pageNum: 1,
      pageSize: 1,
      recordMode: '手动上传'
    })

    const row = res.rows?.[0]
    if (!row) return

    const imageUrl = normalizeImageUrl(row.imageUrl || row.resultImageUrl)
    const result = {
      diseaseName: row.diseaseName || '未知病虫害',
      diseaseConfidence: Number(row.confidence ?? row.diseaseConfidence ?? 0),
      diseaseResult: row.diseaseResult || '',
      diseaseDesc: row.diseaseDesc || '',
      diseaseAdvice: row.diseaseAdvice || '',
      warningLevel: row.warningLevel || '无'
    }
    const record = {
      imageId: row.imageId,
      recordId: row.recordId,
      diseaseId: row.diseaseId,
      fileName: row.imageName || `图片ID：${row.imageId}`,
      imageUrl,
      ...result
    }

    fileList.value = [{
      id: row.imageId,
      imageId: row.imageId,
      name: record.fileName,
      url: imageUrl,
      rawUrl: row.imageUrl || row.resultImageUrl,
      cropType: row.cropType || row.diseaseCrop || '枣树',
      status: '已识别',
      result,
      isInitialRecord: true
    }]
    currentImageIndex.value = 0
    tableData.value = [record]
  } catch (e) {
    console.error('加载最近病虫害识别结果失败：', e)
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
    if (fileList.value.length === 1 && fileList.value[0].isInitialRecord) {
      resetCurrentSession()
    }

    for (const file of files) {
      const savedImage = await uploadAndCreateImage(file)
      fileList.value.push(toQueueImage(savedImage))
    }

    if (currentImageIndex.value < 0 && fileList.value.length > 0) {
      currentImageIndex.value = 0
    }
    ElMessage.success(`成功上传并入库 ${files.length} 张图片`)
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
    imageA: '枣树'
  }

  const addRes = await addImage(imageData)
  if (addRes.code !== 200) {
    throw new Error(addRes.msg || '图片信息入库失败')
  }

  if (addRes.data?.imageId) {
    return { ...imageData, ...addRes.data }
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

const toQueueImage = (item) => ({
  id: item.imageId,
  imageId: item.imageId,
  name: item.imageName,
  url: normalizeImageUrl(item.imageUrl),
  rawUrl: item.imageUrl,
  imageAiType: item.imageAiType,
  imageSource: item.imageSource,
  cropType: item.imageA || '枣树',
  status: getImageStatusText(item.imageStatus),
  result: null
})

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
      cropType: imageItem.cropType || '枣树',
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

      const existIdx = tableData.value.findIndex(item => item.diseaseId === newRecord.diseaseId)
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
  const pendingCount = fileList.value.length - completedCount.value
  if (pendingCount === 0) {
    ElMessage.info('所有图像均已识别完毕')
    return
  }

  isBatchDiagnosing.value = true
  ElMessage.warning(`开始批量识别，共待处理 ${pendingCount} 张图像...`)

  for (let i = 0; i < fileList.value.length; i++) {
    if (fileList.value[i].status === '已识别') continue

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
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  box-sizing: border-box;
  height: 88px;
  padding: 0 32px 0 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #edf1f3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  margin: -16px -16px 16px;
}

.brand-area,
.brand,
.top-actions {
  display: flex;
  align-items: center;
}

.top-actions {
  margin-left: auto;
  gap: 10px;
  flex-shrink: 0;
}

.brand-area {
  gap: 0;
}

.brand {
  width: 0;
  gap: 0;
  overflow: hidden;
}

.home-button {
  min-width: 116px;
  height: 44px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #2f7d58;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #c9e4d8;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f5fbf8 100%);
  box-shadow: 0 4px 12px rgba(35, 105, 76, 0.08);
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}

.home-button .el-icon {
  font-size: 17px;
}

.home-button:hover {
  color: #1f6f4a;
  border-color: #8fcbb1;
  background: #eef9f4;
  box-shadow: 0 8px 18px rgba(35, 105, 76, 0.14);
  transform: translateY(-1px);
}

.home-button:active {
  box-shadow: 0 3px 8px rgba(35, 105, 76, 0.1);
  transform: translateY(0) scale(0.98);
}

.home-button:focus-visible {
  outline: 2px solid rgba(79, 132, 225, 0.78);
  outline-offset: 3px;
}

.nav-list {
  height: 88px;
  display: flex;
  align-items: center;
  gap: 46px;
  flex-shrink: 0;
}

.nav-item {
  position: relative;
  height: 88px;
  display: flex;
  align-items: center;
  color: #65736f;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 220ms ease, transform 220ms ease;
  touch-action: manipulation;
}

.nav-item::after {
  content: "";
  position: absolute;
  right: 8px;
  bottom: 0;
  left: 8px;
  height: 4px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(90deg, #50a879 0%, #5c85e8 100%);
  opacity: 0;
  transform: scaleX(0.35);
  transform-origin: center;
  transition: opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-item:hover {
  color: #347e59;
  transform: translateY(-1px);
}

.nav-item:hover::after {
  opacity: 0.42;
  transform: scaleX(0.6);
}

.nav-item:focus-visible {
  outline: 2px solid rgba(79, 132, 225, 0.78);
  outline-offset: -6px;
  border-radius: 6px;
}

.nav-item.active {
  color: #347e59;
  font-weight: 700;
}

.nav-item.active::after {
  opacity: 1;
  transform: scaleX(1);
}

.nav-dropdown {
  position: relative;
  height: 88px;
  display: flex;
  align-items: center;
}

.nav-trigger {
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
}

.nav-caret {
  font-size: 13px;
  transition: transform 200ms ease;
}

.nav-dropdown:hover .nav-caret,
.nav-dropdown:focus-within .nav-caret {
  transform: rotate(180deg);
}

.nav-menu {
  position: absolute;
  top: 72px;
  left: 50%;
  z-index: 40;
  min-width: 150px;
  padding: 8px;
  display: grid;
  gap: 4px;
  border: 1px solid #ddebe5;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 34px rgba(32, 78, 58, 0.14);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform: translate(-50%, 8px) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms ease;
}

.nav-menu::before {
  content: "";
  position: absolute;
  top: -12px;
  right: 0;
  left: 0;
  height: 12px;
}

.nav-dropdown:hover .nav-menu,
.nav-dropdown:focus-within .nav-menu {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transform: translate(-50%, 0) scale(1);
}

.nav-menu-item {
  min-height: 36px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  color: #51635d;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 6px;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
}

.nav-menu-item:hover,
.nav-menu-item.active {
  color: #25794f;
  background: #eef9f4;
}

.nav-menu-item:hover {
  transform: translateX(2px);
}

@media (max-width: 1366px) {
  .topbar {
    padding-right: 24px;
    padding-left: 32px;
  }

  .nav-list {
    gap: 32px;
  }

  .nav-item {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-item::after,
  .nav-caret,
  .nav-menu,
  .nav-menu-item,
  .home-button {
    transition: none;
  }

  .nav-item:hover,
  .nav-menu-item:hover,
  .home-button:hover {
    transform: none;
  }
}

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
  background: #f5f7f8;
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
/* 操作区：中间区域按钮保持横向排列，左侧上传按钮采用主次分层布局 */
.action-group {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.action-group {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

/* 图像资源卡片头部：标题在上，按钮在下 */
.image-resource-header {
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 12px;
  padding: 14px 18px 16px;
}

.resource-title-row {
  display: flex;
  align-items: center;
}

.image-resource-header .header-title {
  white-space: nowrap;
}

/* 图像资源按钮区：三按钮平铺 */
.upload-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

/* 中间视觉终端按钮保持原样 */
.action-group :deep(.el-button) {
  height: 36px;
  margin-left: 0;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

/* 左侧图像资源按钮：和右侧识别按钮尺寸统一 */
.upload-actions :deep(.el-button) {
  width: 100%;
  height: 36px;
  margin-left: 0;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

/* 批量上传：绿色按钮 */
.upload-actions :deep(.upload-batch-btn) {
  color: #fff;
  border-color: #62bd8a;
  background: linear-gradient(135deg, #55c987, #2f9f66);
}

.upload-actions :deep(.upload-batch-btn:hover) {
  color: #fff;
  border-color: #2f9f66;
  background: linear-gradient(135deg, #4abb7d, #2b915e);
}

/* 单张上传：蓝色按钮 */
.upload-actions :deep(.upload-single-btn) {
  color: #fff;
  border-color: #8fb7ff;
  background: linear-gradient(135deg, #87b1ff, #5f8fea);
}

.upload-actions :deep(.upload-single-btn:hover) {
  color: #fff;
  border-color: #5f8fea;
  background: linear-gradient(135deg, #78a5f7, #517fde);
}

/* 删除：浅红色按钮 */
.upload-actions :deep(.upload-delete-btn) {
  color: #de6d65;
  border-color: #f1c9c5;
  background: #fff7f6;
}

.upload-actions :deep(.upload-delete-btn:hover) {
  color: #cf5f57;
  border-color: #eab4ae;
  background: #fff1ef;
}

.upload-actions :deep(.upload-delete-btn.is-disabled),
.upload-actions :deep(.upload-delete-btn.is-disabled:hover) {
  opacity: 0.55;
  color: #de6d65;
  border-color: #f1c9c5;
  background: #fff7f6;
  box-shadow: none;
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


/* 左侧图片列表 */
.list-stats {
  box-sizing: border-box;
  width: calc(100% + 16px);
  margin-right: -8px;
  margin-left: -8px;
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

.list-scroll-wrapper :deep(.el-scrollbar__view) {
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
  box-sizing: border-box;
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  color: #b7bdc6;
  transform: translateY(-20px);
}

.empty-tip,
.image-viewer :deep(.el-empty__description p),
.agri-table :deep(.el-table__empty-text) {
  font-family: inherit;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0;
  color: #b7bdc6;
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

.table-card .card-header {
  box-shadow: none;
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
/* Keep all three workbench cards aligned and share one compact header rhythm. */
.full-height-card :deep(.el-card__header) {
  box-sizing: border-box;
  height: 80px;
  min-height: 80px;
  flex: 0 0 80px;
  padding: 0 !important;
  position: relative;
  z-index: 1;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color) !important;
  box-shadow: none;
}

.card-header,
.image-resource-header {
  box-sizing: border-box;
  width: 100%;
  height: 79px;
  min-height: 79px;
  padding: 12px 16px;
  position: relative;
  box-shadow: none;
}

.image-resource-header {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-right: 16px;
}

.resource-title-row {
  flex: 0 0 auto;
}

.upload-actions {
  width: auto;
  min-width: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.upload-actions :deep(.el-button) {
  width: auto;
  min-width: 0;
  height: 36px;
  margin: 0;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: none;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.upload-actions :deep(.upload-single-btn) {
  color: #fff;
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.upload-actions :deep(.upload-single-btn:hover) {
  color: #fff;
  border-color: var(--el-color-primary-light-3);
  background: var(--el-color-primary-light-3);
}

.upload-actions :deep(.upload-batch-btn) {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
}

.upload-actions :deep(.upload-batch-btn:hover) {
  color: #fff;
  border-color: var(--el-color-primary);
  background: var(--el-color-primary);
}

.upload-actions :deep(.upload-delete-btn) {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-7);
  background: var(--el-color-danger-light-9);
}

.upload-actions :deep(.upload-delete-btn:hover) {
  color: #fff;
  border-color: var(--el-color-danger);
  background: var(--el-color-danger);
}

.upload-actions :deep(.upload-delete-btn.is-disabled),
.upload-actions :deep(.upload-delete-btn.is-disabled:hover) {
  opacity: .55;
  color: var(--el-color-danger-light-3);
  border-color: var(--el-color-danger-light-8);
  background: var(--el-color-danger-light-9);
}

@media (max-width: 1500px) {
  .card-header { padding-right: 12px; padding-left: 12px; }
  .image-resource-header { padding-right: 12px; padding-left: 12px; }
  .upload-actions { gap: 6px; }
  .upload-actions :deep(.el-button) { padding: 0 10px; font-size: 13px; }
}

@media (max-width: 1280px) {
  .full-height-card :deep(.el-card__header) { height: 72px; min-height: 72px; flex-basis: 72px; }
  .card-header,
  .image-resource-header { height: 71px; min-height: 71px; }
}
</style>
