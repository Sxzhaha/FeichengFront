<template>
  <div class="app-container geojson-map-page">
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-title">
          <span class="title">GeoJSON 地图展示</span>
          <span class="subtitle">天地图底图与本地地块存档叠加</span>
        </div>

        <div class="toolbar-actions">
          <el-button type="primary" @click="openLayerDrawer">
            选择区域 / 存档
          </el-button>
          <el-button :disabled="!hasGeojsonLayer" type="primary" @click="fitCurrentLayer">
            定位区域
          </el-button>
          <el-button @click="toggleFullscreen">
            {{ isFullscreen ? '退出全屏' : '全屏展示' }}
          </el-button>
        </div>
      </div>
    </el-card>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" class="map-alert" />

    <el-card class="map-card" shadow="never">
      <div ref="mapShellRef" v-loading="mapLoading" class="map-fullscreen-shell"
        :class="{ 'is-fullscreen': isFullscreen }">
        <div ref="mapContainer" class="map-container"></div>
      </div>

      <div v-if="false" class="map-summary">
        <span>当前存档：{{ currentArchive?.archiveName || '未选择' }}</span>
        <span>版本：{{ currentArchive?.versionNo || '-' }}</span>
        <span>坐标系：{{ currentArchive?.coordinateSys || '-' }}</span>
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="选择地图区域" direction="ltr" size="360px" append-to-body
      class="map-layer-drawer" @opened="handleDrawerOpened">
      <div class="drawer-section">
        <div class="drawer-section-title">
          <span>区域</span>
          <el-button link type="primary" :loading="datasetLoading || archiveLoading" @click="refreshDrawerData">
            刷新
          </el-button>
        </div>
        <el-empty v-if="!datasetList.length" description="暂无可用区域" :image-size="80" />
        <div v-else class="dataset-list">
          <button v-for="item in datasetList" :key="item.datasetId" type="button" class="dataset-item"
            :class="{ active: String(item.datasetId) === String(selectedDatasetId) }"
            @click="selectDataset(item.datasetId)">
            <span class="dataset-name">{{ item.datasetName }}</span>
            <span class="dataset-desc">{{ item.description || '暂无说明' }}</span>
          </button>
        </div>
      </div>

      <div class="drawer-section">
        <div class="drawer-section-title">
          <span>存档</span>
          <span class="archive-count">{{ filteredArchiveList.length }} 个</span>
        </div>
        <el-empty v-if="selectedDatasetId && !filteredArchiveList.length" description="该区域暂无存档" :image-size="80" />
        <el-empty v-else-if="!selectedDatasetId" description="请先选择区域" :image-size="80" />
        <div v-else class="archive-list">
          <button v-for="item in filteredArchiveList" :key="item.archiveId" type="button" class="archive-item"
            :class="{ active: String(item.archiveId) === String(selectedArchiveId) }"
            @click="selectArchive(item.archiveId)">
            <span class="archive-name">{{ archiveLabel(item) }}</span>
            <span v-if="item.isDefault === '1'" class="archive-meta">默认存档</span>
          </button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="GeojsonMap">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getArchiveGeojson, listArchive } from '@/api/binZhou/dxx/archive'
import { listDataset } from '@/api/binZhou/dxx/dataset'

const mapContainer = ref()
const mapShellRef = ref()
const datasetList = ref([])
const archiveList = ref([])
const selectedDatasetId = ref()
const selectedArchiveId = ref()
const drawerVisible = ref(false)
const datasetLoading = ref(false)
const archiveLoading = ref(false)
const mapLoading = ref(false)
const errorMessage = ref('')
const renderedFeatureCount = ref(0)
const hasGeojsonLayer = ref(false)
const isFullscreen = ref(false)

let mapInstance
let geojsonLayer

const levelColors = {
  1: '#e67a7a',
  2: '#ffebb7',
  3: '#fff4e1',
  4: '#9ddcdc',
  5: '#e67a7a',
  6: '#ffebb7',
  default: '#9ddcdc'
}

