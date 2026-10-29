<template>
  <div class="pest-analysis-page">
    <!-- 顶部导航 -->
    <header class="topbar">
      <div class="brand-area">
        <div class="brand">
        </div>

        <nav class="nav-list" aria-label="病害功能导航">
          <router-link class="nav-item active" to="/disease-analysis" aria-current="page">病害分析</router-link>
          <div class="nav-dropdown">
            <button type="button" class="nav-item nav-trigger">
              <span>病害识别</span>
              <el-icon class="nav-caret"><ArrowDown /></el-icon>
            </button>
            <div class="nav-menu">
              <router-link class="nav-menu-item" to="/featureDisease">手动上传</router-link>
              <router-link class="nav-menu-item" to="/sxz/disease-auto-task">自动识别</router-link>
            </div>
          </div>
          <router-link class="nav-item" to="/disease-images">识别历史</router-link>
          <router-link class="nav-item" to="/disease-report">病害报告</router-link>
        </nav>
      </div>

      <div class="top-actions">
        <button type="button" class="home-button" @click="router.push('/home')">
          <el-icon><House /></el-icon>
          <span>返回首页</span>
        </button>
      </div>
    </header>

    <main class="page-content">
      <!-- 筛选区 -->
      <section class="filter-bar">
        <div class="filter-group">
          <select v-model="period" class="form-control" @change="handlePeriodChange">
            <option value="30">近30天</option>
            <option value="7">近7天</option>
          </select>

          <select
            v-model="selectedParkId"
            class="form-control park-control"
            :disabled="loading"
            @change="handleParkChange"
          >
            <option value="">全部园区</option>
            <option
              v-for="park in parkOptions"
              :key="park.parkId"
              :value="String(park.parkId)"
            >
              {{ park.parkName }}
            </option>
          </select>

          <input
            class="form-control date-control"
            :value="dateRangeLabel"
            readonly
          />

          <span class="hint-text">数据更新时间：{{ generatedAt || '加载中' }}</span>
        </div>

        <div class="filter-actions">
         
         
          
        </div>
      </section>

      <!-- 上部图表区 -->
      <section class="top-grid">
        <!-- 病虫害种类 -->
        <article class="card">
          <div class="card-header">
            <div class="card-title-block">
              <span class="card-title-accent"></span>
              <div>
                <span class="card-title">病害种类分布</span>
                <span class="card-subtitle">识别结果占比与主要病害排名</span>
              </div>
            </div>

            <div class="card-header-actions">
              <span
                v-if="selectedPest"
                class="selection-chip"
                @click.stop="clearPestSelection"
              >
                当前筛选：<b>{{ selectedPest.name }}</b> ×
              </span>
              <span v-else class="selection-chip">当前筛选：<b>全部</b></span>
            </div>
          </div>

          <div class="card-body">
            <div class="summary-row">
              <span>识别总数：<b>{{ totalCount.toLocaleString() }}</b> 次</span>
              <span>病虫害种类：<b>{{ pests.length }}</b> 种</span>
            </div>

            <div class="category-layout">
              <div
                ref="donutWrapRef"
                class="donut-wrapper"
                @mouseleave="endPreview"
              >
                <svg
                  class="donut-svg"
                  viewBox="0 0 240 240"
                  aria-label="病虫害种类占比环形图"
                >
                  <path
                    v-for="segment in donutSegments"
                    :key="segment.index"
                    class="donut-segment"
                    :class="{
                      'is-active': segment.isActive,
                      'is-dim': segment.isDim
                    }"
                    :d="segment.path"
                    :fill="segment.color"
                    :style="{
                      transform: `translate(${segment.translateX}px, ${segment.translateY}px)`
                    }"
                    @mouseenter="previewPest(segment.index, $event, 'chart')"
                    @mousemove="moveTooltip"
                    @click="selectPest(segment.index)"
                  />

                  <circle class="donut-hole" cx="120" cy="120" r="61" />
                </svg>

                <div class="donut-center">
                  <strong>{{ donutCenter.main }}</strong>
                  <span>{{ donutCenter.sub }}</span>
                  <small>{{ donutCenter.extra }}</small>
                </div>

                <div
                  v-show="tooltipVisible"
                  class="donut-tooltip"
                  :style="{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`
                  }"
                >
                  <div class="tooltip-title">{{ hoveredPest?.name }}</div>
                  <div class="tooltip-row">
                    <span>识别次数</span>
                    <b>{{ hoveredPest?.count.toLocaleString() }}次</b>
                  </div>
                  <div class="tooltip-row">
                    <span>占比</span>
                    <b>{{ hoveredPest?.rate }}%</b>
                  </div>
                  <div class="tooltip-row">
                    <span>平均置信度</span>
                    <b>{{ hoveredPest?.avg.toFixed(1) }}%</b>
                  </div>
                  <div class="tooltip-row">
                    <span>最近识别</span>
                    <b>{{ hoveredPest?.latest }}</b>
                  </div>
                </div>
              </div>

              <div
                class="category-list"
                role="list"
                aria-label="全部病虫害统计"
                tabindex="0"
              >
                <div
                  v-for="(pest, index) in visiblePests"
                  :key="pest.name"
                  class="category-item"
                  :class="{
                    active: index === selectedPestIndex,
                    hovered: index === hoveredPestIndex
                  }"
                  :style="{ '--item-color': pest.color }"
                  @mouseenter="previewPest(index, $event, 'legend')"
                  @mouseleave="endPreview"
                  @click="selectPest(index)"
                >
                  <span class="rank-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="color-dot" :style="{ background: pest.color }" />
                  <span class="category-name" :title="pest.name">{{ pest.name }}</span>
                  <span class="category-count">{{ pest.count.toLocaleString() }}次</span>
                  <span class="category-rate">{{ pest.rate }}%</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- 置信度趋势 -->
        <article class="card">
          <div class="card-header">
            <div class="card-title-block">
              <span class="card-title-accent"></span>
              <div>
                <span class="card-title">病害发生趋势</span>
                <span class="card-subtitle">每日识别次数 / 病害检出率</span>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="trend-chart-wrapper">
              <div class="chart-toolbar">
                <div class="series-list">
                  <div
                    v-for="(pest, index) in pests"
                    :key="pest.name"
                    class="series-item"
                    :class="{ disabled: !enabledSeries[index] }"
                    @click="toggleSeries(index)"
                  >
                    <span class="color-dot" :style="{ background: pest.color }" />
                    {{ pest.name }}
                  </div>
                </div>
              </div>
              <div ref="trendChartRef" class="trend-chart-canvas" />
              <div v-if="loading" class="trend-chart-state">
                <span class="trend-loading-dot" />
                <p>正在加载趋势数据</p>
              </div>
              <div v-else-if="trendError" class="trend-chart-state">
                <strong>趋势数据加载失败</strong>
                <button class="trend-retry-button" @click="loadDashboard">重新加载</button>
              </div>
              <div v-else-if="!trendHasData" class="trend-chart-state">
                <strong>当前时间范围内暂无病虫害识别记录</strong>
                <p>请调整时间筛选条件</p>
              </div>
              <div v-else-if="trendSampleInsufficient" class="trend-sample-note">
                当前样本较少，暂不足以形成完整趋势
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- 下部详情区 -->
      <section class="bottom-grid">
        <article class="card detail-card">
          <div class="card-header">
            <div class="card-title-block">
              <span class="card-title-accent"></span>
              <div>
                <span class="card-title">病害详情</span>
                <span class="card-subtitle">当前选中病害档案</span>
              </div>
            </div>
          </div>

          <div class="card-body">
            <template v-if="pests.length > 0">
            <select
              class="detail-select"
              :value="effectivePestIndex"
              @change="selectPest(Number($event.target.value))"
            >
              <option
                v-for="(pest, index) in pests"
                :key="pest.name"
                :value="index"
              >
                {{ pest.name }}
              </option>
            </select>

            <div class="pest-image">
              <img v-if="effectivePest.imageUrl" :src="effectivePest.imageUrl" :alt="effectivePest.name" />
              <svg v-else viewBox="0 0 300 160">
                <defs>
                  <linearGradient id="leafGradient" x1="0" x2="1">
                    <stop offset="0" stop-color="#95cf79" />
                    <stop offset="1" stop-color="#3a8e4b" />
                  </linearGradient>
                </defs>

                <rect width="300" height="160" fill="#d9ecd2" />
                <path
                  d="M25 125 C70 20,205 5,275 32 C220 145,95 155,25 125Z"
                  fill="url(#leafGradient)"
                />
                <path
                  d="M44 119 C112 93,177 69,252 38"
                  stroke="#dff3ce"
                  stroke-width="4"
                  fill="none"
                />
                <ellipse cx="164" cy="74" rx="27" ry="17" fill="#9d6b3b" />
                <circle cx="137" cy="71" r="13" fill="#c8945b" />
                <circle cx="133" cy="66" r="2.2" fill="#222" />
              </svg>

              <div class="status-tag">识别成功</div>
            </div>

           

            <div class="metric-list">
              <div class="metric-row">
                <span>病虫害名称</span>
                <b>{{ effectivePest.name }}</b>
              </div>
              <div class="metric-row">
                <span>识别次数</span>
                <b>{{ effectivePest.count.toLocaleString() }}次</b>
              </div>
              <div class="metric-row">
                <span>平均置信度</span>
                <b>{{ effectivePest.avg.toFixed(2) }}%</b>
              </div>
              <div class="metric-row">
                <span>最高置信度</span>
                <b>{{ effectivePest.max.toFixed(2) }}%</b>
              </div>
              <div class="metric-row">
                <span>首次发现</span>
                <b>{{ effectivePest.first }}</b>
              </div>
              <div class="metric-row">
                <span>最近发现</span>
                <b>{{ effectivePest.latest }}</b>
              </div>
            </div>
            </template>

            <div v-else class="detail-empty">
              <strong>暂无病虫害识别数据</strong>
              <span>当前时间范围内没有识别记录，请调整筛选条件或检查数据库</span>
              <button
                type="button"
                class="trend-retry-button"
                @click="loadDashboard"
              >
                重新加载
              </button>
            </div>
          </div>
        </article>

        <article class="card analysis-card">
          <div class="card-header">
            <div class="card-title-block">
              <span class="card-title-accent"></span>
              <div>
                <span class="card-title">病害与环境相关性</span>
                <span class="card-subtitle">环境指标与识别结果关联趋势</span>
              </div>
            </div>
          </div>

          <div class="analysis-content">


            <div class="environment-chart-shell">
              <div ref="environmentChartRef" class="environment-chart-canvas" />
              <div v-if="!environmentRows.length && !loading" class="environment-chart-empty">
                <strong>暂无可关联的识别与环境数据</strong>
                <span>请调整时间筛选条件</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>

    <!-- 识别记录抽屉 -->
    <div
      v-if="drawerVisible"
      class="drawer-mask"
      @click.self="drawerVisible = false"
    >
      <aside class="drawer-panel">
        <div class="drawer-header">
          <h3>识别记录</h3>
          <button class="drawer-close" @click="drawerVisible = false">×</button>
        </div>

        <div class="drawer-description">
          当前筛选条件下共 {{ records.length }} 条最近识别记录
        </div>

        <div
          v-for="record in records"
          :key="record.time"
          class="record-item"
        >
          <div
            class="record-image"
            :style="record.imageUrl ? { backgroundImage: `url(${record.imageUrl})` } : undefined"
          />
          <div>
            <h4>
              {{ record.name }} ·
              <strong>{{ record.confidence }}</strong>
            </h4>
            <p>识别时间：{{ record.time }}</p>
            <p>识别模型：{{ record.model }}</p>
          </div>
        </div>
      </aside>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast-message">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElIcon } from 'element-plus'
