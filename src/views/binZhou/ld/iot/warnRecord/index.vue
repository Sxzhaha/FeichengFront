<template>
  <div class="app-container warn-record-page">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="82px" class="query-card">
      <el-form-item label="设备编号" prop="deviceSn">
        <el-input v-model="queryParams.deviceSn" placeholder="请输入设备编号" clearable style="width: 190px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="预警等级" prop="levelConfigId">
        <el-select v-model="queryParams.levelConfigId" placeholder="请选择等级" clearable style="width: 160px">
          <el-option label="一级预警" :value="1" />
          <el-option label="二级预警" :value="2" />
          <el-option label="三级预警" :value="3" />
        </el-select>
      </el-form-item>
      <el-form-item label="实际数值" prop="actualValue">
        <el-input v-model="queryParams.actualValue" placeholder="请输入实际数值" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['ld:warnRecord:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['ld:warnRecord:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="warnRecordList" class="warn-table" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="48" align="center" />
      <el-table-column label="预警序号" align="center" prop="id" width="90" />
      <el-table-column label="设备名称" align="center" prop="deviceName" min-width="150" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.deviceName || scope.row.deviceSn || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="设备编号" align="center" prop="deviceSn" min-width="140" show-overflow-tooltip />
      <el-table-column label="产品名称" align="center" prop="productName" min-width="140" show-overflow-tooltip>
        <template #default="scope">
          {{ scope.row.productName || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="预警等级" align="center" prop="levelConfigId" width="110">
        <template #default="scope">
          <el-tag :type="getAlertLevelType(scope.row.levelConfigId)" effect="light">{{ getAlertLevelText(scope.row.levelConfigId) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="实际值" align="center" prop="actualValue" width="100">
        <template #default="scope">
          <span class="actual-value">{{ scope.row.actualValue ?? '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="预警数据信息" align="left" min-width="320">
        <template #default="scope">
          <div class="payload-list">
            <el-tag v-for="item in getPayloadItems(scope.row)" :key="item.key" class="payload-tag" effect="plain">
              {{ item.label }}：{{ item.value }}
            </el-tag>
            <span v-if="getPayloadItems(scope.row).length === 0" class="muted">暂无上报数据</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="防灾建议" align="left" prop="alertAdvice" min-width="220" show-overflow-tooltip />
      <el-table-column label="预警时间" align="center" prop="createTime" width="170">
        <template #default="scope">
          {{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="90" fixed="right">
        <template #default="scope">
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['ld:warnRecord:remove']">删除</el-button>
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
  </div>
</template>

<script setup name="WarnRecord">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listWarnRecord, delWarnRecord } from '@/api/binZhou/ld/iot/warnRecord'
import { listModel } from '@/api/binZhou/ld/iot/model'

const { proxy } = getCurrentInstance()

const warnRecordList = ref([])
const modelList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceSn: undefined,
    levelConfigId: undefined,
    actualValue: undefined
  }
})

const { queryParams } = toRefs(data)

const modelNameMap = computed(() => {
  const map = new Map()
  modelList.value.forEach(item => {
    const productKey = item.productId === null || item.productId === undefined ? 'all' : String(item.productId)
    map.set(`${productKey}:${item.identifier}`, item.modelName)
    map.set(`all:${item.identifier}`, item.modelName)
  })
  return map
})

function getList() {
  loading.value = true
  listWarnRecord(queryParams.value).then(response => {
    warnRecordList.value = response.rows || []
    total.value = response.total || 0
    loading.value = false
  }).catch(() => {
    warnRecordList.value = []
    total.value = 0
    loading.value = false
  })
}

function getModelList() {
  listModel({ pageNum: 1, pageSize: 1000 }).then(response => {
    modelList.value = response.rows || response.data || []
  })
}

function parsePayload(payload) {
  if (!payload) return {}
  if (typeof payload === 'object') return payload
  try {
    return JSON.parse(payload)
  } catch (e) {
    return {}
  }
}

function getPayloadSource(payload) {
  const parsed = parsePayload(payload)
  if (parsed && typeof parsed === 'object') {
    return parsed.params || parsed.properties || parsed.data || parsed
  }
  return {}
}

function getPayloadItems(row) {
  const source = getPayloadSource(row.payload)
  if (!source || typeof source !== 'object' || Array.isArray(source)) return []
  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
    .map(([key, value]) => ({
      key,
      label: getModelName(row.productId, key),
      value
    }))
}

function getModelName(productId, identifier) {
  const productKey = productId === null || productId === undefined ? 'all' : String(productId)
  return modelNameMap.value.get(`${productKey}:${identifier}`) || modelNameMap.value.get(`all:${identifier}`) || identifier
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
  multiple.value = !selection.length
}

function handleDelete(row) {
  const _ids = row.id || ids.value
  proxy.$modal.confirm(`是否确认删除预警记录编号为"${_ids}"的数据项？`).then(() => {
    return delWarnRecord(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('ld/warnRecord/export', {
    ...queryParams.value
  }, `warnRecord_${new Date().getTime()}.xlsx`)
}

function getAlertLevelType(level) {
  if (level === 1 || level === '1') return 'info'
  if (level === 2 || level === '2') return 'warning'
  if (level === 3 || level === '3') return 'danger'
  return 'info'
}

function getAlertLevelText(level) {
  if (level === 1 || level === '1') return '一级预警'
  if (level === 2 || level === '2') return '二级预警'
  if (level === 3 || level === '3') return '三级预警'
  return level ? `等级 ${level}` : '-'
}

getModelList()
getList()
</script>

<style scoped>
.warn-record-page {
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
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid #dcefe2;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(40, 120, 70, 0.08);
}

.actual-value {
  color: #e05b31;
  font-family: monospace;
  font-weight: 700;
}

.payload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0;
}

.payload-tag {
  max-width: 220px;
}

.muted {
  color: #94a3b8;
}
</style>
