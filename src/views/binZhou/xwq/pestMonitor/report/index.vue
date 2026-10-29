<template>
  <div class="report-page">
    <div class="module-tabs">
      <button class="tab" @click="goTo('/xwq/pestMonitor/analysis')">总览</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/image')">虫情图片</button>
      <button class="tab" @click="goTo('/xwq/pestMonitor/ai')">智能分析</button>
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

        <!-- <el-form-item label="虫害类别">
          <el-input
            v-model="queryParams.pestName"
            placeholder="请输入虫害类别"
            clearable
            style="width: 170px"
            @keyup.enter="loadData"
          />
        </el-form-item> -->

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
            <el-button class="reference-action-btn reference-primary-btn" type="primary" @click="loadData">查询</el-button>
            <el-button class="reference-action-btn reference-secondary-btn" @click="resetQuery">重置</el-button>
            <el-button class="reference-action-btn reference-secondary-btn" plain :loading="generating" @click="generateReport">生成报告</el-button>
            <el-button class="reference-action-btn reference-primary-btn" type="success" @click="exportReport">导出报告</el-button>
            <el-button class="reference-action-btn reference-primary-btn" type="primary" @click="exportPdfReport">导出PDF</el-button>
            <el-button class="reference-action-btn reference-primary-btn" type="success" @click="exportData">数据导出</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <div v-loading="loading">
      <!-- <div class="summary-row">
        <div class="stat-card">
          <span>虫情图片</span>
          <strong>{{ imageCount }}</strong>
          <em>张</em>
        </div>
        <div class="stat-card">
          <span>识别记录</span>
          <strong>{{ reportRows.length }}</strong>
          <em>条</em>
        </div>
        <div class="stat-card">
          <span>虫体总数</span>
          <strong>{{ totalPestCount }}</strong>
          <em>头</em>
        </div>
        <div class="stat-card">
          <span>综合风险</span>
          <strong :class="riskClass">{{ riskLevel }}</strong>
          <em>自动研判</em>
        </div>
      </div> -->

      <div class="main-grid">
        <el-card class="table-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>历史虫情识别数据 <em>共 {{ queryRows.length }} 条记录</em></span>
              <div class="table-actions">
                <el-button size="small" plain @click="toggleSelectAll">
                  {{ currentPageAllSelected ? '取消全选' : '全选' }}
                </el-button>
                <el-button size="small" plain @click="exportSelectedData">批量导出</el-button>
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
            empty-text="暂无虫情识别数据"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="45" align="center" :reserve-selection="true" />
            <el-table-column label="识别编号" width="150" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.recordNo || `PEST-${row.pestId || row.imageId || '-'}` }}
              </template>
            </el-table-column>
            <!-- <el-table-column label="图片" width="90" align="center">
              <template #default="{ row }">
                <el-image
                  v-if="normalizeImageUrl(row.imageUrl || row.pestResultImgUrl)"
                  class="thumb"
                  :src="normalizeImageUrl(row.imageUrl || row.pestResultImgUrl)"
                  fit="cover"
                >
                  <template #error>
                    <div class="thumb-error">无图</div>
                  </template>
                </el-image>
                <div v-else class="thumb-error">无图</div>
              </template>
            </el-table-column> -->
            <!-- <el-table-column label="园区" width="110" align="center" show-overflow-tooltip>
              <template #default="{ row }">{{ row.parkName || row.parkId || '-' }}</template>
            </el-table-column>
            <el-table-column label="地块" width="110" align="center" show-overflow-tooltip>
              <template #default="{ row }">{{ row.areaName || row.areaId || '-' }}</template>
            </el-table-column>
            <el-table-column label="角落" width="110" align="center" show-overflow-tooltip>
              <template #default="{ row }">{{ row.locationName || row.locationId || '-' }}</template>
            </el-table-column>
            <el-table-column label="设备" width="120" align="center" show-overflow-tooltip>
              <template #default="{ row }">{{ row.deviceName || row.deviceId || '-' }}</template>
            </el-table-column> -->
            <el-table-column prop="pestName" label="虫害类别" width="130" show-overflow-tooltip />
            <el-table-column prop="pestCrop" label="作物类型" width="100" align="center" />
            <el-table-column label="虫体数量" width="110" align="center">
              <template #default="{ row }">
                <strong>{{ Number(row.pestTotalCount || row.pestCount || 0) }}</strong> 头
              </template>
            </el-table-column>
            <el-table-column label="置信度" width="100" align="center">
              <template #default="{ row }">
                <span class="green-text">{{ toPercent(row.pestConfidence) }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="warningLevel" label="预警等级" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getWarningTag(row.warningLevel)" effect="plain">
                  {{ row.warningLevel || '无' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="识别结论" min-width="240" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.pestResult || `识别到 ${row.pestName || '虫害'}，数量 ${row.pestTotalCount || row.pestCount || 0} 头` }}
              </template>
            </el-table-column>
            <el-table-column label="识别时间" width="160" align="center">
              <template #default="{ row }">
                {{ getRecognizeTime(row) }}
              </template>
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
          element-loading-text="正在生成虫情报告..."
          element-loading-background="rgba(255, 255, 255, 0.82)"
        >
          <template #header>
            <div class="card-header">
              <span>报告摘要</span>
              <el-tag :type="getRiskTag(riskLevel)" effect="plain">{{ riskLevel }}</el-tag>
            </div>
          </template>

          <div class="summary-kpis">
            <div>
              <span>识别总数</span>
              <strong>{{ reportRows.length }}</strong>
              <em>条</em>
            </div>
            <div>
              <span>主要虫害</span>
              <strong>{{ topPestName }}</strong>
              <em>占比 {{ dominantPercent }}%</em>
            </div>
            <div>
              <span>平均置信度</span>
              <strong>{{ avgConfidence }}%</strong>
              <em>模型结果</em>
            </div>
            <div>
              <span>预警记录</span>
              <strong>{{ warningTotal }}</strong>
              <em>条</em>
            </div>
          </div>

          <div class="mini-block">
            <h4>主要虫种分布</h4>
            <div class="pest-tags">
              <span v-for="item in topPests" :key="item.name">
                {{ item.name }}：{{ item.count }}头
              </span>
            </div>
          </div>

          <div class="mini-block">
            <h4>摘要说明</h4>
            <ul>
              <li>本期共形成虫情识别记录 {{ reportRows.length }} 条，累计虫体 {{ totalPestCount }} 头。</li>
              <li>主要虫害为 {{ topPestName }}，优势虫种占比 {{ dominantPercent }}%。</li>
              <li>综合风险等级为 {{ riskLevel }}，建议结合田间实际情况进行复核。</li>
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
        element-loading-text="正在整理虫情报告文本..."
        element-loading-background="rgba(255, 255, 255, 0.82)"
      >
        <template #header>
          <div class="card-header">
            <span>报告预览</span>
            <span class="muted">{{ reportSourceText }}</span>
          </div>
        </template>

        <div class="report-paper" ref="paperRef">
          <h2>滨州枣树虫情监测报告</h2>
          <p class="paper-subtitle">
            生成时间：{{ nowText }} ｜ 监测范围：{{ reportScopeText }} ｜ 时间范围：{{ dateRangeText }} ｜ 数据来源：xwq_ai_pest 虫情识别结果表
          </p>

          <section>
            <h3>一、总体情况</h3>
            <p v-if="generatedSections.overall" class="generated-report-text">{{ generatedSections.overall }}</p>
            <template v-else>
              <p>
              本期共涉及虫情图片 {{ imageCount }} 张，形成识别记录 {{ reportRows.length }} 条，
              累计监测虫体 {{ totalPestCount }} 头。主要虫种为 {{ topPestName }}，
              优势虫种占比 {{ dominantPercent }}%，平均识别置信度 {{ avgConfidence }}%。
              </p>
              <p>
              预警统计：高风险 {{ warningStats.high }} 条，中风险 {{ warningStats.middle }} 条，
              低风险 {{ warningStats.low }} 条，未标记 {{ warningStats.none }} 条。
              </p>
            </template>
          </section>

          <section>
            <h3>二、主要虫种分布</h3>
            <p v-if="generatedSections.distribution" class="generated-report-text">{{ generatedSections.distribution }}</p>
            <div v-else class="pest-tags">
              <span v-for="item in topPests" :key="item.name">{{ item.name }}：{{ item.count }}头</span>
            </div>
          </section>

          <section>
            <h3>三、风险研判</h3>
            <p><strong>综合风险等级：{{ riskLevel }}</strong></p>
            <p class="generated-report-text">{{ displayedRiskText }}</p>
          </section>

          <section>
            <h3>四、防治建议</h3>
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
import { generatePestReportText, listPest } from '@/api/binZhou/xwq/pest'
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
  risk: '',
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

const queryRows = computed(() => {
  let rows = allRows.value

  if (queryParams.value.pestName) {
    rows = rows.filter(row => String(row.pestName || '').includes(queryParams.value.pestName))
  }

  if (queryParams.value.warningLevel) {
    rows = rows.filter(row => String(row.warningLevel || '无') === queryParams.value.warningLevel)
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
const imageCount = computed(() => new Set(reportRows.value.map(item => item.imageId).filter(Boolean)).size)
const totalPestCount = computed(() => reportRows.value.reduce((sum, item) => sum + Number(item.pestTotalCount || item.pestCount || 0), 0))
const topPests = computed(() => {
  const map = new Map()
  reportRows.value.forEach(item => {
    const name = item.pestName || '未知虫害'
    map.set(name, (map.get(name) || 0) + Number(item.pestTotalCount || item.pestCount || 0))
  })
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6)
})
const topPestName = computed(() => topPests.value[0]?.name || '暂无明显优势虫种')
const dominantPercent = computed(() => totalPestCount.value ? Math.round((topPests.value[0]?.count || 0) / totalPestCount.value * 100) : 0)
const avgConfidence = computed(() => {
  if (!reportRows.value.length) return 0
  const total = reportRows.value.reduce((sum, item) => sum + toPercent(item.pestConfidence), 0)
  return Math.round(total / reportRows.value.length)
})
const warningStats = computed(() => {
  return reportRows.value.reduce((stats, item) => {
    const level = String(item.warningLevel || '')
    if (level.includes('高')) stats.high += 1
    else if (level.includes('中')) stats.middle += 1
    else if (level.includes('低')) stats.low += 1
    else stats.none += 1
    return stats
  }, { high: 0, middle: 0, low: 0, none: 0 })
})
const warningTotal = computed(() => warningStats.value.high + warningStats.value.middle + warningStats.value.low)
const riskLevel = computed(() => {
  if (!reportRows.value.length) return '暂无数据'
  if (warningStats.value.high > 0 || totalPestCount.value >= 1000 || dominantPercent.value >= 70) return '高风险'
  if (warningStats.value.middle > 0 || totalPestCount.value >= 300 || dominantPercent.value >= 50) return '中风险'
  return '低风险'
})
const riskClass = computed(() => {
  if (riskLevel.value === '高风险') return 'risk-high'
  if (riskLevel.value === '中风险') return 'risk-mid'
  if (riskLevel.value === '低风险') return 'risk-low'
  return ''
})
const riskText = computed(() => {
  if (!reportRows.value.length) return '当前统计范围内暂无虫情识别记录，建议先开展虫情识别或扩大查询时间范围。'
  if (riskLevel.value === '高风险') {
    return `监测结果显示虫情风险较高。${warningStats.value.high ? `存在 ${warningStats.value.high} 条高等级预警记录，` : ''}累计虫体 ${totalPestCount.value} 头，优势虫种 ${topPestName.value} 占比 ${dominantPercent.value}%，建议立即组织重点区域复核和防治处置。`
  }
  if (riskLevel.value === '中风险') {
    return `当前虫情处于中等风险水平。累计虫体 ${totalPestCount.value} 头，优势虫种为 ${topPestName.value}，建议加密监测频次，关注虫口密度和优势虫种变化。`
  }
  return `当前虫情总体处于低风险水平。识别记录以 ${topPestName.value} 为主，虫体数量和预警等级均未达到中高风险阈值，建议保持常态化监测。`
})
const adviceList = computed(() => {
  const advice = reportRows.value.map(item => String(item.pestAdvice || '').trim()).filter(Boolean)
  const uniqueAdvice = Array.from(new Set(advice)).slice(0, 3)
  if (uniqueAdvice.length) return uniqueAdvice

  if (riskLevel.value === '高风险') {
    return [
      '立即对高发区域开展田间复核，明确虫口密度和扩散范围。',
      '优先采用诱捕、物理阻隔和生物防控措施，必要时按植保要求精准施药。',
      '缩短监测周期，连续跟踪优势虫种数量变化和防治效果。'
    ]
  }

  if (riskLevel.value === '中风险') {
    return [
      '加强虫情灯、诱捕器与图像采集设备巡检，保持监测数据连续稳定。',
      '对优势虫种对应区域开展重点巡查，结合温湿度变化判断迁飞或暴发风险。',
      '优先采用绿色防控措施，必要时进行局部精准处置。'
    ]
  }

  return [
    '保持常态化虫情监测，定期核查设备运行状态。',
    '关注优势虫种变化趋势，发现数量快速上升时及时复核。',
    '继续采用绿色防控和农业防治措施，降低虫源基数。'
  ]
})

const displayedRiskText = computed(() => generatedSections.value.risk || riskText.value)
const displayedAdviceList = computed(() => generatedSections.value.advice.length
  ? generatedSections.value.advice
  : adviceList.value)

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
    const pestRes = await listPest({
      pageNum: 1,
      pageSize: 1000,
      parkId: queryParams.value.parkId || undefined,
      areaId: queryParams.value.areaId || undefined,
      locationId: queryParams.value.locationId || undefined,
      deviceId: queryParams.value.deviceId || undefined,
      pestName: queryParams.value.pestName || undefined,
      warningLevel: queryParams.value.warningLevel || undefined
    })
    allRows.value = pestRes.rows || []
    selectedRows.value = []
    tableRef.value?.clearSelection()
    pageNum.value = 1
  } catch (error) {
    console.error(error)
    ElMessage.error('报告数据加载失败')
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
    pestName: '',
    warningLevel: ''
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
    const res = await generatePestReportText(buildGenerateParams(nextReportRows))
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
    ElMessage.error(error?.msg || error?.response?.data?.msg || error?.message || '虫情报告生成失败')
  } finally {
    generating.value = false
  }
}

function buildGenerateParams(rows) {
  const ids = selectedRows.value.length
    ? Array.from(new Set(rows.map(row => Number(row.pestId)).filter(id => Number.isInteger(id) && id > 0)))
    : []
  if (ids.length) return { pestIds: ids }

  return {
    parkId: queryParams.value.parkId || undefined,
    areaId: queryParams.value.areaId || undefined,
    locationId: queryParams.value.locationId || undefined,
    deviceId: queryParams.value.deviceId || undefined,
    pestName: queryParams.value.pestName || undefined,
    warningLevel: queryParams.value.warningLevel || undefined,
    startDate: dateRange.value?.[0] || undefined,
    endDate: dateRange.value?.[1] || undefined
  }
}

function parseGeneratedReport(text) {
  const sections = {}
  const pattern = /<<(OVERALL|DISTRIBUTION|RISK|ADVICE)>>\s*([\s\S]*?)(?=<<(?:OVERALL|DISTRIBUTION|RISK|ADVICE)>>|$)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    sections[match[1]] = match[2].trim()
  }
  if (!sections.OVERALL || !sections.DISTRIBUTION || !sections.RISK || !sections.ADVICE) {
    throw new Error('后端报告章节不完整')
  }
  return {
    overall: sections.OVERALL,
    distribution: sections.DISTRIBUTION,
    risk: sections.RISK,
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

  exportRows(selectedRows.value, `虫情识别结果_${Date.now()}.xls`)
}

function exportData() {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选要导出的数据')
    return
  }

  exportRows(selectedRows.value, `虫情识别结果_${Date.now()}.xls`)
}


