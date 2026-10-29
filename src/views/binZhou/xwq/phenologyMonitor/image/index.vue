<template>
  <div class="image-page">
    <div class="module-tabs">
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/analysis')">总览</button>
      <button class="tab active">物候图片</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/ai')">智能分析</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/report')">历史数据与报告</button>
      <div class="toolbar-spacer"></div>
      <el-button size="small" plain @click="loadData">刷新</el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryParams" class="filter-form">
                <el-form-item label="监测范围">
          <el-cascader
            v-model="monitorScopePath"
            class="scope-cascader"
            popper-class="xwq-sharp-popper"
            placeholder="全部园区 / 地块 / 角落 / 设备"
            clearable
            filterable
            :props="monitorScopeProps"
            @change="handleMonitorScopeChange"
          />
        </el-form-item>


        <el-form-item label="作物类型">
          <el-input
            v-model="queryParams.phenologyCrop"
            placeholder="冬枣"
            clearable
            style="width: 160px"
            @keyup.enter="loadData"
          />
        </el-form-item>

        <el-form-item label="物候期">
          <el-select v-model="queryParams.phenologyName" placeholder="全部" clearable popper-class="xwq-sharp-popper" style="width: 150px">
            <el-option v-for="item in stageOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item label="图片名称">
          <el-input
            v-model="queryParams.imageName"
            placeholder="请输入图片名称"
            clearable
            style="width: 170px"
            @keyup.enter="loadData"
          />
        </el-form-item>

        <el-form-item class="search-actions">
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-loading="loading">
      <div class="image-toolbar">
        <div class="image-stat">
          <span>共 {{ imageCards.length }} 张</span>
          <span>物候期种类 {{ totalStageCount }} 种</span>
          <span>数据量 {{ totalRecordCount }} 条</span>
          <span>当前范围：{{ rangeName }}</span>
        </div>
      </div>

      <el-empty v-if="!imageCards.length" description="暂无物候图片" :image-size="120" />

            <div v-else class="phenology-photo-grid">
        <div
          v-for="item in pagedImageCards"
          :key="item.imageId || item.phenologyId"
          class="phenology-photo-card"
        >
          <div class="photo-box">
            <el-image
              :src="getCardDisplayUrl(item)"
              fit="cover"
              :preview-src-list="getPhenologyPreviewList(item)"
              :initial-index="getPreviewInitialIndex(item)"
              :infinite="false"
              :z-index="5000"
              preview-teleported
              hide-on-click-modal
              @click.stop
            >
              <template #error>
                <div class="image-error">暂无图片</div>
              </template>
            </el-image>

            <!-- <div class="photo-mode-actions">
              <button
                type="button"
                :class="{ active: getCardMode(item) === 'original' }"
                :disabled="!item.originalImageUrl"
                @click.stop="setCardMode(item, 'original')"
              >
                原图
              </button>
              <button
                type="button"
                :class="{ active: getCardMode(item) === 'result' }"
                :disabled="!item.resultImageUrl"
                @click.stop="setCardMode(item, 'result')"
              >
                结果图
              </button>
            </div> -->
          </div>

          <div class="photo-meta">
            <strong class="image-name" :title="item.imageName">
              {{ item.imageName || `图片${item.imageId}` }}
            </strong>

            <div class="metric-row">
              <span class="stage">{{ item.currentStage || '待判断' }}</span>
              <span class="records">{{ item.recordCount }}条</span>
            </div>

            <div class="info-row">
              <span>作物类型</span>
              <b>{{ item.cropType || '冬枣' }}</b>
            </div>

            <div class="info-row">
              <span>下一物候期</span>
              <b>{{ item.nextStage || '待判断' }}</b>
            </div>

            <div class="time-row">
              {{ formatTime(item.recognizeTime) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="imageCards.length" class="pagination-row">
        <span>共 {{ imageCards.length }} 张</span>
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :page-sizes="[12, 24, 48, 96]"
          layout="sizes, prev, pager, next, jumper"
          :total="imageCards.length"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listPhenology } from '@/api/binZhou/xwq/phenology'
import { listImage } from '@/api/binZhou/xwq/image'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'

const router = useRouter()
const loading = ref(false)
const imageRows = ref([])
const phenologyRows = ref([])
const pageNum = ref(1)
const pageSize = ref(24)
const monitorScopePath = ref([])
const cardModes = ref({})
let loadRequestId = 0

const parkOptions = ref([])
const areaOptions = ref([])
const locationOptions = ref([])
const deviceOptions = ref([])

const DEFAULT_SCOPE = {
  parkName: '滨州园区',
  areaName: '01地块',
  locationName: '东北',
  deviceName: '滨州园区01地块虫情测试仪'
}

const queryParams = ref({
  parkId: undefined,
  areaId: undefined,
  locationId: undefined,
  deviceId: undefined,
  phenologyCrop: '',
  phenologyName: '',
  imageName: ''
})

const monitorScopeProps = {
  lazy: true,
  checkStrictly: true,
  emitPath: true,
  value: 'value',
  label: 'label',
  leaf: 'leaf',
  async lazyLoad(node, resolve) {
    try {
      const level = node.level
      const parentId = getScopeValueId(node.value)

      if (level === 0) {
        if (!parkOptions.value.length) await loadParkOptions()
        resolve(parkOptions.value.map(item => ({
          value: buildScopeValue('park', item.parkId),
          label: item.parkName,
          leaf: false
        })))
        return
      }

      if (level === 1) {
        const res = await listAreaByParkId(parentId)
        const rows = getResponseRows(res)
        areaOptions.value = rows
        resolve(rows.map(item => ({
          value: buildScopeValue('area', item.areaId),
          label: item.areaName,
          leaf: false
        })))
        return
      }

      if (level === 2) {
        const res = await listLocationByAreaId(parentId)
        const rows = getResponseRows(res)
        locationOptions.value = rows
        resolve(rows.map(item => ({
          value: buildScopeValue('location', item.locationId),
          label: item.locationName,
          leaf: false
        })))
        return
      }

      if (level === 3) {
        const res = await listDevice({
          pageNum: 1,
          pageSize: 999,
          locationId: parentId
        })
        const rows = getResponseRows(res).filter(
          item =>
            String(item.locationId || '')
            === String(parentId)
        )
        deviceOptions.value = rows
        resolve(rows.map(item => ({
          value: buildScopeValue('device', item.deviceId),
          label:
            item.deviceName
            || item.deviceSn
            || `设备${item.deviceId}`,
          leaf: true
        })))
        return
      }

      resolve([])
    } catch (error) {
      console.error(error)
      ElMessage.warning('监测范围树加载失败')
      resolve([])
    }
  }
}

const stageOptions = computed(() => {
  return Array.from(new Set(
    phenologyRows.value
      .map(row => String(row.phenologyName || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const imageCards = computed(() => {
  const images = new Map()

  imageRows.value.forEach(row => {
    if (row.imageId !== undefined && row.imageId !== null) {
      images.set(String(row.imageId), row)
    }
  })

  const resultGroups = new Map()

  phenologyRows.value.forEach(row => {
    const key = row.imageId !== undefined && row.imageId !== null
      ? String(row.imageId)
      : `phenology:${row.phenologyId}`

    if (!resultGroups.has(key)) {
      resultGroups.set(key, [])
    }
    resultGroups.get(key).push(row)
  })

  return Array.from(resultGroups.entries())
    .map(([key, rows]) => {
      const sortedRows = [...rows].sort(
        (a, b) => getRowTime(b) - getRowTime(a)
      )
      const latest = sortedRows[0] || {}
      const image = images.get(String(latest.imageId)) || {}
      const stages = Array.from(new Set(
        rows
          .map(row => String(row.phenologyName || '').trim())
          .filter(Boolean)
      ))

      const originalImageUrl = image.imageUrl || ''
      const resultImageUrl =
        latest.phenologyResultImgUrl
        || image.imageResultUrl
        || ''

      return {
        imageId: latest.imageId || image.imageId,
        phenologyId: latest.phenologyId,
        imageName:
          image.imageName
          || latest.imageName
          || `物候图片_${latest.imageId || latest.phenologyId}`,
        originalImageUrl,
        resultImageUrl,
        currentStage: latest.phenologyName || '',
        cropType:
          latest.phenologyCrop
          || image.imageA
          || '冬枣',
        nextStage: latest.phenologyNextName || '',
        recognizeTime:
          latest.phenologyA
          || latest.createTime
          || latest.updateTime,
        recordCount: rows.length,
        stageCount: stages.length,
        stageSet: new Set(stages),
        parkId: latest.parkId ?? image.parkId,
        areaId: latest.areaId ?? image.plotId,
        locationId: latest.locationId ?? image.imageB,
        deviceId: latest.deviceId ?? image.deviceId,
        imageFormat:
          image.imageFormat
          || getSuffix(image.imageName)
          || getSuffix(originalImageUrl)
      }
    })
    .filter(item => {
      const keyword = String(
        queryParams.value.imageName || ''
      ).trim()

      if (!keyword) return true

      return String(item.imageName || '')
        .toLowerCase()
        .includes(keyword.toLowerCase())
    })
    .sort(
      (a, b) =>
        parseTime(b.recognizeTime)
        - parseTime(a.recognizeTime)
    )
})

const pagedImageCards = computed(() => {
  const start = (pageNum.value - 1) * pageSize.value
  return imageCards.value.slice(
    start,
    start + pageSize.value
  )
})

const totalStageCount = computed(() => {
  const stages = new Set()
  imageCards.value.forEach(item => {
    item.stageSet.forEach(stage => stages.add(stage))
  })
  return stages.size
})

const totalRecordCount = computed(() => {
  return imageCards.value.reduce(
    (sum, item) => sum + Number(item.recordCount || 0),
    0
  )
})

const rangeName = computed(() => {
  if (queryParams.value.deviceId) return '设备'
  if (queryParams.value.locationId) return '角落'
  if (queryParams.value.areaId) return '地块'
  if (queryParams.value.parkId) return '园区'
  return '全部'
})

watch(
  () => [
    imageCards.value.length,
    pageSize.value
  ],
  () => {
    const maxPage = Math.max(
      1,
      Math.ceil(imageCards.value.length / pageSize.value)
    )
    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
    }
  }
)

onMounted(async () => {
  await loadParkOptions()
  await initDefaultScope()
  await loadData()
})

async function loadData() {
  const requestId = ++loadRequestId
  loading.value = true

  try {
    const [imageRes, phenologyRes] = await Promise.all([
      listImage({
        pageNum: 1,
        pageSize: 10000,
        imageAiType: 'phenology',
        imageName:
          queryParams.value.imageName || undefined,
        parkId:
          queryParams.value.parkId || undefined,
        plotId:
          queryParams.value.areaId || undefined,
        imageB:
          queryParams.value.locationId || undefined,
        deviceId:
          queryParams.value.deviceId || undefined
      }),
      listPhenology({
        pageNum: 1,
        pageSize: 10000,
        parkId:
          queryParams.value.parkId || undefined,
        areaId:
          queryParams.value.areaId || undefined,
        locationId:
          queryParams.value.locationId || undefined,
        deviceId:
          queryParams.value.deviceId || undefined,
        phenologyCrop:
          queryParams.value.phenologyCrop || undefined,
        phenologyName:
          queryParams.value.phenologyName || undefined
      })
    ])

    if (requestId !== loadRequestId) return

    imageRows.value = getResponseRows(imageRes)
    phenologyRows.value = getResponseRows(phenologyRes)
    pageNum.value = 1

    if (!phenologyRows.value.length) {
      ElMessage.info('当前筛选条件下暂无识别成功的物候图片')
    }
  } catch (error) {
    if (requestId !== loadRequestId) return

    console.error(error)
    imageRows.value = []
    phenologyRows.value = []
    ElMessage.error('物候图片加载失败，请检查图片和物候结果接口')
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false
    }
  }
}

async function loadParkOptions() {
  try {
    const res = await listPark({
      pageNum: 1,
      pageSize: 999
    })
    parkOptions.value = getResponseRows(res)
  } catch (error) {
    console.error(error)
    ElMessage.warning('园区列表加载失败')
  }
}

async function initDefaultScope() {
  const park = parkOptions.value.find(
    item => item.parkName === DEFAULT_SCOPE.parkName
  )
  if (!park) return

  queryParams.value.parkId = park.parkId

  try {
    const areaRes = await listAreaByParkId(park.parkId)
    areaOptions.value = getResponseRows(areaRes)
    const area = areaOptions.value.find(
      item => item.areaName === DEFAULT_SCOPE.areaName
    )
    if (!area) return

    queryParams.value.areaId = area.areaId

    const locationRes = await listLocationByAreaId(area.areaId)
    locationOptions.value = getResponseRows(locationRes)
    const location = locationOptions.value.find(
      item => item.locationName === DEFAULT_SCOPE.locationName
    )
    if (!location) return

    queryParams.value.locationId = String(location.locationId)

    const deviceRes = await listDevice({
      pageNum: 1,
      pageSize: 999,
      locationId: location.locationId
    })
    deviceOptions.value = getResponseRows(deviceRes).filter(
      item => String(item.locationId || '') === String(location.locationId)
    )
    const device = deviceOptions.value.find(
      item => item.deviceName === DEFAULT_SCOPE.deviceName
        || item.deviceSn === DEFAULT_SCOPE.deviceName
    )
    if (device) queryParams.value.deviceId = device.deviceId

    monitorScopePath.value = [
      buildScopeValue('park', park.parkId),
      buildScopeValue('area', area.areaId),
      buildScopeValue('location', location.locationId),
      ...(device ? [buildScopeValue('device', device.deviceId)] : [])
    ]
  } catch (error) {
    console.error(error)
    ElMessage.warning('默认监测范围加载失败')
  }
}

async function handleMonitorScopeChange(path = []) {
  const values = Array.isArray(path) ? path : []

  queryParams.value.parkId =
    getScopeValueId(values[0]) || undefined
  queryParams.value.areaId =
    getScopeValueId(values[1]) || undefined
  queryParams.value.locationId =
    getScopeValueId(values[2]) || undefined
  queryParams.value.deviceId =
    getScopeValueId(values[3]) || undefined

  await loadData()
}

async function resetQuery() {
  queryParams.value = {
    parkId: undefined,
    areaId: undefined,
    locationId: undefined,
    deviceId: undefined,
    phenologyCrop: '',
    phenologyName: '',
    imageName: ''
  }

  areaOptions.value = []
  locationOptions.value = []
  deviceOptions.value = []
  monitorScopePath.value = []
  cardModes.value = {}
  await initDefaultScope()
  await loadData()
}

function getCardKey(item) {
  return String(item.imageId || item.phenologyId)
}

function getCardMode(item) {
  const key = getCardKey(item)
  const savedMode = cardModes.value[key]

  if (
    savedMode === 'result'
    && item.resultImageUrl
  ) {
    return 'result'
  }

  if (item.originalImageUrl) {
    return 'original'
  }

  return item.resultImageUrl ? 'result' : 'original'
}

function setCardMode(item, mode) {
  if (mode === 'original' && !item.originalImageUrl) {
    return
  }

  if (mode === 'result' && !item.resultImageUrl) {
    return
  }

  cardModes.value = {
    ...cardModes.value,
    [getCardKey(item)]: mode
  }
}

function getCardDisplayUrl(item) {
  const mode = getCardMode(item)
  const url = mode === 'result'
    ? item.resultImageUrl
    : item.originalImageUrl

  return normalizeImageUrl(
    url || item.resultImageUrl || item.originalImageUrl
  )
}

function getPhenologyPreviewList(item) {
  return Array.from(new Set([
    item.originalImageUrl,
    item.resultImageUrl
  ].filter(Boolean))).map(normalizeImageUrl)
}

function getPreviewInitialIndex(item) {
  const urls = getPhenologyPreviewList(item)
  const currentUrl = getCardDisplayUrl(item)
  const index = urls.indexOf(currentUrl)
  return index >= 0 ? index : 0
}

function buildScopeValue(type, id) {
  return `${type}:${id}`
}

function getScopeValueId(value) {
  if (
    value === undefined
    || value === null
    || value === ''
  ) {
    return undefined
  }

  return String(value).includes(':')
    ? String(value).split(':').pop()
    : value
}

function getResponseRows(response) {
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.data)) return response.data
  return []
}

function getRowTime(row) {
  return parseTime(
    row?.phenologyA
    || row?.createTime
    || row?.updateTime
  )
}

function parseTime(value) {
  if (!value) return 0
  const text = String(value)
  let time = new Date(text).getTime()

  if (Number.isNaN(time)) {
    time = new Date(text.replace(/-/g, '/')).getTime()
  }

  return Number.isNaN(time) ? 0 : time
}

function getSuffix(value) {
  if (!value) return ''

  const clean = String(value)
    .split('?')[0]
    .split('#')[0]
  const dot = clean.lastIndexOf('.')

  if (dot < 0) return ''

  const suffix = clean.slice(dot + 1)
  return suffix.length <= 8
    ? suffix.toUpperCase()
    : ''
}

function formatTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.length >= 16
    ? text.slice(0, 16)
    : text
}

function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) {
    return url
  }

  const base = import.meta.env.VITE_APP_BASE_API || ''
  return url.startsWith('/')
    ? base + url
    : `${base}/${url}`
}

