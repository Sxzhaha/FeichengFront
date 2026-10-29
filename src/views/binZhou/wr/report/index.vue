<template>
  <div class="agri-report-page">
    <div class="report-shell">
      <section class="push-service-card hide-on-print">
        <div class="push-service-header">
          <div>
            <h2>农情定制定时推送服务</h2>
          </div>
          <div class="push-header-actions">
            <el-button @click="openNotificationCenter">
              <el-badge :value="unreadCount" :hidden="!unreadCount" :max="99">消息中心</el-badge>
            </el-button>
            <span>{{ pushRule.enabled ? '推送已启用' : '推送未启用' }}</span>
          </div>
        </div>
        <div class="push-config-grid">
          <div class="push-config-item">
            <span class="config-label">报告角色</span>
            <el-radio-group v-model="roleType" @change="handleRoleChange">
              <el-radio-button v-for="item in roleOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button>
            </el-radio-group>
          </div>
          <div class="push-config-item">
            <span class="config-label">接收频率</span>
            <el-radio-group v-model="pushRule.frequency">
              <el-radio label="realtime">即时触发</el-radio>
              <el-radio label="daily">每天 08:00</el-radio>
              <el-radio label="weekly">每周一 09:00</el-radio>
              <el-radio label="monthly">每月 1 日 09:00</el-radio>
            </el-radio-group>
          </div>
          <div class="push-config-item">
            <span class="config-label">接收渠道</span>
            <el-radio-group v-model="pushRule.channel"><el-radio label="system">系统内部通知</el-radio></el-radio-group>
          </div>
        </div>
        <div class="push-service-footer">
          <div class="current-rule">
            <span class="current-rule-label">当前规则</span>
            <span class="current-rule-text">{{ pushRuleSummary }}</span>
          </div>
          <div class="push-footer-actions">
            <el-switch v-model="pushRule.enabled" active-text="启用推送" inactive-text="暂停推送" />
            <el-button type="primary" :loading="pushSaving" @click="savePushRule">保存推送规则</el-button>
          </div>
        </div>
      </section>

      <div class="toolbar hide-on-print">
        <div class="toolbar-row">
          <div class="toolbar-left">
            <div class="toolbar-group">
              <span class="toolbar-label">统计周期</span>
              <el-radio-group v-model="rangePreset" @change="handleRangePresetChange">
                <el-radio-button value="all">全部</el-radio-button>
                <el-radio-button value="week">本周</el-radio-button>
                <el-radio-button value="month">本月</el-radio-button>
                <el-radio-button value="custom">自定义</el-radio-button>
              </el-radio-group>
            </div>
            <div v-if="rangePreset === 'custom'" class="toolbar-group">
              <el-date-picker v-model="rangeValue" type="daterange" unlink-panels :clearable="false" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="handleDateChange"/>
            </div>
          </div>
          <div class="toolbar-right">
            <el-button :loading="loading" @click="fetchReport">刷新报告</el-button>
            <el-button type="primary" :loading="pdfLoading" :disabled="loading || !reportMatchesFilters" @click="exportToPDF">导出 PDF</el-button>
          </div>
        </div>

        <div class="toolbar-row toolbar-second">
          <div class="toolbar-group">
            <span class="toolbar-label">报告视角</span>
            <el-select v-model="roleType" class="role-select" @change="handleRoleChange">
              <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value"/>
            </el-select>
          </div>
          <div class="toolbar-group">
            <span class="toolbar-label">园区</span>
            <el-select v-model="parkId" class="park-select" placeholder="全部园区" clearable>
              <el-option label="全部园区" :value="''"/>
              <el-option v-for="item in parkOptions" :key="item.id" :label="item.name" :value="item.id"/>
            </el-select>
          </div>
        </div>
      </div>

      <el-alert v-if="reportError" :title="reportError" type="error" :closable="false" show-icon />
      <main id="report-content" class="report-paper" v-loading="loading">
        <header class="report-header">
          <div class="print-report-label">农业生产监测分析报告</div>
          <h1>{{ reportTitle }}</h1>
          <p class="report-subtitle">{{ roleConfig.description }}</p>
          <div class="report-meta">
            <span>统计周期：{{ reportMeta.rangeText }}</span>
            <span>生成时间：{{ reportMeta.generatedAt }}</span>
            <span>统计范围：{{ reportMeta.parkName }}</span>
          </div>
          <p class="data-source">数据来源：{{ reportMeta.dataSource }}</p>
        </header>
          <div class="print-page-footer">农情综合分析报告　|　{{ reportMeta.generatedAt }}</div>


        <section class="report-overview">
          <div class="overview-item">
            <span class="overview-label">综合风险</span>
            <strong class="overview-value" :class="'overview-value--' + report.summary.overallRiskClass">{{ report.summary.overallRisk }}</strong>
          </div>
          <div class="overview-item">
            <span class="overview-label">气象预警</span>
            <strong class="overview-value">{{ report.weather.total || 0 }} 条</strong>
          </div>
          <div class="overview-item">
            <span class="overview-label">病害异常</span>
            <strong class="overview-value">{{ report.disease.warningCount || 0 }} 条</strong>
          </div>
          <div class="overview-item">
            <span class="overview-label">虫情记录</span>
            <strong class="overview-value">{{ report.pest.total || 0 }} 条</strong>
          </div>
          <div class="overview-item">
            <span class="overview-label">农事任务</span>
            <strong class="overview-value">{{ report.task.total || 0 }} 项</strong>
          </div>
        </section>

        <section class="report-section">
          <h2>一、总体情况</h2>
          <p>
            本报告统计期内，气象环境预警共 <strong>{{ report.weather.total || 0 }}</strong> 条，
            病虫害异常识别 <strong>{{ report.disease.warningCount || 0 }}</strong> 条，
            虫情识别记录 <strong>{{ report.pest.total || 0 }}</strong> 条，
            农事任务 <strong>{{ report.task.total || 0 }}</strong> 项。
          </p>
          <p>
            综合风险等级为 <strong>{{ report.summary.overallRisk }}</strong>。
            {{ report.summary.conclusion }}
          </p>
          <p><strong>综合研判：</strong>{{ report.summary.riskAssessment }}</p>
        </section>

        <section class="report-section">
          <h2>二、气象与环境预警</h2>
          <template v-if="report.weather.hasData">
            <p>
              本期共监测到预警 <strong>{{ report.weather.total }}</strong> 条，其中高风险
              <strong>{{ report.weather.levelStats.high }}</strong> 条，中风险
              <strong>{{ report.weather.levelStats.medium }}</strong> 条，常规风险
              <strong>{{ report.weather.levelStats.low }}</strong> 条。最高气温为
              <strong>{{ report.weather.extremes.maxTemp }}</strong>。
            </p>
            <div v-if="report.weather.topRows.length" class="record-list">
              <h3>重点预警记录</h3>
              <div class="report-table-wrap">
                                <table class="report-table weather-warning-table">
                  <thead>
                    <tr>
                      <th class="col-index text-center">序号</th>
                      <th class="col-time text-center">预警时间</th>
                      <th class="col-device text-center">设备</th>
                      <th class="col-indicator">监测指标</th>
                      <th class="col-value text-center">监测值</th>
                      <th class="col-level text-center">风险等级</th>
                      <th class="col-suggestion">处置建议</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in report.weather.topRows" :key="row.id">
                      <td class="text-center">{{ index + 1 }}</td>
                      <td class="text-center">{{ row.time }}</td>
                      <td class="text-center">{{ row.device }}</td>
                      <td>{{ row.indicator }}</td>
                      <td class="text-center">{{ row.value }}</td>
                      <td class="text-center">{{ row.levelText }}</td>
                      <td>{{ row.suggestion }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          <p v-else class="empty-text">{{ emptyMessage }}</p>
        </section>

        <section class="report-section pest-disease-section">
          <h2>三、病虫害识别分析</h2>
          <template v-if="report.disease.hasData">
           

            <div class="report-stat-grid">
              <div class="report-stat-item">
                <span>识别记录</span>
                <strong>{{ report.disease.total }}</strong>
                <small>条</small>
              </div>
              <div class="report-stat-item">
                <span>异常记录</span>
                <strong>{{ report.disease.warningCount }}</strong>
                <small>条</small>
              </div>
              <div class="report-stat-item">
                <span>异常占比</span>
                <strong>{{ report.disease.warningRate }}</strong>
                <small>%</small>
              </div>
              <div class="report-stat-item">
                <span>平均置信度</span>
                <strong>{{ report.disease.avgConfidence }}</strong>
                <small>%</small>
              </div>
            </div>

            <h3>（一）风险等级分布</h3>
            <div class="risk-summary-row">
              <span><b>高风险</b>{{ report.disease.levelStats.high }} 条</span>
              <span><b>中风险</b>{{ report.disease.levelStats.medium }} 条</span>
              <span><b>低风险</b>{{ report.disease.levelStats.low }} 条</span>
            </div>

            <h3>（二）病害类型分布</h3>
            <div v-if="report.disease.typeStats.length" class="report-table-wrap">
              <table class="report-table compact-table">
              <thead>
                                <tr>
                  <th class="col-index text-center">序号</th>
                  <th class="text-center">病害类型</th>
                  <th class="text-center">识别数量</th>
                  <th class="text-center">占比</th>
                  <th class="text-center">平均置信度</th>
                  <th class="text-center">最近识别时间</th>
                </tr>
              </thead>
              <tbody>
                                <tr v-for="(item, index) in report.disease.typeStats" :key="item.name">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td class="text-center">{{ item.name || item.stage }}</td>
                  <td class="text-center">{{ item.count }} 条</td>
                  <td class="text-center">{{ item.rate }}%</td>
                  <td class="text-center">{{ item.avgConfidence || item.confidence || '--' }}%</td>
                  <td class="text-center">{{ item.lastTime || item.time || '--' }}</td>
                </tr>
              </tbody>
              </table>
            </div>
            <p v-else class="empty-text">暂未返回病害类型统计数据。</p>

            <div v-if="report.disease.topRows.length" class="record-list">
              <h3>（四）重点病害识别记录</h3>
              <div class="report-table-wrap">
                                <table class="report-table compact-table">
                <thead>
                                    <tr>
                    <th class="col-index text-center">序号</th>
                    <th class="text-center">识别类型</th>
                    <th class="text-center">识别置信度</th>
                    <th class="text-center">风险等级</th>
                    <th class="text-center">识别时间</th>
                  </tr>
                </thead>
                <tbody>
                                    <tr v-for="(row, index) in report.disease.topRows" :key="row.id">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td class="text-center">{{ row.name }}</td>
                    <td class="text-center">{{ row.confidence }}%</td>
                    <td class="text-center">{{ row.levelText }}</td>
                    <td class="text-center">{{ row.time }}</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </template>
          <p v-else class="empty-text">{{ emptyMessage }}</p>
        </section>

        <section class="report-section">
          <h2>四、虫情监测分析</h2>
          <template v-if="report.pest.hasData">
            <p>
              本期共形成虫情识别记录 <strong>{{ report.pest.total }}</strong> 条，
              累计监测虫体 <strong>{{ report.pest.totalCount }}</strong> 头。
              主要虫种为 <strong>{{ report.pest.dominantSpecies }}</strong>，
              占比 <strong>{{ report.pest.dominantRate }}%</strong>，
              平均识别置信度 <strong>{{ report.pest.avgConfidence }}%</strong>。
              当前虫情风险等级为 <strong>{{ report.pest.riskLevel }}</strong>。
            </p>

            <p>
              预警统计：高风险 {{ report.pest.warningStats.high }} 条，
              中风险 {{ report.pest.warningStats.medium }} 条，
              低风险 {{ report.pest.warningStats.low }} 条，
              未标记 {{ report.pest.warningStats.none }} 条。
            </p>

            <h3>主要虫种分布</h3>
            <div v-if="report.pest.topSpecies && report.pest.topSpecies.length" class="report-table-wrap">
              <table class="report-table compact-table">
              <thead>
                <tr>
                  <th class="col-index text-center">序号</th>
                  <th>虫种名称</th>
                  <th class="text-center">监测数量</th>
                  <th class="text-center">占比</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in report.pest.topSpecies" :key="item.name">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>{{ item.name }}</td>
                  <td class="text-center">{{ item.count }} 头</td>
                  <td class="text-center">{{ item.rate }}%</td>
                </tr>
              </tbody>
              </table>
            </div>
            <p v-else class="empty-text">暂未返回虫种分类统计数据。</p>

            <h3>趋势与风险研判</h3>
            <p>{{ report.pest.trendAnalysis }}</p>
            <p>{{ report.pest.riskAnalysis }}</p>

            <h3>防治建议</h3>
            <ol class="analysis-list">
              <li v-for="(item, index) in report.pest.advice" :key="index">
                {{ item }}
              </li>
            </ol>
          </template>

          <p v-else class="empty-text">
            当前统计范围内暂无虫情识别数据。
          </p>
        </section>

        <section class="report-section">
          <h2>五、物候期监测分析</h2>
          <template v-if="report.phenology.hasData">
            <p>
              本期共完成物候识别 <strong>{{ report.phenology.total }}</strong> 条，
              当前主要物候阶段为 <strong>{{ report.phenology.dominant }}</strong>，
              占比 <strong>{{ report.phenology.dominantRate || '-' }}</strong>，
              平均识别置信度 <strong>{{ report.phenology.avgConfidence }}%</strong>。
            </p>

            <h3>（一）主要物候阶段统计</h3>
            <div class="report-table-wrap" v-if="phenologyTopStages.length">
              <table class="report-table compact-table">
              <thead>
                <tr>
                  <th class="text-center">序号</th>
                  <th>物候阶段</th>
                  <th class="text-center">识别数量</th>
                  <th class="text-center">占比</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item,index) in phenologyTopStages" :key="item.name || item.stage">
                  <td class="text-center">{{ index + 1 }}</td>
                  <td>{{ item.name || item.stage }}</td>
                  <td class="text-center">{{ item.count }} 条</td>
                  <td class="text-center">{{ formatRate(item.rate) }}</td>
                </tr>
              </tbody>
              </table>
            </div>

            <p>{{ report.phenology.trendAnalysis }}</p>

            <h3>（二）物候进程研判</h3>
            <p>
              当前物候进程：{{ report.phenology.progressStatus }}；
              下一阶段预计：{{ report.phenology.nextStage }}。
            </p>

            <h3>（三）农事管理建议</h3>
            <ol class="analysis-list">
              <li v-for="(item,index) in report.phenology.advice" :key="index">{{ item }}</li>
            </ol>
          </template>
          <p v-else class="empty-text">当前统计范围内暂无物候识别数据。</p>
        </section>

        <section class="report-section">
          <h2>六、农事任务与气象实况</h2>
          <p>所选园区及统计周期内共有农事任务 <strong>{{ report.task.total || 0 }}</strong> 项。</p>
          <template v-if="report.live.hasData">
            <p>
              周期内最高气温 {{ report.live.maxTemp }}℃，最低气温 {{ report.live.minTemp }}℃，平均湿度
              {{ report.live.avgHumidity }}%，累计降水量 {{ report.live.precipitation }}mm，平均风速
              {{ report.live.avgWind }}m/s。
            </p>
            <p>未来三天天气摘要：{{ report.forecast.summary }}</p>
          </template>
          <p v-else class="empty-text">当前统计范围内暂无气象实况数据。</p>
        </section>

        <section class="report-section">
          <h2>七、综合风险研判与处置建议</h2>
          <template v-if="report.riskAnalysis.length">
            <ol class="analysis-list"><li v-for="(item, index) in report.riskAnalysis" :key="index">{{ item }}</li></ol>
          </template>
          <p v-else class="empty-text">{{ emptyMessage }}</p>
        </section>

        <footer class="report-footer">
          <p>本报告依据系统监测与识别数据自动生成，仅作为生产管理和风险研判参考。涉及高风险记录时，建议结合现场调查和人工复核后采取处置措施。</p>
        </footer>
      </main>
    </div>

    <el-drawer v-model="notificationCenterVisible" title="农情消息中心" size="420px" append-to-body @open="markAllNotificationsRead">
      <div class="notification-toolbar">
        <span>共 {{ notifications.length }} 条，未读 {{ unreadCount }} 条</span>
        <el-button link type="danger" :disabled="!notifications.length" @click="clearNotifications">清空消息</el-button>
      </div>
      <div v-if="notifications.length" class="notification-list">
        <article v-for="item in notifications" :key="item.id" class="notification-item" @click="markNotificationRead(item.id)">
          <div class="notification-item-head"><strong>{{ item.title }}</strong><span>{{ item.createdAt }}</span></div>
          <p>{{ item.message }}</p>
          <div class="notification-item-meta">
            <span>{{ item.roleLabel }}</span><span>{{ item.parkName || '全部园区' }}</span>
            <el-button link type="danger" @click.stop="removeNotification(item.id)">删除</el-button>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂无农情通知" />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { buildReportPdf } from './exportReportPdf'
