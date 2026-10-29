<template>
  <div class="model-page">
    <!-- 顶部概览 -->
    <!-- <div class="model-hero">
      <div class="hero-left">
        <el-tag effect="dark" class="hero-tag">智慧农业 · AI 模型管理</el-tag>
        <h2 class="hero-title">模型管理中心</h2>
        <p class="hero-desc">
          统一维护病虫害识别、虫情识别、物候期识别等 AI 模型服务地址、状态与适用作物。
        </p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat-card">
          <div class="stat-num">{{ total }}</div>
          <div class="stat-label">模型总数</div>
        </div>
        <div class="hero-stat-card">
          <div class="stat-num">{{ enabledCount }}</div>
          <div class="stat-label">启用模型</div>
        </div>
        <div class="hero-stat-card">
          <div class="stat-num">{{ pestModelCount }}</div>
          <div class="stat-label">虫情模型</div>
        </div>
      </div>
    </div> -->

    <!-- 搜索区 -->
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
        label-width="80px"
        class="query-form"
      >
        <el-form-item label="模型名称" prop="modelName">
          <el-input
            v-model="queryParams.modelName"
            placeholder="请输入模型名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="模型编号" prop="modelCode">
          <el-input
            v-model="queryParams.modelCode"
            placeholder="请输入模型编号"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="模型类型" prop="modelType">
          <el-select
            v-model="queryParams.modelType"
            placeholder="请选择模型类型"
            clearable
            style="width: 180px"
          >
            <el-option label="病虫害" value="病虫害" />
            <el-option label="虫情" value="虫情" />
            <el-option label="物候期" value="物候期" />
          </el-select>
        </el-form-item>

        <el-form-item label="适用作物" prop="modelCrop">
          <el-input
            v-model="queryParams.modelCrop"
            placeholder="如：小麦"
            clearable
            style="width: 180px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="状态" prop="modelStatus">
          <el-select
            v-model="queryParams.modelStatus"
            placeholder="请选择状态"
            clearable
            style="width: 140px"
          >
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <!-- <div>
            <span class="card-title">模型列表</span>
            <span class="table-subtitle">维护模型服务地址、启停状态和适用场景</span>
          </div> -->

          <div class="table-actions">
            <el-button
              type="primary"
              plain
              icon="Plus"
              @click="handleAdd"
              v-hasPermi="['xwq:model:add']"
            >
              新增模型
            </el-button>

            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['xwq:model:edit']"
            >
              修改
            </el-button>

            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['xwq:model:remove']"
            >
              删除
            </el-button>

            <el-button
              type="warning"
              plain
              icon="Download"
              @click="handleExport"
              v-hasPermi="['xwq:model:export']"
            >
              导出
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="modelList"
        border
        stripe
        class="model-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column label="序号" align="center" width="80">
          <template #default="{ $index }">
            {{ (queryParams.pageNum - 1) * queryParams.pageSize + $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="模型名称" prop="modelName" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="model-name-cell">
              <div class="model-icon">
                {{ getModelShortName(row.modelType) }}
              </div>
              <div class="model-name-info">
                <div class="model-name">{{ row.modelName || '-' }}</div>
                <div class="model-code">{{ row.modelCode || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="模型类型" prop="modelType" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getModelTypeTag(row.modelType)" effect="plain">
              {{ row.modelType || '未设置' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="适用作物" prop="modelCrop" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">
              {{ row.modelCrop || '通用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="服务地址" prop="modelUrl" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="url-cell">
              <el-tooltip
                :content="row.modelUrl || '未配置模型服务地址'"
                placement="top"
                effect="dark"
              >
                <span class="url-text">{{ row.modelUrl || '未配置' }}</span>
              </el-tooltip>
              <el-button
                v-if="row.modelUrl"
                link
                type="primary"
                size="small"
                @click="copyModelUrl(row.modelUrl)"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="用途说明" prop="modelDesc" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="desc-text">{{ row.modelDesc || '暂无说明' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" prop="modelStatus" width="120" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.modelStatus"
              :active-value="1"
              :inactive-value="0"
              active-text="启用"
              inactive-text="停用"
              inline-prompt
              :loading="row.statusLoading"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="创建时间" prop="createTime" width="170" align="center" />

        <el-table-column label="操作" align="center" width="170" fixed="right">
          <template #default="scope">
            <el-button
              link
              type="primary"
              icon="Edit"
              @click="handleUpdate(scope.row)"
              v-hasPermi="['xwq:model:edit']"
            >
              修改
            </el-button>

            <el-button
              link
              type="danger"
              icon="Delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['xwq:model:remove']"
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

    <!-- 添加或修改模型管理对话框 -->
    <el-dialog
      :title="title"
      v-model="open"
      width="760px"
      append-to-body
      class="model-dialog"
      destroy-on-close
    >
      <el-form ref="modelRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="模型名称" prop="modelName">
              <el-input v-model="form.modelName" placeholder="请输入模型名称" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="模型编号" prop="modelCode">
              <el-input v-model="form.modelCode" placeholder="如：PEST_DEFAULT" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="模型类型" prop="modelType">
              <el-select
                v-model="form.modelType"
                placeholder="请选择模型类型"
                style="width: 100%"
              >
                <el-option label="病虫害" value="病虫害" />
                <el-option label="虫情" value="虫情" />
                <el-option label="物候期" value="物候期" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="适用作物" prop="modelCrop">
              <el-input v-model="form.modelCrop" placeholder="如：冬枣" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="服务地址" prop="modelUrl">
              <el-input
                v-model="form.modelUrl"
                placeholder="请输入模型服务调用地址，如：http://127.0.0.1:5002/predict"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="模型状态" prop="modelStatus">
              <el-radio-group v-model="form.modelStatus">
                <el-radio :label="1">启用</el-radio>
                <el-radio :label="0">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="用途说明" prop="modelDesc">
              <el-input
                v-model="form.modelDesc"
                type="textarea"
                :rows="4"
                placeholder="请输入模型用途、适用场景、输入输出说明等"
              />
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

<script setup name="Model">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listModel, getModel, delModel, addModel, updateModel } from '@/api/binZhou/xwq/model'

const { proxy } = getCurrentInstance()

const modelList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const enabledCount = computed(() => {
  return modelList.value.filter(item => Number(item.modelStatus) === 1).length
})

const pestModelCount = computed(() => {
  return modelList.value.filter(item => item.modelType === '虫情').length
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    modelName: undefined,
    modelCode: undefined,
    modelType: undefined,
    modelCrop: undefined,
    modelUrl: undefined,
    modelDesc: undefined,
    modelStatus: undefined
  },
  rules: {
    modelName: [
      { required: true, message: '模型名称不能为空', trigger: 'blur' }
    ],
    modelCode: [
      { required: true, message: '模型编号不能为空', trigger: 'blur' }
    ],
    modelType: [
      { required: true, message: '模型类型不能为空', trigger: 'change' }
    ],
    modelUrl: [
      { required: true, message: '模型服务调用地址不能为空', trigger: 'blur' }
    ],
    modelStatus: [
      { required: true, message: '模型状态不能为空', trigger: 'change' }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询模型管理列表 */
function getList() {
  loading.value = true

  listModel(queryParams.value).then(response => {
    modelList.value = (response.rows || []).map(item => ({
      ...item,
      modelStatus: item.modelStatus === null || item.modelStatus === undefined
        ? 0
        : Number(item.modelStatus),
      statusLoading: false
    }))

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
    modelId: null,
    modelName: null,
    modelCode: null,
    modelType: null,
    modelCrop: '小麦',
    modelUrl: null,
    modelDesc: null,
    modelStatus: 1,
    modelA: null,
    modelB: null,
    modelC: null,
    modelD: null,
    modelE: null,
    modelF: null,
    modelG: null,
    modelH: null,
    modelI: null,
    modelJ: null
  }

  proxy.resetForm('modelRef')
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
  ids.value = selection.map(item => item.modelId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = '新增模型'
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _modelId = row.modelId || ids.value

  getModel(_modelId).then(response => {
    form.value = {
      ...response.data,
      modelStatus: response.data.modelStatus === null || response.data.modelStatus === undefined
        ? 1
        : Number(response.data.modelStatus)
    }

    open.value = true
    title.value = '修改模型'
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs.modelRef.validate(valid => {
    if (!valid) return

    if (form.value.modelId != null) {
      updateModel(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addModel(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _modelIds = row.modelId || ids.value

  proxy.$modal.confirm(`是否确认删除模型编号为 "${_modelIds}" 的数据项？`).then(() => {
    return delModel(_modelIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/** 修改启停状态 */
function handleStatusChange(row) {
  const oldStatus = Number(row.modelStatus) === 1 ? 0 : 1
  const statusText = Number(row.modelStatus) === 1 ? '启用' : '停用'

  proxy.$modal.confirm(`确认要${statusText}模型 "${row.modelName}" 吗？`).then(() => {
    row.statusLoading = true

    const payload = { ...row }
    delete payload.statusLoading

    return updateModel(payload)
  }).then(() => {
    row.statusLoading = false
    proxy.$modal.msgSuccess(`${statusText}成功`)
  }).catch(() => {
    row.modelStatus = oldStatus
    row.statusLoading = false
  })
}

/** 复制模型地址 */
function copyModelUrl(url) {
  if (!url) return

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      proxy.$modal.msgSuccess('模型地址已复制')
    })
  } else {
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    proxy.$modal.msgSuccess('模型地址已复制')
  }
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('xwq/model/export', {
    ...queryParams.value
  }, `model_${new Date().getTime()}.xlsx`)
}

function getModelTypeTag(type) {
  if (type === '病虫害') return 'danger'
  if (type === '虫情') return 'warning'
  if (type === '物候期') return 'success'
  return 'info'
}

function getModelShortName(type) {
  if (type === '病虫害') return '病'
  if (type === '虫情') return '虫'
  if (type === '物候期') return '物'
  return 'AI'
}

getList()
</script>

<style scoped>
.model-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部 Banner */
.model-hero {
  background: linear-gradient(135deg, #2f6f3e 0%, #52b052 58%, #9adf9a 100%);
  border-radius: 14px;
  padding: 26px 30px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.model-hero::after {
  content: "";
  position: absolute;
  right: -60px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
}

.hero-left {
  position: relative;
  z-index: 1;
}

.hero-tag {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  margin-bottom: 10px;
}

.hero-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
}

.hero-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.88;
}

.hero-stats {
  display: flex;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.hero-stat-card {
  min-width: 110px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  text-align: center;
  backdrop-filter: blur(4px);
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
}

.stat-label {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.82;
}

/* 卡片 */
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

/* 表格 */
.model-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #2f6f3e;
}

.model-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-icon {
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

.model-name-info {
  overflow: hidden;
}

.model-name {
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-code {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.url-text {
  flex: 1;
  min-width: 0;
  color: #409eff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc-text {
  color: #606266;
}

/* 弹窗 */
:deep(.model-dialog .el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
  padding: 18px 22px;
}

:deep(.model-dialog .el-dialog__body) {
  padding: 24px 24px 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式 */
@media screen and (max-width: 1200px) {
  .model-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .hero-stats {
    width: 100%;
  }

  .hero-stat-card {
    flex: 1;
  }
}
</style>