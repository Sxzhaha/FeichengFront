<template>
  <div class="record-page">
    <el-card class="query-card" shadow="hover">
      <!-- <template #header>
        <div class="card-header">
          <span class="card-title">筛选条件</span>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
        </div>
      </template> -->

      <el-form
        :model="queryParams"
        ref="queryRef"
        :inline="true"
        v-show="showSearch"
        label-width="90px"
        class="query-form"
      >
        <el-form-item label="记录编号" prop="recordNo">
          <el-input
            v-model="queryParams.recordNo"
            placeholder="请输入识别记录编号"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="识别方式" prop="recordMode">
          <el-select v-model="queryParams.recordMode" placeholder="请选择识别方式" clearable style="width: 180px">
            <el-option label="手动上传" value="手动上传" />
            <el-option label="自动定时" value="自动定时" />
          </el-select>
        </el-form-item>

        <el-form-item label="模型名称" prop="modelName">
          <el-input
            v-model="queryParams.modelName"
            placeholder="请输入模型名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="图片序号" prop="imageId">
          <el-input
            v-model="queryParams.imageId"
            placeholder="请输入图片序号"
            clearable
            style="width: 150px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="设备序号" prop="deviceId">
          <el-input
            v-model="queryParams.deviceId"
            placeholder="请输入设备序号"
            clearable
            style="width: 160px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="状态" prop="recordStatus">
          <el-select v-model="queryParams.recordStatus" placeholder="请选择状态" clearable style="width: 150px">
            <el-option label="待识别" :value="0" />
            <el-option label="识别中" :value="1" />
            <el-option label="成功" :value="2" />
            <el-option label="失败" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <!-- <div>
            <span class="card-title">识别记录列表</span>
            <span class="table-subtitle">管理 AI 识别记录、图片关联、模型快照和执行状态</span>
          </div> -->

          <div class="table-actions">
            <el-button
              type="primary"
              plain
              icon="Plus"
              @click="handleAdd"
              v-hasPermi="['xwq:record:add']"
            >
              新增记录
            </el-button>

            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['xwq:record:edit']"
            >
              修改
            </el-button>

            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['xwq:record:remove']"
            >
              删除
            </el-button>

            <el-button
              type="warning"
              plain
              icon="Download"
              @click="handleExport"
              v-hasPermi="['xwq:record:export']"
            >
              导出
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="recordList"
        border
        stripe
        class="record-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column label="序号" align="center" width="80">
          <template #default="{ $index }">
            {{ (queryParams.pageNum - 1) * queryParams.pageSize + $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="识别记录" prop="recordNo" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="record-name-cell">
              <div class="record-icon">{{ getRecordTypeShortName(row.recordType) }}</div>
              <div class="record-name-info">
                <div class="record-name">{{ row.recordNo || '-' }}</div>
                <div class="record-code">图片序号：{{ row.imageId || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="识别类型" prop="recordType" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getRecordTypeTag(row.recordType)" effect="plain">
              {{ row.recordType || '未设置' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="识别方式" prop="recordMode" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">{{ row.recordMode || '-' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="模型" prop="modelName" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="mini-title">{{ row.modelName || '未设置模型' }}</div>
            <div class="mini-sub">模型序号：{{ row.modelId || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="作物" prop="cropType" width="110" align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">{{ row.cropType || '通用' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="设备/位置" min-width="180" align="center">
          <template #default="{ row }">
            <div class="mini-text">设备：{{ row.deviceId || '-' }}</div>
            <div class="mini-text">园区：{{ row.parkId || '-' }} ｜ 地块：{{ row.plotId || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="状态" prop="recordStatus" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getRecordStatusTag(row.recordStatus)" effect="plain">
              {{ getRecordStatusName(row.recordStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" align="center" width="170" fixed="right">
          <template #default="scope">
            <el-button
              link
              type="primary"
              icon="Edit"
              @click="handleUpdate(scope.row)"
              v-hasPermi="['xwq:record:edit']"
            >
              修改
            </el-button>

            <el-button
              link
              type="danger"
              icon="Delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['xwq:record:remove']"
            >
              删除
            </el-button>
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
    </el-card>

    <el-dialog
      :title="title"
      v-model="open"
      width="760px"
      append-to-body
      class="record-dialog"
      destroy-on-close
    >
      <el-form ref="recordRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="记录编号" prop="recordNo">
              <el-input v-model="form.recordNo" placeholder="请输入识别记录编号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="识别类型" prop="recordType">
              <el-select v-model="form.recordType" placeholder="请选择识别类型" style="width: 100%">
                <el-option label="病虫害" value="病虫害" />
                <el-option label="虫情" value="虫情" />
                <el-option label="物候期" value="物候期" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="识别方式" prop="recordMode">
              <el-select v-model="form.recordMode" placeholder="请选择识别方式" style="width: 100%">
                <el-option label="手动上传" value="手动上传" />
                <el-option label="自动定时" value="自动定时" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="识别状态" prop="recordStatus">
              <el-select v-model="form.recordStatus" placeholder="请选择状态" style="width: 100%">
                <el-option label="待识别" :value="0" />
                <el-option label="识别中" :value="1" />
                <el-option label="成功" :value="2" />
                <el-option label="失败" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="模型序号" prop="modelId">
              <el-input v-model="form.modelId" placeholder="请输入模型序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="模型名称" prop="modelName">
              <el-input v-model="form.modelName" placeholder="请输入模型名称快照" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="图片序号" prop="imageId">
              <el-input v-model="form.imageId" placeholder="请输入图片序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="作物类型" prop="cropType">
              <el-input v-model="form.cropType" placeholder="如：小麦" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="设备序号" prop="deviceId">
              <el-input v-model="form.deviceId" placeholder="请输入设备序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="园区序号" prop="parkId">
              <el-input v-model="form.parkId" placeholder="请输入园区序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="地块序号" prop="plotId">
              <el-input v-model="form.plotId" placeholder="请输入地块序号" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Record">
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listRecord, getRecord, delRecord, addRecord, updateRecord } from '@/api/binZhou/xwq/record'

const { proxy } = getCurrentInstance()

const recordList = ref([])
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
    recordNo: undefined,
    recordType: undefined,
    recordMode: undefined,
    modelId: undefined,
    modelName: undefined,
    imageId: undefined,
    cropType: undefined,
    deviceId: undefined,
    parkId: undefined,
    plotId: undefined,
    recordStatus: undefined,
    recordA: undefined,
    recordB: undefined,
    recordC: undefined,
    recordD: undefined,
    recordE: undefined,
    recordF: undefined,
    recordG: undefined,
    recordH: undefined,
    recordI: undefined,
    recordJ: undefined
  },
  rules: {
    recordNo: [
      { required: true, message: "识别记录编号不能为空", trigger: "blur" }
    ],
    recordType: [
      { required: true, message: "识别类型：病虫害、虫情、物候期不能为空", trigger: "change" }
    ],
    recordMode: [
      { required: true, message: "识别方式：手动上传、自动定时不能为空", trigger: "blur" }
    ],
    modelId: [
      { required: true, message: "本次识别使用的模型 ID不能为空", trigger: "blur" }
    ],
    imageId: [
      { required: true, message: "关联图片信息表 image_id不能为空", trigger: "blur" }
    ],
    recordStatus: [
      { required: true, message: "识别状态：0 待识别，1 识别中，2 成功，3 失败不能为空", trigger: "change" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询识别记录列表 */
function getList() {
  loading.value = true
    listRecord(queryParams.value).then(response => {
    recordList.value = response.rows || []
    total.value = response.total || 0
    loading.value = false
  }).catch(() => {
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
        recordId: null,
    recordNo: null,
    recordType: '虫情',
    recordMode: '手动上传',
    modelId: null,
    modelName: null,
    imageId: null,
    cropType: '小麦',
    deviceId: null,
    parkId: null,
    plotId: null,
    recordStatus: 0,
    recordA: null,
    recordB: null,
    recordC: null,
    recordD: null,
    recordE: null,
    recordF: null,
    recordG: null,
    recordH: null,
    recordI: null,
    recordJ: null
  }
  proxy.resetForm('recordRef')
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.recordId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = '添加识别记录'
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _recordId = row.recordId || ids.value
  getRecord(_recordId).then(response => {
    form.value = response.data
    open.value = true
    title.value = '修改识别记录'
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs.recordRef.validate(valid => {
    if (valid) {
      if (form.value.recordId != null) {
        updateRecord(form.value).then(() => {
          proxy.$modal.msgSuccess('修改成功')
          open.value = false
          getList()
        })
      } else {
        addRecord(form.value).then(() => {
          proxy.$modal.msgSuccess('新增成功')
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _recordIds = row.recordId || ids.value
  proxy.$modal.confirm('是否确认删除识别记录编号为"' + _recordIds + '"的数据项？').then(function() {
    return delRecord(_recordIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('xwq/record/export', {
    ...queryParams.value
  }, `record_${new Date().getTime()}.xlsx`)
}

function getRecordTypeTag(type) {
  if (type === '病虫害') return 'danger'
  if (type === '虫情') return 'warning'
  if (type === '物候期') return 'success'
  return 'info'
}

function getRecordTypeShortName(type) {
  if (type === '病虫害') return '病'
  if (type === '虫情') return '虫'
  if (type === '物候期') return '物'
  return 'AI'
}

function getRecordStatusName(status) {
  const value = Number(status)
  if (value === 0) return '待识别'
  if (value === 1) return '识别中'
  if (value === 2) return '成功'
  if (value === 3) return '失败'
  return '未知'
}

function getRecordStatusTag(status) {
  const value = Number(status)
  if (value === 0) return 'info'
  if (value === 1) return 'warning'
  if (value === 2) return 'success'
  if (value === 3) return 'danger'
  return 'info'
}

getList()
</script>

<style scoped>
.record-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.query-card,
.table-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}

.card-header,
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.table-subtitle {
  display: block;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.query-form {
  margin-bottom: -12px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.record-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #2f6f3e;
}

.record-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f7e8, #d4f0d4);
  color: #2f6f3e;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.record-name-info {
  overflow: hidden;
}

.record-name,
.mini-title {
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-code,
.mini-sub {
  color: #909399;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-text {
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}

:deep(.record-dialog .el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
  padding: 18px 22px;
}

:deep(.record-dialog .el-dialog__body) {
  padding: 24px 24px 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media screen and (max-width: 1200px) {
  .table-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .table-actions {
    flex-wrap: wrap;
  }
}
</style>
