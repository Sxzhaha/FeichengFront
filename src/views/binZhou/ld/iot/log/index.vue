<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="设备编号" prop="deviceSn">
        <el-input
          v-model="queryParams.deviceSn"
          placeholder="请输入设备编号"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="上报时间" style="width: 308px">
        <el-date-picker
          v-model="dateRange"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="datetimerange"
          range-separator="-"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
        ></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['iot:log:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['iot:log:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['iot:log:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['iot:log:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="logList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" align="center" prop="logId" width="80" />
      <el-table-column label="设备编号" align="center" prop="deviceSn" width="180" />
      <el-table-column label="上报时间" align="center" prop="createTime" width="180" />
      <el-table-column label="类型" align="center" prop="logType" width="100">
        <template #default="scope">
           <el-tag v-if="scope.row.logType == 1">属性上报</el-tag>
           <el-tag v-else-if="scope.row.logType == 2" type="warning">事件</el-tag>
           <el-tag v-else-if="scope.row.logType == 3" type="info">命令响应</el-tag>
           <el-tag v-else type="danger">未知</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="数据详情 (Payload)" align="left" min-width="300">
        <template #default="scope">
          <div v-if="isObject(scope.row.payload)" class="payload-wrapper">
             <template v-for="(val, key) in scope.row.payload" :key="key">
                <el-tag effect="plain" class="payload-tag" size="small">
                   <span class="tag-key">{{ key }}:</span>
                   <span class="tag-value">{{ val }}</span>
                </el-tag>
             </template>
          </div>
          <span v-else>{{ scope.row.payload }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['iot:log:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['iot:log:remove']">删除</el-button>
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

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="logRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="设备编号" prop="deviceSn">
          <el-input v-model="form.deviceSn" placeholder="请输入设备编号" />
        </el-form-item>
        
        <el-form-item label="类型" prop="logType">
           <el-radio-group v-model="form.logType">
              <el-radio label="1">属性上报</el-radio>
              <el-radio label="2">事件</el-radio>
              <el-radio label="3">命令响应</el-radio>
           </el-radio-group>
        </el-form-item>

        <el-form-item label="数据载荷" prop="payload">
          <el-input 
            v-model="form.payload" 
            type="textarea" 
            :rows="6"
            placeholder='请输入JSON格式，例如：{"temp": 24}' 
          />
        </el-form-item>
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

<script setup name="Log">
import { listLog, getLog, delLog, addLog, updateLog } from "@/api/binZhou/ld/iot/log"
import { getCurrentInstance, reactive, ref, toRefs } from "vue"; 

const { proxy } = getCurrentInstance()

const logList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const dateRange = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceSn: null,
    logType: null,
    payload: null,
  },
  rules: {
    deviceSn: [
      { required: true, message: "设备编号不能为空", trigger: "blur" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 辅助函数：判断是否为对象，用于模板渲染 */
function isObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/** 查询设备通信日志列表 */
function getList() {
  loading.value = true
  listLog(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    logList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

// 取消按钮
function cancel() {
  open.value = false
  reset()
}

// 表单重置
function reset() {
  form.value = {
    logId: null,
    deviceSn: null,
    logType: "1", // 默认选中属性上报(字符串)
    payload: null,
    createTime: null
  }
  proxy.resetForm("logRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  handleQuery()
}

// 多选框选中数据
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.logId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加设备通信日志"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _logId = row.logId || ids.value
  getLog(_logId).then(response => {
    form.value = response.data
    
    // 强制将 logType 转为字符串，以匹配 <el-radio label="1">
    if (form.value.logType != null) {
        form.value.logType = form.value.logType.toString(); 
    }

    // 如果后端返回的是对象，表单编辑时为了方便需要转回字符串
    if (typeof form.value.payload === 'object') {
        form.value.payload = JSON.stringify(form.value.payload, null, 4);
    }
    open.value = true
    title.value = "修改设备通信日志"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["logRef"].validate(valid => {
    if (valid) {
      if (form.value.logId != null) {
        updateLog(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addLog(form.value).then(response => {
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
  const _logIds = row.logId || ids.value
  proxy.$modal.confirm('是否确认删除设备通信日志编号为"' + _logIds + '"的数据项？').then(function() {
    return delLog(_logIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('iot/log/export', {
    ...queryParams.value
  }, `log_${new Date().getTime()}.xlsx`)
}

getList()
</script>

<style scoped>
.payload-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.payload-tag {
  font-family: Consolas, Monaco, monospace;
  background-color: #f4f4f5;
  border-color: #e9e9eb;
  color: #555;
}
.tag-key {
  color: #909399;
  margin-right: 4px;
  font-weight: bold;
}
.tag-value {
  color: #409eff;
}
</style>