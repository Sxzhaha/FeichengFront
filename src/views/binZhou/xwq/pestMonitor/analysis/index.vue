<template>
  <div class="analysis-page">
    <div class="module-tabs">
      <button class="tab active">总览</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/image')">虫情图片</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/ai')">智能分析</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/report')">历史数据与报告</button>
      <div class="toolbar-spacer"></div>
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

        <el-form-item label="预警等级">
          <el-select
            v-model="queryParams.warningLevel"
            popper-class="xwq-sharp-popper"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <el-option label="无" value="无" />
            <el-option label="低" value="低" />
            <el-option label="中" value="中" />
            <el-option label="高" value="高" />
          </el-select>
        </el-form-item>

        <el-form-item label="统计范围">
          <el-date-picker
            v-model="dateRange"
            popper-class="xwq-sharp-popper"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 260px"
          />
        </el-form-item>

        <el-form-item class="search-actions">
          <div class="button-row">
            <el-button class="reference-action-btn reference-primary-btn" type="primary" @click="refreshData">查询</el-button>
            <el-button class="reference-action-btn reference-secondary-btn" @click="resetQuery">重置</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-loading="loading">
      <!-- <div class="stat-strip capture-stat-strip">
        <div>
          <span>有效拍摄</span>
          <b>{{ captureQuality.validCaptureCount || '--' }}</b>
          <small>次</small>
        </div>
        <div>
          <span>单次平均虫量</span>
          <b>{{ captureQuality.validCaptureCount ? formatMetric(captureQuality.averageHeads, 'average') : '--' }}</b>
          <small>头/次</small>
        </div>
        <div>
          <span>阳性拍摄率</span>
          <b>{{ captureQuality.validCaptureCount ? formatMetric(captureQuality.positiveRate, 'average') : '--' }}</b>
          <small>%</small>
        </div>
        <div>
          <span>涉及设备</span>
          <b>{{ captureQuality.deviceCount || '--' }}</b>
          <small>台</small>
        </div>
      </div> -->

      <div class="overview-grid">
        <section class="white-card ratio-card">
          <div class="section-title">
            害虫指标占比
            <span>{{ metricLabel }}：{{ formatMetric(totalCount) }} {{ metricUnit }}　害虫种类：{{ pestRatio.length }}种</span>
          </div>

          <div v-if="pestRatio.length" class="ratio-body">
            <div
              ref="donutWrapRef"
              class="donut-wrapper"
              @mouseleave="endPestPreview"
            >
              <svg
                class="donut-svg"
                viewBox="0 0 240 240"
                aria-label="害虫占比环形图"
              >
                <path
                  v-for="segment in donutSegments"
                  :key="segment.name"
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
                  @mouseenter="previewPestRatio(segment.index)"
                  @click.stop="selectPestFromList(segment.name, segment.index)"
                />

                <circle class="donut-hole" cx="120" cy="120" r="49" />
              </svg>

              <div class="donut-center">
                <strong>{{ donutCenter.main }}</strong>
                <span>{{ donutCenter.sub }}</span>
                <small>{{ donutCenter.extra }}</small>
              </div>
            </div>

            <div class="rank-list">
              <div
                v-for="(item, index) in pestRatio"
                :key="item.name"
                class="rank-row"
                :class="{
                  active: item.name === selectedPest,
                  hovered: index === hoveredPestIndex
                }"
                :style="{ '--item-color': item.color }"
                @mouseenter="previewPestRatio(index)"
                @mouseleave="endPestPreview"
                @click="selectPestFromList(item.name, index)"
              >
                <b class="rank-number">{{ String(index + 1).padStart(2, '0') }}</b>
                <i :style="{ background: item.color }"></i>
                <span :title="item.name">{{ item.name }}</span>
                <em>{{ formatMetric(item.count) }} {{ metricUnit }}</em>
                <strong>{{ item.percent }}%</strong>
              </div>
            </div>
          </div>

          <el-empty v-else description="暂无虫情占比数据" :image-size="90" />
        </section>

        <section class="white-card trend-card">
          <div class="section-title">
            虫情趋势
            <span>{{ dateRangeText }}　单位：{{ metricUnit }}</span>
          </div>

          <div class="chart-toolbar">
            <div class="legend-line">
                            <span
                v-for="item in topTrendPests"
                :key="item.name"
                :class="{ disabled: !isTrendEnabled(item.name) }"
                @click="toggleTrendSeries(item.name)"
              >
                <i :style="{ background: item.color }"></i>{{ item.name }}
              </span>
            </div>

            <div class="chart-control-groups">
              <div class="series-actions metric-switch" aria-label="虫情统计口径">
                <button type="button" :class="{ active: metricMode === 'average' }" @click="metricMode = 'average'">单次平均</button>
                <button type="button" :class="{ active: metricMode === 'peak' }" @click="metricMode = 'peak'">当日峰值</button>
                <button type="button" :class="{ active: metricMode === 'total' }" @click="metricMode = 'total'">原始累计</button>
              </div>
              <div class="series-actions" aria-label="虫情趋势显示控制">
                <button type="button" :class="{ active: allSeriesSelected }" @click="selectAllTrendSeries(true)">全选</button>
                <button type="button" :class="{ active: noSeriesSelected }" @click="selectAllTrendSeries(false)">全不选</button>
              </div>
            </div>
          </div>

          <div class="chart-wrap">
            <div class="y-axis">
              <span>{{ formatAxisValue(trendMax) }}</span>
              <span>{{ formatAxisValue(trendMax * 0.8) }}</span>
              <span>{{ formatAxisValue(trendMax * 0.6) }}</span>
              <span>{{ formatAxisValue(trendMax * 0.4) }}</span>
              <span>{{ formatAxisValue(trendMax * 0.2) }}</span>
              <span>0</span>
            </div>

            <div class="line-chart">
                            <svg viewBox="0 0 900 260" preserveAspectRatio="none">
                <path
                  v-for="line in trendLines"
                  v-show="isTrendEnabled(line.name)"
                  :key="line.name"
                  :d="line.path"
                  fill="none"
                  :stroke="line.color"
                  :stroke-width="line.width"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <div class="x-axis">
                <span v-for="d in dateLabels" :key="d.key">{{ d.label }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="white-card influence-card">
        <div class="influence-head">
          <el-select
            v-model="selectedPest"
            size="large"
            class="pest-select"
            popper-class="xwq-sharp-popper"
            placeholder="选择虫害"
          >
            <el-option
              v-for="item in pestRatio"
              :key="item.name"
              :label="item.name"
              :value="item.name"
            />
          </el-select>

          <div class="sub-tabs">
            <button :class="{ active: analysisMode === 'env' }" @click="analysisMode = 'env'">
              虫情趋势与环境因素的影响
            </button>
            <button :class="{ active: analysisMode === 'year' }" @click="analysisMode = 'year'">
              不同年份虫情趋势对比
            </button>
            <button :class="{ active: analysisMode === 'device' }" @click="analysisMode = 'device'">
              不同设备虫情趋势对比
            </button>
          </div>
        </div>

        <div class="influence-body">
          <aside class="pest-profile">
            <div class="pest-photo">
              <el-image
                v-if="selectedPestImage"
                :src="selectedPestImage"
                fit="cover"
                class="pest-real-image"
                :preview-src-list="[selectedPestImage]"
                preview-teleported
                hide-on-click-modal
              >
                <template #error>
                  <div class="pest-image-empty">
                    {{ selectedPest || '暂无虫情图片' }}
                  </div>
                </template>
              </el-image>

              <div v-else class="pest-image-empty">
                {{ selectedPest || '暂无虫情图片' }}
              </div>

              <span v-if="selectedPest" class="pest-image-name">
                {{ selectedPest }}
              </span>
            </div>

            <dl>
              <dt>虫害类别</dt><dd>{{ selectedPest }}</dd>
              <dt>{{ metricLabel }}</dt><dd>{{ formatMetric(selectedPestData.count) }} {{ metricUnit }}</dd>
              <dt>占比</dt><dd>{{ selectedPestData.percent || 0 }}%</dd>
              <dt>风险等级</dt><dd>{{ riskLevel }}</dd>
            </dl>
          </aside>

                    <div class="env-chart">
            <div class="env-chart-head">
              <h3>{{ detailChartTitle }}</h3>
              <div class="chart-unit-tags">
                <span>虫量：{{ metricUnit }}</span>
                <span v-if="analysisMode === 'env'">温度：°C</span>
                <span v-if="analysisMode === 'env'">湿度：%</span>
              </div>
            </div>
            <div class="env-legend">
              <span
                v-for="item in detailSeries"
                :key="item.name"
                :class="{ disabled: !isDetailSeriesEnabled(item.name) }"
                @click="toggleDetailSeries(item.name)"
              >
                <i :style="{ background: item.color }"></i>{{ item.name }}
                            </span>

              <el-button
                v-if="analysisMode === 'env' && metricMode === 'total'"
                size="small"
                type="primary"
                plain
                :loading="predicting"
                @click.stop="loadPestPredict(3, { force: true })"
              >
                预测3天
              </el-button>
                        </div>

                        <div class="env-chart-plot">
              <div class="env-y-axis">
                <em>虫量({{ metricUnit }})</em>
                <span v-for="value in detailCountYAxis" :key="value">{{ value }}</span>
              </div>

              <div class="env-chart-scroll">
                <svg
                  :viewBox="`0 0 ${detailChartWidth} 310`"
                  :style="{ width: `${detailChartWidth}px` }"
                  preserveAspectRatio="none"
                >
                  <path
                    v-for="item in detailSeries"
                    v-show="isDetailSeriesEnabled(item.name)"
                    :key="item.name"
                    :d="item.path"
                    fill="none"
                    :stroke="item.color"
                    :stroke-width="item.width || 3"
                    :stroke-dasharray="item.dashed ? '7 7' : ''"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <div class="x-axis env" :style="{ width: `${detailChartWidth}px` }">
                  <span v-for="d in detailDateLabels" :key="d">{{ d }}</span>
                </div>
              </div>

              <div v-if="analysisMode === 'env'" class="env-right-axes">
                <div class="env-y-axis env-y-axis-right temperature-axis">
                  <em>温度(°C)</em>
                  <span
                    v-for="value in temperatureYAxis"
                    :key="`temperature-${value}`"
                  >
                    {{ value }}
                  </span>
                </div>

                <div class="env-y-axis env-y-axis-right humidity-axis">
                  <em>湿度(%)</em>
                  <span
                    v-for="value in humidityYAxis"
                    :key="`humidity-${value}`"
                  >
                    {{ value }}
                  </span>
                </div>
              </div>
              <div v-else class="env-axis-placeholder"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listPest, listPestImages, predictPestTrend } from '@/api/binZhou/xwq/pest'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'
import { listWeatherLive } from '@/api/binZhou/ld/iot/weatherLive'
import { listWeatherForecast } from '@/api/binZhou/ld/iot/weatherForecast'

const router = useRouter()

const loading = ref(false)
const predicting = ref(false)
const predictDays = ref(3)
const predictResult = ref(null)
const weatherLiveRows = ref([])
const weatherForecastRows = ref([])

const analysisMode = ref('env')
const metricMode = ref('average')
const selectedPest = ref('')
const hoveredPestIndex = ref(null)
const enabledTrendSeries = ref({})
const enabledDetailSeries = ref({})
const dateRange = ref([])
const monitorScopePath = ref([])
const donutWrapRef = ref(null)

const queryParams = ref({
  parkId: undefined,
  areaId: undefined,
  locationId: undefined,
  deviceId: undefined,
  pestName: '',
  warningLevel: ''
})

