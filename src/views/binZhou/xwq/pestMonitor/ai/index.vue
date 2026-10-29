<template>
  <div class="pest-monitor-page pest-ai-page">
    <div class="module-tabs">
      <button class="tab" @click="goTo('/xwq/pestMonitor/analysis')">总览</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/image')">虫情图片</button>
      <button class="tab active">智能分析</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/report')">历史数据与报告</button>
      <!-- <button class="tab" @click="showBuilding">设备数据</button> -->
      <div class="toolbar-spacer"></div>
    </div>

    <!-- <div class="predict-toolbar">
      <div>
        <strong>智能分析</strong>
        <span>图像资源仅显示本次上传的虫情图片，不自动加载历史图片数据。</span>
      </div>
      <div class="predict-actions">
        <el-button size="small" @click="clearCurrent">清空图片</el-button>
        <el-button size="small" type="success" plain @click="goTo('/xwq/pestMonitor/image')">图片管理</el-button>
      </div>
    </div> -->

    <div class="top-section">
      <el-row :gutter="16" class="full-row">
        <el-col :xs="24" :lg="5" class="full-col">
        <el-card class="panel-card image-list-card" shadow="never">
          <template #header>
            <div class="card-header">
              <!-- <span>图像资源</span> -->
              <div class="header-actions btn-group">
                <el-button class="reference-action-btn reference-primary-btn" size="small" type="primary" plain @click="triggerFileInput(false)">单张</el-button>
                <el-button class="reference-action-btn reference-secondary-btn" size="small" type="success" plain @click="triggerFileInput(true)">批量</el-button>
                <!-- <el-button size="small" type="warning" plain @click="triggerFolderInput">照片文件夹</el-button> -->
                <el-button class="reference-action-btn reference-secondary-btn" size="small" type="danger" plain :disabled="!fileList.length" @click="clearCurrent">清空</el-button>
                <input
                  ref="fileInput"
                  type="file"
                  :multiple="fileInputMultiple"
                  accept="image/*"
                  class="hidden-input"
                  @change="handleFiles"
                />
                <input
                  ref="folderInput"
                  type="file"
                  webkitdirectory
                  directory
                  multiple
                  accept="image/*"
                  class="hidden-input"
                  @change="handleFolderFiles"
                />
              </div>
            </div>
          </template>

          <div class="stat-strip">
            <span>已选择 {{ fileList.length }} 张</span>
            <span>待识别 {{ pendingCount }} 张</span>
            <span>已成功入库 <b>{{ completedCount }}</b></span>
          </div>

          <el-scrollbar class="image-scroll">
            <el-empty v-if="!fileList.length" description="暂无虫情图片" :image-size="90" />
            <div
              v-for="(item, index) in fileList"
              :key="item.localId || item.imageId || index"
              class="image-item"
              :class="{ active: currentIndex === index, done: item.status === '已识别' }"
              @click="currentIndex = index"
            >
              <el-image
                :src="getThumbnailUrl(item)"
                fit="cover"
                class="thumb"
              >
                <template #error>
                  <div class="thumb-error">加载失败</div>
                </template>
              </el-image>
              <div class="image-meta">
                <strong :title="item.displayName || item.name">
                  {{ item.displayName || item.name }}
                </strong>
                <el-tag size="small" :type="statusType(item.status)" effect="plain">{{ item.status }}</el-tag>
              </div>
              <el-icon class="remove-icon" @click.stop="removeImage(index)"><Close /></el-icon>
            </div>
          </el-scrollbar>
        </el-card>
      </el-col>

        <el-col :xs="24" :lg="13" class="full-col">
        <el-card class="panel-card preview-card" shadow="never">
          <template #header>
            <div class="card-header">
              <!-- <span>视觉识别终端</span> -->
              <div class="model-actions action-group">
                <el-cascader
                  v-model="bindingScopePath"
                  class="device-binding-cascader"
                  placeholder="园区 / 地块 / 角落 / 设备（可选）"
                  filterable
                  clearable
                  :props="bindingScopeProps"
                  @change="handleBindingScopeChange"
                />
                <el-select v-model="selectedModelId" placeholder="选择虫情模型" filterable clearable class="model-select">
                  <el-option v-for="item in modelOptions" :key="item.modelId" :label="item.modelName" :value="item.modelId" />
                </el-select>
                <el-button
                  class="reference-action-btn reference-primary-btn"
                  type="primary"
                  :disabled="!currentImage || !currentImage.file || recognizing"
                  @click="recognizeCurrent"
                >
                  单张识别
                </el-button>
                <el-button
                  class="reference-action-btn reference-secondary-btn"
                  type="success"
                  plain
                  :disabled="!fileList.some(item => item.file) || recognizing"
                  @click="recognizeAll"
                                >
                  批量识别
                </el-button>
                                <div v-if="currentImage" class="preview-toggle" @click.stop>
                  <el-button
                    class="reference-action-btn"
                    :class="previewMode === 'original' ? 'reference-primary-btn' : 'reference-secondary-btn'"
                    :type="previewMode === 'original' ? 'primary' : 'success'"
                    :plain="previewMode !== 'original'"
                    :disabled="!originalPreviewUrl"
                    @click="switchPreview('original')"
                  >
                    原图
                  </el-button>
                  <el-button
                    class="reference-action-btn"
                    :class="previewMode === 'result' ? 'reference-primary-btn' : 'reference-secondary-btn'"
                    :type="previewMode === 'result' ? 'primary' : 'success'"
                    :plain="previewMode !== 'result'"
                    :disabled="!resultPreviewUrl"
                    @click="switchPreview('result')"
                  >
                    结果图
                  </el-button>
                </div>
              </div>
            </div>
          </template>

          <div class="preview-stage" v-loading="recognizing || uploading" :element-loading-text="loadingText">
            <template v-if="currentImage">
              <el-image
                v-if="currentPreviewUrl"
                :key="currentPreviewKey"
                :src="currentPreviewUrl"
                fit="contain"
                class="main-image"
                :preview-src-list="currentPreviewList"
                :initial-index="0"
                :infinite="false"
                :z-index="5000"
                preview-teleported
                hide-on-click-modal
                @error="handlePreviewError"
              />
              <el-empty v-else description="当前图片地址不可用" :image-size="120" />
              <span class="preview-mode-badge">
                {{ previewMode === 'result' ? '识别结果图' : '原始图片' }}
              </span>
              <div v-if="recognizing" class="scan-line"></div>
            </template>
            <el-empty v-else description="请上传或选择虫情图片" :image-size="130" />
          </div>
        </el-card>
      </el-col>

        <el-col :xs="24" :lg="6" class="full-col">
        <el-card class="panel-card result-card" shadow="never">
          <template #header>
            <div class="card-header"><span>识别报告</span></div>
          </template>

          <div v-if="currentResult" class="result-stack">
            <div class="result-main">
              <span>主要虫种</span>
              <strong>{{ currentResult.pestName }}</strong>
            </div>
            <div class="metric-box">
              <span>置信度</span>
              <el-progress :percentage="toPercent(currentResult.pestConfidence)" :stroke-width="12" />
            </div>
            <div class="metric-grid">
              <div><b>{{ currentResult.pestCount }}</b><span>当前数量</span></div>
              <div><b>{{ currentResult.pestTotalCount }}</b><span>虫体总数</span></div>
            </div>
            <div class="advice-box warning">
              <span>预警等级</span>
              <strong>{{ currentResult.warningLevel || '无' }}</strong>
            </div>
            <div class="advice-box">
              <span>识别结论</span>
              <p>{{ currentResult.pestResult || '暂无结论' }}</p>
            </div>
            <div class="advice-box green">
              <span>防治建议</span>
              <p>{{ currentResult.pestAdvice || '暂无建议' }}</p>
            </div>
            <div class="advice-box">
              <span>关联设备</span>
              <p>{{ formatBindingScope(currentResult) }}</p>
            </div>
          </div>
          <div v-else class="empty-result">
            <el-icon><Monitor /></el-icon>
            <span>等待模型返回识别结果</span>
          </div>
        </el-card>
        </el-col>
      </el-row>
    </div>

    <el-card class="panel-card table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>本次识别明细</span>
          <el-button class="reference-action-btn reference-secondary-btn" type="success" plain @click="exportExcel"><el-icon><Download /></el-icon>导出 Excel</el-button>
        </div>
      </template>
      <el-table :data="tableData" height="260" border stripe empty-text="暂无本次识别结果">
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column prop="fileName" label="图片名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="pestName" label="虫害类别" width="130" align="center">
          <template #default="{ row }"><el-tag type="danger" effect="plain">{{ row.pestName }}</el-tag></template>
        </el-table-column>
        <el-table-column label="置信度" width="110" align="center">
          <template #default="{ row }">{{ toPercent(row.pestConfidence) }}%</template>
        </el-table-column>
        <el-table-column prop="pestCount" label="当前数量" width="100" align="center" />
        <el-table-column prop="pestTotalCount" label="总数" width="90" align="center" />
        <el-table-column prop="warningLevel" label="预警等级" width="110" align="center" />
        <el-table-column prop="pestResult" label="识别结论" min-width="220" show-overflow-tooltip />
        <el-table-column prop="pestAdvice" label="防治建议" min-width="260" show-overflow-tooltip />
        <el-table-column label="关联设备" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ formatBindingScope(row) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vue-router'
import { Close, Download, Monitor } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listModel } from '@/api/binZhou/xwq/model'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'
import { predictUploadedPest } from '@/api/binZhou/xwq/pest'
import request from '@/utils/request'

const DEFAULT_CROP_TYPE = '冬枣'
const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'bmp',
  'gif',
  'webp',
  'tif',
  'tiff'
])
const SAMPLE_PEST_IMAGE_URL = `${import.meta.env.BASE_URL}binZhou/xwq/pest.jpeg`
const PEST_AI_CACHE_KEY = 'xwq:pest-ai:session'
const PEST_AI_CACHE_TTL = 30 * 60 * 1000
let pestAiMemoryCache = null
const DEFAULT_SCOPE = {
  parkName: '滨州园区',
  areaName: '01地块',
  locationName: '东北',
  deviceName: '滨州园区01地块虫情测试仪'
}
const samplePestResult = {
  imageId: 'sample-pest-image',
  recordId: 'sample-pest-record',
  pestId: 'sample-pest',
  imageName: '冬枣虫情.jpeg',
  imageUrl: SAMPLE_PEST_IMAGE_URL,
  pestName: '绿盲蝽',
  pestConfidence: 0.92,
  pestCount: 3,
  pestTotalCount: 6,
  pestResult: '识别显示冬枣区域疑似存在绿盲蝽危害，建议结合田间调查复核虫口密度。',
  pestAdvice: '加强黄板诱捕和果园巡查，优先清除杂草及虫源枝叶；达到防治阈值时选用低毒高效药剂轮换防治。',
  warningLevel: '中度预警',
  pestResultImgUrl: SAMPLE_PEST_IMAGE_URL,
  bboxJson: '',
  pestDetails: null,
  deviceId: 'sample-device',
  deviceName: '滨州园区01地块虫情测试仪',
  deviceSn: 'SAMPLE-PEST-001',
  parkId: 'sample-park',
  parkName: '滨州园区',
  areaId: 'sample-area',
  areaName: '01地块',
  locationId: 'sample-location',
  locationName: '东北',
  recordMode: '示例数据'
}