function goTo(path) {
  router.push(path)
}
</script>

<style scoped>
.image-page {
  min-height: calc(100vh - 84px);
  padding: 0 18px 22px;
  background: #f5f7fa;
  color: #263834;
}

.module-tabs {
  height: 58px;
  display: flex;
  align-items: center;
  gap: 24px;
  background: #fff;
  border-bottom: 1px solid #e8edf0;
  margin: 0 -18px 18px;
  padding: 0 24px;
}

.tab {
  border: 0;
  background: transparent;
  height: 58px;
  color: #5f6f6b;
  cursor: pointer;
  font-size: 15px;
  position: relative;
  white-space: nowrap;
}

.tab.active {
  color: #12a878;
  font-weight: 700;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: #12b886;
  border-radius: 3px 3px 0 0;
}

.toolbar-spacer {
  flex: 1;
}

.filter-card {
  margin-bottom: 12px;
  border: 1px solid #edf1f4;
  border-radius: 8px;
}

.filter-card :deep(.el-card__body) {
  padding: 14px 16px 10px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(8, max-content);
  column-gap: 18px;
  row-gap: 10px;
  align-items: center;
}

.scope-cascader {
  width: 320px;
}


.filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}

.search-actions :deep(.el-form-item__content) {
  display: flex;
  gap: 10px;
}

