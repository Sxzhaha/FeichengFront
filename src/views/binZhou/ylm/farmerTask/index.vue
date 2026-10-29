<template>
  <div class="farmer-task-page">
    <div class="farmer-layout">
      <aside class="statistics-sidebar">
        <div class="statistics-title">
          <span class="statistics-icon" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </span>
          <div>
            <h3>数据统计</h3>
            <p>随筛选条件实时更新</p>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span>按作业方式统计</span>
            <em>单位：条</em>
          </div>
          <div ref="workMethodChartRef" class="chart-box"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span>按农事类型统计</span>
            <em>单位：条</em>
          </div>
          <div ref="workTypeChartRef" class="chart-box"></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <span>按园区统计</span>
            <em>单位：条</em>
          </div>
          <div ref="parkChartRef" class="chart-box"></div>
        </div>
      </aside>
      <main class="farmer-main">
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card stat-total">
          <div class="stat-card-content">
            <div class="stat-icon stat-icon-total">
              <el-icon><Tickets /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">全部农事记录</div>
              <div class="stat-value">{{ stat.total }}<span>条</span></div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card stat-month">
          <div class="stat-card-content">
            <div class="stat-icon stat-icon-month">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">本月农事记录</div>
              <div class="stat-value">{{ stat.month }}<span>条</span></div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card stat-week">
          <div class="stat-card-content">
            <div class="stat-icon stat-icon-week">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">近七天农事记录</div>
              <div class="stat-value">{{ stat.week }}<span>条</span></div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-form :inline="true" :model="queryParams" class="filter-form" label-width="76px">
      <el-form-item label="任务编号" class="filter-item filter-task-no">
        <el-input
          v-model="queryParams.taskNo"
          placeholder="请输入任务编号"
          clearable
          class="filter-control"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="农事类型" class="filter-item filter-work-type">
        <el-select v-model="queryParams.workTypeId" placeholder="请选择农事类型" clearable class="filter-control">
          <el-option v-for="d in workTypeOptions" :key="d.dictValue" :label="d.dictLabel" :value="d.dictValue" />
        </el-select>
      </el-form-item>
      <el-form-item label="作业方式" class="filter-item filter-work-method">
        <el-select v-model="queryParams.workMethodId" placeholder="请选择作业方式" clearable class="filter-control">
          <el-option v-for="d in workMethodOptions" :key="d.dictValue" :label="d.dictLabel" :value="d.dictValue" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建人" class="filter-item filter-creator">
        <el-input
          v-model="queryParams.createById"
          placeholder="请输入创建人"
          clearable
          class="filter-control"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item class="filter-action-item">
        <div class="query-actions">
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </div>
      </el-form-item>
    </el-form>

    <div class="action-row toolbar">
      <div class="toolbar-left">
        <el-button class="toolbar-button home-primary-button" icon="HomeFilled" @click="goHome">返回首页</el-button>
        <el-button class="toolbar-button record-secondary-button" icon="Plus" :loading="taskNoGenerating" :disabled="taskNoGenerating" @click="handleAdd">新增记录</el-button>
        <el-button class="toolbar-button record-secondary-button" icon="Download" @click="handleExport">导出记录</el-button>
        <el-button class="toolbar-button record-secondary-button" icon="Upload" @click="openImportDialog">批量导入</el-button>
        <el-button class="toolbar-button record-secondary-button" icon="User" @click="toggleMineView">{{ mineButtonText }}</el-button>
      </div>
    </div>

    <div v-loading="loading" class="record-list">
      <el-empty v-if="!loading && taskList.length === 0" description="暂无农事记录" />

      <el-card v-for="(item, index) in taskList" :key="item.id" class="record-card" shadow="never">
        <div class="record-card-shell" :class="{ 'is-expanded': isRecordExpanded(item, index) }">
          <div class="record-summary-bar" @click="toggleRecord(item, index)">
            <div class="summary-title-group">
              <div class="summary-mark">农事</div>
              <div class="summary-title-text">
                <span>任务编号</span>
                <strong>{{ item.taskNo || '-' }}</strong>
              </div>
            </div>
            <div class="summary-field">
              <span>农事类型</span>
              <strong>{{ getDict(workTypeOptions, item.workTypeId) || '-' }}</strong>
            </div>
            <div class="summary-field">
              <span>作业方式</span>
              <strong>{{ getDict(workMethodOptions, item.workMethodId) || '-' }}</strong>
            </div>
            <div class="summary-field">
              <span>创建人</span>
              <strong>{{ getCreatorName(item) }}</strong>
            </div>
            <div class="summary-status">
              <span :class="['status-pill', canModifyRecord(item) ? 'editable' : 'readonly']">
                {{ canModifyRecord(item) ? '可编辑' : '仅查看' }}
              </span>
              <span class="expand-text">{{ isRecordExpanded(item, index) ? '收起详情' : '展开详情' }}</span>
            </div>
          </div>

          <transition name="record-expand">
            <div v-show="isRecordExpanded(item, index)" class="record-detail">
              <div class="detail-photo-panel">
                <div class="record-photo">
                  <image-preview
                    v-if="imagePreviewSrc(item.photoUrls)"
                    :src="imagePreviewSrc(item.photoUrls)"
                    width="100%"
                    height="100%"
                  />
                  <div v-else class="photo-empty">暂无照片</div>
                  <span v-if="imageCount(item.photoUrls) > 1" class="photo-count">{{ imageCount(item.photoUrls) }}张</span>
                </div>
              </div>

              <div class="detail-core-panel">
                <div class="time-info-grid">
                  <div class="info-card">
                    <span>开始时间</span>
                    <strong>{{ parseTime(item.startTime, '{y}-{m}-{d} {h}:{i}') || '-' }}</strong>
                  </div>
                  <div class="info-card">
                    <span>结束时间</span>
                    <strong>{{ parseTime(item.endTime, '{y}-{m}-{d} {h}:{i}') || '-' }}</strong>
                  </div>
                </div>
                <div class="info-card area-card">
                  <span>区域</span>
                  <strong>{{ getRegionName(item) }}</strong>
                </div>
              </div>

              <div class="detail-meta-panel">
                <div class="creator-card">
                  <span>创建时间</span>
                  <strong>{{ parseTime(item.createTime, '{y}-{m}-{d} {h}:{i}') || '-' }}</strong>
                </div>
                <div class="operator-card">
                  <span>操作人</span>
                  <strong>{{ getDict(operatorOptions, item.operatorId) || '-' }}</strong>
                </div>
                <div class="remark-card">
                  <span>备注</span>
                  <p>{{ item.remark || '-' }}</p>
                </div>
              </div>

              <div class="detail-actions-panel">
                <div :class="['detail-status', canModifyRecord(item) ? 'editable' : 'readonly']">
                  {{ canModifyRecord(item) ? '可编辑' : '仅查看' }}
                </div>
                <div class="side-actions">
                  <template v-if="isOwnRecord(item)">
                    <el-button class="record-action edit-action" icon="Edit" @click="handleUpdate(item)">编辑</el-button>
                    <el-button class="record-action delete-action" icon="Delete" @click="handleDelete(item)">删除</el-button>
                  </template>
                  <div v-else class="readonly-tip">{{ getReadonlyTip(item) }}</div>
                </div>
              </div>

              <div class="description-card">
                <span>任务描述</span>
                <p>{{ item.description || '-' }}</p>
              </div>
            </div>
          </transition>
        </div>
      </el-card>
    </div>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
      </main>
    </div>

    <el-dialog v-model="open" :title="dialogTitle" width="620px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="96px" :hide-required-asterisk="false">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="任务编号" prop="taskNo">
              <el-input v-model="form.taskNo" placeholder="请输入任务编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="农事类型" prop="workTypeId">
              <el-select v-model="form.workTypeId" placeholder="请选择农事类型" clearable class="full-control">
                <el-option v-for="d in workTypeOptions" :key="d.dictValue" :label="d.dictLabel" :value="d.dictValue" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作业方式" prop="workMethodId">
              <el-select v-model="form.workMethodId" placeholder="请选择作业方式" clearable class="full-control">
                <el-option v-for="d in workMethodOptions" :key="d.dictValue" :label="d.dictLabel" :value="d.dictValue" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域" prop="regionValue">
              <el-cascader
                v-model="form.regionValue"
                :options="regionOptions"
                :props="regionProps"
                placeholder="请选择区域"
                clearable
                filterable
                class="full-control"
                @change="handleRegionChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="创建人">
              <el-input :model-value="currentUserName" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作人" prop="operatorId">
              <el-select
                v-model="form.operatorId"
                placeholder="请选择操作人"
                clearable
                multiple
                collapse-tags
                collapse-tags-tooltip
                class="full-control"
              >
                <el-option v-for="d in operatorOptions" :key="d.dictValue" :label="d.dictLabel" :value="d.dictValue" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="任务描述">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入任务描述" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="农事图片">
              <image-upload v-model="form.photoUrls" :limit="6" :file-size="8" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择开始时间"
                class="full-control"
                @change="revalidateEndTime"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择结束时间"
                class="full-control"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="open = false">取消</el-button>
        <el-button type="primary" @click="submitForm">{{ dialogMode === 'add' ? '新增' : '提交' }}</el-button>
      </template>
    </el-dialog>

    <AgriTaskImportDialog v-model="importOpen" @success="handleImportSuccess" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import AgriTaskImportDialog from '../components/AgriTaskImportDialog.vue'