import { ElMessage, ElNotification } from 'element-plus'
import { getAgriReport } from '@/api/binZhou/wr/report'
import { getMyConfig, saveMyConfig } from '@/api/binZhou/wr/pushConfig'

const loading = ref(false)
const reportError = ref('')
const initializing = ref(true)
const pdfLoading = ref(false)
const rangePreset = ref('all')
const rangeValue = ref([])
const parkId = ref('')
const parkOptions = ref([])
const roleType = ref('farmer')
const roleOptions = [
  { label: '农户端视角', value: 'farmer' },
  { label: '县市级视角', value: 'county' }
]

const pushSaving = ref(false)
const pushRule = ref({
  configId: undefined,
  enabled: true,
  frequency: 'weekly',
  channel: 'system',
  areaCode: ''
})

const NOTIFICATION_STORAGE_KEY = 'agri-report-notifications-v1'
const REALTIME_POLL_INTERVAL = 60 * 1000
const notificationCenterVisible = ref(false)
const notifications = ref([])
let realtimeTimer = null
let lastRealtimeFingerprint = ''
let realtimeChecking = false

const unreadCount = computed(() => notifications.value.filter(item => !item.read).length)

// 病虫害重点风险 TOP5：过滤健康叶片，只展示异常识别结果
const abnormalDiseaseTop5 = computed(() => {
  // TOP5 使用聚合统计 typeStats，保证与上方病害类型统计一致
  const list = report.value.disease?.typeStats || []

  return list
    .filter(item => {
      const name = item.name || ''
      return (
        name &&
        !name.includes('健康') &&
        !name.includes('正常')
      )
    })
    .slice(0, 5)
    .map(item => ({
      name: item.name || '--',
      count: item.count || 0,
      rate: item.avgConfidence || item.confidence || '--',
      time: item.lastTime || item.time || '--'
    }))
})


