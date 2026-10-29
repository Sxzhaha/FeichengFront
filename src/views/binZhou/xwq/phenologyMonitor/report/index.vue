<template>
  <div class="phenology-report-page">
    <div class="module-tabs">
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/analysis')">总览</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/image')">物候图片</button>
      <button class="tab" @click="goTo('/xwq/phenologyMonitor/ai')">智能分析</button>
      <button class="tab active">历史数据与报告</button>
      <!-- <button class="tab" @click="showBuilding">设备数据</button> -->
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

        <el-form-item label="作物类型">
          <el-input v-model="queryParams.phenologyCrop" placeholder="冬枣" clearable style="width: 170px" />
        </el-form-item>
        <el-form-item label="物候期">
          <el-select v-model="queryParams.phenologyName" placeholder="全部" clearable popper-class="xwq-sharp-popper" style="width: 150px">
            <el-option v-for="item in stageOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
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
            <el-button :loading="generating" @click="generateReport">生成报告</el-button>
            <el-button type="primary" @click="exportReport">导出报告</el-button>
            <el-button @click="exportPdfReport">导出PDF</el-button>
            <el-button @click="exportData">数据导出</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-loading="loading">
      <!-- <div class="summary-row">
        <div class="stat-card">
          <span>识别记录</span>
          <strong>{{ reportRows.length }}</strong>
          <em>条</em>
        </div>
        <div class="stat-card">
          <span>主导物候期</span>
          <strong>{{ dominantStage }}</strong>
          <em>占比 {{ dominantPercent }}%</em>
        </div>
        <div class="stat-card">
          <span>平均置信度</span>
          <strong>{{ avgConfidence }}%</strong>
          <em>模型结果</em>
        </div>
        <div class="stat-card">
          <span>进程判断</span>
          <strong :class="progressClass">{{ progressStatus }}</strong>
          <em>自动研判</em>
        </div>
      </div> -->

      <div class="main-grid">
        <el-card class="table-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>历史物候期识别数据 <em>共 {{ queryRows.length }} 条记录</em></span>
              <div class="table-actions">
                <!-- <el-button size="small" plain @click="toggleSelectAll">
                  {{ currentPageAllSelected ? '取消全选' : '全选' }}
                </el-button>
                <el-button size="small" plain @click="exportSelectedData">批量导出</el-button> -->
              </div>
            </div>
          </template>

          <el-table
            ref="tableRef"
            :data="pagedRows"
            :row-key="getRowKey"
            border
            stripe
                        height="100%"
            class="data-table"
            empty-text="暂无物候期识别数据"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="45" align="center" :reserve-selection="true" />
            <el-table-column label="识别编号" width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ row.recordNo || `PHENO-${row.phenologyId || row.imageId || '-'}` }}</template>
            </el-table-column>
            <el-table-column prop="phenologyCrop" label="作物类型" width="100" align="center" />
            <el-table-column prop="phenologyName" label="当前物候期" width="130" align="center" />
            <el-table-column prop="phenologyNextName" label="下一物候期" width="130" align="center" />
            <el-table-column label="置信度" width="100" align="center">
              <template #default="{ row }">
                <span class="green-text">{{ toPercent(row.phenologyConfidence) }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="phenologyDesc" label="生长状态描述" min-width="230" show-overflow-tooltip />
            <el-table-column prop="phenologyAdvice" label="农事建议" min-width="260" show-overflow-tooltip />
            <el-table-column label="识别时间" width="160" align="center">
              <template #default="{ row }">{{ row.createTime || row.updateTime || '-' }}</template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <span>共 {{ queryRows.length }} 条</span>
            <el-pagination
              v-model:current-page="pageNum"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50]"
              layout="sizes, prev, pager, next"
              :total="queryRows.length"
            />
          </div>
        </el-card>

        <el-card
          v-loading="generating"
          class="report-summary compact-summary"
          shadow="never"
          element-loading-text="正在生成物候期报告..."
          element-loading-background="rgba(255, 255, 255, 0.82)"
        >
          <template #header>
            <div class="card-header">
              <span>报告摘要</span>
              <el-tag type="success" effect="plain">{{ progressStatus }}</el-tag>
            </div>
          </template>

          <div class="summary-kpis">
            <div>
              <span>识别总数</span>
              <strong>{{ reportRows.length }}</strong>
              <em>条</em>
            </div>
            <div>
              <span>主导阶段</span>
              <strong>{{ dominantStage }}</strong>
              <em>{{ dominantPercent }}%</em>
            </div>
            <div>
              <span>下一物候期</span>
              <strong>{{ nextStageName }}</strong>
              <em>预测</em>
            </div>
            <div>
              <span>平均置信度</span>
              <strong>{{ avgConfidence }}%</strong>
              <em>模型结果</em>
            </div>
          </div>

          <div class="mini-block">
            <h4>各物候期分布</h4>
            <div class="stage-tags">
              <span v-for="item in stageStats" :key="item.name">
                {{ item.name }}：{{ item.count }}条
              </span>
            </div>
          </div>

          <div class="mini-block">
            <h4>摘要说明</h4>
            <ul>
              <li>本期形成物候期识别记录 {{ reportRows.length }} 条，主导阶段为 {{ dominantStage }}。</li>
              <li>当前平均识别置信度 {{ avgConfidence }}%，整体识别可信度 {{ avgConfidence >= 85 ? '较高' : '一般' }}。</li>
              <li>系统判断物候进程为 {{ progressStatus }}，建议结合田间观测进行复核。</li>
            </ul>
          </div>

          <div class="mini-block advice">
            <h4>农事建议</h4>
            <ul>
              <li v-for="item in displayedAdviceList.slice(0, 3)" :key="item">{{ item }}</li>
            </ul>
          </div>
        </el-card>
      </div>

      <el-card
        v-loading="generating"
        class="preview-card"
        shadow="never"
        element-loading-text="正在整理物候期报告文本..."
        element-loading-background="rgba(255, 255, 255, 0.82)"
      >
        <template #header>
          <div class="card-header">
            <span>报告预览</span>
            <span class="muted">{{ reportSourceText }}</span>
          </div>
        </template>

        <div class="report-paper" ref="paperRef">
          <h2>滨州枣树物候期监测报告</h2>
          <p class="paper-subtitle">
            生成时间：{{ nowText }} ｜ 监测范围：{{ reportScopeText }} ｜ 时间范围：{{ dateRangeText }} ｜ 数据来源：xwq_ai_phenology 物候期识别结果表
          </p>

          <section>
            <h3>一、总体情况</h3>
            <p v-if="generatedSections.overall" class="generated-report-text">{{ generatedSections.overall }}</p>
            <p v-else>
              本期共形成物候期识别记录 {{ reportRows.length }} 条，主导物候期为 {{ dominantStage }}，
              占比 {{ dominantPercent }}%，平均识别置信度 {{ avgConfidence }}%。当前物候进程判断为 {{ progressStatus }}。
            </p>
          </section>

          <section>
            <h3>二、物候期分布</h3>
            <p v-if="generatedSections.distribution" class="generated-report-text">{{ generatedSections.distribution }}</p>
            <div v-else class="stage-tags">
              <span v-for="item in stageStats" :key="item.name">{{ item.name }}：{{ item.count }}条</span>
            </div>
          </section>

          <section>
            <h3>三、趋势分析</h3>
            <p class="generated-report-text">{{ displayedTrendText }}</p>
          </section>

          <section>
            <h3>四、异常分析</h3>
            <p class="generated-report-text">{{ displayedAbnormalText }}</p>
          </section>

          <section>
            <h3>五、农事建议</h3>
            <ul>
              <li v-for="item in displayedAdviceList" :key="item">{{ item }}</li>
            </ul>
          </section>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { generatePhenologyReportText, listPhenology } from '@/api/binZhou/xwq/phenology'
