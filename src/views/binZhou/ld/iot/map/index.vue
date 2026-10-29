<template>
  <div class="region-map-page">
    <aside class="region-panel">
      <div class="panel-header">
        <div>
          <h2>园区地图</h2>
          <p>园区 / 地块 / 位置三级圈地</p>
        </div>
        <el-button :icon="Refresh" circle @click="reloadAll" :loading="loading" />
      </div>

      <el-form class="draw-form" label-position="top">
        <el-form-item label="圈地类型">
          <el-segmented v-model="drawForm.level" :options="levelOptions" @change="handleLevelChange" />
        </el-form-item>

        <el-form-item v-if="drawForm.level !== 'park'" label="所属园区">
          <el-select v-model="drawForm.parkId" filterable placeholder="选择园区" @change="handleDrawParkChange">
            <el-option v-for="park in parkList" :key="park.parkId" :label="park.parkName" :value="park.parkId" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="drawForm.level === 'location'" label="所属地块">
          <el-select v-model="drawForm.areaId" filterable placeholder="选择地块" @change="handleDrawAreaChange">
            <el-option v-for="area in drawableAreaOptions" :key="area.areaId" :label="area.areaName" :value="area.areaId" />
          </el-select>
        </el-form-item>

        <el-form-item label="名称">
          <el-input v-model="drawForm.name" :placeholder="namePlaceholder" clearable />
        </el-form-item>

        <el-form-item label="位置说明">
          <el-input
            v-model="drawForm.description"
            type="textarea"
            :rows="2"
            placeholder="可填写该园区、地块或位置的说明"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <div class="draw-actions">
          <el-button type="primary" :icon="EditPen" @click="startDraw">{{ drawActionText }}</el-button>
          <el-button :disabled="!isManualDrawing || drawPoints.length < minDrawPoints" type="success" @click="finishManualDraw">完成圈地</el-button>
          <el-button :disabled="!isManualDrawing || !drawPoints.length" @click="undoDrawPoint">撤销上一点</el-button>
          <el-button :icon="Close" @click="cancelPendingDraw">取消</el-button>
        </div>
      </el-form>

      <div class="legend">
        <span><i class="legend-dot park"></i>园区</span>
        <span><i class="legend-dot area"></i>地块</span>
        <span><i class="legend-dot location"></i>位置</span>
      </div>

      <el-input v-model="keyword" class="tree-search" placeholder="搜索名称" :prefix-icon="Search" clearable />

      <el-scrollbar class="tree-scroll">
        <el-tree
          ref="treeRef"
          :data="regionTree"
          node-key="key"
          :props="{ label: 'label', children: 'children' }"
          :filter-node-method="filterNode"
          default-expand-all
          highlight-current
          @node-click="handleTreeNodeClick"
        >
          <template #default="{ data }">
            <div class="tree-node">
              <span class="node-title">
                <i class="node-color" :class="data.level"></i>
                {{ data.label }}
              </span>
              <span class="node-actions" v-if="data.raw">
                <el-tooltip content="编辑边界" placement="top">
                  <el-button text :icon="EditPen" @click.stop="editBoundary(data)" />
                </el-tooltip>
                <el-tooltip content="删除边界" placement="top">
                  <el-button text :icon="Delete" @click.stop="clearBoundary(data)" />
                </el-tooltip>
              </span>
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </aside>

    <main class="map-shell" v-loading="loading">
      <div ref="mapRef" class="map-view"></div>
      <div class="map-tips">
        <b>{{ activeDrawText }}</b>
        <span v-if="isManualDrawing">正在圈地：已选择 {{ drawPoints.length }} 个点，当前类型至少需要 {{ minDrawPoints }} 个点</span>
        <span v-else>选择左侧园区、地块或位置，地图会自动定位到对应区域</span>
      </div>
    </main>
  </div>
</template>