const reportMeta = ref({
  rangeText: '',
  parkName: '全部园区（当前用户可访问范围）',
  generatedAt: '',
  dataSource: '预警记录表、病虫害识别表、虫情监测表、物候监测表、农事任务表、气象监测表'
})

const emptyMessage = '当前统计范围内暂无相关监测数据，建议扩大查询时间范围或开展对应监测'

const createEmptySection = () => ({
  hasData: false
})

const report = ref({
  summary: {
    weather: { countText: '-', description: emptyMessage },
    disease: { countText: '-', description: emptyMessage },
    pest: { countText: '-', description: emptyMessage },
    phenology: { countText: '-', description: emptyMessage },
    task: { countText: '-', description: emptyMessage },
    device: { countText: '-', description: '数据待接入' },
    overallRisk: '低风险',
    overallRiskClass: 'green',
    conclusion: emptyMessage,
    riskAssessment: emptyMessage
  },
  weather: createEmptySection(),
  disease: createEmptySection(),
  pest: createEmptySection(),
  phenology: createEmptySection(),
  task: createEmptySection(),
  live: createEmptySection(),
  forecast: { summary: emptyMessage },
  riskAnalysis: [],
  focusAreas: [],
  advice: {
    emergency: [emptyMessage],
    midTerm: [emptyMessage],
    longTerm: [emptyMessage]
  }
})


