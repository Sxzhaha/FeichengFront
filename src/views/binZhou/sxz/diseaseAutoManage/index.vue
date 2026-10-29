<template>
  <div class="auto-manage-page">
    <section class="page-heading">
      <div>
        <p class="eyebrow">AI VISUAL MANAGEMENT</p>
        <h1>病虫害自动识别任务管理</h1>
     
      </div>
      <el-button :icon="Refresh" :loading="summaryLoading" @click="refreshCurrent">刷新数据</el-button>
    </section>

    <section class="summary-grid" v-loading="summaryLoading">
      <article>
        <span class="summary-icon task"><Calendar /></span>
        <div><small>任务总数</small><strong>{{ summary.taskCount || 0 }}</strong><p>启用 {{ summary.enabledTaskCount || 0 }} 个</p></div>
      </article>
      <article>
        <span class="summary-icon running"><Loading /></span>
        <div><small>正在执行</small><strong>{{ summary.runningTaskCount || 0 }}</strong><p>实时运行状态</p></div>
      </article>
      <article>
        <span class="summary-icon batch"><DataAnalysis /></span>
        <div><small>执行批次</small><strong>{{ summary.runCount || 0 }}</strong><p>成功 {{ summary.successRunCount || 0 }} 次</p></div>
      </article>
      <article>
        <span class="summary-icon image"><Picture /></span>
        <div><small>图片明细</small><strong>{{ summary.itemCount || 0 }}</strong><p>成功 {{ summary.successItemCount || 0 }} / 失败 {{ summary.failedItemCount || 0 }}</p></div>
      </article>
    </section>

    <section class="content-card">
      <el-tabs v-model="activeTab" class="manage-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="任务配置" name="task">
          <el-form ref="taskQueryRef" :model="taskQuery" inline class="query-form">
            <el-form-item label="任务名称" prop="taskName">
              <el-input v-model.trim="taskQuery.taskName" clearable placeholder="请输入任务名称" @keyup.enter="loadTasks" />
            </el-form-item>
            <el-form-item label="园区" prop="parkId">
              <el-select v-model="taskQuery.parkId" clearable placeholder="全部园区" @change="handleQueryParkChange">
                <el-option v-for="item in options.parks" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="设备" prop="deviceId">
              <el-select v-model="taskQuery.deviceId" clearable placeholder="全部设备">
                <el-option v-for="item in queryDevices" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="任务状态" prop="taskStatus">
              <el-select v-model="taskQuery.taskStatus" clearable placeholder="全部状态">
                <el-option label="启用" value="0" /><el-option label="停用" value="1" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleTaskQuery">查询</el-button>
              <el-button :icon="Refresh" @click="resetTaskQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <div class="table-toolbar">
            <div><h2>定时任务列表</h2><span>任务配置支持维护，运行中的任务不可编辑或删除</span></div>
            <div>
              <el-button type="primary" :icon="Plus" v-hasPermi="['sxz:autoManage:add']" @click="openTaskDialog()">新增任务</el-button>
              <el-button :icon="Download" v-hasPermi="['sxz:autoManage:export']" @click="exportTasks">导出</el-button>
            </div>
          </div>

          <el-table v-loading="taskLoading" :data="tasks" class="agri-table" stripe>
            <el-table-column label="任务信息" min-width="210">
              <template #default="{ row }">
                <div class="primary-cell"><span class="cell-icon"><Calendar /></span><div><b>{{ row.taskName }}</b><small>ID：{{ row.taskId }}</small></div></div>
              </template>
            </el-table-column>
            <el-table-column label="园区 / 设备" min-width="180">
              <template #default="{ row }"><div class="stack-cell"><b>{{ row.parkName || '未关联园区' }}</b><small>{{ row.deviceName || '未关联设备' }}</small></div></template>
            </el-table-column>
            <el-table-column prop="modelName" label="识别模型" min-width="150" show-overflow-tooltip />
            <el-table-column label="执行计划" min-width="165">
              <template #default="{ row }"><span>{{ scheduleText(row) }}</span><small class="muted-block">{{ activeWindowText(row) }}</small></template>
            </el-table-column>
            <el-table-column label="下次执行" min-width="155">
              <template #default="{ row }">{{ formatTime(row.nextRunTime) }}</template>
            </el-table-column>
            <el-table-column label="运行状态" width="110" align="center">
              <template #default="{ row }"><el-tag :type="row.runState === 'RUNNING' ? 'warning' : 'info'" effect="light">{{ row.runState === 'RUNNING' ? '执行中' : '空闲' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="启用" width="90" align="center">
              <template #default="{ row }"><el-switch v-hasPermi="['sxz:autoManage:edit']" :model-value="row.taskStatus === '0'" :disabled="row.runState === 'RUNNING'" @change="changeStatus(row, $event)" /></template>
            </el-table-column>
            <el-table-column label="操作" width="245" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="success" :icon="VideoPlay" :disabled="row.taskStatus !== '0' || row.runState === 'RUNNING'" v-hasPermi="['sxz:autoManage:execute']" @click="runTask(row)">执行</el-button>
                <el-button link type="primary" :icon="Edit" :disabled="row.runState === 'RUNNING'" v-hasPermi="['sxz:autoManage:edit']" @click="openTaskDialog(row)">修改</el-button>
                <el-button link type="primary" :icon="View" @click="viewTaskRuns(row)">批次</el-button>
                <el-button link type="danger" :icon="Delete" :disabled="row.runState === 'RUNNING'" v-hasPermi="['sxz:autoManage:remove']" @click="removeTask(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <pagination v-show="taskTotal > 0" :total="taskTotal" v-model:page="taskQuery.pageNum" v-model:limit="taskQuery.pageSize" @pagination="loadTasks" />
        </el-tab-pane>

        <el-tab-pane label="执行批次" name="run">
          <el-form ref="runQueryRef" :model="runQuery" inline class="query-form">
            <el-form-item label="任务名称" prop="taskName"><el-input v-model.trim="runQuery.taskName" clearable placeholder="请输入任务名称" @keyup.enter="loadRuns" /></el-form-item>
            <el-form-item label="触发方式" prop="triggerType"><el-select v-model="runQuery.triggerType" clearable placeholder="全部方式"><el-option label="自动调度" value="AUTO" /><el-option label="手动触发" value="MANUAL" /></el-select></el-form-item>
            <el-form-item label="执行状态" prop="runStatus"><el-select v-model="runQuery.runStatus" clearable placeholder="全部状态"><el-option v-for="item in runStatusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
            <el-form-item label="执行时间"><el-date-picker v-model="runDateRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" start-placeholder="开始时间" end-placeholder="结束时间" /></el-form-item>
            <el-form-item><el-button type="primary" :icon="Search" @click="handleRunQuery">查询</el-button><el-button :icon="Refresh" @click="resetRunQuery">重置</el-button></el-form-item>
          </el-form>
          <div class="table-toolbar">
            <div><h2>执行批次记录</h2><span>批次记录由调度器生成，仅用于追踪和审计</span></div>
            <el-button :icon="Download" v-hasPermi="['sxz:autoManage:export']" @click="exportRuns">导出</el-button>
          </div>
          <el-table v-loading="runLoading" :data="runs" class="agri-table" stripe>
            <el-table-column prop="runId" label="批次ID" width="100" />
            <el-table-column prop="taskName" label="任务名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="触发方式" width="110" align="center"><template #default="{ row }"><el-tag effect="plain">{{ row.triggerType === 'AUTO' ? '自动调度' : '手动触发' }}</el-tag></template></el-table-column>
            <el-table-column label="状态" width="110" align="center"><template #default="{ row }"><el-tag :type="runStatusType(row.runStatus)">{{ runStatusText(row.runStatus) }}</el-tag></template></el-table-column>
            <el-table-column label="开始时间" min-width="160"><template #default="{ row }">{{ formatTime(row.startTime) }}</template></el-table-column>
            <el-table-column label="结束时间" min-width="160"><template #default="{ row }">{{ formatTime(row.endTime) }}</template></el-table-column>
            <el-table-column prop="sourceCount" label="发现" width="70" align="center" />
            <el-table-column prop="successCount" label="成功" width="70" align="center" />
            <el-table-column prop="failCount" label="失败" width="70" align="center" />
            <el-table-column prop="skipCount" label="跳过" width="70" align="center" />
            <el-table-column prop="errorMessage" label="异常信息" min-width="180" show-overflow-tooltip />
            <el-table-column label="操作" width="100" fixed="right" align="center"><template #default="{ row }"><el-button link type="primary" :icon="View" @click="viewRunItems(row)">查看明细</el-button></template></el-table-column>
          </el-table>
          <pagination v-show="runTotal > 0" :total="runTotal" v-model:page="runQuery.pageNum" v-model:limit="runQuery.pageSize" @pagination="loadRuns" />
        </el-tab-pane>

        <el-tab-pane label="图片明细" name="item">
          <el-form ref="itemQueryRef" :model="itemQuery" inline class="query-form">
            <el-form-item label="批次ID" prop="runId"><el-input-number v-model="itemQuery.runId" :min="1" :controls="false" placeholder="批次ID" /></el-form-item>
            <el-form-item label="任务名称" prop="taskName"><el-input v-model.trim="itemQuery.taskName" clearable placeholder="请输入任务名称" /></el-form-item>
            <el-form-item label="处理状态" prop="itemStatus"><el-select v-model="itemQuery.itemStatus" clearable placeholder="全部状态"><el-option v-for="item in itemStatusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
            <el-form-item label="病虫害" prop="diseaseName"><el-input v-model.trim="itemQuery.diseaseName" clearable placeholder="病虫害名称" /></el-form-item>
            <el-form-item label="处理时间"><el-date-picker v-model="itemDateRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" start-placeholder="开始时间" end-placeholder="结束时间" /></el-form-item>
            <el-form-item><el-button type="primary" :icon="Search" @click="handleItemQuery">查询</el-button><el-button :icon="Refresh" @click="resetItemQuery">重置</el-button></el-form-item>
          </el-form>
          <div class="table-toolbar">
            <div><h2>图片识别明细</h2><span>记录源图片、AI图片以及最终病虫害结果的完整关联</span></div>
            <el-button :icon="Download" v-hasPermi="['sxz:autoManage:export']" @click="exportItems">导出</el-button>
          </div>
          <el-table v-loading="itemLoading" :data="items" class="agri-table" stripe>
            <el-table-column label="图片" width="92" align="center"><template #default="{ row }"><el-image class="table-image" :src="imageUrl(row.resultImageUrl || row.imageUrl)" fit="cover" :preview-src-list="previewList(row)" preview-teleported><template #error><div class="image-empty"><PictureFilled /></div></template></el-image></template></el-table-column>
            <el-table-column label="任务 / 批次" min-width="170"><template #default="{ row }"><div class="stack-cell"><b>{{ row.taskName }}</b><small>批次 {{ row.runId }} · 明细 {{ row.itemId }}</small></div></template></el-table-column>
            <el-table-column label="识别结果" min-width="150"><template #default="{ row }"><div class="stack-cell"><b>{{ row.diseaseName || '暂无结果' }}</b><small v-if="row.confidence != null">置信度 {{ confidence(row.confidence) }}</small></div></template></el-table-column>
            <el-table-column label="处理状态" width="105" align="center"><template #default="{ row }"><el-tag :type="itemStatusType(row.itemStatus)">{{ itemStatusText(row.itemStatus) }}</el-tag></template></el-table-column>
            <el-table-column prop="attemptCount" label="尝试" width="70" align="center" />
            <el-table-column label="关联数据" min-width="190"><template #default="{ row }"><div class="id-list"><span>图片 {{ row.aiImageId || '-' }}</span><span>记录 {{ row.recordId || '-' }}</span><span>结果 {{ row.diseaseId || '-' }}</span></div></template></el-table-column>
            <el-table-column label="完成时间" min-width="160"><template #default="{ row }">{{ formatTime(row.finishTime) }}</template></el-table-column>
            <el-table-column prop="errorMessage" label="异常信息" min-width="180" show-overflow-tooltip />
          </el-table>
          <pagination v-show="itemTotal > 0" :total="itemTotal" v-model:page="itemQuery.pageNum" v-model:limit="itemQuery.pageSize" @pagination="loadItems" />
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog v-model="taskDialogOpen" :title="taskForm.taskId ? '修改自动识别任务' : '新增自动识别任务'" width="760px" destroy-on-close>
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="110px" class="task-form">
        <el-row :gutter="18">
          <el-col :span="12"><el-form-item label="任务名称" prop="taskName"><el-input v-model.trim="taskForm.taskName" maxlength="100" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="作物类型" prop="cropType"><el-input v-model.trim="taskForm.cropType" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="园区" prop="parkId"><el-select v-model="taskForm.parkId" placeholder="请选择园区" @change="handleFormParkChange"><el-option v-for="item in options.parks" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="摄像头设备" prop="deviceId"><el-select v-model="taskForm.deviceId" placeholder="请选择设备"><el-option v-for="item in formDevices" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="识别模型" prop="modelId"><el-select v-model="taskForm.modelId" placeholder="请选择模型"><el-option v-for="item in options.models" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="调度方式" prop="scheduleType"><el-radio-group v-model="taskForm.scheduleType"><el-radio-button value="fixed">固定时刻</el-radio-button><el-radio-button value="interval">间隔执行</el-radio-button></el-radio-group></el-form-item></el-col>
          <el-col v-if="taskForm.scheduleType === 'fixed'" :span="12"><el-form-item label="执行时刻" prop="fixedTimes"><el-input v-model.trim="taskForm.fixedTimes" placeholder="如 08:00,14:00,20:00" /></el-form-item></el-col>
          <el-col v-else :span="12"><el-form-item label="间隔分钟" prop="intervalMinutes"><el-input-number v-model="taskForm.intervalMinutes" :min="5" :max="1440" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="生效时段"><el-time-picker v-model="activeTimeRange" is-range value-format="HH:mm:ss" start-placeholder="开始时间" end-placeholder="结束时间" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="任务状态" prop="taskStatus"><el-radio-group v-model="taskForm.taskStatus"><el-radio value="0">启用</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model.trim="taskForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer><el-button @click="taskDialogOpen = false">取消</el-button><el-button type="primary" :loading="taskSubmitting" @click="submitTask">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="DiseaseAutoManage">
