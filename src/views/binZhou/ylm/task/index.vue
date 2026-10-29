<template>
  <div class="app-container task-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card stat-total">
          <div class="stat-icon">
            <el-icon><Tickets /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">全部农事记录</div>
            <div class="stat-number">
              <span class="stat-value">{{ statData.total }}</span>
              <span class="stat-unit">条</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card stat-month">
          <div class="stat-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">本月农事记录</div>
            <div class="stat-number">
              <span class="stat-value">{{ statData.month }}</span>
              <span class="stat-unit">条</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card stat-week">
          <div class="stat-icon">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-label">近七天农事记录</div>
            <div class="stat-number">
              <span class="stat-value">{{ statData.week }}</span>
              <span class="stat-unit">条</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-form ref="queryRef" :model="queryParams" :inline="true" class="filter-form" label-width="76px">
      <el-form-item label="任务编号" prop="taskNo" class="filter-item filter-task-no">
        <el-input
          v-model="queryParams.taskNo"
          placeholder="请输入任务编号"
          clearable
          class="filter-control"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="农事类型" prop="workTypeId" class="filter-item filter-work-type">
        <el-select v-model="queryParams.workTypeId" placeholder="请选择农事类型" clearable class="filter-control">
          <el-option
            v-for="dict in agriWorkTypeOptions"
            :key="dict.dictValue"
            :label="dict.dictLabel"
            :value="dict.dictValue"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="作业方式" prop="workMethodId" class="filter-item filter-work-method">
        <el-select v-model="queryParams.workMethodId" placeholder="请选择作业方式" clearable class="filter-control">
          <el-option
            v-for="dict in agriWorkMethodOptions"
            :key="dict.dictValue"
            :label="dict.dictLabel"
            :value="dict.dictValue"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="创建人" prop="createById" class="filter-item filter-creator">
        <el-input
          v-model="queryParams.createById"
          placeholder="请输入创建人"
          clearable
          class="filter-control"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item class="filter-actions">
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8 action-row">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" :loading="taskNoGenerating" :disabled="taskNoGenerating" @click="handleAdd" v-hasPermi="['ylm:task:add']">新增记录</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['ylm:task:edit']">修改记录</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['ylm:task:remove']">批量删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['ylm:task:export']">导出记录</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Upload" @click="openImportDialog">批量导入</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="taskList" border class="task-table" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
     
      <el-table-column label="任务编号" align="center" prop="taskNo" min-width="150" />
      <el-table-column label="农事类型" align="center" prop="workTypeId" min-width="80">
        <template #default="scope">
          <dict-tag :options="agriWorkTypeOptions" :value="scope.row.workTypeId" />
        </template>
      </el-table-column>
      <el-table-column label="作业方式" align="center" prop="workMethodId" min-width="90">
        <template #default="scope">
          <dict-tag :options="agriWorkMethodOptions" :value="scope.row.workMethodId" />
        </template>
      </el-table-column>
      <el-table-column label="区域" align="center" prop="regionFullName" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <span>{{ getRegionName(scope.row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="任务描述" align="center" prop="description" min-width="180" show-overflow-tooltip />
      <el-table-column label="农事图片" align="center" prop="photoUrls" min-width="130">
        <template #default="scope">
          <image-preview v-if="photoPreviewSrc(scope.row.photoUrls)" :src="photoPreviewSrc(scope.row.photoUrls)" :width="54" :height="54" />
          <span v-else class="empty-text">未上传</span>
        </template>
      </el-table-column>
      <el-table-column label="创建人" align="center" prop="createById" min-width="110">
        <template #default="scope">
          <dict-tag :options="userOptions" :value="scope.row.createById" />
        </template>
      </el-table-column>
      <el-table-column label="操作人" align="center" prop="operatorId" min-width="110">
        <template #default="scope">
          <dict-tag :options="agriOperatorOptions" :value="scope.row.operatorId" />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" min-width="140">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="开始时间" align="center" prop="startTime" min-width="140">
        <template #default="scope">
          <span>{{ parseTime(scope.row.startTime, '{y}-{m}-{d} {h}:{i}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="结束时间" align="center" prop="endTime" min-width="140">
        <template #default="scope">
          <span>{{ parseTime(scope.row.endTime, '{y}-{m}-{d} {h}:{i}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['ylm:task:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ylm:task:remove']">删除</el-button>
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

    <el-dialog :title="title" v-model="open" width="620px" append-to-body>
      <el-form ref="taskRef" :model="form" :rules="rules" label-width="100px" :hide-required-asterisk="false">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="任务编号" prop="taskNo">
              <el-input v-model="form.taskNo" placeholder="请输入任务编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域" prop="regionValue">
              <el-cascader
                v-model="form.regionValue"
                :options="regionOptions"
                :props="regionProps"
                placeholder="请选择区域"
                clearable
                filterable
                class="dialog-control"
                @change="handleRegionChange"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="农事类型" prop="workTypeId">
              <el-select v-model="form.workTypeId" placeholder="请选择农事类型" clearable class="dialog-control">
                <el-option v-for="dict in agriWorkTypeOptions" :key="dict.dictValue" :label="dict.dictLabel" :value="dict.dictValue" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作业方式" prop="workMethodId">
              <el-select v-model="form.workMethodId" placeholder="请选择作业方式" clearable class="dialog-control">
                <el-option v-for="dict in agriWorkMethodOptions" :key="dict.dictValue" :label="dict.dictLabel" :value="dict.dictValue" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="任务描述" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入任务描述" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="农事图片" prop="photoUrls">
              <image-upload v-model="form.photoUrls" :limit="6" :file-size="8" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="创建人">
              <el-input :model-value="formCreatorName" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作人" prop="operatorId">
              <el-select
                v-model="form.operatorId"
                placeholder="请选择操作人"
                clearable
                multiple
                collapse-tags
                collapse-tags-tooltip
                class="dialog-control"
              >
                <el-option v-for="dict in agriOperatorOptions" :key="dict.dictValue" :label="dict.dictLabel" :value="dict.dictValue" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker
                clearable
                v-model="form.startTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择开始时间"
                class="dialog-control"
                @change="revalidateEndTime"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker
                clearable
                v-model="form.endTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择结束时间"
                class="dialog-control"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </div>
      </template>
    </el-dialog>
    <AgriTaskImportDialog v-model="importOpen" @success="handleImportSuccess" />
  </div>
</template>

<script setup name="Task">
import { ref, reactive, toRefs, getCurrentInstance, onMounted, computed, nextTick } from 'vue'
import AgriTaskImportDialog from '../components/AgriTaskImportDialog.vue'
import { listTask, getTask, delTask, addTask, updateTask, listRegionTree, exportTask, generateTaskNo } from "@/api/binZhou/ylm/task"
import { parseTime } from '@/utils/ruoyi'
import { stringifyPhotoUrls } from '@/utils/image'
import { getDicts } from '@/api/system/dict/data'
import { listUser } from '@/api/system/user'
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const userStore = useUserStore()
const xlsxContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const agriWorkTypeOptions = ref([])
const agriWorkMethodOptions = ref([])
const agriOperatorOptions = ref([])
const userOptions = ref([])
const regionOptions = ref([])
const regionProps = {
  value: 'value',
  label: 'label',
  children: 'children',
  emitPath: true
}

const taskList = ref([])
const open = ref(false)
const loading = ref(true)
const ids = ref([])
const selectedRows = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const importOpen = ref(false)
const taskNoGenerating = ref(false)

const statData = reactive({
  total: 0,
  month: 0,
  week: 0
})

function toTime(value) {
  if (!value) {
    return NaN
  }
  return new Date(String(value).replace(/-/g, '/')).getTime()
}

function validateTimeRange(rule, value, callback) {
  if (!data.form.startTime || !data.form.endTime) {
    callback()
    return
  }
  const start = toTime(data.form.startTime)
  const end = toTime(data.form.endTime)
  if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
    callback(new Error('结束时间不能早于开始时间'))
    return
  }
  callback()
}

function validateRegion(rule, value, callback) {
  const path = Array.isArray(data.form.regionValue) ? data.form.regionValue : []
  if (data.form.locationId && path.length >= 3) {
    callback()
    return
  }
  callback(new Error('请选择区域'))
}

function validateOperator(rule, value, callback) {
  if (splitDictValues(data.form.operatorId).length) {
    callback()
    return
  }
  callback(new Error('请选择操作人'))
}

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskNo: undefined,
    workTypeId: undefined,
    workMethodId: undefined,
    createById: undefined
  },
  rules: {
    taskNo: [{ required: true, message: "任务编号不能为空", trigger: "blur" }],
    workTypeId: [{ required: true, message: "农事类型不能为空", trigger: "change" }],
    workMethodId: [{ required: true, message: "作业方式不能为空", trigger: "change" }],
    regionValue: [
      { required: true, type: 'array', min: 3, message: "请选择区域", trigger: "change" },
      { validator: validateRegion, trigger: "change" }
    ],
    operatorId: [
      { required: true, type: 'array', min: 1, message: "请选择操作人", trigger: "change" },
      { validator: validateOperator, trigger: "change" }
    ],
    startTime: [
      { required: true, message: "开始时间不能为空", trigger: "change" },
      { validator: validateTimeRange, trigger: "change" }
    ],
    endTime: [
      { required: true, message: "结束时间不能为空", trigger: "change" },
      { validator: validateTimeRange, trigger: "change" }
    ]
  }
})
const { queryParams, form, rules } = toRefs(data)
const currentUserId = computed(() => String(userStore.id || ''))
const currentUserName = computed(() => userStore.nickName || userStore.name || currentUserId.value)
const formCreatorName = computed(() => {
  if (form.value?.id) {
    return form.value?.createByName || getDictLabel(userOptions.value, form.value?.createById) || form.value?.createById || '-'
  }
  return currentUserName.value || '-'
})

onMounted(async () => {
  if (!userStore.id) {
    await userStore.getInfo()
  }
  agriWorkTypeOptions.value = normalizeDicts((await getDicts('ylm_agri_work_type')).data)
  agriWorkMethodOptions.value = normalizeDicts((await getDicts('ylm_agri_work_method')).data)
  agriOperatorOptions.value = normalizeDicts((await getDicts('ylm_agri_operator')).data)
  userOptions.value = normalizeUsers((await listUser({ pageNum: 1, pageSize: 1000 })).rows || [])
  try {
    regionOptions.value = buildRegionOptions((await listRegionTree()).data || [])
  } catch (error) {
    regionOptions.value = []
    console.error('区域数据加载失败', error)
  }
  getList()
})

function normalizeDicts(list = []) {
  return list.map(item => ({
    ...item,
    dictValue: item.dictValue === undefined || item.dictValue === null ? '' : String(item.dictValue),
    label: item.dictLabel,
    value: item.dictValue === undefined || item.dictValue === null ? '' : String(item.dictValue),
    elTagType: item.listClass || item.elTagType || '',
    elTagClass: item.cssClass || item.elTagClass || ''
  }))
}

function normalizeUsers(list = []) {
  return list.map(user => ({
    dictLabel: user.nickName || user.userName,
    dictValue: String(user.userId),
    label: user.nickName || user.userName,
    value: String(user.userId)
  }))
}

function getDictLabel(list, value) {
  const item = list.find(dict => dict.dictValue == value || dict.value == value)
  return item ? item.dictLabel || item.label : value || ''
}

function getDictText(list, value) {
  const values = splitDictValues(value)
  if (!values.length) {
    return ''
  }
  return values.map(item => getDictLabel(list, item) || item).join('、')
}

function getWorkTypeName(row) {
  return row?.workTypeName || getDictText(agriWorkTypeOptions.value, row?.workTypeId) || '-'
}

function getWorkMethodName(row) {
  return row?.workMethodName || getDictText(agriWorkMethodOptions.value, row?.workMethodId) || '-'
}

function getCreatorName(row) {
  return row?.createByName || row?.creatorName || getDictText(userOptions.value, row?.createById) || '-'
}

function getOperatorName(row) {
  return row?.operatorName || getDictText(agriOperatorOptions.value, row?.operatorId) || '-'
}

function normalizeDictValue(value) {
  return value === undefined || value === null ? '' : String(value)
}

function splitDictValues(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeDictValue).filter(Boolean)
  }
  return normalizeDictValue(value).split(',').map(item => item.trim()).filter(Boolean)
}

function joinDictValues(value) {
  return splitDictValues(value).join(',')
}

function normalizeFormDictValues() {
  form.value.workTypeId = normalizeDictValue(form.value.workTypeId)
  form.value.workMethodId = normalizeDictValue(form.value.workMethodId)
  form.value.operatorId = splitDictValues(form.value.operatorId)
}

function getRegionName(row) {
  const optionName = getRegionNameFromOptions(row)
  const names = [row?.parkName, row?.areaName, row?.locationName].filter(Boolean).join('')
  if (!row?.locationId && !row?.locationName && optionName) {
    return optionName
  }
  return names || optionName || row?.regionFullName || row?.areaId || '-'
}

function readRegionField(row, ...names) {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name]
    }
  }
  return null
}

