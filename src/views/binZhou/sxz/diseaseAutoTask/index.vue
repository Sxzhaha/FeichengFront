<template>
  <div class="auto-page">
    <header class="topbar">
      <div class="brand-area">
        <div class="brand"></div>

        <nav class="nav-list" aria-label="病害功能导航">
          <router-link class="nav-item" to="/disease-analysis">病害分析</router-link>
          <div class="nav-dropdown active">
            <button type="button" class="nav-item nav-trigger active" aria-current="page">
              <span>病害识别</span>
              <el-icon class="nav-caret"><ArrowDown /></el-icon>
            </button>
            <div class="nav-menu">
              <router-link class="nav-menu-item" to="/featureDisease">手动上传</router-link>
              <router-link class="nav-menu-item active" to="/sxz/disease-auto-task">自动识别</router-link>
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

    <main class="page-main">
      <section class="workspace-head">
        <div>
          <h1>病虫害自动识别</h1>
          <p>统一管理摄像头定时识别任务，掌握任务调度与执行状态。</p>
        </div>
      </section>

      <section class="metric-grid" v-loading="summaryLoading">
          <article><span>任务总数</span><strong>{{ summary.taskCount || 0 }}</strong><small>个任务</small></article>
          <article><span>启用任务</span><strong>{{ summary.enabledTaskCount || 0 }}</strong><small>正常调度</small></article>
          <article><span>今日运行</span><strong>{{ summary.todayRunCount || 0 }}</strong><small>个批次</small></article>
          <article :class="{ danger: Number(summary.abnormalTaskCount) > 0 }"><span>异常任务</span><strong>{{ summary.abnormalTaskCount || 0 }}</strong><small>需关注</small></article>
        </section>

        <section class="filter-bar task-filter-bar">
          <el-input v-model.trim="taskQuery.taskName" clearable placeholder="任务名称" @keyup.enter="loadTasks" />
          <el-select v-model="taskQuery.parkId" clearable placeholder="全部园区" @change="handleTaskParkChange">
            <el-option v-for="item in options.parks" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="taskQuery.deviceId" clearable placeholder="全部设备">
            <el-option v-for="item in taskDevices" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button :icon="Refresh" @click="resetTaskFilters">重置</el-button>
          <el-button :icon="Search" @click="loadTasks">查询</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建识别策略</el-button>
        </section>

        <section class="panel task-panel" v-loading="taskLoading">
          <div class="panel-head">
            <div><h2>自动识别策略</h2></div>
            <div class="panel-head-actions">
              <span>当前 {{ visibleTasks.length }} 个任务</span>
              <el-tooltip content="刷新任务" placement="top">
                <el-button :icon="Refresh" circle aria-label="刷新任务" @click="refreshTaskWorkspace" />
              </el-tooltip>
            </div>
          </div>

          <div class="task-status-tabs" role="tablist" aria-label="任务状态筛选">
            <button v-for="tab in taskStatusTabs" :key="tab.value" type="button" role="tab"
              :aria-selected="activeTaskStatus === tab.value" :class="{ active: activeTaskStatus === tab.value }"
              @click="activeTaskStatus = tab.value">
              <span>{{ tab.label }}</span><b>{{ tab.count }}</b>
            </button>
          </div>

          <el-empty v-if="!taskLoading && !visibleTasks.length" :description="taskEmptyText">
            <el-button v-if="!tasks.length" type="primary" :icon="Plus" @click="openCreate">新建识别策略</el-button>
            <el-button v-else @click="activeTaskStatus = 'all'">查看全部任务</el-button>
          </el-empty>

          <div v-else class="task-card-grid">
            <article v-for="row in visibleTasks" :key="row.taskId"
              :class="['task-card', `task-card--${taskState(row).tone}`]">
              <div class="task-card-stage">
                <div class="task-stage-head">
                  <span :class="['capture-status', { active: isCaptureTaskActive(row) }]">
                    <i aria-hidden="true"></i>{{ captureTaskStatusText(row) }}
                  </span>
                  <div class="strategy-switch">
                    <span>启用自动识别</span>
                    <el-tooltip :content="taskSwitchTip(row)" :disabled="canToggleTask(row)" placement="top">
                      <span class="control-wrap">
                        <el-switch :model-value="row.taskStatus === '0'" :loading="statusChangingId === row.taskId"
                          :disabled="!canToggleTask(row)" :aria-label="`${row.taskName}自动识别启用状态`"
                          @change="toggleTask(row)" />
                      </span>
                    </el-tooltip>
                  </div>
                </div>
                <div class="task-stage-content">
                  <span class="task-stage-icon"><Calendar /></span>
                  <div>
                    <small>上游抓拍任务</small>
                    <strong>{{ row.cameraTaskName || '未绑定抓拍任务' }}</strong>
                    <p>{{ captureRuleText(row) }}</p>
                  </div>
                </div>
              </div>

              <div class="task-card-body">
                <div v-if="!isCaptureTaskActive(row)" class="upstream-warning">
                  <WarningFilled />
                  <div>
                    <strong>{{ row.cameraTaskId ? '上游抓拍任务已停用' : '尚未绑定上游抓拍任务' }}</strong>
                    <span>自动识别暂无法执行，请先恢复抓拍任务。</span>
                  </div>
                </div>
                <div class="task-card-title-row">
                  <div class="task-card-title">
                    <h3 :title="row.taskName">{{ row.taskName }}</h3>
                    <p :title="row.parkName">{{ row.parkName || '未关联园区' }}</p>
                  </div>
                  <div class="task-title-actions">
                    <span class="crop-tag">{{ row.cropType || '枣树' }}</span>
                    <el-dropdown trigger="click" @command="handleTaskMenu($event, row)">
                      <button type="button" class="more-button" :aria-label="`${row.taskName}更多操作`"><MoreFilled /></button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="edit" :icon="Edit" :disabled="row.runState === 'RUNNING'">编辑任务</el-dropdown-item>
                          <el-dropdown-item command="delete" :icon="Delete" :disabled="row.runState === 'RUNNING'" divided>删除任务</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>

                <dl class="task-detail-list">
                  <div><dt><Monitor />摄像头</dt><dd :title="row.deviceName">{{ row.deviceName || '未关联设备' }}</dd></div>
                  <div><dt><Cpu />识别模型</dt><dd :title="row.modelName">{{ row.modelName || '未关联模型' }}</dd></div>
                  <div><dt><Timer />抓拍位置</dt><dd>{{ row.areaName || row.parkName || '未关联位置' }}</dd></div>
                  <div><dt><Clock />上次执行</dt><dd>{{ compactTime(row.lastRunTime, '尚未执行') }}</dd></div>
                  <div><dt><View />最近结果</dt><dd :class="statusClass(row.lastRunStatus)">{{ statusText(row.lastRunStatus) }}</dd></div>
                </dl>

                <el-tooltip v-if="showTaskMessage(row)" :content="row.lastRunMessage" placement="top">
                  <p class="task-message"><WarningFilled />{{ row.lastRunMessage }}</p>
                </el-tooltip>

                <footer class="task-card-footer">
                  <el-button text type="primary" :icon="View" @click="openRuns(row)">查看批次</el-button>
                  <el-tooltip :content="runButtonTip(row)" :disabled="canRunTask(row)" placement="top">
                    <span class="control-wrap">
                      <el-button type="success" plain :icon="VideoPlay" :loading="runningTaskId === row.taskId"
                        :disabled="!canRunTask(row)" @click="runNow(row)">
                        {{ row.runState === 'RUNNING' ? '执行中' : '立即执行' }}
                      </el-button>
                    </span>
                  </el-tooltip>
                </footer>
              </div>
            </article>
          </div>
        </section>
    </main>

    <el-drawer v-model="runDrawer" :title="`${activeTask?.taskName || ''} · 执行批次`" size="720px">
      <el-table :data="runs" v-loading="runLoading" height="310" highlight-current-row @current-change="loadRunItems">
        <el-table-column label="开始时间" min-width="165"><template #default="{ row }">{{ formatTime(row.startTime) }}</template></el-table-column>
        <el-table-column label="触发" width="90"><template #default="{ row }">{{ row.triggerType === 'AUTO' ? '自动' : '立即' }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><span :class="statusClass(row.runStatus)">{{ statusText(row.runStatus) }}</span></template></el-table-column>
        <el-table-column prop="successCount" label="成功" width="80" />
        <el-table-column prop="failCount" label="失败" width="80" />
      </el-table>
      <h3 class="drawer-subtitle">本批次图片明细</h3>
      <el-table :data="runItems" v-loading="itemLoading" height="340" empty-text="选择批次后查看图片明细">
        <el-table-column label="图片" width="90"><template #default="{ row }"><el-image class="thumb" :src="imageUrl(row.imageUrl)" fit="cover" /></template></el-table-column>
        <el-table-column prop="itemStatus" label="状态" width="100" />
        <el-table-column prop="attemptCount" label="尝试次数" width="90" align="center" />
        <el-table-column label="完成时间" min-width="165"><template #default="{ row }">{{ formatTime(row.finishTime) }}</template></el-table-column>
        <el-table-column prop="errorMessage" label="异常信息" min-width="170" show-overflow-tooltip />
      </el-table>
    </el-drawer>

    <el-dialog v-model="taskDialog" :title="form.taskId ? '编辑自动识别策略' : '新建自动识别策略'" width="800px" destroy-on-close>
      <el-steps :active="formStep" finish-status="success" align-center><el-step title="绑定抓拍任务" /><el-step title="识别配置" /><el-step title="确认策略" /></el-steps>
      <el-form ref="taskFormRef" :model="form" :rules="formRules" label-position="top" class="wizard-form">
        <div v-show="formStep === 0" class="form-grid">
          <el-form-item label="策略名称" prop="taskName"><el-input v-model.trim="form.taskName" maxlength="100" show-word-limit placeholder="例如：东区摄像头自动识别" /></el-form-item>
          <el-form-item label="抓拍任务" prop="cameraTaskId">
            <el-select v-model="form.cameraTaskId" filterable placeholder="请选择已有摄像头抓拍任务" @change="handleCaptureTaskChange">
              <el-option v-for="item in options.cameraTasks" :key="item.value" :label="item.label" :value="item.value">
                <span class="capture-option"><span>{{ item.label }}</span><el-tag :type="isCaptureOptionActive(item) ? 'success' : 'info'" size="small" effect="plain">{{ isCaptureOptionActive(item) ? '运行中' : '已停用' }}</el-tag></span>
              </el-option>
            </el-select>
          </el-form-item>
          <div v-if="selectedCaptureTask" class="capture-preview full">
            <div class="capture-preview-head">
              <div><span class="capture-preview-icon"><Camera /></span><div><small>已绑定抓拍任务</small><strong>{{ selectedCaptureTask.label }}</strong></div></div>
              <el-tag :type="selectedCaptureTask.status === '0' ? 'success' : 'info'" effect="plain" round>{{ selectedCaptureTask.status === '0' ? '运行中' : '已停用' }}</el-tag>
            </div>
            <dl>
              <div><dt><Monitor />摄像头</dt><dd>{{ selectedCaptureTask.deviceName || '未关联' }}</dd></div>
              <div><dt><Cpu />设备编号</dt><dd>{{ selectedCaptureTask.deviceSn || '未记录' }}</dd></div>
              <div><dt><House />园区 / 区域</dt><dd>{{ captureLocationText(selectedCaptureTask) }}</dd></div>
              <div><dt><View />预置点</dt><dd>{{ selectedCaptureTask.pointIndex ?? '未设置' }}</dd></div>
              <div><dt><Timer />抓拍规则</dt><dd>{{ captureOptionRuleText(selectedCaptureTask) }}</dd></div>
              <div><dt><Picture />每次抓拍</dt><dd>{{ selectedCaptureTask.captureCount || 1 }} 张</dd></div>
            </dl>
            <p v-if="!selectedCaptureTaskActive" class="capture-disabled-tip"><WarningFilled />该抓拍任务当前未启用，仍可创建自动识别策略，但策略将先保存为停用状态。</p>
          </div>
          <p v-else class="field-tip full">自动识别不会重复创建定时器，而是在抓拍任务产出新图片后进行识别。</p>
        </div>
        <div v-show="formStep === 1" class="form-grid">
          <el-form-item label="病虫害识别模型" prop="modelId" class="full"><el-select v-model="form.modelId" placeholder="请选择已启用且配置接口地址的病虫害模型"><el-option v-for="item in options.models" :key="item.value" :label="item.label" :value="item.value" /></el-select><p v-if="!options.models.length" class="field-tip warning">当前数据库暂无可用病虫害模型，请先由模型维护人员完成配置。</p></el-form-item>
          <el-form-item label="作物类型" prop="cropType"><el-input v-model.trim="form.cropType" placeholder="枣树" /></el-form-item>
          <el-form-item label="失败后额外重试" prop="maxRetryCount"><el-input-number v-model="form.maxRetryCount" :min="0" :max="10" /><span class="unit">次</span><p class="field-tip">仅对连接超时、服务繁忙等临时异常重试；填写 3 表示最多调用 4 次。</p></el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="form.enabled" :disabled="Boolean(selectedCaptureTask) && !selectedCaptureTaskActive"
              active-text="保存后立即启用" :inactive-text="selectedCaptureTask && !selectedCaptureTaskActive ? '上游停用，先保存策略' : '先保存为停用'" />
          </el-form-item>
          <el-form-item label="策略备注" class="full"><el-input v-model.trim="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
        </div>
        <div v-show="formStep === 2" class="confirm-box">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="策略名称">{{ form.taskName }}</el-descriptions-item><el-descriptions-item label="作物">{{ form.cropType }}</el-descriptions-item>
            <el-descriptions-item label="抓拍任务">{{ selectedCaptureTask?.label || '未选择' }}</el-descriptions-item><el-descriptions-item label="摄像头">{{ selectedCaptureTask?.deviceName || '未关联' }}</el-descriptions-item>
            <el-descriptions-item label="园区 / 区域">{{ captureLocationText(selectedCaptureTask) }}</el-descriptions-item><el-descriptions-item label="抓拍规则">{{ captureOptionRuleText(selectedCaptureTask) }}</el-descriptions-item>
            <el-descriptions-item label="识别模型">{{ optionLabel(options.models, form.modelId) }}</el-descriptions-item><el-descriptions-item label="失败后额外重试">{{ form.maxRetryCount }} 次</el-descriptions-item>
            <el-descriptions-item label="保存状态" :span="2">{{ selectedCaptureTaskActive && form.enabled ? '启用并等待执行' : '停用，待上游恢复后启用' }}</el-descriptions-item>
          </el-descriptions>
          <p :class="['confirm-note', { warning: !selectedCaptureTaskActive }]">{{ selectedCaptureTaskActive ? '启用后，系统只消费该抓拍任务新产生且尚未识别的图片，不会重复处理历史图片。' : '当前上游抓拍任务未启用，本策略可以正常保存，但不会执行识别；上游恢复后可在任务卡片中手动启用。' }}</p>
        </div>
      </el-form>
      <template #footer><el-button @click="taskDialog = false">取消</el-button><el-button v-if="formStep > 0" @click="formStep--">上一步</el-button><el-button v-if="formStep < 2" type="primary" @click="nextStep">下一步</el-button><el-button v-else type="primary" :loading="saving" @click="saveTask">保存策略</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Calendar, Camera, Clock, Cpu, Delete, Edit, House, Monitor, MoreFilled, Picture, Plus, Refresh, Search, Timer, VideoPlay, View, WarningFilled } from '@element-plus/icons-vue'