import { computed, getCurrentInstance, reactive, ref } from 'vue'
import { Calendar, DataAnalysis, Delete, Download, Edit, Loading, Picture, PictureFilled, Plus, Refresh, Search, VideoPlay, View } from '@element-plus/icons-vue'
import {
  addAutoManageTask, changeAutoManageTaskStatus, deleteAutoManageTasks, getAutoManageOptions,
  getAutoManageSummary, getAutoManageTask, listAutoManageItems, listAutoManageRuns,
  listAutoManageTasks, runAutoManageTask, updateAutoManageTask
} from '@/api/binZhou/sxz/diseaseAutoManage'

const { proxy } = getCurrentInstance()
const activeTab = ref('task')
const summaryLoading = ref(false)
const taskLoading = ref(false)
const runLoading = ref(false)
const itemLoading = ref(false)
const taskSubmitting = ref(false)
const summary = reactive({})
const tasks = ref([])
const runs = ref([])
const items = ref([])
const taskTotal = ref(0)
const runTotal = ref(0)
const itemTotal = ref(0)
const options = reactive({ parks: [], devices: [], models: [] })
const queryDevices = ref([])
const formDevices = ref([])
const runDateRange = ref([])
const itemDateRange = ref([])
const activeTimeRange = ref(['00:00:00', '23:59:59'])
const taskDialogOpen = ref(false)

