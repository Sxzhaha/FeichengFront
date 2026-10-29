<template>
  <div class="iot-perception-page" v-loading="loading">
    <div class="top-toolbar">
      <div class="toolbar-left">
        <div class="global-device-stat">
          <span>全部园区设备</span>
          <strong>{{ formatNumber(allDeviceStatus.total) }}</strong>
          <small>在线 {{ allDeviceStatus.online }} 台 · 离线 {{ allDeviceStatus.offline }} 台</small>
        </div>
        <el-select
          v-model="selectedParkId"
          class="park-select"
          placeholder="请选择庄园"
          filterable
          :disabled="parkOptions.length === 0"
          @change="handleParkChange"
        >
          <el-option
            v-for="park in parkOptions"
            :key="park.parkId"
            :label="park.parkName"
            :value="park.parkId"
          />
        </el-select>
        <button class="refresh-button" type="button" :disabled="!selectedParkId" @click="openParkReportDrawer">
          <el-icon><DataAnalysis /></el-icon>
          <span>查看设备报表</span>
        </button>
        <button class="refresh-button" type="button" @click="loadDashboard">
          <el-icon><Refresh /></el-icon>
          <span>刷新</span>
        </button>
        <span class="update-text">更新于 {{ updateTime || '--' }}</span>
      </div>
    </div>

    <main class="dashboard-main">
      <section class="summary-grid">
        <article v-for="item in summaryCards" :key="item.label" class="summary-card">
          <div class="summary-icon" :class="item.iconClass">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <div>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.desc }}</small>
          </div>
        </article>
      </section>

      <section class="perception-module-grid">
        <article class="chart-card weather-live module-weather">
          <div class="card-header">
            <div>
              <h3>实时天气</h3>
              <p>{{ weatherInfo.reportTime ? `更新于 ${weatherInfo.reportTime}` : '暂无实时天气数据' }}</p>
            </div>
            <span class="weather-badge">
              <i v-if="weatherInfo.weatherCode" :class="'qi-' + weatherInfo.weatherCode"></i>
              <span>{{ weatherInfo.weatherText || '暂无' }}</span>
            </span>
          </div>

          <div class="weather-live-body">
            <div class="weather-now">
              <div class="temperature">
                <strong>{{ weatherInfo.temperature }}</strong>
                <span>℃</span>
              </div>
              <div class="weather-metrics">
                <span>湿度 {{ weatherInfo.humidity }}%</span>
                <span>风力 {{ weatherInfo.windDirection }} {{ weatherInfo.windScale }}级</span>
                <span>降雨 {{ weatherInfo.precipitation }}mm</span>
                <span>气象 {{ weatherInfo.weatherText || '--' }}</span>
              </div>
            </div>

            <div class="forecast-mini-list">
              <div v-for="item in sevenDayForecast" :key="item.id || item.forecastDate" class="forecast-mini-item">
                <span>{{ formatForecastDate(item.forecastDate) }}</span>
                <i v-if="getForecastIcon(item)" :class="'qi-' + getForecastIcon(item)" class="forecast-icon"></i>
                <strong>{{ item.weatherTextDay || item.weatherText || '--' }}</strong>
                <small>{{ item.tempMin ?? '--' }}° / {{ item.tempMax ?? '--' }}°</small>
              </div>
            </div>
          </div>
        </article>

        <article class="device-panel main-device module-devices">
          <div class="section-title realtime-device-header">
            <span></span>
            <div>
              <h2>实时设备</h2>
              <p>{{ currentParkName || '暂无庄园' }}设备最新运行状态</p>
            </div>
            <div class="realtime-status-summary">
              <span>总数 <strong>{{ deviceStatus.total }}</strong></span>
              <span class="online">在线 <strong>{{ deviceStatus.online }}</strong></span>
              <span class="offline">离线 <strong>{{ deviceStatus.offline }}</strong></span>
              <span>在线率 <strong>{{ onlineRate }}%</strong></span>
            </div>
          </div>

          <div v-if="realtimeDevices.length" class="device-list">
            <div v-for="device in realtimeDevices" :key="device.deviceId || device.deviceSn" class="device-row">
              <div class="device-meta">
                  <span class="device-dot" :class="{ offline: device.status !== '1' }"></span>
                <div>
                  <strong>{{ device.deviceName || device.deviceSn || '-' }}</strong>
                  <small>{{ device.productName || '未知设备类型' }} · {{ formatProductType(device.productType) }} · {{ device.updateTime || device.createTime || '-' }}</small>
                </div>
              </div>
              <div class="device-value">
                <b>{{ device.status === '1' ? '在线' : '离线' }}</b>
                <span>{{ device.deviceSn || '' }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">暂无设备数据</div>
        </article>

        <article class="chart-card monitor-panel module-monitor">
          <div class="card-header">
            <div>
              <h3>实时监测</h3>
              <p>{{ cameraDevices.length ? `摄像头 ${cameraDevices.length} 台，最新抓拍 ${cameraPictures.length} 张` : '当前园区暂无摄像头' }}</p>
            </div>
            <div class="monitor-actions">
              <el-select
                v-model="selectedCameraDeviceId"
                class="camera-select"
                placeholder="选择摄像头"
                size="small"
                filterable
                :disabled="cameraDevices.length === 0"
                @change="handleCameraChange"
              >
                <el-option
                  v-for="camera in cameraDevices"
                  :key="camera.deviceId || camera.id"
                  :label="camera.deviceName || camera.deviceSn"
                  :value="camera.deviceId || camera.id"
                />
              </el-select>
              <button class="mini-button" type="button" :disabled="!selectedCameraDevice" @click="galleryDrawerVisible = true">
                相册
              </button>
            </div>
          </div>

          <div v-if="selectedCameraDevice" class="monitor-body" v-loading="cameraVideoLoading">
            <div class="camera-live-box">
              <div ref="cameraVideoRef" id="perception-video-player" class="camera-video-player"></div>
              <div v-if="!cameraVideoReady && latestCameraPicture?.url" class="camera-video-fallback">
                <img :src="latestCameraPicture.url" alt="最新抓拍" />
                <span>在线视频加载中</span>
              </div>
              <div v-else-if="!cameraVideoReady" class="camera-video-empty">暂无在线视频</div>
              <div class="camera-live-info">
                <strong>{{ selectedCameraDevice.deviceName || selectedCameraDevice.deviceSn }}</strong>
                <span>{{ selectedCameraDevice.status === '1' ? '在线' : '离线' }} · {{ selectedCameraDevice.deviceSn || '-' }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">暂无摄像头设备</div>
        </article>

        <article class="device-panel device-type-share-panel module-device-types">
          <div class="card-header">
            <div>
              <h3>设备类型占比</h3>
              <p>按当前庄园设备类型统计</p>
            </div>
          </div>
          <div ref="pieChartRef" class="chart-canvas device-type-share-chart"></div>
        </article>
        <article class="chart-card module-weather-chart">
          <div class="card-header">
            <div>
              <h3>天气趋势图表</h3>
              <p>温度、湿度、降水等预报信息</p>
            </div>
            <div class="segmented-control">
              <button :class="{ active: forecastRange === 7 }" type="button" @click="switchForecastRange(7)">7天</button>
              <button :class="{ active: forecastRange === 15 }" type="button" @click="switchForecastRange(15)">15天</button>
            </div>
          </div>
          <div ref="sevenChartRef" class="chart-canvas"></div>
        </article>

        <article class="chart-card data-card module-collect">
          <div class="card-header">
            <div>
              <h3>数据采集趋势</h3>
              <p>设备日志与抓拍记录</p>
            </div>
          </div>
          <div ref="collectChartRef" class="chart-canvas"></div>
        </article>
        <article class="chart-card alert-panel module-alerts">
          <div class="card-header">
            <div>
              <h3>预警信息面板</h3>
              <p>{{ warningPanelType === 'weather' ? '天气预警' : '物联网设备预警' }}</p>
            </div>
            <div class="segmented-control">
              <button :class="{ active: warningPanelType === 'weather' }" type="button" @click="warningPanelType = 'weather'">天气</button>
              <button :class="{ active: warningPanelType === 'iot' }" type="button" @click="warningPanelType = 'iot'">设备</button>
            </div>
          </div>
          <div v-if="alertPanelRows.length" class="alert-list">
            <div v-for="alert in alertPanelRows" :key="alert.id" class="alert-row" :title="`${alert.name || ''} ${alert.desc || ''}`">
              <div>
                <strong>{{ alert.name }}</strong>
                <span>{{ alert.desc }}</span>
              </div>
              <b v-if="alert.label" :class="alert.level">{{ alert.label }}</b>
            </div>
          </div>
          <div v-else class="empty-state">暂无预警数据</div>
        </article>
        <article class="chart-card environment-panel module-environment">
          <div class="card-header">
            <div>
              <h3>环境指标趋势</h3>
              <p>{{ selectedTrendDeviceName }} · {{ numericModels.length ? `${numericModels.length} 项指标` : '暂无指标' }}</p>
            </div>
            <div class="device-selector-group">
              <el-select
                v-model="selectedAreaId"
                class="area-select"
                placeholder="选择地块"
                filterable
                :disabled="areaOptions.length === 0"
                @change="handleAreaChange"
              >
                <el-option
                  v-for="area in areaOptions"
                  :key="area.areaId"
                  :label="area.areaName"
                  :value="area.areaId"
                />
              </el-select>
              <el-select
                v-model="selectedLocationId"
                class="location-select"
                placeholder="选择位置"
                filterable
                :disabled="locationOptions.length === 0"
                @change="handleLocationChange"
              >
                <el-option
                  v-for="location in locationOptions"
                  :key="location.locationId"
                  :label="location.locationName"
                  :value="location.locationId"
                />
              </el-select>
              <el-select
                v-model="selectedTrendDeviceSn"
                class="trend-select"
                placeholder="选择设备"
                filterable
                :disabled="trendDeviceOptions.length === 0"
                @change="handleTrendDeviceChange"
              >
                <el-option
                  v-for="device in trendDeviceOptions"
                  :key="device.deviceSn"
                  :label="device.deviceName || device.deviceSn"
                  :value="device.deviceSn"
                />
              </el-select>
            </div>
          </div>
          <div ref="environmentChartRef" class="chart-canvas"></div>
        </article>
      </section>
    </main>

    <el-drawer
      v-model="parkReportDrawerVisible"
      :title="`园区设备数据报表 - ${currentParkName || '当前园区'}`"
      direction="rtl"
      size="50%"
      destroy-on-close
      @opened="handleParkReportOpened"
      @closed="handleParkReportClosed"
    >
      <div class="report-drawer-content" v-loading="parkReportLoading">
        <div v-if="Object.keys(parkReportData).length > 0" class="report-filter-bar">
          <span>全局时间筛选</span>
          <el-date-picker
            v-model="reportDateRange"
            value-format="YYYY-MM-DD HH:mm:ss"
            type="datetimerange"
            range-separator="-"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            size="small"
            @change="handleReportDateRangeChange"
          />
        </div>

        <el-empty v-if="Object.keys(parkReportData).length === 0 && !parkReportLoading" description="当前园区暂无可监测的数值属性设备" />

        <div v-else class="report-device-list">
          <article v-for="(devData, sn) in parkReportData" :key="sn" class="report-device-card">
            <div class="report-device-header">
              <div>
                <strong>{{ devData.deviceName }}</strong>
                <span>SN: {{ sn }} · {{ getProductName(devData.productId) }}</span>
              </div>
              <el-tag :type="devData.status === '1' ? 'success' : 'danger'" size="small">
                {{ devData.status === '1' ? '在线' : '离线' }}
              </el-tag>
            </div>

            <div v-loading="devData.loading">
              <div v-if="devData.numericModels.length === 0" class="empty-state compact">无监控数值属性</div>
              <template v-else>
                <div class="report-chart-row">
                  <div :ref="el => setReportChartRef(el, sn)" class="report-chart"></div>
                  <div class="report-stat-box">
                    <span>最新指标</span>
                    <div class="report-stat-list all-models">
                      <p v-for="stat in devData.seriesStats" :key="stat.key">
                        <span>{{ stat.name }}</span>
                        <b>{{ stat.latest }}{{ stat.unit }}</b>
                      </p>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </article>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="galleryDrawerVisible"
      :title="`抓拍相册 - ${selectedCameraDevice?.deviceName || selectedCameraDevice?.deviceSn || '摄像头'}`"
      direction="rtl"
      size="420px"
      destroy-on-close
    >
      <div class="gallery-drawer" v-loading="cameraPicturesLoading">
        <div v-if="cameraPictures.length" class="gallery-grid">
          <button
            v-for="(img, index) in cameraPictures"
            :key="img.id || img.recordId || index"
            type="button"
            class="gallery-item"
            @click="openCaptureViewer(index)"
          >
            <img v-if="img.url" :src="img.url" alt="抓拍图片" />
            <span>{{ formatDate(img.captureTime) }}</span>
          </button>
        </div>
        <el-empty v-else description="暂无抓拍相册" />
      </div>
    </el-drawer>

    <el-image-viewer
      v-if="captureViewerVisible"
      :url-list="capturePreviewList"
      :initial-index="captureViewerIndex"
      @close="captureViewerVisible = false"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import EZUIKit from 'ezuikit-js'
import { Camera, Connection, DataAnalysis, Refresh, Warning } from '@element-plus/icons-vue'
import { getUserProfile } from '@/api/system/user'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice, listDeviceLog } from '@/api/binZhou/ld/iot/device'
import { listProduct } from '@/api/binZhou/ld/iot/product'
import { listModel } from '@/api/binZhou/ld/iot/model'
import { listRecord } from '@/api/binZhou/ld/iot/record'
import { listWarnRecord } from '@/api/binZhou/ld/iot/warnRecord'
import { listWeatherLive } from '@/api/binZhou/ld/iot/weatherLive'
import { listWeatherForecast } from '@/api/binZhou/ld/iot/weatherForecast'
import { listWeatherWarn } from '@/api/binZhou/ld/iot/weatherWarn'
import { addDateRange, parseTime } from '@/utils/ruoyi'
import 'qweather-icons/font/qweather-icons.css'
const loading = ref(false)
const updateTime = ref('')
const isAdmin = ref(false)
const currentUserId = ref(null)
const currentUserParkId = ref(null)
const selectedParkId = ref(null)
const parkOptions = ref([])
const selectedAreaId = ref(null)
const selectedLocationId = ref(null)
const areaOptions = ref([])
const locationOptions = ref([])
const devices = ref([])
const allDevices = ref([])
const deviceLogs = ref([])
const selectedDeviceLogs = ref([])
const captureRecords = ref([])
const forecastList = ref([])
const warningRows = ref([])
const iotWarningRows = ref([])
const weatherWarningRows = ref([])
const productOptions = ref([])
const modelOptions = ref([])
const numericModels = ref([])
const selectedTrendDeviceSn = ref('')
const forecastRange = ref(7)
const warningPanelType = ref('weather')
const parkReportDrawerVisible = ref(false)
const parkReportLoading = ref(false)
const parkReportData = ref({})
const reportDateRange = ref([])
const selectedCameraDeviceId = ref(null)
const cameraPictures = ref([])
const cameraPicturesLoading = ref(false)
const cameraVideoRef = ref(null)
const cameraVideoLoading = ref(false)
const cameraVideoReady = ref(false)
const galleryDrawerVisible = ref(false)
const captureViewerVisible = ref(false)
const captureViewerIndex = ref(0)
let cameraVideoPlayer = null
let cameraVideoRequestSn = ''

const sevenChartRef = ref(null)
const pieChartRef = ref(null)
const collectChartRef = ref(null)
const environmentChartRef = ref(null)
let chartInstances = []
let chartResizeObserver = null
const reportChartRefs = {}
const reportChartInstances = {}
const chartColors = ['#2fb36f', '#7fbf3f', '#4a9fd8', '#f0aa3c', '#e7685d', '#8b7ad9', '#20b5a9', '#d88745']

const weatherInfo = ref({
  temperature: '--',
  humidity: '--',
  windDirection: '--',
  windScale: '--',
  precipitation: '--',
  weatherText: '',
  weatherCode: '',
  reportTime: ''
})

const totals = reactive({
  data: 0,
  images: 0,
  weather: 0,
  warnings: 0
})

const warningTotals = reactive({
  iot: 0,
  weather: 0
})

const currentParkName = computed(() => {
  const park = parkOptions.value.find(item => String(item.parkId) === String(selectedParkId.value))
  return park?.parkName || ''
})

const deviceStatus = computed(() => {
  const total = devices.value.length
  const online = devices.value.filter(item => item.status === '1').length
  return { total, online, offline: total - online }
})

const allDeviceStatus = computed(() => {
  const total = allDevices.value.length
  const online = allDevices.value.filter(item => item.status === '1').length
  return { total, online, offline: total - online }
})

const onlineRate = computed(() => {
  if (!deviceStatus.value.total) return 0
  return Math.round((deviceStatus.value.online / deviceStatus.value.total) * 100)
})

const realtimeDevices = computed(() => devices.value)

const sevenDayForecast = computed(() => forecastList.value.slice(0, 7))

const cameraDevices = computed(() => {
  return devices.value.filter(device => String(device.productId) === '4' && (device.deviceId || device.id))
})

const selectedCameraDevice = computed(() => {
  return cameraDevices.value.find(device => String(device.deviceId || device.id) === String(selectedCameraDeviceId.value)) || null
})

const latestCameraPicture = computed(() => cameraPictures.value[0] || null)

const capturePreviewList = computed(() => cameraPictures.value.map(item => item.url).filter(Boolean))

const trendDeviceOptions = computed(() => {
  return devices.value.filter(device => {
    const matchLocation = selectedLocationId.value ? String(device.locationId) === String(selectedLocationId.value) : false
    return matchLocation && device.productId != 4 && device.productId !== '4' && device.deviceSn
  })
})

const selectedTrendDeviceName = computed(() => {
  const device = devices.value.find(item => item.deviceSn === selectedTrendDeviceSn.value)
  return device?.deviceName || device?.deviceSn || '暂无设备'
})

const modelNameMap = computed(() => {
  const map = new Map()
  modelOptions.value.forEach(item => {
    const productKey = item.productId === null || item.productId === undefined ? 'all' : String(item.productId)
    if (item.identifier) {
      map.set(`${productKey}:${item.identifier}`, item.modelName || item.name || item.identifier)
      map.set(`all:${item.identifier}`, item.modelName || item.name || item.identifier)
    }
  })
  return map
})

const summaryCards = computed(() => [
  {
    label: '累计数据',
    value: formatNumber(totals.data),
    desc: `设备日志 ${formatNumber(totals.data)} 条`,
    icon: DataAnalysis,
    iconClass: 'mint'
  },
  {
    label: '拍摄图片',
    value: formatNumber(totals.images),
    desc: `抓拍记录 ${formatNumber(totals.images)} 张`,
    icon: Camera,
    iconClass: 'leaf'
  },
  {
    label: '设备总数',
    value: formatNumber(deviceStatus.value.total),
    desc: `在线 ${deviceStatus.value.online} 台，离线 ${deviceStatus.value.offline} 台`,
    icon: Connection,
    iconClass: 'blue'
  },
  {
    label: '预警记录',
    value: formatNumber(totals.warnings),
    desc: `传感器预警 ${formatNumber(warningTotals.iot)} 条，气象预警 ${formatNumber(warningTotals.weather)} 条`,
    icon: Warning,
    iconClass: 'gold'
  }
])

const currentWarningRows = computed(() => {
  return warningPanelType.value === 'weather' ? weatherWarningRows.value : iotWarningRows.value
})

const alertPanelRows = computed(() => currentWarningRows.value.slice(0, 8).map(item => ({
  id: item.id,
  name: warningPanelType.value === 'weather' ? item.time : `${item.name || item.type} · ${item.time}`,
  desc: item.title,
  label: item.label,
  level: item.level
})))

function getCommonParams(baseParams = {}) {
  const params = { ...baseParams }
  if (!isAdmin.value && currentUserId.value) {
    params.userId = currentUserId.value
  }
  return params
}

function formatNumber(value) {
  const num = Number(value || 0)
  if (num >= 10000) return `${(num / 10000).toFixed(num >= 100000 ? 1 : 2)}万`
  return num.toLocaleString()
}

function formatDate(value, pattern = '{m}-{d} {h}:{i}') {
  if (!value) return '--'
  return parseTime(value, pattern) || '--'
}

function getRows(res) {
  return res?.rows || res?.data || []
}

function getTotal(res) {
  return Number(res?.total ?? getRows(res).length ?? 0)
}

function resetWeather() {
  weatherInfo.value = {
    temperature: '--',
    humidity: '--',
    windDirection: '--',
    windScale: '--',
    precipitation: '--',
    weatherText: '',
    weatherCode: '',
    reportTime: ''
  }
}

async function initUserPermissions() {
  const userRes = await getUserProfile()
  const user = userRes.data || {}
  isAdmin.value = !!(user.admin || (user.roles && user.roles.some(role => role.roleKey === 'admin')))
  currentUserId.value = user.userId || null
  currentUserParkId.value = user.parkId || null
}

async function loadProducts() {
  const res = await listProduct({ pageNum: 1, pageSize: 999 })
  productOptions.value = getRows(res)
}

async function loadAllModels() {
  const res = await listModel({ pageNum: 1, pageSize: 2000 })
  modelOptions.value = getRows(res)
}

async function loadParks() {
  const res = await listPark(getCommonParams({ pageNum: 1, pageSize: 999 }))
  let rows = getRows(res)
  if (!isAdmin.value && currentUserParkId.value) {
    rows = rows.filter(item => String(item.parkId) === String(currentUserParkId.value))
  }
  parkOptions.value = rows
  if (!selectedParkId.value || !rows.some(item => String(item.parkId) === String(selectedParkId.value))) {
    selectedParkId.value = rows[0]?.parkId || null
  }
}

async function loadDashboard() {
  loading.value = true
  try {
    if (!selectedParkId.value) {
      await loadParks()
    }
    await Promise.all([
      loadDevices(),
      loadAllDevices()
    ])
    await loadAreaOptions()
    await prepareTrendDevice()
    await prepareCameraDevice()
    await Promise.all([
      loadCounts(),
      loadWeather(),
      loadWarnings()
    ])
    updateTime.value = parseTime(new Date(), '{m}-{d} {h}:{i}:{s}')
    await nextTick()
    renderCharts()
  } finally {
    loading.value = false
  }
}

async function handleParkChange() {
  selectedAreaId.value = null
  selectedLocationId.value = null
  selectedTrendDeviceSn.value = ''
  await loadDashboard()
}

async function loadDevices() {
  if (!selectedParkId.value) {
    devices.value = []
    return
  }
  const res = await listDevice(getCommonParams({
    parkId: selectedParkId.value,
    pageNum: 1,
    pageSize: 9999,
    orderByColumn: 'updateTime',
    isAsc: 'desc'
  }))
  devices.value = getRows(res).map(device => ({
    ...device,
    productName: getProductName(device.productId),
    productType: device.productType ?? getProductType(device.productId)
  }))
}

async function loadAllDevices() {
  const baseParams = {
    pageNum: 1,
    pageSize: 9999,
    orderByColumn: 'updateTime',
    isAsc: 'desc'
  }
  const res = await listDevice(getCommonParams(baseParams))
  let rows = getRows(res)
  if (!isAdmin.value && parkOptions.value.length) {
    const visibleParkIds = new Set(parkOptions.value.map(item => String(item.parkId)))
    rows = rows.filter(item => visibleParkIds.has(String(item.parkId)))
  }
  allDevices.value = rows.map(device => ({
    ...device,
    productName: getProductName(device.productId),
    productType: device.productType ?? getProductType(device.productId)
  }))
}

async function loadAreaOptions() {
  if (!selectedParkId.value) {
    areaOptions.value = []
    locationOptions.value = []
    selectedAreaId.value = null
    selectedLocationId.value = null
    return
  }
  const res = await listAreaByParkId(selectedParkId.value)
  areaOptions.value = getRows(res)
  if (!selectedAreaId.value || !areaOptions.value.some(item => String(item.areaId) === String(selectedAreaId.value))) {
    selectedAreaId.value = areaOptions.value[0]?.areaId || null
  }
  await loadLocationOptions()
}

async function loadLocationOptions() {
  if (!selectedAreaId.value) {
    locationOptions.value = []
    selectedLocationId.value = null
    return
  }
  const res = await listLocationByAreaId(selectedAreaId.value)
  locationOptions.value = getRows(res)
  if (!selectedLocationId.value || !locationOptions.value.some(item => String(item.locationId) === String(selectedLocationId.value))) {
    selectedLocationId.value = locationOptions.value[0]?.locationId || null
  }
}

async function handleAreaChange() {
  selectedLocationId.value = null
  selectedTrendDeviceSn.value = ''
  await loadLocationOptions()
  await prepareTrendDevice()
  renderEnvironmentChart()
}

async function handleLocationChange() {
  selectedTrendDeviceSn.value = ''
  await prepareTrendDevice()
  renderEnvironmentChart()
}

function getProductName(productId) {
  const product = productOptions.value.find(item => String(item.productId) === String(productId))
  return product?.productName || product?.name || (productId ? `产品${productId}` : '未知设备类型')
}

function getProductType(productId) {
  const product = productOptions.value.find(item => String(item.productId) === String(productId))
  return product?.type
}

function formatProductType(type) {
  if (String(type) === '0') return '采集终端'
  if (String(type) === '1') return '控制终端'
  return '未知类型'
}

async function prepareTrendDevice() {
  const options = trendDeviceOptions.value
  if (!options.length) {
    selectedTrendDeviceSn.value = ''
    numericModels.value = []
    selectedDeviceLogs.value = []
    return
  }
  if (!selectedTrendDeviceSn.value || !options.some(device => device.deviceSn === selectedTrendDeviceSn.value)) {
    selectedTrendDeviceSn.value = options[0].deviceSn
  }
  await handleTrendDeviceChange(selectedTrendDeviceSn.value)
}

async function handleTrendDeviceChange(deviceSn) {
  const device = devices.value.find(item => item.deviceSn === deviceSn)
  if (!device) {
    numericModels.value = []
    selectedDeviceLogs.value = []
    renderEnvironmentChart()
    return
  }
  const recentSevenDayRange = getRecentSevenDayRange()
  const [modelRes, logRes] = await Promise.all([
    device.productId ? listModel({ productId: device.productId, pageNum: 1, pageSize: 200 }) : Promise.resolve({ rows: [] }),
    listDeviceLog(addDateRange({
      deviceSn,
      pageNum: 1,
      pageSize: 1000,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    }, recentSevenDayRange))
  ])
  numericModels.value = getRows(modelRes).filter(model => {
    return ['int', 'float', 'double', 'number'].includes(String(model.type || '').toLowerCase()) && String(model.isMonitor ?? '1') !== '0'
  })
  selectedDeviceLogs.value = getRows(logRes)
    .slice()
    .sort((a, b) => getLogTimeValue(a?.createTime) - getLogTimeValue(b?.createTime))
  await nextTick()
  renderEnvironmentChart()
}

async function loadCounts() {
  if (!selectedParkId.value) {
    totals.data = 0
    totals.images = 0
    totals.weather = 0
    deviceLogs.value = []
    captureRecords.value = []
    return
  }

  const forecastParams = {
    parkId: selectedParkId.value,
    pageNum: 1,
    pageSize: 15,
    orderByColumn: 'forecastDate',
    isAsc: 'asc',
    params: { latest: 'true' }
  }

  const [logResult, recordResult, forecastRes] = await Promise.all([
    loadDeviceLogSummary(),
    loadCaptureSummary(),
    listWeatherForecast(forecastParams)
  ])
  totals.data = logResult.total
  totals.images = recordResult.total
  totals.weather = getTotal(forecastRes)
  deviceLogs.value = logResult.rows
  captureRecords.value = recordResult.rows
  forecastList.value = getRows(forecastRes)
}

async function loadDeviceLogSummary() {
  if (!devices.value.length) return { total: 0, rows: [] }
  const requests = devices.value
    .filter(device => device.deviceSn)
    .map(device => listDeviceLog({
      deviceSn: device.deviceSn,
      pageNum: 1,
      pageSize: 30,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    }))
  const results = await Promise.allSettled(requests)
  return mergePagedResults(results, 'createTime', 300)
}

async function loadCaptureSummary() {
  if (!devices.value.length) return { total: 0, rows: [] }
  const requests = devices.value
    .filter(device => device.deviceId)
    .map(device => listRecord(getCommonParams({
      deviceId: device.deviceId,
      pageNum: 1,
      pageSize: 30,
      orderByColumn: 'captureTime',
      isAsc: 'desc'
    })))
  const results = await Promise.allSettled(requests)
  return mergePagedResults(results, 'captureTime', 300)
}

async function prepareCameraDevice() {
  const options = cameraDevices.value
  if (!options.length) {
    selectedCameraDeviceId.value = null
    cameraPictures.value = []
    destroyCameraVideo()
    return
  }
  if (!selectedCameraDeviceId.value || !options.some(device => String(device.deviceId || device.id) === String(selectedCameraDeviceId.value))) {
    selectedCameraDeviceId.value = options[0].deviceId || options[0].id
  }
  await loadCameraPictures(selectedCameraDeviceId.value)
  await nextTick()
  initCameraVideo(selectedCameraDevice.value?.deviceSn)
}

async function handleCameraChange(deviceId) {
  await loadCameraPictures(deviceId)
  await nextTick()
  initCameraVideo(selectedCameraDevice.value?.deviceSn)
}

async function loadCameraPictures(deviceId) {
  if (!deviceId) {
    cameraPictures.value = []
    return
  }
  cameraPicturesLoading.value = true
  try {
    const res = await listRecord(getCommonParams({
      deviceId,
      pageNum: 1,
      pageSize: 30,
      orderByColumn: 'captureTime',
      isAsc: 'desc'
    }))
    cameraPictures.value = getRows(res)
  } finally {
    cameraPicturesLoading.value = false
  }
}

function openCaptureViewer(index) {
  if (!capturePreviewList.value.length) return
  captureViewerIndex.value = index
  captureViewerVisible.value = true
}

const ys7Config = {
  appKey: '1e1a8eacfdbe4f6597c7d516085f0f7b',
  appSecret: 'e2a6b0c19c8cdcb671cb532e71a665c9',
  channelNo: 1
}

function destroyCameraVideo() {
  cameraVideoRequestSn = ''
  cameraVideoReady.value = false
  if (cameraVideoPlayer) {
    try {
      if (typeof cameraVideoPlayer.destroy === 'function') {
        cameraVideoPlayer.destroy()
      } else if (typeof cameraVideoPlayer.stop === 'function') {
        cameraVideoPlayer.stop()
      }
    } catch (error) {
      console.warn('销毁摄像头播放器失败', error)
    }
    cameraVideoPlayer = null
  }
  if (cameraVideoRef.value) {
    cameraVideoRef.value.innerHTML = ''
  }
}

async function initCameraVideo(deviceSn) {
  if (!deviceSn || !cameraVideoRef.value) {
    destroyCameraVideo()
    return
  }
  if (!EZUIKit?.EZUIKitPlayer) {
    cameraVideoReady.value = false
    return
  }

  destroyCameraVideo()
  cameraVideoRequestSn = deviceSn
  cameraVideoLoading.value = true
  try {
    const response = await fetch('https://open.ys7.com/api/lapp/token/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `appKey=${ys7Config.appKey}&appSecret=${ys7Config.appSecret}`
    })
    const data = await response.json()
    if (cameraVideoRequestSn !== deviceSn || data.code !== '200') return

    await nextTick()
    const container = cameraVideoRef.value
    if (!container) return
    const width = container.clientWidth || 520
    const height = container.clientHeight || 190
    cameraVideoPlayer = new EZUIKit.EZUIKitPlayer({
      id: 'perception-video-player',
      accessToken: data.data.accessToken,
      url: `ezopen://open.ys7.com/${deviceSn}/${ys7Config.channelNo}.hd.live`,
      template: 'pcLive',
      autoplay: true,
      audio: 1,
      width,
      height,
      handleError: error => console.warn('摄像头视频错误', error),
      onError: error => console.warn('摄像头视频错误', error)
    })
    cameraVideoReady.value = true
  } catch (error) {
    cameraVideoReady.value = false
    console.warn('加载摄像头在线视频失败', error)
  } finally {
    cameraVideoLoading.value = false
  }
}