const currentArchive = computed(() =>
  archiveList.value.find(item => String(item.archiveId) === String(selectedArchiveId.value))
)

const filteredArchiveList = computed(() => {
  if (!selectedDatasetId.value) return []
  return archiveList.value.filter(item => String(item.datasetId) === String(selectedDatasetId.value))
})

function archiveLabel(item) {
  return item.versionNo
    ? `${item.archiveName}（${item.versionNo}）`
    : item.archiveName
}

async function initMap() {
  const token = import.meta.env.VITE_TDT_TOKEN

  if (!token) {
    throw new Error('未配置 VITE_TDT_TOKEN')
  }

  mapInstance = L.map(mapContainer.value, {
    center: [36.1, 116.75],
    zoom: 10,
    preferCanvas: true,
    zoomControl: false
  })

  L.control.zoom({ position: 'topright' }).addTo(mapInstance)

  const tileOptions = {
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    minZoom: 1,
    maxZoom: 18,
    attribution: '&copy; 天地图'
  }

  const imageryGroup = L.layerGroup([
    L.tileLayer(
      `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${token}`,
      tileOptions
    ),
    L.tileLayer(
      `https://t{s}.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${token}`,
      tileOptions
    )
  ]).addTo(mapInstance)

  const vectorGroup = L.layerGroup([
    L.tileLayer(
      `https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${token}`,
      tileOptions
    ),
    L.tileLayer(
      `https://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${token}`,
      tileOptions
    )
  ])

  L.control.layers(
    {
      天地图影像: imageryGroup,
      天地图矢量: vectorGroup
    },
    null,
    { position: 'topright' }
  ).addTo(mapInstance)
}

async function loadDatasetList() {
  datasetLoading.value = true
  errorMessage.value = ''

  try {
    const response = await listDataset({
      pageNum: 1,
      pageSize: 1000,
      status: '0'
    })
    datasetList.value = sortDatasets(response.rows || [])
  } catch (error) {
    errorMessage.value = error?.message || '地图区域列表加载失败'
  } finally {
    datasetLoading.value = false
  }
}

async function loadArchiveList(autoSelect = true) {
  archiveLoading.value = true
  errorMessage.value = ''

  try {
    const response = await listArchive({
      pageNum: 1,
      pageSize: 1000,
      status: '0'
    })

    archiveList.value = sortArchivesByDataset(response.rows || [])

    if (!archiveList.value.length) {
      selectedArchiveId.value = undefined
      removeGeojsonLayer()
      errorMessage.value = '暂无可用的 GeoJSON 存档'
      return
    }

    if (autoSelect) {
      selectInitialArchive()
      await loadSelectedArchive()
    }
  } catch (error) {
    errorMessage.value = error?.message || 'GeoJSON 存档列表加载失败'
  } finally {
    archiveLoading.value = false
  }
}

async function refreshDrawerData() {
  await loadDatasetList()
  await loadArchiveList(false)
  if (!selectedDatasetId.value || !datasetList.value.some(item => String(item.datasetId) === String(selectedDatasetId.value))) {
    const targetDataset = getFirstDatasetWithArchive() || datasetList.value[0]
    selectedDatasetId.value = targetDataset?.datasetId
    selectedArchiveId.value = pickArchiveForDataset(selectedDatasetId.value)?.archiveId
  }
}

async function openLayerDrawer() {
  drawerVisible.value = true
  if (!datasetList.value.length || !archiveList.value.length) {
    await refreshDrawerData()
  }
}

function handleDrawerOpened() {
  nextTick(() => {
    mapInstance?.invalidateSize()
  })
}