function normalizeRegionId(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const numberValue = Number(value)
  return Number.isNaN(numberValue) ? value : numberValue
}

function buildRegionOptions(rows = []) {
  const parks = []
  const parkMap = new Map()
  rows.forEach(row => {
    const parkId = readRegionField(row, 'parkId', 'park_id', 'PARK_ID', 'PARKID')
    const parkName = readRegionField(row, 'parkName', 'park_name', 'PARK_NAME', 'PARKNAME')
    const areaId = readRegionField(row, 'areaId', 'area_id', 'AREA_ID', 'AREAID')
    const areaName = readRegionField(row, 'areaName', 'area_name', 'AREA_NAME', 'AREANAME')
    const locationId = readRegionField(row, 'locationId', 'location_id', 'LOCATION_ID', 'LOCATIONID')
    const locationName = readRegionField(row, 'locationName', 'location_name', 'LOCATION_NAME', 'LOCATIONNAME')
    if (!parkId) {
      return
    }
    const parkKey = String(parkId)
    if (!parkMap.has(parkKey)) {
      const park = { value: normalizeRegionId(parkId), label: parkName || parkKey, children: [], areaMap: new Map() }
      parkMap.set(parkKey, park)
      parks.push(park)
    }
    if (!areaId) {
      return
    }
    const park = parkMap.get(parkKey)
    const areaKey = String(areaId)
    if (!park.areaMap.has(areaKey)) {
      const area = { value: normalizeRegionId(areaId), label: areaName || areaKey, children: [] }
      park.areaMap.set(areaKey, area)
      park.children.push(area)
    }
    if (locationId) {
      park.areaMap.get(areaKey).children.push({
        value: normalizeRegionId(locationId),
        label: locationName || String(locationId)
      })
    }
  })
  return parks.map(park => {
    const { areaMap, ...option } = park
    return option
  })
}

