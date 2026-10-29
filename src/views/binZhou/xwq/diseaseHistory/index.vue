<template>
  <div class="disease-history-page">
    <!-- 顶部 Banner -->
    <div class="page-hero">
      <div class="hero-left">
        <el-tag effect="dark" class="hero-tag">智慧农业 · 识别结果</el-tag>
        <h2 class="hero-title">病虫害识别历史结果</h2>
        <p class="hero-desc">
          查看由 AI 模型生成的病虫害识别结果、症状表现、防治建议、预警等级与图片记录。
        </p>
      </div>

      <div class="hero-actions">
        <el-button plain class="hero-btn" @click="goBack">
          返回识别页面
        </el-button>
        <el-button type="success" plain class="hero-btn" @click="handleExport">
          导出结果
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ total }}</div>
          <div class="stat-label">结果总数</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ warningCount }}</div>
          <div class="stat-label">触发预警</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ highConfidenceCount }}</div>
          <div class="stat-label">高置信度</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ diseaseTypeCount }}</div>
          <div class="stat-label">病虫害类别</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 查询区 -->
    <el-card class="query-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">筛选条件</span>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
        </div>
      </template>

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
            placeholder="如：条锈病、白粉病"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="作物类型" prop="diseaseCrop">
          <el-input
            v-model="queryParams.diseaseCrop"
            placeholder="如：小麦"
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

        <el-form-item label="图片ID" prop="imageId">
          <el-input
            v-model="queryParams.imageId"
            placeholder="图片ID"
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

    <!-- 表格 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <div>
            <span class="card-title">历史结果列表</span>
            <span class="table-subtitle">按识别时间倒序展示最近病虫害识别结果</span>
          </div>

          <div class="table-actions">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete">
              删除
            </el-button>
            <el-button type="warning" plain icon="Download" @click="handleExport">
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

        <el-table-column label="识别对象" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="disease-main">
              <div class="disease-icon">病</div>
              <div class="disease-info">
                <div class="disease-name">{{ row.diseaseName || '未知病虫害' }}</div>
                <div class="disease-meta">
                  {{ row.imageName || `图片ID：${row.imageId || '-'}` }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="作物" prop="diseaseCrop" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">{{ row.diseaseCrop || '小麦' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="置信度" width="150" align="center">
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

        <el-table-column label="症状表现" prop="diseaseDesc" min-width="240" show-overflow-tooltip />
        <el-table-column label="识别结论" prop="diseaseResult" min-width="260" show-overflow-tooltip />
        <el-table-column label="防治建议" prop="diseaseAdvice" min-width="320" show-overflow-tooltip />

        <el-table-column label="记录信息" min-width="180" align="center">
          <template #default="{ row }">
            <div class="mini-text">记录：{{ row.recordNo || row.recordId || '-' }}</div>
            <div class="mini-text">方式：{{ row.recordMode || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" icon="View" @click="handleView(row)">
              查看
            </el-button>
            <el-button link type="danger" icon="Delete" @click="handleDelete(row)">
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

    <!-- 详情弹窗 -->
    <el-dialog
      title="病虫害识别详情"
      v-model="detailOpen"
      width="780px"
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
          <div v-else class="detail-image-placeholder">无图</div>

          <div class="detail-summary">
            <h3>{{ detailData.diseaseName || '未知病虫害' }}</h3>
            <p>作物类型：{{ detailData.diseaseCrop || '小麦' }}</p>
            <p>图片名称：{{ detailData.imageName || '-' }}</p>
            <p>图片ID：{{ detailData.imageId || '-' }}</p>
            <p>识别记录：{{ detailData.recordNo || detailData.recordId || '-' }}</p>
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

          <el-descriptions-item label="原图地址">
            <div class="url-line">
              <span>{{ detailData.imageUrl || '无' }}</span>
              <el-button v-if="detailData.imageUrl" link type="primary" @click="copyText(detailData.imageUrl, '原图地址')">
                复制
              </el-button>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="结果图地址">
            <div class="url-line">
              <span>{{ detailData.diseaseResultImgUrl || '无' }}</span>
              <el-button v-if="detailData.diseaseResultImgUrl" link type="primary" @click="copyText(detailData.diseaseResultImgUrl, '结果图地址')">
                复制
              </el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="DiseaseHistory">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { listDisease, delDisease } from '@/api/binZhou/xwq/disease'

const router = useRouter()
const { proxy } = getCurrentInstance()

const diseaseList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const detailOpen = ref(false)
const detailData = ref(null)

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

const diseaseTypeCount = computed(() => {
  const set = new Set()
  diseaseList.value.forEach(item => {
    if (item.diseaseName) set.add(item.diseaseName)
  })
  return set.size
})

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    imageId: undefined,
    diseaseName: undefined,
    diseaseCrop: undefined,
    warningLevel: undefined
  }
})

const { queryParams } = toRefs(data)

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

function goBack() {
  router.push('/featureDisease')
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.diseaseId)
  multiple.value = !selection.length
}

function handleView(row) {
  detailData.value = row
  detailOpen.value = true
}

function handleDelete(row) {
  const _diseaseIds = row.diseaseId || ids.value

  proxy.$modal.confirm(`是否确认删除病虫害识别结果编号为 "${_diseaseIds}" 的数据项？`).then(() => {
    return delDisease(_diseaseIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('xwq/disease/export', {
    ...queryParams.value
  }, `disease_history_${new Date().getTime()}.xlsx`)
}

function toPercent(value) {
  const num = Number(value || 0)
  if (num <= 1) return Math.round(num * 100)
  return Math.round(num)
}

function getWarningTag(level) {
  if (!level || level === '无') return 'info'
  if (level === '低') return 'success'
  if (level === '中') return 'warning'
  if (level === '高') return 'danger'
  return 'info'
}

function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url

  return `${baseApi}/${url}`
}

function getPreviewImage(row) {
  return normalizeImageUrl(row.diseaseResultImgUrl || row.imageUrl)
}

function copyText(text, label) {
  if (!text) return

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      proxy.$modal.msgSuccess(`${label}已复制`)
    })
  } else {
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    proxy.$modal.msgSuccess(`${label}已复制`)
  }
}

getList()
</script>

<style scoped>
.disease-history-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.hero-left,
.hero-actions {
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
}

.hero-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.hero-btn {
  background: rgba(255,255,255,0.9);
  border-color: rgba(255,255,255,0.9);
}

.stat-row {
  margin-bottom: 0;
}

.stat-card {
  border-radius: 12px;
  text-align: center;
}

.stat-num {
  font-size: 30px;
  font-weight: 700;
  color: #2f6f3e;
}

.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
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

.agri-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #2f6f3e;
}

.table-image,
.image-placeholder {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.image-placeholder {
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

.disease-meta,
.mini-text {
  color: #909399;
  font-size: 12px;
  margin-top: 3px;
}

.url-line {
  display: flex;
  align-items: center;
  gap: 8px;
  word-break: break-all;
}

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

.detail-image,
.detail-image-placeholder {
  width: 190px;
  height: 140px;
  border-radius: 12px;
  border: 1px solid #ebeef5;
  flex-shrink: 0;
}

.detail-image-placeholder {
  background: #f5f7fa;
  color: #c0c4cc;
  display: flex;
  justify-content: center;
  align-items: center;
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

@media screen and (max-width: 1200px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .hero-actions {
    width: 100%;
  }
}
</style>