import { listPark } from '@/api/binZhou/ld/iot/park'
import { listAreaByParkId } from '@/api/binZhou/ld/iot/area'
import { listLocationByAreaId } from '@/api/binZhou/ld/iot/location'
import { listDevice } from '@/api/binZhou/ld/iot/device'

const router = useRouter()

const loading = ref(false)
const generating = ref(false)
const tableRef = ref(null)
const paperRef = ref(null)
const allRows = ref([])
const selectedRows = ref([])
const reportRows = ref([])
const reportGeneratedAt = ref('')
const reportDateRangeText = ref('')
const reportScopeText = ref('全部监测范围')
const reportSourceText = ref('请先查询或勾选数据，再点击生成报告')
const generatedSections = ref({
  overall: '',
  distribution: '',
  trend: '',
  abnormal: '',
  advice: []
})
const dateRange = ref([])
const monitorScopePath = ref([])
const pageNum = ref(1)
const pageSize = ref(10)

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


const DEFAULT_SCOPE = {
  parkName: '滨州园区',
  areaName: '01地块',
  locationName: '东北',
  deviceName: '滨州园区01地块虫情测试仪'
}

const stageOptions = ['盛花期', '幼果期', '展叶期', '蕾期', '初花期', '萌芽期','果实膨大期','白熟期','成熟期','落叶期','休眠期']

const queryRows = computed(() => {
  let rows = allRows.value

  if (queryParams.value.phenologyCrop) {
    rows = rows.filter(row => String(row.phenologyCrop || '').includes(queryParams.value.phenologyCrop))
  }

  if (queryParams.value.phenologyName) {
    rows = rows.filter(row => String(row.phenologyName || '').includes(queryParams.value.phenologyName))
  }

  if (dateRange.value?.length) {
    const start = new Date(`${dateRange.value[0]} 00:00:00`).getTime()
    const end = new Date(`${dateRange.value[1]} 23:59:59`).getTime()
    rows = rows.filter((row, index) => {
      const time = getRowTime(row, index)
      if (!time) return true
      return time >= start && time <= end
    })
  }

  return rows
})

const pagedRows = computed(() => {
  const start = (pageNum.value - 1) * pageSize.value
  return queryRows.value.slice(start, start + pageSize.value)
})

const currentPageAllSelected = computed(() => {
  if (!pagedRows.value.length) return false
  const selectedKeys = new Set(selectedRows.value.map(getRowKey))
  return pagedRows.value.every(row => selectedKeys.has(getRowKey(row)))
})