function getRegionValue(row) {
  if (row?.parkId && row?.areaId && row?.locationId) {
    return [normalizeRegionId(row.parkId), normalizeRegionId(row.areaId), normalizeRegionId(row.locationId)]
  }
  return getRegionPathFromOptions(row)
}

function handleRegionChange(value) {
  const path = Array.isArray(value) ? value : []
  form.value.areaId = normalizeRegionId(path[1])
  form.value.locationId = normalizeRegionId(path[2])
}

function revalidateEndTime() {
  proxy.$refs["taskRef"]?.validateField("endTime")
}

function buildSubmitPayload() {
  handleRegionChange(form.value.regionValue)
  const { regionValue, ...payload } = form.value
  return {
    ...payload,
    photoUrls: stringifyPhotoUrls(payload.photoUrls),
    workTypeId: normalizeRegionId(payload.workTypeId),
    workMethodId: normalizeRegionId(payload.workMethodId),
    operatorId: joinDictValues(payload.operatorId),
    areaId: normalizeRegionId(payload.areaId),
    locationId: normalizeRegionId(payload.locationId)
  }
}

function photoPreviewSrc(urls) {
  return stringifyPhotoUrls(urls)
}

function getRegionPathFromOptions(row) {
  const areaId = normalizeRegionId(row?.areaId)
  const locationId = normalizeRegionId(row?.locationId)
  if (!areaId && !locationId) {
    return []
  }
  for (const park of regionOptions.value) {
    for (const area of park.children || []) {
      const locations = area.children || []
      const location = locationId ? locations.find(item => String(item.value) === String(locationId)) : null
      if (location) {
        return [park.value, area.value, location.value]
      }
      if (areaId && String(area.value) === String(areaId)) {
        const firstLocation = locations[0]
        return firstLocation ? [park.value, area.value, firstLocation.value] : [park.value, area.value]
      }
    }
  }
  return []
}

