<template>
  <div class="report-container">
    <!-- 🌟 配置卡片 -->
    <div class="config-card hide-on-print">
      <div class="config-title">
        <span>🔔 农情定制定时推送服务</span>
      </div>
      <div class="config-form">
        <div class="form-item">
          <span class="form-label">接收频率：</span>
          <el-radio-group v-model="pushForm.pushFrequency">
            <el-radio label="realtime">✨ 即时触发</el-radio>
            <el-radio label="daily">☀️ 每天清晨 (08:00)</el-radio>
            <el-radio label="weekly">📅 每周一早晨 (09:00)</el-radio>
            <el-radio label="monthly">📊 每月1号</el-radio>
          </el-radio-group>
        </div>
        <div class="form-item">
          <span class="form-label">接收渠道：</span>
          <el-radio-group v-model="pushForm.pushChannel">
            <el-radio label="system" border class="is-active-radio">💻 系统内部通知弹窗 </el-radio>
          </el-radio-group>
        </div>
        <div class="form-submit">
          <el-button type="success" icon="Check" @click="handleSaveConfig" :loading="submitLoading">保存我的推送规则</el-button>
        </div>
      </div>
    </div>

    <!-- 🎨 工具控制栏 -->
        <div class="report-tools hide-on-print">
      <div class="tool-left">
        <div class="tool-filter-group">
          <span class="tool-label">农情数据视图</span>
          <el-radio-group v-model="currentRole" class="standard-tabs" @change="fetchReportData" size="default">
            <el-radio-button label="farmer">农户端视角</el-radio-button>
            <el-radio-button label="county">县市级视角</el-radio-button>
          </el-radio-group>
        </div>

        <div class="tool-filter-group park-filter-group">
          <span class="tool-label">园区</span>
          <el-select
            v-model="parkId"
            class="park-select"
            placeholder="全部园区"
            clearable
            filterable
            :loading="parkLoading"
            @change="fetchReportData"
          >
            <el-option label="全部园区" :value="''" />
            <el-option
              v-for="item in parkOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </div>

        <div class="tool-filter-group">
          <span class="tool-label">统计周期</span>
          <el-radio-group v-model="reportTimeRange" class="standard-tabs" @change="fetchReportData" size="default">
            <el-radio-button label="week">本周</el-radio-button>
            <el-radio-button label="month">本月</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      
      <div class="tool-right">
        <!-- 消息中心入口 -->
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="custom-badge">
          <el-button class="tool-action-btn secondary" plain icon="Bell" @click="drawerVisible = true">消息中心</el-button>
        </el-badge>
        
        <el-button class="tool-action-btn primary" type="primary" icon="Download" @click="exportToPDF">导出 PDF</el-button>
        <el-button class="tool-action-btn secondary" plain icon="Share" @click="shareReport">分享</el-button>
      </div>
    </div>

    <!-- 🌟 公文/研报体文字分析报告 -->
    <div class="text-report-paper" id="report-content" v-loading="loading">
      
      <!-- 报告表头 -->
      <div class="tr-header">
        <h1 class="tr-title">{{ reportTitle }}</h1>
        <div class="tr-meta">
          生成时间：{{ reportData.time }} | 统计范围：{{ reportData.range }} | 园区：{{ selectedParkName }}
        </div>
      </div>

            <!-- 报告正文 -->
      <div class="tr-body">
        <div class="report-summary-grid">
          <div class="summary-card danger">
            <span>预警总数</span>
            <strong>{{ reportData.total }}</strong>
            <em>条</em>
          </div>
          <div class="summary-card">
            <span>涉及设备</span>
            <strong>{{ reportData.deviceCount }}</strong>
            <em>台</em>
          </div>
          <div class="summary-card warning">
            <span>高风险预警</span>
            <strong>{{ reportData.highRisk }}</strong>
            <em>条</em>
          </div>
          <div class="summary-card success">
            <span>综合研判</span>
            <strong>{{ reportData.riskLevel }}</strong>
            <em>{{ reportData.riskStatus }}</em>
          </div>
        </div>

        <div class="tr-section">
          <h2 class="tr-sec-title">一、总体风险研判</h2>
          <p class="tr-p">
            本报告依据预警记录模块同源数据生成，统计口径与预警分析报表保持一致。统计期为
            <span class="tr-hl">{{ reportData.range }}</span>，{{ currentRole === 'farmer' ? '当前种植区域' : '区域范围内' }}共形成农业气象灾害预警记录
            <span class="tr-hl">{{ reportData.total }}</span>
            条，涉及智能监测设备
            <span class="tr-hl">{{ reportData.deviceCount }}</span>
            台。
          </p>
          <p class="tr-p">
            其中高风险预警
            <span class="tr-hl danger-text">{{ reportData.highRisk }}</span>
            条，中风险预警
            <span class="tr-hl warning-text">{{ reportData.mediumRisk }}</span>
            条，常规预警
            <span class="tr-hl">{{ reportData.lowRisk }}</span>
            条；高风险占比
            <span class="tr-hl danger-text">{{ reportData.highRiskRate }}%</span>。
            当前主要风险类型为
            <span class="tr-hl">{{ reportData.mainRisk }}</span>，综合风险等级评定为
            <span class="tr-hl danger-text">{{ reportData.riskLevel }}</span>。
          </p>
        </div>

        <div class="tr-section">
          <h2 class="tr-sec-title">二、风险类型结构</h2>
          <div class="tr-tag-cloud">
            <span class="tr-tag freeze">冻害预警：{{ reportData.freezeCount }}条</span>
            <span class="tr-tag hot">干热风预警：{{ reportData.hotWindCount }}条</span>
            <span
              class="tr-tag"
              v-for="(tag,index) in reportData.typeStats"
              :key="index"
            >
              {{ tag.name }}：{{ tag.count }}条（{{ tag.percent }}%）
            </span>
          </div>
          <p class="tr-p tr-muted-p">
            风险类型依据预警记录中的预警类型、预警名称、指标字段和处置建议综合识别；其中“低温冻害”“干热风”与预警记录页筛选口径一致。
          </p>
        </div>

        <div class="tr-section">
          <h2 class="tr-sec-title">三、重点设备与指标表现</h2>
          <p class="tr-p">
            本期预警最集中的设备为
            <span class="tr-hl">{{ reportData.topDevice }}</span>，累计触发
            <span class="tr-hl">{{ reportData.topDeviceCount }}</span>
            条，占全部预警的
            <span class="tr-hl">{{ reportData.topDeviceRate }}%</span>。
          </p>
          <div class="tr-tag-cloud">
            <span class="tr-tag">空气温度异常：{{ reportData.airTempCount }}次</span>
            <span class="tr-tag">空气湿度异常：{{ reportData.airHumCount }}次</span>
            <span class="tr-tag">土壤温度异常：{{ reportData.soilTempCount }}次</span>
            <span class="tr-tag">土壤湿度异常：{{ reportData.soilHumCount }}次</span>
          </div>
          <p class="tr-p">
            监测期间记录到的温度指标最高值为
            <span class="tr-hl">{{ reportData.maxTemp }}</span>℃，最低值为
            <span class="tr-hl">{{ reportData.minTemp }}</span>℃。
          </p>
        </div>

        <div class="tr-section">
          <h2 class="tr-sec-title">四、预警明细摘录</h2>
          <table class="warning-table">
            <thead>
              <tr>
                <th>发生时间</th>
                <th>设备</th>
                <th>类型</th>
                <th>等级</th>
                <th>指标</th>
                <th>触警值</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData.recordRows" :key="row.id">
                <td>{{ row.time }}</td>
                <td>{{ row.device }}</td>
                <td>{{ row.type }}</td>
                <td>{{ row.level }}</td>
                <td>{{ row.indicator }}</td>
                <td>{{ row.value }}</td>
              </tr>
              <tr v-if="reportData.recordRows.length === 0">
                <td colspan="6" class="empty-table-cell">本统计周期暂无预警记录</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tr-section">
          <h2 class="tr-sec-title">{{ currentRole === 'farmer' ? '五、田间防控建议' : '五、区域调度建议' }}</h2>
          <div class="tr-advice-box">
            <p class="tr-p">
              {{
                currentRole === 'farmer'
                ? '建议种植户围绕当前风险点开展分区巡查和精准处置：'
                : '建议管理部门围绕重点区域、重点设备和重点风险类型开展统筹调度：'
              }}
            </p>
            <ul class="tr-list">
              <li v-for="(adv,index) in reportData.aiSuggestions" :key="index">
                {{ adv }}
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>

    <!-- 系统内部消息中心抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="🔔 平台系统消息中心"
      size="380px"
    >
      <div v-if="notifications.length === 0" class="empty-msg">
        <el-empty description="暂无新通知" :image-size="80"></el-empty>
      </div>
      <div v-else class="msg-list">
        <div 
          v-for="msg in notifications" 
          :key="msg.id" 
          class="msg-item"
          :class="{'is-unread': !msg.read}"
        >
          <div class="msg-header">
            <span class="msg-title">{{ msg.title }}</span>
            <span class="msg-time">{{ msg.time }}</span>
          </div>
          <div class="msg-content">{{ msg.content }}</div>
          
          <div class="msg-action">
            <el-button link type="primary" size="small" @click="viewReportDetails(msg)">查看报表详情</el-button>
            <el-button link type="info" size="small" v-if="!msg.read" @click="readMessage(msg)">标记已读</el-button>
          </div>
        </div>
      </div>
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Bell, Check } from '@element-plus/icons-vue'
import html2pdf from 'html2pdf.js'