const nowText = computed(() => reportGeneratedAt.value || '尚未生成')
const dateRangeText = computed(() => reportDateRangeText.value || '尚未生成')
const stageStats = computed(() => {
  const map = new Map()
  reportRows.value.forEach(item => {
    const name = item.phenologyName || '未知物候期'
    map.set(name, (map.get(name) || 0) + 1)
  })
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})
const dominantStage = computed(() => stageStats.value[0]?.name || '暂无')
const dominantPercent = computed(() => reportRows.value.length ? Math.round((stageStats.value[0]?.count || 0) / reportRows.value.length * 100) : 0)
const avgConfidence = computed(() => {
  if (!reportRows.value.length) return 0
  const total = reportRows.value.reduce((sum, item) => sum + toPercent(item.phenologyConfidence), 0)
  return Math.round(total / reportRows.value.length)
})
const nextStageName = computed(() => {
  const row = reportRows.value.find(item => item.phenologyName === dominantStage.value)
  return row?.phenologyNextName || inferNextStage(dominantStage.value)
})
const progressStatus = computed(() => {
  if (!reportRows.value.length) return '暂无数据'
  if (['孕穗期', '抽穗期', '开花期'].includes(dominantStage.value)) return '关键时期'
  if (['灌浆期', '成熟期'].includes(dominantStage.value)) return '后期管理'
  return '正常推进'
})
const progressClass = computed(() => {
  if (progressStatus.value === '关键时期') return 'risk-mid'
  if (progressStatus.value === '后期管理') return 'risk-high'
  if (progressStatus.value === '正常推进') return 'risk-low'
  return ''
})
const trendText = computed(() => {
  if (!reportRows.value.length) return '当前统计范围内暂无物候期识别数据。'
  return `统计范围内物候期以 ${dominantStage.value} 为主，下一阶段预计进入 ${nextStageName.value}。建议结合连续图像识别结果和田间观测判断物候推进速度。`
})
const abnormalText = computed(() => {
  if (!reportRows.value.length) return '暂无数据，无法进行异常分析。'
  if (avgConfidence.value < 70) return '当前平均置信度偏低，建议对图像质量、拍摄角度和模型识别结果进行人工复核。'
  return `当前物候期识别置信度较稳定，暂未发现明显异常；若实际农时与 ${dominantStage.value} 不一致，建议结合地块环境数据进一步分析是否存在提前或滞后。`
})
const adviceList = computed(() => {
  const advice = reportRows.value.map(item => String(item.phenologyAdvice || '').trim()).filter(Boolean)
  const uniqueAdvice = Array.from(new Set(advice)).slice(0, 3)
  if (uniqueAdvice.length) return uniqueAdvice

  if (progressStatus.value === '关键时期') {
    return [
      '加强水肥管理，保证作物关键生育期养分供应。',
      '重点关注赤霉病、蚜虫等病虫害发生风险，及时开展巡田复核。',
      '持续采集图像并跟踪下一物候期变化，避免错过关键农事窗口。'
    ]
  }

  if (progressStatus.value === '后期管理') {
    return [
      '关注灌浆成熟进程，合理安排后期水分管理。',
      '做好收获前田间巡查，关注倒伏、干热风和病虫害影响。',
      '根据成熟度变化及时制定收获计划。'
    ]
  }

  return [
    '保持常态化图像采集和物候期识别，形成连续监测数据。',
    '结合温度、湿度、积温等环境因素判断物候推进速度。',
    '根据当前阶段合理安排田间管理和病虫害监测。'
  ]
})

const displayedTrendText = computed(() => generatedSections.value.trend || trendText.value)
const displayedAbnormalText = computed(() => generatedSections.value.abnormal || abnormalText.value)
const displayedAdviceList = computed(() => generatedSections.value.advice.length
  ? generatedSections.value.advice
  : adviceList.value)

onMounted(async () => {
  await loadParkOptions()
  await initDefaultScope()
  loadData()
})

async function loadParkOptions() {
  try {
    const res = await listPark({ pageNum: 1, pageSize: 999 })
    parkOptions.value = res.rows || res.data || []
  } catch (error) {
    console.error(error)
    ElMessage.warning('园区列表加载失败')
  }
}

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

function handleMonitorScopeChange(path = []) {
  const values = Array.isArray(path) ? path : []
  queryParams.value.parkId = getScopeValueId(values[0]) || undefined
  queryParams.value.areaId = getScopeValueId(values[1]) || undefined
  queryParams.value.locationId = getScopeValueId(values[2]) || undefined
  queryParams.value.deviceId = getScopeValueId(values[3]) || undefined
}

function buildScopeValue(type, id) {
  return `${type}:${id}`
}

function getScopeValueId(value) {
  if (value === undefined || value === null || value === '') return undefined
  return String(value).includes(':') ? String(value).split(':').pop() : value
}


async function loadData() {
  loading.value = true
  try {
    const res = await listPhenology({
      pageNum: 1,
      pageSize: 1000,
      parkId: queryParams.value.parkId || undefined,
      areaId: queryParams.value.areaId || undefined,
      locationId: queryParams.value.locationId || undefined,
      deviceId: queryParams.value.deviceId || undefined,
      phenologyName: queryParams.value.phenologyName || undefined,
      phenologyCrop: queryParams.value.phenologyCrop || undefined
    })
    allRows.value = res.rows || []
    selectedRows.value = []
    tableRef.value?.clearSelection()
    pageNum.value = 1
  } catch (error) {
    console.error(error)
    ElMessage.error('物候报告数据加载失败')
  } finally {
    loading.value = false
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
  await initDefaultScope()
  await loadData()
}

async function generateReport() {
  const sourceRows = selectedRows.value.length ? selectedRows.value : queryRows.value
  if (!sourceRows.length) {
    ElMessage.warning('暂无数据可生成报告')
    return
  }

  const rowMap = new Map()
  sourceRows.forEach(row => rowMap.set(getRowKey(row), row))
  const nextReportRows = Array.from(rowMap.values()).map(row => ({ ...row }))

  generating.value = true
  try {
    const res = await generatePhenologyReportText(buildGenerateParams(nextReportRows))
    const reportText = typeof res.data === 'string' ? res.data.trim() : ''
    if (!reportText) throw new Error('后端未返回报告文本')

    reportRows.value = nextReportRows
    generatedSections.value = parseGeneratedReport(reportText)
    reportGeneratedAt.value = new Date().toLocaleString()
    reportDateRangeText.value = dateRange.value?.length
      ? `${dateRange.value[0]} 至 ${dateRange.value[1]}`
      : '全部时间'
    reportScopeText.value = buildReportScopeText(reportRows.value)
    reportSourceText.value = selectedRows.value.length
      ? `后端已根据勾选的 ${reportRows.value.length} 条历史记录生成`
      : `后端已根据当前筛选条件和 ${reportRows.value.length} 条历史记录生成`

    ElMessage.success(reportSourceText.value)
  } catch (error) {
    console.error(error)
    ElMessage.error(error?.msg || error?.response?.data?.msg || error?.message || '物候期报告生成失败')
  } finally {
    generating.value = false
  }
}

function buildGenerateParams(rows) {
  const ids = selectedRows.value.length
    ? Array.from(new Set(rows.map(row => Number(row.phenologyId)).filter(id => Number.isInteger(id) && id > 0)))
    : []
  if (ids.length) return { phenologyIds: ids }

  return {
    parkId: queryParams.value.parkId || undefined,
    areaId: queryParams.value.areaId || undefined,
    locationId: queryParams.value.locationId || undefined,
    deviceId: queryParams.value.deviceId || undefined,
    phenologyCrop: queryParams.value.phenologyCrop || undefined,
    phenologyName: queryParams.value.phenologyName || undefined,
    startDate: dateRange.value?.[0] || undefined,
    endDate: dateRange.value?.[1] || undefined
  }
}

function parseGeneratedReport(text) {
  const sections = {}
  const pattern = /<<(OVERALL|DISTRIBUTION|TREND|ABNORMAL|ADVICE)>>\s*([\s\S]*?)(?=<<(?:OVERALL|DISTRIBUTION|TREND|ABNORMAL|ADVICE)>>|$)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    sections[match[1]] = match[2].trim()
  }
  if (!sections.OVERALL || !sections.DISTRIBUTION || !sections.TREND || !sections.ABNORMAL || !sections.ADVICE) {
    throw new Error('后端报告章节不完整')
  }
  return {
    overall: sections.OVERALL,
    distribution: sections.DISTRIBUTION,
    trend: sections.TREND,
    abnormal: sections.ABNORMAL,
    advice: sections.ADVICE.split(/\r?\n/)
      .map(item => item.replace(/^\s*(?:[-•]|\d+[.、])\s*/, '').trim())
      .filter(Boolean)
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function toggleSelectAll() {
  if (!tableRef.value) return
  const shouldSelect = !currentPageAllSelected.value
  pagedRows.value.forEach(row => {
    tableRef.value.toggleRowSelection(row, shouldSelect)
  })
}

function exportSelectedData() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要导出的数据')
    return
  }

  exportRows(selectedRows.value, `物候期识别结果_${Date.now()}.xls`)
}