import { ArrowDown, House } from '@element-plus/icons-vue'
import { getDiseaseAnalysisDashboard } from '@/api/binZhou/sxz/diseaseAnalysis'

const router = useRouter()
const period = ref('30')
const selectedParkId = ref('')
const parkOptions = ref([])
const drawerVisible = ref(false)
const loading = ref(false)
const generatedAt = ref('')
const trendChartRef = ref(null)
const trendError = ref(false)
const trendRows = ref([])
const environmentChartRef = ref(null)
const environmentRows = ref([])
const trendHasData = ref(false)
const trendSampleInsufficient = ref(false)
let trendChartInstance = null
let environmentChartInstance = null
let environmentRequestSeq = 0
let dashboardRequestSeq = 0

const selectedPestIndex = ref(null)
const hoveredPestIndex = ref(null)
const enabledSeries = ref([true, true, true, true, true])

const donutWrapRef = ref(null)
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })

const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

const pests = reactive([
  {
    name: '枣瘿蚊',
    count: 8077,
    rate: 42,
    color: '#23a8f2',
    avg: 93.2,
    max: 98.8,
    first: '2026-04-18',
    latest: '2026-06-29',
  },
  {
    name: '枣锈病',
    count: 6069,
    rate: 31,
    color: '#ff69b4',
    avg: 89.6,
    max: 96.4,
    first: '2026-04-23',
    latest: '2026-06-28',
  },
  {
    name: '枣尺蠖',
    count: 1266,
    rate: 7,
    color: '#3867d6',
    avg: 91.4,
    max: 97.1,
    first: '2026-05-03',
    latest: '2026-06-27',
  },
  {
    name: '炭疽病',
    count: 1033,
    rate: 5,
    color: '#f7d94c',
    avg: 86.8,
    max: 94.2,
    first: '2026-05-10',
    latest: '2026-06-25',
  },
  {
    name: '枣疯病',
    count: 549,
    rate: 3,
    color: '#ffb54a',
    avg: 84.5,
    max: 92.9,
    first: '2026-05-16',
    latest: '2026-06-24',
  },
  {
    name: '轮纹病',
    count: 397,
    rate: 2,
    color: '#32c47b',
    avg: 88.2,
    max: 95.8,
    first: '2026-05-20',
    latest: '2026-06-21',
  },
  {
    name: '其他',
    count: 2010,
    rate: 10,
    color: '#8b6cf6',
    avg: 82.6,
    max: 91.7,
    first: '2026-04-28',
    latest: '2026-06-29',
  }
])

const records = reactive([
  {
    name: '枣瘿蚊',
    confidence: '96.8%',
    time: '2026-06-29 11:15:22',
    model: '枣树病虫害模型 V2.3',
  },
  {
    name: '枣锈病',
    confidence: '93.4%',
    time: '2026-06-29 10:48:09',
    model: '枣树病害模型 V1.8',
  },
  {
    name: '枣尺蠖',
    confidence: '91.7%',
    time: '2026-06-29 09:36:41',
    model: '枣树虫害模型 V2.1',
  },
  {
    name: '炭疽病',
    confidence: '88.9%',
    time: '2026-06-28 17:25:10',
    model: '枣树病害模型 V1.8',
  }
])