import { listWarningRecord } from '@/api/binZhou/wr/warningRecord'
import { getAgriReport } from '@/api/binZhou/wr/report'

const loading = ref(false)
const submitLoading = ref(false)
const currentRole = ref('farmer')
const reportTimeRange = ref('week')
const parkId = ref('')
const parkOptions = ref([])
const parkLoading = ref(false)
const reportTitle = ref('')
const drawerVisible = ref(false)
const unreadCount = ref(0)

const selectedParkName = computed(() => {
  if (parkId.value === '' || parkId.value === null || parkId.value === undefined) return '全部园区'
  const selected = parkOptions.value.find(item => String(item.id) === String(parkId.value))
  return selected?.name || '所选园区'
})

const notifications = ref([
  {
    id: 1,
    title: '系统欢迎',
    time: '2026-07-01 08:00',
    content: '欢迎使用滨州枣树智慧种植报表引擎，请根据需要配置您的推送规则。',
    read: true
  }
])

const pushForm = ref({
  pushFrequency: 'weekly',
  pushChannel: 'system'
})

const createEmptyReportData = () => ({
  time: '',
  range: '本周',
  total: 0,
  deviceCount: 0,
  highRisk: 0,
  mediumRisk: 0,
  lowRisk: 0,
  highRiskRate: '0.00',
  riskStatus: '相对平稳',
  typeStats: [],
  freezeCount: 0,
  hotWindCount: 0,
  mainRisk: '暂无明显风险',
  riskLevel: '平稳',
  maxTemp: '-',
  minTemp: '-',
  airTempCount: 0,
  airHumCount: 0,
  soilTempCount: 0,
  soilHumCount: 0,
  topDevice: '-',
  topDeviceCount: 0,
  topDeviceRate: '0.00',
  recordRows: [],
  aiSuggestions: []
})