function mergePagedResults(results, timeField, maxRows) {
  const merged = results.reduce((acc, result) => {
    if (result.status !== 'fulfilled') return acc
    const response = result.value
    acc.total += getTotal(response)
    acc.rows.push(...getRows(response))
    return acc
  }, { total: 0, rows: [] })
  merged.rows = merged.rows
    .sort((a, b) => new Date(b[timeField] || 0).getTime() - new Date(a[timeField] || 0).getTime())
    .slice(0, maxRows)
  return merged
}

async function loadWeather() {
  if (!selectedParkId.value) {
    resetWeather()
    return
  }
  const res = await listWeatherLive({
    parkId: selectedParkId.value,
    pageNum: 1,
    pageSize: 1,
    orderByColumn: 'reportTime',
    isAsc: 'desc'
  })
  const live = getRows(res)[0]
  if (!live) {
    resetWeather()
    return
  }
  weatherInfo.value = {
    temperature: live.temperature ?? '--',
    humidity: live.humidity ?? '--',
    windDirection: live.windDirection ?? '--',
    windScale: live.windScale ?? '--',
    precipitation: live.precipitation ?? '--',
    weatherText: live.weatherText || '',
    weatherCode: live.weatherCode || live.icon || live.nowIcon || '',
    reportTime: formatDate(live.fetchTime || live.reportTime || live.createTime)
  }
}