function getRegionNameFromOptions(row) {
  const path = getRegionPathFromOptions(row)
  if (!path.length) {
    return ''
  }
  const park = regionOptions.value.find(item => String(item.value) === String(path[0]))
  const area = (park?.children || []).find(item => String(item.value) === String(path[1]))
  const location = (area?.children || []).find(item => String(item.value) === String(path[2]))
  return [park?.label, area?.label, location?.label].filter(Boolean).join('')
}

function getList() {
  loading.value = true
  listTask(queryParams.value).then(response => {
    taskList.value = response.rows || []
    total.value = response.total || 0
    statData.total = response.total || 0
    statData.month = response.monthCount || 0
    statData.week = response.weekCount || 0
  }).finally(() => {
    loading.value = false
  })
}

function openImportDialog() {
  importOpen.value = true
}

function handleImportSuccess() {
  getList()
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    id: null,
    taskNo: null,
    workTypeId: null,
    workMethodId: null,
    areaId: null,
    locationId: null,
    regionValue: [],
    description: null,
    photoUrls: null,
    createById: currentUserId.value,
    operatorId: [],
    startTime: null,
    endTime: null,
    remark: null,
    agriTaskA: null,
    agriTaskB: null,
    agriTaskC: null,
    agriTaskD: null
  }
  proxy.resetForm("taskRef")
}