const reportData = ref(createEmptyReportData())

const getWarningTypeText = (type) => {
  const typeMap = {
    '1': '低温冻害',
    '2': '干热风'
  }
  return typeMap[String(type)] || '其他预警'
}

const formatReportTime = (date) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const parseDate = (value) => {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const normalized = String(value).trim().replace(/-/g, '/')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const getRowDate = (row, fields) => {
  for (const field of fields) {
    const date = parseDate(row?.[field])
    if (date) return date
  }
  return null
}

const filterLastSevenDays = (rows, fields) => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  return rows.filter((row) => {
    const date = getRowDate(row, fields)
    // 若组员接口暂未返回时间字段，保留该条数据，避免整块统计意外变成 0。
    return !date || (date >= start && date <= now)
  })
}

const getReportRange = () => {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (reportTimeRange.value === 'month') {
    start.setDate(1)
  } else {
    const weekday = start.getDay() === 0 ? 7 : start.getDay()
    start.setDate(start.getDate() - weekday + 1)
  }

  return {
    start,
    end,
    label: `${reportTimeRange.value === 'month' ? '本月' : '本周'}（${formatDateOnly(start)} 至 ${formatDateOnly(end)}）`
  }
}

const formatDateOnly = (date) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const formatDateTimeParam = (date, endOfDay = false) => {
  const time = endOfDay ? '23:59:59' : '00:00:00'
  return `${formatDateOnly(date)} ${time}`
}