// 物候阶段仅展示主要阶段，避免报告篇幅过长
const phenologyTopStages = computed(() => {
  const list = report.value.phenology?.stageStats || []
  return list
    .map(item => ({
      name: item.name || item.stage || '--',
      stage: item.stage || item.name || '--',
      count: item.count || 0,
      rate: item.rate || '0'
    }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 5)
})

// 统一处理后台返回的百分比格式
const formatRate = (value) => {
  if (value === undefined || value === null || value === '') return '-'
  const str = String(value)
  return str.includes('%') ? str : `${str}%`
}


const selectedParkName = computed(() => {
  if (!parkId.value) return ''
  const park = parkOptions.value.find(item => String(item.id) === String(parkId.value))
  return park?.name || ''
})

const roleConfig = computed(() => {
  const configs = {
    farmer: {
      label: '农户端视角',
      kicker: '农户生产指导',
      title: '农户农情生产指导报告',
      chapterOne: '农户生产风险概览',
      chapterThree: '田间风险与影响分析',
      chapterFour: '农户分级处置建议',
      conclusionTitle: '生产指导结论',
    },
    county: {
      label: '县市级视角',
      kicker: '县市级农业决策',
      title: '县市级综合农情决策报告',
      chapterOne: '区域综合农情态势研判',
      chapterThree: '区域风险与重点园区研判',
      chapterFour: '县市级防控与资源调度建议',
      conclusionTitle: '区域决策结论',
    }
  }
  return configs[roleType.value] || configs.farmer
})

// 根据农户端或县市级角色生成不同报告标题。
const reportTitle = computed(() => {
  const baseTitle = roleConfig.value.title
  if (!parkId.value || roleType.value === 'county') return baseTitle
  return selectedParkName.value
    ? `${selectedParkName.value}${baseTitle}`
    : baseTitle
})

const pushRuleSummary = computed(() => {
  const frequencyMap = {
    realtime: '高风险事件触发后立即推送',
    daily: '每天清晨 08:00 推送',
    weekly: '每周一早晨 09:00 推送',
    monthly: '每月 1 号 09:00 推送'
  }
  return `${roleConfig.value.label} · ${frequencyMap[pushRule.value.frequency] || frequencyMap.weekly} · 系统内部通知`
})

const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const formatDateTime = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatDateTimeParam = (date, endOfDay = false) => {
  const time = endOfDay ? '23:59:59' : '00:00:00'
  return `${formatDate(date)} ${time}`
}

const toDate = (value) => {
  if (!value) return null
  const date = new Date(String(value).replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

const getRange = () => {
  if (rangePreset.value === 'all') return null
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (rangePreset.value === 'month') {
    start.setDate(1)
  } else if (rangePreset.value === 'custom' && rangeValue.value?.length === 2) {
    const begin = toDate(rangeValue.value[0])
    const finish = toDate(rangeValue.value[1])
    if (begin && finish) {
      begin.setHours(0, 0, 0, 0)
      finish.setHours(23, 59, 59, 999)
      return { start: begin, end: finish }
    }
  } else {
    const weekday = start.getDay() === 0 ? 7 : start.getDay()
    start.setDate(start.getDate() - weekday + 1)
  }

  return { start, end }
}

const getQueryParams = () => {
  const range = getRange()
  const params = { reportRole: roleType.value }
  if (parkId.value !== '' && parkId.value != null) params.parkId = parkId.value
  if (range) {
    params.beginTime = formatDateTimeParam(range.start, false)
    params.endTime = formatDateTimeParam(range.end, true)
  }
  return params
}

const hasValidRange = () => {
  if (rangePreset.value !== 'custom') return true
  if (rangeValue.value?.length !== 2) return false
  const begin = toDate(rangeValue.value[0])
  const end = toDate(rangeValue.value[1])
  return Boolean(begin && end && begin <= end)
}

const pendingReports = new Map()
let latestReport = null
const loadedReportKey = ref('')
let reportRequestVersion = 0
const queryKey = params => JSON.stringify(params)
const reportMatchesFilters = computed(() => hasValidRange() && loadedReportKey.value === queryKey(getQueryParams()))
const requestReport = (params) => {
  const key = queryKey(params)
  if (!pendingReports.has(key)) {
    const request = getAgriReport(params).finally(() => pendingReports.delete(key))
    pendingReports.set(key, request)
  }
  return pendingReports.get(key)
}

const normalizeText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback
  return value
}

const safePercent = (value) => `${Number(value || 0).toFixed(2)}`

const formatConfidence = (value) => Number(value || 0).toFixed(2)

const getWarningLevelClass = (level) => {
  const text = String(level || '')
  if (text.includes('高')) return 'danger'
  if (text.includes('中')) return 'warning'
  return 'green'
}

const getRiskClass = (risk) => {
  if (risk === '高风险') return 'danger'
  if (risk === '中风险') return 'warning'
  return 'green'
}

const responseData = (res) => {
  const body = res?.data || res || {}
  return body.data || body
}

const buildFallback = () => ({
  summary: {
    weather: { countText: '-', description: emptyMessage },
    disease: { countText: '-', description: emptyMessage },
    pest: { countText: '-', description: emptyMessage },
    phenology: { countText: '-', description: emptyMessage },
    task: { countText: '-', description: emptyMessage },
    device: { countText: '-', description: '数据待接入' },
    overallRisk: '低风险',
    overallRiskClass: 'green',
    conclusion: emptyMessage,
    riskAssessment: emptyMessage
  },
  weather: createEmptySection(),
  disease: createEmptySection(),
  pest: createEmptySection(),
  phenology: createEmptySection(),
  task: createEmptySection(),
  live: createEmptySection(),
  forecast: { summary: emptyMessage },
  riskAnalysis: [],
  focusAreas: [],
  advice: {
    emergency: [emptyMessage],
    midTerm: [emptyMessage],
    longTerm: [emptyMessage]
  }
})

const transformReport = (payload) => {
  if (!payload || typeof payload !== 'object') return buildFallback()
  const base = buildFallback()

  const weather = payload.weather || {}
  const disease = payload.disease || {}
  const pest = payload.pest || {}
  const phenology = payload.phenology || {}
  const task = payload.task || {}
  const live = payload.live || {}
  const forecast = payload.forecast || {}

  base.summary.weather = {
    countText: normalizeText(weather.countText),
    description: normalizeText(weather.description, emptyMessage)
  }
  base.summary.disease = {
    countText: normalizeText(disease.countText),
    description: normalizeText(disease.description, emptyMessage)
  }
  base.summary.pest = {
    countText: normalizeText(pest.countText),
    description: normalizeText(pest.description, emptyMessage)
  }
  base.summary.phenology = {
    countText: normalizeText(phenology.countText),
    description: normalizeText(phenology.description, emptyMessage)
  }
  base.summary.task = {
    countText: normalizeText(task.countText),
    description: normalizeText(task.description, emptyMessage)
  }
  base.summary.device = {
    countText: normalizeText(payload.device?.countText, '数据待接入'),
    description: normalizeText(payload.device?.description, '暂无设备表时标注「数据待接入」')
  }
  base.summary.overallRisk = normalizeText(payload.summary?.overallRisk, '低风险')
  base.summary.overallRiskClass = getRiskClass(base.summary.overallRisk)
  base.summary.conclusion = normalizeText(payload.summary?.conclusion, emptyMessage)
  base.summary.riskAssessment = normalizeText(payload.summary?.riskAssessment, emptyMessage)

  base.weather = {
    hasData: !!weather.hasData,
    total: normalizeText(weather.total, 0),
    levelStats: weather.levelStats || { high: 0, medium: 0, low: 0, highRate: '0.00', mediumRate: '0.00', lowRate: '0.00' },
    extremes: weather.extremes || { maxTemp: '-', minSoilHum: '-', precipitation: '-', maxWind: '-' },
    topRows: (weather.topRows || []).map((item, index) => ({
      id: item.id || index,
      time: normalizeText(item.time),
      device: normalizeText(item.device),
      indicator: normalizeText(item.indicator),
      value: normalizeText(item.value),
      levelText: normalizeText(item.levelText),
      levelClass: getWarningLevelClass(item.levelText),
      suggestion: normalizeText(item.suggestion)
    }))
  }

  base.disease = {
    hasData: !!disease.hasData,
    total: normalizeText(disease.total, 0),
    warningCount: normalizeText(disease.warningCount, 0),
    warningRate: normalizeText(disease.warningRate, '0.00'),
    avgConfidence: normalizeText(disease.avgConfidence, '0.00'),
    typeStats: disease.typeStats || [],
    levelStats: disease.levelStats || { high: 0, medium: 0, low: 0 },
    topRows: (disease.topRows || []).map((item, index) => ({
      id: item.id || index,
      name: normalizeText(item.name),
      confidence: formatConfidence(item.confidence),
      levelText: normalizeText(item.levelText),
      levelClass: getWarningLevelClass(item.levelText),
      time: normalizeText(item.time)
    }))
  }

  const pestTotalRecords = Number(
    pest.total ??
    pest.recordCount ??
    0
  )
  const pestTotalCount = Number(
    pest.totalCount ??
    pest.totalPestCount ??
    0
  )

  const rawPestSpecies =
    pest.topSpecies ||
    pest.speciesStats ||
    pest.pestStats ||
    []

  const pestSpeciesStats = Array.isArray(rawPestSpecies)
    ? rawPestSpecies.map((item) => ({
        name: normalizeText(
          item.name || item.pestName || item.speciesName,
          '未知虫种'
        ),
        count: Number(
          item.count ??
          item.pestCount ??
          item.totalCount ??
          0
        ),
        rate: safePercent(
          item.rate ??
          item.percent ??
          (pestTotalCount
            ? Number(item.count ?? item.pestCount ?? item.totalCount ?? 0) * 100 / pestTotalCount
            : 0)
        )
      }))
    : []

  const pestDominantItem = pestSpeciesStats[0] || {}
  const pestDominantSpecies = normalizeText(
    pest.dominantSpecies ||
    pest.topPestName ||
    pest.mainSpecies ||
    pestDominantItem.name,
    '暂无明显优势虫种'
  )
  const pestDominantRate = normalizeText(
    pest.dominantRate ||
    pest.dominantPercent ||
    pestDominantItem.rate,
    '0.00'
  )

  const pestAvgConfidence = normalizeText(
    pest.avgConfidence,
    '0.00'
  )
  const pestAvgConfidenceNumber = Number(
    pestAvgConfidence || 0
  )

  const rawPestWarningStats =
    pest.warningStats ||
    pest.levelStats ||
    {}

  const pestWarningStats = {
    high: Number(
      rawPestWarningStats.high ??
      pest.highRiskCount ??
      pest.warningCount ??
      0
    ),
    medium: Number(
      rawPestWarningStats.medium ??
      rawPestWarningStats.middle ??
      pest.mediumRiskCount ??
      0
    ),
    low: Number(
      rawPestWarningStats.low ??
      pest.lowRiskCount ??
      0
    ),
    none: Number(
      rawPestWarningStats.none ??
      rawPestWarningStats.unmarked ??
      pest.unmarkedCount ??
      Math.max(
        pestTotalRecords -
        Number(rawPestWarningStats.high ?? pest.highRiskCount ?? pest.warningCount ?? 0) -
        Number(rawPestWarningStats.medium ?? rawPestWarningStats.middle ?? pest.mediumRiskCount ?? 0) -
        Number(rawPestWarningStats.low ?? pest.lowRiskCount ?? 0),
        0
      )
    )
  }

  const pestRiskLevel = normalizeText(
    pest.riskLevel,
    pestWarningStats.high > 0 ||
    pestTotalCount >= 1000 ||
    Number(pestDominantRate) >= 70
      ? '高风险'
      : pestWarningStats.medium > 0 ||
        pestTotalCount >= 300 ||
        Number(pestDominantRate) >= 50
          ? '中风险'
          : '低风险'
  )

  const pestConfidenceAssessment =
    pestAvgConfidenceNumber >= 90
      ? '识别结果可信度高'
      : pestAvgConfidenceNumber >= 80
        ? '识别结果较稳定'
        : pestAvgConfidenceNumber >= 70
          ? '建议结合人工复核'
          : pestAvgConfidenceNumber > 0
            ? '识别可信度偏低，需重点复核'
            : '暂无置信度数据'

  const pestTrendAnalysis = normalizeText(
    pest.trendAnalysis ||
    pest.trendText,
    pestTotalCount > 0
      ? `当前虫情结构以“${pestDominantSpecies}”为主，累计监测虫体 ${pestTotalCount} 头，优势虫种占比 ${pestDominantRate}%。建议结合连续监测结果观察虫口密度、优势虫种占比和预警等级变化，判断是否存在快速增长或集中发生趋势。`
      : '当前尚未形成有效虫体数量统计，建议检查虫情设备和识别任务，并持续补充监测数据。'
  )

  const pestRiskAnalysis = normalizeText(
    pest.riskText ||
    pest.riskAnalysis,
    pestRiskLevel === '高风险'
      ? `监测结果显示虫情风险较高。当前存在 ${pestWarningStats.high} 条高风险记录，累计监测虫体 ${pestTotalCount} 头，优势虫种“${pestDominantSpecies}”占比 ${pestDominantRate}%。建议立即组织重点区域复核，明确虫口密度、扩散范围和危害程度，并及时开展针对性防治。`
      : pestRiskLevel === '中风险'
        ? `当前虫情处于中等风险水平，累计监测虫体 ${pestTotalCount} 头，主要虫种为“${pestDominantSpecies}”。建议提高监测频次，重点关注虫口密度、优势虫种比例和中高风险记录的后续变化。`
        : `当前虫情总体处于低风险水平，识别记录以“${pestDominantSpecies}”为主，虫体数量和预警等级暂未达到中高风险阈值。建议保持常态化监测，并关注优势虫种数量是否持续上升。`
  )

  const rawPestAdvice =
    pest.advice ||
    pest.adviceList ||
    pest.suggestions ||
    []

  let pestAdvice = []
  if (Array.isArray(rawPestAdvice)) {
    pestAdvice = rawPestAdvice
      .map(item => {
        if (typeof item === 'string') return item.trim()
        return normalizeText(
          item.content ||
          item.advice ||
          item.suggestion,
          ''
        )
      })
      .filter(Boolean)
  } else if (
    typeof rawPestAdvice === 'string' &&
    rawPestAdvice.trim()
  ) {
    pestAdvice = rawPestAdvice
      .split(/[；;\n]/)
      .map(item => item.trim())
      .filter(Boolean)
  }

  if (!pestAdvice.length) {
    if (pestRiskLevel === '高风险') {
      pestAdvice = [
        '立即对高发区域开展田间复核，明确虫口密度、危害部位和扩散范围。',
        '优先采用诱捕、物理阻隔和生物防控措施，必要时按照植保要求开展精准施药。',
        '缩短虫情监测周期，连续跟踪优势虫种数量变化及防治效果。'
      ]
    } else if (pestRiskLevel === '中风险') {
      pestAdvice = [
        '加强虫情灯、诱捕器和图像采集设备巡检，保持监测数据连续稳定。',
        '对优势虫种对应区域开展重点巡查，结合温湿度变化判断迁飞或暴发风险。',
        '优先采用绿色防控措施，必要时对重点区域进行局部精准处置。'
      ]
    } else {
      pestAdvice = [
        '保持常态化虫情监测，定期核查设备运行状态和诱捕装置有效性。',
        '关注优势虫种变化趋势，发现数量快速上升时及时开展人工复核。',
        '继续采用绿色防控和农业防治措施，降低田间虫源基数。'
      ]
    }
  }

  const rawPestRows =
    pest.topRows ||
    pest.focusRecords ||
    pest.records ||
    []

  const pestTopRows = Array.isArray(rawPestRows)
    ? rawPestRows.slice(0, 8).map((item, index) => ({
        id: item.id || index,
        name: normalizeText(
          item.name ||
          item.pestName ||
          item.speciesName,
          '未知虫种'
        ),
        count: Number(
          item.count ??
          item.pestCount ??
          item.pestTotalCount ??
          0
        ),
        confidence: formatConfidence(
          item.confidence ||
          item.pestConfidence
        ),
        levelText: normalizeText(
          item.levelText ||
          item.warningLevel ||
          item.riskLevel,
          '未标记'
        ),
        levelClass: getWarningLevelClass(
          item.levelText ||
          item.warningLevel ||
          item.riskLevel
        ),
        time: normalizeText(
          item.time ||
          item.createTime ||
          item.identifyTime
        )
      }))
    : []

  base.pest = {
    hasData: !!pest.hasData,
    total: normalizeText(
      pest.total ?? pest.recordCount,
      0
    ),
    imageCount: normalizeText(
      pest.imageCount,
      0
    ),
    totalCount: normalizeText(
      pest.totalCount ?? pest.totalPestCount,
      0
    ),
    warningCount: normalizeText(
      pest.warningCount,
      0
    ),
    warningStats: pestWarningStats,
    dominantSpecies: pestDominantSpecies,
    dominantRate: pestDominantRate,
    avgConfidence: pestAvgConfidence,
    confidenceAssessment: pestConfidenceAssessment,
    topSpecies: pestSpeciesStats,
    riskLevel: pestRiskLevel,
    riskClass: getRiskClass(pestRiskLevel),
    trendAnalysis: pestTrendAnalysis,
    riskAnalysis: pestRiskAnalysis,
    advice: pestAdvice,
    topRows: pestTopRows
  }

  const phenologyTotal = Number(phenology.total || 0)
  const rawStageStats = phenology.stageStats || phenology.typeStats || phenology.distribution || []
  const stageStats = Array.isArray(rawStageStats)
    ? rawStageStats.map((item) => ({
        name: normalizeText(item.name || item.stage || item.phenologyName, '未知物候期'),
        count: Number(item.count || item.total || 0),
        rate: safePercent(
          typeof (item.rate ?? item.percent) === 'string'
            ? String(item.rate ?? item.percent).replace('%', '')
            : (item.rate ?? item.percent ?? (phenologyTotal ? Number(item.count || 0) * 100 / phenologyTotal : 0))
        )
      }))
    : []

  const dominantCount = stageStats.find(
    item => String(item.name) === String(phenology.dominant)
  )?.count || Number(phenology.dominantCount || 0)

  const dominantRate = normalizeText(
    phenology.dominantRate,
    phenologyTotal > 0 ? safePercent(dominantCount * 100 / phenologyTotal) : '0.00'
  )

  const avgConfidence = normalizeText(phenology.avgConfidence, '0.00')
  const avgConfidenceNumber = Number(avgConfidence || 0)
  const confidenceAssessment =
    avgConfidenceNumber >= 90 ? '识别结果可信度高'
      : avgConfidenceNumber >= 80 ? '识别结果较稳定'
        : avgConfidenceNumber >= 70 ? '建议结合人工复核'
          : '识别可信度偏低，需重点复核'

  const nextStage = normalizeText(
    phenology.nextStage || phenology.nextPhenology || phenology.predictedStage,
    '待进一步监测'
  )

  const progressStatus = normalizeText(
    phenology.progressStatus || phenology.progressJudgement,
    String(phenology.growthJudgement || '').includes('异常') ? '需关注' : '正常推进'
  )

  const trendAnalysis = normalizeText(
    phenology.trendAnalysis,
    `统计范围内物候期以“${normalizeText(phenology.dominant)}”为主，下一阶段预计进入“${nextStage}”。建议结合连续图像识别结果和田间调查，动态判断物候推进速度。`
  )

  const abnormalAnalysis = normalizeText(
    phenology.abnormalAnalysis,
    avgConfidenceNumber >= 80
      ? `当前物候识别置信度整体较稳定，暂未发现明显异常。若实际农时与“${normalizeText(phenology.dominant)}”不一致，建议结合地块温湿度、积温和长势情况进行人工复核。`
      : `当前平均识别置信度为 ${avgConfidence}%，部分记录可能存在识别偏差。建议复核低置信度图像，并结合地块环境与人工巡查判断是否存在提前萌动、发育滞后或长势不均。`
  )

  const defaultAdvice = [
    `围绕“${normalizeText(phenology.dominant)}”阶段开展针对性田间巡查，重点关注芽体、叶片、花序或果实发育的一致性。`,
    `结合未来天气和土壤墒情，合理安排水肥管理，避免物候关键期出现水分胁迫或营养供应不足。`,
    `持续采集同一地块、同一设备的连续图像，提高物候变化趋势判断的可靠性。`
  ]

  const adviceSource = phenology.advice || phenology.farmingAdvice || phenology.suggestions
  const phenologyAdvice = Array.isArray(adviceSource)
    ? adviceSource.filter(Boolean)
    : typeof adviceSource === 'string' && adviceSource.trim()
      ? adviceSource.split(/[；;\n]/).map(item => item.trim()).filter(Boolean)
      : defaultAdvice

  const rawTopRows = phenology.topRows || phenology.records || []
  const topRows = Array.isArray(rawTopRows)
    ? rawTopRows.slice(0, 8).map((item, index) => ({
        id: item.id || index,
        currentStage: normalizeText(item.currentStage || item.phenologyName || item.name || item.stage),
        nextStage: normalizeText(item.nextStage || item.nextPhenology || item.predictedStage),
        confidence: formatConfidence(item.confidence || item.phenologyConfidence),
        time: normalizeText(item.time || item.createTime || item.identifyTime)
      }))
    : []

  base.phenology = {
    hasData: !!phenology.hasData,
    total: normalizeText(phenology.total, 0),
    dominant: normalizeText(phenology.dominant),
    dominantRate,
    avgConfidence,
    confidenceAssessment,
    nextStage,
    progressStatus,
    stageStats,
    trendAnalysis,
    abnormalAnalysis,
    advice: phenologyAdvice.length ? phenologyAdvice : defaultAdvice,
    topRows,
    growthJudgement: normalizeText(phenology.growthJudgement, emptyMessage)
  }

  base.task = {
    hasData: Number(task.total || 0) > 0,
    total: Number(task.total || 0)
  }

  base.live = {
    hasData: !!live.hasData,
    maxTemp: normalizeText(live.maxTemp, '-'),
    minTemp: normalizeText(live.minTemp, '-'),
    avgHumidity: normalizeText(live.avgHumidity, '-'),
    precipitation: normalizeText(live.precipitation, '-'),
    avgWind: normalizeText(live.avgWind, '-')
  }
  base.forecast = {
    summary: normalizeText(forecast.summary, emptyMessage)
  }

  base.riskAnalysis = payload.riskAnalysis || []
  base.focusAreas = payload.focusAreas || []
  base.advice = payload.advice || base.advice

  return base
}

const calcRangeText = () => {
  const range = getRange()
  if (!range) return '全部时间（全部历史）'
  return `${formatDate(range.start)} 至 ${formatDate(range.end)}`
}

const handleRoleChange = () => {
  // 县市级视角默认展示全部园区；其他角色可继续选择具体园区。
  if (roleType.value === 'county' && parkId.value !== '') {
    parkId.value = ''
    return
  }
  fetchReport()
}

const loadNotifications = () => {
  try {
    const cached = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    const parsed = cached ? JSON.parse(cached) : []
    notifications.value = Array.isArray(parsed) ? parsed.slice(0, 100) : []
  } catch (error) {
    console.warn('读取消息中心缓存失败：', error)
    notifications.value = []
  }
}

const persistNotifications = () => {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications.value.slice(0, 100)))
  } catch (error) {
    console.warn('保存消息中心缓存失败：', error)
  }
}

