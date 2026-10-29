<template>
  <div class="app-container control-linkage-page">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="88px">
      <el-form-item label="预警规则" prop="alertConfigId">
        <el-select v-model="queryParams.alertConfigId" placeholder="请选择预警规则" clearable filterable popper-class="control-linkage-select-popper" style="width: 320px">
          <el-option
            v-for="item in warnConfigList"
            :key="item.id"
            :label="formatWarnConfigLabel(item)"
            :value="item.id"
          >
            <div class="option-main">
              <span>{{ item.ruleDescription || '未命名规则' }}</span>
              <span class="option-tags">
                <el-tag size="small" :type="getAlertLevelType(item.alertLevel)">{{ getAlertLevelText(item.alertLevel) }}</el-tag>
                <el-tag size="small" :type="getWarnEnabledTagType(item.isEnabled)">{{ formatWarnEnabledText(item.isEnabled) }}</el-tag>
              </span>
            </div>
            <div class="option-sub">{{ formatWarnConfigExtra(item) }}</div>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="控制终端" prop="targetDeviceId">
        <el-select v-model="queryParams.targetDeviceId" placeholder="请选择控制终端" clearable filterable style="width: 220px" @change="handleQueryTargetDeviceChange">
          <el-option
            v-for="item in controlDeviceList"
            :key="item.deviceId"
            :label="formatDeviceLabel(item)"
            :value="item.deviceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="控制物模型" prop="targetModelId">
        <el-select
          v-model="queryParams.targetModelId"
          placeholder="请先选择控制终端"
          clearable
          filterable
          style="width: 220px"
          :disabled="!queryParams.targetDeviceId"
        >
          <el-option
            v-for="item in queryTargetModelList"
            :key="item.modelId"
            :label="formatModelLabel(item)"
            :value="item.modelId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="动作名称" prop="actionName">
        <el-input v-model="queryParams.actionName" placeholder="请输入动作名称" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="下发值" prop="commandValue">
        <el-input v-model="queryParams.commandValue" placeholder="请输入下发值" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="启用状态" prop="enabled">
        <el-select v-model="queryParams.enabled" placeholder="请选择状态" clearable style="width: 160px">
          <el-option label="启用" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['ld:controlLinkage:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['ld:controlLinkage:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['ld:controlLinkage:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['ld:controlLinkage:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="controlLinkageList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="编号" align="center" prop="id" width="80" />
      <el-table-column label="预警规则" align="left" min-width="360">
        <template #default="scope">
          <div class="rule-detail-cell">
            <div class="rule-title-line">
              <el-tag :type="getAlertLevelType(getRuleAlertLevel(scope.row))" effect="light">
                {{ getAlertLevelText(getRuleAlertLevel(scope.row)) }}
              </el-tag>
              <span>{{ getRuleDescription(scope.row) }}</span>
            </div>
            <div class="rule-meta-line">
              <el-tag size="small" effect="plain">{{ getRuleProductName(scope.row) }}</el-tag>
              <el-tag size="small" effect="plain" type="info">{{ getRuleModelName(scope.row) }}</el-tag>
              <el-tag size="small" effect="plain" :type="getRuleDeviceScopeType(scope.row)">
                {{ getRuleDeviceScope(scope.row) }}
              </el-tag>
            </div>
            <div class="rule-threshold-line">
              阈值 {{ getRuleThreshold(scope.row) }}
              <span class="rule-separator">/</span>
              {{ getRuleEnabledText(scope.row) }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="控制终端" align="left" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <div>{{ scope.row.targetDeviceName || formatDeviceName(scope.row.targetDeviceId) || '-' }}</div>
          <div class="sub-text">{{ scope.row.targetDeviceSn || getDeviceSn(scope.row.targetDeviceId) || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="控制物模型" align="left" min-width="190" show-overflow-tooltip>
        <template #default="scope">
          <div>{{ scope.row.targetModelName || formatModelName(scope.row.targetModelId) || '-' }}</div>
          <div class="sub-text">{{ scope.row.targetModelIdentifier || getModelIdentifier(scope.row.targetModelId) || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="下发值" align="center" prop="commandValue" width="120" show-overflow-tooltip />
      <el-table-column label="动作名称" align="center" prop="actionName" width="140" show-overflow-tooltip />
      <el-table-column label="优先级" align="center" prop="priority" width="90" />
      <el-table-column label="执行策略" align="center" width="160">
        <template #default="scope">
          <div>冷却 {{ scope.row.cooldownSeconds ?? 0 }} 秒</div>
          <div class="sub-text">延迟 {{ scope.row.delaySeconds ?? 0 }} 秒</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="enabled" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.enabled === 1 ? 'success' : 'info'">{{ scope.row.enabled === 1 ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="130" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['ld:controlLinkage:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:controlLinkage:remove']">删除</el-button>
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

    <el-dialog :title="title" v-model="open" width="780px" append-to-body class="control-linkage-dialog">
      <el-form ref="controlLinkageRef" :model="form" :rules="rules" label-width="108px">
        <div class="form-section-title">触发规则</div>
        <el-row :gutter="18">
          <el-col :span="24">
            <el-form-item label="预警规则" prop="alertConfigId">
              <el-select v-model="form.alertConfigId" placeholder="请选择预警规则" filterable clearable popper-class="control-linkage-select-popper" style="width: 100%">
                <el-option
                  v-for="item in warnConfigList"
                  :key="item.id"
                  :label="formatWarnConfigLabel(item)"
                  :value="item.id"
                >
                  <div class="option-main">
                    <span>{{ item.ruleDescription || '未命名规则' }}</span>
                    <span class="option-tags">
                      <el-tag size="small" :type="getAlertLevelType(item.alertLevel)">{{ getAlertLevelText(item.alertLevel) }}</el-tag>
                      <el-tag size="small" :type="getWarnEnabledTagType(item.isEnabled)">{{ formatWarnEnabledText(item.isEnabled) }}</el-tag>
                    </span>
                  </div>
                  <div class="option-sub">{{ formatWarnConfigExtra(item) }}</div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">控制下发</div>
        <el-row :gutter="18">
          <el-col :span="24">
            <el-form-item label="控制终端" prop="targetDeviceId">
              <el-select
                v-model="form.targetDeviceId"
                placeholder="请选择接收指令的控制终端"
                filterable
                clearable
                popper-class="control-linkage-select-popper"
                style="width: 100%"
                @change="handleTargetDeviceChange"
              >
                <el-option
                  v-for="item in controlDeviceList"
                  :key="item.deviceId"
                  :label="formatDeviceLabel(item)"
                  :value="item.deviceId"
                >
                  <div class="option-main">
                    <span>{{ item.deviceName || '未命名终端' }}</span>
                    <el-tag size="small" type="warning">{{ formatProductType(item.productType) }}</el-tag>
                    <el-tag size="small" :type="item.status == '1' ? 'success' : 'info'">{{ item.status == '1' ? '在线' : '离线' }}</el-tag>
                  </div>
                  <div class="option-sub">{{ item.deviceSn || '-' }} / {{ getProductName(item.productId) || item.productName || '-' }}</div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="控制物模型" prop="targetModelId">
              <el-select
                v-model="form.targetModelId"
                :placeholder="form.targetDeviceId ? '请选择控制终端可下发的物模型' : '请先选择控制终端'"
                filterable
                clearable
                popper-class="control-linkage-select-popper"
                style="width: 100%"
                :disabled="!form.targetDeviceId"
              >
                <el-option
                  v-for="item in targetModelList"
                  :key="item.modelId"
                  :label="formatModelLabel(item)"
                  :value="item.modelId"
                >
                  <div class="option-main">
                    <span>{{ item.modelName || item.identifier || '未命名物模型' }}</span>
                    <el-tag v-if="item.dataType" size="small" type="info">{{ item.dataType }}</el-tag>
                  </div>
                  <div class="option-sub">{{ item.identifier || '-' }} / {{ item.unit || parseModelUnit(item) || '无单位' }}</div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="动作名称" prop="actionName">
              <el-input v-model="form.actionName" placeholder="例如：打开水泵、关闭风机" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="下发值" prop="commandValue">
              <el-input v-model="form.commandValue" placeholder="例如：1、ON、open" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">执行策略</div>
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="启用状态" prop="enabled">
              <el-radio-group v-model="form.enabled">
                <el-radio :value="1">启用</el-radio>
                <el-radio :value="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-input-number v-model="form.priority" :min="0" :max="999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="冷却时间" prop="cooldownSeconds">
              <el-input-number v-model="form.cooldownSeconds" :min="0" :max="86400" controls-position="right" style="width: calc(100% - 32px)" />
              <span class="unit-text">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="延迟执行" prop="delaySeconds">
              <el-input-number v-model="form.delaySeconds" :min="0" :max="86400" controls-position="right" style="width: calc(100% - 32px)" />
              <span class="unit-text">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listControlLinkage, getControlLinkage, addControlLinkage, updateControlLinkage, delControlLinkage } from '@/api/binZhou/ld/iot/controlLinkage'
import { listWarnConfig } from '@/api/binZhou/ld/iot/warnConfig'
import { listDevice } from '@/api/binZhou/ld/iot/device'
import { listModel } from '@/api/binZhou/ld/iot/model'
import { listProduct } from '@/api/binZhou/ld/iot/product'

const { proxy } = getCurrentInstance()

const controlLinkageList = ref([])
const warnConfigList = ref([])
const deviceList = ref([])
const controlDeviceList = ref([])
const modelList = ref([])
const targetModelList = ref([])
const productList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const productTypeOptions = [
  { label: '传感设备', value: 0 },
  { label: '控制终端', value: 1 }
]

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    alertConfigId: null,
    targetDeviceId: null,
    targetModelId: null,
    commandValue: null,
    actionName: null,
    enabled: null
  },
  rules: {
    alertConfigId: [{ required: true, message: '请选择预警规则', trigger: 'change' }],
    targetDeviceId: [{ required: true, message: '请选择控制终端', trigger: 'change' }],
    targetModelId: [{ required: true, message: '请选择控制物模型', trigger: 'change' }],
    commandValue: [{ required: true, message: '请输入下发值', trigger: 'blur' }],
    actionName: [{ required: true, message: '请输入动作名称', trigger: 'blur' }],
    enabled: [{ required: true, message: '请选择启用状态', trigger: 'change' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const queryTargetModelList = computed(() => getModelsByDeviceId(queryParams.value.targetDeviceId))

function getList() {
  loading.value = true
  listControlLinkage(queryParams.value).then(response => {
    controlLinkageList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function getOptionLists() {
  Promise.all([
    listWarnConfig({ pageNum: 1, pageSize: 1000 }),
    listDevice({ pageNum: 1, pageSize: 1000 }),
    listDevice({ pageNum: 1, pageSize: 1000, productType: 1 }),
    listModel({ pageNum: 1, pageSize: 1000 }),
    listProduct({ pageNum: 1, pageSize: 1000 })
  ]).then(([warnRes, deviceRes, controlDeviceRes, modelRes, productRes]) => {
    warnConfigList.value = warnRes.rows || []
    deviceList.value = deviceRes.rows || []
    productList.value = productRes.rows || []
    modelList.value = modelRes.rows || []
    const backendControlRows = controlDeviceRes.rows || []
    controlDeviceList.value = backendControlRows.length ? backendControlRows : deviceList.value.filter(item => String(item.productType) === '1')
  })
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    id: null,
    alertConfigId: null,
    targetDeviceId: null,
    targetModelId: null,
    commandValue: null,
    actionName: null,
    enabled: 1,
    priority: 1,
    cooldownSeconds: 300,
    delaySeconds: 0,
    remark: null
  }
  targetModelList.value = []
  proxy.resetForm('controlLinkageRef')
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  queryParams.value.targetModelId = null
  handleQuery()
}

function handleQueryTargetDeviceChange() {
  queryParams.value.targetModelId = null
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '新增预警控制联动'
}

function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getControlLinkage(_id).then(response => {
    form.value = {
      enabled: 1,
      priority: 1,
      cooldownSeconds: 300,
      delaySeconds: 0,
      ...response.data
    }
    refreshTargetModels(form.value.targetDeviceId)
    open.value = true
    title.value = '修改预警控制联动'
  })
}

function submitForm() {
  proxy.$refs.controlLinkageRef.validate(valid => {
    if (!valid) return
    const request = form.value.id != null ? updateControlLinkage(form.value) : addControlLinkage(form.value)
    request.then(() => {
      proxy.$modal.msgSuccess(form.value.id != null ? '修改成功' : '新增成功')
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const _ids = row.id || ids.value
  proxy.$modal.confirm(`是否确认删除预警控制联动编号为"${_ids}"的数据项？`).then(() => {
    return delControlLinkage(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('ld/controlLinkage/export', {
    ...queryParams.value
  }, `controlLinkage_${new Date().getTime()}.xlsx`)
}

function handleTargetDeviceChange(deviceId) {
  form.value.targetModelId = null
  refreshTargetModels(deviceId)
}

function refreshTargetModels(deviceId) {
  targetModelList.value = getModelsByDeviceId(deviceId)
  const device = findDevice(deviceId)
  if (!device || !device.productId) return
  listModel({ pageNum: 1, pageSize: 1000, productId: device.productId }).then(response => {
    const rows = response.rows || []
    targetModelList.value = rows.filter(item => String(item.productId) === String(device.productId))
  })
}

function getModelsByDeviceId(deviceId) {
  const device = findDevice(deviceId)
  if (!device || !device.productId) return []
  return modelList.value.filter(item => String(item.productId) === String(device.productId))
}

function findDevice(deviceId) {
  return deviceList.value.find(item => String(item.deviceId) === String(deviceId))
    || controlDeviceList.value.find(item => String(item.deviceId) === String(deviceId))
}

function getProductName(productId) {
  const product = productList.value.find(item => String(item.productId) === String(productId))
  return product ? product.productName : ''
}

function formatProductType(type) {
  const found = productTypeOptions.find(item => String(item.value) === String(type))
  return found ? found.label : '未知类型'
}

function formatDeviceLabel(device) {
  if (!device) return '-'
  const name = device.deviceName || '未命名设备'
  const sn = device.deviceSn || '无SN'
  const productName = getProductName(device.productId) || device.productName || '未关联产品'
  const status = device.status == '1' ? '在线' : '离线'
  return `${name} / ${sn} / ${productName} / ${status}`
}

function formatDeviceName(deviceId) {
  const device = findDevice(deviceId)
  return device ? device.deviceName : ''
}

function getDeviceSn(deviceId) {
  const device = findDevice(deviceId)
  return device ? device.deviceSn : ''
}

function formatModelLabel(model) {
  if (!model) return '-'
  const unit = model.unit || parseModelUnit(model) || '无单位'
  const productName = getProductName(model.productId) || model.productName || '未关联产品'
  return `${model.modelName || model.identifier || '未命名物模型'} / ${model.identifier || '-'} / ${unit} / ${productName}`
}

function formatModelName(modelId) {
  const model = modelList.value.find(item => String(item.modelId) === String(modelId))
  return model ? model.modelName : ''
}

function getModelIdentifier(modelId) {
  const model = modelList.value.find(item => String(item.modelId) === String(modelId))
  return model ? model.identifier : ''
}

function parseModelUnit(model) {
  if (!model) return ''
  const specs = model.specs || model.modelSpecs || model.properties
  if (!specs) return ''
  if (typeof specs === 'object') return specs.unit || specs.unitName || ''
  try {
    const parsed = JSON.parse(specs)
    return parsed.unit || parsed.unitName || ''
  } catch (e) {
    return ''
  }
}

function formatWarnConfigLabel(item) {
  if (!item) return '-'
  const modelName = item.modelName || formatModelName(item.modelId) || '未关联物模型'
  return `${getAlertLevelText(item.alertLevel)} / ${item.ruleDescription || '未填写规则描述'} / ${modelName} / ${formatWarnDeviceScope(item)}`
}

function formatWarnConfigExtra(item) {
  const modelName = item.modelName || formatModelName(item.modelId) || '未关联物模型'
  const productName = item.productName || getProductName(item.productId) || '未关联产品'
  return `${modelName} / ${productName} / ${formatWarnDeviceScope(item)} / 阈值 ${formatThresholdRange(item)}`
}

function formatWarnDeviceScope(item) {
  if (!item || !item.deviceId) return '全部设备'
  return `${item.deviceName || formatDeviceName(item.deviceId) || '指定设备'}(${item.deviceSn || getDeviceSn(item.deviceId) || '无SN'})`
}

function getWarnConfigById(id) {
  return warnConfigList.value.find(row => String(row.id) === String(id)) || null
}

function getRuleConfig(row) {
  return getWarnConfigById(row.alertConfigId) || row || {}
}

function getRuleAlertLevel(row) {
  return getRuleConfig(row).alertLevel
}

function getRuleDescription(row) {
  const config = getRuleConfig(row)
  return config.ruleDescription || row.ruleDescription || '未填写规则描述'
}

function getRuleProductName(row) {
  const config = getRuleConfig(row)
  return config.productName || getProductName(config.productId) || getProductNameByModelId(config.modelId) || '未关联产品'
}

function getRuleModelName(row) {
  const config = getRuleConfig(row)
  return config.modelName || formatModelName(config.modelId) || '未关联物模型'
}

function getRuleDeviceScope(row) {
  return formatWarnDeviceScope(getRuleConfig(row))
}

function getRuleDeviceScopeType(row) {
  const config = getRuleConfig(row)
  return config.deviceId ? 'warning' : 'success'
}

function getRuleThreshold(row) {
  return formatThresholdRange(getRuleConfig(row))
}

function getRuleEnabledText(row) {
  const config = getRuleConfig(row)
  return `规则${formatWarnEnabledText(config.isEnabled)}`
}

function getProductNameByModelId(modelId) {
  const model = modelList.value.find(item => String(item.modelId) === String(modelId))
  return model ? (model.productName || getProductName(model.productId)) : ''
}

function formatThresholdRange(item) {
  if (!item) return '-∞ ~ +∞'
  return `${item.thresholdMin ?? '-∞'} ~ ${item.thresholdMax ?? '+∞'}`
}

function formatWarnEnabledText(enabled) {
  return enabled === 0 || enabled === '0' ? '禁用' : '启用'
}

function getWarnEnabledTagType(enabled) {
  return enabled === 0 || enabled === '0' ? 'info' : 'success'
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

getList()
getOptionLists()
</script>

<style scoped lang="scss">
.control-linkage-page {
  .rule-detail-cell {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 4px 0;
  }

  .rule-title-line {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    color: #303133;
    font-weight: 500;
    line-height: 1.35;
  }

  .rule-meta-line {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    line-height: 1;
  }

  .rule-threshold-line {
    color: #909399;
    font-size: 12px;
    line-height: 1.3;
  }

  .rule-separator {
    margin: 0 6px;
    color: #c0c4cc;
  }

  .sub-text {
    margin-top: 2px;
    color: #909399;
    font-size: 12px;
    line-height: 1.35;
  }
}

.control-linkage-dialog {
  :deep(.el-dialog__body) {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    margin: 14px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px dashed #dcdfe6;
    color: #303133;
    font-size: 14px;
    font-weight: 600;

    &::before {
      content: "";
      width: 4px;
      height: 14px;
      margin-right: 8px;
      border-radius: 2px;
      background: #409eff;
    }

    &:first-child {
      margin-top: 0;
    }
  }

  .unit-text {
    margin-left: 8px;
    color: #606266;
  }
}

.option-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  line-height: 24px;
}

.option-tags {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 5px;
}

.option-sub {
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
</style>

<style lang="scss">
.control-linkage-select-popper {
  .el-select-dropdown__item {
    height: auto;
    min-height: 48px;
    padding-top: 4px;
    padding-bottom: 4px;
    line-height: 20px;
  }

  .el-select-dropdown__item.selected {
    font-weight: 500;
  }
}
</style>
