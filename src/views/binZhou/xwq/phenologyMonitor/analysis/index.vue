<template>
  <div class="phenology-page">
    <div class="module-tabs">
      <button class="tab active">总览</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/image')">物候图片</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/ai')">智能分析</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/report')">历史数据与报告</button>
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

        <el-form-item label="作物类型">
          <el-input
            v-model="queryParams.phenologyCrop"
            placeholder="请输入作物类型"
            clearable
            style="width: 180px"
          />
        </el-form-item>

        <el-form-item label="物候期">
          <el-select
            v-model="filterStage"
            popper-class="xwq-sharp-popper"
            placeholder="全部"
            clearable
            filterable
            :disabled="!stageOptions.length"
            style="width: 170px"
          >
            <el-option
              v-for="item in stageOptions"
              :key="item"
              :label="item"
              :value="item"
            />
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
            <el-button type="primary" @click="loadData">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-loading="loading">
      <div class="overview-grid">
        <section class="white-card ratio-card">
          <div class="section-title">
            物候期占比
            <span>
              识别总数：{{ baseRows.length }}
             　物候期种类：{{ stageRatio.length }}种
            </span>
          </div>

          <div v-if="stageRatio.length" class="ratio-body">
            <div class="donut-wrapper" @mouseleave="endStagePreview">
              <svg
                class="donut-svg"
                viewBox="0 0 240 240"
                aria-label="物候期占比环形图"
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
                  @mouseenter="previewStageRatio(segment.index)"
                  @click.stop="selectStageFromList(segment.name, segment.index)"
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
                v-for="(item, index) in stageRatio"
                :key="item.name"
                class="rank-row"
                :class="{
                  active: item.name === selectedStage,
                  hovered: index === hoveredStageIndex
                }"
                :style="{ '--item-color': item.color }"
                @mouseenter="previewStageRatio(index)"
                @mouseleave="endStagePreview"
                @click="selectStageFromList(item.name, index)"
              >
                <b class="rank-number">{{ String(index + 1).padStart(2, '0') }}</b>
                <i :style="{ background: item.color }"></i>
                <span>{{ item.name }}</span>
                <em>{{ item.count }}条</em>
                <strong>{{ item.percent }}%</strong>
              </div>
            </div>
          </div>

          <el-empty v-else description="当前查询条件下暂无物候期数据" :image-size="90" />
        </section>

        <section class="white-card trend-card">
          <div class="section-title">
            {{ trendChartTitle }}
            <span>{{ dateRangeText }}</span>
          </div>

          <div class="trend-chart-body">
            <div class="trend-mode-switch" aria-label="物候趋势统计口径">
              <button
                type="button"
                :class="{ active: trendMode === 'progress' }"
                @click="trendMode = 'progress'"
              >
                物候进程
              </button>
              <button
                type="button"
                :class="{ active: trendMode === 'share' }"
                @click="trendMode = 'share'"
              >
                阶段占比
              </button>
              <button
                type="button"
                :class="{ active: trendMode === 'count' }"
                @click="trendMode = 'count'"
              >
                有效识别次数
              </button>
            </div>

            <div class="trend-chart-main">
              <div v-if="trendMode !== 'progress'" class="chart-toolbar">
                <div class="legend-line">
                  <span
                    v-for="item in topTrendStages"
                    :key="item.name"
                    :class="{ disabled: !isTrendEnabled(item.name) }"
                    @click="toggleTrendSeries(item.name)"
                  >
                    <i :style="{ background: item.color }"></i>{{ item.name }}
                  </span>
                </div>

                <div
                  v-if="topTrendStages.length"
                  class="series-actions"
                  aria-label="物候趋势显示控制"
                >
                  <button
                    type="button"
                    :class="{ active: allSeriesSelected }"
                    @click="selectAllTrendSeries(true)"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    :class="{ active: noSeriesSelected }"
                    @click="selectAllTrendSeries(false)"
                  >
                    全不选
                  </button>
                </div>
              </div>

              <div v-if="trendLines.length && dateLabels.length" class="chart-wrap real-axis-wrap">
                <div class="axis-title-y">{{ trendYAxisTitle }}</div>

                <div class="y-axis">
                  <span v-for="tick in trendTicks" :key="tick.key">{{ tick.label }}</span>
                </div>

                <div class="line-chart">
                  <svg viewBox="0 0 900 240" preserveAspectRatio="none">
                    <path
                      v-for="line in trendLines"
                      v-show="trendMode === 'progress' || isTrendEnabled(line.name)"
                      :key="line.name"
                      :d="line.path"
                      fill="none"
                      :stroke="line.color"
                      :stroke-width="line.width"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>

                  <div class="x-axis positioned-axis">
                    <span
                      v-for="(label, index) in dateLabels"
                      :key="`${label}-${index}`"
                      :style="axisLabelStyle(index, dateLabels.length)"
                    >
                      {{ label }}
                    </span>
                  </div>
                  <div class="x-axis-title">观测日期</div>
                </div>
              </div>

              <el-empty
                v-else
                :description="trendEmptyText"
                :image-size="90"
              />
            </div>
          </div>
        </section>
      </div>

      <section class="white-card influence-card">
        <div class="influence-head">
          <el-select
            v-model="selectedStage"
            size="large"
            class="stage-select"
            popper-class="xwq-sharp-popper"
            placeholder="选择物候期"
            filterable
            :disabled="!stageOptions.length"
          >
            <el-option
              v-for="item in stageOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>

          <div class="sub-tabs">
            <button
              type="button"
              :class="{ active: analysisMode === 'env' }"
              @click="analysisMode = 'env'"
            >
              有效识别次数
            </button>
            <button
              type="button"
              :class="{ active: analysisMode === 'year' }"
              @click="analysisMode = 'year'"
            >
              不同年份物候趋势对比
            </button>
            <button
              type="button"
              :class="{ active: analysisMode === 'device' }"
              @click="analysisMode = 'device'"
            >
              不同设备物候趋势对比
            </button>
          </div>
        </div>

        <div class="influence-body">
          <aside class="stage-profile">
            <div class="stage-photo">
              <el-image
                v-if="selectedStageImage"
                :src="selectedStageImage"
                fit="cover"
                class="stage-real-image"
                :preview-src-list="[selectedStageImage]"
                preview-teleported
                hide-on-click-modal
              >
                <template #error>
                  <div class="stage-image-empty">
                    {{ selectedStage || dominantStage }}
                  </div>
                </template>
              </el-image>

              <div v-else class="stage-image-empty">
                {{ selectedStage || dominantStage }}
              </div>

              <span class="stage-image-name">
                {{ selectedStage || dominantStage }}
              </span>
            </div>

            <dl>
              <dt>作物类型</dt><dd>{{ cropName }}</dd>
              <dt>当前阶段</dt><dd>{{ selectedStage || dominantStage }}</dd>
              <dt>累计记录</dt><dd>{{ selectedStageData.count }}条</dd>
              <dt>下一阶段</dt><dd>{{ nextStageName }}</dd>
              <dt>进程判断</dt><dd>{{ progressStatus }}</dd>
            </dl>
          </aside>

          <div class="env-chart">
            <h3>{{ detailChartTitle }}</h3>

            <div v-if="detailSeries.length" class="env-legend">
              <span
                v-for="item in detailSeries"
                :key="item.name"
                :class="{ disabled: !isDetailSeriesEnabled(item.name) }"
                @click="toggleDetailSeries(item.name)"
              >
                <i :style="{ background: item.color }"></i>{{ item.name }}
              </span>
            </div>

            <div
              v-if="detailSeries.length && detailDateLabels.length"
              class="detail-chart-layout"
            >
              <div class="axis-title-y detail-axis-title-y">{{ detailYAxisTitle }}</div>

              <div class="detail-y-axis">
                <span v-for="tick in detailTicks" :key="tick.key">{{ tick.label }}</span>
              </div>

              <div class="detail-plot">
                <svg viewBox="0 0 1000 280" preserveAspectRatio="none">
                  <path
                    v-for="item in detailSeries"
                    v-show="isDetailSeriesEnabled(item.name)"
                    :key="item.name"
                    :d="item.path"
                    fill="none"
                    :stroke="item.color"
                    :stroke-width="item.width || 3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <div class="x-axis positioned-axis detail-x-axis">
                  <span
                    v-for="(label, index) in detailDateLabels"
                    :key="`${label}-${index}`"
                    :style="axisLabelStyle(index, detailDateLabels.length)"
                  >
                    {{ label }}
                  </span>
                </div>
                <div class="x-axis-title">{{ detailXAxisTitle }}</div>
              </div>
            </div>

            <el-empty
              v-else
              description="当前物候期暂无可用于趋势分析的真实数据"
              :image-size="90"
            />
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
import { listPhenology } from '@/api/binZhou/xwq/phenology'
import { listImage } from '@/api/binZhou/xwq/image'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'

const router = useRouter()

const loading = ref(false)
const rawRows = ref([])
const dateRange = ref([])
const monitorScopePath = ref([])
const filterStage = ref('')
const selectedStage = ref('')
const hoveredStageIndex = ref(null)
const enabledTrendSeries = ref({})
const enabledDetailSeries = ref({})
const trendMode = ref('progress')
const analysisMode = ref('env')
let loadRequestId = 0

const queryParams = ref({
  parkId: undefined,
  areaId: undefined,
  locationId: undefined,
  deviceId: undefined,
  phenologyCrop: '',
  phenologyName: ''
})

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

const colors = [
  '#3267d6',
  '#21a7f3',
  '#d946ef',
  '#f5c400',
  '#f08c00',
  '#12b886',
  '#5ed279',
  '#8b6bd6',
  '#e8590c',
  '#0ca678'
]
const DEFAULT_TREND_VISIBLE_COUNT = 6
const PHENOLOGY_STAGE_RULES = [
  ['休眠'],
  ['萌芽', '芽期'],
  ['展叶', '叶期'],
  ['现蕾', '花蕾'],
  ['开花', '花期', '盛花'],
  ['授粉'],
  ['坐果', '座果'],
  ['幼果'],
  ['膨大'],
  ['转色'],
  ['成熟'],
  ['采收'],
  ['落叶']
]

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
          item => String(item.locationId || '') === String(parentId)
        )
        deviceOptions.value = rows
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

onMounted(async () => {
  await loadParkOptions()
  await initDefaultScope()
  await loadData()
})

/**
 * 后端已经按园区、地块、角落和设备查询。
 * 这里再根据 Mapper 返回的真实范围字段做一次保护性过滤，
 * 防止浏览器快速切换条件时保留上一请求的数据。
 */