function exportData() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要导出的数据')
    return
  }

  exportRows(selectedRows.value, `物候期识别结果_${Date.now()}.xls`)
}


function exportRows(rows, fileName) {
  const headers = ['图片ID', '作物类型', '当前物候期', '下一物候期', '置信度', '识别结论', '生长状态描述', '农事建议', '创建时间']
  const bodyRows = rows.map(item => [
    item.imageId,
    item.phenologyCrop,
    item.phenologyName,
    item.phenologyNextName,
    `${toPercent(item.phenologyConfidence)}%`,
    item.phenologyResult,
    item.phenologyDesc,
    item.phenologyAdvice,
    item.createTime || item.updateTime
  ])

  const html = `<table border="1">
    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${bodyRows.map(row => `<tr>${row.map(col => `<td style="mso-number-format:'\\@';">${col ?? ''}</td>`).join('')}</tr>`).join('')}
  </table>`
  downloadBlob(new Blob([`<html><head><meta charset="UTF-8"></head><body>${html}</body></html>`], { type: 'application/vnd.ms-excel;charset=utf-8;' }), fileName)
}

function exportReport() {
  if (!reportRows.value.length) return ElMessage.warning('暂无数据可导出报告')
  const html = paperRef.value?.innerHTML || ''
  const blob = new Blob([`
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { color: #000; line-height: 1.9; }
        h2 { text-align: center; color: #000; }
        h3 { color: #000; }
        .paper-subtitle { text-align: center; color: #000; border-bottom: 1px solid #000; padding-bottom: 16px; }
        .stage-tags span { display: inline-block; margin: 5px; padding: 6px 10px; color: #000; border: 1px solid #000; border-radius: 0; background: transparent; }

      </style>
    </head>
    <body>${html}</body>
    </html>
  `], { type: 'application/msword;charset=utf-8;' })
  downloadBlob(blob, `物候期监测报告_${Date.now()}.doc`)
}

function exportPdfReport() {
  if (!reportRows.value.length) return ElMessage.warning('暂无数据可导出PDF')
  openPrintWindow(paperRef.value?.innerHTML || '', '物候期监测报告')
}