<script setup name="IotRegionMap">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Delete, EditPen, Refresh, Search } from '@element-plus/icons-vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png'
import { addPark, listPark, updatePark } from '@/api/binZhou/ld/iot/park'
import { addArea, listArea, updateArea } from '@/api/binZhou/ld/iot/area'
import { addLocation, listLocation, updateLocation } from '@/api/binZhou/ld/iot/location'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconPng,
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng
})

const mapRef = ref()
const treeRef = ref()
const loading = ref(false)
const keyword = ref('')
const parkList = ref([])
const areaList = ref([])
const locationList = ref([])

const drawForm = reactive({
  level: 'park',
  parkId: null,
  areaId: null,
  name: '',
  description: ''
})

const levelOptions = [
  { label: '园区', value: 'park' },
  { label: '地块', value: 'area' },
  { label: '位置', value: 'location' }
]

const levelMeta = {
  park: { label: '园区', color: '#22c55e', fill: '#22c55e', weight: 3, opacity: 0.28 },
  area: { label: '地块', color: '#f59e0b', fill: '#f59e0b', weight: 2, opacity: 0.24 },
  location: { label: '位置', color: '#38bdf8', fill: '#38bdf8', weight: 2, opacity: 0.22 }
}

let map
let drawnGroup
let drawHandler
let activeEditLayer
let draftLine
let draftPolygon
let draftPreviewLine
const draftMarkers = []
const regionLayerMap = new Map()
const isManualDrawing = ref(false)
const drawPoints = ref([])
const drawTargetNode = ref(null)
let activeParkFocusId = null
let activeRegionFocus = null

const drawableAreaOptions = computed(() => {
  if (!drawForm.parkId) return areaList.value
  return areaList.value.filter(item => String(item.parkId) === String(drawForm.parkId))
})

const namePlaceholder = computed(() => `请输入${levelMeta[drawForm.level].label}名称`)

const activeDrawText = computed(() => {
  const label = levelMeta[drawForm.level].label
  return drawTargetNode.value ? `正在修改：${drawTargetNode.value.label}` : `当前圈地类型：${label}`
})

const minDrawPoints = computed(() => drawForm.level === 'location' ? 1 : 3)

const drawActionText = computed(() => drawTargetNode.value ? '重新圈地' : '开始圈地')

const regionTree = computed(() => {
  return parkList.value.map(park => {
    const areas = areaList.value.filter(area => String(area.parkId) === String(park.parkId))
    return {
      key: `park-${park.parkId}`,
      level: 'park',
      label: park.parkName || `园区 ${park.parkId}`,
      raw: park,
      children: areas.map(area => {
        const locations = locationList.value.filter(location => String(location.areaId) === String(area.areaId))
        return {
          key: `area-${area.areaId}`,
          level: 'area',
          label: area.areaName || `地块 ${area.areaId}`,
          raw: area,
          parent: park,
          children: locations.map(location => ({
            key: `location-${location.locationId}`,
            level: 'location',
            label: location.locationName || `位置 ${location.locationId}`,
            raw: location,
            parent: area
          }))
        }
      })
    }
  })
})

watch(keyword, value => {
  treeRef.value?.filter(value)
})

onMounted(async () => {
  await nextTick()
  initMap()
  await reloadAll()
})

onBeforeUnmount(() => {
  cancelPendingDraw()
  if (map) {
    map.off()
    map.remove()
    map = null
  }
})

function initMap() {
  if (map || !mapRef.value) return

  const normalLayer = L.tileLayer(
    'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 20, minZoom: 3, attribution: '高德地图' }
  )
  const satelliteBase = L.tileLayer(
    'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 20, minZoom: 3, attribution: '高德卫星' }
  )
  const satelliteLabel = L.tileLayer(
    'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
    { subdomains: ['1', '2', '3', '4'], maxZoom: 20, minZoom: 3, opacity: 0.78 }
  )
  const satelliteLayer = L.layerGroup([satelliteBase, satelliteLabel])

  map = L.map(mapRef.value, {
    center: [37.382, 117.989],
    zoom: 14,
    layers: [satelliteLayer],
    zoomControl: true,
    attributionControl: false
  })

  L.control.layers({ 卫星地图: satelliteLayer, 标准地图: normalLayer }, null, { position: 'bottomleft' }).addTo(map)
  drawnGroup = L.featureGroup().addTo(map)
}