const taskQuery = reactive({ pageNum: 1, pageSize: 10, taskName: '', parkId: undefined, deviceId: undefined, taskStatus: '' })
const runQuery = reactive({ pageNum: 1, pageSize: 10, taskId: undefined, taskName: '', triggerType: '', runStatus: '', beginTime: '', endTime: '' })
const itemQuery = reactive({ pageNum: 1, pageSize: 10, taskId: undefined, runId: undefined, taskName: '', itemStatus: '', diseaseName: '', beginTime: '', endTime: '' })
const taskForm = reactive(defaultTaskForm())

const runStatusOptions = [
  { label: '执行中', value: 'RUNNING' }, { label: '成功', value: 'SUCCESS' },
  { label: '部分成功', value: 'PARTIAL' }, { label: '失败', value: 'FAILED' },
  { label: '已跳过', value: 'SKIPPED' }, { label: '已中断', value: 'INTERRUPTED' }
]
const itemStatusOptions = [
  { label: '等待处理', value: 'PENDING' }, { label: '识别中', value: 'RUNNING' },
  { label: '成功', value: 'SUCCESS' }, { label: '失败', value: 'FAILED' }, { label: '已跳过', value: 'SKIPPED' }
]
const taskRules = computed(() => ({
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  cropType: [{ required: true, message: '请输入作物类型', trigger: 'blur' }],
  parkId: [{ required: true, message: '请选择园区', trigger: 'change' }],
  deviceId: [{ required: true, message: '请选择设备', trigger: 'change' }],
  modelId: [{ required: true, message: '请选择识别模型', trigger: 'change' }],
  scheduleType: [{ required: true, message: '请选择调度方式', trigger: 'change' }],
  fixedTimes: taskForm.scheduleType === 'fixed' ? [{ required: true, message: '请输入执行时刻', trigger: 'blur' }] : [],
  intervalMinutes: taskForm.scheduleType === 'interval' ? [{ required: true, message: '请输入间隔分钟', trigger: 'change' }] : []
}))

