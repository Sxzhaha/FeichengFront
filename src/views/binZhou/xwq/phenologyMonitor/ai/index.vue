<template>
  <div class="phenology-ai-page">
    <div class="module-tabs">
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/analysis')">总览</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/image')">物候图片</button>
      <button class="tab active">智能分析</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/report')">历史数据与报告</button>
      <!-- <button class="tab" @click="showBuilding">设备数据</button> -->
      <div class="toolbar-spacer"></div>
    </div>

    <div class="top-section">
      <el-row :gutter="16" class="full-row">
        <el-col :xs="24" :lg="5" class="full-col">
          <el-card class="panel-card" shadow="never">
            <template #header>
              <div class="card-header">
                <div class="btn-group">
                  <el-button class="reference-action-btn reference-primary-btn" size="small" type="primary" plain @click="triggerSingleInput">单张</el-button>
                  <el-button class="reference-action-btn reference-secondary-btn" size="small" type="success" plain @click="triggerBatchInput">批量</el-button>
                  <!-- <el-button size="small" type="warning" plain @click="triggerFolderInput">文件夹</el-button> -->
                  <el-button class="reference-action-btn reference-secondary-btn" size="small" type="danger" plain :disabled="!fileList.length" @click="clearPage">清空</el-button>
                  <input ref="fileInput" class="hidden-input" type="file" accept="image/*" @change="handleSingleFileChange" />
                  <input ref="batchInput" class="hidden-input" type="file" multiple accept="image/*" @change="handleBatchFileChange" />
                  <input ref="folderInput" class="hidden-input" type="file" webkitdirectory directory multiple accept="image/*" @change="handleFolderFileChange" />
                </div>
              </div>
            </template>

            <div class="list-stats">
              <span>已选择 {{ fileList.length }}</span>
              <span>待识别 {{ pendingCount }}</span>
              <span>已成功入库 <b>{{ completedCount }}</b></span>
            </div>

            <el-scrollbar class="file-scroll">
              <el-empty v-if="!fileList.length" description="暂无物候图片" :image-size="90" />
              <ul class="file-list">
                <li
                  v-for="(item, index) in fileList"
                  :key="item.localId || index"
                  :class="{ active: currentImageIndex === index, done: item.status === '已识别' }"
                  @click="selectImage(index)"
                >
                  <el-image
                    class="thumb"
                    :src="getThumbnailUrl(item)"
                    fit="cover"
                  >
                    <template #error>
                      <div class="thumb-error">加载失败</div>
                    </template>
                  </el-image>
                  <div class="file-info">
                    <span :title="item.displayName || item.name">
                      {{ item.displayName || item.name }}
                    </span>
                    <el-tag size="small" :type="getStatusTag(item.status)" effect="plain">{{ item.status }}</el-tag>
                  </div>
                  <el-icon class="delete-icon" @click.stop="removeImage(index)"><Close /></el-icon>
                </li>
              </ul>
            </el-scrollbar>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="13" class="full-col">
          <el-card class="panel-card terminal-card" shadow="never">
            <template #header>
              <div class="card-header">
                <!-- <span>视觉识别终端</span> -->
                <div class="action-group">
                  <el-cascader
                    v-model="bindingScopePath"
                    class="device-binding-cascader"
                    popper-class="xwq-sharp-popper"
                    placeholder="园区 / 地块 / 角落 / 设备"
                    filterable
                    clearable
                    :props="bindingScopeProps"
                    @change="handleBindingScopeChange"
                  />
                  <el-select v-model="selectedModelId" placeholder="选择物候期识别模型" filterable class="model-select" popper-class="xwq-sharp-popper">
                    <el-option v-for="item in modelOptions" :key="item.modelId" :label="item.modelName" :value="item.modelId" />
                  </el-select>
                  <!-- <el-button plain @click="goTo('/xwq/phenologyMonitor/report')">查看物候报告</el-button> -->
                  <el-button class="reference-action-btn reference-primary-btn" type="primary" :disabled="!currentImage || !currentImage.file || isRecognizing || isBatchRecognizing" @click="runRecognize">单张识别</el-button>
                  <el-button class="reference-action-btn reference-secondary-btn" type="success" plain :disabled="!fileList.some(item => item.file) || isRecognizing || isBatchRecognizing" @click="runBatchRecognize">批量识别</el-button>

                </div>
              </div>
            </template>

            <div
              class="viewer"
              v-loading="isUploading || isRecognizing || isBatchRecognizing"
              :element-loading-text="loadingText"
              element-loading-background="rgba(245,247,250,.9)"
            >
              <div v-if="currentImage" class="image-wrapper">
                                <el-image
                  class="main-image"
                  :src="displayImageUrl"
                  fit="contain"
                  :preview-src-list="displayImageUrl ? [displayImageUrl] : []"
                />
                <div v-if="isRecognizing || isBatchRecognizing" class="scan-line"></div>
              </div>
              <el-empty v-else description="请上传或选择物候图片" :image-size="130" />
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="6" class="full-col">
          <el-card class="panel-card report-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>识别报告</span>
              </div>
            </template>

            <div v-if="currentResult" class="result-content">
              <div class="result-box">
                <span>当前物候期</span>
                <strong>{{ currentResult.phenologyName }}</strong>
              </div>
              <div class="result-box">
                <span>模型置信度</span>
                <el-progress :percentage="toPercent(currentResult.phenologyConfidence)" :stroke-width="12" />
              </div>
              <div class="result-box">
                <span>作物类型</span>
                <b>{{ currentResult.phenologyCrop || '冬枣' }}</b>
              </div>
              <div class="result-box">
                <span>下一物候期</span>
                <b>{{ currentResult.phenologyNextName || '待判断' }}</b>
              </div>
              <div class="result-box desc">
                <span>生长状态描述</span>
                <p>{{ currentResult.phenologyDesc || '暂无描述' }}</p>
              </div>
              <div class="result-box advice">
                <span>农事建议</span>
                <p>{{ currentResult.phenologyAdvice || '暂无建议' }}</p>
              </div>
              <div class="result-box">
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

    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>本次识别明细</span>
          <el-button class="reference-action-btn reference-secondary-btn" size="small" type="success" plain @click="exportExcel">导出 Excel</el-button>
        </div>
      </template>

      <el-table :data="tableData" border stripe empty-text="暂无本次识别结果">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ tableData.length - $index }}</template>
        </el-table-column>
        <el-table-column prop="fileName" label="图片名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="phenologyCrop" label="作物类型" width="100" align="center" />
        <el-table-column prop="phenologyName" label="当前物候期" width="130" align="center" />
        <el-table-column label="置信度" width="100" align="center">
          <template #default="{ row }">{{ toPercent(row.phenologyConfidence) }}%</template>
        </el-table-column>
        <el-table-column prop="phenologyNextName" label="下一物候期" width="130" align="center" />
        <el-table-column prop="phenologyDesc" label="生长状态描述" min-width="260" show-overflow-tooltip />
        <el-table-column prop="phenologyAdvice" label="农事建议" min-width="300" show-overflow-tooltip />
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
  onBeforeUnmount,
  onMounted,
  ref
} from 'vue'