import { listFarmerTask, listMyFarmerTask, getFarmerTask, submitTask, addFarmerTask, delFarmerTask, listRegionTree, exportFarmerTask, exportMyFarmerTask, generateTaskNo } from '@/api/binZhou/ylm/task'
import { getDicts } from '@/api/system/dict/data'
import { listUser } from '@/api/system/user'
import { parseTime } from '@/utils/ruoyi'
import { checkPermi } from '@/utils/permission'
import { parsePhotoUrls, stringifyPhotoUrls } from '@/utils/image'
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const taskList = ref([])
const open = ref(false)
const total = ref(0)
const dialogMode = ref('edit')
const dialogTitle = computed(() => dialogMode.value === 'add' ? '新增农事记录' : '提交农事记录')
const onlyMine = ref(false)
const mineButtonText = computed(() => onlyMine.value ? '全部记录' : '我的记录')
const currentUserId = computed(() => String(userStore.id || ''))
const currentUserName = computed(() => userStore.nickName || userStore.name || currentUserId.value)
const canLoadUserList = computed(() => checkPermi(['system:user:list']))
const expandedRecordIds = ref([])

const workTypeOptions = ref([])
const workMethodOptions = ref([])
const operatorOptions = ref([])
const userOptions = ref([])
const regionOptions = ref([])
const workMethodChartRef = ref(null)
const workTypeChartRef = ref(null)
const parkChartRef = ref(null)
const chartInstances = {}
const regionProps = {
  value: 'value',
  label: 'label',
  children: 'children',
  emitPath: true
}

const stat = reactive({
  total: 0,
  month: 0,
  week: 0
})

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  taskNo: '',
  workTypeId: '',
  workMethodId: '',
  createById: ''
})

const formRef = ref(null)
const form = reactive({})
const importOpen = ref(false)
const taskNoGenerating = ref(false)

function toTime(value) {
  if (!value) {
    return NaN
  }
  return new Date(String(value).replace(/-/g, '/')).getTime()
}

function validateTimeRange(rule, value, callback) {
  if (!form.startTime || !form.endTime) {
    callback()
    return
  }
  const start = toTime(form.startTime)
  const end = toTime(form.endTime)
  if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
    callback(new Error('结束时间不能早于开始时间'))
    return
  }
  callback()
}

function validateRegion(rule, value, callback) {
  const path = Array.isArray(form.regionValue) ? form.regionValue : []
  if (form.locationId && path.length >= 3) {
    callback()
    return
  }
  callback(new Error('请选择区域'))
}

function validateOperator(rule, value, callback) {
  if (splitDictValues(form.operatorId).length) {
    callback()
    return
  }
  callback(new Error('请选择操作人'))
}

const formRules = {
  taskNo: [{ required: true, message: '任务编号不能为空', trigger: 'blur' }],
  workTypeId: [{ required: true, message: '农事类型不能为空', trigger: 'change' }],
  workMethodId: [{ required: true, message: '作业方式不能为空', trigger: 'change' }],
  regionValue: [
    { required: true, type: 'array', min: 3, message: '请选择区域', trigger: 'change' },
    { validator: validateRegion, trigger: 'change' }
  ],
  operatorId: [
    { required: true, type: 'array', min: 1, message: '请选择操作人', trigger: 'change' },
    { validator: validateOperator, trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '开始时间不能为空', trigger: 'change' },
    { validator: validateTimeRange, trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '结束时间不能为空', trigger: 'change' },
    { validator: validateTimeRange, trigger: 'change' }
  ]
}

onMounted(async () => {
  if (!userStore.id) {
    await userStore.getInfo()
  }
  workTypeOptions.value = normalizeDictOptions((await getDicts('ylm_agri_work_type')).data)
  workMethodOptions.value = normalizeDictOptions((await getDicts('ylm_agri_work_method')).data)
  operatorOptions.value = normalizeDictOptions((await getDicts('ylm_agri_operator')).data)
  await loadUserOptions()
  try {
    regionOptions.value = buildRegionOptions((await listRegionTree()).data || [])
  } catch (error) {
    regionOptions.value = []
    console.error('区域数据加载失败', error)
  }
  getList()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  Object.values(chartInstances).forEach(chart => chart && chart.dispose())
})

function getList() {
  loading.value = true
  const request = onlyMine.value ? listMyFarmerTask : listFarmerTask
  request(queryParams).then(res => {
    const rawRows = res.rows || []
    const rows = getVisibleRows(rawRows)
    const hasFilteredRows = onlyMine.value && rows.length !== rawRows.length
    taskList.value = rows
    syncExpandedRecords(taskList.value)
    total.value = hasFilteredRows ? rows.length : (res.total || 0)
    stat.total = hasFilteredRows ? rows.length : (res.total || 0)
    if (hasFilteredRows) {
      const recentStats = getRecentStats(rows)
      stat.month = recentStats.month
      stat.week = recentStats.week
    } else {
      stat.month = res.monthCount || 0
      stat.week = res.weekCount || 0
    }
    refreshChartData()
  }).finally(() => {
    loading.value = false
  })
}

function getDict(list, val) {
  const values = splitDictValues(val)
  if (!values.length) {
    return ''
  }
  return values.map(value => {
    const item = list.find(i => i.dictValue == value)
    return item ? item.dictLabel : value
  }).join('、')
}

function normalizeDictOptions(list = []) {
  return list.map(item => ({
    ...item,
    dictValue: item.dictValue === undefined || item.dictValue === null ? '' : String(item.dictValue)
  }))
}

function normalizeDictValue(value) {
  return value === undefined || value === null ? '' : String(value)
}

function splitDictValues(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeDictValue).filter(Boolean)
  }
  return normalizeDictValue(value).split(',').map(item => item.trim()).filter(Boolean)
}

function joinDictValues(value) {
  return splitDictValues(value).join(',')
}

function normalizeFormDictValues() {
  form.workTypeId = normalizeDictValue(form.workTypeId)
  form.workMethodId = normalizeDictValue(form.workMethodId)
  form.operatorId = splitDictValues(form.operatorId)
}

function getCreatorName(row) {
  return row?.createByName || row?.creatorName || getDict(userOptions.value, row?.createById) || '-'
}

function getWorkTypeName(row) {
  return row?.workTypeName || getDict(workTypeOptions.value, row?.workTypeId) || '-'
}

function getWorkMethodName(row) {
  return row?.workMethodName || getDict(workMethodOptions.value, row?.workMethodId) || '-'
}

function getOperatorName(row) {
  return row?.operatorName || getDict(operatorOptions.value, row?.operatorId) || '-'
}

function refreshChartData() {
  const request = onlyMine.value ? listMyFarmerTask : listFarmerTask
  const chartQuery = { ...queryParams, pageNum: 1, pageSize: 10000 }
  request(chartQuery).then(res => {
    renderStatisticsCharts(getVisibleRows(res.rows || []))
  }).catch(() => {
    renderStatisticsCharts(taskList.value || [])
  })
}

function renderStatisticsCharts(rows = []) {
  const workMethodData = buildCountData(rows, row => getDict(workMethodOptions.value, row.workMethodId) || '未设置')
  const workTypeData = buildCountData(rows, row => getDict(workTypeOptions.value, row.workTypeId) || '未设置')
  const parkData = buildCountData(rows, row => getParkName(row))
  nextTick(() => {
    renderBarChart('workMethod', workMethodChartRef.value, workMethodData)
    renderDonutChart('workType', workTypeChartRef.value, workTypeData)
    renderBarChart('park', parkChartRef.value, parkData)
  })
}