const getWarningLevelStats = (level) => {
  if ([3, 4, '3', '4', '高风险', '极高风险'].includes(level)) return 'high'
  if ([2, '2', '中风险'].includes(level)) return 'medium'
  return 'low'
}

const getWarningLevelText = (level) => {
  const normalized = getWarningLevelStats(level)
  if (normalized === 'high') return '高风险'
  if (normalized === 'medium') return '中风险'
  return '常规预警'
}

const getWarningRecordType = (row) => {
  const type = String(row.warningType ?? row.warning_type ?? '')
  const content = `${type}${row.warningName ?? ''}${row.warningTitle ?? ''}${row.warningContent ?? ''}${row.aiSuggestion ?? ''}${row.indicatorCode ?? ''}`

  if (type === '1' || /冻害|低温|霜冻|寒潮/.test(content)) return '低温冻害'
  if (type === '2' || /干热风|高温|热风|干旱/.test(content)) return '干热风'
  return getWarningTypeText(type)
}

const getIndicatorCategory = (row) => {
  const code = String(row.indicatorCode ?? row.indicator_code ?? '').toUpperCase()
  if (/AIR.*HUM|HUMI|HUMIDITY/.test(code)) return 'airHum'
  if (/AIR.*TEMP|TEMP/.test(code) && !/SOIL/.test(code)) return 'airTemp'
  if (/SOIL.*TEMP/.test(code)) return 'soilTemp'
  if (/SOIL.*HUM|SOIL.*MOIST|MOISTURE/.test(code)) return 'soilHum'
  return ''
}

const getRecordTime = (row) => {
  const date = getRowDate(row, ['warningTime', 'warning_time', 'createTime', 'create_time'])
  return date ? formatReportTime(date) : '-'
}

const buildReportSuggestions = (data) => {
  const suggestions = []
  const rolePrefix = currentRole.value === 'farmer' ? '建议立即巡查田块' : '建议组织园区巡检'

  if (data.highRisk > 0) {
    suggestions.push(`${rolePrefix}，优先核查高风险预警点位，形成“设备-地块-处置人”闭环记录。`)
  }
  if (data.freezeCount > 0) {
    suggestions.push('针对低温冻害风险，提前落实覆盖、增温、保温和夜间温度复核措施，重点关注低洼及通风口区域。')
  }
  if (data.hotWindCount > 0) {
    suggestions.push('针对干热风风险，建议加强灌溉补水、棚内通风和树体水分管理，避免高温低湿叠加造成花果损伤。')
  }
  if (data.topDevice !== '-') {
    suggestions.push(`设备“${data.topDevice}”预警相对集中，建议校验传感器状态并复核周边小气候环境。`)
  }
  if (!suggestions.length) {
    suggestions.push('本周期未发现明显农业气象灾害预警，建议保持日常监测频次，持续关注温湿度突变。')
  }

  return suggestions
}