const totalCount = computed(() => {
  return pests.reduce((sum, item) => sum + item.count, 0)
})

const visiblePests = computed(() => pests)

const emptyPest = Object.freeze({
  name: '暂无病虫害数据',
  count: 0,
  rate: 0,
  color: '#d8e2de',
  avg: 0,
  max: 0,
  first: '暂无记录',
  latest: '暂无记录',
  result: '暂无诊断结论',
  description: '暂无症状描述',
  advice: '暂无防治建议',
  imageUrl: ''
})

function isValidPestIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < pests.length
}

const selectedPest = computed(() => {
  return isValidPestIndex(selectedPestIndex.value)
    ? pests[selectedPestIndex.value]
    : null
})

const hoveredPest = computed(() => {
  return isValidPestIndex(hoveredPestIndex.value)
    ? pests[hoveredPestIndex.value]
    : null
})

const effectivePestIndex = computed(() => {
  if (!pests.length) return -1
  return isValidPestIndex(selectedPestIndex.value) ? selectedPestIndex.value : 0
})
const effectivePest = computed(() => {
  return isValidPestIndex(effectivePestIndex.value)
    ? pests[effectivePestIndex.value] || emptyPest
    : emptyPest
})

const donutCenter = computed(() => {
  const activePest = hoveredPest.value || selectedPest.value

  if (!activePest) {
    return {
      main: totalCount.value.toLocaleString(),
      sub: '识别总数',
      extra: `共${pests.length}种病虫害`
    }
  }

  return {
    main: `${activePest.rate}%`,
    sub: activePest.name,
    extra: `${activePest.count.toLocaleString()}次识别`
  }
})

const donutSegments = computed(() => {
  let startAngle = 0

  return pests.map((pest, index) => {
    const gap = 0.42
    const endAngle = startAngle + pest.rate * 3.6
    const middleAngle = (startAngle + endAngle) / 2

    const isHover = hoveredPestIndex.value === index
    const isSelected = selectedPestIndex.value === index
    const isActive = isHover || isSelected

    const isDim = hoveredPestIndex.value !== null
      ? !isHover
      : selectedPestIndex.value !== null
        ? !isSelected
        : false

    // Keep hit geometry stable so hovering near a segment boundary cannot oscillate.
    const offset = 0
    const radians = (middleAngle - 90) * Math.PI / 180

    const segment = {
      index,
      color: pest.color,
      path: createDonutPath(120, 120, 88, 64, startAngle + gap, endAngle - gap),
      isActive,
      isDim,
      translateX: Math.cos(radians) * offset,
      translateY: Math.sin(radians) * offset
    }

    startAngle = endAngle
    return segment
  })
})

function polarToCartesian(centerX, centerY, radius, angle) {
  const radians = (angle - 90) * Math.PI / 180

  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  }
}

function createDonutPath(
  centerX,
  centerY,
  outerRadius,
  innerRadius,
  startAngle,
  endAngle
) {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, endAngle)
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, startAngle)
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle)
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z'
  ].join(' ')
}

function previewPest(index, event, source) {
  if (!isValidPestIndex(index)) return
  hoveredPestIndex.value = index

  if (source === 'chart') {
    tooltipVisible.value = true
    moveTooltip(event)
  } else {
    tooltipVisible.value = false
  }
}

function endPreview() {
  hoveredPestIndex.value = null
  tooltipVisible.value = false
}

function moveTooltip(event) {
  if (!donutWrapRef.value || !event) {
    return
  }

  const rect = donutWrapRef.value.getBoundingClientRect()
  const tooltipWidth = 190
  const tooltipHeight = 128

  let x = event.clientX - rect.left + 14
  let y = event.clientY - rect.top - 8

  if (x + tooltipWidth > rect.width) {
    x = event.clientX - rect.left - tooltipWidth
  }

  if (y + tooltipHeight > rect.height) {
    y = rect.height - tooltipHeight
  }

  tooltipPosition.value = {
    x: Math.max(0, x),
    y: Math.max(0, y)
  }
}

function selectPest(index) {
  if (!isValidPestIndex(index)) {
    clearPestSelection()
    return
  }
  selectedPestIndex.value = selectedPestIndex.value === index ? null : index
  hoveredPestIndex.value = null
  tooltipVisible.value = false

  if (selectedPestIndex.value === null) {
    updateTrendChart()
    loadEnvironmentStats()
    showToast('已恢复全部病虫害')
    return
  }

  updateTrendChart()
  loadEnvironmentStats()
  showToast(`已锁定筛选：${pests[selectedPestIndex.value].name}`)
}

function clearPestSelection() {
  selectedPestIndex.value = null
  hoveredPestIndex.value = null
  tooltipVisible.value = false
  updateTrendChart()
  loadEnvironmentStats()
  showToast('已恢复全部病虫害')
}

function toggleSeries(index) {
  const next = [...enabledSeries.value]
  next[index] = !next[index]
  enabledSeries.value = next
  updateTrendChart()
}

function selectPestByName(name) {
  const index = pests.findIndex(item => item.name === name)
  if (index >= 0) selectPest(index)
}

function parseTrendTime(value) {
  if (!value || value === '历史' || value === '暂无记录') return null
  const normalized = String(value).trim().replace(/\//g, '-').replace('T', ' ')
  const currentYear = generatedAt.value?.slice(0, 4) || String(new Date().getFullYear())
  const fullTime = /^\d{4}-\d{2}-\d{2}/.test(normalized)
    ? normalized
    : /^\d{2}-\d{2}$/.test(normalized)
      ? `${currentYear}-${normalized} 00:00:00`
      : /^\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(normalized)
        ? `${currentYear}-${normalized}`
        : null
  if (!fullTime) return null
  const date = new Date(fullTime.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

function padTime(value) {
  return String(value).padStart(2, '0')
}

function formatFullTime(date) {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())} `
    + `${padTime(date.getHours())}:${padTime(date.getMinutes())}:${padTime(date.getSeconds())}`
}

function formatDay(date) {
  return `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`
}

function formatTrendAxisLabel(value) {
  const date = typeof value === 'number' ? new Date(value) : parseTrendTime(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`
}

function getTrendAxisRange() {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - Number(period.value || 30) + 1)
  start.setHours(0, 0, 0, 0)
  return { min: start.getTime(), max: end.getTime() }
}

function normalizeDailyTrendRows(rows) {
  const grouped = new Map()
  rows.forEach(item => {
    const date = parseTrendTime(item.time)
    const count = Number(item.count)
    if (!date || !item.name || !Number.isFinite(count)) return
    date.setHours(0, 0, 0, 0)
    const bucket = formatFullTime(date)
    const key = `${item.name}\u0000${bucket}`
    const current = grouped.get(key) || {
      name: item.name,
      time: bucket,
      count: 0,
      totalCount: Number(item.totalCount) || 0,
      diseaseCount: Number(item.diseaseCount) || 0,
      detectionRate: Number(item.detectionRate) || 0
    }
    current.count += count
    grouped.set(key, current)
  })
  return [...grouped.values()]
    .sort((a, b) => a.time.localeCompare(b.time))
}