const router = useRouter()

const fileInput = ref(null)
const folderInput = ref(null)
const fileInputMultiple = ref(false)
const fileList = ref([])
const tableData = ref([])
const modelOptions = ref([])
const selectedModelId = ref(undefined)
const parkOptions = ref([])
const selectedParkId = ref(undefined)
const selectedAreaId = ref(undefined)
const selectedLocationId = ref(undefined)
const selectedDeviceId = ref(undefined)
const bindingScopePath = ref([])

const bindingScopeProps = {
  lazy: true,
  checkStrictly: true,
  emitPath: true,
  value: 'value',
  label: 'label',
  leaf: 'leaf',
  async lazyLoad(node, resolve) {
    try {
      if (node.level === 0) {
        if (!parkOptions.value.length) await loadParks()
        resolve(parkOptions.value.map(item => ({
          value: buildBindingScopeValue('park', item.parkId),
          label: item.parkName,
          leaf: false
        })))
        return
      }

      const parentId = getBindingScopeValueId(node.value)

      if (node.level === 1) {
        const res = await listAreaByParkId(parentId)
        const rows = getResponseRows(res)
        resolve(rows.map(item => ({
                    value: buildBindingScopeValue('area', item.areaId),
          label: item.areaName,
          leaf: false
        })))
        return
      }

      if (node.level === 2) {
        const res = await listLocationByAreaId(parentId)
        const rows = getResponseRows(res)
        resolve(rows.map(item => ({
          value: buildBindingScopeValue('location', item.locationId),
          label: item.locationName,
          leaf: false
        })))
        return
      }

      if (node.level === 3) {
        const res = await listDevice({
          pageNum: 1,
          pageSize: 999,
          locationId: parentId
        })
        const rows = getResponseRows(res)
          .filter(item => String(item.locationId || '') === String(parentId))
        resolve(rows.map(item => ({
          value: buildBindingScopeValue('device', item.deviceId),
          label: `${item.deviceName || '未命名设备'}${item.deviceSn ? `（${item.deviceSn}）` : ''}`,
          leaf: true
        })))
        return
      }

      resolve([])
    } catch (error) {
      console.error(error)
      ElMessage.warning('关联范围加载失败，仍可不绑定设备进行识别')
      resolve([])
    }
  }
}
const currentIndex = ref(-1)
const recognizing = ref(false)
const uploading = ref(false)
const previewMode = ref('original')

const currentImage = computed(() => {
  return fileList.value[currentIndex.value] || null
})

const currentResult = computed(() => {
  return currentImage.value?.result || null
})

// CODEX-PREVIEW-FIX: keep original/result URLs independent so switching is deterministic.
const originalPreviewUrl = computed(() => {
  return getOriginalPreviewUrl(currentImage.value)
})

const resultPreviewUrl = computed(() => {
  return getResultPreviewUrl(currentImage.value)
})

const currentPreviewUrl = computed(() => {
  return previewMode.value === 'result'
    ? resultPreviewUrl.value
    : originalPreviewUrl.value
})

const currentPreviewKey = computed(() => {
  const imageKey = currentImage.value?.localId
    || currentImage.value?.imageId
    || currentIndex.value

  return `${imageKey}:${previewMode.value}`
})

const currentPreviewList = computed(() => {
  return currentPreviewUrl.value
    ? [currentPreviewUrl.value]
    : []
})

const completedCount = computed(() => {
  return fileList.value.filter(
    item => item.status === '已识别'
  ).length
})

const pendingCount = computed(() => {
  return fileList.value.filter(
    item => item.status !== '已识别'
  ).length
})

const loadingText = computed(() => {
  return uploading.value
    ? '图片临时上传中...'
    : 'AI 模型识别中...'
})

watch(currentIndex, () => {
  previewMode.value = resultPreviewUrl.value
    ? 'result'
    : 'original'
})

onMounted(async () => {
  if (!restoreSessionState()) {
    applySampleData()
  }
  loadModels()
  await loadParks()
  if (!bindingScopePath.value.length) {
    await initDefaultBindingScope()
  }
})

watch([
  fileList,
  tableData,
  currentIndex,
  selectedModelId,
  bindingScopePath,
  previewMode
], saveSessionState, { deep: true })

onBeforeUnmount(() => {
  saveSessionState()
})

function goTo(path) {
  router.push(path)
}

function applySampleData() {
  const sampleImage = {
    localId: 'sample-pest-local',
    fileKey: 'sample-pest',
    file: null,
    relativePath: '',
    imageId: samplePestResult.imageId,
    name: samplePestResult.imageName,
    displayName: samplePestResult.imageName,
    localUrl: SAMPLE_PEST_IMAGE_URL,
    rawUrl: SAMPLE_PEST_IMAGE_URL,
    imageSize: 0,
    imageFormat: 'jpeg',
    status: '已识别',
    cropType: DEFAULT_CROP_TYPE,
    result: { ...samplePestResult },
    isSample: true
  }

  fileList.value = [sampleImage]
  tableData.value = [{
    imageId: samplePestResult.imageId,
    fileName: samplePestResult.imageName,
    ...samplePestResult,
    isSample: true
  }]
  currentIndex.value = 0
  previewMode.value = 'result'
}

function clearSampleData() {
  if (!fileList.value.some(item => item.isSample)) return

  revokeAllLocalUrls(fileList.value.filter(item => item.isSample))
  fileList.value = []
  tableData.value = []
  currentIndex.value = -1
  previewMode.value = 'original'
}

async function loadParks() {

  try {
    const res = await listPark({ pageNum: 1, pageSize: 999 })
    parkOptions.value = getResponseRows(res)
  } catch (error) {
    console.error(error)
    parkOptions.value = []
    ElMessage.warning('园区列表加载失败，仍可不绑定设备进行识别')
  }
}

async function initDefaultBindingScope() {
  const park = parkOptions.value.find(
    item => item.parkName === DEFAULT_SCOPE.parkName
  )
  if (!park) return

  selectedParkId.value = park.parkId
  bindingScopePath.value = [buildBindingScopeValue('park', park.parkId)]

  try {
    const areaRes = await listAreaByParkId(park.parkId)
    const area = getResponseRows(areaRes).find(
      item => item.areaName === DEFAULT_SCOPE.areaName
    )
    if (!area) return

    selectedAreaId.value = area.areaId
    bindingScopePath.value.push(buildBindingScopeValue('area', area.areaId))

    const locationRes = await listLocationByAreaId(area.areaId)
    const location = getResponseRows(locationRes).find(
      item => item.locationName === DEFAULT_SCOPE.locationName
    )
    if (!location) return

    selectedLocationId.value = location.locationId
    bindingScopePath.value.push(
      buildBindingScopeValue('location', location.locationId)
    )

    const deviceRes = await listDevice({
      pageNum: 1,
      pageSize: 999,
      locationId: location.locationId
    })
    const device = getResponseRows(deviceRes)
      .filter(
        item => String(item.locationId || '') === String(location.locationId)
      )
      .find(
        item => item.deviceName === DEFAULT_SCOPE.deviceName
          || item.deviceSn === DEFAULT_SCOPE.deviceName
      )
    if (!device) return

    selectedDeviceId.value = device.deviceId
    bindingScopePath.value.push(
      buildBindingScopeValue('device', device.deviceId)
    )
  } catch (error) {
    console.error(error)
    ElMessage.warning('默认监测范围加载失败，仍可手动选择或不绑定设备')
  }
}

function handleBindingScopeChange(path = []) {
  const values = Array.isArray(path) ? path : []
  selectedParkId.value = getBindingScopeValueId(values[0])
  selectedAreaId.value = getBindingScopeValueId(values[1])
  selectedLocationId.value = getBindingScopeValueId(values[2])
  selectedDeviceId.value = getBindingScopeValueId(values[3])
}

function buildBindingScopeValue(type, id) {
  return `${type}:${id}`
}

function getBindingScopeValueId(value) {
  if (value === undefined || value === null || value === '') return undefined
  return String(value).includes(':')
    ? String(value).split(':').pop()
    : value
}

async function loadModels() {
  try {
    const res = await listModel({
      pageNum: 1,
      pageSize: 100,
      modelType: '虫情',
      modelStatus: 1
    })

    modelOptions.value = (res.rows || res.data || []).filter(
      item =>
        String(item.modelType || '').trim() === '虫情'
        && Number(item.modelStatus) === 1
    )

    selectedModelId.value = modelOptions.value[0]?.modelId

    if (!modelOptions.value.length) {
      ElMessage.warning('未找到启用的虫情识别模型')
    }
  } catch (error) {
    console.error(error)
    modelOptions.value = []
    selectedModelId.value = undefined
    ElMessage.error('虫情模型列表加载失败')
  }
}

async function triggerFileInput(multiple) {
  fileInputMultiple.value = Boolean(multiple)
  await nextTick()

  if (fileInput.value) {
    fileInput.value.value = ''
    fileInput.value.click()
  }
}

async function triggerFolderInput() {
  await nextTick()

  if (folderInput.value) {
    folderInput.value.value = ''
    folderInput.value.click()
  }
}

function handleFiles(event) {
  let files = Array.from(event.target.files || [])

  if (!fileInputMultiple.value && files.length > 1) {
    files = files.slice(0, 1)
  }

  addLocalFiles(files, false)
  event.target.value = ''
}

function handleFolderFiles(event) {
  const files = Array.from(event.target.files || [])
  addLocalFiles(files, true)
  event.target.value = ''
}

function addLocalFiles(files, fromFolder) {
  const imageFiles = files.filter(isImageFile)

    if (!imageFiles.length) {
    ElMessage.warning('未选择到可识别的图片文件')
    return
  }

  clearSampleData()

  const existingKeys = new Set(
    fileList.value.map(item => item.fileKey)
  )

  let addedCount = 0
  let duplicateCount = 0

  imageFiles.forEach(file => {
    const relativePath = file.webkitRelativePath || file.name
    const fileKey = [
      relativePath,
      file.size,
      file.lastModified
    ].join('|')

    if (existingKeys.has(fileKey)) {
      duplicateCount++
      return
    }

    const localUrl = URL.createObjectURL(file)

    fileList.value.push({
      localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fileKey,
      file,
      relativePath: fromFolder ? relativePath : '',
      imageId: undefined,
      name: uniqueName(file.name),
      displayName: fromFolder ? relativePath : file.name,
      localUrl,
      rawUrl: '',
      imageSize: file.size,
      imageFormat: getFileSuffix(file.name),
      status: '未识别',
      cropType: DEFAULT_CROP_TYPE,
      result: null
    })

    existingKeys.add(fileKey)
    addedCount++
  })

  if (addedCount > 0 && currentIndex.value < 0) {
    currentIndex.value = 0
  }

  if (addedCount > 0) {
    ElMessage.success(
      `已添加 ${addedCount} 张图片，识别成功后才写入数据库`
    )
  }

  if (duplicateCount > 0) {
    ElMessage.info(`已忽略 ${duplicateCount} 张重复图片`)
  }
}

