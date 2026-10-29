<template>
  <div class="phenology-page">
    <!-- 顶部 Banner -->
    <!-- <div class="page-hero">
      <div class="hero-left">
        <el-tag effect="dark" class="hero-tag">智慧农业 · 物候期识别</el-tag>
        <h2 class="hero-title">物候期识别结果管理</h2>
        <p class="hero-desc">
          汇总展示作物物候期识别结果、模型可信度、生长状态描述、下一阶段预测与农事建议。
        </p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat-card">
          <div class="stat-num">{{ total }}</div>
          <div class="stat-label">结果总数</div>
        </div>

        <div class="hero-stat-card">
          <div class="stat-num">{{ highConfidenceCount }}</div>
          <div class="stat-label">高可信度</div>
        </div>

        <div class="hero-stat-card">
          <div class="stat-num">{{ stageCount }}</div>
          <div class="stat-label">物候阶段数</div>
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
        <el-form-item label="物候期" prop="phenologyName">
          <el-input
            v-model="queryParams.phenologyName"
            placeholder="如：盛花期"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="作物类型" prop="phenologyCrop">
          <el-input
            v-model="queryParams.phenologyCrop"
            placeholder="如：冬枣"
            clearable
            style="width: 160px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <!-- <el-form-item label="下一阶段" prop="phenologyNextName">
          <el-input
            v-model="queryParams.phenologyNextName"
            placeholder="如：果实膨大期"
            clearable
            style="width: 180px"
            @keyup.enter="handleQuery"
          />
        </el-form-item> -->

        <el-form-item label="图片序号" prop="imageId">
          <el-input
            v-model="queryParams.imageId"
            placeholder="图片序号"
            clearable
            style="width: 140px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
                    <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          <el-button
            class="trend-icon-button"
            :icon="trendExpanded ? 'ArrowUp' : 'ArrowDown'"
            circle
            title="展开/收起物候期趋势"
            @click="trendExpanded = !trendExpanded"
          />
        </el-form-item>
      </el-form>

      <div class="trend-panel" :class="{ collapsed: !trendExpanded }">
        <div class="trend-panel-inner">
          <div class="trend-header">
            <div>
              <h3>物候期趋势</h3>
              <p>点击列表中的物候期可高亮对应曲线，点击图例可显示/隐藏曲线</p>
            </div>
            <span>单位：条</span>
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

          <el-empty v-else description="暂无物候期趋势数据" :image-size="90" />
        </div>
      </div>
    </el-card>

    <!-- 表格区 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <!-- <div>
            <span class="card-title">物候期识别结果列表</span>
            <span class="table-subtitle">展示当前物候期、生长状态、下一阶段和农事建议</span>
          </div> -->

          <div class="table-actions">
            <el-button
              type="primary"
              plain
              icon="Plus"
              @click="handleAdd"
              v-hasPermi="['xwq:phenology:add']"
            >
              新增
            </el-button>

            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['xwq:phenology:edit']"
            >
              修改
            </el-button>

            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['xwq:phenology:remove']"
            >
              删除
            </el-button>

            <el-button
              type="warning"
              plain
              icon="Download"
              @click="handleExport"
              v-hasPermi="['xwq:phenology:export']"
            >
              导出
            </el-button>
          </div>
        </div>
      </template>

            <el-table
        ref="phenologyTableRef"
        v-loading="loading"
        :data="phenologyList"
        :row-key="getPhenologyRowKey"
        :expand-row-keys="expandedRowKeys"
        border
        stripe
        class="agri-table"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        @expand-change="handleExpandChange"
      >
                <el-table-column type="selection" width="55" align="center" />

        <el-table-column type="expand" width="48">
          <template #default="{ row }">
            <div
              class="inline-detail"
              :class="{
                'is-opening': openingRowKeys.includes(getPhenologyRowKey(row)),
                'is-closing': closingRowKeys.includes(getPhenologyRowKey(row))
              }"
            >
              <div class="inline-detail-card">
                <div class="inline-detail-image">
                  <el-image
                    v-if="getPreviewImage(row)"
                    :src="getPreviewImage(row)"
                    :preview-src-list="[getPreviewImage(row)]"
                    fit="contain"
                    preview-teleported
                    @click.stop
                  />
                  <el-empty v-else description="无图片" :image-size="70" />
                </div>

                <div class="inline-detail-content">
                  <div class="detail-head-inline">
                    <div>
                      <div class="detail-title-inline">{{ row.phenologyName || '未知物候期' }}</div>
                      <div class="detail-subtitle-inline">
                        图片序号：{{ row.imageId || '-' }} · 记录序号：{{ row.recordId || '-' }}
                      </div>
                    </div>
                    <el-tag type="success" effect="plain" size="large">
                      {{ row.phenologyCrop || '小麦' }}
                    </el-tag>
                  </div>

                  <div class="metric-grid">
                    <div class="metric-item">
                      <span>作物类型</span>
                      <strong>{{ row.phenologyCrop || '-' }}</strong>
                    </div>
                    <div class="metric-item">
                      <span>可信度</span>
                      <strong>{{ toPercent(row.phenologyConfidence) }}%</strong>
                    </div>
                    <div class="metric-item">
                      <span>标准编码</span>
                      <strong>{{ row.phenologyCode || '-' }}</strong>
                    </div>
                    <div class="metric-item">
                      <span>下一阶段</span>
                      <strong>{{ row.phenologyNextName || '未预测' }}</strong>
                    </div>
                  </div>

                  <div class="detail-text-grid">
                    <div class="detail-text-card">
                      <span>识别结论</span>
                      <p>{{ row.phenologyResult || '暂无识别结论' }}</p>
                    </div>
                    <div class="detail-text-card advice">
                      <span>生长状态</span>
                      <p>{{ row.phenologyDesc || '暂无状态描述' }}</p>
                    </div>
                    <div class="detail-text-card advice wide">
                      <span>农事建议</span>
                      <p>{{ row.phenologyAdvice || '暂无农事建议' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

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
              @click.stop
            />
            <div v-else class="image-placeholder">无图</div>
          </template>
        </el-table-column>

        <el-table-column label="物候期信息" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="phenology-main">
              <div class="phenology-icon">物</div>
              <div class="phenology-info">
                <div class="phenology-name" @click.stop="selectTrendByName(row.phenologyName || '未知物候期')">{{ row.phenologyName || '未知物候期' }}</div>
                <div class="phenology-meta">
                  图片序号：{{ row.imageId || '-' }} ｜ 记录序号：{{ row.recordId || '-' }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="作物" prop="phenologyCrop" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">
              {{ row.phenologyCrop || '小麦' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="可信度" prop="phenologyConfidence" width="150" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="toPercent(row.phenologyConfidence)"
              :stroke-width="10"
              :color="confidenceColors"
            />
          </template>
        </el-table-column>

        <!-- <el-table-column label="下一阶段" prop="phenologyNextName" width="130" align="center">
          <template #default="{ row }">
            <el-tag type="warning" effect="plain">
              {{ row.phenologyNextName || '未预测' }}
            </el-tag>
          </template>
        </el-table-column> -->

        <el-table-column label="识别结论" prop="phenologyResult" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="desc-text">{{ row.phenologyResult || '暂无识别结论' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="生长状态" prop="phenologyDesc" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="desc-text">{{ row.phenologyDesc || '暂无状态描述' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="农事建议" prop="phenologyAdvice" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="advice-text">{{ row.phenologyAdvice || '暂无农事建议' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="210" align="center" fixed="right">
          <template #default="scope">
                        <el-button link type="primary" icon="View" @click.stop="handleView(scope.row)">
              查看
            </el-button>

            <el-button
              link
              type="primary"
              icon="Edit"
              @click.stop="handleUpdate(scope.row)"
              v-hasPermi="['xwq:phenology:edit']"
            >
              修改
            </el-button>

            <el-button
              link
              type="danger"
              icon="Delete"
              @click.stop="handleDelete(scope.row)"
              v-hasPermi="['xwq:phenology:remove']"
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

    <!-- 添加或修改物候期识别结果对话框 -->
    <el-dialog
      :title="title"
      v-model="open"
      width="820px"
      append-to-body
      destroy-on-close
      class="phenology-dialog"
    >
      <el-form ref="phenologyRef" :model="form" :rules="rules" label-width="110px">
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
            <el-form-item label="物候期名称" prop="phenologyName">
              <el-input v-model="form.phenologyName" placeholder="如：拔节期、抽穗期" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="标准编码" prop="phenologyCode">
              <el-input v-model="form.phenologyCode" placeholder="请输入物候期标准编码" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="作物类型" prop="phenologyCrop">
              <el-input v-model="form.phenologyCrop" placeholder="如：小麦" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
                        <el-form-item label="可信度" prop="phenologyConfidence">
              <el-input v-model="form.phenologyConfidence" placeholder="如：0.956" />
            </el-form-item>
          </el-col>

          <!-- <el-col :span="12">
            <el-form-item label="下一阶段" prop="phenologyNextName">
              <el-input v-model="form.phenologyNextName" placeholder="请输入下一生育阶段" />
            </el-form-item>
          </el-col> -->

          <el-col :span="24">
            <el-form-item label="替换图片" prop="phenologyResultImgUrl">
              <image-upload v-model="form.phenologyResultImgUrl" :limit="1" :file-size="8" />
              <div class="upload-tip">上传新图片后会替换当前结果图；不上传则保留原图片。</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="结果图地址" prop="phenologyResultImgUrl">
              <el-input v-model="form.phenologyResultImgUrl" placeholder="请输入结果图地址" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="识别结论" prop="phenologyResult">
              <el-input
                v-model="form.phenologyResult"
                type="textarea"
                :rows="3"
                placeholder="请输入物候期识别结论"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="生长状态" prop="phenologyDesc">
              <el-input
                v-model="form.phenologyDesc"
                type="textarea"
                :rows="3"
                placeholder="请输入当前作物生长状态描述"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="农事建议" prop="phenologyAdvice">
              <el-input
                v-model="form.phenologyAdvice"
                type="textarea"
                :rows="4"
                placeholder="请输入当前物候期对应的农事建议"
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
      title="物候期识别详情"
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
          <div v-else class="detail-image-placeholder">无图</div>

          <div class="detail-summary">
            <h3>{{ detailData.phenologyName || '未知物候期' }}</h3>
            <p>作物类型：{{ detailData.phenologyCrop || '冬枣' }}</p>
            <!-- <p>下一阶段：{{ detailData.phenologyNextName || '未预测' }}</p> -->
            <p>图片序号：{{ detailData.imageId || '-' }}</p>
            <p>记录序号：{{ detailData.recordId || '-' }}</p>
            <el-progress
              :percentage="toPercent(detailData.phenologyConfidence)"
              :stroke-width="12"
              :color="confidenceColors"
            />
          </div>
        </div>

        <el-descriptions :column="1" border class="detail-desc">
          <el-descriptions-item label="识别结论">
            {{ detailData.phenologyResult || '暂无识别结论' }}
          </el-descriptions-item>
          <el-descriptions-item label="生长状态">
            {{ detailData.phenologyDesc || '暂无状态描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="农事建议">
            {{ detailData.phenologyAdvice || '暂无农事建议' }}
          </el-descriptions-item>
          <el-descriptions-item label="结果图地址">
            {{ detailData.phenologyResultImgUrl || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="Phenology">
import { computed, getCurrentInstance, nextTick, reactive, ref, toRefs } from 'vue'
import { listPhenology, getPhenology, delPhenology, addPhenology, updatePhenology } from '@/api/binZhou/xwq/phenology'

const { proxy } = getCurrentInstance()

const phenologyList = ref([])
const trendRows = ref([])
const trendExpanded = ref(false)
const selectedTrendName = ref('')
const disabledTrendNames = ref([])
const phenologyTableRef = ref(null)
const expandedRowKeys = ref([])
const openingRowKeys = ref([])
const closingRowKeys = ref([])
const closeTimers = new Map()
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

const chartColors = ['#12b886', '#3267d6', '#21a7f3', '#d946ef', '#f5c400', '#f08c00']

const stageTrendItems = computed(() => {
  const map = new Map()

  trendRows.value.forEach(row => {
    const name = row.phenologyName || '未知物候期'
    map.set(name, (map.get(name) || 0) + 1)
  })

  return Array.from(map.entries())
    .map(([name, count], index) => ({ name, count, color: chartColors[index % chartColors.length] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

const dateLabels = computed(() => buildDateLabels())

const trendLines = computed(() => {
  return stageTrendItems.value.map((item, index) => {
    const values = buildTrendForStage(item.name)
    return {
      name: item.name,
      color: item.color,
      values,
      width: index === 0 ? 4 : 2.5,
      path: buildSmoothPath(values, 900, 260, Math.max(5, Math.max(...values)))
    }
  })
})

const trendMax = computed(() => {
  const values = trendLines.value.flatMap(line => line.values)
  return Math.max(5, Math.ceil(Math.max(...values, 5) / 5) * 5)
})

const highConfidenceCount = computed(() => {
  return phenologyList.value.filter(item => toPercent(item.phenologyConfidence) >= 85).length
})

const stageCount = computed(() => {
  const set = new Set()
  phenologyList.value.forEach(item => {
    if (item.phenologyName) set.add(item.phenologyName)
  })
  return set.size
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    recordId: undefined,
    imageId: undefined,
    phenologyName: undefined,
    phenologyCode: undefined,
    phenologyCrop: undefined,
    phenologyConfidence: undefined,
    phenologyResult: undefined,
    phenologyDesc: undefined,
    phenologyAdvice: undefined,
    phenologyNextName: undefined,
    phenologyResultImgUrl: undefined
  },
  rules: {
    recordId: [
      { required: true, message: '识别记录序号不能为空', trigger: 'blur' }
    ],
    imageId: [
      { required: true, message: '图片序号不能为空', trigger: 'blur' }
    ],
    phenologyName: [
      { required: true, message: '物候期名称不能为空', trigger: 'blur' }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  const trendParams = {
    ...queryParams.value,
    pageNum: 1,
    pageSize: 1000
  }

  Promise.all([
    listPhenology(queryParams.value),
    listPhenology(trendParams)
  ]).then(([response, trendResponse]) => {
    phenologyList.value = response.rows || []
    trendRows.value = trendResponse.rows || []
    total.value = response.total || 0
    expandedRowKeys.value = []
    openingRowKeys.value = []
    closingRowKeys.value = []
    closeTimers.forEach(timer => clearTimeout(timer))
    closeTimers.clear()
    selectedTrendName.value = ''
    disabledTrendNames.value = disabledTrendNames.value.filter(name => stageTrendItems.value.some(item => item.name === name))
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    phenologyId: null,
    recordId: null,
    imageId: null,
    phenologyName: null,
    phenologyCode: null,
    phenologyCrop: '小麦',
    phenologyConfidence: null,
    phenologyResult: null,
    phenologyDesc: null,
    phenologyAdvice: null,
    phenologyNextName: null,
    phenologyResultImgUrl: null,
    phenologyA: null,
    phenologyB: null,
    phenologyC: null,
    phenologyD: null,
    phenologyE: null,
    phenologyF: null,
    phenologyG: null,
    phenologyH: null,
    phenologyI: null,
    phenologyJ: null
  }
  proxy.resetForm('phenologyRef')
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
  ids.value = selection.map(item => item.phenologyId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function getPhenologyRowKey(row) {
  return String(row.phenologyId || row.recordId || row.imageId || '')
}

function handleRowClick(row, column) {
  if (column?.type === 'selection') return
  toggleRowExpansion(row)
}

function handleExpandChange(row, expandedRows) {
  const key = getPhenologyRowKey(row)
  if (closingRowKeys.value.includes(key)) return
  expandedRowKeys.value = expandedRows.map(item => getPhenologyRowKey(item)).filter(Boolean)
}

function toggleRowExpansion(row) {
  const key = getPhenologyRowKey(row)
  if (!key || closingRowKeys.value.includes(key)) return

  detailData.value = row
  const expanded = expandedRowKeys.value.includes(key)

  if (!expanded) {
    openingRowKeys.value = [...openingRowKeys.value, key]
    phenologyTableRef.value?.toggleRowExpansion(row, true)
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
    phenologyTableRef.value?.toggleRowExpansion(row, false)
    expandedRowKeys.value = expandedRowKeys.value.filter(item => item !== key)
    closingRowKeys.value = closingRowKeys.value.filter(item => item !== key)
    closeTimers.delete(key)
  }, 620)

  closeTimers.set(key, timer)
}

function selectTrendByName(name) {
  if (!name) return
  selectedTrendName.value = selectedTrendName.value === name ? '' : name
  disabledTrendNames.value = disabledTrendNames.value.filter(item => item !== name)
}

function toggleTrendLine(name) {
  disabledTrendNames.value = isTrendDisabled(name)
    ? disabledTrendNames.value.filter(item => item !== name)
    : [...disabledTrendNames.value, name]

  if (disabledTrendNames.value.includes(name) && selectedTrendName.value === name) {
    selectedTrendName.value = ''
  }
}

function isTrendDisabled(name) {
  return disabledTrendNames.value.includes(name)
}

function getTrendLineWidth(line) {
  if (!selectedTrendName.value) return line.width
  return selectedTrendName.value === line.name ? 5 : 2
}

function getTrendLineClass(line) {
  if (!selectedTrendName.value) return ''
  return selectedTrendName.value === line.name ? 'is-highlight' : 'is-muted'
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '新增物候期识别结果'
}

function handleUpdate(row) {
  reset()
  const _phenologyId = row.phenologyId || ids.value

  getPhenology(_phenologyId).then(response => {
    form.value = response.data || {}
    open.value = true
    title.value = '修改物候期识别结果'
  })
}

function handleView(row) {
  detailData.value = row
  detailOpen.value = true
}

function submitForm() {
  proxy.$refs.phenologyRef.validate(valid => {
    if (!valid) return

    if (form.value.phenologyId != null) {
      updatePhenology(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addPhenology(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

function handleDelete(row) {
  const _phenologyIds = row.phenologyId || ids.value

  proxy.$modal.confirm(`是否确认删除物候期识别结果编号为 "${_phenologyIds}" 的数据项？`).then(() => {
    return delPhenology(_phenologyIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('xwq/phenology/export', {
    ...queryParams.value
  }, `phenology_${new Date().getTime()}.xlsx`)
}

function toPercent(value) {
  const num = Number(value || 0)
  if (num <= 1) return Math.round(num * 100)
  return Math.round(num)
}

function getWarningTag(level) {
  if (!level || level === '无') return 'success'
  if (level === '低') return 'info'
  if (level === '中') return 'warning'
  if (level === '高') return 'danger'
  return 'info'
}

function buildDateLabels() {
  const labels = Array.from(new Set(trendRows.value
    .map(row => getRowTime(row))
    .filter(Boolean)
    .sort((a, b) => a - b)
    .map(time => formatDate(new Date(time)))))

  return labels.slice(-10)
}

function buildTrendForStage(name) {
  const labels = dateLabels.value
  const buckets = new Array(labels.length).fill(0)

  trendRows.value
    .filter(row => (row.phenologyName || '未知物候期') === name)
    .forEach(row => {
      const time = getRowTime(row)
      if (!time) return

      const date = formatDate(new Date(time))
      const bucketIndex = labels.findIndex(label => label === date)
      if (bucketIndex >= 0) buckets[bucketIndex] += 1
    })

  return buckets
}

function buildSmoothPath(values, width = 900, height = 260, max = 1000) {
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

function getRowTime(row) {
  const value = row.phenologyA || row.recognizeTime || row.createTime || row.updateTime || row.recordTime
  if (!value) return null

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function formatDate(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url

  return `${baseApi}/${url}`
}

function getPreviewImage(row) {
  return normalizeImageUrl(row.phenologyResultImgUrl || row.imageUrl)
}

getList()
</script>

<style scoped>
.phenology-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
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

.hero-stat-card {
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

.query-card,
.table-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
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

.agri-table :deep(.el-table__row) {
  cursor: pointer;
}

.agri-table :deep(.el-table__expand-icon) {
  pointer-events: none;
  transition: transform .3s cubic-bezier(.22, 1, .36, 1);
}

.agri-table :deep(.el-table__expanded-cell) {
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

.detail-head-inline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.detail-title-inline {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-subtitle-inline {
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
.detail-text-card {
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

.detail-text-card.wide {
  grid-column: 1 / -1;
}

.detail-text-card p {
  margin: 7px 0 0;
  color: #303133;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
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

.phenology-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.phenology-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0f9eb, #dff4d7);
  color: #67c23a;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.phenology-info {
  overflow: hidden;
}

.phenology-name {
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
  cursor: pointer;
}

.phenology-meta {
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

:deep(.phenology-dialog .el-dialog__header),
:deep(.detail-dialog .el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
  padding: 18px 22px;
}

:deep(.phenology-dialog .el-dialog__body) {
  padding: 22px 24px 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  width: 180px;
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

@media screen and (max-width: 1200px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .hero-stats {
    width: 100%;
  }

    .inline-detail-card {
    grid-template-columns: 1fr;
  }

  .metric-grid,
  .detail-text-grid {
    grid-template-columns: 1fr;
  }
}
</style>
