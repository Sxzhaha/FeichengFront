<template>
  <div class="phenology-page">
    <!-- 顶部：页面标题、作物与模型控制区 -->
    <section class="page-hero">
      <!-- <div class="hero-main">
        <div class="hero-icon">
          <el-icon><DataAnalysis /></el-icon>
        </div>
        <div>
          <h2>作物物候期智能识别</h2>
          <p>上传田间图像，选择对应作物与模型，完成单张或批量物候期分析。</p>
        </div>
      </div> -->

      <div class="hero-controls">
        <div class="control-item">
          <span class="control-label">作物类型</span>
          <el-select
            v-model="selectedCrop"
            class="control-select crop-select"
            placeholder="请选择作物"
            filterable
            :disabled="workspaceBusy"
          >
            <el-option
              v-for="dict in cropDictItems"
              :key="dict.value"
              :label="dict.label"
              :value="dict.value"
            />
          </el-select>
        </div>

        <div class="control-item">
          <span class="control-label">识别模型</span>
          <el-select
            v-model="selectedModelId"
            class="control-select model-select"
            placeholder="请选择物候期模型"
            filterable
            clearable
            :loading="isLoadingModels"
            :disabled="!selectedCrop || workspaceBusy || modelOptions.length === 0"
          >
            <el-option
              v-for="model in modelOptions"
              :key="model.modelId"
              :label="model.modelName"
              :value="model.modelId"
            >
              <div class="model-option">
                <span>{{ model.modelName }}</span>
                <small>{{ model.modelCode || '未设置编号' }}</small>
              </div>
            </el-option>
          </el-select>
        </div>

        <div class="hero-actions">
          <el-button
            type="primary"
            :icon="Upload"
            :disabled="!selectedCrop || workspaceBusy"
            @click="triggerFileInput"
          >
            上传图片
          </el-button>
          <el-button :icon="Clock" @click="goToHistory">识别记录</el-button>
        </div>
      </div>

      <div v-if="selectedCrop && !isLoadingModels && modelOptions.length === 0" class="model-warning">
        <el-icon><WarningFilled /></el-icon>
        当前作物暂无已启用的物候期模型，请先到模型管理中配置。
      </div>

      <input
        ref="fileInput"
        class="hidden-input"
        type="file"
        accept="image/*"
        multiple
        @change="handleFileChange"
      />
    </section>

    <!-- 识别概览 -->
    <!-- <section class="summary-grid">
      <div class="summary-card">
        <div class="summary-icon neutral"><el-icon><Files /></el-icon></div>
        <div>
          <span>当前任务</span>
          <strong>{{ fileList.length }}</strong>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon success"><el-icon><CircleCheck /></el-icon></div>
        <div>
          <span>识别成功</span>
          <strong>{{ completedCount }}</strong>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon warning"><el-icon><Loading /></el-icon></div>
        <div>
          <span>处理中</span>
          <strong>{{ runningCount }}</strong>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon danger"><el-icon><CircleClose /></el-icon></div>
        <div>
          <span>识别失败</span>
          <strong>{{ failedCount }}</strong>
        </div>
      </div>
    </section> -->

    <!-- 主工作区 -->
    <section class="workspace-grid">
      <!-- 左侧：图片任务队列 -->
      <el-card class="workspace-card task-panel" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <h3>图像任务队列</h3>
              <span>{{ selectedCrop ? `${getCropLabel(selectedCrop)}图像` : '请先选择作物' }}</span>
            </div>
            <div class="panel-header-actions">
              <el-tooltip content="刷新队列" placement="top">
                <el-button
                  circle
                  text
                  :icon="Refresh"
                  :loading="isLoadingImages"
                  :disabled="!selectedCrop || workspaceBusy"
                  @click="loadImageList"
                />
              </el-tooltip>
              <el-tooltip content="清空当前页面队列，不删除数据库记录" placement="top">
                <el-button
                  circle
                  text
                  type="danger"
                  :icon="Delete"
                  :disabled="fileList.length === 0 || workspaceBusy"
                  @click="clearTaskQueue"
                />
              </el-tooltip>
            </div>
          </div>
        </template>

        <div class="task-filter">
          <el-radio-group v-model="taskStatusFilter" size="small">
            <el-radio-button
              v-for="option in taskFilterOptions"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="task-list-wrapper" v-loading="isLoadingImages || isUploading">
          <el-scrollbar>
            <div v-if="!selectedCrop" class="empty-panel">
              <el-icon><Picture /></el-icon>
              <p>请先选择作物类型</p>
              <span>系统会自动加载该作物的物候期图像与模型</span>
            </div>

            <div v-else-if="filteredFileList.length === 0" class="empty-panel">
              <el-icon><Picture /></el-icon>
              <p>{{ fileList.length === 0 ? '暂无图像任务' : '当前筛选条件下暂无任务' }}</p>
              <span v-if="fileList.length === 0">点击“上传图片”创建识别任务</span>
            </div>

            <div v-else class="task-list">
              <article
                v-for="item in filteredFileList"
                :key="item.imageId"
                class="task-item"
                :class="{
                  active: currentImage?.imageId === item.imageId,
                  success: item.status === TASK_STATUS.SUCCESS,
                  failed: item.status === TASK_STATUS.FAILED
                }"
                @click="selectImageById(item.imageId)"
              >
                <el-image :src="item.url" fit="cover" class="task-thumb">
                  <template #error>
                    <div class="thumb-error"><el-icon><Picture /></el-icon></div>
                  </template>
                </el-image>

                <div class="task-info">
                  <div class="task-name" :title="item.name">{{ item.name }}</div>
                  <div class="task-meta">
                    <span>{{ getCropLabel(item.cropType || selectedCrop) }}</span>
                    <span>·</span>
                    <span>{{ item.imageSource || '未知来源' }}</span>
                  </div>
                  <div class="task-state-row">
                    <el-tag
                      size="small"
                      effect="light"
                      :type="getStatusTagType(item.status)"
                    >
                      {{ getStatusText(item.status) }}
                    </el-tag>
                    <span v-if="item.errorMessage" class="task-error" :title="item.errorMessage">
                      {{ item.errorMessage }}
                    </span>
                  </div>
                </div>

                <div class="task-item-actions">
                  <el-tooltip v-if="item.status === TASK_STATUS.FAILED" content="重新识别">
                    <el-button
                      text
                      circle
                      type="warning"
                      :icon="RefreshRight"
                      :disabled="workspaceBusy"
                      @click.stop="retryTask(item.imageId)"
                    />
                  </el-tooltip>
                  <el-tooltip content="从当前队列移除">
                    <el-button
                      text
                      circle
                      type="danger"
                      :icon="Close"
                      :disabled="workspaceBusy"
                      @click.stop="removeTask(item.imageId)"
                    />
                  </el-tooltip>
                </div>
              </article>
            </div>
          </el-scrollbar>
        </div>

        <div class="task-panel-footer">
          <el-button
            type="primary"
            :icon="DataAnalysis"
            :disabled="!canRecognizeCurrent"
            :loading="isDiagnosing"
            @click="runDiagnosis"
          >
            识别当前图片
          </el-button>
          <el-button
            type="success"
            plain
            :icon="Files"
            :disabled="!canBatchRecognize"
            :loading="isBatchDiagnosing"
            @click="runBatchDiagnosis"
          >
            批量识别
          </el-button>
        </div>
      </el-card>

      <!-- 中间：视觉终端 -->
      <el-card class="workspace-card viewer-panel" shadow="never">
        <template #header>
          <div class="panel-header viewer-header">
            <div>
              <h3>视觉识别终端</h3>
              <span>{{ currentImage?.name || '尚未选择图像' }}</span>
            </div>

            <div class="viewer-toolbar">
              <el-radio-group v-model="previewMode" size="small">
                <el-radio-button label="original">原始图像</el-radio-button>
                <el-radio-button label="result" :disabled="!hasResultImage">识别结果</el-radio-button>
              </el-radio-group>
              <el-tooltip content="全屏预览">
                <el-button
                  circle
                  text
                  :icon="FullScreen"
                  :disabled="!displayImageUrl"
                  @click="openImageViewer(displayImageUrl)"
                />
              </el-tooltip>
            </div>
          </div>
        </template>

        <div
          class="viewer-body"
          v-loading="workspaceBusy"
          :element-loading-text="loadingText"
          element-loading-background="rgba(247, 250, 248, 0.88)"
        >
          <div v-if="currentImage && displayImageUrl" class="image-stage">
            <el-image
              :src="displayImageUrl"
              fit="contain"
              class="stage-image"
              :preview-src-list="[displayImageUrl]"
              preview-teleported
            >
              <template #error>
                <div class="stage-error">
                  <el-icon><Picture /></el-icon>
                  <span>图像加载失败，请检查图片访问地址</span>
                </div>
              </template>
            </el-image>

            <div v-if="currentImage.status === TASK_STATUS.RUNNING" class="scan-line"></div>

            <div class="image-status-bar">
              <div>
                <span class="status-dot" :class="statusClass(currentImage.status)"></span>
                {{ getStatusText(currentImage.status) }}
              </div>
              <span>{{ previewMode === 'result' ? 'AI 识别结果图' : '原始采集图像' }}</span>
            </div>
          </div>

          <div v-else class="viewer-empty">
            <div class="viewer-empty-graphic">
              <el-icon><Monitor /></el-icon>
            </div>
            <h3>等待图像输入</h3>
            <p>从左侧选择已有图片，或上传新的作物图像开始识别。</p>
            <el-button
              type="primary"
              plain
              :icon="Upload"
              :disabled="!selectedCrop || workspaceBusy"
              @click="triggerFileInput"
            >
              上传图像
            </el-button>
          </div>
        </div>

        <div v-if="isBatchDiagnosing" class="batch-progress">
          <div class="batch-progress-title">
            <span>批量任务处理中</span>
            <strong>{{ batchProcessed }}/{{ batchTotal }}</strong>
          </div>
          <el-progress :percentage="batchPercent" :stroke-width="8" />
        </div>
      </el-card>

      <!-- 右侧：物候期分析报告 -->
      <el-card class="workspace-card report-panel" shadow="never">
        <template #header>
          <div class="panel-header">
            <div>
              <h3>物候期分析报告</h3>
              <span>{{ currentResult ? '模型分析已完成' : '等待识别结果' }}</span>
            </div>
            <el-tag v-if="currentResult" type="success" effect="light">已自动保存</el-tag>
          </div>
        </template>

        <el-scrollbar class="report-scrollbar">
          <div v-if="currentResult" class="report-content">
            <div class="stage-overview">
              <div class="stage-main">
                <span>当前物候期</span>
                <strong>{{ currentResult.phenologyName || '未知阶段' }}</strong>
                <small>{{ currentResult.phenologyCode || '暂无标准编码' }}</small>
              </div>
              <el-progress
                type="circle"
                :percentage="toPercent(currentResult.phenologyConfidence)"
                :width="92"
                :stroke-width="8"
                :color="progressColors"
              />
            </div>

            <div class="phase-flow">
              <div class="phase-node current">
                <span>当前阶段</span>
                <strong>{{ currentResult.phenologyName || '未知' }}</strong>
              </div>
              <el-icon><ArrowRight /></el-icon>
              <div class="phase-node next">
                <span>下一阶段</span>
                <strong>{{ currentResult.phenologyNextName || '待预测' }}</strong>
              </div>
            </div>

            <div class="report-section conclusion">
              <div class="report-section-title">
                <el-icon><Document /></el-icon>
                <span>识别结论</span>
              </div>
              <p>{{ currentResult.phenologyResult || '暂无识别结论' }}</p>
            </div>

            <div class="report-section description">
              <div class="report-section-title">
                <el-icon><View /></el-icon>
                <span>生长状态描述</span>
              </div>
              <p>{{ currentResult.phenologyDesc || '暂无生长状态描述' }}</p>
            </div>

            <div class="report-section advice">
              <div class="report-section-title">
                <el-icon><Sunny /></el-icon>
                <span>农事建议</span>
              </div>
              <p>{{ currentResult.phenologyAdvice || '暂无农事建议' }}</p>
            </div>

            <div class="report-meta">
              <div>
                <span>作物类型</span>
                <strong>{{ getCropLabel(currentResult.phenologyCrop) }}</strong>
              </div>
              <div>
                <span>识别模型</span>
                <strong>{{ currentResult.modelName || selectedModelName || '—' }}</strong>
              </div>
            </div>
          </div>

          <div v-else class="report-empty">
            <div class="report-empty-icon"><el-icon><DataAnalysis /></el-icon></div>
            <h3>暂无分析结果</h3>
            <p>识别完成后，此处将展示当前物候期、置信度、生长状态及农事建议。</p>
          </div>
        </el-scrollbar>
      </el-card>
    </section>

    <!-- 底部：最近识别结果 -->
    <el-card class="history-card" shadow="never">
      <template #header>
        <div class="history-header">
          <div>
            <h3>最近识别结果</h3>
            <span>展示当前作物最近的物候期识别记录</span>
          </div>
          <div class="history-actions">
            <el-button
              text
              :icon="Refresh"
              :loading="isLoadingResults"
              :disabled="!selectedCrop"
              @click="loadRecentPhenologyResults"
            >
              刷新
            </el-button>
            <el-button
              text
              :icon="Download"
              :disabled="!exportableResult || workspaceBusy"
              @click="exportCurrentResult"
            >
              导出当前结果
            </el-button>
            <el-button text @click="historyExpanded = !historyExpanded">
              {{ historyExpanded ? '收起' : '展开' }}
              <el-icon class="expand-icon" :class="{ rotated: historyExpanded }"><ArrowDown /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="historyExpanded" class="history-table-wrapper">
          <el-table
            v-loading="isLoadingResults"
            :data="tableData"
            border
            stripe
            row-key="phenologyId"
            height="330"
            empty-text="暂无物候期识别结果"
          >
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="imageName" label="图像名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="作物类型" width="110" align="center">
              <template #default="{ row }">{{ getCropLabel(row.phenologyCrop) }}</template>
            </el-table-column>
            <el-table-column prop="modelName" label="识别模型" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.modelName || '—' }}</template>
            </el-table-column>
            <el-table-column label="当前物候期" width="130" align="center">
              <template #default="{ row }">
                <el-tag type="success" effect="light">{{ row.phenologyName || '未知' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="phenologyCode" label="标准编码" min-width="150" show-overflow-tooltip />
            <el-table-column label="置信度" width="105" align="center">
              <template #default="{ row }">
                <span class="confidence-value">{{ toPercent(row.phenologyConfidence) }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="phenologyNextName" label="下一阶段" width="120" align="center">
              <template #default="{ row }">{{ row.phenologyNextName || '—' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.recordStatus ?? TASK_STATUS.SUCCESS)" size="small">
                  {{ getStatusText(row.recordStatus ?? TASK_STATUS.SUCCESS) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="识别时间" width="165" align="center" />
            <el-table-column label="操作" width="230" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
                <el-button
                  link
                  type="success"
                  :icon="Picture"
                  :disabled="!row.phenologyResultImgUrl"
                  @click="openImageViewer(normalizeImageUrl(row.phenologyResultImgUrl))"
                >
                  结果图
                </el-button>
                <el-button link type="danger" :icon="Delete" @click="hideHistoryRecord(row)">
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="物候期识别详情" size="520px" destroy-on-close>
      <div v-if="detailRow" class="detail-content">
        <div class="detail-stage-card">
          <div>
            <span>当前物候期</span>
            <strong>{{ detailRow.phenologyName || '未知阶段' }}</strong>
            <small>{{ detailRow.phenologyCode || '暂无标准编码' }}</small>
          </div>
          <el-progress
            type="dashboard"
            :percentage="toPercent(detailRow.phenologyConfidence)"
            :width="96"
            :stroke-width="8"
            :color="progressColors"
          />
        </div>

        <el-descriptions :column="1" border>
          <el-descriptions-item label="图像名称">{{ detailRow.imageName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="作物类型">{{ getCropLabel(detailRow.phenologyCrop) }}</el-descriptions-item>
          <el-descriptions-item label="识别模型">{{ detailRow.modelName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="下一阶段">{{ detailRow.phenologyNextName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="识别时间">{{ detailRow.createTime || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-text-card">
          <h4>识别结论</h4>
          <p>{{ detailRow.phenologyResult || '暂无识别结论' }}</p>
        </div>
        <div class="detail-text-card">
          <h4>生长状态描述</h4>
          <p>{{ detailRow.phenologyDesc || '暂无生长状态描述' }}</p>
        </div>
        <div class="detail-text-card advice-card">
          <h4>农事建议</h4>
          <p>{{ detailRow.phenologyAdvice || '暂无农事建议' }}</p>
        </div>

        <div class="detail-images">
          <button
            v-if="detailRow.imageUrl"
            type="button"
            class="detail-image-button"
            @click="openImageViewer(normalizeImageUrl(detailRow.imageUrl))"
          >
            <el-image :src="normalizeImageUrl(detailRow.imageUrl)" fit="cover" />
            <span>查看原图</span>
          </button>
          <button
            v-if="detailRow.phenologyResultImgUrl"
            type="button"
            class="detail-image-button"
            @click="openImageViewer(normalizeImageUrl(detailRow.phenologyResultImgUrl))"
          >
            <el-image :src="normalizeImageUrl(detailRow.phenologyResultImgUrl)" fit="cover" />
            <span>查看结果图</span>
          </button>
        </div>
      </div>
    </el-drawer>

    <el-image-viewer
      v-if="imageViewerVisible"
      :url-list="[imageViewerUrl]"
      :initial-index="0"
      hide-on-click-modal
      @close="closeImageViewer"
    />
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowDown,
  ArrowRight,
  CircleCheck,
  CircleClose,
  Clock,
  Close,
  DataAnalysis,
  Delete,
  Document,
  Download,
  Files,
  FullScreen,
  Loading,
  Monitor,
  Picture,
  Refresh,
  RefreshRight,
  Sunny,
  Upload,
  View,
  WarningFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import { listImage, addImage } from '@/api/binZhou/xwq/image'
import { listModel } from '@/api/binZhou/xwq/model'
import {
  hideWorkspaceItems,
  listWorkspaceHidden,
  listPhenologyRecognition,
  predictPhenologyByImage
} from '@/api/binZhou/xwq/featurePhenology'

const router = useRouter()
const { proxy } = getCurrentInstance()
const { xwq_crop_type } = proxy.useDict('xwq_crop_type')

/**
 * 生成的物候期后台管理页面路由可能因菜单配置不同而变化。
 * 若你的菜单路由不是 /xwq/phenology，只需修改这一处。
 */
const PHENOLOGY_HISTORY_ROUTE = '/xwq/cv/phenology'
const STORAGE_KEY = 'phenology_recognition_workspace'

const TASK_STATUS = Object.freeze({
  PENDING: 0,
  RUNNING: 1,
  SUCCESS: 2,
  FAILED: 3
})

// 页面引用与基础状态
const fileInput = ref(null)
const fileList = ref([])
const currentImageIndex = ref(-1)
const selectedCrop = ref('')
const selectedModelId = ref(null)
const modelOptions = ref([])
const tableData = ref([])
const hiddenImageIds = ref([])
const hiddenRecordIds = ref([])
const taskStatusFilter = ref('all')
const previewMode = ref('original')
const historyExpanded = ref(true)

// 加载与任务状态
const isUploading = ref(false)
const isLoadingImages = ref(false)
const isLoadingModels = ref(false)
const isLoadingResults = ref(false)
const isDiagnosing = ref(false)
const isBatchDiagnosing = ref(false)
const batchTotal = ref(0)
const batchProcessed = ref(0)

// 详情与图片预览
const detailVisible = ref(false)
const detailRow = ref(null)
const imageViewerVisible = ref(false)
const imageViewerUrl = ref('')

const progressColors = [
  { color: '#f56c6c', percentage: 60 },
  { color: '#e6a23c', percentage: 80 },
  { color: '#67c23a', percentage: 100 }
]

const cropDictItems = computed(() => {
  if (Array.isArray(xwq_crop_type?.value)) return xwq_crop_type.value
  if (Array.isArray(xwq_crop_type)) return xwq_crop_type
  return []
})

const currentImage = computed(() => {
  if (currentImageIndex.value < 0) return null
  return fileList.value[currentImageIndex.value] || null
})

const currentResult = computed(() => currentImage.value?.result || null)

const exportableResult = computed(() => {
  if (currentResult.value?.recordId) return currentResult.value
  return tableData.value.find(item => item.recordId) || null
})

const selectedModel = computed(() => {
  return modelOptions.value.find(item => item.modelId === selectedModelId.value) || null
})

const selectedModelName = computed(() => selectedModel.value?.modelName || '')

const completedCount = computed(() => {
  return fileList.value.filter(item => item.status === TASK_STATUS.SUCCESS).length
})

const runningCount = computed(() => {
  return fileList.value.filter(item => item.status === TASK_STATUS.RUNNING).length
})

const failedCount = computed(() => {
  return fileList.value.filter(item => item.status === TASK_STATUS.FAILED).length
})

const filteredFileList = computed(() => {
  if (taskStatusFilter.value === 'all') return fileList.value
  return fileList.value.filter(item => item.status === Number(taskStatusFilter.value))
})

const taskFilterOptions = computed(() => [
  { label: `全部 ${fileList.value.length}`, value: 'all' },
  { label: `待识别 ${fileList.value.filter(item => item.status === TASK_STATUS.PENDING).length}`, value: String(TASK_STATUS.PENDING) },
  { label: `成功 ${completedCount.value}`, value: String(TASK_STATUS.SUCCESS) },
  { label: `失败 ${failedCount.value}`, value: String(TASK_STATUS.FAILED) }
])

const workspaceBusy = computed(() => {
  return isUploading.value || isDiagnosing.value || isBatchDiagnosing.value
})

const hasResultImage = computed(() => {
  return Boolean(currentResult.value?.phenologyResultImgUrl)
})

const displayImageUrl = computed(() => {
  if (previewMode.value === 'result' && hasResultImage.value) {
    return normalizeImageUrl(currentResult.value.phenologyResultImgUrl)
  }
  return currentImage.value?.url || ''
})

const canRecognizeCurrent = computed(() => {
  return Boolean(
    currentImage.value &&
    selectedCrop.value &&
    selectedModelId.value &&
    modelOptions.value.length > 0 &&
    !workspaceBusy.value
  )
})

const canBatchRecognize = computed(() => {
  const hasPendingTask = fileList.value.some(item => item.status !== TASK_STATUS.SUCCESS)
  return Boolean(
    hasPendingTask &&
    selectedCrop.value &&
    selectedModelId.value &&
    modelOptions.value.length > 0 &&
    !workspaceBusy.value
  )
})

const loadingText = computed(() => {
  if (isUploading.value) return '图片正在上传并写入图片信息表...'
  if (isBatchDiagnosing.value) return `正在批量识别第 ${Math.min(batchProcessed.value + 1, batchTotal.value)} 张图像...`
  if (isDiagnosing.value) return 'AI 模型正在分析当前图像...'
  return '数据加载中...'
})

const batchPercent = computed(() => {
  if (!batchTotal.value) return 0
  return Math.round((batchProcessed.value / batchTotal.value) * 100)
})

onMounted(() => {
  const cropBeforeRestore = selectedCrop.value
  restoreWorkspacePreference()

  // 字典在 setup 阶段已经返回时，首次赋值可能早于 selectedCrop 监听器注册。
  // 这里补一次首次加载；如果恢复的作物发生变化，则由 selectedCrop 监听器负责刷新。
  if (selectedCrop.value && selectedCrop.value === cropBeforeRestore) {
    refreshCropWorkspace()
  }
})

watch(
  cropDictItems,
  options => {
    if (!selectedCrop.value && options.length > 0) {
      const savedCrop = sessionStorage.getItem(`${STORAGE_KEY}_crop`)
      const validSavedCrop = options.some(item => String(item.value) === String(savedCrop))
      selectedCrop.value = validSavedCrop ? savedCrop : options[0].value
    }
  },
  { immediate: true, deep: true }
)

watch(selectedCrop, async (newCrop, oldCrop) => {
  if (newCrop === oldCrop) return

  sessionStorage.setItem(`${STORAGE_KEY}_crop`, newCrop || '')
  selectedModelId.value = null
  currentImageIndex.value = -1
  previewMode.value = 'original'
  fileList.value = []
  tableData.value = []

  if (!newCrop) {
    modelOptions.value = []
    return
  }

  await refreshCropWorkspace()
})

watch(currentImageIndex, () => {
  previewMode.value = hasResultImage.value ? 'result' : 'original'
  saveWorkspacePreference()
})

const loadHiddenItems = async () => {
  try {
    const res = await listWorkspaceHidden()
    const rows = res.data || []
    hiddenImageIds.value = rows
      .filter(item => item.targetType === 'image')
      .map(item => String(item.targetId))
    hiddenRecordIds.value = rows
      .filter(item => item.targetType === 'record')
      .map(item => String(item.targetId))
  } catch (error) {
    console.error('加载工作区隐藏记录失败：', error)
    hiddenImageIds.value = []
    hiddenRecordIds.value = []
  }
}

/** 同时刷新当前作物的模型、历史结果和图片队列。 */
const refreshCropWorkspace = async () => {
  await loadHiddenItems()
  await Promise.all([
    loadModelOptions(),
    loadRecentPhenologyResults()
  ])
  await loadImageList()
}

/** 加载当前作物的启用物候期模型。 */
const loadModelOptions = async () => {
  if (!selectedCrop.value) {
    modelOptions.value = []
    selectedModelId.value = null
    return
  }

  isLoadingModels.value = true
  try {
    const res = await listModel({
      pageNum: 1,
      pageSize: 100,
      // 后端模型字典使用中文类型值“物候期”，不能传图片业务类型 phenology。
      modelType: '物候期',
      modelCrop: selectedCrop.value,
      modelStatus: 1
    })

    const rows = res.rows || []
    modelOptions.value = rows

    selectedModelId.value = rows.length > 0 ? rows[0].modelId : null
  } catch (error) {
    console.error('加载物候期模型失败：', error)
    modelOptions.value = []
    selectedModelId.value = null
    ElMessage.error('加载物候期模型失败，请检查模型列表接口')
  } finally {
    isLoadingModels.value = false
  }
}

/** 加载当前作物的物候期图片，并合并已存在的识别结果。 */
const loadImageList = async () => {
  if (!selectedCrop.value) {
    fileList.value = []
    currentImageIndex.value = -1
    return
  }

  isLoadingImages.value = true
  try {
    const res = await listImage({
      pageNum: 1,
      pageSize: 100,
      imageAiType: 'phenology',
      imageA: selectedCrop.value
    })

    const resultMap = new Map()
    tableData.value.forEach(row => {
      if (row.imageId != null && !resultMap.has(String(row.imageId))) {
        resultMap.set(String(row.imageId), row)
      }
    })

    const previousCurrentId = currentImage.value?.imageId
    const visibleRows = (res.rows || []).filter(
      item => !hiddenImageIds.value.includes(String(item.imageId))
    )
    fileList.value = visibleRows.map(item => {
      const knownResult = resultMap.get(String(item.imageId)) || null
      return {
        id: item.imageId,
        imageId: item.imageId,
        name: item.imageName || `图片ID：${item.imageId}`,
        url: normalizeImageUrl(item.imageUrl),
        rawUrl: item.imageUrl,
        imageAiType: item.imageAiType,
        imageSource: item.imageSource,
        cropType: item.imageA || selectedCrop.value,
        status: knownResult ? TASK_STATUS.SUCCESS : TASK_STATUS.PENDING,
        result: knownResult,
        errorMessage: ''
      }
    })

    if (fileList.value.length === 0) {
      currentImageIndex.value = -1
      return
    }

    const previousIndex = fileList.value.findIndex(item => item.imageId === previousCurrentId)
    currentImageIndex.value = previousIndex >= 0 ? previousIndex : 0
  } catch (error) {
    console.error('加载物候期图片失败：', error)
    ElMessage.error('加载物候期图片列表失败，请检查 /xwq/image/list 接口')
  } finally {
    isLoadingImages.value = false
  }
}

/** 加载当前作物最近的识别结果。 */
const loadRecentPhenologyResults = async () => {
  if (!selectedCrop.value) {
    tableData.value = []
    return
  }

  isLoadingResults.value = true

  try {
    const res = await listPhenologyRecognition({
      pageNum: 1,
      pageSize: 50,
      phenologyCrop: selectedCrop.value
    })

    tableData.value = (res.rows || [])
      .filter(row => !hiddenRecordIds.value.includes(String(row.recordId)))
      .map(normalizePhenologyRow)
  } catch (error) {
    console.error('加载物候期识别结果失败：', error)
    tableData.value = []

    ElMessage.error(
      '加载物候期识别结果失败，请检查 /xwq/phenology/recognition/list 接口'
    )
  } finally {
    isLoadingResults.value = false
  }
}

const triggerFileInput = () => {
  if (!selectedCrop.value) {
    ElMessage.warning('请先选择作物类型')
    return
  }
  fileInput.value?.click()
}

/** 上传图片并写入 xwq_ai_image。 */
const handleFileChange = async event => {
  const input = event.target
  const allFiles = Array.from(input.files || [])
  const imageFiles = allFiles.filter(file => file.type.startsWith('image/'))
  const validFiles = imageFiles.filter(file => file.size <= 10 * 1024 * 1024)

  if (imageFiles.length !== allFiles.length) {
    ElMessage.warning('已忽略非图片文件')
  }
  if (validFiles.length !== imageFiles.length) {
    ElMessage.warning('已忽略超过 10MB 的图片')
  }
  if (validFiles.length === 0) {
    input.value = ''
    return
  }

  isUploading.value = true
  const uploadedRecords = []

  try {
    for (const file of validFiles) {
      const record = await uploadAndCreateImage(file)
      uploadedRecords.push(record)
    }

    ElMessage.success(`成功上传并入库 ${uploadedRecords.length} 张图片`)
    await loadImageList()

    const latestImageId = uploadedRecords[uploadedRecords.length - 1]?.imageId
    if (latestImageId) selectImageById(latestImageId)
  } catch (error) {
    console.error('图片上传入库失败：', error)
    ElMessage.error(`图片上传入库失败：${getErrorMessage(error)}`)
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

const uploadFileToServer = async file => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await request({
    url: '/common/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      repeatSubmit: false
    },
    timeout: 60000
  })

  if (res.code !== 200) {
    throw new Error(res.msg || '文件上传失败')
  }

  const fileUrl = res.url || res.fileName
  if (!fileUrl) {
    throw new Error('上传接口未返回 url 或 fileName')
  }

  return fileUrl
}

const uploadAndCreateImage = async file => {
  const imageUrl = await uploadFileToServer(file)
  const uniqueName = buildUniqueImageName(file.name)

  const imageData = {
    imageName: uniqueName,
    imageUrl,
    imageAiType: 'phenology',
    imageSource: '手动上传',
    imageSize: file.size,
    imageFormat: getFileSuffix(file.name),
    imageStatus: 0,
    imageA: selectedCrop.value
  }

  const addRes = await addImage(imageData)
  if (addRes.code !== 200) {
    throw new Error(addRes.msg || '图片信息入库失败')
  }

  if (addRes.data?.imageId) {
    return addRes.data
  }

  const queryRes = await listImage({
    pageNum: 1,
    pageSize: 10,
    imageName: uniqueName,
    imageAiType: 'phenology',
    imageA: selectedCrop.value
  })

  const saved = (queryRes.rows || []).find(item => item.imageName === uniqueName) || (queryRes.rows || [])[0]
  if (!saved?.imageId) {
    throw new Error('图片已入库，但未查询到 imageId，请检查图片新增接口返回值')
  }

  return saved
}



const validateRecognitionContext = () => {
  if (!selectedCrop.value) {
    ElMessage.warning('请先选择作物类型')
    return false
  }
  if (modelOptions.value.length === 0) {
    ElMessage.warning('当前作物暂无可用物候期模型')
    return false
  }
  if (!selectedModelId.value) {
    ElMessage.warning('请选择物候期识别模型')
    return false
  }
  if (!currentImage.value) {
    ElMessage.warning('请选择需要识别的图片')
    return false
  }
  return true
}

/**
 * 处理单张图片。
 * @param {number} index fileList 中的索引
 * @param {boolean} showMessage 是否显示单张成功/失败提示
 * @returns {Promise<boolean>} 是否识别成功
 */
const processImage = async (index, showMessage = true) => {
  const imageItem = fileList.value[index]
  if (!imageItem?.imageId) {
    if (showMessage) ElMessage.warning('当前图片缺少 imageId，无法识别')
    return false
  }

  imageItem.status = TASK_STATUS.RUNNING
  imageItem.errorMessage = ''

  try {
    const response = await predictPhenologyByImage({
      imageId: imageItem.imageId,
      modelId: selectedModelId.value,
      cropType: selectedCrop.value,
      recordMode: '手动上传'
    })

    if (response.code !== 200 || !response.data) {
      throw new Error(response.msg || '识别接口返回异常')
    }

    const result = normalizePredictionResult(response.data, imageItem)
    imageItem.status = TASK_STATUS.SUCCESS
    imageItem.result = result
    upsertTableResult(result)

    if (currentImage.value?.imageId === imageItem.imageId) {
      previewMode.value = result.phenologyResultImgUrl ? 'result' : 'original'
    }

    if (showMessage) {
      ElMessage.success(`识别完成：${result.phenologyName || '未知物候期'}`)
    }
    return true
  } catch (error) {
    const message = getErrorMessage(error)
    imageItem.status = TASK_STATUS.FAILED
    imageItem.errorMessage = message
    console.error(`图片 ${imageItem.name} 识别失败：`, error)
    if (showMessage) ElMessage.error(`识别失败：${message}`)
    return false
  }
}

const runDiagnosis = async () => {
  if (!validateRecognitionContext() || workspaceBusy.value) return

  isDiagnosing.value = true
  try {
    await processImage(currentImageIndex.value, true)
  } finally {
    isDiagnosing.value = false
  }
}

/** 顺序执行批量识别，避免一次性压满模型服务或 GPU。 */
const runBatchDiagnosis = async () => {
  if (!validateRecognitionContext() || workspaceBusy.value) return

  const targetIds = fileList.value
    .filter(item => item.status !== TASK_STATUS.SUCCESS)
    .map(item => item.imageId)

  if (targetIds.length === 0) {
    ElMessage.info('当前队列中的图片均已识别完成')
    return
  }

  isBatchDiagnosing.value = true
  batchTotal.value = targetIds.length
  batchProcessed.value = 0
  let successCount = 0
  let failureCount = 0

  try {
    for (const imageId of targetIds) {
      const index = fileList.value.findIndex(item => item.imageId === imageId)
      if (index < 0) continue

      currentImageIndex.value = index
      const success = await processImage(index, false)
      success ? successCount++ : failureCount++
      batchProcessed.value++
    }

    if (failureCount === 0) {
      ElMessage.success(`批量识别完成，共成功 ${successCount} 张`)
    } else {
      ElMessage.warning(`批量识别结束：成功 ${successCount} 张，失败 ${failureCount} 张`)
    }
  } finally {
    isBatchDiagnosing.value = false
    batchTotal.value = 0
    batchProcessed.value = 0
  }
}

const retryTask = async imageId => {
  if (workspaceBusy.value) return
  const index = fileList.value.findIndex(item => item.imageId === imageId)
  if (index < 0) return

  currentImageIndex.value = index
  if (!validateRecognitionContext()) return

  isDiagnosing.value = true
  try {
    await processImage(index, true)
  } finally {
    isDiagnosing.value = false
  }
}

const selectImageById = imageId => {
  if (isBatchDiagnosing.value) return
  const index = fileList.value.findIndex(item => item.imageId === imageId)
  if (index >= 0) currentImageIndex.value = index
}

const removeTask = async imageId => {
  const index = fileList.value.findIndex(item => item.imageId === imageId)
  if (index < 0) return

  try {
    await hideWorkspaceItems({ targetType: 'image', targetId: imageId })
    hiddenImageIds.value.push(String(imageId))
  } catch (error) {
    ElMessage.error(`移除任务失败：${getErrorMessage(error)}`)
    return
  }

  fileList.value.splice(index, 1)

  if (fileList.value.length === 0) {
    currentImageIndex.value = -1
  } else if (currentImageIndex.value >= fileList.value.length) {
    currentImageIndex.value = fileList.value.length - 1
  } else if (index < currentImageIndex.value) {
    currentImageIndex.value--
  }
}

const clearTaskQueue = async () => {
  try {
    await ElMessageBox.confirm(
      '确定清空当前页面的图片任务队列吗？刷新后仍保持隐藏，后台数据不会删除。',
      '清空任务队列',
      {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning'
      }
    )
    const targetIds = fileList.value.map(item => item.imageId).filter(Boolean)
    await hideWorkspaceItems({ targetType: 'image', targetIds })
    hiddenImageIds.value.push(...targetIds.map(String))
    fileList.value = []
    currentImageIndex.value = -1
    previewMode.value = 'original'
    ElMessage.success('当前页面任务队列已清空')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(`清空任务队列失败：${getErrorMessage(error)}`)
    }
  }
}

const hideHistoryRecord = async row => {
  if (!row?.recordId) {
    ElMessage.warning('当前识别记录缺少记录ID')
    return
  }
  try {
    await ElMessageBox.confirm(
      '确定从当前页面移除该识别记录吗？后台管理系统中的记录不会删除。',
      '移除识别记录',
      { confirmButtonText: '确定移除', cancelButtonText: '取消', type: 'warning' }
    )
    await hideWorkspaceItems({ targetType: 'record', targetId: row.recordId })
    hiddenRecordIds.value.push(String(row.recordId))
    tableData.value = tableData.value.filter(item => item.recordId !== row.recordId)
    ElMessage.success('识别记录已从当前页面移除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(`移除识别记录失败：${getErrorMessage(error)}`)
    }
  }
}

const upsertTableResult = result => {
  const index = tableData.value.findIndex(item => {
    if (result.phenologyId != null && item.phenologyId != null) {
      return item.phenologyId === result.phenologyId
    }
    return String(item.imageId) === String(result.imageId)
  })

  if (index >= 0) {
    tableData.value[index] = result
  } else {
    tableData.value.unshift(result)
  }
}

const normalizePredictionResult = (data, imageItem) => {
  return normalizePhenologyRow({
    ...data,
    imageId: data.imageId ?? imageItem.imageId,
    imageName: data.imageName || imageItem.name,
    imageUrl: data.imageUrl || imageItem.rawUrl || imageItem.url,
    modelId: data.modelId ?? selectedModelId.value,
    modelName: data.modelName || selectedModelName.value,
    phenologyCrop: data.phenologyCrop || selectedCrop.value,
    recordStatus: data.recordStatus ?? TASK_STATUS.SUCCESS,
    createTime: data.createTime || formatDateTime(new Date())
  })
}

const normalizePhenologyRow = row => ({
  phenologyId: row.phenologyId,
  recordId: row.recordId,
  imageId: row.imageId,
  imageName: row.imageName || `图片ID：${row.imageId ?? '—'}`,
  imageUrl: row.imageUrl || '',
  modelId: row.modelId,
  modelName: row.modelName || '',
  phenologyName: row.phenologyName || '未知物候期',
  phenologyCode: row.phenologyCode || '',
  phenologyCrop: row.phenologyCrop || selectedCrop.value,
  phenologyConfidence: Number(row.phenologyConfidence || 0),
  phenologyResult: row.phenologyResult || '',
  phenologyDesc: row.phenologyDesc || '',
  phenologyAdvice: row.phenologyAdvice || '',
  phenologyNextName: row.phenologyNextName || '',
  phenologyResultImgUrl: row.phenologyResultImgUrl || '',
  recordStatus: row.recordStatus == null ? TASK_STATUS.SUCCESS : Number(row.recordStatus),
  createTime: row.createTime || ''
})

const openDetail = row => {
  detailRow.value = row
  detailVisible.value = true
}

const openImageViewer = url => {
  if (!url) {
    ElMessage.warning('图片地址不可用')
    return
  }
  imageViewerUrl.value = url
  imageViewerVisible.value = true
}

const closeImageViewer = () => {
  imageViewerVisible.value = false
  imageViewerUrl.value = ''
}

const goToHistory = () => {
  router.push(PHENOLOGY_HISTORY_ROUTE).catch(error => {
    console.error('跳转物候期识别记录页面失败：', error)
    ElMessage.warning('未找到物候期记录路由，请检查菜单路由配置')
  })
}

const exportCurrentResult = () => {
  const recordId = exportableResult.value?.recordId
  if (!recordId) {
    ElMessage.warning('当前图片暂无可导出的识别结果')
    return
  }

  proxy.download(
    '/xwq/phenology/export',
    { recordId },
    `物候期识别结果_${recordId}.xlsx`
  )
}

const getCropLabel = value => {
  if (!value) return '未设置'
  const target = cropDictItems.value.find(item => String(item.value) === String(value))
  return target?.label || value
}

const getStatusText = status => {
  const map = {
    [TASK_STATUS.PENDING]: '待识别',
    [TASK_STATUS.RUNNING]: '识别中',
    [TASK_STATUS.SUCCESS]: '识别成功',
    [TASK_STATUS.FAILED]: '识别失败'
  }
  return map[Number(status)] || '未知状态'
}

const getStatusTagType = status => {
  const map = {
    [TASK_STATUS.PENDING]: 'info',
    [TASK_STATUS.RUNNING]: 'warning',
    [TASK_STATUS.SUCCESS]: 'success',
    [TASK_STATUS.FAILED]: 'danger'
  }
  return map[Number(status)] || 'info'
}

const statusClass = status => {
  const map = {
    [TASK_STATUS.PENDING]: 'pending',
    [TASK_STATUS.RUNNING]: 'running',
    [TASK_STATUS.SUCCESS]: 'success',
    [TASK_STATUS.FAILED]: 'failed'
  }
  return map[Number(status)] || 'pending'
}

const toPercent = value => {
  const number = Number(value || 0)
  const percentage = number <= 1 ? number * 100 : number
  return Math.max(0, Math.min(100, Math.round(percentage)))
}

const getFileSuffix = fileName => {
  if (!fileName || !fileName.includes('.')) return ''
  return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase()
}

const buildUniqueImageName = name => {
  const suffix = getFileSuffix(name)
  const base = suffix ? name.substring(0, name.lastIndexOf('.')) : name
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return `${base}_${unique}${suffix ? `.${suffix}` : ''}`
}

const normalizeImageUrl = url => {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return `${baseApi}${url}`
  return `${baseApi}/${url}`
}

const getErrorMessage = error => {
  return error?.response?.data?.msg || error?.msg || error?.message || '未知错误'
}

const formatDateTime = date => {
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const saveWorkspacePreference = () => {
  sessionStorage.setItem(`${STORAGE_KEY}_imageId`, String(currentImage.value?.imageId || ''))
}

const restoreWorkspacePreference = () => {
  const savedCrop = sessionStorage.getItem(`${STORAGE_KEY}_crop`)
  if (savedCrop) selectedCrop.value = savedCrop
}
</script>

<style scoped>
.phenology-page {
  --agri-primary: #2f7d4a;
  --agri-primary-dark: #235f38;
  --agri-primary-light: #eaf6ee;
  --agri-accent: #8fbf5a;
  --page-bg: #f4f7f5;
  --card-border: #e4ebe6;
  --text-primary: #243129;
  --text-secondary: #6b786f;
  --shadow-soft: 0 8px 28px rgba(36, 71, 48, 0.06);

  min-height: calc(100vh - 84px);
  padding: 20px;
  background:
    radial-gradient(circle at 92% 4%, rgba(143, 191, 90, 0.12), transparent 24%),
    var(--page-bg);
  color: var(--text-primary);
}

.hidden-input {
  display: none;
}

.page-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
  overflow: hidden;
  border: 1px solid rgba(47, 125, 74, 0.14);
  border-radius: 14px;
  background: linear-gradient(118deg, #ffffff 0%, #f5fbf7 58%, #edf7ef 100%);
  box-shadow: var(--shadow-soft);
}

.page-hero::after {
  content: '';
  position: absolute;
  right: -60px;
  bottom: -90px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(143, 191, 90, 0.1);
  pointer-events: none;
}

.hero-main,
.hero-controls,
.hero-actions,
.control-item {
  display: flex;
  align-items: center;
}

.hero-main {
  gap: 14px;
  min-width: 290px;
}

.hero-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 14px;
  color: #ffffff;
  background: linear-gradient(145deg, var(--agri-primary), #63a76e);
  box-shadow: 0 8px 18px rgba(47, 125, 74, 0.22);
  font-size: 26px;
}

.hero-main h2,
.panel-header h3,
.history-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.hero-main h2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.hero-main p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.hero-controls {
  position: relative;
  z-index: 1;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}

.control-item {
  gap: 8px;
}

.control-label {
  white-space: nowrap;
  color: #526158;
  font-size: 13px;
  font-weight: 600;
}

.crop-select {
  width: 150px;
}

.model-select {
  width: 240px;
}

.hero-actions {
  gap: 8px;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.model-option small {
  color: #99a29c;
}

.model-warning {
  position: absolute;
  right: 24px;
  bottom: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #c77912;
  font-size: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 16px 0;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 78px;
  padding: 14px 18px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 18px rgba(36, 71, 48, 0.035);
}

.summary-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  font-size: 21px;
}

.summary-icon.neutral {
  color: #4a7f91;
  background: #eaf4f7;
}

.summary-icon.success {
  color: #2f7d4a;
  background: #eaf6ee;
}

.summary-icon.warning {
  color: #b4771d;
  background: #fff4df;
}

.summary-icon.danger {
  color: #c45656;
  background: #fdecec;
}

.summary-card span {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
}

.summary-card strong {
  display: block;
  margin-top: 3px;
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(260px, 310px) minmax(420px, 1fr) minmax(300px, 350px);
  gap: 16px;
  min-height: 570px;
}

.workspace-card,
.history-card {
  border: 1px solid var(--card-border);
  border-radius: 14px;
  box-shadow: var(--shadow-soft);
}

.workspace-card {
  height: 570px;
}

.workspace-card :deep(.el-card__header),
.history-card :deep(.el-card__header) {
  padding: 15px 17px;
  border-bottom: 1px solid #edf1ee;
}

.workspace-card :deep(.el-card__body) {
  height: calc(100% - 67px);
  padding: 0;
}

.panel-header,
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-header h3,
.history-header h3 {
  font-size: 15px;
  font-weight: 700;
}

.panel-header span,
.history-header span {
  display: block;
  margin-top: 3px;
  color: #8a958e;
  font-size: 12px;
}

.panel-header-actions,
.viewer-toolbar,
.history-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
}

.task-filter {
  padding: 12px 12px 8px;
  overflow-x: auto;
}

.task-filter :deep(.el-radio-group) {
  min-width: max-content;
  flex-wrap: nowrap;
}

.task-list-wrapper {
  min-height: 0;
  flex: 1;
  padding: 4px 8px 8px;
  overflow: hidden;
}

.task-list-wrapper :deep(.el-scrollbar) {
  height: 100%;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 4px 8px;
}

.task-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 76px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #f8faf9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  transform: translateY(-1px);
  border-color: #dce8df;
  background: #ffffff;
  box-shadow: 0 5px 14px rgba(34, 70, 47, 0.07);
}

.task-item.active {
  border-color: rgba(47, 125, 74, 0.45);
  background: #f0f8f3;
  box-shadow: inset 3px 0 0 var(--agri-primary);
}

.task-item.success {
  background: #f6fbf7;
}

.task-item.failed {
  background: #fff8f8;
}

.task-thumb {
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid #e3e9e5;
  border-radius: 8px;
  background: #eef2ef;
}

.thumb-error {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #aab3ad;
}

.task-info {
  min-width: 0;
  flex: 1;
}

.task-name {
  overflow: hidden;
  color: #344139;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  gap: 4px;
  margin: 5px 0 7px;
  color: #89948d;
  font-size: 11px;
}

.task-state-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.task-error {
  overflow: hidden;
  color: #d15c5c;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-item-actions {
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.task-item:hover .task-item-actions,
.task-item.active .task-item-actions {
  opacity: 1;
}

.task-panel-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #edf1ee;
  background: #ffffff;
}

.empty-panel,
.viewer-empty,
.report-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  color: #a2aca5;
}

.empty-panel {
  height: 100%;
  min-height: 240px;
  padding: 20px;
}

.empty-panel > .el-icon {
  margin-bottom: 12px;
  font-size: 42px;
  opacity: 0.62;
}

.empty-panel p,
.viewer-empty h3,
.report-empty h3 {
  margin: 0;
  color: #69776e;
  font-size: 14px;
  font-weight: 600;
}

.empty-panel span,
.viewer-empty p,
.report-empty p {
  margin-top: 7px;
  color: #a0aaa3;
  font-size: 12px;
  line-height: 1.7;
}

.viewer-panel :deep(.el-card__body) {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #f7faf8;
}

.viewer-header {
  min-width: 0;
}

.viewer-header > div:first-child {
  min-width: 0;
}

.viewer-header > div:first-child span {
  overflow: hidden;
  max-width: 310px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-body {
  position: relative;
  min-height: 0;
  flex: 1;
}

.image-stage,
.stage-image {
  width: 100%;
  height: 100%;
}

.image-stage {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(45deg, #f4f6f4 25%, transparent 25%),
    linear-gradient(-45deg, #f4f6f4 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f4f6f4 75%),
    linear-gradient(-45deg, transparent 75%, #f4f6f4 75%),
    #fbfcfb;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
}

.stage-error {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #9aa59e;
  background: #f5f7f5;
}

.stage-error .el-icon {
  font-size: 42px;
}

.image-status-bar {
  position: absolute;
  right: 16px;
  bottom: 14px;
  left: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 9px;
  color: #ffffff;
  background: rgba(31, 44, 36, 0.7);
  backdrop-filter: blur(8px);
  font-size: 12px;
}

.image-status-bar > div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #aab2ad;
}

.status-dot.pending { background: #aab2ad; }
.status-dot.running { background: #e6a23c; box-shadow: 0 0 0 4px rgba(230, 162, 60, 0.2); }
.status-dot.success { background: #67c23a; box-shadow: 0 0 0 4px rgba(103, 194, 58, 0.18); }
.status-dot.failed { background: #f56c6c; box-shadow: 0 0 0 4px rgba(245, 108, 108, 0.18); }

.scan-line {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #5fc27c, transparent);
  box-shadow: 0 0 14px rgba(65, 180, 96, 0.8);
  animation: scan 1.7s linear infinite;
}

@keyframes scan {
  0% { top: 2%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 98%; opacity: 0; }
}

.viewer-empty {
  height: 100%;
  padding: 30px;
}

.viewer-empty-graphic {
  display: grid;
  width: 86px;
  height: 86px;
  margin-bottom: 17px;
  place-items: center;
  border-radius: 24px;
  color: var(--agri-primary);
  background: linear-gradient(145deg, #edf8f0, #e3f1e6);
  font-size: 42px;
}

.viewer-empty h3 {
  font-size: 16px;
}

.viewer-empty p {
  max-width: 360px;
  margin-bottom: 18px;
}

.batch-progress {
  padding: 12px 16px 14px;
  border-top: 1px solid #e6ece8;
  background: #ffffff;
}

.batch-progress-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #56645b;
  font-size: 12px;
}

.report-panel :deep(.el-card__body) {
  overflow: hidden;
}

.report-scrollbar {
  height: 100%;
}

.report-content {
  padding: 16px;
}

.stage-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 17px;
  border: 1px solid #dfece2;
  border-radius: 12px;
  background: linear-gradient(145deg, #f8fcf9, #edf7ef);
}

.stage-main span,
.phase-node span,
.report-meta span,
.detail-stage-card span {
  display: block;
  color: #869188;
  font-size: 11px;
}

.stage-main strong {
  display: block;
  margin: 6px 0;
  color: var(--agri-primary-dark);
  font-size: 25px;
}

.stage-main small,
.detail-stage-card small {
  color: #8f9992;
  font-size: 11px;
}

.phase-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr);
  align-items: center;
  gap: 5px;
  margin: 14px 0;
}

.phase-flow > .el-icon {
  justify-self: center;
  color: #95a59a;
}

.phase-node {
  min-width: 0;
  padding: 11px 12px;
  border-radius: 9px;
}

.phase-node.current {
  border: 1px solid #cce2d2;
  background: #edf7ef;
}

.phase-node.next {
  border: 1px dashed #dce4de;
  background: #fafbfa;
}

.phase-node strong {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #445148;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-section {
  margin-top: 12px;
  padding: 13px 14px;
  border: 1px solid #e8ede9;
  border-radius: 10px;
  background: #fafcfa;
}

.report-section.conclusion {
  border-left: 3px solid #4d91bd;
}

.report-section.description {
  border-left: 3px solid #9f8ac7;
}

.report-section.advice {
  border-left: 3px solid var(--agri-accent);
  background: #f7fbf2;
}

.report-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4d5a51;
  font-size: 12px;
  font-weight: 700;
}

.report-section p,
.detail-text-card p {
  margin: 8px 0 0;
  color: #626e66;
  font-size: 12px;
  line-height: 1.75;
  word-break: break-word;
}

.report-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.report-meta > div {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 9px;
  background: #f5f7f5;
}

.report-meta strong {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #47534b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-empty {
  height: 100%;
  padding: 28px;
}

.report-empty-icon {
  display: grid;
  width: 72px;
  height: 72px;
  margin-bottom: 16px;
  place-items: center;
  border-radius: 22px;
  color: #83a98e;
  background: #edf4ef;
  font-size: 34px;
}

.report-empty p {
  max-width: 250px;
}

.history-card {
  margin-top: 16px;
}

.history-card :deep(.el-card__body) {
  padding: 0;
}

.history-actions .expand-icon {
  margin-left: 4px;
  transition: transform 0.2s ease;
}

.history-actions .expand-icon.rotated {
  transform: rotate(180deg);
}

.history-table-wrapper {
  padding: 14px 16px 16px;
}

.history-table-wrapper :deep(.el-table) {
  --el-table-header-bg-color: #f3f7f4;
  --el-table-header-text-color: #536158;
  border-radius: 9px;
}

.confidence-value {
  color: var(--agri-primary-dark);
  font-weight: 700;
}

.detail-content {
  padding: 0 2px 26px;
}

.detail-stage-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid #dce9df;
  border-radius: 12px;
  background: linear-gradient(145deg, #f7fcf8, #eaf5ed);
}

.detail-stage-card strong {
  display: block;
  margin: 6px 0;
  color: var(--agri-primary-dark);
  font-size: 24px;
}

.detail-text-card {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #e5ebe7;
  border-radius: 10px;
  background: #fafcfa;
}

.detail-text-card.advice-card {
  border-left: 3px solid var(--agri-accent);
  background: #f7fbf2;
}

.detail-text-card h4 {
  margin: 0;
  color: #445149;
  font-size: 13px;
}

.detail-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.detail-image-button {
  position: relative;
  height: 140px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #dfe7e1;
  border-radius: 10px;
  background: #f2f5f3;
  cursor: pointer;
}

.detail-image-button .el-image {
  width: 100%;
  height: 100%;
}

.detail-image-button span {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 8px;
  color: #ffffff;
  background: linear-gradient(transparent, rgba(24, 35, 28, 0.78));
  font-size: 12px;
}

@media (max-width: 1500px) {
  .page-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-controls {
    width: 100%;
    justify-content: flex-start;
  }

  .model-warning {
    right: 24px;
    bottom: 5px;
  }

  .workspace-grid {
    grid-template-columns: 280px minmax(400px, 1fr) 320px;
  }
}

@media (max-width: 1240px) {
  .workspace-grid {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  .report-panel {
    grid-column: 1 / -1;
    height: 390px;
  }

  .report-content {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr;
    gap: 12px;
  }

  .stage-overview,
  .phase-flow,
  .report-meta {
    align-self: start;
  }

  .phase-flow {
    margin: 0;
  }

  .report-section {
    margin-top: 0;
  }

  .report-meta {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .phenology-page {
    padding: 12px;
  }

  .hero-controls,
  .control-item,
  .hero-actions {
    width: 100%;
  }

  .control-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .control-select,
  .hero-actions .el-button {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .workspace-card,
  .report-panel {
    height: 520px;
    grid-column: auto;
  }

  .report-content {
    display: block;
  }

  .report-section {
    margin-top: 12px;
  }

  .history-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

<style scoped>
/* ==========================================================================
   FarmerTask 同系风格覆盖
   仅调整视觉样式与响应式布局，不修改 template、script、方法、功能、接口及注释。
   ========================================================================== */

.phenology-page {
  --ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-green-soft: #edf5e9;
  --ft-green-pale: #f8fbf5;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e5eee2;
  --ft-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);

  width: 100%;
  min-height: calc(100vh - 84px);
  padding: 20px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.18), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.phenology-page *,
.phenology-page *::before,
.phenology-page *::after {
  box-sizing: border-box;
}

/* 页面内容统一宽度 */
.phenology-page .page-hero,
.phenology-page .summary-grid,
.phenology-page .workspace-grid,
.phenology-page .history-card {
  width: min(1680px, 100%);
  margin-right: auto;
  margin-left: auto;
}

/* 顶部控制区 */
.phenology-page .page-hero {
  min-height: 112px;
  padding: 20px 22px;
  overflow: visible;
  background:
    radial-gradient(circle at 92% 8%, rgba(127, 168, 138, 0.14), transparent 31%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 242, 0.98));
  border: 1px solid var(--ft-border);
  border-radius: 16px;
  box-shadow: var(--ft-shadow);
}

.phenology-page .page-hero::after {
  display: none;
}

.phenology-page .hero-main {
  min-width: 300px;
  gap: 14px;
}

.phenology-page .hero-icon {
  width: 50px;
  height: 50px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), #75a382);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 13px;
  box-shadow: 0 9px 18px rgba(47, 125, 92, 0.2);
}

.phenology-page .hero-main h2 {
  color: #294635;
  font-size: 22px;
  font-weight: 800;
}

.phenology-page .hero-main p {
  color: var(--ft-muted);
  line-height: 1.7;
}

.phenology-page .hero-controls {
  align-items: flex-end;
  gap: 14px;
}

.phenology-page .control-item {
  align-items: flex-start;
  flex-direction: column;
  gap: 6px;
}

.phenology-page .control-label {
  color: var(--ft-text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.phenology-page .crop-select {
  width: 160px;
}

.phenology-page .model-select {
  width: 250px;
}

.phenology-page .control-select :deep(.el-select__wrapper),
.phenology-page .control-select :deep(.el-input__wrapper) {
  min-height: 38px;
  background: #fbfcfa;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #dce7da inset;
}

.phenology-page .control-select :deep(.el-select__wrapper:hover),
.phenology-page .control-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #a9c6ad inset;
}

.phenology-page .control-select :deep(.el-select__wrapper.is-focused),
.phenology-page .control-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ft-green) inset !important;
}

.phenology-page .hero-actions {
  min-height: 38px;
  gap: 8px;
}

.phenology-page .hero-actions :deep(.el-button) {
  min-width: 96px;
  margin-left: 0;
}

.phenology-page .model-warning {
  right: 22px;
  bottom: -24px;
  padding: 5px 10px;
  color: #956724;
  background: #fff8e9;
  border: 1px solid #ead9b7;
  border-radius: 7px;
  box-shadow: 0 5px 12px rgba(120, 89, 38, 0.08);
}

/* FarmerTask 主按钮 */
.phenology-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: var(--ft-green-deep);
  --el-button-active-border-color: var(--ft-green-deep);
}

.phenology-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: var(--ft-green);
  --el-button-hover-bg-color: var(--ft-green);
  --el-button-hover-border-color: var(--ft-green);
  --el-button-hover-text-color: #ffffff;
}

.phenology-page :deep(.el-button--success.is-plain) {
  --el-button-bg-color: #eef6ea;
  --el-button-border-color: #c3d9c3;
  --el-button-text-color: #4f8f6b;
}

/* 概览卡片 */
.phenology-page .summary-grid {
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 16px;
  margin-top: 16px;
  margin-bottom: 16px;
}

.phenology-page .summary-card {
  position: relative;
  min-height: 92px;
  padding: 16px 18px;
  overflow: hidden;
  gap: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(127, 168, 138, 0.11), transparent 38%),
    linear-gradient(145deg, #ffffff, #f8fbf5);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 9px 22px rgba(58, 88, 63, 0.07);
}

.phenology-page .summary-card::after {
  position: absolute;
  right: -25px;
  bottom: -42px;
  width: 105px;
  height: 105px;
  content: "";
  background: rgba(79, 143, 107, 0.06);
  border-radius: 50%;
}

.phenology-page .summary-icon {
  position: relative;
  z-index: 1;
  width: 46px;
  height: 46px;
  color: #ffffff;
  background: linear-gradient(135deg, #557b5f, #8ead91);
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(47, 125, 92, 0.15);
}

.phenology-page .summary-icon.neutral {
  color: #ffffff;
  background: linear-gradient(135deg, #557b5f, #8ead91);
}

.phenology-page .summary-icon.success {
  color: #ffffff;
  background: linear-gradient(135deg, #2f7d5c, #6fa17e);
}

.phenology-page .summary-icon.warning {
  color: #ffffff;
  background: linear-gradient(135deg, #9a742d, #c9a661);
}

.phenology-page .summary-icon.danger {
  color: #ffffff;
  background: linear-gradient(135deg, #9b5a5a, #c88181);
}

.phenology-page .summary-card > div:last-child {
  position: relative;
  z-index: 1;
}

.phenology-page .summary-card span {
  color: var(--ft-muted);
  font-size: 12px;
}

.phenology-page .summary-card strong {
  margin-top: 6px;
  color: #294635;
  font-size: 26px;
  font-weight: 800;
}

/* 主工作区 */
.phenology-page .workspace-grid {
  grid-template-columns: 300px minmax(540px, 1fr) 340px;
  gap: 16px;
  min-height: 610px;
}

.phenology-page .workspace-card,
.phenology-page .history-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: var(--ft-shadow);
}

.phenology-page .workspace-card {
  height: 610px;
}

.phenology-page .workspace-card :deep(.el-card__header),
.phenology-page .history-card :deep(.el-card__header) {
  min-height: 62px;
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbf5 100%);
  border-bottom: 1px solid #e2ece0;
}

.phenology-page .workspace-card :deep(.el-card__body) {
  height: calc(100% - 62px);
}

.phenology-page .panel-header,
.phenology-page .history-header {
  min-width: 0;
}

.phenology-page .panel-header > div:first-child,
.phenology-page .history-header > div:first-child {
  min-width: 0;
}

.phenology-page .panel-header h3,
.phenology-page .history-header h3 {
  color: #294635;
  font-size: 16px;
  font-weight: 800;
}

.phenology-page .panel-header span,
.phenology-page .history-header span {
  overflow: hidden;
  color: var(--ft-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 左侧任务区 */
.phenology-page .task-filter {
  padding: 11px 12px 8px;
  background: #fafcf9;
  border-bottom: 1px solid #e7eee5;
}

.phenology-page .task-filter :deep(.el-radio-button__inner) {
  color: #607565;
  background: #ffffff;
  border-color: #d7e4d5;
}

.phenology-page .task-filter :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  color: #ffffff;
  background: var(--ft-green);
  border-color: var(--ft-green);
  box-shadow: -1px 0 0 0 var(--ft-green);
}

.phenology-page .task-list-wrapper {
  padding: 7px 8px;
  background: #f8fbf5;
}

.phenology-page .task-list {
  gap: 8px;
}

.phenology-page .task-item {
  min-height: 82px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e1ebe0;
  border-radius: 10px;
}

.phenology-page .task-item:hover {
  border-color: #b9d1bb;
  background: #ffffff;
  box-shadow: 0 8px 17px rgba(58, 88, 63, 0.09);
}

.phenology-page .task-item.active {
  background: #eaf3e7;
  border-color: #8db598;
  box-shadow: inset 3px 0 0 var(--ft-green);
}

.phenology-page .task-item.success {
  background: #f5faf3;
}

.phenology-page .task-item.failed {
  background: #fff7f7;
  border-color: #efd6d6;
}

.phenology-page .task-thumb {
  width: 62px;
  height: 62px;
  border-color: #dce7da;
  border-radius: 9px;
}

.phenology-page .task-name {
  color: #344e3e;
  font-size: 13px;
  font-weight: 700;
}

.phenology-page .task-meta {
  color: var(--ft-muted);
}

.phenology-page .task-panel-footer {
  padding: 12px;
  background: #ffffff;
  border-top: 1px solid #e2ece0;
}

.phenology-page .task-panel-footer :deep(.el-button) {
  min-width: 0;
  margin-left: 0;
}

/* 中间视觉终端 */
.phenology-page .viewer-panel :deep(.el-card__body) {
  background: #f5f8f3;
}

.phenology-page .viewer-toolbar {
  flex: 0 0 auto;
}

.phenology-page .viewer-toolbar :deep(.el-radio-button__inner) {
  color: #607565;
  border-color: #d7e4d5;
}

.phenology-page .viewer-toolbar :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  color: #ffffff;
  background: var(--ft-green);
  border-color: var(--ft-green);
  box-shadow: -1px 0 0 0 var(--ft-green);
}

.phenology-page .image-stage {
  background:
    linear-gradient(rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 102, 76, 0.035) 1px, transparent 1px),
    #f4f8f1;
  background-size: 24px 24px;
}

.phenology-page .stage-image {
  padding: 12px;
}

.phenology-page .image-status-bar {
  right: 18px;
  bottom: 16px;
  left: 18px;
  padding: 10px 13px;
  background: rgba(36, 63, 47, 0.76);
  border-color: rgba(255, 255, 255, 0.45);
  border-radius: 10px;
}

.phenology-page .viewer-empty-graphic {
  color: #ffffff;
  background: linear-gradient(135deg, var(--ft-green), #75a382);
  border-radius: 22px;
  box-shadow: 0 12px 24px rgba(47, 125, 92, 0.18);
}

.phenology-page .viewer-empty h3 {
  color: #315440;
}

.phenology-page .batch-progress {
  border-top-color: #dfe9dd;
}

/* 右侧报告 */
.phenology-page .report-scrollbar {
  background: #fbfcfa;
}

.phenology-page .report-content {
  padding: 15px;
}

.phenology-page .stage-overview {
  padding: 16px;
  background:
    radial-gradient(circle at 100% 0%, rgba(127, 168, 138, 0.12), transparent 40%),
    linear-gradient(145deg, #f8fbf5, #edf5e9);
  border: 1px solid #d7e6d5;
  border-radius: 12px;
}

.phenology-page .stage-main strong {
  color: #2f684c;
  font-size: 24px;
}

.phenology-page .phase-flow {
  margin: 13px 0;
}

.phenology-page .phase-node {
  min-height: 66px;
  padding: 11px 12px;
}

.phenology-page .phase-node.current {
  background: #eaf3e7;
  border-color: #c9dfc8;
}

.phenology-page .phase-node.next {
  background: #fafcf9;
  border-color: #dce7da;
}

.phenology-page .report-section {
  padding: 13px 14px;
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-left-width: 4px;
  border-radius: 10px;
}

.phenology-page .report-section.conclusion {
  border-left-color: #527b61;
}

.phenology-page .report-section.description {
  border-left-color: #7b8f6a;
}

.phenology-page .report-section.advice {
  background: #eef6ea;
  border-color: #d4e3d2;
  border-left-color: #4f8f6b;
}

.phenology-page .report-section-title {
  color: #355541;
}

.phenology-page .report-section p {
  color: #5d7464;
  line-height: 1.8;
}

.phenology-page .report-meta > div {
  background: #f1f6ee;
  border: 1px solid #dfeadd;
}

.phenology-page .report-empty-icon {
  color: #ffffff;
  background: linear-gradient(135deg, #557b5f, #8ead91);
  box-shadow: 0 10px 20px rgba(47, 125, 92, 0.16);
}

/* 底部历史表格 */
.phenology-page .history-card {
  margin-top: 16px;
}

.phenology-page .history-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.phenology-page .history-table-wrapper {
  padding: 14px 16px 16px;
}

.phenology-page .history-table-wrapper :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-header-text-color: #3d5848;
  --el-table-row-hover-bg-color: #f4f8f1;
  --el-table-border-color: #dfe9dd;
  color: var(--ft-text-secondary);
  border-radius: 10px;
}

.phenology-page .history-table-wrapper :deep(.el-table th.el-table__cell) {
  color: #3d5848;
  font-weight: 700;
  background: #f1f6ee;
}

.phenology-page .history-table-wrapper :deep(.el-table td.el-table__cell) {
  border-bottom-color: #e6eee3;
}

.phenology-page .confidence-value {
  color: var(--ft-green);
}

/* 详情抽屉 */
:deep(.el-drawer) {
  background: #f7faf5;
}

:deep(.el-drawer__header) {
  min-height: 64px;
  padding: 17px 20px;
  margin-bottom: 0;
  color: #294635;
  font-weight: 800;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

:deep(.el-drawer__body) {
  padding: 18px;
}

.phenology-page .detail-stage-card {
  background:
    radial-gradient(circle at 100% 0%, rgba(127, 168, 138, 0.12), transparent 38%),
    linear-gradient(145deg, #f8fbf5, #edf5e9);
  border-color: #d7e6d5;
}

.phenology-page .detail-stage-card strong {
  color: #2f684c;
}

.phenology-page .detail-content :deep(.el-descriptions__label) {
  width: 108px;
  color: #4f6757;
  font-weight: 650;
  background: #f1f6ee !important;
}

.phenology-page .detail-content :deep(.el-descriptions__content) {
  color: #526b5c;
}

.phenology-page .detail-text-card {
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-radius: 10px;
}

.phenology-page .detail-text-card.advice-card {
  background: #eef6ea;
  border-color: #d4e3d2;
}

.phenology-page .detail-text-card h4 {
  color: #355541;
}

.phenology-page .detail-image-button {
  border-color: #dce7da;
  border-radius: 11px;
  box-shadow: 0 8px 18px rgba(58, 88, 63, 0.08);
}

/* 响应式：优先保证中间视觉区不被压缩 */
@media (max-width: 1500px) {
  .phenology-page .page-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .phenology-page .hero-controls {
    width: 100%;
    justify-content: flex-start;
  }

  .phenology-page .model-warning {
    position: static;
    width: 100%;
    margin-top: 10px;
  }

  .phenology-page .workspace-grid {
    grid-template-columns: 290px minmax(520px, 1fr);
  }

  .phenology-page .report-panel {
    grid-column: 1 / -1;
    height: auto;
    min-height: 390px;
  }

  .phenology-page .report-content {
    display: grid;
    grid-template-columns: minmax(240px, 0.9fr) repeat(2, minmax(220px, 1fr));
    align-items: start;
    gap: 12px;
  }

  .phenology-page .stage-overview {
    grid-row: span 2;
  }

  .phenology-page .phase-flow {
    margin: 0;
  }

  .phenology-page .report-section {
    margin-top: 0;
  }

  .phenology-page .report-meta {
    grid-column: 2 / -1;
  }
}

@media (max-width: 1120px) {
  .phenology-page .summary-grid {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }

  .phenology-page .workspace-grid {
    grid-template-columns: 1fr;
  }

  .phenology-page .workspace-card {
    height: 560px;
  }

  .phenology-page .task-panel,
  .phenology-page .viewer-panel,
  .phenology-page .report-panel {
    grid-column: auto;
  }

  .phenology-page .report-content {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .phenology-page .stage-overview {
    grid-row: auto;
  }

  .phenology-page .report-meta {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .phenology-page {
    padding: 10px;
  }

  .phenology-page .page-hero {
    padding: 17px 15px;
  }

  .phenology-page .hero-main {
    min-width: 0;
  }

  .phenology-page .hero-main h2 {
    font-size: 19px;
  }

  .phenology-page .hero-controls,
  .phenology-page .control-item,
  .phenology-page .hero-actions,
  .phenology-page .control-select {
    width: 100%;
  }

  .phenology-page .hero-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .phenology-page .summary-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .phenology-page .workspace-card {
    height: 520px;
  }

  .phenology-page .panel-header,
  .phenology-page .history-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .phenology-page .viewer-toolbar,
  .phenology-page .history-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .phenology-page .task-panel-footer {
    grid-template-columns: 1fr;
  }

  .phenology-page .report-content {
    display: block;
  }

  .phenology-page .report-section {
    margin-top: 12px;
  }

  .phenology-page .history-table-wrapper {
    padding: 10px;
  }

  .phenology-page .detail-images {
    grid-template-columns: 1fr;
  }
}
</style>