function selectInitialArchive() {
  const selectedStillExists = archiveList.value.some(
    item => String(item.archiveId) === String(selectedArchiveId.value)
  )
  const targetDataset = selectedStillExists
    ? datasetList.value.find(item => String(item.datasetId) === String(currentArchive.value?.datasetId))
    : getFirstDatasetWithArchive()
  const targetArchive = selectedStillExists
    ? currentArchive.value
    : pickArchiveForDataset(targetDataset?.datasetId)

  selectedDatasetId.value = targetArchive?.datasetId
  selectedArchiveId.value = targetArchive?.archiveId
}

function selectDataset(datasetId) {
  selectedDatasetId.value = datasetId
  const targetArchive = pickArchiveForDataset(datasetId)
  selectedArchiveId.value = targetArchive?.archiveId
  if (targetArchive) {
    loadSelectedArchive()
  } else {
    removeGeojsonLayer()
  }
}

function selectArchive(archiveId) {
  selectedArchiveId.value = archiveId
  loadSelectedArchive()
  drawerVisible.value = false
}

function sortDatasets(items) {
  return [...items].sort((a, b) => {
    const sortA = Number(a.sortNum ?? 0)
    const sortB = Number(b.sortNum ?? 0)
    if (sortA !== sortB) return sortA - sortB
    return Number(a.datasetId ?? 0) - Number(b.datasetId ?? 0)
  })
}

function sortArchivesByDataset(items) {
  return [...items].sort((a, b) => {
    const datasetA = datasetSortIndex(a.datasetId)
    const datasetB = datasetSortIndex(b.datasetId)
    if (datasetA !== datasetB) return datasetA - datasetB
    if (String(a.isDefault) !== String(b.isDefault)) {
      return String(a.isDefault) === '1' ? -1 : 1
    }
    return Number(b.archiveId ?? 0) - Number(a.archiveId ?? 0)
  })
}

function datasetSortIndex(datasetId) {
  const index = datasetList.value.findIndex(item => String(item.datasetId) === String(datasetId))
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function getFirstDatasetWithArchive() {
  return datasetList.value.find(dataset =>
    archiveList.value.some(archive => String(archive.datasetId) === String(dataset.datasetId))
  )
}

function pickArchiveForDataset(datasetId) {
  if (!datasetId) return null
  const archives = archiveList.value.filter(item => String(item.datasetId) === String(datasetId))
  return archives.find(item => item.isDefault === '1') || archives[0] || null
}

async function loadSelectedArchive() {
  const archive = currentArchive.value
  if (!archive || !mapInstance) return

  if (!archive.filePath) {
    errorMessage.value = '当前存档没有关联 GeoJSON 文件路径'
    return
  }

  mapLoading.value = true
  errorMessage.value = ''

  try {
    const geojson = await getArchiveGeojson(archive.filePath)
    renderGeojson(geojson, archive)
  } catch (error) {
    removeGeojsonLayer()
    errorMessage.value = `GeoJSON 文件加载失败：${archive.filePath}`
  } finally {
    mapLoading.value = false
  }
}

function renderGeojson(geojson, archive) {
  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('文件不是有效的 GeoJSON FeatureCollection')
  }

  removeGeojsonLayer()
  ensureGeojsonLevels(geojson)
  const drawableGeojson = sortGeojsonFeaturesForInteraction(geojson)

  geojsonLayer = L.geoJSON(drawableGeojson, {
    renderer: L.canvas({ padding: 0.5 }),
    style: feature => getFeatureStyle(feature, archive),
    onEachFeature(feature, layer) {
      const properties = feature.properties || {}

      layer.bindPopup(
        createPopupContent(properties, archive),
        { minWidth: 260, maxWidth: 420 }
      )

      layer.on({
        mouseover() {
          const hoverStyle = getFeatureStyle(feature, archive)
          layer.setStyle({
            ...hoverStyle,
            stroke: true,
            opacity: 1,
            weight: 4,
            fillOpacity: 0
          })
        },
        mouseout() {
          geojsonLayer?.resetStyle(layer)
        }
      })
    }
  }).addTo(mapInstance)

  hasGeojsonLayer.value = true
  renderedFeatureCount.value = geojson.features.length
  fitCurrentLayer(archive, geojson)
}

