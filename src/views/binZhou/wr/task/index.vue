<template>
  <div class="app-container">
    <!-- 查询条件 -->
    <el-form
      ref="queryRef"
      :model="queryParams"
      :inline="true"
      v-show="showSearch"
      label-width="760px"
    >
      <el-form-item label="任务名称" prop="taskName">
        <el-input
          v-model="queryParams.taskName"
          placeholder="请输入任务名称"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>

      <el-form-item label="任务状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择任务状态"
          clearable
          style="width: 180px"
          @change="handleQuery"
        >
          <el-option
            v-for="dict in wr_task_status"
            :key="String(dict.value)"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">
          搜索
        </el-button>
        <el-button icon="Refresh" @click="resetQuery">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 工具栏 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['wr:task:add']"
        >
          新增
        </el-button>
      </el-col>

      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['wr:task:edit']"
        >
          修改
        </el-button>
      </el-col>

      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['wr:task:remove']"
        >
          删除
        </el-button>
      </el-col>

      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['wr:task:export']"
        >
          导出
        </el-button>
      </el-col>

      <right-toolbar
        v-model:showSearch="showSearch"
        @queryTable="getList"
      />
    </el-row>

   <!-- 任务列表：文字内容自适应布局 -->
    <el-table v-loading="loading" :data="taskList" row-key="id" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      
      <!-- min-width 仅作为保障，实际宽度由单元格内的文字内容撑开 -->
      <el-table-column label="任务名称" align="center" prop="taskName" min-width="120" show-overflow-tooltip />
      <el-table-column label="关联模板" align="center" prop="templateName" min-width="120" show-overflow-tooltip />
      <el-table-column label="定时表达式" align="center" prop="cronExpression" min-width="120" />
      
      <el-table-column label="监控开始时间" align="center" prop="monitorStartTime" min-width="90" />
      <el-table-column label="监控结束时间" align="center" prop="monitorEndTime" min-width="90" />

      <el-table-column label="任务状态" align="center" prop="status" min-width="90">
        <template #default="scope">
          <dict-tag :options="wr_task_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      
      <el-table-column label="创建时间" align="center" prop="createTime" min-width="160" />
      <el-table-column label="更新时间" align="center" prop="updateTime" min-width="160" />

      <!-- 操作列通常不需要文字自适应，保持固定以防折行 -->
      <el-table-column label="操作" align="center" width="220" fixed="right">
        <template #default="scope">
          <el-button v-if="!isRunningStatus(scope.row.status)" link type="success" icon="VideoPlay" @click="handleStatusChange(scope.row, 'running')">启动</el-button>
          <el-button v-else link type="warning" icon="VideoPause" @click="handleStatusChange(scope.row, 'paused')">暂停</el-button>
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
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

    <!-- 新增/修改弹窗 -->
    <el-dialog class="task-professional-dialog task-dialog"
      :title="title"
      v-model="open"
      width="700px"
      append-to-body
      @closed="handleDialogClosed"
    >
      <el-form
        ref="taskRef"
        :model="form"
        :rules="rules"
        label-width="110px"
      >
        <el-row>
          <el-col :span="24">
            <el-form-item label="任务名称" prop="taskName">
              <el-input
                v-model="form.taskName"
                placeholder="请输入预警任务名称"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="关联模板" prop="templateId">
              <el-select
                v-model="form.templateId"
                placeholder="请选择关联预警模板"
                clearable
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="item in templateOptions"
                  :key="item.id"
                  :label="item.templateName"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="定时表达式" prop="cronExpression">
              <el-input
                v-model="form.cronExpression"
                placeholder="例如：0 0/5 * * * ?"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="监控开始时间" prop="monitorStartTime">
              <el-time-picker
                v-model="form.monitorStartTime"
                format="HH:mm:ss"
                value-format="HH:mm:ss"
                placeholder="请选择开始时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="监控结束时间" prop="monitorEndTime">
              <el-time-picker
                v-model="form.monitorEndTime"
                format="HH:mm:ss"
                value-format="HH:mm:ss"
                placeholder="请选择结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
          </el-col>

          <el-col :span="12">
          </el-col>

          <el-col :span="24">
            <el-form-item label="查询配置" prop="queryConfigJson">
              <el-input
                v-model="form.queryConfigJson"
                type="textarea"
                :rows="3"
                placeholder="请输入数据查询条件配置（JSON格式）"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
          </el-col>

          <el-col :span="12">
            <el-form-item label="任务状态" prop="status">
              <el-select
                v-model="form.status"
                placeholder="请选择任务状态"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="dict in wr_task_status"
                  :key="String(dict.value)"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
          </el-col>

          <el-col :span="12">
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button
            type="primary"
            :loading="submitLoading"
            @click="submitForm"
          >
            确 定
          </el-button>
          <el-button @click="cancel">
            取 消
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Task">
import { getCurrentInstance, reactive, ref, toRefs, onMounted } from "vue"
import { listTemplate } from "@/api/binZhou/wr/template"
import {
  listTask,
  getTask,
  delTask,
  addTask,
  updateTask
} from "@/api/binZhou/wr/task"