function isImageFile(file) {
  if (!file) return false
  if (String(file.type || '').startsWith('image/')) return true

  return IMAGE_EXTENSIONS.has(
    getFileSuffix(file.name)
  )
}

async function recognizeCurrent() {
  if (currentIndex.value < 0) return

  recognizing.value = true

  try {
    const bindingDeviceId = selectedDeviceId.value || undefined
    await recognizeAt(currentIndex.value, bindingDeviceId)
    ElMessage.success('虫情识别成功，三张业务表已入库')
  } catch (error) {
    console.error(error)
    ElMessage.error(
      getErrorMessage(error, '虫情识别失败，数据库未写入')
    )
  } finally {
    recognizing.value = false
    uploading.value = false
  }
}

async function recognizeAll() {
  if (!selectedModelId.value) {
    ElMessage.warning('请先选择虫情识别模型')
    return
  }

  recognizing.value = true
  const bindingDeviceId = selectedDeviceId.value || undefined

  let successCount = 0
  let failCount = 0

  try {
    for (
      let index = 0;
      index < fileList.value.length;
      index++
    ) {
      currentIndex.value = index

      try {
        await recognizeAt(index, bindingDeviceId)
        successCount++
      } catch (error) {
        failCount++
        console.error(
          `图片识别失败：${fileList.value[index]?.displayName}`,
          error
        )
      }
    }

    if (successCount > 0) {
      ElMessage.success(
        `批量识别成功 ${successCount} 张，均已写入三张业务表`
      )
    }

    if (failCount > 0) {
      ElMessage.warning(
        `${failCount} 张识别失败且未入库，其他图片已继续处理`
      )
    }
  } finally {
    recognizing.value = false
    uploading.value = false
  }
}

async function recognizeAt(index, bindingDeviceId = selectedDeviceId.value || undefined) {
  const image = fileList.value[index]

  if (!image?.file) {
    throw new Error('当前图片文件不存在')
  }

  if (!selectedModelId.value) {
    throw new Error('请先选择虫情识别模型')
  }

  image.status = '上传中'
  image.result = null
  image.imageId = undefined
  image.rawUrl = ''

  try {
    uploading.value = true
    const uploadResult = await uploadTemporaryFile(image.file)
    uploading.value = false

    image.rawUrl = uploadResult.imageUrl
    image.status = '识别中'

    const res = await predictUploadedPest({
      imageName: image.name,
      imageUrl: image.rawUrl,
      imageSize: image.imageSize,
      imageFormat: image.imageFormat,
      relativePath: image.relativePath || undefined,
      modelId: selectedModelId.value,
      cropType: image.cropType || DEFAULT_CROP_TYPE,
      deviceId: bindingDeviceId,
      recordMode: '手动上传'
        })

    const result = normalizePestResult(res.data || {})
    image.imageId = result.imageId
    image.rawUrl = result.imageUrl || image.rawUrl
    image.result = result
    image.resultUrl = getResultPreviewUrl(image)
    image.status = '已识别'

        updateTableRow(image, result)

    if (
      currentIndex.value === index
      && image.resultUrl
    ) {
      previewMode.value = 'result'
    }
  } catch (error) {
    uploading.value = false
    image.status = '识别失败'
    image.imageId = undefined
    image.rawUrl = ''
    image.result = null
    throw error
  }
}

async function uploadTemporaryFile(file) {
  const form = new FormData()
  form.append('file', file)

  const uploadRes = await request({
    url: '/common/upload',
    method: 'post',
    data: form,
    headers: {
      'Content-Type': 'multipart/form-data',
      repeatSubmit: false
    },
    timeout: 60000
  })

  const imageUrl = uploadRes.fileName || uploadRes.url

  if (!imageUrl) {
    throw new Error('上传接口未返回图片地址')
  }

  return {
    imageUrl
  }
}

function normalizePestResult(data) {
  return {
    imageId: data.imageId,
    recordId: data.recordId,
    pestId: data.pestId,
    imageName: data.imageName || '',
    imageUrl: data.imageUrl || '',
    pestName: data.pestName || '未知虫害',
    pestConfidence: toNumber(data.pestConfidence),
    pestCount: toNumber(data.pestCount),
    pestTotalCount: toNumber(data.pestTotalCount),
        pestResult: data.pestResult || '',
    pestAdvice: data.pestAdvice || '',
    warningLevel: data.warningLevel || '无',
    pestResultImgUrl:
      data.pestResultImgUrl
      || data.resultImageUrl
      || data.imageResultUrl
      || data.resultImgUrl
      || data.detectImageUrl
      || data.detectionImageUrl
      || data.annotatedImageUrl
      || data.resultUrl
      || '',
    bboxJson: data.bboxJson || '',
    pestDetails: Array.isArray(data.pestDetails)
      ? data.pestDetails
      : null,
    deviceId: data.deviceId,
    deviceName: data.deviceName || '',
    deviceSn: data.deviceSn || '',
    parkId: data.parkId,
    parkName: data.parkName || '',
    areaId: data.areaId,
    areaName: data.areaName || '',
    locationId: data.locationId,
    locationName: data.locationName || '',
    recordMode: data.recordMode || '手动上传'
  }
}

function updateTableRow(image, result) {
  const row = {
    localId: image.localId,
    imageId: result.imageId,
    fileName: image.displayName || image.name,
    ...result
  }

  const index = tableData.value.findIndex(
    item => item.localId === image.localId
      || String(item.imageId) === String(result.imageId)
  )

  if (index >= 0) {
    tableData.value.splice(index, 1, row)
  } else {
    tableData.value.unshift(row)
  }
}

function removeImage(index) {
  const removed = fileList.value[index]

  if (removed?.localUrl) {
    URL.revokeObjectURL(removed.localUrl)
  }

  fileList.value.splice(index, 1)

  tableData.value = tableData.value.filter(
    item =>
      String(item.imageId)
      !== String(removed?.imageId)
  )

  currentIndex.value = fileList.value.length
    ? Math.min(index, fileList.value.length - 1)
    : -1
}

function clearCurrent() {
  ElMessageBox.confirm(
        '仅清空本次选择列表；已识别成功并入库的数据不会删除，是否继续？',
    '提示',
    { type: 'warning' }
  )
    .then(() => {
      revokeAllLocalUrls()
      fileList.value = []
      tableData.value = []
      currentIndex.value = -1
      previewMode.value = 'original'
      clearSessionState()
    })
    .catch(() => {})
}

function revokeAllLocalUrls(list = fileList.value) {
  list.forEach(item => {
    if (item.localUrl && String(item.localUrl).startsWith('blob:')) {
      URL.revokeObjectURL(item.localUrl)
    }
  })
}

function saveSessionState() {
  const state = {
    savedAt: Date.now(),
    fileList: fileList.value,
    tableData: tableData.value,
    currentIndex: currentIndex.value,
    selectedModelId: selectedModelId.value,
    bindingScopePath: bindingScopePath.value,
    selectedParkId: selectedParkId.value,
    selectedAreaId: selectedAreaId.value,
    selectedLocationId: selectedLocationId.value,
    selectedDeviceId: selectedDeviceId.value,
    previewMode: previewMode.value
  }

  pestAiMemoryCache = state

  try {
    sessionStorage.setItem(
      PEST_AI_CACHE_KEY,
      JSON.stringify({
        ...state,
        fileList: state.fileList.map(serializeImageItem)
      })
    )
  } catch (error) {
    console.error(error)
  }
}

function restoreSessionState() {
  const state = getValidCachedState()
  if (!state?.fileList?.length) return false

  fileList.value = state.fileList
  tableData.value = state.tableData || []
  currentIndex.value = Math.min(
    Math.max(Number(state.currentIndex ?? 0), 0),
    fileList.value.length - 1
  )
  selectedModelId.value = state.selectedModelId
  bindingScopePath.value = state.bindingScopePath || []
  selectedParkId.value = state.selectedParkId
  selectedAreaId.value = state.selectedAreaId
  selectedLocationId.value = state.selectedLocationId
  selectedDeviceId.value = state.selectedDeviceId
  previewMode.value = state.previewMode || (resultPreviewUrl.value ? 'result' : 'original')
  return true
}