const scopeRows = computed(() => {
  return rawRows.value.filter(row => {
    return matchesScopeValue(row.parkId, queryParams.value.parkId)
      && matchesScopeValue(row.areaId ?? row.plotId, queryParams.value.areaId)
      && matchesScopeValue(
        row.locationId ?? row.imageB,
        queryParams.value.locationId
      )
      && matchesScopeValue(row.deviceId, queryParams.value.deviceId)
  })
})

function matchesScopeValue(rowValue, queryValue) {
  if (queryValue === undefined || queryValue === null || queryValue === '') {
    return true
  }

  // 后端已按查询参数过滤，但旧接口版本可能没有把关联字段返回。
  // 此时不能在前端把整批真实结果误删。
  if (rowValue === undefined || rowValue === null || rowValue === '') {
    return true
  }

  return String(rowValue) === String(queryValue)
}

/**
 * 用于生成真实物候期选项的基础数据。
 * 这里应用监测范围、作物和时间，但不应用物候期条件，
 * 避免选择某个物候期后下拉框只剩一个选项。
 */
const stageSourceRows = computed(() => {
  let rows = buildValidObservationRows(scopeRows.value)

  const crop = String(queryParams.value.phenologyCrop || '').trim()
  if (crop) {
    rows = rows.filter(row =>
      String(row.phenologyCrop || '').includes(crop)
    )
  }

  if (dateRange.value?.length === 2) {
    const start = parseDateValue(`${dateRange.value[0]} 00:00:00`)
    const end = parseDateValue(`${dateRange.value[1]} 23:59:59`)

    rows = rows.filter(row => {
      const time = getRowTime(row)
      return time !== null && time >= start && time <= end
    })
  }

  return rows
})

/**
 * 顶部物候期筛选与下方图表当前选中阶段分离：
 * filterStage 负责查询范围，selectedStage 只负责图表高亮和详情。
 */
const baseRows = computed(() => {
  const stage = String(filterStage.value || '').trim()
  if (!stage) return stageSourceRows.value

  return stageSourceRows.value.filter(
    row => String(row.phenologyName || '').trim() === stage
  )
})

const stageOptions = computed(() => {
  const countMap = new Map()

  stageSourceRows.value.forEach(row => {
    const name = String(row.phenologyName || '').trim()
    if (!name) return
    countMap.set(name, (countMap.get(name) || 0) + 1)
  })

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([name]) => name)
})

/** 当前页面所有图表实际使用的数据 */
const filteredRows = computed(() => {
  const stage = String(selectedStage.value || '').trim()
  if (!stage) return baseRows.value

  return baseRows.value.filter(
    row => String(row.phenologyName || '').trim() === stage
  )
})

const allStageStats = computed(() => buildStageStats(baseRows.value))

/*
 * 环形图始终展示当前设备/查询范围内的完整物候期占比。
 * selectedStage 只负责高亮对应圆弧，不能把圆环重新计算成单项 100%。
 */
const stageRatio = computed(() => allStageStats.value)

const dominantStage = computed(() => stageRatio.value[0]?.name || '暂无')
const dominantPercent = computed(() => stageRatio.value[0]?.percent || 0)

const selectedStageRows = computed(() => {
  const stage = selectedStage.value || dominantStage.value
  if (!stage || stage === '暂无') return []

  return baseRows.value.filter(
    row => String(row.phenologyName || '').trim() === stage
  )
})

const selectedStageData = computed(() => {
  return allStageStats.value.find(item => item.name === selectedStage.value)
    || allStageStats.value[0]
    || {
      name: '暂无',
      count: 0,
      percent: 0,
      color: colors[0]
    }
})

const selectedStageColor = computed(() => {
  return selectedStageData.value.color || colors[0]
})

/**
 * 当前物候期代表原图：
 * 1. 仅从当前筛选条件和当前物候期的真实记录中选择；
 * 2. 只使用图片表原图 imageUrl，不使用识别结果图；
 * 3. 优先置信度高，置信度相同时优先识别时间新的记录。
 */
const selectedStageImage = computed(() => {
  const rows = selectedStageRows.value
    .filter(row => Boolean(row.originalImageUrl))
    .slice()
    .sort(compareStageImageRows)

  // 只显示 xwq_ai_image.image_url 对应的真实原图。
  return normalizeImageUrl(
    rows[0]?.originalImageUrl || ''
  )
})

const cropName = computed(() => {
  const cropCount = new Map()

  selectedStageRows.value.forEach(row => {
    const crop = String(row.phenologyCrop || '').trim()
    if (!crop) return
    cropCount.set(crop, (cropCount.get(crop) || 0) + 1)
  })

  return Array.from(cropCount.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    || queryParams.value.phenologyCrop
    || '暂无'
})

const nextStageName = computed(() => {
  const countMap = new Map()

  selectedStageRows.value.forEach(row => {
    const name = String(row.phenologyNextName || '').trim()
    if (!name) return
    countMap.set(name, (countMap.get(name) || 0) + 1)
  })

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    || '待判断'
})

const avgConfidence = computed(() => {
  const rows = selectedStageRows.value.length
    ? selectedStageRows.value
    : filteredRows.value

  if (!rows.length) return 0

  const total = rows.reduce(
    (sum, item) => sum + toPercent(item.phenologyConfidence),
    0
  )
  return Math.round(total / rows.length)
})

const progressStatus = computed(() => {
  if (!selectedStageRows.value.length) return '暂无数据'
  if (avgConfidence.value < 70) return '建议复核'
  if (selectedStageData.value.percent >= 70 && avgConfidence.value >= 85) {
    return '阶段稳定'
  }
  return '持续观测'
})

const dateRangeText = computed(() => {
  if (dateRange.value?.length === 2) {
    return `${dateRange.value[0]} 至 ${dateRange.value[1]}`
  }

  const times = baseRows.value
    .map(getRowTime)
    .filter(time => time !== null)

  if (!times.length) return '暂无有效识别时间'

  const start = new Date(Math.min(...times))
  const end = new Date(Math.max(...times))
  return `${formatFullDate(start)} 至 ${formatFullDate(end)}`
})

/* 物候阶段按业务顺序展示，无法识别的自定义阶段排在末尾。 */
const orderedStageNames = computed(() => {
  return stageOptions.value.slice().sort(comparePhenologyStageNames)
})

const stageIndexMap = computed(() => {
  return new Map(
    orderedStageNames.value.map((name, index) => [name, index + 1])
  )
})

const topTrendStages = computed(() => {
  return allStageStats.value
})

/* 时间轴固定取当前设备/查询范围的全部记录，切换阶段时横轴不跳动。 */
const trendBuckets = computed(() => buildTimeBuckets(baseRows.value))
const dateLabels = computed(() => trendBuckets.value.map(item => item.label))
const dailyObservations = computed(() => buildDailyObservations(baseRows.value))

const trendChartTitle = computed(() => {
  if (trendMode.value === 'share') return '物候阶段占比趋势'
  if (trendMode.value === 'count') return '有效识别次数趋势'
  return '主导物候期进程'
})

const trendYAxisTitle = computed(() => {
  if (trendMode.value === 'share') return '阶段占比（%）'
  if (trendMode.value === 'count') return '有效识别（次）'
  return '物候阶段'
})

const trendEmptyText = computed(() => {
  if (trendMode.value === 'progress') {
    return '暂无可用于物候进程判断的有效观测数据'
  }
  return '暂无带有效观测时间的物候识别数据'
})

const trendRawSeries = computed(() => {
  if (trendMode.value === 'progress') {
    const values = dominantStageValuesByBuckets(
      dailyObservations.value,
      trendBuckets.value,
      stageIndexMap.value
    )

    return values.some(value => value !== null)
      ? [{
          name: '主导物候期',
          color: '#168765',
          width: 3.5,
          values
        }]
      : []
  }

  return topTrendStages.value.map(item => ({
    name: item.name,
    color: item.color,
    width: item.name === selectedStage.value ? 4 : 2.5,
    values: trendMode.value === 'share'
      ? stageShareByBuckets(
          dailyObservations.value,
          trendBuckets.value,
          item.name
        )
      : countRowsByBuckets(
          baseRows.value.filter(
            row => String(row.phenologyName || '').trim() === item.name
          ),
          trendBuckets.value
        )
  }))
})

const trendMax = computed(() => {
  if (trendMode.value === 'progress') {
    return Math.max(1, orderedStageNames.value.length)
  }
  if (trendMode.value === 'share') return 100
  return niceMax(
    trendRawSeries.value.flatMap(item => item.values)
  )
})

const trendTicks = computed(() => {
  if (trendMode.value === 'progress') {
    return buildStageTicks(orderedStageNames.value)
  }
  return buildTicks(trendMax.value).map(value => ({
    key: String(value),
    label: String(value)
  }))
})

const trendLines = computed(() => {
  return trendRawSeries.value.map(item => ({
    ...item,
    path: trendMode.value === 'progress'
      ? buildStepLinePath(
          item.values,
          900,
          240,
          1,
          trendMax.value
        )
      : buildLinePath(item.values, 900, 240, trendMax.value)
  }))
})

const allSeriesSelected = computed(() => {
  return topTrendStages.value.length > 0
    && topTrendStages.value.every(item => isTrendEnabled(item.name))
})

const noSeriesSelected = computed(() => {
  return topTrendStages.value.length > 0
    && topTrendStages.value.every(item => !isTrendEnabled(item.name))
})

const activeStageIndex = computed(() => {
  if (Number.isInteger(hoveredStageIndex.value)) {
    return hoveredStageIndex.value
  }
  return stageRatio.value.findIndex(item => item.name === selectedStage.value)
})

const donutCenter = computed(() => {
  const active = Number.isInteger(hoveredStageIndex.value)
    ? stageRatio.value[hoveredStageIndex.value]
    : stageRatio.value.find(item => item.name === selectedStage.value)
      || stageRatio.value[0]

  if (!active) {
    return {
      main: baseRows.value.length,
      sub: '识别总数',
      extra: `共${stageRatio.value.length}个阶段`
    }
  }

  return {
    main: `${active.percent || 0}%`,
    sub: active.name,
    extra: `${active.count || 0}条记录`
  }
})

const donutSegments = computed(() => {
  const total = baseRows.value.length || 1
  let startAngle = 0

  return stageRatio.value.map((item, index) => {
    const rawAngle = Number(item.count || 0) / total * 360
    const endAngle = index === stageRatio.value.length - 1
      ? 360
      : startAngle + rawAngle

    const safeGap = rawAngle > 8 && stageRatio.value.length > 1 ? 1.2 : 0
    const drawStart = startAngle + safeGap
    const drawEnd = Math.max(drawStart + 0.5, endAngle - safeGap)
    const middleAngle = (startAngle + endAngle) / 2

    const isHover = hoveredStageIndex.value === index
    const isSelected = selectedStage.value === item.name
    const isActive = isHover || isSelected
    const hasActive = activeStageIndex.value >= 0
    const isDim = hasActive && !isActive

    const offset = isHover ? 8 : isSelected ? 7 : 0
    const radians = (middleAngle - 90) * Math.PI / 180

    const segment = {
      index,
      name: item.name,
      color: item.color,
      isActive,
      isDim,
      translateX: Math.cos(radians) * offset,
      translateY: Math.sin(radians) * offset,
      path: createDonutPath(
        120,
        120,
        94,
        48,
        drawStart,
        drawEnd
      )
    }

    startAngle = endAngle
    return segment
  })
})

const detailBuckets = computed(() => {
  return buildTimeBuckets(
    analysisMode.value === 'env'
      ? selectedStageRows.value
      : baseRows.value
  )
})
const detailXAxisTitle = computed(() => {
  if (analysisMode.value === 'year') return '物候阶段'
  if (analysisMode.value === 'device') return '观测日期'
  return '识别日期'
})

const detailDateLabels = computed(() => {
  if (analysisMode.value === 'year') {
    return orderedStageNames.value
  }
  return detailBuckets.value.map(item => item.label)
})

const detailRawSeries = computed(() => {
  if (!baseRows.value.length) return []

  if (analysisMode.value === 'year') {
    const yearMap = new Map()

    buildOverallDailyDominantObservations(
      buildDailyObservations(baseRows.value)
    ).forEach(observation => {
      const date = new Date(observation.time)
      const year = String(date.getFullYear())
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map())
      }

      const stageName = observation.stageName
      const dayOfYear = getDayOfYear(date)
      const current = yearMap.get(year).get(stageName)
      if (current === undefined || dayOfYear < current) {
        yearMap.get(year).set(stageName, dayOfYear)
      }
    })

    return Array.from(yearMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, stageMap], index) => ({
        name: `${year}年`,
        color: colors[index % colors.length],
        width: index === yearMap.size - 1 ? 4 : 2.5,
        values: orderedStageNames.value.map(
          stageName => stageMap.get(stageName) ?? null
        )
      }))
  }

  if (analysisMode.value === 'device') {
    const deviceMap = new Map()

    buildDailyObservations(baseRows.value).forEach(observation => {
      if (observation.deviceKey === 'unbound') return
      const deviceKey = observation.deviceKey

      if (!deviceMap.has(deviceKey)) {
        deviceMap.set(deviceKey, {
          name: observation.deviceName || `设备${deviceKey}`,
          observations: []
        })
      }

      deviceMap.get(deviceKey).observations.push(observation)
    })

    return Array.from(deviceMap.values())
      .sort((a, b) => b.observations.length - a.observations.length)
      .slice(0, 8)
      .map((item, index) => ({
        name: item.name,
        color: colors[index % colors.length],
        width: index === 0 ? 4 : 2.5,
        values: dominantStageValuesByBuckets(
          item.observations,
          detailBuckets.value,
          stageIndexMap.value
        )
      }))
  }

  if (!selectedStageRows.value.length) return []

  return [{
    name: selectedStage.value || dominantStage.value,
    color: selectedStageColor.value,
    width: 4,
    values: countRowsByBuckets(
      selectedStageRows.value,
      detailBuckets.value
    )
  }]
})