const getResponseRows = (settledResult) => {
  if (settledResult.status !== 'fulfilled') return []
  const response = settledResult.value || {}
  if (response.code !== undefined && Number(response.code) !== 200) return []
  if (Array.isArray(response.rows)) return response.rows
  if (Array.isArray(response.data?.rows)) return response.data.rows
  if (Array.isArray(response.data)) return response.data
  return []
}

const getResponseData = (response) => {
  if (!response) return {}
  if (response.code !== undefined && Number(response.code) !== 200) return {}
  return response.data ?? response
}

const normalizeParkOptions = (rows) => {
  if (!Array.isArray(rows)) return []
  return rows
    .map(item => ({
      id: item.id ?? item.parkId ?? item.park_id,
      name: item.name ?? item.parkName ?? item.park_name
    }))
    .filter(item => item.id !== null && item.id !== undefined && item.name)
}

const loadParkOptions = async () => {
  parkLoading.value = true
  try {
    const range = getReportRange()
    const response = await getAgriReport({
      parkId: '',
      beginTime: formatDateOnly(range.start),
      endTime: formatDateOnly(range.end)
    })
    const payload = getResponseData(response)
    parkOptions.value = normalizeParkOptions(
      payload.parkOptions ?? payload.data?.parkOptions ?? response?.parkOptions
    )
  } catch (error) {
    console.error('园区列表加载失败', error)
    parkOptions.value = []
    ElMessage.warning('园区列表加载失败，当前按全部园区查询')
  } finally {
    parkLoading.value = false
  }
}

const handleSaveConfig = async () => {
  submitLoading.value = true
  setTimeout(() => {
    ElMessage.success('🎉 报表推送规则保存成功！')
    submitLoading.value = false
    if (pushForm.value.pushFrequency === 'realtime') simulateSystemPush()
  }, 600)
}

const simulateSystemPush = () => {
  setTimeout(() => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })
    ElNotification({
      title: '您有一份新的分析报告',
      message: '【即时推送】预警分析报告已生成，系统提取了最新数据，请查阅。',
      type: 'warning',
      duration: 5000,
      position: 'top-right'
    })
    notifications.value.unshift({
      id: Date.now(),
      title: '🔔 报告生成通知',
      time: timeStr,
      content: '农情预警分析报告已生成完毕，请及时研判。',
      read: false
    })
    unreadCount.value += 1
  }, 1500)
}

