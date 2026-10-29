<template>
  <div class="app-container weather-warn-page">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="76px" class="query-card">
      <el-form-item label="园区" prop="parkId">
        <el-select v-model="queryParams.parkId" placeholder="请选择园区" clearable filterable style="width: 210px" @change="handleQuery">
          <el-option v-for="item in parkList" :key="item.parkId" :label="item.parkName" :value="item.parkId" />
        </el-select>
      </el-form-item>
      <el-form-item label="预警类型" prop="type">
        <el-select v-model="queryParams.type" placeholder="请选择类型" clearable style="width: 170px" @change="handleQuery">
          <el-option label="实时天气预警" value="0" />
          <el-option label="未来天气预警" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="触发异常" prop="anomalyInfo">
        <el-input v-model="queryParams.anomalyInfo" placeholder="请输入触发异常" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="预警级别" prop="alertLevel">
        <el-input v-model="queryParams.alertLevel" placeholder="请输入预警级别" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['ld:weatherWarn:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['ld:weatherWarn:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['ld:weatherWarn:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="weatherWarnList" row-key="id" class="warn-table" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="48" align="center" />
      <el-table-column label="序号" align="center" prop="id" width="78" />
      <el-table-column label="园区" align="center" prop="parkName" min-width="130">
        <template #default="scope">
          <text-ellipsis :text="getRowParkName(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="预警类型" align="center" prop="type" width="130">
        <template #default="scope">
          <el-tag :type="getTypeTag(scope.row.type)" effect="plain">{{ formatWarnType(scope.row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="触发异常" align="left" prop="anomalyInfo" min-width="180">
        <template #default="scope">
          <text-ellipsis :text="scope.row.anomalyInfo" />
        </template>
      </el-table-column>
      <el-table-column label="预警级别" align="center" prop="alertLevel" width="110">
        <template #default="scope">
          <el-tag :type="getLevelTag(scope.row.alertLevel)" effect="plain">{{ scope.row.alertLevel || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="空气评价" align="left" prop="aqiEvaluation" min-width="170">
        <template #default="scope">
          <text-ellipsis :text="scope.row.aqiEvaluation" />
        </template>
      </el-table-column>
      <el-table-column label="防灾建议" align="left" prop="alertAdvice" min-width="220">
        <template #default="scope">
          <text-ellipsis :text="scope.row.alertAdvice" />
        </template>
      </el-table-column>
      <el-table-column label="处理状态" align="center" prop="auditStatus" width="110">
        <template #default="scope">
          <el-tag :type="getAuditTag(scope.row.auditStatus)" effect="plain">{{ formatAuditStatus(scope.row.auditStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="130" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['ld:weatherWarn:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:weatherWarn:remove']">删除</el-button>
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

    <el-dialog :title="title" v-model="open" width="560px" append-to-body>
      <el-form ref="weatherWarnRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="预警类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择预警类型" style="width: 100%">
                <el-option label="实时天气预警" value="0" />
                <el-option label="未来天气预警" value="1" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="触发异常" prop="anomalyInfo">
              <el-input v-model="form.anomalyInfo" placeholder="请输入触发异常" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="预警级别" prop="alertLevel">
              <el-input v-model="form.alertLevel" placeholder="请输入预警级别" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="空气评价" prop="aqiEvaluation">
              <el-input v-model="form.aqiEvaluation" type="textarea" :rows="3" placeholder="请输入空气评价" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="防灾建议" prop="alertAdvice">
              <el-input v-model="form.alertAdvice" type="textarea" :rows="3" placeholder="请输入防灾建议" />
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

<script setup name="WeatherWarn">
import { computed, defineComponent, getCurrentInstance, h, onMounted, reactive, ref, toRefs } from 'vue'
import { ElTooltip } from 'element-plus'
import { listWeatherWarn, getWeatherWarn, delWeatherWarn, addWeatherWarn, updateWeatherWarn } from '@/api/binZhou/ld/iot/weatherWarn'
import { listPark } from '@/api/binZhou/ld/iot/park'

const TextEllipsis = defineComponent({
  name: 'TextEllipsis',
  props: {
    text: {
      type: [String, Number],
      default: ''
    }
  },
  setup(props) {
    return () => {
      const value = props.text === null || props.text === undefined || props.text === '' ? '-' : String(props.text)
      const display = value.length > 20 ? `${value.slice(0, 20)}...` : value
      const content = h('span', {
        class: 'ellipsis-text',
        style: {
          display: 'inline-block',
          maxWidth: '100%',
          overflow: 'hidden',
          color: '#334155',
          lineHeight: '1.45',
          verticalAlign: 'middle',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, display)
      return value.length > 20
        ? h(ElTooltip, { content: value, placement: 'top', effect: 'dark' }, { default: () => content })
        : content
    }
  }
})

const { proxy } = getCurrentInstance()

const weatherWarnList = ref([])
const parkList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    parkId: undefined,
    anomalyInfo: undefined,
    alertLevel: undefined,
    aqiEvaluation: undefined,
    alertAdvice: undefined,
    auditStatus: undefined,
    remark1: undefined,
    remark2: undefined,
    type: undefined
  },
  rules: {
    anomalyInfo: [{ required: true, message: '触发异常不能为空', trigger: 'blur' }],
    alertLevel: [{ required: true, message: '预警级别不能为空', trigger: 'blur' }],
    auditStatus: [{ required: true, message: '处理状态不能为空', trigger: 'change' }],
    createTime: [{ required: true, message: '预警生成时间不能为空', trigger: 'blur' }],
    type: [{ required: true, message: '预警类型不能为空', trigger: 'change' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

const parkNameMap = computed(() => {
  const map = new Map()
  parkList.value.forEach(item => map.set(String(item.parkId), item.parkName))
  return map
})

function getParkList() {
  listPark({ pageNum: 1, pageSize: 1000 }).then(response => {
    parkList.value = response.rows || response.data || []
  })
}

function getRowParkName(row) {
  const parkId = row.parkId ?? row.park_id ?? row.weatherForecast?.parkId ?? row.weather?.parkId
  const parkKey = parkId === null || parkId === undefined || parkId === '' ? '' : String(parkId)
  return row.parkName || row.park_name || row.weatherForecast?.parkName || row.weather?.parkName || parkNameMap.value.get(parkKey) || '未关联园区'
}

function getList() {
  loading.value = true
  listWeatherWarn(queryParams.value).then(response => {
    weatherWarnList.value = response.rows || []
    total.value = response.total || 0
    loading.value = false
  }).catch(() => {
    weatherWarnList.value = []
    total.value = 0
    loading.value = false
  })
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    id: null,
    parkId: null,
    anomalyInfo: null,
    alertLevel: null,
    aqiEvaluation: null,
    alertAdvice: null,
    auditStatus: null,
    createTime: null,
    remark1: null,
    remark2: null,
    type: '0'
  }
  proxy.resetForm('weatherWarnRef')
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
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '添加天气预警与防灾建议'
}

function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getWeatherWarn(_id).then(response => {
    form.value = {
      ...response.data,
      type: response.data?.type === undefined || response.data?.type === null ? '0' : String(response.data.type)
    }
    open.value = true
    title.value = '修改天气预警与防灾建议'
  })
}

function submitForm() {
  proxy.$refs.weatherWarnRef.validate(valid => {
    if (!valid) return
    if (form.value.id != null) {
      updateWeatherWarn(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addWeatherWarn(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

function handleDelete(row) {
  const _ids = row.id || ids.value
  proxy.$modal.confirm(`是否确认删除天气预警编号为"${_ids}"的数据项？`).then(() => {
    return delWeatherWarn(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('ld/weatherWarn/export', {
    ...queryParams.value
  }, `weatherWarn_${new Date().getTime()}.xlsx`)
}

function formatWarnType(type) {
  if (type === 0 || type === '0') return '实时天气预警'
  if (type === 1 || type === '1') return '未来天气预警'
  return type ?? '-'
}

function getTypeTag(type) {
  if (type === 0 || type === '0') return 'success'
  if (type === 1 || type === '1') return 'warning'
  return 'info'
}

function formatAuditStatus(status) {
  if (status === 0 || status === '0') return '未处理'
  if (status === 1 || status === '1') return '专家推送'
  if (status === 2 || status === '2') return '人工核销'
  return status ?? '-'
}

function getAuditTag(status) {
  if (status === 0 || status === '0') return 'danger'
  if (status === 1 || status === '1') return 'warning'
  if (status === 2 || status === '2') return 'success'
  return 'info'
}

function getLevelTag(level) {
  const value = String(level || '')
  if (value.includes('红') || value.includes('高')) return 'danger'
  if (value.includes('橙') || value.includes('黄') || value.includes('中')) return 'warning'
  return 'success'
}

onMounted(() => {
  getParkList()
  getList()
})
</script>

<style scoped>
.weather-warn-page {
  background: #f6fbf7;
}

.query-card {
  padding: 12px 12px 2px;
  margin-bottom: 10px;
  border: 1px solid #dcefe2;
  border-radius: 6px;
  background: linear-gradient(135deg, #ffffff, #eef9f1);
}

.warn-table {
  width: 100%;
  overflow: hidden;
  border: 1px solid #dcefe2;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(40, 120, 70, 0.08);
}

.ellipsis-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  color: #334155;
  line-height: 1.45;
  vertical-align: middle;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