function escapeTooltip(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTrendOption() {
  const dailyRows = normalizeDailyTrendRows(trendRows.value)
  const timeline = [...new Set(dailyRows.map(item => item.time))].sort()
  const axisRange = getTrendAxisRange()
  const selectedName = selectedPestIndex.value === null ? null : pests[selectedPestIndex.value]?.name
  const trendPests = pests
  const categorySeries = trendPests.map((pest, index) => {
    const enabled = enabledSeries.value[index] && (!selectedName || pest.name === selectedName)
    const values = timeline.map(time => {
      const point = dailyRows.find(item => item.name === pest.name && item.time === time)
      const date = parseTrendTime(time)
      return [date.getTime(), point ? point.count : null]
    })
    return {
      name: pest.name,
      type: 'bar',
      stack: 'daily-total',
      data: enabled ? values : values.map(item => [item[0], null]),
      barMaxWidth: 30,
      itemStyle: { color: pest.color, borderRadius: [1, 1, 0, 0], opacity: enabled ? 0.9 : 0.2 },
      emphasis: {
        focus: 'series',
        itemStyle: { opacity: 1 }
      },
      blur: { itemStyle: { opacity: 0.3 } },
      animationDuration: 500,
      animationEasing: 'cubicOut'
    }
  })

  const detectionRateByTime = new Map()
  dailyRows.forEach(item => detectionRateByTime.set(item.time, item.detectionRate))
  const detectionRateSeries = {
    name: '病虫害检出率',
    type: 'line',
    yAxisIndex: 1,
    data: timeline.map(time => [parseTrendTime(time).getTime(), detectionRateByTime.get(time)]),
    smooth: 0.35,
    smoothMonotone: 'x',
    connectNulls: false,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { width: 2.5, color: '#159b72' },
    itemStyle: { color: '#ffffff', borderColor: '#159b72', borderWidth: 2 },
    emphasis: { focus: 'series', scale: 1.4, lineStyle: { width: 3 } },
    z: 5
  }
  const series = [...categorySeries, detectionRateSeries]

  trendHasData.value = dailyRows.length > 0
  trendSampleInsufficient.value = timeline.length === 1

  return {
    animationDurationUpdate: 450,
    color: trendPests.map(item => item.color),
    grid: { top: 38, right: 64, bottom: 58, left: 48, containLabel: false },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#ffffff',
      borderColor: '#dfe7e4',
      borderWidth: 1,
      padding: [10, 12],
      extraCssText: 'border-radius:1px;box-shadow:0 8px 24px rgba(35,70,55,.12);',
      axisPointer: { type: 'line', lineStyle: { color: '#a9bbb4', type: 'dashed' } },
      formatter(params) {
        const valid = params.filter(item => Array.isArray(item.value) && item.value[1] !== null && item.value[1] !== undefined)
        if (!valid.length) return ''
        const rows = valid.map(item => {
          const suffix = item.seriesName === '病虫害检出率' ? '%' : ' 次'
          const value = item.seriesName === '病虫害检出率'
            ? Number(item.value[1]).toFixed(2)
            : Number(item.value[1]).toFixed(0)
          return `<div class="trend-tooltip-row"><span><i style="background:${item.color}"></i>${escapeTooltip(item.seriesName)}</span><b>${value}${suffix}</b></div>`
        }).join('')
        const date = new Date(Number(valid[0].axisValue))
        const tooltipDate = `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())}`
        return `<div class="trend-tooltip"><div class="trend-tooltip-time">日期：${escapeTooltip(tooltipDate)}</div>${rows}</div>`
      }
    },
    xAxis: {
      type: 'time',
      min: axisRange.min,
      max: axisRange.max,
      minInterval: 24 * 60 * 60 * 1000,
      maxInterval: 24 * 60 * 60 * 1000,
      splitNumber: Number(period.value || 30),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#dfe7e4' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#7b8984',
        fontSize: 11,
        margin: 14,
        rotate: 0,
        hideOverlap: true,
        formatter: formatTrendAxisLabel
      },
      splitLine: { show: true, lineStyle: { color: '#e7edeb', type: 'dashed', width: 1 } }
    },
    yAxis: [
      {
        type: 'value',
        name: '识别次数',
        nameLocation: 'end',
        nameGap: 10,
        min: 0,
        minInterval: 1,
        nameTextStyle: {
          color: '#71817a',
          fontSize: 11,
          align: 'center',
          verticalAlign: 'bottom',
          padding: [0, 0, 6, 0]
        },
        axisLine: { show: true, lineStyle: { color: '#dfe7e4', width: 1 } },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          inside: false,
          margin: 8,
          color: '#71817a',
          fontSize: 11,
          formatter: '{value}'
        },
        splitLine: { show: true, lineStyle: { color: '#e7edeb', type: 'dashed', width: 1 } }
      },
      {
        type: 'value',
        name: '病虫害检出率',
        min: 0,
        max: 100,
        interval: 20,
        nameTextStyle: { color: '#899691', fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#899691', fontSize: 11, formatter: '{value}%' },
        splitLine: { show: false }
      }
    ],
    series
  }
}

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChartInstance = echarts.getInstanceByDom(trendChartRef.value) || echarts.init(trendChartRef.value)
  trendChartInstance.off('click')
  trendChartInstance.on('click', params => {
    if (params?.seriesName) selectPestByName(params.seriesName)
  })
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChartInstance || trendChartInstance.isDisposed()) return
  trendChartInstance.setOption(buildTrendOption(), { notMerge: true, lazyUpdate: true })
}

function resizeTrendChart() {
  trendChartInstance?.resize()
}

function disposeTrendChart() {
  if (trendChartInstance && !trendChartInstance.isDisposed()) trendChartInstance.dispose()
  trendChartInstance = null
}

function nullableNumber(value) {
  return value === null || value === undefined || value === '' ? null : Number(value)
}

function averageNullable(values) {
  const validValues = values.filter(value => Number.isFinite(value))
  if (!validValues.length) return null
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length
}

function normalizeEnvironmentDailyRows(rows) {
  const grouped = new Map()
  rows.forEach(source => {
    if (!source || typeof source !== 'object') return
    const date = parseTrendTime(source.time || source.date)
    if (!date) return
    const day = formatDay(date)
    const item = grouped.get(day) || {
      time: day,
      totalCount: 0,
      diseaseCount: 0,
      detectionRates: [],
      temperatures: [],
      humidities: [],
      precipitations: []
    }
    item.totalCount += toSafeNumber(source.totalCount)
    item.diseaseCount += toSafeNumber(source.diseaseCount)
    if (source.detectionRate !== null && source.detectionRate !== undefined && source.detectionRate !== '') {
      item.detectionRates.push(toSafeNumber(source.detectionRate))
    }
    if (source.temperature !== null && source.temperature !== undefined && source.temperature !== '') {
      item.temperatures.push(toSafeNumber(source.temperature))
    }
    if (source.humidity !== null && source.humidity !== undefined && source.humidity !== '') {
      item.humidities.push(toSafeNumber(source.humidity))
    }
    if (source.precipitation !== null && source.precipitation !== undefined && source.precipitation !== '') {
      item.precipitations.push(toSafeNumber(source.precipitation))
    }
    grouped.set(day, item)
  })
  return [...grouped.values()]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(item => ({
      time: item.time,
      totalCount: item.totalCount,
      diseaseCount: item.diseaseCount,
      detectionRate: item.totalCount > 0
        ? Number(((item.diseaseCount * 100) / item.totalCount).toFixed(2))
        : averageNullable(item.detectionRates),
      temperature: averageNullable(item.temperatures),
      humidity: averageNullable(item.humidities),
      precipitation: averageNullable(item.precipitations)
    }))
}