function defaultTaskForm() {
  return { taskId: undefined, taskName: '', parkId: undefined, deviceId: undefined, modelId: undefined, cropType: '枣树', scheduleType: 'fixed', fixedTimes: '08:00,14:00,20:00', intervalMinutes: 60, activeStartTime: '00:00:00', activeEndTime: '23:59:59', taskStatus: '0', remark: '' }
}

async function loadSummary() {
  summaryLoading.value = true
  try { Object.assign(summary, (await getAutoManageSummary()).data || {}) } finally { summaryLoading.value = false }
}

async function loadOptions(parkId, target = 'base') {
  const data = (await getAutoManageOptions(parkId ? { parkId } : {})).data || {}
  if (target === 'base') {
    options.parks = data.parks || []
    options.devices = data.devices || []
    options.models = data.models || []
    queryDevices.value = options.devices
  } else if (target === 'query') queryDevices.value = data.devices || []
  else formDevices.value = data.devices || []
}

async function loadTasks() {
  taskLoading.value = true
  try { const res = await listAutoManageTasks(taskQuery); tasks.value = res.rows || []; taskTotal.value = res.total || 0 } finally { taskLoading.value = false }
}
async function loadRuns() {
  runLoading.value = true
  applyDateRange(runQuery, runDateRange.value)
  try { const res = await listAutoManageRuns(runQuery); runs.value = res.rows || []; runTotal.value = res.total || 0 } finally { runLoading.value = false }
}
async function loadItems() {
  itemLoading.value = true
  applyDateRange(itemQuery, itemDateRange.value)
  try { const res = await listAutoManageItems(itemQuery); items.value = res.rows || []; itemTotal.value = res.total || 0 } finally { itemLoading.value = false }
}