function openPrintWindow(html, title) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return ElMessage.error('浏览器阻止了打印窗口，请允许弹窗后重试')
  printWindow.document.write(`
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        body { color: #25332f; line-height: 1.9; }
        h2 { text-align: center; margin: 0 0 8px; }
        h3 { color: #0f7b5c; margin-top: 22px; }
        .paper-subtitle { text-align: center; color: #7d8b87; border-bottom: 1px solid #ddd; padding-bottom: 16px; }
        .stage-tags span { display: inline-block; margin: 5px; padding: 6px 10px; background: #eefbf6; color: #0f7b5c; border-radius: 20px; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 300)
}

function toPercent(value) {
  const num = Number(value || 0)
  return Math.round(num <= 1 ? num * 100 : num)
}

function inferNextStage(stage) {
  const idx = stageOptions.indexOf(stage)
  if (idx >= 0 && idx < stageOptions.length - 1) return stageOptions[idx + 1]
  if (idx === stageOptions.length - 1) return '收获期'
  return '待判断'
}

function getRowTime(row, index = 0) {
  const value = row.createTime || row.updateTime || row.recordTime
  if (!value) return new Date(2026, 4, 12 + index * 3).getTime()
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function getRowKey(row) {
  return String(
    row.phenologyId ??
    row.recordId ??
    row.imageId ??
    row.recordNo ??
    `${row.phenologyName || ''}-${row.createTime || row.updateTime || ''}`
  )
}

function buildReportScopeText(rows) {
  const scopeParts = [
    getUniqueScopeText(rows, 'parkName', 'parkId', '园区'),
    getUniqueScopeText(rows, 'areaName', 'areaId', '地块'),
    getUniqueScopeText(rows, 'locationName', 'locationId', '角落'),
    getUniqueScopeText(rows, 'deviceName', 'deviceId', '设备')
  ].filter(Boolean)
  return scopeParts.join(' / ') || '全部监测范围'
}

function getUniqueScopeText(rows, nameKey, idKey, label) {
  const values = Array.from(new Set(
    rows
      .map(row => row[nameKey] || row[idKey])
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(String)
  ))
  if (!values.length) return ''
  if (values.length === 1) return values[0]
  return `${values.length}个${label}`
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function goTo(path) {
  router.push(path)
}

function showBuilding() {
  ElMessage.info('功能建设中')
}
</script>

<style scoped>
.phenology-report-page { min-height: calc(100vh - 84px); padding: 0 18px 22px; background: #f5f7fa; color: #263834; overflow-x: hidden; }
.module-tabs { height: 58px; display: flex; align-items: center; gap: 24px; background: #fff; border-bottom: 1px solid #e8edf0; margin: 0 -18px 18px; padding: 0 24px; }
.tab { border: 0; background: transparent; height: 58px; color: #5f6f6b; cursor: pointer; font-size: 15px; position: relative; white-space: nowrap; }
.tab.active { color: #12a878; font-weight: 700; }
.tab.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #12b886; border-radius: 3px 3px 0 0; }
.toolbar-spacer { flex: 1; }
.filter-card { margin-bottom: 14px; border: 1px solid #edf1f4; border-radius: 10px; }
.filter-card :deep(.el-card__body) { padding: 14px 18px 16px; }
.filter-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(168px, max-content)); column-gap: 18px; row-gap: 12px; align-items: center; }
.scope-cascader { width: 320px; }

.filter-form :deep(.el-form-item) { margin-right: 0; margin-bottom: 0; }
.search-actions { min-width: 584px; }
.search-actions :deep(.el-form-item__content) { width: 100%; }
.button-row { display: grid; grid-template-columns: repeat(6, 88px); gap: 10px; align-items: center; }
.button-row .el-button { width: 88px; margin-left: 0; padding-left: 0; padding-right: 0; }
.summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px; }
.stat-card { padding: 18px; border-radius: 8px; background: #fff; border: 1px solid #edf1f4; box-shadow: 0 6px 18px rgba(31,45,61,.04); }
.stat-card span { display: block; color: #758480; font-size: 13px; }
.stat-card strong { display: block; margin: 8px 0 2px; color: #12a878; font-size: 26px; }
.stat-card em { color: #9aa6a3; font-style: normal; font-size: 12px; }
.risk-high { color: #f56c6c !important; }
.risk-mid { color: #e6a23c !important; }
.risk-low { color: #12a878 !important; }
.main-grid { --main-card-height: 620px; display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 14px; margin-bottom: 14px; align-items: stretch; }
.table-card, .report-summary, .preview-card { border-radius: 8px; border: 1px solid #edf1f4; box-shadow: 0 6px 18px rgba(31,45,61,.04); }
.table-card, .report-summary { height: var(--main-card-height); align-self: stretch; }
.table-card { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.table-card :deep(.el-card__header) { flex-shrink: 0; }
.table-card :deep(.el-card__body) { flex: 1; min-height: 0; padding: 0; display: flex; flex-direction: column; }
.report-summary { overflow: hidden; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-weight: 700; min-width: 0; }
.card-header em { margin-left: 8px; color: #889692; font-style: normal; font-weight: 400; font-size: 13px; }
.table-actions { display: flex; gap: 8px; flex-shrink: 0; }
.data-table { flex: 1; min-height: 0; font-size: 13px; }
.green-text { color: #12a878; font-weight: 700; }
.pagination-row { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; min-height: 46px; padding: 8px 12px; color: #758480; border-top: 1px solid #edf1f4; background: #fff; }
.compact-summary { overflow: hidden; }
.compact-summary :deep(.el-card__body) { height: calc(var(--main-card-height) - 57px); overflow-y: auto; padding: 14px; }
.compact-summary :deep(.el-card__body)::-webkit-scrollbar { width: 6px; }
.compact-summary :deep(.el-card__body)::-webkit-scrollbar-thumb { background: #d8e6df; border-radius: 8px; }
.summary-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.summary-kpis div { padding: 10px 12px; border: 1px solid #edf1f4; border-radius: 8px; background: #fbfcfd; min-width: 0; }
.summary-kpis span { display: block; color: #758480; font-size: 12px; }
.summary-kpis strong { display: block; margin: 5px 0 2px; color: #12a878; font-size: 20px; line-height: 1.2; word-break: break-all; }
.summary-kpis em { color: #9aa6a3; font-style: normal; font-size: 12px; }
.mini-block { margin-top: 10px; padding: 12px; border: 1px solid #edf1f4; border-radius: 8px; background: #fff; }
.mini-block h4 { margin: 0 0 8px; color: #25332f; font-size: 14px; }
.mini-block ul { margin: 0; padding-left: 18px; line-height: 1.65; }
.advice { background: #f8fffb; }
.stage-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.stage-tags span { padding: 6px 10px; border-radius: 999px; background: #eefbf6; color: #0f7b5c; font-size: 12px; max-width: 100%; word-break: break-all; }
.preview-card { margin-top: 14px; }
.muted { color: #889692; font-weight: 400; font-size: 13px; }
.report-paper { max-width: 980px; margin: 0 auto; padding: 28px 42px; background: #fff; color: #25332f; line-height: 1.9; }
.report-paper h2 { text-align: center; margin: 0 0 8px; font-size: 26px; }
.paper-subtitle { text-align: center; color: #7d8b87; border-bottom: 1px solid #e8edf0; padding-bottom: 18px; }
.report-paper h3 { margin-top: 24px; color: #0f7b5c; }
@media (max-width: 1200px) { .main-grid, .summary-row { grid-template-columns: 1fr; } .filter-form { grid-template-columns: repeat(2, minmax(170px, 1fr)); } .search-actions { grid-column: 1 / -1; min-width: 0; } .button-row { grid-template-columns: repeat(3, 88px); justify-content: start; } .table-card, .report-summary { height: auto; } .table-card :deep(.el-card__body) { display: block; padding: 0; } .data-table { height: auto; } .compact-summary :deep(.el-card__body) { height: auto; overflow-y: visible; } .module-tabs { overflow-x: auto; } }
@media (max-width: 768px) { .card-header { flex-direction: column; align-items: flex-start; } .button-row { grid-template-columns: repeat(2, minmax(88px, 1fr)); width: 100%; } .button-row .el-button { width: 100%; } .report-paper { padding: 20px; } }
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   只修改视觉样式，不改动模板、方法、功能、接口及原有注释。 */
.phenology-report-page {
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

.phenology-report-page *,
.phenology-report-page *::before,
.phenology-report-page *::after {
  box-sizing: border-box;
}

.phenology-report-page .module-tabs {
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

.phenology-report-page .module-tabs .tab {
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

.phenology-report-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.phenology-report-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 17px rgba(47, 125, 92, 0.22);
}

.phenology-report-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.phenology-report-page .toolbar-spacer {
  flex: 1 1 auto;
}

.phenology-report-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(58, 88, 63, 0.08);
}

.phenology-report-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.phenology-report-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.phenology-report-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.phenology-report-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 650;
}

.phenology-report-page :deep(.el-input__wrapper),
.phenology-report-page :deep(.el-select__wrapper),
.phenology-report-page :deep(.el-cascader .el-input__wrapper),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper),
.phenology-report-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.phenology-report-page :deep(.el-input__wrapper:hover),
.phenology-report-page :deep(.el-select__wrapper:hover),
.phenology-report-page :deep(.el-cascader .el-input__wrapper:hover),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.phenology-report-page :deep(.el-input__wrapper.is-focus),
.phenology-report-page :deep(.el-select__wrapper.is-focused),
.phenology-report-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.phenology-report-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.phenology-report-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.phenology-report-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.phenology-report-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.phenology-report-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.phenology-report-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.phenology-report-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.phenology-report-page :deep(.el-pagination.is-background .el-pager li.is-active),
.phenology-report-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.phenology-report-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .phenology-report-page {
    padding: 12px;
  }

  .phenology-report-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .phenology-report-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .phenology-report-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .phenology-report-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .phenology-report-page .filter-form :deep(.el-form-item__content),
  .phenology-report-page .filter-form :deep(.el-input),
  .phenology-report-page .filter-form :deep(.el-select),
  .phenology-report-page .filter-form :deep(.el-cascader),
  .phenology-report-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.phenology-report-page .main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.65fr);
  align-items: start;
  gap: 16px;
  margin-bottom: 16px;
}

.phenology-report-page .table-card,
.phenology-report-page .report-summary,
.phenology-report-page .preview-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
}

.phenology-report-page .table-card :deep(.el-card__header),
.phenology-report-page .report-summary :deep(.el-card__header),
.phenology-report-page .preview-card :deep(.el-card__header) {
  min-height: 58px;
  padding: 14px 17px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
}

.phenology-report-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #294635;
  font-weight: 800;
}

.phenology-report-page .card-header em,
.phenology-report-page .muted {
  color: var(--ft-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}

.phenology-report-page .table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phenology-report-page .table-card :deep(.el-card__body) {
  display: flex;
  min-height: 650px;
  padding: 0;
  flex-direction: column;
}

.phenology-report-page .data-table {
  flex: 1 1 auto;
}

.phenology-report-page .green-text {
  color: var(--ft-green);
  font-weight: 800;
}

.phenology-report-page .pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 8px 15px;
  color: #758778;
  background: #fbfcfa;
  border-top: 1px solid #e4ece2;
}

.phenology-report-page .report-summary :deep(.el-card__body) {
  padding: 16px;
}

.phenology-report-page .summary-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.phenology-report-page .summary-kpis > div {
  min-height: 96px;
  padding: 13px;
  background:
    radial-gradient(circle at 95% 0%, rgba(111, 161, 126, 0.13), transparent 40%),
    linear-gradient(145deg, #f8fbf5, #eef5ea);
  border: 1px solid #dbe7d9;
  border-radius: 11px;
}

.phenology-report-page .summary-kpis span {
  display: block;
  color: #7c8f80;
  font-size: 11px;
}

.phenology-report-page .summary-kpis strong {
  display: block;
  margin: 7px 0 4px;
  overflow: hidden;
  color: #2f684c;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phenology-report-page .summary-kpis em {
  color: #8b998e;
  font-size: 11px;
  font-style: normal;
}

.phenology-report-page .mini-block {
  padding: 13px 14px;
  margin-top: 12px;
  background: #fafcf9;
  border: 1px solid #e2ebe0;
  border-radius: 10px;
}

.phenology-report-page .mini-block h4 {
  margin: 0 0 10px;
  color: #365342;
}

.phenology-report-page .mini-block ul {
  padding-left: 18px;
  margin: 0;
  color: #607565;
  line-height: 1.75;
}

.phenology-report-page .mini-block.advice {
  background: #eef6ea;
  border-color: #d4e3d2;
}

.phenology-report-page .stage-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.phenology-report-page .stage-tags span {
  padding: 5px 8px;
  color: #45624f;
  font-size: 11px;
  background: #edf3ea;
  border-radius: 7px;
}

.phenology-report-page .preview-card :deep(.el-card__body) {
  padding: 20px;
  background: #edf2ea;
}

.phenology-report-page .report-paper {
  max-width: 1040px;
  min-height: 720px;
  padding: 42px 52px;
  margin: auto;
  color: #31483a;
  background: #ffffff;
  border: 1px solid #dce7da;
  border-radius: 4px;
  box-shadow: 0 18px 38px rgba(53, 77, 57, 0.13);
}

.phenology-report-page .report-paper h2 {
  margin-top: 0;
  color: #294635;
  text-align: center;
  letter-spacing: 2px;
}

.phenology-report-page .paper-subtitle {
  padding-bottom: 13px;
  color: #829285;
  text-align: center;
  border-bottom: 1px solid #dfe8dd;
}

.phenology-report-page .report-paper h3 {
  color: #355541;
}

@media (max-width: 1180px) {
  .phenology-report-page .main-grid {
    grid-template-columns: 1fr;
  }

  .phenology-report-page .table-card :deep(.el-card__body) {
    min-height: 560px;
  }
}

@media (max-width: 720px) {
  .phenology-report-page .summary-kpis {
    grid-template-columns: 1fr;
  }

  .phenology-report-page .card-header,
  .phenology-report-page .pagination-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .phenology-report-page .report-paper {
    padding: 24px 18px;
  }
}
</style>

<style scoped>
/* 与物候总览统一：排版、字体、按钮和卡片 */

.phenology-report-page {

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

.phenology-report-page *,
.phenology-report-page *::before,
.phenology-report-page *::after {
  box-sizing: border-box;
  font-family: inherit;
}

.phenology-report-page button,
.phenology-report-page input,
.phenology-report-page select,
.phenology-report-page textarea {
  font: inherit;
}

/* 与总览页面一致的顶部页签 */
.phenology-report-page .module-tabs {
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

.phenology-report-page .module-tabs .tab {
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

.phenology-report-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.phenology-report-page .module-tabs .tab.active {
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--ft-green),
    var(--ft-green-mid)
  );
  box-shadow: 0 6px 14px rgba(47, 125, 92, 0.2);
}

.phenology-report-page .module-tabs .tab.active::after {
  position: absolute;
  right: 16px;
  bottom: 4px;
  left: 16px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.6);
  border-radius: 999px;
}

.phenology-report-page .toolbar-spacer {
  flex: 1 1 auto;
}

/* Element Plus 控件与总览页面统一 */
.phenology-report-page :deep(.el-input__wrapper),
.phenology-report-page :deep(.el-select__wrapper),
.phenology-report-page :deep(.el-cascader .el-input__wrapper),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper),
.phenology-report-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.phenology-report-page :deep(.el-input__wrapper:hover),
.phenology-report-page :deep(.el-select__wrapper:hover),
.phenology-report-page :deep(.el-cascader .el-input__wrapper:hover),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.phenology-report-page :deep(.el-input__wrapper.is-focus),
.phenology-report-page :deep(.el-select__wrapper.is-focused),
.phenology-report-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.phenology-report-page :deep(.el-input__inner),
.phenology-report-page :deep(.el-select__selected-item),
.phenology-report-page :deep(.el-select__placeholder),
.phenology-report-page :deep(.el-range-input) {
  font-family: inherit;
  font-size: 13px;
}

.phenology-report-page :deep(.el-button) {
  min-height: 32px;
  margin-left: 0;
  padding: 0 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 7px;
}

.phenology-report-page :deep(.el-button--small) {
  min-height: 30px;
  height: 30px;
  padding: 0 11px;
  font-size: 12px;
}

.phenology-report-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.phenology-report-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #fff;
}

.phenology-report-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
  --el-button-active-bg-color: #397858;
  --el-button-active-border-color: #397858;
}

.phenology-report-page :deep(.el-button--success.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: #3f805f;
  --el-button-hover-bg-color: #4f8f6b;
  --el-button-hover-border-color: #4f8f6b;
  --el-button-hover-text-color: #fff;
}

.phenology-report-page :deep(.el-card) {
  border-color: var(--ft-border);
}

.phenology-report-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
  border-bottom-color: var(--ft-border-soft);
}

.phenology-report-page .card-header {
  min-height: 30px;
  font-size: 14px;
  font-weight: 700;
  line-height: 30px;
}

.phenology-report-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  font-family: inherit;
  font-size: 13px;
}

.phenology-report-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.phenology-report-page :deep(.el-pagination) {
  font-family: inherit;
  font-size: 13px;
}

.phenology-report-page :deep(.el-pagination.is-background .el-pager li.is-active),
.phenology-report-page :deep(.el-pagination .el-pager li.is-active) {
  color: #fff;
  background: var(--ft-green);
}

.phenology-report-page :deep(.el-empty__description p),
.phenology-report-page :deep(.el-loading-text) {
  color: var(--ft-muted);
  font-family: inherit;
  font-size: 13px;
}


.phenology-report-page .filter-card {
  margin-bottom: 12px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.08);
}

.phenology-report-page .filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.phenology-report-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.phenology-report-page .filter-form :deep(.el-form-item) {
  display: flex;
  align-items: center;
  margin: 0;
}

.phenology-report-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: var(--ft-text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.phenology-report-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.phenology-report-page .scope-cascader {
  width: 300px;
}

.phenology-report-page .search-actions {
  min-width: 0;
  flex: 1 1 520px;
}

.phenology-report-page .search-actions :deep(.el-form-item__content) {
  width: 100%;
}

.phenology-report-page .button-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.phenology-report-page .button-row .el-button {
  width: auto;
  min-width: 76px;
}

.phenology-report-page .main-grid {
  --main-card-height: 600px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
}

.phenology-report-page .table-card,
.phenology-report-page .report-summary,
.phenology-report-page .preview-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--ft-border);
  border-radius: 12px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.08);
}

.phenology-report-page .table-card,
.phenology-report-page .report-summary {
  height: var(--main-card-height);
}

.phenology-report-page .table-card :deep(.el-card__body) {
  padding: 0;
}

.phenology-report-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.phenology-report-page .card-header em,
.phenology-report-page .muted {
  color: var(--ft-muted);
  font-size: 12px;
  font-weight: 400;
}

.phenology-report-page .table-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.phenology-report-page .pagination-row {
  min-height: 44px;
  padding: 6px 10px;
  color: var(--ft-text-secondary);
  border-top: 1px solid var(--ft-border-soft);
}

.phenology-report-page .compact-summary :deep(.el-card__body) {
  height: calc(var(--main-card-height) - 48px);
  padding: 10px;
}

.phenology-report-page .summary-kpis {
  gap: 8px;
}

.phenology-report-page .summary-kpis div {
  padding: 9px 10px;
  border-color: var(--ft-border-soft);
  border-radius: 8px;
  background: #f8fbf5;
}

.phenology-report-page .summary-kpis span {
  font-size: 12px;
}

.phenology-report-page .summary-kpis strong {
  margin: 4px 0 1px;
  color: var(--ft-green);
  font-size: 19px;
}

.phenology-report-page .mini-block {
  margin-top: 8px;
  padding: 10px;
  border-color: var(--ft-border-soft);
  border-radius: 8px;
}

.phenology-report-page .mini-block h4 {
  margin-bottom: 6px;
  font-size: 14px;
}

.phenology-report-page .mini-block ul {
  font-size: 13px;
  line-height: 1.6;
}

.phenology-report-page .stage-tags {
  gap: 6px;
}

.phenology-report-page .stage-tags span {
  padding: 5px 9px;
  color: var(--ft-green-deep);
  font-size: 12px;
  background: #edf5e9;
}

.phenology-report-page .preview-card {
  margin-top: 0;
}

.phenology-report-page .report-paper {
  max-width: 980px;
  padding: 24px 36px;
  color: var(--ft-text);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
}

.phenology-report-page .report-paper h2 {
  margin-bottom: 7px;
  font-size: 24px;
}

.phenology-report-page .paper-subtitle {
  padding-bottom: 14px;
  font-size: 12px;
}

.phenology-report-page .report-paper h3 {
  margin-top: 20px;
  color: var(--ft-green-deep);
  font-size: 16px;
}

@media (max-width: 1200px) {
  .phenology-report-page .main-grid {
    grid-template-columns: 1fr;
  }

  .phenology-report-page .table-card,
  .phenology-report-page .report-summary {
    height: auto;
  }

  .phenology-report-page .compact-summary :deep(.el-card__body) {
    height: auto;
    overflow-y: visible;
  }
}

@media (max-width: 900px) {
  .phenology-report-page {
    padding: 10px;
  }

  .phenology-report-page .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .phenology-report-page .filter-form :deep(.el-form-item) {
    width: 100%;
  }

  .phenology-report-page .filter-form :deep(.el-form-item__content),
  .phenology-report-page .filter-form :deep(.el-input),
  .phenology-report-page .filter-form :deep(.el-select),
  .phenology-report-page .filter-form :deep(.el-cascader),
  .phenology-report-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }

  .phenology-report-page .report-paper {
    padding: 20px 16px;
  }
}

.phenology-report-page .generated-report-text {
  white-space: pre-line;
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE: remove this block to roll back the near-right-angle theme. */
.phenology-report-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.phenology-report-page .module-tabs,
.phenology-report-page .module-tabs .tab,
.phenology-report-page .module-tabs .tab.active::after,
.phenology-report-page .filter-card,
.phenology-report-page .table-card,
.phenology-report-page .report-summary,
.phenology-report-page .preview-card,
.phenology-report-page .summary-kpis > div,
.phenology-report-page .mini-block,
.phenology-report-page .stage-tags span,
.phenology-report-page .report-paper,
.phenology-report-page .pagination-row,
.phenology-report-page :deep(.el-card),
.phenology-report-page :deep(.el-card__header),
.phenology-report-page :deep(.el-card__body),
.phenology-report-page :deep(.el-button),
.phenology-report-page :deep(.el-button-group),
.phenology-report-page :deep(.el-input__wrapper),
.phenology-report-page :deep(.el-select__wrapper),
.phenology-report-page :deep(.el-cascader .el-input__wrapper),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper),
.phenology-report-page :deep(.el-tag),
.phenology-report-page :deep(.el-progress-bar__outer),
.phenology-report-page :deep(.el-progress-bar__inner),
.phenology-report-page :deep(.el-table),
.phenology-report-page :deep(.el-table__inner-wrapper),
.phenology-report-page :deep(.el-pagination button),
.phenology-report-page :deep(.el-pager li) {
  border-radius: var(--sharp-radius) !important;
}

.phenology-report-page .filter-card,
.phenology-report-page .table-card,
.phenology-report-page .report-summary,
.phenology-report-page .preview-card,
.phenology-report-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.phenology-report-page .filter-card:hover,
.phenology-report-page .table-card:hover,
.phenology-report-page .report-summary:hover,
.phenology-report-page .preview-card:hover,
.phenology-report-page :deep(.el-card:hover) {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.phenology-report-page .summary-kpis > div,
.phenology-report-page .mini-block,
.phenology-report-page .stage-tags span {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.phenology-report-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.phenology-report-page :deep(.el-input__wrapper),
.phenology-report-page :deep(.el-select__wrapper),
.phenology-report-page :deep(.el-cascader .el-input__wrapper),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.phenology-report-page :deep(.el-input__wrapper.is-focus),
.phenology-report-page :deep(.el-select__wrapper.is-focused),
.phenology-report-page :deep(.el-cascader .el-input__wrapper.is-focus),
.phenology-report-page :deep(.el-date-editor.el-input__wrapper.is-active) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.phenology-report-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.phenology-report-page :deep(.el-progress-bar__inner) {
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