.search-actions .el-button {
  min-width: 72px;
  margin-left: 0;
}

.image-toolbar {
  display: flex;
  align-items: center;
  min-height: 34px;
  margin-bottom: 10px;
}

.image-stat {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #6f7d79;
  font-size: 13px;
}

.image-stat span {
  padding: 4px 9px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #edf1f4;
}

.phenology-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(178px, 1fr));
  gap: 13px;
}

.phenology-photo-card {
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e8edf0;
  box-shadow: 0 4px 14px rgba(31, 45, 61, .04);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.phenology-photo-card:hover {
  transform: translateY(-2px);
  border-color: #b9ead9;
  box-shadow: 0 10px 22px rgba(31, 45, 61, .08);
}

.photo-box {
  height: 112px;
  background: #f1f5f9;
}

.photo-box .el-image {
  width: 100%;
  height: 100%;
  display: block;
}

.image-error {
  height: 112px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa6a3;
  background: linear-gradient(135deg, #f7fafc, #eef2f7);
  font-size: 13px;
}

.photo-meta {
  padding: 7px 8px 8px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: #263834;
  font-size: 13px;
  font-weight: 700;
}

.stage,
.records {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.records {
  text-align: right;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
  color: #7d8b87;
  font-size: 12px;
}

.info-row b {
  max-width: 92px;
  color: #25332f;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.time-row {
  margin-top: 4px;
  color: #8b9995;
  font-size: 12px;
  line-height: 1.2;
}

.pagination-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 10px 12px;
  color: #758480;
  background: #fff;
  border: 1px solid #edf1f4;
  border-radius: 8px;
}

@media (max-width: 1600px) {
  .filter-form {
    grid-template-columns: repeat(4, max-content);
  }
}

@media (max-width: 980px) {
  .module-tabs {
    overflow-x: auto;
  }

  .filter-form {
    display: block;
  }

    .filter-form :deep(.el-form-item) {
    display: block;
    margin-bottom: 10px;
  }

  .scope-cascader {
    width: 100%;
  }


    .phenology-photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .pagination-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   只修改视觉样式，不改动模板、方法、功能、接口及原有注释。 */
.image-page {
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

.image-page *,
.image-page *::before,
.image-page *::after {
  box-sizing: border-box;
}

.image-page .module-tabs {
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

.image-page .module-tabs .tab {
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

.image-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.image-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 17px rgba(47, 125, 92, 0.22);
}

.image-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.image-page .toolbar-spacer {
  flex: 1 1 auto;
}

.image-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(58, 88, 63, 0.08);
}

.image-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.image-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.image-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.image-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 650;
}

.image-page :deep(.el-input__wrapper),
.image-page :deep(.el-select__wrapper),
.image-page :deep(.el-cascader .el-input__wrapper),
.image-page :deep(.el-date-editor.el-input__wrapper),
.image-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.image-page :deep(.el-input__wrapper:hover),
.image-page :deep(.el-select__wrapper:hover),
.image-page :deep(.el-cascader .el-input__wrapper:hover),
.image-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.image-page :deep(.el-input__wrapper.is-focus),
.image-page :deep(.el-select__wrapper.is-focused),
.image-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.image-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.image-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.image-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.image-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.image-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.image-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.image-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.image-page :deep(.el-pagination.is-background .el-pager li.is-active),
.image-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.image-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .image-page {
    padding: 12px;
  }

  .image-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .image-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .image-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .image-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .image-page .filter-form :deep(.el-form-item__content),
  .image-page .filter-form :deep(.el-input),
  .image-page .filter-form :deep(.el-select),
  .image-page .filter-form :deep(.el-cascader),
  .image-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.image-page .image-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62px;
  padding: 12px 16px;
  margin-bottom: 16px;
  gap: 14px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.08);
}

.image-page .image-stat {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.image-page .image-stat span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  color: #526b5c;
  font-size: 12px;
  background: #f1f6ee;
  border: 1px solid #dce8da;
  border-radius: 999px;
}

.image-page .phenology-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.image-page .phenology-photo-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.image-page .phenology-photo-card:hover {
  border-color: #b8d0b9;
  box-shadow: 0 15px 28px rgba(58, 88, 63, 0.13);
  transform: translateY(-3px);
}

.image-page .photo-box {
  position: relative;
  height: 176px;
  overflow: hidden;
  background:
    linear-gradient(rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    #f4f8f1;
  background-size: 22px 22px;
}

.image-page .photo-box :deep(.el-image) {
  width: 100%;
  height: 100%;
  transition: transform 0.25s ease;
}

.image-page .phenology-photo-card:hover .photo-box :deep(.el-image) {
  transform: scale(1.025);
}

.image-page .image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #91a095;
}

.image-page .photo-meta {
  padding: 13px 14px 14px;
}

.image-page .metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.image-page .metric-row .stage,
.image-page .metric-row .records {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 800;
  border-radius: 8px;
}

.image-page .metric-row .stage {
  color: #2f6a4d;
  background: #e9f3e6;
}

.image-page .metric-row .records {
  color: #936826;
  background: #fff6e8;
}

.image-page .info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding-top: 10px;
  margin-top: 10px;
  gap: 10px;
  border-top: 1px solid #e7eee5;
}

