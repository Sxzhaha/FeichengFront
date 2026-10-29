<template>
  <div class="report-page">
    <header class="topbar">
      <div class="brand-area">
        <div class="brand">
        </div>

        <nav class="nav-list" aria-label="病害功能导航">
          <router-link class="nav-item" to="/disease-analysis">病害分析</router-link>
          <div class="nav-dropdown">
            <button type="button" class="nav-item nav-trigger">
              <span>病害识别</span>
              <el-icon class="nav-caret"><ArrowDown /></el-icon>
            </button>
            <div class="nav-menu">
              <router-link class="nav-menu-item" to="/featureDisease">手动上传</router-link>
              <router-link class="nav-menu-item" to="/sxz/disease-auto-task">自动识别</router-link>
            </div>
          </div>
          <router-link class="nav-item" to="/disease-images">识别历史</router-link>
          <router-link class="nav-item active" to="/disease-report" aria-current="page">病害报告</router-link>
        </nav>
      </div>

      <div class="top-actions">
        <button type="button" class="home-button" @click="router.push('/home')">
          <el-icon><House /></el-icon>
          <span>返回首页</span>
        </button>
      </div>
    </header>

    <main class="report-content">
     <!-- 病虫害报告筛选工具栏 -->
<el-card class="filter-card" shadow="never">
  <el-form
    :inline="true"
    :model="queryParams"
    class="filter-form"
  >
    <el-form-item label="病虫害类别">
      <el-input
        v-model="queryParams.categoryName"
        placeholder="请输入病虫害类别"
        clearable
        style="width: 190px"
        @keyup.enter="loadData"
      />
    </el-form-item>

    <el-form-item label="识别方式">
      <el-select
        v-model="queryParams.recognitionMode"
        placeholder="全部"
        clearable
        style="width: 150px"
      >
        <el-option label="手动识别" value="manual" />
        <el-option label="自动识别" value="auto" />
      </el-select>
    </el-form-item>

    <el-form-item label="时间范围">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width: 280px"
      />
    </el-form-item>

    <el-form-item class="filter-actions">
      <el-button
        type="primary"
        @click="loadData"
      >
        查询
      </el-button>

      <el-button @click="resetQuery">
        重置
      </el-button>

      <el-button
        type="primary"
        plain
        @click="generateReport"
      >
        生成报告
      </el-button>

      <el-button
        type="primary"
        @click="exportReport"
      >
        导出报告
      </el-button>

      <!-- <el-button
        type="primary"
        plain
        @click="exportPdfReport"
      >
        导出PDF
      </el-button> -->

      <el-button
        type="primary"
        plain
        @click="exportData"
      >
        数据导出
      </el-button>
    </el-form-item>
  </el-form>
</el-card>
  <div
  v-loading="loading"
  class="main-grid"
>
  <!-- 历史病虫害识别数据 -->
  <el-card class="table-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>
          历史病虫害识别数据
          <em>共 {{ reportRows.length }} 条记录</em>
        </span>

        <div class="table-actions">
          <el-button
            size="small"
            plain
            @click="toggleSelectAll"
          >
            {{ selectAllButtonText }}
          </el-button>

          <el-button
            size="small"
            plain
            @click="exportSelectedData"
          >
            批量导出
          </el-button>
        </div>
      </div>
    </template>

    <div class="table-scroll-area">
      <el-table
        ref="tableRef"
        :data="pagedRows"
        height="100%"
        border
        stripe
        class="data-table"
        empty-text="暂无病虫害识别数据"
        @selection-change="handleSelectionChange"
      >
      <el-table-column
        type="selection"
        width="45"
        align="center"
      />

      <!-- <el-table-column
        prop="recordNo"
        label="识别编号"
        width="145"
        show-overflow-tooltip
      /> -->

      <el-table-column
        label="图片"
        width="88"
        align="center"
      >
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            class="thumb"
            :src="row.imageUrl"
            :preview-src-list="[row.imageUrl]"
            fit="cover"
            preview-teleported
          >
            <template #error>
              <div class="thumb-error">
                无图
              </div>
            </template>
          </el-image>

          <div v-else class="thumb-error">
            无图
          </div>
        </template>
      </el-table-column>

      <el-table-column
        prop="categoryName"
        label="病虫害类别"
        width="135"
        show-overflow-tooltip
      />

      <el-table-column
        label="可信度"
        width="95"
        align="center"
      >
        <template #default="{ row }">
          <span class="green-text">
            {{ row.confidence.toFixed(2) }}%
          </span>
        </template>
      </el-table-column>

      <el-table-column
        prop="resultText"
        label="识别结论"
        min-width="210"
        show-overflow-tooltip
      />

      <el-table-column
        prop="modelName"
        label="识别模型"
        width="145"
        show-overflow-tooltip
      />

      <el-table-column
        prop="createTime"
        label="识别时间"
        width="165"
        align="center"
      />
      </el-table>
    </div>

    <div class="pagination-row">
      <span>
        共 {{ reportRows.length }} 条
      </span>

      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        layout="sizes, prev, pager, next"
        :total="reportRows.length"
      />
    </div>
  </el-card>

  <!-- 报告摘要 -->
  <el-card class="report-summary" shadow="never">
    <template #header>
      <div class="card-header">
        <span>报告摘要</span>

      
      </div>
    </template>

    <el-scrollbar class="summary-scroll">
      <div class="summary-scroll-content">
    <div class="summary-kpis">
      <div class="kpi-item">
        <span>识别总数</span>
        <strong>
          {{ reportSummary.recordCount }}
        </strong>
        <em>条</em>
      </div>

      <div class="kpi-item">
        <span>主要病虫害</span>
        <strong>
          {{ topCategoryName }}
        </strong>
        <em>
          占比 {{ dominantPercent }}%
        </em>
      </div>

      <div class="kpi-item">
        <span>平均置信度</span>
        <strong>
          {{ reportSummary.avgConfidence }}%
        </strong>
        <em>模型结果</em>
      </div>

      <div class="kpi-item">
        <span>风险记录</span>
        <strong>
          {{ warningTotal }}
        </strong>
        <em>条</em>
      </div>
    </div>

    <div class="mini-block">
      <h4>主要病虫害分布</h4>

      <div
        v-if="summaryCategories.length"
        class="category-tags"
      >
        <span
          v-for="item in summaryCategories"
          :key="item.name"
        >
          {{ item.name }}：{{ item.count }}条
        </span>
      </div>

      <el-empty
        v-else
        :image-size="68"
        description="暂无病虫害分布数据"
      />
    </div>

    <div class="mini-block">
      <h4>摘要说明</h4>

      <ul>
        <li>
          本期共形成病虫害识别记录
          {{ reportSummary.recordCount }}
          条，涉及识别图片
          {{ reportSummary.imageCount }}
          张。
        </li>

        <li>
          主要识别结果为
          {{ topCategoryName }}，占比
          {{ dominantPercent }}%。
        </li>

        <li>
          综合风险等级为
          {{ reportSummary.riskLevel }}，建议结合田间实际情况进行复核。
        </li>
      </ul>
    </div>

    <div class="mini-block advice">
      <h4>防治建议</h4>

      <ul>
        <li
          v-for="item in reportSummary.adviceList.slice(0, 3)"
          :key="`${item.diseaseName}-${item.content}`"
        >
          <strong v-if="item.diseaseName">
            {{ item.diseaseName }}：
          </strong>

          {{ item.content }}
        </li>
      </ul>
    </div>
      </div>
    </el-scrollbar>
  </el-card>
