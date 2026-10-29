<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="90px">
      <el-form-item label="产品名称" prop="productId">
        <el-select 
          v-model="queryParams.productId" 
          placeholder="请选择产品" 
          clearable 
          filterable
          style="width: 220px"
        >
          <el-option
            v-for="item in productList"
            :key="item.productId"
            :label="item.productName"
            :value="item.productId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="物模型" prop="modelId">
        <el-select
          v-model="queryParams.modelId"
          placeholder="请选择物模型"
          clearable
          filterable
          style="width: 220px"
          @change="handleQueryProductChange"
        >
          <el-option
            v-for="item in queryModelList"
            :key="item.modelId"
            :label="formatModelLabel(item)"
            :value="item.modelId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="设备名称" prop="deviceId">
        <el-select
          v-model="queryParams.deviceId"
          placeholder="请选择设备"
          clearable
          filterable
          style="width: 220px"
        >
          <el-option
            v-for="item in deviceList"
            :key="item.deviceId"
            :label="formatDeviceLabel(item)"
            :value="item.deviceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="预警级别" prop="alertLevel">
        <el-input
          v-model="queryParams.alertLevel"
          placeholder="请输入预警级别"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="阈值下限" prop="thresholdMin">
        <el-input
          v-model="queryParams.thresholdMin"
          placeholder="请输入阈值下限"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="阈值上限" prop="thresholdMax">
        <el-input
          v-model="queryParams.thresholdMax"
          placeholder="请输入阈值上限"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="规则描述" prop="ruleDescription">
        <el-input
          v-model="queryParams.ruleDescription"
          placeholder="请输入规则描述"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="是否启用" prop="isEnabled">
        <el-select v-model="queryParams.isEnabled" placeholder="请选择启用状态" clearable style="width: 180px">
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
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['ld:warnConfig:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['ld:warnConfig:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['ld:warnConfig:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['ld:warnConfig:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="warnConfigList" @selection-change="handleSelectionChange" class="warn-table">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" align="center" prop="id" width="70" />
      <el-table-column label="物模型" align="center" prop="modelName" min-width="140" show-overflow-tooltip>
        <template #default="scope">
          <span class="model-name-text">{{ scope.row.modelName || formatModelName(scope.row.modelId) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="产品名称" align="center" prop="productName" min-width="140" show-overflow-tooltip>
        <template #default="scope">
          <span>{{ scope.row.productName || getProductNameByModel(scope.row.modelId) || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="适用设备" align="center" prop="deviceName" min-width="170" show-overflow-tooltip>
        <template #default="scope">
          <div v-if="scope.row.deviceId">
            <span>{{ scope.row.deviceName || formatDeviceName(scope.row.deviceId) || '-' }}</span>
            <div class="device-sn-text">{{ scope.row.deviceSn || getDeviceSn(scope.row.deviceId) || '-' }}</div>
          </div>
          <el-tag v-else type="success" effect="plain">全部设备</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="预警级别" align="center" prop="alertLevel" width="100">
        <template #default="scope">
          <el-tag :type="getAlertLevelType(scope.row.alertLevel)" effect="dark" class="level-tag">
            {{ getAlertLevelText(scope.row.alertLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="阈值范围" align="center" width="140">
        <template #default="scope">
          <span class="threshold-range">
            <span class="min-v">{{ scope.row.thresholdMin !== null && scope.row.thresholdMin !== '' ? scope.row.thresholdMin : '-∞' }}</span>
            <span class="divider">~</span>
            <span class="max-v">{{ scope.row.thresholdMax !== null && scope.row.thresholdMax !== '' ? scope.row.thresholdMax : '+∞' }}</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="规则描述" align="center" prop="ruleDescription" min-width="150" show-overflow-tooltip />
      <el-table-column label="是否启用" align="center" prop="isEnabled" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.isEnabled === 1 ? 'success' : 'danger'" class="status-tag" effect="light">
            <i class="status-dot" :class="scope.row.isEnabled === 1 ? 'dot-success' : 'dot-danger'"></i>
            {{ scope.row.isEnabled === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="120">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['ld:warnConfig:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:warnConfig:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination
      v-show="total>0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改物模型产品预警规则配置对话框 -->
    <el-dialog :title="title" v-model="open" width="650px" append-to-body class="weather-dialog">
      <el-form ref="warnConfigRef" :model="form" :rules="rules" label-width="100px">
        <div class="form-section-title">规则核心配置</div>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="物模型" prop="modelId">
              <el-select v-model="form.modelId" placeholder="请选择物模型" filterable style="width: 100%" @change="handleModelChange">
                <el-option
                  v-for="item in modelList"
                  :key="item.modelId"
                  :label="`${item.modelName} - ${item.productName || '未知产品'}`"
                  :value="item.modelId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适用设备" prop="deviceId">
              <el-select
                v-model="form.deviceId"
                placeholder="为空表示该物模型对应产品下所有设备"
                clearable
                filterable
                popper-class="warn-config-device-popper"
                style="width: 100%"
              >
                <el-option label="全部设备（该物模型对应产品下所有设备）" :value="null" />
                <el-option
                  v-for="item in filteredDeviceList"
                  :key="item.deviceId"
                  :label="formatDeviceLabel(item)"
                  :value="item.deviceId"
                >
                  <div class="device-option-main">
                    <span>{{ item.deviceName || '未命名设备' }}</span>
                    <el-tag size="small" :type="item.status == '1' ? 'success' : 'info'">
                      {{ item.status == '1' ? '在线' : '离线' }}
                    </el-tag>
                  </div>
                  <div class="device-option-sub">{{ item.deviceSn || '-' }} / {{ item.productName || getProductName(item.productId) || '-' }}</div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预警级别" prop="alertLevel">
              <el-select v-model="form.alertLevel" placeholder="请选择预警级别" style="width: 100%">
                <el-option label="一级预警" :value="1" />
                <el-option label="二级预警" :value="2" />
                <el-option label="三级预警" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否启用" prop="isEnabled">
              <el-radio-group v-model="form.isEnabled" style="margin-top: 5px;">
                <el-radio :value="1">启用</el-radio>
                <el-radio :value="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">阈值与触发描述</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="阈值下限" prop="thresholdMin">
              <el-input v-model="form.thresholdMin" placeholder="不设下限可留空" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="阈值上限" prop="thresholdMax">
              <el-input v-model="form.thresholdMax" placeholder="不设上限可留空" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="规则描述" prop="ruleDescription">
              <el-input v-model="form.ruleDescription" placeholder="如: 温度过高触发报警" />
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

<script setup name="WarnConfig">
import { ref, reactive, toRefs, getCurrentInstance, computed } from 'vue'
import { listWarnConfig, getWarnConfig, delWarnConfig, addWarnConfig, updateWarnConfig } from "@/api/binZhou/ld/iot/warnConfig"
import { listModel } from "@/api/binZhou/ld/iot/model"
import { listProduct } from "@/api/binZhou/ld/iot/product"
import { listDevice } from "@/api/binZhou/ld/iot/device"

const { proxy } = getCurrentInstance()

const warnConfigList = ref([])
const modelList = ref([])
const productList = ref([])
const deviceList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    productId: undefined,
    modelId: undefined,
    deviceId: undefined,
    alertLevel: undefined,
    thresholdMin: undefined,
    thresholdMax: undefined,
    ruleDescription: undefined,
    isEnabled: undefined
  },
  rules: {
    modelId: [
      { required: true, message: "物模型不能为空", trigger: "change" }
    ],
    alertLevel: [
      { required: true, message: "预警级别不能为空", trigger: "blur" }
    ],
    isEnabled: [
      { required: true, message: "是否启用不能为空", trigger: "change" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

const filteredDeviceList = computed(() => {
  const model = getModelById(form.value.modelId)
  if (!model || !model.productId) return deviceList.value
  return deviceList.value.filter(item => String(item.productId) === String(model.productId))
})

const queryModelList = computed(() => {
  if (!queryParams.value.productId) return modelList.value
  return modelList.value.filter(item => String(item.productId) === String(queryParams.value.productId))
})

/** 查询物模型定义列表 */
function getModelList() {
  listModel({ pageNum: 1, pageSize: 1000 }).then(response => {
    modelList.value = response.rows || []
  })
}

function getProductList() {
  listProduct({ pageNum: 1, pageSize: 1000 }).then(response => {
    productList.value = response.rows || response.data || []
  })
}

function getDeviceList() {
  listDevice({ pageNum: 1, pageSize: 1000 }).then(response => {
    deviceList.value = response.rows || []
  })
}

/** 格式化物模型名称 */
function formatModelName(modelId) {
  if (!modelId || modelList.value.length === 0) return modelId
  const found = modelList.value.find(m => m.modelId == modelId)
  return found ? found.modelName : modelId
}

function formatModelLabel(model) {
  if (!model) return '-'
  return `${model.modelName || '未命名物模型'} - ${model.productName || getProductName(model.productId) || '未知产品'}`
}

function getModelById(modelId) {
  if (!modelId || modelList.value.length === 0) return null
  return modelList.value.find(m => String(m.modelId) === String(modelId)) || null
}

function getProductNameByModel(modelId) {
  if (!modelId || modelList.value.length === 0) return ''
  const found = modelList.value.find(m => m.modelId == modelId)
  return found?.productName || ''
}

function getProductName(productId) {
  if (!productId || productList.value.length === 0) return ''
  const found = productList.value.find(p => String(p.productId) === String(productId))
  return found?.productName || ''
}

function formatDeviceLabel(device) {
  if (!device) return '-'
  const productName = device.productName || getProductName(device.productId) || '未关联产品'
  const status = device.status == '1' ? '在线' : '离线'
  return `${device.deviceName || '未命名设备'} / ${device.deviceSn || '无SN'} / ${productName} / ${status}`
}

function formatDeviceName(deviceId) {
  if (!deviceId || deviceList.value.length === 0) return ''
  const found = deviceList.value.find(d => String(d.deviceId) === String(deviceId))
  return found?.deviceName || ''
}

function getDeviceSn(deviceId) {
  if (!deviceId || deviceList.value.length === 0) return ''
  const found = deviceList.value.find(d => String(d.deviceId) === String(deviceId))
  return found?.deviceSn || ''
}

function handleModelChange() {
  if (!form.value.deviceId) return
  const exists = filteredDeviceList.value.some(item => String(item.deviceId) === String(form.value.deviceId))
  if (!exists) {
    form.value.deviceId = null
  }
}

function handleQueryProductChange() {
  if (!queryParams.value.modelId) return
  const exists = queryModelList.value.some(item => String(item.modelId) === String(queryParams.value.modelId))
  if (!exists) {
    queryParams.value.modelId = undefined
  }
}

/** 查询物模型产品预警规则配置列表 */
function getList() {
  loading.value = true
  listWarnConfig(queryParams.value).then(response => {
    warnConfigList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    id: null,
    modelId: null,
    deviceId: null,
    alertLevel: null,
    thresholdMin: null,
    thresholdMax: null,
    ruleDescription: null,
    isEnabled: 1,
    createTime: null
  }
  proxy.resetForm("warnConfigRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加物模型产品预警规则配置"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getWarnConfig(_id).then(response => {
    form.value = response.data
    handleModelChange()
    open.value = true
    title.value = "修改物模型产品预警规则配置"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["warnConfigRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateWarnConfig(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addWarnConfig(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _ids = row.id || ids.value
  proxy.$modal.confirm('是否确认删除物模型产品预警规则配置编号为"' + _ids + '"的数据项？').then(function() {
    return delWarnConfig(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('ld/warnConfig/export', {
    ...queryParams.value
  }, `warnConfig_${new Date().getTime()}.xlsx`)
}

function getAlertLevelType(level) {
  if (level === 1 || level === '1') return 'info';
  if (level === 2 || level === '2') return 'warning';
  if (level === 3 || level === '3') return 'danger';
  return 'info';
}

function getAlertLevelText(level) {
  if (level === 1 || level === '1') return '一级预警';
  if (level === 2 || level === '2') return '二级预警';
  if (level === 3 || level === '3') return '三级预警';
  return level || '未知';
}

getList()
getModelList()
getProductList()
getDeviceList()
</script>

<style scoped lang="scss">
.warn-table {
  margin-top: 15px;
  
  .model-name-text {
    font-weight: 500;
    color: #606266;
  }
  
  .level-tag {
    border-radius: 4px;
    font-weight: 600;
  }

  .device-sn-text {
    margin-top: 2px;
    color: #909399;
    font-size: 12px;
    line-height: 1.3;
  }
}

.threshold-range {
  font-family: monospace;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
  .min-v {
    color: #409eff;
  }
  
  .divider {
    color: #909399;
    font-weight: normal;
  }
  
  .max-v {
    color: #f56c6c;
  }
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  border-radius: 12px;
  
  .status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    
    &.dot-success {
      background-color: #67c23a;
    }
    
    &.dot-danger {
      background-color: #f56c6c;
    }
  }
}

/* Dialog Form Styling */
.weather-dialog {
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 10px;
  }
  
  .form-section-title {
    font-size: 13px;
    font-weight: bold;
    color: #303133;
    margin: 15px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 1px dashed #e4e7ed;
    display: flex;
    align-items: center;
    
    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 12px;
      background-color: #409eff;
      margin-right: 6px;
      border-radius: 2px;
    }
    
    &:first-of-type {
      margin-top: 0;
    }
  }
}

.device-option-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  line-height: 24px;
}

.device-option-sub {
  color: #909399;
  font-size: 12px;
  line-height: 18px;
}
</style>

<style lang="scss">
.warn-config-device-popper {
  .el-select-dropdown__item {
    height: auto;
    min-height: 48px;
    padding-top: 4px;
    padding-bottom: 4px;
    line-height: 20px;
  }
}
</style>