const readMessage = (msg) => {
  if (!msg.read) {
    msg.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
}

const viewReportDetails = (msg) => {
  readMessage(msg)
  drawerVisible.value = false
  ElMessage.success('正在为您加载报告数据...')
  window.scrollTo({ top: 0, behavior: 'smooth' })
  fetchReportData()
}

const calculateRisk = () => {
  const highRate = Number(reportData.value.highRiskRate)

  if (reportData.value.highRisk > 0 || highRate >= 30) {
    reportData.value.riskStatus = '需立即处置'
  } else if (reportData.value.mediumRisk > 0 || highRate >= 15) {
    reportData.value.riskStatus = '需重点关注'
  } else {
    reportData.value.riskStatus = '相对平稳'
  }
}

const fetchReportData = async () => {
  loading.value = true
  try {
    const range = getReportRange()
    const res = await listWarningRecord({
      pageNum: 1,
      pageSize: 1000,
      warningLevel: '',
      warningType: '',
      parkId: parkId.value || undefined,
      orderByColumn: 'warning_time',
      isAsc: 'desc',
      params: {
        beginTime: formatDateTimeParam(range.start),
        endTime: formatDateTimeParam(range.end, true)
      }
    })

    const rows = getResponseRows({ status: 'fulfilled', value: res })
    const data = rows.filter(row => {
      const date = getRowDate(row, ['warningTime', 'warning_time', 'createTime', 'create_time'])
      return !date || (date >= range.start && date <= range.end)
    })

    const nextData = createEmptyReportData()
    nextData.time = formatReportTime(new Date())
    nextData.range = range.label
    nextData.total = data.length

    const devices = new Set()
    const deviceMap = new Map()
    const typeMap = new Map()
    let maxTemp = -Infinity
    let minTemp = Infinity

    data.forEach(row => {
      const deviceName = row.deviceName || row.device_name || '未知设备'
      const typeName = getWarningRecordType(row)
      const levelType = getWarningLevelStats(row.warningLevel ?? row.warning_level)
      const indicatorCategory = getIndicatorCategory(row)
      const value = Number(row.currentValue ?? row.current_value)

      devices.add(deviceName)
      deviceMap.set(deviceName, (deviceMap.get(deviceName) || 0) + 1)
      typeMap.set(typeName, (typeMap.get(typeName) || 0) + 1)

      if (levelType === 'high') nextData.highRisk += 1
      else if (levelType === 'medium') nextData.mediumRisk += 1
      else nextData.lowRisk += 1

      if (typeName === '低温冻害') nextData.freezeCount += 1
      if (typeName === '干热风') nextData.hotWindCount += 1

      if (indicatorCategory === 'airTemp') nextData.airTempCount += 1
      if (indicatorCategory === 'airHum') nextData.airHumCount += 1
      if (indicatorCategory === 'soilTemp') nextData.soilTempCount += 1
      if (indicatorCategory === 'soilHum') nextData.soilHumCount += 1

      if (Number.isFinite(value) && (indicatorCategory === 'airTemp' || indicatorCategory === 'soilTemp')) {
        maxTemp = Math.max(maxTemp, value)
        minTemp = Math.min(minTemp, value)
      }
    })

    nextData.deviceCount = devices.size
    nextData.highRiskRate = data.length ? ((nextData.highRisk / data.length) * 100).toFixed(2) : '0.00'
    nextData.maxTemp = maxTemp === -Infinity ? '-' : maxTemp
    nextData.minTemp = minTemp === Infinity ? '-' : minTemp

    nextData.typeStats = Array.from(typeMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: data.length ? ((count / data.length) * 100).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.count - a.count)

    const topType = nextData.typeStats[0]
    nextData.mainRisk = topType?.count ? topType.name : '暂无明显风险'

    const topDevice = Array.from(deviceMap.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topDevice) {
      nextData.topDevice = topDevice[0]
      nextData.topDeviceCount = topDevice[1]
      nextData.topDeviceRate = data.length ? ((topDevice[1] / data.length) * 100).toFixed(2) : '0.00'
    }

    if (nextData.highRisk > 0 || Number(nextData.highRiskRate) >= 30) {
      nextData.riskLevel = '高风险'
      nextData.riskStatus = '需立即处置'
    } else if (nextData.mediumRisk > 0 || nextData.freezeCount + nextData.hotWindCount >= 5) {
      nextData.riskLevel = '中风险'
      nextData.riskStatus = '需重点关注'
    } else {
      nextData.riskLevel = '低风险'
      nextData.riskStatus = '相对平稳'
    }

    nextData.recordRows = data.slice(0, 8).map((row, index) => ({
      id: row.id || row.warningRecordId || `${index}-${row.warningTime || row.createTime || ''}`,
      time: getRecordTime(row),
      device: row.deviceName || row.device_name || '未知设备',
      type: getWarningRecordType(row),
      level: getWarningLevelText(row.warningLevel ?? row.warning_level),
      indicator: row.indicatorCode || row.indicator_code || '-',
      value: row.currentValue ?? row.current_value ?? '-'
    }))

    nextData.aiSuggestions = buildReportSuggestions(nextData)
    reportData.value = nextData

    reportTitle.value = currentRole.value === 'farmer'
      ? `冬枣种植户农业预警${reportTimeRange.value === 'month' ? '月报' : '周报'}`
      : `区域冬枣农业预警综合${reportTimeRange.value === 'month' ? '月报' : '周报'}`
  } catch (e) {
    console.error('报告生成失败', e)
    ElMessage.error('获取报告数据失败')
  } finally {
    loading.value = false
  }
}

const exportToPDF = () => {
  ElMessage.success('正在为您生成高清排版的 PDF 文件，请稍候...')
  const element = document.getElementById('report-content')
  const datePart = reportData.value.time.split(' ')[0].replace(/\//g, '')
  const opt = {
    margin: [10, 0, 10, 0],
    filename: `冻害与干热风风险分析报告_${datePart}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }
  html2pdf().set(opt).from(element).save().then(() => {
    ElMessage.success('PDF 报告导出成功！')
  })
}

const shareReport = async () => {
  const mockLink = `${window.location.origin}${window.location.pathname}#/share/report?id=${Date.now()}&role=${currentRole.value}&parkId=${parkId.value || ''}`
  try {
    await navigator.clipboard.writeText(mockLink)
    ElMessage.success('✅ 专属分享链接已复制到剪贴板！')
  } catch (error) {
    const input = document.createElement('input')
    input.setAttribute('value', mockLink)
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('✅ 专属分享链接已复制到剪贴板！')
  }
}

onMounted(async () => {
  await loadParkOptions()
  await fetchReportData()
})
</script>

<style scoped>
.report-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.config-card {
  width: 100%;
  max-width: 900px;
  background-color: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  border: 1px solid #e1e9e1;
}
.config-title { font-size: 16px; font-weight: bold; margin-bottom: 16px; border-bottom: 1px solid #f0f2f5; padding-bottom: 12px; }
.config-form { display: flex; flex-direction: column; gap: 14px; }
.form-item { display: flex; align-items: center; }
.form-label { font-size: 14px; font-weight: bold; color: #606266; width: 85px; }
.form-submit { text-align: right; margin-top: 6px; }
.is-active-radio.el-radio.is-bordered.is-checked { border-color: #67C23A; background-color: #f0f9eb; }

.report-tools {
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  background-color: #fff;
  padding: 12px 16px;
  border: 1px solid #e6edf5;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.tool-left,
.tool-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}
.tool-left { flex: 1 1 auto; }
.tool-right {
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 8px;
}
.tool-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border-right: 1px solid #edf1f7;
}
.tool-filter-group:last-child {
  border-right: none;
  padding-right: 0;
}
.tool-label {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  line-height: 32px;
}
.park-select {
  width: 170px;
}
.park-select :deep(.el-select__wrapper) {
  min-height: 32px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}
.park-select :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #2563eb inset;
}
.standard-tabs {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 2px;
  background: #f4f7fb;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}
.standard-tabs :deep(.el-radio-button__inner) {
  min-width: 76px;
  height: 28px;
  padding: 0 12px;
  border: none !important;
  border-radius: 7px !important;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  line-height: 28px;
  box-shadow: none !important;
}
.standard-tabs :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.22) !important;
}
.tool-action-btn {
  height: 32px;
  min-width: 92px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}
.tool-action-btn :deep(.el-icon) {
  margin-right: 5px;
  font-size: 14px;
}
.tool-action-btn.secondary {
  color: #475569;
  border-color: #d9e2ec;
  background: #fff;
}
.tool-action-btn.secondary:hover {
  color: #2563eb;
  border-color: #9dbaf7;
  background: #f5f8ff;
}
.tool-action-btn.primary {
  border-color: #2563eb;
  background: #2563eb;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.2);
}
.custom-badge {
  display: inline-flex;
  align-items: center;
  margin-right: 0;
}
@media screen and (max-width: 992px) {
  .report-tools {
    align-items: flex-start;
    flex-direction: column;
  }
  .tool-left,
  .tool-right {
    width: 100%;
  }
  .tool-right {
    justify-content: flex-start;
  }
}
@media screen and (max-width: 768px) {
  .report-tools { padding: 12px; }
  .tool-filter-group {
    width: 100%;
    justify-content: space-between;
    padding-right: 0;
    border-right: none;
  }
  .park-filter-group { align-items: center; }
  .park-select { width: auto; flex: 1; }
  .standard-tabs { flex: 1; justify-content: center; }
  .standard-tabs :deep(.el-radio-button) { flex: 1; }
  .standard-tabs :deep(.el-radio-button__inner) { width: 100%; min-width: 0; }
  .tool-action-btn { flex: 1; min-width: 0; }
}

/* 纯净公文研报体纸张样式 */
.text-report-paper {
  background-color: #fff;
  width: 100%;
  max-width: 900px;
  padding: 60px 80px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.tr-header {
  text-align: center;
  margin-bottom: 50px;
  padding-bottom: 20px;
}
.tr-title {
  font-size: 28px;
  color: #1e293b;
  margin-bottom: 20px;
  font-weight: normal; 
  letter-spacing: 2px;
}
.tr-meta {
  font-size: 14px;
  display: flex;
  justify-content: center;
  gap: 15px;
}

.tr-body { color: #333333; }
.report-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 34px;
}
.summary-card {
  min-height: 96px;
  padding: 14px 12px;
  background: linear-gradient(180deg, #f8fbf8, #ffffff);
  border: 1px solid #dfe9df;
  border-radius: 10px;
  text-align: center;
}
.summary-card span,
.summary-card em {
  display: block;
  color: #667085;
  font-size: 13px;
  font-style: normal;
}
.summary-card strong {
  display: block;
  margin: 6px 0 2px;
  color: #1f5138;
  font-size: 26px;
  font-weight: 800;
}
.summary-card.danger strong { color: #c45656; }
.summary-card.warning strong { color: #b7791f; }
.summary-card.success strong { color: #2c7a4b; }
.tr-section { margin-bottom: 40px; }
.tr-sec-title {
  font-size: 18px;
  color: #2c7a4b; 
  font-weight: bold;
  margin-bottom: 18px;
}
.tr-p {
  line-height: 2;
  font-size: 15px;
  margin-bottom: 14px;
  text-align: justify;
}

.tr-hl { color: #2c7a4b; font-weight: bold; padding: 0 4px; }
.danger-text { color: #c45656; }
.warning-text { color: #b7791f; }
.tr-muted-p { color: #667085; font-size: 14px; }

.tr-tag-cloud { display: flex; flex-wrap: wrap; gap: 12px; }
.tr-tag {
  display: inline-block;
  background-color: #e8f5e9;
  color: #2c7a4b;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 14px;
}
.tr-tag.freeze { color: #3b6ea8; background: #eef6ff; }
.tr-tag.hot { color: #b7791f; background: #fff7e6; }
.warning-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.warning-table th {
  padding: 10px 8px;
  color: #2c7a4b;
  background: #f1f7f2;
  border: 1px solid #dfe9df;
}
.warning-table td {
  padding: 9px 8px;
  color: #334155;
  border: 1px solid #e8eee8;
  text-align: center;
}
.empty-table-cell {
  color: #909399 !important;
  text-align: center;
}

.tr-advice-box { margin-top: 10px; }
.tr-list { padding-left: 20px; margin: 0; }
.tr-list li { line-height: 2; font-size: 15px; margin-bottom: 8px; color: #333; }

.empty-msg { padding-top: 50px; }
.msg-list { display: flex; flex-direction: column; gap: 12px; }
.msg-item { background-color: #f8f9fb; border: 1px solid #ebeef5; border-radius: 6px; padding: 14px; transition: all 0.3s; }
.msg-item:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.msg-item.is-unread { background-color: #fff; border-left: 4px solid #F56C6C; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.msg-title { font-weight: bold; font-size: 14px; color: #303133; }
.msg-time { font-size: 12px; color: #909399; }
.msg-content { font-size: 13px; color: #606266; line-height: 1.5; margin-bottom: 12px; }
.msg-action { text-align: right; border-top: 1px dashed #ebeef5; padding-top: 8px; }

@media print {
  .hide-on-print { display: none !important; }
  .report-container { background-color: #fff; padding: 0; }
  .text-report-paper { box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
}
</style>