</div>
    <el-card
      v-loading="loading"
      class="report-card"
      shadow="never"
    >
      <template #header>
        <div class="card-header">
          <span>病虫害识别分析报告</span>

          <div class="report-actions">
            
          </div>
        </div>
      </template>

      <div ref="paperRef" class="report-paper">
        <h2>病虫害识别分析报告</h2>

        <p class="paper-subtitle">
          生成时间：{{ nowText }}
          ｜统计范围：{{ dateRangeText }}
          ｜数据来源：病虫害识别记录
        </p>

        <section>
          <h3>一、总体情况</h3>
          <p>
            本期共涉及识别图片
            <strong>{{ reportSummary.imageCount }}</strong>
            张，形成有效识别记录
            <strong>{{ reportSummary.recordCount }}</strong>
            条，识别出
            <strong>{{ reportSummary.categoryCount }}</strong>
            类结果。其中，健康记录
            <strong>{{ reportSummary.healthyCount }}</strong>
            条，病虫害异常记录
            <strong>{{ reportSummary.abnormalCount }}</strong>
            条，异常识别占比
            <strong>{{ reportSummary.abnormalRate }}%</strong>，平均识别置信度
            <strong>{{ reportSummary.avgConfidence }}%</strong>。
          </p>

          <p>
            置信度分布：高置信度记录
            {{ reportSummary.highConfidenceCount }}
            条，中等置信度记录
            {{ reportSummary.middleConfidenceCount }}
            条，低置信度记录
            {{ reportSummary.lowConfidenceCount }}
            条。
          </p>

          <p>
            风险统计：高风险
            {{ reportSummary.highRiskCount }}
            条，中风险
            {{ reportSummary.middleRiskCount }}
            条，低风险
            {{ reportSummary.lowRiskCount }}
            条，未标记
            {{ reportSummary.unmarkedRiskCount }}
            条。
          </p>
        </section>

        <section>
          <h3>二、主要识别种类分布</h3>

          <div v-if="reportSummary.categories.length" class="category-tags">
            <span
              v-for="item in reportSummary.categories"
              :key="item.name"
            >
              {{ item.name }}：{{ item.count }}条（{{ item.percent }}%）
            </span>
          </div>

          <p v-else class="empty-text">
            当前统计范围内暂无病虫害识别记录。
          </p>
        </section>

        <section>
          <h3>三、识别质量分析</h3>
          <p>
            本期识别结果的平均置信度为
            <strong>{{ reportSummary.avgConfidence }}%</strong>，最高置信度为
            <strong>{{ reportSummary.maxConfidence }}%</strong>，最低置信度为
            <strong>{{ reportSummary.minConfidence }}%</strong>。
          </p>
          <p>{{ reportSummary.qualityText }}</p>
        </section>

        <section>
          <h3>四、风险研判</h3>
          <p>
            <strong>综合风险等级：{{ reportSummary.riskLevel }}</strong>
          </p>
          <p>{{ reportSummary.riskText }}</p>
        </section>

        <section>
          <h3>五、防治建议</h3>
          <ul>
            <li
              v-for="item in reportSummary.adviceList"
              :key="item.diseaseName"
            >
              <strong>{{ item.diseaseName }}：</strong>{{ item.content }}
            </li>
          </ul>
        </section>

        <section>
          <h3>六、重点关注记录</h3>

          <table
            v-if="reportSummary.focusRecords.length"
            class="focus-record-table"
          >
            <colgroup>
              <col style="width: 18%">
              <col style="width: 14%">
              <col style="width: 14%">
              <col style="width: 28%">
              <col style="width: 26%">
            </colgroup>
            <thead>
              <tr>
                <th>&#35782;&#21035;&#32467;&#26524;</th>
                <th>&#32622;&#20449;&#24230;</th>
                <th>&#39118;&#38505;&#31561;&#32423;</th>
                <th>&#35782;&#21035;&#27169;&#22411;</th>
                <th>&#35782;&#21035;&#26102;&#38388;</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in reportSummary.focusRecords"
                :key="`${row.categoryName}-${row.confidence}-${row.createTime}`"
              >
                <td>{{ row.categoryName }}</td>
                <td>{{ row.confidence }}%</td>
                <td>{{ row.riskLevel }}</td>
                <td>{{ row.modelName }}</td>
                <td>{{ row.createTime }}</td>
              </tr>
            </tbody>
          </table>

          <p v-else class="empty-text">
            当前统计范围内暂无需要重点关注的记录。
          </p>
        </section>
      </div>
      </el-card>
    </main>
  </div>
