<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="园区" prop="parkId">
        <el-select v-model="queryParams.parkId" placeholder="请选择园区" clearable @change="handleQuery" style="width: 200px">
          <el-option
            v-for="item in parkList"
            :key="item.parkId"
            :label="item.parkName"
            :value="item.parkId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="抓取时间" prop="fetchTime">
        <el-date-picker clearable
          v-model="queryParams.fetchTime"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择抓取时间">
        </el-date-picker>
      </el-form-item>
      <el-form-item label="预报日期" prop="forecastDate">
        <el-date-picker clearable
          v-model="queryParams.forecastDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择预报日期">
        </el-date-picker>
      </el-form-item>
      <el-form-item label="最高温度" prop="tempMax">
        <el-input
          v-model="queryParams.tempMax"
          placeholder="请输入最高温度"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="最低温度" prop="tempMin">
        <el-input
          v-model="queryParams.tempMin"
          placeholder="请输入最低温度"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="平均湿度" prop="humidityAvg">
        <el-input
          v-model="queryParams.humidityAvg"
          placeholder="请输入平均湿度"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="白天风向" prop="windDirDay">
        <el-input
          v-model="queryParams.windDirDay"
          placeholder="请输入白天风向"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="白天风力" prop="windScaleDay">
        <el-input
          v-model="queryParams.windScaleDay"
          placeholder="请输入白天风力"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="全天降水" prop="precipTotal">
        <el-input
          v-model="queryParams.precipTotal"
          placeholder="请输入全天降水量"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="降水概率" prop="precipProb">
        <el-input
          v-model="queryParams.precipProb"
          placeholder="请输入降水概率"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="白天天气" prop="weatherTextDay">
        <el-input
          v-model="queryParams.weatherTextDay"
          placeholder="请输入白天天气"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="夜间天气" prop="weatherTextNight">
        <el-input
          v-model="queryParams.weatherTextNight"
          placeholder="请输入夜间天气"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="白天天气代码" prop="dayCode" label-width="100px">
        <el-input
          v-model="queryParams.dayCode"
          placeholder="请输入白天天气代码"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="晚间天气代码" prop="moonCode" label-width="100px">
        <el-input
          v-model="queryParams.moonCode"
          placeholder="请输入晚间天气代码"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <!-- <el-form-item label="扩展状态" prop="remark1">
        <el-input
          v-model="queryParams.remark1"
          placeholder="请输入扩展状态"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item> -->
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['ld:weatherForecast:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['ld:weatherForecast:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['ld:weatherForecast:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['ld:weatherForecast:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table
      v-loading="loading"
      :data="weatherForecastList"
      border
      table-layout="auto"
      @header-dragend="handleHeaderDragEnd"
      @selection-change="handleSelectionChange"
      class="weather-table"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" align="center" prop="id" width="70" />
      <el-table-column label="园区" align="center" prop="parkId" min-width="120">
        <template #default="scope">
          <el-tag class="weather-tag park-tag" effect="plain">
            <el-icon style="margin-right: 4px; vertical-align: middle;"><OfficeBuilding /></el-icon>
            <span>{{ getParkName(scope.row.parkId) }}</span>
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="抓取时间" align="center" prop="fetchTime" min-width="150">
        <template #default="scope">
          <span class="time-text">{{ parseTime(scope.row.fetchTime, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="预报日期" align="center" prop="forecastDate" min-width="135">
        <template #default="scope">
          <span class="time-text forecast-date">{{ parseTime(scope.row.forecastDate, '{y}-{m}-{d}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="温度范围" align="center" min-width="145">
        <template #default="scope">
          <span class="temp-range-value">
            <span class="min-t">{{ scope.row.tempMin }}°C</span>
            <span class="range-divider">~</span>
            <span class="max-t">{{ scope.row.tempMax }}°C</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="平均湿度" align="center" prop="humidityAvg" min-width="110">
        <template #default="scope">
          <el-tag type="warning" class="humidity-tag" effect="light">
            {{ scope.row.humidityAvg }}%
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="白天风况" align="center" min-width="155">
        <template #default="scope">
          <span class="wind-info">
            {{ scope.row.windDirDay || '--' }} 风 
            <el-tag size="small" type="success" effect="dark" class="wind-scale-tag">{{ scope.row.windScaleDay }}级</el-tag>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="降水量" align="center" min-width="125">
        <template #default="scope">
          <div class="precip-cell">
            <span class="precip-val" :class="{ 'has-precip': Number(scope.row.precipTotal) > 0 }">{{ scope.row.precipTotal }}mm</span>
            <span class="precip-prob" v-if="scope.row.precipProb">({{ scope.row.precipProb }}%)</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="天气状况(日/夜)" align="center" min-width="205">
        <template #default="scope">
          <div class="forecast-weather-cell">
            <span class="weather-day" title="白天天气">
              <i v-if="scope.row.dayCode" :class="'qi-' + scope.row.dayCode" class="weather-icon day"></i>
              <span class="text">{{ scope.row.weatherTextDay }}</span>
            </span>
            <span class="cell-divider">/</span>
            <span class="weather-night" title="夜间天气">
              <i v-if="scope.row.moonCode" :class="'qi-' + scope.row.moonCode" class="weather-icon night"></i>
              <span class="text">{{ scope.row.weatherTextNight }}</span>
            </span>
          </div>
        </template>
      </el-table-column>
     
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" min-width="135" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['ld:weatherForecast:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:weatherForecast:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination
      v-show="total>0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改园区未来天气预报趋势对话框 -->
    <el-dialog :title="title" v-model="open" width="650px" append-to-body class="weather-dialog">
      <el-form ref="weatherForecastRef" :model="form" :rules="rules" label-width="100px">
        <div class="form-section-title">基础与日期</div>
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
            <el-form-item label="预报类型" prop="forecastType">
              <el-input v-model="form.forecastType" placeholder="请输入预报类型" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="抓取时间" prop="fetchTime">
              <el-date-picker clearable
                v-model="form.fetchTime"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择抓取时间"
                style="width: 100%">
              </el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预报日期" prop="forecastDate">
              <el-date-picker clearable
                v-model="form.forecastDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择预报日期"
                style="width: 100%">
              </el-date-picker>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">温度、湿度与风况</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最高温度" prop="tempMax">
              <el-input v-model="form.tempMax" placeholder="请输入最高温度"><template #suffix>°C</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最低温度" prop="tempMin">
              <el-input v-model="form.tempMin" placeholder="请输入最低温度"><template #suffix>°C</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平均湿度" prop="humidityAvg">
              <el-input v-model="form.humidityAvg" placeholder="请输入平均湿度"><template #suffix>%</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="白天风向" prop="windDirDay">
              <el-input v-model="form.windDirDay" placeholder="请输入白天风向" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="白天风力" prop="windScaleDay">
              <el-input v-model="form.windScaleDay" placeholder="请输入白天风力" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">降水与天气描述</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="全天降水" prop="precipTotal">
              <el-input v-model="form.precipTotal" placeholder="请输入全天降水量"><template #suffix>mm</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="降水概率" prop="precipProb">
              <el-input v-model="form.precipProb" placeholder="请输入降水概率"><template #suffix>%</template></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="白天天气" prop="weatherTextDay">
              <el-input v-model="form.weatherTextDay" placeholder="请输入白天天气" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="夜间天气" prop="weatherTextNight">
              <el-input v-model="form.weatherTextNight" placeholder="请输入夜间天气" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="白天天气代码" prop="dayCode" label-width="110px">
              <el-input v-model="form.dayCode" placeholder="请输入白天天气代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="晚间天气代码" prop="moonCode" label-width="110px">
              <el-input v-model="form.moonCode" placeholder="请输入晚间天气代码" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section-title">扩展参数</div>
        <el-row :gutter="20">
          <!-- <el-col :span="24">
            <el-form-item label="扩展状态" prop="remark1">
              <el-input v-model="form.remark1" placeholder="请输入扩展状态" />
            </el-form-item>
          </el-col> -->
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

<script setup name="WeatherForecast">
import { listWeatherForecast, getWeatherForecast, delWeatherForecast, addWeatherForecast, updateWeatherForecast } from "@/api/binZhou/ld/iot/weatherForecast"
import { listPark } from "@/api/binZhou/ld/iot/park"
import { OfficeBuilding } from '@element-plus/icons-vue'
import 'qweather-icons/font/qweather-icons.css'

const { proxy } = getCurrentInstance()

const weatherForecastList = ref([])
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
    forecastDate: undefined,
    tempMax: undefined,
    tempMin: undefined,
    humidityAvg: undefined,
    windDirDay: undefined,
    windScaleDay: undefined,
    precipTotal: undefined,
    precipProb: undefined,
    weatherTextDay: undefined,
    weatherTextNight: undefined,
    dayCode: undefined,
    moonCode: undefined,
    forecastType: undefined,
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
    forecastDate: [
      { required: true, message: "预报日期不能为空", trigger: "blur" }
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

/** 查询园区未来天气预报趋势列表 */
function getList() {
  loading.value = true
  listWeatherForecast(queryParams.value).then(response => {
    weatherForecastList.value = sortWeatherForecastRows(response.rows || response.data || [])
    total.value = response.total || weatherForecastList.value.length
    loading.value = false
  })
}

function sortWeatherForecastRows(rows) {
  return [...rows].sort((a, b) => {
    const fetchA = new Date(a.fetchTime ?? a.fetch_time ?? 0).getTime() || 0
    const fetchB = new Date(b.fetchTime ?? b.fetch_time ?? 0).getTime() || 0
    if (fetchA !== fetchB) return fetchB - fetchA
    const dateA = new Date(a.forecastDate ?? a.forecast_date ?? 0).getTime() || 0
    const dateB = new Date(b.forecastDate ?? b.forecast_date ?? 0).getTime() || 0
    return dateA - dateB
  })
}

function handleHeaderDragEnd() {
  // Element Plus preserves the manually dragged column width.
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
    forecastDate: null,
    tempMax: null,
    tempMin: null,
    humidityAvg: null,
    windDirDay: null,
    windScaleDay: null,
    precipTotal: null,
    precipProb: null,
    weatherTextDay: null,
    weatherTextNight: null,
    dayCode: null,
    moonCode: null,
    forecastType: null,
    remark1: null,
    remark2: null
  }
  proxy.resetForm("weatherForecastRef")
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
  title.value = "添加园区未来天气预报趋势"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getWeatherForecast(_id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改园区未来天气预报趋势"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["weatherForecastRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateWeatherForecast(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addWeatherForecast(form.value).then(() => {
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
  proxy.$modal.confirm('是否确认删除园区未来天气预报趋势编号为"' + _ids + '"的数据项？').then(function() {
    return delWeatherForecast(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('ld/weatherForecast/export', {
    ...queryParams.value
  }, `weatherForecast_${new Date().getTime()}.xlsx`)
}

getList()
</script>

<style scoped lang="scss">
.weather-table {
  margin-top: 15px;
  
  .time-text {
    font-family: monospace;
    color: #555;
    
    &.forecast-date {
      font-weight: bold;
      color: #303133;
    }
  }
}

.weather-tag {
  display: inline-flex;
  align-items: center;
  font-weight: 500;
}

.park-tag {
  border-color: #dcdfe6;
  color: #606266;
}

.temp-range-value {
  font-weight: 600;
  font-size: 13.5px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  
  .min-t {
    color: #409eff;
  }
  
  .range-divider {
    color: #909399;
    font-weight: normal;
  }
  
  .max-t {
    color: #f56c6c;
  }
}

.humidity-tag {
  font-weight: 600;
  border-radius: 12px;
}

.wind-info {
  font-size: 12px;
  color: #606266;
  
  .wind-scale-tag {
    margin-left: 4px;
    border-radius: 4px;
  }
}

.precip-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: monospace;
  
  .precip-val {
    color: #909399;
    &.has-precip {
      color: #409eff;
      font-weight: bold;
    }
  }
  
  .precip-prob {
    font-size: 10px;
    color: #909399;
  }
}

.forecast-weather-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  font-size: 12px;
  
  .weather-day, .weather-night {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    
    .weather-icon {
      font-size: 16px;
      
      &.day {
        color: #e6a23c;
      }
      &.night {
        color: #909399;
      }
    }
    
    .text {
      font-weight: 500;
      color: #303133;
    }
  }
  
  .cell-divider {
    color: #dcdfe6;
  }
}

/* Dialog Form Styling */
.weather-dialog {
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 10px;
  }
  
  .form-section-title {
    font-size: 13px;
    font-weight: bold;
    color: #303133;
    margin: 15px 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 1px dashed #e4e7ed;
    display: flex;
    align-items: center;
    
    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 12px;
      background-color: #409eff;
      margin-right: 6px;
      border-radius: 2px;
    }
    
    &:first-of-type {
      margin-top: 0;
    }
  }
}
</style>