import {
  addDiseaseAutoTask, changeDiseaseAutoTaskStatus, deleteDiseaseAutoTask,
  getDiseaseAutoTaskOptions, getDiseaseAutoTaskSummary,
  listDiseaseAutoTaskRunItems, listDiseaseAutoTaskRuns,
  listDiseaseAutoTasks, runDiseaseAutoTask, updateDiseaseAutoTask
} from '@/api/binZhou/sxz/diseaseAutoTask'

const router = useRouter()
const summary = reactive({})
const options = reactive({ parks: [], devices: [], models: [], cameraTasks: [] })
const taskDevices = ref([])
const summaryLoading = ref(false), taskLoading = ref(false)
const tasks = ref([])
const runDrawer = ref(false), activeTask = ref(null), runs = ref([]), runItems = ref([])
const runLoading = ref(false), itemLoading = ref(false), statusChangingId = ref(null)
const runningTaskId = ref(null), activeTaskStatus = ref('all')
const taskDialog = ref(false), formStep = ref(0), taskFormRef = ref(), saving = ref(false)

const taskQuery = reactive({ taskName: '', parkId: null, deviceId: null, taskStatus: '', pageNum: 1, pageSize: 100 })
const form = reactive(defaultForm())
const formRules = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }], cropType: [{ required: true, message: '请输入作物类型', trigger: 'blur' }],
  cameraTaskId: [{ required: true, message: '请选择摄像头抓拍任务', trigger: 'change' }],
  modelId: [{ required: true, message: '请选择病虫害识别模型', trigger: 'change' }],
  maxRetryCount: [{ required: true, message: '请设置失败重试次数', trigger: 'change' }]
}