function getFeatureStyle(feature, archive) {
  const color = getLevelColor(feature?.properties?.__level, archive)
  return {
    color,
    fillColor: 'transparent',
    fillOpacity: 0,
    opacity: 1,
    stroke: true,
    weight: 2.5,
    smoothFactor: 1.5
  }
}

function sortGeojsonFeaturesForInteraction(geojson) {
  return {
    ...geojson,
    features: [...(geojson.features || [])].sort((a, b) => getFeatureArea(b) - getFeatureArea(a))
  }
}

function getFeatureArea(feature) {
  return getFeatureOuterRings(feature).reduce((sum, ring) => sum + ringArea(ring), 0)
}

function getLevelColor(level, archive) {
  const styleConfig = parseStyleJson(archive?.styleJson)
  const colors = styleConfig.levelColors || levelColors
  const key = level === undefined || level === null || level === '' ? 1 : level
  return colors[key] || colors[String(key)] || colorByHash(key, colors.default || archive?.previewColor || '#e67a7a')
}

function parseStyleJson(styleJson) {
  if (!styleJson) return {}
  try {
    return JSON.parse(styleJson)
  } catch {
    return {}
  }
}

function colorByHash(value, defaultColor) {
  const text = String(value)
  if (!text || text === '1') return levelColors[1]
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  const palette = Object.keys(levelColors)
    .filter(key => key !== 'default')
    .map(key => levelColors[key])
  return palette[hash % palette.length] || defaultColor
}

function ensureGeojsonLevels(geojson) {
  const features = geojson.features || []
  const hasLevel = features.some(feature => feature?.properties?.__level !== undefined)
  if (hasLevel) return

  const polygonInfos = features.map((feature, index) => {
    const rings = getFeatureOuterRings(feature)
    const bounds = getFeatureBounds(feature)
    const area = rings.reduce((sum, ring) => sum + ringArea(ring), 0)
    return { feature, index, rings, bounds, area }
  })

  polygonInfos.forEach(child => {
    let parentCount = 0
    if (child.rings.length && child.bounds) {
      polygonInfos.forEach(parent => {
        if (parent.index === child.index || !parent.rings.length || !parent.bounds) return
        if (parent.area <= child.area) return
        if (!boundsContains(parent.bounds, child.bounds)) return
        if (featureContains(parent, child)) parentCount += 1
      })
    }
    const level = parentCount + 1
    child.feature.properties = {
      ...(child.feature.properties || {}),
      __level: level,
      __levelName: `第 ${level} 层`
    }
  })
}

function getFeatureOuterRings(feature) {
  const geometry = feature?.geometry
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates?.[0]].filter(Boolean)
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map(polygon => polygon?.[0])
      .filter(Boolean)
  }
  return []
}

function getFeatureBounds(feature) {
  const bounds = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity }
  collectBounds(feature?.geometry?.coordinates, bounds)
  if ([bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].some(value => !Number.isFinite(value))) {
    return null
  }
  return bounds
}

function collectBounds(coords, bounds) {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    bounds.minLng = Math.min(bounds.minLng, coords[0])
    bounds.minLat = Math.min(bounds.minLat, coords[1])
    bounds.maxLng = Math.max(bounds.maxLng, coords[0])
    bounds.maxLat = Math.max(bounds.maxLat, coords[1])
    return
  }
  coords.forEach(item => collectBounds(item, bounds))
}

function boundsContains(parent, child) {
  return parent.minLng <= child.minLng
    && parent.minLat <= child.minLat
    && parent.maxLng >= child.maxLng
    && parent.maxLat >= child.maxLat
}

function featureContains(parent, child) {
  const samplePoints = child.rings.flatMap(sampleRingPoints)
  if (!samplePoints.length) return false
  return samplePoints.every(point => parent.rings.some(ring => pointInRing(point, ring)))
}