const parkOptions = ref([])
const areaOptions = ref([])
const locationOptions = ref([])
const deviceOptions = ref([])

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
        const rows = res.data || res.rows || []
        resolve(rows.map(item => ({
          value: buildScopeValue('area', item.areaId),
          label: item.areaName,
          leaf: false
        })))
        return
      }

      if (level === 2) {
        const res = await listLocationByAreaId(parentId)
        const rows = res.data || res.rows || []
        resolve(rows.map(item => ({
          value: buildScopeValue('location', item.locationId),
          label: item.locationName,
          leaf: false
        })))
        return
      }

      if (level === 3) {
        const res = await listDevice({ pageNum: 1, pageSize: 999, locationId: parentId })
        const rows = (res.rows || res.data || []).filter(item => String(item.locationId || '') === String(parentId))
        resolve(rows.map(item => ({
          value: buildScopeValue('device', item.deviceId),
          label: item.deviceName || item.deviceSn || `设备${item.deviceId}`,
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

const DEFAULT_SCOPE = {
  parkName: '滨州园区',
  areaName: '01地块',
  locationName: '东北',
  deviceName: '滨州园区01地块虫情测试仪'
}

const PEST_PREDICT_CACHE_PREFIX = 'xwq:pest-analysis:predict:'


const rawRows = ref([])
const rawImageRows = ref([])
const pestRows = ref([])
const pestRatio = ref([])
const weatherLive = ref(null)

const colors = ['#12b886', '#3267d6', '#21a7f3', '#d946ef', '#f5c400', '#f08c00', '#5ed279', '#8b6bd6']
const DEFAULT_TREND_VISIBLE_COUNT = 5

onMounted(async () => {
  await loadParkOptions()
  await initDefaultScope()
  refreshData()
})

const filteredRows = computed(() => {
  let rows = rawRows.value

  if (queryParams.value.pestName) {
    rows = rows.filter(row => String(row.pestName || '').includes(queryParams.value.pestName))
  }

  if (queryParams.value.warningLevel) {
    rows = rows.filter(row => String(row.warningLevel || '') === queryParams.value.warningLevel)
  }

  if (dateRange.value?.length) {
    const start = new Date(`${dateRange.value[0]} 00:00:00`).getTime()
    const end = new Date(`${dateRange.value[1]} 23:59:59`).getTime()
    rows = rows.filter(row => {
      const time = getRowTime(row)
      if (!time) return true
      return time >= start && time <= end
    })
  }

  return rows
})

const filteredImageRows = computed(() => {
  if (!dateRange.value?.length) return rawImageRows.value

  const start = new Date(`${dateRange.value[0]} 00:00:00`).getTime()
  const end = new Date(`${dateRange.value[1]} 23:59:59`).getTime()
  return rawImageRows.value.filter(row => {
    const time = getImageRowTime(row)
    return time && time >= start && time <= end
  })
})

const detectionEntries = computed(() => buildDetectionEntries(filteredRows.value))
const captureIndex = computed(() => buildCaptureIndex(filteredImageRows.value))

const metricLabel = computed(() => {
  if (metricMode.value === 'average') return '单次平均虫量'
  if (metricMode.value === 'peak') return '当日峰值'
  return '原始累计虫量'
})

const metricUnit = computed(() => {
  if (metricMode.value === 'average') return '头/次'
  if (metricMode.value === 'peak') return '头'
  return '识别头次'
})

const captureQuality = computed(() => buildCaptureQuality())
const totalCount = computed(() => pestRatio.value.reduce((sum, item) => sum + Number(item.count || 0), 0))
const topPestName = computed(() => pestRatio.value[0]?.name || '暂无')
const topRatio = computed(() => pestRatio.value[0]?.percent || 0)
const selectedPestData = computed(() => pestRatio.value.find(item => item.name === selectedPest.value) || pestRatio.value[0] || { name: '暂无', count: 0, percent: 0, color: '#12b886' })

/**
 * 当前虫害代表图：
 * 1. 仅使用当前筛选范围中的真实识别记录；
 * 2. 只显示图片表中的原图 imageUrl；
 * 3. 同类记录优先置信度高、识别时间新的图片。
 */
const selectedPestImage = computed(() => {
  const pestName = String(selectedPest.value || '').trim()
  if (!pestName) return ''

  const rows = filteredRows.value
    .filter(row => String(row.pestName || '').trim() === pestName)
    .slice()
    .sort(comparePestImageRows)

  for (const row of rows) {
    // 只显示图片表中的原图，不使用模型结果图。
    if (row.imageUrl) {
      return normalizeImageUrl(row.imageUrl)
    }
  }

  return ''
})

const topTrendPests = computed(() => pestRatio.value)
const allSeriesSelected = computed(() => topTrendPests.value.length > 0 && topTrendPests.value.every(item => isTrendEnabled(item.name)))
const noSeriesSelected = computed(() => topTrendPests.value.length > 0 && topTrendPests.value.every(item => !isTrendEnabled(item.name)))

const activePestIndex = computed(() => {
  if (Number.isInteger(hoveredPestIndex.value)) return hoveredPestIndex.value
  return pestRatio.value.findIndex(item => item.name === selectedPest.value)
})

const donutCenter = computed(() => {
  const active = Number.isInteger(hoveredPestIndex.value)
    ? pestRatio.value[hoveredPestIndex.value]
    : selectedPestData.value

  if (!active?.name || active.name === '暂无') {
    return { main: formatMetric(totalCount.value), sub: metricLabel.value, extra: `共${pestRatio.value.length}种虫害` }
  }

  return {
    main: `${active.percent || 0}%`,
    sub: active.name,
    extra: `${formatMetric(active.count)} ${metricUnit.value}`
  }
})

const donutSegments = computed(() => {
  const total = totalCount.value || 1
  let startAngle = 0

  return pestRatio.value.map((item, index) => {
    const rawAngle = Number(item.count || 0) / total * 360
    const endAngle = index === pestRatio.value.length - 1 ? 360 : startAngle + rawAngle
    const safeGap = rawAngle > 8 && pestRatio.value.length > 1 ? 1.2 : 0
    const drawStart = startAngle + safeGap
    const drawEnd = Math.max(drawStart + 0.5, endAngle - safeGap)
    const middleAngle = (startAngle + endAngle) / 2

    const isHover = hoveredPestIndex.value === index
    const isSelected = selectedPest.value === item.name
    const isActive = isHover || isSelected
    const hasActive = activePestIndex.value >= 0
    const isDim = hasActive && !isActive

    const offset = isHover ? 6 : isSelected ? 4 : 0
    const radians = (middleAngle - 90) * Math.PI / 180

    const segment = {
      index,
      name: item.name,
      color: item.color,
      isActive,
      isDim,
      translateX: Math.cos(radians) * offset,
      translateY: Math.sin(radians) * offset,
      path: createDonutPath(120, 120, 94, 48, drawStart, drawEnd)
    }

    startAngle = endAngle
    return segment
  })
})

const dateRangeText = computed(() => dateRange.value?.length ? `${dateRange.value[0]} 至 ${dateRange.value[1]}` : '全部时间')

const warningCount = computed(() => filteredRows.value.filter(row => String(row.warningLevel || '无') !== '无').length)
const riskLevel = computed(() => {
  const { validCaptureCount, averageHeads, positiveRate } = captureQuality.value
  if (!validCaptureCount) return filteredRows.value.length ? '数据不足' : '暂无数据'
  if (averageHeads >= 10 || positiveRate >= 70) return '高风险'
  if (averageHeads >= 4 || positiveRate >= 30 || warningCount.value > 0) return '中风险'
  return '低风险'
})

const dateLabels = computed(() => buildDateLabels())
const trendDateKeys = computed(() => dateLabels.value.map(item => item.key))
const trendMax = computed(() => {
  const values = trendLines.value.flatMap(line => line.values)
  return getNiceAxisMax(values)
})

const trendLines = computed(() => {
  const series = topTrendPests.value.map(item => ({
    item,
    values: buildTrendForPest(item.name)
  }))
  const max = getNiceAxisMax(series.flatMap(item => item.values))

  return series.map(({ item, values }, index) => {
    return {
      name: item.name,
      color: item.color,
      values,
      width: index === 0 ? 4 : 2.5,
      path: buildSmoothPath(values, 900, 260, max)
    }
  })
})

const selectedPestTrend = computed(() => buildTrendForPest(selectedPest.value))
const detailChartWidth = computed(() => Math.max(1800, detailDateLabels.value.length * 150))
const detailCountMax = computed(() => getDetailCountMax())
const detailCountYAxis = computed(() => buildAxisLabels(detailCountMax.value))

const temperatureRange = computed(() => {
  return getTemperatureRange()
})

const temperatureYAxis = computed(() => {
  return buildRangeAxisLabels(
    temperatureRange.value.min,
    temperatureRange.value.max
  )
})

const humidityYAxis = computed(() => {
  return [100, 80, 60, 40, 20, 0]
})
const detailDateLabels = computed(() => {
  if (analysisMode.value === 'year') {
    return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  }

  if (analysisMode.value === 'env' && metricMode.value === 'total' && predictResult.value?.labels?.length) {
    return predictResult.value.labels
  }

  return dateLabels.value.map(item => item.label)
})
const currentWeather = computed(() => ({
  temperature: toFiniteNumber(weatherLive.value?.temperature),
  humidity: toFiniteNumber(weatherLive.value?.humidity)
}))

const detailChartTitle = computed(() => {
  const name = selectedPest.value || topPestName.value
  if (analysisMode.value === 'year') return `${name}不同年份虫情趋势对比`
  if (analysisMode.value === 'device') return `${name}不同设备虫情趋势对比`
  return `${name}虫情趋势与环境因素的影响`
})
const detailSeries = computed(() => {
  const base = selectedPestTrend.value
  const max = Math.max(10, ...base)

  if (analysisMode.value === 'year') {
    return buildYearDetailSeries()
  }

  if (analysisMode.value === 'device') {
    return buildDeviceDetailSeries()
  }

  const temperatureMin = temperatureRange.value.min
  const temperatureMax = temperatureRange.value.max

  if (
    analysisMode.value === 'env'
    && metricMode.value === 'total'
    && predictResult.value?.history?.length
  ) {
    const history = (predictResult.value.history || []).map(
      item => Number(item || 0)
    )
    const predict = (predictResult.value.predict || []).map(
      item => Number(item || 0)
    )
    const weather = buildWeatherTrendWithPredict()
    const labelsLength = predictResult.value.labels?.length
      || history.length + Math.max(0, predict.length - 1)
    const predictMax = Math.max(10, ...history, ...predict)

    const historyLine = [
      ...history,
      ...new Array(
        Math.max(0, labelsLength - history.length)
      ).fill(null)
    ]

    const predictLine = [
      ...new Array(
        Math.max(0, history.length - 1)
      ).fill(null),
      ...predict
    ].slice(0, labelsLength)

    const list = [
      {
        name: '历史数量',
        color: '#8b6bd6',
        width: 4,
        values: historyLine,
        path: buildSmoothPathWithNull(
          historyLine,
          detailChartWidth.value,
          310,
          predictMax
        )
      },
      {
        name: '预测数量',
        color: '#8b6bd6',
        width: 4,
        dashed: true,
        values: predictLine,
        path: buildSmoothPathWithNull(
          predictLine,
          detailChartWidth.value,
          310,
          predictMax
        )
      }
    ]

    if (
      weather.temperatureHistory.some(
        value => value !== null
      )
    ) {
      list.push({
        name: '历史温度',
        color: '#f59f00',
        path: buildScaledPathWithNull(
          weather.temperatureHistory,
          detailChartWidth.value,
          310,
          temperatureMin,
          temperatureMax
        )
      })
    }

    if (
      weather.temperaturePredict.some(
        value => value !== null
      )
    ) {
      list.push({
        name: '预测温度',
        color: '#f59f00',
        dashed: true,
        path: buildScaledPathWithNull(
          weather.temperaturePredict,
          detailChartWidth.value,
          310,
          temperatureMin,
          temperatureMax
        )
      })
    }

    if (
      weather.humidityHistory.some(
        value => value !== null
      )
    ) {
      list.push({
        name: '历史湿度',
        color: '#4dabf7',
        path: buildScaledPathWithNull(
          weather.humidityHistory,
          detailChartWidth.value,
          310,
          0,
          100
        )
      })
    }

    if (
      weather.humidityPredict.some(
        value => value !== null
      )
    ) {
      list.push({
        name: '预测湿度',
        color: '#4dabf7',
        dashed: true,
        path: buildScaledPathWithNull(
          weather.humidityPredict,
          detailChartWidth.value,
          310,
          0,
          100
        )
      })
    }

    return list
  }

  const list = []

  if (base.length) {
    list.push({
      name: '数量',
      color: '#8b6bd6',
      width: 4,
      values: base,
      path: buildSmoothPath(
        base,
        detailChartWidth.value,
        310,
        max
      )
    })
  }

  const weatherHistory = buildHistoricalWeatherSeries(trendDateKeys.value)

  if (
    weatherHistory.temperature.some(
      value => value !== null
    )
  ) {
    list.push({
      name: '实测温度',
      color: '#f59f00',
      path: buildScaledPathWithNull(
        weatherHistory.temperature,
        detailChartWidth.value,
        310,
        temperatureMin,
        temperatureMax
      )
    })
  }

  if (
    weatherHistory.humidity.some(
      value => value !== null
    )
  ) {
    list.push({
      name: '实测湿度',
      color: '#4dabf7',
      path: buildScaledPathWithNull(
        weatherHistory.humidity,
        detailChartWidth.value,
        310,
        0,
        100
      )
    })
  }

  return list
})

function getDetailCountMax() {
  const values = detailSeries.value
    .filter(item => Array.isArray(item.values))
    .flatMap(item => item.values)
    .filter(value => value !== null && value !== undefined)
    .map(value => Number(value || 0))
  return getNiceAxisMax(values)
}

function buildAxisLabels(max) {
  const safeMax = Math.max(1, Number(max || 1))
  return [1, 0.8, 0.6, 0.4, 0.2, 0].map(rate => formatAxisValue(safeMax * rate))
}

function isDetailSeriesEnabled(name) {
  return enabledDetailSeries.value[name] !== false
}

function toggleDetailSeries(name) {
  enabledDetailSeries.value = {
    ...enabledDetailSeries.value,
    [name]: !isDetailSeriesEnabled(name)
  }
}

watch(detailSeries, list => {
  const next = { ...enabledDetailSeries.value }
  list.forEach(item => {
    if (next[item.name] === undefined) next[item.name] = true
  })
  enabledDetailSeries.value = next
}, { immediate: true })

watch(selectedPest, () => {
  predictResult.value = null
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
  predictResult.value = null
}

function buildScopeValue(type, id) {
  return `${type}:${id}`
}

function getScopeValueId(value) {
  if (value === undefined || value === null || value === '') return undefined
  return String(value).includes(':') ? String(value).split(':').pop() : value
}

async function refreshData() {
  loading.value = true
  predictResult.value = null
  try {
    const [pestResult, imageResult] = await Promise.allSettled([
      listPest({
        pageNum: 1,
        pageSize: 10000,
        parkId: queryParams.value.parkId || undefined,
        areaId: queryParams.value.areaId || undefined,
        locationId: queryParams.value.locationId || undefined,
        deviceId: queryParams.value.deviceId || undefined,
        pestName: queryParams.value.pestName || undefined,
        warningLevel: queryParams.value.warningLevel || undefined
      }),
      listPestImages({
        pageNum: 1,
        pageSize: 10000,
        ...buildImageScopeQuery()
      })
    ])

    if (pestResult.status === 'rejected') throw pestResult.reason

    rawRows.value = pestResult.value.rows || []
    rawImageRows.value = imageResult.status === 'fulfilled'
      ? imageResult.value.rows || []
      : []

    if (imageResult.status === 'rejected') {
      console.error(imageResult.reason)
      ElMessage.warning('拍摄次数加载失败，原始虫情结果仍可查看')
    }

    rebuildStats()
    loading.value = false
    Promise.all([loadCurrentWeather(), loadWeatherForecast()])
      .finally(() => {
        if (metricMode.value === 'total') loadPestPredict(3, { silent: true })
      })
    } catch (error) {
      console.error(error)
      rawRows.value = []
      rawImageRows.value = []
      weatherLive.value = null
      ElMessage.error('虫情数据加载失败，请检查接口或筛选条件')
      rebuildStats()
      } finally {
      if (loading.value) loading.value = false
  }
}

function buildImageScopeQuery() {
  if (queryParams.value.deviceId) return { deviceId: queryParams.value.deviceId }
  if (queryParams.value.locationId) return { imageB: queryParams.value.locationId }
  if (queryParams.value.areaId) return { plotId: queryParams.value.areaId }
  if (queryParams.value.parkId) return { parkId: queryParams.value.parkId }
  return {}
}

async function loadPestPredict(days = 3, options = {}) {
  if (metricMode.value !== 'total') {
    if (!options.silent) ElMessage.info('后端预测使用原始头次，请先切换到“原始累计”口径')
    return
  }

  if (!selectedPest.value) {
    if (!options.silent) ElMessage.warning('请先选择虫害')
    return
  }

  predictDays.value = days

  if (!options.force && restorePredictCache(days)) {
    if (!options.silent) ElMessage.success(`已加载未来${days}天虫情预测缓存`)
    return
  }

  predicting.value = true

  try {
    const res = await predictPestTrend({
      parkId: queryParams.value.parkId || undefined,
      areaId: queryParams.value.areaId || undefined,
      locationId: queryParams.value.locationId || undefined,
      deviceId: queryParams.value.deviceId || undefined,
      pestName: selectedPest.value,
      days
    })

    predictResult.value = normalizePredictResult(res.data || res, days)
    savePredictCache(days)
    if (!options.silent) ElMessage.success(`已生成未来${days}天虫情预测`)
  } catch (error) {
    console.error(error)
    predictResult.value = null
    if (!options.silent) ElMessage.error('虫情预测失败，请检查后端接口或大模型配置')
  } finally {
    predicting.value = false
  }
}

function getPredictCacheKey(days = predictDays.value) {
  const scope = [
    queryParams.value.parkId || '',
    queryParams.value.areaId || '',
    queryParams.value.locationId || '',
    queryParams.value.deviceId || '',
    selectedPest.value || '',
    dateRange.value?.[0] || '',
    dateRange.value?.[1] || '',
    days
  ].join('|')
  return `${PEST_PREDICT_CACHE_PREFIX}${scope}`
}

function restorePredictCache(days = predictDays.value) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(getPredictCacheKey(days)) || 'null')
    if (!cache?.predictResult) return false
    predictResult.value = cache.predictResult
    predictDays.value = cache.days || days
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

function savePredictCache(days = predictDays.value) {
  if (!predictResult.value) return

  try {
    sessionStorage.setItem(getPredictCacheKey(days), JSON.stringify({
      days,
      pestName: selectedPest.value,
      savedAt: Date.now(),
      predictResult: predictResult.value
    }))
  } catch (error) {
    console.error(error)
  }
}

function rebuildStats() {
  pestRows.value = filteredRows.value
  const map = buildPestOverviewMetrics()

  const list = Array.from(map.entries())
    .map(([name, count], index) => ({
      name,
      count,
      color: colors[index % colors.length],
      percent: 0
    }))
    .sort((a, b) => b.count - a.count)

  applyPercent(list)
  pestRatio.value = list
  const nextTrendState = {}
  list.forEach((item, index) => {
    nextTrendState[item.name] = enabledTrendSeries.value[item.name]
      ?? index < DEFAULT_TREND_VISIBLE_COUNT
  })
  enabledTrendSeries.value = nextTrendState

  if (!selectedPest.value || !list.some(item => item.name === selectedPest.value)) {
    selectedPest.value = list[0]?.name || ''
  }
}

function selectPestFromList(name, index) {
  selectedPest.value = selectedPest.value === name ? (pestRatio.value[0]?.name || '') : name
  hoveredPestIndex.value = null
  predictResult.value = null

  if (index < topTrendPests.value.length) {
    enabledTrendSeries.value = {
      ...enabledTrendSeries.value,
      [name]: true
    }
  }
}

function previewPestRatio(index) {
  hoveredPestIndex.value = index
}

function endPestPreview() {
  hoveredPestIndex.value = null
}

function polarToCartesian(centerX, centerY, radius, angle) {
  const radians = (angle - 90) * Math.PI / 180
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians)
  }
}

function createDonutPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle) {
  const start = Math.min(359.999, Math.max(0, startAngle))
  const end = Math.min(359.999, Math.max(start + 0.001, endAngle))

  const outerStart = polarToCartesian(centerX, centerY, outerRadius, end)
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, start)
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, start)
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, end)
  const largeArcFlag = end - start <= 180 ? 0 : 1

  return [
    `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
    `L ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
    'Z'
  ].join(' ')
}