function getGeneratedTaskNo(response) {
  if (typeof response === 'string') {
    return response.trim()
  }
  if (response && response.data != null) {
    return String(response.data).trim()
  }
  if (response && response.taskNo != null) {
    return String(response.taskNo).trim()
  }
  if (response && response.msg && response.msg !== '操作成功') {
    return String(response.msg).trim()
  }
  return ''
}

function getGenerateTaskNoErrorMessage(error) {
  if (typeof error === 'string') {
    return error === 'empty task no' ? '接口未返回任务编号' : error
  }
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }
  if (data?.msg) {
    return data.msg
  }
  if (data?.message) {
    return data.message
  }
  if (error?.message && error.message !== 'empty task no') {
    return error.message
  }
  return '接口未返回任务编号'
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  selectedRows.value = selection
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

async function handleAdd() {
  if (taskNoGenerating.value) {
    return
  }
  reset()
  taskNoGenerating.value = true
  try {
    const response = await generateTaskNo()
    const taskNo = getGeneratedTaskNo(response)
    if (!taskNo) {
      throw new Error('empty task no')
    }
    form.value.taskNo = taskNo
    open.value = true
    title.value = "添加农事任务"
    nextTick(() => proxy.$refs["taskRef"]?.clearValidate())
  } catch (error) {
    proxy.$modal.msgError(`任务编号生成失败：${getGenerateTaskNoErrorMessage(error)}`)
  } finally {
    taskNoGenerating.value = false
  }
}

function handleUpdate(row) {
  const taskId = row && row.id ? row.id : ids.value[0]
  if (!taskId) {
    proxy.$modal.msgWarning("请选择一条需要修改的数据")
    return
  }
  reset()
  getTask(taskId).then(response => {
    form.value = response.data || {}
    normalizeFormDictValues()
    form.value.regionValue = getRegionValue(form.value)
    handleRegionChange(form.value.regionValue)
    open.value = true
    title.value = "修改农事任务"
    nextTick(() => proxy.$refs["taskRef"]?.clearValidate())
  })
}

function submitForm() {
  proxy.$refs["taskRef"].validate(valid => {
    if (!valid) {
      return
    }
    const isEdit = form.value.id != null
    const request = isEdit ? updateTask : addTask
    request(buildSubmitPayload()).then(() => {
      proxy.$modal.msgSuccess(isEdit ? "修改成功" : "新增成功")
      open.value = false
      getList()
    })
  })
}