const detailValueRange = computed(() => {
  if (analysisMode.value === 'device') {
    return {
      min: 1,
      max: Math.max(1, orderedStageNames.value.length)
    }
  }

  if (analysisMode.value === 'year') {
    const values = detailRawSeries.value
      .flatMap(item => item.values)
      .filter(value => value !== null && Number.isFinite(Number(value)))

    if (!values.length) return { min: 1, max: 366 }

    return {
      min: Math.max(1, Math.min(...values) - 7),
      max: Math.min(366, Math.max(...values) + 7)
    }
  }

  return {
    min: 0,
    max: niceMax(detailRawSeries.value.flatMap(item => item.values))
  }
})

const detailMax = computed(() => {
  return detailValueRange.value.max
})

const detailYAxisTitle = computed(() => {
  if (analysisMode.value === 'year') return '首次主导日期'
  if (analysisMode.value === 'device') return '物候阶段'
  return '有效识别（次）'
})

const detailTicks = computed(() => {
  if (analysisMode.value === 'device') {
    return buildStageTicks(orderedStageNames.value)
  }

  if (analysisMode.value === 'year') {
    return buildDayOfYearTicks(
      detailValueRange.value.min,
      detailValueRange.value.max
    )
  }

  return buildTicks(detailMax.value).map(value => ({
    key: String(value),
    label: String(value)
  }))
})

const detailSeries = computed(() => {
  return detailRawSeries.value.map(item => ({
    ...item,
    path: analysisMode.value === 'device'
      ? buildStepLinePath(
          item.values,
          1000,
          280,
          detailValueRange.value.min,
          detailValueRange.value.max
        )
      : buildScaledLinePath(
          item.values,
          1000,
          280,
          detailValueRange.value.min,
          detailValueRange.value.max
        )
  }))
})

const detailChartTitle = computed(() => {
  const name = selectedStage.value || dominantStage.value
  if (analysisMode.value === 'year') {
    return '不同年份物候阶段首次主导日期对比'
  }
  if (analysisMode.value === 'device') {
    return '不同设备物候进程对比'
  }
  return `${name}有效识别次数趋势`
})

watch(stageOptions, options => {
  if (!options.length) {
    selectedStage.value = ''
    filterStage.value = ''
    return
  }

  if (
    selectedStage.value
    && !options.includes(selectedStage.value)
  ) {
    selectedStage.value = ''
  }

  if (
    filterStage.value
    && !options.includes(filterStage.value)
  ) {
    filterStage.value = ''
  }
}, { immediate: true })

watch(filterStage, stage => {
  hoveredStageIndex.value = null

  if (
    stage
    && selectedStage.value
    && selectedStage.value !== stage
  ) {
    selectedStage.value = ''
  }
})

watch(selectedStage, stage => {
  hoveredStageIndex.value = null

  const nextTrendState = {}
    topTrendStages.value.forEach((item, index) => {
    nextTrendState[item.name] = stage
      ? item.name === stage
      : index < DEFAULT_TREND_VISIBLE_COUNT
  })
  enabledTrendSeries.value = nextTrendState

  if (stage) {
    enabledDetailSeries.value = {
      ...enabledDetailSeries.value,
      [stage]: true
    }
  }
})

watch(topTrendStages, list => {
  const next = {}
    list.forEach((item, index) => {
    if (enabledTrendSeries.value[item.name] !== undefined) {
      next[item.name] = enabledTrendSeries.value[item.name]
    } else if (selectedStage.value) {
      next[item.name] = item.name === selectedStage.value
    } else {
      next[item.name] = index < DEFAULT_TREND_VISIBLE_COUNT
    }
  })
  enabledTrendSeries.value = next
}, { immediate: true })

watch(detailRawSeries, list => {
  const next = { ...enabledDetailSeries.value }
  list.forEach(item => {
    if (next[item.name] === undefined) next[item.name] = true
  })
  enabledDetailSeries.value = next
}, { immediate: true })

async function loadParkOptions() {
  try {
    const res = await listPark({ pageNum: 1, pageSize: 999 })
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

  queryParams.value.parkId = getScopeValueId(values[0]) || undefined
  queryParams.value.areaId = getScopeValueId(values[1]) || undefined
  queryParams.value.locationId = getScopeValueId(values[2]) || undefined
  queryParams.value.deviceId = getScopeValueId(values[3]) || undefined

  selectedStage.value = ''
  hoveredStageIndex.value = null
  enabledTrendSeries.value = {}
  enabledDetailSeries.value = {}

  // 任意层级变化后立即刷新，避免页面继续显示旧范围数据。
  await loadData()
}

function buildScopeValue(type, id) {
  return `${type}:${id}`
}

function getScopeValueId(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value).includes(':')
    ? String(value).split(':').pop()
    : value
}

async function loadData() {
  const requestId = ++loadRequestId
  loading.value = true

  try {
    /*
     * 与“物候图片”页面保持一致：
     * 1. listImage 查询 xwq_ai_image 中的真实图片；
     * 2. listPhenology 查询物候期识别结果；
     * 3. 两组数据通过 imageId 合并。
     */
    const [imageRes, phenologyRes] = await Promise.all([
      listImage({
        pageNum: 1,
        pageSize: 10000,
        imageAiType: 'phenology',
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
          queryParams.value.phenologyCrop || undefined
      })
    ])

    // 用户快速切换设备时，忽略先发后到的旧响应。
    if (requestId !== loadRequestId) return

    const imageMap = new Map()

    getResponseRows(imageRes).forEach(image => {
      if (
        image.imageId === undefined
        || image.imageId === null
      ) {
        return
      }

      imageMap.set(String(image.imageId), image)
    })

    rawRows.value = getResponseRows(phenologyRes)
      .map(row => {
        const image = imageMap.get(
          String(row.imageId)
        ) || {}

        return {
          ...row,

          /*
           * 真实原图字段来源：
           * xwq_ai_image.image_url -> imageUrl
           */
          originalImageUrl:
            image.imageUrl
            || image.image_url
            || row.imageUrl
            || row.image_url
            || '',

          imageName:
            image.imageName
            || row.imageName
            || '',

          imageStatus:
            image.imageStatus
            ?? row.imageStatus,

          imageCreateTime:
            image.createTime
            || image.updateTime
            || '',

          imageSource:
            image.imageSource
            || row.imageSource
            || '',

          /*
           * 用图片表字段补齐范围信息，
           * 与物候图片页面的合并逻辑一致。
           */
          parkId:
            row.parkId
            ?? image.parkId,

          areaId:
            row.areaId
            ?? row.plotId
            ?? image.plotId,

          plotId:
            row.plotId
            ?? row.areaId
            ?? image.plotId,

          locationId:
            row.locationId
            ?? row.imageB
            ?? image.imageB,

          imageB:
            row.imageB
            ?? row.locationId
            ?? image.imageB,

          deviceId:
            row.deviceId
            ?? image.deviceId
        }
      })

    hoveredStageIndex.value = null
    enabledTrendSeries.value = {}
    enabledDetailSeries.value = {}

    if (!rawRows.value.length) {
      ElMessage.info(
        '当前设备及筛选条件下暂无物候期识别数据'
      )
    }
  } catch (error) {
    if (requestId !== loadRequestId) return

    console.error(error)
    rawRows.value = []
    selectedStage.value = ''
    hoveredStageIndex.value = null
    ElMessage.error(
      '物候期数据或真实图片加载失败，请检查图片和物候结果接口'
    )
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false
    }
  }
}