function isTrendEnabled(name) {
  return enabledTrendSeries.value[name] === true
}

function toggleTrendSeries(name) {
  enabledTrendSeries.value = {
    ...enabledTrendSeries.value,
    [name]: !isTrendEnabled(name)
  }
}

function selectAllTrendSeries(enabled) {
  const next = {}
  topTrendPests.value.forEach(item => {
    next[item.name] = Boolean(enabled)
  })
  enabledTrendSeries.value = next
}

watch(topTrendPests, list => {
  const next = {}
  list.forEach((item, index) => {
    next[item.name] = enabledTrendSeries.value[item.name]
      ?? index < DEFAULT_TREND_VISIBLE_COUNT
  })
  enabledTrendSeries.value = next
})

watch(metricMode, () => {
  predictResult.value = null
  rebuildStats()
})

async function resetQuery() {
  queryParams.value = {
    parkId: undefined,
    areaId: undefined,
    locationId: undefined,
    deviceId: undefined,
    pestName: '',
    warningLevel: ''
  }
  areaOptions.value = []
  locationOptions.value = []
  deviceOptions.value = []
  monitorScopePath.value = []
  dateRange.value = []
  hoveredPestIndex.value = null
  predictResult.value = null
  await initDefaultScope()
  await refreshData()
}

function buildDateLabels() {
  if (dateRange.value?.length) {
    const start = new Date(dateRange.value[0])
    const end = new Date(dateRange.value[1])
    const keys = []
    const totalDays = Math.max(1, Math.round((end - start) / 86400000))
    const step = Math.max(1, Math.ceil(totalDays / 8))
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
      keys.push(formatFullDate(d))
    }
    const endKey = formatFullDate(end)
    if (keys[keys.length - 1] !== endKey) keys.push(endKey)
    return keys.map(key => ({ key, label: formatTrendDateLabel(key, keys) }))
  }

  const keys = Array.from(new Set([
    ...filteredRows.value.map(row => getRowTime(row)),
    ...filteredImageRows.value
      .filter(row => Number(row.imageStatus ?? row.recordStatus) === 2)
      .map(row => getImageRowTime(row))
  ]
    .filter(Boolean)
    .sort((a, b) => a - b)
    .map(time => formatFullDate(new Date(time)))))
    .slice(-10)

  return keys.map(key => ({ key, label: formatTrendDateLabel(key, keys) }))
}

function buildTrendForPest(name) {
  const dailyMetrics = buildDailyPestMetricMap(name, null, false, true)
  return trendDateKeys.value.map(key => dailyMetrics.get(key) || 0)
}

function buildDetectionEntries(rows = []) {
  const entries = new Map()

  rows.forEach((row, rowIndex) => {
    const imageId = row.imageId ?? row.aiImageId
    const entryKey = imageId !== undefined && imageId !== null && imageId !== ''
      ? `image:${imageId}`
      : `result:${row.pestId ?? row.recordId ?? rowIndex}`
    const time = getRowTime(row)
    const deviceId = normalizeId(row.deviceId)

    if (!entries.has(entryKey)) {
      entries.set(entryKey, {
        key: entryKey,
        imageId: imageId === undefined || imageId === null ? null : String(imageId),
        deviceId,
        deviceName: getRowDeviceName(row),
        time,
        dateKey: time ? formatFullDate(new Date(time)) : '',
        counts: new Map()
      })
    }

    const entry = entries.get(entryKey)
    const rowCounts = extractRowSpeciesCounts(row)
    rowCounts.forEach((count, name) => {
      entry.counts.set(name, Math.max(entry.counts.get(name) || 0, Number(count || 0)))
    })
  })

  return Array.from(entries.values())
}

function extractRowSpeciesCounts(row) {
  const counts = new Map()

  if (row.bboxJson) {
    try {
      const parsed = typeof row.bboxJson === 'string' ? JSON.parse(row.bboxJson) : row.bboxJson
      const details = Array.isArray(parsed?.pestDetails)
        ? parsed.pestDetails
        : Array.isArray(parsed?.details)
          ? parsed.details
          : []

      details.forEach(item => {
        const name = String(item?.name || item?.label || item?.pestName || '').trim()
        if (!name) return
        counts.set(name, Math.max(counts.get(name) || 0, Number(item?.count || 0)))
      })

      if (!counts.size) {
        const boxes = Array.isArray(parsed) ? parsed : (parsed?.boxes || parsed?.data || [])
        boxes.forEach(box => {
          const name = String(box?.label || box?.name || box?.className || box?.pestName || '').trim()
          if (name) counts.set(name, (counts.get(name) || 0) + 1)
        })
      }
    } catch (error) {
      console.warn('虫情检测框统计解析失败', error)
    }
  }

  if (!counts.size) {
    const name = String(row.pestName || '未知虫害').trim()
    const count = Number(row.pestCount ?? row.pestTotalCount ?? 0)
    counts.set(name, Math.max(0, count))
  }

  return counts
}