async function reloadAll() {
  loading.value = true
  try {
    const [parks, areas, locations] = await Promise.all([
      listPark({ pageNum: 1, pageSize: 10000 }),
      listArea({ pageNum: 1, pageSize: 10000 }),
      listLocation({ pageNum: 1, pageSize: 10000 })
    ])
    parkList.value = parks.rows || parks.data || []
    areaList.value = areas.rows || areas.data || []
    locationList.value = locations.rows || locations.data || []
    renderRegions()
    restoreMapFocus()
  } finally {
    loading.value = false
  }
}

function renderRegions() {
  if (!drawnGroup) return
  drawnGroup.clearLayers()
  regionLayerMap.clear()

  const bounds = []
  parkList.value.forEach(row => drawRegion(row, 'park', `park-${row.parkId}`, row.parkName))
  areaList.value.forEach(row => drawRegion(row, 'area', `area-${row.areaId}`, row.areaName))
  locationList.value.forEach(row => drawRegion(row, 'location', `location-${row.locationId}`, row.locationName))

  regionLayerMap.forEach(layer => {
    const layerBounds = getLayerBounds(layer)
    if (layerBounds.isValid()) bounds.push(layerBounds)
  })

  if ((activeParkFocusId === null || activeParkFocusId === undefined) && bounds.length) {
    const allBounds = bounds.reduce((acc, item) => acc.extend(item), L.latLngBounds(bounds[0]))
    map.fitBounds(allBounds, { padding: [28, 28], maxZoom: 17 })
  }
}

function drawRegion(row, level, key, name) {
  const coordinates = parseCoordinate(row.coordinate)
  const meta = levelMeta[level]
  if (coordinates.length < 3 && level === 'area') return
  if (!coordinates.length) return

  const layer = coordinates.length >= 3
    ? L.polygon(toLatLngs(coordinates), {
      color: meta.color,
      fillColor: meta.fill,
      weight: meta.weight,
      opacity: 0.96,
      fillOpacity: meta.opacity
    })
    : L.circleMarker(toLatLngs(coordinates)[0], {
      radius: 7,
      color: '#ffffff',
      fillColor: meta.fill,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.96
    })
  layer.regionData = { level, row, key }
  layer.bindTooltip(`${meta.label}：${name || '-'}`, {
    sticky: true,
    direction: 'top',
    className: `region-tooltip ${level}`
  })
  layer.bindPopup(createPopupHtml(level, row), { maxWidth: 280 })
  layer.on('click', event => handleRegionLayerClick(event, key))
  drawnGroup.addLayer(layer)
  regionLayerMap.set(key, layer)
}

function handleRegionLayerClick(event, key) {
  if (isManualDrawing.value) {
    if (event.originalEvent) {
      L.DomEvent.stop(event.originalEvent)
    }
    map.closePopup()
    handleManualDrawClick(event)
    return
  }
  highlightLayer(key)
}

function getLayerBounds(layer) {
  if (typeof layer.getBounds === 'function') return layer.getBounds()
  if (typeof layer.getLatLng === 'function') {
    const point = layer.getLatLng()
    return L.latLngBounds([point, point])
  }
  return L.latLngBounds([])
}