async function resetQuery() {
  queryParams.value = {
    parkId: undefined,
    areaId: undefined,
    locationId: undefined,
    deviceId: undefined,
    phenologyCrop: '',
    phenologyName: ''
  }

  areaOptions.value = []
  locationOptions.value = []
  deviceOptions.value = []
  monitorScopePath.value = []
  dateRange.value = []
  filterStage.value = ''
  selectedStage.value = ''
  hoveredStageIndex.value = null
  await initDefaultScope()
  await loadData()
}

function getResponseRows(response) {
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.data)) return response.data
  return []
}

/**
 * 物候结果表中的记录已经代表模型完成识别，这里只校验阶段，
 * 并保证同一张图片最多贡献一次识别。历史图片状态和时间字段不统一：
 * 缺少时间的结果仍参与总览统计，只在生成趋势时自然跳过。
 */
function buildValidObservationRows(rows) {
  const rowMap = new Map()

  rows.forEach((row, index) => {
    const stageName = String(row.phenologyName || '').trim()
    if (!stageName) return

    const key = row.imageId !== undefined && row.imageId !== null
      ? `image:${row.imageId}`
      : row.phenologyId !== undefined && row.phenologyId !== null
        ? `phenology:${row.phenologyId}`
        : row.recordId !== undefined && row.recordId !== null
          ? `record:${row.recordId}`
          : `row:${index}`

    const current = rowMap.get(key)
    if (!current || compareObservationPriority(row, current) > 0) {
      rowMap.set(key, row)
    }
  })

  return Array.from(rowMap.values())
}

function compareObservationPriority(a, b) {
  const resultTimeDiff = getResultTime(a) - getResultTime(b)
  if (resultTimeDiff !== 0) return resultTimeDiff

  return normalizeConfidence(a?.phenologyConfidence)
    - normalizeConfidence(b?.phenologyConfidence)
}

function getResultTime(row) {
  const candidates = [
    row.updateTime,
    row.createTime,
    row.phenologyA
  ]

  for (const value of candidates) {
    const time = parseDateValue(value)
    if (time !== null) return time
  }

  return 0
}

/** 每台设备每天只形成一个主导阶段观测，消除设备拍摄频率差异。 */
function buildDailyObservations(rows) {
  const groups = new Map()

  rows.forEach(row => {
    const time = getRowTime(row)
    const stageName = String(row.phenologyName || '').trim()
    if (time === null || !stageName) return

    const date = startOfDay(new Date(time))
    const hasDevice = row.deviceId !== undefined
      && row.deviceId !== null
      && row.deviceId !== ''
    const deviceKey = hasDevice ? String(row.deviceId) : 'unbound'
    const key = `${deviceKey}:${formatFullDate(date)}`

    if (!groups.has(key)) {
      groups.set(key, {
        time: date.getTime(),
        deviceKey,
        deviceName: row.deviceName || '',
        stageMap: new Map(),
        validImageCount: 0
      })
    }

    const group = groups.get(key)
    const stage = group.stageMap.get(stageName) || {
      count: 0,
      confidenceTotal: 0
    }
    stage.count += 1
    stage.confidenceTotal += normalizeConfidence(row.phenologyConfidence)
    group.stageMap.set(stageName, stage)
    group.validImageCount += 1
  })

  return Array.from(groups.values())
    .map(group => {
      const dominant = Array.from(group.stageMap.entries())
        .map(([stageName, value]) => ({
          stageName,
          count: value.count,
          avgConfidence: value.count
            ? value.confidenceTotal / value.count
            : 0
        }))
        .sort((a, b) => (
          b.count - a.count
          || b.avgConfidence - a.avgConfidence
          || comparePhenologyStageNames(b.stageName, a.stageName)
        ))[0]

      return {
        time: group.time,
        deviceKey: group.deviceKey,
        deviceName: group.deviceName,
        stageName: dominant?.stageName || '',
        confidence: dominant?.avgConfidence || 0,
        validImageCount: group.validImageCount
      }
    })
    .filter(item => item.stageName)
    .sort((a, b) => a.time - b.time)
}

/** 将设备日观测再次按日期汇总，得到园区/查询范围每日唯一主导阶段。 */
function buildOverallDailyDominantObservations(observations) {
  const dayMap = new Map()

  observations.forEach(item => {
    if (!dayMap.has(item.time)) dayMap.set(item.time, [])
    dayMap.get(item.time).push(item)
  })

  return Array.from(dayMap.entries())
    .map(([time, rows]) => {
      const stageMap = new Map()
      rows.forEach(item => {
        const current = stageMap.get(item.stageName) || {
          count: 0,
          confidenceTotal: 0
        }
        current.count += 1
        current.confidenceTotal += item.confidence
        stageMap.set(item.stageName, current)
      })

      const dominant = Array.from(stageMap.entries())
        .sort((a, b) => (
          b[1].count - a[1].count
          || b[1].confidenceTotal - a[1].confidenceTotal
          || comparePhenologyStageNames(b[0], a[0])
        ))[0]

      return {
        time: Number(time),
        stageName: dominant?.[0] || '',
        confidence: dominant?.[1]?.count
          ? dominant[1].confidenceTotal / dominant[1].count
          : 0,
        validDeviceCount: rows.length
      }
    })
    .filter(item => item.stageName)
    .sort((a, b) => a.time - b.time)
}

function dominantStageValuesByBuckets(observations, buckets, indexMap) {
  return buckets.map(bucket => {
    const stageMap = new Map()

    observations.forEach(item => {
      if (item.time < bucket.start || item.time >= bucket.end) return
      const current = stageMap.get(item.stageName) || {
        count: 0,
        confidenceTotal: 0
      }
      current.count += 1
      current.confidenceTotal += item.confidence
      stageMap.set(item.stageName, current)
    })

    const dominant = Array.from(stageMap.entries())
      .sort((a, b) => (
        b[1].count - a[1].count
        || b[1].confidenceTotal - a[1].confidenceTotal
        || comparePhenologyStageNames(b[0], a[0])
      ))[0]

    return dominant ? indexMap.get(dominant[0]) ?? null : null
  })
}

function stageShareByBuckets(observations, buckets, stageName) {
  return buckets.map(bucket => {
    const bucketRows = observations.filter(
      item => item.time >= bucket.start && item.time < bucket.end
    )
    if (!bucketRows.length) return 0

    const count = bucketRows.filter(
      item => item.stageName === stageName
    ).length
    return Number((count / bucketRows.length * 100).toFixed(1))
  })
}

function comparePhenologyStageNames(a, b) {
  const aIndex = getPhenologyStageRuleIndex(a)
  const bIndex = getPhenologyStageRuleIndex(b)
  if (aIndex !== bIndex) return aIndex - bIndex
  return String(a).localeCompare(String(b), 'zh-CN')
}

function getPhenologyStageRuleIndex(name) {
  const text = String(name || '').trim()
  const index = PHENOLOGY_STAGE_RULES.findIndex(keywords => (
    keywords.some(keyword => text.includes(keyword))
  ))
  return index >= 0 ? index : PHENOLOGY_STAGE_RULES.length
}

function buildStageStats(rows) {
  const map = new Map()

  rows.forEach(row => {
    const name = String(row.phenologyName || '').trim()
    if (!name) return
    map.set(name, (map.get(name) || 0) + 1)
  })

  const total = Array.from(map.values()).reduce(
    (sum, value) => sum + value,
    0
  )

  return Array.from(map.entries())
    .map(([name, count], index) => ({
      name,
      count,
      color: colors[index % colors.length],
      percent: total
        ? Math.round(count / total * 100)
        : 0
    }))
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }))
}

function buildTimeBuckets(rows) {
  const validTimes = rows
    .map(getRowTime)
    .filter(time => time !== null)

  let start
  let end

  if (dateRange.value?.length === 2) {
    start = startOfDay(
      new Date(parseDateValue(`${dateRange.value[0]} 00:00:00`))
    )
    end = endOfDay(
      new Date(parseDateValue(`${dateRange.value[1]} 23:59:59`))
    )
  } else if (validTimes.length) {
    start = startOfDay(new Date(Math.min(...validTimes)))
    end = endOfDay(new Date(Math.max(...validTimes)))
  } else {
    return []
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return []
  }

  const dayCount = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
  )

  if (dayCount <= 14) {
    return buildDailyBuckets(start, end)
  }

  if (dayCount <= 120) {
    return buildWeeklyBuckets(start, end)
  }

  return buildMonthlyBuckets(start, end)
}

function buildDailyBuckets(start, end) {
  const buckets = []
  const crossYear = start.getFullYear() !== end.getFullYear()

  for (
    let current = new Date(start);
    current <= end;
    current = addDays(current, 1)
  ) {
    const bucketStart = startOfDay(current)
    const bucketEnd = startOfDay(addDays(current, 1))

    buckets.push({
      start: bucketStart.getTime(),
      end: bucketEnd.getTime(),
      label: crossYear
        ? formatFullDate(bucketStart)
        : formatMonthDay(bucketStart)
    })
  }

  return buckets
}

function buildWeeklyBuckets(start, end) {
  const buckets = []
  const crossYear = start.getFullYear() !== end.getFullYear()

  for (
    let current = new Date(start);
    current <= end;
    current = addDays(current, 7)
  ) {
    const bucketStart = startOfDay(current)
    const next = addDays(current, 7)
    const bucketEnd = next > end
      ? addDays(endOfDay(end), 1)
      : startOfDay(next)

    buckets.push({
      start: bucketStart.getTime(),
      end: bucketEnd.getTime(),
      label: crossYear
        ? formatFullDate(bucketStart)
        : formatMonthDay(bucketStart)
    })
  }

  return buckets
}

function buildMonthlyBuckets(start, end) {
  const buckets = []

  let current = new Date(
    start.getFullYear(),
    start.getMonth(),
    1
  )

  const lastMonth = new Date(
    end.getFullYear(),
    end.getMonth(),
    1
  )

  while (current <= lastMonth) {
    const next = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      1
    )

    buckets.push({
      start: current.getTime(),
      end: next.getTime(),
      label: `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, '0')}`
    })

    current = next
  }

  return buckets
}

function countRowsByBuckets(rows, buckets) {
  const values = new Array(buckets.length).fill(0)

  rows.forEach(row => {
    const time = getRowTime(row)
    if (time === null) return

    const index = buckets.findIndex(
      bucket => time >= bucket.start && time < bucket.end
    )

    if (index >= 0) values[index] += 1
  })

  return values
}

