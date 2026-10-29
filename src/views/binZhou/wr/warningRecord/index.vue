<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="70px">
      <el-form-item label="预警任务" prop="taskId">
        <el-select v-model="queryParams.taskId" placeholder="请选择预警任务" clearable filterable style="width: 160px">
          <el-option v-for="item in taskList" :key="item.id" :label="item.taskName" :value="item.id" />
        </el-select>
      </el-form-item>
            <el-form-item label="设备" prop="deviceId">
        <el-select v-model="queryParams.deviceId" placeholder="请选择设备" clearable filterable style="width: 180px">
          <el-option
            v-for="item in deviceList"
            :key="item.deviceId"
            :label="getDeviceLabel(item)"
            :value="item.deviceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="预警类型" prop="warningType">
        <el-select v-model="queryParams.warningType" placeholder="请选择预警类型" clearable style="width: 160px">
          <el-option
            v-for="dict in wr_warning_type"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="等级" prop="warningLevel">
        <el-select v-model="queryParams.warningLevel" placeholder="请选择等级" clearable style="width: 140px">
          <el-option
            v-for="dict in wr_warning_level"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="时间" prop="warningTime">
        <el-date-picker
          v-model="queryParams.warningTime"
          type="date"
          placeholder="预警时间"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">查 询</el-button>
        <el-button icon="Refresh" @click="resetQuery">重 置</el-button>
      </el-form-item>
      <el-collapse class="mb8" style="border: none;">
        <el-collapse-item title="展开更多筛选条件 ⬇️" name="1">
                    <el-form-item label="指标" prop="indicatorCode">
            <el-select v-model="queryParams.indicatorCode" placeholder="请选择指标" clearable filterable style="width: 160px">
              <el-option
                v-for="item in indicatorOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="数值" prop="currentValue">
            <el-input v-model="queryParams.currentValue" placeholder="监测值" clearable />
          </el-form-item>
          <el-form-item label="创建" prop="createTime">
            <el-date-picker v-model="queryParams.createTime" type="date" placeholder="创建时间" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="更新" prop="updateTime">
            <el-date-picker v-model="queryParams.updateTime" type="date" placeholder="更新时间" value-format="YYYY-MM-DD" />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wr:warningRecord:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['wr:warningRecord:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['wr:warningRecord:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['wr:warningRecord:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>
    <el-table v-loading="loading" :data="warningRecordList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      
      <el-table-column label="关联任务名称" align="center" prop="taskName" min-width="150" show-overflow-tooltip />
      
      <el-table-column label="设备名称" align="center" prop="deviceName" />
      
      <el-table-column label="预警类型" align="center" prop="warningType">
        <template #default="scope">
          <dict-tag :options="wr_warning_type" :value="String(scope.row.warningType ?? '')" />
        </template>
      </el-table-column>
      <el-table-column label="预警等级" align="center" prop="warningLevel">
        <template #default="scope">
          <dict-tag :options="wr_warning_level" :value="String(scope.row.warningLevel ?? '')" />
        </template>
      </el-table-column>
      <el-table-column label="监测指标" align="center" prop="indicatorCode" />
      <el-table-column label="触发值" align="center" prop="currentValue" />
      <el-table-column label="AI建议" align="center" prop="aiSuggestion" show-overflow-tooltip />
      
      <el-table-column label="预警时间" align="center" prop="warningTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.warningTime) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['wr:warningRecord:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['wr:warningRecord:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form ref="warningRecordRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="预警任务" prop="taskId">
              <el-select v-model="form.taskId" placeholder="请选择关联预警任务" clearable filterable style="width: 100%;">
                <el-option
                  v-for="item in taskList"
                  :key="item.id"
                  :label="item.taskName"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预警类型" prop="warningType">
              <el-select v-model="form.warningType" placeholder="请选择预警类型" style="width: 100%;">
                <el-option
                  v-for="dict in wr_warning_type"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
                    <el-col :span="12">
            <el-form-item label="触发设备" prop="deviceId">
              <el-select v-model="form.deviceId" placeholder="请选择触发设备" clearable filterable style="width: 100%;">
                <el-option
                  v-for="item in deviceList"
                  :key="item.deviceId"
                  :label="getDeviceLabel(item)"
                  :value="item.deviceId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预警等级" prop="warningLevel">
              <el-select v-model="form.warningLevel" placeholder="请选择预警等级" style="width: 100%;">
                <el-option
                v-for="dict in wr_warning_level"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发生时间" prop="warningTime">
              <el-date-picker clearable v-model="form.warningTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="选择预警发生时间" style="width: 100%;"></el-date-picker>
            </el-form-item>
          </el-col>
                    <el-col :span="12">
            <el-form-item label="监测指标" prop="indicatorCode">
              <el-select v-model="form.indicatorCode" placeholder="请选择监测指标" clearable filterable style="width: 100%;">
                <el-option
                  v-for="item in indicatorOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="监测值" prop="currentValue">
              <el-input v-model="form.currentValue" placeholder="请输入触发时监测值" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="AI预警建议" prop="aiSuggestion">
              <el-input v-model="form.aiSuggestion" type="textarea" :rows="2" placeholder="可手动填写；留空时系统将自动生成AI处置建议" />
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="AI分析源数据" prop="aiResultJson">
              <el-input v-model="form.aiResultJson" type="textarea" :rows="2" placeholder="预留字段：存放AI大模型返回的原始JSON数据" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务扩展字段1" prop="reservedField1">
              <el-input v-model="form.reservedField1" placeholder="预留字段1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务扩展字段2" prop="reservedField2">
              <el-input v-model="form.reservedField2" placeholder="预留字段2" />
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
<script setup name="WarningRecord">
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
import { listWarningRecord, getWarningRecord, delWarningRecord, addWarningRecord, updateWarningRecord } from "@/api/binZhou/wr/warningRecord"
// 引入查询预警任务的真实 API
import { listTask } from "@/api/binZhou/wr/task"
import { listDevice } from "@/api/binZhou/ld/iot/device"
const { proxy } = getCurrentInstance()
const { wr_warning_type, wr_warning_level } = proxy.useDict('wr_warning_type', 'wr_warning_level')
const warningRecordList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
// 定义预警任务列表
const taskList = ref([])
const deviceList = ref([])
// 气象灾害监测指标：低温冻害、干热风
const indicatorOptions = [
  { label: '气温 AIR_TEMP', value: 'AIR_TEMP', unit: '℃' },
  { label: '空气湿度 AIR_HUMIDITY', value: 'AIR_HUMIDITY', unit: '%' },
  { label: '风速 WIND_SPEED', value: 'WIND_SPEED', unit: 'm/s' }
];

// 根据监测指标自动显示单位
const currentUnit = computed(() => {
  const item = indicatorOptions.find(
    item => item.value === form.value.indicatorCode
  )
  return item ? item.unit : ''
})
const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskId: undefined,
    deviceId: undefined,
    warningType: undefined,
    warningLevel: undefined,
    indicatorCode: undefined,
    currentValue: undefined,
    aiSuggestion: undefined,
    aiResultJson: undefined,
    warningTime: undefined,
    createTime: undefined, 
    updateTime: undefined,
    orderByColumn: 'warning_time', 
    isAsc: 'desc'  
  },
  rules: {
    taskId: [
      { required: true, message: "关联预警任务不能为空", trigger: "change" }
    ],
    warningType: [
      { required: true, message: "预警类型不能为空", trigger: "blur" }
    ],
    warningLevel: [
      { required: true, message: "预警等级不能为空", trigger: "change" }
    ],
    indicatorCode: [
      { required: true, message: "监测指标编码不能为空", trigger: "blur" }
    ],
    warningTime: [
      { required: true, message: "预警发生时间不能为空", trigger: "blur" }
    ]
  }
})
const { queryParams, form, rules } = toRefs(data)
/** 查询所有预警任务用于下拉框联动 */
function getTaskList() {
  listTask({}).then(response => {
    taskList.value = response.rows || response.data || []
  })
}
/** 查询设备列表用于下拉框 */
function getDeviceList() {
  listDevice({ pageNum: 1, pageSize: 1000 }).then(response => {
    deviceList.value = response.rows || response.data || []
  })
}
function getDeviceLabel(item) {
  return item.deviceName || item.deviceSn || `设备${item.deviceId}`
}
/** 查询预警记录列表 */
function getList() {
  loading.value = true
  const params = {
    ...queryParams.value,
    warningType: toNumberOrUndefined(queryParams.value.warningType),
    warningLevel: toNumberOrUndefined(queryParams.value.warningLevel)
  }
  listWarningRecord(params).then(response => {
    warningRecordList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
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
    taskId: null,
    deviceId: null,
    warningType: null,
    warningLevel: null,
    indicatorCode: null,
    currentValue: null,
    aiSuggestion: null,
    aiResultJson: null,
    warningTime: null,
    reservedField1: null,
    reservedField2: null
  }
  proxy.resetForm("warningRecordRef")
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
  title.value = "添加预警记录"
}
/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getWarningRecord(_id).then(response => {
    const record = response.data || {}
    form.value = {
      ...record,
      // 若依字典下拉框要求字符串值，这里统一转成字符串以保证准确回显
      warningType: record.warningType == null ? null : String(record.warningType),
      warningLevel: record.warningLevel == null ? null : String(record.warningLevel)
    }
    open.value = true
    title.value = "修改预警记录"
  })
}
/** 提交按钮 */
function submitForm() {
  proxy.$refs["warningRecordRef"].validate(valid => {
    if (valid) {
      const submitData = {
        ...form.value,
        // 后端实体通常是 Integer，提交前转为数字，避免字符串/数字类型不一致
        warningType: toNumberOrNull(form.value.warningType),
        warningLevel: toNumberOrNull(form.value.warningLevel),
        taskId: toNumberOrNull(form.value.taskId),
        deviceId: toNumberOrNull(form.value.deviceId)
      }
      if (submitData.id != null) {
        updateWarningRecord(submitData).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addWarningRecord(submitData).then(() => {
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
  proxy.$modal.confirm('是否确认删除预警记录编号为"' + _ids + '"的数据项？').then(function() {
    return delWarningRecord(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}
/** 导出按钮操作 */
function handleExport() {
  proxy.download('wr/warningRecord/export', {
    ...queryParams.value
  }, `warningRecord_${new Date().getTime()}.xlsx`)
}
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}
function toNumberOrUndefined(value) {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isNaN(number) ? undefined : number
}
// 页面初始化
getList()
getTaskList() // 获取任务列表数据
getDeviceList() // 获取设备列表数据
</script>