</template>

<script setup>
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown, House } from '@element-plus/icons-vue'
import { getDiseaseReportSummary } from '@/api/binZhou/sxz/diseaseReport'

const router = useRouter()

const loading = ref(false)
const recognitionList = ref([])
const reportSummary = ref(createEmptySummary())
const dateRange = ref([])
const paperRef = ref(null)
const tableRef = ref(null)

const allRows = ref([])
const selectedRows = ref([])

const pageNum = ref(1)
const pageSize = ref(10)

const queryParams = reactive({
  categoryName: '',
  recognitionMode: ''
})

const nowText = computed(() => new Date().toLocaleString())

const dateRangeText = computed(() => {
  if (!dateRange.value?.length) {
    return '全部时间'
  }

  return `${dateRange.value[0]} 至 ${dateRange.value[1]}`
})

/**
 * 根据病虫害类别、识别方式和时间过滤记录
 */
const reportRows = computed(() => {
  let rows = [...allRows.value]

  if (queryParams.categoryName) {
    rows = rows.filter(row => {
      return String(row.categoryName || '')
        .includes(queryParams.categoryName)
    })
  }

  if (dateRange.value?.length === 2) {
    const startTime = new Date(
      `${dateRange.value[0]} 00:00:00`
    ).getTime()

    const endTime = new Date(
      `${dateRange.value[1]} 23:59:59`
    ).getTime()

    rows = rows.filter(row => {
      const rowTime = getRowTime(row.createTime)

      if (!rowTime) {
        return true
      }

      return (
        rowTime >= startTime &&
        rowTime <= endTime
      )
    })
  }

  return rows
})

/**
 * 当前页数据
 */
const pagedRows = computed(() => {
  const start =
    (pageNum.value - 1) *
    pageSize.value

  return reportRows.value.slice(
    start,
    start + pageSize.value
  )
})

/**
 * 报告摘要中的主要病虫害
 */
const summaryCategories = computed(() => {
  return (
    reportSummary.value.categories || []
  ).slice(0, 6)
})

const topCategoryName = computed(() => {
  return (
    summaryCategories.value[0]?.name ||
    '暂无明显优势种类'
  )
})

const dominantPercent = computed(() => {
  return Number(
    summaryCategories.value[0]?.percent ||
    0
  )
})

const warningTotal = computed(() => {
  return (
    Number(reportSummary.value.highRiskCount || 0) +
    Number(reportSummary.value.middleRiskCount || 0) +
    Number(reportSummary.value.lowRiskCount || 0)
  )
})

const selectAllButtonText = computed(() => {
  const selected =
    pagedRows.value.length > 0 &&
    pagedRows.value.every(row => {
      return selectedRows.value.includes(row)
    })

  return selected
    ? '取消全选'
    : '全选'
})

watch(
  [pageSize, reportRows],
  () => {
    const maxPage = Math.max(
      Math.ceil(
        reportRows.value.length /
        pageSize.value
      ),
      1
    )

    if (pageNum.value > maxPage) {
      pageNum.value = maxPage
    }
  }
)

const imageCount = computed(() => {
  const imageIds = recognitionList.value
    .map(item => item.imageId)
    .filter(Boolean)

  return new Set(imageIds).size
})

const categoryCount = computed(() => {
  const names = recognitionList.value
    .map(item => item.categoryName)
    .filter(name => name && name !== '未知结果')

  return new Set(names).size
})

const healthyCount = computed(() => {
  return recognitionList.value.filter(item => isHealthy(item.categoryName)).length
})

const abnormalCount = computed(() => {
  return Math.max(recognitionList.value.length - healthyCount.value, 0)
})

const abnormalRate = computed(() => {
  if (!recognitionList.value.length) {
    return 0
  }

  return Math.round(
    abnormalCount.value / recognitionList.value.length * 100
  )
})

const topCategories = computed(() => {
  const categoryMap = new Map()

  recognitionList.value.forEach(item => {
    const name = item.categoryName || '未知结果'
    categoryMap.set(name, (categoryMap.get(name) || 0) + 1)
  })

  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percent: recognitionList.value.length
        ? Math.round(count / recognitionList.value.length * 100)
        : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
})