function parseCoordinate(value) {
  if (!value) return []
  let parsed = value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const singlePoint = trimmed.split(',').map(item => Number(item.trim()))
    if (!trimmed.startsWith('[') && singlePoint.length === 2 && singlePoint.every(Number.isFinite)) {
      return [[singlePoint[0], singlePoint[1]]]
    }
    try {
      parsed = JSON.parse(trimmed)
    } catch (error) {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .map(point => {
      if (Array.isArray(point)) return [Number(point[0]), Number(point[1])]
      return [Number(point.lng ?? point.longitude), Number(point.lat ?? point.latitude)]
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
}

function toLatLngs(coordinates) {
  return coordinates.map(([lng, lat]) => [lat, lng])
}

function toCoordinateString(layer) {
  const points = typeof layer.getLatLngs === 'function'
    ? (layer.getLatLngs()[0] || [])
    : (typeof layer.getLatLng === 'function' ? [layer.getLatLng()] : [])
  const coordinates = points.map(point => [
    Number(point.lng.toFixed(6)),
    Number(point.lat.toFixed(6))
  ])
  return JSON.stringify(coordinates)
}

function createPopupHtml(level, row) {
  const meta = levelMeta[level]
  const name = readRegionName(level, row)
  const description = readRegionDescription(level, row) || '暂无说明'
  return `
    <div class="region-popup">
      <b>${meta.label}：${escapeHtml(name)}</b>
      <span>说明：${escapeHtml(description)}</span>
    </div>
  `
}

function readRegionId(level, row) {
  if (level === 'park') return row.parkId
  if (level === 'area') return row.areaId
  return row.locationId
}

function readRegionName(level, row) {
  if (level === 'park') return row.parkName
  if (level === 'area') return row.areaName
  return row.locationName
}

function readRegionDescription(level, row) {
  if (level === 'park') return row.parkCode
  if (level === 'area') return row.areaCode
  return row.locationCode
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]))
}

function filterNode(value, data) {
  if (!value) return true
  return data.label?.includes(value)
}

function handleTreeNodeClick(data) {
  if (!data?.key) return
  if (data.level === 'park') {
    activeParkFocusId = data.raw.parkId
    activeRegionFocus = { level: 'park', id: data.raw.parkId }
    focusParkCenter(data.raw.parkId)
  } else {
    activeParkFocusId = data.level === 'area' ? data.raw.parkId : getParkIdByLocation(data.raw)
    activeRegionFocus = { level: data.level, id: readRegionId(data.level, data.raw) }
    focusRegion(data.level, readRegionId(data.level, data.raw))
  }

  if (data.level === 'park') {
    drawForm.level = 'area'
    drawForm.parkId = data.raw.parkId
    drawForm.areaId = null
  } else if (data.level === 'area') {
    drawForm.level = 'location'
    drawForm.parkId = data.raw.parkId
    drawForm.areaId = data.raw.areaId
  }
}

function getParkIdByLocation(location) {
  const area = areaList.value.find(item => String(item.areaId) === String(location?.areaId))
  return area?.parkId || null
}

function resolveParkFocusId(node) {
  if (!node?.raw) return activeParkFocusId
  if (node.level === 'park') return node.raw.parkId
  if (node.level === 'area') return node.raw.parkId
  if (node.level === 'location') return getParkIdByLocation(node.raw)
  return activeParkFocusId
}

function restoreMapFocus() {
  if (activeRegionFocus?.level && activeRegionFocus?.id !== undefined && activeRegionFocus?.id !== null) {
    if (activeRegionFocus.level === 'park') {
      focusParkCenter(activeRegionFocus.id, true)
    } else {
      focusRegion(activeRegionFocus.level, activeRegionFocus.id, true)
    }
  } else if (activeParkFocusId !== null && activeParkFocusId !== undefined) {
    focusParkCenter(activeParkFocusId, true)
  }
}

