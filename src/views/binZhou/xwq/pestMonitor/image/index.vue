<template>
  <div class="image-page">
    <div class="module-tabs">
      <button class="tab" @click="goTo('/xwq/pestMonitor/analysis')">总览</button>
      <button class="tab active">虫情图片</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/ai')">智能分析</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/report')">历史数据与报告</button>
      <div class="toolbar-spacer"></div>
      <!-- <el-button size="small" plain @click="loadData">刷新</el-button> -->
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


        <el-form-item label="识别状态">
          <el-select v-model="queryParams.imageStatus" placeholder="全部" clearable popper-class="xwq-sharp-popper" style="width: 130px">
            <el-option label="未识别" :value="0" />
            <el-option label="识别中" :value="1" />
            <el-option label="已识别" :value="2" />
            <el-option label="识别失败" :value="3" />
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
          <el-button class="reference-action-btn reference-primary-btn" type="primary" @click="loadData">查询</el-button>
          <el-button class="reference-action-btn reference-secondary-btn" @click="resetQuery">重置</el-button>
          <el-button class="reference-action-btn reference-primary-btn" type="success" @click="handleExportOriginalImages">导出原始图片</el-button>
          <el-button class="reference-action-btn reference-primary-btn" type="success" @click="handleExportResultImages">导出结果图片</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-loading="loading">
            <div class="image-toolbar">
        <div class="image-stat">
          <span>原图 {{ originalImageCount }} 张</span>
          <span>结果图 {{ resultImageCount }} 张</span>
          <span>虫害种类 {{ totalSpeciesCount }} 种</span>
          <span>虫体总数 {{ totalHeads }} 头</span>
          <span>当前范围：{{ rangeName }}</span>
        </div>

        <div class="view-switch" aria-label="图片显示模式">
          <button type="button" :class="{ active: imageViewMode === 'original' }" @click="imageViewMode = 'original'">
            原图（{{ originalImageCount }}）
          </button>
          <button type="button" :class="{ active: imageViewMode === 'result' }" @click="imageViewMode = 'result'">
            结果图（{{ resultImageCount }}）
          </button>
        </div>
      </div>

      <el-empty v-if="!imageCards.length" description="暂无虫情图片" :image-size="120" />

            <div v-else class="pest-photo-grid">
        <div v-for="item in pagedImageCards" :key="item.imageId || item.pestId" class="pest-photo-card">
                    <div class="photo-box">
            <el-image
              :src="normalizeImageUrl(getDisplayImageUrl(item))"
              fit="cover"
              :preview-src-list="getPestPreviewList(item)"
              :initial-index="0"
              :infinite="false"
              :z-index="5000"
              preview-teleported
              hide-on-click-modal
              @click.stop
            >
              <template #error>
                <div class="image-error">
                  {{ imageViewMode === 'result' ? '暂无结果图' : '暂无原图' }}
                </div>
              </template>
            </el-image>
            <span class="image-mode-badge">{{ imageViewMode === 'original' ? '原图' : '识别图' }}</span>
          </div>

          <div class="photo-meta">
            <el-tooltip
              effect="dark"
              placement="top"
              :content="getSpeciesDetailHtml(item)"
              raw-content
            >
              <div class="metric-row">
                <span class="species">{{ item.speciesCount }}种</span>
                <span class="heads">{{ item.totalHeads }}头</span>
              </div>
            </el-tooltip>
            <div class="time-row">{{ formatTime(item.recognizeTime) }}</div>
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listPestResult } from '@/api/binZhou/xwq/pest'
import {
  listImage,
  exportOriginalImages,
  exportPestResultImages
} from '@/api/binZhou/xwq/image'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'