const selectedCaptureTask = computed(() => options.cameraTasks.find(item => String(item.value) === String(form.cameraTaskId)) || null)
const selectedCaptureTaskActive = computed(() => isCaptureOptionActive(selectedCaptureTask.value))
const taskStatusTabs = computed(() => {
  const counts = { all: tasks.value.length, executing: 0, waiting: 0, stopped: 0 }
  tasks.value.forEach(row => { counts[taskState(row).group] += 1 })
  return [
    { label: '全部', value: 'all', count: counts.all },
    { label: '执行中', value: 'executing', count: counts.executing },
    { label: '等待中', value: 'waiting', count: counts.waiting },
    { label: '已停用', value: 'stopped', count: counts.stopped }
  ]
})
const visibleTasks = computed(() => activeTaskStatus.value === 'all' ? tasks.value : tasks.value.filter(row => taskState(row).group === activeTaskStatus.value))
const taskEmptyText = computed(() => tasks.value.length ? '当前状态下暂无任务' : '暂无定时任务，创建后即可开始自动识别')

onMounted(async () => {
  await Promise.all([loadOptions(), loadSummary()])
  await loadTasks()
})

function defaultForm() { return { taskId: null, taskName: '', cameraTaskId: null, modelId: null, cropType: '枣树', consumeMode: 'CAPTURE_TASK', maxRetryCount: 3, enabled: true, remark: '' } }

async function loadOptions(parkId) { const { data = {} } = await getDiseaseAutoTaskOptions(parkId ? { parkId } : {}); options.parks = data.parks || []; options.models = data.models || []; if (!parkId) { options.devices = data.devices || []; options.cameraTasks = data.cameraTasks || []; taskDevices.value = options.devices } return data.devices || [] }
async function loadSummary() { summaryLoading.value = true; try { Object.assign(summary, (await getDiseaseAutoTaskSummary()).data || {}) } finally { summaryLoading.value = false } }
async function loadTasks() { taskLoading.value = true; try { const res = await listDiseaseAutoTasks(cleanQuery(taskQuery)); tasks.value = res.rows || [] } finally { taskLoading.value = false } }
async function handleTaskParkChange(value) { taskQuery.deviceId = null; taskDevices.value = await loadOptions(value) }
function handleCaptureTaskChange(value) {
  const task = options.cameraTasks.find(item => String(item.value) === String(value))
  if (!task) return
  if (!form.taskName) form.taskName = `${task.label}自动识别`
  if (!isCaptureOptionActive(task)) form.enabled = false
}
function resetTaskFilters() { Object.assign(taskQuery, { taskName: '', parkId: null, deviceId: null, taskStatus: '' }); activeTaskStatus.value = 'all'; taskDevices.value = options.devices; loadTasks() }
async function refreshTaskWorkspace() { await Promise.all([loadTasks(), loadSummary()]) }