function buildCaptureIndex(rows = []) {
  const validImages = new Map()
  const validByDeviceDate = new Map()
  const validByDate = new Map()
  const deviceNames = new Map()

  rows.forEach((row, rowIndex) => {
    if (Number(row.imageStatus ?? row.recordStatus) !== 2) return

    const deviceId = normalizeId(row.deviceId)
    const time = getImageRowTime(row)
    if (!deviceId || !time) return

    const dateKey = formatFullDate(new Date(time))
    const imageId = row.imageId ?? row.aiImageId ?? `row-${rowIndex}`
    const imageKey = String(imageId)
    if (validImages.has(imageKey)) return

    validImages.set(imageKey, { imageId: imageKey, deviceId, dateKey })
    if (!deviceNames.has(deviceId)) {
      deviceNames.set(deviceId, getRowDeviceName(row))
    }
    const deviceDateKey = `${deviceId}|${dateKey}`
    validByDeviceDate.set(deviceDateKey, (validByDeviceDate.get(deviceDateKey) || 0) + 1)
    validByDate.set(dateKey, (validByDate.get(dateKey) || 0) + 1)
  })

  return { validImages, validByDeviceDate, validByDate, deviceNames }
}

function buildPestOverviewMetrics() {
  const pestNames = new Set()
  detectionEntries.value.forEach(entry => {
    entry.counts.forEach((count, name) => {
      if (Number(count || 0) > 0) pestNames.add(name)
    })
  })

  const metrics = new Map()
  pestNames.forEach(name => {
    const entries = detectionEntries.value.filter(entry => {
      if (!entry.counts.has(name)) return false
      return metricMode.value === 'total' || isValidCaptureEntry(entry)
    })
    if (!entries.length) return

    const counts = entries.map(entry => Number(entry.counts.get(name) || 0))
    const total = counts.reduce((sum, value) => sum + value, 0)
    if (metricMode.value === 'average') {
      metrics.set(name, total / Math.max(captureIndex.value.validImages.size, entries.length, 1))
    } else if (metricMode.value === 'peak') {
      metrics.set(name, Math.max(...counts, 0))
    } else {
      metrics.set(name, total)
    }
  })
  return metrics
}

function buildDailyPestMetricMap(name, deviceId = null, includeUnbound = false, useFullDate = false) {
  const daily = new Map()
  const normalizedDeviceId = normalizeId(deviceId)

  if (!includeUnbound) {
    const captureDates = normalizedDeviceId
      ? Array.from(captureIndex.value.validByDeviceDate.keys())
        .filter(key => key.startsWith(`${normalizedDeviceId}|`))
        .map(key => key.slice(key.indexOf('|') + 1))
      : Array.from(captureIndex.value.validByDate.keys())
    captureDates.forEach(dateKey => {
      daily.set(dateKey, { total: 0, peak: 0, detectionCount: 0 })
    })
  }

  detectionEntries.value.forEach(entry => {
    if (!entry.dateKey || !entry.counts.has(name)) return
    const validCapture = entry.imageId
      ? captureIndex.value.validImages.get(entry.imageId)
      : null
    const metricDeviceId = metricMode.value === 'total'
      ? entry.deviceId
      : validCapture?.deviceId || ''
    const metricDateKey = metricMode.value === 'total'
      ? entry.dateKey
      : validCapture?.dateKey || ''

    if (normalizedDeviceId && metricDeviceId !== normalizedDeviceId) return
    if (includeUnbound && entry.deviceId) return
    if (metricMode.value !== 'total' && !isValidCaptureEntry(entry)) return
    if (!metricDateKey) return

    const count = Number(entry.counts.get(name) || 0)
    if (!daily.has(metricDateKey)) {
      daily.set(metricDateKey, { total: 0, peak: 0, detectionCount: 0 })
    }
    const bucket = daily.get(metricDateKey)
    bucket.total += count
    bucket.peak = Math.max(bucket.peak, count)
    bucket.detectionCount += 1
  })

  const result = new Map()
  daily.forEach((bucket, dateKey) => {
    let value = bucket.total
    if (metricMode.value === 'peak') value = bucket.peak
    if (metricMode.value === 'average') {
      const validCaptureCount = normalizedDeviceId
        ? captureIndex.value.validByDeviceDate.get(`${normalizedDeviceId}|${dateKey}`) || 0
        : captureIndex.value.validByDate.get(dateKey) || 0
      value = bucket.total / Math.max(validCaptureCount, 1)
    }

    const key = useFullDate ? dateKey : dateKey.slice(5)
    result.set(key, (result.get(key) || 0) + value)
  })
  return result
}

function buildCaptureQuality() {
  const validImages = captureIndex.value.validImages
  const deviceIds = new Set()
  const positiveImageIds = new Set()
  let totalHeads = 0

  validImages.forEach(image => deviceIds.add(image.deviceId))
  detectionEntries.value.forEach(entry => {
    if (!entry.imageId || !validImages.has(entry.imageId)) return
    const heads = Array.from(entry.counts.values()).reduce((sum, count) => sum + Number(count || 0), 0)
    if (heads <= 0) return
    positiveImageIds.add(entry.imageId)
    totalHeads += heads
  })

  const validCaptureCount = validImages.size
  return {
    validCaptureCount,
    deviceCount: deviceIds.size,
    averageHeads: validCaptureCount ? totalHeads / validCaptureCount : 0,
    positiveRate: validCaptureCount ? positiveImageIds.size / validCaptureCount * 100 : 0
  }
}

function isValidCaptureEntry(entry) {
  return Boolean(entry?.imageId && captureIndex.value.validImages.has(entry.imageId))
}

function applyPercent(list) {
  const total = list.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1
  list.forEach(item => {
    item.percent = Math.round(item.count / total * 100)
  })
}

function buildSmoothPath(values, width = 900, height = 260, max = 1000) {
  if (!values.length) return ''
  const step = values.length === 1 ? width : width / (values.length - 1)
  const safeMax = Math.max(1, max)
  const points = values.map((value, index) => {
    const x = Math.round(index * step)
    const y = Math.round(height - Number(value || 0) / safeMax * (height - 24) - 10)
    return { x, y: Math.max(8, Math.min(height - 8, y)) }
  })

  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}


function getTemperatureRange() {
  const values = [
    ...(weatherLiveRows.value || []).map(
      getWeatherTemperature
    ),
    ...(weatherForecastRows.value || []).map(
      getForecastTemperature
    )
  ].filter(value => value !== null)

  if (!values.length) {
    return { min: 0, max: 40 }
  }

  let min = Math.floor(
    (Math.min(...values) - 5) / 5
  ) * 5
  let max = Math.ceil(
    (Math.max(...values) + 5) / 5
  ) * 5

  if (max - min < 20) {
    const center = (max + min) / 2
    min = Math.floor((center - 10) / 5) * 5
    max = Math.ceil((center + 10) / 5) * 5
  }

  return { min, max }
}

function buildRangeAxisLabels(min, max) {
  const safeMin = Number(min)
  const safeMax = Number(max)
  const step = (safeMax - safeMin) / 5

  return Array.from(
    { length: 6 },
    (_, index) => {
      const value = safeMax - step * index
      return Number.isInteger(value)
        ? value
        : Number(value.toFixed(1))
    }
  )
}

function buildScaledPathWithNull(
  values,
  width = 1000,
  height = 310,
  min = 0,
  max = 100
) {
  if (!values.length) return ''

  const step = values.length === 1
    ? width
    : width / (values.length - 1)
  const safeMin = Number(min)
  const safeMax = Math.max(
    safeMin + 1,
    Number(max)
  )
  const range = safeMax - safeMin

  const points = values.map((value, index) => {
    if (value === null || value === undefined) {
      return null
    }

    const number = Number(value)
    if (!Number.isFinite(number)) return null

    const normalized = Math.max(
      0,
      Math.min(1, (number - safeMin) / range)
    )
    const x = Math.round(index * step)
    const y = Math.round(
      height - normalized * (height - 24) - 10
    )

    return {
      x,
      y: Math.max(8, Math.min(height - 8, y))
    }
  })

  return buildPathFromNullablePoints(points)
}