function focusParkCenter(parkId, silent = false) {
  if (!map || parkId === null || parkId === undefined) return false

  const park = parkList.value.find(item => String(item.parkId) === String(parkId))
  const coordinates = parseCoordinate(park?.coordinate)
  const key = `park-${parkId}`
  const layer = regionLayerMap.get(key)
  if (coordinates.length) {
    const bounds = L.latLngBounds(toLatLngs(coordinates))
    if (bounds.isValid()) {
      highlightLayer(key)
      const center = bounds.getCenter()
      const samePoint = bounds.getNorthEast().equals(bounds.getSouthWest())
      const fitZoom = samePoint ? 16 : map.getBoundsZoom(bounds, false, [72, 72])
      const zoom = samePoint ? 16 : Math.min(Math.max(fitZoom, 15), 17)
      map.flyTo(center, zoom, { duration: 0.8 })
      layer?.openPopup()
      return true
    }
  }

  if (layer) {
    highlightLayer(key)
    const layerBounds = getLayerBounds(layer)
    if (layerBounds.isValid()) {
      const center = layerBounds.getCenter()
      const samePoint = layerBounds.getNorthEast().equals(layerBounds.getSouthWest())
      const fitZoom = map.getBoundsZoom(layerBounds, false, [72, 72])
      const zoom = samePoint ? 16 : Math.min(Math.max(fitZoom, 15), 17)
      map.flyTo(center, zoom, { duration: 0.8 })
      layer.openPopup()
      return true
    }
  }

  if (!silent) {
    ElMessage.warning('当前园区暂未设置地图边界')
  }
  return false
}

function focusRegion(level, id, silent = false) {
  if (!map || id === null || id === undefined) return false

  const key = `${level}-${id}`
  const layer = regionLayerMap.get(key)
  if (layer) {
    highlightLayer(key)
    const layerBounds = getLayerBounds(layer)
    if (layerBounds.isValid() && layerBounds.getNorthEast().equals(layerBounds.getSouthWest())) {
      map.flyTo(layerBounds.getCenter(), 18, { duration: 0.65 })
    } else {
      const fitZoom = map.getBoundsZoom(layerBounds, false, [72, 72])
      const minZoom = level === 'location' ? 18 : 17
      const zoom = Math.min(Math.max(fitZoom, minZoom), 18)
      map.flyTo(layerBounds.getCenter(), zoom, { duration: 0.65 })
    }
    layer.openPopup()
    return true
  }

  const fallback = getFallbackRegion(level, id)
  if (fallback) {
    const focused = focusRegion(fallback.level, fallback.id, true)
    if (focused && !silent) {
      ElMessage.info('当前记录暂无边界，已定位到上级区域')
    }
    return focused
  }

  if (!silent) {
    ElMessage.warning('当前记录和上级记录暂未设置地图边界')
  }
  return false
}

function getFallbackRegion(level, id) {
  if (level === 'area') {
    const area = areaList.value.find(item => String(item.areaId) === String(id))
    return area?.parkId ? { level: 'park', id: area.parkId } : null
  }
  if (level === 'location') {
    const location = locationList.value.find(item => String(item.locationId) === String(id))
    if (!location?.areaId) return null
    const areaKey = `area-${location.areaId}`
    if (regionLayerMap.has(areaKey)) return { level: 'area', id: location.areaId }
    const area = areaList.value.find(item => String(item.areaId) === String(location.areaId))
    return area?.parkId ? { level: 'park', id: area.parkId } : { level: 'area', id: location.areaId }
  }
  return null
}

function highlightLayer(key) {
  regionLayerMap.forEach((layer, layerKey) => {
    const level = layer.regionData.level
    const meta = levelMeta[level]
    layer.setStyle({
      color: layerKey === key ? '#ffffff' : meta.color,
      weight: layerKey === key ? meta.weight + 2 : meta.weight,
      fillOpacity: layerKey === key ? Math.min(meta.opacity + 0.18, 0.55) : meta.opacity
    })
  })
}

function handleLevelChange() {
  drawTargetNode.value = null
  drawForm.name = ''
  if (drawForm.level === 'park') {
    drawForm.parkId = null
    drawForm.areaId = null
  }
  if (drawForm.level === 'area') {
    drawForm.areaId = null
  }
}

function handleDrawParkChange() {
  drawTargetNode.value = null
  drawForm.areaId = null
  activeParkFocusId = drawForm.parkId
  activeRegionFocus = { level: 'park', id: drawForm.parkId }
  focusParkCenter(drawForm.parkId, true)
}