function applyEnvironmentRows(environment) {
  const sourceRows = Array.isArray(environment) ? environment : []
  const normalizedEnvironment = sourceRows
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      time: item.time,
      totalCount: toSafeNumber(item.totalCount),
      diseaseCount: toSafeNumber(item.diseaseCount),
      detectionRate: item.detectionRate == null ? null : toSafeNumber(item.detectionRate),
      temperature: item.temperature == null ? null : toSafeNumber(item.temperature),
      humidity: item.humidity == null ? null : toSafeNumber(item.humidity),
      precipitation: item.precipitation == null ? null : toSafeNumber(item.precipitation)
    }))
  environmentRows.value = normalizeEnvironmentDailyRows(normalizedEnvironment)
  if (!environmentRows.value.length) disposeEnvironmentChart()
}

function buildEnvironmentOption() {
  const rows = environmentRows.value
  const times = rows.map(item => item.time)
  const temperaturePeak = Math.max(
    0,
    ...rows
      .map(item => item.temperature)
      .filter(value => value !== null && value !== undefined)
      .map(Number)
      .filter(Number.isFinite)
  )
  const temperatureAxisMax = Math.max(40, Math.ceil(temperaturePeak / 10) * 10)
  const tooltipUnit = {
    '病害识别次数': '次',
    '病害检出率': '%',
    '平均温度': '℃',
    '平均湿度': '%',
    '平均降雨量': ' mm'
  }

  return {
    animationDuration: 500,
      color: [
      '#00ddff',
      '#20b486',
      '#f08c46',
      '#4f7fe8',
      '#43b9c5'
    ],
    grid: { left: 62, right: 116, top: 58, bottom: 58, containLabel: false },
    legend: {
      top: 8,
      left: 'center',
      data: [
        '病害识别次数',
        '病害检出率',
        '平均温度',
        '平均湿度',
        '平均降雨量'
      ],

      itemWidth: 10,
      itemHeight: 8,
      itemGap: 16,
      textStyle: { color: '#6d7a75', fontSize: 11 }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(255,255,255,.98)',
      borderColor: '#dfe9e5',
      borderWidth: 1,
      padding: [9, 12],
      textStyle: { color: '#34463f', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 24px rgba(34,71,57,.10);border-radius:1px;',
      formatter(params) {
        const title = params[0]?.axisValue || ''
        const lines = params
          .filter(item => item.value !== null && item.value !== undefined && item.value !== '-')
          .map(item => `${item.marker}${item.seriesName}<span style="float:right;margin-left:24px;font-weight:600">${Number(item.value).toFixed(item.seriesName === '病害识别次数' ? 0 : 2)}${tooltipUnit[item.seriesName] || ''}</span>`)
        return `<div style="font-weight:700;margin-bottom:6px">${title}</div>${lines.join('<br/>')}`
      }
    },
    xAxis: {
      type: 'category',
      data: times,
      boundaryGap: true,
      axisLine: { lineStyle: { color: '#dfe7e4' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#7b8984',
        fontSize: 11,
        margin: 14,
        rotate: 0,
        hideOverlap: true,
        formatter: formatTrendAxisLabel
      },
      splitLine: { show: true, lineStyle: { color: '#e7edeb', type: 'dashed', width: 1 } }
    },
    yAxis: [
      {
        type: 'value',
        name: '识别次数',
        min: 0,
        minInterval: 1,
        nameTextStyle: { color: '#899691', fontSize: 11, padding: [0, 0, 8, 0] },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#899691', fontSize: 11, formatter: '{value}' },
        splitLine: { show: true, lineStyle: { color: '#e7edeb', type: 'dashed', width: 1 } }
      },
      {
        type: 'value',
        min: 0,
        max: 100,
        interval: 20,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          margin: 12,
          formatter: value => Number(value) === 100
            ? `{axisTitle|检出率}\n{axisValue|${value}%}`
            : `{axisValue|${value}%}`,
          rich: {
            axisTitle: { width: 44, color: '#899691', fontSize: 11, lineHeight: 18, align: 'center' },
            axisValue: { width: 44, color: '#899691', fontSize: 11, lineHeight: 18, align: 'center' }
          }
        },
        splitLine: { show: false }
      },
      {
        type: 'value',
        position: 'right',
        offset: 54,
        min: 0,
        max: temperatureAxisMax,
        interval: temperatureAxisMax / 5,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          margin: 10,
          formatter: value => Number(value) === temperatureAxisMax
            ? `{axisTitle|温度 ℃}\n{axisValue|${value}}`
            : `{axisValue|${value}}`,
          rich: {
            axisTitle: { width: 52, color: '#899691', fontSize: 11, lineHeight: 18, align: 'center' },
            axisValue: { width: 52, color: '#899691', fontSize: 11, lineHeight: 18, align: 'center' }
          }
        },
        splitLine: { show: false }
      },
            {
        type: 'value',
        name: '平均降雨量',
        min: 0,
        show: false,

        axisLine: {
          show: false
        },

        axisTick: {
          show: false
        },

        axisLabel: {
          show: false
        },

        splitLine: {
          show: false
        }
      }
    ],
    series: [
  /*
   * 平均降雨量放在最底层。
   * 使用 ECharts Gradient Stacked Area Chart 中 Line 2 的风格。
   */
  {
    name: '平均降雨量',
    type: 'line',
    yAxisIndex: 3,

    data: rows.map(item => {
      return nullableNumber(
        item.precipitation
      )
    }),

    smooth: true,
    connectNulls: true,

    /*
     * 不显示折线和数据点，
     * 只保留蓝青色渐变面积。
     */
    showSymbol: false,
    symbol: 'none',

    lineStyle: {
      width: 0
    },

    areaStyle: {
      opacity: 0.3,

      color: new echarts.graphic.LinearGradient(
        0,
        0,
        0,
        1,
        [
          {
            offset: 0,
            color: 'rgb(0, 221, 255)'
          },
          {
            offset: 1,
            color: 'rgb(77, 119, 255)'
          }
        ]
      )
    },

    emphasis: {
      focus: 'series'
    },

    /*
     * z 越小，图层越靠下。
     * 降雨量作为环境背景放在底层。
     */
    z: 0,

    animationDuration: 600
  },

  /*
   * 病虫害识别次数柱状图。
   * z 设置为 3，显示在降雨量面积图上面。
   */
  {
    name: '病害识别次数',
    type: 'bar',
    yAxisIndex: 0,

    data: rows.map(item => {
      return Number(
        item.diseaseCount || 0
      )
    }),

    barMaxWidth: 22,

    itemStyle: {
      color: '#20b486',
      borderRadius: [2, 2, 0, 0],
      opacity: 0.88
    },

    emphasis: {
      focus: 'series'
    },

    z: 3
  },

  /*
   * 病虫害检出率。
   */
  {
    name: '病害检出率',
    type: 'line',
    yAxisIndex: 1,

    data: rows.map(item => {
      return nullableNumber(
        item.detectionRate
      )
    }),

    smooth: 0.32,
    connectNulls: true,
    symbol: 'circle',
    symbolSize: 6,

    lineStyle: {
      width: 2.4,
      color: '#d9687b'
    },

    itemStyle: {
      color: '#ffffff',
      borderColor: '#d9687b',
      borderWidth: 2
    },

    emphasis: {
      focus: 'series',
      scale: 1.3
    },

    z: 5
  },

  /*
   * 平均温度。
   */
  {
    name: '平均温度',
    type: 'line',
    yAxisIndex: 2,

    data: rows.map(item => {
      return nullableNumber(
        item.temperature
      )
    }),

    smooth: 0.3,
    connectNulls: true,
    symbol: 'none',

    lineStyle: {
      width: 1.8,
      color: '#f08c46'
    },

    itemStyle: {
      color: '#f08c46'
    },

    emphasis: {
      focus: 'series'
    },

    z: 4
  },

  /*
   * 平均湿度。
   */
  {
    name: '平均湿度',
    type: 'line',
    yAxisIndex: 1,

    data: rows.map(item => {
      return nullableNumber(
        item.humidity
      )
    }),

    smooth: 0.3,
    connectNulls: true,
    symbol: 'none',

    lineStyle: {
      width: 1.8,
      color: '#43b9c5',
      type: 'dashed'
    },

    emphasis: {
      focus: 'series'
    },

    z: 4
  }
]
  }
}