function compareStageImageRows(a, b) {
  const confidenceDiff =
    normalizeConfidence(b?.phenologyConfidence)
    - normalizeConfidence(a?.phenologyConfidence)

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

function normalizeImageUrl(url) {
  if (!url) return ''

  const value = String(url).trim()
  if (!value) return ''

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value
  }

  const baseApi = String(
    import.meta.env.VITE_APP_BASE_API || ''
  ).replace(/\/$/, '')

  // 已带 /dev-api 等基础路径时不重复拼接。
  if (
    baseApi
    && (
      value === baseApi
      || value.startsWith(`${baseApi}/`)
    )
  ) {
    return value
  }

  if (!baseApi) {
    return value.startsWith('/')
      ? value
      : `/${value}`
  }

  return value.startsWith('/')
    ? `${baseApi}${value}`
    : `${baseApi}/${value}`
}

function getRowTime(row) {
  const candidates = [
    row.imageCreateTime,
    row.captureTime,
    row.shootTime,
    row.phenologyA,
    row.recordTime,
    row.createTime,
    row.updateTime
  ]

  for (const value of candidates) {
    const time = parseDateValue(value)
    if (time !== null) return time
  }

  return null
}

function parseDateValue(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const text = String(value).trim()
  if (!text) return null

  let time = new Date(text).getTime()
  if (!Number.isNaN(time)) return time

  time = new Date(text.replace(/-/g, '/')).getTime()
  return Number.isNaN(time) ? null : time
}

function niceMax(values) {
  const maxValue = Math.max(0, ...values.map(value => Number(value || 0)))

  if (maxValue <= 5) return 5
  if (maxValue <= 10) return 10

  const magnitude = 10 ** Math.floor(Math.log10(maxValue))
  const normalized = maxValue / magnitude
  const step = normalized <= 2
    ? 0.5
    : normalized <= 5
      ? 1
      : 2

  return Math.ceil(normalized / step) * step * magnitude
}

function buildTicks(maxValue) {
  return [
    maxValue,
    Math.round(maxValue * 0.8),
    Math.round(maxValue * 0.6),
    Math.round(maxValue * 0.4),
    Math.round(maxValue * 0.2),
    0
  ]
}

function buildLinePath(values, width, height, maxValue) {
  return buildScaledLinePath(values, width, height, 0, maxValue)
}

function buildScaledLinePath(values, width, height, minValue, maxValue) {
  if (!values.length) return ''

  const safeMin = Number(minValue || 0)
  const safeMax = Math.max(safeMin + 1, Number(maxValue || 0))
  const topPadding = 10
  const bottomPadding = 10
  const drawableHeight = height - topPadding - bottomPadding

  const points = values.map((value, index) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return null
    }

    const x = values.length === 1
      ? width / 2
      : index * width / (values.length - 1)

    const y = topPadding
      + (1 - (Number(value) - safeMin) / (safeMax - safeMin)) * drawableHeight

    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3))
    }
  })

  if (points.length === 1 && points[0]) {
    const point = points[0]
    return `M 0 ${point.y} L ${width} ${point.y}`
  }

  let drawing = false
  const commands = []
  points.forEach(point => {
    if (!point) {
      drawing = false
      return
    }
    if (drawing) {
      commands.push(`L ${point.x} ${point.y}`)
    } else {
      commands.push(
        `M ${(point.x - 0.01).toFixed(3)} ${point.y}`,
        `L ${(point.x + 0.01).toFixed(3)} ${point.y}`
      )
    }
    drawing = true
  })
  return commands.join(' ')
}

function buildStepLinePath(values, width, height, minValue, maxValue) {
  if (!values.length) return ''

  const safeMin = Number(minValue || 0)
  const safeMax = Math.max(safeMin + 1, Number(maxValue || 0))
  const topPadding = 10
  const bottomPadding = 10
  const drawableHeight = height - topPadding - bottomPadding
  const commands = []
  let previous = null

  values.forEach((value, index) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      previous = null
      return
    }

    const x = values.length === 1
      ? width / 2
      : index * width / (values.length - 1)
    const y = topPadding
      + (1 - (Number(value) - safeMin) / (safeMax - safeMin)) * drawableHeight
    const point = {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3))
    }

    if (!previous) {
      commands.push(
        `M ${(point.x - 0.01).toFixed(3)} ${point.y}`,
        `L ${(point.x + 0.01).toFixed(3)} ${point.y}`
      )
    } else {
      commands.push(`L ${point.x} ${previous.y} L ${point.x} ${point.y}`)
    }
    previous = point
  })

  return commands.join(' ')
}

function buildStageTicks(stageNames) {
  return stageNames
    .map((name, index) => ({ name, index }))
    .reverse()
    .map(index => ({
      key: `stage-${index.index}`,
      label: index.name
    }))
}

function buildDayOfYearTicks(minValue, maxValue) {
  const ticks = []
  const count = 6
  for (let index = 0; index < count; index += 1) {
    const ratio = index / (count - 1)
    const value = Math.round(maxValue - (maxValue - minValue) * ratio)
    ticks.push({
      key: `doy-${value}`,
      label: formatDayOfYear(value)
    })
  }
  return ticks
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.floor((startOfDay(date) - start) / 86400000) + 1
}

function formatDayOfYear(dayOfYear) {
  const date = new Date(2000, 0, Math.max(1, Number(dayOfYear || 1)))
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function axisLabelStyle(index, total) {
  if (total <= 1) {
    return {
      left: '50%',
      transform: 'translateX(-50%)'
    }
  }

  const percent = index / (total - 1) * 100

  return {
    left: `${percent}%`,
    transform: index === 0
      ? 'translateX(0)'
      : index === total - 1
        ? 'translateX(-100%)'
        : 'translateX(-50%)'
  }
}

function selectStageFromList(name) {
  selectedStage.value = name
  hoveredStageIndex.value = null
}

function previewStageRatio(index) {
  hoveredStageIndex.value = index
}

function endStagePreview() {
  hoveredStageIndex.value = null
}

function resolveTrendSeriesName(nameOrIndex) {
  if (typeof nameOrIndex === 'number') {
    return topTrendStages.value[nameOrIndex]?.name || ''
  }
  return String(nameOrIndex || '')
}

function isTrendEnabled(nameOrIndex) {
  const name = resolveTrendSeriesName(nameOrIndex)
  return name
    ? enabledTrendSeries.value[name] === true
    : false
}

function toggleTrendSeries(nameOrIndex) {
  const name = resolveTrendSeriesName(nameOrIndex)
  if (!name) return

  enabledTrendSeries.value = {
    ...enabledTrendSeries.value,
    [name]: !isTrendEnabled(name)
  }
}

function selectAllTrendSeries(enabled) {
  const next = {}
  topTrendStages.value.forEach(item => {
    next[item.name] = Boolean(enabled)
  })
  enabledTrendSeries.value = next
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
  const start = Math.min(359.999, Math.max(0, startAngle))
  const end = Math.min(
    359.999,
    Math.max(start + 0.001, endAngle)
  )

  const outerStart = polarToCartesian(
    centerX,
    centerY,
    outerRadius,
    end
  )
  const outerEnd = polarToCartesian(
    centerX,
    centerY,
    outerRadius,
    start
  )
  const innerStart = polarToCartesian(
    centerX,
    centerY,
    innerRadius,
    start
  )
  const innerEnd = polarToCartesian(
    centerX,
    centerY,
    innerRadius,
    end
  )
  const largeArcFlag = end - start <= 180 ? 0 : 1

  return [
    `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
    `L ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
    'Z'
  ].join(' ')
}

function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  )
}

function endOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  )
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatMonthDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatFullDate(date) {
  return `${date.getFullYear()}-${formatMonthDay(date)}`
}

function toPercent(value) {
  const num = Number(value || 0)
  return Math.round(num <= 1 ? num * 100 : num)
}

function goTo(path) {
  router.push(path)
}
</script>

<style scoped>
.phenology-page {
  width: 100vw;
  max-width: none;
  min-width: 1180px;
  min-height: 100vh;
  padding: 0 18px 22px;
  background: #f5f7f8;
  color: #263238;
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
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid #edf1f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(26, 72, 54, 0.06);
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
}

.demo-alert {
  margin-bottom: 12px;
}

.risk-high {
  color: #f56c6c !important;
}

.risk-mid {
  color: #e6a23c !important;
}

.risk-low {
  color: #12a878 !important;
}

.overview-grid {
  display: grid;
  grid-template-columns: 31% 69%;
  gap: 14px;
  margin-bottom: 14px;
}

.white-card {
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(26, 72, 54, .06);
  border: 1px solid #edf1f3;
}

.section-title {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f4f5;
  color: #30433c;
  font-size: 15px;
  font-weight: 700;
}

.section-title span {
  margin-left: 8px;
  color: #7b8794;
  font-weight: 400;
  font-size: 12px;
}

.ratio-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
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
  opacity: 0.58;
}

.donut-segment.is-active {
  stroke-width: 3;
  filter: drop-shadow(0 8px 10px rgba(37, 73, 59, 0.28));
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
  transition: background .15s ease, color .15s ease;
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
  background: #eaf8f2;
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
  border-radius: 50%;
}

.rank-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-row em {
  font-style: normal;
  color: #6d7a75;
  text-align: right;
}

.rank-row strong {
  color: #2e4038;
  text-align: right;
}

.trend-card {
  min-height: 334px;
  min-width: 0;
}

.chart-toolbar {
  min-height: 42px;
  padding: 8px 16px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.legend-line {
  min-height: 30px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0;
  color: #6d7a75;
  font-size: 11px;
}

.legend-line span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: opacity .16s ease, color .16s ease;
}

.legend-line span.disabled {
  opacity: .35;
}

.legend-line i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 0;
  border-radius: 50%;
}

.series-actions {
  display: flex;
  gap: 2px;
  padding: 3px;
  color: #6d7a75;
  font-size: 11px;
  border: 1px solid #e1e9e6;
  border-radius: 7px;
  background: #f7faf9;
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
  transition: color .18s ease, background .18s ease, box-shadow .18s ease;
}

.series-actions button:hover {
  color: #12885f;
  background: #edf8f3;
}

.series-actions button.active {
  color: #0d7f58;
  font-weight: 600;
  background: #fff;
  box-shadow: 0 1px 4px rgba(24,98,70,.12);
}

.chart-wrap {
  display: flex;
  height: 260px;
  padding: 6px 22px 16px;
}

.y-axis {
  width: 46px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #899691;
  font-size: 11px;
  text-align: right;
  padding-right: 10px;
}