function handleDrawAreaChange() {
  drawTargetNode.value = null
  const area = areaList.value.find(item => String(item.areaId) === String(drawForm.areaId))
  activeParkFocusId = area?.parkId || activeParkFocusId
  activeRegionFocus = { level: 'area', id: drawForm.areaId }
  focusRegion('area', drawForm.areaId, true)
}

function startDraw() {
  if (!validateDrawForm()) return
  cancelPendingDraw(false)
  const meta = levelMeta[drawForm.level]
  isManualDrawing.value = true
  drawPoints.value = []
  draftLine = L.polyline([], {
    color: meta.color,
    weight: meta.weight,
    dashArray: '6, 6'
  }).addTo(map)
  draftPolygon = L.polygon([], {
    color: meta.color,
    fillColor: meta.fill,
    weight: meta.weight,
    fillOpacity: Math.max(meta.opacity, 0.2)
  }).addTo(map)
  draftPreviewLine = L.polyline([], {
    color: '#ffffff',
    weight: 1,
    dashArray: '4, 6',
    opacity: 0.85
  }).addTo(map)
  map.doubleClickZoom.disable()
  map.getContainer().classList.add('is-drawing-polygon')
  map.on('click', handleManualDrawClick)
  map.on('mousemove', handleManualDrawMove)
  ElMessage.info('请在地图上依次点击边界点，点击“完成圈地”后保存')
}

function validateDrawForm() {
  if (drawForm.level !== 'park' && !drawForm.parkId) {
    ElMessage.warning('请先选择所属园区')
    return false
  }
  if (drawForm.level === 'location' && !drawForm.areaId) {
    ElMessage.warning('请先选择所属地块')
    return false
  }
  return true
}

function cancelPendingDraw(clearTarget = true) {
  if (drawHandler) {
    drawHandler.disable()
    drawHandler = null
  }
  stopManualDraw()
  if (clearTarget) {
    drawTargetNode.value = null
  }
  if (activeEditLayer) {
    activeEditLayer.editing?.disable()
    activeEditLayer = null
  }
}

function handleManualDrawClick(event) {
  if (!isManualDrawing.value) return
  drawPoints.value = [...drawPoints.value, event.latlng]
  const marker = L.circleMarker(event.latlng, {
    radius: 4,
    color: '#ffffff',
    weight: 2,
    fillColor: levelMeta[drawForm.level].color,
    fillOpacity: 1
  }).addTo(map)
  draftMarkers.push(marker)
  refreshDraftShape()
}

function handleManualDrawMove(event) {
  if (!isManualDrawing.value || !drawPoints.value.length || !draftPreviewLine) return
  draftPreviewLine.setLatLngs([drawPoints.value[drawPoints.value.length - 1], event.latlng])
}

function refreshDraftShape() {
  if (draftLine) draftLine.setLatLngs(drawPoints.value)
  if (draftPolygon) draftPolygon.setLatLngs(drawPoints.value.length >= 3 ? drawPoints.value : [])
}

function undoDrawPoint() {
  if (!isManualDrawing.value || !drawPoints.value.length) return
  drawPoints.value = drawPoints.value.slice(0, -1)
  const marker = draftMarkers.pop()
  if (marker) map.removeLayer(marker)
  refreshDraftShape()
}

async function finishManualDraw() {
  if (!isManualDrawing.value || drawPoints.value.length < minDrawPoints.value) {
    ElMessage.warning(`${levelMeta[drawForm.level].label}至少需要 ${minDrawPoints.value} 个点`)
    return
  }
  const layer = drawForm.level === 'location' && drawPoints.value.length < 3
    ? L.circleMarker(drawPoints.value[0])
    : L.polygon(drawPoints.value)
  const targetNode = drawTargetNode.value
  stopManualDraw()
  await saveDrawLayer(layer, targetNode)
}