function handleDelete(row) {
  const taskIds = row && row.id ? [row.id] : ids.value
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    proxy.$modal.msgWarning("请选择需要删除的数据")
    return
  }
  proxy.$modal.confirm('是否确认删除农事任务？').then(() => {
    return delTask(taskIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function handleExport() {
  const exportQuery = { ...queryParams.value }
  if (ids.value.length) {
    exportQuery.ids = ids.value
  }
  exportTask(exportQuery).then(handleExportResponse).catch(() => {
    proxy.$modal.msgError('导出记录失败')
  })
}

async function handleExportResponse(response) {
  const blob = response?.data
  if (!blob) {
    proxy.$modal.msgError('导出记录失败')
    return
  }
  const contentType = getResponseHeader(response.headers, 'content-type') || blob.type || ''
  if (contentType.includes('application/json')) {
    const message = await readExportErrorMessage(blob)
    proxy.$modal.msgError(message || '导出记录失败')
    return
  }
  const filename = normalizeXlsxFilename(getDownloadFilename(response.headers) || `农事记录_${formatExportTimestamp()}.xlsx`)
  const exportBlob = blob.type === xlsxContentType ? blob : new Blob([blob], { type: xlsxContentType })
  downloadBlob(exportBlob, filename)
}

async function readExportErrorMessage(blob) {
  try {
    const text = await blob.text()
    const result = JSON.parse(text)
    return result.msg || result.message
  } catch (error) {
    return ''
  }
}

function getResponseHeader(headers, name) {
  if (!headers) {
    return ''
  }
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || ''
}

function getDownloadFilename(headers) {
  const downloadFilename = getResponseHeader(headers, 'download-filename')
  if (downloadFilename) {
    return decodeURIComponent(downloadFilename)
  }
  const disposition = getResponseHeader(headers, 'content-disposition')
  if (!disposition) {
    return ''
  }
  const utf8Match = disposition.match(/filename\*=utf-8''([^;]+)/i)
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1])
  }
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  return filenameMatch ? decodeURIComponent(filenameMatch[1]) : ''
}

function normalizeXlsxFilename(filename) {
  const safeName = filename || `农事记录_${formatExportTimestamp()}.xlsx`
  return /\.(xls|xlsx)$/i.test(safeName) ? safeName.replace(/\.(xls|xlsx)$/i, '.xlsx') : `${safeName}.xlsx`
}

function formatExportTimestamp() {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.task-page {
  background: #f4faf1;
}

.stat-row {
  margin-bottom: 14px;
}

.stat-row :deep(.el-col) {
  margin-bottom: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  min-height: 104px;
  border: 1px solid #d7e8d8;
  border-radius: 0;
  color: #20372f;
  background: #fbfdf8;
  box-shadow: 0 8px 18px rgba(42, 91, 63, 0.06);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 20px 24px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 58px;
  width: 58px;
  height: 58px;
  margin-right: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: #eaf7ef;
  color: #2a8a68;
  font-size: 26px;
}

.stat-month .stat-icon {
  background: #eff9e5;
  color: #479978;
}

.stat-week .stat-icon {
  background: #fbf5df;
  color: #85a13f;
}

.stat-content {
  min-width: 0;
}

.stat-label {
  color: #6b8178;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-number {
  display: flex;
  align-items: baseline;
  margin-top: 8px;
}

.stat-value {
  color: #1f342e;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-unit {
  margin-left: 8px;
  color: #6d8379;
  font-size: 14px;
  font-weight: 600;
}

.filter-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 16px;
  padding: 18px 24px;
  border: 1px solid #dceadc;
  border-radius: 0;
  background: #fff;
  box-shadow: 0 14px 28px rgba(38, 78, 51, 0.06);
  overflow-x: hidden;
}

.filter-form :deep(.el-form-item) {
  display: flex;
  align-items: center;
  margin: 0;
  min-width: 0;
}

.filter-form :deep(.el-form-item__label) {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  width: auto !important;
  min-width: 56px;
  height: 36px;
  padding-right: 12px;
  color: #17392f;
  font-size: 14px;
  font-weight: 600;
  line-height: 36px;
  white-space: nowrap;
  word-break: keep-all;
}

.filter-form :deep(.el-input__wrapper),
.filter-form :deep(.el-select__wrapper) {
  min-height: 36px;
  border-radius: 0;
  box-shadow: 0 0 0 1px #d7e2da inset;
}

.filter-form :deep(.el-input__inner),
.filter-form :deep(.el-select__placeholder),
.filter-form :deep(.el-select__selected-item) {
  font-size: 14px;
}

