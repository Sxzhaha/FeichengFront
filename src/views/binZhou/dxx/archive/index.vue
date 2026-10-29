<template>
  <div class="app-container geojson-archive-page">
    <el-form
      v-show="showSearch"
      ref="queryRef"
      :model="queryParams"
      :inline="true"
      label-width="80px"
    >
      <el-form-item label="所属区域" prop="datasetId">
        <el-select
          v-model="queryParams.datasetId"
          clearable
          filterable
          placeholder="请选择区域"
          style="width: 220px"
        >
          <el-option
            v-for="item in datasetList"
            :key="item.datasetId"
            :label="item.datasetName"
            :value="item.datasetId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="存档名称" prop="archiveName">
        <el-input
          v-model="queryParams.archiveName"
          clearable
          placeholder="请输入存档名称"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" clearable placeholder="请选择状态" style="width: 150px">
          <el-option label="正常" value="0" />
          <el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['dxx:archive:add']"
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
        >
          上传存档
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['dxx:archive:edit']"
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
        >
          修改
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['dxx:archive:remove']"
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
        >
          删除
        </el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="archiveList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="存档名称" min-width="180" prop="archiveName" show-overflow-tooltip />
      <el-table-column label="所属区域" min-width="160" show-overflow-tooltip>
        <template #default="scope">
          {{ datasetName(scope.row.datasetId) }}
        </template>
      </el-table-column>
      <el-table-column label="版本号" width="110" prop="versionNo" show-overflow-tooltip />
      <el-table-column label="原始文件名" min-width="180" prop="originalName" show-overflow-tooltip />
      <el-table-column label="文件大小" width="110" align="center">
        <template #default="scope">
          {{ formatFileSize(scope.row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column label="默认" width="80" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isDefault === '1'" type="success">是</el-tag>
          <el-tag v-else type="info">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.status === '0' ? 'success' : 'info'">
            {{ scope.row.status === '0' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170" align="center" prop="createTime" />
      <el-table-column label="操作" width="190" align="center" fixed="right">
        <template #default="scope">
          <el-button
            v-hasPermi="['dxx:archive:edit']"
            link
            type="primary"
            icon="Edit"
            @click="handleUpdate(scope.row)"
          >
            修改
          </el-button>
          <el-button
            v-hasPermi="['dxx:archive:remove']"
            link
            type="danger"
            icon="Delete"
            @click="handleDelete(scope.row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      :total="total"
      @pagination="getList"
    />

    <el-dialog :title="title" v-model="open" width="720px" append-to-body>
      <el-alert
        title="上传 GeoJSON 后，系统会自动解析文件大小、SHA256、几何类型和坐标范围，并同步写入数据库。"
        type="info"
        show-icon
        :closable="false"
        class="mb12 dxx-dialog-alert"
      />

      <el-form ref="archiveRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属区域" prop="datasetId">
              <el-select
                v-model="form.datasetId"
                filterable
                placeholder="请选择区域"
                style="width: 100%"
                @change="handleDatasetChange"
              >
                <el-option
                  v-for="item in datasetList"
                  :key="item.datasetId"
                  :label="item.datasetName"
                  :value="item.datasetId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="存档名称" prop="archiveName">
              <el-input v-model="form.archiveName" placeholder="请输入存档名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本号" prop="versionNo">
              <el-input v-model="form.versionNo" placeholder="例如：v1.0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否默认" prop="isDefault">
              <el-radio-group v-model="form.isDefault">
                <el-radio label="1">是</el-radio>
                <el-radio label="0">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio label="0">正常</el-radio>
                <el-radio label="1">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="层级识别">
              <el-radio-group v-model="form.levelMode">
                <el-radio label="auto">自动推断地块包裹层级</el-radio>
                <el-radio label="field">使用文件中的层级字段</el-radio>
              </el-radio-group>
              <el-input
                v-if="form.levelMode === 'field'"
                v-model="form.levelField"
                clearable
                placeholder="请输入字段名，例如 level / grade / type"
                style="width: 280px; margin-left: 12px"
              />
              <div class="level-tip">
                上传时会写入 properties.__level，地图按层级显示不同颜色边界。
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="GeoJSON文件" prop="filePath">
              <el-upload
                ref="uploadRef"
                class="geojson-uploader"
                drag
                :action="uploadUrl"
                :headers="uploadHeaders"
                :limit="1"
                accept=".geojson,.json,application/geo+json,application/json"
                :auto-upload="false"
                :on-change="handleUploadChange"
                :on-error="handleUploadError"
                :on-remove="handleUploadRemove"
                :file-list="uploadFileList"
              >
                <div class="upload-text">
                  将 GeoJSON 文件拖到这里，或点击选择文件
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    仅支持 .geojson / .json 文件；修改存档时，不重新上传则沿用原文件。
                  </div>
                </template>
              </el-upload>
              <div v-if="form.filePath" class="file-path">
                当前文件：{{ form.filePath }}
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24" v-if="previewGeojson">
            <el-form-item label="默认视图">
              <div class="geojson-preview-panel">
                <div class="preview-tools">
                  <span>拖动或缩放下方预览图，可设置地图默认打开位置</span>
                  <el-input-number
                    v-model="form.defaultZoom"
                    :min="1"
                    :max="19"
                    controls-position="right"
                    size="small"
                    @change="applyPreviewView"
                  />
                </div>
                <div ref="previewMapRef" class="geojson-preview-map">
                  <div class="preview-crosshair"></div>
                </div>
                <div class="preview-meta">
                  中心点：{{ formatCoord(form.defaultCenterLng) }}, {{ formatCoord(form.defaultCenterLat) }}
                  <el-button link type="primary" @click="fitPreviewLayer">定位到文件范围</el-button>
                </div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24" v-if="displayFieldOptions.length">
            <el-form-item label="展示字段">
              <div class="display-field-panel">
                <div class="display-field-tools">
                  <span>选择地图弹窗中需要展示的字段</span>
                  <div>
                    <el-button link type="primary" @click="selectAllDisplayFields">全选</el-button>
                    <el-button link type="primary" @click="clearDisplayFields">清空</el-button>
                  </div>
                </div>
                <el-checkbox-group v-model="form.displayFields" @change="refreshStyleJson">
                  <el-checkbox
                    v-for="item in displayFieldOptions"
                    :key="item"
                    :label="item"
                    border
                  >
                    {{ item }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24" v-if="form.originalName">
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="原始文件">
                {{ form.originalName }}
              </el-descriptions-item>
              <el-descriptions-item label="文件大小">
                {{ formatFileSize(form.fileSize) }}
              </el-descriptions-item>
              <el-descriptions-item label="几何类型">
                {{ form.geometryType || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="坐标系">
                {{ form.coordinateSys || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="坐标范围">
                {{ bboxText(form) }}
              </el-descriptions-item>
              <el-descriptions-item label="层级结果">
                {{ form.levelSummary || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitLoading" @click="submitForm">确定</el-button>
          <el-button @click="cancel">取消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Archive">
import { computed, getCurrentInstance, h, nextTick, onBeforeUnmount, reactive, ref, toRefs } from 'vue'
import { ElMessageBox } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getToken } from '@/utils/auth'
import request from '@/utils/request'
import { addArchive, delArchive, getArchive, listArchive, updateArchive } from '@/api/binZhou/dxx/archive'
import { listDataset } from '@/api/binZhou/dxx/dataset'

const { proxy } = getCurrentInstance()

const archiveList = ref([])
const datasetList = ref([])
const uploadFileList = ref([])
const previewMapRef = ref()
const previewGeojson = ref(null)
const pendingUploadFile = ref(null)
const displayFieldOptions = ref([])
const open = ref(false)
const loading = ref(true)
const submitLoading = ref(false)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
let previewMapInstance
let previewGeojsonLayer

const uploadUrl = computed(() => `${import.meta.env.VITE_APP_BASE_API}/common/upload`)
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${getToken()}` }))
const levelColors = {
  1: '#e67a7a',
  2: '#ffebb7',
  3: '#fff4e1',
  4: '#9ddcdc',
  5: '#e67a7a',
  6: '#ffebb7',
  default: '#9ddcdc'
}

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    datasetId: undefined,
    archiveName: undefined,
    status: undefined
  },
  rules: {
    datasetId: [{ required: true, message: '请选择所属区域', trigger: 'change' }],
    archiveName: [{ required: true, message: '请输入存档名称', trigger: 'blur' }],
    filePath: [{ required: true, message: '请上传 GeoJSON 文件', trigger: 'change' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listArchive(queryParams.value).then(response => {
    archiveList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function getDatasetList() {
  listDataset({
    pageNum: 1,
    pageSize: 1000,
    status: '0'
  }).then(response => {
    datasetList.value = response.rows || []
  })
}

function datasetName(datasetId) {
  const dataset = datasetList.value.find(item => String(item.datasetId) === String(datasetId))
  return dataset?.datasetName || datasetId || '-'
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    archiveId: null,
    datasetId: null,
    archiveName: null,
    versionNo: null,
    originalName: null,
    filePath: null,
    fileSize: null,
    fileHash: null,
    featureCount: null,
    geometryType: null,
    coordinateSys: 'CRS84',
    minLng: null,
    minLat: null,
    maxLng: null,
    maxLat: null,
    previewColor: '#e67a7a',
    fillColor: '#16a34a',
    fillOpacity: 0.18,
    styleJson: JSON.stringify({
      color: '#e67a7a',
      weight: 3,
      fillColor: 'transparent',
      fillOpacity: 0,
      levelField: '__level',
      levelColors
    }),
    levelMode: 'auto',
    levelField: 'level',
    levelSummary: null,
    defaultCenterLng: null,
    defaultCenterLat: null,
    defaultZoom: 12,
    displayFields: [],
    isDefault: '1',
    status: '0',
    remark: null,
    delFlag: '0'
  }
  uploadFileList.value = []
  pendingUploadFile.value = null
  previewGeojson.value = null
  displayFieldOptions.value = []
  destroyPreviewMap()
  proxy.resetForm('archiveRef')
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
  ids.value = selection.map(item => item.archiveId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  form.value.isDefault = '1'
  const firstDataset = datasetList.value[0]
  if (firstDataset?.datasetId) {
    form.value.datasetId = firstDataset.datasetId
    form.value.versionNo = getNextVersionNo(firstDataset.datasetId)
  } else {
    form.value.versionNo = 'v1.0'
  }
  open.value = true
  title.value = '上传 GeoJSON 存档'
}

function handleUpdate(row) {
  reset()
  const archiveId = row.archiveId || ids.value
  getArchive(archiveId).then(response => {
    form.value = {
      ...resetKeepDefaults(),
      ...response.data
    }
    uploadFileList.value = form.value.filePath
      ? [{ name: form.value.originalName || '已上传文件', url: form.value.filePath }]
      : []
    open.value = true
    title.value = '修改 GeoJSON 存档'
  })
}

function resetKeepDefaults() {
  return {
    previewColor: '#e67a7a',
    fillColor: '#16a34a',
    fillOpacity: 0.18,
    isDefault: '0',
    status: '0',
    delFlag: '0',
    coordinateSys: 'CRS84',
    levelMode: 'auto',
    levelField: 'level',
    levelSummary: null,
    defaultCenterLng: null,
    defaultCenterLat: null,
    defaultZoom: 12,
    displayFields: []
  }
}

function handleDatasetChange(datasetId) {
  if (form.value.archiveId != null) return
  form.value.versionNo = getNextVersionNo(datasetId)
}

function getNextVersionNo(datasetId) {
  const versions = archiveList.value
    .filter(item => String(item.datasetId) === String(datasetId))
    .map(item => parseVersionNo(item.versionNo))
    .filter(version => version !== null)

  if (!versions.length) return 'v1.0'

  const maxMajor = Math.max(...versions.map(version => version.major))
  return `v${maxMajor + 1}.0`
}

function parseVersionNo(versionNo) {
  const match = String(versionNo || '').trim().match(/^v?(\d+)(?:\.(\d+))?$/i)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2] || 0)
  }
}

async function handleUploadChange(uploadFile, uploadFiles) {
  const file = uploadFile.raw
  uploadFileList.value = uploadFiles.slice(-1)
  if (!file) return false

  const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase()
  if (!['geojson', 'json'].includes(ext)) {
    proxy.$modal.msgError('只能上传 .geojson 或 .json 文件')
    uploadFileList.value = []
    return false
  }

  try {
    const text = await file.text()
    const geojson = JSON.parse(text)
    const levelResult = enhanceGeojsonLevels(geojson, form.value.levelMode, form.value.levelField)
    previewGeojson.value = levelResult.geojson
    pendingUploadFile.value = file

    ensureDefaultViewFromBounds(levelResult.geojson)
    initDisplayFields(levelResult.geojson)

    const previewFile = buildGeojsonUploadFile(file)
    const metadata = await parseGeojsonMetadata(previewGeojson.value, previewFile)
    Object.assign(form.value, metadata)
    form.value.filePath = `待上传：${file.name}`
    form.value.levelSummary = levelResult.summary
    refreshStyleJson()

    if (!form.value.archiveName) {
      form.value.archiveName = file.name.replace(/\.(geojson|json)$/i, '')
    }

    proxy.$refs.archiveRef?.validateField('filePath')
    await nextTick()
    initPreviewMap()
    return false
  } catch (error) {
    proxy.$modal.msgError(error.message || 'GeoJSON 文件解析失败')
    uploadFileList.value = []
    pendingUploadFile.value = null
    previewGeojson.value = null
    return false
  }
}

function refreshStyleJson() {
  form.value.styleJson = JSON.stringify({
    color: '#e67a7a',
    weight: 3,
    fillColor: 'transparent',
    fillOpacity: 0,
    levelMode: form.value.levelMode || 'auto',
    levelField: '__level',
    sourceLevelField: form.value.levelMode === 'field' ? form.value.levelField : null,
    levelColors,
    displayFields: form.value.displayFields || [],
    defaultView: {
      center: [Number(form.value.defaultCenterLng), Number(form.value.defaultCenterLat)],
      zoom: Number(form.value.defaultZoom || 12)
    }
  })
}

function buildGeojsonUploadFile(sourceFile) {
  const geojson = buildGeojsonWithDefaultView()
  const text = JSON.stringify(geojson)
  return new File([text], sourceFile.name, {
    type: sourceFile.type || 'application/geo+json',
    lastModified: sourceFile.lastModified
  })
}

function buildGeojsonWithDefaultView() {
  const geojson = JSON.parse(JSON.stringify(previewGeojson.value))
  const centerLng = roundCoord(Number(form.value.defaultCenterLng))
  const centerLat = roundCoord(Number(form.value.defaultCenterLat))
  const zoom = Number(form.value.defaultZoom || 12)

  geojson.properties = {
    ...(geojson.properties || {}),
    default_center_lng: centerLng,
    default_center_lat: centerLat,
    default_zoom: zoom,
    display_fields: form.value.displayFields || []
  }
  geojson.dxxDefaultView = {
    center: [centerLng, centerLat],
    zoom
  }
  geojson.dxxDisplayFields = form.value.displayFields || []

  return geojson
}

async function uploadPendingGeojsonIfNeeded() {
  if (!pendingUploadFile.value || !previewGeojson.value) return

  refreshStyleJson()
  const uploadFile = buildGeojsonUploadFile(pendingUploadFile.value)
  const metadata = await parseGeojsonMetadata(buildGeojsonWithDefaultView(), uploadFile)
  Object.assign(form.value, metadata)

  const uploadData = new FormData()
  uploadData.append('file', uploadFile)
  const response = await request({
    url: '/common/upload',
    method: 'post',
    data: uploadData,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'multipart/form-data'
    }
  })
  if (response.code !== 200) {
    throw new Error(response.msg || '文件上传失败')
  }
  handleUploadSuccess(response)
  pendingUploadFile.value = null
}

function handleUploadSuccess(response) {
  if (response.code !== 200) {
    proxy.$modal.msgError(response.msg || '文件上传失败')
    return
  }

  form.value.filePath = response.fileName
  form.value.originalName = form.value.originalName || response.originalFilename
  uploadFileList.value = [{
    name: response.originalFilename || form.value.originalName,
    url: response.fileName
  }]
  proxy.$refs.archiveRef?.validateField('filePath')
  proxy.$modal.msgSuccess('文件上传成功')
}

function handleUploadError() {
  proxy.$modal.msgError('文件上传失败，请检查后端服务或上传目录配置')
}

function initPreviewMap() {
  if (!previewMapRef.value || !previewGeojson.value) return

  if (!previewMapInstance) {
    previewMapInstance = L.map(previewMapRef.value, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true
    })
    previewMapInstance.on('moveend zoomend', syncPreviewView)
  }

  if (previewGeojsonLayer) {
    previewMapInstance.removeLayer(previewGeojsonLayer)
  }

  previewGeojsonLayer = L.geoJSON(previewGeojson.value, {
    style: {
      color: '#e67a7a',
      weight: 3,
      fillColor: 'transparent',
      fillOpacity: 0
    }
  }).addTo(previewMapInstance)

  fitPreviewLayer()
  window.setTimeout(() => {
    previewMapInstance?.invalidateSize()
    fitPreviewLayer()
  }, 120)
}

function fitPreviewLayer() {
  if (!previewMapInstance || !previewGeojsonLayer) return
  const bounds = previewGeojsonLayer.getBounds()
  if (bounds.isValid()) {
    previewMapInstance.fitBounds(bounds, { padding: [12, 12], maxZoom: 18 })
    syncPreviewView()
  }
}

function applyPreviewView() {
  if (!previewMapInstance) return
  const lng = Number(form.value.defaultCenterLng)
  const lat = Number(form.value.defaultCenterLat)
  const zoom = Number(form.value.defaultZoom || 12)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
  previewMapInstance.setView([lat, lng], zoom)
  refreshStyleJson()
}

function syncPreviewView() {
  if (!previewMapInstance) return
  const center = previewMapInstance.getCenter()
  form.value.defaultCenterLng = roundCoord(center.lng)
  form.value.defaultCenterLat = roundCoord(center.lat)
  form.value.defaultZoom = previewMapInstance.getZoom()
  refreshStyleJson()
}

function ensureDefaultViewFromBounds(geojson) {
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity
  }
  ;(geojson.features || []).forEach(feature => collectBounds(feature?.geometry?.coordinates, bounds))
  if ([bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].some(value => !Number.isFinite(value))) {
    form.value.defaultCenterLng = null
    form.value.defaultCenterLat = null
    form.value.defaultZoom = 12
    return
  }
  form.value.defaultCenterLng = roundCoord((bounds.minLng + bounds.maxLng) / 2)
  form.value.defaultCenterLat = roundCoord((bounds.minLat + bounds.maxLat) / 2)
  form.value.defaultZoom = 12
}

function destroyPreviewMap() {
  if (previewGeojsonLayer && previewMapInstance) {
    previewMapInstance.removeLayer(previewGeojsonLayer)
  }
  previewGeojsonLayer = undefined
  if (previewMapInstance) {
    previewMapInstance.remove()
  }
  previewMapInstance = undefined
}

function handleUploadRemove() {
  form.value.filePath = null
  form.value.originalName = null
  form.value.fileSize = null
  form.value.fileHash = null
  form.value.featureCount = null
  form.value.geometryType = null
  form.value.minLng = null
  form.value.minLat = null
  form.value.maxLng = null
  form.value.maxLat = null
  form.value.levelSummary = null
  form.value.defaultCenterLng = null
  form.value.defaultCenterLat = null
  form.value.defaultZoom = 12
  form.value.displayFields = []
  displayFieldOptions.value = []
  pendingUploadFile.value = null
  previewGeojson.value = null
  destroyPreviewMap()
}

function initDisplayFields(geojson) {
  const fields = extractDisplayFields(geojson)
  displayFieldOptions.value = fields
  form.value.displayFields = fields.filter(field => !isDefaultHiddenDisplayField(field))
  if (!form.value.displayFields.length) {
    form.value.displayFields = [...fields]
  }
}

function extractDisplayFields(geojson) {
  const fieldSet = new Set()
  ;(geojson.features || []).forEach(feature => {
    const properties = feature.properties || {}
    Object.keys(properties).forEach(key => {
      if (!key || key.startsWith('__')) return
      if (isCommentChunkField(key)) return
      fieldSet.add(key)
    })
  })
  return [...fieldSet].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function isDefaultHiddenDisplayField(field) {
  return [
    '线颜色',
    '线宽',
    '线透明度',
    '线类型',
    '符号类型',
    '文字类型',
    '填充透明度',
    '填充颜色',
    '标记'
  ].includes(field)
}

function isCommentChunkField(key) {
  return ['O_Comment1', 'O_Comment2', 'O_Comment3', 'O_Comment4', 'O_Comment5', '备注1', '备注2', '备注3', '备注4', '备注5'].includes(key)
}

function normalizeGeojsonFieldNames(geojson) {
  ;(geojson.features || []).forEach(feature => {
    const properties = feature.properties || {}

    parseOvitCommentRows(properties).forEach(row => {
      const targetKey = displayFieldLabel(row.label)
      if (targetKey && properties[targetKey] === undefined) {
        properties[targetKey] = row.value
      }
    })

    Object.entries({ ...properties }).forEach(([key, value]) => {
      const targetKey = displayFieldLabel(key)
      if (!targetKey || targetKey === key) return
      if (properties[targetKey] === undefined) {
        properties[targetKey] = value
      }
      delete properties[key]
    })

    feature.properties = properties
  })
}

function displayFieldLabel(key) {
  const labelMap = {
    O_Name: '名称',
    O_Comment: '备注',
    O_LClr: '线颜色',
    O_LWidth: '线宽',
    O_LAlpha: '线透明度',
    O_LType: '线类型',
    O_SType: '符号类型',
    O_TType: '文字类型',
    O_AAlpha: '填充透明度',
    O_AClr: '填充颜色',
    O_Flag: '标记',
    name: '名称',
    Name: '名称',
    NAME: '名称',
    comment: '备注',
    remark: '备注',
    description: '说明',
    area: '面积',
    city: '市',
    county: '县/区',
    town: '乡镇',
    village: '村',
    crop_type: '作物类型',
    variety: '品种',
    FID: '要素编号',
    BSM: '标识码',
    YSDM: '要素代码',
    ZLDWDM: '坐落单位代码',
    ZLDWMC: '坐落单位名称',
    DCMJ: '调查面积',
    JSMJ: '计算面积',
    MSSM: '描述说明码',
    HDMC: '名称',
    BZ: '备注',
    SHAPE_Leng: '图形长度',
    SHAPE_Area: '图形面积'
  }
  return labelMap[key] || key
}

function parseOvitCommentRows(properties) {
  const html = ['O_Comment', 'O_Comment1', 'O_Comment2', 'O_Comment3', 'O_Comment4', 'O_Comment5', '备注', '备注1', '备注2', '备注3', '备注4', '备注5']
    .map(key => properties[key] || '')
    .join('')

  if (!html.includes('<td')) return []

  const rows = []
  const rowPattern = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gis
  let match
  while ((match = rowPattern.exec(html)) !== null) {
    const label = stripHtml(match[1]).trim()
    const value = stripHtml(match[2]).trim()
    if (!label || !value) continue
    if (/^\d{10,}$/.test(label)) continue
    if (['Shape'].includes(label)) continue
    rows.push({ label, value })
  }
  return rows
}

function parseOvitCommentFields(properties) {
  const html = ['O_Comment', 'O_Comment1', 'O_Comment2', 'O_Comment3', 'O_Comment4', 'O_Comment5', '备注', '备注1', '备注2', '备注3', '备注4', '备注5']
    .map(key => properties[key] || '')
    .join('')

  if (!html.includes('<td')) return []

  const fields = []
  const rowPattern = /<tr[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/gis
  let match
  while ((match = rowPattern.exec(html)) !== null) {
    const rawLabel = stripHtml(match[1]).trim()
    const value = stripHtml(match[2]).trim()
    if (!rawLabel || !value) continue
    if (/^\d{10,}$/.test(rawLabel)) continue
    if (['Shape'].includes(rawLabel)) continue
    fields.push(displayFieldLabel(rawLabel))
  }
  return fields
}

function stripHtml(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function selectAllDisplayFields() {
  form.value.displayFields = [...displayFieldOptions.value]
  refreshStyleJson()
}

function clearDisplayFields() {
  form.value.displayFields = []
  refreshStyleJson()
}

async function parseGeojsonMetadata(geojson, file) {
  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('请上传标准 GeoJSON FeatureCollection 文件')
  }

  const geometryTypes = new Set()
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity
  }

  geojson.features.forEach(feature => {
    if (!feature.geometry) return
    geometryTypes.add(feature.geometry.type)
    collectBounds(feature.geometry.coordinates, bounds)
  })

  const validBounds = Number.isFinite(bounds.minLng)
    && Number.isFinite(bounds.minLat)
    && Number.isFinite(bounds.maxLng)
    && Number.isFinite(bounds.maxLat)

  return {
    originalName: file.name,
    fileSize: file.size,
    fileHash: await sha256(file),
    featureCount: geojson.features.length,
    geometryType: Array.from(geometryTypes).join(','),
    coordinateSys: readCrsName(geojson),
    minLng: validBounds ? roundCoord(bounds.minLng) : null,
    minLat: validBounds ? roundCoord(bounds.minLat) : null,
    maxLng: validBounds ? roundCoord(bounds.maxLng) : null,
    maxLat: validBounds ? roundCoord(bounds.maxLat) : null
  }
}

function collectBounds(coords, bounds) {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    bounds.minLng = Math.min(bounds.minLng, coords[0])
    bounds.minLat = Math.min(bounds.minLat, coords[1])
    bounds.maxLng = Math.max(bounds.maxLng, coords[0])
    bounds.maxLat = Math.max(bounds.maxLat, coords[1])
    return
  }
  coords.forEach(item => collectBounds(item, bounds))
}

function readCrsName(geojson) {
  return geojson.crs?.properties?.name || 'CRS84'
}

async function sha256(file) {
  if (!window.crypto?.subtle) return null
  const buffer = await file.arrayBuffer()
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function roundCoord(value) {
  return Number(value.toFixed(8))
}

function formatCoord(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(6) : '-'
}

function enhanceGeojsonLevels(geojson, levelMode = 'auto', levelField = 'level') {
  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('请上传标准 GeoJSON FeatureCollection 文件')
  }

  const clonedGeojson = JSON.parse(JSON.stringify(geojson))
  const features = clonedGeojson.features || []

  if (levelMode === 'field') {
    const field = String(levelField || '').trim()
    if (!field) {
      throw new Error('请选择“使用文件中的层级字段”时，需要填写字段名')
    }

    const matchedCount = features.reduce((count, feature) => {
      const properties = feature.properties || {}
      const fieldValue = properties[field]
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') return count
      feature.properties = {
        ...properties,
        __level: fieldValue,
        __levelName: `层级 ${fieldValue}`
      }
      return count + 1
    }, 0)

    if (!matchedCount) {
      throw new Error(`文件属性中没有找到层级字段：${field}`)
    }

    features.forEach(feature => {
      feature.properties = feature.properties || {}
      if (feature.properties.__level === undefined) {
        feature.properties.__level = 1
        feature.properties.__levelName = '层级 1'
      }
    })

    return {
      geojson: clonedGeojson,
      summary: `使用字段 ${field}，识别成功`
    }
  }

  const polygonInfos = features.map((feature, index) => {
    const rings = getFeatureOuterRings(feature)
    const bounds = getFeatureBounds(feature)
    const area = rings.reduce((sum, ring) => sum + ringArea(ring), 0)
    return { feature, index, rings, bounds, area }
  })

  const levelCounts = {}
  polygonInfos.forEach(child => {
    let parentCount = 0
    if (child.rings.length && child.bounds) {
      polygonInfos.forEach(parent => {
        if (parent.index === child.index || !parent.rings.length || !parent.bounds) return
        if (parent.area <= child.area) return
        if (!boundsContains(parent.bounds, child.bounds)) return
        if (featureContains(parent, child)) parentCount += 1
      })
    }

    const level = parentCount + 1
    child.feature.properties = {
      ...(child.feature.properties || {}),
      __level: level,
      __levelName: `第 ${level} 层`
    }
    levelCounts[level] = (levelCounts[level] || 0) + 1
  })

  const summary = Object.keys(levelCounts)
    .sort((a, b) => Number(a) - Number(b))
    .map(level => `${level}层${levelCounts[level]}个`)
    .join('，')

  return {
    geojson: clonedGeojson,
    summary: summary || '未识别到可分析的面要素，默认按第 1 层展示'
  }
}

function getFeatureOuterRings(feature) {
  const geometry = feature?.geometry
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates?.[0]].filter(Boolean)
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map(polygon => polygon?.[0])
      .filter(Boolean)
  }
  return []
}

function getFeatureBounds(feature) {
  const bounds = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity }
  collectBounds(feature?.geometry?.coordinates, bounds)
  if ([bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat].some(value => !Number.isFinite(value))) {
    return null
  }
  return bounds
}

function boundsContains(parent, child) {
  return parent.minLng <= child.minLng
    && parent.minLat <= child.minLat
    && parent.maxLng >= child.maxLng
    && parent.maxLat >= child.maxLat
}

function featureContains(parent, child) {
  const samplePoints = child.rings.flatMap(sampleRingPoints)
  if (!samplePoints.length) return false
  return samplePoints.every(point => parent.rings.some(ring => pointInRing(point, ring)))
}

function sampleRingPoints(ring) {
  const points = ring.filter(point => Array.isArray(point) && point.length >= 2)
  if (points.length <= 12) return points
  const step = Math.max(1, Math.floor(points.length / 12))
  return points.filter((_, index) => index % step === 0).slice(0, 12)
}

function pointInRing(point, ring) {
  const x = point[0]
  const y = point[1]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / ((yj - yi) || Number.EPSILON) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function ringArea(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1])
  }
  return Math.abs(area / 2)
}

function buildSubmitData() {
  const {
    levelMode,
    levelField,
    levelSummary,
    defaultCenterLng,
    defaultCenterLat,
    defaultZoom,
    displayFields,
    ...submitData
  } = form.value
  return submitData
}

function submitForm() {
  proxy.$refs.archiveRef.validate(async valid => {
    if (!valid) return

    submitLoading.value = true
    try {
      await uploadPendingGeojsonIfNeeded()
      const submitData = buildSubmitData()
      const request = form.value.archiveId != null
        ? updateArchive(submitData)
        : addArchive(submitData)
      await request
      proxy.$modal.msgSuccess(form.value.archiveId != null ? '修改成功' : '新增成功')
      open.value = false
      getList()
    } catch (error) {
      proxy.$modal.msgError(error.message || '提交失败')
    } finally {
      submitLoading.value = false
    }
  })
}

function handleDelete(row) {
  const archiveIds = row.archiveId || ids.value
  const deleteSourceFile = ref(false)

  ElMessageBox.confirm(
    h('div', { class: 'delete-confirm-content' }, [
      h('p', `是否确认删除存档编号为 "${archiveIds}" 的数据项？`),
      h('label', { class: 'delete-source-checkbox' }, [
        h('input', {
          type: 'checkbox',
          onChange: event => {
            deleteSourceFile.value = event.target.checked
          }
        }),
        h('span', '同时删除磁盘源文件')
      ]),
      h('p', { class: 'delete-confirm-tip' }, '提示：如果源文件仍被其它存档引用，后端会自动跳过物理删除。')
    ]),
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    return delArchive(archiveIds, deleteSourceFile.value)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess(deleteSourceFile.value ? '删除成功，已尝试同步删除源文件' : '删除成功')
  }).catch(() => {})
}

function formatFileSize(size) {
  const value = Number(size)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

function bboxText(row) {
  if ([row.minLng, row.minLat, row.maxLng, row.maxLat].some(item => item === null || item === undefined)) {
    return '-'
  }
  return `${row.minLng}, ${row.minLat} ~ ${row.maxLng}, ${row.maxLat}`
}

getDatasetList()
getList()

onBeforeUnmount(() => {
  destroyPreviewMap()
})
</script>

<style scoped lang="scss">
.geojson-archive-page {
  .mb12 {
    margin-bottom: 12px;
  }

  .geojson-uploader {
    width: 100%;

    :deep(.el-upload) {
      width: 100%;
    }

    :deep(.el-upload-dragger) {
      width: 100%;
      padding: 28px 12px;
    }
  }

  .upload-text {
    color: #606266;
    font-size: 14px;
  }

  .level-tip {
    margin-top: 6px;
    color: #909399;
    font-size: 12px;
    line-height: 1.5;
  }

  .file-path {
    margin-top: 8px;
    color: #606266;
    font-size: 12px;
    word-break: break-all;
  }

  .geojson-preview-panel {
    width: 100%;
  }

  .preview-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: #606266;
    font-size: 13px;
  }

  .geojson-preview-map {
    position: relative;
    width: 100%;
    height: 260px;
    overflow: hidden;
    border: 1px solid #dcdfe6;
    border-radius: 6px;
    background: #f3f6fa;
  }

  .preview-crosshair {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 500;
    width: 18px;
    height: 18px;
    pointer-events: none;
    transform: translate(-50%, -50%);

    &::before,
    &::after {
      position: absolute;
      background: #f56c6c;
      content: '';
    }

    &::before {
      top: 8px;
      left: 0;
      width: 18px;
      height: 2px;
    }

    &::after {
      top: 0;
      left: 8px;
      width: 2px;
      height: 18px;
    }
  }

  .preview-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
    color: #909399;
    font-size: 12px;
  }

  .display-field-panel {
    width: 100%;
  }

  .display-field-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: #606266;
    font-size: 13px;
  }

  .display-field-panel :deep(.el-checkbox-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .display-field-panel :deep(.el-checkbox.is-bordered) {
    margin-right: 0;
  }
}

:global(.geojson-preview-panel) {
  width: 100%;
}

:global(.preview-tools) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
}

:global(.geojson-preview-map) {
  position: relative;
  width: 100%;
  height: 260px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f3f6fa;
}

:global(.preview-crosshair) {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 500;
  width: 18px;
  height: 18px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

:global(.preview-crosshair::before),
:global(.preview-crosshair::after) {
  position: absolute;
  background: #f56c6c;
  content: '';
}

:global(.preview-crosshair::before) {
  top: 8px;
  left: 0;
  width: 18px;
  height: 2px;
}

:global(.preview-crosshair::after) {
  top: 0;
  left: 8px;
  width: 2px;
  height: 18px;
}

:global(.preview-meta) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

:global(.display-field-panel) {
  width: 100%;
}

:global(.display-field-tools) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
}

:global(.display-field-panel .el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:global(.display-field-panel .el-checkbox.is-bordered) {
  margin-right: 0;
}

:global(.dxx-dialog-alert) {
  margin-bottom: 20px !important;
}

:deep(.delete-confirm-content) {
  line-height: 1.8;

  p {
    margin: 0 0 6px;
  }

  .delete-confirm-tip {
    margin-top: 6px;
    color: #909399;
    font-size: 12px;
  }

  .delete-source-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;

    input {
      cursor: pointer;
    }
  }
}
</style>
