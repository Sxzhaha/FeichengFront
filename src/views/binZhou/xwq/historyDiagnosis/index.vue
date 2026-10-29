<template>
  <div class="history-container">

    <!-- ===== 返回按钮 ===== -->
    <div class="back-bar">
      <el-button type="primary" @click="goBackToDiagnosis">
        <el-icon><ArrowLeft /></el-icon>
        返回虫情识别界面
      </el-button>
    </div>

    <!-- ===== Banner ===== -->
    <div class="top-banner">
      <div class="banner-left">
        <el-tag class="banner-tag" effect="dark">智慧农业 · 虫情识别结果中心</el-tag>
        <h2 class="banner-title">虫情识别结果界面</h2>
        <p class="banner-desc">
          管理虫情识别记录，快速查看虫害类别、虫体数量、置信度、预警等级与防治建议。
        </p>
      </div>

      <div class="banner-right">
        <div class="total-card">
          <div class="total-label">总记录数</div>
          <div class="total-num">{{ stats.total }}</div>
          <div class="total-sub">累计虫情识别结果</div>
        </div>
      </div>
    </div>

    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-input
        v-model="queryParams.pestName"
        placeholder="请输入虫害类别 / 识别结论 / 防治建议"
        clearable
        class="search-input"
        @keyup.enter="handleQuery"
        @clear="handleQuery"
      />

      <el-input
        v-model="queryParams.pestCrop"
        placeholder="作物类型，如：小麦"
        clearable
        style="width: 180px"
        @keyup.enter="handleQuery"
        @clear="handleQuery"
      />

      <el-input
        v-model="queryParams.warningLevel"
        placeholder="预警等级，如：无 / 低 / 中 / 高"
        clearable
        style="width: 220px"
        @keyup.enter="handleQuery"
        @clear="handleQuery"
      />

      <el-button type="primary" class="refresh-btn" @click="handleQuery">
        刷新数据
      </el-button>
    </div>

    <!-- ===== 统计卡片 ===== -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">总记录数</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
      </el-col>

      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">平均置信度</div>
          <div class="stat-value">{{ stats.avgConfidence }}%</div>
        </div>
      </el-col>

      <el-col :span="8">
        <div class="stat-card">
          <div class="stat-label">识别虫体总数</div>
          <div class="stat-value">{{ stats.totalPestCount }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- ===== 虫情识别结果表 ===== -->
    <div class="table-section">
      <div class="table-header">
        <div class="table-title-group">
          <span class="table-title">虫情识别结果</span>
          <span class="table-subtitle">AiPest 识别结果追踪与分析</span>
        </div>

        <div class="table-actions">
          <el-button
            type="danger"
            plain
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            删除 ({{ selectedIds.length }})
          </el-button>

          <el-button type="primary" plain @click="handleExportCsv">
            导出CSV
          </el-button>

          <el-button type="success" plain @click="handleExportExcel">
            <el-icon><Download /></el-icon>
            导出Excel
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
        style="width: 100%"
        class="history-table"
      >
        <el-table-column type="selection" width="50" align="center" />

        <el-table-column label="序号" width="65" align="center">
          <template #default="{ $index }">
            {{ total - (queryParams.pageNum - 1) * queryParams.pageSize - $index }}
          </template>
        </el-table-column>

        <el-table-column label="图片" width="90" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.imageUrl"
              :src="normalizeImageUrl(row.imageUrl)"
              :preview-src-list="[normalizeImageUrl(row.imageUrl)]"
              fit="cover"
              class="row-thumbnail"
              preview-teleported
            />
            <span v-else class="no-img">暂无</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="imageName"
          label="图片名称"
          min-width="190"
          show-overflow-tooltip
        />

        <el-table-column prop="pestName" label="虫害类别" width="130" align="center">
          <template #default="{ row }">
            <el-tag type="danger" effect="plain" disable-transitions>
              {{ row.pestName || '未知虫害' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="pestCrop" label="作物类型" width="100" align="center" />

        <el-table-column prop="pestConfidence" label="置信度" width="150" align="center">
          <template #default="{ row }">
            <div class="confidence-cell">
              <el-progress
                :percentage="toPercent(row.pestConfidence)"
                :color="getConfColor(toPercent(row.pestConfidence))"
                :stroke-width="8"
                :show-text="false"
                style="width: 72px; display: inline-block; margin-right: 8px"
              />
              <span
                :style="{
                  color: getConfColor(toPercent(row.pestConfidence)),
                  fontWeight: 'bold'
                }"
              >
                {{ toPercent(row.pestConfidence) }}%
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="pestCount" label="当前数量" width="100" align="center" />

        <el-table-column prop="pestTotalCount" label="总数量" width="100" align="center" />

        <el-table-column prop="warningLevel" label="预警等级" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getWarningTag(row.warningLevel)" effect="plain">
              {{ row.warningLevel || '无' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="pestResult"
          label="识别结论"
          min-width="250"
          show-overflow-tooltip
        />

        <el-table-column
          prop="pestAdvice"
          label="防治建议"
          min-width="300"
          show-overflow-tooltip
        />

        <el-table-column
          prop="recordNo"
          label="识别记录编号"
          min-width="160"
          show-overflow-tooltip
        />

        <el-table-column prop="recordMode" label="识别方式" width="110" align="center" />

        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleViewDetail(row)">
              查看详情
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="queryParams.pageNum"
          v-model:page-size="queryParams.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          background
          @size-change="handleQuery"
          @current-change="fetchList"
        />
      </div>
    </div>

    <!-- ===== 详情对话框 ===== -->
    <el-dialog
      v-model="detailVisible"
      title="虫情识别详情"
      width="720px"
      destroy-on-close
    >
      <div v-if="detailRow" class="detail-dialog">
        <div class="detail-image-wrap">
          <el-image
            v-if="detailRow.imageUrl"
            :src="normalizeImageUrl(detailRow.imageUrl)"
            fit="contain"
            style="width:100%; max-height:300px; border-radius:6px; background:#1e1e1e"
            :preview-src-list="[normalizeImageUrl(detailRow.imageUrl)]"
            preview-teleported
          />
          <el-empty v-else description="无图片" :image-size="80" />
        </div>

        <el-descriptions :column="2" border size="default" class="detail-desc">
          <el-descriptions-item label="图片名称" :span="2">
            {{ detailRow.imageName || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="虫害类别">
            <el-tag type="danger" effect="plain">
              {{ detailRow.pestName || '未知虫害' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="作物类型">
            {{ detailRow.pestCrop || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="置信度">
            <span
              :style="{
                color: getConfColor(toPercent(detailRow.pestConfidence)),
                fontWeight: 'bold'
              }"
            >
              {{ toPercent(detailRow.pestConfidence) }}%
            </span>
          </el-descriptions-item>

          <el-descriptions-item label="虫体数量">
            {{ detailRow.pestCount || 0 }} / 总数 {{ detailRow.pestTotalCount || 0 }}
          </el-descriptions-item>

          <el-descriptions-item label="预警等级">
            {{ detailRow.warningLevel || '无' }}
          </el-descriptions-item>

          <el-descriptions-item label="识别方式">
            {{ detailRow.recordMode || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="识别记录编号" :span="2">
            {{ detailRow.recordNo || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="识别结论" :span="2">
            {{ detailRow.pestResult || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="防治建议" :span="2">
            {{ detailRow.pestAdvice || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="检测框信息" :span="2">
            {{ detailRow.bboxJson || '暂无' }}
          </el-descriptions-item>

          <el-descriptions-item label="创建时间">
            {{ detailRow.createTime || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, ArrowLeft } from '@element-plus/icons-vue'
import { listPest, delPest } from '@/api/binZhou/xwq/pest'

const router = useRouter()
const loading = ref(false)
const total = ref(0)
const tableData = ref([])
const selectedIds = ref([])
const detailVisible = ref(false)
const detailRow = ref(null)

const stats = reactive({
  total: 0,
  avgConfidence: '0.0',
  totalPestCount: 0
})

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  pestName: '',
  pestCrop: '',
  warningLevel: ''
})

onMounted(handleQuery)

function goBackToDiagnosis() {
  router.push('/xwq/featurePest')
}

async function handleQuery() {
  queryParams.pageNum = 1
  await fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const res = await listPest(queryParams)
    const rows = res.rows || []

    tableData.value = rows
    total.value = res.total || 0

    calcStats(rows, total.value)
  } finally {
    loading.value = false
  }
}

function calcStats(rows, totalCount) {
  stats.total = totalCount || rows.length

  if (!rows.length) {
    stats.avgConfidence = '0.0'
    stats.totalPestCount = 0
    return
  }

  const confSum = rows.reduce((sum, row) => sum + toPercent(row.pestConfidence), 0)
  stats.avgConfidence = (confSum / rows.length).toFixed(1)

  stats.totalPestCount = rows.reduce((sum, row) => {
    return sum + Number(row.pestTotalCount || row.pestCount || 0)
  }, 0)
}

function handleSelectionChange(selection) {
  selectedIds.value = selection.map(row => row.pestId)
}

function handleDelete(row) {
  ElMessageBox.confirm(
    `确定要删除该条虫情识别结果吗？`,
    '删除确认',
    { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
  ).then(async () => {
    await delPest(row.pestId)
    ElMessage.success('删除成功')
    handleQuery()
  }).catch(() => {})
}

function handleBatchDelete() {
  if (!selectedIds.value.length) return

  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 条虫情识别结果吗？`,
    '批量删除确认',
    { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
  ).then(async () => {
    await delPest(selectedIds.value.join(','))
    ElMessage.success('批量删除成功')
    handleQuery()
  }).catch(() => {})
}

function handleViewDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}

function handleExportExcel() {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = [
    '序号',
    '图片名称',
    '虫害类别',
    '作物类型',
    '置信度(%)',
    '当前数量',
    '总数量',
    '预警等级',
    '识别结论',
    '防治建议',
    '识别记录编号',
    '识别方式'
  ]

  const rows = tableData.value.map((r, i) => [
    tableData.value.length - i,
    r.imageName,
    r.pestName,
    r.pestCrop,
    toPercent(r.pestConfidence),
    r.pestCount,
    r.pestTotalCount,
    r.warningLevel,
    r.pestResult,
    r.pestAdvice,
    r.recordNo,
    r.recordMode
  ])

  const html = buildExcelHtml(headers, rows)
  downloadBlob(html, `虫情识别结果_${Date.now()}.xls`, 'application/vnd.ms-excel;charset=utf-8;')
  ElMessage.success(`成功导出 ${rows.length} 条记录`)
}

function handleExportCsv() {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = [
    '序号',
    '图片名称',
    '虫害类别',
    '作物类型',
    '置信度(%)',
    '当前数量',
    '总数量',
    '预警等级',
    '识别结论',
    '防治建议',
    '识别记录编号',
    '识别方式'
  ]

  const rows = tableData.value.map((r, i) => [
    tableData.value.length - i,
    r.imageName,
    r.pestName,
    r.pestCrop,
    toPercent(r.pestConfidence),
    r.pestCount,
    r.pestTotalCount,
    r.warningLevel,
    r.pestResult,
    r.pestAdvice,
    r.recordNo,
    r.recordMode
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell ?? ''}"`).join(','))
    .join('\n')

  downloadBlob('\uFEFF' + csv, `虫情识别结果_${Date.now()}.csv`, 'text/csv;charset=utf-8;')
  ElMessage.success(`成功导出 ${rows.length} 条记录`)
}

function buildExcelHtml(headers, rows) {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head>
    <body><table border="1">
    <tr>${headers.map(h => `<th style="background:#3a7d3a;color:#fff;font-weight:bold;">${h}</th>`).join('')}</tr>
    ${rows.map(row => `<tr>${row.map(c => `<td style="mso-number-format:'\\@';">${c ?? ''}</td>`).join('')}</tr>`).join('')}
    </table></body></html>`
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toPercent(value) {
  const num = Number(value || 0)
  if (num <= 1) return Math.round(num * 100)
  return Math.round(num)
}

function getConfColor(val) {
  if (val >= 90) return '#f56c6c'
  if (val >= 80) return '#e6a23c'
  return '#67c23a'
}

function getWarningTag(level) {
  if (!level || level === '无') return 'success'
  if (level === '低') return 'info'
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
</script>

<style scoped>
/* ---- 容器 ---- */
.history-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---- 返回按钮栏 ---- */
.back-bar {
  margin-bottom: 4px;
}
.back-bar .el-button {
  background: #3a7d3a;
  border-color: #3a7d3a;
}

/* ---- Banner ---- */
.top-banner {
  background: linear-gradient(135deg, #3a7d3a 0%, #52b052 60%, #85d485 100%);
  border-radius: 12px;
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
}
.banner-tag {
  background: rgba(255,255,255,.25);
  border-color: rgba(255,255,255,.4);
  color: #fff;
  font-size: 12px;
  margin-bottom: 10px;
}
.banner-title { font-size: 28px; font-weight: bold; margin: 6px 0 8px; }
.banner-desc  { font-size: 13px; opacity: .85; }
.total-card {
  background: rgba(255,255,255,.2);
  border-radius: 10px;
  padding: 18px 36px;
  text-align: center;
  backdrop-filter: blur(4px);
}
.total-label { font-size: 13px; opacity: .85; }
.total-num   { font-size: 42px; font-weight: bold; line-height: 1.2; }
.total-sub   { font-size: 12px; opacity: .7; margin-top: 4px; }

/* ---- 搜索栏 ---- */
.search-bar { display: flex; gap: 12px; }
.search-input { flex: 1; }
.refresh-btn {
  background: #3a7d3a;
  border-color: #3a7d3a;
  min-width: 100px;
}

/* ---- 统计卡片 ---- */
.stats-row { margin: 0; }
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  border: 1px solid #e8f4e8;
}
.stat-label { font-size: 13px; color: #606266; margin-bottom: 8px; }
.stat-value { font-size: 32px; font-weight: bold; color: #303133; }

/* ---- 表格区域 ---- */
.table-section {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #ebeef5;
  padding-bottom: 16px;
  flex: 1;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f2f6fc;
}
.table-title-group { display: flex; flex-direction: column; gap: 3px; }
.table-title    { font-size: 16px; font-weight: bold; color: #303133; }
.table-subtitle { font-size: 12px; color: #909399; }
.table-actions  { display: flex; gap: 8px; }

.history-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #3a7d3a;
}

.row-thumbnail {
  width: 52px;
  height: 52px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  object-fit: cover;
}
.no-img { font-size: 12px; color: #c0c4cc; }

.confidence-cell { display: flex; align-items: center; }

/* ---- 分页 ---- */
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 0;
}

/* ---- 详情弹窗 ---- */
.detail-dialog { display: flex; flex-direction: column; gap: 16px; }
.detail-image-wrap {
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-desc { margin-top: 4px; }
</style>