.filter-form :deep(.el-form-item__content) {
  flex: 1 1 auto;
  min-width: 0;
}

.filter-item {
  flex: 1 1 220px;
  min-width: 0;
}

.filter-task-no {
  flex: 1.2 1 250px;
}

.filter-work-type,
.filter-work-method {
  flex: 1 1 222px;
}

.filter-creator {
  flex: 1 1 210px;
}

.filter-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto !important;
  margin-left: auto !important;
  gap: 12px;
  padding-left: 14px;
}

.filter-actions :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 12px;
  min-width: max-content;
}

.filter-actions :deep(.el-button) {
  height: 36px;
  min-width: 82px;
  margin-left: 0;
  border-radius: 0;
  font-size: 14px;
  font-weight: 600;
}

.filter-actions :deep(.el-button--primary) {
  border-color: #2f8060;
  background: #2f8060;
}

.filter-control {
  width: 100%;
  min-width: 0;
}

.filter-task-no .filter-control {
  width: 100%;
}

.action-row {
  align-items: center;
  margin-bottom: 12px;
}

.action-row :deep(.el-button) {
  height: 36px;
  min-width: 104px;
  border-radius: 0;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.16s ease, background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, transform 0.12s ease;
}

.action-row :deep(.el-button:not(.is-disabled):hover) {
  box-shadow: 0 2px 8px rgba(47, 143, 91, 0.12);
}

.action-row :deep(.el-button:not(.is-disabled):active) {
  transform: translateY(1px);
}

.action-row :deep(.el-button--primary.is-plain) {
  color: #ffffff;
  border-color: #2f8f5b;
  background: #2f8f5b;
}

.action-row :deep(.el-button--primary.is-plain:hover),
.action-row :deep(.el-button--primary.is-plain:focus) {
  color: #ffffff;
  border-color: #26754a;
  background: #26754a;
}

.action-row :deep(.el-button--primary.is-plain:active) {
  color: #ffffff;
  border-color: #1f5f3b;
  background: #1f5f3b;
}

.action-row :deep(.el-button--success.is-plain),
.action-row :deep(.el-button--warning.is-plain) {
  color: #2f8f5b;
  border-color: #9fd5b4;
  background: #f4fbf7;
}

.action-row :deep(.el-button--success.is-plain:hover),
.action-row :deep(.el-button--success.is-plain:focus),
.action-row :deep(.el-button--warning.is-plain:hover),
.action-row :deep(.el-button--warning.is-plain:focus) {
  color: #26754a;
  border-color: #8bc9a5;
  background: #e6f7ec;
}

.action-row :deep(.el-button--success.is-plain:active),
.action-row :deep(.el-button--warning.is-plain:active) {
  color: #1f5f3b;
  border-color: #75b98f;
  background: #dff1e6;
}

.action-row :deep(.el-button--danger.is-plain) {
  color: #c94a4a;
  border-color: #e6b8b8;
  background: #fff5f5;
}

.action-row :deep(.el-button--danger.is-plain:hover),
.action-row :deep(.el-button--danger.is-plain:focus) {
  color: #b64040;
  border-color: #dea7a7;
  background: #fdecec;
}

.action-row :deep(.el-button--danger.is-plain:active) {
  color: #9f3838;
  border-color: #d79494;
  background: #f9e2e2;
}

.action-row :deep(.el-button.is-disabled),
.action-row :deep(.el-button.is-disabled:hover),
.action-row :deep(.el-button.is-disabled:focus),
.action-row :deep(.el-button.is-disabled:active) {
  color: #b8c2ba !important;
  border-color: #dce6dd !important;
  background: #f5f7f5 !important;
  box-shadow: none;
  transform: none;
  cursor: not-allowed;
}

@media (max-width: 1280px) {
  .filter-actions {
    margin-left: 0 !important;
    padding-left: 0;
  }
}

@media (max-width: 768px) {
  .filter-form {
    gap: 14px;
    padding: 16px;
  }

  .filter-item {
    flex-basis: 100%;
  }

  .filter-actions {
    width: 100%;
  }
}

.dialog-control {
  width: 100%;
}

.task-table {
  margin-top: 8px;
}

.empty-text {
  color: #909399;
}
</style>