import { useRouter } from 'vue-router'
import { Close, Monitor } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { listModel } from '@/api/binZhou/xwq/model'
import { listImage, addImage } from '@/api/binZhou/xwq/image'
import { predictPhenologyByImage } from '@/api/binZhou/xwq/featurePhenology'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'

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
const SAMPLE_PHENOLOGY_IMAGE_URL = `${import.meta.env.BASE_URL}binZhou/xwq/phenology.jpg`
const DEFAULT_SCOPE = {
  parkName: '滨州园区',
  areaName: '01地块',
  locationName: '东北',
  deviceName: '滨州园区01地块虫情测试仪'
}
const samplePhenologyResult = {
  imageId: 'sample-phenology-image',
  recordId: 'sample-phenology-record',
  phenologyId: 'sample-phenology',
  imageName: '冬枣物候期.jpg',
  imageUrl: SAMPLE_PHENOLOGY_IMAGE_URL,
  phenologyName: '坐果期',
  phenologyCode: 'fruit-setting',
  phenologyCrop: DEFAULT_CROP_TYPE,
  phenologyConfidence: 0.94,
  phenologyResult: '识别显示冬枣处于坐果期，幼果坐稳并开始进入持续膨大阶段。',
  phenologyDesc: '树体长势较稳，幼果分布均匀，叶片功能保持良好，需继续关注水肥供应和早期病虫害迹象。',
  phenologyAdvice: '保持土壤墒情稳定，适量补充钾钙肥；及时疏除畸形果、病虫果，降低后续落果和裂果风险。',
  phenologyNextName: '果实膨大期',
  phenologyResultImgUrl: SAMPLE_PHENOLOGY_IMAGE_URL,
  deviceId: 'sample-device',
  deviceName: '滨州园区01地块虫情测试仪',
  deviceSn: 'SAMPLE-PHENOLOGY-001',
  parkId: 'sample-park',
  parkName: '滨州园区',
  areaId: 'sample-area',
  areaName: '01地块',
  locationId: 'sample-location',
  locationName: '东北',
  recordMode: '数据'
}

const router = useRouter()


const fileInput = ref(null)
const batchInput = ref(null)
const folderInput = ref(null)
const fileList = ref([])
const tableData = ref([])
const currentImageIndex = ref(-1)
const selectedModelId = ref(null)
const modelOptions = ref([])
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
const isUploading = ref(false)
const isRecognizing = ref(false)
const isBatchRecognizing = ref(false)


const currentImage = computed(() => {
  return currentImageIndex.value >= 0
    ? fileList.value[currentImageIndex.value]
    : null
})

const currentResult = computed(() => {
  return currentImage.value?.result || null
})

const displayImageUrl = computed(() => {
  if (!currentImage.value) return ''

  return currentImage.value.localUrl
    || normalizeImageUrl(currentImage.value.imageUrl)
    || normalizeImageUrl(currentResult.value?.imageUrl)
    || normalizeImageUrl(currentResult.value?.phenologyResultImgUrl)
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
  if (isUploading.value) return '图片临时上传中...'
  if (
    isRecognizing.value
    || isBatchRecognizing.value
  ) {
    return '物候期模型正在识别...'
  }
  return '处理中...'
})




onMounted(async () => {
  applySampleData()
  loadModelOptions()
  await loadParks()
  await initDefaultBindingScope()
})


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

function applySampleData() {
  const sampleImage = {
    localId: 'sample-phenology-local',
    fileKey: 'sample-phenology',
    file: null,
    relativePath: '',
    name: samplePhenologyResult.imageName,
    displayName: samplePhenologyResult.imageName,
    localUrl: SAMPLE_PHENOLOGY_IMAGE_URL,
    imageUrl: SAMPLE_PHENOLOGY_IMAGE_URL,
    imageSize: 0,
    imageFormat: 'jpg',
    cropType: DEFAULT_CROP_TYPE,
    imageId: samplePhenologyResult.imageId,
    status: '已识别',
    result: { ...samplePhenologyResult },
    isSample: true
  }

  fileList.value = [sampleImage]
  tableData.value = [{
    localId: sampleImage.localId,
    imageId: samplePhenologyResult.imageId,
    fileName: samplePhenologyResult.imageName,
    phenologyCrop: samplePhenologyResult.phenologyCrop,
    phenologyName: samplePhenologyResult.phenologyName,
    phenologyConfidence: samplePhenologyResult.phenologyConfidence,
    phenologyNextName: samplePhenologyResult.phenologyNextName,
    phenologyDesc: samplePhenologyResult.phenologyDesc,
    phenologyAdvice: samplePhenologyResult.phenologyAdvice,
    phenologyResultImgUrl: samplePhenologyResult.phenologyResultImgUrl,
    deviceId: samplePhenologyResult.deviceId,
    deviceName: samplePhenologyResult.deviceName,
    deviceSn: samplePhenologyResult.deviceSn,
    parkId: samplePhenologyResult.parkId,
    parkName: samplePhenologyResult.parkName,
    areaId: samplePhenologyResult.areaId,
    areaName: samplePhenologyResult.areaName,
    locationId: samplePhenologyResult.locationId,
    locationName: samplePhenologyResult.locationName,
    recordMode: samplePhenologyResult.recordMode,
    isSample: true
    }]
  currentImageIndex.value = 0
}


function clearSampleData() {
  if (!fileList.value.some(item => item.isSample)) return

  fileList.value = []
  tableData.value = []
    currentImageIndex.value = -1

}

onBeforeUnmount(() => {

  revokeAllLocalUrls()
})

async function loadModelOptions() {
  try {
    let res = await listModel({
      pageNum: 1,
      pageSize: 100,
      modelType: '物候期',
      modelStatus: 1
    })

    let rows = getResponseRows(res)

    modelOptions.value = rows.filter(
      item => Number(item.modelStatus) === 1
    )
    selectedModelId.value =
      modelOptions.value[0]?.modelId || null

    if (!modelOptions.value.length) {
      ElMessage.warning('未找到启用的物候期识别模型')
    }
  } catch (error) {
    console.error(error)
    modelOptions.value = []
    selectedModelId.value = null
    ElMessage.error('物候期模型列表加载失败')
  }
}

function triggerSingleInput() {
  resetInput(fileInput.value)
  fileInput.value?.click()
}

function triggerBatchInput() {
  resetInput(batchInput.value)
  batchInput.value?.click()
}

function triggerFolderInput() {
  resetInput(folderInput.value)
  folderInput.value?.click()
}

function resetInput(input) {
  if (input) input.value = ''
}

function handleSingleFileChange(event) {
  const files = Array.from(event.target.files || [])
    .slice(0, 1)
  addLocalFiles(files, false)
  event.target.value = ''
}

function handleBatchFileChange(event) {
  addLocalFiles(
    Array.from(event.target.files || []),
    false
  )
  event.target.value = ''
}

function handleFolderFileChange(event) {
  addLocalFiles(
    Array.from(event.target.files || []),
    true
  )
  event.target.value = ''
}

function addLocalFiles(files, fromFolder) {
  const images = files.filter(isImageFile)

  if (!images.length) {
    ElMessage.warning('未选择到可识别的图片文件')
    return
  }

  clearSampleData()

  const existingKeys = new Set(
    fileList.value.map(item => item.fileKey)
  )

  let addedCount = 0
  let duplicateCount = 0

  images.forEach(file => {
    const relativePath =
      file.webkitRelativePath || file.name
    const fileKey = [
      relativePath,
      file.size,
      file.lastModified
    ].join('|')

    if (existingKeys.has(fileKey)) {
      duplicateCount++
      return
    }

    fileList.value.push({
      localId:
        `${Date.now()}_`
        + Math.random().toString(36).slice(2, 8),
      fileKey,
      file,
      relativePath: fromFolder
        ? relativePath
        : '',
      name: buildUniqueImageName(file.name),
      displayName: fromFolder
        ? relativePath
        : file.name,
      localUrl: URL.createObjectURL(file),
      imageSize: file.size,
      imageFormat: getFileSuffix(file.name),
      cropType: DEFAULT_CROP_TYPE,
      imageId: undefined,
      status: '未识别',
      result: null
    })

    existingKeys.add(fileKey)
    addedCount++
  })

  if (
    currentImageIndex.value < 0
    && fileList.value.length
  ) {
    currentImageIndex.value = 0
  }

  if (addedCount > 0) {
    ElMessage.success(
      `已添加 ${addedCount} 张图片，识别成功后才写入数据库`
    )
  }

  if (duplicateCount > 0) {
    ElMessage.info(
      `已忽略 ${duplicateCount} 张重复图片`
    )
  }
}

function isImageFile(file) {
  if (!file) return false

  if (
    String(file.type || '').startsWith('image/')
  ) {
    return true
  }

  return IMAGE_EXTENSIONS.has(
    getFileSuffix(file.name)
  )
}