const router = useRouter()
const loading = ref(false)
const imageRows = ref([])
const pestRows = ref([])
const pageNum = ref(1)
const pageSize = ref(24)
const monitorScopePath = ref([])
const imageViewMode = ref('result')

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
  imageStatus: undefined,
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
        resolve(parkOptions.value.map(item => ({ value: buildScopeValue('park', item.parkId), label: item.parkName, leaf: false })))
        return
      }

      if (level === 1) {
        const res = await listAreaByParkId(parentId)
        const rows = res.data || res.rows || []
        resolve(rows.map(item => ({ value: buildScopeValue('area', item.areaId), label: item.areaName, leaf: false })))
        return
      }

      if (level === 2) {
        const res = await listLocationByAreaId(parentId)
        const rows = res.data || res.rows || []
        resolve(rows.map(item => ({ value: buildScopeValue('location', item.locationId), label: item.locationName, leaf: false })))
        return
      }

      if (level === 3) {
        const res = await listDevice({ pageNum: 1, pageSize: 999, locationId: parentId })
        const rows = (res.rows || res.data || []).filter(item => String(item.locationId || '') === String(parentId))
        resolve(rows.map(item => ({ value: buildScopeValue('device', item.deviceId), label: item.deviceName || item.deviceSn || `设备${item.deviceId}`, leaf: true })))
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


const imageCards = computed(() => {
  const pestMap = new Map()

  pestRows.value.forEach(row => {
    const imageId = row.imageId
    if (imageId === undefined || imageId === null) return

    const key = String(imageId)
    const speciesCounts = extractSpeciesCounts(row)

    if (!pestMap.has(key)) {
      pestMap.set(key, {
        pestId: row.pestId,
        pestResultImgUrl: row.pestResultImgUrl || '',
        recognizeTime: row.pestA
          || row.recognizeTime
          || row.createTime
          || row.updateTime,
        speciesCounts: new Map(),
        totalHeads: 0
      })
    }

    const result = pestMap.get(key)

    speciesCounts.forEach((count, name) => {
      result.speciesCounts.set(
        name,
        (result.speciesCounts.get(name) || 0) + Number(count || 0)
      )
    })

    result.totalHeads = Math.max(
      Number(result.totalHeads || 0),
      Number(row.pestTotalCount || 0),
      Number(row.pestCount || 0)
    )

    if (!result.pestResultImgUrl && row.pestResultImgUrl) {
      result.pestResultImgUrl = row.pestResultImgUrl
    }

    if (!result.recognizeTime) {
      result.recognizeTime = row.pestA
        || row.recognizeTime
        || row.createTime
        || row.updateTime
    }
  })

  return imageRows.value
    .map(image => {
      const result = pestMap.get(String(image.imageId)) || null
      const speciesCounts = result?.speciesCounts || new Map()
      const speciesList = Array.from(speciesCounts.entries())
        .map(([name, count]) => ({ name, count }))

      return {
        imageId: image.imageId,
        pestId: result?.pestId,
        imageName: image.imageName,
        imageUrl: image.imageUrl || '',
        // 结果图只读取 xwq_ai_image.image_result_url。
        imageResultUrl:
          image.imageResultUrl
          || image.resultImageUrl
          || image.image_result_url
          || '',
        imageStatus: image.imageStatus,
        recognizeTime: result?.recognizeTime
          || image.updateTime
          || image.createTime,
        speciesSet: new Set(speciesCounts.keys()),
        speciesList,
        speciesCount: speciesCounts.size,
        totalHeads: Number(result?.totalHeads || 0)
          || sumSpeciesCounts(speciesCounts),
        parkId: image.parkId,
        areaId: image.plotId,
        locationId: image.imageB,
        deviceId: image.deviceId
      }
    })
    .sort(
      (a, b) =>
        new Date(b.recognizeTime || 0)
        - new Date(a.recognizeTime || 0)
    )
})

const pagedImageCards = computed(() => {
  const start = (pageNum.value - 1) * pageSize.value
  return imageCards.value.slice(start, start + pageSize.value)
})

const originalImageCount = computed(() => {
  return imageCards.value.filter(item => Boolean(item.imageUrl)).length
})

const resultImageCount = computed(() => {
  return imageCards.value.filter(
    item => Boolean(item.imageResultUrl)
  ).length
})

const totalSpeciesCount = computed(() => {
  const set = new Set()
  imageCards.value.forEach(item => {
    item.speciesSet?.forEach(name => set.add(name))
  })
  return set.size
})

const totalHeads = computed(() => imageCards.value.reduce((sum, item) => sum + Number(item.totalHeads || 0), 0))

const rangeName = computed(() => {
  if (queryParams.value.deviceId) return '设备'
  if (queryParams.value.locationId) return '角落'
  if (queryParams.value.areaId) return '地块'
  if (queryParams.value.parkId) return '园区'
  return '全部'
})

onMounted(async () => {
  await loadParkOptions()
  await initDefaultScope()
  loadData()
})

async function initDefaultScope() {
  const park = parkOptions.value.find(item => item.parkName === DEFAULT_SCOPE.parkName)
  if (!park) return

  queryParams.value.parkId = park.parkId

  try {
    const areaRes = await listAreaByParkId(park.parkId)
    areaOptions.value = areaRes.data || areaRes.rows || []
    const area = areaOptions.value.find(item => item.areaName === DEFAULT_SCOPE.areaName)
    if (!area) return

    queryParams.value.areaId = area.areaId

    const locationRes = await listLocationByAreaId(area.areaId)
    locationOptions.value = locationRes.data || locationRes.rows || []
    const location = locationOptions.value.find(item => item.locationName === DEFAULT_SCOPE.locationName)
    if (!location) return

    queryParams.value.locationId = String(location.locationId)

    const deviceRes = await listDevice({ pageNum: 1, pageSize: 999, locationId: location.locationId })
    const rows = deviceRes.rows || deviceRes.data || []
    deviceOptions.value = rows.filter(item => String(item.locationId || '') === String(location.locationId))
        const device = deviceOptions.value.find(item => item.deviceName === DEFAULT_SCOPE.deviceName || item.deviceSn === DEFAULT_SCOPE.deviceName)
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

async function loadData() {
  loading.value = true

  try {
    const [imageRes, pestRes] = await Promise.all([
      listImage({
        pageNum: 1,
        pageSize: 10000,
        ...buildImageQuery()
      }),
      listPestResult({
        pageNum: 1,
        pageSize: 10000,
        ...buildPestQuery()
      })
    ])

    imageRows.value = imageRes.rows || imageRes.data || []

    const imageIdSet = new Set(
      imageRows.value
        .map(item => item.imageId)
        .filter(id => id !== undefined && id !== null)
        .map(String)
    )

    pestRows.value = (pestRes.rows || pestRes.data || [])
      .filter(item => imageIdSet.has(String(item.imageId)))

    pageNum.value = 1
  } catch (error) {
    console.error(error)
    imageRows.value = []
    pestRows.value = []
    ElMessage.error('虫情图片加载失败，请检查图片和虫情结果接口')
  } finally {
    loading.value = false
  }
}

async function loadParkOptions() {
  try {
    const res = await listPark({ pageNum: 1, pageSize: 999 })
    parkOptions.value = res.rows || res.data || []
  } catch (error) {
    console.error(error)
    ElMessage.warning('园区列表加载失败')
  }
}

function handleMonitorScopeChange(path = []) {
  const values = Array.isArray(path) ? path : []
  queryParams.value.parkId = getScopeValueId(values[0]) || undefined
  queryParams.value.areaId = getScopeValueId(values[1]) || undefined
  queryParams.value.locationId = getScopeValueId(values[2]) || undefined
  queryParams.value.deviceId = getScopeValueId(values[3]) || undefined

  if (queryParams.value.deviceId || values.length === 0) {
    loadData()
  }
}

function buildScopeValue(type, id) {
  return `${type}:${id}`
}

function getScopeValueId(value) {
  if (value === undefined || value === null || value === '') return undefined
  return String(value).includes(':') ? String(value).split(':').pop() : value
}


async function resetQuery() {
  queryParams.value = {
    parkId: undefined,
    areaId: undefined,
    locationId: undefined,
    deviceId: undefined,
    imageStatus: undefined,
    imageName: ''
  }
    areaOptions.value = []
  locationOptions.value = []
  deviceOptions.value = []
  monitorScopePath.value = []
  await initDefaultScope()
  await loadData()
}

function buildImageQuery() {
  const query = {
    imageAiType: 'pest',
    imageStatus: queryParams.value.imageStatus ?? undefined,
    imageName: queryParams.value.imageName || undefined
  }

  if (queryParams.value.deviceId) {
    query.deviceId = queryParams.value.deviceId
  } else if (queryParams.value.locationId) {
    query.imageB = queryParams.value.locationId
  } else if (queryParams.value.areaId) {
    query.plotId = queryParams.value.areaId
  } else if (queryParams.value.parkId) {
    query.parkId = queryParams.value.parkId
  }

  return query
}

function buildPestQuery() {
  const query = {}

  if (queryParams.value.deviceId) {
    query.deviceId = queryParams.value.deviceId
  } else if (queryParams.value.locationId) {
    query.locationId = queryParams.value.locationId
  } else if (queryParams.value.areaId) {
    query.areaId = queryParams.value.areaId
  } else if (queryParams.value.parkId) {
    query.parkId = queryParams.value.parkId
  }

  return query
}

function buildExportQuery() {
  return buildImageQuery()
}

async function handleExportOriginalImages() {
  if (!originalImageCount.value) {
    ElMessage.warning('暂无原始虫情图片可导出')
    return
  }

  try {
    const blob = await exportOriginalImages(buildExportQuery())
    downloadBlob(blob, `原始虫情图片_${Date.now()}.zip`)
    ElMessage.success('原始虫情图片导出成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('原始虫情图片导出失败')
  }
}

async function handleExportResultImages() {
  if (!resultImageCount.value) {
    ElMessage.warning('当前查询结果中暂无虫情结果图')
    return
  }

  try {
    const blob = await exportPestResultImages(buildExportQuery())
    downloadBlob(blob, `虫情识别结果图_${Date.now()}.zip`)
    ElMessage.success('虫情识别结果图导出成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('虫情识别结果图导出失败')
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function matchImageName(row) {
  const keyword = queryParams.value.imageName
  if (!keyword) return true
  return String(
    row.imageName
    || row.imageResultUrl
    || row.imageUrl
    || ''
  ).includes(keyword)
}

function matchStatus(row) {
  if (queryParams.value.imageStatus === undefined || queryParams.value.imageStatus === null || queryParams.value.imageStatus === '') {
    return true
  }

  const status = row.imageStatus ?? row.recordStatus
  return Number(status) === Number(queryParams.value.imageStatus)
}

function extractSpeciesCounts(row) {
  const counts = new Map()

  // CODEX-SPECIES-DETAILS-FIX: prefer the model's full-species summary over the primary pest.
  if (row.bboxJson) {
    try {
      const parsed = typeof row.bboxJson === 'string'
        ? JSON.parse(row.bboxJson)
        : row.bboxJson
      const details = Array.isArray(parsed?.pestDetails)
        ? parsed.pestDetails
        : Array.isArray(parsed?.details)
          ? parsed.details
          : []

      details.forEach(item => {
        const name = item?.name || item?.label || item?.pestName
        const count = Number(item?.count || 0)
        if (name && count > 0) addSpeciesCount(counts, name, count)
      })

      if (!counts.size) {
        const boxes = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.boxes)
            ? parsed.boxes
            : Array.isArray(parsed?.data)
              ? parsed.data
              : []

        boxes.forEach(box => {
          const name = box?.label || box?.name || box?.className || box?.pestName
          if (name) addSpeciesCount(counts, name, Number(box?.count || 1))
        })
      }
    } catch (error) {
      // bboxJson 不一定是标准 JSON，忽略后继续用 pestResult 兜底
    }
  }

  if (!counts.size && row.pestResult) {
    const text = String(row.pestResult)
    const matches = Array.from(text.matchAll(/([^，,；;、\s:：-]+)[：:\-]?(\d+)头/g))
    matches.forEach(match => {
      const name = match[1]?.replace('识别到', '').trim()
      if (name && name.length <= 12) addSpeciesCount(counts, name, Number(match[2] || 1))
    })

    if (!counts.size) {
      text.split(/[，,；;、\s]+/).forEach(part => {
        const name = part.replace(/[0-9]+头/g, '').replace(/[:：\-].*$/g, '').replace('识别到', '').trim()
        if (name && name.length <= 12) addSpeciesCount(counts, name, 1)
      })
    }
  }

  if (!counts.size && row.pestName) {
    const currentCount = Number(row.pestCount || row.pestTotalCount || 0)
    addSpeciesCount(counts, row.pestName, currentCount || 1)
  }

  return counts
}

function addSpeciesCount(map, name, count) {
  const key = String(name || '').trim()
  if (!key) return
  map.set(key, (map.get(key) || 0) + Math.max(0, Number(count || 0)))
}

function sumSpeciesCounts(counts) {
  return Array.from(counts.values()).reduce((sum, value) => sum + Number(value || 0), 0)
}

function getDisplayImageUrl(item) {
  if (imageViewMode.value === 'result') {
    // 结果图固定读取 xwq_ai_image.image_result_url。
    return item.imageResultUrl || ''
  }
  return item.imageUrl || ''
}

function getPestPreviewList(item) {
  const url = normalizeImageUrl(getDisplayImageUrl(item))
  return url ? [url] : []
}

function getSpeciesDetailHtml(item) {
  const list = item.speciesList?.length
    ? item.speciesList
    : [{ name: '暂无识别结果', count: 0 }]

  return list
    .map(species => `${escapeHtml(species.name)}：${Number(species.count || 0)}头`)
    .join('<br />')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.length >= 16 ? text.slice(0, 16) : text
}

function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url
  const base = import.meta.env.VITE_APP_BASE_API || ''
  return url.startsWith('/') ? base + url : `${base}/${url}`
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
  grid-template-columns: repeat(7, max-content);
  column-gap: 20px;
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

.search-actions .el-button:nth-last-child(-n + 2) {
  min-width: 108px;
}

.image-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.view-switch {
  flex-shrink: 0;
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid #dfe9e5;
  border-radius: 999px;
  background: #fff;
}

.view-switch button {
  height: 28px;
  padding: 0 14px;
  color: #71807a;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.view-switch button.active {
  color: #fff;
  font-weight: 700;
  background: #12b886;
}

.pest-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(178px, 1fr));
  gap: 13px;
}

.pest-photo-card {
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e8edf0;
  box-shadow: 0 4px 14px rgba(31, 45, 61, .04);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.pest-photo-card:hover {
  transform: translateY(-2px);
  border-color: #b9ead9;
  box-shadow: 0 10px 22px rgba(31, 45, 61, .08);
}

.photo-box {
  position: relative;
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

.image-mode-badge {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 2px 7px;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  border-radius: 999px;
  background: rgba(18, 184, 134, 0.88);
  backdrop-filter: blur(4px);
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
  cursor: help;
}

.species,
.heads {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.heads {
  text-align: right;
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

@media (max-width: 1500px) {
  .filter-form {
    grid-template-columns: repeat(4, max-content);
  }
}

@media (max-width: 980px) {
    .module-tabs {
    overflow-x: auto;
  }

  .image-toolbar {
    align-items: flex-start;
    flex-direction: column;
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


    .pest-photo-grid {
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
   仅覆盖视觉样式，不改动 template、script、方法、功能或原有注释。 */
.image-page {
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

.image-page *,
.image-page *::before,
.image-page *::after {
  box-sizing: border-box;
}

.image-page .module-tabs {
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

.image-page .module-tabs .tab {
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

.image-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.image-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 16px rgba(47, 125, 92, 0.20);
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
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.07);
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
  font-weight: 600;
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

.image-page :deep(.el-pagination.is-background .el-pager li.is-active),
.image-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
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

.image-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
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
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.07);
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

.image-page .view-switch {
  display: flex;
  flex: 0 0 auto;
  padding: 4px;
  gap: 4px;
  background: #eaf1e7;
  border: 1px solid #d6e3d4;
  border-radius: 10px;
}

.image-page .view-switch button {
  min-width: 72px;
  height: 32px;
  color: #607565;
  font-weight: 600;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.image-page .view-switch button.active {
  color: #ffffff;
  background: var(--ft-green);
  box-shadow: 0 6px 12px rgba(47, 125, 92, 0.17);
}

.image-page .pest-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.image-page .pest-photo-card {
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

.image-page .pest-photo-card:hover {
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

.image-page .pest-photo-card:hover .photo-box :deep(.el-image) {
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

.image-page .image-mode-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 9px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  background: rgba(47, 125, 92, 0.88);
  border: 1px solid rgba(255,255,255,.5);
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(34, 79, 55, 0.18);
  backdrop-filter: blur(5px);
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

.image-page .metric-row .species,
.image-page .metric-row .heads {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 800;
  border-radius: 8px;
}

.image-page .metric-row .species {
  color: #2f6a4d;
  background: #e9f3e6;
}

.image-page .metric-row .heads {
  color: #936826;
  background: #fff6e8;
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
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 13px;
}

@media (max-width: 720px) {
  .image-page .image-toolbar,
  .image-page .pagination-row {
    align-items: stretch;
    flex-direction: column;
  }

  .image-page .view-switch {
    align-self: flex-start;
  }

    .image-page .pest-photo-grid {
    grid-template-columns: 1fr;
    }
}

.image-page :deep(.el-button),
.image-page button:not(.tab):not(.el-dialog__headerbtn) {
  min-height: 34px;
  padding: 0 15px;
  color: #526b5c;
  font-weight: 700;
  line-height: 1;
  background: #f8fbf5;
  border: 1px solid #cddfca;
  border-radius: 9px;
  box-shadow: 0 3px 8px rgba(58, 88, 63, 0.06);
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.image-page :deep(.el-button:hover),
.image-page button:not(.tab):not(.el-dialog__headerbtn):hover {
  color: var(--ft-green);
  background: #eef6ea;
  border-color: #9fbea4;
  box-shadow: 0 6px 14px rgba(47, 125, 92, 0.12);
  transform: translateY(-1px);
}

.image-page :deep(.el-button--primary),
.image-page :deep(.el-button--success),
.image-page :deep(.el-button--warning),
.image-page :deep(.el-button--danger),
.image-page :deep(.el-button--primary:hover),
.image-page :deep(.el-button--success:hover),
.image-page :deep(.el-button--warning:hover),
.image-page :deep(.el-button--danger:hover) {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  border-color: transparent;
  box-shadow: 0 7px 16px rgba(47, 125, 92, 0.20);
}

.image-page :deep(.el-button.is-plain),
.image-page :deep(.el-button--primary.is-plain),
.image-page :deep(.el-button--success.is-plain),
.image-page :deep(.el-button--warning.is-plain),
.image-page :deep(.el-button--danger.is-plain) {
  color: var(--ft-green);
  background: #f1f7ef;
  border-color: #b9d1bb;
  box-shadow: none;
}

.image-page :deep(.el-button.is-disabled),
.image-page :deep(.el-button.is-disabled:hover),
.image-page button:disabled,
.image-page button:disabled:hover {
  color: #9aa89d;
  background: #eef2eb;
  border-color: #dce7da;
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}

.image-page .button-row :deep(.el-button),
.image-page .header-actions :deep(.el-button),
.image-page .model-actions :deep(.el-button),
.image-page .table-actions :deep(.el-button),
.image-page .search-actions :deep(.el-button) {
  min-width: 88px;
}

.image-page,
.image-page *,
.image-page *::before,
.image-page *::after,
.image-page :deep(*) {
  font-family: inherit !important;
}
</style>

<style scoped>
.image-page {
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

.image-page,
.image-page *,
.image-page *::before,
.image-page *::after,
.image-page :deep(*) {
  font-family: inherit !important;
}

.image-page .module-tabs {
  min-height: 48px;
  height: auto;
  margin: 0 0 10px;
  padding: 4px 6px;
  gap: 4px;
  border-radius: 10px;
}

.image-page .module-tabs .tab {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  font-size: 14px !important;
  font-weight: 600;
  line-height: 38px;
  border-radius: 8px;
}

.image-page .filter-card {
  margin-bottom: 10px;
  border-radius: 10px;
}

.image-page .filter-card :deep(.el-card__body) {
  padding: 10px 12px 2px;
}

.image-page .filter-form {
  display: flex;
  align-items: flex-end;
  width: 100%;
  flex-wrap: wrap;
  gap: 0 14px;
}

.image-page .filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 8px;
}

.image-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: var(--unified-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 32px;
}

.image-page .filter-form .search-actions {
  margin-left: auto;
}

.image-page .button-row,
.image-page .search-actions :deep(.el-form-item__content),
.image-page .header-actions,
.image-page .model-actions,
.image-page .table-actions,
.image-page .predict-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.image-page .card-header,
.image-page .section-title,
.image-page .chart-toolbar,
.image-page .influence-head,
.image-page .image-toolbar,
.image-page .pagination-row,
.image-page .predict-toolbar,
.image-page .stat-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.image-page :deep(.el-card__header) {
  padding: 9px 12px;
}

.image-page .card-header {
  min-height: 32px;
  padding: 0;
  font-size: 15px;
  font-weight: 700;
}

.image-page .section-title {
  min-height: 32px;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
}

.image-page :deep(.el-input__wrapper),
.image-page :deep(.el-select__wrapper),
.image-page :deep(.el-date-editor.el-input__wrapper),
.image-page :deep(.el-cascader .el-input__wrapper) {
  min-height: 32px;
  border-radius: 8px;
}

.image-page :deep(.el-button) {
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

.image-page :deep(.el-button--primary:not(.is-plain)),
.image-page :deep(.el-button--success:not(.is-plain)) {
  color: #fff !important;
  background: var(--unified-green) !important;
  border-color: var(--unified-green) !important;
}

.image-page :deep(.el-button--primary:not(.is-plain):hover),
.image-page :deep(.el-button--success:not(.is-plain):hover) {
  background: var(--unified-green-hover) !important;
  border-color: var(--unified-green-hover) !important;
}

.image-page :deep(.el-button.is-plain),
.image-page :deep(.el-button--primary.is-plain),
.image-page :deep(.el-button--success.is-plain) {
  color: var(--unified-green) !important;
  background: #fff !important;
  border-color: #abc9b3 !important;
}

.image-page :deep(.el-button.is-plain:hover),
.image-page :deep(.el-button--primary.is-plain:hover),
.image-page :deep(.el-button--success.is-plain:hover) {
  color: var(--unified-green-hover) !important;
  background: var(--unified-green-soft) !important;
  border-color: #89b397 !important;
}

.image-page :deep(.el-button--danger:not(.is-plain)) {
  color: #fff !important;
  background: #c45656 !important;
  border-color: #c45656 !important;
}

.image-page :deep(.el-button--danger.is-plain) {
  color: #b94a4a !important;
  background: #fff8f7 !important;
  border-color: #e7b5b2 !important;
}

.image-page :deep(.el-button.is-disabled),
.image-page :deep(.el-button.is-disabled:hover) {
  color: #9aa89d !important;
  background: #f0f3ef !important;
  border-color: #dce5db !important;
  box-shadow: none !important;
}

.image-page .workspace-row,
.image-page .overview-grid,
.image-page .main-grid {
  margin-bottom: 10px;
  gap: 10px;
}

.image-page .white-card,
.image-page .panel-card,
.image-page .table-card,
.image-page .report-summary,
.image-page .preview-card,
.image-page .pest-photo-card {
  border-radius: 10px;
}

.image-page .image-toolbar,
.image-page .pagination-row {
  min-height: 48px;
  padding: 8px 12px;
}

.image-page .image-toolbar {
  margin-bottom: 10px;
}

.image-page .pagination-row {
  margin-top: 10px;
}

.image-page .pest-photo-grid {
  gap: 10px;
}

.image-page :deep(.el-table) {
  font-size: 13px;
}

.image-page :deep(.el-table th.el-table__cell),
.image-page :deep(.el-table td.el-table__cell) {
  padding: 7px 0;
}

/* 与物候分析页保持一致的查询、重置按钮。 */
.image-page .search-actions :deep(.el-button:nth-child(1)) {
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

.image-page .search-actions :deep(.el-button:nth-child(1):hover) {
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.image-page .search-actions :deep(.el-button:nth-child(2)) {
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

.image-page .search-actions :deep(.el-button:nth-child(2):hover) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8eb49a !important;
}

/* 与物候趋势图一致的滑动分段按钮。 */
.image-page .series-actions,
.image-page .sub-tabs,
.image-page .view-switch,
.image-page .model-actions :deep(.el-button-group) {
  display: flex;
  padding: 4px;
  gap: 4px;
  background: #edf3ea;
  border: 0;
  border-radius: 10px;
  box-shadow: none;
}

.image-page .series-actions button,
.image-page .sub-tabs button,
.image-page .view-switch button,
.image-page .model-actions :deep(.el-button-group > .el-button) {
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

.image-page .series-actions button:hover,
.image-page .sub-tabs button:hover,
.image-page .view-switch button:hover,
.image-page .model-actions :deep(.el-button-group > .el-button:hover) {
  color: #2f7d5c !important;
  background: #f7faf6 !important;
}

.image-page .series-actions button.active,
.image-page .sub-tabs button.active,
.image-page .view-switch button.active,
.image-page .model-actions :deep(.el-button-group > .el-button--primary) {
  color: #fff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
  box-shadow: 0 1px 4px rgba(24, 98, 70, .12) !important;
}

@media (max-width: 900px) {
  .image-page {
    padding: 10px;
  }

  .image-page .filter-form .search-actions {
    width: 100%;
    margin-left: 0;
  }

  .image-page .search-actions :deep(.el-form-item__content),
  .image-page .button-row {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .image-page .card-header,
  .image-page .section-title,
  .image-page .chart-toolbar,
  .image-page .influence-head,
  .image-page .image-toolbar,
  .image-page .pagination-row {
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

.image-page {
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

.image-page,
.image-page *,
.image-page *::before,
.image-page *::after,
.image-page :deep(*) {
  box-sizing: border-box;
  font-family: inherit !important;
}

/* 页面公共紧凑排版 */
.image-page .module-tabs {
  margin-bottom: 12px;
}

.image-page .filter-card {
  margin-bottom: 12px;
  border-radius: 12px;
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
  margin: 0;
}

.image-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: #526b5c;
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.image-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.image-page :deep(.el-input__wrapper),
.image-page :deep(.el-select__wrapper),
.image-page :deep(.el-cascader .el-input__wrapper),
.image-page :deep(.el-date-editor.el-input__wrapper),
.image-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  border-radius: 8px;
}

.image-page .button-row,
.image-page .search-actions :deep(.el-form-item__content),
.image-page .header-actions,
.image-page .model-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* 所有指定按钮统一尺寸 */
.image-page :deep(.reference-action-btn) {
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
.image-page :deep(.reference-primary-btn),
.image-page :deep(.reference-primary-btn.is-plain),
.image-page :deep(.reference-primary-btn.el-button--success),
.image-page :deep(.reference-primary-btn.el-button--danger) {
  color: #ffffff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
}

.image-page :deep(.reference-primary-btn:hover),
.image-page :deep(.reference-primary-btn:focus) {
  color: #ffffff !important;
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.image-page :deep(.reference-primary-btn:active) {
  color: #ffffff !important;
  background: #245f47 !important;
  border-color: #245f47 !important;
}

/* 次操作：与“重置”按钮一致 */
.image-page :deep(.reference-secondary-btn),
.image-page :deep(.reference-secondary-btn.is-plain),
.image-page :deep(.reference-secondary-btn.el-button--success),
.image-page :deep(.reference-secondary-btn.el-button--danger) {
  color: #606266 !important;
  background: #ffffff !important;
  border-color: #dcdfe6 !important;
}

.image-page :deep(.reference-secondary-btn:hover),
.image-page :deep(.reference-secondary-btn:focus) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8bb59a !important;
}

.image-page :deep(.reference-secondary-btn:active) {
  color: #245f47 !important;
  background: #e8f2e7 !important;
  border-color: #6fa181 !important;
}

/* 禁用状态统一，不再保留红色、蓝色或 success 差异 */
.image-page :deep(.reference-action-btn.is-disabled),
.image-page :deep(.reference-action-btn.is-disabled:hover),
.image-page :deep(.reference-action-btn.is-disabled:focus) {
  color: #a8abb2 !important;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

/* 卡片、表格和标题字体统一 */
.image-page :deep(.el-card) {
  border-radius: 12px;
}

.image-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
}

.image-page .card-header,
.image-page .section-title {
  color: #24352d;
  font-size: 15px;
  font-weight: 700;
}

.image-page :deep(.el-table) {
  font-family: inherit;
  font-size: 13px;
}

.image-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}


.image-page .search-actions {
  margin-left: auto;
}

.image-page .image-toolbar {
  margin-bottom: 8px;
}

.image-page .pest-photo-grid {
  gap: 12px;
}

.image-page .pest-photo-card,
.image-page .pagination-row {
  border-radius: 12px;
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

  .image-page .button-row,
  .image-page .search-actions :deep(.el-form-item__content),
  .image-page .header-actions,
  .image-page .model-actions {
    justify-content: flex-start;
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
.image-page .view-switch,
.image-page .view-switch button,
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
.image-page :deep(.el-progress-bar__outer),
.image-page :deep(.el-progress-bar__inner),
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
.image-page .metric-row,
.image-page .view-switch button {
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

.image-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.image-page :deep(.el-progress-bar__inner) {
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