const openNotificationCenter = () => {
  notificationCenterVisible.value = true
}

const markNotificationRead = (id) => {
  const item = notifications.value.find(row => row.id === id)
  if (item && !item.read) {
    item.read = true
    persistNotifications()
  }
}

const markAllNotificationsRead = () => {
  let changed = false
  notifications.value.forEach(item => {
    if (!item.read) {
      item.read = true
      changed = true
    }
  })
  if (changed) persistNotifications()
}

const removeNotification = (id) => {
  notifications.value = notifications.value.filter(item => item.id !== id)
  persistNotifications()
}

const clearNotifications = () => {
  notifications.value = []
  persistNotifications()
}

const createNotification = ({ title, message, level = 'warning', sourceKey = '' }) => {
  if (sourceKey && notifications.value.some(item => item.sourceKey === sourceKey)) return

  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceKey,
    title,
    message,
    level,
    read: false,
    createdAt: formatDateTime(new Date()),
    roleLabel: roleConfig.value.label,
    parkName: selectedParkName.value
  }

  notifications.value.unshift(item)
  notifications.value = notifications.value.slice(0, 100)
  persistNotifications()

  ElNotification({
    title,
    message,
    type: level === 'danger' ? 'error' : level === 'success' ? 'success' : 'warning',
    duration: 8000,
    position: 'top-right',
    onClick: () => {
      markNotificationRead(item.id)
      notificationCenterVisible.value = true
    }
  })
}