.image-page .info-row span {
  color: #829285;
  font-size: 12px;
}

.image-page .info-row b {
  overflow: hidden;
  color: #405849;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-page .time-row {
  padding-top: 10px;
  margin-top: 10px;
  color: #829285;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  border-top: 1px solid #e7eee5;
}

.image-page .pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62px;
  padding: 10px 16px;
  margin-top: 16px;
  color: #758778;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 13px;
}

@media (max-width: 720px) {
  .image-page .image-toolbar,
  .image-page .pagination-row {
    align-items: stretch;
    flex-direction: column;
  }

  .image-page .phenology-photo-grid {
    grid-template-columns: 1fr;
  }
}
</style>


<style scoped>
.photo-mode-actions {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 8px;
  background: rgba(31, 49, 42, 0.68);
  backdrop-filter: blur(5px);
}

.photo-mode-actions button {
  height: 26px;
  padding: 0 9px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.photo-mode-actions button.active {
  color: #245f47;
  font-weight: 700;
  background: #ffffff;
}

.photo-mode-actions button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.image-name {
  display: block;
  margin-bottom: 8px;
  overflow: hidden;
  color: #344e3e;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style scoped>
/* 与物候总览统一：排版、字体、按钮和卡片 */

.image-page {

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

.image-page *,
.image-page *::before,
.image-page *::after {
  box-sizing: border-box;
  font-family: inherit;
}

.image-page button,
.image-page input,
.image-page select,
.image-page textarea {
  font: inherit;
}

/* 与总览页面一致的顶部页签 */
.image-page .module-tabs {
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

.image-page .module-tabs .tab {
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

.image-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.image-page .module-tabs .tab.active {
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--ft-green),
    var(--ft-green-mid)
  );
  box-shadow: 0 6px 14px rgba(47, 125, 92, 0.2);
}

.image-page .module-tabs .tab.active::after {
  position: absolute;
  right: 16px;
  bottom: 4px;
  left: 16px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
}

.image-page .toolbar-spacer {
  flex: 1 1 auto;
}

/* Element Plus 控件与总览页面统一 */
.image-page :deep(.el-input__wrapper),
.image-page :deep(.el-select__wrapper),
.image-page :deep(.el-cascader .el-input__wrapper),
.image-page :deep(.el-date-editor.el-input__wrapper),
.image-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.image-page :deep(.el-input__wrapper:hover),
.image-page :deep(.el-select__wrapper:hover),
.image-page :deep(.el-cascader .el-input__wrapper:hover),
.image-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.image-page :deep(.el-input__wrapper.is-focus),
.image-page :deep(.el-select__wrapper.is-focused),
.image-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.image-page :deep(.el-input__inner),
.image-page :deep(.el-select__selected-item),
.image-page :deep(.el-select__placeholder),
.image-page :deep(.el-range-input) {
  font-family: inherit;
  font-size: 13px;
}

.image-page :deep(.el-button) {
  min-height: 32px;
  margin-left: 0;
  padding: 0 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 7px;
}

.image-page :deep(.el-button--small) {
  min-height: 30px;
  height: 30px;
  padding: 0 11px;
  font-size: 12px;
}

.image-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.image-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #fff;
}

.image-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
  --el-button-active-bg-color: #397858;
  --el-button-active-border-color: #397858;
}

.image-page :deep(.el-button--success.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: #3f805f;
  --el-button-hover-bg-color: #4f8f6b;
  --el-button-hover-border-color: #4f8f6b;
  --el-button-hover-text-color: #fff;
}

.image-page :deep(.el-card) {
  border-color: var(--ft-border);
}

.image-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
  border-bottom-color: var(--ft-border-soft);
}