function updateEnvironmentChart() {
  if (!environmentChartRef.value || !environmentRows.value.length) return
  environmentChartInstance = echarts.getInstanceByDom(environmentChartRef.value) || echarts.init(environmentChartRef.value)
  environmentChartInstance.setOption(buildEnvironmentOption(), { notMerge: true, lazyUpdate: true })
}

function resizeEnvironmentChart() {
  environmentChartInstance?.resize()
}

function disposeEnvironmentChart() {
  if (environmentChartInstance && !environmentChartInstance.isDisposed()) environmentChartInstance.dispose()
  environmentChartInstance = null
}

const periodLabel = computed(() => {
  if (period.value === '7') {
    return '近7天'
  }

  if (period.value === '90') {
    return '近3个月'
  }

  return '近30天'
})

const dateRangeLabel = computed(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - Number(period.value || 30) + 1)
  const format = value => {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return `${format(start)} 至 ${format(end)}`
})

async function handlePeriodChange() {
  await loadDashboard()
  showToast(`时间范围已切换为${periodLabel.value}`)
}

async function handleParkChange() {
  await loadDashboard()
  const parkName = parkOptions.value.find(item => String(item.parkId) === selectedParkId.value)?.parkName
  showToast(parkName ? `已切换至${parkName}` : '已恢复全部园区')
}

function buildDashboardQuery(extra = {}) {
  return {
    days: Number(period.value),
    parkId: selectedParkId.value || undefined,
    ...extra
  }
}

const chartColors = ['#23a8f2', '#ff69b4', '#3867d6', '#f7d94c', '#ffb54a', '#32c47b', '#8b6cf6', '#1eb980']

function toSafeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return ''
  const value = url.trim()
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  return value.startsWith('/') ? `${baseApi}${value}` : `${baseApi}/${value}`
}

function resetPestInteraction() {
  selectedPestIndex.value = null
  hoveredPestIndex.value = null
  tooltipVisible.value = false
}

async function loadEnvironmentStats() {
  const requestId = ++environmentRequestSeq
  const diseaseName = selectedPest.value?.name
  try {
    const response = await getDiseaseAnalysisDashboard({
      ...buildDashboardQuery(),
      environmentDiseaseName: diseaseName || undefined
    })
    if (requestId !== environmentRequestSeq) return
    const data = response?.data && typeof response.data === 'object' ? response.data : {}
    applyEnvironmentRows(data.environment)
    await nextTick()
    updateEnvironmentChart()
  } catch (error) {
    console.error('加载环境关联数据失败：', error)
    if (requestId !== environmentRequestSeq) return
    environmentRows.value = []
    disposeEnvironmentChart()
  }
}

async function loadDashboard() {
  const requestId = ++dashboardRequestSeq
  environmentRequestSeq += 1
  loading.value = true
  trendError.value = false
  try {
    const response = await getDiseaseAnalysisDashboard(buildDashboardQuery())
    if (requestId !== dashboardRequestSeq) return
    const data = response?.data && typeof response.data === 'object'
      ? response.data
      : {}
    generatedAt.value = typeof data.generatedAt === 'string' ? data.generatedAt : ''
    const optionSource = Array.isArray(data.parkOptions) ? data.parkOptions : []
    parkOptions.value = optionSource
      .filter(item => item && item.parkId !== null && item.parkId !== undefined)
      .map(item => ({
        parkId: item.parkId,
        parkName: item.parkName || `园区${item.parkId}`
      }))
    const categories = Array.isArray(data.categories) ? data.categories : []
    resetPestInteraction()
    pests.splice(0, pests.length, ...categories.map((source, index) => {
      const item = source && typeof source === 'object' ? source : {}
      return {
      name: typeof item.name === 'string' && item.name ? item.name : '未知病虫害',
      count: toSafeNumber(item.count),
      rate: toSafeNumber(item.rate),
      color: chartColors[index % chartColors.length],
      avg: toSafeNumber(item.avgConfidence),
      max: toSafeNumber(item.maxConfidence),
      first: item.firstTime || '暂无记录',
      latest: item.latestTime || '暂无记录',
      result: item.result || '暂无诊断结论',
      description: item.description || '暂无症状描述',
      advice: item.advice || '暂无防治建议',
      imageUrl: normalizeImageUrl(item.imageUrl)
      }
    }))

    const trends = Array.isArray(data.trends) ? data.trends : []
    const aggregateRows = trends.map(source => {
      const item = source && typeof source === 'object' ? source : {}
      return {
      name: item.name,
      time: item.fullTime || item.time || item.date,
      confidence: toSafeNumber(item.avgConfidence),
      count: toSafeNumber(item.count),
      totalCount: toSafeNumber(item.totalCount),
      diseaseCount: toSafeNumber(item.diseaseCount),
      detectionRate: toSafeNumber(item.detectionRate)
      }
    }).filter(item => parseTrendTime(item.time))
    trendRows.value = aggregateRows

    enabledSeries.value = pests.map(() => true)

    const recordSource = Array.isArray(data.records) ? data.records : []
    records.splice(0, records.length, ...recordSource.map(source => {
      const item = source && typeof source === 'object' ? source : {}
      return {
      name: item.name || '未知病虫害',
      confidence: `${toSafeNumber(item.confidence).toFixed(2)}%`,
      time: item.time || '暂无记录',
      model: item.model || '未知模型',
      imageUrl: normalizeImageUrl(item.imageUrl)
      }
    }))

    applyEnvironmentRows(data.environment)
    await nextTick()
    updateTrendChart()
    updateEnvironmentChart()
    showToast(`已加载 ${toSafeNumber(data.totalCount)} 条识别结果`)
  } catch (error) {
    if (requestId !== dashboardRequestSeq) return
    console.error('加载病虫害统计数据失败：', error)
    trendError.value = true
    generatedAt.value = ''
    resetPestInteraction()
    pests.splice(0, pests.length)
    records.splice(0, records.length)
    trendRows.value = []
    environmentRows.value = []
    enabledSeries.value = []
    disposeEnvironmentChart()
    await nextTick()
    updateTrendChart()
    showToast('统计数据加载失败，请稍后重试')
  } finally {
    if (requestId === dashboardRequestSeq) loading.value = false
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
    return
  }

  document.exitFullscreen?.()
}

function showToast(message) {
  toastMessage.value = message
  toastVisible.value = true

  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastVisible.value = false
  }, 1600)
}