function getValidCachedState() {
  const now = Date.now()

  if (
    pestAiMemoryCache?.savedAt
    && now - pestAiMemoryCache.savedAt < PEST_AI_CACHE_TTL
  ) {
    return pestAiMemoryCache
  }

  try {
    const cache = JSON.parse(
      sessionStorage.getItem(PEST_AI_CACHE_KEY) || 'null'
    )

    if (!cache?.savedAt || now - cache.savedAt >= PEST_AI_CACHE_TTL) {
      clearSessionState()
      return null
    }

    return {
      ...cache,
      fileList: (cache.fileList || []).map(restoreImageItem)
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

function serializeImageItem(item) {
  return {
    ...item,
    file: null,
    localUrl: getOriginalPreviewUrl(item),
    resultUrl: getResultPreviewUrl(item)
  }
}

function restoreImageItem(item) {
  return {
    ...item,
    file: null,
    localUrl: normalizeImageUrl(item.localUrl),
    rawUrl: item.rawUrl || item.result?.imageUrl || '',
    resultUrl: normalizeImageUrl(item.resultUrl)
  }
}

function clearSessionState() {
  pestAiMemoryCache = null
  try {
    sessionStorage.removeItem(PEST_AI_CACHE_KEY)
  } catch (error) {
    console.error(error)
  }
}

function exportExcel() {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = [
    '图片名称',
    '数据来源',
    '设备名称',
    '设备编号',
    '园区',
    '地块',
    '采集位置',
    '虫害类别',
    '置信度',
    '当前数量',
    '总数',
    '预警等级',
    '识别结论',
    '防治建议'
  ]

  const rows = tableData.value.map(item => [
    item.fileName,
    item.recordMode || '手动上传',
    item.deviceName || '未关联设备',
    item.deviceSn || '',
    item.parkName || '',
    item.areaName || '',
    item.locationName || '',
    item.pestName,
    `${toPercent(item.pestConfidence)}%`,
    item.pestCount,
    item.pestTotalCount,
    item.warningLevel,
    item.pestResult,
    item.pestAdvice
  ])

  const html = `<table border="1"><tr>${
    headers.map(
      header => `<th>${escapeHtml(header)}</th>`
    ).join('')
  }</tr>${
    rows.map(row => `<tr>${
      row.map(
        value => `<td>${escapeHtml(value ?? '')}</td>`
      ).join('')
    }</tr>`).join('')
  }</table>`

  const blob = new Blob(
    [
      `<html><head><meta charset="UTF-8"></head>`
      + `<body>${html}</body></html>`
    ],
    {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    }
  )

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `虫情识别明细_${Date.now()}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function statusType(status) {
  if (status === '已识别') return 'success'
  if (status === '上传中' || status === '识别中') {
    return 'warning'
  }
  if (status === '识别失败') return 'danger'
  return 'info'
}

function toPercent(value) {
  const num = Number(value || 0)
  return Math.round(num <= 1 ? num * 100 : num)
}

function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function uniqueName(name) {
  const dot = name.lastIndexOf('.')
  const base = dot > -1 ? name.slice(0, dot) : name
  const suffix = dot > -1 ? name.slice(dot) : ''
  const random = Math.random().toString(36).slice(2, 8)
  return `${base}_${Date.now()}_${random}${suffix}`
}

function getFileSuffix(name) {
  const dot = String(name || '').lastIndexOf('.')
  return dot >= 0
    ? String(name).slice(dot + 1).toLowerCase()
    : ''
}

function getThumbnailUrl(item) {
  return getOriginalPreviewUrl(item)
}

function getOriginalPreviewUrl(item) {
  if (!item) return ''

  return normalizeImageUrl(
    item.localUrl
    || item.rawUrl
    || item.imageUrl
    || item.result?.imageUrl
  )
}

function getResultPreviewUrl(item) {
  if (!item) return ''

  return normalizeImageUrl(
    item.resultUrl
    || item.pestResultImgUrl
    || item.resultImageUrl
    || item.imageResultUrl
    || item.resultImgUrl
    || item.resultUrl
    || item.detectImageUrl
    || item.detectionImageUrl
    || item.annotatedImageUrl
    || item.result?.pestResultImgUrl
    || item.result?.resultImageUrl
    || item.result?.imageResultUrl
    || item.result?.resultImgUrl
    || item.result?.detectImageUrl
    || item.result?.detectionImageUrl
    || item.result?.annotatedImageUrl
  )
}

function normalizeImageUrl(url) {
  if (!url) return ''

    const value = String(url).trim().replace(/\\/g, '/')
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value

  const publicBase = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  if (
    value.startsWith('/binZhou/')
    || (publicBase && value.startsWith(`${publicBase}/binZhou/`))
  ) {
    return value
  }

  const base = String(
    import.meta.env.VITE_APP_BASE_API || ''
  ).replace(/\/$/, '')
  const basePattern = base
    ? new RegExp(`^${escapeRegExp(base)}(?=/|$)`, 'i')
    : null
  const path = (basePattern ? value.replace(basePattern, '') : value)
    .replace(
      /^\/(?:dev-api|prod-api|stage-api)(?=\/profile\/)/i,
      ''
    )

  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

function switchPreview(mode) {
  if (mode === 'original' && !originalPreviewUrl.value) {
    ElMessage.warning('当前识别记录没有可用的原图')
    return
  }

  if (mode === 'result' && !resultPreviewUrl.value) {
    ElMessage.warning('当前识别记录没有可用的结果图')
    return
  }

  previewMode.value = mode
}

function handlePreviewError() {
  if (previewMode.value === 'result') {
    previewMode.value = 'original'
    ElMessage.warning('结果图加载失败，已切换回原图')
    return
  }

  ElMessage.warning('原图加载失败，请检查图片地址')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg
    || error?.response?.data?.message
    || error?.message
    || fallback
}

function getResponseRows(response) {
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.rows)) return response.data.rows
  return []
}

function formatBindingScope(row) {
  if (!row?.deviceId) return '未关联设备'

  const device = row.deviceName || `设备${row.deviceId}`
  const sn = row.deviceSn ? ` / ${row.deviceSn}` : ''
  const scope = [row.parkName, row.areaName, row.locationName]
    .filter(Boolean)
    .join(' / ')

  return scope ? `${device}${sn}（${scope}）` : `${device}${sn}`
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
</script>

<style scoped>
.pest-monitor-page {
  --pm-green: #12b886;
  --pm-dark: #20302c;
  --pm-soft: #eefbf6;
  --pm-border: #e6edf0;
  min-height: calc(100vh - 84px);
  padding: 0 18px 22px;
  background: #f5f7fa;
  color: var(--pm-dark);
}
.module-tabs { height: 58px; display: flex; align-items: center; gap: 24px; background: #fff; border-bottom: 1px solid #e8edf0; margin: 0 -18px 18px; padding: 0 24px; }
.tab { border: 0; background: transparent; height: 58px; color: #5f6f6b; cursor: pointer; font-size: 15px; position: relative; white-space: nowrap; }
.tab i { display: inline-block; padding: 1px 5px; margin-right: 4px; border-radius: 5px; background: #12b886; color: #fff; font-size: 10px; font-style: normal; }
.tab.active { color: #12a878; font-weight: 700; }
.tab.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #12b886; border-radius: 3px 3px 0 0; }
.toolbar-spacer { flex: 1; }
.predict-toolbar { min-height: 54px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; padding: 0 2px; }
.predict-toolbar strong { margin-right: 12px; font-size: 15px; }
.predict-toolbar span { color: #7d8b87; font-size: 13px; }
.predict-actions { display: flex; gap: 8px; }
.workspace-row { margin-bottom: 16px; }
.panel-card { border: 1px solid var(--pm-border); border-radius: 16px; overflow: hidden; }
:deep(.el-card__header) { padding: 0; border-bottom: 1px solid var(--pm-border); }
.card-header { min-height: 54px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 700; }
.header-actions, .model-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.model-actions .el-select { width: 190px; }
.hidden-input { display: none; }
.image-list-card, .preview-card, .result-card { height: 560px; }
.stat-strip { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fbfa; color: #6b7b76; font-size: 13px; }
.stat-strip b { color: var(--pm-green); }
.image-scroll { height: 448px; padding: 8px; }
.image-item { position: relative; display: flex; gap: 10px; align-items: center; padding: 9px; margin-bottom: 8px; border: 1px solid transparent; border-radius: 12px; cursor: pointer; transition: .2s; }
.image-item:hover, .image-item.active { background: #f0faf6; border-color: #bfeedd; }
.image-item.done { box-shadow: inset 3px 0 0 var(--pm-green); }
.thumb { width: 54px; height: 54px; border-radius: 10px; flex-shrink: 0; background: #f1f5f9; }
.thumb-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
  background: #f4f4f5;
}
.image-meta { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.image-meta strong { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.remove-icon { position: absolute; right: 8px; top: 8px; color: #e85959; opacity: 0; }
.image-item:hover .remove-icon { opacity: 1; }
.preview-stage { position: relative; height: 505px; display: flex; align-items: center; justify-content: center; background: linear-gradient(45deg, #f8fbff 25%, transparent 25%) 0 0/24px 24px, #fff; }
.main-image { width: 100%; height: 100%; }
.preview-mode-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  padding: 5px 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  background: rgba(47, 125, 92, .88);
  box-shadow: 0 4px 12px rgba(47, 125, 92, .20);
  backdrop-filter: blur(5px);
}
.scan-line { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: #12b886; box-shadow: 0 0 14px #12b886; animation: scan 1.5s linear infinite; }
@keyframes scan { from { top: 0; } to { top: 100%; } }
.result-stack { height: 500px; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.result-main, .metric-box, .advice-box { padding: 14px; border-radius: 14px; background: #f8fbfa; border: 1px solid var(--pm-border); }
.result-main span, .metric-box span, .advice-box span { display: block; margin-bottom: 8px; color: #7b8a86; font-size: 12px; }
.result-main strong { color: #f03e3e; font-size: 22px; }
.metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.metric-grid div { padding: 14px; border-radius: 14px; background: var(--pm-soft); text-align: center; }
.metric-grid b { display: block; color: var(--pm-green); font-size: 24px; }
.metric-grid span { color: #71827c; font-size: 12px; }
.advice-box p { margin: 0; line-height: 1.7; color: #55635f; }
.advice-box.warning strong { color: #f59f00; }
.advice-box.green { border-left: 3px solid var(--pm-green); }
.empty-result { height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #9aa8a3; }
.empty-result .el-icon { font-size: 48px; }
.table-card :deep(.el-card__body) { padding: 0; }
@media (max-width: 1200px) { .image-list-card, .preview-card, .result-card { height: auto; margin-bottom: 16px; } .preview-stage, .result-stack, .empty-result { height: 420px; } .module-tabs { overflow-x: auto; } .predict-toolbar { flex-direction: column; align-items: flex-start; } }
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING: remove this block to roll back binding layout only. */
.pest-ai-page .device-binding-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 8px;
  min-width: min(100%, 430px);
}

.pest-ai-page .device-binding-group :deep(.el-select) {
  width: 100%;
}

@media (max-width: 1199px) {
  .pest-ai-page .device-binding-group {
    min-width: 100%;
  }
}
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   仅覆盖视觉样式，不改动 template、script、方法、功能或原有注释。 */
.pest-monitor-page {
  --ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-green-soft: #eef5ea;
  --ft-green-pale: #f7faf4;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e6eee3;
  --ft-danger: #c85b5b;
  min-height: calc(100vh - 84px);
  padding: 20px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.17), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.pest-monitor-page *,
.pest-monitor-page *::before,
.pest-monitor-page *::after {
  box-sizing: border-box;
}

.pest-monitor-page .module-tabs {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 7px 9px;
  margin-bottom: 16px;
  gap: 6px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 26px rgba(58, 88, 63, 0.08);
  backdrop-filter: blur(8px);
}

.pest-monitor-page .module-tabs .tab {
  position: relative;
  min-width: 104px;
  height: 40px;
  padding: 0 18px;
  color: var(--ft-text-secondary);
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.pest-monitor-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.pest-monitor-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 16px rgba(47, 125, 92, 0.20);
}

.pest-monitor-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.pest-monitor-page .toolbar-spacer {
  flex: 1 1 auto;
}

.pest-monitor-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.07);
}

.pest-monitor-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.pest-monitor-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.pest-monitor-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.pest-monitor-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 600;
}

.pest-monitor-page :deep(.el-input__wrapper),
.pest-monitor-page :deep(.el-select__wrapper),
.pest-monitor-page :deep(.el-cascader .el-input__wrapper),
.pest-monitor-page :deep(.el-date-editor.el-input__wrapper),
.pest-monitor-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.pest-monitor-page :deep(.el-input__wrapper:hover),
.pest-monitor-page :deep(.el-select__wrapper:hover),
.pest-monitor-page :deep(.el-cascader .el-input__wrapper:hover),
.pest-monitor-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.pest-monitor-page :deep(.el-input__wrapper.is-focus),
.pest-monitor-page :deep(.el-select__wrapper.is-focused),
.pest-monitor-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.pest-monitor-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.pest-monitor-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.pest-monitor-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.pest-monitor-page :deep(.el-pagination.is-background .el-pager li.is-active),
.pest-monitor-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.pest-monitor-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.pest-monitor-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.pest-monitor-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.pest-monitor-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.pest-monitor-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .pest-monitor-page {
    padding: 12px;
  }

  .pest-monitor-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .pest-monitor-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .pest-monitor-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .pest-monitor-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .pest-monitor-page .filter-form :deep(.el-form-item__content),
  .pest-monitor-page .filter-form :deep(.el-input),
  .pest-monitor-page .filter-form :deep(.el-select),
  .pest-monitor-page .filter-form :deep(.el-cascader),
  .pest-monitor-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.pest-monitor-page .workspace-row {
  margin-top: 0;
}

.pest-monitor-page .workspace-row > :deep(.el-col) {
  margin-bottom: 16px;
}

.pest-monitor-page .panel-card {
  height: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(58, 88, 63, 0.08);
}

.pest-monitor-page .panel-card :deep(.el-card__header) {
  min-height: 58px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
}

.pest-monitor-page .panel-card :deep(.el-card__body) {
  padding: 16px;
}

.pest-monitor-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 12px;
  color: #294635;
  font-weight: 800;
}

.pest-monitor-page .header-actions,
.pest-monitor-page .model-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pest-monitor-page .model-actions :deep(.el-select) {
  min-width: 190px;
}

.pest-monitor-page .stat-strip {
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

.pest-monitor-page .stat-strip b {
  color: var(--ft-green);
}

.pest-monitor-page .image-scroll {
  height: 510px;
}

.pest-monitor-page .image-item {
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
  transition: 0.2s ease;
}

.pest-monitor-page .image-item:hover {
  border-color: #b9d1bb;
  box-shadow: 0 7px 16px rgba(58, 88, 63, 0.08);
  transform: translateY(-1px);
}

.pest-monitor-page .image-item.active {
  background: #eaf3e7;
  border-color: #8db598;
  box-shadow: inset 3px 0 0 var(--ft-green);
}

.pest-monitor-page .image-item.done {
  border-right: 3px solid #76a987;
}

.pest-monitor-page .thumb {
  width: 72px;
  height: 60px;
  overflow: hidden;
  border: 1px solid #dce7da;
  border-radius: 8px;
}

.pest-monitor-page .image-meta {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.pest-monitor-page .image-meta strong {
  max-width: 100%;
  overflow: hidden;
  color: #344e3e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pest-monitor-page .remove-icon {
  color: #9aa89d;
  cursor: pointer;
}

.pest-monitor-page .remove-icon:hover {
  color: var(--ft-danger);
}

.pest-monitor-page .preview-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 510px;
  overflow: hidden;
  background:
    linear-gradient(rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    #f5f8f3;
  background-size: 24px 24px;
  border: 1px solid #dce8da;
  border-radius: 12px;
}

.pest-monitor-page .main-image {
  width: 100%;
  height: 500px;
}

.pest-monitor-page .scan-line {
  position: absolute;
  right: 4%;
  left: 4%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #5aa177, transparent);
  box-shadow: 0 0 12px rgba(47, 125, 92, 0.5);
}

.pest-monitor-page .result-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pest-monitor-page .result-main,
.pest-monitor-page .metric-box,
.pest-monitor-page .advice-box {
  padding: 14px;
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-radius: 11px;
}

.pest-monitor-page .result-main span,
.pest-monitor-page .metric-box > span,
.pest-monitor-page .advice-box > span {
  display: block;
  margin-bottom: 7px;
  color: var(--ft-muted);
  font-size: 12px;
}

.pest-monitor-page .result-main strong {
  color: #2d6046;
  font-size: 22px;
}

.pest-monitor-page .metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pest-monitor-page .metric-grid > div {
  padding: 15px;
  text-align: center;
  background: linear-gradient(145deg, #f8fbf5, #edf5e9);
  border: 1px solid #dce8da;
  border-radius: 11px;
}

.pest-monitor-page .metric-grid b {
  display: block;
  color: var(--ft-green);
  font-size: 24px;
}

.pest-monitor-page .metric-grid span {
  color: var(--ft-muted);
  font-size: 12px;
}

.pest-monitor-page .advice-box.warning {
  background: #fff8ec;
  border-color: #ead9b7;
}

.pest-monitor-page .advice-box.green {
  background: #eef7eb;
  border-color: #cfe1cd;
}

.pest-monitor-page .advice-box p {
  margin: 0;
  color: var(--ft-text-secondary);
  line-height: 1.7;
}

.pest-monitor-page .empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  flex-direction: column;
  gap: 12px;
  color: #91a095;
}

.pest-monitor-page .empty-result .el-icon {
  color: #7fa88a;
  font-size: 46px;
}

.pest-monitor-page .table-card {
  margin-top: 0;
}

@media (max-width: 1200px) {
  .pest-monitor-page .image-scroll,
  .pest-monitor-page .preview-stage {
    height: auto;
    min-height: 360px;
  }

    .pest-monitor-page .main-image {
    height: 350px;
  }
}

.pest-monitor-page,
.pest-monitor-page *,
.pest-monitor-page *::before,
.pest-monitor-page *::after,
.pest-monitor-page :deep(*) {
  font-family: inherit !important;
}
</style>

<style scoped>
.pest-monitor-page {
  --unified-green: #2f7d5c;
  --unified-green-hover: #256a4d;
  --unified-green-soft: #eef6f0;
  --unified-text: #24352d;
  --unified-muted: #5d7065;
  --unified-border: #d7e4d8;
  padding: 12px 16px 16px;
  color: var(--unified-text);
  font-family: inherit !important;
  line-height: 1.5;
}

.pest-monitor-page,
.pest-monitor-page *,
.pest-monitor-page *::before,
.pest-monitor-page *::after,
.pest-monitor-page :deep(*) {
  font-family: inherit !important;
}

.pest-monitor-page .module-tabs {
  min-height: 48px;
  height: auto;
  margin: 0 0 10px;
  padding: 4px 6px;
  gap: 4px;
  border-radius: 10px;
}

.pest-monitor-page .module-tabs .tab {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  font-size: 14px !important;
  font-weight: 600;
  line-height: 38px;
  border-radius: 8px;
}

.pest-monitor-page .filter-card {
  margin-bottom: 10px;
  border-radius: 10px;
}

.pest-monitor-page .filter-card :deep(.el-card__body) {
  padding: 10px 12px 2px;
}

.pest-monitor-page .filter-form {
  display: flex;
  align-items: flex-end;
  width: 100%;
  flex-wrap: wrap;
  gap: 0 14px;
}

.pest-monitor-page .filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 8px;
}

.pest-monitor-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: var(--unified-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 32px;
}

.pest-monitor-page .filter-form .search-actions {
  margin-left: auto;
}

.pest-monitor-page .button-row,
.pest-monitor-page .search-actions :deep(.el-form-item__content),
.pest-monitor-page .header-actions,
.pest-monitor-page .model-actions,
.pest-monitor-page .table-actions,
.pest-monitor-page .predict-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.pest-monitor-page .card-header,
.pest-monitor-page .section-title,
.pest-monitor-page .chart-toolbar,
.pest-monitor-page .influence-head,
.pest-monitor-page .image-toolbar,
.pest-monitor-page .pagination-row,
.pest-monitor-page .predict-toolbar,
.pest-monitor-page .stat-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.pest-monitor-page :deep(.el-card__header) {
  padding: 9px 12px;
}

.pest-monitor-page .card-header {
  min-height: 32px;
  padding: 0;
  font-size: 15px;
  font-weight: 700;
}

.pest-monitor-page .section-title {
  min-height: 32px;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
}

.pest-monitor-page :deep(.el-input__wrapper),
.pest-monitor-page :deep(.el-select__wrapper),
.pest-monitor-page :deep(.el-date-editor.el-input__wrapper),
.pest-monitor-page :deep(.el-cascader .el-input__wrapper) {
  min-height: 32px;
  border-radius: 8px;
}

.pest-monitor-page :deep(.el-button) {
  min-width: 72px;
  min-height: 32px;
  height: 32px;
  margin-left: 0;
  padding: 0 14px;
  font-size: 13px !important;
  font-weight: 600;
  line-height: 30px;
  border-radius: 8px;
  box-shadow: none;
  transform: none;
}

.pest-monitor-page :deep(.el-button--primary:not(.is-plain)),
.pest-monitor-page :deep(.el-button--success:not(.is-plain)) {
  color: #fff !important;
  background: var(--unified-green) !important;
  border-color: var(--unified-green) !important;
}

.pest-monitor-page :deep(.el-button--primary:not(.is-plain):hover),
.pest-monitor-page :deep(.el-button--success:not(.is-plain):hover) {
  background: var(--unified-green-hover) !important;
  border-color: var(--unified-green-hover) !important;
}

.pest-monitor-page :deep(.el-button.is-plain),
.pest-monitor-page :deep(.el-button--primary.is-plain),
.pest-monitor-page :deep(.el-button--success.is-plain) {
  color: var(--unified-green) !important;
  background: #fff !important;
  border-color: #abc9b3 !important;
}

.pest-monitor-page :deep(.el-button.is-plain:hover),
.pest-monitor-page :deep(.el-button--primary.is-plain:hover),
.pest-monitor-page :deep(.el-button--success.is-plain:hover) {
  color: var(--unified-green-hover) !important;
  background: var(--unified-green-soft) !important;
  border-color: #89b397 !important;
}

.pest-monitor-page :deep(.el-button--danger:not(.is-plain)) {
  color: #fff !important;
  background: #c45656 !important;
  border-color: #c45656 !important;
}

.pest-monitor-page :deep(.el-button--danger.is-plain) {
  color: #b94a4a !important;
  background: #fff8f7 !important;
  border-color: #e7b5b2 !important;
}

.pest-monitor-page :deep(.el-button.is-disabled),
.pest-monitor-page :deep(.el-button.is-disabled:hover) {
  color: #9aa89d !important;
  background: #f0f3ef !important;
  border-color: #dce5db !important;
  box-shadow: none !important;
}

.pest-monitor-page .workspace-row,
.pest-monitor-page .overview-grid,
.pest-monitor-page .main-grid {
  margin-bottom: 10px;
  gap: 10px;
}

.pest-monitor-page .white-card,
.pest-monitor-page .panel-card,
.pest-monitor-page .table-card,
.pest-monitor-page .report-summary,
.pest-monitor-page .preview-card,
.pest-monitor-page .pest-photo-card {
  border-radius: 10px;
}

.pest-monitor-page .image-toolbar,
.pest-monitor-page .pagination-row {
  min-height: 48px;
  padding: 8px 12px;
}

.pest-monitor-page .image-toolbar {
  margin-bottom: 10px;
}

.pest-monitor-page .pagination-row {
  margin-top: 10px;
}

.pest-monitor-page .pest-photo-grid {
  gap: 10px;
}

.pest-monitor-page :deep(.el-table) {
  font-size: 13px;
}

.pest-monitor-page :deep(.el-table th.el-table__cell),
.pest-monitor-page :deep(.el-table td.el-table__cell) {
  padding: 7px 0;
}

/* 与物候分析页保持一致的查询、重置按钮。 */
.pest-monitor-page .search-actions :deep(.el-button:nth-child(1)) {
  width: 88px;
  min-width: 88px;
  height: 32px;
  padding: 0;
  color: #fff !important;
  font-size: 14px !important;
  font-weight: 400;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
  border-radius: 4px;
}

.pest-monitor-page .search-actions :deep(.el-button:nth-child(1):hover) {
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.pest-monitor-page .search-actions :deep(.el-button:nth-child(2)) {
  width: 88px;
  min-width: 88px;
  height: 32px;
  padding: 0;
  color: #606266 !important;
  font-size: 14px !important;
  font-weight: 400;
  background: #fff !important;
  border-color: #dcdfe6 !important;
  border-radius: 4px;
}

.pest-monitor-page .search-actions :deep(.el-button:nth-child(2):hover) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8eb49a !important;
}

/* 与物候趋势图一致的滑动分段按钮。 */
.pest-monitor-page .series-actions,
.pest-monitor-page .sub-tabs,
.pest-monitor-page .view-switch,
.pest-monitor-page .model-actions :deep(.el-button-group) {
  display: flex;
  padding: 4px;
  gap: 4px;
  background: #edf3ea;
  border: 0;
  border-radius: 10px;
  box-shadow: none;
}

.pest-monitor-page .series-actions button,
.pest-monitor-page .sub-tabs button,
.pest-monitor-page .view-switch button,
.pest-monitor-page .model-actions :deep(.el-button-group > .el-button) {
  width: auto;
  min-width: auto;
  min-height: 28px;
  height: 28px;
  margin: 0;
  padding: 0 10px;
  color: #627767 !important;
  font-size: 12px !important;
  font-weight: 600;
  line-height: 28px;
  background: transparent !important;
  border: 0 !important;
  border-radius: 7px !important;
  box-shadow: none !important;
  transform: none !important;
}

.pest-monitor-page .series-actions button:hover,
.pest-monitor-page .sub-tabs button:hover,
.pest-monitor-page .view-switch button:hover,
.pest-monitor-page .model-actions :deep(.el-button-group > .el-button:hover) {
  color: #2f7d5c !important;
  background: #f7faf6 !important;
}

.pest-monitor-page .series-actions button.active,
.pest-monitor-page .sub-tabs button.active,
.pest-monitor-page .view-switch button.active,
.pest-monitor-page .model-actions :deep(.el-button-group > .el-button--primary) {
  color: #fff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
  box-shadow: 0 1px 4px rgba(24, 98, 70, .12) !important;
}

@media (max-width: 900px) {
  .pest-monitor-page {
    padding: 10px;
  }

  .pest-monitor-page .filter-form .search-actions {
    width: 100%;
    margin-left: 0;
  }

  .pest-monitor-page .search-actions :deep(.el-form-item__content),
  .pest-monitor-page .button-row {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .pest-monitor-page .card-header,
  .pest-monitor-page .section-title,
  .pest-monitor-page .chart-toolbar,
  .pest-monitor-page .influence-head,
  .pest-monitor-page .image-toolbar,
  .pest-monitor-page .pagination-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

<style scoped>
/* =========================================================
   参考 phenologyMonitor/analysis/index.vue 的最终统一样式
   仅修改排版、字体及指定操作按钮，不修改业务逻辑。
   ========================================================= */

.pest-monitor-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: calc(100vh - 84px);
  padding: 14px;
  color: #24352d;
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    "Helvetica Neue",
    Arial,
    sans-serif !important;
  font-size: 14px;
  line-height: 1.5;
}

.pest-monitor-page,
.pest-monitor-page *,
.pest-monitor-page *::before,
.pest-monitor-page *::after,
.pest-monitor-page :deep(*) {
  box-sizing: border-box;
  font-family: inherit !important;
}

/* 页面公共紧凑排版 */
.pest-monitor-page .module-tabs {
  margin-bottom: 12px;
}

.pest-monitor-page .filter-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.pest-monitor-page .filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.pest-monitor-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.pest-monitor-page .filter-form :deep(.el-form-item) {
  margin: 0;
}

.pest-monitor-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: #526b5c;
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.pest-monitor-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.pest-monitor-page :deep(.el-input__wrapper),
.pest-monitor-page :deep(.el-select__wrapper),
.pest-monitor-page :deep(.el-cascader .el-input__wrapper),
.pest-monitor-page :deep(.el-date-editor.el-input__wrapper),
.pest-monitor-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  border-radius: 8px;
}

.pest-monitor-page .button-row,
.pest-monitor-page .search-actions :deep(.el-form-item__content),
.pest-monitor-page .header-actions,
.pest-monitor-page .model-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* 所有指定按钮统一尺寸 */
.pest-monitor-page :deep(.reference-action-btn) {
  width: auto !important;
  min-width: 76px !important;
  height: 32px !important;
  min-height: 32px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  font-family: inherit !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 30px !important;
  border-radius: 7px !important;
  box-shadow: none !important;
  transform: none !important;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease !important;
}

/* 主操作：与“查询”按钮一致 */
.pest-monitor-page :deep(.reference-primary-btn),
.pest-monitor-page :deep(.reference-primary-btn.is-plain),
.pest-monitor-page :deep(.reference-primary-btn.el-button--success),
.pest-monitor-page :deep(.reference-primary-btn.el-button--danger) {
  color: #ffffff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
}

.pest-monitor-page :deep(.reference-primary-btn:hover),
.pest-monitor-page :deep(.reference-primary-btn:focus) {
  color: #ffffff !important;
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.pest-monitor-page :deep(.reference-primary-btn:active) {
  color: #ffffff !important;
  background: #245f47 !important;
  border-color: #245f47 !important;
}

/* 次操作：与“重置”按钮一致 */
.pest-monitor-page :deep(.reference-secondary-btn),
.pest-monitor-page :deep(.reference-secondary-btn.is-plain),
.pest-monitor-page :deep(.reference-secondary-btn.el-button--success),
.pest-monitor-page :deep(.reference-secondary-btn.el-button--danger) {
  color: #606266 !important;
  background: #ffffff !important;
  border-color: #dcdfe6 !important;
}

.pest-monitor-page :deep(.reference-secondary-btn:hover),
.pest-monitor-page :deep(.reference-secondary-btn:focus) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8bb59a !important;
}

.pest-monitor-page :deep(.reference-secondary-btn:active) {
  color: #245f47 !important;
  background: #e8f2e7 !important;
  border-color: #6fa181 !important;
}

/* 禁用状态统一，不再保留红色、蓝色或 success 差异 */
.pest-monitor-page :deep(.reference-action-btn.is-disabled),
.pest-monitor-page :deep(.reference-action-btn.is-disabled:hover),
.pest-monitor-page :deep(.reference-action-btn.is-disabled:focus) {
  color: #a8abb2 !important;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

/* 卡片、表格和标题字体统一 */
.pest-monitor-page :deep(.el-card) {
  border-radius: 12px;
}

.pest-monitor-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
}

.pest-monitor-page .card-header,
.pest-monitor-page .section-title {
  color: #24352d;
  font-size: 15px;
  font-weight: 700;
}

.pest-monitor-page :deep(.el-table) {
  font-family: inherit;
  font-size: 13px;
}

.pest-monitor-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}


.pest-monitor-page .workspace-row {
  margin-bottom: 12px;
}

.pest-monitor-page .workspace-row > .el-col {
  display: flex;
}

.pest-monitor-page .panel-card {
  width: 100%;
  border-radius: 12px;
}

.pest-monitor-page .header-actions,
.pest-monitor-page .model-actions {
  justify-content: flex-start;
}

.pest-monitor-page .model-actions :deep(.el-select) {
  width: 190px;
}


@media (max-width: 900px) {
  .pest-monitor-page {
    padding: 10px;
  }

  .pest-monitor-page .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .pest-monitor-page .filter-form :deep(.el-form-item) {
    width: 100%;
  }

  .pest-monitor-page .button-row,
  .pest-monitor-page .search-actions :deep(.el-form-item__content),
  .pest-monitor-page .header-actions,
  .pest-monitor-page .model-actions {
    justify-content: flex-start;
  }
}
</style>


<style scoped>
/* 两个智能分析页面最终统一样式：按钮参考虫情，布局参考物候期 */
.pest-monitor-page {
  --ai-green: #2f7d5c;
  --ai-green-deep: #245f47;
  --ai-green-hover: #3f8d69;
  --ai-text: #24352d;
  --ai-text-secondary: #526b5c;
  --ai-muted: #819184;
  --ai-border: #d8e8d9;
  --ai-border-soft: #e5eee2;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: calc(100vh - 84px);
  padding: 14px;
  color: var(--ai-text);
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    "Helvetica Neue",
    Arial,
    sans-serif !important;
  font-size: 14px;
  line-height: 1.5;
}

.pest-monitor-page,
.pest-monitor-page *,
.pest-monitor-page *::before,
.pest-monitor-page *::after,
.pest-monitor-page :deep(*) {
  box-sizing: border-box;
  font-family: inherit !important;
}

/* 布局统一：左5，中13，右6 */
.pest-monitor-page .top-section {
  height: 548px;
  margin-bottom: 12px;
}

.pest-monitor-page .full-row,
.pest-monitor-page .full-col {
  height: 100%;
}

.pest-monitor-page .full-col {
  display: flex;
}

.pest-monitor-page .panel-card,
.pest-monitor-page .table-card {
  width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(58, 88, 63, 0.07);
}

.pest-monitor-page .top-section .panel-card {
  height: 100%;
}

.pest-monitor-page .panel-card :deep(.el-card__header),
.pest-monitor-page .table-card :deep(.el-card__header) {
  height: 48px;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ai-border-soft);
}

.pest-monitor-page .panel-card :deep(.el-card__body) {
  height: calc(100% - 48px);
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pest-monitor-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 0;
  gap: 8px;
  color: var(--ai-text);
  font-size: 14px;
  font-weight: 700;
  line-height: 30px;
}

.pest-monitor-page .header-actions,
.pest-monitor-page .btn-group {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  align-items: center;
  justify-content: start;
  width: auto;
  gap: 6px;
}

.pest-monitor-page .model-actions,
.pest-monitor-page .action-group {
  display: grid;
  grid-template-columns: minmax(160px, 190px) 76px 76px 108px;
  align-items: center;
  justify-content: end;
  width: 100%;
  gap: 6px;
}

.pest-monitor-page .model-actions :deep(.el-select),
.pest-monitor-page .action-group :deep(.el-select),
.pest-monitor-page .model-select {
  width: 100%;
  min-width: 0;
}

/* 操作按钮统一为虫情页面规则 */
.pest-monitor-page :deep(.reference-action-btn) {
  width: auto !important;
  min-width: 76px !important;
  height: 32px !important;
  min-height: 32px !important;
  margin: 0 !important;
  padding: 0 12px !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 30px !important;
  border-radius: 4px !important;
  box-shadow: none !important;
}

.pest-monitor-page .header-actions :deep(.reference-action-btn),
.pest-monitor-page .btn-group :deep(.reference-action-btn) {
  width: 100% !important;
  min-width: 0 !important;
  height: 28px !important;
  min-height: 28px !important;
  padding: 0 5px !important;
  font-size: 12px !important;
  line-height: 26px !important;
}

.pest-monitor-page .model-actions :deep(.reference-action-btn),
.pest-monitor-page .action-group :deep(.reference-action-btn) {
  width: 76px !important;
  min-width: 76px !important;
  height: 30px !important;
  min-height: 30px !important;
  padding: 0 !important;
  font-size: 13px !important;
  line-height: 28px !important;
}

.pest-monitor-page :deep(.reference-primary-btn),
.pest-monitor-page :deep(.reference-primary-btn.is-plain) {
  color: #fff !important;
  background: var(--ai-green) !important;
  border-color: var(--ai-green) !important;
}

.pest-monitor-page :deep(.reference-primary-btn:hover),
.pest-monitor-page :deep(.reference-primary-btn:focus) {
  color: #fff !important;
  background: var(--ai-green-hover) !important;
  border-color: var(--ai-green-hover) !important;
}

.pest-monitor-page :deep(.reference-secondary-btn),
.pest-monitor-page :deep(.reference-secondary-btn.is-plain) {
  color: #606266 !important;
  background: #fff !important;
  border-color: #dcdfe6 !important;
}

.pest-monitor-page :deep(.reference-secondary-btn:hover),
.pest-monitor-page :deep(.reference-secondary-btn:focus) {
  color: var(--ai-green) !important;
  background: #f1f7ef !important;
  border-color: #8bb59a !important;
}

.pest-monitor-page :deep(.reference-action-btn.is-disabled),
.pest-monitor-page :deep(.reference-action-btn.is-disabled:hover),
.pest-monitor-page :deep(.reference-action-btn.is-disabled:focus) {
  color: #a8abb2 !important;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
}

/* 原图/结果图切换统一 */
.pest-monitor-page .model-actions :deep(.el-button-group),
.pest-monitor-page .action-group :deep(.el-button-group) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 108px;
  height: 30px;
  padding: 3px;
  gap: 3px;
  background: #edf3ea;
  border-radius: 8px;
}

.pest-monitor-page :deep(.preview-switch-btn) {
  width: 100%;
  min-width: 0;
  height: 24px;
  min-height: 24px;
  margin: 0;
  padding: 0 8px;
  color: #606266;
  font-size: 11px;
  font-weight: 400;
  line-height: 24px;
  background: transparent;
  border: 0;
  border-radius: 5px !important;
  box-shadow: none;
}

.pest-monitor-page :deep(.preview-switch-btn.el-button--primary) {
  color: #fff;
  background: var(--ai-green);
  border-color: var(--ai-green);
  box-shadow: 0 1px 4px rgba(24, 98, 70, .12);
}

/* 左侧资源区 */
.pest-monitor-page .stat-strip {
  min-height: 36px;
  padding: 8px 10px;
  color: var(--ai-text-secondary);
  font-size: 12px;
  background: #f5f9f3;
  border-bottom: 1px solid var(--ai-border-soft);
}

.pest-monitor-page .image-item {
  min-height: 66px;
  margin-bottom: 6px;
  padding: 7px;
  gap: 8px;
  border-radius: 9px;
}

.pest-monitor-page .thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
}

.pest-monitor-page .image-meta {
  gap: 4px;
}

.pest-monitor-page .image-meta strong,
.pest-monitor-page .image-meta > span {
  font-size: 13px;
  font-weight: 600;
}

/* 中间预览区 */
.pest-monitor-page .preview-stage {
  flex: 1;
  min-height: 0;
  padding: 10px;
}

.pest-monitor-page .image-wrapper {
  border-radius: 10px;
}

.pest-monitor-page .main-image {
  width: 100%;
  height: 100%;
}

/* 右侧结果区 */
.pest-monitor-page .result-stack {
  height: 100%;
  padding: 10px;
  gap: 8px;
  overflow-y: auto;
}

.pest-monitor-page .result-main,
.pest-monitor-page .metric-box,
.pest-monitor-page .advice-box,
.pest-monitor-page .result-box {
  padding: 10px 11px;
  border: 1px solid var(--ai-border-soft);
  border-radius: 9px;
  background: #f8fbf5;
}

.pest-monitor-page .result-main span,
.pest-monitor-page .metric-box span,
.pest-monitor-page .advice-box span,
.pest-monitor-page .result-box span {
  margin-bottom: 4px;
  color: var(--ai-muted);
  font-size: 12px;
}

.pest-monitor-page .result-main strong,
.pest-monitor-page .result-box strong {
  color: var(--ai-green);
  font-size: 19px;
}

.pest-monitor-page .advice-box p,
.pest-monitor-page .result-box p {
  font-size: 13px;
  line-height: 1.6;
}

/* 底部明细 */
.pest-monitor-page .table-card {
  margin-top: 0;
}

.pest-monitor-page .table-card :deep(.el-card__body) {
  padding: 0;
}

.pest-monitor-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ai-text-secondary);
  font-size: 13px;
}

.pest-monitor-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

@media (max-width: 1366px) {
  .pest-monitor-page .top-section {
    height: auto;
  }

  .pest-monitor-page .full-row,
  .pest-monitor-page .full-col {
    height: auto;
  }

  .pest-monitor-page .full-col {
    margin-bottom: 12px;
  }

  .pest-monitor-page .top-section .panel-card {
    height: 430px;
  }
}

@media (max-width: 900px) {
  .pest-monitor-page {
    padding: 10px;
  }

  .pest-monitor-page .model-actions,
  .pest-monitor-page .action-group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
  }

  .pest-monitor-page .model-actions :deep(.el-select),
  .pest-monitor-page .action-group :deep(.el-select),
  .pest-monitor-page .model-select {
    grid-column: 1 / -1;
    width: 100%;
  }

  .pest-monitor-page .model-actions :deep(.el-button-group),
  .pest-monitor-page .action-group :deep(.el-button-group) {
    grid-column: 1 / -1;
    justify-self: end;
    width: 108px;
  }

  .pest-monitor-page .model-actions :deep(.reference-action-btn),
  .pest-monitor-page .action-group :deep(.reference-action-btn) {
    width: 100% !important;
    min-width: 0 !important;
  }
}
</style>

<style scoped>
/* CODEX-LAYOUT-PATCH: pest AI page layout polish. Remove this block to roll back this change only. */
.pest-ai-page {
  overflow-x: hidden;
}

.pest-ai-page .top-section {
  height: auto !important;
  min-height: 0;
}

.pest-ai-page .full-row {
  align-items: stretch;
  width: 100%;
  min-width: 0;
}

.pest-ai-page .full-col,
.pest-ai-page .panel-card,
.pest-ai-page .panel-card :deep(.el-card__body),
.pest-ai-page .card-header,
.pest-ai-page .model-actions,
.pest-ai-page .action-group,
.pest-ai-page .table-card {
  min-width: 0;
}

.pest-ai-page .card-header {
  overflow: hidden;
}

.pest-ai-page .preview-card .card-header {
  align-items: flex-start;
  line-height: 1.2;
}

.pest-ai-page .header-actions,
.pest-ai-page .btn-group {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  width: 100%;
}

.pest-ai-page .model-actions,
.pest-ai-page .action-group {
  grid-template-columns: minmax(150px, 1fr) repeat(2, minmax(72px, 82px)) minmax(104px, 112px) !important;
  justify-content: stretch !important;
  width: 100%;
}

.pest-ai-page .model-actions :deep(.reference-action-btn),
.pest-ai-page .action-group :deep(.reference-action-btn) {
  width: 100% !important;
  min-width: 0 !important;
  padding: 0 6px !important;
  white-space: nowrap;
}

.pest-ai-page .model-actions :deep(.el-button-group),
.pest-ai-page .action-group :deep(.el-button-group) {
  width: 100% !important;
  min-width: 0;
}

.pest-ai-page .image-scroll,
.pest-ai-page .preview-stage,
.pest-ai-page .result-stack,
.pest-ai-page .empty-result {
  height: auto !important;
  min-height: 0;
}

.pest-ai-page .preview-stage {
  background:
    linear-gradient(45deg, rgba(47, 125, 92, 0.045) 25%, transparent 25%) 0 0 / 24px 24px,
    #fbfdf9;
}

.pest-ai-page .main-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.pest-ai-page .result-stack {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.pest-ai-page .result-main,
.pest-ai-page .metric-box,
.pest-ai-page .metric-grid > div,
.pest-ai-page .advice-box {
  border-radius: 8px !important;
}

.pest-ai-page .result-main strong {
  display: block;
  overflow-wrap: anywhere;
  line-height: 1.25;
}

.pest-ai-page .advice-box.warning {
  background: #f6faf3 !important;
  border-color: #dfe9dd !important;
}

.pest-ai-page .advice-box.warning strong {
  color: #2f7d5c;
}

.pest-ai-page .advice-box p {
  margin: 0;
  overflow-wrap: anywhere;
}

.pest-ai-page .table-card {
  overflow: hidden;
}

.pest-ai-page .table-card .card-header {
  flex-wrap: wrap;
  overflow: visible;
}

.pest-ai-page .table-card :deep(.el-table) {
  width: 100% !important;
}

@media (min-width: 1200px) {
  .pest-ai-page .full-row {
    display: grid !important;
    grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(320px, 360px);
    gap: 12px;
    margin-right: 0 !important;
    margin-left: 0 !important;
  }

  .pest-ai-page .full-col {
    display: flex;
    width: auto !important;
    max-width: none !important;
    flex: none !important;
    padding-right: 0 !important;
    padding-left: 0 !important;
  }

  .pest-ai-page .top-section .panel-card {
    height: clamp(520px, calc(100vh - 250px), 640px) !important;
  }
}

@media (min-width: 1200px) and (max-width: 1420px) {
  .pest-ai-page .full-row {
    grid-template-columns: 250px minmax(0, 1fr) 330px;
  }

  .pest-ai-page .model-actions,
  .pest-ai-page .action-group {
    grid-template-columns: minmax(150px, 1fr) repeat(2, 74px) !important;
  }

  .pest-ai-page .model-actions :deep(.el-button-group),
  .pest-ai-page .action-group :deep(.el-button-group) {
    grid-column: 1 / -1;
    justify-self: end;
    width: 112px !important;
  }
}

@media (max-width: 1199px) {
  .pest-ai-page .full-col {
    margin-bottom: 12px;
  }

  .pest-ai-page .top-section .panel-card {
    height: auto !important;
    min-height: 420px;
  }

  .pest-ai-page .preview-card {
    min-height: 460px;
  }

  .pest-ai-page .result-card {
    min-height: 360px;
  }
}

@media (max-width: 900px) {
  .pest-ai-page .model-actions,
  .pest-ai-page .action-group {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .pest-ai-page .model-actions :deep(.el-select),
  .pest-ai-page .action-group :deep(.el-select),
  .pest-ai-page .model-select,
  .pest-ai-page .model-actions :deep(.el-button-group),
  .pest-ai-page .action-group :deep(.el-button-group) {
    grid-column: 1 / -1;
  }

  .pest-ai-page .model-actions :deep(.el-button-group),
  .pest-ai-page .action-group :deep(.el-button-group) {
    justify-self: start;
    width: 112px !important;
  }
}
</style>

<style scoped>
/* CODEX-EMPTY-ALIGN-FIX: remove this block to roll back empty-state alignment only. */
.pest-ai-page .image-scroll {
  flex: 1 1 auto !important;
  height: auto !important;
  min-height: 0 !important;
}

.pest-ai-page .image-scroll :deep(.el-scrollbar__wrap),
.pest-ai-page .image-scroll :deep(.el-scrollbar__view) {
  height: 100%;
}

.pest-ai-page .image-scroll :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
}

.pest-ai-page .image-scroll :deep(.el-empty) {
  flex: 1 1 auto;
  width: 100%;
  min-height: 260px;
  justify-content: center;
}

.pest-ai-page .preview-stage {
  flex: 1 1 auto !important;
  min-height: 0 !important;
}

.pest-ai-page .preview-stage :deep(.el-empty) {
  width: 100%;
  min-height: 100%;
  justify-content: center;
}

.pest-ai-page .result-card .empty-result {
  flex: 1 1 auto !important;
  width: 100%;
  height: auto !important;
  min-height: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center;
}

@media (min-width: 1200px) {
  .pest-ai-page .image-scroll :deep(.el-empty),
  .pest-ai-page .result-card .empty-result {
    min-height: 420px !important;
  }
}

@media (max-width: 1199px) {
  .pest-ai-page .image-scroll :deep(.el-empty),
  .pest-ai-page .result-card .empty-result {
    min-height: 320px !important;
  }
}
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING-FINAL: keep the three optional selectors before the model selector. */
.pest-ai-page .model-actions {
  display: flex !important;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pest-ai-page .device-binding-group {
  display: grid;
  flex: 1 1 430px;
  grid-template-columns: repeat(3, minmax(108px, 1fr));
  gap: 8px;
  min-width: 360px;
}

.pest-ai-page .device-binding-group :deep(.el-select),
.pest-ai-page .model-select {
  width: 100%;
  min-width: 0;
}

.pest-ai-page .device-binding-cascader {
  flex: 0 1 228px;
  width: 228px;
  min-width: 198px;
}

.pest-ai-page .device-binding-cascader :deep(.el-input__wrapper) {
  min-height: 30px;
}

.pest-ai-page .model-select {
  flex: 0 1 156px;
  width: 156px;
  min-width: 140px;
}

.pest-ai-page .model-actions :deep(.reference-action-btn),
.pest-ai-page .model-actions :deep(.el-button-group) {
  flex: 0 0 auto;
}

@media (min-width: 901px) {
  .pest-ai-page .model-actions {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }
}

@media (min-width: 901px) and (max-width: 1420px) {
  .pest-ai-page .device-binding-cascader {
    flex-basis: 190px;
    width: 190px;
    min-width: 180px;
  }

  .pest-ai-page .model-select {
    flex-basis: 132px;
    width: 132px;
    min-width: 124px;
  }

  .pest-ai-page .model-actions :deep(.reference-action-btn) {
    width: 68px !important;
    min-width: 68px !important;
    padding-right: 4px !important;
    padding-left: 4px !important;
  }

  .pest-ai-page .model-actions :deep(.el-button-group) {
    width: 92px !important;
  }
}

@media (max-width: 900px) {
  .pest-ai-page .device-binding-cascader,
  .pest-ai-page .model-select {
    flex-basis: 100%;
    width: 100%;
  }

  .pest-ai-page .device-binding-group {
    flex-basis: 100%;
    min-width: 0;
  }
}
</style>

<style scoped>
/* 与物候智能分析页统一：级联选择、模型选择和识别按钮保持同一行。 */
.pest-ai-page .model-actions,
.pest-ai-page .action-group {
  display: flex !important;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.pest-ai-page .device-binding-cascader {
  flex: 0 1 228px;
  width: 228px;
  min-width: 198px;
}

.pest-ai-page .device-binding-cascader :deep(.el-input__wrapper) {
  min-height: 30px;
}

.pest-ai-page .device-binding-cascader :deep(.el-input__inner) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pest-ai-page .model-select {
  flex: 0 1 156px;
  width: 156px;
  min-width: 140px;
}

.pest-ai-page .model-actions :deep(.reference-action-btn),
.pest-ai-page .action-group :deep(.reference-action-btn) {
  flex: 0 0 auto;
  width: 76px !important;
  min-width: 76px !important;
  height: 30px !important;
  min-height: 30px !important;
  padding: 0 !important;
  font-size: 13px !important;
  line-height: 28px !important;
}

.pest-ai-page .preview-toggle {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

@media (min-width: 901px) and (max-width: 1420px) {
  .pest-ai-page .device-binding-cascader {
    flex-basis: 190px;
    width: 190px;
    min-width: 180px;
  }

  .pest-ai-page .model-select {
    flex-basis: 132px;
    width: 132px;
    min-width: 124px;
  }

    .pest-ai-page .model-actions :deep(.reference-action-btn),
  .pest-ai-page .action-group :deep(.reference-action-btn) {
    width: 68px !important;
    min-width: 68px !important;
    padding-right: 4px !important;
    padding-left: 4px !important;
  }

    .pest-ai-page .preview-toggle {
    gap: 6px;
  }
}

@media (max-width: 900px) {
  .pest-ai-page .model-actions,
  .pest-ai-page .action-group {
    flex-wrap: wrap;
    overflow-x: visible;
    align-items: stretch;
  }

  .pest-ai-page .device-binding-cascader,
  .pest-ai-page .model-select {
    flex-basis: 100%;
    width: 100%;
  }

  .pest-ai-page .model-actions :deep(.reference-action-btn),
  .pest-ai-page .action-group :deep(.reference-action-btn) {
    width: 100% !important;
    min-width: 0 !important;
  }
}
</style>

<style scoped>
/* FARMER-TASK-SQUARE-CARD-STYLE:
   参考 farmerTask 页面截图，将 AI 页主卡片改为接近直角的轻边框风格。
   仅覆盖视觉样式，不修改 template、script、接口及识别逻辑。 */
.pest-ai-page {
  --farmer-card-border: #d5e5d6;
  --farmer-card-border-hover: #a9c9b2;
  --farmer-card-inner-border: #dce8d8;
  --farmer-card-inner-bg: #fbfdf9;
  --farmer-card-shadow: 0 4px 12px rgba(63, 91, 70, 0.04);
  --farmer-card-shadow-hover: 0 6px 16px rgba(63, 91, 70, 0.07);
}

/* 外层主卡片：接近 farmerTask 截图中的直角面板 */
.pest-ai-page .panel-card {
  overflow: hidden;
  background: #ffffff !important;
  border: 1px solid var(--farmer-card-border) !important;
  border-radius: 2px !important;
  box-shadow: var(--farmer-card-shadow) !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.pest-ai-page .panel-card:hover {
  border-color: var(--farmer-card-border-hover) !important;
  box-shadow: var(--farmer-card-shadow-hover) !important;
  transform: none !important;
}

.pest-ai-page .panel-card :deep(.el-card__header) {
  background: #ffffff;
  border-bottom-color: var(--farmer-card-inner-border) !important;
}

/* 左侧图片列表项只保留极小圆角 */
.pest-ai-page .image-item {
  border-radius: 2px !important;
}

.pest-ai-page .image-item:hover,
.pest-ai-page .image-item.active {
  border-color: var(--farmer-card-border-hover) !important;
  box-shadow: 0 3px 10px rgba(63, 91, 70, 0.05);
}

/* 识别报告中的信息块改为接近直角 */
.pest-ai-page .result-main,
.pest-ai-page .metric-box,
.pest-ai-page .metric-grid > div,
.pest-ai-page .advice-box {
  background: var(--farmer-card-inner-bg) !important;
  border: 1px solid var(--farmer-card-inner-border) !important;
  border-radius: 2px !important;
  box-shadow: none !important;
}

/* 图片预览区域与主卡片保持统一 */
.pest-ai-page .preview-stage {
  overflow: hidden;
  border-radius: 0 !important;
}

/* 表格内容由外层边框裁切，保持直角 */
.pest-ai-page .table-card,
.pest-ai-page .table-card :deep(.el-card__body) {
  overflow: hidden;
  border-radius: 0 !important;
}
</style>

<style scoped>
/* FARMER-TASK-SHARP-OVERRIDE:
   将虫情智能分析页的卡片、控件和弹层统一为 farmerTask 的近直角风格。 */
.pest-ai-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.pest-ai-page .module-tabs,
.pest-ai-page .module-tabs .tab,
.pest-ai-page .module-tabs .tab.active::after,
.pest-ai-page .panel-card,
.pest-ai-page .table-card,
.pest-ai-page .stat-strip,
.pest-ai-page .image-item,
.pest-ai-page .thumb,
.pest-ai-page .preview-stage,
.pest-ai-page .preview-mode-badge,
.pest-ai-page .result-main,
.pest-ai-page .metric-box,
.pest-ai-page .metric-grid > div,
.pest-ai-page .advice-box,
.pest-ai-page .empty-result,
.pest-ai-page :deep(.el-card),
.pest-ai-page :deep(.el-card__header),
.pest-ai-page :deep(.el-card__body),
.pest-ai-page :deep(.el-button),
.pest-ai-page :deep(.el-input__wrapper),
.pest-ai-page :deep(.el-select__wrapper),
.pest-ai-page :deep(.el-cascader .el-input__wrapper),
.pest-ai-page :deep(.el-tag),
.pest-ai-page :deep(.el-progress-bar__outer),
.pest-ai-page :deep(.el-progress-bar__inner),
.pest-ai-page :deep(.el-table),
.pest-ai-page :deep(.el-table__inner-wrapper),
.pest-ai-page :deep(.el-scrollbar__bar),
.pest-ai-page :deep(.el-scrollbar__thumb) {
  border-radius: var(--sharp-radius) !important;
}

.pest-ai-page .panel-card,
.pest-ai-page .table-card,
.pest-ai-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.pest-ai-page .panel-card:hover,
.pest-ai-page .table-card:hover {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.pest-ai-page .module-tabs {
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.05) !important;
}

.pest-ai-page .module-tabs .tab.active {
  box-shadow: none !important;
}

.pest-ai-page .result-main,
.pest-ai-page .metric-box,
.pest-ai-page .metric-grid > div,
.pest-ai-page .advice-box,
.pest-ai-page .image-item,
.pest-ai-page .stat-strip {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.pest-ai-page .preview-stage {
  border: 1px solid var(--sharp-inner-border) !important;
}

.pest-ai-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.pest-ai-page :deep(.el-input__wrapper),
.pest-ai-page :deep(.el-select__wrapper),
.pest-ai-page :deep(.el-cascader .el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.pest-ai-page :deep(.el-input__wrapper.is-focus),
.pest-ai-page :deep(.el-select__wrapper.is-focused),
.pest-ai-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.pest-ai-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.pest-ai-page :deep(.el-progress-bar__inner) {
  background: #2f7d5c !important;
}

/* 下拉弹层为 teleported 节点，需使用全局选择器覆盖 Element Plus 弹层圆角。 */
:global(.el-select__popper),
:global(.el-cascader__dropdown),
:global(.el-popper.is-light),
:global(.el-select-dropdown),
:global(.el-cascader-panel),
:global(.el-select-dropdown__item),
:global(.el-cascader-node),
:global(.el-popper__arrow::before) {
  border-radius: 1px !important;
}

:global(.el-select__popper),
:global(.el-cascader__dropdown),
:global(.el-popper.is-light) {
  border-color: #d5e5d6 !important;
  box-shadow: 0 8px 20px rgba(63, 91, 70, 0.10) !important;
}
</style>

