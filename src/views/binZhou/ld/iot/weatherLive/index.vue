<template>
  <div class="app-container weather-live-page">
    <div v-show="showSearch" class="query-panel">
      <el-form
        ref="queryRef"
        :model="queryParams"
        label-width="80px"
        class="weather-query-form"
      >
        <el-form-item label="园区" prop="parkId">
          <el-select
            v-model="queryParams.parkId"
            placeholder="请选择园区"
            clearable
            filterable
            @change="handleQuery"
          >
            <el-option
              v-for="item in parkList"
              :key="item.parkId"
              :label="item.parkName"
              :value="item.parkId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="抓取时间" prop="fetchTime">
          <el-date-picker
            v-model="queryParams.fetchTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择抓取时间"
            clearable
          />
        </el-form-item>

        <el-form-item label="发布时间" prop="reportTime">
          <el-date-picker
            v-model="queryParams.reportTime"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择发布时间"
            clearable
          />
        </el-form-item>

        <el-form-item label="当前温度" prop="temperature">
          <el-input
            v-model="queryParams.temperature"
            placeholder="请输入当前温度"
            clearable
            @keyup.enter="handleQuery"
          >
            <template #suffix>℃</template>
          </el-input>
        </el-form-item>

        <el-form-item label="当前湿度" prop="humidity">
          <el-input
            v-model="queryParams.humidity"
            placeholder="请输入当前湿度"
            clearable
            @keyup.enter="handleQuery"
          >
            <template #suffix>%</template>
          </el-input>
        </el-form-item>

        <el-form-item label="天气描述" prop="weatherText">
          <el-input
            v-model="queryParams.weatherText"
            placeholder="请输入天气描述"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="风向" prop="windDirection">
          <el-input
            v-model="queryParams.windDirection"
            placeholder="请输入风向"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="风速" prop="windSpeed">
          <el-input
            v-model="queryParams.windSpeed"
            placeholder="请输入风速"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="风力等级" prop="windScale">
          <el-input
            v-model="queryParams.windScale"
            placeholder="请输入风力等级"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="降水量" prop="precipitation">
          <el-input
            v-model="queryParams.precipitation"
            placeholder="请输入降水量"
            clearable
            @keyup.enter="handleQuery"
          >
            <template #suffix>mm</template>
          </el-input>
        </el-form-item>

        <el-form-item label="大气压强" prop="airPressure">
          <el-input
            v-model="queryParams.airPressure"
            placeholder="请输入大气压强"
            clearable
            @keyup.enter="handleQuery"
          >
            <template #suffix>hPa</template>
          </el-input>
        </el-form-item>

        <el-form-item class="query-actions">
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="weather-toolbar">
      <div class="toolbar-group toolbar-crud">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['ld:weatherLive:add']"
        >
          新增
        </el-button>
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['ld:weatherLive:edit']"
        >
          修改
        </el-button>
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['ld:weatherLive:remove']"
        >
          删除
        </el-button>
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['ld:weatherLive:export']"
        >
          导出
        </el-button>
      </div>

      <div class="toolbar-group toolbar-sync">
        <el-button type="primary" icon="Refresh" @click="handleSyncLive">
          同步实时天气
        </el-button>
        <el-button type="success" icon="Refresh" @click="handleSyncForecast">
          同步七天预报
        </el-button>
        <right-toolbar
          v-model:showSearch="showSearch"
          @queryTable="getList"
        />
      </div>
    </div>

    <section class="weather-list-card">
      <header class="list-card-header">
        <div class="list-title-wrap">
          <span class="list-title">实时天气数据</span>
          <span class="list-subtitle">展示各园区最近同步的气象实况</span>
        </div>
        <el-tag type="info" effect="plain">共 {{ total }} 条</el-tag>
      </header>

      <el-table
        v-loading="loading"
        :data="weatherLiveList"
        row-key="id"
        stripe
        border
        class="weather-table"
        table-layout="auto"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="48"
          align="center"
          fixed="left"
        />

        <el-table-column
          label="序号"
          width="64"
          align="center"
          fixed="left"
        >
          <template #default="scope">
            <span class="index-text">{{ getTableIndex(scope.$index) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          label="园区"
          prop="parkId"
          min-width="160"
          fixed="left"
        >
          <template #default="scope">
            <div class="park-cell" :title="getParkName(scope.row.parkId)">
              <span class="park-icon-box">
                <el-icon><OfficeBuilding /></el-icon>
              </span>
              <span class="park-name">{{ getParkName(scope.row.parkId) || '--' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="数据时间" min-width="188" align="left">
          <template #default="scope">
            <div class="time-stack">
              <div class="time-row">
                <span class="time-label">抓取</span>
                <span class="time-text">
                  {{ parseTime(scope.row.fetchTime, '{y}-{m}-{d} {h}:{i}') || '--' }}
                </span>
              </div>
              <div class="time-row">
                <span class="time-label is-report">发布</span>
                <span class="time-text">
                  {{ parseTime(scope.row.reportTime, '{y}-{m}-{d} {h}:{i}') || '--' }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="温湿度" min-width="150" align="center">
          <template #default="scope">
            <div class="metric-pair">
              <div class="metric-item temperature-item">
                <span class="metric-label">温度</span>
                <strong :class="['temp-value', getTempClass(scope.row.temperature)]">
                  {{ formatWeatherValue(scope.row.temperature) }}
                </strong>
                <small>℃</small>
              </div>
              <div class="metric-divider"></div>
              <div class="metric-item humidity-item">
                <span class="metric-label">湿度</span>
                <strong>{{ formatWeatherValue(scope.row.humidity) }}</strong>
                <small>%</small>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="天气状况"
          prop="weatherText"
          min-width="140"
          align="center"
        >
          <template #default="scope">
            <div class="weather-desc-cell">
              <i
                v-if="scope.row.weatherCode"
                :class="'qi-' + scope.row.weatherCode"
                class="weather-icon"
              ></i>
              <span class="weather-text" :title="scope.row.weatherText">
                {{ scope.row.weatherText || '--' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="风况" min-width="170" align="left">
          <template #default="scope">
            <div class="wind-cell">
              <div class="wind-main">
                <span class="wind-direction">{{ scope.row.windDirection || '--' }}</span>
                <el-tag
                  v-if="scope.row.windScale !== null && scope.row.windScale !== undefined && scope.row.windScale !== ''"
                  size="small"
                  type="success"
                  effect="light"
                  class="wind-scale-tag"
                >
                  {{ scope.row.windScale }}级
                </el-tag>
              </div>
              <div class="wind-speed">
                风速：{{ formatWeatherValue(scope.row.windSpeed) }}
                <span v-if="scope.row.windSpeed !== null && scope.row.windSpeed !== undefined && scope.row.windSpeed !== ''">m/s</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="降水 / 气压" min-width="165" align="left">
          <template #default="scope">
            <div class="environment-stack">
              <div class="environment-row">
                <span class="environment-label">降水</span>
                <span
                  class="precip-value"
                  :class="{ 'has-precip': Number(scope.row.precipitation) > 0 }"
                >
                  {{ formatWeatherValue(scope.row.precipitation) }} mm
                </span>
              </div>
              <div class="environment-row">
                <span class="environment-label">气压</span>
                <span class="pressure-value">
                  {{ formatWeatherValue(scope.row.airPressure) }} hPa
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="148"
          align="center"
          fixed="right"
          class-name="operation-column"
        >
          <template #default="scope">
            <div class="row-actions">
              <el-button
                link
                type="primary"
                icon="Edit"
                @click="handleUpdate(scope.row)"
                v-hasPermi="['ld:weatherLive:edit']"
              >
                修改
              </el-button>
              <el-button
                link
                type="danger"
                icon="Delete"
                @click="handleDelete(scope.row)"
                v-hasPermi="['ld:weatherLive:remove']"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <div class="table-empty">
            <el-empty description="暂无实时天气数据" :image-size="90" />
          </div>
        </template>
      </el-table>

      <div class="pagination-wrap">
        <pagination
          v-show="total > 0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />
      </div>
    </section>

    <!-- 添加或修改园区实时与当天天气实况记录对话框 -->
    <el-dialog :title="title" v-model="open" width="650px" append-to-body class="weather-dialog">
      <el-form ref="weatherLiveRef" :model="form" :rules="rules" label-width="100px">
        <div class="form-section-title">基础与发布信息</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="园区" prop="parkId">
              <el-select v-model="form.parkId" placeholder="请选择园区" style="width: 100%">
                <el-option
                  v-for="item in parkList"
                  :key="item.parkId"
                  :label="item.parkName"
                  :value="item.parkId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="抓取时间" prop="fetchTime">
              <el-date-picker clearable
                v-model="form.fetchTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择抓取时间"
                style="width: 100%">
              </el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发布时间" prop="reportTime">
              <el-date-picker clearable
                v-model="form.reportTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择发布时间"
                style="width: 100%">
              </el-date-picker>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">实时气象数据</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="当前温度" prop="temperature">
              <el-input v-model="form.temperature" placeholder="请输入当前温度"><template #suffix>°C</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="当前湿度" prop="humidity">
              <el-input v-model="form.humidity" placeholder="请输入当前湿度"><template #suffix>%</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="天气描述" prop="weatherText">
              <el-input v-model="form.weatherText" placeholder="请输入天气描述" />
            </el-form-item>
          </el-col>
          <!-- <el-col :span="12">
            <el-form-item label="天气代码" prop="weatherCode">
              <el-input v-model="form.weatherCode" placeholder="请输入天气代码" />
            </el-form-item>
          </el-col> -->
          <el-col :span="12">
            <el-form-item label="风向" prop="windDirection">
              <el-input v-model="form.windDirection" placeholder="请输入风向" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风速" prop="windSpeed">
              <el-input v-model="form.windSpeed" placeholder="请输入风速" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风力等级" prop="windScale">
              <el-input v-model="form.windScale" placeholder="请输入风力等级" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="降水量" prop="precipitation">
              <el-input v-model="form.precipitation" placeholder="请输入降水量"><template #suffix>mm</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="大气压强" prop="airPressure">
              <el-input v-model="form.airPressure" placeholder="请输入大气压强"><template #suffix>hPa</template></el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">扩展参数</div>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="扩展状态" prop="remark1">
              <el-input v-model="form.remark1" placeholder="请输入扩展状态" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="扩展文本" prop="remark2">
              <el-input v-model="form.remark2" type="textarea" :rows="3" placeholder="请输入扩展文本，此处可以展示详细的文本内容" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="WeatherLive">
import { listWeatherLive, getWeatherLive, delWeatherLive, addWeatherLive, updateWeatherLive, syncLiveWeather, syncForecastWeather } from "@/api/binZhou/ld/iot/weatherLive"
import { listPark } from "@/api/binZhou/ld/iot/park"
import { OfficeBuilding } from '@element-plus/icons-vue'
import 'qweather-icons/font/qweather-icons.css'

const { proxy } = getCurrentInstance()

const weatherLiveList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const parkList = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderByColumn: 'fetchTime',
    isAsc: 'desc',
    parkId: undefined,
    fetchTime: undefined,
    reportTime: undefined,
    temperature: undefined,
    humidity: undefined,
    windDirection: undefined,
    windSpeed: undefined,
    windScale: undefined,
    precipitation: undefined,
    airPressure: undefined,
    weatherCode: undefined,
    weatherText: undefined,
    remark1: undefined,
    remark2: undefined
  },
  rules: {
    parkId: [
      { required: true, message: "园区不能为空", trigger: "change" }
    ],
    fetchTime: [
      { required: true, message: "抓取时间不能为空", trigger: "blur" }
    ],
    reportTime: [
      { required: true, message: "发布时间不能为空", trigger: "blur" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

function getParkList() {
  listPark({ pageNum: 1, pageSize: 1000 }).then(response => {
    parkList.value = response.rows || response.data || []
  })
}

function getParkName(parkId) {
  const park = parkList.value.find(item => item.parkId == parkId)
  return park ? park.parkName : parkId
}

getParkList()

/** 查询园区实时与当天天气实况记录列表 */
function getList() {
  loading.value = true
  listWeatherLive(queryParams.value).then(response => {
    weatherLiveList.value = sortWeatherLiveRows(response.rows || response.data || [])
    total.value = response.total || weatherLiveList.value.length
    loading.value = false
  })
}

function sortWeatherLiveRows(rows) {
  return [...rows].sort((a, b) => {
    const fetchA = new Date(a.fetchTime ?? a.fetch_time ?? 0).getTime() || 0
    const fetchB = new Date(b.fetchTime ?? b.fetch_time ?? 0).getTime() || 0
    if (fetchA !== fetchB) return fetchB - fetchA
    const reportA = new Date(a.reportTime ?? a.report_time ?? 0).getTime() || 0
    const reportB = new Date(b.reportTime ?? b.report_time ?? 0).getTime() || 0
    return reportB - reportA
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
    id: null,
    parkId: null,
    fetchTime: null,
    reportTime: null,
    temperature: null,
    humidity: null,
    windDirection: null,
    windSpeed: null,
    windScale: null,
    precipitation: null,
    airPressure: null,
    weatherCode: null,
    weatherText: null,
    remark1: null,
    remark2: null
  }
  proxy.resetForm("weatherLiveRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加园区实时与当天天气实况记录"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getWeatherLive(_id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改园区实时与当天天气实况记录"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["weatherLiveRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateWeatherLive(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addWeatherLive(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _ids = row.id || ids.value
  proxy.$modal.confirm('是否确认删除园区实时与当天天气实况记录编号为"' + _ids + '"的数据项？').then(function() {
    return delWeatherLive(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('ld/weatherLive/export', {
    ...queryParams.value
  }, `weatherLive_${new Date().getTime()}.xlsx`)
}

/** 同步所有园区实时天气按钮操作 */
function handleSyncLive() {
  proxy.$modal.loading("正在抓取同步所有园区实时天气，请稍候...")
  syncLiveWeather().then(response => {
    proxy.$modal.closeLoading()
    proxy.$modal.msgSuccess(response.msg || "实时天气同步成功")
    getList()
  }).catch(() => {
    proxy.$modal.closeLoading()
  })
}

/** 同步所有园区未来七天天气预报按钮操作 */
function handleSyncForecast() {
  proxy.$modal.loading("正在抓取同步所有园区七天天气预报，请稍候...")
  syncForecastWeather().then(response => {
    proxy.$modal.closeLoading()
    proxy.$modal.msgSuccess(response.msg || "七天天气预报同步成功")
  }).catch(() => {
    proxy.$modal.closeLoading()
  })
}

function getTableIndex(index) {
  const pageNum = Number(queryParams.value.pageNum || 1)
  const pageSize = Number(queryParams.value.pageSize || 10)
  return (pageNum - 1) * pageSize + index + 1
}

function formatWeatherValue(value) {
  if (value === null || value === undefined || value === '') return '--'
  return value
}

function getTempClass(temp) {
  const t = parseFloat(temp);
  if (isNaN(t)) return '';
  if (t <= 5) return 'temp-cold';
  if (t >= 30) return 'temp-hot';
  return 'temp-warm';
}

getList()
</script>

<style scoped lang="scss">
.weather-live-page {
  --page-border: #e5e7eb;
  --page-muted: #909399;
  --page-text: #303133;
  --page-primary: #409eff;
  --page-bg-soft: #f7f9fc;
}

.query-panel {
  padding: 16px 16px 4px;
  margin-bottom: 14px;
  background: #ffffff;
  border: 1px solid var(--page-border);
  border-radius: 8px;
}

.weather-query-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(230px, 1fr));
  column-gap: 18px;
  align-items: start;

  :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
    margin-bottom: 12px;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }

  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-date-editor) {
    width: 100%;
  }

  .query-actions {
    grid-column: 1 / -1;

    :deep(.el-form-item__content) {
      justify-content: flex-end;
      gap: 10px;
      margin-left: 0 !important;
    }

    :deep(.el-button) {
      min-width: 88px;
      margin-left: 0;
    }
  }
}

.weather-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 18px;
  margin-bottom: 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.el-button) {
    min-width: 78px;
    margin-left: 0;
  }
}

.toolbar-sync {
  justify-content: flex-end;

  :deep(.el-button) {
    min-width: 126px;
  }
}

.weather-list-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--page-border);
  border-radius: 8px;
}

.list-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 16px;
  gap: 16px;
  background: #ffffff;
  border-bottom: 1px solid var(--page-border);
}

.list-title-wrap {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 12px;
}

.list-title {
  flex: 0 0 auto;
  color: var(--page-text);
  font-size: 16px;
  font-weight: 600;
}

.list-subtitle {
  overflow: hidden;
  color: var(--page-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weather-table {
  width: 100%;

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  :deep(.el-table__header-wrapper th.el-table__cell) {
    height: 48px;
    padding: 0;
    color: #4b5563;
    font-weight: 600;
    background: #f6f8fb;
  }

  :deep(.el-table__body-wrapper td.el-table__cell) {
    height: 66px;
    padding: 8px 0;
  }

  :deep(.el-table__cell .cell) {
    padding-right: 10px;
    padding-left: 10px;
    line-height: 1.4;
  }

  :deep(.el-table__row) {
    transition: background-color 0.18s ease;
  }

  :deep(.el-table__row:hover > td.el-table__cell) {
    background: #f4f9ff !important;
  }

  :deep(.el-table-fixed-column--left),
  :deep(.el-table-fixed-column--right) {
    background: inherit;
  }

  :deep(.operation-column .cell) {
    overflow: visible;
  }
}

.index-text {
  color: #909399;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.park-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}

.park-icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  color: #409eff;
  background: #ecf5ff;
  border-radius: 7px;
}

.park-name {
  overflow: hidden;
  color: #303133;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-stack,
.environment-stack {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.time-row,
.environment-row {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.time-label,
.environment-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 34px;
  height: 20px;
  padding: 0 5px;
  color: #409eff;
  font-size: 11px;
  background: #ecf5ff;
  border-radius: 4px;
}

.time-label.is-report {
  color: #67c23a;
  background: #f0f9eb;
}

.environment-label {
  color: #606266;
  background: #f4f4f5;
}

.time-text {
  overflow: hidden;
  color: #606266;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: center;
  min-height: 46px;
  gap: 10px;
}

.metric-divider {
  width: 1px;
  height: 30px;
  background: #ebeef5;
}

.metric-item {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  align-items: baseline;
  min-width: 0;
  column-gap: 3px;
}

.metric-label {
  grid-column: 1 / -1;
  margin-bottom: 3px;
  color: #909399;
  font-size: 11px;
}

.metric-item strong {
  color: #606266;
  font-family: Consolas, Monaco, monospace;
  font-size: 17px;
  line-height: 1;
}

.metric-item small {
  color: #909399;
  font-size: 10px;
}

.temp-value {
  font-weight: 700;

  &.temp-cold {
    color: #409eff;
  }

  &.temp-hot {
    color: #f56c6c;
  }

  &.temp-warm {
    color: #67c23a;
  }
}

.humidity-item strong {
  color: #e6a23c;
}

.weather-desc-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 8px;

  .weather-icon {
    flex: 0 0 auto;
    color: #e6a23c;
    font-size: 22px;
  }

  .weather-text {
    overflow: hidden;
    color: #303133;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.wind-cell {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.wind-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 7px;
}

.wind-direction {
  overflow: hidden;
  color: #303133;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wind-scale-tag {
  flex: 0 0 auto;
  border-radius: 4px;
}

.wind-speed {
  color: #909399;
  font-size: 12px;
}

.precip-value,
.pressure-value {
  overflow: hidden;
  color: #606266;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.precip-value.has-precip {
  color: #409eff;
  font-weight: 700;
}

.row-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 4px;

  :deep(.el-button) {
    justify-content: center;
    width: 100%;
    height: 30px;
    padding: 4px 6px;
    margin-left: 0;
    border-radius: 4px;
  }

  :deep(.el-button:hover) {
    background: #f5f7fa;
  }
}

.table-empty {
  padding: 20px 0;
}

.pagination-wrap {
  padding: 2px 14px 6px;
  border-top: 1px solid #f0f2f5;

  :deep(.pagination-container) {
    height: auto;
    margin: 0;
    padding: 12px 0 6px;
  }
}

/* Dialog Form Styling */
.weather-dialog {
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .form-section-title {
    display: flex;
    align-items: center;
    margin: 15px 0 10px;
    padding-bottom: 5px;
    color: #303133;
    font-size: 13px;
    font-weight: bold;
    border-bottom: 1px dashed #e4e7ed;

    &::before {
      display: inline-block;
      width: 4px;
      height: 12px;
      margin-right: 6px;
      background-color: #409eff;
      border-radius: 2px;
      content: "";
    }

    &:first-of-type {
      margin-top: 0;
    }
  }
}

@media (max-width: 1500px) {
  .weather-query-form {
    grid-template-columns: repeat(3, minmax(220px, 1fr));
  }
}

@media (max-width: 1100px) {
  .weather-query-form {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }

  .weather-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-sync {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .query-panel {
    padding-right: 12px;
    padding-left: 12px;
  }

  .weather-query-form {
    grid-template-columns: 1fr;
  }

  .query-actions {
    grid-column: auto !important;

    :deep(.el-form-item__content) {
      justify-content: flex-start;
      margin-left: 80px !important;
    }
  }

  .weather-toolbar,
  .toolbar-group {
    width: 100%;
  }

  .toolbar-group :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }

  .list-subtitle {
    display: none;
  }
}
</style>