const getRealtimeSnapshot = (data) => {
  const summary = data?.summary || {}
  const weather = data?.weather || {}
  const disease = data?.disease || {}
  const pest = data?.pest || {}
  const overallRisk = normalizeText(summary.overallRisk, '低风险')
  const highWeather = Number(weather.levelStats?.high || 0)
  const highDisease = Number(disease.levelStats?.high || 0)
  const pestWarnings = Number(pest.warningCount || 0)
  const fingerprint = [
    overallRisk,
    highWeather,
    highDisease,
    pestWarnings,
    normalizeText(summary.conclusion, '')
  ].join('|')

  return {
    fingerprint,
    overallRisk,
    highWeather,
    highDisease,
    pestWarnings,
    conclusion: normalizeText(summary.conclusion, '检测到新的农情风险，请及时查看报告。')
  }
}

const checkRealtimeRisk = async ({ initialize = false, forceNotify = false } = {}) => {
  if (
    initializing.value ||
    realtimeChecking ||
    !pushRule.value.enabled ||
    pushRule.value.frequency !== 'realtime' ||
    pushRule.value.channel !== 'system'
  ) return
  if (!hasValidRange()) return

  realtimeChecking = true
  try {
    const params = getQueryParams()
    const key = queryKey(params)
    const payload = initialize && latestReport?.key === key
      ? latestReport.payload
      : responseData(await requestReport(params))
    if (!hasValidRange() || key !== queryKey(getQueryParams())) return
    const snapshot = getRealtimeSnapshot(payload)

    if (initialize || (!lastRealtimeFingerprint && !forceNotify)) {
      lastRealtimeFingerprint = snapshot.fingerprint
      return
    }

    if (snapshot.fingerprint === lastRealtimeFingerprint) return
    lastRealtimeFingerprint = snapshot.fingerprint

    const hasRisk =
      snapshot.overallRisk === '高风险' ||
      snapshot.overallRisk === '中风险' ||
      snapshot.highWeather > 0 ||
      snapshot.highDisease > 0 ||
      snapshot.pestWarnings > 0

    if (!hasRisk) return

    const level = snapshot.overallRisk === '高风险' || snapshot.highWeather > 0 || snapshot.highDisease > 0
      ? 'danger'
      : 'warning'
    const details = [
      `综合风险：${snapshot.overallRisk}`,
      snapshot.highWeather ? `气象高风险 ${snapshot.highWeather} 条` : '',
      snapshot.highDisease ? `病虫害高风险 ${snapshot.highDisease} 条` : '',
      snapshot.pestWarnings ? `虫情预警 ${snapshot.pestWarnings} 条` : ''
    ].filter(Boolean).join('；')

    createNotification({
      title: level === 'danger' ? '农情高风险即时预警' : '农情风险即时提醒',
      message: `${details}。${snapshot.conclusion}`,
      level,
      sourceKey: `realtime-${snapshot.fingerprint}`
    })

    report.value = transformReport(payload)
    reportMeta.value.generatedAt = formatDateTime(new Date())
  } catch (error) {
    console.error('即时风险检测失败：', error)
  } finally {
    realtimeChecking = false
  }
}

const stopRealtimeMonitor = () => {
  if (realtimeTimer) {
    window.clearInterval(realtimeTimer)
    realtimeTimer = null
  }
}

