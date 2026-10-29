<template>
  <div class="app-container manual-control-page">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="88px" class="query-form">
      <el-form-item label="控制终端" prop="deviceId">
        <el-select v-model="queryParams.deviceId" placeholder="请选择控制终端" clearable filterable style="width: 240px">
          <el-option
            v-for="item in controlDeviceList"
            :key="item.deviceId"
            :label="formatDeviceLabel(item)"
            :value="item.deviceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="设备SN" prop="deviceSn">
        <el-input v-model="queryParams.deviceSn" placeholder="请输入设备SN" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="控制字段" prop="targetIdentifiers">
        <el-input v-model="queryParams.targetIdentifiers" placeholder="请输入字段标识符" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="下发状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 160px">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="下发时间">
        <el-date-picker
          v-model="sendTimeRange"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Promotion" @click="handleSend" v-hasPermi="['ld:manualControl:send']">立即下发</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['ld:manualControl:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['ld:manualControl:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="manualControlList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="事件编号" align="center" prop="eventId" width="96" />
      <el-table-column label="控制终端" align="left" min-width="210" show-overflow-tooltip>
        <template #default="scope">
          <div class="device-cell">
            <span>{{ scope.row.deviceName || formatDeviceName(scope.row.deviceId) || '-' }}</span>
            <small>{{ scope.row.deviceSn || '-' }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="控制字段" align="left" min-width="220" show-overflow-tooltip>
        <template #default="scope">
          <el-tag
            v-for="item in getRowIdentifiers(scope.row)"
            :key="item"
            size="small"
            effect="plain"
            class="mr4"
          >
            {{ formatIdentifierName(scope.row.deviceId, item) }}
          </el-tag>
          <span v-if="!getRowIdentifiers(scope.row).length">-</span>
        </template>
      </el-table-column>
      <el-table-column label="响应码" align="center" prop="res" width="110" />
      <el-table-column label="下发主题" align="left" prop="topic" min-width="190" show-overflow-tooltip />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)" effect="light">{{ getStatusText(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下发时间" align="center" prop="sendTime" width="170">
        <template #default="scope">
          {{ parseTime(scope.row.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="响应时间" align="center" prop="responseTime" width="170">
        <template #default="scope">
          {{ parseTime(scope.row.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="响应说明" align="left" prop="responseDesc" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['ld:manualControl:query']">查看</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:manualControl:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <el-dialog title="手动控制下发" v-model="sendOpen" width="900px" append-to-body class="manual-control-dialog">
      <el-form ref="sendRef" :model="sendForm" :rules="sendRules" label-width="96px">
        <div class="form-section-title">控制终端</div>
        <el-row :gutter="18">
          <el-col :span="24">
            <el-form-item label="控制终端" prop="deviceId">
              <el-select
                v-model="sendForm.deviceId"
                placeholder="请选择接收指令的控制终端"
                filterable
                clearable
                style="width: 100%"
                @change="handleSendDeviceChange"
              >
                <el-option
                  v-for="item in controlDeviceList"
                  :key="item.deviceId"
                  :label="formatDeviceLabel(item)"
                  :value="item.deviceId"
                >
                  <div class="option-main">
                    <span>{{ item.deviceName || '未命名终端' }}</span>
                    <el-tag size="small" type="warning">控制终端</el-tag>
                    <el-tag size="small" :type="item.status == '1' ? 'success' : 'info'">{{ item.status == '1' ? '在线' : '离线' }}</el-tag>
                  </div>
                  <div class="option-sub">{{ item.deviceSn || '-' }} / {{ getProductName(item.productId) || item.productName || '未关联产品' }}</div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">
          控制字段
          <el-button type="primary" link icon="Plus" :disabled="!sendForm.deviceId" @click="addCommandRow">新增字段</el-button>
        </div>
        <el-empty v-if="!sendForm.deviceId" description="请先选择控制终端" :image-size="80" />
        <div v-else class="command-list">
          <div v-for="(item, index) in commandRows" :key="item.uid" class="command-row">
            <el-select
              v-model="item.identifier"
              placeholder="请选择控制物模型"
              filterable
              style="width: 40%"
              @change="handleCommandModelChange(item)"
            >
              <el-option
                v-for="model in availableModels(index)"
                :key="model.identifier"
                :label="formatModelLabel(model)"
                :value="model.identifier"
              >
                <div class="option-main">
                  <span>{{ model.modelName || model.identifier }}</span>
                  <el-tag v-if="getModelSpecs(model).type === 'select'" size="small" type="success">开关</el-tag>
                  <el-tag v-else size="small" type="info">{{ model.type || 'value' }}</el-tag>
                </div>
                <div class="option-sub">{{ model.identifier || '-' }} / {{ getModelUnit(model) || '无单位' }}</div>
              </el-option>
            </el-select>

            <el-select
              v-if="isSelectModel(item.identifier)"
              v-model="item.value"
              placeholder="请选择开关状态"
              style="width: 26%"
            >
              <el-option
                v-for="option in getSelectOptions(item.identifier)"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-input
              v-else
              v-model="item.value"
              placeholder="请输入下发值"
              style="width: 26%"
            >
              <template v-if="getModelUnitByIdentifier(item.identifier)" #append>{{ getModelUnitByIdentifier(item.identifier) }}</template>
            </el-input>

            <span class="command-preview">{{ item.identifier || '-' }}: {{ item.value === '' ? '-' : item.value }}</span>
            <el-button type="danger" link icon="Delete" @click="removeCommandRow(index)">删除</el-button>
          </div>
        </div>

        <el-row :gutter="18">
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="sendForm.remark" type="textarea" :rows="2" placeholder="请输入本次手动控制说明" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="payload-preview">
          <div class="payload-title">下发内容预览</div>
          <pre>{{ payloadPreview }}</pre>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="sendLoading" @click="submitSend">立即下发</el-button>
          <el-button @click="sendOpen = false">取消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="手动控制详情" v-model="detailOpen" width="860px" append-to-body class="manual-control-dialog">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="事件编号">{{ detail.eventId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)" effect="light">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="控制终端">{{ detail.deviceName || formatDeviceName(detail.deviceId) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备SN">{{ detail.deviceSn || '-' }}</el-descriptions-item>
        <el-descriptions-item label="控制字段" :span="2">{{ formatTargetIdentifiers(detail) }}</el-descriptions-item>
        <el-descriptions-item label="响应码">{{ detail.res || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下发主题">{{ detail.topic || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下发时间">{{ parseTime(detail.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
        <el-descriptions-item label="响应时间">{{ parseTime(detail.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
        <el-descriptions-item label="响应说明" :span="2">{{ detail.responseDesc || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div class="payload-grid">
        <div class="payload-preview">
          <div class="payload-title">下发内容</div>
          <pre>{{ formatJsonText(detail.payload) }}</pre>
        </div>
        <div class="payload-preview">
          <div class="payload-title">响应内容</div>
          <pre>{{ formatJsonText(detail.responsePayload) }}</pre>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailOpen = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ManualControl">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listManualControl, getManualControl, sendManualControl, delManualControl } from '@/api/binZhou/ld/iot/manualControl'
import { listDevice } from '@/api/binZhou/ld/iot/device'
import { listModel } from '@/api/binZhou/ld/iot/model'
import { listProduct } from '@/api/binZhou/ld/iot/product'

const { proxy } = getCurrentInstance()

const manualControlList = ref([])
const deviceList = ref([])
const productList = ref([])
const modelList = ref([])
const targetModelList = ref([])
const loading = ref(true)
const sendLoading = ref(false)
const showSearch = ref(true)
const sendOpen = ref(false)
const detailOpen = ref(false)
const total = ref(0)
const ids = ref([])
const multiple = ref(true)
const detail = ref({})
const sendTimeRange = ref([])
const commandRows = ref([])

const statusOptions = [
  { label: '待下发', value: 0, type: 'info' },
  { label: '已下发', value: 1, type: 'primary' },
  { label: '成功', value: 2, type: 'success' },
  { label: '失败', value: 3, type: 'danger' },
  { label: '超时', value: 4, type: 'warning' }
]

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceId: undefined,
    deviceSn: undefined,
    targetIdentifiers: undefined,
    status: undefined
  },
  sendForm: {
    deviceId: undefined,
    deviceSn: undefined,
    remark: undefined
  },
  sendRules: {
    deviceId: [{ required: true, message: '请选择控制终端', trigger: 'change' }]
  }
})

const { queryParams, sendForm, sendRules } = toRefs(data)

const controlDeviceList = computed(() => {
  return deviceList.value.filter(item => {
    const product = productList.value.find(product => String(product.productId) === String(item.productId))
    return String(item.productType) === '1' || String(product?.type) === '1' || String(product?.productType) === '1'
  })
})

const payloadPreview = computed(() => {
  return JSON.stringify(buildCommands(), null, 2)
})

getBaseOptions()
getList()

function getBaseOptions() {
  listProduct({ pageNum: 1, pageSize: 1000 }).then(response => {
    productList.value = response.rows || response.data || []
  })
  listDevice({ pageNum: 1, pageSize: 1000 }).then(response => {
    deviceList.value = response.rows || response.data || []
  })
  listModel({ pageNum: 1, pageSize: 1000 }).then(response => {
    modelList.value = response.rows || response.data || []
  })
}

function getList() {
  loading.value = true
  const params = proxy.addDateRange({ ...queryParams.value }, sendTimeRange.value, 'SendTime')
  listManualControl(params).then(response => {
    manualControlList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  sendTimeRange.value = []
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.eventId)
  multiple.value = !selection.length
}

function handleSend() {
  resetSendForm()
  sendOpen.value = true
}

function resetSendForm() {
  sendForm.value = {
    deviceId: undefined,
    deviceSn: undefined,
    remark: undefined
  }
  targetModelList.value = []
  commandRows.value = []
}

async function handleSendDeviceChange(deviceId) {
  sendForm.value.deviceSn = ''
  targetModelList.value = []
  commandRows.value = []
  const device = getDeviceById(deviceId)
  if (!device) return
  sendForm.value.deviceSn = device.deviceSn
  if (!device.productId) return
  const response = await listModel({ pageNum: 1, pageSize: 1000, productId: device.productId })
  const rows = response.rows || response.data || []
  targetModelList.value = rows.filter(item => item.identifier)
  addCommandRow()
}

function addCommandRow() {
  commandRows.value.push({
    uid: `${Date.now()}_${Math.random()}`,
    identifier: undefined,
    value: ''
  })
}

function removeCommandRow(index) {
  commandRows.value.splice(index, 1)
}

function handleCommandModelChange(row) {
  const options = getSelectOptions(row.identifier)
  row.value = options.length ? options[0].value : ''
}

function availableModels(index) {
  const selected = commandRows.value
    .filter((_, rowIndex) => rowIndex !== index)
    .map(item => item.identifier)
    .filter(Boolean)
  return targetModelList.value.filter(item => !selected.includes(item.identifier))
}

function buildCommands() {
  const payload = {}
  commandRows.value.forEach(row => {
    if (row.identifier) {
      payload[row.identifier] = normalizeCommandValue(row.value)
    }
  })
  return payload
}

function normalizeCommandValue(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return value
}

function submitSend() {
  proxy.$refs.sendRef.validate(valid => {
    if (!valid) return
    const commands = buildCommands()
    if (!Object.keys(commands).length) {
      proxy.$modal.msgWarning('请至少选择一个控制字段')
      return
    }
    if (Object.values(commands).some(value => value === '' || value === null || value === undefined)) {
      proxy.$modal.msgWarning('请填写完整的下发值')
      return
    }

    sendLoading.value = true
    sendManualControl({
      deviceId: sendForm.value.deviceId,
      deviceSn: sendForm.value.deviceSn,
      commands,
      remark: sendForm.value.remark
    }).then(() => {
      proxy.$modal.msgSuccess('手动控制指令已下发')
      sendOpen.value = false
      getList()
    }).finally(() => {
      sendLoading.value = false
    })
  })
}

function handleView(row) {
  getManualControl(row.eventId).then(response => {
    detail.value = response.data || {}
    detailOpen.value = true
  })
}

function handleDelete(row) {
  const eventIds = row.eventId || ids.value
  proxy.$modal.confirm('是否确认删除事件编号为"' + eventIds + '"的数据项？').then(() => {
    return delManualControl(eventIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  const params = proxy.addDateRange({ ...queryParams.value }, sendTimeRange.value, 'SendTime')
  proxy.download('ld/manualControl/export', params, `manualControl_${new Date().getTime()}.xlsx`)
}

function getStatusText(status) {
  const item = statusOptions.find(option => String(option.value) === String(status))
  return item ? item.label : '-'
}

function getStatusType(status) {
  const item = statusOptions.find(option => String(option.value) === String(status))
  return item ? item.type : 'info'
}

function getDeviceById(deviceId) {
  return deviceList.value.find(item => String(item.deviceId) === String(deviceId))
}

function formatDeviceName(deviceId) {
  return getDeviceById(deviceId)?.deviceName || ''
}

function formatDeviceLabel(device) {
  const productName = getProductName(device.productId) || device.productName || '未关联产品'
  return `${device.deviceName || '未命名终端'} / ${device.deviceSn || '-'} / ${productName}`
}

function getProductName(productId) {
  const product = productList.value.find(item => String(item.productId) === String(productId))
  return product?.productName || product?.name || ''
}

function formatModelLabel(model) {
  const unit = getModelUnit(model) || '无单位'
  return `${model.modelName || model.identifier || '未命名物模型'} / ${model.identifier || '-'} / ${unit}`
}

function getModelByIdentifier(identifier) {
  return targetModelList.value.find(item => item.identifier === identifier)
}

function formatIdentifierName(deviceId, identifier) {
  const device = getDeviceById(deviceId)
  const model = modelList.value.find(item => item.identifier === identifier && (!device?.productId || String(item.productId) === String(device.productId)))
    || targetModelList.value.find(item => item.identifier === identifier)
  return model ? `${model.modelName || identifier}(${identifier})` : identifier
}

function splitIdentifiers(value) {
  if (!value) return []
  return String(value).split(',').map(item => item.trim()).filter(Boolean)
}

function getPayloadIdentifiers(payload) {
  if (!payload) return []
  try {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
    if (!parsed || typeof parsed !== 'object') return []
    return Object.keys(parsed).filter(key => key && key.toLowerCase() !== 'res')
  } catch (error) {
    return []
  }
}

function getRowIdentifiers(row) {
  const identifiers = splitIdentifiers(row?.targetIdentifiers)
  return identifiers.length ? identifiers : getPayloadIdentifiers(row?.payload)
}

function formatTargetIdentifiers(row) {
  return getRowIdentifiers(row).map(item => formatIdentifierName(row.deviceId, item)).join('，') || '-'
}

function getModelSpecs(model) {
  if (!model) return {}
  const specs = model.specs || model.modelSpecs || model.properties
  if (!specs) return {}
  if (typeof specs === 'object') return specs
  try {
    return JSON.parse(specs)
  } catch (error) {
    return {}
  }
}

function getModelUnit(model) {
  const specs = getModelSpecs(model)
  return specs.unit || specs.unitName || model?.unit || ''
}

function getModelUnitByIdentifier(identifier) {
  return getModelUnit(getModelByIdentifier(identifier))
}

function isSelectModel(identifier) {
  return getModelSpecs(getModelByIdentifier(identifier)).type === 'select'
}

function getSelectOptions(identifier) {
  const specs = getModelSpecs(getModelByIdentifier(identifier))
  const indexedOptions = Object.keys(specs)
    .filter(key => /^value\d+$/i.test(key))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0))
    .map(valueKey => {
      const index = valueKey.match(/\d+/)?.[0] || ''
      const label = specs[`select${index}`] || specs[`name${index}`]
      return {
        label: label || (String(specs[valueKey]) === '1' ? '开启' : String(specs[valueKey]) === '0' ? '关闭' : String(specs[valueKey])),
        value: specs[valueKey]
      }
    })
  if (indexedOptions.length) return indexedOptions

  const rawOptions = specs.options || specs.values || specs.enum || specs.data || []
  if (Array.isArray(rawOptions) && rawOptions.length) {
    return rawOptions.map(item => {
      if (typeof item === 'object') {
        return {
          label: item.label || item.name || item.text || String(item.value),
          value: item.value ?? item.key ?? item.id
        }
      }
      return { label: String(item), value: item }
    })
  }
  if (rawOptions && typeof rawOptions === 'object') {
    return Object.keys(rawOptions).map(key => ({ label: rawOptions[key], value: key }))
  }
  return [
    { label: '关闭', value: 0 },
    { label: '开启', value: 1 }
  ]
}

function formatJsonText(value) {
  if (!value) return '-'
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2)
  } catch (error) {
    return String(value)
  }
}
</script>

<style scoped>
.manual-control-page {
  background: #fff;
}

.query-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.device-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}

.device-cell small,
.option-sub {
  color: #909399;
  font-size: 12px;
}

.mr4 {
  margin-right: 4px;
}

.form-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0 14px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.option-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.command-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.command-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f7f9fc;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.command-preview {
  flex: 1;
  min-width: 120px;
  color: #606266;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}

.payload-preview {
  margin-top: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.payload-title {
  padding: 8px 12px;
  background: #f5f7fa;
  color: #303133;
  font-weight: 600;
}

.payload-preview pre {
  min-height: 90px;
  max-height: 260px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  background: #111827;
  color: #d1fae5;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.55;
}

.payload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

@media (max-width: 1200px) {
  .payload-grid {
    grid-template-columns: 1fr;
  }

  .command-row {
    align-items: stretch;
    flex-direction: column;
  }

  .command-row :deep(.el-select),
  .command-row :deep(.el-input) {
    width: 100% !important;
  }
}
</style>