async function openRuns(row) { activeTask.value = row; runDrawer.value = true; runItems.value = []; runLoading.value = true; try { runs.value = (await listDiseaseAutoTaskRuns(row.taskId, { pageNum: 1, pageSize: 50 })).rows || [] } finally { runLoading.value = false } }
async function loadRunItems(row) { if (!row) return; itemLoading.value = true; try { runItems.value = (await listDiseaseAutoTaskRunItems(row.runId, { pageNum: 1, pageSize: 100 })).rows || [] } finally { itemLoading.value = false } }

function openCreate() { Object.assign(form, defaultForm()); formStep.value = 0; taskDialog.value = true }
function openEdit(row) {
  const captureTask = options.cameraTasks.find(item => String(item.value) === String(row.cameraTaskId))
  Object.assign(form, defaultForm(), row, { enabled: row.taskStatus === '0' && isCaptureOptionActive(captureTask) })
  formStep.value = 0
  taskDialog.value = true
}
async function nextStep() { const fields = formStep.value === 0 ? ['taskName', 'cameraTaskId'] : ['modelId', 'cropType', 'maxRetryCount']; const valid = await Promise.all(fields.map(field => taskFormRef.value.validateField(field).then(() => true).catch(() => false))); if (valid.some(item => !item)) return; formStep.value++ }
async function saveTask() {
  saving.value = true
  const forcedDisabled = Boolean(selectedCaptureTask.value) && !selectedCaptureTaskActive.value
  try {
    const payload = { ...form, taskStatus: form.enabled && !forcedDisabled ? '0' : '1' }
    delete payload.enabled
    form.taskId ? await updateDiseaseAutoTask(payload) : await addDiseaseAutoTask(payload)
    ElMessage.success(forcedDisabled ? '策略已保存，上游抓拍未启用，当前保持停用' : '自动识别策略已保存')
    taskDialog.value = false
    await refreshTaskWorkspace()
  } finally {
    saving.value = false
  }
}
async function toggleTask(row) {
  if (!canToggleTask(row)) {
    ElMessage.warning(taskSwitchTip(row))
    return
  }
  statusChangingId.value = row.taskId
  try {
    await changeDiseaseAutoTaskStatus(row.taskId, row.taskStatus === '0' ? '1' : '0')
    ElMessage.success(row.taskStatus === '0' ? '自动识别策略已停用' : '自动识别策略已启用')
    await refreshTaskWorkspace()
  } finally {
    statusChangingId.value = null
  }
}
async function runNow(row) {
  if (!canRunTask(row)) {
    ElMessage.warning(runButtonTip(row))
    return
  }
  await ElMessageBox.confirm(
    `将读取“${row.taskName}”关联抓拍任务或摄像头最近一张历史图片并重新识别。此次结果标记为“立即执行”，不计入自动定时环境统计。`,
    '立即执行',
    { type: 'info', confirmButtonText: '开始识别' }
  )
  runningTaskId.value = row.taskId
  try {
    const response = await runDiseaseAutoTask(row.taskId)
    const run = response?.data || {}
    if (run.runStatus === 'SKIPPED') ElMessage.warning(run.errorMessage || '关联抓拍任务或摄像头暂无可用历史图片')
    else if (run.runStatus === 'FAILED') ElMessage.error(run.errorMessage || '立即识别失败，请查看批次详情')
    else ElMessage.success('最近一张抓拍图片识别完成')
    await refreshTaskWorkspace()
    const refreshedRow = tasks.value.find(item => String(item.taskId) === String(row.taskId)) || row
    await openRuns(refreshedRow)
    const currentRun = runs.value.find(item => String(item.runId) === String(run.runId))
    if (currentRun) await loadRunItems(currentRun)
  } finally {
    runningTaskId.value = null
  }
}
async function removeTask(row) { await ElMessageBox.confirm(`删除任务“${row.taskName}”？历史批次和识别结果将保留。`, '删除任务', { type: 'warning' }); await deleteDiseaseAutoTask(row.taskId); ElMessage.success('任务已删除'); await refreshTaskWorkspace() }
function handleTaskMenu(command, row) { if (command === 'edit') openEdit(row); if (command === 'delete') removeTask(row) }

function cleanQuery(source) { return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== '' && value !== null && value !== undefined)) }
function optionLabel(list, value) { return list.find(item => String(item.value) === String(value))?.label || '未选择' }
function imageUrl(url) { if (!url) return ''; if (/^(https?:|data:|blob:)/i.test(url)) return url; const base = import.meta.env.VITE_APP_BASE_API || ''; return `${base}${url.startsWith('/') ? '' : '/'}${url}` }
function formatTime(value) { return value ? String(value).replace('T', ' ').slice(0, 19) : '未记录' }
function statusText(status) { return ({ SUCCESS: '成功', PARTIAL: '部分成功', FAILED: '失败', SKIPPED: '无新图片', RUNNING: '执行中' })[status] || '未执行' }
function statusClass(status) { return ['status-text', status === 'SUCCESS' ? 'ok' : status === 'FAILED' ? 'bad' : status === 'PARTIAL' ? 'warn' : 'muted'] }
function taskState(row) {
  if (row.runState === 'RUNNING') return { label: '正在执行', group: 'executing', tone: 'running' }
  if (row.taskStatus === '1') return { label: '自动识别已停用', group: 'stopped', tone: 'disabled' }
  if (!isCaptureTaskActive(row)) return { label: '上游抓拍已停用', group: 'stopped', tone: 'warning' }
  if (row.lastRunStatus === 'FAILED') return { label: '等待重试', group: 'waiting', tone: 'danger' }
  if (row.lastRunStatus === 'PARTIAL') return { label: '等待下次执行', group: 'waiting', tone: 'warning' }
  if (!row.lastRunTime) return { label: '等待首次执行', group: 'waiting', tone: 'waiting' }
  return { label: '等待下次执行', group: 'waiting', tone: 'success' }
}
function isCaptureOptionActive(task) { return String(task?.status) === '0' }
function isCaptureTaskActive(row) { return String(row?.captureTaskStatus) === '0' }
function captureTaskStatusText(row) {
  if (!row?.cameraTaskId) return '未绑定抓拍任务'
  return isCaptureTaskActive(row) ? '抓拍任务运行中' : '抓拍任务已停用'
}
function canToggleTask(row) {
  if (row?.runState === 'RUNNING') return false
  return row?.taskStatus === '0' || isCaptureTaskActive(row)
}
function taskSwitchTip(row) {
  if (row?.runState === 'RUNNING') return '任务执行期间不能切换策略状态'
  if (!isCaptureTaskActive(row) && row?.taskStatus !== '0') return '请先恢复上游抓拍任务，再启用自动识别'
  return ''
}
function canRunTask(row) { return Boolean(row?.cameraTaskId && row?.modelId) && row?.runState !== 'RUNNING' }
function runButtonTip(row) {
  if (row?.runState === 'RUNNING') return '任务正在执行'
  if (!row?.cameraTaskId) return '任务未关联抓拍任务'
  if (!row?.modelId) return '任务未关联识别模型'
  return ''
}
function captureRuleText(row) { return captureOptionRuleText({ jobType: row.captureJobType, executeTime: row.captureExecuteTime, cronExpression: row.captureCronExpression }) }
function captureOptionRuleText(task) { if (!task) return '未配置抓拍规则'; if (task.jobType === 'once') return `单次抓拍 ${compactTime(task.executeTime)}`; if (task.jobType === 'cycle') return `周期抓拍 ${task.cronExpression || '规则未记录'}`; return task.cronExpression || compactTime(task.executeTime, '抓拍规则未记录') }
function captureLocationText(task) { if (!task) return '未关联'; return [task.parkName, task.areaName].filter(Boolean).join(' / ') || '未关联' }
function compactTime(value, fallback = '未记录') { return value ? String(value).replace('T', ' ').slice(5, 16) : fallback }
function showTaskMessage(row) { return ['FAILED', 'PARTIAL'].includes(row.lastRunStatus) && Boolean(row.lastRunMessage) }
</script>

