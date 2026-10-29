<template>
  <div class="disease-page">
    <!-- 顶部 Banner -->
    <!-- <div class="page-hero">
      <div class="hero-left">
        <el-tag effect="dark" class="hero-tag">智慧农业 · AI 识别</el-tag>
        <h2 class="hero-title">病虫害识别结果管理</h2>
        <p class="hero-desc">
          汇总展示病虫害识别结果、模型可信度、症状描述、防治建议与预警状态，支持查询、维护和导出。
        </p>
      </div>

      <div class="hero-stats">
        <div class="stat-card">
          <div class="stat-num">{{ total }}</div>
          <div class="stat-label">结果总数</div>
        </div>

        <div class="stat-card">
          <div class="stat-num">{{ warningCount }}</div>
          <div class="stat-label">触发预警</div>
        </div>

        <div class="stat-card">
          <div class="stat-num">{{ highConfidenceCount }}</div>
          <div class="stat-label">高可信度</div>
        </div>
      </div>
    </div> -->

    <!-- 查询区 -->
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
        <el-form-item label="病虫害名称" prop="diseaseName">
          <el-input
            v-model="queryParams.diseaseName"
            placeholder="如：叶枯病"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="作物类型" prop="diseaseCrop">
          <el-input
            v-model="queryParams.diseaseCrop"
            placeholder="如：冬枣"
            clearable
            style="width: 160px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="预警等级" prop="warningLevel">
          <el-select
            v-model="queryParams.warningLevel"
            placeholder="请选择预警等级"
            clearable
            style="width: 170px"
          >
            <el-option label="无" value="无" />
            <el-option label="低" value="低" />
            <el-option label="中" value="中" />
            <el-option label="高" value="高" />
          </el-select>
        </el-form-item>

        <el-form-item label="图片序号" prop="imageId">
          <el-input
            v-model="queryParams.imageId"
            placeholder="图片序号"
            clearable
            style="width: 150px"
            @keyup.enter="handleQuery"
          />
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
            <span class="card-title">识别结果列表</span>
            <span class="table-subtitle">展示病虫害识别结果、症状描述、防治建议和预警状态</span>
          </div> -->

          <div class="table-actions">
            <el-button
              type="primary"
              plain
              icon="Plus"
              @click="handleAdd"
              v-hasPermi="['xwq:disease:add']"
            >
              新增
            </el-button>

            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['xwq:disease:edit']"
            >
              修改
            </el-button>

            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['xwq:disease:remove']"
            >
              删除
            </el-button>

            <el-button
              type="warning"
              plain
              icon="Download"
              @click="handleExport"
              v-hasPermi="['xwq:disease:export']"
            >
              导出
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="diseaseList"
        border
        stripe
        class="agri-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column label="序号" width="80" align="center">
          <template #default="{ $index }">
            {{ (queryParams.pageNum - 1) * queryParams.pageSize + $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="图片" width="96" align="center">
          <template #default="{ row }">
            <el-image
              v-if="getPreviewImage(row)"
              :src="getPreviewImage(row)"
              :preview-src-list="[getPreviewImage(row)]"
              fit="cover"
              class="table-image"
              preview-teleported
            />
            <div v-else class="image-placeholder">无图</div>
          </template>
        </el-table-column>

        <el-table-column label="识别对象" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="disease-main">
              <div class="disease-icon">病</div>
              <div class="disease-info">
                <div class="disease-name">{{ row.diseaseName || '未知病虫害' }}</div>
                <div class="disease-meta">
                  图片序号：{{ row.imageId || '-' }} ｜ 记录序号：{{ row.recordId || '-' }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="作物" prop="diseaseCrop" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">
              {{ row.diseaseCrop || '小麦' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="可信度" prop="diseaseConfidence" width="150" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="toPercent(row.diseaseConfidence)"
              :stroke-width="10"
              :color="confidenceColors"
            />
          </template>
        </el-table-column>

        <el-table-column label="预警" prop="warningLevel" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getWarningTag(row.warningLevel)" effect="plain">
              {{ row.warningLevel || '无' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="症状表现" prop="diseaseDesc" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="desc-text">{{ row.diseaseDesc || '暂无症状描述' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="识别结论" prop="diseaseResult" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="desc-text">{{ row.diseaseResult || '暂无识别结论' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="防治建议" prop="diseaseAdvice" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="advice-text">{{ row.diseaseAdvice || '暂无防治建议' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="210" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" icon="View" @click="handleView(scope.row)">
              查看
            </el-button>

            <el-button
              link
              type="primary"
              icon="Edit"
              @click="handleUpdate(scope.row)"
              v-hasPermi="['xwq:disease:edit']"
            >
              修改
            </el-button>

            <el-button
              link
              type="danger"
              icon="Delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['xwq:disease:remove']"
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

    <!-- 添加或修改病虫害识别结果对话框 -->
    <el-dialog
      :title="title"
      v-model="open"
      width="820px"
      append-to-body
      destroy-on-close
      class="disease-dialog"
    >
      <el-form ref="diseaseRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="记录序号" prop="recordId">
              <el-input v-model="form.recordId" placeholder="请输入识别记录序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="图片序号" prop="imageId">
              <el-input v-model="form.imageId" placeholder="请输入图片序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="病虫害名称" prop="diseaseName">
              <el-input v-model="form.diseaseName" placeholder="请输入病虫害名称" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="标准编码" prop="diseaseCode">
              <el-input v-model="form.diseaseCode" placeholder="请输入病虫害标准编码" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="作物类型" prop="diseaseCrop">
              <el-input v-model="form.diseaseCrop" placeholder="如：小麦" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
                        <el-form-item label="可信度" prop="diseaseConfidence">
              <el-input v-model="form.diseaseConfidence" placeholder="如：0.956" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="是否预警" prop="isWarning">
              <el-select v-model="form.isWarning" placeholder="请选择" style="width: 100%">
                <el-option label="否" :value="0" />
                <el-option label="是" :value="1" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="预警等级" prop="warningLevel">
              <el-select
                v-model="form.warningLevel"
                placeholder="请选择预警等级"
                clearable
                style="width: 100%"
              >
                <el-option label="无" value="无" />
                <el-option label="低" value="低" />
                <el-option label="中" value="中" />
                <el-option label="高" value="高" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="症状表现" prop="diseaseDesc">
              <el-input
                v-model="form.diseaseDesc"
                type="textarea"
                :rows="3"
                placeholder="请输入识别到的症状表现"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="识别结论" prop="diseaseResult">
              <el-input
                v-model="form.diseaseResult"
                type="textarea"
                :rows="3"
                placeholder="请输入模型诊断结论"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="防治建议" prop="diseaseAdvice">
              <el-input
                v-model="form.diseaseAdvice"
                type="textarea"
                :rows="4"
                placeholder="请输入药剂防治、农艺措施等建议"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="结果图地址" prop="diseaseResultImgUrl">
              <el-input
                v-model="form.diseaseResultImgUrl"
                type="textarea"
                :rows="2"
                placeholder="请输入识别后的标注图、打框图地址"
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

    <!-- 详情弹窗 -->
    <el-dialog
      title="病虫害识别详情"
      v-model="detailOpen"
      width="760px"
      append-to-body
      class="detail-dialog"
    >
      <div v-if="detailData" class="detail-content">
        <div class="detail-top">
          <el-image
            v-if="getPreviewImage(detailData)"
            :src="getPreviewImage(detailData)"
            :preview-src-list="[getPreviewImage(detailData)]"
            fit="cover"
            class="detail-image"
            preview-teleported
          />
          <div class="detail-summary">
            <h3>{{ detailData.diseaseName || '未知病虫害' }}</h3>
            <p>作物类型：{{ detailData.diseaseCrop || '小麦' }}</p>
            <p>图片序号：{{ detailData.imageId || '-' }}</p>
            <p>记录序号：{{ detailData.recordId || '-' }}</p>
            <el-progress
              :percentage="toPercent(detailData.diseaseConfidence)"
              :stroke-width="12"
              :color="confidenceColors"
            />
          </div>
        </div>

        <el-descriptions :column="1" border class="detail-desc">
          <el-descriptions-item label="预警等级">
            <el-tag :type="getWarningTag(detailData.warningLevel)" effect="plain">
              {{ detailData.warningLevel || '无' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="症状表现">
            {{ detailData.diseaseDesc || '暂无症状描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="识别结论">
            {{ detailData.diseaseResult || '暂无识别结论' }}
          </el-descriptions-item>
          <el-descriptions-item label="防治建议">
            {{ detailData.diseaseAdvice || '暂无防治建议' }}
          </el-descriptions-item>
          <el-descriptions-item label="结果图地址">
            {{ detailData.diseaseResultImgUrl || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="Disease">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listDisease, getDisease, delDisease, addDisease, updateDisease } from '@/api/binZhou/xwq/disease'

const { proxy } = getCurrentInstance()

const diseaseList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const detailData = ref(null)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const confidenceColors = [
  { color: '#f56c6c', percentage: 60 },
  { color: '#e6a23c', percentage: 85 },
  { color: '#67c23a', percentage: 100 }
]

const warningCount = computed(() => {
  return diseaseList.value.filter(item => Number(item.isWarning) === 1 || (item.warningLevel && item.warningLevel !== '无')).length
})

const highConfidenceCount = computed(() => {
  return diseaseList.value.filter(item => toPercent(item.diseaseConfidence) >= 85).length
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    recordId: undefined,
    imageId: undefined,
    diseaseName: undefined,
    diseaseCode: undefined,
    diseaseCrop: undefined,
    diseaseConfidence: undefined,
    diseaseResult: undefined,
    diseaseDesc: undefined,
    diseaseAdvice: undefined,
    diseaseResultImgUrl: undefined,
    isWarning: undefined,
    warningLevel: undefined
  },
  rules: {
    recordId: [
      { required: true, message: '识别记录ID不能为空', trigger: 'blur' }
    ],
    imageId: [
      { required: true, message: '图片ID不能为空', trigger: 'blur' }
    ],
    diseaseName: [
      { required: true, message: '病虫害名称不能为空', trigger: 'blur' }
    ],
    isWarning: [
      { required: true, message: '是否预警不能为空', trigger: 'change' }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询病虫害识别结果列表 */
function getList() {
  loading.value = true
  listDisease(queryParams.value).then(response => {
    diseaseList.value = response.rows || []
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
    diseaseId: null,
    recordId: null,
    imageId: null,
    diseaseName: null,
    diseaseCode: null,
    diseaseCrop: '小麦',
    diseaseConfidence: null,
    diseaseResult: null,
    diseaseDesc: null,
    diseaseAdvice: null,
    diseaseResultImgUrl: null,
    isWarning: 0,
    warningLevel: '无',
    diseaseA: null,
    diseaseB: null,
    diseaseC: null,
    diseaseD: null,
    diseaseE: null,
    diseaseF: null,
    diseaseG: null,
    diseaseH: null,
    diseaseI: null,
    diseaseJ: null
  }
  proxy.resetForm('diseaseRef')
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
  ids.value = selection.map(item => item.diseaseId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = '新增病虫害识别结果'
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _diseaseId = row.diseaseId || ids.value

  getDisease(_diseaseId).then(response => {
    form.value = response.data || {}
    open.value = true
    title.value = '修改病虫害识别结果'
  })
}

/** 查看详情 */
function handleView(row) {
  detailData.value = row
  detailOpen.value = true
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs.diseaseRef.validate(valid => {
    if (!valid) return

    if (form.value.diseaseId != null) {
      updateDisease(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addDisease(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _diseaseIds = row.diseaseId || ids.value

  proxy.$modal.confirm(`是否确认删除病虫害识别结果编号为 "${_diseaseIds}" 的数据项？`).then(() => {
    return delDisease(_diseaseIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('xwq/disease/export', {
    ...queryParams.value
  }, `disease_${new Date().getTime()}.xlsx`)
}

/** 可信度百分比 */
function toPercent(value) {
  const num = Number(value || 0)
  if (num <= 1) return Math.round(num * 100)
  return Math.round(num)
}

/** 预警标签 */
function getWarningTag(level) {
  if (!level || level === '无') return 'info'
  if (level === '低') return 'success'
  if (level === '中') return 'warning'
  if (level === '高') return 'danger'
  return 'info'
}

/** 图片地址归一化 */
function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url

  return `${baseApi}/${url}`
}

/** 优先展示结果图，没有则展示原图 */
function getPreviewImage(row) {
  return normalizeImageUrl(row.diseaseResultImgUrl || row.imageUrl)
}

getList()
</script>

<style scoped>
.disease-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部 Banner */
.page-hero {
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

.page-hero::after {
  content: "";
  position: absolute;
  right: -70px;
  top: -70px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
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
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.stat-card {
  min-width: 112px;
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
  opacity: 0.85;
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
.agri-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #2f6f3e;
}

.table-image {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.image-placeholder {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 12px;
}

.disease-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.disease-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fff1f0, #fde2e2);
  color: #f56c6c;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.disease-info {
  overflow: hidden;
}

.disease-name {
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
}

.disease-meta {
  color: #909399;
  font-size: 12px;
  margin-top: 3px;
}

.desc-text {
  color: #606266;
}

.advice-text {
  color: #2f6f3e;
}

/* 弹窗 */
:deep(.disease-dialog .el-dialog__header),
:deep(.detail-dialog .el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
  padding: 18px 22px;
}

:deep(.disease-dialog .el-dialog__body) {
  padding: 22px 24px 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 详情 */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-top {
  display: flex;
  gap: 18px;
  align-items: stretch;
}

.detail-image {
  width: 180px;
  height: 140px;
  border-radius: 12px;
  border: 1px solid #ebeef5;
  flex-shrink: 0;
}

.detail-summary {
  flex: 1;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #ebeef5;
}

.detail-summary h3 {
  margin: 0 0 10px;
  color: #303133;
}

.detail-summary p {
  margin: 5px 0;
  color: #606266;
  font-size: 13px;
}

.detail-desc {
  margin-top: 4px;
}

/* 响应式 */
@media screen and (max-width: 1200px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .hero-stats {
    width: 100%;
  }

  .stat-card {
    flex: 1;
  }
}
</style>