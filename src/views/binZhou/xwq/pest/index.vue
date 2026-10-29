<template>
  <div class="pest-result-container">
    <!-- <div class="back-bar">
      <el-button type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回虫情识别
      </el-button>
    </div> -->

    <!-- <div class="top-banner">
      <div>
        <el-tag effect="dark" class="banner-tag">智慧农业 · 虫情识别结果</el-tag>
        <h2 class="banner-title">虫情识别结果中心</h2>
        <p class="banner-desc">查看虫情识别结果、虫体数量、可信度、防治建议与预警等级。</p>
      </div>

      <div class="total-card">
        <div class="total-label">总记录数</div>
        <div class="total-num">{{ total }}</div>
      </div>
    </div> -->

    <el-card shadow="hover" class="query-card">
      <el-form :model="queryParams" :inline="true">
        <el-form-item label="虫害类别">
          <el-input
            v-model="queryParams.pestName"
            placeholder="请输入虫害类别"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="作物类型">
          <el-input
            v-model="queryParams.pestCrop"
            placeholder="如：冬枣"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="预警等级">
          <el-input
            v-model="queryParams.warningLevel"
            placeholder="如：无、低、中、高"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          <el-button type="success" plain icon="Download" @click="exportToExcel">导出Excel</el-button>
          <el-button
            class="trend-icon-button"
            :icon="trendExpanded ? 'ArrowUp' : 'ArrowDown'"
            circle
            title="展开/收起虫情趋势"
            @click="trendExpanded = !trendExpanded"
          />
        </el-form-item>
      </el-form>

      <div class="trend-panel" :class="{ collapsed: !trendExpanded }">
        <div class="trend-panel-inner">
          <div class="trend-header">
            <div>
              <h3>虫情趋势</h3>
              <p>点击列表中的虫害类别可高亮对应曲线，点击图例可显示/隐藏曲线</p>
            </div>
            <span>单位：头</span>
          </div>

          <div v-if="trendLines.length" class="chart-toolbar">
            <div class="legend-line">
              <span
                v-for="item in trendLines"
                :key="item.name"
                :class="{
                  disabled: isTrendDisabled(item.name),
                  active: selectedTrendName === item.name
                }"
                @click.stop="toggleTrendLine(item.name)"
              >
                <i :style="{ background: item.color }"></i>{{ item.name }}
              </span>
            </div>
          </div>

          <div v-if="trendLines.length" class="chart-wrap">
            <div class="y-axis">
              <span>{{ trendMax }}</span>
              <span>{{ Math.round(trendMax * 0.8) }}</span>
              <span>{{ Math.round(trendMax * 0.6) }}</span>
              <span>{{ Math.round(trendMax * 0.4) }}</span>
              <span>{{ Math.round(trendMax * 0.2) }}</span>
              <span>0</span>
            </div>

            <div class="line-chart">
              <svg viewBox="0 0 900 260" preserveAspectRatio="none">
                <path
                  v-for="line in trendLines"
                  v-show="!isTrendDisabled(line.name)"
                  :key="line.name"
                  :d="line.path"
                  fill="none"
                  :stroke="line.color"
                  :stroke-width="getTrendLineWidth(line)"
                  :class="getTrendLineClass(line)"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="x-axis">
                <span v-for="d in dateLabels" :key="d">{{ d }}</span>
              </div>
            </div>
          </div>

          <el-empty v-else description="暂无虫情趋势数据" :image-size="90" />
        </div>
      </div>
    </el-card>

    <el-card shadow="hover" class="table-card">
            <el-table
        ref="pestTableRef"
        v-loading="loading"
        :data="pestList"
        :row-key="getPestRowKey"
        :expand-row-keys="expandedRowKeys"
        border
        stripe
        style="width: 100%"
        class="pest-result-table"
        @row-click="handleRowClick"
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand" width="48">
                    <template #default="{ row }">
            <div
              class="inline-detail"
              :class="{
                'is-opening': openingRowKeys.includes(getPestRowKey(row)),
                'is-closing': closingRowKeys.includes(getPestRowKey(row))
              }"
            >
              <div class="inline-detail-card">
                <div class="inline-detail-image">
                                    <el-image
                    v-if="getPestResultImage(row)"
                    :src="getPestResultImage(row)"
                    :preview-src-list="[getPestResultImage(row)]"
                    fit="contain"
                    preview-teleported
                    @click.stop
                  />
                  <el-empty v-else description="无图片" :image-size="70" />
                </div>

                <div class="inline-detail-content">
                  <div class="detail-head">
                    <div>
                      <div class="detail-title">{{ row.pestName || '未知虫害' }}</div>
                      <div class="detail-subtitle">
                        {{ row.recordNo || '暂无记录编号' }} · {{ row.recordMode || '未知方式' }}
                      </div>
                    </div>
                    <el-tag :type="getWarningTag(row.warningLevel)" effect="plain" size="large">
                      {{ row.warningLevel || '无预警' }}
                    </el-tag>
                  </div>

                  <div class="metric-grid">
                    <div class="metric-item">
                      <span>作物类型</span>
                      <strong>{{ row.pestCrop || '-' }}</strong>
                    </div>
                    <div class="metric-item">
                      <span>可信度</span>
                      <strong>{{ toPercent(row.pestConfidence) }}%</strong>
                    </div>
                    <div class="metric-item">
                      <span>当前数量</span>
                      <strong>{{ row.pestCount ?? '-' }}</strong>
                    </div>
                    <div class="metric-item">
                      <span>总数量</span>
                      <strong>{{ row.pestTotalCount ?? '-' }}</strong>
                    </div>
                  </div>

                  <div class="detail-text-grid">
                    <div class="detail-text-card">
                      <span>识别结论</span>
                      <p>{{ row.pestResult || '暂无识别结论' }}</p>
                    </div>
                    <div class="detail-text-card advice">
                      <span>防治建议</span>
                      <p>{{ row.pestAdvice || '暂无防治建议' }}</p>
                    </div>
                  </div>

                  <div class="detail-foot">
                    <span>图片ID：{{ row.imageId || '-' }}</span>
                    <span>检测框：{{ row.bboxJson || '暂无' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="序号" width="70" align="center">
          <template #default="{ $index }">
            {{ total - (queryParams.pageNum - 1) * queryParams.pageSize - $index }}
          </template>
        </el-table-column>

        <el-table-column label="图片" width="95" align="center">
          <template #default="{ row }">
            <el-image
              v-if="getPestResultImage(row)"
              :src="getPestResultImage(row)"
              :preview-src-list="[getPestResultImage(row)]"
              fit="cover"
              class="row-thumbnail"
              preview-teleported
              @click.stop
            />
            <span v-else class="no-img">暂无</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="pestName" label="虫害类别" width="130" align="center">
          <template #default="{ row }">
                        <el-tag type="danger" effect="plain" @click.stop="selectTrendByName(row.pestName || '未知虫害')">
              {{ row.pestName || '未知虫害' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="pestCrop" label="作物" width="100" align="center" />

        <el-table-column prop="pestConfidence" label="可信度" width="150" align="center">
          <template #default="{ row }">
            <div class="confidence-cell">
              <el-progress
                :percentage="toPercent(row.pestConfidence)"
                :stroke-width="8"
                :show-text="false"
                style="width: 78px; display:inline-block; margin-right:8px"
              />
              <span class="confidence-text">{{ toPercent(row.pestConfidence) }}%</span>
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

        <el-table-column prop="pestResult" label="识别结论" min-width="260" show-overflow-tooltip />
        <el-table-column prop="pestAdvice" label="防治建议" min-width="320" show-overflow-tooltip />

        <el-table-column prop="recordNo" label="识别记录编号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="recordMode" label="识别方式" width="110" align="center" />

        <el-table-column label="操作" width="190" align="center" fixed="right">
          <template #default="{ row }">
            <!-- <el-button link type="primary" @click.stop="handleView(row)">详情</el-button> -->
            <el-button link type="primary" @click.stop="handleUpdate(row)">修改</el-button>
            <el-button link type="danger" @click.stop="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="editVisible" title="修改虫情识别结果" width="760px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="结果图地址">
              <el-input v-model="editForm.pestResultImgUrl" placeholder="上传结果图后自动填充" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="虫害类别">
              <el-input v-model="editForm.pestName" placeholder="请输入虫害类别" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="作物类型">
              <el-input v-model="editForm.pestCrop" placeholder="请输入作物类型" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="当前数量">
              <el-input-number v-model="editForm.pestCount" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="总数量">
              <el-input-number v-model="editForm.pestTotalCount" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>

                    <el-col :span="12">
            <el-form-item label="可信度">
              <el-input v-model="editForm.pestConfidence" placeholder="如：0.95 或 95" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="预警等级">
              <el-select v-model="editForm.warningLevel" placeholder="请选择预警等级" clearable style="width: 100%">
                <el-option label="无" value="无" />
                <el-option label="低" value="低" />
                <el-option label="中" value="中" />
                <el-option label="高" value="高" />
              </el-select>
            </el-form-item>
          </el-col>

                      <el-col :span="24">
            <el-form-item label="替换结果图">
              <image-upload
                v-model="editForm.pestResultImgUrl"
                :limit="1"
                :file-size="8"
                @update:model-value="handleResultImageChange"
              />
              <div class="upload-tip">上传新结果图后会自动填充结果图地址；不上传则保留原结果图。</div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="识别结论">
              <el-input v-model="editForm.pestResult" type="textarea" :rows="3" placeholder="请输入识别结论" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="防治建议">
              <el-input v-model="editForm.pestAdvice" type="textarea" :rows="3" placeholder="请输入防治建议" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="editVisible = false">取 消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEdit">确 定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="虫情识别详情" width="720px" destroy-on-close>
      <div v-if="detailRow" class="detail-dialog">
        <div class="detail-image-wrap">
                    <el-image
            v-if="getPestResultImage(detailRow)"
            :src="getPestResultImage(detailRow)"
            :preview-src-list="[getPestResultImage(detailRow)]"
            fit="contain"
            style="width:100%; max-height:300px; border-radius:6px; background:#1e1e1e"
            preview-teleported
          />
          <el-empty v-else description="无图片" :image-size="80" />
        </div>

                <el-descriptions :column="2" border>
          <el-descriptions-item label="虫害类别">
            {{ detailRow.pestName }}
          </el-descriptions-item>
                    <el-descriptions-item label="作物类型">
            {{ detailRow.pestCrop }}
          </el-descriptions-item>
          <el-descriptions-item label="可信度">
            {{ toPercent(detailRow.pestConfidence) }}%
          </el-descriptions-item>
          <el-descriptions-item label="虫体数量">
            {{ detailRow.pestCount }} / 总数 {{ detailRow.pestTotalCount }}
          </el-descriptions-item>
          <el-descriptions-item label="预警等级">
            {{ detailRow.warningLevel || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="识别方式">
            {{ detailRow.recordMode || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="识别结论" :span="2">
            {{ detailRow.pestResult }}
          </el-descriptions-item>
          <el-descriptions-item label="防治建议" :span="2">
            {{ detailRow.pestAdvice }}
          </el-descriptions-item>
          <el-descriptions-item label="检测框信息" :span="2">
            {{ detailRow.bboxJson || '暂无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { listPest, getPest, updatePest, delPest } from '@/api/binZhou/xwq/pest'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const pestList = ref([])
const trendRows = ref([])
const trendExpanded = ref(false)
const selectedTrendName = ref('')
const disabledTrendNames = ref([])
const pestTableRef = ref(null)
const expandedRowKeys = ref([])
const openingRowKeys = ref([])
const closingRowKeys = ref([])
const closeTimers = new Map()
const detailVisible = ref(false)
const detailRow = ref(null)
const editVisible = ref(false)
const editSubmitting = ref(false)
const editForm = ref({})

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  pestName: '',
  pestCrop: '',
  warningLevel: ''
})

const chartColors = ['#12b886', '#3267d6', '#21a7f3', '#d946ef', '#f5c400', '#f08c00']

const pestTrendItems = computed(() => {
  const map = new Map()

  trendRows.value.forEach(row => {
    const name = row.pestName || '未知虫害'
    const count = Number(row.pestTotalCount || row.pestCount || 0)
    map.set(name, (map.get(name) || 0) + count)
  })

  return Array.from(map.entries())
    .map(([name, count], index) => ({ name, count, color: chartColors[index % chartColors.length] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const dateLabels = computed(() => buildDateLabels())

const trendLines = computed(() => {
  return pestTrendItems.value.map((item, index) => {
    const values = buildTrendForPest(item.name)
    return {
      name: item.name,
      color: item.color,
      values,
      width: index === 0 ? 4 : 2.5,
      path: buildSmoothPath(values, 900, 260, Math.max(10, Math.max(...values)))
    }
  })
})

const trendMax = computed(() => {
  const values = trendLines.value.flatMap(line => line.values)
  return Math.max(10, Math.ceil(Math.max(...values, 10) / 10) * 10)
})

onMounted(() => {
  getList()
})

const goBack = () => {
  router.push('/xwq/featurePest')
}

const getList = async () => {
  loading.value = true
  try {
    const trendParams = {
      pageNum: 1,
      pageSize: 1000,
      pestName: queryParams.pestName || undefined,
      pestCrop: queryParams.pestCrop || undefined,
      warningLevel: queryParams.warningLevel || undefined
    }
    const [res, trendRes] = await Promise.all([
      listPest(queryParams),
      listPest(trendParams)
    ])
    pestList.value = res.rows || []
    trendRows.value = trendRes.rows || []
    total.value = res.total || 0
    expandedRowKeys.value = []
    openingRowKeys.value = []
    closingRowKeys.value = []
    closeTimers.forEach(timer => clearTimeout(timer))
    closeTimers.clear()
    selectedTrendName.value = ''
    disabledTrendNames.value = disabledTrendNames.value.filter(name => pestTrendItems.value.some(item => item.name === name))
  } finally {
    loading.value = false
  }
}


const handleQuery = () => {
  queryParams.pageNum = 1
  getList()
}

const resetQuery = () => {
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  queryParams.pestName = ''
  queryParams.pestCrop = ''
  queryParams.warningLevel = ''
  getList()
}

const handleView = (row) => {
  toggleRowExpansion(row)
}

const getPestRowKey = (row) => String(row.pestId || row.recordNo || row.imageId || '')

const handleRowClick = (row) => {
  toggleRowExpansion(row)
}

const handleExpandChange = (row, expandedRows) => {
  const key = getPestRowKey(row)
  if (closingRowKeys.value.includes(key)) return
  expandedRowKeys.value = expandedRows.map(item => getPestRowKey(item)).filter(Boolean)
}

const toggleRowExpansion = (row) => {
  const key = getPestRowKey(row)
  if (!key || closingRowKeys.value.includes(key)) return

  detailRow.value = row
  const expanded = expandedRowKeys.value.includes(key)

    if (!expanded) {
    openingRowKeys.value = [...openingRowKeys.value, key]
    pestTableRef.value?.toggleRowExpansion(row, true)
    expandedRowKeys.value = [...expandedRowKeys.value, key]
    nextTick(() => {
      requestAnimationFrame(() => {
        openingRowKeys.value = openingRowKeys.value.filter(item => item !== key)
      })
    })
    return
  }

  closingRowKeys.value = [...closingRowKeys.value, key]
  const timer = setTimeout(() => {
    pestTableRef.value?.toggleRowExpansion(row, false)
    expandedRowKeys.value = expandedRowKeys.value.filter(item => item !== key)
    closingRowKeys.value = closingRowKeys.value.filter(item => item !== key)
    closeTimers.delete(key)
  }, 620)

  closeTimers.set(key, timer)
}



const selectTrendByName = (name) => {
  if (!name) return
  selectedTrendName.value = selectedTrendName.value === name ? '' : name
  disabledTrendNames.value = disabledTrendNames.value.filter(item => item !== name)
}

const toggleTrendLine = (name) => {
  disabledTrendNames.value = isTrendDisabled(name)
    ? disabledTrendNames.value.filter(item => item !== name)
    : [...disabledTrendNames.value, name]

  if (disabledTrendNames.value.includes(name) && selectedTrendName.value === name) {
    selectedTrendName.value = ''
  }
}

const isTrendDisabled = (name) => disabledTrendNames.value.includes(name)

const getTrendLineWidth = (line) => {
  if (!selectedTrendName.value) return line.width
  return selectedTrendName.value === line.name ? 5 : 2
}

const getTrendLineClass = (line) => {
  if (!selectedTrendName.value) return ''
  return selectedTrendName.value === line.name ? 'is-highlight' : 'is-muted'
}

const handleUpdate = async (row) => {
  try {
        const res = await getPest(row.pestId)
    editForm.value = normalizeEditForm(res.data || { ...row })
    editVisible.value = true
  } catch (error) {
        console.error(error)
    editForm.value = normalizeEditForm({ ...row })
    editVisible.value = true
  }
}

const normalizeEditForm = (row) => {
  const resultImgUrl = row.pestResultImgUrl || row.imageUrl || ''
  return {
    ...row,
    pestResultImgUrl: resultImgUrl,
    imageUrl: row.imageUrl || resultImgUrl
  }
}

const handleResultImageChange = (url) => {
  editForm.value.pestResultImgUrl = url
  editForm.value.imageUrl = url
}

const submitEdit = async () => {
  editSubmitting.value = true
  try {
    if (editForm.value.pestResultImgUrl) {
      editForm.value.imageUrl = editForm.value.pestResultImgUrl
    }
    await updatePest(editForm.value)
    ElMessage.success('修改成功')
    editVisible.value = false
    getList()
  } finally {
    editSubmitting.value = false
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该条虫情识别结果吗？', '删除确认', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(async () => {
    await delPest(row.pestId)
    ElMessage.success('删除成功')
    getList()
  }).catch(() => {})
}

const exportToExcel = () => {
  if (pestList.value.length === 0) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = [
    '序号',
    '虫害类别',
    '作物类型',
    '可信度(%)',
    '当前数量',
    '总数量',
    '预警等级',
    '识别结论',
    '防治建议'
  ]

  const rows = pestList.value.map((r, i) => [
        i + 1,
    r.pestName,
    r.pestCrop,
    toPercent(r.pestConfidence),
    r.pestCount,
    r.pestTotalCount,
    r.warningLevel,
    r.pestResult,
    r.pestAdvice
  ])

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"></head>
    <body><table border="1">
    <tr>${headers.map(h => `<th style="background:#3a7d3a;color:#fff;font-weight:bold;">${h}</th>`).join('')}</tr>
    ${rows.map(row => `<tr>${row.map(c => `<td style="mso-number-format:'\\@';">${c ?? ''}</td>`).join('')}</tr>`).join('')}
    </table></body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `虫情识别结果_${Date.now()}.xls`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

const toPercent = (value) => {
  const num = Number(value || 0)
  if (num <= 1) return Math.round(num * 100)
  return Math.round(num)
}

const getWarningTag = (level) => {
  if (!level || level === '无') return 'success'
  if (level === '低') return 'info'
  if (level === '中') return 'warning'
  if (level === '高') return 'danger'
  return 'info'
}

const buildDateLabels = () => {
  const labels = Array.from(new Set(trendRows.value
    .map(row => getRowTime(row))
    .filter(Boolean)
    .sort((a, b) => a - b)
    .map(time => formatDate(new Date(time)))))

  return labels.slice(-10)
}

const buildTrendForPest = (name) => {
  const labels = dateLabels.value
  const buckets = new Array(labels.length).fill(0)

  trendRows.value
    .filter(row => (row.pestName || '未知虫害') === name)
    .forEach(row => {
      const time = getRowTime(row)
      if (!time) return

      const date = formatDate(new Date(time))
      const bucketIndex = labels.findIndex(label => label === date)
      if (bucketIndex >= 0) {
        buckets[bucketIndex] += Number(row.pestTotalCount || row.pestCount || 0)
      }
    })

  return buckets
}

const buildSmoothPath = (values, width = 900, height = 260, max = 1000) => {
  if (!values.length) return ''

  const step = values.length === 1 ? width : width / (values.length - 1)
  const safeMax = Math.max(1, max)
  const points = values.map((value, index) => {
    const x = Math.round(index * step)
    const y = Math.round(height - Number(value || 0) / safeMax * (height - 24) - 10)
    return { x, y: Math.max(8, Math.min(height - 8, y)) }
  })

  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return d
}

const getRowTime = (row) => {
  const value = row.pestA || row.recognizeTime || row.createTime || row.updateTime || row.recordTime
  if (!value) return null

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

const formatDate = (date) => {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

const getPestResultImage = (row) => {
  return normalizeImageUrl(row?.pestResultImgUrl || row?.imageResultUrl || row?.resultImgUrl || row?.imageUrl)
}

const normalizeImageUrl = (url) => {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url

  return `${baseApi}/${url}`
}
</script>

<style scoped>
.pest-result-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.back-bar {
  margin-bottom: 4px;
}

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
  margin-bottom: 10px;
}

.banner-title {
  font-size: 28px;
  font-weight: bold;
  margin: 6px 0 8px;
}

.banner-desc {
  font-size: 13px;
  opacity: .85;
}

.total-card {
  background: rgba(255,255,255,.2);
  border-radius: 10px;
  padding: 18px 36px;
  text-align: center;
}

.total-label {
  font-size: 13px;
  opacity: .85;
}

.total-num {
  font-size: 42px;
  font-weight: bold;
  line-height: 1.2;
}

.query-card,
.table-card {
  border-radius: 10px;
}

.trend-icon-button {
  margin-left: 8px;
  transition: transform .24s ease, background-color .18s ease, border-color .18s ease;
}

.trend-icon-button:hover {
  transform: translateY(-1px);
}

.trend-panel {
  max-height: 390px;
  overflow: hidden;
  transition: max-height .38s ease, opacity .28s ease, margin-top .38s ease;
  opacity: 1;
  margin-top: 12px;
}

.trend-panel.collapsed {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

.trend-panel-inner {
  padding: 14px 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fff;
}

.trend-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.trend-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  line-height: 1.4;
}

.trend-header p {
  margin: 4px 0 0;
  color: #909399;
  font-size: 12px;
}

.trend-header > span {
  color: #909399;
  font-size: 12px;
}

.chart-toolbar {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.legend-line {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #606266;
  font-size: 12px;
}

.legend-line span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: color .18s ease, opacity .18s ease;
}

.legend-line span.disabled {
  opacity: .35;
}

.legend-line span.active {
  color: #2f6f3e;
  font-weight: 700;
}

.legend-line i {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
}

.chart-wrap {
  display: flex;
  height: 260px;
  padding-top: 6px;
}

.y-axis {
  width: 46px;
  padding-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #899691;
  font-size: 11px;
  text-align: right;
}

.line-chart {
  flex: 1;
  min-width: 0;
  border-radius: 8px;
  background-image:
    linear-gradient(#e7edeb 1px, transparent 1px),
    linear-gradient(90deg, #edf2f0 1px, transparent 1px);
  background-size: 100% 43px, 90px 100%;
}

.line-chart svg {
  width: 100%;
  height: 226px;
  display: block;
}

.line-chart svg path {
  transition: opacity .2s ease, stroke-width .2s ease, filter .2s ease;
}

.line-chart svg path.is-muted {
  opacity: .22;
}

.line-chart svg path.is-highlight {
  opacity: 1;
  filter: drop-shadow(0 3px 4px rgba(47, 111, 62, .28));
}

.x-axis {
  display: flex;
  justify-content: space-between;
  color: #84928c;
  font-size: 11px;
  overflow: hidden;
}

.x-axis span {
  white-space: nowrap;
}

.row-thumbnail {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  object-fit: cover;
}

.no-img {
  font-size: 12px;
  color: #c0c4cc;
}

.confidence-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.confidence-text {
  font-weight: bold;
}

.pest-result-table :deep(.el-table__row) {
  cursor: pointer;
}

.pest-result-table :deep(.el-table__expand-icon) {
  pointer-events: none;
  transition: transform .3s cubic-bezier(.22, 1, .36, 1);
}

.pest-result-table :deep(.el-table__expanded-cell) {
  background: #f8fbf8;
  padding: 0;
  overflow: hidden;
}

.inline-detail {
  max-height: 620px;
  padding: 14px 18px 16px;
  opacity: 1;
  overflow: hidden;
  transform: translateY(0);
  transition:
    max-height .62s cubic-bezier(.25, .8, .25, 1),
    padding .62s cubic-bezier(.25, .8, .25, 1),
    opacity .46s ease,
    transform .62s cubic-bezier(.25, .8, .25, 1);
  will-change: max-height, padding, opacity, transform;
}

.inline-detail.is-opening,
.inline-detail.is-closing {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.inline-detail-card {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fff;
  color: #303133;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.inline-detail-image {
  min-height: 176px;
  border-radius: 8px;
  background: #1e1e1e;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.inline-detail-image .el-image {
  width: 100%;
  height: 100%;
  min-height: 176px;
}

.inline-detail-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.detail-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-subtitle {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.metric-item,
.detail-text-card,
.detail-foot span {
  border: 1px solid #ebeef5;
  background: #f8f9fa;
}

.metric-item {
  padding: 9px 10px;
  border-radius: 8px;
}

.metric-item span,
.detail-text-card span {
  display: block;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.metric-item strong {
  display: block;
  margin-top: 6px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-text-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.detail-text-card {
  min-height: 74px;
  padding: 10px 11px;
  border-radius: 8px;
}

.detail-text-card.advice {
  background: #f5faf5;
}

.detail-text-card p {
  margin: 7px 0 0;
  color: #303133;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.detail-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.detail-foot span {
  padding: 4px 8px;
  border-radius: 6px;
}


@media screen and (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-text-grid {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 900px) {
  .inline-detail-card {
    grid-template-columns: 1fr;
  }
}

.upload-tip {
  width: 100%;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.component-upload-image .el-upload--picture-card),
:deep(.component-upload-image .el-upload-list--picture-card .el-upload-list__item) {
  width: 86px;
  height: 86px;
}

.detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-image-wrap {
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>