const dominantCategory = computed(() => {
  return topCategories.value[0]?.name || '暂无明显优势种类'
})

const confidenceValues = computed(() => {
  return recognitionList.value
    .map(item => Number(item.confidence || 0))
    .filter(value => Number.isFinite(value))
})

const avgConfidence = computed(() => {
  if (!confidenceValues.value.length) {
    return 0
  }

  const total = confidenceValues.value.reduce(
    (sum, value) => sum + value,
    0
  )

  return Math.round(total / confidenceValues.value.length)
})

const maxConfidence = computed(() => {
  if (!confidenceValues.value.length) {
    return 0
  }

  return Math.round(Math.max(...confidenceValues.value))
})

const minConfidence = computed(() => {
  if (!confidenceValues.value.length) {
    return 0
  }

  return Math.round(Math.min(...confidenceValues.value))
})

const confidenceStats = computed(() => {
  return confidenceValues.value.reduce(
    (stats, value) => {
      if (value >= 90) {
        stats.high += 1
      } else if (value >= 70) {
        stats.middle += 1
      } else {
        stats.low += 1
      }

      return stats
    },
    {
      high: 0,
      middle: 0,
      low: 0
    }
  )
})

const warningStats = computed(() => {
  return recognitionList.value.reduce(
    (stats, item) => {
      const level = String(item.riskLevel || '')

      if (level.includes('高')) {
        stats.high += 1
      } else if (level.includes('中')) {
        stats.middle += 1
      } else if (level.includes('低')) {
        stats.low += 1
      } else {
        stats.none += 1
      }

      return stats
    },
    {
      high: 0,
      middle: 0,
      low: 0,
      none: 0
    }
  )
})

const riskLevel = computed(() => {
  if (!recognitionList.value.length) {
    return '暂无数据'
  }

  if (abnormalRate.value >= 70) {
    return '高风险'
  }

  if (abnormalRate.value >= 40) {
    return '中风险'
  }

  return '低风险'
})

const riskText = computed(() => {
  if (!recognitionList.value.length) {
    return '当前统计范围内暂无病虫害识别记录，建议调整查询时间范围或先完成病虫害识别。'
  }

  if (riskLevel.value === '高风险') {
    return `本期共识别 ${recognitionList.value.length} 条记录，其中病虫害异常记录 ${abnormalCount.value} 条，异常识别占比为 ${abnormalRate.value}%，处于 70%—100% 区间，综合风险等级判定为高风险。主要识别结果为 ${dominantCategory.value}，占全部记录的 ${dominantPercent.value}%。建议立即开展田间复核，确认病虫害发生范围和危害程度，并及时实施针对性防治。`
  }

  if (riskLevel.value === '中风险') {
    return `本期共识别 ${recognitionList.value.length} 条记录，其中病虫害异常记录 ${abnormalCount.value} 条，异常识别占比为 ${abnormalRate.value}%，处于 40%—70% 区间，综合风险等级判定为中风险。主要识别结果为 ${dominantCategory.value}。建议提高重点区域图像采集和巡查频次，持续关注病虫害数量及置信度变化。`
  }

  return `本期共识别 ${recognitionList.value.length} 条记录，其中病虫害异常记录 ${abnormalCount.value} 条，异常识别占比为 ${abnormalRate.value}%，处于 0%—40% 区间，综合风险等级判定为低风险。建议保持常态化监测，重点关注 ${dominantCategory.value} 等主要识别结果的后续变化。`
})

const qualityText = computed(() => {
  if (!recognitionList.value.length) {
    return '暂无识别数据，暂时无法开展识别质量分析。'
  }

  if (avgConfidence.value >= 90) {
    return '整体识别置信度较高，模型输出结果较为稳定，可结合人工抽检对重点风险记录进行复核。'
  }

  if (avgConfidence.value >= 75) {
    return '整体识别置信度处于可用水平，但部分记录仍存在不确定性，建议对中低置信度图片进行人工复核。'
  }

  return '整体识别置信度偏低，建议检查图像清晰度、拍摄角度和模型适用范围，并补充相关病虫害训练样本。'
})

const adviceList = computed(() => {
  const sourceAdvice = recognitionList.value
    .map(item => String(item.advice || '').trim())
    .filter(Boolean)

  const uniqueAdvice = Array.from(new Set(sourceAdvice)).slice(0, 4)

  if (uniqueAdvice.length) {
    return uniqueAdvice
  }

  if (riskLevel.value === '高风险') {
    return [
      '立即对高风险识别记录对应区域开展田间复核，确认病虫害种类、发生范围和危害程度。',
      '根据病虫害类型优先采用农业防治、物理防治和生物防治措施，必要时按植保要求进行精准施药。',
      '缩短图像采集和识别周期，持续跟踪重点病虫害数量、置信度和风险等级变化。',
      '对低置信度或疑似误识别图片进行人工复核，并将有效样本补充到模型训练数据集中。'
    ]
  }

  if (riskLevel.value === '中风险') {
    return [
      '提高重点区域的巡查频次，关注主要病虫害识别数量及其变化趋势。',
      '检查摄像头、采集设备和网络连接状态，保证识别图片清晰、完整、连续。',
      '优先采用绿色防控措施，对集中出现病虫害的局部区域实施精准处置。',
      '定期复核中低置信度记录，防止病虫害漏检、误检影响风险判断。'
    ]
  }

  return [
    '保持常态化病虫害监测和设备巡检，保证识别数据连续稳定。',
    '持续关注主要识别种类变化，发现异常记录快速增加时及时开展人工复核。',
    '做好田间卫生和农业防治，及时清理病残枝叶，降低病虫害发生基础。',
    '定期整理识别结果和误识别样本，为后续模型优化提供数据支持。'
  ]
})