const { proxy } = getCurrentInstance()

const {
  wr_task_status,
  wr_data_source_type,
  wr_rule_type
} = proxy.useDict(
  "wr_task_status",
  "wr_data_source_type",
  "wr_rule_type"
)

const taskList = ref([])
const templateOptions = ref([])
const open = ref(false)
const loading = ref(false)
const submitLoading = ref(false)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const statusLoadingId = ref(null)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskName: undefined,
    status: undefined
  },
  rules: {
    taskName: [
      {
        required: true,
        message: "任务名称不能为空",
        trigger: "blur"
      }
    ],
    templateId: [
      {
        required: true,
        message: "关联预警模板不能为空",
        trigger: "change"
      }
    ],
    cronExpression: [
      {
        required: true,
        message: "定时表达式不能为空",
        trigger: "blur"
      }
    ],
    dataSourceType: [
      {
        required: true,
        message: "数据源类型不能为空",
        trigger: "change"
      }
    ],
    ruleSourceType: [
      {
        required: true,
        message: "规则类型不能为空",
        trigger: "change"
      }
    ],
    status: [
      {
        required: true,
        message: "任务状态不能为空",
        trigger: "change"
      }
    ],
    queryConfigJson: [
      {
        validator: validateJson,
        trigger: "blur"
      }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** JSON格式校验 */
function validateJson(rule, value, callback) {
  if (value === undefined || value === null || String(value).trim() === "") {
    callback()
    return
  }

  try {
    JSON.parse(value)
    callback()
  } catch (error) {
    callback(new Error("查询配置必须是合法的JSON格式"))
  }
}

/** 将状态统一转换为字符串后比较，兼容数字/字符串类型 */
function normalizeStatus(value) {
  if (value === undefined || value === null) {
    return ""
  }
  return String(value).trim().toLowerCase()
}

/** 获取状态字典数组 */
function getStatusOptions() {
  return Array.isArray(wr_task_status.value)
    ? wr_task_status.value
    : []
}

/** 根据标签和值关键词查找状态字典项 */
function findStatusOption(type) {
  const options = getStatusOptions()

  if (type === "running") {
    return options.find(item => {
      const label = normalizeStatus(item.label)
      const value = normalizeStatus(item.value)

      return (
        label.includes("运行") ||
        label.includes("启动") ||
        label.includes("正常") ||
        value === "running" ||
        value === "run" ||
        value === "started" ||
        value === "start"
      )
    })
  }

  return options.find(item => {
    const label = normalizeStatus(item.label)
    const value = normalizeStatus(item.value)

    return (
      label.includes("暂停") ||
      label.includes("停止") ||
      label.includes("停用") ||
      label.includes("未启动") ||
      value === "paused" ||
      value === "pause" ||
      value === "stopped" ||
      value === "stop" ||
      value === "disabled"
    )
  })
}

/** 获取字典中真实的运行状态值 */
function getRunningStatusValue() {
  const option = findStatusOption("running")
  return option ? option.value : "running"
}

/** 获取字典中真实的暂停状态值 */
function getPausedStatusValue() {
  const option = findStatusOption("paused")
  return option ? option.value : "paused"
}

/** 判断一行是否为运行状态 */
function isRunningStatus(status) {
  return (
    normalizeStatus(status) ===
    normalizeStatus(getRunningStatusValue())
  )
}

/** 清理查询参数，避免空字符串影响后端查询 */
function buildQueryParams() {
  const params = {
    pageNum: queryParams.value.pageNum,
    pageSize: queryParams.value.pageSize
  }

  const taskName = queryParams.value.taskName
  const status = queryParams.value.status

  if (
    taskName !== undefined &&
    taskName !== null &&
    String(taskName).trim() !== ""
  ) {
    params.taskName = String(taskName).trim()
  }

  if (
    status !== undefined &&
    status !== null &&
    String(status).trim() !== ""
  ) {
    // 这里必须直接使用字典真实value，不能写死 running/paused
    params.status = status
  }

  return params
}

/** 查询任务列表 */
async function getList() {
  loading.value = true

  try {
    const response = await listTask(buildQueryParams())
    taskList.value = Array.isArray(response?.rows) ? response.rows : []
    total.value = Number(response?.total || 0)
  } catch (error) {
    console.error("查询任务列表失败：", error)
    taskList.value = []
    total.value = 0
    proxy.$modal.msgError("查询任务列表失败")
  } finally {
    loading.value = false
  }
}

/** 查询模板下拉数据 */
async function getTemplateOptions() {
  try {
    const response = await listTemplate({
      pageNum: 1,
      pageSize: 1000
    })
    templateOptions.value = Array.isArray(response?.rows)
      ? response.rows
      : []
  } catch (error) {
    console.error("查询模板列表失败：", error)
    templateOptions.value = []
  }
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置搜索 */
function resetQuery() {
  proxy.resetForm("queryRef")

  queryParams.value.pageNum = 1
  queryParams.value.pageSize = 10
  queryParams.value.taskName = undefined
  queryParams.value.status = undefined

  getList()
}

/** 表格多选 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = selection.length === 0
}

/** 重置表单 */
function reset() {
  form.value = {
    id: undefined,
    taskName: undefined,
    templateId: undefined,
    cronExpression: undefined,
    monitorStartTime: undefined,
    monitorEndTime: undefined,
    dataSourceType: undefined,
    dataSourceId: undefined,
    queryConfigJson: undefined,
    ruleSourceType: undefined,
    status: getPausedStatusValue(),
    reservedField1: undefined,
    reservedField2: undefined
  }

  proxy.resetForm("taskRef")
}

/** 新增 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加预警任务"
}

/** 修改 */
async function handleUpdate(row) {
  reset()

  const taskId = row?.id || ids.value[0]

  if (taskId === undefined || taskId === null) {
    proxy.$modal.msgError("请选择需要修改的任务")
    return
  }

  try {
    const response = await getTask(taskId)
    form.value = response?.data || {}
    open.value = true
    title.value = "修改预警任务"
  } catch (error) {
    console.error("获取任务详情失败：", error)
    proxy.$modal.msgError("获取任务详情失败")
  }
}

/** 取消 */
function cancel() {
  open.value = false
}

/** 弹窗关闭 */
function handleDialogClosed() {
  reset()
}

/** 提交新增/修改 */
function submitForm() {
  proxy.$refs.taskRef.validate(async valid => {
    if (!valid) {
      return
    }

    submitLoading.value = true

    try {
      if (form.value.id !== undefined && form.value.id !== null) {
        await updateTask({ ...form.value })
        proxy.$modal.msgSuccess("修改成功")
      } else {
        await addTask({ ...form.value })
        proxy.$modal.msgSuccess("新增成功")
      }

      open.value = false
      await getList()
    } catch (error) {
      console.error("保存任务失败：", error)
      proxy.$modal.msgError("保存任务失败")
    } finally {
      submitLoading.value = false
    }
  })
}

/**
 * 启动/暂停任务
 *
 * type只表示用户动作，不直接作为数据库值。
 * 最终提交值来自wr_task_status字典，确保状态列和按钮完全一致。
 */
async function handleStatusChange(row, type) {
  if (!row || row.id === undefined || row.id === null) {
    proxy.$modal.msgError("任务ID不存在")
    return
  }

  const targetStatus =
    type === "running"
      ? getRunningStatusValue()
      : getPausedStatusValue()

  const actionText = type === "running" ? "启动" : "暂停"
  const oldStatus = row.status

  try {
    await proxy.$modal.confirm(
      `确认要${actionText}任务“${row.taskName || row.id}”吗？`
    )

    statusLoadingId.value = row.id

    /*
     * 只提交ID和状态，避免把templateName等列表扩展字段传给后端。
     * 若你的后端update接口要求完整实体，可将这里改成：
     * await updateTask({ ...row, status: targetStatus })
     */
    await updateTask({
      id: row.id,
      status: targetStatus
    })

    // 立即同步当前行，避免状态列和按钮短暂不一致
    row.status = targetStatus

    proxy.$modal.msgSuccess(`${actionText}成功`)

    // 再从后台刷新，确保最终数据一致
    await getList()
  } catch (error) {
    row.status = oldStatus

    if (error !== "cancel" && error !== "close") {
      console.error(`${actionText}任务失败：`, error)
      proxy.$modal.msgError(`${actionText}失败`)
    }
  } finally {
    statusLoadingId.value = null
  }
}

/** 删除 */
function handleDelete(row) {
  const taskIds =
    row?.id !== undefined && row?.id !== null
      ? [row.id]
      : ids.value

  if (!taskIds.length) {
    proxy.$modal.msgError("请选择需要删除的任务")
    return
  }

  proxy.$modal
    .confirm(`是否确认删除任务编号为“${taskIds.join(",")}”的数据？`)
    .then(() => delTask(taskIds))
    .then(() => {
      proxy.$modal.msgSuccess("删除成功")
      getList()
    })
    .catch(error => {
      if (error !== "cancel" && error !== "close") {
        console.error("删除任务失败：", error)
      }
    })
}

/** 导出 */
function handleExport() {
  proxy.download(
    "wr/task/export",
    buildQueryParams(),
    `task_${new Date().getTime()}.xlsx`
  )
}

onMounted(() => {
  getTemplateOptions()
  getList()
})
</script>


<style scoped>
.task-dialog :deep(.el-dialog__body) {
  padding: 20px 35px 10px;
}

.task-dialog :deep(.el-form-item__label) {
  font-weight: 500;
}

.task-dialog :deep(.el-input),
.task-dialog :deep(.el-select),
.task-dialog :deep(.el-date-editor) {
  width: 100%;
}

.task-dialog :deep(.el-textarea__inner) {
  min-height: 90px !important;
}

.task-dialog :deep(.el-dialog__footer) {
  padding-top: 10px;
}

</style>


<style scoped>
.task-professional-dialog :deep(.el-dialog) {
  border-radius: 8px;
}

.task-professional-dialog :deep(.el-dialog__body) {
  padding: 20px 35px;
}

.task-professional-dialog :deep(.el-form-item) {
  margin-bottom: 18px;
}

.task-professional-dialog :deep(.el-form-item__label) {
  font-weight: 500;
}

.task-professional-dialog :deep(.el-input),
.task-professional-dialog :deep(.el-select),
.task-professional-dialog :deep(.el-date-editor) {
  width: 100%;
}

.task-professional-dialog :deep(.el-textarea__inner) {
  min-height: 90px;
}

.task-professional-dialog :deep(.el-dialog__footer) {
  padding-top: 10px;
}
</style>
<!-- task-final-style -->