.line-chart {
  flex: 1;
  min-width: 0;
  border-radius: 8px;
  background-image: linear-gradient(#e7edeb 1px, transparent 1px), linear-gradient(90deg, #edf2f0 1px, transparent 1px);
  background-size: 100% 43px, 90px 100%;
}

.line-chart svg {
  width: 100%;
  height: 226px;
  display: block;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  color: #84928c;
  font-size: 11px;
  overflow: hidden;
}

.x-axis span {
  white-space: nowrap;
}

.influence-card {
  padding-bottom: 20px;
}

.influence-head {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  padding: 18px 20px 4px;
  flex-wrap: wrap;
}

.stage-select {
  width: 170px;
}

.sub-tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  overflow-x: auto;
  padding-bottom: 2px;
}

.sub-tabs button {
  border: 0;
  background: transparent;
  padding: 8px 12px;
  color: #8a9995;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.sub-tabs button.active {
  background: #12b886;
  color: #fff;
  border-radius: 4px;
}

.influence-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  padding: 12px 20px 0;
}

.stage-profile {
  padding-top: 10px;
}

.stage-photo {
  position: relative;
  height: 150px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid #d8e8d9;
  border-radius: 10px;
  background: #f4f8f2;
}

.stage-real-image {
  width: 100%;
  height: 100%;
  display: block;
}

.stage-image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #819184;
  font-size: 14px;
  background: linear-gradient(135deg, #f7faf5, #eaf2e7);
}

.stage-image-name {
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

.stage-profile dl {
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: 10px 8px;
  margin-top: 14px;
  font-size: 13px;
}

.stage-profile dt {
  color: #879591;
}

.stage-profile dd {
  margin: 0;
  color: #12a878;
  font-weight: 700;
}

.env-chart {
  min-width: 0;
  overflow: hidden;
  min-height: 360px;
  text-align: center;
}

.env-chart h3 {
  margin: 12px 0 8px;
  font-size: 15px;
}

.env-legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  color: #7d8b87;
  font-size: 12px;
  flex-wrap: wrap;
}

.env-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: opacity .16s ease, color .16s ease;
}

.env-legend span.disabled {
  opacity: .35;
  color: #9aa6a0;
}

.env-legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 0;
  border-radius: 50%;
}

.env-chart svg {
  width: 100%;
  max-width: 100%;
  height: 300px;
  margin-top: 6px;
  display: block;
  background-image: linear-gradient(#edf1f4 1px, transparent 1px), linear-gradient(90deg, #edf1f4 1px, transparent 1px);
  background-size: 100% 52px, 90px 100%;
}

.x-axis.env {
  padding-left: 12px;
}


.stage-photo {
  box-shadow: 0 10px 20px rgba(48, 83, 67, 0.08);
}

@media (max-width: 1366px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .chart-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .influence-body {
    grid-template-columns: 1fr;
  }

  .stage-profile {
    display: grid;
    grid-template-columns: 180px 120px 1fr;
    align-items: center;
    gap: 14px;
    padding-top: 0;
  }

  .stage-photo {
    margin-bottom: 0;
  }

  .stage-profile dl {
    margin-top: 0;
  }
}

@media (max-width: 1200px) {
  .filter-form {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }

  .search-actions {
    grid-column: 1 / -1;
    min-width: 0;
  }
}

@media (max-width: 900px) {
  .ratio-body {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .stage-profile {
    grid-template-columns: 1fr;
  }

  .stage-select {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .button-row {
    grid-template-columns: repeat(2, minmax(88px, 1fr));
    width: 100%;
  }

  .button-row .el-button {
    width: 100%;
  }
}
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   只修改视觉样式，不改动模板、方法、功能、接口及原有注释。 */
.phenology-page {
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

.phenology-page *,
.phenology-page *::before,
.phenology-page *::after {
  box-sizing: border-box;
}

.phenology-page .module-tabs {
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

.phenology-page .module-tabs .tab {
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

.phenology-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.phenology-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 17px rgba(47, 125, 92, 0.22);
}

.phenology-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.phenology-page .toolbar-spacer {
  flex: 1 1 auto;
}

.phenology-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(58, 88, 63, 0.08);
}

.phenology-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.phenology-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.phenology-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.phenology-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 650;
}

.phenology-page :deep(.el-input__wrapper),
.phenology-page :deep(.el-select__wrapper),
.phenology-page :deep(.el-cascader .el-input__wrapper),
.phenology-page :deep(.el-date-editor.el-input__wrapper),
.phenology-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.phenology-page :deep(.el-input__wrapper:hover),
.phenology-page :deep(.el-select__wrapper:hover),
.phenology-page :deep(.el-cascader .el-input__wrapper:hover),
.phenology-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.phenology-page :deep(.el-input__wrapper.is-focus),
.phenology-page :deep(.el-select__wrapper.is-focused),
.phenology-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.phenology-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.phenology-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.phenology-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.phenology-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.phenology-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.phenology-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.phenology-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.phenology-page :deep(.el-pagination.is-background .el-pager li.is-active),
.phenology-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.phenology-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .phenology-page {
    padding: 12px;
  }

  .phenology-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .phenology-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .phenology-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .phenology-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .phenology-page .filter-form :deep(.el-form-item__content),
  .phenology-page .filter-form :deep(.el-input),
  .phenology-page .filter-form :deep(.el-select),
  .phenology-page .filter-form :deep(.el-cascader),
  .phenology-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.phenology-page .demo-alert {
  margin-bottom: 16px;
  border-radius: 12px;
}

.phenology-page .overview-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.92fr) minmax(520px, 1.5fr);
  gap: 16px;
  margin-bottom: 16px;
}

.phenology-page .white-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
}

