<template>
  <div class="app-container">
    <!-- 查询区域：与设备列表保持一致 -->
    <el-form
      v-show="showSearch"
      ref="queryRef"
      :model="queryParams"
      :inline="true"
      label-width="78px"
      class="record-query-form"
    >
      <el-form-item label="设备选择" prop="deviceId">
        <el-select
          v-model="queryParams.deviceId"
          placeholder="请选择或搜索设备"
          clearable
          filterable
          class="query-control device-select"
          @change="handleQuery"
        >
          <el-option
            v-for="item in deviceOptions"
            :key="getDeviceId(item)"
            :label="item.deviceName"
            :value="getDeviceId(item)"
          >
            <div class="device-option">
              <span class="device-option-name">
                {{ item.deviceName || "未命名设备" }}
              </span>
              <span class="device-option-sn">
                SN：{{ item.deviceSn || "-" }}
              </span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="拍摄日期" prop="captureTime">
        <el-date-picker
          v-model="queryParams.captureTime"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择拍摄日期"
          clearable
          class="query-control"
        />
      </el-form-item>

      <el-form-item class="query-action-item">
        <el-button type="primary" icon="Search" @click="handleQuery">
          搜索
        </el-button>
        <el-button icon="Refresh" @click="resetQuery">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 工具栏：与设备列表保持一致 -->
    <div class="table-toolbar mb8">
      <div class="toolbar-left">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['iot:record:remove']"
        >
          批量删除
        </el-button>

        <span class="selection-tip">
          共 {{ total }} 条记录
          <template v-if="ids.length">
            ，已选择 {{ ids.length }} 条
          </template>
        </span>
      </div>

      <right-toolbar
        v-model:showSearch="showSearch"
        @queryTable="getList"
      />
    </div>

    <!-- 数据列表 -->
    <div class="record-table-wrapper">
      <el-table
        v-loading="loading"
        :data="recordList"
        row-key="id"
        stripe
        border
        class="record-table"
        :header-cell-style="tableHeaderStyle"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="52"
          align="center"
          fixed="left"
        />

        <el-table-column
          label="序号"
          width="70"
          align="center"
          fixed="left"
        >
          <template #default="scope">
            <span class="row-index">{{ getRowIndex(scope.$index) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          label="抓拍图片"
          width="132"
          align="center"
          fixed="left"
        >
          <template #default="scope">
            <el-image
              class="table-img"
              :src="scope.row.url"
              :preview-src-list="previewUrlList"
              :initial-index="getPreviewIndex(scope.row.url)"
              fit="cover"
              preview-teleported
              hide-on-click-modal
            >
              <template #placeholder>
                <div class="image-placeholder">
                  <el-icon class="is-loading"><Loading /></el-icon>
                </div>
              </template>
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>

        <el-table-column
          label="设备名称"
          min-width="180"
          align="left"
        >
          <template #default="scope">
            <div class="device-name-cell">
              <span
                class="device-status-dot"
                :class="getDeviceStatusClass(scope.row)"
              ></span>
              <div class="device-name-content">
                <span
                  class="device-name-text"
                  :title="getRecordDeviceName(scope.row)"
                >
                  {{ getRecordDeviceName(scope.row) }}
                </span>
                <span class="device-sn-text">
                  SN：{{ getRecordDeviceSn(scope.row) }}
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="抓拍来源"
          min-width="210"
          align="left"
        >
          <template #default="scope">
            <div class="source-cell">
              <div class="source-main-row">
                <el-tag
                  v-if="scope.row.taskId"
                  type="success"
                  effect="light"
                  size="small"
                >
                  自动任务
                </el-tag>
                <el-tag
                  v-else
                  type="warning"
                  effect="light"
                  size="small"
                >
                  手动抓拍
                </el-tag>

                <span
                  v-if="scope.row.taskId"
                  class="task-name"
                  :title="scope.row.taskName || '未命名任务'"
                >
                  {{ scope.row.taskName || "未命名任务" }}
                </span>
              </div>

              <div class="operator-row">
                <el-icon><User /></el-icon>
                <span>操作人：{{ scope.row.userName || "System" }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="文件大小"
          width="118"
          align="center"
        >
          <template #default="scope">
            <span class="file-size-text">
              {{ formatFileSize(scope.row.fileSize) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column
          label="拍摄时间"
          width="176"
          align="center"
          prop="captureTime"
          sortable
        >
          <template #default="scope">
            <div class="capture-time-cell">
              <span class="capture-date">
                {{ formatCaptureDate(scope.row.captureTime) }}
              </span>
              <span class="capture-clock">
                {{ formatCaptureClock(scope.row.captureTime) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="100"
          align="center"
          fixed="right"
          class-name="small-padding fixed-width"
        >
          <template #default="scope">
            <el-button
              link
              type="danger"
              icon="Delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['iot:record:remove']"
            >
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            description="暂无符合条件的抓拍记录"
            :image-size="100"
          />
        </template>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </div>
  </div>
</template>

<script setup name="Record">
import { computed, getCurrentInstance, onMounted, reactive, ref, toRefs } from "vue"
import { listRecord, delRecord } from "@/api/binZhou/ld/iot/record"
import { listDevice } from "@/api/binZhou/ld/iot/device"
import { parseTime } from "@/utils/ruoyi"
import { getUserProfile } from "@/api/system/user"

const { proxy } = getCurrentInstance()

const recordList = ref([])
const deviceOptions = ref([])
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const multiple = ref(true)
const total = ref(0)
const userInfo = ref({})
const queryRef = ref(null)

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceId: null,
    captureTime: null,
    userId: null
  }
})

const { queryParams } = toRefs(data)

const previewUrlList = computed(() => {
  return recordList.value
    .map(item => item.url)
    .filter(Boolean)
})

const tableHeaderStyle = {
  height: "48px",
  color: "#515a6e",
  fontWeight: "600",
  background: "#f8f8f9"
}

function getDeviceId(device) {
  return device?.deviceId ?? device?.id
}

function getDeviceList() {
  return listDevice({
    pageNum: 1,
    pageSize: 1000,
    productId: 4,
    creatorId: userInfo.value.admin === true
      ? null
      : userInfo.value.userId
  }).then(response => {
    deviceOptions.value = response.rows || response.data || []
  }).catch(error => {
    console.error("获取设备列表失败", error)
    deviceOptions.value = []
  })
}

function getList() {
  loading.value = true

  listRecord(queryParams.value).then(response => {
    recordList.value = response.rows || response.data || []
    total.value = Number(response.total || recordList.value.length)
  }).catch(error => {
    console.error("查询抓拍记录失败", error)
    recordList.value = []
    total.value = 0
  }).finally(() => {
    loading.value = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  queryParams.value.deviceId = null
  queryParams.value.captureTime = null
  queryParams.value.userId = userInfo.value.admin === true
    ? null
    : userInfo.value.userId
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  multiple.value = selection.length === 0
}

function handleDelete(row = {}) {
  const targetIds = row.id ? row.id : ids.value

  if (
    targetIds === undefined ||
    targetIds === null ||
    (Array.isArray(targetIds) && targetIds.length === 0)
  ) {
    proxy.$modal.msgWarning("请先选择需要删除的记录")
    return
  }

  const count = Array.isArray(targetIds) ? targetIds.length : 1
  const message = count > 1
    ? `确认删除选中的 ${count} 条抓拍记录吗？`
    : "确认删除该条抓拍记录吗？"

  proxy.$modal.confirm(message).then(() => {
    return delRecord(targetIds)
  }).then(() => {
    proxy.$modal.msgSuccess("删除成功")
    ids.value = []
    getList()
  }).catch(() => {})
}

function getRowIndex(index) {
  return (queryParams.value.pageNum - 1)
    * queryParams.value.pageSize
    + index
    + 1
}

function findDevice(row) {
  return deviceOptions.value.find(item => {
    return String(getDeviceId(item)) === String(row.deviceId)
  })
}

function getRecordDeviceName(row) {
  return row.deviceName
    || findDevice(row)?.deviceName
    || `设备 ${row.deviceId || "-"}`
}

function getRecordDeviceSn(row) {
  return row.deviceSn
    || findDevice(row)?.deviceSn
    || "-"
}

function getDeviceStatusClass(row) {
  const status = row.status ?? findDevice(row)?.status
  return String(status) === "1" ? "is-online" : "is-offline"
}

function getPreviewIndex(url) {
  const index = previewUrlList.value.indexOf(url)
  return index >= 0 ? index : 0
}

function formatFileSize(bytes) {
  const value = Number(bytes)

  if (!Number.isFinite(value) || value <= 0) return "0 B"

  const unit = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(unit)),
    sizes.length - 1
  )

  return `${Number((value / Math.pow(unit, index)).toFixed(2))} ${sizes[index]}`
}

function formatCaptureDate(value) {
  return value ? parseTime(value, "{y}-{m}-{d}") : "-"
}

function formatCaptureClock(value) {
  return value ? parseTime(value, "{h}:{i}:{s}") : "-"
}

onMounted(async () => {
  try {
    const response = await getUserProfile()

    if (response.code === 200) {
      userInfo.value = response.data || {}
      queryParams.value.userId = userInfo.value.admin === true
        ? null
        : userInfo.value.userId
    }

    await getDeviceList()
    getList()
  } catch (error) {
    console.error("初始化抓拍记录页面失败", error)
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.mb8 {
  margin-bottom: 8px;
}

/* 查询区域：复用设备列表的白底、浅边框风格 */
.record-query-form {
  padding: 14px 16px 4px;
  margin-bottom: 12px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.record-query-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.record-query-form :deep(.el-form-item__label) {
  color: #606266;
  font-weight: 500;
}

.query-control {
  width: 210px;
}

.device-select {
  width: 260px;
}

.query-action-item {
  margin-right: 0 !important;
}

.query-action-item :deep(.el-button) {
  min-width: 76px;
}

.device-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.device-option-name {
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-option-sn {
  flex: 0 0 auto;
  color: #909399;
  font-size: 12px;
}

/* 工具栏：与设备列表一致 */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 14px;
}

.selection-tip {
  overflow: hidden;
  color: #909399;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 表格区域 */
.record-table-wrapper {
  min-width: 0;
}

.record-table {
  width: 100%;
  border-radius: 6px;
}

.record-table :deep(.el-table__row) {
  height: 88px;
}

.record-table :deep(.el-table__cell) {
  padding: 8px 0;
}

.record-table :deep(.el-table__row:hover > td.el-table__cell) {
  background: #f5f9ff !important;
}

.record-table :deep(.el-table__fixed-right-patch) {
  background: #f8f8f9;
}

.row-index {
  color: #909399;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.table-img {
  width: 98px;
  height: 66px;
  overflow: hidden;
  cursor: zoom-in;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.table-img:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(31, 45, 61, 0.13);
}

.image-placeholder,
.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #c0c4cc;
  background: #f5f7fa;
}

.image-error .el-icon {
  font-size: 22px;
}

/* 设备名称排版：与设备列表一致 */
.device-name-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}

.device-status-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.device-status-dot.is-online {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.14);
}

.device-status-dot.is-offline {
  background: #c0c4cc;
  box-shadow: 0 0 0 3px rgba(192, 196, 204, 0.16);
}

.device-name-content {
  display: flex;
  justify-content: center;
  flex-direction: column;
  min-width: 0;
  gap: 5px;
}

.device-name-text {
  overflow: hidden;
  color: #303133;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-sn-text {
  overflow: hidden;
  color: #909399;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-id-text,
.file-size-text {
  color: #606266;
  font-family: Consolas, Monaco, monospace;
}

/* 来源信息 */
.source-cell {
  display: flex;
  justify-content: center;
  flex-direction: column;
  min-height: 58px;
}

.source-main-row {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.task-name {
  overflow: hidden;
  color: #303133;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-row {
  display: flex;
  align-items: center;
  margin-top: 8px;
  gap: 5px;
  color: #909399;
  font-size: 12px;
}

.operator-row .el-icon {
  font-size: 13px;
}

/* 拍摄时间 */
.capture-time-cell {
  display: flex;
  align-items: center;
  flex-direction: column;
  line-height: 1.5;
}

.capture-date {
  color: #606266;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.capture-clock {
  color: #909399;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
}

@media (max-width: 900px) {
  .record-query-form {
    display: grid;
    grid-template-columns: 1fr;
  }

  .record-query-form :deep(.el-form-item),
  .query-control,
  .device-select {
    width: 100%;
    margin-right: 0;
  }

  .table-toolbar,
  .toolbar-left {
    align-items: flex-start;
    flex-direction: column;
  }

  .selection-tip {
    white-space: normal;
  }
}
</style>