function stopManualDraw() {
  if (!map) return
  if (isManualDrawing.value) {
    map.off('click', handleManualDrawClick)
    map.off('mousemove', handleManualDrawMove)
    map.doubleClickZoom.enable()
    map.getContainer().classList.remove('is-drawing-polygon')
  }
  isManualDrawing.value = false
  drawPoints.value = []
  ;[draftLine, draftPolygon, draftPreviewLine].forEach(layer => {
    if (layer) map.removeLayer(layer)
  })
  draftLine = null
  draftPolygon = null
  draftPreviewLine = null
  while (draftMarkers.length) {
    const marker = draftMarkers.pop()
    if (marker) map.removeLayer(marker)
  }
}

async function saveDrawLayer(layer, targetNode = null) {
  const level = targetNode?.level || drawForm.level
  const coordinate = toCoordinateString(layer)
  const name = drawForm.name?.trim()
  const description = drawForm.description?.trim() || ''

  try {
    if (targetNode?.raw) {
      await updateExistingRegion(targetNode, coordinate, description, name)
      activeParkFocusId = resolveParkFocusId(targetNode)
      activeRegionFocus = { level: targetNode.level, id: readRegionId(targetNode.level, targetNode.raw) }
      ElMessage.success('边界已更新')
    } else if (level === 'park') {
      await addPark({
        parkName: name || `新园区${Date.now()}`,
        parkCode: description,
        coordinate
      })
      ElMessage.success('园区已保存')
    } else if (level === 'area') {
      activeParkFocusId = drawForm.parkId
      await addArea({
        parkId: drawForm.parkId,
        areaName: name || `新地块${Date.now()}`,
        areaCode: description,
        coordinate
      })
      ElMessage.success('地块已保存')
    } else {
      activeParkFocusId = drawForm.parkId
      await addLocation({
        areaId: drawForm.areaId,
        locationName: name || `新位置${Date.now()}`,
        locationCode: description,
        coordinate
      })
      ElMessage.success('位置已保存')
    }
    drawForm.name = ''
    drawForm.description = ''
    drawTargetNode.value = null
    await reloadAll()
  } catch (error) {
    ElMessage.error('保存边界失败')
  }
}

async function updateExistingRegion(node, coordinate, description = undefined, name = undefined) {
  const row = { ...node.raw, coordinate }
  if (name) {
    if (node.level === 'park') row.parkName = name
    if (node.level === 'area') row.areaName = name
    if (node.level === 'location') row.locationName = name
  }
  if (description !== undefined) {
    if (node.level === 'park') row.parkCode = description
    if (node.level === 'area') row.areaCode = description
    if (node.level === 'location') row.locationCode = description
  }
  if (node.level === 'park') return updatePark(row)
  if (node.level === 'area') return updateArea(row)
  return updateLocation(row)
}

function editBoundary(node) {
  cancelPendingDraw()
  applyNodeAsDrawTarget(node)
  activeParkFocusId = resolveParkFocusId(node)
  activeRegionFocus = { level: node.level, id: readRegionId(node.level, node.raw) }
  if (node.level === 'park') {
    focusParkCenter(node.raw.parkId, true)
  } else {
    focusRegion(node.level, readRegionId(node.level, node.raw), true)
  }
  startDraw()
  ElMessage.info('请重新绘制边界，完成后会更新当前记录')
  return

  const layer = regionLayerMap.get(node.key)
  if (!layer) {
    ElMessage.warning('该记录还没有边界，请选择类型后重新圈地')
    applyNodeAsDrawTarget(node)
    return
  }

  cancelPendingDraw()
  if (!layer.editing) {
    ElMessage.info('该位置是单点坐标，请重新圈点更新位置')
    applyNodeAsDrawTarget(node)
    startDraw()
    return
  }
  activeEditLayer = layer
  layer.editing.enable()

  ElMessageBox.confirm('拖拽边界点调整后，点击确定保存新的坐标。', '编辑边界', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    type: 'info'
  }).then(async () => {
    layer.editing.disable()
    await updateExistingRegion(node, toCoordinateString(layer))
    activeEditLayer = null
    ElMessage.success('边界已保存')
    await reloadAll()
  }).catch(() => {
    layer.editing.disable()
    activeEditLayer = null
    reloadAll()
  })
}