async function loadWarnings() {
  if (!selectedParkId.value) {
    warningRows.value = []
    iotWarningRows.value = []
    weatherWarningRows.value = []
    warningTotals.iot = 0
    warningTotals.weather = 0
    totals.warnings = 0
    return
  }

  const [iotRes, weatherRes] = await Promise.all([
    listWarnRecord({
      parkId: selectedParkId.value,
      pageNum: 1,
      pageSize: 30,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    }),
    listWeatherWarn({
      parkId: selectedParkId.value,
      pageNum: 1,
      pageSize: 30,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    })
  ])

  const iotRows = getRows(iotRes).map(item => {
    const payloadText = getAlertPayloadText(item)
    const actualValue = item.actualValue ?? item.actual_value ?? ''
    const valueText = actualValue !== '' && actualValue !== null && actualValue !== undefined ? `预警值：${actualValue}` : ''
    return {
      id: `iot_${item.id}`,
      rawTime: item.createTime,
      type: '物联预警',
      title: [valueText, payloadText, item.alertAdvice].filter(Boolean).join(' · ') || '设备触发预警',
      time: formatDate(item.createTime),
      name: [item.productName, getAlertDeviceName(item)].filter(Boolean).join(' · ') || getAlertDeviceName(item) || item.productName || '设备预警',
      label: '',
      level: 'low'
    }
  })
  const weatherRows = getRows(weatherRes).map(item => {
    const rawAlertLevel = item.alert_level ?? item.alertLevel ?? item.alertLevelName ?? ''
    const level = getWeatherWarningLevel(rawAlertLevel)
    const anomalyInfo = item.anomalyInfo || item.anomaly_info || item.anomaly || ''
    const title = [anomalyInfo, item.alertAdvice].filter(Boolean).join('；') || '气象风险预警'
    return {
      id: `weather_${item.id}`,
      rawTime: item.createTime,
      type: '',
      title,
      time: formatDate(item.createTime),
      label: rawAlertLevel || level.label,
      level: level.className
    }
  })

  const combined = [...iotRows, ...weatherRows].sort((a, b) => {
    return new Date(b.rawTime || 0).getTime() - new Date(a.rawTime || 0).getTime()
  })
  warningTotals.iot = getTotal(iotRes)
  warningTotals.weather = getTotal(weatherRes)
  totals.warnings = warningTotals.iot + warningTotals.weather
  iotWarningRows.value = iotRows
  weatherWarningRows.value = weatherRows
  warningRows.value = combined
}