.image-page .card-header {
  min-height: 30px;
  font-size: 14px;
  font-weight: 700;
  line-height: 30px;
}

.image-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  font-family: inherit;
  font-size: 13px;
}

.image-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.image-page :deep(.el-pagination) {
  font-family: inherit;
  font-size: 13px;
}

.image-page :deep(.el-pagination.is-background .el-pager li.is-active),
.image-page :deep(.el-pagination .el-pager li.is-active) {
  color: #fff;
  background: var(--ft-green);
}

.image-page :deep(.el-empty__description p),
.image-page :deep(.el-loading-text) {
  color: var(--ft-muted);
  font-family: inherit;
  font-size: 13px;
}


.image-page .filter-card {
  margin-bottom: 12px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.08);
}

.image-page .filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.image-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.image-page .filter-form :deep(.el-form-item) {
  display: flex;
  align-items: center;
  margin: 0;
}

.image-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: var(--ft-text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.image-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.image-page .scope-cascader {
  width: 300px;
}

.image-page .search-actions :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-page .search-actions .el-button {
  min-width: 76px;
}

.image-page .image-toolbar {
  min-height: 34px;
  margin-bottom: 8px;
}

.image-page .image-stat {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
}

.image-page .image-stat span {
  min-height: 28px;
  padding: 4px 9px;
  line-height: 18px;
  color: var(--ft-text-secondary);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--ft-border);
  border-radius: 999px;
}

