<template>
  <el-drawer
    :model-value="modelValue"
    :title="`控制器 - ${device?.deviceName || device?.deviceSn || ''}`"
    direction="rtl"
    size="62%"
    class="hierarchy-controller-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="controller-body">
      <div class="controller-summary">
        <div>
          <strong>{{ device?.deviceName || '-' }}</strong>
          <p>
            SN：{{ device?.deviceSn || '-' }}
            <span v-if="latestLogTime"> / 最近上报：{{ parseTime(latestLogTime) }}</span>
          </p>
        </div>
        <el-button icon="Refresh" circle title="刷新控制器数据" @click="refreshAll" />
      </div>

      <el-tabs v-model="activeTab" class="controller-tabs">
        <el-tab-pane label="最新信息" name="status">
          <div v-loading="statusLoading" class="tab-panel">
            <el-alert
              v-if="!statusLoading && !statusItems.length"
              title="暂无控制器上报数据"
              type="info"
              :closable="false"
              show-icon
            />
            <el-table v-else :data="statusItems" border stripe>
              <el-table-column label="控制项" prop="modelName" min-width="160" show-overflow-tooltip />
              <el-table-column label="当前状态" min-width="130" align="center">
                <template #default="scope">
                  <el-tag v-if="scope.row.isSelect" :type="String(scope.row.value) === '1' ? 'success' : 'info'">
                    {{ scope.row.displayValue }}
                  </el-tag>
                  <strong v-else>{{ scope.row.displayValue }}</strong>
                </template>
              </el-table-column>
              <el-table-column label="单位" prop="unit" width="100" align="center" />
              <el-table-column label="标识符" prop="identifier" min-width="130" show-overflow-tooltip />
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="下发控制" name="send">
          <div class="tab-panel">
            <div class="section-title">
              <span>控制字段</span>
              <el-button type="primary" link icon="Plus" @click="addCommandRow">新增字段</el-button>
            </div>
            <el-empty v-if="!models.length" description="当前产品暂无可下发的物模型" :image-size="80" />
            <div v-else class="command-list">
              <div v-for="(item, index) in commandRows" :key="item.uid" class="command-row">
                <el-select
                  v-model="item.identifier"
                  placeholder="选择控制物模型"
                  filterable
                  class="model-select"
                  @change="handleModelChange(item)"
                >
                  <el-option
                    v-for="model in availableModels(index)"
                    :key="model.identifier"
                    :label="formatModelLabel(model)"
                    :value="model.identifier"
                  />
                </el-select>
                <el-select
                  v-if="isSelectModel(item.identifier)"
                  v-model="item.value"
                  placeholder="选择控制状态"
                  class="value-input"
                >
                  <el-option
                    v-for="option in getSelectOptions(item.identifier)"
                    :key="String(option.value)"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-input v-else v-model="item.value" placeholder="输入下发值" class="value-input">
                  <template v-if="getModelUnit(getModel(item.identifier))" #append>
                    {{ getModelUnit(getModel(item.identifier)) }}
                  </template>
                </el-input>
                <el-button type="danger" link icon="Delete" @click="removeCommandRow(index)">删除</el-button>
              </div>
            </div>

            <el-form label-width="82px" class="send-form">
              <el-form-item label="备注">
                <el-input v-model="sendForm.remark" type="textarea" :rows="3" placeholder="请输入本次控制说明" />
              </el-form-item>
            </el-form>
            <div class="send-actions">
              <el-button type="primary" icon="Promotion" :loading="sendLoading" @click="submitCommand">立即下发</el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="手动控制记录" name="manualRecords">
          <div v-loading="recordLoading" class="tab-panel">
            <el-table :data="recordList" border stripe empty-text="暂无手动控制记录">
              <el-table-column label="事件编号" prop="eventId" width="100" align="center" />
              <el-table-column label="控制内容" min-width="250" show-overflow-tooltip>
                <template #default="scope">{{ formatRecordCommands(scope.row) }}</template>
              </el-table-column>
              <el-table-column label="响应码" prop="res" width="90" align="center" />
              <el-table-column label="状态" width="90" align="center">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="下发时间" width="170" align="center">
                <template #default="scope">{{ parseTime(scope.row.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</template>
              </el-table-column>
              <el-table-column label="响应说明" prop="responseDesc" min-width="150" show-overflow-tooltip />
              <el-table-column label="操作" width="130" fixed="right" align="center">
                <template #default="scope">
                  <el-button link type="primary" icon="View" @click="viewRecord(scope.row)">查看</el-button>
                  <el-button link type="danger" icon="Delete" @click="deleteRecord(scope.row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="recordQuery.pageNum"
                v-model:page-size="recordQuery.pageSize"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next"
                :total="recordTotal"
                @size-change="loadRecords"
                @current-change="loadRecords"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="预警控制记录" name="alertRecords">
          <div v-loading="alertRecordLoading" class="tab-panel">
            <el-table :data="alertRecordList" border stripe empty-text="暂无预警控制记录">
              <el-table-column label="事件编号" prop="eventId" width="100" align="center" />
              <el-table-column label="预警规则" min-width="240" show-overflow-tooltip>
                <template #default="scope">
                  <div class="rule-cell">
                    <el-tag :type="getAlertLevelType(scope.row.alertLevel)" size="small">{{ getAlertLevelText(scope.row.alertLevel) }}</el-tag>
                    <span>{{ scope.row.ruleDescription || '-' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="控制物模型" min-width="170" show-overflow-tooltip>
                <template #default="scope">{{ scope.row.targetModelName || getModelNameById(scope.row.targetModelId) || '-' }}</template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="scope"><el-tag :type="getStatusType(scope.row.status)">{{ getStatusText(scope.row.status) }}</el-tag></template>
              </el-table-column>
              <el-table-column label="下发时间" width="170" align="center">
                <template #default="scope">{{ parseTime(scope.row.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</template>
              </el-table-column>
              <el-table-column label="响应说明" prop="responseDesc" min-width="180" show-overflow-tooltip />
              <el-table-column label="操作" width="80" fixed="right" align="center">
                <template #default="scope"><el-button link type="primary" icon="View" @click="viewAlertRecord(scope.row)">查看</el-button></template>
              </el-table-column>
            </el-table>
            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="alertRecordQuery.pageNum"
                v-model:page-size="alertRecordQuery.pageSize"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next"
                :total="alertRecordTotal"
                @size-change="loadAlertRecords"
                @current-change="loadAlertRecords"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>

  <el-dialog v-model="detailOpen" title="手动控制记录详情" width="760px" append-to-body>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="事件编号">{{ detail.eventId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="getStatusType(detail.status)">{{ getStatusText(detail.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="控制终端">{{ detail.deviceName || device?.deviceName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="设备SN">{{ detail.deviceSn || '-' }}</el-descriptions-item>
      <el-descriptions-item label="控制内容" :span="2">{{ formatRecordCommands(detail) }}</el-descriptions-item>
      <el-descriptions-item label="响应码">{{ detail.res || '-' }}</el-descriptions-item>
      <el-descriptions-item label="下发主题">{{ detail.topic || '-' }}</el-descriptions-item>
      <el-descriptions-item label="下发时间">{{ parseTime(detail.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
      <el-descriptions-item label="响应时间">{{ parseTime(detail.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
      <el-descriptions-item label="响应说明" :span="2">{{ detail.responseDesc || '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <div class="payload-grid">
      <div class="payload-card"><strong>下发内容</strong><pre>{{ formatJson(detail.payload) }}</pre></div>
      <div class="payload-card"><strong>响应内容</strong><pre>{{ formatJson(detail.responsePayload) }}</pre></div>
    </div>
  </el-dialog>

  <el-dialog v-model="alertDetailOpen" title="预警控制记录详情" width="860px" append-to-body>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="事件编号">{{ alertDetail.eventId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="下发状态"><el-tag :type="getStatusType(alertDetail.status)">{{ getStatusText(alertDetail.status) }}</el-tag></el-descriptions-item>
      <el-descriptions-item label="联动规则编号">{{ alertDetail.controlId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="预警记录编号">{{ alertDetail.alertRecordId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="预警规则" :span="2">
        <el-tag :type="getAlertLevelType(alertDetail.alertLevel)">{{ getAlertLevelText(alertDetail.alertLevel) }}</el-tag>
        <span class="detail-inline-text">{{ alertDetail.ruleDescription || '-' }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="控制终端">{{ alertDetail.deviceName || device?.deviceName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="控制物模型">{{ alertDetail.targetModelName || getModelNameById(alertDetail.targetModelId) || '-' }}</el-descriptions-item>
      <el-descriptions-item label="动作名称">{{ alertDetail.actionName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="目标标识符">{{ alertDetail.targetIdentifier || '-' }}</el-descriptions-item>
      <el-descriptions-item label="下发时间">{{ parseTime(alertDetail.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
      <el-descriptions-item label="响应时间">{{ parseTime(alertDetail.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
      <el-descriptions-item label="响应说明" :span="2">{{ alertDetail.responseDesc || '-' }}</el-descriptions-item>
      <el-descriptions-item label="下发主题" :span="2">{{ alertDetail.topic || '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ alertDetail.remark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <div class="payload-grid">
      <div class="payload-card"><strong>下发内容</strong><pre>{{ formatJson(alertDetail.payload) }}</pre></div>
      <div class="payload-card"><strong>响应内容</strong><pre>{{ formatJson(alertDetail.responsePayload) }}</pre></div>
    </div>
  </el-dialog>
</template>

<script setup>
import { getCurrentInstance, reactive, ref, watch } from 'vue'
import { listDeviceLog } from '@/api/binZhou/ld/iot/device'
import { listModel } from '@/api/binZhou/ld/iot/model'
import { listManualControl, getManualControl, sendManualControl, delManualControl } from '@/api/binZhou/ld/iot/manualControl'
import { listControlEvent, getControlEvent } from '@/api/binZhou/ld/iot/controlEvent'
import { parseTime } from '@/utils/ruoyi'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  device: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])
const { proxy } = getCurrentInstance()

const activeTab = ref('status')
const statusLoading = ref(false)
const sendLoading = ref(false)
const recordLoading = ref(false)
const alertRecordLoading = ref(false)
const models = ref([])
const statusItems = ref([])
const latestLogTime = ref('')
const commandRows = ref([])
const recordList = ref([])
const recordTotal = ref(0)
const alertRecordList = ref([])
const alertRecordTotal = ref(0)
const detailOpen = ref(false)
const detail = ref({})
const alertDetailOpen = ref(false)
const alertDetail = ref({})
const sendForm = reactive({ remark: '' })
const recordQuery = reactive({ pageNum: 1, pageSize: 10 })
const alertRecordQuery = reactive({ pageNum: 1, pageSize: 10 })

watch(() => props.modelValue, open => {
  if (open) initialize()
})

async function initialize() {
  activeTab.value = 'status'
  models.value = []
  statusItems.value = []
  latestLogTime.value = ''
  commandRows.value = []
  recordList.value = []
  recordTotal.value = 0
  alertRecordList.value = []
  alertRecordTotal.value = 0
  recordQuery.pageNum = 1
  alertRecordQuery.pageNum = 1
  sendForm.remark = ''
  await Promise.all([loadStatus(), loadRecords(), loadAlertRecords()])
}

async function refreshAll() {
  await Promise.all([loadStatus(), loadRecords(), loadAlertRecords()])
}

async function loadStatus() {
  if (!props.device?.deviceSn) return
  statusLoading.value = true
  try {
    if (props.device.productId) {
      const modelRes = await listModel({ productId: props.device.productId, pageNum: 1, pageSize: 1000 })
      models.value = (modelRes.rows || modelRes.data || []).filter(item => item?.identifier)
      ensureCommandRow()
    }
    const logRes = await listDeviceLog({
      deviceSn: props.device.deviceSn,
      pageNum: 1,
      pageSize: 1,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    })
    const rows = Array.isArray(logRes.rows) ? logRes.rows : (Array.isArray(logRes.data) ? logRes.data : [])
    const latest = rows[0]
    latestLogTime.value = latest?.createTime || ''
    statusItems.value = buildStatusItems(parsePayload(latest?.payload))
  } catch (error) {
    statusItems.value = []
    latestLogTime.value = ''
  } finally {
    statusLoading.value = false
  }
}

function buildStatusItems(payload) {
  if (!payload || typeof payload !== 'object') return []
  return Object.keys(payload).filter(key => key.toLowerCase() !== 'res').map(identifier => {
    const model = getModel(identifier) || { identifier, modelName: identifier }
    const value = payload[identifier]
    const isSelect = getSpecs(model).type === 'select'
    return {
      identifier,
      modelName: model.modelName || model.name || identifier,
      value,
      displayValue: isSelect ? getSelectLabel(model, value) : formatValue(value),
      unit: getModelUnit(model) || '-',
      isSelect
    }
  })
}

function ensureCommandRow() {
  if (models.value.length && !commandRows.value.length) addCommandRow()
}

function addCommandRow() {
  if (!models.value.length) {
    proxy.$modal.msgWarning('当前产品暂无可下发的物模型')
    return
  }
  if (commandRows.value.length >= models.value.length) {
    proxy.$modal.msgWarning('所有控制字段均已添加')
    return
  }
  commandRows.value.push({ uid: `${Date.now()}_${Math.random()}`, identifier: undefined, value: '' })
}

function removeCommandRow(index) {
  commandRows.value.splice(index, 1)
}

function availableModels(index) {
  const selected = commandRows.value
    .filter((_, rowIndex) => rowIndex !== index)
    .map(item => item.identifier)
    .filter(Boolean)
  return models.value.filter(item => !selected.includes(item.identifier))
}

function getModel(identifier) {
  return models.value.find(item => item.identifier === identifier)
}

function formatModelLabel(model) {
  const name = model?.modelName || model?.name || model?.identifier || '未命名物模型'
  const unit = getModelUnit(model)
  return unit ? `${name} / ${model.identifier} / ${unit}` : `${name} / ${model.identifier}`
}

function getSpecs(model) {
  if (!model) return {}
  const specs = model.specs || model.modelSpecs || model.properties
  if (!specs) return {}
  if (typeof specs === 'object') return specs
  try { return JSON.parse(specs) || {} } catch (error) { return {} }
}

function getModelUnit(model) {
  const specs = getSpecs(model)
  return specs.unit || specs.unitName || model?.unit || ''
}

function isSelectModel(identifier) {
  return getSpecs(getModel(identifier)).type === 'select'
}

function getSelectOptions(identifier) {
  const specs = getSpecs(getModel(identifier))
  const indexed = Object.keys(specs)
    .filter(key => /^value\d+$/i.test(key))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0))
    .map(valueKey => {
      const index = valueKey.match(/\d+/)?.[0] || ''
      const value = specs[valueKey]
      const label = specs[`select${index}`] || specs[`name${index}`]
      return { label: label || (String(value) === '1' ? '开启' : String(value) === '0' ? '关闭' : String(value)), value }
    })
  if (indexed.length) return indexed
  const raw = specs.options || specs.values || specs.enum || specs.data || []
  if (Array.isArray(raw) && raw.length) {
    return raw.map(item => typeof item === 'object'
      ? { label: item.label || item.name || item.text || String(item.value), value: item.value ?? item.key ?? item.id }
      : { label: String(item), value: item })
  }
  if (raw && typeof raw === 'object') return Object.keys(raw).map(key => ({ label: raw[key], value: key }))
  return [{ label: '关闭', value: 0 }, { label: '开启', value: 1 }]
}

function getSelectLabel(model, value) {
  if (String(value) === '0') return '关闭'
  if (String(value) === '1') return '开启'
  const specs = getSpecs(model)
  const uploadKey = Object.keys(specs).find(key => /^label\d+$/i.test(key) && String(specs[key]) === String(value))
  if (uploadKey) {
    const index = uploadKey.match(/\d+/)?.[0] || ''
    if (specs[`select${index}`]) return specs[`select${index}`]
  }
  return getSelectOptions(model.identifier).find(item => String(item.value) === String(value))?.label || formatValue(value)
}

function handleModelChange(row) {
  const options = getSelectOptions(row.identifier)
  row.value = isSelectModel(row.identifier) && options.length ? options[0].value : ''
}

function buildCommands() {
  return commandRows.value.reduce((result, item) => {
    if (item.identifier) result[item.identifier] = normalizeValue(item.value)
    return result
  }, {})
}

function normalizeValue(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value))) return Number(value)
  return value
}

async function submitCommand() {
  const commands = buildCommands()
  if (!Object.keys(commands).length) return proxy.$modal.msgWarning('请至少选择一个控制字段')
  if (Object.values(commands).some(value => value === '' || value === null || value === undefined)) {
    return proxy.$modal.msgWarning('请填写完整的下发值')
  }
  sendLoading.value = true
  try {
    await sendManualControl({
      deviceId: props.device?.deviceId,
      deviceSn: props.device?.deviceSn,
      commands,
      remark: sendForm.remark
    })
    proxy.$modal.msgSuccess('控制指令已下发')
    commandRows.value = []
    ensureCommandRow()
    sendForm.remark = ''
    recordQuery.pageNum = 1
    activeTab.value = 'manualRecords'
    await loadRecords()
  } finally {
    sendLoading.value = false
  }
}

async function loadRecords() {
  if (!props.device?.deviceId && !props.device?.deviceSn) return
  recordLoading.value = true
  try {
    const response = await listManualControl({
      deviceId: props.device?.deviceId,
      deviceSn: props.device?.deviceSn,
      pageNum: recordQuery.pageNum,
      pageSize: recordQuery.pageSize
    })
    recordList.value = Array.isArray(response.rows) ? response.rows : (Array.isArray(response.data) ? response.data : [])
    recordTotal.value = response.total || recordList.value.length
  } catch (error) {
    recordList.value = []
    recordTotal.value = 0
  } finally {
    recordLoading.value = false
  }
}

async function loadAlertRecords() {
  if (!props.device?.deviceId) return
  alertRecordLoading.value = true
  try {
    const response = await listControlEvent({
      deviceId: props.device.deviceId,
      pageNum: alertRecordQuery.pageNum,
      pageSize: alertRecordQuery.pageSize
    })
    alertRecordList.value = Array.isArray(response.rows) ? response.rows : (Array.isArray(response.data) ? response.data : [])
    alertRecordTotal.value = response.total || alertRecordList.value.length
  } catch (error) {
    alertRecordList.value = []
    alertRecordTotal.value = 0
  } finally {
    alertRecordLoading.value = false
  }
}

function getRecordIdentifiers(row) {
  if (row?.targetIdentifiers) {
    const identifiers = String(row.targetIdentifiers).split(',').map(item => item.trim()).filter(Boolean)
    if (identifiers.length) return identifiers
  }
  const payload = parsePayload(row?.payload)
  return payload && typeof payload === 'object' ? Object.keys(payload).filter(key => key.toLowerCase() !== 'res') : []
}

function formatRecordFields(row) {
  const identifiers = getRecordIdentifiers(row)
  if (!identifiers.length) return '-'
  return identifiers.map(identifier => {
    const model = getModel(identifier)
    return model ? `${model.modelName || model.name || identifier}(${identifier})` : identifier
  }).join('、')
}

function formatRecordCommands(row) {
  const payload = parsePayload(row?.payload)
  const entries = Object.entries(payload).filter(([identifier]) => identifier.toLowerCase() !== 'res')
  if (!entries.length) return '-'
  return entries.map(([identifier, value]) => {
    const model = getModel(identifier)
    const name = model?.modelName || model?.name || identifier
    let displayValue = formatValue(value)
    if (model && isSelectModel(identifier)) {
      displayValue = getSelectOptions(identifier).find(option => String(option.value) === String(value))?.label || displayValue
    } else {
      const unit = getModelUnit(model)
      if (unit && displayValue !== '-') displayValue = `${displayValue}${unit}`
    }
    return `${name}：${displayValue}`
  }).join('；')
}

function getModelNameById(modelId) {
  return models.value.find(item => String(item.modelId) === String(modelId))?.modelName || ''
}

function getStatusText(status) {
  return ({ 0: '待下发', 1: '已下发', 2: '成功', 3: '失败', 4: '超时' })[status] || '-'
}

function getStatusType(status) {
  return ({ 0: 'info', 1: 'primary', 2: 'success', 3: 'danger', 4: 'warning' })[status] || 'info'
}

function getAlertLevelType(level) {
  if (String(level) === '1') return 'danger'
  if (String(level) === '2') return 'warning'
  return 'info'
}

function getAlertLevelText(level) {
  if (String(level) === '1') return '一级预警'
  if (String(level) === '2') return '二级预警'
  if (String(level) === '3') return '三级预警'
  return level ? `${level}级预警` : '未分级'
}

async function viewRecord(row) {
  const response = await getManualControl(row.eventId)
  detail.value = response.data || {}
  detailOpen.value = true
}

async function viewAlertRecord(row) {
  const response = await getControlEvent(row.eventId)
  alertDetail.value = response.data || {}
  alertDetailOpen.value = true
}

function deleteRecord(row) {
  proxy.$modal.confirm(`是否确认删除事件编号为“${row.eventId}”的控制记录？`).then(() => {
    return delManualControl(row.eventId)
  }).then(() => {
    proxy.$modal.msgSuccess('删除成功')
    if (recordList.value.length === 1 && recordQuery.pageNum > 1) recordQuery.pageNum -= 1
    loadRecords()
  }).catch(() => {})
}

function parsePayload(payload) {
  if (!payload) return {}
  if (typeof payload === 'object') return payload
  try { return JSON.parse(payload) || {} } catch (error) { return {} }
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function formatJson(value) {
  if (!value) return '-'
  try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2) } catch (error) { return String(value) }
}
</script>

<style scoped>
:deep(.hierarchy-controller-drawer .el-drawer__body) {
  padding: 0;
  overflow: hidden;
  background: #f5f8f6;
}

.controller-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px;
  overflow: hidden;
}

.controller-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #dfe9e2;
  border-radius: 8px;
}

.controller-summary strong { color: #1f4732; font-size: 16px; }
.controller-summary p { margin: 4px 0 0; color: #64756b; font-size: 13px; }

.controller-tabs {
  flex: 1;
  min-height: 0;
  padding: 0 16px 14px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #dfe9e2;
  border-radius: 8px;
}

.controller-tabs :deep(.el-tabs__content),
.controller-tabs :deep(.el-tab-pane) { height: calc(100% - 28px); }
.tab-panel { height: 100%; padding: 2px; overflow: auto; }

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 3px solid #10b981;
  color: #234c38;
  font-size: 15px;
  font-weight: 600;
}

.command-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.command-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f6faf7;
  border: 1px solid #deebe2;
  border-radius: 6px;
}
.model-select { flex: 1 1 52%; }
.value-input { flex: 1 1 34%; }
.send-form { max-width: 720px; margin-top: 8px; }
.send-actions, .pagination-wrap { display: flex; justify-content: flex-end; padding: 8px 0; }
.payload-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
.payload-card { min-width: 0; overflow: hidden; background: #f6faf7; border: 1px solid #deebe2; border-radius: 6px; }
.payload-card strong { display: block; padding: 9px 12px; border-bottom: 1px solid #deebe2; }
.payload-card pre { min-height: 120px; max-height: 260px; margin: 0; padding: 12px; overflow: auto; line-height: 1.5; white-space: pre-wrap; word-break: break-all; }
.rule-cell { display: flex; align-items: center; min-width: 0; gap: 6px; }
.rule-cell span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-inline-text { margin-left: 8px; }

@media (max-width: 1100px) {
  .command-row { align-items: stretch; flex-wrap: wrap; }
  .model-select, .value-input { flex-basis: calc(50% - 8px); }
  .payload-grid { grid-template-columns: 1fr; }
}
</style>