onMounted(async () => {
  await nextTick()
  initTrendChart()
  window.addEventListener('resize', resizeTrendChart)
  window.addEventListener('resize', resizeEnvironmentChart)
  await loadDashboard()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeTrendChart)
  window.removeEventListener('resize', resizeEnvironmentChart)
  disposeTrendChart()
  disposeEnvironmentChart()
})

</script>

<style scoped>
* {
  box-sizing: border-box;
}

.pest-analysis-page {
  width: 100vw;
  max-width: none;
  min-width: 1180px;
  min-height: 100vh;
  color: #263238;
  background: #f5f7f8;
  font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif;
}

button,
select,
input {
  font: inherit;
}

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
}

.brand-area,
.brand,
.top-actions,
.filter-group,
.filter-actions,
.card-header-actions {
  display: flex;
  align-items: center;
}

.brand-area {
  gap: 0;
}

.brand {
  width: 0;
  gap: 0;
  overflow: hidden;
  color: #173f33;
  font-size: 18px;
  font-weight: 700;
}

.brand-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #fff;
  border-radius: 10px;
  background: linear-gradient(135deg, #2bd69a, #14a976);
  box-shadow: 0 5px 12px rgba(30, 185, 128, 0.25);
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

.new-badge {
  margin-right: 5px;
  padding: 2px 5px;
  color: #109b68;
  font-size: 9px;
  border: 1px solid #baf0d8;
  border-radius: 5px;
  background: #e9fff6;
}

.top-actions,
.filter-group,
.filter-actions,
.card-header-actions {
  gap: 10px;
}

.top-actions {
  margin-left: auto;
  gap: 10px;
  flex-shrink: 0;
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

.icon-button,
.primary-button,
.secondary-button {
  height: 36px;
  padding: 0 13px;
  color: #42534d;
  border: 1px solid #dfe8e4;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: 0.2s ease;
}

.icon-button {
  width: 36px;
  padding: 0;
}

.icon-button:hover,
.secondary-button:hover {
  color: #1eb980;
  border-color: #1eb980;
}

.primary-button {
  color: #fff;
  font-weight: 600;
  border-color: #1eb980;
  background: #1eb980;
}

.primary-button:hover {
  background: #109b68;
}

.page-content {
  width: 100%;
  padding: 16px 18px 22px;
}

.filter-bar {
  margin-bottom: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #edf1f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(26, 72, 54, 0.06);
}

.form-control {
  height: 34px;
  padding: 0 10px;
  color: #41524c;
  border: 1px solid #dde6e2;
  border-radius: 7px;
  outline: none;
  background: #fff;
}

.form-control:focus {
  border-color: #1eb980;
}

.park-control {
  width: 150px;
  min-width: 150px;
}

.park-control:disabled {
  color: #8a9691;
  cursor: wait;
  background: #f6f8f7;
}

.date-control {
  width: 240px;
  min-width: 240px;
  flex-shrink: 0;
}

.hint-text {
  color: #7b8794;
  font-size: 12px;
}

.top-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 31fr) minmax(0, 69fr);
  gap: 14px;
}

.bottom-grid {
  margin-top: 14px;
  align-items: stretch;
}

.bottom-grid > .detail-card {
  margin-bottom: 0;
}

.analysis-card {
  display: flex;
  flex-direction: column;
}

.card {
  overflow: hidden;
  border: 1px solid #dde9e4;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 32px rgba(24, 72, 52, 0.08);
}

.card-header {
  min-height: 70px;
  padding: 14px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #edf3f0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 253, 251, 0.96));
}