.image-page .phenology-photo-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(184px, 1fr)
  );
  gap: 12px;
  align-items: stretch;
}

.image-page .phenology-photo-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 7px 18px rgba(58, 88, 63, 0.07);
}

.image-page .phenology-photo-card:hover {
  border-color: #a9c9af;
  box-shadow: 0 10px 22px rgba(58, 88, 63, 0.11);
}

.image-page .photo-box {
  height: 120px;
  background: #edf4ea;
}

.image-page .image-error {
  height: 120px;
  font-size: 13px;
  background: linear-gradient(135deg, #f7faf5, #eaf2e7);
}

.image-page .photo-meta {
  flex: 1;
  padding: 8px 9px 9px;
}

.image-page .image-name {
  margin-bottom: 7px;
  color: #344e3e;
  font-size: 13px;
  font-weight: 700;
}

.image-page .metric-row {
  min-height: 22px;
  font-size: 13px;
}

.image-page .info-row {
  min-height: 20px;
  margin-top: 4px;
  font-size: 12px;
}

.image-page .time-row {
  margin-top: 4px;
  font-size: 12px;
}

.image-page .pagination-row {
  min-height: 46px;
  margin-top: 12px;
  padding: 7px 10px;
  color: var(--ft-text-secondary);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 7px 18px rgba(58, 88, 63, 0.06);
}

@media (max-width: 1100px) {
  .image-page .filter-form :deep(.el-form-item) {
    flex: 1 1 270px;
  }

  .image-page .filter-form :deep(.el-form-item__content),
  .image-page .filter-form :deep(.el-input),
  .image-page .filter-form :deep(.el-select),
  .image-page .filter-form :deep(.el-cascader) {
    width: 100% !important;
  }

  .image-page .search-actions {
    flex: 0 0 auto !important;
  }
}

@media (max-width: 900px) {
  .image-page {
    padding: 10px;
  }

  .image-page .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .image-page .filter-form :deep(.el-form-item) {
    width: 100%;
  }

.image-page .pagination-row {
  align-items: flex-start;
  flex-direction: column;
}
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE: remove this block to roll back the near-right-angle theme. */
.image-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.image-page .module-tabs,
.image-page .module-tabs .tab,
.image-page .module-tabs .tab.active::after,
.image-page .filter-card,
.image-page .image-toolbar,
.image-page .image-stat span,
.image-page .pest-photo-card,
.image-page .photo-box,
.image-page .image-mode-badge,
.image-page .metric-row,
.image-page .pagination-row,
.image-page :deep(.el-card),
.image-page :deep(.el-card__header),
.image-page :deep(.el-card__body),
.image-page :deep(.el-button),
.image-page :deep(.el-button-group),
.image-page :deep(.el-input__wrapper),
.image-page :deep(.el-select__wrapper),
.image-page :deep(.el-cascader .el-input__wrapper),
.image-page :deep(.el-tag),
.image-page :deep(.el-pagination button),
.image-page :deep(.el-pager li) {
  border-radius: var(--sharp-radius) !important;
}

.image-page .filter-card,
.image-page .pest-photo-card,
.image-page .pagination-row,
.image-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.image-page .filter-card:hover,
.image-page .pest-photo-card:hover,
.image-page :deep(.el-card:hover) {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.image-page .image-toolbar,
.image-page .image-stat span,
.image-page .metric-row {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.image-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.image-page :deep(.el-input__wrapper),
.image-page :deep(.el-select__wrapper),
.image-page :deep(.el-cascader .el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.image-page :deep(.el-input__wrapper.is-focus),
.image-page :deep(.el-select__wrapper.is-focused),
.image-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
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
