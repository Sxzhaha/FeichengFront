<template>
  <div class="app-container control-event-page">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="96px">
      <el-form-item label="控制终端" prop="deviceId">
        <el-select v-model="queryParams.deviceId" placeholder="请选择控制终端" clearable filterable style="width: 220px">
          <el-option
            v-for="item in deviceList"
            :key="item.deviceId"
            :label="formatDeviceLabel(item)"
            :value="item.deviceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="控制物模型" prop="targetModelId">
        <el-select v-model="queryParams.targetModelId" placeholder="请选择物模型" clearable filterable style="width: 220px">
          <el-option
            v-for="item in modelList"
            :key="item.modelId"
            :label="formatModelLabel(item)"
            :value="item.modelId"
          />
        </el-select>
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
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['ld:controlEvent:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['ld:controlEvent:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="controlEventList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="事件编号" align="center" prop="eventId" width="100" />
      <el-table-column label="预警规则" align="left" min-width="220" show-overflow-tooltip>
        <template #default="scope">
          <div class="rule-cell">
            <el-tag :type="getAlertLevelType(scope.row.alertLevel)" effect="light">{{ getAlertLevelText(scope.row.alertLevel) }}</el-tag>
            <span>{{ scope.row.ruleDescription || '-' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="控制终端" align="left" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <div>{{ scope.row.deviceName || formatDeviceName(scope.row.deviceId) || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="控制物模型" align="left" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <div>{{ scope.row.targetModelName || formatModelName(scope.row.targetModelId) || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="下发主题" align="left" prop="topic" min-width="230" show-overflow-tooltip />
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
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="210" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['ld:controlEvent:query']">查看</el-button>
          <el-button link type="primary" icon="Edit" @click="handleStatusEdit(scope.row)" v-hasPermi="['ld:controlEvent:edit']">改状态</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:controlEvent:remove']">删除</el-button>
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

    <el-dialog title="修改下发状态" v-model="statusOpen" width="420px" append-to-body>
      <el-form ref="statusRef" :model="statusForm" :rules="statusRules" label-width="90px">
        <el-form-item label="事件编号">
          <el-input v-model="statusForm.eventId" disabled />
        </el-form-item>
        <el-form-item label="下发状态" prop="status">
          <el-select v-model="statusForm.status" placeholder="请选择下发状态" style="width: 100%">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitStatus">确 定</el-button>
          <el-button @click="statusOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="控制事件下发详情" v-model="detailOpen" width="860px" append-to-body class="control-event-dialog">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="事件编号">{{ detail.eventId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下发状态">
          <el-tag :type="getStatusType(detail.status)" effect="light">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="联动规则编号">{{ detail.controlId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="预警记录编号">{{ detail.alertRecordId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="预警规则" :span="2">
          <el-tag :type="getAlertLevelType(detail.alertLevel)" effect="light">{{ getAlertLevelText(detail.alertLevel) }}</el-tag>
          <span class="detail-inline-text">{{ detail.ruleDescription || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="控制终端">{{ detail.deviceName || formatDeviceName(detail.deviceId) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="控制物模型">{{ detail.targetModelName || formatModelName(detail.targetModelId) || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下发时间">{{ parseTime(detail.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
        <el-descriptions-item label="响应时间">{{ parseTime(detail.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
        <el-descriptions-item label="响应说明">{{ detail.responseDesc || '-' }}</el-descriptions-item>
        <el-descriptions-item label="下发主题" :span="2">{{ detail.topic || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <div class="payload-section">
        <div class="payload-title">下发内容</div>
        <pre class="payload-box">{{ formatJsonText(detail.payload) }}</pre>
      </div>
      <div class="payload-section">
        <div class="payload-title">响应内容</div>
        <pre class="payload-box">{{ formatJsonText(detail.responsePayload) }}</pre>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailOpen = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ControlEvent">
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listControlEvent, getControlEvent, changeControlEventStatus, delControlEvent } from '@/api/binZhou/ld/iot/controlEvent'
import { listDevice } from '@/api/binZhou/ld/iot/device'
import { listModel } from '@/api/binZhou/ld/iot/model'

const { proxy } = getCurrentInstance()

const controlEventList = ref([])
const deviceList = ref([])
const modelList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const detailOpen = ref(false)
const statusOpen = ref(false)
const detail = ref({})
const sendTimeRange = ref([])

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
    controlId: undefined,
    alertRecordId: undefined,
    deviceId: undefined,
    targetModelId: undefined,
    topic: undefined,
    status: undefined
  }
})

const statusForm = reactive({
  eventId: undefined,
  status: undefined
})

const statusRules = {
  status: [{ required: true, message: '请选择下发状态', trigger: 'change' }]
}

const { queryParams } = toRefs(data)

function getList() {
  loading.value = true
  listControlEvent(addDateRangeParams(queryParams.value)).then(response => {
    controlEventList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function getOptionLists() {
  listDevice({ pageNum: 1, pageSize: 1000, productType: 1 }).then(response => {
    const rows = response.rows || []
    if (rows.length) {
      deviceList.value = rows
    } else {
      return listDevice({ pageNum: 1, pageSize: 1000 }).then(res => {
        deviceList.value = res.rows || []
      })
    }
  })
  listModel({ pageNum: 1, pageSize: 1000 }).then(response => {
    modelList.value = response.rows || []
  })
}

function addDateRangeParams(params) {
  const next = { ...params, params: { ...(params.params || {}) } }
  if (sendTimeRange.value && sendTimeRange.value.length === 2) {
    next.params.beginSendTime = sendTimeRange.value[0]
    next.params.endSendTime = sendTimeRange.value[1]
  }
  return next
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

function handleView(row) {
  getControlEvent(row.eventId).then(response => {
    detail.value = response.data || {}
    detailOpen.value = true
  })
}

function handleStatusEdit(row) {
  statusForm.eventId = row.eventId
  statusForm.status = Number(row.status)
  statusOpen.value = true
}

function submitStatus() {
  proxy.$refs.statusRef.validate(valid => {
    if (!valid) return
    changeControlEventStatus(statusForm.eventId, statusForm.status).then(() => {
      proxy.$modal.msgSuccess('状态修改成功')
      statusOpen.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const _ids = row.eventId || ids.value
  proxy.$modal.confirm(`是否确认删除控制事件下发记录编号为"${_ids}"的数据项？`).then(() => {
    return delControlEvent(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('ld/controlEvent/export', {
    ...addDateRangeParams(queryParams.value)
  }, `controlEvent_${new Date().getTime()}.xlsx`)
}

function formatDeviceLabel(device) {
  if (!device) return '-'
  const status = device.status == '1' ? '在线' : '离线'
  return `${device.deviceName || '未命名设备'} / ${status}`
}

function findDevice(deviceId) {
  return deviceList.value.find(item => String(item.deviceId) === String(deviceId))
}

function formatDeviceName(deviceId) {
  const device = findDevice(deviceId)
  return device ? device.deviceName : ''
}

function formatModelLabel(model) {
  if (!model) return '-'
  return `${model.modelName || model.identifier || '未命名物模型'} / ${model.identifier || '-'}`
}

function formatModelName(modelId) {
  const model = modelList.value.find(item => String(item.modelId) === String(modelId))
  return model ? model.modelName : ''
}

function getStatusText(status) {
  const found = statusOptions.find(item => String(item.value) === String(status))
  return found ? found.label : '未知'
}

function getStatusType(status) {
  const found = statusOptions.find(item => String(item.value) === String(status))
  return found ? found.type : 'info'
}

function getAlertLevelType(level) {
  if (level === 1 || level === '1') return 'danger'
  if (level === 2 || level === '2') return 'warning'
  if (level === 3 || level === '3') return 'info'
  return 'info'
}

function getAlertLevelText(level) {
  if (level === 1 || level === '1') return '一级预警'
  if (level === 2 || level === '2') return '二级预警'
  if (level === 3 || level === '3') return '三级预警'
  return level ? `${level}级预警` : '未分级'
}

function formatJsonText(value) {
  if (!value) return '暂无'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (e) {
    return value
  }
}

getList()
getOptionLists()
</script>

<style scoped lang="scss">
.control-event-page {
  .rule-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
  }

  .sub-text {
    margin-top: 2px;
    color: #909399;
    font-size: 12px;
    line-height: 1.35;
  }
}

.control-event-dialog {
  :deep(.el-descriptions__label) {
    width: 120px;
  }

  .detail-inline-text {
    margin-left: 8px;
  }

  .payload-section {
    margin-top: 14px;
  }

  .payload-title {
    margin-bottom: 6px;
    color: #303133;
    font-size: 14px;
    font-weight: 600;
  }

  .payload-box {
    min-height: 88px;
    max-height: 260px;
    margin: 0;
    padding: 10px 12px;
    overflow: auto;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #f8fafc;
    color: #303133;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