function applyDateRange(query, range) { query.beginTime = range?.[0] || ''; query.endTime = range?.[1] || '' }
function handleTaskQuery() { taskQuery.pageNum = 1; loadTasks() }
function handleRunQuery() { runQuery.pageNum = 1; loadRuns() }
function handleItemQuery() { itemQuery.pageNum = 1; loadItems() }
function resetTaskQuery() { Object.assign(taskQuery, { pageNum: 1, taskName: '', parkId: undefined, deviceId: undefined, taskStatus: '' }); queryDevices.value = options.devices; loadTasks() }
function resetRunQuery() { Object.assign(runQuery, { pageNum: 1, taskId: undefined, taskName: '', triggerType: '', runStatus: '', beginTime: '', endTime: '' }); runDateRange.value = []; loadRuns() }
function resetItemQuery() { Object.assign(itemQuery, { pageNum: 1, taskId: undefined, runId: undefined, taskName: '', itemStatus: '', diseaseName: '', beginTime: '', endTime: '' }); itemDateRange.value = []; loadItems() }

async function handleQueryParkChange(parkId) { taskQuery.deviceId = undefined; await loadOptions(parkId, 'query') }
async function handleFormParkChange(parkId) { taskForm.deviceId = undefined; await loadOptions(parkId, 'form') }
function handleTabChange(name) { if (name === 'task') loadTasks(); else if (name === 'run') loadRuns(); else loadItems() }
function refreshCurrent() { loadSummary(); handleTabChange(activeTab.value) }