function sampleRingPoints(ring) {
  const points = ring.filter(point => Array.isArray(point) && point.length >= 2)
  if (points.length <= 12) return points
  const step = Math.max(1, Math.floor(points.length / 12))
  return points.filter((_, index) => index % step === 0).slice(0, 12)
}

function pointInRing(point, ring) {
  const x = point[0]
  const y = point[1]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function ringArea(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1])
  }
  return Math.abs(area / 2)
}

function removeGeojsonLayer() {
  if (geojsonLayer && mapInstance) {
    mapInstance.removeLayer(geojsonLayer)
  }
  geojsonLayer = undefined
  hasGeojsonLayer.value = false
  renderedFeatureCount.value = 0
}

function fitCurrentLayer(archive = currentArchive.value, geojson = null) {
  if (!geojsonLayer || !mapInstance) return
  const defaultView = getArchiveDefaultView(archive, geojson)
  if (defaultView) {
    mapInstance.setView([defaultView.center[1], defaultView.center[0]], defaultView.zoom)
    return
  }
  const bounds = geojsonLayer.getBounds()
  if (bounds.isValid()) {
    mapInstance.fitBounds(bounds, { padding: [2, 2], maxZoom: 18 })
    mapInstance.once('moveend', () => {
      const nextZoom = Math.min(mapInstance.getZoom() + 4, 18)
      mapInstance.setZoom(nextZoom, { animate: false })
    })
  }
}

function getArchiveDefaultView(archive, geojson) {
  const styleConfig = parseStyleJson(archive?.styleJson)
  const view = styleConfig.defaultView || geojson?.dxxDefaultView || (
    geojson?.properties?.default_center_lng !== undefined
      ? {
          center: [geojson.properties.default_center_lng, geojson.properties.default_center_lat],
          zoom: geojson.properties.default_zoom
        }
      : null
  )
  if (!view || !Array.isArray(view.center) || view.center.length < 2) return null
  const lng = Number(view.center[0])
  const lat = Number(view.center[1])
  const zoom = Number(view.zoom || 12)
  if (![lng, lat, zoom].every(Number.isFinite)) return null
  return {
    center: [lng, lat],
    zoom
  }
}

async function toggleFullscreen() {
  const element = mapShellRef.value
  if (!element) return

  if (!document.fullscreenElement) {
    await element.requestFullscreen?.()
  } else {
    await document.exitFullscreen?.()
  }
}

function handleFullscreenChange() {
  const element = mapShellRef.value
  isFullscreen.value = !!element && document.fullscreenElement === element
  nextTick(() => {
    mapInstance?.invalidateSize()
    window.setTimeout(() => {
      mapInstance?.invalidateSize()
    }, 120)
    window.setTimeout(() => {
      mapInstance?.invalidateSize()
    }, 300)
  })
}

function createPopupContent(properties, archive) {
  const title = getPreferredPopupTitle(properties)
  const rows = getPopupRows(properties, archive)

  if (!rows.length) {
    return `<div class="geojson-popup"><strong>${escapeHtml(title)}</strong><div>暂无说明</div></div>`
  }

  const rowHtml = rows
    .map(row => `<div class="popup-row"><span>${escapeHtml(row.label)}</span><em>${formatPopupValue(row.value)}</em></div>`)
    .join('')

  return `<div class="geojson-popup"><strong>${escapeHtml(title)}</strong><div class="popup-fields">${rowHtml}</div></div>`
}