const startRealtimeMonitor = async ({ immediateCheck = false } = {}) => {
  stopRealtimeMonitor()
  if (initializing.value) return

  if (!pushRule.value.enabled || pushRule.value.frequency !== 'realtime') {
    return
  }

  if (immediateCheck) {
    lastRealtimeFingerprint = ''
    await checkRealtimeRisk({ forceNotify: true })
  } else {
    await checkRealtimeRisk({ initialize: true })
  }

  realtimeTimer = window.setInterval(() => {
    checkRealtimeRisk()
  }, REALTIME_POLL_INTERVAL)
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') checkRealtimeRisk()
}

const savePushRule = async () => {
  pushSaving.value = true
  try {
    const payload = {
      configId: pushRule.value.configId,
      userRole: roleType.value,
      pushFrequency: pushRule.value.frequency,
      pushChannel: pushRule.value.channel || 'system',
      areaCode: pushRule.value.areaCode || undefined,
      status: pushRule.value.enabled ? '0' : '1'
    }

    await saveMyConfig(payload)
    await loadPushRule()

    if (pushRule.value.enabled && pushRule.value.frequency === 'realtime') {
      // 保存即时触发规则后，立即反馈系统通知，等同于原测试按钮效果
      createNotification({
        title: '即时触发已开启',
        message: `农情即时通知服务已启动。当前角色：${roleConfig.value.label}，系统将持续监测风险变化。`,
        level: 'success',
        sourceKey: `push-enabled-${Date.now()}`
      })

      await startRealtimeMonitor({ immediateCheck: true })
      ElMessage.success('推送规则保存成功，即时风险监测已启动')
    } else {
      stopRealtimeMonitor()
      ElMessage.success('农情定时推送规则保存成功')
    }
  } catch (error) {
    console.error('保存农情推送规则失败：', error)
    ElMessage.error('推送规则保存失败，请稍后重试')
  } finally {
    pushSaving.value = false
  }
}

const loadPushRule = async () => {
  try {
    const res = await getMyConfig()
    const data = responseData(res) || {}

    pushRule.value = {
      configId: data.configId,
      enabled: data.status !== '1',
      frequency: data.pushFrequency || 'weekly',
      channel: data.pushChannel || 'system',
      areaCode: data.areaCode || ''
    }

    if (['farmer', 'county'].includes(data.userRole)) {
      roleType.value = data.userRole
    }
  } catch (error) {
    console.error('读取农情推送规则失败：', error)
    ElMessage.warning('未能读取已保存的推送规则，当前显示默认设置')
  }
}

const fetchReport = async () => {
  if (!hasValidRange()) {
    ElMessage.warning('请选择完整且有效的统计时间范围')
    return
  }
  const version = ++reportRequestVersion
  const params = getQueryParams()
  const key = queryKey(params)
  const rangeText = calcRangeText()
  const parkName = selectedParkName.value || '全部园区（当前用户可访问范围）'
  loading.value = true
  reportError.value = ''
  try {
    const res = await requestReport(params)
    if (version !== reportRequestVersion || !hasValidRange() || key !== queryKey(getQueryParams())) return
    const payload = responseData(res)
    latestReport = { key, payload }
    report.value = transformReport(payload)
    loadedReportKey.value = key
    reportMeta.value.rangeText = rangeText
    reportMeta.value.parkName = parkName
    reportMeta.value.generatedAt = formatDateTime(new Date())
    if (Array.isArray(payload?.parkOptions)) {
      parkOptions.value = payload.parkOptions
    }
  } catch (error) {
    if (version !== reportRequestVersion || !hasValidRange() || key !== queryKey(getQueryParams())) return
    console.error('获取综合农情监测报告失败：', error)
    reportError.value = '当前筛选条件的报告加载失败，请点击刷新报告重试；已有内容仍为上次成功结果。'
    ElMessage.error('报告数据加载失败，请稍后重试')
  } finally {
    if (version === reportRequestVersion) loading.value = false
  }
}

const handleRangePresetChange = () => {
  if (rangePreset.value !== 'custom') {
    rangeValue.value = []
  }
  if (hasValidRange()) fetchReport()
}

const handleDateChange = () => {
  if (hasValidRange()) fetchReport()
}

const exportToPDF = async () => {
  if (loading.value || !reportMatchesFilters.value) {
    ElMessage.warning('请先加载当前筛选条件的报告再导出')
    return
  }
  const element = document.getElementById('report-content')
  if (!element) return

  pdfLoading.value = true
  try {
    const filename = `${reportTitle.value}_${reportMeta.value.rangeText.replace(/\s+/g, '_')}.pdf`
    const pdf = await buildReportPdf(element)
    pdf.save(filename)
    ElMessage.success('PDF 报告导出成功')
  } catch (error) {
    console.error('PDF 报告导出失败：', error)
    ElMessage.error('PDF 报告导出失败，请稍后重试')
  } finally {
    pdfLoading.value = false
  }
}

watch(parkId, async () => {
  if (initializing.value) return
  // 园区切换后刷新当前角色报告，并重新建立即时监测基线。
  await fetchReport()
  startRealtimeMonitor()
})

watch(
  () => [pushRule.value.enabled, pushRule.value.frequency, pushRule.value.channel, roleType.value],
  () => startRealtimeMonitor()
)

onMounted(async () => {
  loadNotifications()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await loadPushRule()
  reportMeta.value.rangeText = calcRangeText()
  reportMeta.value.generatedAt = formatDateTime(new Date())
  await fetchReport()
  initializing.value = false
  await startRealtimeMonitor()
})