async function openTaskDialog(row) {
  Object.assign(taskForm, defaultTaskForm())
  activeTimeRange.value = ['00:00:00', '23:59:59']
  if (row?.taskId) {
    const data = (await getAutoManageTask(row.taskId)).data || {}
    Object.assign(taskForm, data)
    activeTimeRange.value = [data.activeStartTime || '00:00:00', data.activeEndTime || '23:59:59']
    await loadOptions(data.parkId, 'form')
  } else {
    formDevices.value = options.devices
  }
  taskDialogOpen.value = true
}

async function submitTask() {
  const valid = await proxy.$refs.taskFormRef.validate().catch(() => false)
  if (!valid) return
  taskForm.activeStartTime = activeTimeRange.value?.[0] || '00:00:00'
  taskForm.activeEndTime = activeTimeRange.value?.[1] || '23:59:59'
  if (taskForm.scheduleType === 'fixed') taskForm.intervalMinutes = null
  else taskForm.fixedTimes = null
  taskSubmitting.value = true
  try {
    if (taskForm.taskId) await updateAutoManageTask({ ...taskForm })
    else await addAutoManageTask({ ...taskForm })
    proxy.$modal.msgSuccess(taskForm.taskId ? '修改成功' : '新增成功')
    taskDialogOpen.value = false
    await Promise.all([loadTasks(), loadSummary()])
  } finally { taskSubmitting.value = false }
}

async function changeStatus(row, enabled) {
  try { await changeAutoManageTaskStatus(row.taskId, enabled ? '0' : '1'); proxy.$modal.msgSuccess(enabled ? '任务已启用' : '任务已停用'); await Promise.all([loadTasks(), loadSummary()]) } catch { loadTasks() }
}
function runTask(row) { proxy.$modal.confirm(`确认立即执行任务“${row.taskName}”吗？`).then(() => runAutoManageTask(row.taskId)).then(() => { proxy.$modal.msgSuccess('任务执行完成'); return Promise.all([loadTasks(), loadSummary()]) }).catch(() => {}) }
function removeTask(row) { proxy.$modal.confirm(`确认删除任务“${row.taskName}”吗？`).then(() => deleteAutoManageTasks(row.taskId)).then(() => { proxy.$modal.msgSuccess('删除成功'); return Promise.all([loadTasks(), loadSummary()]) }).catch(() => {}) }
function viewTaskRuns(row) { Object.assign(runQuery, { pageNum: 1, taskId: row.taskId, taskName: row.taskName }); activeTab.value = 'run'; loadRuns() }
function viewRunItems(row) { Object.assign(itemQuery, { pageNum: 1, taskId: row.taskId, runId: row.runId, taskName: row.taskName }); activeTab.value = 'item'; loadItems() }

function exportTasks() { proxy.download('/sxz/disease-auto-manage/tasks/export', { ...taskQuery }, `自动识别任务_${Date.now()}.xlsx`) }
function exportRuns() { applyDateRange(runQuery, runDateRange.value); proxy.download('/sxz/disease-auto-manage/runs/export', { ...runQuery }, `自动识别批次_${Date.now()}.xlsx`) }
function exportItems() { applyDateRange(itemQuery, itemDateRange.value); proxy.download('/sxz/disease-auto-manage/items/export', { ...itemQuery }, `自动识别图片明细_${Date.now()}.xlsx`) }

function formatTime(value) { return value ? proxy.parseTime(value, '{y}-{m}-{d} {h}:{i}:{s}') : '-' }
function scheduleText(row) { return row.scheduleType === 'fixed' ? `每日 ${row.fixedTimes || '-'}` : `每 ${row.intervalMinutes || '-'} 分钟` }
function activeWindowText(row) { return `${row.activeStartTime || '00:00:00'} - ${row.activeEndTime || '23:59:59'}` }
function runStatusText(value) { return runStatusOptions.find(item => item.value === value)?.label || value || '未知' }
function runStatusType(value) { return ({ SUCCESS: 'success', RUNNING: 'warning', PARTIAL: 'warning', FAILED: 'danger', SKIPPED: 'info', INTERRUPTED: 'danger' })[value] || 'info' }
function itemStatusText(value) { return itemStatusOptions.find(item => item.value === value)?.label || value || '未知' }
function itemStatusType(value) { return ({ SUCCESS: 'success', RUNNING: 'warning', FAILED: 'danger', PENDING: 'info', SKIPPED: 'info' })[value] || 'info' }
function confidence(value) { const num = Number(value || 0); return `${(num <= 1 ? num * 100 : num).toFixed(2)}%` }
function imageUrl(url) { if (!url) return ''; if (/^(https?:|data:|blob:)/.test(url)) return url; const base = import.meta.env.VITE_APP_BASE_API || ''; return `${base}${url.startsWith('/') ? '' : '/'}${url}` }
function previewList(row) { const url = imageUrl(row.resultImageUrl || row.imageUrl); return url ? [url] : [] }

