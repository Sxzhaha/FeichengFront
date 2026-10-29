<template>
  <div class="frontend-dashboard">
    <el-header class="header">
      <div class="logo"> 滨州冬枣智慧种植平台 - 预警记录</div>
      <div class="user-info">
        <el-button type="danger" link @click="goBackAdmin" style="color: #ffcccc; font-size: 15px;">返回后台管理</el-button>
      </div>
    </el-header>

    <el-main class="main-content">
      <!-- 🌟 顶部统计卡片 -->
      <el-row :gutter="20" class="stat-row">
        <el-col :span="6" v-for="(item, index) in statData" :key="index">
          <el-card 
            shadow="hover" 
            class="stat-card"
            :class="{ 'is-clickable': item.clickable }"
            @click="handleStatClick(item)"
          >
            <div class="stat-title">{{ item.title }}</div>
            <div class="stat-value" :style="{ color: item.color }">{{ item.value }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 🌟 中部：24H趋势 & ⏱️ 预警快报 -->
      <el-row :gutter="20" class="chart-row">
        <el-col :span="16" class="chart-col">
          <el-card shadow="never" class="chart-card risk-main-card">
            <template #header>
              <div class="card-header">
                <span>
                  📈 冻害与干热风风险预测
                  <span style="font-size: 13px; font-weight: normal; color: #909399; margin-left: 10px;">
                                                            (历史5天实测 + 未来7天天气预测 + 灾害风险概率)


                  </span>
                </span>
                <div style="display:flex;align-items:center;gap:10px;">
                  <el-select
                    v-model="selectedParkId"
                    size="small"
                    style="width:120px"
                    @change="handleParkChange"
                  >
                    <el-option
                      v-for="item in parkList"
                      :key="item.id"
                      :label="item.name"
                      :value="item.id"
                    />
                  </el-select>
                  <el-tag type="success" size="default">
                    {{ currentParkName }}
                  </el-tag>
                </div>
              </div>
            </template>
            <div style="font-size:16px;font-weight:700;margin:10px 0;">
  ❄️ 低温冻害风险预警结果
</div>
<div ref="trendChartRef" class="risk-chart"></div>
<div style="height:20px;border-top:1px solid #ebeef5;margin:15px 0;"></div>
<div style="font-size:16px;font-weight:700;margin:10px 0;">
  🔥 干热风风险预警结果
</div>
            <div ref="heatTrendChartRef" class="risk-chart"></div>
          </el-card>
        </el-col>

        <el-col :span="8" class="chart-col">
          <!-- ✅ 融合组员逻辑的全新：实时预警快报 -->
          <el-card v-loading="alertLoading" shadow="never" class="alert-card risk-alert-card">
            <template #header>
              <div class="card-header">
                <div class="card-title-box">
                  <span style="font-weight: bold; color: #303133;">最新预警快报</span>
                  <span class="live-badge"><span class="badge-dot"></span>实时更新</span>
                </div>
                <el-button type="primary" link style="font-size: 14px; font-weight: bold; color: #2ca65a;" @click="refreshAlerts">同步刷新</el-button>
              </div>
            </template>
            
            <el-scrollbar class="custom-scrollbar">
              <div class="alert-list">
                <template v-if="alertList.length > 0">
                  <div v-for="alert in alertList" :key="alert.id" class="alert-item" :class="alert.level">
                    <div class="alert-header-row">
                      <span class="alert-tag" :class="alert.level">{{ alert.levelText }}</span>
                      <div class="alert-time">{{ alert.time }}</div>
                    </div>
                    <div class="alert-desc" :title="alert.desc">{{ alert.desc }}</div>
                  </div>
                </template>
                <div v-else class="flex-center" style="height: 100%; font-size: 13px; color: #909399; padding-top: 100px;">
                  暂无未处理的预警信息
                </div>
              </div>
            </el-scrollbar>
          </el-card>

        </el-col>
      </el-row>

      <!-- 🌟 底部：农情全景分析 -->
      <el-row :gutter="20" class="bottom-row">
        
        <!-- 模块1：农业气象灾害风险态势 -->
        <el-col :span="8">
          <el-card shadow="never" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>🌡️ 农业气象灾害风险态势 (近30天)</span>
              </div>
            </template>
            <div ref="typeChartRef" style="width: 100%; height: 350px;"></div>
          </el-card>
        </el-col>

        <!-- 模块2：带多维筛选的高级明细报表 -->
        <el-col :span="16">
          <el-card shadow="never" class="chart-card" style="height: 100%;">
            <template #header>
              <div class="card-header">
                <span>📑 预警分析报表</span>
                
                <div class="report-filter-bar">
                  <el-radio-group v-model="reportTimeRange" size="default" @change="handleReportFilterChange">
                    <el-radio-button label="all">全部</el-radio-button>
                    <el-radio-button label="week">本周</el-radio-button>
                    <el-radio-button label="month">本月</el-radio-button>
                    
                  </el-radio-group>

                  <el-select v-model="reportQueryParams.warningLevel" size="default" placeholder="预警等级" class="filter-item" @change="handleReportFilterChange">
                    <el-option label="全部等级" value="" />
                    <el-option label="高风险 (3级)" value="3" />
                    <el-option label="中风险 (2级)" value="2" />
                    <el-option label="常规预警 (1级)" value="1" />
                  </el-select>

                  <el-select v-model="reportQueryParams.warningType" size="default" placeholder="预警类型" class="filter-item" @change="handleReportFilterChange">
                    <el-option label="全部类型" value="" />
                    <el-option label="低温冻害" value="1" />
                    <el-option label="干热风" value="2" />
                  </el-select>
                </div>
              </div>
            </template>
            
            <el-table 
              v-loading="reportLoading"
              :data="reportTableData" 
              height="285px" 
              class="modern-report-table"
              :header-cell-style="{ background: '#f4f7f5', color: '#2c7a4b', fontWeight: 'bold', borderBottom: '2px solid #e4e7ed', padding: '12px 0', fontSize: '15px' }"
              :cell-style="{ borderBottom: '1px dashed #ebeef5', padding: '10px 0', fontSize: '15px' }"
            >
              <el-table-column prop="warningTime" label="预警发生时间" width="185" align="center">
                <template #default="scope">
                  <span class="mono-time">
                    <el-icon class="icon-gray"><Clock /></el-icon>
                    {{ scope.row.warningTime }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column prop="deviceName" label="涉事设备" width="160" align="center" show-overflow-tooltip>
                <template #default="scope">
                  <div class="device-cell">
                    <el-icon class="icon-blue"><Cpu /></el-icon>
                    <span class="device-text">{{ scope.row.deviceName }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="warningType" label="预警归类" width="110" align="center">
                <template #default="scope">
                  <el-tag :type="getAlertLevelType(scope.row.warningLevel)" effect="light" size="default" disable-transitions>
                    {{ getWarningTypeText(scope.row.warningType) }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="indicatorCode" label="核心监测指标" width="180" align="center" show-overflow-tooltip>
                <template #default="scope">
                  <el-tag type="info" effect="plain" round disable-transitions class="indicator-tag">
                    {{ scope.row.indicatorCode }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="aiSuggestion" label="💡 智能处置建议" min-width="200" align="center" show-overflow-tooltip>
                <template #default="scope">
                  <span style="color: #606266;">{{ scope.row.aiSuggestion || '系统已记录，待进一步评估' }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="currentValue" label="触警数值" width="110" align="center">
                <template #default="scope">
                  <div class="danger-value-box">
                    <span>{{ scope.row.currentValue }}</span>
                    <el-icon><TopRight /></el-icon>
                  </div>
                </template>
              </el-table-column>

              <template #empty>
                <div class="no-data" style="line-height: 200px;">
                  <el-empty description="暂无符合筛选条件的预警数据" :image-size="60"></el-empty>
                </div>
              </template>
            </el-table>

            <div class="dialog-pagination modern-pagination">
              <el-pagination
                v-model:current-page="reportQueryParams.pageNum"
                v-model:page-size="reportQueryParams.pageSize"
                :total="reportTotal"
                :page-sizes="[5, 10, 20]"
                layout="total, sizes, prev, pager, next"
                @current-change="fetchReportData"
                @size-change="handleReportSizeChange"
                background
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-main>

    <!-- 【高端农情智能体检与指挥调度】弹窗 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="80%" destroy-on-close class="advanced-diagnosis-dialog">
      <el-row :gutter="24" v-loading="dialogLoading">
        <el-col :span="9" class="diagnosis-left-panel">
          <div class="panel-card-title">🤖 智能数据分析简报</div>
          <div class="diagnosis-content-box">
            <div class="diag-item">
              <span class="diag-label">📊 气象灾害风险研判：</span>
              <p>系统检测近24小时农业气象环境变化，共发现 <strong style="color: #E6A23C; font-size: 16px;">{{ dialogTotal }}</strong> 次气象灾害风险。当前枣树处于 <strong style="color: #2ca65a;">{{ currentPhenology.name }}</strong>，主要关注低温冻害与干热风风险，请及时结合温度变化采取防护措施。</p>
            </div>
            
            <div class="diag-item">
              <span class="diag-label">🌡️ 气象灾害风险评估：</span>
              <p>
                基于气象传感数据综合分析，当前重点监测低温冻害与干热风风险。
                系统结合空气温度、湿度等指标变化，判断当前农业气象灾害影响程度，并生成对应防控建议。
              </p>
            </div>

            <div class="diag-item">
              <span class="diag-label">💡 阶段应急处置建议：</span>
              <ul>
                <li>针对干热风风险，加强田间水分管理，及时补充灌溉，降低高温胁迫影响。</li>
                <li>针对冻害风险，提前采取覆盖、保温等措施，降低低温对冬枣生长造成的影响。</li>
              </ul>
            </div>
          </div>
        </el-col>
        <el-col :span="15" class="diagnosis-right-table">
          <div class="panel-card-title">⚠️ 冻害与干热风风险流水明细</div>
          <el-table :data="dialogTableData" height="365px" stripe size="default" border style="font-size: 14px; width: 100%;">
            <el-table-column label="发生时间" prop="warningTime" width="165" align="center">
              <template #default="scope">
                <span style="font-family: monospace; color: #606266;">{{ scope.row.warningTime || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="关联监测设备" prop="deviceName" width="150" align="center" show-overflow-tooltip />
            <el-table-column label="触发监测指标" prop="indicatorCode" width="150" align="center" show-overflow-tooltip>
              <template #default="scope">
                <el-tag type="info" size="small" effect="plain">{{ scope.row.indicatorCode || '未知' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="当前数值" width="95" prop="currentValue" align="center">
              <template #default="scope">
                <strong style="color: #F56C6C;">{{ scope.row.currentValue }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="风险评估" min-width="100" align="center">
              <template #default="scope">
                <el-tag :type="getAlertLevelType(scope.row.warningLevel)" size="small" effect="dark">
                  {{ scope.row.warningType === '冻害' || scope.row.warningType === '低温冻害' ? '冻害风险' : '干热风风险' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div class="dialog-pagination" style="margin-top: 14px; text-align: right;">
            <el-pagination
              v-model:current-page="dialogQueryParams.pageNum"
              v-model:page-size="dialogQueryParams.pageSize"
              :total="dialogTotal"
              layout="total, prev, pager, next"
              @current-change="fetchDialogData"
            />
          </div>
        </el-col>
      </el-row>
    </el-dialog>

    <!-- 实时监测区域弹窗 -->
    <el-dialog title="实时监测区域" v-model="areaDialogVisible" width="520px" destroy-on-close>
      <el-table :data="parkList" border stripe style="font-size: 15px; width: 100%;">
        <el-table-column label="序号" type="index" width="80" align="center" />
        <el-table-column label="监测区域" prop="name" align="center" />
        <el-table-column label="当前状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.id === selectedParkId ? 'success' : 'info'">
              {{ scope.row.id === selectedParkId ? '当前查看' : '正常监测' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button type="primary" link @click="handleAreaRowClick(scope.row)">查看预测</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <!-- 监控任务列表弹窗 -->
    <el-dialog :title="taskDialogTitle" v-model="taskDialogVisible" width="60%" destroy-on-close>
      <el-table v-loading="taskDialogLoading" :data="taskTableData" height="420px" stripe border style="font-size: 15px;">
        <el-table-column label="任务名称" prop="taskName" min-width="220" align="center" show-overflow-tooltip />
        <el-table-column label="关联模板" prop="templateName" min-width="220" align="center" show-overflow-tooltip />
        <el-table-column label="监控频率(定时)" prop="cronExpression" width="150" align="center" />
        <el-table-column label="监控开始时间" prop="monitorStartTime" width="130" align="center" />
        <el-table-column label="监控结束时间" prop="monitorEndTime" width="130" align="center" />
        <el-table-column label="运行状态" width="120" align="center">
          <template #default="scope">
            <el-tag type="success" effect="dark" v-if="scope.row.status === 'running'">
              <el-icon style="vertical-align: middle; margin-right: 2px"><VideoPlay /></el-icon> 运行中
            </el-tag>
            <el-tag type="info" effect="dark" v-else>已停止</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="dialog-pagination">
        <el-pagination
          v-model:current-page="taskQueryParams.pageNum"
          v-model:page-size="taskQueryParams.pageSize"
          :total="taskDialogTotal"
          layout="total, prev, pager, next, jumper"
          @current-change="fetchTaskDialogData"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { getWeatherTrend } from "@/api/binZhou/wr/weatherTrend";
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { VideoPlay, Clock, Cpu, TopRight } from '@element-plus/icons-vue'
 

import { listWarningRecord } from '@/api/binZhou/wr/warningRecord'
import { listTask } from '@/api/binZhou/wr/task' 
import { listPest } from '@/api/binZhou/xwq/pest'

import { listWarnRecord } from "@/api/binZhou/ld/iot/warnRecord"
import { listWeatherWarn } from "@/api/binZhou/ld/iot/weatherWarn"
import { parseTime } from '@/utils/ruoyi'


const router = useRouter()

// 园区切换
const selectedParkId = ref(1)

const parkList = [
  { id: 1, name: '马庄园区1' },
  { id: 2, name: '滨州园区' },
  { id: 3, name: '马庄园区2' }
]

const currentParkName = ref('马庄园区1')
const areaDialogVisible = ref(false)

const handleParkChange = () => {
  const park = parkList.find(item => item.id === selectedParkId.value)
  currentParkName.value = park ? park.name : ''
  fetchWeatherTrendChart()
}

const handleAreaRowClick = (row) => {
  selectedParkId.value = row.id
  currentParkName.value = row.name
  areaDialogVisible.value = false
  fetchWeatherTrendChart()
}

let currentClickType = '' 

const testWeatherTrend = async () => {
  try {
    const response = await getWeatherTrend({
      parkId: 1,
      historyDays: 5,
      forecastDays: 7
    });

    console.log("天气趋势接口返回：", response);
  } catch (error) {
    console.error("天气趋势接口请求失败：", error);
  }
};
getWeatherTrend({
    parkId: 1,
    historyDays: 5,
    forecastDays: 7
}).then(res => {
    console.log("======天气接口======");
    console.log(JSON.stringify(res, null, 2));
});

const statData = ref([
  { id: 'stations', title: '实时监测区域', value: '-', color: '#67C23A', clickable: true },
  { id: 'today', title: '今日新增预警', value: '-', color: '#E6A23C', clickable: true },
  { id: 'unhandled', title: '未处理高危预警', value: '-', color: '#F56C6C', clickable: true },
  { id: 'tasks', title: '运行中监控任务', value: '-', color: '#409EFF', clickable: true } 
])

const noticeLoading = ref(false)
const controlLoading = ref(false)

const selectedPhenologyId = ref(2) 
const currentPhenology = ref({ name: '', workGuide: '', warnGuide: '' })

const phenologyRules = [
  { id: 1, months: [4], name: '冬枣萌芽展叶期', shortName: '萌芽期', work: '做好促芽肥追施，适度随水灌溉，促进新梢和叶片整齐匀称抽发。', warn: '谨防春季寒潮及大风导致刚萌发的新芽冻伤受损，随时关注小气候监控。' },
  { id: 2, months: [5, 6], name: '冬枣开花坐果期', shortName: '开花期', work: '严格控制开花期大棚内突破高温界限，合理喷施硼肥提高授粉和坐果质量。', warn: '控制棚内相对湿度不要过高，高湿高闷环境极易诱发枣炭疽病和黑斑病。' },
  { id: 3, months: [7, 8], name: '果实快速膨大期', shortName: '膨大期', work: '此阶段为水分和养分需求高峰，加大高钾型复合肥配比，注意微量元素追补。', warn: '夏秋高发强降雨季节注意棚外排涝，防范大棚土壤积水导致枣树沤根或盐渍化。' },
  { id: 4, months: [9, 10], name: '冬枣成熟采收期', shortName: '采收期', work: '严格控水以利于果实糖分快速积累，适时分批次采收转色全面、口感成熟的冬枣。', warn: '防范外界雨水倒灌引发大面积烂果裂果，严密监控气象设备波动实况。' },
  { id: 5, months: [11, 12, 1, 2, 3], name: '落叶休眠期', shortName: '休眠期', work: '全面开展清园冬剪，修剪清除病虫枯枝并集中销毁，重施腐熟有机肥和土杂肥。', warn: '北方冬季寒冷，注意管道、阀门及监测端户外传感设备的防冻防开裂保护。' }
]

const handlePhenologyChange = (id) => {
  selectedPhenologyId.value = id
  const matched = phenologyRules.find(item => item.id === id)
  if (matched) {
    currentPhenology.value = { name: matched.name, workGuide: matched.work, warnGuide: matched.warn }
  }
}

const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogLoading = ref(false)
const dialogTableData = ref([])
const dialogTotal = ref(0)
const dialogPestTotal = ref(0)
const dialogTopPest = ref('-')
const dialogQueryParams = ref({ pageNum: 1, pageSize: 10, warningLevel: undefined })

const taskDialogVisible = ref(false)
const taskDialogTitle = ref('')
const taskDialogLoading = ref(false)
const taskTableData = ref([])
const taskDialogTotal = ref(0)
const taskQueryParams = ref({ pageNum: 1, pageSize: 10, status: 'running' })

const reportTimeRange = ref('all')
const reportLoading = ref(false)
const reportTableData = ref([])
const reportTotal = ref(0)
const reportQueryParams = ref({ 
  pageNum: 1, 
  pageSize: 5, 
  warningLevel: "", 
  warningType: "",
  orderByColumn: 'warning_time', 
  isAsc: 'desc',
  params: {}
})

const alertList = ref([])
const alertLoading = ref(false)
const trendRiskAlerts = ref([])
let alertRefreshTimer = null

const mergeTrendRiskAlertsIntoList = (baseAlerts = []) => {
  const combined = [...trendRiskAlerts.value, ...baseAlerts]
  combined.sort((a, b) => {
    const timeA = a.rawTime ? new Date(a.rawTime).getTime() : 0
    const timeB = b.rawTime ? new Date(b.rawTime).getTime() : 0
    return timeB - timeA
  })

  const uniqueAlerts = []
  const seen = new Set()
  combined.forEach(item => {
    const key = item.sourceKey || `${item.time}|${item.levelText}|${item.desc}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueAlerts.push(item)
    }
  })

  alertList.value = uniqueAlerts.slice(0, 30)
}

const buildRiskProbabilityAlerts = (items) => {
  const getProbabilityClass = value => {
    const probability = Number(value || 0)
    if (probability >= 60) return 'danger'
    if (probability >= 30) return 'warning'
    return 'primary'
  }

  return items
    .filter(item => Number(item.probability) > 0)
    .map((item, index) => {
      const periodText = item.period === 'history' ? '历史实况' : item.period === 'current' ? '当前实况' : '未来预测'
      const typeText = item.type === 'frost' ? '低温冻害' : '干热风'

      return {
        id: `trend_${item.period}_${item.type}_${item.date}_${index}`,
        sourceKey: `trend|${item.period}|${item.type}|${item.date}|${item.probability}`,
        rawTime: item.date,
        time: item.date ? parseTime(item.date, '{m}-{d}') : '-',
        level: getProbabilityClass(item.probability),
        levelText: `${typeText} · ${periodText}`,
        desc: `${periodText}显示${typeText}概率为${item.probability}%。温度 ${item.temperature ?? '-'}℃，湿度 ${item.humidity ?? '-'}%。`,
        source: 'trendRisk'
      }
    })
}





const handleSendNotice = () => {
  noticeLoading.value = true
  setTimeout(() => {
    ElMessage({
      message: '📢 网格通知无线广播群发成功！今日辖区负责人员已同步收到无线高危督办短信。',
      type: 'success',
      duration: 3500
    })
    noticeLoading.value = false
  }, 1000)
}

const handleRemoteControl = () => {
  controlLoading.value = true
  setTimeout(() => {
    ElMessage({
      message: '⚡ 下发 IoT 强电调控成功！已通过底层 Modbus 电力链路远程拉起园区全量轴流风机与电磁阀门。',
      type: 'success',
      duration: 4000
    })
    controlLoading.value = false
  }, 1200)
}

const getAlertLevelType = (level) => {
  if ([3, 4, '3', '4', '高风险', '极高风险'].includes(level)) return 'danger'
  if ([2, '2', '中风险'].includes(level)) return 'warning'
  return 'info'
}

const getWarningTypeText = (type) => {
  const typeMap = {
    '1': '低温冻害',
    '2': '干热风'
  }
  return typeMap[String(type)] || '其他预警'
}

const formatReportDateTime = (date, endOfDay = false) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const time = endOfDay ? '23:59:59' : '00:00:00'
  return `${year}-${month}-${day} ${time}`
}

/**
 * 根据“全部 / 本周 / 本月”生成后端查询时间范围。
 * 时间条件必须交给后端先筛选、再分页，不能对当前页数据做前端过滤。
 */
const calcTimeRangeParams = () => {
  const params = {}

  if (reportTimeRange.value === 'all') {
    reportQueryParams.value.params = params
    return
  }

  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (reportTimeRange.value === 'week') {
    // JavaScript：周日为0；这里把周一作为一周开始。
    const weekday = start.getDay() === 0 ? 7 : start.getDay()
    start.setDate(start.getDate() - weekday + 1)
  } else if (reportTimeRange.value === 'month') {
    start.setDate(1)
  }

  params.beginTime = formatReportDateTime(start, false)
  params.endTime = formatReportDateTime(end, true)
  reportQueryParams.value.params = params
}

const handleReportFilterChange = () => {
  reportQueryParams.value.pageNum = 1
  fetchReportData()
}

const handleReportSizeChange = () => {
  reportQueryParams.value.pageNum = 1
  fetchReportData()
}

const fetchReportData = async () => {
  reportLoading.value = true
  calcTimeRangeParams()

  try {
    const response = await listWarningRecord(reportQueryParams.value)
    if (response.code === 200) {
      reportTableData.value = response.rows || []
      reportTotal.value = Number(response.total || 0)
    } else {
      reportTableData.value = []
      reportTotal.value = 0
      ElMessage.error(response.msg || '获取预警分析报表失败')
    }
  } catch (error) {
    reportTableData.value = []
    reportTotal.value = 0
    console.error('获取报表数据失败:', error)
    ElMessage.error('获取预警分析报表失败，请稍后重试')
  } finally {
    reportLoading.value = false
  }
}

const normalizeWarningLevel = (level) => {
  const value = String(level ?? '')
  if (['4', '3', '极高风险', '高风险', '红色'].some(item => value.includes(item))) {
    return { level: 'danger', levelText: value === '4' ? '四级预警' : '三级预警' }
  }
  if (['2', '中风险', '橙色', '黄色'].some(item => value.includes(item))) {
    return { level: 'warning', levelText: '二级预警' }
  }
  return { level: 'primary', levelText: '一级预警' }
}

const buildWarningRecordDescription = (item) => {
  if (item.aiSuggestion) return item.aiSuggestion

  const details = []
  if (item.deviceName) details.push(`设备：${item.deviceName}`)
  if (item.indicatorCode) details.push(`指标：${item.indicatorCode}`)
  if (item.currentValue !== undefined && item.currentValue !== null && item.currentValue !== '') {
    details.push(`当前值：${item.currentValue}`)
  }
  if (item.taskName) details.push(`任务：${item.taskName}`)

  return details.length > 0
    ? `[触发异常] ${details.join('，')}`
    : '[触发异常] 系统检测到新的预警记录，请及时核查处理。'
}

const fetchAlertList = async () => {
  alertLoading.value = true
  try {
    const [warningRecordResult, iotResult, weatherResult] = await Promise.allSettled([
      listWarningRecord({
        pageNum: 1,
        pageSize: 30,
        orderByColumn: 'warning_time',
        isAsc: 'desc'
      }),
      listWarnRecord({
        pageNum: 1,
        pageSize: 30,
        orderByColumn: 'createTime',
        isAsc: 'desc'
      }),
      listWeatherWarn({
        pageNum: 1,
        pageSize: 30,
        orderByColumn: 'createTime',
        isAsc: 'desc'
      })
    ])

    let warningRecords = []
    let iotAlerts = []
    let weatherAlerts = []

    // 业务预警记录：直接复用“预警记录”管理页的 listWarningRecord 接口
    if (warningRecordResult.status === 'fulfilled') {
      const response = warningRecordResult.value || {}
      warningRecords = (response.rows || response.data || []).map(item => {
        const normalized = normalizeWarningLevel(item.warningLevel)
        return {
          id: `record_${item.id ?? item.warningRecordId ?? item.warningTime ?? Date.now()}`,
          rawTime: item.warningTime || item.createTime,
          time: parseTime(item.warningTime || item.createTime, '{m}-{d} {h}:{i}:{s}'),
          level: normalized.level,
          levelText: `${getWarningTypeText(item.warningType)} · ${normalized.levelText}`,
          desc: buildWarningRecordDescription(item),
          source: 'warningRecord'
        }
      })
    }

    // 底层物联设备预警
    if (iotResult.status === 'fulfilled') {
      const response = iotResult.value || {}
      iotAlerts = (response.rows || response.data || []).map(item => {
        let levelClass = 'warning'
        let levelText = '二级预警'

        if (item.levelConfigId === 1 || item.levelConfigId === '1') {
          levelClass = 'primary'
          levelText = '一级预警'
        } else if (item.levelConfigId === 2 || item.levelConfigId === '2') {
          levelClass = 'warning'
          levelText = '二级预警'
        } else if (item.levelConfigId === 3 || item.levelConfigId === '3') {
          levelClass = 'danger'
          levelText = '三级预警'
        }

        return {
          id: `iot_${item.id}`,
          rawTime: item.createTime,
          time: parseTime(item.createTime, '{m}-{d} {h}:{i}:{s}'),
          level: levelClass,
          levelText: `物联 · ${levelText}`,
          desc: item.alertAdvice || `传感器触发预警，当前实际读数：${item.actualValue ?? '-'}`,
          source: 'iot'
        }
      })
    }

    // 气象预警
    if (weatherResult.status === 'fulfilled') {
      const response = weatherResult.value || {}
      weatherAlerts = (response.rows || response.data || []).map(item => {
        let levelClass = 'warning'
        let levelText = '气象预警'

        const lvl = String(item.alertLevel || '')
        if (lvl.includes('红') || lvl === '3') {
          levelClass = 'danger'
          levelText = '气象红色预警'
        } else if (lvl.includes('橙') || lvl.includes('黄') || lvl === '2') {
          levelClass = 'warning'
          levelText = `气象${lvl || '黄色'}预警`
        } else if (lvl.includes('蓝') || lvl === '1') {
          levelClass = 'primary'
          levelText = '气象蓝色预警'
        } else {
          levelText = lvl ? `气象预警（${lvl}）` : '气象预警'
        }

        return {
          id: `weather_${item.id}`,
          rawTime: item.createTime,
          time: parseTime(item.createTime, '{m}-{d} {h}:{i}:{s}'),
          level: levelClass,
          levelText,
          desc: `[触发异常：${item.anomalyInfo || '未知'}] ${item.alertAdvice || '暂无处置建议'}`,
          source: 'weather'
        }
      })
    }

    const combined = [...warningRecords, ...iotAlerts, ...weatherAlerts]
    combined.sort((a, b) => {
      const timeA = a.rawTime ? new Date(a.rawTime).getTime() : 0
      const timeB = b.rawTime ? new Date(b.rawTime).getTime() : 0
      return timeB - timeA
    })

        // 避免三个接口存在同一条业务数据时重复显示
    const uniqueAlerts = []
    const seen = new Set()
    combined.forEach(item => {
      const key = `${item.time}|${item.levelText}|${item.desc}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueAlerts.push(item)
      }
    })

    mergeTrendRiskAlertsIntoList(uniqueAlerts)
  } catch (error) {

    console.error('获取预警快报失败：', error)
    ElMessage.error('预警快报加载失败，请稍后重试')
  } finally {
    alertLoading.value = false
  }
}

const fetchStatNumbers = async () => {
  try {
    // 实时监测区域数量
    statData.value[0].value = '3'

    // 获取全部预警记录，保证顶部统计与预警分析报表一致
    const allRecordsRes = await listWarningRecord({
      pageNum: 1,
      pageSize: 500
    })

    if (allRecordsRes.code === 200) {

      const rows = allRecordsRes.rows || []

      // ============================
      // 物候期自动匹配
      // ============================
      let targetMonth = new Date().getMonth() + 1

      if (rows.length > 0) {
        const time =
          rows[0].warningTime ||
          rows[0].createTime

        if (time) {
          const dateObj = new Date(time)
          if (!isNaN(dateObj.getTime())) {
            targetMonth = dateObj.getMonth() + 1
          }
        }
      }

      const matched =
        phenologyRules.find(rule =>
          rule.months.includes(targetMonth)
        )

      if (matched) {
        selectedPhenologyId.value = matched.id
        currentPhenology.value = {
          name: matched.name,
          workGuide: matched.work,
          warnGuide: matched.warn
        }
      }


      // ============================
      // 今日新增预警
      // ============================
      const startToday = new Date()
      startToday.setHours(0,0,0,0)

      const endToday = new Date()
      endToday.setHours(23,59,59,999)


      const todayRecords = rows.filter(row => {

        const time =
          row.warningTime ||
          row.createTime ||
          row.updateTime

        if(!time) return false

        const t =
          new Date(time).getTime()

        return (
          t >= startToday.getTime()
          &&
          t <= endToday.getTime()
        )

      })


      statData.value[1].value =
        todayRecords.length



      // ============================
      // 未处理高危预警
      // 与预警记录保持一致
      // ============================
      const highRiskRecords = rows.filter(row => {


        const level =
          row.warningLevel ??
          row.warnLevel ??
          row.level


        const status =
          row.status ??
          row.handleStatus ??
          row.dealStatus



        // 高危等级
        const highRisk =
          Number(level) === 3


        // 未处理状态兼容
        const unhandled =
          status === undefined ||
          status === null ||
          status === '' ||
          status === 0 ||
          status === '0' ||
          status === 'pending' ||
          status === 'unhandled' ||
          status === '未处理'


        return highRisk && unhandled

      })


      statData.value[2].value =
        highRiskRecords.length

    }


    // ============================
    // 运行中监控任务
    // ============================
    const taskRes =
      await listTask({
        pageNum:1,
        pageSize:1,
        status:'running'
      })


    if(taskRes.code === 200){
      statData.value[3].value =
        taskRes.total || 0
    }


  } catch(error){

    console.error(
      '获取统计数据失败:',
      error
    )

  }
}

const refreshAlerts = () => {
  fetchAlertList()
  fetchStatNumbers()
  fetchRealTypeChartData() 
  fetchReportData()
  fetchWeatherTrendChart()
}


const goBackAdmin = () => { router.push('/index') }

const handleStatClick = (item) => {
  if (!item.clickable) return
  if (item.id === 'stations') {
    areaDialogVisible.value = true
    return
  }
  if (item.id === 'tasks') {
    taskDialogTitle.value = `查看 【${item.title}】 明细`
    taskQueryParams.value.pageNum = 1
    taskQueryParams.value.status = 'running' 
    taskDialogVisible.value = true
    fetchTaskDialogData()
    return 
  }
  
  dialogTitle.value = item.id === 'today' ? '🌡️ 今日气象灾害预警综合分析报告' : `查看 【今日气象灾害预警】 综合分析报告`
  dialogQueryParams.value.pageNum = 1
  dialogQueryParams.value.warningLevel = undefined
  delete dialogQueryParams.value['params[beginTime]']
  delete dialogQueryParams.value['params[endTime]']
  currentClickType = item.id 

  dialogQueryParams.value.pageSize = 500 
  if (item.id === 'unhandled') dialogQueryParams.value.warningLevel = 3 
  dialogVisible.value = true
  fetchDialogData()
}

const fetchDialogData = async () => {
  dialogLoading.value = true
  try {
    const [warnRes, pestRes] = await Promise.allSettled([
      listWarningRecord(dialogQueryParams.value),
      listPest({ pageNum: 1, pageSize: 500 }) 
    ])

    if (warnRes.status === 'fulfilled' && warnRes.value.code === 200) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const cleanedRows = (warnRes.value.rows || []).filter(row => {
        if (currentClickType === 'today') {
            const timeStr = row.warningTime || row.createTime || '';
            if (!timeStr) return false;
            const recordTime = new Date(timeStr).getTime();
            return recordTime >= startOfToday.getTime() && recordTime <= endOfToday.getTime();
        }
        return true;
      });
      dialogTableData.value = cleanedRows;
      dialogTotal.value = cleanedRows.length;
    }

    if (pestRes.status === 'fulfilled' && pestRes.value.code === 200) {
        const pestRows = pestRes.value.rows || [];
        let total = 0;
        const pestMap = new Map();

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        pestRows.forEach(row => {
            if (currentClickType === 'today') {
                const timeStr = row.pestA || row.recognizeTime || row.createTime || '';
                if (timeStr) {
                    const rt = new Date(timeStr).getTime();
                    if (rt < startOfToday.getTime() || rt > endOfToday.getTime()) return;
                }
            }
            const count = Number(row.pestTotalCount || row.pestCount || 0);
            total += count;
            const name = row.pestName || '未知虫害';
            pestMap.set(name, (pestMap.get(name) || 0) + count);
        });

        dialogPestTotal.value = total;
        const sorted = Array.from(pestMap.entries()).sort((a,b) => b[1] - a[1]);
        dialogTopPest.value = sorted.length > 0 ? sorted[0][0] : '-';
    }

  } catch (error) { 
    console.error(error) 
  } finally { 
    dialogLoading.value = false 
  }
}

const fetchTaskDialogData = async () => {
  taskDialogLoading.value = true
  try {
    const response = await listTask(taskQueryParams.value)
    if (response.code === 200) {
      taskTableData.value = response.rows
      taskDialogTotal.value = response.total
    }
  } catch (error) { console.error(error) } finally { taskDialogLoading.value = false }
}

const trendChartRef = ref(null)
const heatTrendChartRef = ref(null)
const typeChartRef = ref(null) 
let trendChart = null
let heatTrendChart = null
let typeChart = null
const weatherHistoryEndIndex = ref(-1)
const weatherCurrentIndex = ref(-1)

















const createWeatherYAxis = (includeWind = false) => {
  const yAxis = [
    { type: 'value', name: '温度(℃)', min: 0, max: 50, position: 'left', offset: 0, nameGap: 24 },
    { type: 'value', name: '湿度(%)', min: 0, max: 100, position: 'left', offset: 45, nameGap: 24 },
    { type: 'value', name: '风险概率(%)', min: 0, max: 100, position: 'right', offset: 0, nameGap: 24 }
  ]

  if (includeWind) {
    yAxis.push({ type: 'value', name: '风速(m/s)', min: 0, max: 20, interval: 4, position: 'left', offset: 90, nameGap: 24 })
  }

  return yAxis
}

const formatWeatherTrendTooltip = (params) => {

  if (!params || params.length === 0) return ''

  const axisValue = params[0].axisValue
  const historyEnd = weatherHistoryEndIndex.value
  const currentIndex = weatherCurrentIndex.value
  const rows = []

  params.forEach(item => {
    const dataIndex = Number(item.dataIndex)
    const seriesName = item.seriesName || ''

    // 强制按历史/当前/预测分界过滤，避免 ECharts 默认把空点显示为 "-"。
    if (historyEnd >= 0) {
      if (seriesName.includes('历史') && dataIndex > historyEnd) return
      if (seriesName.includes('当前') && dataIndex !== currentIndex) return
      if (seriesName.includes('预测') && dataIndex <= currentIndex) return
    }

    const rawValue = Array.isArray(item.value) ? item.value[1] : item.value
    if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === '-' || rawValue === '--') return

    const value = Number(rawValue)
    if (Number.isNaN(value)) return

    let unit = ''
        if (seriesName.includes('温度')) unit = ' ℃'
    if (seriesName.includes('湿度')) unit = ' %'
        if (seriesName.includes('风速')) unit = ' m/s'
    if (seriesName.includes('概率')) unit = ' %'



    rows.push(`
      <div style="margin:4px 0;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:6px;"></span>
        ${seriesName}：<b>${value}${unit}</b>
      </div>
    `)
  })

  return `
    <div style="font-weight:700;font-size:14px;margin-bottom:8px;">📅 ${axisValue}</div>
    ${rows.join('')}
  `
}

const fetchWeatherTrendChart = async () => {
  if (!trendChart) return

  try {
    const res = await getWeatherTrend({
      parkId: selectedParkId.value,
      historyDays: 5,
      forecastDays: 7
    })

    if (!res || res.code !== 200) return

    const data = res.data || {}
    const historyData = (data.history || []).slice(-5)
    const currentData = data.current ? [data.current] : []
    const forecastData = (data.forecast || []).slice(0, 7)

    const allDates = []
    const historyTemp = []
    const currentTemp = []
    const predictTemp = []
        const historyHumi = []
    const currentHumi = []
    const predictHumi = []
                const historyWind = []
        const currentWind = []
        const predictWind = []

    const frostRiskProbability = []

    const hotWindRiskProbability = []

    const riskAlertSeeds = []


    const toNumber = (value, fallback = 0) => {
      const num = Number(value)
      return Number.isNaN(num) ? fallback : num
    }

        const cleanChartData = arr => arr.map(value => {
      if (value === null || value === undefined || value === '' || value === '-' || value === '--') return null
      const num = Number(value)
      return Number.isNaN(num) ? null : num
    })

    const getWindSpeed = item => {
      const rawValue = item.windSpeed ?? item.wind_speed ?? item.windSpeedDay ?? item.wind_speed_day ?? item.wind_speed_avg
      if (rawValue !== undefined && rawValue !== null && rawValue !== '') return toNumber(rawValue, null)

      const scaleText = item.windScaleDay ?? item.wind_scale_day ?? item.windScale ?? item.wind_scale
      const scaleValue = Number(String(scaleText || '').replace(/[^0-9.]/g, ''))
      return Number.isNaN(scaleValue) ? null : scaleValue
    }

        const clampProbability = value => Math.max(0, Math.min(100, Math.round(value)))

    const calcFrostProbability = (temperature, humidity) => {
      if (temperature > 5) return 0
      let risk = temperature <= -2 ? 95 : temperature <= 0 ? 80 : temperature <= 2 ? 50 : 20
      if (humidity >= 85) risk += 10
      return clampProbability(risk)
    }

    const calcHotWindProbability = (temperature, humidity, windSpeed = 0) => {
      if (temperature < 32) return 0
      let risk = temperature >= 38 ? 85 : temperature >= 35 ? 60 : 30
      if (humidity < 30) risk += 15
      else if (humidity < 50) risk += 10
      else if (humidity > 70) risk -= 20
      if (windSpeed >= 3) risk += 10
      if (windSpeed >= 5) risk += 15
      return clampProbability(risk)
    }

    const getProbability = (item, keys, fallback) => {
      const matchedKey = keys.find(key => Object.prototype.hasOwnProperty.call(item, key))
      if (!matchedKey) return fallback
      const value = item[matchedKey]
      return value === undefined || value === null || value === '' ? null : toNumber(value, null)
    }

    const pushRiskAlert = item => {
      if (Number(item.probability) > 0) riskAlertSeeds.push(item)
    }


    const pushWeatherItem = (item, period) => {
      const date = item.date || ''
      const temperature = toNumber(item.temperature ?? item.temp_max)
            const humidity = toNumber(item.humidity ?? item.humidity_avg)
            const windSpeed = getWindSpeed(item)
      const frostProbability = getProbability(
        item,
        ['frostProbability', 'frostRiskProbability', 'frost_probability', 'frost_risk_probability'],
        calcFrostProbability(temperature, humidity)
      )
      const hotWindProbability = getProbability(
        item,
        ['hotWindProbability', 'hotWindRiskProbability', 'hot_wind_probability', 'hot_wind_risk_probability'],
        calcHotWindProbability(temperature, humidity, windSpeed || 0)
      )


      allDates.push(date.substring(5))
      if (period === 'history') {
        historyTemp.push(temperature)
        currentTemp.push(null)
        predictTemp.push(null)
        historyHumi.push(humidity)
        currentHumi.push(null)
        predictHumi.push(null)
                                historyWind.push(windSpeed)
        currentWind.push(null)
        predictWind.push(null)

      } else if (period === 'current') {

        historyTemp.push(temperature)
        currentTemp.push(temperature)
        predictTemp.push(temperature)
        historyHumi.push(humidity)
        currentHumi.push(humidity)
        predictHumi.push(humidity)
                                historyWind.push(windSpeed)
        currentWind.push(windSpeed)
        predictWind.push(windSpeed)

      } else {

        historyTemp.push(null)
        currentTemp.push(null)
        predictTemp.push(temperature)
        historyHumi.push(null)
        currentHumi.push(null)
        predictHumi.push(humidity)
                                historyWind.push(null)
        currentWind.push(null)
        predictWind.push(windSpeed)

      }



            frostRiskProbability.push(frostProbability)
      hotWindRiskProbability.push(hotWindProbability)
      pushRiskAlert({ period, type: 'frost', date, temperature, humidity, probability: frostProbability })
      pushRiskAlert({ period, type: 'hotWind', date, temperature, humidity, probability: hotWindProbability })

    }

    historyData.forEach(item => pushWeatherItem(item, 'history'))
    currentData.forEach(item => pushWeatherItem(item, 'current'))
    forecastData.forEach(item => pushWeatherItem(item, 'forecast'))

    const currentIndex = historyData.length
    const currentXAxis = allDates[currentIndex]
    weatherHistoryEndIndex.value = currentIndex - 1
    weatherCurrentIndex.value = currentIndex

        const tempHumiLegend = ['历史温度', '预测温度', '历史湿度', '预测湿度']
        const windLegend = ['历史风速',  '预测风速']




    const createTempHumiSeries = () => [
      {
        name: '历史温度',
        type: 'line',
        smooth: true,
        connectNulls: false,
        yAxisIndex: 0,
        data: cleanChartData(historyTemp),
        itemStyle: { color: '#F56C6C' },
        lineStyle: { type: 'solid' },
        markLine: currentXAxis ? {
          symbol: 'none',
          label: { show: true, formatter: '当前日期' },
          lineStyle: { color: '#ff7875', type: 'dashed', width: 1.5 },
          data: [{ xAxis: currentXAxis }]
        } : undefined,
        markArea: currentXAxis ? {
          silent: true,
          itemStyle: { color: 'rgba(64,158,255,0.08)' },
          data: [[{ xAxis: currentXAxis }, { xAxis: allDates[allDates.length - 1] }]]
        } : undefined
      },
      { name: '今日温度', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 0, data: cleanChartData(currentTemp), itemStyle: { color: '#F56C6C' }, lineStyle: { type: 'solid' }, symbolSize: 9 },
      { name: '预测温度', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 0, data: cleanChartData(predictTemp), itemStyle: { color: '#F56C6C' }, lineStyle: { type: 'dashed' } },
      { name: '历史湿度', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 1, data: cleanChartData(historyHumi), itemStyle: { color: '#409EFF' }, lineStyle: { type: 'solid' } },
      { name: '今日湿度', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 1, data: cleanChartData(currentHumi), itemStyle: { color: '#409EFF' }, lineStyle: { type: 'solid' }, symbolSize: 9 },
            { name: '预测湿度', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 1, data: cleanChartData(predictHumi), itemStyle: { color: '#409EFF' }, lineStyle: { type: 'dashed' } }
    ]

        const createWindSeries = () => [
            { name: '历史风速', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 3, data: cleanChartData(historyWind), itemStyle: { color: '#2CA65A' }, lineStyle: { type: 'solid' } },
      { name: '今日风速', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 3, data: cleanChartData(currentWind), itemStyle: { color: '#2CA65A' }, lineStyle: { type: 'solid' }, symbolSize: 9 },
      { name: '预测风速', type: 'line', smooth: true, connectNulls: false, yAxisIndex: 3, data: cleanChartData(predictWind), itemStyle: { color: '#2CA65A' }, lineStyle: { type: 'dashed' } }

    ]


    const buildChartSeries = (riskName, riskData, includeWind = false) => [
      ...createTempHumiSeries(),
      ...(includeWind ? createWindSeries() : []),
      {
        name: riskName,
        type: 'line',
        smooth: true,
        connectNulls: false,
        yAxisIndex: 2,
        data: cleanChartData(riskData),
                itemStyle: { color: riskName.includes('冻害') ? '#9254DE' : '#E6A23C' },

        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.12 }
      }
    ]


        trendRiskAlerts.value = buildRiskProbabilityAlerts(riskAlertSeeds)

    mergeTrendRiskAlertsIntoList(alertList.value.filter(item => item.source !== 'trendRisk'))

    trendChart.setOption({
      tooltip: { formatter: formatWeatherTrendTooltip },
            legend: { data: [...tempHumiLegend, '冻害概率'] },
      xAxis: { data: allDates },
      yAxis: createWeatherYAxis(false),
      series: buildChartSeries('冻害概率', frostRiskProbability)

    }, { replaceMerge: ['series'] })

    if (heatTrendChart) {
      heatTrendChart.setOption({
        tooltip: { formatter: formatWeatherTrendTooltip },
                        legend: { data: [...tempHumiLegend, ...windLegend, '干热风概率'] },
        xAxis: { data: allDates },
        yAxis: createWeatherYAxis(true),
        series: buildChartSeries('干热风概率', hotWindRiskProbability, true)


      }, { replaceMerge: ['series'] })
    }
  } catch (error) {
    console.error('天气趋势加载失败:', error)
  }
}






const initCharts = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    if (heatTrendChartRef.value) {
      heatTrendChart = echarts.init(heatTrendChartRef.value)
    }

    const baseOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#dcdfe6',
        borderWidth: 1,
        textStyle: { color: '#303133' },
        formatter: formatWeatherTrendTooltip
      },
      legend: {
        selectedMode: true
      },
      grid: {
        left: '12%',
        right: '8%',
        top: '20%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: []
      },
            yAxis: createWeatherYAxis(false),

      series: []
    }

    trendChart.setOption({
      ...baseOption,
            legend: { ...baseOption.legend, data: ['历史温度', '预测温度', '历史湿度', '预测湿度', '冻害概率'] },
      yAxis: createWeatherYAxis(false)

    })

    if (heatTrendChart) {
      heatTrendChart.setOption({
        ...baseOption,
        legend: {
          ...baseOption.legend,
                                        data: ['历史温度', '预测温度', '历史湿度', '预测湿度', '历史风速', '今日风速', '预测风速', '干热风概率']

        },
        yAxis: createWeatherYAxis(true)

      })
    }

    fetchWeatherTrendChart()
  }

  if (typeChartRef.value) {
    typeChart = echarts.init(typeChartRef.value)

    const barOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => `${params[0].name}<br/>预警次数：${params[0].value} 次`
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '12%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['冻害预警', '干热风预警']
      },
      yAxis: {
        type: 'value',
        name: '次数',
        min: 0,
        max: 15,
        minInterval: 1
      },
      series: [{
        name: '预警次数',
        type: 'bar',
        barWidth: 45,
        data: [
          { value: 0, showValue: 0, itemStyle: { color: '#409EFF' } },
          { value: 0, showValue: 0, itemStyle: { color: '#F56C6C' } }
        ],
        label: {
          show: true,
          position: 'top',
          formatter: params => params.data.showValue + ' 次',
          color: '#606266',
          fontSize: 12
        }
      }]
    }

    typeChart.setOption(barOption)
  }
}


const fetchRealTypeChartData = async () => {
  if (!typeChart) return

  try {
    const endTime = new Date()
    const beginTime = new Date()
    beginTime.setDate(beginTime.getDate() - 29)
    beginTime.setHours(0, 0, 0, 0)
    endTime.setHours(23, 59, 59, 999)

    const formatDateTime = date => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const i = String(date.getMinutes()).padStart(2, '0')
      const sec = String(date.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${i}:${sec}`
    }

    const response = await listWarningRecord({
      pageNum: 1,
      pageSize: 1000,
      orderByColumn: 'warning_time',
      isAsc: 'desc',
      'params[beginTime]': formatDateTime(beginTime),
      'params[endTime]': formatDateTime(endTime)
    })

    let frostCount = 0
    let hotWindCount = 0

    if (response.code === 200) {
      ;(response.rows || []).forEach(row => {
        const type = String(row.warningType ?? '')
        const name = String(row.warningName ?? row.warningTitle ?? '')

        const content = `${type}${name}${row.warningContent ?? ''}${row.aiSuggestion ?? ''}`

        // 与预警分析报表保持一致：
        // 冻害：类型字段/名称/描述任一匹配
        if (
          type === '1' ||
          content.includes('冻害') ||
          content.includes('低温') ||
          content.includes('霜冻')
        ) {
          frostCount++
        }

        // 干热风：类型字段/名称/描述任一匹配
        if (
          type === '2' ||
          content.includes('干热风') ||
          content.includes('高温') ||
          content.includes('热风')
        ) {
          hotWindCount++
        }
      })
    }

    typeChart.setOption({
      series: [{
        data: [
          {
            value: frostCount === 0 ? 0.01 : frostCount,
            showValue: frostCount,
            itemStyle: { color: '#409EFF' }
          },
          {
            value: hotWindCount === 0 ? 0.01 : hotWindCount,
            showValue: hotWindCount,
            itemStyle: { color: '#F56C6C' }
          }
        ]
      }]
    })

  } catch (error) {
    console.error('统计冻害和干热风预警失败:', error)
  }
}

const handleResize = () => {
  if (trendChart) trendChart.resize()
  if (heatTrendChart) heatTrendChart.resize()
  if (typeChart) typeChart.resize()
}


onMounted(() => {
  fetchAlertList()
  fetchStatNumbers()
  fetchReportData()

  // 预警快报每 60 秒自动同步一次；点击“同步刷新”仍可立即更新
  alertRefreshTimer = window.setInterval(() => {
    fetchAlertList()
  }, 60 * 1000)
  
  nextTick(() => {
    initCharts()

    // 初始化天气趋势数据
    fetchWeatherTrendChart()

    fetchRealTypeChartData() 
    window.addEventListener('resize', handleResize)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (alertRefreshTimer) {
    window.clearInterval(alertRefreshTimer)
    alertRefreshTimer = null
  }
    if (trendChart) trendChart.dispose()
  if (heatTrendChart) heatTrendChart.dispose()
  if (typeChart) typeChart.dispose()
})

</script>

<style scoped>
.frontend-dashboard {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1500; 
  background-color: #f0f2f5; 
  overflow-y: auto; 
}
.header {
  background-color: #1c5030; 
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15); 
}
.logo { font-size: 24px; font-weight: bold; color: #ffffff; }
.user-info { display: flex; align-items: center; color: #fff; }

.phenology-stage-bar {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 3px 12px;
  border-radius: 20px;
  margin-right: 25px;
}
.stage-label {
  font-size: 13px;
  color: #a4cfba;
  font-weight: bold;
}
.stage-tabs {
  display: flex;
  gap: 6px;
}
.stage-tab-item {
  font-size: 13px;
  color: #c2decb;
  padding: 4px 10px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}
.stage-tab-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.stage-tab-item.is-active {
  background-color: #2ca65a;
  color: #ffffff;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(44, 166, 90, 0.4);
}
.tab-text-span {
  display: inline-block;
  width: 100%;
  height: 100%;
}

.main-content { padding: 24px; }
.stat-row { margin-bottom: 20px; }
.chart-row {
  --risk-card-height: 780px;
  margin-bottom: 20px;
  align-items: stretch;
}
.chart-row > .chart-col {
  display: flex;
  min-width: 0;
}
.chart-row .risk-main-card,
.chart-row .risk-alert-card {
  width: 100%;
  height: var(--risk-card-height) !important;
  min-height: var(--risk-card-height);
  max-height: var(--risk-card-height);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chart-row .risk-chart {
  width: 100%;
  height: 300px;
  flex: 0 0 300px;
}

/* Element Plus 的 card body 必须参与 flex，否则右侧滚动区域不会撑满 */
.chart-row .risk-main-card :deep(.el-card__body),
.chart-row .risk-alert-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
.chart-row .risk-alert-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chart-row .risk-alert-card .custom-scrollbar {
  flex: 1;
  min-height: 0;
  height: 100%;
}
.chart-row .risk-alert-card .custom-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.bottom-row { margin-bottom: 20px; }
.stat-card { text-align: center; padding: 10px 0; border-radius: 1px; } 
.is-clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.is-clickable:hover {
  transform: translateY(-4px); 
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
  border-color: #c0c4cc; 
}
.stat-title { color: #909399; font-size: 16px; margin-bottom: 12px; }
.stat-value { font-size: 36px; font-weight: bold; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
  color: #303133;
}
.card-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.live-badge {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  background-color: #edfcf2;
  color: #2ca65a;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: normal;
}
.badge-dot {
  width: 6px;
  height: 6px;
  background-color: #2ca65a;
  border-radius: 50%;
  margin-right: 5px;
  animation: blink 1.5s infinite ease-in-out;
}
@keyframes blink {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.report-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.filter-item {
  width: 145px;
}

.chart-card, .alert-card {
  border: none;
  background-color: #ffffff;
  border-radius: 1px; 
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
.custom-scrollbar { padding-right: 8px; }
.no-data { text-align: center; color: #909399; padding-top: 50px; }
.chart-card { height: 100%; }

/* 🌟 修改后的：最新预警快报列表样式 (提升色彩饱和度与对比度) */
.alert-list {
  padding: 0 8px;
}
.alert-item {
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  border-left: 4px solid #909399;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  padding: 12px 14px;
  margin-bottom: 12px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s ease-in-out;
}
.alert-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateX(2px);
  border-right-color: transparent;
}
.alert-item.danger { border-left-color: #F56C6C; }
.alert-item.warning { border-left-color: #E6A23C; }
.alert-item.primary { border-left-color: #409EFF; } /* 新增：鲜艳蓝色 */
.alert-item.info { border-left-color: #909399; }

.alert-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.alert-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
}
.alert-tag.danger { background: rgba(245, 108, 108, 0.1); color: #F56C6C; border: 1px solid rgba(245, 108, 108, 0.2); }
.alert-tag.warning { background: rgba(230, 162, 60, 0.1); color: #E6A23C; border: 1px solid rgba(230, 162, 60, 0.2); }
.alert-tag.primary { background: rgba(64, 158, 255, 0.1); color: #409EFF; border: 1px solid rgba(64, 158, 255, 0.2); } /* 新增：鲜艳蓝色 */
.alert-tag.info { background: rgba(144, 147, 153, 0.1); color: #909399; border: 1px solid rgba(144, 147, 153, 0.2); }

.alert-time {
  font-size: 12px;
  color: #a8abb2;
  margin-left: auto;
  font-family: monospace;
}
.alert-desc {
  font-size: 13px;
  color: #4b5563; /* 加深描述字体颜色，提升可读性 */
  line-height: 1.6;
}

.modern-report-table {
  --el-table-border-color: transparent;
}
.modern-report-table ::v-deep(tr:hover > td) {
  background-color: #fcfdfd !important;
}
.mono-time {
  color: #555;
  font-family: Consolas, monospace;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.icon-gray { color: #cbd5e1; }
.icon-blue { color: #3b82f6; }
.device-cell {
  display: flex;
  align-items: center;
  justify-content: center; 
  gap: 6px;
}
.device-text {
  font-weight: bold;
  color: #334155;
  font-size: 15px;
}
.indicator-tag {
  border: none;
  background-color: #f1f5f9;
  color: #475569;
  font-size: 14px;
}
.danger-value-box {
  color: #ef4444;
  font-weight: bold;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(239, 68, 68, 0.06);
  padding: 4px 12px;
  border-radius: 4px;
}
.modern-pagination {
  margin-top: 14px;
  padding-bottom: 8px;
  display: flex;
  justify-content: flex-end;
}

.panel-card-title {
  font-size: 16px;
  font-weight: bold;
  color: #2c7a4b;
  margin-bottom: 12px;
  border-bottom: 2px solid #e4e7ed;
  padding-bottom: 6px;
}
.diagnosis-left-panel {
  border-right: 1px dashed #dcdfe6;
}
.diagnosis-content-box {
  background-color: #f8faf9;
  border: 1px solid #e1e9e4;
  border-radius: 4px;
  padding: 14px;
  height: 300px;
  overflow-y: auto;
}
.diag-item {
  margin-bottom: 14px;
  line-height: 1.6;
  font-size: 14px;
}
.diag-label {
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}
.diag-item p { margin: 0; color: #606266; }
.diag-item ul { margin: 0; padding-left: 18px; color: #606266; }
.dispatch-action-zone {
  margin-top: 14px;
}
.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<style>
.phenology-popover {
  padding: 16px !important;
  border-radius: 6px !important;
}
.phenology-popover .popover-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
.phenology-popover .guide-section {
  line-height: 1.6;
  font-size: 14px;
}
.phenology-popover .guide-title {
  font-weight: bold;
  color: #1c5030;
  display: block;
  margin-bottom: 4px;
}
.phenology-popover p {
  margin: 0;
  color: #606266;
}
.phenology-popover p.text-danger {
  color: #F56C6C;
}
</style>