function applyNodeAsDrawTarget(node) {
  drawTargetNode.value = node
  drawForm.level = node.level
  drawForm.name = readRegionName(node.level, node.raw)
  drawForm.description = readRegionDescription(node.level, node.raw) || ''
  if (node.level === 'area') {
    drawForm.parkId = node.raw.parkId
    drawForm.areaId = null
  }
  if (node.level === 'location') {
    const area = areaList.value.find(item => String(item.areaId) === String(node.raw.areaId))
    drawForm.parkId = area?.parkId || null
    drawForm.areaId = node.raw.areaId
  }
}

async function clearBoundary(node) {
  if (!node.raw?.coordinate) {
    ElMessage.info('该记录暂无边界')
    return
  }
  await ElMessageBox.confirm('确定清空该记录的地图边界吗？', '清空边界', {
    type: 'warning',
    confirmButtonText: '清空',
    cancelButtonText: '取消'
  })
  await updateExistingRegion(node, '')
  ElMessage.success('边界已清空')
  await reloadAll()
}
</script>

<style scoped>
.region-map-page {
  display: grid;
  grid-template-columns: 340px 1fr;
  height: calc(100vh - 84px);
  min-height: 640px;
  background: #edf7ef;
}

.region-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(180deg, #f7fff9 0%, #e8f7ed 100%);
  border-right: 1px solid #cfe7d5;
  box-shadow: 8px 0 24px rgba(40, 120, 70, 0.08);
  z-index: 500;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  color: #14532d;
}

.panel-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #5f7f68;
}

.draw-form {
  padding: 12px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(143, 188, 153, 0.46);
  border-radius: 8px;
}

.draw-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.draw-actions :deep(.el-button) {
  flex: 1 1 calc(50% - 3px);
  min-width: 0;
  margin-left: 0;
  padding: 8px 10px;
}

.legend {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  font-size: 12px;
  color: #315a3b;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
}

.legend-dot,
.node-color {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 6px;
}

.legend-dot.park,
.node-color.park {
  background: #22c55e;
}

.legend-dot.area,
.node-color.area {
  background: #f59e0b;
}

.legend-dot.location,
.node-color.location {
  background: #38bdf8;
}

.tree-search {
  flex: none;
}

.tree-scroll {
  flex: 1;
  min-height: 0;
  padding: 8px;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  border: 1px solid rgba(143, 188, 153, 0.35);
}

.tree-node {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.node-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  display: inline-flex;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tree-node:hover .node-actions {
  opacity: 1;
}

.map-shell {
  position: relative;
  min-width: 0;
}

.map-view {
  width: 100%;
  height: 100%;
}

.map-tips {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 450;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  color: #eafff0;
  background: rgba(10, 47, 28, 0.72);
  border: 1px solid rgba(142, 235, 172, 0.28);
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(8, 40, 22, 0.24);
  backdrop-filter: blur(8px);
}

.map-tips span {
  font-size: 12px;
  color: rgba(234, 255, 240, 0.78);
}

:deep(.el-segmented) {
  width: 100%;
}

:deep(.el-segmented__item) {
  flex: 1;
}

:deep(.leaflet-container) {
  font-family: inherit;
}

:deep(.leaflet-container img) {
  max-width: none !important;
  max-height: none !important;
  box-sizing: content-box !important;
}

:deep(.region-popup) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
}

:deep(.region-popup b) {
  color: #14532d;
}

:deep(.region-popup span) {
  color: #5f7f68;
  font-size: 12px;
}

:deep(.region-popup p) {
  margin: 0;
  color: #334155;
  font-size: 12px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.leaflet-interactive:hover) {
  stroke-width: 5 !important;
}
</style>