function buildCountData(rows, getLabel) {
  const countMap = new Map()
  rows.forEach(row => {
    const label = getLabel(row) || '未设置'
    countMap.set(label, (countMap.get(label) || 0) + 1)
  })
  return Array.from(countMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

const chartFontFamily = 'Microsoft YaHei, Arial, sans-serif'
const chartTextPrimary = '#253f34'
const chartTextSecondary = '#60756a'
const chartFieldValue = '#2f463b'
const donutChartCenter = ['31%', '50%']
const agricultureTypeColors = [
  '#2F855A',
  '#4C9F70',
  '#8CBF5A',
  '#7AA65A',
  '#B7C96B',
  '#5E8B7E',
  '#C9B458',
  '#8A6F55',
  '#63A35C',
  '#7AA6A1'
]
const agricultureTypeColorMap = {
  割草: '#2F855A',
  浇水: '#4C9F70',
  耕地: '#8CBF5A',
  选果: '#7AA65A',
  包装: '#B7C96B',
  摘袋: '#5E8B7E',
  打草: '#C9B458',
  施肥: '#8A6F55',
  修建: '#63A35C',
  修剪: '#63A35C',
  清库: '#7AA6A1'
}
const xlsxContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function renderBarChart(key, el, data) {
  if (!el) {
    return
  }
  if (!chartInstances[key]) {
    chartInstances[key] = echarts.init(el)
  }
  const chartData = data.length ? data : [{ name: '暂无数据', value: 0 }]
  chartInstances[key].setOption({
    grid: { top: 30, right: 14, bottom: 34, left: 34 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: {
        color: chartTextPrimary,
        fontSize: 13,
        fontWeight: 400,
        fontFamily: chartFontFamily,
        lineHeight: 18
      },
      formatter: params => {
        const item = params && params[0]
        return item ? `${item.name}<br/>数量：${item.value} 条` : ''
      }
    },
    xAxis: {
      type: 'category',
      data: chartData.map(item => item.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#c8d8ca' } },
      axisLabel: { color: chartTextSecondary, fontSize: 12, fontWeight: 400, fontFamily: chartFontFamily, interval: 0, overflow: 'truncate', width: 54 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#edf3ea' } },
      axisLabel: { color: chartTextSecondary, fontSize: 12, fontWeight: 400, fontFamily: chartFontFamily }
    },
    series: [{
      type: 'bar',
      data: chartData.map(item => item.value),
      barMaxWidth: 28,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#4f8f6b' },
          { offset: 1, color: '#2f7d5c' }
        ])
      },
      label: { show: true, position: 'top', color: chartFieldValue, fontSize: 13, fontWeight: 600, fontFamily: chartFontFamily }
    }]
  }, true)
}

function truncateChartText(value, maxLength = 5) {
  const text = String(value || '')
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function normalizeDonutData(data = []) {
  return data
    .map((item, index) => ({
      name: item?.name === undefined || item?.name === null ? '' : String(item.name).trim(),
      value: Number(item?.value),
      originalIndex: index
    }))
    .filter(item => item.name && Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value || a.originalIndex - b.originalIndex)
    .map(({ originalIndex, ...item }) => item)
}

function formatChartPercent(value, total) {
  if (!total) {
    return '0.0'
  }
  return ((Number(value || 0) / total) * 100).toFixed(1)
}

function getAgricultureTypeColor(name) {
  const typeName = String(name || '').trim()
  if (agricultureTypeColorMap[typeName]) {
    return agricultureTypeColorMap[typeName]
  }
  const dictIndex = workTypeOptions.value.findIndex(item => item.dictLabel === typeName)
  if (dictIndex >= 0) {
    return agricultureTypeColors[dictIndex % agricultureTypeColors.length]
  }
  let hash = 0
  for (let index = 0; index < typeName.length; index += 1) {
    hash = ((hash << 5) - hash) + typeName.charCodeAt(index)
    hash |= 0
  }
  return agricultureTypeColors[Math.abs(hash) % agricultureTypeColors.length]
}

function resolveChartPosition(value, total) {
  if (typeof value === 'string' && value.endsWith('%')) {
    return total * (Number.parseFloat(value) / 100)
  }
  return Number(value) || 0
}

function buildDonutCenterGraphic(value, label, chart) {
  const centerX = resolveChartPosition(donutChartCenter[0], chart?.getWidth?.() || 0)
  const centerY = resolveChartPosition(donutChartCenter[1], chart?.getHeight?.() || 0)
  return [
    {
      id: 'donut-center',
      type: 'group',
      x: centerX,
      y: centerY,
      silent: true,
      children: [
        {
          type: 'text',
          x: 0,
          y: -13,
          style: {
            text: String(value),
            textAlign: 'center',
            textVerticalAlign: 'middle',
            fill: chartFieldValue,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: chartFontFamily
          }
        },
        {
          type: 'text',
          x: 0,
          y: 13,
          style: {
            text: String(label || ''),
            width: 82,
            overflow: 'truncate',
            textAlign: 'center',
            textVerticalAlign: 'middle',
            fill: chartTextSecondary,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: chartFontFamily
          }
        }
      ]
    }
  ]
}

function renderDonutChart(key, el, data) {
  if (!el) {
    return
  }
  if (!chartInstances[key]) {
    chartInstances[key] = echarts.init(el)
  }
  const chart = chartInstances[key]
  const normalizedData = normalizeDonutData(data)
  const hasData = normalizedData.length > 0
  const totalCount = normalizedData.reduce((sum, item) => sum + item.value, 0)
  const chartData = normalizedData
  const seriesData = chartData.map(item => ({
    ...item,
    itemStyle: { color: getAgricultureTypeColor(item.name) }
  }))
  const legendValueMap = new Map(chartData.map(item => [item.name, item.value]))
  chart.setOption({
    color: agricultureTypeColors,
    tooltip: {
      show: hasData,
      trigger: 'item',
      confine: true,
      textStyle: {
        color: chartTextPrimary,
        fontSize: 13,
        fontWeight: 400,
        fontFamily: chartFontFamily,
        lineHeight: 18
      },
      formatter: params => `${params.name}<br/>数量：${params.value} 条<br/>占比：${formatChartPercent(params.value, totalCount)}%`
    },
    legend: {
      show: hasData,
      type: 'scroll',
      orient: 'vertical',
      top: 18,
      right: 0,
      bottom: 8,
      width: 118,
      data: chartData.map(item => item.name),
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 8,
      icon: 'circle',
      selectedMode: false,
      formatter: name => `{name|${truncateChartText(name, 4)}}{value|${legendValueMap.get(name) || 0}条}`,
      tooltip: {
        show: true,
        formatter: params => {
          const name = params?.name || params
          return `${name} ${legendValueMap.get(name) || 0}条`
        }
      },
      pageIconSize: 8,
      pageButtonItemGap: 3,
      pageIconColor: chartTextSecondary,
      pageIconInactiveColor: '#c9d5cf',
      pageTextStyle: { color: chartTextSecondary, fontSize: 12, fontWeight: 400, fontFamily: chartFontFamily },
      textStyle: {
        color: chartTextSecondary,
        fontSize: 12,
        fontWeight: 400,
        fontFamily: chartFontFamily,
        rich: {
          name: {
            color: chartTextSecondary,
            fontSize: 12,
            fontWeight: 400,
            fontFamily: chartFontFamily
          },
          value: {
            padding: [0, 0, 0, 10],
            color: chartFieldValue,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: chartFontFamily
          }
        }
      }
    },
    graphic: hasData ? buildDonutCenterGraphic(totalCount, '总数', chart) : {
      type: 'text',
      left: 'center',
      top: 'middle',
      silent: true,
      style: {
        text: '暂无农事类型统计数据',
        textAlign: 'center',
        fill: chartTextSecondary,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: chartFontFamily
      }
    },
    series: [{
      name: '农事类型',
      type: 'pie',
      radius: ['44%', '67%'],
      center: donutChartCenter,
      avoidLabelOverlap: false,
      minShowLabelAngle: 0,
      minAngle: 4,
      itemStyle: {
        borderColor: '#ffffff',
        borderWidth: 3,
        borderRadius: 6
      },
      label: {
        show: false
      },
      labelLine: {
        show: false
      },
      data: seriesData
    }]
  }, true)
  chart.off('mouseover')
  chart.off('mouseout')
  chart.off('globalout')
  if (hasData) {
    chart.__donutCenterState = { value: totalCount, label: '总数' }
    chart.on('mouseover', params => {
      if (params.componentType === 'series' && params.seriesType === 'pie') {
        chart.__donutCenterState = { value: params.value, label: params.name }
        chart.setOption({
          graphic: buildDonutCenterGraphic(params.value, params.name, chart)
        })
      }
    })
    chart.on('mouseout', params => {
      if (params.componentType === 'series' && params.seriesType === 'pie') {
        chart.__donutCenterState = { value: totalCount, label: '总数' }
        chart.setOption({
          graphic: buildDonutCenterGraphic(totalCount, '总数', chart)
        })
      }
    })
    chart.on('globalout', () => {
      chart.__donutCenterState = { value: totalCount, label: '总数' }
      chart.setOption({
        graphic: buildDonutCenterGraphic(totalCount, '总数', chart)
      })
    })
  } else {
    chart.__donutCenterState = null
  }
}

function resizeCharts() {
  Object.values(chartInstances).forEach(chart => {
    if (!chart) {
      return
    }
    chart.resize()
    if (chart.__donutCenterState) {
      chart.setOption({
        graphic: buildDonutCenterGraphic(chart.__donutCenterState.value, chart.__donutCenterState.label, chart)
      })
    }
  })
}

function getParkName(row) {
  if (row?.parkName) {
    return row.parkName
  }
  const path = getRegionPathFromOptions(row)
  const park = regionOptions.value.find(item => String(item.value) === String(path[0]))
  return park?.label || '未设置园区'
}

function getRegionName(row) {
  const names = [row?.parkName, row?.areaName, row?.locationName].filter(Boolean)
  return row?.regionFullName || names.join('') || getRegionNameFromOptions(row) || row?.areaId || '-'
}

function readRegionField(row, ...names) {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name]
    }
  }
  return null
}