.phenology-page .section-title {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 0 18px;
  color: #294635;
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.phenology-page .section-title::before {
  width: 4px;
  height: 18px;
  margin-right: 9px;
  content: "";
  background: linear-gradient(180deg, var(--ft-green), #7da68a);
  border-radius: 999px;
}

.phenology-page .section-title > span {
  margin-left: auto;
  color: var(--ft-muted);
  font-size: 12px;
  font-weight: 500;
}

.phenology-page .ratio-body {
  display: grid;
  grid-template-columns: minmax(210px, 0.9fr) minmax(190px, 1fr);
  align-items: center;
  min-height: 360px;
  padding: 18px;
  gap: 16px;
}

.phenology-page .donut-wrapper {
  filter: drop-shadow(0 10px 18px rgba(58, 88, 63, 0.11));
}

.phenology-page .donut-center strong {
  color: #2e6046;
}

.phenology-page .donut-center span,
.phenology-page .donut-center small {
  color: #748778;
}

.phenology-page .rank-list {
  display: flex;
  max-height: 316px;
  overflow-y: auto;
  flex-direction: column;
  gap: 7px;
}

.phenology-page .rank-row {
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

.phenology-page .rank-row:hover,
.phenology-page .rank-row.hovered,
.phenology-page .rank-row.active {
  background: #edf5e9;
  border-color: #bdd3be;
  transform: translateX(2px);
}

.phenology-page .rank-number {
  color: #829285;
  font-family: Consolas, Monaco, monospace;
}

.phenology-page .rank-row i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.phenology-page .rank-row span {
  overflow: hidden;
  color: #405849;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-page .rank-row em {
  color: #7c8f80;
  font-size: 12px;
  font-style: normal;
}

.phenology-page .rank-row strong {
  color: var(--ft-green);
}

.phenology-page .chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 16px;
  gap: 12px;
  background: #fafcf9;
  border-bottom: 1px solid #e8eee6;
}

.phenology-page .legend-line,
.phenology-page .env-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.phenology-page .legend-line > span,
.phenology-page .env-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #4f6757;
  font-size: 12px;
  cursor: pointer;
}

.phenology-page .legend-line i,
.phenology-page .env-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.phenology-page .legend-line .disabled,
.phenology-page .env-legend .disabled {
  opacity: 0.35;
}

.phenology-page .series-actions,
.phenology-page .sub-tabs {
  display: flex;
  padding: 4px;
  gap: 4px;
  background: #edf3ea;
  border-radius: 10px;
}

.phenology-page .series-actions button,
.phenology-page .sub-tabs button {
  color: #627767;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.phenology-page .series-actions button {
  padding: 5px 9px;
  font-size: 11px;
}

.phenology-page .series-actions button.active,
.phenology-page .sub-tabs button.active {
  color: #ffffff;
  background: var(--ft-green);
}

.phenology-page .chart-wrap {
  min-height: 310px;
  padding: 18px 20px 10px;
}

.phenology-page .y-axis,
.phenology-page .x-axis {
  color: #87968a;
}

.phenology-page .influence-head {
  display: flex;
  align-items: center;
  min-height: 68px;
  padding: 12px 18px;
  gap: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.phenology-page .stage-select {
  width: 190px;
}

.phenology-page .sub-tabs {
  flex-wrap: wrap;
}

.phenology-page .sub-tabs button {
  padding: 8px 13px;
  font-weight: 600;
}

.phenology-page .influence-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: 440px;
}

.phenology-page .stage-profile {
  padding: 18px;
  background: #f8fbf5;
  border-right: 1px solid #e1ebe0;
}

.phenology-page .stage-photo {
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

.phenology-page .stage-profile dl {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  margin: 0;
  gap: 9px 8px;
}

.phenology-page .stage-profile dt {
  color: #87968a;
}

.phenology-page .stage-profile dd {
  margin: 0;
  color: #3d5848;
  font-weight: 700;
}

.phenology-page .env-chart {
  min-width: 0;
  padding: 18px;
}

.phenology-page .env-chart h3 {
  margin: 0 0 12px;
  color: #294635;
}

.phenology-page .env-chart > svg {
  margin-top: 12px;
  background: #fafcf9;
  border: 1px solid #e1ebe0;
  border-radius: 12px;
}

@media (max-width: 1180px) {
  .phenology-page .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .phenology-page .ratio-body,
  .phenology-page .influence-body {
    grid-template-columns: 1fr;
  }

  .phenology-page .stage-profile {
    border-right: 0;
    border-bottom: 1px solid #e1ebe0;
  }

  .phenology-page .influence-head {
    align-items: stretch;
    flex-direction: column;
  }

  .phenology-page .stage-select {
    width: 100%;
  }
}
</style>


<style scoped>
/* 真实趋势坐标轴：横轴标签与 SVG 数据点使用相同的百分比位置。 */
.real-axis-wrap {
  display: grid;
  grid-template-columns: 22px 46px minmax(0, 1fr);
  align-items: stretch;
  height: auto;
  min-height: 286px;
  padding: 12px 22px 12px 12px;
}

.axis-title-y {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #72827a;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;

  /*
   * 中文纵轴标题直接按从上到下排列。
   * 原代码在 vertical-rl 基础上又旋转 180°，
   * 会导致中文字符及阅读方向整体倒置。
   */
  writing-mode: vertical-rl;
  text-orientation: upright;
  transform: none;
  white-space: nowrap;
}

.real-axis-wrap .y-axis {
  width: 46px;
  min-height: 240px;
  padding: 0 10px 0 0;
}

.real-axis-wrap .line-chart {
  min-width: 0;
  background-size: 100% 44px, 90px 100%;
}

.real-axis-wrap .line-chart svg {
  height: 240px;
}

.positioned-axis {
  position: relative;
  display: block;
  width: 100%;
  height: 30px;
  overflow: visible;
}

.positioned-axis span {
  position: absolute;
  top: 5px;
  max-width: 92px;
  overflow: hidden;
  color: #84928c;
  font-size: 10px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.x-axis-title {
  padding-top: 2px;
  color: #72827a;
  font-size: 11px;
  text-align: center;
}

.detail-chart-layout {
  display: grid;
  grid-template-columns: 22px 46px minmax(0, 1fr);
  align-items: stretch;
  min-height: 336px;
  margin-top: 10px;
}

.detail-axis-title-y {
  min-height: 280px;
}

.detail-y-axis {
  display: flex;
  min-height: 280px;
  padding-right: 10px;
  flex-direction: column;
  justify-content: space-between;
  color: #899691;
  font-size: 11px;
  text-align: right;
}

.detail-plot {
  min-width: 0;
}

.phenology-page .detail-plot > svg,
.detail-plot > svg {
  display: block;
  width: 100%;
  height: 280px;
  margin-top: 0;
  background-color: #fafcf9;
  background-image:
    linear-gradient(#edf1f4 1px, transparent 1px),
    linear-gradient(90deg, #edf1f4 1px, transparent 1px);
  background-size: 100% 56px, 90px 100%;
  border: 1px solid #e1ebe0;
  border-radius: 12px;
}

.detail-x-axis {
  height: 32px;
}

@media (max-width: 900px) {
  .real-axis-wrap,
  .detail-chart-layout {
    grid-template-columns: 18px 38px minmax(0, 1fr);
    padding-right: 8px;
  }

  .positioned-axis span {
    max-width: 64px;
    font-size: 9px;
  }
}
</style>

<style scoped>
/* 页面排版统一覆盖：仅调整字体、间距和模块对齐 */
.phenology-page {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: calc(100vh - 84px);
  padding: 14px;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC",
    "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.phenology-page *,
.phenology-page *::before,
.phenology-page *::after {
  box-sizing: border-box;
  font-family: inherit;
}

.phenology-page button,
.phenology-page input,
.phenology-page select,
.phenology-page textarea {
  font: inherit;
}

.phenology-page .module-tabs {
  min-height: 50px;
  height: 50px;
  padding: 5px 7px;
  margin: 0 0 12px;
  gap: 4px;
  border-radius: 12px;
}

.phenology-page .module-tabs .tab {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  line-height: 38px;
}

.phenology-page .filter-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.phenology-page .filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.phenology-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.phenology-page .filter-form :deep(.el-form-item) {
  display: flex;
  align-items: center;
  margin: 0;
}

.phenology-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: #526b5c;
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.phenology-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.phenology-page .scope-cascader {
  width: 300px;
}

.phenology-page :deep(.el-input__wrapper),
.phenology-page :deep(.el-select__wrapper),
.phenology-page :deep(.el-date-editor.el-input__wrapper),
.phenology-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
}

.phenology-page .search-actions {
  min-width: auto;
}

.phenology-page .button-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phenology-page .button-row .el-button {
  width: 76px;
  height: 32px;
  margin: 0;
  padding: 0 14px;
  font-size: 13px;
}

.phenology-page .overview-grid {
  display: grid;
  grid-template-columns: minmax(360px, 0.92fr) minmax(520px, 1.5fr);
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
}

.phenology-page .overview-grid > .white-card {
  height: 100%;
  min-height: 330px;
}

.phenology-page .white-card {
  min-width: 0;
  border-radius: 12px;
}

.phenology-page .section-title {
  height: 48px;
  min-height: 48px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 700;
  line-height: 48px;
}

.phenology-page .section-title > span {
  margin-left: 10px;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.phenology-page .ratio-card,
.phenology-page .trend-card {
  display: flex;
  flex-direction: column;
}

.phenology-page .ratio-body {
  flex: 1;
  grid-template-columns: 205px minmax(0, 1fr);
  min-height: 278px;
  padding: 10px 12px;
  gap: 12px;
}

.phenology-page .donut-wrapper,
.phenology-page .donut-svg {
  width: 205px;
  height: 205px;
}

.phenology-page .rank-list {
  max-height: 230px;
  padding-right: 2px;
}

.phenology-page .rank-row {
  min-height: 32px;
  padding: 7px 6px;
  grid-template-columns: 24px 8px minmax(0, 1fr) 62px 44px;
  gap: 6px;
  font-size: 12px;
}

.phenology-page .trend-card {
  min-height: 330px;
}

.phenology-page .chart-toolbar {
  min-height: 38px;
  padding: 6px 14px 2px;
  gap: 8px;
}

.phenology-page .legend-line {
  min-height: 28px;
  gap: 10px;
  font-size: 12px;
}

.phenology-page .series-actions {
  flex-shrink: 0;
}

.phenology-page .chart-wrap {
  flex: 1;
  min-height: 240px;
  height: auto;
  padding: 4px 16px 14px 10px;
}

.phenology-page .real-axis-wrap {
  grid-template-columns: 24px 42px minmax(0, 1fr);
  column-gap: 4px;
}

.phenology-page .axis-title-y,
.phenology-page .y-axis,
.phenology-page .detail-y-axis {
  font-size: 11px;
  line-height: 1.1;
}

.phenology-page .line-chart svg {
  height: 220px;
}

.phenology-page .positioned-axis {
  height: 24px;
  margin-top: 2px;
}

.phenology-page .x-axis-title {
  height: 20px;
  margin-top: 0;
  font-size: 11px;
  line-height: 20px;
}

.phenology-page .influence-card {
  padding-bottom: 14px;
}

.phenology-page .influence-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-height: 52px;
  padding: 10px 14px 6px;
  gap: 10px;
}

.phenology-page .stage-select {
  width: 160px;
  flex: 0 0 160px;
}

.phenology-page .sub-tabs {
  align-items: center;
  gap: 6px;
  padding-bottom: 0;
}

.phenology-page .sub-tabs button {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 20px;
  border-radius: 6px;
}

.phenology-page .influence-body {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  align-items: stretch;
  gap: 16px;
  padding: 8px 14px 0;
}

.phenology-page .stage-profile {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-top: 0;
}

.phenology-page .stage-photo {
  width: 100%;
  height: 136px;
  margin-bottom: 10px;
  border-radius: 9px;
}

.phenology-page .stage-profile dl {
  display: grid;
  grid-template-columns: 66px minmax(0, 1fr);
  align-items: center;
  margin: 0;
  gap: 7px 8px;
  font-size: 13px;
  line-height: 1.45;
}

.phenology-page .stage-profile dt,
.phenology-page .stage-profile dd {
  min-width: 0;
  line-height: 22px;
}

.phenology-page .stage-profile dd {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-page .env-chart {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 330px;
  overflow: hidden;
}

.phenology-page .env-chart h3 {
  min-height: 24px;
  margin: 4px 0 6px;
  font-size: 15px;
  line-height: 24px;
}

.phenology-page .env-legend {
  min-height: 26px;
  margin-bottom: 2px;
  gap: 12px;
  font-size: 12px;
}

.phenology-page .detail-chart-layout {
  flex: 1;
  min-height: 275px;
  grid-template-columns: 24px 42px minmax(0, 1fr);
  column-gap: 4px;
  padding: 0;
}

.phenology-page .detail-plot svg {
  height: 255px;
  margin-top: 0;
}

.phenology-page :deep(.el-input__inner),
.phenology-page :deep(.el-select__selected-item),
.phenology-page :deep(.el-range-input),
.phenology-page :deep(.el-button),
.phenology-page :deep(.el-empty__description),
.phenology-page :deep(.el-loading-text) {
  font-family: inherit;
  font-size: 13px;
}

@media (max-width: 1366px) {
  .phenology-page .overview-grid {
    grid-template-columns: 1fr;
  }

  .phenology-page .overview-grid > .white-card {
    min-height: 320px;
  }

  .phenology-page .influence-body {
    grid-template-columns: 200px minmax(0, 1fr);
  }

  .phenology-page .stage-profile {
    display: flex;
  }
}

@media (max-width: 1100px) {
  .phenology-page .filter-form {
    align-items: stretch;
  }

  .phenology-page .filter-form :deep(.el-form-item) {
    flex: 1 1 280px;
  }

  .phenology-page .filter-form :deep(.el-form-item__content),
  .phenology-page .filter-form :deep(.el-input),
  .phenology-page .filter-form :deep(.el-select),
  .phenology-page .filter-form :deep(.el-cascader),
  .phenology-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }

  .phenology-page .search-actions {
    flex: 0 0 auto !important;
  }
}

@media (max-width: 900px) {
  .phenology-page {
    padding: 10px;
  }

  .phenology-page .module-tabs {
    overflow-x: auto;
  }

  .phenology-page .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .phenology-page .filter-form :deep(.el-form-item) {
    width: 100%;
  }

  .phenology-page .ratio-body {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .phenology-page .rank-list {
    width: 100%;
  }

  .phenology-page .influence-body {
    grid-template-columns: 1fr;
  }

  .phenology-page .stage-profile {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: start;
    gap: 12px;
  }

  .phenology-page .stage-photo {
    margin-bottom: 0;
  }
}
</style>

<style scoped>
/* =========================================================
   物候详情区域对齐修复
   仅调整下方详情区的字体、尺寸和居中方式。
   ========================================================= */

/* “幼果期”下拉框与“识别数量趋势”标签统一高度并居中 */
.phenology-page .influence-head {
  display: flex;
  align-items: center;
  min-height: 54px;
  padding: 8px 14px;
  gap: 10px;
}

.phenology-page .stage-select {
  width: 160px;
  flex: 0 0 160px;
}

.phenology-page .stage-select :deep(.el-select__wrapper) {
  min-height: 38px;
  height: 38px;
  padding-top: 0;
  padding-bottom: 0;
}

.phenology-page .stage-select :deep(.el-select__selected-item),
.phenology-page .stage-select :deep(.el-select__placeholder) {
  display: flex;
  align-items: center;
  height: 38px;
  color: #344e3e;
  font-size: 14px;
  font-weight: 600;
  line-height: 38px;
}

.phenology-page .sub-tabs {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 0;
  gap: 6px;
}

.phenology-page .sub-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  min-height: 38px;
  padding: 0 14px;
  color: #526b5c;
  font-size: 14px;
  font-weight: 600;
  line-height: 38px;
  border-radius: 7px;
}

.phenology-page .sub-tabs button.active {
  color: #fff;
}

/* 左侧物候信息模块在自己的网格区域内整体居中 */
.phenology-page .influence-body {
  align-items: stretch;
}

.phenology-page .stage-profile {
  width: 100%;
  min-height: 330px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 原图和详情表保持相同宽度，整体视觉居中 */
.phenology-page .stage-photo {
  width: 180px;
  height: 136px;
  margin: 0 auto 12px;
}

.phenology-page .stage-profile dl {
  width: 180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 66px minmax(0, 1fr);
  align-items: center;
  gap: 7px 8px;
  font-size: 13px;
  line-height: 22px;
}

.phenology-page .stage-profile dt,
.phenology-page .stage-profile dd {
  min-height: 22px;
  line-height: 22px;
}

.phenology-page .stage-profile dt {
  text-align: left;
}

.phenology-page .stage-profile dd {
  margin: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧图表顶部与左侧模块保持视觉对齐 */
.phenology-page .env-chart {
  min-height: 330px;
  justify-content: flex-start;
}

.phenology-page .env-chart h3 {
  margin: 4px 0 6px;
  min-height: 24px;
  font-size: 15px;
  line-height: 24px;
}

@media (max-width: 900px) {
  .phenology-page .stage-profile {
    min-height: auto;
    padding: 8px 0;
  }

  .phenology-page .stage-photo,
  .phenology-page .stage-profile dl {
    width: min(100%, 260px);
  }
}
</style>

<style scoped>
/* 查询、重置按钮参考物候图片页保持统一。 */
.phenology-page .search-actions :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phenology-page .button-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phenology-page .search-actions :deep(.el-button),
.phenology-page .button-row :deep(.el-button) {
  width: auto;
  min-width: 76px;
  height: 32px;
  min-height: 32px;
  margin-left: 0;
  padding: 0 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 30px;
  border-radius: 7px;
}

.phenology-page .button-row :deep(.el-button--primary) {
  color: #fff;
  background: var(--ft-green);
  border-color: var(--ft-green);
}

.phenology-page .button-row :deep(.el-button--primary:hover),
.phenology-page .button-row :deep(.el-button--primary:focus) {
  color: #fff;
  background: #3f8d69;
  border-color: #3f8d69;
}

.phenology-page .button-row :deep(.el-button:not(.el-button--primary)) {
  color: #606266;
  background: #fff;
  border-color: #dcdfe6;
}

.phenology-page .button-row :deep(.el-button:not(.el-button--primary):hover),
.phenology-page .button-row :deep(.el-button:not(.el-button--primary):focus) {
  color: var(--ft-green);
  background: #f1f7ef;
  border-color: #8eb49a;
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE: remove this block to roll back the near-right-angle theme. */
.phenology-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.phenology-page .module-tabs,
.phenology-page .module-tabs .tab,
.phenology-page .module-tabs .tab.active::after,
.phenology-page .filter-card,
.phenology-page .white-card,
.phenology-page .ratio-card,
.phenology-page .trend-card,
.phenology-page .influence-card,
.phenology-page .rank-row,
.phenology-page .sub-tabs button,
.phenology-page .series-actions button,
.phenology-page .chart-unit-tags span,
.phenology-page .stage-profile,
.phenology-page .stage-photo,
.phenology-page .stage-image-name,
.phenology-page :deep(.el-card),
.phenology-page :deep(.el-card__header),
.phenology-page :deep(.el-card__body),
.phenology-page :deep(.el-button),
.phenology-page :deep(.el-button-group),
.phenology-page :deep(.el-input__wrapper),
.phenology-page :deep(.el-select__wrapper),
.phenology-page :deep(.el-cascader .el-input__wrapper),
.phenology-page :deep(.el-date-editor.el-input__wrapper),
.phenology-page :deep(.el-tag),
.phenology-page :deep(.el-progress-bar__outer),
.phenology-page :deep(.el-progress-bar__inner),
.phenology-page :deep(.el-table),
.phenology-page :deep(.el-table__inner-wrapper),
.phenology-page :deep(.el-pagination button),
.phenology-page :deep(.el-pager li) {
  border-radius: var(--sharp-radius) !important;
}

.phenology-page .filter-card,
.phenology-page .white-card,
.phenology-page .stage-profile,
.phenology-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.phenology-page .filter-card:hover,
.phenology-page .white-card:hover,
.phenology-page :deep(.el-card:hover) {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.phenology-page .rank-row,
.phenology-page .sub-tabs button,
.phenology-page .series-actions button,
.phenology-page .chart-unit-tags span {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.phenology-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.phenology-page :deep(.el-input__wrapper),
.phenology-page :deep(.el-select__wrapper),
.phenology-page :deep(.el-cascader .el-input__wrapper),
.phenology-page :deep(.el-date-editor.el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.phenology-page :deep(.el-input__wrapper.is-focus),
.phenology-page :deep(.el-select__wrapper.is-focused),
.phenology-page :deep(.el-cascader .el-input__wrapper.is-focus),
.phenology-page :deep(.el-date-editor.el-input__wrapper.is-active) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.phenology-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.phenology-page :deep(.el-progress-bar__inner) {
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

/* CODEX-PHENOLOGY-OVERVIEW-BUTTON-FIX: remove this block to roll back these controls only. */
.phenology-page .series-actions,
.phenology-page .sub-tabs {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 1px;
  padding: 1px;
  overflow: hidden;
  background: #f3f7f1;
  border: 1px solid #dce8d8;
  border-radius: var(--sharp-radius) !important;
}

.phenology-page .series-actions {
  flex: 0 0 auto;
}

.phenology-page .sub-tabs {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}

.phenology-page .series-actions button,
.phenology-page .sub-tabs button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin: 0;
  color: #526b5c;
  font-family: inherit;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: var(--sharp-radius) !important;
  box-shadow: none !important;
  cursor: pointer;
  transition: color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.phenology-page .series-actions button {
  min-width: 52px;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.phenology-page .sub-tabs button {
  flex: 1 1 0;
  min-width: max-content;
  height: 38px;
  padding: 0 14px;
  font-size: 14px;
}

.phenology-page .series-actions button:hover,
.phenology-page .sub-tabs button:hover {
  color: #236647;
  background: #eaf3e8 !important;
  border-color: #c8ddcb !important;
}

.phenology-page .series-actions button.active,
.phenology-page .series-actions button.active:hover,
.phenology-page .sub-tabs button.active,
.phenology-page .sub-tabs button.active:hover {
  color: #ffffff !important;
  background: var(--ft-green) !important;
  border-color: var(--ft-green) !important;
}

.phenology-page .series-actions button:focus-visible,
.phenology-page .sub-tabs button:focus-visible {
  outline: 2px solid rgba(47, 125, 92, 0.28);
  outline-offset: 1px;
}

/* 物候详情页签与虫情分析页 sub-tabs 保持一致，并改为近直角。 */
.phenology-page .influence-head .sub-tabs {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  flex-wrap: wrap;
  gap: 4px;
  width: auto;
  min-width: 0;
  min-height: auto;
  padding: 4px;
  overflow: visible;
  background: #edf3ea;
  border: 0;
  border-radius: var(--sharp-radius) !important;
  box-shadow: none;
}

.phenology-page .influence-head .sub-tabs button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
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
  white-space: nowrap;
  background: transparent !important;
  border: 0 !important;
  border-radius: var(--sharp-radius) !important;
  box-shadow: none !important;
  transform: none !important;
  cursor: pointer;
}


.phenology-page .influence-head .sub-tabs button:hover {
  color: #2f7d5c !important;
  background: #f7faf6 !important;
}

.phenology-page .influence-head .sub-tabs button.active,
.phenology-page .influence-head .sub-tabs button.active:hover {
  color: #fff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
  box-shadow: 0 1px 4px rgba(24, 98, 70, .12) !important;
}

/* CODEX-PHENOLOGY-TREND-SIDE-SWITCH: remove this block to restore the previous layout. */
.phenology-page .trend-chart-body {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  flex: 1;
  min-height: 280px;
  border-top: 1px solid #e2ebe0;
}

.phenology-page .trend-mode-switch {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 8px;
  background: #f7faf6;
  border-right: 1px solid #e2ebe0;
}

.phenology-page .trend-mode-switch button {
  appearance: none;
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  color: #526b5c;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--sharp-radius) !important;
  box-shadow: none;
  cursor: pointer;
  transition: color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.phenology-page .trend-mode-switch button:hover {
  color: #2f7d5c;
  background: #edf4ea;
  border-color: #d2e2d1;
}

.phenology-page .trend-mode-switch button.active,
.phenology-page .trend-mode-switch button.active:hover {
  color: #fff;
  background: #2f7d5c;
  border-color: #2f7d5c;
}

.phenology-page .trend-mode-switch button:focus-visible {
  outline: 2px solid rgba(47, 125, 92, 0.28);
  outline-offset: 1px;
}

.phenology-page .trend-chart-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.phenology-page .trend-chart-main > .chart-wrap,
.phenology-page .trend-chart-main > .el-empty {
  flex: 1;
}

/* CODEX-PHENOLOGY-OVERVIEW-STABLE-HEIGHT: remove this block to restore content-driven heights. */
@media (min-width: 901px) {
  .phenology-page .overview-grid {
    grid-auto-rows: 378px;
  }

  .phenology-page .overview-grid > .white-card {
    height: 378px;
    min-height: 0;
  }

  .phenology-page .ratio-body,
  .phenology-page .trend-chart-body {
    min-height: 0;
    overflow: hidden;
  }

  .phenology-page .trend-chart-main {
    height: 329px;
    overflow: hidden;
  }

  .phenology-page .trend-chart-main > .chart-toolbar {
    flex: 0 0 48px;
    min-height: 48px;
    overflow: hidden;
  }

  .phenology-page .trend-chart-main > .chart-wrap,
  .phenology-page .trend-chart-main > .el-empty {
    flex: 1 1 auto;
    min-height: 0;
  }

  .phenology-page .trend-chart-main .legend-line {
    min-width: 0;
    max-height: 30px;
    overflow-x: auto;
    overflow-y: hidden;
    flex-wrap: nowrap;
  }

  .phenology-page .trend-chart-main .legend-line > span {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}


@media (max-width: 820px) {
  .phenology-page .trend-chart-body {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .phenology-page .trend-mode-switch {
    padding: 8px 6px;
  }

  .phenology-page .sub-tabs {
    width: 100%;
    overflow-x: auto;
  }

  .phenology-page .sub-tabs button {
    flex: 0 0 auto;
  }

  .phenology-page .influence-head .sub-tabs {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