function getPopupTitle(properties) {
  const titleKeys = ['name', 'Name', 'NAME', 'O_Name', 'plot_name', 'plotName', '地块名称', '名称']
  for (const key of titleKeys) {
    const value = properties[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return '未命名地块'
}

function getPreferredPopupTitle(properties) {
  const titleKeys = [
    '\u5730\u5757\u540d\u79f0',
    '\u5750\u843d\u5355\u4f4d\u540d\u79f0',
    'ZLDWMC',
    'plot_name',
    'plotName',
    'name',
    'Name',
    'NAME',
    'O_Name',
    '\u540d\u79f0'
  ]
  for (const key of titleKeys) {
    const text = String(properties[key] ?? '').trim()
    if (text && !/^\d{10,}$/.test(text)) {
      return text
    }
  }
  return getPopupTitle(properties)
}

function getPopupRows(properties, archive) {
  const rows = []
  const displayFieldSet = getDisplayFieldSet(archive)
  const parsedRows = parseOvitCommentTable(properties, displayFieldSet)
  const parsedKeys = new Set(parsedRows.map(row => row.label))

  Object.entries(properties).forEach(([key, value]) => {
    if (!shouldDisplayProperty(key, value, displayFieldSet)) return
    const label = propertyLabel(key)
    if (parsedKeys.has(label)) return
    rows.push({ label, value })
  })

  return [
    ...rows,
    ...parsedRows
  ]
}

function getDisplayFieldSet(archive) {
  const styleConfig = parseStyleJson(archive?.styleJson)
  const fields = Array.isArray(styleConfig.displayFields)
    ? styleConfig.displayFields
    : null
  return fields ? new Set(fields.map(item => String(item))) : null
}

function shouldDisplayProperty(key, value, displayFieldSet = null) {
  if (value === undefined || value === null || String(value).trim() === '') return false
  if (key === 'O_Comment' && /<\!?[\w/]/.test(String(value))) return false
  if (displayFieldSet) return displayFieldSet.has(key)

  const hiddenKeys = new Set([
    '__level',
    '__levelName',
    'O_Name',
    'O_Comment1',
    'O_Comment2',
    'O_Comment3',
    'O_Comment4',
    'O_Comment5',
    '备注1',
    '备注2',
    '备注3',
    '备注4',
    '备注5',
    'O_LClr',
    'O_LWidth',
    'O_LAlpha',
    'O_LType',
    'O_SType',
    'O_TType',
    'O_AAlpha',
    'O_AClr',
    'O_Flag'
  ])

  return !hiddenKeys.has(key)
}

const gisFieldLabelMap = {
  O_Name: '名称',
  O_Comment: '备注',
  O_LClr: '线颜色',
  O_LWidth: '线宽',
  O_LAlpha: '线透明度',
  O_LType: '线类型',
  O_SType: '符号类型',
  O_TType: '文字类型',
  O_AAlpha: '填充透明度',
  O_AClr: '填充颜色',
  O_Flag: '标记',
  FID: '要素编号',
  BSM: '标识码',
  YSDM: '要素代码',
  ZLDWDM: '坐落单位代码',
  ZLDWMC: '坐落单位名称',
  DCMJ: '调查面积',
  JSMJ: '计算面积',
  MSSM: '描述说明码',
  HDMC: '名称',
  BZ: '备注',
  SHAPE_Leng: '图形长度',
  SHAPE_Area: '图形面积'
}

function propertyLabel(key) {
  const labelMap = {
    O_Comment: '说明',
    comment: '说明',
    remark: '备注',
    description: '说明',
    area: '面积',
    city: '市',
    county: '县/区',
    town: '乡镇',
    village: '村',
    crop_type: '作物类型',
    variety: '品种'
  }
  return labelMap[key] || key
}

function formatPopupValue(value) {
  const text = String(value)
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim()
  return escapeHtml(stripHtml(text)).replaceAll('\n', '<br>')
}

function parseOvitCommentTable(properties, displayFieldSet = null) {
  const html = ['O_Comment', 'O_Comment1', 'O_Comment2', 'O_Comment3', 'O_Comment4', 'O_Comment5', '备注', '备注1', '备注2', '备注3', '备注4', '备注5']
    .map(key => properties[key] || '')
    .join('')

  if (!html.includes('<td')) return []

  const rows = []
  const rowPattern = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gis
  let match
  while ((match = rowPattern.exec(html)) !== null) {
    const rawLabel = stripHtml(match[1]).trim()
    const value = stripHtml(match[2]).trim()
    if (!rawLabel || !value) continue
    if (/^\d{10,}$/.test(rawLabel)) continue
    if (['Shape'].includes(rawLabel)) continue
    const label = rawLabel
    if (displayFieldSet && !displayFieldSet.has(label)) continue
    rows.push({ label, value })
  }
  return rows.slice(0, 20)
}

function stripHtml(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

onMounted(async () => {
  try {
    await nextTick()
    await initMap()
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    await loadDatasetList()
    await loadArchiveList()
  } catch (error) {
    errorMessage.value = error?.message || '地图初始化失败'
    ElMessage.error(errorMessage.value)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  removeGeojsonLayer()
  mapInstance?.remove()
  mapInstance = undefined
})
</script>

<style scoped lang="scss">
.geojson-map-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: calc(100vh - 84px);
}

.toolbar-card :deep(.el-card__body) {
  padding: 14px 18px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
}

.toolbar-title {
  display: none;

  .title {
    color: #1f2937;
    font-size: 18px;
    font-weight: 600;
  }

  .subtitle {
    color: #909399;
    font-size: 13px;
  }
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.map-alert {
  flex: none;
}

.map-card {
  position: relative;
  flex: 1;
  min-height: 580px;
}

.map-card :deep(.el-card__body) {
  height: 100%;
  min-height: 580px;
  padding: 0;
}

.map-fullscreen-shell {
  position: relative;
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 580px;
  background: #eef2f6;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: inherit;
  background: #eef2f6;
}

.map-fullscreen-shell.is-fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  background: #eef2f6;
  overflow: hidden;
}

.map-fullscreen-shell:fullscreen {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  background: #eef2f6;
  overflow: hidden;
}

:global(.map-fullscreen-shell:fullscreen) {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  background: #eef2f6;
  overflow: hidden;
}

.map-fullscreen-shell.is-fullscreen .map-container,
.map-fullscreen-shell:fullscreen .map-container {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  margin: 0;
}

.map-summary {
  position: absolute;
  z-index: 500;
  left: 16px;
  bottom: 16px;
  display: flex;
  gap: 16px;
  padding: 9px 14px;
  border: 1px solid rgb(255 255 255 / 65%);
  border-radius: 6px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
  color: #4b5563;
  font-size: 12px;
  backdrop-filter: blur(6px);
}

:deep(.geojson-popup strong) {
  display: block;
  margin-bottom: 6px;
  color: #166534;
  font-size: 14px;
}

:deep(.popup-fields) {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 220px;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 240px;
}

:deep(.popup-row) {
  display: grid;
  grid-template-columns: 72px minmax(150px, 1fr);
  gap: 8px;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.45;
  align-items: start;
}

:deep(.popup-row span) {
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.popup-row em) {
  color: #303133;
  font-style: normal;
  min-width: 0;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

:deep(.map-layer-drawer .el-drawer__body) {
  padding: 0 16px 18px;
}

.drawer-section {
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
}

.drawer-section:last-child {
  border-bottom: 0;
}

.drawer-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.archive-count {
  color: #909399;
  font-size: 12px;
  font-weight: 400;
}

.dataset-list,
.archive-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 34vh;
  overflow-y: auto;
  padding-right: 2px;
}

.dataset-item,
.archive-item {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
  transition: all 0.18s ease;
}

.dataset-item:hover,
.archive-item:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.dataset-item.active,
.archive-item.active {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 2px 8px rgb(64 158 255 / 12%);
}

.dataset-name,
.archive-name {
  display: block;
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.dataset-desc,
.archive-meta {
  display: block;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 900px) {
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .map-summary {
    right: 10px;
    bottom: 10px;
    left: 10px;
    flex-wrap: wrap;
    gap: 6px 14px;
  }
}
</style>