function normalizeRegionId(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? value : numberValue
}

function buildRegionOptions(rows = []) {
  const parks = []
  const parkMap = new Map()
  rows.forEach(row => {
    const parkId = readRegionField(row, 'parkId', 'park_id', 'PARK_ID', 'PARKID')
    const parkName = readRegionField(row, 'parkName', 'park_name', 'PARK_NAME', 'PARKNAME')
    const areaId = readRegionField(row, 'areaId', 'area_id', 'AREA_ID', 'AREAID')
    const areaName = readRegionField(row, 'areaName', 'area_name', 'AREA_NAME', 'AREANAME')
    const locationId = readRegionField(row, 'locationId', 'location_id', 'LOCATION_ID', 'LOCATIONID')
    const locationName = readRegionField(row, 'locationName', 'location_name', 'LOCATION_NAME', 'LOCATIONNAME')
    if (!parkId) {
      return
    }
    const parkKey = String(parkId)
    if (!parkMap.has(parkKey)) {
      const park = { value: normalizeRegionId(parkId), label: parkName || parkKey, children: [], areaMap: new Map() }
      parkMap.set(parkKey, park)
      parks.push(park)
    }
    if (!areaId) {
      return
    }
    const park = parkMap.get(parkKey)
    const areaKey = String(areaId)
    if (!park.areaMap.has(areaKey)) {
      const area = { value: normalizeRegionId(areaId), label: areaName || areaKey, children: [] }
      park.areaMap.set(areaKey, area)
      park.children.push(area)
    }
    if (locationId) {
      park.areaMap.get(areaKey).children.push({
        value: normalizeRegionId(locationId),
        label: locationName || String(locationId)
      })
    }
  })
  return parks.map(park => {
    const { areaMap, ...option } = park
    return option
  })
}

function getRegionValue(row) {
  if (row?.parkId && row?.areaId && row?.locationId) {
    return [normalizeRegionId(row.parkId), normalizeRegionId(row.areaId), normalizeRegionId(row.locationId)]
  }
  return getRegionPathFromOptions(row)
}

function handleRegionChange(value) {
  const path = Array.isArray(value) ? value : []
  form.areaId = normalizeRegionId(path[1])
  form.locationId = normalizeRegionId(path[2])
}

function revalidateEndTime() {
  formRef.value?.validateField('endTime')
}

function buildSubmitPayload() {
  handleRegionChange(form.regionValue)
  const { regionValue, ...payload } = form
  return {
    ...payload,
    photoUrls: stringifyPhotoUrls(payload.photoUrls),
    workTypeId: normalizeRegionId(payload.workTypeId),
    workMethodId: normalizeRegionId(payload.workMethodId),
    operatorId: joinDictValues(payload.operatorId),
    areaId: normalizeRegionId(payload.areaId),
    locationId: normalizeRegionId(payload.locationId)
  }
}

function getRegionPathFromOptions(row) {
  const areaId = normalizeRegionId(row?.areaId)
  const locationId = normalizeRegionId(row?.locationId)
  if (!areaId && !locationId) {
    return []
  }
  for (const park of regionOptions.value) {
    for (const area of park.children || []) {
      const locations = area.children || []
      const location = locationId ? locations.find(item => String(item.value) === String(locationId)) : null
      if (location) {
        return [park.value, area.value, location.value]
      }
      if (areaId && String(area.value) === String(areaId)) {
        const firstLocation = locations[0]
        return firstLocation ? [park.value, area.value, firstLocation.value] : [park.value, area.value]
      }
    }
  }
  return []
}

function getRegionNameFromOptions(row) {
  const path = getRegionPathFromOptions(row)
  if (!path.length) {
    return ''
  }
  const park = regionOptions.value.find(item => String(item.value) === String(path[0]))
  const area = (park?.children || []).find(item => String(item.value) === String(path[1]))
  const location = (area?.children || []).find(item => String(item.value) === String(path[2]))
  return [park?.label, area?.label, location?.label].filter(Boolean).join('')
}

function normalizeUsers(list = []) {
  return list.map(user => ({
    dictLabel: user.nickName || user.userName,
    dictValue: String(user.userId),
    label: user.nickName || user.userName,
    value: String(user.userId)
  }))
}

async function loadUserOptions() {
  if (!canLoadUserList.value) {
    userOptions.value = normalizeUsers([{
      userId: currentUserId.value,
      nickName: currentUserName.value,
      userName: userStore.name
    }])
    return
  }
  try {
    userOptions.value = normalizeUsers((await listUser({ pageNum: 1, pageSize: 1000 })).rows || [])
  } catch (error) {
    userOptions.value = normalizeUsers([{
      userId: currentUserId.value,
      nickName: currentUserName.value,
      userName: userStore.name
    }])
    console.error('用户列表加载失败', error)
  }
}

function splitImages(urls) {
  return parsePhotoUrls(urls)
}

function imagePreviewSrc(urls) {
  return stringifyPhotoUrls(urls)
}

function imageCount(urls) {
  return splitImages(urls).length
}

function getRecordKey(row, index) {
  return String(row?.id ?? row?.taskNo ?? index)
}

function isRecordExpanded(row, index) {
  return expandedRecordIds.value.includes(getRecordKey(row, index))
}

function toggleRecord(row, index) {
  const key = getRecordKey(row, index)
  if (expandedRecordIds.value.includes(key)) {
    expandedRecordIds.value = expandedRecordIds.value.filter(item => item !== key)
    return
  }
  expandedRecordIds.value = [...expandedRecordIds.value, key]
}

function syncExpandedRecords(list = []) {
  if (!list.length) {
    expandedRecordIds.value = []
    return
  }
  const keys = list.map((row, index) => getRecordKey(row, index))
  const kept = expandedRecordIds.value.filter(key => keys.includes(key))
  expandedRecordIds.value = kept.length ? kept : [keys[0]]
}

function isOwnRecord(row) {
  if (!row) {
    return false
  }
  if (row.ownRecord !== undefined && row.ownRecord !== null) {
    return row.ownRecord === true || row.ownRecord === 'true' || row.ownRecord === 1 || row.ownRecord === '1'
  }
  return String(row.createById) === currentUserId.value
}

function getVisibleRows(rows = []) {
  return onlyMine.value ? rows.filter(row => isOwnRecord(row)) : rows
}

function getRecentStats(rows = []) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime()
  return rows.reduce((result, row) => {
    const time = toTime(row?.startTime)
    if (Number.isNaN(time)) {
      return result
    }
    if (time >= monthStart) {
      result.month += 1
    }
    if (time >= weekStart) {
      result.week += 1
    }
    return result
  }, { month: 0, week: 0 })
}

function canModifyRecord(row) {
  return isOwnRecord(row)
}

function getReadonlyTip(row) {
  return isOwnRecord(row) ? '可修改自己的农事记录' : '非本人记录不可操作'
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function toggleMineView() {
  onlyMine.value = !onlyMine.value
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  Object.assign(queryParams, {
    pageNum: 1,
    pageSize: queryParams.pageSize,
    taskNo: '',
    workTypeId: '',
    workMethodId: '',
    createById: ''
  })
  getList()
}

function resetForm() {
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, {
    id: null,
    taskNo: '',
    workTypeId: '',
    workMethodId: '',
    areaId: '',
    locationId: '',
    regionValue: [],
    description: '',
    photoUrls: '',
    createById: currentUserId.value,
    operatorId: [],
    createTime: '',
    startTime: '',
    endTime: '',
    remark: ''
  })
}