async function runRecognize() {
  if (!currentImage.value) return

  isRecognizing.value = true

  try {
    const bindingDeviceId = selectedDeviceId.value || undefined
    await recognizeOne(currentImageIndex.value, bindingDeviceId)
    ElMessage.success(
      '物候期识别成功，图片、记录和结果已入库'
    )
  } catch (error) {
    console.error(error)
    ElMessage.error(
      getErrorMessage(
        error,
        '物候期识别失败，请检查模型服务和网络连接'
      )
    )
  } finally {
    isUploading.value = false
    isRecognizing.value = false
  }
}

async function runBatchRecognize() {
  if (!fileList.value.length) return

  if (!selectedModelId.value) {
    ElMessage.warning('请先选择物候期识别模型')
    return
  }

  isBatchRecognizing.value = true
  const bindingDeviceId = selectedDeviceId.value || undefined
  let successCount = 0
  let failCount = 0

  try {
    for (
      let index = 0;
      index < fileList.value.length;
      index++
    ) {
      const item = fileList.value[index]

      currentImageIndex.value = index

      try {
        await recognizeOne(index, bindingDeviceId)
        successCount++
      } catch (error) {
        failCount++
        console.error(
          `物候图片识别失败：${item.displayName}`,
          error
        )
      }
    }

    if (successCount > 0) {
      ElMessage.success(
        `批量识别成功 ${successCount} 张，均已入库`
      )
    }

    if (failCount > 0) {
      ElMessage.warning(
        `${failCount} 张识别失败且未入库，其他图片已继续处理`
      )
    }
  } finally {
    isUploading.value = false
    isBatchRecognizing.value = false
  }
}

async function recognizeOne(
  index,
  bindingDeviceId = selectedDeviceId.value || undefined
) {
  const image = fileList.value[index]

  if (!image?.file) {
    throw new Error('当前图片文件不存在')
  }

  if (!selectedModelId.value) {
    throw new Error('请先选择物候期识别模型')
  }

  image.status = '上传中'
  image.result = null
  image.imageId = undefined

  try {
    isUploading.value = true
    const imageUrl = await uploadTemporaryFile(
      image.file
    )

    // 物候识别工作台统一走 /xwq/phenology/predict，后端会在该接口中调用视觉大模型。
    // 该接口要求 imageId，因此先把上传图片写入图片表，再提交识别请求。
    const imageName = image.name || buildUniqueImageName(image.file.name)
    const imageData = {
      imageName,
      imageUrl,
      imageAiType: 'phenology',
      imageSource: '手动上传',
      imageSize: image.imageSize,
      imageFormat: image.imageFormat,
      imageStatus: 0,
      imageA: image.cropType || DEFAULT_CROP_TYPE,
      parkId: selectedParkId.value || undefined,
      plotId: selectedAreaId.value || undefined,
      imageB: selectedLocationId.value ? String(selectedLocationId.value) : undefined,
      deviceId: bindingDeviceId
    }
    const addResponse = await addImage(imageData)
    let imageId = addResponse?.data?.imageId
    if (!imageId) {
      const imageListResponse = await listImage({
        pageNum: 1,
        pageSize: 10,
        imageName,
        imageAiType: 'phenology'
      })
      const savedImage = (imageListResponse?.rows || []).find(item => item.imageName === imageName)
        || imageListResponse?.rows?.[0]
      imageId = savedImage?.imageId
    }
    if (!imageId) {
      throw new Error('图片已上传，但未能取得 imageId')
    }

    isUploading.value = false
    image.status = '识别中'

    const res = await predictPhenologyByImage({
      imageId,
      modelId: selectedModelId.value,
      cropType: image.cropType || DEFAULT_CROP_TYPE,
      recordMode: '手动上传'
    })

    if (
      res?.code !== undefined
      && Number(res.code) !== 200
    ) {
      throw new Error(
        res.msg || '物候期识别失败'
      )
    }

    const result = normalizeResult(res?.data || {})
    validateResult(result)

    image.imageId = result.imageId
    image.status = '已识别'
    image.result = result

    updateTableRow(image, result)

  } catch (error) {
    isUploading.value = false
    image.imageId = undefined
    image.status = '识别失败'
    image.result = null
    throw error
  }
}

async function uploadTemporaryFile(file) {
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

  if (
    res?.code !== undefined
    && Number(res.code) !== 200
  ) {
    throw new Error(res.msg || '图片上传失败')
  }

  const imageUrl = res?.url || res?.fileName

  if (!imageUrl) {
    throw new Error('上传接口未返回图片地址')
  }

  return imageUrl
}