onBeforeUnmount(() => {
  stopRealtimeMonitor()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.agri-report-page {
  min-height: 100vh;
  padding: 22px;
  background: #eef2ef;
  color: #26322b;
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
}
.report-shell { max-width: 1120px; margin: 0 auto; }
.push-service-card,
.toolbar {
  margin-bottom: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #d7e0da;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(31, 74, 50, .05);
}
.push-service-header,
.push-service-footer,
.toolbar,
.toolbar-left,
.toolbar-right,
.push-header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.push-service-header h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.4;
  font-weight: 700;
}
.push-config-grid { display: grid; gap: 17px; margin: 22px 0 18px; }
.push-config-item { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.config-label, .toolbar-label {
  flex: 0 0 auto;
  font-weight: 700;
  color: #263c30;
  white-space: nowrap;
}
.config-label { min-width: 74px; }
.toolbar-left { justify-content: flex-start; flex-wrap: nowrap; min-width: 0; }
.toolbar-group { display: flex; align-items: center; gap: 8px; min-width: 0; }
.role-select { width: 160px; flex: 0 0 160px; }
.park-select { width: 180px; flex: 0 0 180px; }
.push-service-footer { padding-top: 16px; border-top: 1px solid #e0e7e2; }
.current-rule { display: flex; align-items: center; gap: 12px; min-width: 0; }
.current-rule-label {
  flex: 0 0 auto;
  font-weight: 700;
}
.current-rule-text { color: #46544b; line-height: 1.6; }
.push-footer-actions { display: flex; align-items: center; gap: 18px; flex: 0 0 auto; }
.toolbar-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.toolbar-second { margin-top: 14px; justify-content: flex-start; gap: 28px; }

.report-paper {
  width: 100%;
  box-sizing: border-box;
  padding: 54px 68px 48px;
  background: #fff;
  border: 1px solid #d5ddd7;
  box-shadow: 0 4px 18px rgba(37, 70, 48, .08);
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.9;
}
.report-header {
  position: relative;
  text-align: center;
  padding: 0 0 25px;
  margin-bottom: 22px;
}

.report-header h1 {
  margin: 0 0 12px;
  font-family: "SimSun", "Songti SC", serif;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 3px;
}
.report-subtitle { margin: 0 0 15px; color: #536158; font-size: 15px; }
.report-meta {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  color: #445148;
  font-size: 14px;
}
.data-source { margin: 7px 0 0; font-size: 13px; }
.report-overview {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin: 0 0 30px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.overview-item {
  grid-column: span 2;
  min-width: 0;
  padding: 20px 14px;
  text-align: center;
  background: #f7faf8;
  border: 1px solid #d9e2dc;
  border-radius: 8px;
  break-inside: avoid;
  page-break-inside: avoid;
}
.overview-item:nth-last-child(-n + 2) { grid-column: span 3; }
.overview-label { display: block; color: #69756d; font-size: 14px; line-height: 22px; }
.overview-value { display: block; margin-top: 10px; color: #1d5d3d; font-size: 26px; line-height: 36px; overflow-wrap: anywhere; }
.overview-value--danger { color: #c45656; }
.overview-value--warning { color: #b07820; }
.overview-value--green { color: #1d5d3d; }
.overview-value--info { color: #69756d; }
.report-section { margin: 0 0 30px; }
.report-section h2 {
  margin: 0 0 16px;
  padding: 0;
  border-left: none;
  border-bottom: none;
  background: transparent;
  font-family: "SimSun", "Songti SC", serif;
  font-size: 21px;
  font-weight: 700;
  color: #333333;
}
.report-section h3 {
  margin: 19px 0 8px;
  padding-left: 0;
  border-left: none;
  font-size: 16px;
  font-weight: 700;
  color: #333333;
}
.report-section p { margin: 8px 0; text-align: justify; text-indent: 2em; }
.report-section strong { font-weight: 700; color: #333333; }
.report-section ol, .report-section ul { margin: 8px 0 8px 25px; padding: 0; }
.report-section li { margin: 7px 0; text-align: justify; }
.section-lead {
  margin: 0 0 16px;
  padding: 11px 14px;
  border: 1px solid #d6e2d9;
  border-left: 4px solid #4d8764;
  background: #f7faf8;
  color: #4d5c52;
  line-height: 1.75;
}
.report-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0 17px;
}
.report-stat-item {
  padding: 12px 8px;
  text-align: center;
  border: 1px solid #cfddd3;
  background: #fbfdfb;
}
.report-stat-item span { display: block; color: #66736b; font-size: 13px; }
.report-stat-item strong { font-size: 23px; color: #266a46; }
.report-stat-item small { margin-left: 3px; color: #647068; }
.risk-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid #d4ddd7;
}
.risk-summary-row span { padding: 10px 14px; text-align: center; border-right: 1px solid #d4ddd7; }
.risk-summary-row span:last-child { border-right: 0; }
.risk-summary-row b { margin-right: 10px; color: #244f38; }
.inline-stat-list { margin: 10px 0; padding-left: 20px; }
.inline-stat-list span { display: inline; }
.inline-stat-list span:not(:last-child)::after { content: "；"; }
.record-list { margin-top: 13px; }
.report-table-wrap { width: 100%; margin-top: 10px; overflow-x: auto; }
.report-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
  line-height: 1.55;
  background: #fff;
}
.report-table th,
.report-table td {
  padding: 9px 9px;
  border: 1px solid #bccbc1;
  vertical-align: middle;
  text-align: left;
  word-break: break-word;
}
.report-table th { background: #e9f1eb; color: #244b35; font-weight: 700; text-align: center; }
.report-table tbody tr:nth-child(even) { background: #fafcfb; }
.report-table .text-center { text-align: center; }
.report-table .text-left { text-align: left; }
.compact-table th, .compact-table td { padding-top: 8px; padding-bottom: 8px; }
.weather-warning-table .col-index, .compact-table .col-index { width: 52px; }
.weather-warning-table .col-time { width: 148px; }
.weather-warning-table .col-device { width: 86px; }
.weather-warning-table .col-indicator { width: 100px; }
.weather-warning-table .col-suggestion { width: auto; }
.weather-warning-table .col-value { width: 86px; }
.weather-warning-table .col-level { width: 86px; }
.analysis-list { padding-left: 2px !important; list-style-position: inside; }
.empty-text { color: #7a847d; font-style: italic; }
.final-conclusion {
  margin-top: 18px !important;
  padding: 13px 15px;
  border: 1px solid #cbd9cf;
  border-left: 5px solid #2d754d;
  background: #f4f8f5;
}
.report-footer {
  margin-top: 38px;
  padding-top: 14px;
  border-top: 1px solid #b8c7bd;
  color: #6f7972;
  font-size: 13px;
}
.notification-toolbar, .notification-item-head, .notification-item-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.notification-item { padding: 14px 0; border-bottom: 1px solid #e5e7eb; cursor: pointer; }
.notification-item p { margin: 8px 0; color: #555; }
.notification-item-head span, .notification-item-meta { color: #777; font-size: 12px; }

@media (max-width: 1100px) {
  .toolbar, .toolbar-left { flex-wrap: wrap; }
  .role-select { width: 160px; flex-basis: 160px; }
  .park-select { width: 170px; flex-basis: 170px; }
}
@media (max-width: 768px) {
  .agri-report-page { padding: 8px; }
  .report-paper { padding: 32px 20px; }
  .report-header h1 { font-size: 25px; }
  .report-meta { flex-direction: column; gap: 2px; }
  .report-overview, .report-stat-grid, .risk-summary-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-item, .overview-item:nth-last-child(-n + 2) { grid-column: span 1; }
  .overview-item:first-child { grid-column: span 2; }
  .push-service-footer, .current-rule, .push-footer-actions { align-items: flex-start; }
  .push-service-footer { flex-direction: column; }
  .current-rule { flex-direction: column; gap: 6px; }
  .toolbar-left { width: 100%; }
  .toolbar-group { flex-wrap: wrap; }
  .role-select, .park-select { width: 180px; flex-basis: 180px; }
}
@media screen and (max-width: 480px) {
  .report-overview { grid-template-columns: minmax(0, 1fr); }
  .overview-item:first-child { grid-column: span 1; }
}
@media print {
  @page {
    size: A4;
    margin: 15mm 16mm 15mm 16mm;
  }

  .hide-on-print,
  .toolbar {
    display: none !important;
  }

  html,
  body {
    background: #fff !important;
  }

  .agri-report-page {
    padding: 0 !important;
    background: #fff !important;
  }

  .report-shell {
    max-width: none !important;
    width: 100%;
  }

  .report-paper {
    width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    font-size: 11pt;
    line-height: 1.8;
  }

  .report-header {
    page-break-after: avoid;
    break-after: avoid;
  }

  .report-header h1 {
    font-size: 22pt;
    margin-bottom: 10px;
  }

  .report-section {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 18px;
  }

  .report-section h2,
  .report-section h3 {
    break-after: avoid;
    page-break-after: avoid;
  }

  .report-table-wrap {
    overflow: visible !important;
  }

  .report-table {
    width: 100% !important;
    border-collapse: collapse !important;
    page-break-inside: auto;
  }

  .report-table thead {
    display: table-header-group;
  }

  .report-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .report-table th,
  .report-table td {
    padding: 6px 8px !important;
    font-size: 10.5pt;
  }

  .report-stat-grid,
  .risk-summary-row {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}

/* 正式报告打印优化 */
.print-report-label {
  display: none;
  text-align: center;
  font-size: 18pt;
  font-weight: 700;
  margin-bottom: 8px;
  color: #222;
}
.print-page-footer {
  display: none;
}
.report-header {
  text-align: center;
}
.report-header h1 {
  color: #222 !important;
}
.report-subtitle,
.report-meta {
  color: #555;
}
@media print {
  .print-report-label {
    display: block;
  }
  .report-header {
    text-align: center;
  }
  .report-meta {
    justify-content: center;
    gap: 24px;
    font-size: 10.5pt;
  }
  .report-overview {
    margin-top: 14px;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    box-shadow: none !important;
  }
  .overview-item {
    grid-column: span 2;
    padding: 14px 10px;
    background: #fff !important;
  }
  .overview-item:first-child { grid-column: span 2; }
  .overview-item:nth-last-child(-n + 2) { grid-column: span 3; }
  .report-section h2 {
    color: #222 !important;
    border: 0 !important;
    padding-left: 0 !important;
    font-size: 15pt;
  }
  .report-section h3 {
    color: #333 !important;
  }
  .print-page-footer {
    display: block;
    margin-top: 25px;
    padding-top: 8px;
    border-top: 1px solid #aaa;
    text-align: center;
    font-size: 9pt;
    color: #666;
  }
}
</style>