Promise.all([loadOptions(), loadSummary(), loadTasks()])
</script>

<style scoped>
.auto-manage-page { min-height: calc(100vh - 84px); padding: 18px; background: #f4f7f6; color: #273a33; }
.page-heading { display: flex; justify-content: space-between; align-items: center; padding: 22px 26px; background: #fff; border: 1px solid #e3ebe7; border-radius: 6px; }
.page-heading h1 { margin: 2px 0 7px; font-size: 24px; letter-spacing: 0; }
.page-heading p { margin: 0; color: #7b8b84; }
.page-heading .eyebrow { color: #42a777; font-size: 11px; font-weight: 700; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 14px 0; }
.summary-grid article { display: flex; align-items: center; gap: 14px; min-height: 104px; padding: 18px; background: #fff; border: 1px solid #e3ebe7; border-radius: 6px; }
.summary-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 6px; background: #eaf7f0; color: #3da06f; flex: none; }
.summary-icon.running { background: #fff5e7; color: #d99238; }.summary-icon.batch { background: #edf3ff; color: #537ed2; }.summary-icon.image { background: #f3efff; color: #7b61c9; }
.summary-icon :deep(svg) { width: 22px; }
.summary-grid small { display: block; color: #84938c; }.summary-grid strong { display: block; margin: 2px 0; font-size: 27px; }.summary-grid p { margin: 0; color: #9aa7a1; font-size: 12px; }
.content-card { background: #fff; border: 1px solid #e3ebe7; border-radius: 6px; overflow: hidden; }
.manage-tabs :deep(.el-tabs__header) { margin: 0; padding: 0 22px; border-bottom: 1px solid #edf1ef; }
.manage-tabs :deep(.el-tabs__item) { height: 54px; font-size: 15px; }.manage-tabs :deep(.el-tabs__active-bar) { background: #42a777; }.manage-tabs :deep(.el-tabs__item.is-active) { color: #328c61; }
.manage-tabs :deep(.el-tab-pane) { padding: 18px 22px 22px; }
.query-form { padding: 16px 16px 4px; background: #f8faf9; border: 1px solid #edf1ef; border-radius: 4px; }
.query-form :deep(.el-select), .query-form :deep(.el-input) { width: 180px; }
.table-toolbar { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 12px; }
.table-toolbar h2 { display: inline; margin: 0 10px 0 0; font-size: 17px; }.table-toolbar span { color: #8b9892; font-size: 12px; }
.agri-table { --el-table-header-bg-color: #eef8f3; --el-table-header-text-color: #34795a; }
.primary-cell { display: flex; align-items: center; gap: 10px; }.cell-icon { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 5px; background: #eaf7f0; color: #3d9a6d; flex: none; }.cell-icon :deep(svg) { width: 17px; }
.primary-cell b, .stack-cell b { display: block; color: #2c3e37; }.primary-cell small, .stack-cell small, .muted-block { display: block; margin-top: 3px; color: #98a49f; font-size: 12px; }
.table-image { width: 56px; height: 56px; border-radius: 4px; border: 1px solid #e0e8e4; }.image-empty { display: grid; place-items: center; width: 100%; height: 100%; background: #f3f5f4; color: #b3bdb8; }
.id-list { display: flex; flex-wrap: wrap; gap: 5px; }.id-list span { padding: 2px 6px; background: #f2f6f4; border-radius: 3px; color: #687870; font-size: 12px; }
.task-form :deep(.el-select), .task-form :deep(.el-input-number), .task-form :deep(.el-time-editor) { width: 100%; }
@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, 1fr); }.page-heading { align-items: flex-start; } }
@media (max-width: 720px) { .auto-manage-page { padding: 10px; }.summary-grid { grid-template-columns: 1fr; }.page-heading { gap: 14px; flex-direction: column; }.table-toolbar { gap: 12px; align-items: flex-start; flex-direction: column; } }
</style>