function getIotWarningLevel(levelConfigId) {
  const level = String(levelConfigId || '')
  if (level === '3') return { className: 'high', label: '高' }
  if (level === '2') return { className: 'medium', label: '中' }
  return { className: 'low', label: '低' }
}

function getWeatherWarningLevel(alertLevel) {
  const level = String(alertLevel || '')
  if (level.includes('红') || level === '1' || level === '3') return { className: 'high', label: level || '--' }
  if (level.includes('橙') || level.includes('黄') || level === '2') return { className: 'medium', label: level || '--' }
  return { className: 'low', label: level || '--' }
}

function openParkReportDrawer() {
  if (!selectedParkId.value) return
  parkReportDrawerVisible.value = true
}

function setReportChartRef(el, sn) {
  if (el) {
    reportChartRefs[sn] = el
  }
}

async function handleParkReportOpened() {
  parkReportLoading.value = true
  parkReportData.value = {}
  disposeReportCharts()

  try {
    const reportDevices = devices.value.filter(device => {
      return device.deviceSn && device.productId != 4 && device.productId !== '4'
    })

    reportDevices.forEach(device => {
      parkReportData.value[device.deviceSn] = createReportDeviceState(device)
    })

    await nextTick()
    await Promise.allSettled(reportDevices.map(device => loadReportDeviceData(device)))
    await nextTick()
    resizeReportCharts()
  } finally {
    parkReportLoading.value = false
  }
}

function createReportDeviceState(device) {
  return {
    loading: true,
    deviceName: device.deviceName || device.deviceSn,
    deviceSn: device.deviceSn,
    productId: device.productId,
    status: device.status,
    numericModels: [],
    xData: [],
    series: [],
    seriesStats: [],
    logs: []
  }
}

async function loadReportDeviceData(device) {
  const sn = device.deviceSn
  const devData = parkReportData.value[sn]
  if (!devData) return

  try {
    if (!device.productId) return
    const modelRes = await listModel({ productId: device.productId, pageNum: 1, pageSize: 100 })
    devData.numericModels = getRows(modelRes).filter(model => {
      return ['int', 'float', 'double', 'number'].includes(String(model.type || '').toLowerCase()) && String(model.isMonitor ?? '1') !== '0'
    })
    if (!devData.numericModels.length) return

    const queryParams = addDateRange({
      deviceSn: sn,
      pageNum: 1,
      pageSize: 100,
      orderByColumn: 'createTime',
      isAsc: 'asc'
    }, reportDateRange.value)
    const logRes = await listDeviceLog(queryParams)
    devData.logs = getRows(logRes)
    updateReportDeviceSeries(sn)
    await nextTick()
    renderReportDeviceChart(sn)
  } finally {
    devData.loading = false
  }
}

function updateReportDeviceSeries(sn) {
  const data = parkReportData.value[sn]
  if (!data) return

  data.xData = data.logs.map(log => formatDate(log.createTime))
  data.series = data.numericModels.map((model, index) => {
    const key = model.identifier
    const unit = getModelUnit(model)
    const values = data.logs.map(log => {
      const payload = normalizePayload(log.payload)
      return getPayloadValue(payload, [key])
    })
    const numbers = values.map(Number).filter(item => !Number.isNaN(item))
    const latest = [...values].reverse().find(value => value !== null)
    data.seriesStats[index] = {
      key,
      name: model.modelName || model.name || key,
      unit,
      latest: latest ?? '-',
      max: numbers.length ? Math.max(...numbers) : '-',
      min: numbers.length ? Math.min(...numbers) : '-',
      avg: numbers.length ? (numbers.reduce((sum, item) => sum + item, 0) / numbers.length).toFixed(2) : '-'
    }
    return {
      name: model.modelName || model.name || key,
      data: values,
      area: index === 0
    }
  }).filter(item => item.data.some(value => value !== null))
  data.seriesStats = data.seriesStats.filter(item => item)
}

function buildModelSeries(models, logs) {
  const xData = logs.map(log => formatDate(log.createTime))
  const series = models.map((model, index) => {
    const values = logs.map(log => {
      const payload = normalizePayload(log.payload)
      return getPayloadValue(payload, [model.identifier])
    })
    return {
      name: model.modelName || model.name || model.identifier,
      unit: getModelUnit(model),
      data: values,
      area: index === 0
    }
  }).filter(item => item.data.some(value => value !== null))
  return { xData, series }
}

function hasAnySeriesData(series) {
  return series.some(item => item.data.some(value => value !== null && value !== undefined))
}

function getSeriesTooltipUnit(models, seriesName) {
  const model = models.find(item => (item.modelName || item.name || item.identifier) === seriesName)
  return getModelUnit(model)
}

function getValidLogRows(logs, models) {
  if (!models.length) return []
  return logs.filter(log => {
    const payload = normalizePayload(log.payload)
    return models.some(model => getPayloadValue(payload, [model.identifier]) !== null)
  })
}