const focusRecords = computed(() => {
  return recognitionList.value
    .filter(item => {
      return (
        item.riskLevel.includes('高') ||
        item.riskLevel.includes('中') ||
        (!isHealthy(item.categoryName) && item.confidence < 75)
      )
    })
    .sort((a, b) => {
      return (
        getRiskWeight(b.riskLevel) - getRiskWeight(a.riskLevel) ||
        b.confidence - a.confidence
      )
    })
    .slice(0, 10)
})



onMounted(loadData)

function buildSummaryQuery(diseaseIds = []) {
  const summaryQuery = {}
  if (queryParams.categoryName.trim()) {
    summaryQuery.categoryName = queryParams.categoryName.trim()
  }
  if (queryParams.recognitionMode) {
    summaryQuery.recognitionMode = queryParams.recognitionMode
  }
  if (dateRange.value?.length) {
    summaryQuery.beginDate = dateRange.value[0]
    summaryQuery.endDate = dateRange.value[1]
  }
  if (diseaseIds.length) {
    summaryQuery.diseaseIds = diseaseIds.join(',')
  }
  return summaryQuery
}

async function loadData() {
  loading.value = true

  try {
    const summaryQuery = buildSummaryQuery()

    const summaryResponse =
  await getDiseaseReportSummary(summaryQuery)

const data = summaryResponse.data || {}

reportSummary.value =
  normalizeSummary(data)

const records = Array.isArray(data.records)
  ? data.records
  : data.focusRecords || []

allRows.value =
  records.map(normalizeRecord)

recognitionList.value =
  allRows.value

selectedRows.value = []
pageNum.value = 1
  } catch (error) {
    console.error('病虫害报告数据加载失败：', error)
    recognitionList.value = []
    allRows.value = []
    selectedRows.value = []
    reportSummary.value = createEmptySummary()
    ElMessage.error('病虫害报告数据加载失败')
  } finally {
    loading.value = false
  }
}

function createEmptySummary() {
  return {
    imageCount: 0,
    recordCount: 0,
    categoryCount: 0,
    healthyCount: 0,
    abnormalCount: 0,
    abnormalRate: 0,
    avgConfidence: 0,
    highConfidenceCount: 0,
    middleConfidenceCount: 0,
    lowConfidenceCount: 0,
    highRiskCount: 0,
    middleRiskCount: 0,
    lowRiskCount: 0,
    unmarkedRiskCount: 0,
    maxConfidence: 0,
    minConfidence: 0,
    riskLevel: '暂无数据',
    riskText: '当前统计范围内暂无病虫害识别记录。',
    qualityText: '暂无识别数据，暂时无法开展识别质量分析。',
    categories: [],
    adviceList: [],
    focusRecords: []
  }
}

function normalizeSummary(data = {}) {
  const summary = createEmptySummary()
  Object.keys(summary)
    .filter(key => typeof summary[key] === 'number')
    .forEach(key => { summary[key] = Number(data[key] || 0) })
  summary.riskLevel = data.riskLevel || summary.riskLevel
  summary.riskText = data.riskText || summary.riskText
  summary.qualityText = data.qualityText || summary.qualityText
  summary.categories = data.categories || []
  summary.adviceList = data.adviceList || []
  summary.focusRecords = data.focusRecords || []
  return summary
}

function normalizeRecord(item = {}) {
  const categoryName =
    item.categoryName ||
    item.diseaseName ||
    item.pestName ||
    item.recognitionName ||
    item.resultName ||
    item.className ||
    '未知结果'

  const imageId =
    item.imageId ||
    item.image_id ||
    ''

  const recordId =
    item.recordId ||
    item.id ||
    item.resultId ||
    imageId ||
    '-'

  return {
    raw: item,

    diseaseId:
      item.diseaseId ||
      item.disease_id ||
      null,

    recordNo:
      item.recordNo ||
      `DISEASE-${recordId}`,

    imageId,

    imageUrl: normalizeImageUrl(
      item.imageUrl ||
      item.resultImageUrl ||
      item.pestResultImgUrl ||
      ''
    ),

    categoryName,

    confidence: toPercent(
      item.confidence ??
      item.pestConfidence ??
      item.score ??
      item.probability
    ),

    riskLevel:
      item.riskLevel ||
      item.warningLevel ||
      item.riskGrade ||
      '未标记',

    resultText:
      item.resultText ||
      item.recognitionResult ||
      item.pestResult ||
      item.result ||
      `识别结果为${categoryName}`,

    advice:
      item.advice ||
      item.controlAdvice ||
      item.pestAdvice ||
      '',

    modelName:
      item.modelName ||
      item.modelCode ||
      '未记录',

    createTime:
      item.createTime ||
      item.recognitionTime ||
      item.predictTime ||
      item.updateTime ||
      '-'
  }
}

function toPercent(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(
    (number <= 1 ? number * 100 : number).toFixed(2)
  )
}