function normalizeResult(data) {
  return {
    imageId: data.imageId,
    recordId: data.recordId,
    phenologyId: data.phenologyId,
    imageName: data.imageName || '',
    imageUrl: data.imageUrl || '',
    phenologyName:
      data.phenologyName
      || data.name
      || '',
    phenologyCode:
      data.phenologyCode
      || data.code
      || '',
    phenologyCrop:
      data.phenologyCrop
      || data.cropType
      || DEFAULT_CROP_TYPE,
    phenologyConfidence: toNumber(
      data.phenologyConfidence
      ?? data.confidence
    ),
    phenologyResult:
      data.phenologyResult
      || data.result
      || '',
    phenologyDesc:
      data.phenologyDesc
      || data.description
      || '',
    phenologyAdvice:
      data.phenologyAdvice
      || data.advice
      || '',
    phenologyNextName:
      data.phenologyNextName
      || data.nextStage
      || '',
    phenologyResultImgUrl:
      data.phenologyResultImgUrl
      || data.resultImageUrl
      || data.imageResultUrl
      || '',
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

function validateResult(result) {
  if (!result.phenologyName) {
    throw new Error(
      '模型返回缺少物候期名称，不能判定为识别成功'
    )
  }

  if (!result.imageId || !result.phenologyId) {
    throw new Error(
      '识别接口未返回入库后的 imageId 或 phenologyId'
    )
  }
}

function updateTableRow(image, result) {
  const row = {
    localId: image.localId,
    imageId: result.imageId,
    fileName:
      image.displayName || image.name,
    phenologyCrop:
      result.phenologyCrop || DEFAULT_CROP_TYPE,
    phenologyName: result.phenologyName,
    phenologyConfidence:
      result.phenologyConfidence,
    phenologyNextName:
      result.phenologyNextName || '待判断',
    phenologyDesc:
      result.phenologyDesc || '',
    phenologyAdvice:
      result.phenologyAdvice || '',
    phenologyResultImgUrl:
      result.phenologyResultImgUrl || '',
    deviceId: result.deviceId,
    deviceName: result.deviceName || '',
    deviceSn: result.deviceSn || '',
    parkId: result.parkId,
    parkName: result.parkName || '',
    areaId: result.areaId,
    areaName: result.areaName || '',
    locationId: result.locationId,
    locationName: result.locationName || '',
    recordMode: result.recordMode || '手动上传'
  }

  const rowIndex = tableData.value.findIndex(
    item => item.localId === image.localId
  )

  if (rowIndex >= 0) {
    tableData.value.splice(rowIndex, 1, row)
  } else {
    tableData.value.unshift(row)
  }
}

function selectImage(index) {
  if (isBatchRecognizing.value) return
  currentImageIndex.value = index
}

function removeImage(index) {
  const removed = fileList.value[index]

  if (removed?.localUrl) {
    URL.revokeObjectURL(removed.localUrl)
  }

  fileList.value.splice(index, 1)
  tableData.value = tableData.value.filter(
    row => row.localId !== removed?.localId
  )

  if (!fileList.value.length) {
    currentImageIndex.value = -1

  } else {
    currentImageIndex.value = Math.min(
      index,
      fileList.value.length - 1
    )
  }
}

function clearPage() {
  ElMessageBox.confirm(
    '仅清空本次选择列表；已识别成功并入库的数据不会删除，是否继续？',
    '提示',
    { type: 'warning' }
  )
    .then(() => {
      revokeAllLocalUrls()
      fileList.value = []
      tableData.value = []
      currentImageIndex.value = -1

    })
    .catch(() => {})
}

function revokeAllLocalUrls() {
  fileList.value.forEach(item => {
    if (item.localUrl) {
      URL.revokeObjectURL(item.localUrl)
    }
  })
}

function exportExcel() {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = [
    '序号',
    '图片名称',
    '数据来源',
    '设备名称',
    '设备编号',
    '园区',
    '地块',
    '采集位置',
    '作物类型',
    '当前物候期',
    '置信度',
    '下一物候期',
    '生长状态描述',
    '农事建议'
  ]

  const rows = tableData.value.map(
    (row, index) => [
      tableData.value.length - index,
      row.fileName,
      row.recordMode || '手动上传',
      row.deviceName || '未关联设备',
      row.deviceSn || '',
      row.parkName || '',
      row.areaName || '',
      row.locationName || '',
      row.phenologyCrop,
      row.phenologyName,
      `${toPercent(row.phenologyConfidence)}%`,
      row.phenologyNextName,
      row.phenologyDesc,
      row.phenologyAdvice
    ]
  )

  const html = `<table border="1"><tr>${
    headers.map(
      value => `<th>${escapeHtml(value)}</th>`
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

  downloadBlob(
    blob,
    `物候期识别结果_${Date.now()}.xls`
  )
}

function getStatusTag(status) {
  if (status === '已识别') return 'success'
  if (status === '识别失败') return 'danger'
  if (
    status === '上传中'
    || status === '识别中'
  ) {
    return 'warning'
  }
  return 'info'
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

function getThumbnailUrl(item) {
  if (!item) return ''

  // 本次选择的图片优先使用浏览器本地 Blob 地址。
  if (item.localUrl) {
    return item.localUrl
  }

  // 页面数据来自后端时，回退到业务图片地址。
  if (item.imageUrl) {
    return normalizeImageUrl(item.imageUrl)
  }

  if (item.result?.imageUrl) {
    return normalizeImageUrl(item.result.imageUrl)
  }

  if (item.result?.phenologyResultImgUrl) {
    return normalizeImageUrl(
      item.result.phenologyResultImgUrl
    )
  }

  return ''
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

  const baseApi = String(
    import.meta.env.VITE_APP_BASE_API || ''
  ).replace(/\/$/, '')

  return value.startsWith('/')
    ? `${baseApi}${value}`
    : `${baseApi}/${value}`
}




function getFileSuffix(fileName) {
  if (!fileName || !fileName.includes('.')) {
    return ''
  }

  return fileName
    .substring(fileName.lastIndexOf('.') + 1)
    .toLowerCase()
}

function buildUniqueImageName(name) {
  const suffix = getFileSuffix(name)
  const base = suffix
    ? name.substring(0, name.lastIndexOf('.'))
    : name

  return `${base}_${Date.now()}_${
    Math.random().toString(36).slice(2, 8)
  }${suffix ? `.${suffix}` : ''}`
}

function toPercent(value) {
  const number = Number(value || 0)
  return Math.round(
    number <= 1 ? number * 100 : number
  )
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.msg
    || error?.response?.data?.message
    || error?.message
    || fallback
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function goTo(path) {
  router.push(path)
}
</script>

<style scoped>
.phenology-ai-page { min-height: calc(100vh - 84px); padding: 0 18px 22px; background: #f5f7fa; color: #263834; overflow-x: hidden; }
.module-tabs { height: 58px; display: flex; align-items: center; gap: 24px; background: #fff; border-bottom: 1px solid #e8edf0; margin: 0 -18px 18px; padding: 0 24px; }
.tab { border: 0; background: transparent; height: 58px; color: #5f6f6b; cursor: pointer; font-size: 15px; position: relative; white-space: nowrap; }
.tab.active { color: #12a878; font-weight: 700; }
.tab.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #12b886; border-radius: 3px 3px 0 0; }
.toolbar-spacer { flex: 1; }
.tip-alert { margin-bottom: 12px; }
.top-section { height: 560px; margin-bottom: 16px; }
.full-row, .full-col { height: 100%; }
.panel-card { height: 100%; border: 1px solid #e6edf0; border-radius: 16px; overflow: hidden; box-shadow: none; }
.panel-card :deep(.el-card__header) { padding: 0; }
.panel-card :deep(.el-card__body) { height: calc(100% - 56px); padding: 0; display: flex; flex-direction: column; min-height: 0; }
.card-header { min-height: 54px; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; font-weight: 700; }
.btn-group, .action-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hidden-input { display: none; }
.list-stats { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fbfa; color: #6b7b76; font-size: 13px; }
.list-stats b { color: #12a878; }
.file-scroll { flex: 1; padding: 8px; }
.file-list { list-style: none; padding: 0; margin: 0; }
.file-list li { position: relative; display: flex; align-items: center; gap: 10px; min-height: 72px; margin-bottom: 8px; padding: 9px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; background: #fff; transition: .2s; }
.file-list li:hover, .file-list li.active { border-color: #bfeedd; background: #f0faf6; }
.file-list li.active, .file-list li.done { box-shadow: inset 3px 0 0 #12b886; }
.thumb { width: 54px; height: 54px; border-radius: 10px; background: #f5f7fa; flex-shrink: 0; }
.thumb-error { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; color: #a8abb2; font-size: 12px; }
.file-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.file-info span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.delete-icon { color: #f56c6c; opacity: 0; }
.file-list li:hover .delete-icon { opacity: 1; }
.model-select { width: 210px; }
.terminal-card :deep(.el-card__body) { background: linear-gradient(45deg, #f8fbff 25%, transparent 25%) 0 0/24px 24px, #fff; }
.viewer { flex: 1; display: flex; align-items: center; justify-content: center; padding: 14px; min-height: 0; }
.image-wrapper { width: 100%; height: 100%; position: relative; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: inset 0 0 0 1px #edf1f4; }
.main-image { width: 100%; height: 100%; }
.scan-line { position: absolute; left: 0; top: 0; width: 100%; height: 2px; background: #12b886; box-shadow: 0 0 14px #12b886; animation: scan 1.5s linear infinite; }
@keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
.result-content { padding: 14px; overflow-y: auto; gap: 10px; display: flex; flex-direction: column; }
.result-box { padding: 14px; border-radius: 14px; background: #f8fbfa; border: 1px solid #e6edf0; }
.result-box span { display: block; margin-bottom: 6px; color: #7d8b87; font-size: 12px; }
.result-box strong { color: #12a878; font-size: 20px; }
.result-box b { color: #25332f; }
.result-box p { margin: 0; line-height: 1.7; color: #5f6f6b; }
.result-box.advice { background: #f8fffb; border-left: 3px solid #12b886; }
.empty-result { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; color: #a8abb2; }
.empty-result .el-icon { font-size: 46px; }
.table-card { border-radius: 16px; border: 1px solid #e6edf0; box-shadow: none; }
@media (max-width: 1366px) { .top-section { height: auto; } .full-row, .full-col { height: auto; } .full-col { margin-bottom: 16px; } .panel-card { height: 420px; } }
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING-LAYOUT-ACTUAL-FINAL: keep binding and actions on one desktop row. */
.phenology-ai-page .action-group {
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

.phenology-ai-page .device-binding-cascader {
  flex: 0 1 228px;
  width: 228px;
  min-width: 198px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__wrapper) {
  min-height: 30px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__inner) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-ai-page .model-select {
  flex: 0 1 156px;
  width: 156px;
  min-width: 140px;
}

@media (min-width: 901px) and (max-width: 1420px) {
  .phenology-ai-page .device-binding-cascader {
    flex-basis: 190px;
    width: 190px;
    min-width: 180px;
  }

  .phenology-ai-page .model-select {
    flex-basis: 132px;
    width: 132px;
    min-width: 124px;
  }

  .phenology-ai-page .action-group :deep(.reference-action-btn) {
    width: 68px !important;
    min-width: 68px !important;
    padding-right: 4px !important;
    padding-left: 4px !important;
  }

  
}

@media (max-width: 900px) {
  .phenology-ai-page .action-group {
    flex-wrap: wrap;
    overflow-x: visible;
    align-items: stretch;
  }

  .phenology-ai-page .device-binding-cascader,
  .phenology-ai-page .model-select {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE: remove this block to roll back the near-right-angle theme. */
.phenology-ai-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.phenology-ai-page .module-tabs,
.phenology-ai-page .module-tabs .tab,
.phenology-ai-page .module-tabs .tab.active::after,
.phenology-ai-page .panel-card,
.phenology-ai-page .table-card,
.phenology-ai-page .viewer,
.phenology-ai-page .image-wrapper,
.phenology-ai-page .file-list li,
.phenology-ai-page .thumb,
.phenology-ai-page .list-stats span,
.phenology-ai-page .result-main,
.phenology-ai-page .metric-box,
.phenology-ai-page .metric-grid > div,
.phenology-ai-page .advice-box,
.phenology-ai-page .empty-result,
.phenology-ai-page :deep(.el-card),
.phenology-ai-page :deep(.el-card__header),
.phenology-ai-page :deep(.el-card__body),
.phenology-ai-page :deep(.el-button),
.phenology-ai-page :deep(.el-button-group),
.phenology-ai-page :deep(.el-input__wrapper),
.phenology-ai-page :deep(.el-select__wrapper),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper),
.phenology-ai-page :deep(.el-tag),
.phenology-ai-page :deep(.el-progress-bar__outer),
.phenology-ai-page :deep(.el-progress-bar__inner),
.phenology-ai-page :deep(.el-table),
.phenology-ai-page :deep(.el-table__inner-wrapper),
.phenology-ai-page :deep(.el-pagination button),
.phenology-ai-page :deep(.el-pager li),
.phenology-ai-page :deep(.el-scrollbar__bar),
.phenology-ai-page :deep(.el-scrollbar__thumb) {
  border-radius: var(--sharp-radius) !important;
}

.phenology-ai-page .panel-card,
.phenology-ai-page .table-card,
.phenology-ai-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.phenology-ai-page .panel-card:hover,
.phenology-ai-page .table-card:hover,
.phenology-ai-page :deep(.el-card:hover) {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.phenology-ai-page .viewer,
.phenology-ai-page .file-list li,
.phenology-ai-page .list-stats span,
.phenology-ai-page .result-main,
.phenology-ai-page .metric-box,
.phenology-ai-page .metric-grid > div,
.phenology-ai-page .advice-box,
.phenology-ai-page .empty-result {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.phenology-ai-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.phenology-ai-page :deep(.el-input__wrapper),
.phenology-ai-page :deep(.el-select__wrapper),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.phenology-ai-page :deep(.el-input__wrapper.is-focus),
.phenology-ai-page :deep(.el-select__wrapper.is-focused),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.phenology-ai-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.phenology-ai-page :deep(.el-progress-bar__inner) {
  background: #2f7d5c !important;
}

:global(.xwq-sharp-popper),
:global(.xwq-sharp-popper.el-popper),
:global(.xwq-sharp-popper .el-select-dropdown),
:global(.xwq-sharp-popper .el-cascader-panel),
:global(.xwq-sharp-popper .el-select-dropdown__item),
:global(.xwq-sharp-popper .el-cascader-node),
:global(.xwq-sharp-popper .el-popper__arrow::before) {
  border-radius: 1px !important;
}

:global(.xwq-sharp-popper.el-popper),
:global(.xwq-sharp-popper .el-select-dropdown),
:global(.xwq-sharp-popper .el-cascader-panel) {
  border-color: #d5e5d6 !important;
  box-shadow: 0 8px 20px rgba(63, 91, 70, 0.10) !important;
}
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING-LAYOUT-FINAL: keep binding and actions on one desktop row. */
.phenology-ai-page .action-group {
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

.phenology-ai-page .device-binding-cascader {
  flex: 0 1 228px;
  width: 228px;
  min-width: 198px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__wrapper) {
  min-height: 30px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__inner) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-ai-page .model-select {
  flex: 0 1 156px;
  width: 156px;
  min-width: 140px;
}

@media (min-width: 901px) and (max-width: 1420px) {
  .phenology-ai-page .device-binding-cascader {
    flex-basis: 190px;
    width: 190px;
    min-width: 180px;
  }

  .phenology-ai-page .model-select {
    flex-basis: 132px;
    width: 132px;
    min-width: 124px;
  }

  .phenology-ai-page .action-group :deep(.reference-action-btn) {
    width: 68px !important;
    min-width: 68px !important;
    padding-right: 4px !important;
    padding-left: 4px !important;
  }

  
}

@media (max-width: 900px) {
  .phenology-ai-page .action-group {
    flex-wrap: wrap;
    overflow-x: visible;
    align-items: stretch;
  }

  .phenology-ai-page .device-binding-cascader,
  .phenology-ai-page .model-select {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING: remove this block to roll back binding layout only. */
.phenology-ai-page .device-binding-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 8px;
  min-width: min(100%, 430px);
}

.phenology-ai-page .device-binding-group :deep(.el-select) {
  width: 100%;
}

@media (max-width: 1199px) {
  .phenology-ai-page .device-binding-group {
    min-width: 100%;
  }
}
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   只修改视觉样式，不改动模板、方法、功能、接口及原有注释。 */
.phenology-ai-page {
  --ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-green-light: #edf5e9;
  --ft-green-pale: #f8fbf5;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e5eee2;
  min-height: calc(100vh - 84px);
  padding: 20px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.17), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.phenology-ai-page *,
.phenology-ai-page *::before,
.phenology-ai-page *::after {
  box-sizing: border-box;
}

.phenology-ai-page .module-tabs {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 8px 10px;
  margin-bottom: 16px;
  gap: 6px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 11px 28px rgba(58, 88, 63, 0.09);
  backdrop-filter: blur(8px);
}

.phenology-ai-page .module-tabs .tab {
  position: relative;
  min-width: 108px;
  height: 40px;
  padding: 0 18px;
  color: var(--ft-text-secondary);
  font-size: 14px;
  font-weight: 650;
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

.phenology-ai-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.phenology-ai-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 17px rgba(47, 125, 92, 0.22);
}

.phenology-ai-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.phenology-ai-page .toolbar-spacer {
  flex: 1 1 auto;
}

.phenology-ai-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(58, 88, 63, 0.08);
}

.phenology-ai-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.phenology-ai-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.phenology-ai-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.phenology-ai-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 650;
}

.phenology-ai-page :deep(.el-input__wrapper),
.phenology-ai-page :deep(.el-select__wrapper),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper),
.phenology-ai-page :deep(.el-date-editor.el-input__wrapper),
.phenology-ai-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.phenology-ai-page :deep(.el-input__wrapper:hover),
.phenology-ai-page :deep(.el-select__wrapper:hover),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper:hover),
.phenology-ai-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.phenology-ai-page :deep(.el-input__wrapper.is-focus),
.phenology-ai-page :deep(.el-select__wrapper.is-focused),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.phenology-ai-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.phenology-ai-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.phenology-ai-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.phenology-ai-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.phenology-ai-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.phenology-ai-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.phenology-ai-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.phenology-ai-page :deep(.el-pagination.is-background .el-pager li.is-active),
.phenology-ai-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.phenology-ai-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .phenology-ai-page {
    padding: 12px;
  }

  .phenology-ai-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .phenology-ai-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .phenology-ai-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .phenology-ai-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .phenology-ai-page .filter-form :deep(.el-form-item__content),
  .phenology-ai-page .filter-form :deep(.el-input),
  .phenology-ai-page .filter-form :deep(.el-select),
  .phenology-ai-page .filter-form :deep(.el-cascader),
  .phenology-ai-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.phenology-ai-page .top-section {
  margin-bottom: 16px;
}

.phenology-ai-page .full-row {
  align-items: stretch;
}

.phenology-ai-page .full-col {
  display: flex;
}

.phenology-ai-page .panel-card,
.phenology-ai-page .table-card {
  width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
}

.phenology-ai-page .panel-card :deep(.el-card__header),
.phenology-ai-page .table-card :deep(.el-card__header) {
  min-height: 58px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
}

.phenology-ai-page .panel-card :deep(.el-card__body) {
  padding: 16px;
}

.phenology-ai-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 12px;
  color: #294635;
  font-weight: 800;
}

.phenology-ai-page .btn-group,
.phenology-ai-page .action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.phenology-ai-page .action-group {
  width: 100%;
  justify-content: flex-end;
}

.phenology-ai-page .model-select {
  min-width: 210px;
}

.phenology-ai-page .list-stats {
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

.phenology-ai-page .list-stats b {
  color: var(--ft-green);
}

.phenology-ai-page .file-scroll {
  height: 510px;
}

.phenology-ai-page .file-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.phenology-ai-page .file-list li {
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

.phenology-ai-page .file-list li:hover {
  border-color: #b9d1bb;
  box-shadow: 0 7px 16px rgba(58, 88, 63, 0.08);
  transform: translateY(-1px);
}

.phenology-ai-page .file-list li.active {
  background: #eaf3e7;
  border-color: #8db598;
  box-shadow: inset 3px 0 0 var(--ft-green);
}

.phenology-ai-page .file-list li.done {
  border-right: 3px solid #76a987;
}

.phenology-ai-page .thumb {
  width: 72px;
  height: 60px;
  overflow: hidden;
  border: 1px solid #dce7da;
  border-radius: 8px;
}

.phenology-ai-page .file-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.phenology-ai-page .file-info > span {
  overflow: hidden;
  color: #344e3e;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-ai-page .delete-icon {
  color: #9aa89d;
  cursor: pointer;
}

.phenology-ai-page .delete-icon:hover {
  color: #c65f5f;
}

.phenology-ai-page .viewer {
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

.phenology-ai-page .image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.phenology-ai-page .main-image {
  width: 100%;
  height: 500px;
}

.phenology-ai-page .scan-line {
  position: absolute;
  right: 4%;
  left: 4%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #5aa177, transparent);
  box-shadow: 0 0 12px rgba(47, 125, 92, 0.5);
}

.phenology-ai-page .result-content {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.phenology-ai-page .result-box {
  padding: 13px 14px;
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-radius: 11px;
}

.phenology-ai-page .result-box > span {
  display: block;
  margin-bottom: 7px;
  color: var(--ft-muted);
  font-size: 12px;
}

.phenology-ai-page .result-box strong {
  color: #2d6046;
  font-size: 22px;
}

.phenology-ai-page .result-box b {
  color: #355541;
  font-size: 16px;
}

.phenology-ai-page .result-box.desc {
  background: #f7faf5;
}

.phenology-ai-page .result-box.advice {
  background: #eef7eb;
  border-color: #cfe1cd;
}

.phenology-ai-page .result-box p {
  margin: 0;
  color: var(--ft-text-secondary);
  line-height: 1.7;
}

.phenology-ai-page .empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  flex-direction: column;
  gap: 12px;
  color: #91a095;
}

.phenology-ai-page .empty-result .el-icon {
  color: #7fa88a;
  font-size: 46px;
}

.phenology-ai-page .table-card :deep(.el-card__body) {
  padding: 0;
}

@media (max-width: 1200px) {
  .phenology-ai-page .full-col {
    margin-bottom: 16px;
  }

  .phenology-ai-page .file-scroll,
  .phenology-ai-page .viewer {
    height: auto;
    min-height: 360px;
  }

  .phenology-ai-page .main-image {
    height: 350px;
  }
}
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING-FINAL: keep the three optional selectors before the model selector. */
.phenology-ai-page .action-group {
  display: flex !important;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.phenology-ai-page .device-binding-group {
  display: grid;
  flex: 1 1 430px;
  grid-template-columns: repeat(3, minmax(108px, 1fr));
  gap: 8px;
  min-width: 360px;
}

.phenology-ai-page .device-binding-group :deep(.el-select),
.phenology-ai-page .model-select {
  width: 100%;
  min-width: 0;
}

.phenology-ai-page .device-binding-cascader {
  flex: 0 1 228px;
  width: 228px;
  min-width: 198px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__wrapper) {
  min-height: 30px;
}

.phenology-ai-page .model-select {
  flex: 0 1 156px;
  width: 156px;
  min-width: 140px;
}

.phenology-ai-page .action-group :deep(.reference-action-btn),
.phenology-ai-page .action-group :deep(.el-button-group) {
  flex: 0 0 auto;
}

@media (max-width: 900px) {
  .phenology-ai-page .device-binding-cascader,
  .phenology-ai-page .model-select {
    flex-basis: 100%;
    width: 100%;
  }

  .phenology-ai-page .device-binding-group {
    flex-basis: 100%;
    min-width: 0;
  }
}
</style>

<style scoped>
/* 与物候总览统一：排版、字体、按钮和卡片 */

.phenology-ai-page {

  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: calc(100vh - 84px);
  padding: 14px;
  color: #24352d;
  background:
    radial-gradient(
      circle at 10% 0%,
      rgba(127, 168, 138, 0.17),
      transparent 30%
    ),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans CJK SC",
    "Helvetica Neue",
    Arial,
    sans-serif;
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;

  --ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e5eee2;
}

.phenology-ai-page *,
.phenology-ai-page *::before,
.phenology-ai-page *::after {
  box-sizing: border-box;
  font-family: inherit;
}

.phenology-ai-page button,
.phenology-ai-page input,
.phenology-ai-page select,
.phenology-ai-page textarea {
  font: inherit;
}

/* 与总览页面一致的顶部页签 */
.phenology-ai-page .module-tabs {
  display: flex;
  align-items: center;
  min-height: 50px;
  height: 50px;
  padding: 5px 7px;
  margin: 0 0 12px;
  gap: 4px;
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.08);
  backdrop-filter: blur(8px);
}

.phenology-ai-page .module-tabs .tab {
  position: relative;
  flex: 0 0 auto;
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  color: var(--ft-text-secondary);
  font-size: 14px;
  font-weight: 600;
  line-height: 38px;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.phenology-ai-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.phenology-ai-page .module-tabs .tab.active {
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--ft-green),
    var(--ft-green-mid)
  );
  box-shadow: 0 6px 14px rgba(47, 125, 92, 0.2);
}

.phenology-ai-page .module-tabs .tab.active::after {
  position: absolute;
  right: 16px;
  bottom: 4px;
  left: 16px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
}

.phenology-ai-page .toolbar-spacer {
  flex: 1 1 auto;
}

/* Element Plus 控件与总览页面统一 */
.phenology-ai-page :deep(.el-input__wrapper),
.phenology-ai-page :deep(.el-select__wrapper),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper),
.phenology-ai-page :deep(.el-date-editor.el-input__wrapper),
.phenology-ai-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.phenology-ai-page :deep(.el-input__wrapper:hover),
.phenology-ai-page :deep(.el-select__wrapper:hover),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper:hover),
.phenology-ai-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.phenology-ai-page :deep(.el-input__wrapper.is-focus),
.phenology-ai-page :deep(.el-select__wrapper.is-focused),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.phenology-ai-page :deep(.el-input__inner),
.phenology-ai-page :deep(.el-select__selected-item),
.phenology-ai-page :deep(.el-select__placeholder),
.phenology-ai-page :deep(.el-range-input) {
  font-family: inherit;
  font-size: 13px;
}

.phenology-ai-page :deep(.el-button) {
  min-height: 32px;
  margin-left: 0;
  padding: 0 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 7px;
}

.phenology-ai-page :deep(.el-button--small) {
  min-height: 30px;
  height: 30px;
  padding: 0 11px;
  font-size: 12px;
}

.phenology-ai-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.phenology-ai-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #fff;
}

.phenology-ai-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
  --el-button-active-bg-color: #397858;
  --el-button-active-border-color: #397858;
}

.phenology-ai-page :deep(.el-button--success.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: #3f805f;
  --el-button-hover-bg-color: #4f8f6b;
  --el-button-hover-border-color: #4f8f6b;
  --el-button-hover-text-color: #fff;
}

.phenology-ai-page :deep(.el-card) {
  border-color: var(--ft-border);
}

.phenology-ai-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
  border-bottom-color: var(--ft-border-soft);
}

.phenology-ai-page .card-header {
  min-height: 30px;
  font-size: 14px;
  font-weight: 700;
  line-height: 30px;
}

.phenology-ai-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  font-family: inherit;
  font-size: 13px;
}

.phenology-ai-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.phenology-ai-page :deep(.el-pagination) {
  font-family: inherit;
  font-size: 13px;
}

.phenology-ai-page :deep(.el-pagination.is-background .el-pager li.is-active),
.phenology-ai-page :deep(.el-pagination .el-pager li.is-active) {
  color: #fff;
  background: var(--ft-green);
}

.phenology-ai-page :deep(.el-empty__description p),
.phenology-ai-page :deep(.el-loading-text) {
  color: var(--ft-muted);
  font-family: inherit;
  font-size: 13px;
}


.phenology-ai-page .top-section {
  height: 548px;
  margin-bottom: 12px;
}

.phenology-ai-page .full-row,
.phenology-ai-page .full-col {
  height: 100%;
}

.phenology-ai-page .panel-card,
.phenology-ai-page .table-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.08);
}

.phenology-ai-page .panel-card {
  height: 100%;
}

.phenology-ai-page .panel-card :deep(.el-card__header) {
  height: 48px;
  padding: 8px 12px;
}

.phenology-ai-page .panel-card :deep(.el-card__body) {
  height: calc(100% - 48px);
}

.phenology-ai-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
  padding: 0;
}

.phenology-ai-page .btn-group,
.phenology-ai-page .action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.phenology-ai-page .model-select {
  width: 200px;
}

.phenology-ai-page .list-stats {
  min-height: 36px;
  padding: 8px 10px;
  font-size: 12px;
  background: #f5f9f3;
  border-bottom: 1px solid var(--ft-border-soft);
}

.phenology-ai-page .file-scroll {
  padding: 7px;
}

.phenology-ai-page .file-list li {
  min-height: 66px;
  margin-bottom: 6px;
  padding: 7px;
  gap: 8px;
  border-radius: 9px;
}

.phenology-ai-page .thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
}

.phenology-ai-page .file-info {
  gap: 4px;
}

.phenology-ai-page .file-info span {
  font-size: 13px;
  font-weight: 600;
}

.phenology-ai-page .viewer {
  padding: 10px;
}

.phenology-ai-page .image-wrapper {
  border-radius: 10px;
}

.phenology-ai-page .result-content {
  padding: 10px;
  gap: 8px;
}

.phenology-ai-page .result-box {
  padding: 10px 11px;
  border-radius: 9px;
  border-color: var(--ft-border-soft);
  background: #f8fbf5;
}

.phenology-ai-page .result-box span {
  margin-bottom: 4px;
  font-size: 12px;
}

.phenology-ai-page .result-box strong {
  color: var(--ft-green);
  font-size: 19px;
}

.phenology-ai-page .result-box p {
  font-size: 13px;
  line-height: 1.6;
}

.phenology-ai-page .table-card {
  margin-top: 0;
}

.phenology-ai-page .table-card :deep(.el-card__body) {
  padding: 0;
}

@media (max-width: 1366px) {
  .phenology-ai-page .top-section {
    height: auto;
  }

  .phenology-ai-page .full-row,
  .phenology-ai-page .full-col {
    height: auto;
  }

  .phenology-ai-page .full-col {
    margin-bottom: 12px;
  }

  .phenology-ai-page .panel-card {
    height: 430px;
  }
}

@media (max-width: 900px) {
  .phenology-ai-page {
    padding: 10px;
  }

  .phenology-ai-page .action-group {
    align-items: stretch;
  }

  .phenology-ai-page .model-select {
    width: 100%;
  }
}
</style>


<style scoped>
/* 两个智能分析页面最终统一样式：按钮参考虫情，布局参考物候期 */
.phenology-ai-page {
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

.phenology-ai-page,
.phenology-ai-page *,
.phenology-ai-page *::before,
.phenology-ai-page *::after,
.phenology-ai-page :deep(*) {
  box-sizing: border-box;
  font-family: inherit !important;
}

/* 布局统一：左5，中13，右6 */
.phenology-ai-page .top-section {
  height: 548px;
  margin-bottom: 12px;
}

.phenology-ai-page .full-row,
.phenology-ai-page .full-col {
  height: 100%;
}

.phenology-ai-page .full-col {
  display: flex;
}

.phenology-ai-page .panel-card,
.phenology-ai-page .table-card {
  width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(58, 88, 63, 0.07);
}

.phenology-ai-page .top-section .panel-card {
  height: 100%;
}

.phenology-ai-page .panel-card :deep(.el-card__header),
.phenology-ai-page .table-card :deep(.el-card__header) {
  height: 48px;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ai-border-soft);
}

.phenology-ai-page .panel-card :deep(.el-card__body) {
  height: calc(100% - 48px);
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.phenology-ai-page .card-header {
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

.phenology-ai-page .btn-group {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  align-items: center;
  justify-content: start;
  width: auto;
  gap: 6px;
}

.phenology-ai-page .action-group {
    display: grid;
  grid-template-columns: minmax(160px, 190px) 76px 76px;
  align-items: center;

  justify-content: end;
  width: 100%;
  gap: 6px;
}

.phenology-ai-page .action-group :deep(.el-select),
.phenology-ai-page .model-select {
  width: 100%;
  min-width: 0;
}

/* 操作按钮统一为虫情页面规则 */
.phenology-ai-page :deep(.reference-action-btn) {
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

.phenology-ai-page .btn-group :deep(.reference-action-btn) {
  width: 100% !important;
  min-width: 0 !important;
  height: 28px !important;
  min-height: 28px !important;
  padding: 0 5px !important;
  font-size: 12px !important;
  line-height: 26px !important;
}

.phenology-ai-page .action-group :deep(.reference-action-btn) {
  width: 76px !important;
  min-width: 76px !important;
  height: 30px !important;
  min-height: 30px !important;
  padding: 0 !important;
  font-size: 13px !important;
  line-height: 28px !important;
}

.phenology-ai-page :deep(.reference-primary-btn),
.phenology-ai-page :deep(.reference-primary-btn.is-plain) {
  color: #fff !important;
  background: var(--ai-green) !important;
  border-color: var(--ai-green) !important;
}

.phenology-ai-page :deep(.reference-primary-btn:hover),
.phenology-ai-page :deep(.reference-primary-btn:focus) {
  color: #fff !important;
  background: var(--ai-green-hover) !important;
  border-color: var(--ai-green-hover) !important;
}

.phenology-ai-page :deep(.reference-secondary-btn),
.phenology-ai-page :deep(.reference-secondary-btn.is-plain) {
  color: #606266 !important;
  background: #fff !important;
  border-color: #dcdfe6 !important;
}

.phenology-ai-page :deep(.reference-secondary-btn:hover),
.phenology-ai-page :deep(.reference-secondary-btn:focus) {
  color: var(--ai-green) !important;
  background: #f1f7ef !important;
  border-color: #8bb59a !important;
}

.phenology-ai-page :deep(.reference-action-btn.is-disabled),
.phenology-ai-page :deep(.reference-action-btn.is-disabled:hover),
.phenology-ai-page :deep(.reference-action-btn.is-disabled:focus) {
  color: #a8abb2 !important;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
}



/* 左侧资源区 */
.phenology-ai-page .list-stats {
  min-height: 36px;
  padding: 8px 10px;
  color: var(--ai-text-secondary);
  font-size: 12px;
  background: #f5f9f3;
  border-bottom: 1px solid var(--ai-border-soft);
}

.phenology-ai-page .file-list li {
  min-height: 66px;
  margin-bottom: 6px;
  padding: 7px;
  gap: 8px;
  border-radius: 9px;
}

.phenology-ai-page .thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
}

.phenology-ai-page .file-info {
  gap: 4px;
}

.phenology-ai-page .file-info strong,
.phenology-ai-page .file-info > span {
  font-size: 13px;
  font-weight: 600;
}

/* 中间预览区 */
.phenology-ai-page .viewer {
  flex: 1;
  min-height: 0;
  padding: 10px;
}

.phenology-ai-page .image-wrapper {
  border-radius: 10px;
}

.phenology-ai-page .main-image {
  width: 100%;
  height: 100%;
}

/* 右侧结果区 */
.phenology-ai-page .result-content {
  height: 100%;
  padding: 10px;
  gap: 8px;
  overflow-y: auto;
}

.phenology-ai-page .result-main,
.phenology-ai-page .metric-box,
.phenology-ai-page .advice-box,
.phenology-ai-page .result-box {
  padding: 10px 11px;
  border: 1px solid var(--ai-border-soft);
  border-radius: 9px;
  background: #f8fbf5;
}

.phenology-ai-page .result-main span,
.phenology-ai-page .metric-box span,
.phenology-ai-page .advice-box span,
.phenology-ai-page .result-box span {
  margin-bottom: 4px;
  color: var(--ai-muted);
  font-size: 12px;
}

.phenology-ai-page .result-main strong,
.phenology-ai-page .result-box strong {
  color: var(--ai-green);
  font-size: 19px;
}

.phenology-ai-page .advice-box p,
.phenology-ai-page .result-box p {
  font-size: 13px;
  line-height: 1.6;
}

/* 底部明细 */
.phenology-ai-page .table-card {
  margin-top: 0;
}

.phenology-ai-page .table-card :deep(.el-card__body) {
  padding: 0;
}

.phenology-ai-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ai-text-secondary);
  font-size: 13px;
}

.phenology-ai-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

@media (max-width: 1366px) {
  .phenology-ai-page .top-section {
    height: auto;
  }

  .phenology-ai-page .full-row,
  .phenology-ai-page .full-col {
    height: auto;
  }

  .phenology-ai-page .full-col {
    margin-bottom: 12px;
  }

  .phenology-ai-page .top-section .panel-card {
    height: 430px;
  }
}

@media (max-width: 900px) {
  .phenology-ai-page {
    padding: 10px;
  }

  .phenology-ai-page .action-group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
  }

  .phenology-ai-page .action-group :deep(.el-select),
  .phenology-ai-page .model-select {
    grid-column: 1 / -1;
    width: 100%;
  }

  

  .phenology-ai-page .action-group :deep(.reference-action-btn) {
    width: 100% !important;
    min-width: 0 !important;
  }
}
</style>

<style scoped>
/* CODEX-PHENOLOGY-AI-FIX: remove this block to roll back empty-state alignment only. */
.phenology-ai-page .file-scroll {
  flex: 1 1 auto !important;
  height: auto !important;
  min-height: 0 !important;
}

.phenology-ai-page .file-scroll :deep(.el-scrollbar__wrap),
.phenology-ai-page .file-scroll :deep(.el-scrollbar__view) {
  height: 100%;
}

.phenology-ai-page .file-scroll :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
}

.phenology-ai-page .file-scroll :deep(.el-empty) {
  flex: 1 1 auto;
  width: 100%;
  min-height: 260px;
  justify-content: center;
}

.phenology-ai-page .viewer {
  flex: 1 1 auto !important;
  min-height: 0 !important;
}

.phenology-ai-page .viewer :deep(.el-empty) {
  width: 100%;
  min-height: 100%;
  justify-content: center;
}

.phenology-ai-page .report-card .empty-result {
  flex: 1 1 auto !important;
  width: 100%;
  height: auto !important;
  min-height: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center;
}

@media (min-width: 1367px) {
  .phenology-ai-page .file-scroll :deep(.el-empty),
  .phenology-ai-page .report-card .empty-result {
    min-height: 420px !important;
  }
}

@media (max-width: 1366px) {
  .phenology-ai-page .file-scroll :deep(.el-empty),
  .phenology-ai-page .report-card .empty-result {
    min-height: 320px !important;
  }
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE-ACTUAL-FINAL: remove this block with CODEX-XWQ-SHARP-STYLE to roll back. */
.phenology-ai-page .module-tabs,
.phenology-ai-page .module-tabs .tab,
.phenology-ai-page .module-tabs .tab.active::after,
.phenology-ai-page .panel-card,
.phenology-ai-page .table-card,
.phenology-ai-page .viewer,
.phenology-ai-page .image-wrapper,
.phenology-ai-page .file-list li,
.phenology-ai-page .thumb,
.phenology-ai-page .list-stats span,
.phenology-ai-page .result-main,
.phenology-ai-page .metric-box,
.phenology-ai-page .metric-grid > div,
.phenology-ai-page .advice-box,
.phenology-ai-page .empty-result,
.phenology-ai-page :deep(.el-card),
.phenology-ai-page :deep(.el-card__header),
.phenology-ai-page :deep(.el-card__body),
.phenology-ai-page :deep(.el-button),
.phenology-ai-page :deep(.el-button-group),
.phenology-ai-page :deep(.el-input__wrapper),
.phenology-ai-page :deep(.el-select__wrapper),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper),
.phenology-ai-page :deep(.el-tag),
.phenology-ai-page :deep(.el-progress-bar__outer),
.phenology-ai-page :deep(.el-progress-bar__inner),
.phenology-ai-page :deep(.el-table),
.phenology-ai-page :deep(.el-table__inner-wrapper),
.phenology-ai-page :deep(.el-pagination button),
.phenology-ai-page :deep(.el-pager li),
.phenology-ai-page :deep(.el-scrollbar__bar),
.phenology-ai-page :deep(.el-scrollbar__thumb) {
  border-radius: 1px !important;
}

.phenology-ai-page .panel-card,
.phenology-ai-page .table-card,
.phenology-ai-page :deep(.el-card) {
  border-color: #d5e5d6 !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.phenology-ai-page .viewer,
.phenology-ai-page .file-list li,
.phenology-ai-page .list-stats span,
.phenology-ai-page .result-main,
.phenology-ai-page .metric-box,
.phenology-ai-page .metric-grid > div,
.phenology-ai-page .advice-box,
.phenology-ai-page .empty-result {
  background: #fbfdf9 !important;
  border-color: #dce8d8 !important;
}

.phenology-ai-page :deep(.el-input__wrapper),
.phenology-ai-page :deep(.el-select__wrapper),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.phenology-ai-page :deep(.el-input__wrapper.is-focus),
.phenology-ai-page :deep(.el-select__wrapper.is-focused),
.phenology-ai-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.phenology-ai-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.phenology-ai-page :deep(.el-progress-bar__inner) {
  background: #2f7d5c !important;
}
</style>

<style scoped>
/* CODEX-MANUAL-DEVICE-BINDING-LAYOUT-ACTUAL-FINAL: keep binding and actions on one desktop row. */
.phenology-ai-page .action-group {
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

.phenology-ai-page .device-binding-cascader {
  flex: 0 1 228px;
  width: 228px;
  min-width: 198px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__wrapper) {
  min-height: 30px;
}

.phenology-ai-page .device-binding-cascader :deep(.el-input__inner) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-ai-page .model-select {
  flex: 0 1 156px;
  width: 156px;
  min-width: 140px;
}

@media (min-width: 901px) and (max-width: 1420px) {
  .phenology-ai-page .device-binding-cascader {
    flex-basis: 190px;
    width: 190px;
    min-width: 180px;
  }

  .phenology-ai-page .model-select {
    flex-basis: 132px;
    width: 132px;
    min-width: 124px;
  }

  .phenology-ai-page .action-group :deep(.reference-action-btn) {
    width: 68px !important;
    min-width: 68px !important;
    padding-right: 4px !important;
    padding-left: 4px !important;
  }

  
}

@media (max-width: 900px) {
  .phenology-ai-page .action-group {
    flex-wrap: wrap;
    overflow-x: visible;
    align-items: stretch;
  }

  .phenology-ai-page .device-binding-cascader,
  .phenology-ai-page .model-select {
    flex-basis: 100%;
    width: 100%;
  }
}
</style>