<style scoped>
.auto-page{min-height:100vh;background:#f5f7f8;color:#2b3f38;font-family:"Microsoft YaHei",Arial,sans-serif;letter-spacing:0}.topbar{position:sticky;top:0;z-index:30;box-sizing:border-box;height:88px;padding:0 32px 0 50px;display:flex;align-items:center;justify-content:space-between;background:#fff;border-bottom:1px solid #edf1f3;box-shadow:0 2px 8px rgba(0,0,0,.02)}.brand-area,.brand,.top-actions{display:flex;align-items:center}.brand-area{gap:0}.brand{width:0;gap:0;overflow:hidden;font-size:0;margin-right:0;white-space:nowrap}.nav-list{height:88px;display:flex;align-items:center;gap:46px;flex-shrink:0}.nav-item{position:relative;height:88px;display:flex;align-items:center;color:#65736f;font-size:18px;font-weight:500;line-height:1;text-decoration:none;white-space:nowrap;cursor:pointer;transition:color 220ms ease,transform 220ms ease;touch-action:manipulation}.nav-item::after{content:"";position:absolute;right:8px;bottom:0;left:8px;height:4px;border-radius:4px 4px 0 0;background:linear-gradient(90deg,#50a879 0%,#5c85e8 100%);opacity:0;transform:scaleX(.35);transform-origin:center;transition:opacity 220ms ease,transform 220ms cubic-bezier(.22,1,.36,1)}.nav-item:hover{color:#347e59;transform:translateY(-1px)}.nav-item:hover::after{opacity:.42;transform:scaleX(.6)}.nav-item:focus-visible{outline:2px solid rgba(79,132,225,.78);outline-offset:-6px;border-radius:6px}.nav-item.active{color:#347e59;font-weight:700}.nav-item.active::after{opacity:1;transform:scaleX(1)}.nav-dropdown{position:relative;height:88px;display:flex;align-items:center}.nav-trigger{gap:6px;padding:0;border:0;background:transparent;font-family:inherit}.nav-caret{font-size:13px;transition:transform 200ms ease}.nav-dropdown:hover .nav-caret,.nav-dropdown:focus-within .nav-caret{transform:rotate(180deg)}.nav-menu{position:absolute;top:72px;left:50%;z-index:40;min-width:150px;padding:8px;display:grid;gap:4px;border:1px solid #ddebe5;border-radius:8px;background:rgba(255,255,255,.98);box-shadow:0 16px 34px rgba(32,78,58,.14);opacity:0;pointer-events:none;visibility:hidden;transform:translate(-50%,8px) scale(.98);transition:opacity 180ms ease,transform 180ms ease,visibility 180ms ease}.nav-menu::before{content:"";position:absolute;top:-12px;right:0;left:0;height:12px}.nav-dropdown:hover .nav-menu,.nav-dropdown:focus-within .nav-menu{opacity:1;pointer-events:auto;visibility:visible;transform:translate(-50%,0) scale(1)}.nav-menu-item{min-height:36px;padding:0 14px;display:flex;align-items:center;color:#51635d;font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;border-radius:6px;transition:color 180ms ease,background 180ms ease,transform 180ms ease}.nav-menu-item:hover,.nav-menu-item.active{color:#25794f;background:#eef9f4}.nav-menu-item:hover{transform:translateX(2px)}.top-actions{margin-left:auto;gap:10px;flex-shrink:0}.home-button{min-width:116px;height:44px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;color:#2f7d58;font-size:14px;font-weight:600;border:1px solid #c9e4d8;border-radius:8px;background:linear-gradient(180deg,#fff 0%,#f5fbf8 100%);box-shadow:0 4px 12px rgba(35,105,76,.08);cursor:pointer;white-space:nowrap;transition:color 200ms ease,border-color 200ms ease,background 200ms ease,box-shadow 200ms ease,transform 200ms ease}.home-button .el-icon{font-size:17px}.home-button:hover{color:#1f6f4a;border-color:#8fcbb1;background:#eef9f4;box-shadow:0 8px 18px rgba(35,105,76,.14);transform:translateY(-1px)}.home-button:active{box-shadow:0 3px 8px rgba(35,105,76,.1);transform:translateY(0) scale(.98)}.home-button:focus-visible{outline:2px solid rgba(79,132,225,.78);outline-offset:3px}.page-main{padding:18px 20px 28px}.workspace-head,.filter-bar,.panel,.metric-grid article{background:#fff;border:1px solid #e8eeeb;border-radius:8px}.workspace-head{min-height:88px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between}.workspace-head h1{margin:0;font-size:22px}.workspace-head p,.panel-head p{margin:6px 0 0;color:#8b9792;font-size:13px}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px}.metric-grid article{padding:16px 18px;min-height:98px}.metric-grid span,.metric-grid small{display:block;color:#819089;font-size:13px}.metric-grid strong{display:inline-block;margin:6px 8px 4px 0;color:#2b8f5c;font-size:28px}.metric-grid .danger strong{color:#d15d52}.filter-bar{display:flex;align-items:center;gap:10px;margin-top:14px;padding:14px;flex-wrap:wrap}.filter-bar :deep(.el-select),.filter-bar :deep(.el-input){width:180px}.filter-bar .filter-sm{width:120px}.panel{margin-top:14px;overflow:hidden}.panel-head{height:70px;padding:0 18px;border-bottom:1px solid #edf1ef;display:flex;align-items:center;justify-content:space-between}.panel-head h2{margin:0;font-size:18px}.panel-head>span{color:#85928d;font-size:13px}.result-panel{min-height:600px}.result-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:16px}.result-card{border:1px solid #e3eae7;border-radius:6px;overflow:hidden;background:#fff;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.result-card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(39,86,66,.1)}.image-box{height:190px;position:relative;background:#f3f6f5}.image-box :deep(.el-image){width:100%;height:100%}.image-error{height:100%;display:flex;align-items:center;justify-content:center;gap:6px;color:#a1aba7}.image-error svg{width:24px}.result-tag{position:absolute;left:10px;bottom:10px;padding:5px 9px;border-radius:4px;font-size:12px;background:#fff}.result-tag.healthy{color:#238d58}.result-tag.disease{color:#c4574f}.result-body{padding:13px}.result-title,.result-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}.result-title strong{font-size:16px}.result-title b{color:#2d9160}.result-body p{margin:9px 0 0;color:#7b8883;font-size:13px;display:flex;align-items:center;gap:6px}.result-body p svg{width:15px}.result-foot{margin-top:13px;padding-top:11px;border-top:1px solid #eef2f0;color:#89958f;font-size:12px}.result-foot button{border:0;background:transparent;color:#2e9060;display:flex;align-items:center;gap:3px;cursor:pointer}.result-foot svg{width:14px}.result-panel :deep(.el-pagination){justify-content:flex-end;padding:4px 16px 18px}.task-panel{min-height:630px}.cell-sub{display:block;margin-top:5px;color:#8c9893}.status-text{font-weight:600}.status-text.ok{color:#268f5b}.status-text.bad{color:#d3534b}.status-text.warn{color:#c1842c}.status-text.muted{color:#87938e}.detail-image{width:100%;height:270px;background:#f4f7f5}.detail-title{display:flex;align-items:center;justify-content:space-between;margin:18px 0}.detail-title h3{margin:0;font-size:22px}.detail-title strong{font-size:22px;color:#2c9360}.drawer-subtitle{margin:22px 0 10px;font-size:16px}.thumb{width:58px;height:44px;border-radius:4px}.wizard-form{margin-top:28px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}.form-grid .full{grid-column:1/-1}.wizard-form :deep(.el-select),.wizard-form :deep(.el-time-editor){width:100%}.unit{margin-left:10px;color:#7f8c86}.field-tip{margin:7px 0 0;font-size:12px}.field-tip.warning{color:#bb7925}.confirm-box :deep(.el-form-item){margin-top:20px}@media(max-width:1366px){.topbar{padding-right:24px;padding-left:32px}.nav-list{gap:32px}.nav-item{font-size:17px}}@media(max-width:1300px){.result-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.topbar{overflow-x:auto;padding-left:16px}.nav-list{gap:24px}.metric-grid{grid-template-columns:repeat(2,1fr)}.result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.workspace-head{align-items:flex-start;gap:14px;flex-direction:column}.form-grid{grid-template-columns:1fr}.form-grid .full{grid-column:auto}}@media(max-width:600px){.page-main{padding:12px}.metric-grid,.result-grid{grid-template-columns:1fr}.filter-bar :deep(.el-select),.filter-bar :deep(.el-input){width:100%}}@media(prefers-reduced-motion:reduce){.nav-item,.nav-item::after,.nav-caret,.nav-menu,.nav-menu-item,.home-button,.result-card{transition:none}.nav-item:hover,.nav-menu-item:hover,.home-button:hover,.result-card:hover{transform:none}}
</style>

<style scoped>
/* Match the restrained gallery-card language used by the recognition image workspace. */
.task-card-grid {
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  gap: 16px;
}

.task-card {
  min-height: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid #e2eae6;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(35, 64, 53, .05);
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}

.task-card::before {
  display: none;
}

.task-card:hover {
  transform: translateY(-3px);
  border-color: #d5e3dc;
  box-shadow: 0 10px 24px rgba(35, 64, 53, .11);
}

.task-card-stage {
  height: 132px;
  position: relative;
  overflow: hidden;
  flex: 0 0 132px;
  background: #edf3f0;
  border-bottom: 1px solid #e3ebe7;
}

.task-card--running .task-card-stage { background: #eef3fb; border-bottom-color: #dce5f3; }
.task-card--disabled .task-card-stage { background: #f1f3f2; border-bottom-color: #e5e9e7; }
.task-card--danger .task-card-stage { background: #fbf0ef; border-bottom-color: #f0ddda; }
.task-card--warning .task-card-stage { background: #fbf5e9; border-bottom-color: #eee2cb; }
.task-card--waiting .task-card-stage { background: #eff4f7; border-bottom-color: #dfe8ed; }

.task-stage-head {
  position: absolute;
  top: 12px;
  left: 18px;
  right: 12px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.capture-status {
  min-height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #8a6551;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  background: rgba(255, 247, 233, .92);
}

.capture-status.active {
  color: #267951;
  background: rgba(238, 248, 242, .94);
}

.capture-status i {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: currentColor;
}

.strategy-switch {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #64756e;
  font-size: 11px;
  white-space: nowrap;
}

.control-wrap {
  display: inline-flex;
  align-items: center;
}

.task-stage-content {
  height: 100%;
  box-sizing: border-box;
  padding: 43px 18px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-stage-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 42px;
  color: var(--task-accent);
  border-radius: 7px;
  background: rgba(255, 255, 255, .78);
  box-shadow: 0 3px 10px rgba(38, 74, 58, .07);
}

.task-stage-icon svg {
  width: 21px;
}

.task-stage-content > div {
  min-width: 0;
}

.task-stage-content small,
.task-stage-content strong,
.task-stage-content p {
  display: block;
}

.task-stage-content small {
  color: #84928c;
  font-size: 11px;
}

.task-stage-content strong {
  margin-top: 3px;
  overflow: hidden;
  color: #294239;
  font-size: 17px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.task-stage-content p {
  margin: 4px 0 0;
  overflow: hidden;
  color: #75857e;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.task-card-body {
  min-height: 278px;
  padding: 14px 15px 12px;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.upstream-warning {
  margin: 0 0 12px;
  padding: 9px 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #8c5e2f;
  border-left: 3px solid #d5a04d;
  border-radius: 4px;
  background: #fff8eb;
}

.upstream-warning > svg {
  width: 16px;
  flex: 0 0 16px;
  margin-top: 1px;
}

.upstream-warning strong,
.upstream-warning span {
  display: block;
}

.upstream-warning strong {
  font-size: 12px;
  line-height: 18px;
}

.upstream-warning span {
  margin-top: 2px;
  color: #9a7a58;
  font-size: 11px;
  line-height: 17px;
}

.task-card-title-row {
  min-height: 49px;
  margin: 0;
  align-items: flex-start;
}

.task-card-title h3 {
  font-size: 16px;
  color: #263d34;
}

.task-card-title p {
  margin-top: 5px;
  color: #82908b;
}

.task-title-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
}

.crop-tag {
  padding: 3px 7px;
  color: #16966d;
  font-size: 11px;
  border-radius: 4px;
  background: #ecf8f4;
}

.more-button {
  width: 30px;
  height: 30px;
}

.more-button svg {
  width: 17px;
}

.task-detail-list {
  min-height: 142px;
  margin: 10px 0 0;
  display: grid;
  align-content: start;
  gap: 8px;
}

.task-detail-list > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  font-size: 12px;
}

.task-detail-list dt,
.task-detail-list dd {
  margin: 0;
}

.task-detail-list dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #98a39f;
  white-space: nowrap;
}

.task-detail-list dt svg {
  width: 14px;
  color: #7ca18f;
}

.task-detail-list dd {
  overflow: hidden;
  color: #50625b;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.task-detail-list dd.status-text {
  font-weight: 600;
}

.task-message {
  min-height: 30px;
  margin: 8px 0 0;
  padding: 6px 8px;
  line-height: 18px;
}

.task-card-footer {
  min-height: 40px;
  margin-top: auto;
  padding-top: 10px;
}

.task-card-footer :deep(.el-button) {
  min-width: 0;
  height: 32px;
  border-radius: 5px;
}

.task-card-footer :deep(.el-button--text) {
  padding-left: 0;
}

.task-card-footer :deep(.el-button--success.is-plain) {
  --el-button-text-color: #2c8b5d;
  --el-button-bg-color: #f2faf6;
  --el-button-border-color: #c9e6d7;
  --el-button-hover-text-color: #fff;
  --el-button-hover-bg-color: #3b9366;
  --el-button-hover-border-color: #3b9366;
}

@media (min-width: 1680px) {
  .task-card-grid { grid-template-columns: repeat(4, minmax(250px, 1fr)); }
}

@media (max-width: 1180px) {
  .task-card-grid { grid-template-columns: repeat(2, minmax(260px, 1fr)); }
}

@media (max-width: 700px) {
  .task-card-grid { grid-template-columns: 1fr; }
  .task-stage-content { padding-right: 96px; }
}

@media (prefers-reduced-motion: reduce) {
  .task-card { transition: none; }
  .task-card:hover { transform: none; }
}
</style>

<style scoped>
.task-filter-bar {
  position: relative;
}

.task-filter-bar :deep(.el-button--primary) {
  margin-left: auto;
}

.panel-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #7f8d87;
  font-size: 13px;
}

.task-panel {
  min-height: 630px;
  overflow: visible;
}

.task-status-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.task-status-tabs::-webkit-scrollbar {
  display: none;
}

.task-status-tabs button {
  min-height: 38px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  color: #65746e;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #dfe8e4;
  border-radius: 7px;
  background: #fff;
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.task-status-tabs button b {
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #7d8b85;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  border-radius: 10px;
  background: #f1f5f3;
}

.task-status-tabs button:hover {
  color: #277a52;
  border-color: #a9d4be;
  background: #f7fcf9;
}

.task-status-tabs button.active {
  color: #236f4b;
  border-color: #80bf9f;
  background: #edf8f2;
  box-shadow: 0 3px 10px rgba(39, 122, 82, .08);
}

.task-status-tabs button.active b {
  color: #fff;
  background: #3c9567;
}

.task-status-tabs button:focus-visible,
.more-button:focus-visible {
  outline: 2px solid rgba(79, 132, 225, .74);
  outline-offset: 2px;
}

.task-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px 18px 20px;
}

.task-card {
  --task-accent: #4a9a70;
  --task-soft: #eef8f2;
  min-width: 0;
  min-height: 468px;
  padding: 17px 18px 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border: 1px solid #dfe8e4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(35, 78, 60, .045);
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}

.task-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--task-accent);
}

.task-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--task-accent) 46%, #dfe8e4);
  box-shadow: 0 12px 28px rgba(35, 78, 60, .1);
}

.task-card--running { --task-accent: #4f7fd8; --task-soft: #eef4ff; }
.task-card--disabled { --task-accent: #98a39e; --task-soft: #f2f4f3; }
.task-card--danger { --task-accent: #d35c55; --task-soft: #fff1f0; }
.task-card--warning { --task-accent: #c58a31; --task-soft: #fff7e9; }
.task-card--waiting { --task-accent: #6e91b8; --task-soft: #f0f5fa; }

.task-card-status,
.task-card-status-actions,
.task-card-title-row,
.task-schedule-head,
.task-card-footer {
  display: flex;
  align-items: center;
}

.task-card-status,
.task-card-title-row,
.task-schedule-head,
.task-card-footer {
  justify-content: space-between;
}

.task-state-badge {
  min-height: 26px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--task-accent);
  font-size: 12px;
  font-weight: 700;
  border-radius: 5px;
  background: var(--task-soft);
}

.task-state-badge i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--task-accent) 14%, transparent);
}

.task-card--running .task-state-badge i {
  animation: task-pulse 1.8s ease-in-out infinite;
}

.task-card-status-actions {
  gap: 8px;
}

.switch-label {
  color: #87938e;
  font-size: 12px;
}

.task-card-title-row {
  min-height: 61px;
  margin-top: 15px;
  gap: 12px;
}

.task-card-title {
  min-width: 0;
}

.task-card-title h3 {
  margin: 0;
  overflow: hidden;
  color: #243b32;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card-title p {
  margin: 5px 0 0;
  overflow: hidden;
  color: #84918c;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card-title p span {
  margin: 0 6px;
  color: #c0c9c5;
}

.more-button {
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: #73817b;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
}

.more-button svg {
  width: 19px;
}

.more-button:hover {
  color: #277a52;
  border-color: #dce9e2;
  background: #f4faf7;
}

.task-resource-list,
.task-time-list {
  margin: 0;
}

.task-resource-list {
  padding: 11px 0 12px;
  border-top: 1px solid #edf2ef;
}

.task-resource-list > div,
.task-time-list > div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.task-resource-list > div + div {
  margin-top: 8px;
}

.task-resource-list dt,
.task-time-list dt,
.task-resource-list dd,
.task-time-list dd {
  margin: 0;
}

.task-resource-list dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #88958f;
  font-size: 12px;
}

.task-resource-list dt svg {
  width: 15px;
  color: #639477;
}

.task-resource-list dd {
  overflow: hidden;
  color: #455851;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-schedule {
  padding: 13px 14px;
  border-radius: 7px;
  background: #f5f8f6;
}

.task-schedule-head span,
.task-schedule p {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-schedule-head span {
  color: #5c6f67;
  font-size: 12px;
  font-weight: 600;
}

.task-schedule-head svg,
.task-schedule p svg {
  width: 14px;
  color: #55936f;
}

.task-schedule-head small {
  color: #8d9994;
  font-size: 11px;
}

.task-schedule strong {
  display: block;
  margin-top: 8px;
  overflow: hidden;
  color: #29483a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.task-schedule p {
  margin: 6px 0 0;
  color: #85918c;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.task-time-list {
  padding: 12px 0 10px;
}

.task-time-list > div {
  min-height: 28px;
}

.task-time-list dt {
  color: #8a9691;
  font-size: 12px;
}

.task-time-list dd {
  overflow: hidden;
  color: #52635c;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.task-time-list .next-run dd {
  color: #278157;
  font-size: 14px;
  font-weight: 700;
}

.task-message {
  min-height: 34px;
  margin: -2px 0 10px;
  padding: 8px 10px;
  display: -webkit-box;
  overflow: hidden;
  color: #a15d2a;
  font-size: 11px;
  line-height: 17px;
  border-radius: 6px;
  background: #fff7ed;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.task-message svg {
  width: 14px;
  margin-right: 5px;
  vertical-align: -2px;
}

.task-card--danger .task-message {
  color: #b14640;
  background: #fff1f0;
}

.task-card-footer {
  margin-top: auto;
  padding-top: 13px;
  border-top: 1px solid #edf2ef;
}

.task-card-footer :deep(.el-button) {
  min-width: 106px;
  height: 38px;
  border-radius: 6px;
}

.task-card-footer :deep(.el-button--success) {
  --el-button-bg-color: #3b9366;
  --el-button-border-color: #3b9366;
  --el-button-hover-bg-color: #31865a;
  --el-button-hover-border-color: #31865a;
}

@keyframes task-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(79, 127, 216, .12); }
  50% { box-shadow: 0 0 0 6px rgba(79, 127, 216, .04); }
}