function isHealthy(name) {
  return ['健康', '正常', '无病虫害'].some(keyword => {
    return String(name || '').includes(keyword)
  })
}

function getRiskWeight(level) {
  const text = String(level || '')

  if (text.includes('高')) {
    return 3
  }

  if (text.includes('中')) {
    return 2
  }

  if (text.includes('低')) {
    return 1
  }

  return 0
}

function resetQuery() {
  queryParams.categoryName = ''
  queryParams.recognitionMode = ''
  dateRange.value = []
  pageNum.value = 1

  loadData()
}

async function generateReport() {
  if (!selectedRows.value.length && !reportRows.value.length) {
    ElMessage.warning('暂无数据可生成报告')
    return
  }

  const diseaseIds = Array.from(new Set(
    selectedRows.value
      .map(row => Number(row.diseaseId))
      .filter(id => Number.isSafeInteger(id) && id > 0)
  ))

  if (selectedRows.value.length && diseaseIds.length !== selectedRows.value.length) {
    ElMessage.warning('部分选中记录缺少病害结果编号，请刷新数据后重试')
    return
  }

  loading.value = true
  try {
    const response = await getDiseaseReportSummary(
      buildSummaryQuery(diseaseIds)
    )
    const data = response.data || {}
    reportSummary.value = normalizeSummary(data)
    recognitionList.value = Array.isArray(data.records)
      ? data.records.map(normalizeRecord)
      : selectedRows.value.length
        ? [...selectedRows.value]
        : [...reportRows.value]

    const scopeText = diseaseIds.length
      ? `已选择的 ${diseaseIds.length} 条记录`
      : '当前筛选条件'
    ElMessage.success(`已根据${scopeText}生成报告`)

    paperRef.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  } catch (error) {
    console.error('病虫害报告生成失败：', error)
    ElMessage.error('病虫害报告生成失败')
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function toggleSelectAll() {
  if (
    !tableRef.value ||
    !pagedRows.value.length
  ) {
    return
  }

  const shouldSelect =
    !pagedRows.value.every(row => {
      return selectedRows.value.includes(row)
    })

  pagedRows.value.forEach(row => {
    tableRef.value.toggleRowSelection(
      row,
      shouldSelect
    )
  })
}

function exportSelectedData() {
  const rows =
    selectedRows.value.length
      ? selectedRows.value
      : reportRows.value

  exportRows(
    rows,
    `病虫害识别结果_${Date.now()}.xls`
  )
}

function exportPdfReport() {
  const content =
    paperRef.value?.innerHTML ||
    ''

  if (!content) {
    ElMessage.warning(
      '暂无报告内容可导出PDF'
    )
    return
  }

  const printWindow =
    window.open('', '_blank')

  if (!printWindow) {
    ElMessage.error(
      '浏览器阻止了打印窗口，请允许弹窗后重试'
    )
    return
  }

  printWindow.document.write(`
    <html>
      <head>
        <meta charset="UTF-8">

        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          body {
            font-family:
              "Microsoft YaHei",
              SimSun,
              Arial,
              sans-serif;
            color: #25332f;
            line-height: 1.9;
          }

          h2 {
            text-align: center;
          }

          h3 {
            color: #0f7b5c;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            padding: 8px;
            border: 1px solid #d9e2df;
            color: #25332f;
            word-break: break-all;
            vertical-align: middle;
          }

          th {
            font-weight: 700;
            text-align: center;
          }
        </style>
      </head>

      <body>${content}</body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()

  window.setTimeout(() => {
    printWindow.print()
  }, 300)
}

function getRowTime(value) {
  if (!value || value === '-') {
    return null
  }

  const time =
    new Date(value).getTime()

  return Number.isNaN(time)
    ? null
    : time
}

function normalizeImageUrl(url) {
  if (!url) {
    return ''
  }

  if (
    /^(http|https|data|blob):/.test(url)
  ) {
    return url
  }

  const baseApi =
    import.meta.env.VITE_APP_BASE_API ||
    ''

  if (url.startsWith('/')) {
    return `${baseApi}${url}`
  }

  return `${baseApi}/${url}`
}

function goTo(path) {
  router.push(path)
}

function showBuilding() {
  ElMessage.info('功能建设中')
}

function exportReport() {
  const content = paperRef.value?.innerHTML || ''

  if (!content) {
    ElMessage.warning('暂无报告内容可导出')
    return
  }

  const reportHtml = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: "Microsoft YaHei", sans-serif;
            color: #25332f;
            line-height: 1.9;
          }

          h2 {
            text-align: center;
          }

          h3 {
            margin-top: 24px;
            color: #0f7b5c;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            padding: 8px;
            border: 1px solid #d9e2df;
            color: #25332f;
            word-break: break-all;
            vertical-align: middle;
          }

          th {
            font-weight: 700;
            text-align: center;
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `

  const blob = new Blob(
    [reportHtml],
    {
      type: 'application/msword;charset=utf-8;'
    }
  )

  downloadBlob(
    blob,
    `病虫害识别分析报告_${Date.now()}.doc`
  )
}

function exportRows(rows, fileName) {
  if (!rows.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = [
    '识别编号',
    '图片ID',
    '病虫害类别',
    '置信度',
    '风险等级',
    '识别结论',
    '防治建议',
    '识别模型',
    '识别时间'
  ]
  const dataRows = rows.map(item => [
    item.recordNo,
    item.imageId,
    item.categoryName,
    `${item.confidence}%`,
    item.riskLevel,
    item.resultText,
    item.advice,
    item.modelName,
    item.createTime
  ])
  const tableHtml = `
    <table border="1">
      <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      ${dataRows.map(row => `
        <tr>${row.map(value => `<td>${escapeHtml(value ?? '')}</td>`).join('')}</tr>
      `).join('')}
    </table>
  `
  const blob = new Blob(
    [`<html><head><meta charset="UTF-8"></head><body>${tableHtml}</body></html>`],
    { type: 'application/vnd.ms-excel;charset=utf-8;' }
  )

  downloadBlob(blob, fileName)
}

function exportData() {
  exportRows(
    reportRows.value,
    `病虫害识别结果_${Date.now()}.xls`
  )
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.report-page {
  width: 100vw;
  max-width: none;
  min-width: 1180px;
  min-height: 100vh;
  color: #263238;
  background: #f5f7f8;
  font-family: "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  box-sizing: border-box;
  height: 88px;
  padding: 0 32px 0 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #edf1f3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.brand-area,
.brand,
.top-actions {
  display: flex;
  align-items: center;
}

.brand-area {
  gap: 0;
}

.brand {
  width: 0;
  gap: 0;
  overflow: hidden;
  color: #173f33;
  font-size: 18px;
  font-weight: 700;
}

.nav-list {
  height: 88px;
  display: flex;
  align-items: center;
  gap: 46px;
  flex-shrink: 0;
}

.nav-item {
  position: relative;
  height: 88px;
  display: flex;
  align-items: center;
  color: #65736f;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 220ms ease, transform 220ms ease;
  touch-action: manipulation;
}

.nav-item::after {
  content: "";
  position: absolute;
  right: 8px;
  bottom: 0;
  left: 8px;
  height: 4px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(90deg, #50a879 0%, #5c85e8 100%);
  opacity: 0;
  transform: scaleX(0.35);
  transform-origin: center;
  transition: opacity 220ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-item:hover {
  color: #347e59;
  transform: translateY(-1px);
}

.nav-item:hover::after {
  opacity: 0.42;
  transform: scaleX(0.6);
}

.nav-item:focus-visible {
  outline: 2px solid rgba(79, 132, 225, 0.78);
  outline-offset: -6px;
  border-radius: 6px;
}

.nav-item.active {
  color: #347e59;
  font-weight: 700;
}

.nav-item.active::after {
  opacity: 1;
  transform: scaleX(1);
}

.nav-dropdown {
  position: relative;
  height: 88px;
  display: flex;
  align-items: center;
}

.nav-trigger {
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
}

.nav-caret {
  font-size: 13px;
  transition: transform 200ms ease;
}

.nav-dropdown:hover .nav-caret,
.nav-dropdown:focus-within .nav-caret {
  transform: rotate(180deg);
}

.nav-menu {
  position: absolute;
  top: 72px;
  left: 50%;
  z-index: 40;
  min-width: 150px;
  padding: 8px;
  display: grid;
  gap: 4px;
  border: 1px solid #ddebe5;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 34px rgba(32, 78, 58, 0.14);
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform: translate(-50%, 8px) scale(0.98);
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms ease;
}

.nav-menu::before {
  content: "";
  position: absolute;
  top: -12px;
  right: 0;
  left: 0;
  height: 12px;
}

.nav-dropdown:hover .nav-menu,
.nav-dropdown:focus-within .nav-menu {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transform: translate(-50%, 0) scale(1);
}

.nav-menu-item {
  min-height: 36px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  color: #51635d;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 6px;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
}

.nav-menu-item:hover,
.nav-menu-item.active {
  color: #25794f;
  background: #eef9f4;
}

.nav-menu-item:hover {
  transform: translateX(2px);
}

@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-item::after,
  .nav-caret,
  .nav-menu,
  .nav-menu-item,
  .home-button {
    transition: none;
  }

  .nav-item:hover,
  .nav-menu-item:hover,
  .home-button:hover {
    transform: none;
  }
}

.new-badge {
  margin-right: 5px;
  padding: 2px 5px;
  color: #109b68;
  font-size: 9px;
  border: 1px solid #baf0d8;
  border-radius: 5px;
  background: #e9fff6;
}

.top-actions {
  margin-left: auto;
  gap: 10px;
  flex-shrink: 0;
}

.home-button {
  min-width: 116px;
  height: 44px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #2f7d58;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #c9e4d8;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f5fbf8 100%);
  box-shadow: 0 4px 12px rgba(35, 105, 76, 0.08);
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}

.home-button .el-icon {
  font-size: 17px;
}

.home-button:hover {
  color: #1f6f4a;
  border-color: #8fcbb1;
  background: #eef9f4;
  box-shadow: 0 8px 18px rgba(35, 105, 76, 0.14);
  transform: translateY(-1px);
}

.home-button:active {
  box-shadow: 0 3px 8px rgba(35, 105, 76, 0.1);
  transform: translateY(0) scale(0.98);
}

.home-button:focus-visible {
  outline: 2px solid rgba(79, 132, 225, 0.78);
  outline-offset: 3px;
}

.report-content {
  width: 100%;
  padding: 16px 18px 22px;
}

/* 查询工具栏 */
.filter-card {
  margin-bottom: 14px;
  border: 1px solid #edf1f4;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(31, 45, 61, 0.04);
}

.filter-card :deep(.el-card__body) {
  box-sizing: border-box;
  min-height: 92px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
}

.filter-form {
  width: 100%;
  display: grid;
  grid-template-columns: max-content max-content max-content minmax(max-content, 1fr);
  align-items: center;
  gap: 20px;
}

.filter-form :deep(.el-form-item) {
  flex: none;
  margin-right: 0;
  margin-bottom: 0;
}

.filter-actions {
  margin-left: 0;
  justify-self: end;
}

.filter-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
  white-space: nowrap;
}

/* 历史数据和报告摘要双栏布局 */
.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 14px;
  align-items: stretch;
}

.table-card,
.report-summary {
  height: 650px;
  display: flex;
  flex-direction: column;
  border: 1px solid #edf1f4;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(31, 45, 61, 0.04);
}

.table-card :deep(.el-card__header),
.report-summary :deep(.el-card__header) {
  flex: none;
}

.table-card :deep(.el-card__body) {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}

.report-summary :deep(.el-card__body) {
  min-height: 0;
  flex: 1;
  padding: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.card-header em {
  margin-left: 8px;
  color: #889692;
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
}

/* 表格 */
.data-table {
  width: 100%;
  height: 100%;
  font-size: 13px;
}

.table-scroll-area {
  min-height: 0;
  flex: 1;
}

.thumb,
.thumb-error {
  width: 52px;
  height: 36px;
  border-radius: 4px;
}

.thumb {
  display: block;
  background: #f5f7fa;
}

.thumb-error {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a8abb2;
  font-size: 12px;
  background: #f5f7fa;
}

.green-text {
  color: #12a878;
  font-weight: 700;
}

.pagination-row {
  min-height: 56px;
  padding: 10px 12px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #758480;
}

/* 报告摘要 */
.summary-scroll {
  height: 100%;
}

.summary-scroll-content {
  padding: 20px;
}

.summary-kpis {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.kpi-item {
  min-width: 0;
  padding: 14px;
  border: 1px solid #edf1f4;
  border-radius: 8px;
  background: #fbfcfd;
}

.kpi-item span {
  display: block;
  color: #758480;
  font-size: 12px;
}

.kpi-item strong {
  margin: 6px 0 2px;
  display: block;
  overflow: hidden;
  color: #12a878;
  font-size: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi-item em {
  color: #9aa6a3;
  font-size: 12px;
  font-style: normal;
}

.mini-block {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #edf1f4;
  border-radius: 8px;
  background: #fff;
}

.mini-block h4 {
  margin: 0 0 10px;
  color: #25332f;
}

.mini-block ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
}

.mini-block li + li {
  margin-top: 4px;
}

.advice {
  background: #f8fffb;
}

/* 原报告预览与上方模块拉开距离 */
.report-card {
  margin-top: 14px;
}

.summary-row {
  margin-bottom: 16px;
}

.stat-card {
  min-height: 122px;
  margin-bottom: 12px;
  padding: 20px;
  border: 1px solid #edf1f4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(31, 45, 61, 0.04);
}

.stat-card span {
  display: block;
  color: #758480;
  font-size: 13px;
}

.stat-card strong {
  margin: 8px 0;
  display: block;
  color: #12a878;
  font-size: 28px;
}

.stat-card em {
  color: #9aa6a3;
  font-style: normal;
}

.report-card {
  border: 1px solid #edf1f4;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(31, 45, 61, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 700;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.report-paper {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 42px;
  color: #25332f;
  line-height: 1.9;
  background: #fff;
}

.report-paper h2 {
  margin: 0 0 8px;
  font-size: 28px;
  text-align: center;
}

.paper-subtitle {
  padding-bottom: 18px;
  color: #7d8b87;
  text-align: center;
  border-bottom: 1px solid #e8edf0;
}

.report-paper h3 {
  margin-top: 24px;
  color: #0f7b5c;
}

.report-paper strong {
  color: #0f7b5c;
}

.focus-record-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.focus-record-table th,
.focus-record-table td {
  padding: 8px;
  border: 1px solid #d9e2df;
  color: #25332f;
  word-break: break-all;
  vertical-align: middle;
}

.focus-record-table th {
  font-weight: 700;
  text-align: center;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.category-tags span {
  padding: 8px 12px;
  color: #0f7b5c;
  border-radius: 999px;
  background: #eefbf6;
}

.empty-text {
  color: #8b9894;
}

@media (max-width: 1700px) {
  .filter-form {
    grid-template-columns: max-content max-content max-content minmax(max-content, 1fr);
    gap: 12px;
  }

  .filter-actions {
    width: auto;
    grid-column: auto;
    justify-self: end;
    margin-top: 0;
    margin-left: 0;
  }

  .filter-actions :deep(.el-form-item__content) {
    width: auto;
    justify-content: flex-end;
  }

  .filter-actions :deep(.el-button) {
    padding-right: 12px;
    padding-left: 12px;
  }
}

@media (max-width: 1366px) {
  .topbar {
    padding-right: 24px;
    padding-left: 32px;
  }

  .nav-list {
    gap: 32px;
  }

  .nav-item {
    font-size: 17px;
  }
  .main-grid {
  grid-template-columns: minmax(0, 1fr) 390px;
}
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 768px) {
  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .report-paper {
    padding: 20px;
  }
}
</style>