function getGeneratedTaskNo(response) {
  if (typeof response === 'string') {
    return response.trim()
  }
  if (response && response.data != null) {
    return String(response.data).trim()
  }
  if (response && response.taskNo != null) {
    return String(response.taskNo).trim()
  }
  if (response && response.msg && response.msg !== '操作成功') {
    return String(response.msg).trim()
  }
  return ''
}

function getGenerateTaskNoErrorMessage(error) {
  if (typeof error === 'string') {
    return error === 'empty task no' ? '接口未返回任务编号' : error
  }
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }
  if (data?.msg) {
    return data.msg
  }
  if (data?.message) {
    return data.message
  }
  if (error?.message && error.message !== 'empty task no') {
    return error.message
  }
  return '接口未返回任务编号'
}

async function handleAdd() {
  if (taskNoGenerating.value) {
    return
  }
  dialogMode.value = 'add'
  resetForm()
  taskNoGenerating.value = true
  try {
    const response = await generateTaskNo()
    const taskNo = getGeneratedTaskNo(response)
    if (!taskNo) {
      throw new Error('empty task no')
    }
    form.taskNo = taskNo
    open.value = true
    nextTick(() => formRef.value?.clearValidate())
  } catch (error) {
    proxy.$modal.msgError(`任务编号生成失败：${getGenerateTaskNoErrorMessage(error)}`)
  } finally {
    taskNoGenerating.value = false
  }
}

function handleUpdate(row) {
  if (!isOwnRecord(row)) {
    proxy.$modal.msgWarning('只能修改自己的农事记录')
    return
  }
  getFarmerTask(row.id).then(res => {
    dialogMode.value = 'edit'
    resetForm()
    Object.assign(form, res.data || {})
    normalizeFormDictValues()
    form.regionValue = getRegionValue(form)
    handleRegionChange(form.regionValue)
    open.value = true
    nextTick(() => formRef.value?.clearValidate())
  })
}

function handleExport() {
  const request = onlyMine.value ? exportMyFarmerTask : exportFarmerTask
  const exportQuery = { ...queryParams }
  request(exportQuery).then(response => {
    handleExportResponse(response)
  }).catch(() => {
    proxy.$modal.msgError('导出记录失败')
  })
}

function openImportDialog() {
  importOpen.value = true
}

function handleImportSuccess() {
  getList()
}

function goHome() {
  router.push('/home')
}

async function handleExportResponse(response) {
  const blob = response?.data
  if (!blob) {
    proxy.$modal.msgError('导出记录失败')
    return
  }
  const contentType = getResponseHeader(response.headers, 'content-type') || blob.type || ''
  if (contentType.includes('application/json')) {
    const message = await readExportErrorMessage(blob)
    proxy.$modal.msgError(message || '导出记录失败')
    return
  }
  const filename = normalizeXlsxFilename(getDownloadFilename(response.headers) || `农事记录_${formatExportTimestamp()}.xlsx`)
  const exportBlob = blob.type === xlsxContentType ? blob : new Blob([blob], { type: xlsxContentType })
  downloadBlob(exportBlob, filename)
}

async function readExportErrorMessage(blob) {
  try {
    const text = await blob.text()
    const result = JSON.parse(text)
    return result.msg || result.message
  } catch (error) {
    return ''
  }
}

function getResponseHeader(headers, name) {
  if (!headers) {
    return ''
  }
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || ''
}

function getDownloadFilename(headers) {
  const downloadFilename = getResponseHeader(headers, 'download-filename')
  if (downloadFilename) {
    return decodeURIComponent(downloadFilename)
  }
  const disposition = getResponseHeader(headers, 'content-disposition')
  if (!disposition) {
    return ''
  }
  const utf8Match = disposition.match(/filename\*=utf-8''([^;]+)/i)
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1])
  }
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  return filenameMatch ? decodeURIComponent(filenameMatch[1]) : ''
}

function normalizeXlsxFilename(filename) {
  const safeName = filename || `农事记录_${formatExportTimestamp()}.xlsx`
  return /\.(xls|xlsx)$/i.test(safeName) ? safeName.replace(/\.(xls|xlsx)$/i, '.xlsx') : `${safeName}.xlsx`
}