function exportRows(rows, fileName) {
  const headers = ['图片ID', '园区', '地块', '角落', '设备', '虫害类别', '置信度', '当前数量', '虫体总数', '预警等级', '识别结论', '防治建议', '识别时间']
  const bodyRows = rows.map(item => [
    item.imageId,
    item.parkName || item.parkId || '',
    item.areaName || item.areaId || '',
    item.locationName || item.locationId || '',
    item.deviceName || item.deviceId || '',
    item.pestName,
    `${toPercent(item.pestConfidence)}%`,
    item.pestCount,
    item.pestTotalCount,
    item.warningLevel,
    item.pestResult,
    item.pestAdvice,
    getRecognizeTime(item)
  ])

  const html = `<table border="1">
    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${bodyRows.map(row => `<tr>${row.map(col => `<td style="mso-number-format:'\\@';">${col ?? ''}</td>`).join('')}</tr>`).join('')}
  </table>`

  const blob = new Blob([`<html><head><meta charset="UTF-8"></head><body>${html}</body></html>`], {
    type: 'application/vnd.ms-excel;charset=utf-8;'
  })
  downloadBlob(blob, fileName)
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
        .pest-tags span { display: inline-block; margin: 5px; padding: 6px 10px; color: #000; border: 1px solid #000; border-radius: 0; background: transparent; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `], { type: 'application/msword;charset=utf-8;' })
  downloadBlob(blob, `虫情监测报告_${Date.now()}.doc`)
}

function exportPdfReport() {
  if (!reportRows.value.length) return ElMessage.warning('暂无数据可导出PDF')
  openPrintWindow(paperRef.value?.innerHTML || '', '虫情监测报告')
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
        .pest-tags span { display: inline-block; margin: 5px; padding: 6px 10px; background: #eefbf6; color: #0f7b5c; border-radius: 20px; }
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

function getWarningTag(level) {
  if (!level || level === '无') return 'info'
  if (String(level).includes('高')) return 'danger'
  if (String(level).includes('中')) return 'warning'
  if (String(level).includes('低')) return 'success'
  return 'info'
}

function getRiskTag(level) {
  if (level === '高风险') return 'danger'
  if (level === '中风险') return 'warning'
  if (level === '低风险') return 'success'
  return 'info'
}

function getRecognizeTime(row) {
  return row.pestA || row.recognizeTime || row.createTime || row.updateTime || '-'
}

function getRowTime(row) {
  const value = row.pestA || row.recognizeTime || row.createTime || row.updateTime || row.recordTime
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url
  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url
  return `${baseApi}/${url}`
}

function getRowKey(row) {
  return String(
    row.pestId ??
    row.recordId ??
    row.imageId ??
    row.recordNo ??
    `${row.pestName || ''}-${getRecognizeTime(row)}`
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
.report-page {
  --pm-green: #12b886;
  --pm-dark: #20302c;
  --pm-soft: #eefbf6;
  --pm-border: #e6edf0;
  min-height: calc(100vh - 84px);
  padding: 0 18px 22px;
  color: var(--pm-dark);
  background: #f5f7fa;
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
  min-width: 584px;
}

.search-actions :deep(.el-form-item__content) {
  width: 100%;
}

.button-row {
  display: grid;
  grid-template-columns: repeat(6, 88px);
  gap: 10px;
  align-items: center;
}

.button-row .el-button {
  width: 88px;
  margin-left: 0;
  padding-left: 0;
  padding-right: 0;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.stat-card {
  padding: 18px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--pm-border);
  box-shadow: 0 6px 18px rgba(31, 45, 61, .04);
}

.stat-card span {
  display: block;
  color: #758480;
  font-size: 13px;
}

.stat-card strong {
  display: block;
  margin: 8px 0 2px;
  color: var(--pm-green);
  font-size: 26px;
}

.stat-card em {
  color: #9aa6a3;
  font-style: normal;
  font-size: 12px;
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

.main-grid {
  --main-card-height: 620px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 14px;
  margin-bottom: 14px;
  align-items: stretch;
}

.table-card,
.report-summary,
.preview-card {
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  box-shadow: none;
}

.table-card,
.report-summary {
  height: var(--main-card-height);
  align-self: stretch;
}

.table-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.table-card :deep(.el-card__header) {
  flex-shrink: 0;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.report-summary {
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  min-width: 0;
}

.card-header em {
  margin-left: 8px;
  color: #889692;
  font-style: normal;
  font-weight: 400;
  font-size: 13px;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.data-table {
  flex: 1;
  min-height: 0;
  font-size: 13px;
}

.thumb {
  width: 52px;
  height: 36px;
  border-radius: 8px;
  background: #f5f7fa;
}

.thumb-error {
  width: 52px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #a8abb2;
  font-size: 12px;
  border-radius: 8px;
  background: #f5f7fa;
}

.green-text {
  color: var(--pm-green);
  font-weight: 700;
}

.pagination-row {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 46px;
  padding: 8px 12px;
  color: #758480;
  border-top: 1px solid var(--pm-border);
  background: #fff;
}


/* 右侧报告摘要紧凑化：避免内容过长把左侧表格卡片强行拉高 */
.compact-summary {
  overflow: hidden;
}

.compact-summary :deep(.el-card__body) {
  height: calc(var(--main-card-height) - 57px);
  overflow-y: auto;
  padding: 14px;
}

.compact-summary :deep(.el-card__body)::-webkit-scrollbar {
  width: 6px;
}

.compact-summary :deep(.el-card__body)::-webkit-scrollbar-thumb {
  background: #d8e6df;
  border-radius: 14px;
}

.summary-kpis {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.summary-kpis div {
  padding: 10px 12px;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  background: #fbfcfd;
  min-width: 0;
}

.summary-kpis span {
  display: block;
  color: #758480;
  font-size: 12px;
}

.summary-kpis strong {
  display: block;
  margin: 5px 0 2px;
  color: var(--pm-green);
  font-size: 20px;
  line-height: 1.2;
  word-break: break-all;
}

.summary-kpis em {
  color: #9aa6a3;
  font-style: normal;
  font-size: 12px;
}

.mini-block {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  background: #fff;
}

.mini-block h4 {
  margin: 0 0 8px;
  color: #25332f;
  font-size: 14px;
}

.mini-block ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.65;
}

.advice {
  background: #f8fffb;
}

.pest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pest-tags span {
  padding: 6px 10px;
  max-width: 100%;
  color: var(--pm-green);
  font-size: 12px;
  word-break: break-all;
  border-radius: 999px;
  background: var(--pm-soft);
}

.preview-card {
  margin-top: 14px;
}

.muted {
  color: #889692;
  font-weight: 400;
  font-size: 13px;
}

.report-paper {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 42px;
  background: #fff;
  color: #25332f;
  line-height: 1.9;
}

.report-paper h2 {
  text-align: center;
  margin: 0 0 8px;
  font-size: 26px;
}

.paper-subtitle {
  text-align: center;
  color: #7d8b87;
  border-bottom: 1px solid #e8edf0;
  padding-bottom: 18px;
}

.report-paper h3 {
  margin-top: 24px;
  color: #0f7b5c;
}

@media (max-width: 1200px) {
  .main-grid,
  .summary-row {
    grid-template-columns: 1fr;
  }

    .filter-form {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }

  .search-actions {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .button-row {
    grid-template-columns: repeat(3, 88px);
    justify-content: start;
  }

  .table-card,
  .report-summary {
    height: auto;
  }

  .table-card :deep(.el-card__body) {
    display: block;
    padding: 0;
  }

  .data-table {
    height: auto;
  }

  .compact-summary :deep(.el-card__body) {
    height: auto;
    overflow-y: visible;
  }

  .module-tabs {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

    .button-row {
    grid-template-columns: repeat(2, minmax(88px, 1fr));
    width: 100%;
  }

  .button-row .el-button {
    width: 100%;
  }

  .report-paper {
    padding: 20px;
  }
}
</style>

<style scoped>
/* FarmerTask 同系主题覆盖
   仅覆盖视觉样式，不改动 template、script、方法、功能或原有注释。 */
.report-page {
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

.report-page *,
.report-page *::before,
.report-page *::after {
  box-sizing: border-box;
}

.report-page .module-tabs {
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

.report-page .module-tabs .tab {
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

.report-page .module-tabs .tab:hover {
  color: var(--ft-green);
  background: #f1f7ef;
}

.report-page .module-tabs .tab.active {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), var(--ft-green-mid));
  box-shadow: 0 8px 16px rgba(47, 125, 92, 0.20);
}

.report-page .module-tabs .tab.active::after {
  position: absolute;
  right: 18px;
  bottom: 5px;
  left: 18px;
  height: 2px;
  content: "";
  background: rgba(255, 255, 255, 0.62);
  border-radius: 999px;
}

.report-page .toolbar-spacer {
  flex: 1 1 auto;
}

.report-page .filter-card {
  margin-bottom: 16px;
  overflow: visible;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.07);
}

.report-page .filter-card :deep(.el-card__body) {
  padding: 16px 18px 4px;
}

.report-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0 4px;
}

.report-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.report-page .filter-form :deep(.el-form-item__label) {
  color: var(--ft-text-secondary);
  font-weight: 600;
}

.report-page :deep(.el-input__wrapper),
.report-page :deep(.el-select__wrapper),
.report-page :deep(.el-cascader .el-input__wrapper),
.report-page :deep(.el-date-editor.el-input__wrapper),
.report-page :deep(.el-date-editor--daterange) {
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.report-page :deep(.el-input__wrapper:hover),
.report-page :deep(.el-select__wrapper:hover),
.report-page :deep(.el-cascader .el-input__wrapper:hover),
.report-page :deep(.el-date-editor.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.report-page :deep(.el-input__wrapper.is-focus),
.report-page :deep(.el-select__wrapper.is-focused),
.report-page :deep(.el-cascader .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.report-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.report-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.report-page :deep(.el-button--success) {
  --el-button-bg-color: #4f8f6b;
  --el-button-border-color: #4f8f6b;
  --el-button-hover-bg-color: #649f79;
  --el-button-hover-border-color: #649f79;
}

.report-page :deep(.el-pagination.is-background .el-pager li.is-active),
.report-page :deep(.el-pagination .el-pager li.is-active) {
  color: #ffffff;
  background: var(--ft-green);
}

.report-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.report-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.report-page :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.report-page :deep(.el-card__header) {
  border-bottom-color: #e2ece0;
}

.report-page :deep(.el-empty__description p) {
  color: var(--ft-muted);
}

@media (max-width: 900px) {
  .report-page {
    padding: 12px;
  }

  .report-page .module-tabs {
    align-items: stretch;
    overflow-x: auto;
  }

  .report-page .module-tabs .tab {
    flex: 0 0 auto;
    min-width: 96px;
    padding: 0 12px;
  }

  .report-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .report-page .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .report-page .filter-form :deep(.el-form-item__content),
  .report-page .filter-form :deep(.el-input),
  .report-page .filter-form :deep(.el-select),
  .report-page .filter-form :deep(.el-cascader),
  .report-page .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}

.report-page .main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.65fr);
  align-items: start;
  gap: 16px;
  margin-bottom: 16px;
}

.report-page .table-card,
.report-page .report-summary,
.report-page .preview-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(58, 88, 63, 0.08);
}

.report-page .table-card :deep(.el-card__header),
.report-page .report-summary :deep(.el-card__header),
.report-page .preview-card :deep(.el-card__header) {
  min-height: 58px;
  padding: 14px 17px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
}

.report-page .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #294635;
  font-weight: 800;
}

.report-page .card-header em,
.report-page .muted {
  color: var(--ft-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}

.report-page .table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-page .table-card :deep(.el-card__body) {
  display: flex;
  min-height: 650px;
  padding: 0;
  flex-direction: column;
}

.report-page .data-table {
  flex: 1 1 auto;
}

.report-page .thumb {
  width: 62px;
  height: 48px;
  overflow: hidden;
  border: 1px solid #dce7da;
  border-radius: 7px;
}

.report-page .thumb-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 48px;
  margin: auto;
  color: #98a59b;
  font-size: 11px;
  background: #f2f6ef;
  border-radius: 7px;
}

.report-page .green-text {
  color: var(--ft-green);
  font-weight: 800;
}

.report-page .pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 8px 15px;
  color: #758778;
  background: #fbfcfa;
  border-top: 1px solid #e4ece2;
}

.report-page .report-summary :deep(.el-card__body) {
  padding: 16px;
}

.report-page .summary-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.report-page .summary-kpis > div {
  min-height: 96px;
  padding: 13px;
  background:
    radial-gradient(circle at 95% 0%, rgba(111, 161, 126, 0.13), transparent 40%),
    linear-gradient(145deg, #f8fbf5, #eef5ea);
  border: 1px solid #dbe7d9;
  border-radius: 11px;
}

.report-page .summary-kpis span {
  display: block;
  color: #7c8f80;
  font-size: 11px;
}

.report-page .summary-kpis strong {
  display: block;
  margin: 7px 0 4px;
  overflow: hidden;
  color: #2f684c;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-page .summary-kpis em {
  color: #8b998e;
  font-size: 11px;
  font-style: normal;
}

.report-page .mini-block {
  padding: 13px 14px;
  margin-top: 12px;
  background: #fafcf9;
  border: 1px solid #e2ebe0;
  border-radius: 10px;
}

.report-page .mini-block h4 {
  margin: 0 0 10px;
  color: #365342;
}

.report-page .mini-block ul {
  padding-left: 18px;
  margin: 0;
  color: #607565;
  line-height: 1.75;
}

.report-page .mini-block.advice {
  background: #eef6ea;
  border-color: #d4e3d2;
}

.report-page .pest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.report-page .pest-tags span {
  padding: 5px 8px;
  color: #45624f;
  font-size: 11px;
  background: #edf3ea;
  border-radius: 7px;
}

.report-page .preview-card {
  margin-top: 0;
}

.report-page .preview-card :deep(.el-card__body) {
  padding: 20px;
  background: #edf2ea;
}

.report-page .report-paper {
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

.report-page .report-paper h2 {
  margin-top: 0;
  color: #294635;
  text-align: center;
  letter-spacing: 2px;
}

.report-page .paper-subtitle {
  padding-bottom: 13px;
  color: #829285;
  text-align: center;
  border-bottom: 1px solid #dfe8dd;
}

@media (max-width: 1180px) {
  .report-page .main-grid {
    grid-template-columns: 1fr;
  }

  .report-page .table-card :deep(.el-card__body) {
    min-height: 560px;
  }
}

@media (max-width: 720px) {
  .report-page .summary-kpis {
    grid-template-columns: 1fr;
  }

  .report-page .card-header,
  .report-page .pagination-row {
    align-items: flex-start;
    flex-direction: column;
  }

    .report-page .report-paper {
    padding: 24px 18px;
  }
}

.report-page,
.report-page *,
.report-page *::before,
.report-page *::after,
.report-page :deep(*) {
  font-family: inherit !important;
}
</style>

<style scoped>
.report-page {
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

.report-page,
.report-page *,
.report-page *::before,
.report-page *::after,
.report-page :deep(*) {
  font-family: inherit !important;
}

.report-page .module-tabs {
  min-height: 48px;
  height: auto;
  margin: 0 0 10px;
  padding: 4px 6px;
  gap: 4px;
  border-radius: 10px;
}

.report-page .module-tabs .tab {
  min-width: 96px;
  height: 38px;
  padding: 0 14px;
  font-size: 14px !important;
  font-weight: 600;
  line-height: 38px;
  border-radius: 8px;
}

.report-page .filter-card {
  margin-bottom: 10px;
  border-radius: 10px;
}

.report-page .filter-card :deep(.el-card__body) {
  padding: 10px 12px 2px;
}

.report-page .filter-form {
  display: flex;
  align-items: flex-end;
  width: 100%;
  flex-wrap: wrap;
  gap: 0 14px;
}

.report-page .filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 8px;
}

.report-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: var(--unified-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 32px;
}

.report-page .filter-form .search-actions {
  margin-left: auto;
}

.report-page .button-row,
.report-page .search-actions :deep(.el-form-item__content),
.report-page .header-actions,
.report-page .model-actions,
.report-page .table-actions,
.report-page .predict-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.report-page .card-header,
.report-page .section-title,
.report-page .chart-toolbar,
.report-page .influence-head,
.report-page .image-toolbar,
.report-page .pagination-row,
.report-page .predict-toolbar,
.report-page .stat-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.report-page :deep(.el-card__header) {
  padding: 9px 12px;
}

.report-page .card-header {
  min-height: 32px;
  padding: 0;
  font-size: 15px;
  font-weight: 700;
}

.report-page .section-title {
  min-height: 32px;
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 700;
}

.report-page :deep(.el-input__wrapper),
.report-page :deep(.el-select__wrapper),
.report-page :deep(.el-date-editor.el-input__wrapper),
.report-page :deep(.el-cascader .el-input__wrapper) {
  min-height: 32px;
  border-radius: 8px;
}

.report-page :deep(.el-button) {
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

.report-page :deep(.el-button--primary:not(.is-plain)),
.report-page :deep(.el-button--success:not(.is-plain)) {
  color: #fff !important;
  background: var(--unified-green) !important;
  border-color: var(--unified-green) !important;
}

.report-page :deep(.el-button--primary:not(.is-plain):hover),
.report-page :deep(.el-button--success:not(.is-plain):hover) {
  background: var(--unified-green-hover) !important;
  border-color: var(--unified-green-hover) !important;
}

.report-page :deep(.el-button.is-plain),
.report-page :deep(.el-button--primary.is-plain),
.report-page :deep(.el-button--success.is-plain) {
  color: var(--unified-green) !important;
  background: #fff !important;
  border-color: #abc9b3 !important;
}

.report-page :deep(.el-button.is-plain:hover),
.report-page :deep(.el-button--primary.is-plain:hover),
.report-page :deep(.el-button--success.is-plain:hover) {
  color: var(--unified-green-hover) !important;
  background: var(--unified-green-soft) !important;
  border-color: #89b397 !important;
}

.report-page :deep(.el-button--danger:not(.is-plain)) {
  color: #fff !important;
  background: #c45656 !important;
  border-color: #c45656 !important;
}

.report-page :deep(.el-button--danger.is-plain) {
  color: #b94a4a !important;
  background: #fff8f7 !important;
  border-color: #e7b5b2 !important;
}

.report-page :deep(.el-button.is-disabled),
.report-page :deep(.el-button.is-disabled:hover) {
  color: #9aa89d !important;
  background: #f0f3ef !important;
  border-color: #dce5db !important;
  box-shadow: none !important;
}

.report-page .workspace-row,
.report-page .overview-grid,
.report-page .main-grid {
  margin-bottom: 10px;
  gap: 10px;
}

.report-page .white-card,
.report-page .panel-card,
.report-page .table-card,
.report-page .report-summary,
.report-page .preview-card,
.report-page .pest-photo-card {
  border-radius: 10px;
}

.report-page .image-toolbar,
.report-page .pagination-row {
  min-height: 48px;
  padding: 8px 12px;
}

.report-page .image-toolbar {
  margin-bottom: 10px;
}

.report-page .pagination-row {
  margin-top: 10px;
}

.report-page .pest-photo-grid {
  gap: 10px;
}

.report-page :deep(.el-table) {
  font-size: 13px;
}

.report-page :deep(.el-table th.el-table__cell),
.report-page :deep(.el-table td.el-table__cell) {
  padding: 7px 0;
}

/* 与物候分析页保持一致的查询、重置按钮。 */
.report-page .search-actions :deep(.el-button:nth-child(1)) {
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

.report-page .search-actions :deep(.el-button:nth-child(1):hover) {
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.report-page .search-actions :deep(.el-button:nth-child(2)) {
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

.report-page .search-actions :deep(.el-button:nth-child(2):hover) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8eb49a !important;
}

/* 与物候趋势图一致的滑动分段按钮。 */
.report-page .series-actions,
.report-page .sub-tabs,
.report-page .view-switch,
.report-page .model-actions :deep(.el-button-group) {
  display: flex;
  padding: 4px;
  gap: 4px;
  background: #edf3ea;
  border: 0;
  border-radius: 10px;
  box-shadow: none;
}

.report-page .series-actions button,
.report-page .sub-tabs button,
.report-page .view-switch button,
.report-page .model-actions :deep(.el-button-group > .el-button) {
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

.report-page .series-actions button:hover,
.report-page .sub-tabs button:hover,
.report-page .view-switch button:hover,
.report-page .model-actions :deep(.el-button-group > .el-button:hover) {
  color: #2f7d5c !important;
  background: #f7faf6 !important;
}

.report-page .series-actions button.active,
.report-page .sub-tabs button.active,
.report-page .view-switch button.active,
.report-page .model-actions :deep(.el-button-group > .el-button--primary) {
  color: #fff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
  box-shadow: 0 1px 4px rgba(24, 98, 70, .12) !important;
}

@media (max-width: 900px) {
  .report-page {
    padding: 10px;
  }

  .report-page .filter-form .search-actions {
    width: 100%;
    margin-left: 0;
  }

  .report-page .search-actions :deep(.el-form-item__content),
  .report-page .button-row {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .report-page .card-header,
  .report-page .section-title,
  .report-page .chart-toolbar,
  .report-page .influence-head,
  .report-page .image-toolbar,
  .report-page .pagination-row {
    align-items: flex-start;
    flex-direction: column;
  }
}

.report-page .generated-report-text {
  white-space: pre-line;
}
</style>

<style scoped>
/* =========================================================
   参考 phenologyMonitor/analysis/index.vue 的最终统一样式
   仅修改排版、字体及指定操作按钮，不修改业务逻辑。
   ========================================================= */

.report-page {
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

.report-page,
.report-page *,
.report-page *::before,
.report-page *::after,
.report-page :deep(*) {
  box-sizing: border-box;
  font-family: inherit !important;
}

/* 页面公共紧凑排版 */
.report-page .module-tabs {
  margin-bottom: 12px;
}

.report-page .filter-card {
  margin-bottom: 12px;
  border-radius: 12px;
}

.report-page .filter-card :deep(.el-card__body) {
  padding: 12px 14px;
}

.report-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.report-page .filter-form :deep(.el-form-item) {
  margin: 0;
}

.report-page .filter-form :deep(.el-form-item__label) {
  height: 32px;
  padding-right: 8px;
  color: #526b5c;
  font-size: 13px;
  font-weight: 600;
  line-height: 32px;
}

.report-page .filter-form :deep(.el-form-item__content) {
  min-height: 32px;
  line-height: 32px;
}

.report-page :deep(.el-input__wrapper),
.report-page :deep(.el-select__wrapper),
.report-page :deep(.el-cascader .el-input__wrapper),
.report-page :deep(.el-date-editor.el-input__wrapper),
.report-page :deep(.el-date-editor--daterange) {
  min-height: 32px;
  border-radius: 8px;
}

.report-page .button-row,
.report-page .search-actions :deep(.el-form-item__content),
.report-page .header-actions,
.report-page .model-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* 所有指定按钮统一尺寸 */
.report-page :deep(.reference-action-btn) {
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
.report-page :deep(.reference-primary-btn),
.report-page :deep(.reference-primary-btn.is-plain),
.report-page :deep(.reference-primary-btn.el-button--success),
.report-page :deep(.reference-primary-btn.el-button--danger) {
  color: #ffffff !important;
  background: #2f7d5c !important;
  border-color: #2f7d5c !important;
}

.report-page :deep(.reference-primary-btn:hover),
.report-page :deep(.reference-primary-btn:focus) {
  color: #ffffff !important;
  background: #3f8d69 !important;
  border-color: #3f8d69 !important;
}

.report-page :deep(.reference-primary-btn:active) {
  color: #ffffff !important;
  background: #245f47 !important;
  border-color: #245f47 !important;
}

/* 次操作：与“重置”按钮一致 */
.report-page :deep(.reference-secondary-btn),
.report-page :deep(.reference-secondary-btn.is-plain),
.report-page :deep(.reference-secondary-btn.el-button--success),
.report-page :deep(.reference-secondary-btn.el-button--danger) {
  color: #606266 !important;
  background: #ffffff !important;
  border-color: #dcdfe6 !important;
}

.report-page :deep(.reference-secondary-btn:hover),
.report-page :deep(.reference-secondary-btn:focus) {
  color: #2f7d5c !important;
  background: #f1f7ef !important;
  border-color: #8bb59a !important;
}

.report-page :deep(.reference-secondary-btn:active) {
  color: #245f47 !important;
  background: #e8f2e7 !important;
  border-color: #6fa181 !important;
}

/* 禁用状态统一，不再保留红色、蓝色或 success 差异 */
.report-page :deep(.reference-action-btn.is-disabled),
.report-page :deep(.reference-action-btn.is-disabled:hover),
.report-page :deep(.reference-action-btn.is-disabled:focus) {
  color: #a8abb2 !important;
  background: #f5f7fa !important;
  border-color: #e4e7ed !important;
  opacity: 1 !important;
  cursor: not-allowed !important;
}

/* 卡片、表格和标题字体统一 */
.report-page :deep(.el-card) {
  border-radius: 12px;
}

.report-page :deep(.el-card__header) {
  min-height: 48px;
  padding: 9px 14px;
}

.report-page .card-header,
.report-page .section-title {
  color: #24352d;
  font-size: 15px;
  font-weight: 700;
}

.report-page :deep(.el-table) {
  font-family: inherit;
  font-size: 13px;
}

.report-page :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}


.report-page .search-actions {
  min-width: 0;
  flex: 1 1 520px;
  margin-left: 0;
}

.report-page .button-row {
  justify-content: flex-start;
}

.report-page .main-grid {
  gap: 12px;
  margin-bottom: 12px;
}

.report-page .table-card,
.report-page .report-summary,
.report-page .preview-card {
  border-radius: 12px;
}


@media (max-width: 900px) {
  .report-page {
    padding: 10px;
  }

  .report-page .filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .report-page .filter-form :deep(.el-form-item) {
    width: 100%;
  }

  .report-page .button-row,
  .report-page .search-actions :deep(.el-form-item__content),
  .report-page .header-actions,
  .report-page .model-actions {
    justify-content: flex-start;
  }
}
</style>

<style scoped>
/* CODEX-XWQ-SHARP-STYLE: remove this block to roll back the near-right-angle theme. */
.report-page {
  --sharp-radius: 1px;
  --sharp-border: #d5e5d6;
  --sharp-border-hover: #a9c9b2;
  --sharp-inner-border: #dce8d8;
  --sharp-inner-bg: #fbfdf9;
}

.report-page .module-tabs,
.report-page .module-tabs .tab,
.report-page .module-tabs .tab.active::after,
.report-page .filter-card,
.report-page .table-card,
.report-page .report-summary,
.report-page .preview-card,
.report-page .summary-kpis > div,
.report-page .mini-block,
.report-page .pest-tags span,
.report-page .report-paper,
.report-page .pagination-row,
.report-page :deep(.el-card),
.report-page :deep(.el-card__header),
.report-page :deep(.el-card__body),
.report-page :deep(.el-button),
.report-page :deep(.el-button-group),
.report-page :deep(.el-input__wrapper),
.report-page :deep(.el-select__wrapper),
.report-page :deep(.el-cascader .el-input__wrapper),
.report-page :deep(.el-date-editor.el-input__wrapper),
.report-page :deep(.el-tag),
.report-page :deep(.el-progress-bar__outer),
.report-page :deep(.el-progress-bar__inner),
.report-page :deep(.el-table),
.report-page :deep(.el-table__inner-wrapper),
.report-page :deep(.el-pagination button),
.report-page :deep(.el-pager li) {
  border-radius: var(--sharp-radius) !important;
}

.report-page .filter-card,
.report-page .table-card,
.report-page .report-summary,
.report-page .preview-card,
.report-page :deep(.el-card) {
  background: #ffffff !important;
  border-color: var(--sharp-border) !important;
  box-shadow: 0 4px 12px rgba(63, 91, 70, 0.04) !important;
}

.report-page .filter-card:hover,
.report-page .table-card:hover,
.report-page .report-summary:hover,
.report-page .preview-card:hover,
.report-page :deep(.el-card:hover) {
  border-color: var(--sharp-border-hover) !important;
  box-shadow: 0 6px 16px rgba(63, 91, 70, 0.07) !important;
  transform: none !important;
}

.report-page .summary-kpis > div,
.report-page .mini-block,
.report-page .pest-tags span {
  background: var(--sharp-inner-bg) !important;
  border-color: var(--sharp-inner-border) !important;
}

.report-page :deep(.el-button) {
  box-shadow: none !important;
  transform: none !important;
}

.report-page :deep(.el-input__wrapper),
.report-page :deep(.el-select__wrapper),
.report-page :deep(.el-cascader .el-input__wrapper),
.report-page :deep(.el-date-editor.el-input__wrapper) {
  background: #fbfcfa !important;
  box-shadow: 0 0 0 1px #dce7da inset !important;
}

.report-page :deep(.el-input__wrapper.is-focus),
.report-page :deep(.el-select__wrapper.is-focused),
.report-page :deep(.el-cascader .el-input__wrapper.is-focus),
.report-page :deep(.el-date-editor.el-input__wrapper.is-active) {
  box-shadow: 0 0 0 1px #2f7d5c inset !important;
}

.report-page :deep(.el-progress-bar__outer) {
  background: #edf3ea !important;
}

.report-page :deep(.el-progress-bar__inner) {
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