function buildPathFromNullablePoints(points) {
  let path = ''
  let segment = []

  const flushSegment = () => {
    if (!segment.length) return

    path += ` M ${segment[0].x} ${segment[0].y}`

    if (segment.length > 1) {
      for (
        let index = 0;
        index < segment.length - 1;
        index++
      ) {
        const p0 = segment[index - 1] || segment[index]
        const p1 = segment[index]
        const p2 = segment[index + 1]
        const p3 = segment[index + 2] || p2

        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        path += ` C ${cp1x} ${cp1y}, `
          + `${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
    }

    segment = []
  }

  points.forEach(point => {
    if (point) {
      segment.push(point)
    } else {
      flushSegment()
    }
  })

  flushSegment()
  return path.trim()
}


function buildSmoothPathWithNull(values, width = 1000, height = 310, max = 100) {
  if (!values.length) return ''

  const step = values.length === 1 ? width : width / (values.length - 1)
  const safeMax = Math.max(1, max)

  const points = values.map((value, index) => {
    if (value === null || value === undefined) return null

    const x = Math.round(index * step)
    const y = Math.round(height - Number(value || 0) / safeMax * (height - 24) - 10)

    return {
      x,
      y: Math.max(8, Math.min(height - 8, y))
    }
  })

  let d = ''
  let segment = []

  const flushSegment = () => {
    if (!segment.length) return

    if (segment.length === 1) {
      d += ` M ${segment[0].x} ${segment[0].y}`
    } else {
      d += ` M ${segment[0].x} ${segment[0].y}`

      for (let i = 0; i < segment.length - 1; i++) {
        const p0 = segment[i - 1] || segment[i]
        const p1 = segment[i]
        const p2 = segment[i + 1]
        const p3 = segment[i + 2] || p2

        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
    }

    segment = []
  }

  points.forEach(point => {
    if (!point) {
      flushSegment()
    } else {
      segment.push(point)
    }
  })

  flushSegment()

  return d.trim()
}

function fillMissingValues(values) {
  const result = values.map(value => Number(value || 0))
  const known = result.map((value, index) => value > 0 ? index : -1).filter(index => index >= 0)
  if (!known.length) return result

  const first = known[0]
  for (let i = 0; i < first; i++) result[i] = result[first]

  const last = known[known.length - 1]
  for (let i = last + 1; i < result.length; i++) result[i] = result[last]

  for (let k = 0; k < known.length - 1; k++) {
    const left = known[k]
    const right = known[k + 1]
    const gap = right - left
    if (gap <= 1) continue
    for (let i = left + 1; i < right; i++) {
      const rate = (i - left) / gap
      result[i] = Math.round(result[left] + (result[right] - result[left]) * rate)
    }
  }

  return result
}

async function loadCurrentWeather() {
  if (!queryParams.value.parkId) {
    weatherLiveRows.value = []
    weatherLive.value = null
    return
  }

  try {
    const res = await listWeatherLive({
      pageNum: 1,
      pageSize: 1000,
      parkId: queryParams.value.parkId,
      orderByColumn: 'fetchTime',
      isAsc: 'asc'
    })

    weatherLiveRows.value = (res.rows || res.data || [])
      .filter(row => getWeatherRowTime(row))
      .sort(
        (a, b) =>
          getWeatherRowTime(a) - getWeatherRowTime(b)
      )

    weatherLive.value = weatherLiveRows.value[
      weatherLiveRows.value.length - 1
    ] || null
  } catch (error) {
    console.error(error)
    weatherLiveRows.value = []
    weatherLive.value = null
    ElMessage.warning('园区天气数据加载失败')
  }
}

async function loadWeatherForecast() {
  if (!queryParams.value.parkId) {
    weatherForecastRows.value = []
    return
  }

  try {
    const res = await listWeatherForecast({
      parkId: queryParams.value.parkId,
      pageNum: 1,
      pageSize: 7,
      orderByColumn: 'forecastDate',
      isAsc: 'asc',
      params: { latest: 'true' }
    })
    weatherForecastRows.value = res.rows || res.data || []
  } catch (error) {
    console.error(error)
    weatherForecastRows.value = []
    ElMessage.warning('园区未来天气加载失败')
  }
}

function normalizePredictResult(result, days) {
  const history = selectedPestTrend.value
  const historyKeys = trendDateKeys.value
  const lastHistory = history[history.length - 1] || 0
  const series = Array.isArray(result?.series) ? result.series.slice(0, days) : []
  const rawPredict = Array.isArray(result?.predict) ? result.predict.slice(0, days + 1) : []
  const predictValues = series.length
    ? series.map(item => Number(item.predictedCount || item.count || 0))
    : rawPredict.slice(rawPredict.length > days ? 1 : 0).slice(0, days).map(item => Number(item || 0))
  const futureKeys = buildFutureDateKeys(series, days)
  const labelKeys = [...historyKeys, ...futureKeys]

  return {
    ...(result || {}),
    history,
    predict: [lastHistory, ...predictValues],
    labelKeys,
    labels: labelKeys.map(key => formatTrendDateLabel(key, labelKeys))
  }
}

function buildFutureDateKeys(series, days) {
  if (series.length) {
    const keys = series
      .map(item => new Date(item.date || item.forecastDate))
      .filter(date => !Number.isNaN(date.getTime()))
      .map(formatFullDate)
    if (keys.length === days) return keys
  }

  const lastTime = getLastTrendTime()
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(lastTime)
    date.setDate(date.getDate() + index + 1)
    return formatFullDate(date)
  })
}

function getLastTrendTime() {
  const times = filteredRows.value
    .filter(row => (row.pestName || '未知虫害') === selectedPest.value)
    .map(row => getRowTime(row))
    .filter(Boolean)
  return times.length ? Math.max(...times) : Date.now()
}

function buildWeatherTrendWithPredict() {
  const historyKeys = trendDateKeys.value
  const allKeys = predictResult.value?.labelKeys || historyKeys
  const historyLength = historyKeys.length
  const totalLength = allKeys.length

  const historyWeather = buildHistoricalWeatherSeries(historyKeys)
  const forecastMap = buildForecastWeatherMap()
  const futureKeys = allKeys.slice(historyLength)

  const forecastTemperature = futureKeys.map(
    (key, index) => {
      const matched = forecastMap.get(key)
      return matched
        ? matched.temperature
        : getForecastTemperature(
            weatherForecastRows.value[index]
          )
    }
  )

  const forecastHumidity = futureKeys.map(
    (key, index) => {
      const matched = forecastMap.get(key)
      return matched
        ? matched.humidity
        : getForecastHumidity(
            weatherForecastRows.value[index]
          )
    }
  )

  const lastHistoryTemperature = findLastFiniteValue(
    historyWeather.temperature
  )
  const lastHistoryHumidity = findLastFiniteValue(
    historyWeather.humidity
  )

  const startTemperature = lastHistoryTemperature
    ?? currentWeather.value.temperature
  const startHumidity = lastHistoryHumidity
    ?? currentWeather.value.humidity

  const temperatureHistory = [
    ...historyWeather.temperature,
    ...new Array(
      Math.max(0, totalLength - historyLength)
    ).fill(null)
  ]

  const humidityHistory = [
    ...historyWeather.humidity,
    ...new Array(
      Math.max(0, totalLength - historyLength)
    ).fill(null)
  ]

  const temperaturePredict = buildPredictWeatherLine(
    startTemperature,
    forecastTemperature,
    historyLength,
    totalLength
  )

  const humidityPredict = buildPredictWeatherLine(
    startHumidity,
    forecastHumidity,
    historyLength,
    totalLength
  )

  return {
    temperatureHistory,
    temperaturePredict,
    humidityHistory,
    humidityPredict
  }
}

function buildHistoricalWeatherSeries(labels) {
  const buckets = new Map()

  ;(weatherLiveRows.value || []).forEach(row => {
    const time = getWeatherRowTime(row)
    if (!time) return

    const label = formatFullDate(new Date(time))

    if (!buckets.has(label)) {
      buckets.set(label, {
        temperature: [],
        humidity: []
      })
    }

    const bucket = buckets.get(label)
    const temperature = getWeatherTemperature(row)
    const humidity = getWeatherHumidity(row)

    if (temperature !== null) {
      bucket.temperature.push(temperature)
    }

    if (humidity !== null) {
      bucket.humidity.push(humidity)
    }
  })

  return {
    temperature: labels.map(label => {
      return averageFiniteValues(
        buckets.get(label)?.temperature
      )
    }),
    humidity: labels.map(label => {
      return averageFiniteValues(
        buckets.get(label)?.humidity
      )
    })
  }
}

function buildForecastWeatherMap() {
  const map = new Map()

  ;(weatherForecastRows.value || []).forEach(row => {
    const date = getForecastRowDate(row)
    if (!date) return

    map.set(formatFullDate(date), {
      temperature: getForecastTemperature(row),
      humidity: getForecastHumidity(row)
    })
  })

  return map
}

function buildPredictWeatherLine(
  currentValue,
  forecastValues,
  historyLength,
  totalLength
) {
  const validForecast = forecastValues.map(value => {
    return value === null || value === undefined
      ? null
      : Number(value)
  })

  const startValue = currentValue === null
    || currentValue === undefined
      ? validForecast.find(value => value !== null) ?? null
      : Number(currentValue)

  return [
    ...new Array(
      Math.max(0, historyLength - 1)
    ).fill(null),
    startValue,
    ...validForecast
  ].slice(0, totalLength)
}

function getWeatherRowTime(row) {
  const value = row?.fetchTime
    || row?.reportTime
    || row?.createTime
    || row?.updateTime

  if (!value) return null

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function getForecastRowDate(row) {
  const value = row?.forecastDate
    || row?.date
    || row?.fxDate
    || row?.reportDate

  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getWeatherTemperature(row) {
  return firstFiniteNumber(
    row?.temperature,
    row?.temp,
    row?.temperatureAvg,
    row?.tempAvg
  )
}

function getWeatherHumidity(row) {
  return clampHumidity(
    firstFiniteNumber(
      row?.humidity,
      row?.humidityAvg,
      row?.humidityMean
    )
  )
}

function getForecastTemperature(row) {
  if (!row) return null

  const min = firstFiniteNumber(
    row.tempMin,
    row.temperatureMin,
    row.minTemp,
    row.tempLow
  )
  const max = firstFiniteNumber(
    row.tempMax,
    row.temperatureMax,
    row.maxTemp,
    row.tempHigh
  )

  if (min !== null || max !== null) {
    return averageFiniteValues([min, max])
  }

  return firstFiniteNumber(
    row.tempAvg,
    row.temperatureAvg,
    row.temperature,
    row.temp
  )
}

function getForecastHumidity(row) {
  if (!row) return null

  const direct = firstFiniteNumber(
    row.humidityAvg,
    row.humidity,
    row.humidityMean
  )

  if (direct !== null) {
    return clampHumidity(direct)
  }

  return clampHumidity(
    averageFiniteValues([
      firstFiniteNumber(
        row.humidityMin,
        row.minHumidity
      ),
      firstFiniteNumber(
        row.humidityMax,
        row.maxHumidity
      )
    ])
  )
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = toFiniteNumber(value)
    if (number !== null) return number
  }

  return null
}

function averageFiniteValues(values = []) {
  const numbers = values
    .map(toFiniteNumber)
    .filter(value => value !== null)

  if (!numbers.length) return null

  return numbers.reduce(
    (sum, value) => sum + value,
    0
  ) / numbers.length
}

function clampHumidity(value) {
  if (value === null || value === undefined) {
    return null
  }

  return Math.max(0, Math.min(100, Number(value)))
}

function findLastFiniteValue(values = []) {
  for (let index = values.length - 1; index >= 0; index--) {
    const value = toFiniteNumber(values[index])
    if (value !== null) return value
  }

  return null
}

function averageNumbers(...values) {
  const numbers = values.map(toFiniteNumber).filter(value => value !== null)
  if (!numbers.length) return null
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

function buildDeviceDetailSeries() {
  const keys = trendDateKeys.value
  if (!keys.length) return []

  const devices = new Map()
  if (metricMode.value !== 'total') {
    captureIndex.value.deviceNames.forEach((name, deviceId) => {
      devices.set(deviceId, name)
    })
  }
  detectionEntries.value
    .filter(entry => entry.counts.has(selectedPest.value))
    .forEach(entry => {
      if (!entry.deviceId && metricMode.value !== 'total') return
      const key = entry.deviceId || 'unbound'
      if (!devices.has(key)) devices.set(key, entry.deviceName || '未绑定设备')
    })

  const groups = new Map()
  devices.forEach((name, deviceId) => {
    const dailyMetrics = buildDailyPestMetricMap(
      selectedPest.value,
      deviceId === 'unbound' ? null : deviceId,
      deviceId === 'unbound',
      true
    )
    groups.set(name, keys.map(key => dailyMetrics.get(key) || 0))
  })

  const max = getNiceAxisMax(Array.from(groups.values()).flat())
  return Array.from(groups.entries()).map(([name, values], index) => ({
    name,
    color: colors[index % colors.length],
    width: index === 0 ? 4 : 3,
    values,
    path: buildSmoothPath(values, 1000, 310, max)
  }))
}

function buildYearDetailSeries() {
  const years = Array.from(new Set(detectionEntries.value
    .filter(entry => entry.counts.has(selectedPest.value) && entry.dateKey)
    .map(entry => Number(entry.dateKey.slice(0, 4)))))
    .sort((a, b) => a - b)

  const seriesValues = years.map(year => buildMonthlyTrendForPest(selectedPest.value, year))
  const max = getNiceAxisMax(seriesValues.flat())

  return years.map((year, index) => ({
    name: `${year}年`,
    color: colors[index % colors.length],
    width: index === years.length - 1 ? 4 : 3,
    values: seriesValues[index],
    path: buildSmoothPath(seriesValues[index], 1000, 310, max)
  }))
}

function buildMonthlyTrendForPest(name, year) {
  const monthValues = Array.from({ length: 12 }, () => [])
  buildDailyPestMetricMap(name, null, false, true).forEach((value, dateKey) => {
    if (Number(dateKey.slice(0, 4)) !== year) return
    const month = Number(dateKey.slice(5, 7)) - 1
    if (month >= 0 && month < 12) monthValues[month].push(value)
  })

  return monthValues.map(values => {
    if (!values.length) return 0
    const total = values.reduce((sum, value) => sum + Number(value || 0), 0)
    return metricMode.value === 'total' ? total : total / values.length
  })
}


function getRowDeviceName(row) {
  return row.deviceName || row.deviceSn || (row.deviceId ? `设备${row.deviceId}` : '未绑定设备')
}

function toFiniteNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function comparePestImageRows(a, b) {
  const confidenceDiff =
    normalizeConfidence(b?.pestConfidence)
    - normalizeConfidence(a?.pestConfidence)

  if (confidenceDiff !== 0) {
    return confidenceDiff
  }

  return Number(getRowTime(b) || 0)
    - Number(getRowTime(a) || 0)
}

function normalizeConfidence(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return number <= 1 ? number * 100 : number
}

function normalizeId(value) {
  if (value === undefined || value === null || value === '') return ''
  return String(value)
}

function formatMetric(value, mode = metricMode.value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  if (mode === 'total' || mode === 'peak') return String(Math.round(number))
  return number.toFixed(number >= 100 ? 0 : 1)
}

function formatAxisValue(value) {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  return metricMode.value === 'average'
    ? Number(number.toFixed(number >= 100 ? 0 : 1))
    : Math.round(number)
}

function getNiceAxisMax(values = []) {
  const max = Math.max(0, ...values.map(value => Number(value || 0)).filter(Number.isFinite))
  if (metricMode.value === 'average') {
    if (max <= 1) return 1
    if (max <= 10) return Math.ceil(max * 2) / 2
  }
  if (max <= 10) return 10
  return Math.ceil(max / 10) * 10
}

function normalizeImageUrl(url) {
  if (!url) return ''

  const value = String(url).trim()
  if (!value) return ''

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value
  }

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''

  return value.startsWith('/')
    ? `${baseApi}${value}`
    : `${baseApi}/${value}`
}

function getRowTime(row) {
  const value = row.pestA || row.recognizeTime || row.createTime || row.updateTime || row.recordTime
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function getImageRowTime(row) {
  const value = row.createTime || row.updateTime || row.recognizeTime || row.recordTime
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function formatFullDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

function formatTrendDateLabel(dateKey, allKeys = []) {
  const years = new Set(allKeys.map(key => String(key).slice(0, 4)))
  return years.size > 1 ? String(dateKey) : String(dateKey).slice(5)
}

function goTo(path) {
  router.push(path)
}

function showBuilding() {
  ElMessage.info('功能建设中')
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.analysis-page {
  --pm-green: #12b886;
  --pm-dark: #20302c;
  --pm-soft: #eefbf6;
  --pm-border: #e6edf0;
  width: 100vw;
  max-width: none;
  min-width: 1180px;
  min-height: calc(100vh - 84px);
  padding: 0 18px 22px;
  color: var(--pm-dark);
  background: #f5f7fa;
}

button,
select,
input {
  font: inherit;
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
  color: var(--pm-green);
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
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: none;
}

.filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, max-content));
  column-gap: 18px;
  row-gap: 12px;
  align-items: center;
}

.scope-cascader {
  width: 320px;
}

.filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}

.filter-form :deep(.el-form-item__label) {
  color: #617069;
  font-size: 13px;
}

.filter-form :deep(.el-input__wrapper),
.filter-form :deep(.el-select__wrapper) {
  border-radius: 7px;
  box-shadow: 0 0 0 1px #dde6e2 inset;
}

.filter-form :deep(.el-input__wrapper.is-focus),
.filter-form :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #1eb980 inset;
}

.search-actions {
  min-width: 186px;
}

.search-actions :deep(.el-form-item__content) {
  width: 100%;
}

.button-row {
  display: grid;
  grid-template-columns: repeat(2, 88px);
  gap: 10px;
  align-items: center;
}

.button-row .el-button {
  width: 88px;
  margin-left: 0;
  padding-left: 0;
  padding-right: 0;
  border-radius: 7px;
}

.demo-alert {
  margin-bottom: 12px;
  border-radius: 10px;
}

.overview-grid {
  display: grid;
  grid-template-columns: 31% 69%;
  gap: 14px;
  margin-bottom: 14px;
}

.white-card {
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: none;
}

.section-title {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #30433c;
  font-size: 15px;
  font-weight: 700;
  border-bottom: 1px solid var(--pm-border);
}

.section-title span {
  margin-left: 8px;
  color: #7b8794;
  font-weight: 400;
  font-size: 12px;
}

.ratio-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  align-items: center;
  gap: 18px;
  min-height: 274px;
  padding: 14px 16px;
}

.donut-wrapper {
  position: relative;
  width: 220px;
  height: 220px;
  flex: 0 0 220px;
  overflow: visible;
}

.donut-svg {
  width: 220px;
  height: 220px;
  overflow: visible;
  filter: drop-shadow(0 8px 18px rgba(36, 73, 59, 0.08));
}

.donut-segment {
  cursor: pointer;
  transform-origin: 120px 120px;
  transform-box: view-box;
  stroke: #fff;
  stroke-width: 2;
  transition:
    transform 0.14s ease,
    opacity 0.14s ease,
    filter 0.14s ease;
  will-change: transform, opacity;
}

.donut-segment.is-dim {
  opacity: 0.34;
}

.donut-segment.is-active {
  filter: drop-shadow(0 6px 8px rgba(37, 73, 59, 0.2));
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
  min-width: 0;
  text-align: center;
  pointer-events: none;
}

.donut-center strong,
.donut-center span,
.donut-center small {
  display: block;
  max-width: 92px;
  min-width: 0;
  text-align: center;
}

.donut-center strong {
  overflow: hidden;
  color: #2b3d36;
  font-size: 27px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut-center span {
  margin-top: 7px;
  overflow: hidden;
  color: #617069;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut-center small {
  margin-top: 5px;
  overflow: hidden;
  color: #9aa6a0;
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-list {
  min-width: 0;
  max-height: 232px;
  overflow-y: auto;
  padding-right: 4px;
}

.rank-row {
  --item-color: transparent;
  position: relative;
  min-height: 34px;
  padding: 8px 7px;
  display: grid;
  grid-template-columns: 26px 10px minmax(0, 1fr) 70px 48px;
  gap: 7px;
  align-items: center;
  color: #4d5f58;
  font-size: 12px;
  line-height: 1.2;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.rank-row::before {
  content: "";
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: 0;
  width: 3px;
  border-radius: 3px;
  background: transparent;
}

.rank-row:hover,
.rank-row.hovered {
  color: #24493b;
  background: #f4faf7;
}

.rank-row.active {
  color: #24493b;
  background: var(--pm-soft);
}

.rank-row.active::before {
  background: var(--item-color);
}

.rank-number {
  color: #a1aca7;
  font-size: 10px;
  text-align: left !important;
}

.rank-row.active .rank-number {
  color: #109b68;
}

.rank-row i {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
}

.rank-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row em {
  color: #6d7a75;
  font-style: normal;
  text-align: right;
}

.rank-row strong {
  color: #2e4038;
  text-align: right;
  font-weight: 700;
}

.chart-toolbar {
  min-height: 42px;
  padding: 8px 16px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trend-card {
  min-height: 334px;
}

.legend-line {
  min-height: 30px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #6d7a75;
  font-size: 11px;
}

.legend-line span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: opacity 0.16s ease, color 0.16s ease;
}

.legend-line span.disabled {
  opacity: 0.35;
}

.legend-line i {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
}

.series-actions {
  display: flex;
  gap: 2px;
  padding: 3px;
  color: #6d7a75;
  font-size: 11px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  background: #f8fbfa;
}

.series-actions button {
  height: 26px;
  padding: 0 9px;
  color: #71807a;
  font-size: 11px;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.series-actions button:hover {
  color: #12885f;
  background: #edf8f3;
}

.series-actions button.active {
  color: #0d7f58;
  font-weight: 600;
  background: #fff;
  box-shadow: none;
}

.chart-wrap {
  display: flex;
  height: 260px;
  padding: 6px 22px 16px;
}

.y-axis {
  width: 46px;
  padding-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #899691;
  font-size: 11px;
  text-align: right;
}

.line-chart {
  flex: 1;
  border-radius: 8px;
  background-image:
    linear-gradient(#e7edeb 1px, transparent 1px),
    linear-gradient(90deg, #edf2f0 1px, transparent 1px);
  background-size: 100% 43px, 90px 100%;
}

.line-chart svg {
  width: 100%;
  height: 226px;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  color: #84928c;
  font-size: 11px;
}

.influence-card {
  padding-bottom: 0;
}

.influence-head {
  min-height: 58px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-bottom: 1px solid var(--pm-border);
}

.pest-select {
  width: 190px;
  flex-shrink: 0;
}

.pest-select :deep(.el-select__wrapper) {
  border-radius: 7px;
}

.sub-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 3px;
  color: #6d7a75;
  font-size: 11px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  background: #f8fbfa;
}

.sub-tabs button {
  height: 30px;
  padding: 0 12px;
  color: #71807a;
  font-size: 12px;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.sub-tabs button:hover {
  color: #12885f;
  background: #edf8f3;
}

.sub-tabs button.active {
  color: #0d7f58;
  font-weight: 600;
  background: #fff;
  box-shadow: none;
}

.influence-body {
  display: grid;
  grid-template-columns: 19% 81%;
  align-items: stretch;
  gap: 14px;
  padding: 12px 18px 14px;
}

.pest-profile {
  padding: 12px;
  border-radius: 10px;
  background: #f8fbfa;
}

.pest-photo {
  position: relative;
  height: 132px;
  margin-bottom: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f7b5c;
  font-weight: 700;
  border-radius: 8px;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.78), transparent 28%),
    linear-gradient(145deg, #dcefd7, #7dbd77);
}

.pest-real-image {
  width: 100%;
  height: 100%;
  display: block;
}

.pest-image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #819184;
  font-size: 14px;
  background:
    linear-gradient(135deg, #f7faf5, #eaf2e7);
}

.pest-image-name {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  max-width: calc(100% - 16px);
  padding: 4px 9px;
  overflow: hidden;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(36, 95, 71, 0.82);
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.pest-photo::after {
  display: none;
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

.pest-profile dl {
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: 10px 8px;
  margin: 14px 0 0;
  font-size: 12px;
}

.pest-profile dt {
  color: #728079;
}

.pest-profile dd {
  margin: 0;
  color: #2e4038;
  font-weight: 700;
  text-align: right;
}

.env-chart {
  min-height: 360px;
  text-align: center;
}

.env-chart-head {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin: 4px 0 8px;
}

.env-chart h3 {
  margin: 0;
  color: #40514b;
  font-size: 13px;
  font-weight: 600;
}

.chart-unit-tags {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: #7b8794;
  font-size: 11px;
}

.chart-unit-tags span {
  padding: 3px 7px;
  border: 1px solid #e1ebe7;
  border-radius: 999px;
  background: #f8fbfa;
}

.env-legend {
  min-height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: #69766f;
  font-size: 11px;
}

.env-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: opacity 0.16s ease, color 0.16s ease;
}

.env-legend span.disabled {
  opacity: 0.35;
  color: #9aa6a0;
}

.env-legend i {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
}

.env-legend .el-button {
  height: 24px;
  padding: 0 10px;
  margin-left: 2px;
  border-radius: 6px;
  font-size: 11px;
}

.env-chart-plot {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 108px;
  align-items: stretch;
  gap: 8px;
  margin-top: 6px;
}

.env-y-axis {
  height: 300px;
  padding: 0 6px 10px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #7c8c85;
  font-size: 11px;
  text-align: right;
  border-top: 1px solid #f0f4f2;
}

.env-y-axis em {
  color: #5f6f6b;
  font-style: normal;
  font-weight: 600;
  white-space: nowrap;
}

.env-right-axes {
  display: grid;
  grid-template-columns: repeat(2, minmax(48px, 1fr));
  align-items: stretch;
  gap: 4px;
  min-width: 104px;
}

.env-axis-placeholder {
  min-width: 104px;
}

.env-y-axis-right {
  padding: 0 0 10px 6px;
  text-align: left;
}

.temperature-axis {
  color: #d88700;
  border-left: 1px solid #f3dfb8;
}

.humidity-axis {
  color: #368fd1;
  border-left: 1px solid #cfe7f8;
}

.temperature-axis em {
  color: #b36d00;
}

.humidity-axis em {
  color: #2778b5;
}

.env-chart-scroll {
  width: 100%;
  padding-bottom: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-color: #12b886 #edf4f1;
  scrollbar-width: thin;
}

.env-chart-scroll::-webkit-scrollbar {
  height: 12px;
}

.env-chart-scroll::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #edf4f1;
}

.env-chart-scroll::-webkit-scrollbar-thumb {
  border: 3px solid #edf4f1;
  border-radius: 999px;
  background: #12b886;
}

.env-chart-scroll::-webkit-scrollbar-thumb:hover {
  background: #0d9f70;
}

.env-chart svg {
  min-width: 1800px;
  height: 300px;
  margin-top: 6px;
  border-top: 1px solid #f0f4f2;
  background-image:
    linear-gradient(#e8efec 1px, transparent 1px),
    linear-gradient(90deg, #edf2f0 1px, transparent 1px);
  background-size: 100% 52px, 120px 100%;
}

.x-axis.env {
  min-width: 1800px;
  padding: 0 8px 2px;
}

.risk-high {
  color: #f56c6c !important;
}

.risk-mid {
  color: #e6a23c !important;
}

.risk-low {
  color: #109b68 !important;
}

@media (max-width: 1366px) {
  .ratio-body {
    grid-template-columns: 205px 1fr;
    gap: 10px;
  }

  .chart-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .donut-wrapper,
  .donut-svg {
    width: 205px;
    height: 205px;
  }

  .donut-wrapper {
    flex-basis: 205px;
  }
}

@media (max-width: 1100px) {
  .analysis-page {
    min-width: 0;
  }

  .module-tabs {
    overflow-x: auto;
  }

  .overview-grid,
  .influence-body {
    grid-template-columns: 1fr;
  }

  .filter-form {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }

  .scope-cascader {
    width: 100%;
  }

  .search-actions {
    grid-column: 1 / -1;
    min-width: 0;
  }
}

@media (max-width: 768px) {
  .filter-form {
    grid-template-columns: 1fr;
  }

  .button-row {
    grid-template-columns: repeat(2, minmax(88px, 1fr));
    width: 100%;
  }

  .button-row .el-button {
    width: 100%;
  }

  .influence-head {
    align-items: stretch;
    flex-direction: column;
  }

  .pest-select {
    width: 100%;
  }
}
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   仅覆盖视觉样式，不改动 template、script、方法、功能或原有注释。 */
.analysis-page {
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

.analysis-page *,
.analysis-page *::before,
.analysis-page *::after {
  box-sizing: border-box;
}

.analysis-page .module-tabs {
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

.analysis-page .module-tabs .tab {
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

.analysis-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.analysis-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 16px rgba(47, 125, 92, 0.20);
}

.analysis-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.analysis-page .toolbar-spacer {
  flex: 1 1 auto;
}

.analysis-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.07);
}

.analysis-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.analysis-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.analysis-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.analysis-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 600;
}

.analysis-page :deep(.el-input__wrapper),
.analysis-page :deep(.el-select__wrapper),
.analysis-page :deep(.el-cascader .el-input__wrapper),
.analysis-page :deep(.el-date-editor.el-input__wrapper),
.analysis-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.analysis-page :deep(.el-input__wrapper:hover),
.analysis-page :deep(.el-select__wrapper:hover),
.analysis-page :deep(.el-cascader .el-input__wrapper:hover),
.analysis-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.analysis-page :deep(.el-input__wrapper.is-focus),
.analysis-page :deep(.el-select__wrapper.is-focused),
.analysis-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.analysis-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.analysis-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.analysis-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.analysis-page :deep(.el-pagination.is-background .el-pager li.is-active),
.analysis-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.analysis-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.analysis-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.analysis-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.analysis-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.analysis-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .analysis-page {
    padding: 12px;
  }

  .analysis-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .analysis-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .analysis-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .analysis-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .analysis-page .filter-form :deep(.el-form-item__content),
  .analysis-page .filter-form :deep(.el-input),
  .analysis-page .filter-form :deep(.el-select),
  .analysis-page .filter-form :deep(.el-cascader),
  .analysis-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.analysis-page .overview-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.92fr) minmax(520px, 1.5fr);
  gap: 16px;
  margin-bottom: 16px;
}

.analysis-page .white-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(58, 88, 63, 0.08);
}

.analysis-page .section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 18px;
  color: #294635;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.analysis-page .section-title::before {
  width: 4px;
  height: 18px;
  margin-right: 9px;
  content: "";
  background: linear-gradient(180deg, var(--ft-green), #7da68a);
  border-radius: 999px;
}

.analysis-page .section-title > span {
  margin-left: auto;
  color: var(--ft-muted);
  font-size: 12px;
  font-weight: 500;
}

.analysis-page .ratio-body {
  display: grid;
  grid-template-columns: minmax(210px, 0.9fr) minmax(190px, 1fr);
  align-items: center;
  min-height: 360px;
  padding: 18px;
  gap: 16px;
}

.analysis-page .donut-wrapper {
  filter: drop-shadow(0 10px 18px rgba(58, 88, 63, 0.11));
}

.analysis-page .donut-center strong {
  color: #2e6046;
}

.analysis-page .donut-center span,
.analysis-page .donut-center small {
  color: #748778;
}

.analysis-page .rank-list {
  display: flex;
  flex-direction: column;
  max-height: 316px;
  overflow-y: auto;
  gap: 7px;
}

.analysis-page .rank-row {
  display: grid;
  grid-template-columns: 30px 8px minmax(0, 1fr) auto auto;
  align-items: center;
  min-height: 42px;
  padding: 0 10px;
  gap: 8px;
  background: #fafcf9;
  border: 1px solid #e5ede3;
  border-radius: 9px;
  cursor: pointer;
  transition: 0.18s ease;
}

.analysis-page .rank-row:hover,
.analysis-page .rank-row.hovered,
.analysis-page .rank-row.active {
  background: #edf5e9;
  border-color: #bdd3be;
  transform: translateX(2px);
}

.analysis-page .rank-number {
  color: #829285;
  font-family: Consolas, Monaco, monospace;
}

.analysis-page .rank-row i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.analysis-page .rank-row span {
  overflow: hidden;
  color: #405849;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-page .rank-row em {
  color: #7c8f80;
  font-size: 12px;
  font-style: normal;
}

.analysis-page .rank-row strong {
  color: #2f7d5c;
}

.analysis-page .chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 16px;
  gap: 12px;
  background: #fafcf9;
  border-bottom: 1px solid #e8eee6;
}

.analysis-page .legend-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.analysis-page .legend-line > span,
.analysis-page .env-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4f6757;
  font-size: 12px;
  cursor: pointer;
}

.analysis-page .legend-line i,
.analysis-page .env-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.analysis-page .legend-line .disabled,
.analysis-page .env-legend .disabled {
  opacity: 0.35;
}

.analysis-page .series-actions {
  display: flex;
  flex: 0 0 auto;
  padding: 3px;
  gap: 3px;
  background: #edf3ea;
  border-radius: 8px;
}

.analysis-page .series-actions button,
.analysis-page .sub-tabs button {
  color: #627767;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.analysis-page .series-actions button {
  padding: 5px 9px;
  font-size: 11px;
}

.analysis-page .series-actions button.active,
.analysis-page .sub-tabs button.active {
  color: #ffffff;
  background: var(--ft-green);
}

.analysis-page .chart-wrap {
  min-height: 310px;
  padding: 18px 20px 10px;
}

.analysis-page .y-axis,
.analysis-page .x-axis {
  color: #87968a;
}

.analysis-page .influence-card {
  margin-top: 0;
}

.analysis-page .influence-head {
  display: flex;
  align-items: center;
  min-height: 68px;
  padding: 12px 18px;
  gap: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.analysis-page .pest-select {
  width: 190px;
}

.analysis-page .sub-tabs {
  display: flex;
  flex-wrap: wrap;
  padding: 4px;
  gap: 4px;
  background: #edf3ea;
  border-radius: 10px;
}

.analysis-page .sub-tabs button {
  padding: 8px 13px;
  font-weight: 600;
}

.analysis-page .influence-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: 440px;
}

.analysis-page .pest-profile {
  padding: 18px;
  background: #f8fbf5;
  border-right: 1px solid #e1ebe0;
}

.analysis-page .pest-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  margin-bottom: 16px;
  color: #315e47;
  font-size: 18px;
  font-weight: 800;
  background:
    radial-gradient(circle at 65% 20%, rgba(255,255,255,.75), transparent 30%),
    linear-gradient(135deg, #e1eedc, #f4f8f1);
  border: 1px solid #d1e1cf;
  border-radius: 12px;
}

.analysis-page .pest-profile dl {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  margin: 0;
  gap: 9px 8px;
}

.analysis-page .pest-profile dt {
  color: #87968a;
}

.analysis-page .pest-profile dd {
  margin: 0;
  color: #3d5848;
  font-weight: 700;
}

.analysis-page .env-chart {
  min-width: 0;
  padding: 18px;
}

.analysis-page .env-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.analysis-page .env-chart-head h3 {
  margin: 0;
  color: #294635;
}

.analysis-page .chart-unit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.analysis-page .chart-unit-tags span {
  padding: 4px 8px;
  color: #667b6b;
  font-size: 11px;
  background: #edf3ea;
  border-radius: 999px;
}

.analysis-page .env-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-height: 44px;
  gap: 8px 14px;
}

.analysis-page .env-chart-plot {
  overflow: hidden;
  background: #fafcf9;
  border: 1px solid #e1ebe0;
  border-radius: 12px;
}

@media (max-width: 1180px) {
  .analysis-page .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .analysis-page .ratio-body,
  .analysis-page .influence-body {
    grid-template-columns: 1fr;
  }

  .analysis-page .pest-profile {
    border-right: 0;
    border-bottom: 1px solid #e1ebe0;
  }

  .analysis-page .influence-head {
    align-items: stretch;
    flex-direction: column;
  }

    .analysis-page .pest-select {
    width: 100%;
    }
}

.analysis-page :deep(.el-button),
.analysis-page button:not(.tab):not(.el-dialog__headerbtn) {
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

.analysis-page :deep(.el-button:hover),
.analysis-page button:not(.tab):not(.el-dialog__headerbtn):hover {
  color: var(--ft-green);
  background: #eef6ea;
  border-color: #9fbea4;
  box-shadow: 0 6px 14px rgba(47, 125, 92, 0.12);
  transform: translateY(-1px);
}

.analysis-page :deep(.el-button--primary),
.analysis-page :deep(.el-button--success),
.analysis-page :deep(.el-button--warning),
.analysis-page :deep(.el-button--danger),
.analysis-page :deep(.el-button--primary:hover),
.analysis-page :deep(.el-button--success:hover),
.analysis-page :deep(.el-button--warning:hover),
.analysis-page :deep(.el-button--danger:hover) {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  border-color: transparent;
  box-shadow: 0 7px 16px rgba(47, 125, 92, 0.20);
}

.analysis-page :deep(.el-button.is-plain),
.analysis-page :deep(.el-button--primary.is-plain),
.analysis-page :deep(.el-button--success.is-plain),
.analysis-page :deep(.el-button--warning.is-plain),
.analysis-page :deep(.el-button--danger.is-plain) {
  color: var(--ft-green);
  background: #f1f7ef;
  border-color: #b9d1bb;
  box-shadow: none;
}

.analysis-page :deep(.el-button.is-disabled),
.analysis-page :deep(.el-button.is-disabled:hover),
.analysis-page button:disabled,
.analysis-page button:disabled:hover {
  color: #9aa89d;
  background: #eef2eb;
  border-color: #dce7da;
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}

.analysis-page .button-row :deep(.el-button),
.analysis-page .header-actions :deep(.el-button),
.analysis-page .model-actions :deep(.el-button),
.analysis-page .table-actions :deep(.el-button) {
  min-width: 88px;
}

.analysis-page,
.analysis-page *,
.analysis-page *::before,
.analysis-page *::after,
.analysis-page :deep(*) {
  font-family: inherit !important;
}
</style>

<style scoped>
.analysis-page {
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

.analysis-page,
.analysis-page *,
.analysis-page *::before,
.analysis-page *::after,
.analysis-page :deep(*) {
  font-family: inherit !important;
}

.analysis-page .module-tabs {
  min-height: 48px;
  height: auto;
  margin: 0 0 10px;
  padding: 4px 6px;
  gap: 4px;
  border-radius: 10px;
}

.analysis-page .module-tabs .tab {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  font-size: 14px !important;
  font-weight: 600;
  line-height: 38px;
  border-radius: 8px;
}

.analysis-page .filter-card {
  margin-bottom: 10px;
  border-radius: 10px;
}

.analysis-page .filter-card :deep(.el-card__body) {
  padding: 10px 12px 2px;
}

.analysis-page .filter-form {
  display: flex;
  align-items: flex-end;
  width: 100%;
  flex-wrap: wrap;
  gap: 0 14px;
}

.analysis-page .filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 8px;
}

.analysis-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: var(--unified-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 32px;
}

.analysis-page .filter-form .search-actions {
  margin-left: auto;
}

.analysis-page .button-row,
.analysis-page .search-actions :deep(.el-form-item__content),
.analysis-page .header-actions,
.analysis-page .model-actions,
.analysis-page .table-actions,
.analysis-page .predict-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.analysis-page .card-header,
.analysis-page .section-title,
.analysis-page .chart-toolbar,
.analysis-page .influence-head,
.analysis-page .image-toolbar,
.analysis-page .pagination-row,
.analysis-page .predict-toolbar,
.analysis-page .stat-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.analysis-page :deep(.el-card__header) {
  padding: 9px 12px;
}

.analysis-page .card-header {
  min-height: 32px;
  padding: 0;
  font-size: 15px;
  font-weight: 700;
}

.analysis-page .section-title {
  min-height: 32px;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
}

.analysis-page :deep(.el-input__wrapper),
.analysis-page :deep(.el-select__wrapper),
.analysis-page :deep(.el-date-editor.el-input__wrapper),
.analysis-page :deep(.el-cascader .el-input__wrapper) {
  min-height: 32px;
  border-radius: 8px;
}

.analysis-page :deep(.el-button) {
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

.analysis-page :deep(.el-button--primary:not(.is-plain)),
.analysis-page :deep(.el-button--success:not(.is-plain)) {
  color: #fff !important;
  background: var(--unified-green) !important;
  border-color: var(--unified-green) !important;
}

.analysis-page :deep(.el-button--primary:not(.is-plain):hover),
.analysis-page :deep(.el-button--success:not(.is-plain):hover) {
  background: var(--unified-green-hover) !important;
  border-color: var(--unified-green-hover) !important;
}

.analysis-page :deep(.el-button.is-plain),
.analysis-page :deep(.el-button--primary.is-plain),
.analysis-page :deep(.el-button--success.is-plain) {
  color: var(--unified-green) !important;
  background: #fff !important;
  border-color: #abc9b3 !important;
}

.analysis-page :deep(.el-button.is-plain:hover),
.analysis-page :deep(.el-button--primary.is-plain:hover),
.analysis-page :deep(.el-button--success.is-plain:hover) {
  color: var(--unified-green-hover) !important;
  background: var(--unified-green-soft) !important;
  border-color: #89b397 !important;
}

.analysis-page :deep(.el-button--danger:not(.is-plain)) {
  color: #fff !important;
  background: #c45656 !important;
  border-color: #c45656 !important;
}

.analysis-page :deep(.el-button--danger.is-plain) {
  color: #b94a4a !important;
  background: #fff8f7 !important;
  border-color: #e7b5b2 !important;
}

.analysis-page :deep(.el-button.is-disabled),
.analysis-page :deep(.el-button.is-disabled:hover) {
  color: #9aa89d !important;
  background: #f0f3ef !important;
  border-color: #dce5db !important;
  box-shadow: none !important;
}

.analysis-page .workspace-row,
.analysis-page .overview-grid,
.analysis-page .main-grid {
  margin-bottom: 10px;
  gap: 10px;
}

.analysis-page .white-card,
.analysis-page .panel-card,
.analysis-page .table-card,
.analysis-page .report-summary,
.analysis-page .preview-card,
.analysis-page .pest-photo-card {
  border-radius: 10px;
}

.analysis-page .image-toolbar,
.analysis-page .pagination-row {
  min-height: 48px;
  padding: 8px 12px;
}

.analysis-page .image-toolbar {
  margin-bottom: 10px;
}

.analysis-page .pagination-row {
  margin-top: 10px;
}

.analysis-page .pest-photo-grid {
  gap: 10px;
}

.analysis-page :deep(.el-table) {
  font-size: 13px;
}

.analysis-page :deep(.el-table th.el-table__cell),
.analysis-page :deep(.el-table td.el-table__cell) {
  padding: 7px 0;
}

/* 与物候分析页保持一致的查询、重置按钮。 */
.analysis-page .search-actions :deep(.el-button:nth-child(1)) {
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

.analysis-page .search-actions :deep(.el-button:nth-child(1):hover) {
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.analysis-page .search-actions :deep(.el-button:nth-child(2)) {
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

.analysis-page .search-actions :deep(.el-button:nth-child(2):hover) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8eb49a !important;
}

/* 与物候趋势图一致的滑动分段按钮。 */
.analysis-page .series-actions,
.analysis-page .sub-tabs,
.analysis-page .view-switch,
.analysis-page .model-actions :deep(.el-button-group) {
  display: flex;
  padding: 4px;
  gap: 4px;
  background: #edf3ea;
  border: 0;
  border-radius: 10px;
  box-shadow: none;
}

.analysis-page .series-actions button,
.analysis-page .sub-tabs button,
.analysis-page .view-switch button,
.analysis-page .model-actions :deep(.el-button-group > .el-button) {
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

.analysis-page .series-actions button:hover,
.analysis-page .sub-tabs button:hover,
.analysis-page .view-switch button:hover,
.analysis-page .model-actions :deep(.el-button-group > .el-button:hover) {
  color: #2f7d5c !important;
  background: #f7faf6 !important;
}

.analysis-page .series-actions button.active,
.analysis-page .sub-tabs button.active,
.analysis-page .view-switch button.active,
.analysis-page .model-actions :deep(.el-button-group > .el-button--primary) {
  color: #fff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
  box-shadow: 0 1px 4px rgba(24, 98, 70, .12) !important;
}

@media (max-width: 900px) {
  .analysis-page {
    padding: 10px;
  }

  .analysis-page .filter-form .search-actions {
    width: 100%;
    margin-left: 0;
  }

  .analysis-page .search-actions :deep(.el-form-item__content),
  .analysis-page .button-row {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .analysis-page .card-header,
  .analysis-page .section-title,
  .analysis-page .chart-toolbar,
  .analysis-page .influence-head,
  .analysis-page .image-toolbar,
  .analysis-page .pagination-row {
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

.analysis-page {
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

.analysis-page,
.analysis-page *,
.analysis-page *::before,
.analysis-page *::after,
.analysis-page :deep(*) {
  box-sizing: border-box;
  font-family: inherit !important;
}

/* 页面公共紧凑排版 */
.analysis-page .module-tabs {
  margin-bottom: 12px;
}

.analysis-page .filter-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.analysis-page .filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.analysis-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.analysis-page .filter-form :deep(.el-form-item) {
  margin: 0;
}

.analysis-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: #526b5c;
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.analysis-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.analysis-page :deep(.el-input__wrapper),
.analysis-page :deep(.el-select__wrapper),
.analysis-page :deep(.el-cascader .el-input__wrapper),
.analysis-page :deep(.el-date-editor.el-input__wrapper),
.analysis-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  border-radius: 8px;
}

.analysis-page .button-row,
.analysis-page .search-actions :deep(.el-form-item__content),
.analysis-page .header-actions,
.analysis-page .model-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* 所有指定按钮统一尺寸 */
.analysis-page :deep(.reference-action-btn) {
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
.analysis-page :deep(.reference-primary-btn),
.analysis-page :deep(.reference-primary-btn.is-plain),
.analysis-page :deep(.reference-primary-btn.el-button--success),
.analysis-page :deep(.reference-primary-btn.el-button--danger) {
  color: #ffffff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
}

.analysis-page :deep(.reference-primary-btn:hover),
.analysis-page :deep(.reference-primary-btn:focus) {
  color: #ffffff !important;
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.analysis-page :deep(.reference-primary-btn:active) {
  color: #ffffff !important;
  background: #245f47 !important;
  border-color: #245f47 !important;
}

/* 次操作：与“重置”按钮一致 */
.analysis-page :deep(.reference-secondary-btn),
.analysis-page :deep(.reference-secondary-btn.is-plain),
.analysis-page :deep(.reference-secondary-btn.el-button--success),
.analysis-page :deep(.reference-secondary-btn.el-button--danger) {
  color: #606266 !important;
  background: #ffffff !important;
  border-color: #dcdfe6 !important;
}

.analysis-page :deep(.reference-secondary-btn:hover),
.analysis-page :deep(.reference-secondary-btn:focus) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8bb59a !important;
}

.analysis-page :deep(.reference-secondary-btn:active) {
  color: #245f47 !important;
  background: #e8f2e7 !important;
  border-color: #6fa181 !important;
}

/* 禁用状态统一，不再保留红色、蓝色或 success 差异 */
.analysis-page :deep(.reference-action-btn.is-disabled),
.analysis-page :deep(.reference-action-btn.is-disabled:hover),
.analysis-page :deep(.reference-action-btn.is-disabled:focus) {
  color: #a8abb2 !important;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

/* 卡片、表格和标题字体统一 */
.analysis-page :deep(.el-card) {
  border-radius: 12px;
}

.analysis-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
}

.analysis-page .card-header,
.analysis-page .section-title {
  color: #24352d;
  font-size: 15px;
  font-weight: 700;
}

.analysis-page :deep(.el-table) {
  font-family: inherit;
  font-size: 13px;
}

.analysis-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}


.analysis-page .overview-grid {
  gap: 12px;
  margin-bottom: 12px;
}

.analysis-page .white-card {
  border-radius: 12px;
}

.analysis-page .influence-body {
  gap: 16px;
  padding: 8px 14px 0;
}


@media (max-width: 900px) {
  .analysis-page {
    padding: 10px;
  }

  .analysis-page .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .analysis-page .filter-form :deep(.el-form-item) {
    width: 100%;
  }

  .analysis-page .button-row,
  .analysis-page .search-actions :deep(.el-form-item__content),
  .analysis-page .header-actions,
  .analysis-page .model-actions {
    justify-content: flex-start;
  }
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE: remove this block to roll back the near-right-angle theme. */
.analysis-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.analysis-page .module-tabs,
.analysis-page .module-tabs .tab,
.analysis-page .module-tabs .tab.active::after,
.analysis-page .filter-card,
.analysis-page .white-card,
.analysis-page .ratio-card,
.analysis-page .trend-card,
.analysis-page .influence-card,
.analysis-page .rank-row,
.analysis-page .sub-tabs button,
.analysis-page .series-actions button,
.analysis-page .chart-unit-tags span,
.analysis-page .pest-profile,
.analysis-page .pest-photo,
.analysis-page .pest-image-name,
.analysis-page :deep(.el-card),
.analysis-page :deep(.el-card__header),
.analysis-page :deep(.el-card__body),
.analysis-page :deep(.el-button),
.analysis-page :deep(.el-button-group),
.analysis-page :deep(.el-input__wrapper),
.analysis-page :deep(.el-select__wrapper),
.analysis-page :deep(.el-cascader .el-input__wrapper),
.analysis-page :deep(.el-date-editor.el-input__wrapper),
.analysis-page :deep(.el-tag),
.analysis-page :deep(.el-progress-bar__outer),
.analysis-page :deep(.el-progress-bar__inner),
.analysis-page :deep(.el-table),
.analysis-page :deep(.el-table__inner-wrapper),
.analysis-page :deep(.el-pagination button),
.analysis-page :deep(.el-pager li) {
  border-radius: var(--sharp-radius) !important;
}

.analysis-page .filter-card,
.analysis-page .white-card,
.analysis-page .pest-profile,
.analysis-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.analysis-page .filter-card:hover,
.analysis-page .white-card:hover,
.analysis-page :deep(.el-card:hover) {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.analysis-page .rank-row,
.analysis-page .sub-tabs button,
.analysis-page .series-actions button,
.analysis-page .chart-unit-tags span {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.analysis-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.analysis-page :deep(.el-input__wrapper),
.analysis-page :deep(.el-select__wrapper),
.analysis-page :deep(.el-cascader .el-input__wrapper),
.analysis-page :deep(.el-date-editor.el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.analysis-page :deep(.el-input__wrapper.is-focus),
.analysis-page :deep(.el-select__wrapper.is-focused),
.analysis-page :deep(.el-cascader .el-input__wrapper.is-focus),
.analysis-page :deep(.el-date-editor.el-input__wrapper.is-active) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.analysis-page .capture-stat-strip {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--sharp-border);
  border-radius: var(--sharp-radius);
  background: #fff;
}

.analysis-page .capture-stat-strip > div {
  min-width: 0;
  flex: 1;
  padding: 0 16px;
  text-align: center;
  border-right: 1px solid #e1ebe1;
}

.analysis-page .capture-stat-strip > div:last-child {
  border-right: 0;
}

.analysis-page .capture-stat-strip span,
.analysis-page .capture-stat-strip small {
  color: #718078;
  font-size: 12px;
}

.analysis-page .capture-stat-strip b {
  margin: 0 6px;
  color: #245e44;
  font-size: 20px;
  font-weight: 700;
}

.analysis-page .chart-control-groups {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.analysis-page .metric-switch {
  flex-shrink: 0;
}

/* CODEX-PEST-OVERVIEW-STABLE-HEIGHT: remove this block to restore content-driven card heights. */
@media (min-width: 901px) {
  .analysis-page .overview-grid {
    align-items: stretch;
    grid-auto-rows: 418px;
  }

  .analysis-page .overview-grid > .white-card {
    height: 418px;
    min-height: 0;
  }

  .analysis-page .ratio-card,
  .analysis-page .trend-card {
    display: flex;
    flex-direction: column;
  }

  .analysis-page .ratio-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  .analysis-page .trend-card .chart-toolbar {
    align-items: center;
    flex-direction: row;
    flex: 0 0 62px;
    min-height: 62px;
    overflow: hidden;
  }

  .analysis-page .trend-card .legend-line {
    min-width: 0;
    max-height: 38px;
    overflow-x: auto;
    overflow-y: hidden;
    flex-wrap: nowrap;
  }

  .analysis-page .trend-card .legend-line > span {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .analysis-page .trend-card .chart-control-groups {
    flex: 0 0 auto;
    flex-wrap: nowrap;
  }

  .analysis-page .trend-card .chart-wrap {
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
  }
}

@media (max-width: 900px) {
  .analysis-page .capture-stat-strip {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
  }

  .analysis-page .capture-stat-strip > div {
    padding: 8px;
    border-right: 1px solid #e1ebe1;
    border-bottom: 1px solid #e1ebe1;
  }

  .analysis-page .capture-stat-strip > div:nth-child(2n) {
    border-right: 0;
  }

  .analysis-page .capture-stat-strip > div:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .analysis-page .chart-control-groups {
    width: 100%;
    justify-content: flex-start;
  }
}

.analysis-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.analysis-page :deep(.el-progress-bar__inner) {
  background: #2f7d5c !important;
}

:global(.xwq-sharp-popper),
:global(.xwq-sharp-popper.el-popper),
:global(.xwq-sharp-popper .el-select-dropdown),
:global(.xwq-sharp-popper .el-cascader-panel),
:global(.xwq-sharp-popper .el-picker-panel),
:global(.xwq-sharp-popper .el-select-dropdown__item),
:global(.xwq-sharp-popper .el-cascader-node),
:global(.xwq-sharp-popper .el-date-table td .el-date-table-cell),
:global(.xwq-sharp-popper .el-popper__arrow::before) {
  border-radius: 1px !important;
}

:global(.xwq-sharp-popper.el-popper),
:global(.xwq-sharp-popper .el-select-dropdown),
:global(.xwq-sharp-popper .el-cascader-panel),
:global(.xwq-sharp-popper .el-picker-panel) {
  border-color: #d5e5d6 !important;
  box-shadow: 0 8px 20px rgba(63, 91, 70, 0.10) !important;
}
</style>