function formatExportTimestamp() {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function handleDelete(row) {
  if (!isOwnRecord(row)) {
    proxy.$modal.msgWarning('只能删除自己的农事记录')
    return
  }
  proxy.$modal.confirm('是否确认删除该农事记录？').then(() => {
    return delFarmerTask(row.id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function submitForm() {
  formRef.value.validate(valid => {
    if (!valid) {
      return
    }
    if (dialogMode.value === 'add') {
      addFarmerTask(buildSubmitPayload()).then(() => {
        open.value = false
        getList()
        proxy.$modal.msgSuccess('新增成功')
      })
      return
    }
    if (!form.id) {
      proxy.$modal.msgWarning('请先选择需要提交的农事任务')
      return
    }
    if (!isOwnRecord(form)) {
      proxy.$modal.msgWarning('只能修改自己的农事记录')
      return
    }
    const payload = buildSubmitPayload()
    submitTask(payload).then(() => {
      open.value = false
      getList()
      proxy.$modal.msgSuccess('提交成功')
    })
  })
}
</script>

<style scoped>
.farmer-task-page {
  min-height: 100vh;
  padding: 20px;
  background: #f5f7fa;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-row :deep(.el-col) {
  margin-bottom: 12px;
}

.stat-card {
  border: 0;
  border-radius: 8px;
  color: #fff;
}

.stat-total {
  background: linear-gradient(135deg, #188b6f, #22b78d);
}

.stat-month {
  background: linear-gradient(135deg, #2f6fb5, #4d93dd);
}

.stat-week {
  background: linear-gradient(135deg, #8f5b2f, #c78645);
}

.stat-label {
  font-size: 14px;
  opacity: 0.92;
}

.stat-value {
  margin-top: 8px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

.stat-desc {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.84;
}

.filter-form {
  margin-bottom: 16px;
  padding: 16px 16px 0;
  border-radius: 8px;
  background: #fff;
}

.action-row {
  margin-bottom: 16px;
}

.filter-control {
  width: 220px;
}

.record-list {
  min-height: 240px;
  background: transparent;
}

.record-card {
  margin-bottom: 18px;
  border: 0;
  background: transparent;
}

.record-card:last-child {
  margin-bottom: 0;
}

.record-card:hover .record-diagram {
  border-color: #95b8a3;
  box-shadow: 0 16px 34px rgba(38, 55, 82, 0.14);
}

.record-card :deep(.el-card__body) {
  padding: 0;
}

.record-diagram {
  display: grid;
  grid-template-columns: 252px minmax(520px, 1fr) 250px;
  gap: 18px 24px;
  align-items: stretch;
  padding: 24px;
  background: #fff;
  border: 1px solid #d7e0ea;
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(37, 48, 70, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.diagram-left,
.diagram-main,
.diagram-right {
  min-width: 0;
}

.diagram-left {
  display: grid;
  grid-template-rows: 68px minmax(174px, 1fr);
  gap: 14px;
}

.diagram-task-no {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 68px;
  padding: 8px 16px;
  color: #173b2c;
  text-align: center;
  background: linear-gradient(180deg, #f5fbf7 0%, #e6f4ea 100%);
  border: 1px solid #badac6;
  border-radius: 4px;
}

.diagram-task-no span,
.diagram-tile span,
.diagram-note span {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.diagram-task-no strong {
  overflow: hidden;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diagram-photo {
  position: relative;
  min-height: 174px;
  overflow: hidden;
  background: #f7faf8;
  border: 1px solid #d5e3dc;
  border-radius: 4px;
}

.diagram-photo :deep(.el-image),
.diagram-photo :deep(img) {
  width: 100% !important;
  height: 100% !important;
  border-radius: 6px;
  object-fit: cover;
}

.diagram-photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 174px;
  color: #597164;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(145deg, #f7fbf8, #eaf4ee);
}

.cover-count {
  position: absolute;
  top: 8px;
  right: 8px;
  height: 22px;
  padding: 0 7px;
  color: #fff;
  font-size: 12px;
  line-height: 22px;
  background: rgba(18, 28, 42, 0.62);
  border-radius: 999px;
}

.diagram-main {
  display: grid;
  grid-template-rows: auto minmax(92px, 1fr);
  gap: 14px;
}

.diagram-info-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(210px, 1fr) minmax(190px, 0.9fr);
  grid-template-rows: 104px 104px;
  gap: 14px 16px;
}

.diagram-tile {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 14px 18px;
  color: #1f2937;
  text-align: center;
  background: #f6f8fb;
  border: 1px solid #d8e0ea;
  border-radius: 4px;
}

.diagram-task-no span {
  color: #5d7a6b;
}

.diagram-tile span {
  color: #718096;
}

.diagram-tile strong {
  overflow: hidden;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.area-tile {
  grid-column: 3;
  grid-row: 1 / 3;
}

.diagram-note {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  min-height: 92px;
  padding: 16px 18px;
  color: #283548;
  background: #fffaf0;
  border: 1px solid #ecd8a9;
  border-radius: 4px;
}

.desc-note {
  background: #f7fbf8;
  border-color: #cfe3d6;
}

.diagram-note span {
  margin-bottom: 8px;
  color: #256f4c;
  font-size: 18px;
  font-weight: 700;
}

.diagram-note p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 17px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.diagram-right {
  display: grid;
  grid-template-rows: 48px 48px 48px minmax(92px, 1fr);
  gap: 14px;
}

.diagram-right.is-readonly {
  grid-template-rows: 48px minmax(92px, auto) minmax(92px, 1fr);
}

.diagram-status,
.diagram-action,
.diagram-readonly {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 48px;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  background: #24935f;
  border: 1px solid #177247;
  border-radius: 4px;
}

.diagram-status.readonly {
  background: #748092;
  border-color: #5a6474;
}

.diagram-action {
  width: 100%;
  margin-left: 0 !important;
}

.diagram-action:hover,
.diagram-action:focus {
  color: #fff;
  background: #0f65b7;
  border-color: #0b4d8b;
}

.edit-action {
  background: #1d7fd3;
  border-color: #1769ae;
}

.delete-action {
  background: #d94b4b;
  border-color: #b83b3b;
}

.delete-action:hover,
.delete-action:focus {
  background: #be3d3d;
  border-color: #9f3030;
}

.diagram-readonly {
  height: 110px;
  padding: 0 14px;
  color: #737f91;
  font-size: 15px;
  line-height: 1.5;
  text-align: center;
  background: #eef1f5;
  border-color: #d5dce6;
}

.remark-note {
  min-height: 92px;
  background: #fffaf0;
  border-color: #ecd8a9;
}

.diagram-footer {
  display: flex;
  grid-column: 2 / 4;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}

.diagram-footer span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 150px;
  height: 40px;
  padding: 0 18px;
  overflow: hidden;
  color: #24613f;
  font-size: 17px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #eef8f0;
  border: 1px solid #bfe0c8;
  border-radius: 4px;
}

.full-control {
  width: 100%;
}

@media (max-width: 1200px) {
  .record-diagram {
    grid-template-columns: 230px minmax(420px, 1fr);
  }

  .diagram-right {
    grid-column: 1 / 3;
    grid-template-columns: 180px 160px 160px minmax(240px, 1fr);
    grid-template-rows: minmax(72px, auto);
  }

  .diagram-status,
  .diagram-action,
  .diagram-readonly {
    height: auto;
    min-height: 48px;
  }

  .remark-note {
    min-height: 72px;
  }

  .diagram-footer {
    grid-column: 1 / 3;
  }
}

@media (max-width: 980px) {
  .record-diagram {
    grid-template-columns: 1fr;
  }

  .diagram-left {
    grid-template-columns: minmax(180px, 0.55fr) minmax(240px, 1fr);
    grid-template-rows: 180px;
  }

  .diagram-task-no {
    min-height: 180px;
  }

  .diagram-photo {
    min-height: 180px;
  }

  .diagram-right,
  .diagram-footer {
    grid-column: auto;
  }

  .diagram-right {
    grid-template-columns: repeat(3, minmax(120px, 1fr));
    grid-template-rows: auto auto;
  }

  .remark-note {
    grid-column: 1 / 4;
  }
}

@media (max-width: 768px) {
  .record-diagram {
    padding: 16px;
  }

  .diagram-left,
  .diagram-info-grid,
  .diagram-right {
    grid-template-columns: 1fr 1fr;
  }

  .diagram-left {
    grid-template-rows: auto;
  }

  .diagram-info-grid {
    grid-template-rows: auto;
  }

  .area-tile {
    grid-column: 1 / 3;
    grid-row: auto;
  }

  .diagram-tile {
    min-height: 90px;
  }

  .diagram-tile strong {
    font-size: 18px;
  }

  .diagram-right {
    grid-template-columns: 1fr;
  }

  .remark-note {
    grid-column: auto;
  }

  .diagram-footer {
    justify-content: stretch;
  }

  .diagram-footer span {
    width: 100%;
  }

  .filter-control {
    width: 100%;
  }
}

.farmer-task-page {
  --text-primary: #253f34;
  --text-secondary: #60756a;
  --text-muted: #8b9a92;
  --text-accent: #2f7f5d;
  --text-strong: #1f342b;
  --font-title: 16px;
  --font-body: 14px;
  --font-small: 13px;
  --font-tiny: 12px;
  --agri-field-label-color: #6f8379;
  --agri-field-value-color: #2f463b;
  --agri-field-label-size: 13px;
  --agri-field-value-size: 15px;
  --agri-field-label-weight: 600;
  --agri-field-value-weight: 600;
  --agri-field-line-height: 1.5;
  min-height: 100vh;
  padding: 22px;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 14% 4%, rgba(127, 168, 138, 0.18), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  margin: 0 0 18px !important;
}

.stat-row :deep(.el-col) {
  width: 100%;
  max-width: none;
  padding-right: 0 !important;
  padding-left: 0 !important;
  margin-bottom: 0;
  flex: initial;
}

.stat-card {
  overflow: hidden;
  color: var(--text-primary);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 244, 0.98)),
    #fff;
  border: 1px solid rgba(194, 218, 199, 0.72);
  border-radius: 14px;
  box-shadow: 0 12px 28px rgba(47, 125, 92, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(79, 143, 107, 0.35);
  box-shadow: 0 16px 32px rgba(47, 125, 92, 0.14);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  padding: 18px 22px;
}

.stat-total,
.stat-month,
.stat-week {
  background: transparent;
}

.stat-card-content {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  align-items: center;
  width: 100%;
  column-gap: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  font-size: 28px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.68);
}

.stat-icon-total {
  color: #2f7d5c;
  background: linear-gradient(135deg, #dff0e4, #eef8e9);
}

.stat-icon-month {
  color: #4f8f6b;
  background: linear-gradient(135deg, #e7f4da, #f4faec);
}

.stat-icon-week {
  color: #7a9a42;
  background: linear-gradient(135deg, #f3edd5, #fbf7e7);
}

.stat-info {
  min-width: 0;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
}

.stat-value {
  display: flex;
  align-items: baseline;
  margin-top: 8px;
  color: var(--text-strong);
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
}

.stat-value span {
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}

.filter-form {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  column-gap: 12px;
  row-gap: 12px;
  width: 100%;
  min-width: 0;
  margin-bottom: 12px;
  padding: 12px 16px;
  height: auto;
  overflow: visible;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dce8dc;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(74, 105, 80, 0.08);
}

.filter-form :deep(.el-form-item) {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  margin: 0;
}

.filter-form :deep(.el-form-item__label) {
  flex: 0 0 auto;
  width: auto !important;
  padding-right: 8px;
  color: #3f554b;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 32px;
  white-space: nowrap;
  word-break: keep-all;
}

.filter-form :deep(.el-form-item__content) {
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 0 !important;
}

.filter-item {
  flex: 0 1 auto;
  min-width: 0;
}

.filter-control {
  width: 140px;
  width: clamp(126px, 9cqw, 145px);
  min-width: 126px;
  max-width: 145px;
}

.filter-form :deep(.el-input__inner),
.filter-form :deep(.el-select .el-input__inner),
.filter-form :deep(.el-select__placeholder),
.filter-form :deep(.el-select__selected-item),
.filter-form :deep(.el-select__selection) {
  color: #34483f;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: normal;
}

.filter-form :deep(.el-input__inner::placeholder),
.filter-form :deep(.el-select .el-input__inner::placeholder),
.filter-form :deep(.el-select__placeholder) {
  color: #8a9a92;
  opacity: 1;
}

.filter-form :deep(.filter-action-item),
.filter-action-item {
  flex: 0 0 auto;
  margin-left: 0;
  padding-left: 0;
}

.filter-form :deep(.filter-action-item .el-form-item__content) {
  flex: 0 0 auto;
  min-width: max-content;
}

.query-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 10px;
  white-space: nowrap;
}

.query-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.filter-form :deep(.el-input__wrapper),
.filter-form :deep(.el-select__wrapper) {
  min-height: 34px;
  background: #fbfdf9;
  border-radius: 10px;
  box-shadow: 0 0 0 1px #dce8dc inset;
}

.filter-form :deep(.el-input__wrapper.is-focus),
.filter-form :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #4f8f6b inset, 0 0 0 3px rgba(79, 143, 107, 0.12);
}

.filter-form :deep(.el-button),
.action-row :deep(.el-button) {
  height: 38px;
  padding: 0 18px;
  color: var(--text-accent);
  font-size: var(--font-body);
  font-weight: 600;
  background: #f4fbf4;
  border-color: #b9d6bf;
  border-radius: 10px;
}

.filter-form :deep(.el-button--primary),
.action-row :deep(.el-button--primary) {
  color: #fff;
  background: #2f7d5c;
  border-color: #2f7d5c;
}

.filter-form :deep(.el-button:hover),
.action-row :deep(.el-button:hover) {
  color: #fff;
  background: #4f8f6b;
  border-color: #4f8f6b;
}

@container (max-width: 1040px) {
  .filter-form {
    flex-wrap: wrap;
  }
}

.action-row {
  box-sizing: border-box;
  width: 100%;
  margin: 0 0 18px !important;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}

.toolbar :deep(.toolbar-button) {
  height: 38px;
  padding: 0 18px;
  font-size: var(--font-body);
  font-weight: 600;
  border-radius: 10px;
  transition: color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.toolbar :deep(.toolbar-button .el-icon),
.toolbar :deep(.toolbar-button span) {
  color: inherit !important;
}

.toolbar :deep(.toolbar-button:not(.is-disabled):hover),
.toolbar :deep(.toolbar-button:not(.is-disabled):focus) {
  box-shadow: 0 2px 8px rgba(47, 125, 92, 0.12);
}

.toolbar :deep(.toolbar-button:not(.is-disabled):active) {
  transform: translateY(1px);
}

.toolbar :deep(.home-primary-button),
.toolbar :deep(.home-primary-button:hover),
.toolbar :deep(.home-primary-button:focus),
.toolbar :deep(.home-primary-button:focus-visible),
.toolbar :deep(.home-primary-button:active) {
  color: #ffffff !important;
  background-color: #2f7d5c !important;
  border-color: #2f7d5c !important;
}

.toolbar :deep(.home-primary-button:not(.is-disabled):hover),
.toolbar :deep(.home-primary-button:not(.is-disabled):focus),
.toolbar :deep(.home-primary-button:not(.is-disabled):focus-visible),
.toolbar :deep(.home-primary-button:not(.is-disabled):active) {
  color: #ffffff !important;
  background-color: #276a4e !important;
  border-color: #276a4e !important;
}

.toolbar :deep(.record-secondary-button),
.toolbar :deep(.record-secondary-button:focus),
.toolbar :deep(.record-secondary-button:focus-visible) {
  color: #2f7d5c !important;
  background-color: #f4fbf4 !important;
  border-color: #cfe3d7 !important;
}

.toolbar :deep(.record-secondary-button:not(.is-disabled):hover),
.toolbar :deep(.record-secondary-button:not(.is-disabled):focus),
.toolbar :deep(.record-secondary-button:not(.is-disabled):focus-visible),
.toolbar :deep(.record-secondary-button:not(.is-disabled):active) {
  color: #ffffff !important;
  background-color: #2f7d5c !important;
  border-color: #2f7d5c !important;
}

.toolbar :deep(.toolbar-button.is-disabled),
.toolbar :deep(.toolbar-button.is-disabled:hover),
.toolbar :deep(.toolbar-button.is-disabled:focus),
.toolbar :deep(.toolbar-button.is-disabled:focus-visible),
.toolbar :deep(.toolbar-button.is-disabled:active) {
  color: #b8c2ba !important;
  background-color: #f5f7f5 !important;
  border-color: #dce6dd !important;
  box-shadow: none;
  transform: none;
}

.record-list {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 0;
  margin: 0;
  min-height: 240px;
  background: transparent;
}

.record-list :deep(.el-empty__description p) {
  color: var(--text-muted);
  font-size: var(--font-small);
  font-weight: 400;
  line-height: 1.5;
}

.record-card {
  --el-card-padding: 0;
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  margin: 0;
  background: transparent;
  border: 0;
}

.record-card :deep(.el-card__body) {
  box-sizing: border-box;
  width: 100%;
  padding: 0 !important;
}

.record-card-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #d5e5d6;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(63, 91, 70, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.record-card-shell:hover {
  border-color: #a9c9b2;
  box-shadow: 0 16px 32px rgba(63, 91, 70, 0.13);
  transform: translateY(-1px);
}

.record-card-shell.is-expanded {
  border-color: #95bea2;
}

.record-summary-bar {
  display: grid;
  grid-template-columns: minmax(210px, 1.1fr) repeat(3, minmax(150px, 0.75fr)) minmax(156px, 0.7fr);
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  cursor: pointer;
  background: linear-gradient(90deg, #fbfdf9 0%, #f2f8f0 100%);
  border-bottom: 1px solid transparent;
}

.record-card-shell.is-expanded .record-summary-bar {
  border-bottom-color: #e2ecdf;
}

.summary-title-group {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.summary-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #2f7d5c, #7fa88a);
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(47, 125, 92, 0.2);
}

.summary-title-text,
.summary-field {
  min-width: 0;
}

.summary-title-text span,
.summary-field span,
.info-card span,
.description-card span,
.remark-card span,
.creator-card span,
.operator-card span {
  display: block;
  margin-bottom: 5px;
  color: var(--agri-field-label-color);
  font-size: var(--agri-field-label-size);
  font-weight: var(--agri-field-label-weight);
  line-height: var(--agri-field-line-height);
}

.summary-title-text strong {
  display: block;
  overflow: hidden;
  color: var(--agri-field-value-color);
  font-size: var(--agri-field-value-size);
  font-weight: var(--agri-field-value-weight);
  line-height: var(--agri-field-line-height);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-field strong {
  display: block;
  overflow: hidden;
  color: var(--agri-field-value-color);
  font-size: var(--agri-field-value-size);
  font-weight: var(--agri-field-value-weight);
  line-height: var(--agri-field-line-height);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-status {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  min-width: 66px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
}

.status-pill.editable,
.detail-status.editable {
  color: #1f6f4c;
  background: #e7f5ea;
  border: 1px solid #bfe0c8;
}

.status-pill.readonly,
.detail-status.readonly {
  color: #69766e;
  background: #edf2ed;
  border: 1px solid #d5ded5;
}

.expand-text {
  color: var(--text-accent);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.record-detail {
  display: grid;
  grid-template-areas:
    "photo time time creator"
    "photo area area operator"
    "desc desc desc remark"
    "actions actions actions actions";
  grid-template-columns: minmax(210px, 0.85fr) minmax(0, 1fr) minmax(0, 1fr) minmax(180px, 0.78fr);
  grid-template-rows: minmax(78px, auto) minmax(92px, auto) minmax(104px, auto) auto;
  gap: 18px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  padding: 18px;
  overflow: visible;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdf9 100%);
}

.detail-photo-panel,
.detail-core-panel,
.detail-meta-panel,
.detail-actions-panel,
.info-card,
.description-card,
.remark-card,
.creator-card,
.operator-card {
  min-width: 0;
}

.detail-photo-panel {
  grid-area: photo;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
}

.record-photo {
  position: relative;
  width: 100%;
  max-width: none;
  min-height: 188px;
  height: 100%;
  overflow: hidden;
  background: #eef4e8;
  border: 1px solid #d4e5d2;
  border-radius: 16px;
}

.record-photo :deep(.el-image),
.record-photo :deep(img) {
  width: 100% !important;
  height: 100% !important;
  border-radius: 16px;
  object-fit: cover;
}

:global(.el-image-viewer__img) {
  object-fit: contain !important;
}

.photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  background:
    linear-gradient(135deg, rgba(127, 168, 138, 0.18), transparent),
    #eef4e8;
}

.photo-count {
  position: absolute;
  top: 10px;
  right: 10px;
  height: 24px;
  padding: 0 9px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 24px;
  background: rgba(31, 61, 47, 0.68);
  border-radius: 999px;
}

.detail-core-panel {
  display: contents;
}

.time-info-grid {
  grid-area: time;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-card,
.description-card,
.remark-card,
.creator-card,
.operator-card {
  background: #f8fbf5;
  border: 1px solid #dce8d8;
  border-radius: 13px;
}

.info-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  box-sizing: border-box;
  min-height: 78px;
  padding: 13px 14px;
}

.time-info-grid .info-card,
.creator-card {
  height: 100%;
}

.time-info-grid .info-card span,
.creator-card span {
  margin: 0 0 8px;
}

.time-info-grid .info-card strong,
.creator-card strong {
  margin: 0;
}

.area-card {
  grid-area: area;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 92px;
  text-align: center;
  background: #F8FBF5;
}

.area-card strong {
  white-space: normal;
}

.info-card strong {
  display: block;
  overflow: hidden;
  color: var(--agri-field-value-color);
  font-size: var(--agri-field-value-size);
  font-weight: var(--agri-field-value-weight);
  line-height: var(--agri-field-line-height);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.description-card,
.remark-card {
  padding: 15px 16px;
}

.description-card {
  grid-area: desc;
  min-height: 104px;
  background: #F8FBF5;
}

.description-card p,
.remark-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--agri-field-value-color);
  font-size: var(--agri-field-value-size);
  font-weight: var(--agri-field-value-weight);
  line-height: var(--agri-field-line-height);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.detail-meta-panel {
  display: contents;
}

.detail-actions-panel {
  grid-area: actions;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-height: 34px;
  min-width: 0;
}

.detail-actions-panel .detail-status {
  display: none;
}

.detail-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 38px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  border-radius: 999px;
}
.side-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 100%;
  min-width: 0;
}

.record-action {
  flex: 0 0 auto;
  width: auto;
  min-width: 90px;
  max-width: 110px;
  height: 34px;
  padding: 0 14px;
  margin-left: 0 !important;
  color: #fff;
  font-size: var(--font-body);
  font-weight: 600;
  border-radius: 9px;
}

.side-actions .edit-action {
  background: #2f7d5c;
  border-color: #2f7d5c;
}

.side-actions .edit-action:hover,
.side-actions .edit-action:focus {
  color: #fff;
  background: #256a4d;
  border-color: #256a4d;
}

.side-actions .delete-action {
  color: #2f7d5c;
  background: #f4fbf4;
  border-color: #b9d6bf;
}

.side-actions .delete-action:hover,
.side-actions .delete-action:focus,
.side-actions .delete-action:active {
  color: #fff;
  background: #2f7d5c;
  border-color: #2f7d5c;
}

.side-actions .delete-action :deep(.el-icon) {
  color: currentColor;
}
.readonly-tip {
  padding: 11px 12px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  background: #f2f6f1;
  border: 1px solid #dce8d8;
  border-radius: 12px;
}

.creator-card,
.operator-card {
  box-sizing: border-box;
  padding: 13px 14px;
}

.creator-card {
  grid-area: creator;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-height: 78px;
}

.operator-card {
  grid-area: operator;
  display: grid;
  align-content: center;
  gap: 10px;
  min-height: 92px;
}

.remark-card {
  grid-area: remark;
  box-sizing: border-box;
  min-height: 104px;
}

.creator-card strong,
.operator-card strong {
  display: block;
  overflow: hidden;
  color: var(--agri-field-value-color);
  font-size: var(--agri-field-value-size);
  font-weight: var(--agri-field-value-weight);
  line-height: var(--agri-field-line-height);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-expand-enter-active,
.record-expand-leave-active {
  overflow: hidden;
  transition: opacity 0.22s ease, transform 0.22s ease, max-height 0.22s ease;
}

.record-expand-enter-from,
.record-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-6px);
}

.record-expand-enter-to,
.record-expand-leave-from {
  max-height: 620px;
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 1500px) {
  .record-detail {
    grid-template-areas:
      "photo time creator"
      "photo area operator"
      "desc desc remark"
      "actions actions actions";
    grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1fr) minmax(210px, 0.8fr);
    grid-template-rows: minmax(78px, auto) minmax(92px, auto) minmax(104px, auto) auto;
  }

  .detail-actions-panel {
    align-items: center;
    justify-content: flex-end;
  }

  .side-actions {
    justify-content: end;
  }
}

@media (min-width: 769px) and (max-width: 1399px) {
  .filter-action-item,
  .filter-form :deep(.filter-action-item) {
    margin-left: 0;
    padding-left: 0;
  }
}

@media (max-width: 1280px) {

  .record-summary-bar {
    grid-template-columns: minmax(210px, 1fr) repeat(3, minmax(130px, 0.7fr)) minmax(154px, 0.8fr);
  }

  .record-detail {
    grid-template-areas:
      "photo time creator"
      "photo area operator"
      "desc desc remark"
      "actions actions actions";
    grid-template-columns: 240px minmax(360px, 1fr) 240px;
    grid-template-rows: minmax(78px, auto) minmax(92px, auto) minmax(104px, auto) auto;
  }

  .detail-actions-panel {
    align-items: center;
    justify-content: flex-end;
  }

  .side-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 980px) {
  .farmer-task-page {
    padding: 14px;
  }

  .record-summary-bar {
    grid-template-columns: 1fr 1fr;
  }

  .summary-status {
    justify-content: flex-start;
  }

  .record-detail {
    grid-template-areas:
      "photo"
      "time"
      "area"
      "creator"
      "operator"
      "desc"
      "remark"
      "actions";
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .detail-actions-panel {
    justify-content: flex-end;
  }

  .side-actions {
    justify-content: flex-end;
  }

  .time-info-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .stat-row {
    grid-template-columns: 1fr;
  }

  .filter-form {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px;
  }

  .filter-item {
    flex: 0 0 100%;
    width: 100%;
  }

  .filter-control {
    width: 100%;
    max-width: none;
    min-width: 0;
  }

  .filter-action-item,
  .filter-form :deep(.filter-action-item) {
    flex: 0 0 100%;
    width: 100%;
  }

  .filter-form :deep(.filter-item .el-form-item__content) {
    flex: 1 1 auto;
  }

  .query-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .record-summary-bar,
  .time-info-grid {
    grid-template-columns: 1fr;
  }

  .summary-status {
    justify-content: space-between;
  }

  .record-detail {
    padding: 14px;
  }

  .record-photo {
    height: 210px;
  }

  .readonly-tip {
    grid-column: auto;
  }
}

.farmer-task-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
}

.farmer-layout {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  width: 100%;
}

.statistics-sidebar {
  position: sticky;
  top: 16px;
  flex: 0 0 300px;
  width: 300px;
  padding: 18px 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #d8e8d9;
  border-radius: 16px;
  box-shadow: 0 14px 34px rgba(58, 88, 63, 0.12);
  backdrop-filter: blur(8px);
}

.farmer-main {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  container-type: inline-size;
  flex: 1 1 auto;
  min-width: 0;
}

.statistics-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 6px 6px 2px;
}

.statistics-icon {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 34px;
  height: 34px;
  padding: 8px 9px 7px;
  background:
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.42), transparent 24px),
    linear-gradient(135deg, #2f7d5c 0%, #4f8f6b 58%, #8fb79a 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 12px;
  box-shadow:
    0 10px 18px rgba(47, 125, 92, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.36);
}

.statistics-icon::after {
  position: absolute;
  right: 7px;
  bottom: 6px;
  left: 7px;
  height: 1px;
  content: '';
  background: rgba(255, 255, 255, 0.48);
  border-radius: 999px;
}

.statistics-icon i {
  position: relative;
  z-index: 1;
  display: block;
  width: 3px;
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(27, 72, 51, 0.18);
}

.statistics-icon i:nth-child(1) {
  height: 8px;
  opacity: 0.8;
}

.statistics-icon i:nth-child(2) {
  height: 13px;
}

.statistics-icon i:nth-child(3) {
  height: 17px;
  opacity: 0.92;
}

.statistics-title h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-title);
  font-weight: 600;
  line-height: 1.3;
}

.statistics-title p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: var(--font-tiny);
  font-weight: 400;
  line-height: 1.4;
}

.chart-card {
  padding: 14px 12px 10px;
  margin-bottom: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbf5 100%);
  border: 1px solid #dcead9;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(61, 91, 67, 0.08);
}

.chart-card:last-child {
  margin-bottom: 0;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.chart-header span {
  color: var(--text-primary);
  font-size: var(--font-title);
  font-weight: 600;
  line-height: 1.3;
}

.chart-header em {
  color: var(--text-muted);
  font-size: var(--font-tiny);
  font-weight: 400;
  line-height: 1.4;
  font-style: normal;
  white-space: nowrap;
}

.chart-box {
  width: 100%;
  height: 190px;
}

@media (max-width: 1180px) {
  .farmer-layout {
    flex-direction: column;
  }

  .statistics-sidebar {
    position: static;
    width: 100%;
    flex: none;
  }

  .statistics-sidebar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .statistics-title {
    grid-column: 1 / -1;
    margin-bottom: 0;
  }

  .chart-card {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .farmer-task-page {
    padding: 12px;
  }

  .statistics-sidebar {
    grid-template-columns: 1fr;
  }

  .chart-box {
    height: 180px;
  }
}

.farmer-task-page,
.farmer-task-page * {
  border-radius: 1px !important;
}

.farmer-task-page :deep(*) {
  border-radius: 1px !important;
}
</style>