.card-title-block {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title-accent {
  width: 6px;
  height: 22px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: linear-gradient(180deg, #45a276 0%, #4b7ee8 100%);
  box-shadow: 0 8px 18px rgba(69, 162, 118, 0.22);
}

.card-title {
  display: block;
  color: #17332b;
  font-size: 17px;
  line-height: 1.2;
  font-weight: 800;
}

.card-subtitle {
  display: block;
  margin-top: 5px;
  color: #98a5a0;
  font-size: 12px;
  line-height: 1.25;
}

.card-body {
  padding: 14px 16px;
}

.summary-row {
  margin-bottom: 10px;
  display: flex;
  gap: 14px;
  color: #5d6c66;
  font-size: 13px;
}

.summary-row b {
  color: #273a33;
}

.selection-chip {
  min-height: 30px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #2b8a63;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #c9e7d8;
  border-radius: 999px;
  background: #f2fbf6;
  cursor: pointer;
  white-space: nowrap;
}

.selection-chip b {
  color: #19875d;
}

.category-layout {
  min-height: 274px;
  container-type: inline-size;
  display: grid;
  grid-template-columns: 195px minmax(0, 1fr);
  align-items: center;
  gap: 22px;
}

.donut-wrapper {
  position: relative;
  width: 195px;
  height: 195px;
  flex: 0 0 195px;
  overflow: visible;
}

.donut-svg {
  width: 195px;
  height: 195px;
  overflow: visible;
}

.donut-segment {
  cursor: pointer;
  transform-origin: 120px 120px;
  transform-box: view-box;
  stroke: #fff;
  stroke-width: 1.15;
  transition:
    transform 0.16s ease,
    opacity 0.16s ease,
    filter 0.16s ease;
}

.donut-segment.is-dim {
  opacity: 0.38;
}

.donut-segment.is-active {
  filter: drop-shadow(0 4px 5px rgba(37, 73, 59, 0.15));
}

.donut-hole {
  fill: #fff;
  stroke: #edf2ef;
  stroke-width: 1.2;
}

.donut-center {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
}

.donut-center strong {
  color: #2b3d36;
  font-size: 27px;
  line-height: 1;
}

.donut-center span {
  margin-top: 7px;
  color: #617069;
  font-size: 12px;
  font-weight: 600;
}

.donut-center small {
  margin-top: 5px;
  color: #9aa6a0;
  font-size: 10px;
}

.donut-tooltip {
  position: absolute;
  z-index: 8;
  min-width: 176px;
  padding: 11px 12px;
  color: #fff;
  font-size: 11px;
  line-height: 1.7;
  border-radius: 9px;
  background: rgba(31, 48, 41, 0.96);
  box-shadow: 0 10px 24px rgba(20, 45, 35, 0.22);
  pointer-events: none;
}

.tooltip-title {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 700;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #dfe9e5;
}

.tooltip-row b {
  color: #fff;
}

.category-list {
  min-width: 0;
  max-height: 236px;
  padding-right: 5px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #b8cec4 #f2f6f4;
  overscroll-behavior: contain;
}

.category-list:focus-visible {
  outline: 2px solid rgba(53, 139, 101, .22);
  outline-offset: 3px;
  border-radius: 6px;
}

.category-list::-webkit-scrollbar {
  width: 5px;
}

.category-list::-webkit-scrollbar-track {
  border-radius: 5px;
  background: #f2f6f4;
}

.category-list::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: #b8cec4;
}

.category-list::-webkit-scrollbar-thumb:hover {
  background: #8fb3a3;
}

.category-item {
  --item-color: transparent;
  position: relative;
  min-width: 0;
  min-height: 36px;
  padding: 5px 8px;
  display: grid;
  grid-template-columns: 24px 10px minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: clamp(5px, .7vw, 9px);
  color: #4d5f58;
  font-size: 12px;
  border: 1px solid #e5ece8;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(35, 70, 55, .035);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.category-item::before {
  content: "";
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 3px;
  border-radius: 3px;
  background: transparent;
}

.category-item:hover,
.category-item.hovered {
  background: #f4faf7;
  border-color: color-mix(in srgb, var(--item-color) 42%, #dfe9e4);
  box-shadow: 0 7px 16px rgba(35, 70, 55, .08);
  transform: translateY(-1px);
}

.category-item.active {
  color: #24493b;
  font-weight: 700;
  background: #eaf8f2;
  border-color: color-mix(in srgb, var(--item-color) 48%, #d7e8df);
}

.category-item.active::before {
  background: var(--item-color);
}

.rank-number {
  color: #a1aca7;
  font-size: 10px;
  font-weight: 700;
}

.category-item.active .rank-number {
  color: #109b68;
}

.color-dot {
  width: 8px;
  height: 8px;
  display: inline-block;
  flex: 0 0 auto;
  border-radius: 50%;
}

.category-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.category-count,
.category-rate {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.category-count {
  color: #6d7a75;
  font-size: 11px;
}

.category-rate {
  color: #42564e;
  font-size: 12px;
  font-weight: 700;
}

.trend-chart-wrapper {
  position: relative;
  height: 320px;
}

.chart-toolbar {
  position: relative;
  z-index: 3;
  min-height: 38px;
  padding: 0 8px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.series-list,
.analysis-legend {
  display: flex;
  align-items: center;
}

.series-list {
  gap: 12px;
  flex-wrap: wrap;
}

.series-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #6d7a75;
  font-size: 11px;
  cursor: pointer;
}

.series-item.disabled {
  opacity: 0.35;
}

.trend-chart-canvas {
  width: calc(100% + 24px);
  height: 282px;
  margin-left: -24px;
}

.trend-chart-state {
  position: absolute;
  top: 38px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #84918c;
  font-size: 12px;
  background: #fff;
}

.trend-chart-state strong {
  color: #53635d;
  font-size: 13px;
}

.trend-chart-state p {
  margin: 0;
  color: #9aa6a1;
}

.trend-loading-dot {
  width: 18px;
  height: 18px;
  border: 2px solid #dcebe5;
  border-top-color: #1eb980;
  border-radius: 50%;
  animation: trend-loading 0.8s linear infinite;
}

.trend-retry-button {
  padding: 5px 12px;
  color: #168b64;
  font-size: 11px;
  border: 1px solid #b9dfd0;
  border-radius: 6px;
  background: #f4fbf8;
  cursor: pointer;
}

.trend-sample-note {
  position: absolute;
  right: 30px;
  bottom: 8px;
  z-index: 4;
  padding: 4px 8px;
  color: #8a9691;
  font-size: 10px;
  border-radius: 5px;
  background: rgba(247, 250, 249, 0.94);
}

.trend-chart-wrapper :deep(.trend-tooltip) {
  min-width: 188px;
  color: #4e5d57;
  font-size: 12px;
}

.trend-chart-wrapper :deep(.trend-tooltip-time) {
  margin-bottom: 7px;
  color: #34463f;
  font-weight: 700;
}

.trend-chart-wrapper :deep(.trend-tooltip-row) {
  min-width: 176px;
  margin-top: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.trend-chart-wrapper :deep(.trend-tooltip-row span) {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.trend-chart-wrapper :deep(.trend-tooltip-row i) {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
}

.trend-chart-wrapper :deep(.trend-tooltip-row b) {
  color: #263a32;
  font-variant-numeric: tabular-nums;
}

@keyframes trend-loading {
  to { transform: rotate(360deg); }
}

.analysis-chart svg {
  width: 100%;
  height: 100%;
  display: block;
}

.axis-text {
  fill: #83918b;
  font-size: 10px;
}

.grid-line {
  stroke: #e9eeec;
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.trend-line {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-point {
  cursor: pointer;
}

.detail-card .card-body {
  padding: 12px;
}

.detail-empty {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #899690;
  text-align: center;
}

.detail-empty strong {
  color: #52645d;
  font-size: 14px;
}

.detail-empty span {
  max-width: 220px;
  color: #98a49f;
  font-size: 12px;
  line-height: 1.7;
}

.detail-select {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #dce6e1;
  border-radius: 7px;
  background: #fff;
}

.pest-image {
  position: relative;
  height: 132px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(145deg, #dcefd7, #7dbd77);
}

.pest-image svg {
  width: 100%;
  height: 100%;
}

.pest-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.status-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 8px;
  color: #109b68;
  font-size: 11px;
  border: 1px solid #aee6ce;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
}

.risk-tag {
  margin-top: 10px;
  padding: 5px 8px;
  display: inline-flex;
  align-items: center;
  color: #c47a00;
  font-size: 11px;
  border-radius: 6px;
  background: #fff7e7;
}

.metric-list {
  margin-top: 10px;
  display: grid;
  gap: 7px;
}

.metric-row {
  padding-bottom: 6px;
  display: flex;
  justify-content: space-between;
  color: #728079;
  font-size: 12px;
  border-bottom: 1px dashed #eef2f0;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-row b {
  color: #2e4038;
}

.analysis-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 14px;
}

.analysis-title {
  margin: 4px 0;
  color: #40514b;
  font-size: 13px;
  text-align: center;
}

.analysis-legend {
  margin-bottom: 4px;
  justify-content: center;
  gap: 18px;
  color: #69766f;
  font-size: 11px;
}

.analysis-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.analysis-chart {
  min-height: 265px;
  flex: 1;
}

.environment-chart-shell {
  position: relative;
  min-height: 300px;
  flex: 1;
  margin-top: 4px;
}

.environment-chart-canvas {
  width: 100%;
  height: 100%;
}

.environment-chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  color: #7d8b85;
  background: #fff;
}

.environment-chart-empty strong {
  color: #52635c;
  font-size: 13px;
}

.environment-chart-empty span {
  font-size: 11px;
}

.footer-note {
  color: #9aa5a0;
  font-size: 11px;
  text-align: right;
}

.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(13, 30, 24, 0.22);
}

.drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 470px;
  padding: 18px;
  overflow: auto;
  background: #fff;
  box-shadow: -10px 0 35px rgba(0, 0, 0, 0.12);
}

.drawer-header {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-header h3 {
  margin: 0;
  font-size: 17px;
}


.drawer-close {
  padding: 0;
  color: #7c8a84;
  font-size: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.drawer-description {
  margin-bottom: 8px;
  color: #7b8794;
  font-size: 12px;
}

.record-item {
  padding: 12px 0;
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  border-bottom: 1px solid #eef2f0;
}

.record-image {
  height: 72px;
  border-radius: 8px;
  background: linear-gradient(145deg, #dcefd7, #78bb6f);
  background-position: center;
  background-size: cover;
}

.record-item h4 {
  margin: 0 0 7px;
  font-size: 13px;
}

.record-item p {
  margin: 3px 0;
  color: #748079;
  font-size: 11px;
}

.record-item strong {
  color: #109b68;
}

.toast-message {
  position: fixed;
  top: 78px;
  left: 50%;
  z-index: 100;
  padding: 9px 14px;
  color: #fff;
  font-size: 12px;
  border-radius: 8px;
  background: #243f34;
  transform: translateX(-50%);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
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

  .category-layout {
    grid-template-columns: 176px minmax(0, 1fr);
    gap: 10px;
  }

  .donut-wrapper,
  .donut-svg {
    width: 176px;
    height: 176px;
  }
}
</style>