@media (max-width: 1320px) {
  .task-card-grid { grid-template-columns: repeat(2, minmax(300px, 1fr)); }
}

@media (max-width: 760px) {
  .task-filter-bar :deep(.el-button--primary) { margin-left: 0; }
  .panel-head-actions > span { display: none; }
  .task-card-grid { grid-template-columns: 1fr; padding: 14px 12px 16px; }
  .task-card { min-height: 450px; }
  .task-status-tabs { padding-right: 12px; padding-left: 12px; }
}

@media (max-width: 460px) {
  .task-card { padding-right: 14px; padding-left: 16px; }
  .task-resource-list > div, .task-time-list > div { grid-template-columns: 76px minmax(0, 1fr); }
  .task-schedule-head { align-items: flex-start; gap: 8px; }
  .task-schedule-head small { text-align: right; }
  .task-card-footer :deep(.el-button) { min-width: 0; flex: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .task-card, .task-status-tabs button, .more-button { transition: none; }
  .task-card:hover { transform: none; }
  .task-card--running .task-state-badge i { animation: none; }
}
</style>

<style scoped>
/* Final card overrides intentionally follow the shared task controls above. */
.task-card-grid { grid-template-columns: repeat(3, minmax(260px, 1fr)); }
.task-card { min-height: 0; padding: 0; border: 1px solid #e2eae6; border-radius: 7px; box-shadow: 0 3px 12px rgba(35,64,53,.05); }
.task-card::before { display: none; }
.task-card:hover { transform: translateY(-3px); border-color: #d5e3dc; box-shadow: 0 10px 24px rgba(35,64,53,.11); }
.task-state-badge { color: #fff; border-radius: 4px; background: color-mix(in srgb,var(--task-accent) 90%,#34483f); }
.task-state-badge i { width: 6px; height: 6px; box-shadow: none; }
.task-card-title-row { min-height: 49px; margin: 0; align-items: flex-start; }
.task-message { min-height: 30px; margin: 8px 0 0; padding: 6px 8px; line-height: 18px; }
.task-card-footer { min-height: 40px; margin-top: auto; padding-top: 10px; }
.task-card-footer :deep(.el-button) { min-width: 0; height: 32px; border-radius: 5px; }
.task-card-footer :deep(.el-button--text) { padding-left: 0; }
.task-card-footer :deep(.el-button--success.is-plain) { --el-button-text-color:#2c8b5d; --el-button-bg-color:#f2faf6; --el-button-border-color:#c9e6d7; --el-button-hover-text-color:#fff; --el-button-hover-bg-color:#3b9366; --el-button-hover-border-color:#3b9366; }
@media (min-width:1680px) { .task-card-grid { grid-template-columns:repeat(4,minmax(250px,1fr)); } }
@media (max-width:1180px) { .task-card-grid { grid-template-columns:repeat(2,minmax(260px,1fr)); } }
@media (max-width:700px) { .task-card-grid { grid-template-columns:1fr; } .task-card { min-height:0; padding:0; } }

.capture-preview {
  overflow: hidden;
  margin: 4px 0 18px;
  border: 1px solid #dce9e3;
  border-radius: 6px;
  background: #fbfdfc;
}

.task-card-footer .control-wrap :deep(.el-button) {
  min-width: 96px;
}

.capture-preview-head {
  min-height: 66px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e5eeea;
  background: #f2f8f5;
}

.capture-preview-head > div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.capture-preview-head small,
.capture-preview-head strong {
  display: block;
}

.capture-preview-head small {
  margin-bottom: 4px;
  color: #81908a;
  font-size: 12px;
}

.capture-preview-head strong {
  overflow: hidden;
  color: #2f463d;
  font-size: 16px;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-preview-icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38px;
  color: #35885d;
  border: 1px solid #cce3d7;
  border-radius: 6px;
  background: #fff;
}

.capture-preview-icon svg { width: 19px; }

.capture-preview dl {
  margin: 0;
  padding: 14px 16px 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.capture-preview dl > div {
  min-width: 0;
  min-height: 68px;
  padding: 10px 12px;
  border: 1px solid #e7eeeb;
  border-radius: 5px;
  background: #fff;
}

.capture-preview dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #82908a;
  font-size: 12px;
  line-height: 18px;
}

.capture-preview dt svg {
  width: 14px;
  color: #599477;
}

.capture-preview dd {
  overflow: hidden;
  margin: 6px 0 0;
  color: #344b42;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.capture-option > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-disabled-tip {
  margin: 0 16px 14px;
  padding: 9px 11px;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  color: #8d632f;
  font-size: 12px;
  line-height: 18px;
  border-left: 3px solid #d5a04d;
  background: #fff8eb;
}

.capture-disabled-tip svg {
  width: 15px;
  flex: 0 0 15px;
  margin-top: 1px;
}

.confirm-note {
  margin: 16px 0 0;
  padding: 11px 13px;
  color: #547064;
  font-size: 13px;
  line-height: 20px;
  border-left: 3px solid #56aa7b;
  background: #f1f8f4;
}

.confirm-note.warning {
  color: #815a2f;
  border-left-color: #d5a04d;
  background: #fff8eb;
}

@media (max-width: 700px) {
  .capture-preview dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 480px) {
  .capture-preview dl { grid-template-columns: 1fr; }
}
</style>