function renderReportDeviceChart(sn) {
  const data = parkReportData.value[sn]
  const el = reportChartRefs[sn]
  if (!data || !el) return

  if (reportChartInstances[sn]) {
    reportChartInstances[sn].dispose()
  }
  const chart = echarts.init(el)
  reportChartInstances[sn] = chart

  if (!data.xData.length || !hasAnySeriesData(data.series)) {
    chart.setOption(emptyOption(), true)
    return
  }

  chart.setOption({
    color: chartColors,
    tooltip: {
      trigger: 'axis',
      valueFormatter: value => value === null || value === undefined ? '--' : value
    },
    legend: {
      top: 0,
      right: 8,
      type: 'scroll',
      textStyle: { color: '#4d6b5a' }
    },
    grid: { top: 42, left: 38, right: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.xData,
      boundaryGap: false,
      axisLabel: { color: '#63836f', fontSize: 10, hideOverlap: true },
      axisLine: { lineStyle: { color: '#d8eadf' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      nameTextStyle: { color: '#63836f' },
      axisLabel: { color: '#63836f' },
      splitLine: { lineStyle: { color: '#edf5ef' } }
    },
    series: data.series.map(item => ({
      ...item,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2 },
      connectNulls: true,
      areaStyle: item.area ? { opacity: 0.1 } : undefined
    }))
  }, true)
}

async function handleReportDateRangeChange() {
  parkReportLoading.value = true
  try {
    const reportDevices = devices.value.filter(device => parkReportData.value[device.deviceSn])
    await Promise.all(reportDevices.map(async device => {
      const data = parkReportData.value[device.deviceSn]
      if (!data?.numericModels.length) return
      data.loading = true
      try {
        const queryParams = addDateRange({
          deviceSn: device.deviceSn,
          pageNum: 1,
          pageSize: 100,
          orderByColumn: 'createTime',
          isAsc: 'asc'
        }, reportDateRange.value)
        const logRes = await listDeviceLog(queryParams)
        data.logs = getRows(logRes)
        updateReportDeviceSeries(device.deviceSn)
        await nextTick()
        renderReportDeviceChart(device.deviceSn)
      } finally {
        data.loading = false
      }
    }))
  } finally {
    parkReportLoading.value = false
  }
}

function disposeReportCharts() {
  Object.keys(reportChartInstances).forEach(sn => {
    reportChartInstances[sn]?.dispose()
    delete reportChartInstances[sn]
  })
  Object.keys(reportChartRefs).forEach(sn => {
    delete reportChartRefs[sn]
  })
}

function resizeReportCharts() {
  Object.values(reportChartInstances).forEach(chart => chart?.resize())
}

function handleParkReportClosed() {
  disposeReportCharts()
  parkReportData.value = {}
  reportDateRange.value = []
}

function ensureCharts() {
  const refs = [sevenChartRef, pieChartRef, collectChartRef, environmentChartRef]
  const chartElements = refs.map(item => item.value)
  const bindingsMatch = chartInstances.length === refs.length && chartInstances.every((chart, index) => {
    return (!chart && !chartElements[index]) || chart?.getDom() === chartElements[index]
  })
  if (bindingsMatch) return
  chartInstances.forEach(chart => chart?.dispose())
  chartInstances = chartElements.map(element => element ? echarts.init(element) : null)
}

function renderCharts() {
  ensureCharts()
  renderForecastChart(chartInstances[0], forecastList.value.slice(0, forecastRange.value))
  renderPieChart()
  renderCollectChart()
  renderEnvironmentChart()
  requestAnimationFrame(() => chartInstances.forEach(chart => chart?.resize()))
}

function switchForecastRange(range) {
  forecastRange.value = range
  renderForecastChart(chartInstances[0], forecastList.value.slice(0, forecastRange.value))
}

function emptyOption(text = '暂无数据') {
  return {
    title: {
      text,
      left: 'center',
      top: 'center',
      textStyle: { color: '#6f8b78', fontSize: 14, fontWeight: 'normal' }
    },
    xAxis: { show: false },
    yAxis: { show: false },
    series: []
  }
}

function formatChartAxisNumber(value) {
  const num = Number(value)
  if (Number.isNaN(num)) return value
  const abs = Math.abs(num)
  if (abs >= 10000) return `${(num / 10000).toFixed(abs >= 100000 ? 0 : 1)}万`
  if (abs >= 1000) return `${(num / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return Number.isInteger(num) ? String(num) : Number(num.toFixed(2))
}

function baseLineOption({ xData, legend, series, grid, xAxisLabel, yAxisLabel, xAxisBoundaryGap = false }) {
  const unitMap = series.reduce((acc, item) => {
    acc[item.name] = item.unit || ''
    return acc
  }, {})
  return {
    color: chartColors,
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const rows = Array.isArray(params) ? params : [params]
        const title = rows[0]?.axisValue || rows[0]?.axisValueLabel || rows[0]?.name || ''
        const content = rows.map(item => {
          const unit = unitMap[item.seriesName] || ''
          const value = item.value === null || item.value === undefined ? '--' : item.value
          return `${item.marker}${item.seriesName}：${value}${unit}`
        }).join('<br/>')
        return `${title}<br/>${content}`
      }
    },
    legend: {
      top: 0,
      right: 8,
      type: 'scroll',
      data: legend,
      textStyle: { color: '#4d6b5a' },
      formatter: name => unitMap[name] ? `${name}（${unitMap[name]}）` : name
    },
    grid: grid || { top: 36, left: 8, right: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: xAxisBoundaryGap,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d8eadf' } },
      axisLabel: {
        color: '#4d6b5a',
        ...(xAxisLabel || {})
      }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#edf5ef' } },
      axisLabel: { color: '#4d6b5a', ...(yAxisLabel || {}) }
    },
    series: series.map(item => ({
      ...item,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 3 },
      connectNulls: true,
      areaStyle: item.area ? { opacity: 0.12 } : undefined
    }))
  }
}

function renderForecastChart(chart, rows) {
  if (!chart) return
  const validRows = rows.filter(item => item.forecastDate)
  if (!validRows.length) {
    chart.setOption(emptyOption(), true)
    return
  }
  chart.setOption(baseLineOption({
    xData: validRows.map(item => formatForecastDate(item.forecastDate)),
    legend: ['最高温', '最低温', '湿度', '降水量'],
    grid: { top: 36, left: 8, right: 14, bottom: 8, containLabel: true },
    xAxisBoundaryGap: true,
    xAxisLabel: {
      showMinLabel: true,
      showMaxLabel: true,
      hideOverlap: true,
      margin: 8
    },
    series: [
      { name: '最高温', unit: '℃', data: validRows.map(item => Number(item.tempMax ?? 0)), area: true },
      { name: '最低温', unit: '℃', data: validRows.map(item => Number(item.tempMin ?? 0)) },
      { name: '湿度', unit: '%', data: validRows.map(item => getForecastNumber(item, ['humidity', 'humidityAvg', 'relativeHumidity'])) },
      { name: '降水量', unit: 'mm', data: validRows.map(item => getForecastNumber(item, ['precip_total', 'precipTotal', 'precipitation', 'precip'])) }
    ]
  }), true)
}

function renderPieChart() {
  const chart = chartInstances[1]
  if (!chart) return
  const groups = new Map()
  devices.value.forEach(device => {
    const name = getProductName(device.productId)
    groups.set(name, (groups.get(name) || 0) + 1)
  })
  const data = Array.from(groups.entries()).map(([name, value]) => ({ name, value }))
  if (!data.length) {
    chart.setOption(emptyOption(), true)
    return
  }
  const total = data.reduce((sum, row) => sum + row.value, 0)
  chart.setOption({
    color: ['#2fb36f', '#7fbf3f', '#4a9fd8', '#f0aa3c', '#e7685d'],
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>设备数：{c}<br/>占比：{d}%'
    },
    legend: {
      show: true,
      type: 'scroll',
      orient: 'vertical',
      left: '48%',
      right: 2,
      top: 'middle',
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 10,
      textStyle: {
        color: '#26352c',
        fontSize: 12,
        rich: {
          name: {
            width: 96,
            color: '#26352c',
            fontSize: 12,
            overflow: 'truncate',
            ellipsis: '...'
          },
          stats: {
            width: 76,
            color: '#26352c',
            fontSize: 12,
            align: 'right'
          }
        }
      },
      pageTextStyle: { color: '#26352c' },
      formatter: name => {
        const item = data.find(row => row.name === name)
        const rate = total && item ? Math.round(item.value / total * 100) : 0
        return `{name|${name}}{stats|${item?.value || 0}台  ${rate}%}`
      }
    },
    series: [{
      name: '设备类型',
      type: 'pie',
      radius: ['40%', '67%'],
      center: ['24%', '50%'],
      label: { show: false },
      labelLine: { show: false },
      data
    }]
  }, true)
}

function renderCollectChart() {
  const chart = chartInstances[2]
  if (!chart) return
  const logDaily = groupByDate(deviceLogs.value, 'createTime')
  const imageDaily = groupByDate(captureRecords.value, 'captureTime')
  const xData = Array.from(new Set([...Object.keys(logDaily), ...Object.keys(imageDaily)])).sort()
  if (!xData.length) {
    chart.setOption(emptyOption(), true)
    return
  }
  chart.setOption(baseLineOption({
    xData,
    legend: ['设备日志', '拍摄图片'],
    grid: { top: 36, left: 8, right: 14, bottom: 8, containLabel: true },
    xAxisBoundaryGap: true,
    xAxisLabel: {
      showMinLabel: true,
      showMaxLabel: true,
      hideOverlap: true,
      margin: 8
    },
    series: [
      { name: '设备日志', data: xData.map(day => logDaily[day] || 0), area: true },
      { name: '拍摄图片', data: xData.map(day => imageDaily[day] || 0) }
    ]
  }), true)
}

function renderEnvironmentChart() {
  const chart = chartInstances[3]
  if (!chart) return
  const rows = getValidLogRows(selectedDeviceLogs.value.slice(), numericModels.value)
    .sort((a, b) => getLogTimeValue(a?.createTime) - getLogTimeValue(b?.createTime))
  if (!numericModels.value.length || !rows.length) {
    chart.setOption(emptyOption(), true)
    return
  }
  const { xData, series } = buildModelSeries(numericModels.value, rows)

  if (!hasAnySeriesData(series)) {
    chart.setOption(emptyOption(), true)
    return
  }
  chart.setOption(baseLineOption({
    xData,
    legend: series.map(item => item.name),
    series,
    grid: { top: 38, left: 8, right: 8, bottom: 4, containLabel: true },
    xAxisBoundaryGap: true,
    xAxisLabel: {
      fontSize: 10,
      hideOverlap: true,
      showMinLabel: true,
      showMaxLabel: true,
      margin: 8,
      lineHeight: 14,
      formatter: value => String(value || '').replace(' ', '\n')
    },
    yAxisLabel: {
      formatter: value => formatChartAxisNumber(value)
    }
  }), true)
}

function getLogTimeValue(value) {
  if (!value) return 0
  const timestamp = new Date(String(value).replace(/-/g, '/')).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getRecentSevenDayRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return [formatLocalDateTime(start), formatLocalDateTime(end)]
}

function formatLocalDateTime(date) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function groupByDate(rows, field) {
  return rows.reduce((acc, item) => {
    const key = parseTime(item[field], '{m}-{d}') || '--'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function normalizePayload(payload) {
  if (!payload) return {}
  if (typeof payload === 'object') return payload
  try {
    return JSON.parse(payload)
  } catch (e) {
    return {}
  }
}

function getPayloadSource(payload) {
  const parsed = normalizePayload(payload)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed.params || parsed.properties || parsed.data || parsed
  }
  return {}
}

function getAlertPayloadItems(row) {
  const source = getPayloadSource(row.payload)
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []
  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && value !== '' && typeof value !== 'object')
    .map(([key, value]) => ({
      key,
      label: getModelDisplayName(row.productId, key),
      value: formatPayloadValue(value)
    }))
}

function getAlertPayloadText(row) {
  return getAlertPayloadItems(row).map(item => `${item.label}: ${item.value}`).join(', ')
}

function getAlertDeviceName(row) {
  if (row.deviceName) return row.deviceName
  const device = devices.value.find(item => item.deviceSn && String(item.deviceSn) === String(row.deviceSn))
  return device?.deviceName || row.deviceSn || ''
}

function getModelDisplayName(productId, identifier) {
  const productKey = productId === null || productId === undefined ? 'all' : String(productId)
  return modelNameMap.value.get(`${productKey}:${identifier}`) || modelNameMap.value.get(`all:${identifier}`) || identifier
}

function formatPayloadValue(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
  return String(value)
}

function getPayloadValue(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key]
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      return Number.isNaN(num) ? null : num
    }
  }
  return null
}

function getForecastNumber(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      return Number.isNaN(num) ? null : num
    }
  }
  return null
}

function getForecastIcon(item) {
  return item?.dayCode || item?.weatherCodeDay || item?.weatherCode || item?.iconDay || item?.icon || ''
}

function getModelUnit(model) {
  const directUnit = model?.unit ?? model?.modelUnit ?? model?.unitName
  if (directUnit) return typeof directUnit === 'object' ? (directUnit.symbol || directUnit.name || '') : directUnit
  if (!model?.specs) return ''
  try {
    const specs = typeof model.specs === 'string' ? JSON.parse(model.specs) : model.specs
    const unit = specs?.unit ?? specs?.unitName
    return typeof unit === 'object' ? (unit.symbol || unit.name || '') : (unit || '')
  } catch (e) {
    return ''
  }
}

function formatForecastDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return String(dateStr)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function handleResize() {
  chartInstances.forEach(chart => chart?.resize())
  resizeReportCharts()
}

function observeChartContainers() {
  chartResizeObserver?.disconnect()
  if (typeof ResizeObserver === 'undefined') return

  chartResizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
      chartInstances.find(chart => chart?.getDom() === entry.target)?.resize()
    })
  })
  const observedChartRefs = [sevenChartRef, pieChartRef, collectChartRef, environmentChartRef]
  observedChartRefs.forEach(item => {
    if (item.value) chartResizeObserver.observe(item.value)
  })
}

onMounted(async () => {
  await nextTick()
  ensureCharts()
  observeChartContainers()
  window.addEventListener('resize', handleResize)
  loading.value = true
  try {
    await initUserPermissions()
    await Promise.all([loadProducts(), loadAllModels()])
    await loadParks()
    await loadDashboard()
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartResizeObserver?.disconnect()
  chartResizeObserver = null
  destroyCameraVideo()
  chartInstances.forEach(chart => chart?.dispose())
  disposeReportCharts()
  chartInstances = []
})
</script>

<style scoped>
.iot-perception-page {
  --panel-padding: 12px;
  min-height: 100vh;
  color: #163926;
  background:
    linear-gradient(180deg, rgba(226, 246, 232, 0.92), rgba(247, 252, 247, 0.98)),
    radial-gradient(circle at 18% 0%, rgba(151, 216, 151, 0.28), transparent 32%),
    #f4fbf5;
}

.top-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(89, 150, 105, 0.18);
  background: linear-gradient(90deg, rgba(226, 246, 232, 0.96), rgba(246, 252, 244, 0.9));
  box-shadow: 0 10px 26px rgba(42, 92, 58, 0.08);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.global-device-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(64, 142, 86, 0.18);
  border-radius: 5px;
  color: #237548;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(229, 246, 234, 0.78));
  box-shadow: 0 8px 18px rgba(44, 108, 64, 0.08);
}

.global-device-stat span,
.global-device-stat small {
  color: #63836f;
  font-size: 13px;
}

.global-device-stat strong {
  color: #123c25;
  font-size: 20px;
  line-height: 1;
}

.park-select {
  width: 240px;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(64, 142, 86, 0.28);
  border-radius: 5px;
  color: #237548;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 8px 18px rgba(44, 108, 64, 0.1);
  cursor: pointer;
}

.refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.update-text {
  color: #63836f;
  font-size: 13px;
}

.dashboard-main {
  width: calc(100% - 16px);
  max-width: 100%;
  margin: 0 auto;
  padding: 10px 0 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-card,
.device-panel,
.chart-card {
  border: 1px solid rgba(86, 154, 101, 0.16);
  border-radius: 5px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(236, 249, 239, 0.88));
  box-shadow: 0 14px 32px rgba(37, 94, 53, 0.12);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 86px;
  padding: var(--panel-padding);
}

.summary-icon {
  display: grid;
  place-items: center;
  height: 46px;
  width: 46px;
  border-radius: 5px;
  color: #fff;
  font-size: 22px;
  background: linear-gradient(135deg, #37b46b, #7fcf78);
}

.summary-icon.leaf { background: linear-gradient(135deg, #609f3a, #b8d963); }
.summary-icon.blue { background: linear-gradient(135deg, #3d9fc0, #7fd2cb); }
.summary-icon.gold { background: linear-gradient(135deg, #d8a235, #eecf76); }

.summary-card span,
.status-item span,
.device-row small,
.card-header p,
.section-title p,
.summary-card small {
  color: #63836f;
}

.summary-card strong {
  display: block;
  margin: 4px 0 2px;
  font-size: 24px;
  color: #123c25;
}

.device-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.8fr);
  gap: 10px;
  margin-top: 10px;
}

.device-panel {
  padding: var(--panel-padding);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title > span {
  width: 5px;
  height: 34px;
  border-radius: 5px;
  background: linear-gradient(180deg, #2fb36f, #9bcc4f);
}

.section-title h2,
.card-header h3 {
  margin: 0;
  color: #163926;
  font-size: 16px;
}

.section-title p,
.card-header p {
  margin: 3px 0 0;
  font-size: 12px;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
  max-height: 218px;
  overflow-y: auto;
  padding-right: 3px;
}

.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 62px;
  padding: 10px;
  border-radius: 5px;
  background: rgba(245, 252, 246, 0.84);
  border: 1px solid rgba(92, 157, 105, 0.12);
}

.device-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.device-meta div {
  min-width: 0;
}

.device-dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #2fb36f;
  box-shadow: 0 0 0 5px rgba(47, 179, 111, 0.12);
}

.device-dot.offline {
  background: #e7685d;
  box-shadow: 0 0 0 5px rgba(231, 104, 93, 0.12);
}

.device-meta strong,
.device-value b {
  display: block;
  color: #153c25;
}

.device-meta strong,
.device-meta small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-value {
  flex: 0 0 auto;
  text-align: right;
}

.device-value b {
  font-size: 17px;
}

.device-value span {
  color: #63836f;
  font-size: 12px;
}

.status-panel {
  display: grid;
  align-content: center;
  gap: 10px;
}

.status-item {
  padding: 10px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.64);
}

.status-item strong {
  display: block;
  margin: 4px 0;
  font-size: 28px;
}

.status-item.online strong { color: #24965b; }
.status-item.offline strong { color: #d95c51; }

.status-progress {
  height: 10px;
  overflow: hidden;
  border-radius: 5px;
  background: #e6f0e9;
}

.status-progress div {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #2fb36f, #a4cf4e);
}

.chart-grid,
.monitor-alert-grid,
.analysis-grid {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.chart-grid {
  grid-template-columns: minmax(430px, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
}

.analysis-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.monitor-alert-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
  align-items: stretch;
}

.chart-card {
  min-height: 260px;
  padding: var(--panel-padding);
}

.monitor-panel,
.alert-panel {
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.weather-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 5px;
  color: #237548;
  background: rgba(133, 201, 77, 0.16);
}

.weather-badge i {
  color: #24965b;
  font-size: 20px;
  line-height: 1;
  filter: drop-shadow(0 0 4px rgba(47, 179, 111, 0.22));
}

.weather-live-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 8px;
  align-items: stretch;
}

.weather-now {
  display: grid;
  align-content: center;
  gap: 10px;
  min-height: 168px;
}

.temperature strong {
  font-size: 64px;
  line-height: 1;
  color: #24965b;
}

.temperature span {
  font-size: 26px;
  color: #24965b;
}

.weather-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.weather-metrics span {
  padding: 8px 7px;
  border-radius: 5px;
  color: #355b43;
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.forecast-mini-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  max-height: 196px;
  overflow-y: auto;
}

.forecast-mini-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 34px 18px minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  padding: 5px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(91, 152, 104, 0.1);
}

.forecast-mini-item span,
.forecast-mini-item strong,
.forecast-mini-item small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forecast-mini-item small {
  grid-column: 3;
}

.forecast-mini-item span,
.forecast-mini-item small {
  color: #6d8675;
  font-size: 11px;
}

.forecast-mini-item strong {
  color: #173c25;
  font-size: 12px;
}

.forecast-icon {
  color: #2fb36f;
  font-size: 17px;
  line-height: 1;
  text-align: center;
  filter: drop-shadow(0 0 4px rgba(47, 179, 111, 0.18));
}

.segmented-control {
  display: inline-flex;
  padding: 2px;
  border-radius: 5px;
  background: rgba(227, 242, 231, 0.92);
  border: 1px solid rgba(91, 152, 104, 0.14);
}

.segmented-control button {
  height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 5px;
  color: #4f755b;
  background: transparent;
  cursor: pointer;
}

.segmented-control button.active {
  color: #fff;
  background: linear-gradient(135deg, #2fb36f, #83c85b);
  box-shadow: 0 6px 12px rgba(47, 179, 111, 0.18);
}

.device-selector-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.trend-select {
  width: 180px;
}

.area-select,
.location-select {
  width: 140px;
}

.chart-canvas {
  width: 100%;
  height: 206px;
}

.data-card,
.monitor-panel,
.alert-panel {
  min-height: 242px;
}

.monitor-panel,
.alert-panel {
  height: 252px;
  min-height: 252px;
  overflow: hidden;
}

.data-card .chart-canvas {
  height: 178px;
}

.monitor-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.camera-select {
  width: 168px;
}

.mini-button {
  height: 26px;
  padding: 0 9px;
  border: 1px solid rgba(64, 142, 86, 0.22);
  border-radius: 5px;
  color: #237548;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(232, 247, 236, 0.82));
  cursor: pointer;
}

.mini-button:disabled {
  color: #9eb0a5;
  cursor: not-allowed;
}

.monitor-body {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(180px, 0.9fr);
  gap: 8px;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.camera-live-box {
  position: relative;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-radius: 5px;
  background: linear-gradient(135deg, rgba(228, 246, 234, 0.9), rgba(255, 255, 255, 0.72));
  border: 1px solid rgba(91, 152, 104, 0.12);
}

.camera-video-player,
.camera-video-fallback,
.camera-video-empty {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.camera-video-player {
  background: #0d2318;
}

.camera-video-fallback {
  position: absolute;
  inset: 0;
}

.camera-video-fallback span,
.camera-video-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d7f5e1;
  font-size: 13px;
  background: rgba(12, 35, 23, 0.32);
}

.camera-live-box img,
.camera-thumb img,
.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-live-info {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 5px;
  color: #fff;
  background: rgba(18, 60, 37, 0.72);
}

.camera-live-info strong,
.camera-live-info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-live-info span {
  font-size: 12px;
}

.camera-thumb-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  align-content: start;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
}

.camera-thumb,
.gallery-item {
  min-width: 0;
  border: 0;
  padding: 0;
  overflow: hidden;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}

.camera-thumb {
  position: relative;
  height: 58px;
}

.camera-thumb span,
.gallery-item span {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 4px 5px;
  color: #fff;
  font-size: 11px;
  line-height: 1.2;
  text-align: left;
  background: rgba(18, 60, 37, 0.68);
}

.gallery-drawer {
  padding: 0 2px 12px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.gallery-item {
  position: relative;
  height: 118px;
}

.alert-list,
.record-list {
  display: grid;
  gap: 8px;
}

.alert-panel .alert-list {
  min-height: 0;
  height: 0;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
  align-content: start;
}

.alert-panel .empty-state {
  min-height: 0;
  flex: 1;
}

.alert-row,
.record-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(91, 152, 104, 0.12);
}

.alert-row strong,
.alert-row span,
.record-row span,
.record-row strong,
.record-row small {
  display: block;
}

.alert-row strong,
.record-row strong {
  color: #173c25;
  font-size: 13px;
  line-height: 1.3;
}

.alert-row span,
.record-row span,
.record-row small {
  color: #6d8675;
  font-size: 11px;
  line-height: 1.38;
}

.alert-row > div {
  flex: 1;
  min-width: 0;
}

.alert-row span {
  display: -webkit-box;
  overflow: hidden;
  word-break: break-all;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
}

.alert-row b {
  flex: 0 0 auto;
  min-width: 42px;
  height: 24px;
  padding: 0 7px;
  line-height: 24px;
  text-align: center;
  border-radius: 5px;
  font-size: 12px;
}

.alert-row b.high { color: #c8443b; background: rgba(231, 104, 93, 0.14); }
.alert-row b.medium { color: #b2761c; background: rgba(224, 167, 59, 0.16); }
.alert-row b.low { color: #237548; background: rgba(47, 179, 111, 0.14); }

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  color: #6f8b78;
  font-size: 13px;
}

.empty-state.compact {
  min-height: 56px;
}

.report-drawer-content {
  padding: 0 2px 12px;
}

.report-filter-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px var(--panel-padding);
  border: 1px solid rgba(91, 152, 104, 0.12);
  border-radius: 5px;
  background: #f8fbf8;
}

.report-filter-bar span {
  color: #4d6b5a;
  font-size: 13px;
  font-weight: 700;
}

.report-device-list {
  display: grid;
  gap: 10px;
}

.report-device-card {
  padding: var(--panel-padding);
  border: 1px solid rgba(86, 154, 101, 0.16);
  border-radius: 5px;
  background: linear-gradient(145deg, #ffffff, #f2faf3);
  box-shadow: 0 8px 20px rgba(37, 94, 53, 0.08);
}

.report-device-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.report-device-header strong,
.report-device-header span {
  display: block;
}

.report-device-header strong {
  color: #173c25;
  font-size: 14px;
}

.report-device-header span {
  margin-top: 2px;
  color: #6d8675;
  font-size: 12px;
}

.report-property-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.report-property-row > span {
  color: #4d6b5a;
  font-size: 13px;
  font-weight: 700;
}

.report-chart-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px;
  gap: 10px;
  align-items: center;
}

.report-chart {
  width: 100%;
  height: 200px;
}

.report-stat-box {
  display: grid;
  gap: 8px;
  padding-left: 10px;
  border-left: 1px solid #e0eee4;
  text-align: center;
}

.report-stat-box span,
.report-stat-box small,
.report-stat-list span {
  color: #6d8675;
  font-size: 12px;
}

.report-stat-box strong {
  display: block;
  margin: 2px 0;
  color: #24965b;
  font-size: 20px;
  line-height: 1;
}

.report-stat-list {
  display: grid;
  gap: 4px;
  padding-top: 6px;
  border-top: 1px solid #edf5ef;
}

.report-stat-list.all-models {
  max-height: 160px;
  overflow-y: auto;
  padding-right: 4px;
}

.report-stat-list p {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin: 0;
}

.report-stat-list b {
  color: #173c25;
}

.dashboard-main {
  width: calc(100% - 6px);
  padding: 3px 0 5px;
}

.summary-grid,
.device-overview,
.chart-grid,
.monitor-alert-grid,
.analysis-grid,
.device-list,
.alert-list,
.record-list,
.report-device-list {
  gap: 3px !important;
}

.device-overview,
.chart-grid,
.monitor-alert-grid,
.analysis-grid {
  margin-top: 3px !important;
}

.card-header,
.report-filter-bar,
.report-device-header,
.report-property-row {
  gap: 3px !important;
  margin-bottom: 3px !important;
}

.weather-live-body,
.weather-metrics,
.forecast-mini-list,
.monitor-body,
.camera-thumb-list,
.gallery-grid,
.report-chart-row,
.report-stat-box,
.report-stat-list {
  gap: 3px !important;
}

.summary-card,
.device-panel,
.chart-card,
.report-device-card,
.report-filter-bar {
  box-shadow:
    0 14px 30px rgba(31, 91, 59, 0.16),
    0 4px 10px rgba(31, 91, 59, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
}

.monitor-alert-grid,
.analysis-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  align-items: stretch !important;
}

.monitor-alert-grid > .chart-card,
.analysis-grid > .chart-card {
  width: 100%;
}

/* Compact transparent dashboard panels. */
.iot-perception-page {
  --panel-padding: 7px;
  background: transparent !important;
}

.top-toolbar {
  padding: 6px 8px;
  background: transparent;
  box-shadow: none;
}

.summary-card,
.device-panel,
.chart-card,
.report-device-card,
.report-filter-bar {
  background: transparent !important;
  border: 1px solid rgba(68, 132, 84, 0.24);
  box-shadow:
    0 8px 18px rgba(31, 91, 59, 0.12),
    0 2px 6px rgba(31, 91, 59, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.42) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.summary-card:hover,
.device-panel:hover,
.chart-card:hover,
.report-device-card:hover,
.report-filter-bar:hover {
  transform: translateY(-2px);
  border-color: rgba(47, 132, 76, 0.46);
  box-shadow:
    0 14px 26px rgba(31, 91, 59, 0.18),
    0 4px 10px rgba(31, 91, 59, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
}

.summary-card {
  height: 90px;
  min-height: 90px;
  gap: 8px;
  padding: 7px;
}

.summary-icon {
  width: 40px;
  height: 40px;
  font-size: 21px;
}

.summary-card span,
.summary-card small,
.status-item span,
.status-item small {
  font-size: 13px;
}

.summary-card strong {
  margin: 2px 0 1px;
  font-size: 26px;
}

.device-panel,
.chart-card,
.report-device-card {
  padding: 7px;
}

.section-title > span {
  height: 28px;
}

.section-title h2,
.card-header h3 {
  font-size: 17px;
}

.section-title p,
.card-header p {
  margin-top: 1px;
  font-size: 13px;
}

.device-list {
  max-height: 176px;
  margin-top: 6px;
  gap: 5px !important;
}

.device-row {
  min-height: 50px;
  padding: 7px;
}

.device-meta strong {
  font-size: 14px;
}

.device-meta small,
.device-value span {
  font-size: 12px;
}

.status-panel {
  gap: 5px;
}

.status-item {
  padding: 7px;
}

.status-item strong {
  margin: 2px 0;
  font-size: 25px;
}

.status-progress {
  height: 7px;
}

.chart-card {
  min-height: 220px;
}

.card-header {
  margin-bottom: 5px;
}

.chart-canvas {
  height: 174px;
}

.weather-live-body {
  grid-template-columns: minmax(0, 1fr) 142px;
}

.weather-now {
  min-height: 142px;
  gap: 7px;
}

.temperature strong {
  font-size: 56px;
}

.weather-metrics span {
  padding: 6px;
  font-size: 13px;
}

.forecast-mini-list {
  max-height: 170px;
}

.forecast-mini-item {
  padding: 4px 5px;
}

.forecast-mini-item span,
.forecast-mini-item small {
  font-size: 12px;
}

.forecast-mini-item strong {
  font-size: 13px;
}

.data-card,
.monitor-panel,
.alert-panel {
  min-height: 210px;
}

.monitor-panel,
.alert-panel {
  height: 218px;
  min-height: 218px;
}

.data-card .chart-canvas {
  height: 160px;
}

.camera-thumb {
  height: 50px;
}

.alert-row,
.record-row {
  padding: 6px 7px;
}

.alert-row strong,
.record-row strong {
  font-size: 14px;
}

.alert-row span,
.record-row span,
.record-row small {
  font-size: 12px;
}

.dashboard-main {
  width: calc(100% - 24px);
  max-width: none;
  min-height: 80vh;
}

.device-overview {
  grid-template-columns:
    minmax(320px, 1.08fr)
    minmax(250px, 0.8fr)
    minmax(270px, 0.86fr)
    minmax(280px, 0.9fr);
}

.device-overview > .weather-live {
  order: 1;
}

.device-overview > .device-type-share-panel {
  order: 2;
}

.device-overview > .main-device {
  order: 3;
}

.device-overview > .monitor-panel {
  order: 4;
}

.realtime-device-header {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.realtime-status-summary {
  width: calc(100% - 13px);
  margin-left: 13px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 4px;
}

.realtime-status-summary > span {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  height: 26px;
  padding: 0 4px;
  border: 1px solid rgba(68, 132, 84, 0.2);
  border-radius: 4px;
  color: #587866;
  font-size: 12px;
  line-height: 24px;
  white-space: nowrap;
}

.realtime-status-summary strong {
  color: #173c25;
  font-size: 16px;
}

.realtime-status-summary .online strong {
  color: #24965b;
}

.realtime-status-summary .offline strong {
  color: #d95c51;
}

.main-device .device-list {
  max-height: 208px;
  grid-template-columns: minmax(0, 1fr);
  gap: 0 !important;
}

.main-device .device-row {
  min-height: 52px;
  padding: 5px 6px;
  border: 0;
  border-bottom: 1px solid rgba(68, 132, 84, 0.16);
  border-radius: 0;
  background: transparent;
}

.main-device .device-meta {
  align-items: flex-start;
}

.main-device .device-meta strong,
.main-device .device-meta small {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.25;
}

.main-device .device-value b {
  font-size: 13px;
}

.main-device .device-value span {
  max-width: 86px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}

.device-type-share-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.device-type-share-chart {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.monitor-body {
  display: block;
}

.monitor-alert-grid {
  grid-template-columns: minmax(320px, 0.82fr) minmax(520px, 1.18fr) !important;
}

.camera-live-box {
  width: 100%;
}

.chart-card > .chart-canvas,
.device-type-share-panel > .chart-canvas {
  width: 100%;
  margin-left: 0;
}

.chart-card,
.device-type-share-panel {
  display: flex;
  flex-direction: column;
  padding: 7px 2px 2px;
}

.chart-grid > .chart-card {
  height: 200px;
  min-height: 200px;
}

.chart-card > .card-header,
.device-type-share-panel > .card-header {
  padding: 0 5px;
  margin-bottom: 2px !important;
}

.chart-card > .chart-canvas,
.device-type-share-panel > .chart-canvas {
  flex: 1 1 0;
  height: auto;
  min-height: 0;
}

.device-overview > .chart-card,
.device-overview > .device-panel {
  height: 300px;
  min-height: 300px;
}

.device-overview .weather-live-body {
  grid-template-columns: minmax(0, 1fr) minmax(132px, 0.85fr);
  min-height: 0;
  overflow: hidden;
}

.device-overview .weather-now {
  min-height: 0;
  height: 100%;
}

.device-overview .temperature strong {
  font-size: 48px;
}

.device-overview .forecast-mini-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: minmax(42px, auto);
  align-content: start;
  min-height: 0;
  max-height: none;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  scrollbar-width: none;
  scrollbar-color: transparent transparent;
  -ms-overflow-style: none;
}

.device-overview .weather-live .forecast-mini-list::-webkit-scrollbar {
  display: none !important;
  width: 0;
  height: 0;
  background: transparent;
}

.device-overview .weather-live .forecast-mini-list::-webkit-scrollbar-thumb,
.device-overview .weather-live .forecast-mini-list::-webkit-scrollbar-track {
  display: none !important;
  background: transparent;
}

.device-overview .forecast-mini-item {
  min-height: 42px;
}

.device-overview .monitor-panel .card-header {
  flex-wrap: wrap;
}

.device-overview .camera-select {
  width: 136px;
}

.chart-grid {
  grid-template-columns:
    minmax(260px, 0.92fr)
    minmax(260px, 0.92fr)
    minmax(300px, 1fr)
    minmax(420px, 1.3fr);
}

.chart-grid > .chart-card {
  height: 330px;
  min-height: 330px;
}

.environment-panel > .card-header {
  align-items: stretch;
  flex-direction: column;
}

.weather-live-body {
  flex: 1;
}

.environment-panel .device-selector-group {
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.environment-panel .device-selector-group .el-select {
  flex: 1 1 0;
  width: auto;
  min-width: 0;
  max-width: 180px;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .weather-live {
    grid-column: 1 / -1;
  }

  .device-overview {
    grid-template-columns: 1fr;
  }

  .monitor-alert-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .environment-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .top-toolbar,
  .toolbar-left,
  .toolbar-right {
    align-items: stretch;
    flex-direction: column;
  }

  .top-toolbar {
    padding: 10px 14px;
  }

  .park-select {
    width: 100%;
  }

  .global-device-stat {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
    height: auto;
    padding: 8px 12px;
  }

  .dashboard-main {
    width: calc(100% - 10px);
  }

  .summary-grid,
  .device-list,
  .chart-grid,
  .monitor-alert-grid,
  .analysis-grid {
    grid-template-columns: 1fr !important;
  }

  .realtime-device-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .realtime-status-summary {
    width: 100%;
    margin-left: 13px;
    flex-wrap: wrap;
  }

  .environment-panel {
    grid-column: auto;
  }

  .weather-live-body {
    grid-template-columns: 1fr;
  }

  .monitor-body {
    grid-template-columns: 1fr;
  }

  .weather-now {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .weather-metrics {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .forecast-mini-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: none;
  }

  .card-header,
  .device-selector-group {
    align-items: stretch;
    flex-direction: column;
  }

  .trend-select,
  .camera-select,
  .area-select,
  .location-select {
    width: 100%;
  }

  .report-filter-bar,
  .report-property-row,
  .report-chart-row {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .report-stat-box {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid #e0eee4;
    padding-top: 8px;
  }
}

/* Unified 3 x 3 module layout: the live monitor spans the first two rows. */
.perception-module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(310px, auto));
  grid-template-areas:
    "weather devices monitor"
    "types forecast monitor"
    "collect alerts environment";
  align-items: stretch;
  gap: 2px;
  margin-top: 2px;
}

.module-weather { grid-area: weather; }
.module-devices { grid-area: devices; }
.module-monitor { grid-area: monitor; }
.module-device-types { grid-area: types; }
.module-weather-chart { grid-area: forecast; }
.module-collect { grid-area: collect; }
.module-alerts { grid-area: alerts; }
.module-environment { grid-area: environment; }

.perception-module-grid > .chart-card,
.perception-module-grid > .device-panel {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(68, 132, 84, 0.28);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 20px rgba(37, 94, 53, 0.1);
}

.perception-module-grid .card-header {
  flex: 0 0 auto;
  min-width: 0;
}

.perception-module-grid .card-header > div:first-child,
.perception-module-grid .section-title > div:first-of-type {
  min-width: 0;
}

.perception-module-grid .card-header h3,
.perception-module-grid .section-title h2,
.perception-module-grid .card-header p,
.perception-module-grid .section-title p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.perception-module-grid .chart-canvas {
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  min-height: 230px;
  margin: 0;
}

.module-weather,
.module-devices,
.module-device-types,
.module-weather-chart,
.module-collect,
.module-alerts,
.module-environment,
.module-monitor {
  display: flex !important;
  flex-direction: column;
}

.module-weather .weather-live-body {
  flex: 1 1 0;
  grid-template-columns: minmax(0, 1fr) minmax(145px, 0.78fr);
  min-height: 0;
  overflow: hidden;
}

.module-weather .weather-now {
  min-height: 0;
}

.module-weather .temperature strong {
  font-size: 46px;
}

.module-weather .forecast-mini-list,
.module-devices .device-list,
.module-alerts .alert-list {
  min-height: 0;
  max-height: none;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.module-weather .forecast-mini-list::-webkit-scrollbar,
.module-devices .device-list::-webkit-scrollbar,
.module-alerts .alert-list::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.module-devices .device-list,
.module-alerts .alert-list {
  flex: 1 1 0;
}

.module-devices .realtime-status-summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.module-monitor {
  height: auto !important;
  min-height: 0 !important;
}

.module-monitor .monitor-body,
.module-monitor .camera-live-box,
.module-monitor .camera-video-player,
.module-monitor .camera-video-fallback,
.module-monitor .camera-video-empty {
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.module-monitor .monitor-body {
  display: flex;
  overflow: hidden;
}

.module-monitor .camera-live-box img {
  object-fit: contain;
  background: #0d2318;
}

.module-monitor .camera-live-box,
.module-monitor .camera-video-player {
  max-width: 100%;
  overflow: hidden !important;
  contain: layout paint;
}

.module-monitor .camera-video-player :deep(iframe),
.module-monitor .camera-video-player :deep(video),
.module-monitor .camera-video-player :deep(canvas),
.module-monitor .camera-video-player :deep(iframe > *),
.module-monitor .camera-video-player :deep(> div) {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

.module-monitor .camera-live-info {
  max-width: calc(100% - 16px);
  min-width: 0;
  overflow: hidden;
}

.module-monitor .camera-live-info strong,
.module-monitor .camera-live-info span {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-monitor .camera-live-info strong {
  flex: 1 1 0;
}

.module-monitor .camera-live-info span {
  flex: 0 1 46%;
}

.module-alerts .alert-row {
  min-width: 0;
}

.module-alerts .alert-row > div,
.module-alerts .alert-row span {
  min-width: 0;
}

.module-alerts .alert-row span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Weather uses a neutral black information hierarchy; the page sits on gray. */
.iot-perception-page {
  background: #eef0f2 !important;
}

.module-weather,
.module-weather .card-header h3,
.module-weather .card-header p,
.module-weather .temperature strong,
.module-weather .temperature span,
.module-weather .weather-metrics span,
.module-weather .weather-badge,
.module-weather .weather-badge i,
.module-weather .forecast-mini-item span,
.module-weather .forecast-mini-item strong,
.module-weather .forecast-mini-item small,
.module-weather .forecast-icon {
  color: #000000 !important;
}

.module-environment .card-header {
  align-items: stretch;
  flex-direction: column;
}

.module-environment .device-selector-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.module-environment .device-selector-group .el-select {
  width: 100%;
  max-width: none;
  min-width: 0;
}

@media (max-width: 1400px) {
  .perception-module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(4, minmax(300px, auto));
    grid-template-areas:
      "weather monitor"
      "devices monitor"
      "types forecast"
      "collect alerts"
      "environment environment";
  }
}

@media (max-width: 860px) {
  .perception-module-grid {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas:
      "weather"
      "devices"
      "monitor"
      "types"
      "forecast"
      "collect"
      "alerts"
      "environment";
  }

  .perception-module-grid > .chart-card,
  .perception-module-grid > .device-panel {
    min-height: 320px;
  }

  .module-monitor {
    min-height: 520px !important;
  }
}
</style>
