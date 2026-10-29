<template>
  <div class="image-page">
    <!-- 顶部 Banner -->
    <!-- <div class="page-hero">
      <div class="hero-left">
        <el-tag effect="dark" class="hero-tag">智慧农业 · 图像资源管理</el-tag>
        <h2 class="hero-title">图片信息管理</h2>
        <p class="hero-desc">
          统一管理病虫害、虫情、物候期等 AI 识别图片资源，支持图片来源、识别类型、识别状态和采集位置维护。
        </p>
      </div>

      <div class="hero-stats">
        <div class="stat-card">
          <div class="stat-num">{{ total }}</div>
          <div class="stat-label">图片总数</div>
        </div>

        <div class="stat-card">
          <div class="stat-num">{{ pendingCount }}</div>
          <div class="stat-label">待识别</div>
        </div>

        <div class="stat-card">
          <div class="stat-num">{{ recognizedCount }}</div>
          <div class="stat-label">已识别</div>
        </div>

        <div class="stat-card">
          <div class="stat-num">{{ failedCount }}</div>
          <div class="stat-label">识别失败</div>
        </div>
      </div>
    </div> -->

    <!-- 查询区 -->
    <el-card class="query-card" shadow="hover">
      <!-- <template #header>
        <div class="card-header">
          <span class="card-title">筛选条件</span>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
        </div>
      </template> -->

      <el-form
        :model="queryParams"
        ref="queryRef"
        :inline="true"
        v-show="showSearch"
        label-width="90px"
        class="query-form"
      >
        <el-form-item label="图片名称" prop="imageName">
          <el-input
            v-model="queryParams.imageName"
            placeholder="请输入图片名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="识别类型" prop="imageAiType">
          <el-select
            v-model="queryParams.imageAiType"
            placeholder="请选择识别类型"
            clearable
            style="width: 170px"
          >
            <el-option label="病虫害" value="disease" />
            <el-option label="虫情" value="pest" />
            <el-option label="物候期" value="phenology" />
            <el-option label="未知" value="unknown" />
          </el-select>
        </el-form-item>

        <el-form-item label="图片来源" prop="imageSource">
          <el-select
            v-model="queryParams.imageSource"
            placeholder="请选择图片来源"
            clearable
            filterable
            allow-create
            style="width: 180px"
          >
            <el-option label="手动上传" value="手动上传" />
            <el-option label="摄像头" value="摄像头" />
            <el-option label="虫情设备" value="虫情设备" />
            <el-option label="无人机" value="无人机" />
            <el-option label="手机端" value="手机端" />
          </el-select>
        </el-form-item>

        <el-form-item label="识别状态" prop="imageStatus">
          <el-select
            v-model="queryParams.imageStatus"
            placeholder="请选择状态"
            clearable
            style="width: 160px"
          >
            <el-option label="待识别" :value="0" />
            <el-option label="识别中" :value="1" />
            <el-option label="识别成功" :value="2" />
            <el-option label="识别失败" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item label="设备序号" prop="deviceId">
          <el-input
            v-model="queryParams.deviceId"
            placeholder="设备序号"
            clearable
            style="width: 150px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <!-- <div>
            <span class="card-title">图片资源列表</span>
            <span class="table-subtitle">
              管理 AI 识别图片来源、业务类型、识别状态、原图地址、结果图和位置信息
            </span>
          </div> -->

          <div class="table-actions">
            <el-button
              type="primary"
              plain
              icon="Plus"
              @click="handleAdd"
              v-hasPermi="['xwq:image:add']"
            >
              新增
            </el-button>

            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['xwq:image:edit']"
            >
              修改
            </el-button>

            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['xwq:image:remove']"
            >
              删除
            </el-button>

            <el-button
              type="warning"
              plain
              icon="Download"
              @click="handleExport"
              v-hasPermi="['xwq:image:export']"
            >
              导出
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="imageList"
        border
        stripe
        class="agri-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column label="序号" width="80" align="center">
          <template #default="{ $index }">
            {{ (queryParams.pageNum - 1) * queryParams.pageSize + $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="图片" width="98" align="center">
          <template #default="{ row }">
            <el-image
              v-if="normalizeImageUrl(row.imageUrl)"
              :src="normalizeImageUrl(row.imageUrl)"
              :preview-src-list="[normalizeImageUrl(row.imageUrl)]"
              fit="cover"
              class="table-image"
              preview-teleported
            />
            <div v-else class="image-placeholder">无图</div>
          </template>
        </el-table-column>

        <!-- <el-table-column label="图片信息" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="image-main">
              <div class="image-icon">{{ getTypeShortName(row.imageAiType) }}</div>
              <div class="image-info">
                <div class="image-name" :title="row.imageName">
                  {{ row.imageName || '未命名图片' }}
                </div>
                <div class="image-meta">
                  {{ row.imageFormat || '-' }} ｜ {{ formatSize(row.imageSize) }} ｜ {{ getImageSizeText(row) }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column> -->

        <el-table-column label="识别类型" prop="imageAiType" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getAiTypeTag(row.imageAiType)" effect="plain">
              {{ getAiTypeName(row.imageAiType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="来源" prop="imageSource" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="info" effect="plain">
              {{ row.imageSource || '未知来源' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="识别状态" prop="imageStatus" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.imageStatus)" effect="plain">
              {{ getStatusName(row.imageStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="园区/地块序号" width="130" align="center">
          <template #default="{ row }">
            <div class="mini-text">园区序号：{{ row.parkId || '-' }}</div>
            <div class="mini-text">地块序号：{{ row.plotId || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="设备序号" prop="deviceId" width="120" align="center">
          <template #default="{ row }">
            {{ row.deviceId || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="采集位置" min-width="180" align="center">
          <template #default="{ row }">
            <div class="mini-text">经度：{{ row.longitude || '-' }}</div>
            <div class="mini-text">纬度：{{ row.latitude || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="图片地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="url-cell">
              <span class="url-text">{{ row.imageUrl || '未配置' }}</span>
              <el-button
                v-if="row.imageUrl"
                link
                type="primary"
                size="small"
                @click="copyText(row.imageUrl, '图片地址')"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="scope">
            <el-button link type="primary" icon="View" @click="handleView(scope.row)">
              查看
            </el-button>

            <el-button
              link
              type="primary"
              icon="Edit"
              @click="handleUpdate(scope.row)"
              v-hasPermi="['xwq:image:edit']"
            >
              修改
            </el-button>

            <el-button
              link
              type="danger"
              icon="Delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['xwq:image:remove']"
            >
              删除
            </el-button>
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
    </el-card>

    <!-- 添加或修改图片信息对话框 -->
    <el-dialog
      :title="title"
      v-model="open"
      width="860px"
      append-to-body
      destroy-on-close
      class="image-dialog"
    >
      <el-form ref="imageRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="图片名称" prop="imageName">
              <el-input v-model="form.imageName" placeholder="请输入图片名称" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="识别类型" prop="imageAiType">
              <el-select v-model="form.imageAiType" placeholder="请选择识别类型" style="width: 100%">
                <el-option label="病虫害" value="disease" />
                <el-option label="虫情" value="pest" />
                <el-option label="物候期" value="phenology" />
                <el-option label="未知" value="unknown" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="替换原图" prop="imageUrl">
              <image-upload v-model="form.imageUrl" :limit="1" :file-size="8" />
              <div class="upload-tip">上传后替换原图；不上传则保留当前原图。</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="替换结果图" prop="imageResultUrl">
              <image-upload v-model="form.imageResultUrl" :limit="1" :file-size="8" />
              <div class="upload-tip">上传后替换识别结果图；不上传则保留当前结果图。</div>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="图片地址" prop="imageUrl">
              <el-input
                v-model="form.imageUrl"
                type="textarea"
                :rows="2"
                placeholder="请输入图片存储地址，或通过上方上传新图片自动填充"
              />
            </el-form-item>
          </el-col>

                    <el-col :span="24">
            <el-form-item label="结果图地址" prop="imageResultUrl">
              <el-input
                v-model="form.imageResultUrl"
                type="textarea"
                :rows="2"
                placeholder="请输入模型识别后的打框图、标注图地址，或通过上方上传结果图自动填充"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="Mask地址" prop="imageMaskUrl">
              <el-input
                v-model="form.imageMaskUrl"
                type="textarea"
                :rows="2"
                placeholder="请输入分割 mask 图片地址"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="图片来源" prop="imageSource">
              <el-select
                v-model="form.imageSource"
                placeholder="请选择或输入图片来源"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option label="手动上传" value="手动上传" />
                <el-option label="摄像头" value="摄像头" />
                <el-option label="虫情设备" value="虫情设备" />
                <el-option label="无人机" value="无人机" />
                <el-option label="手机端" value="手机端" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="识别状态" prop="imageStatus">
              <el-select v-model="form.imageStatus" placeholder="请选择状态" style="width: 100%">
                <el-option label="待识别" :value="0" />
                <el-option label="识别中" :value="1" />
                <el-option label="识别成功" :value="2" />
                <el-option label="识别失败" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="来源序号" prop="imageSourceId">
              <el-input v-model="form.imageSourceId" placeholder="设备序号、任务序号等" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="设备序号" prop="deviceId">
              <el-input v-model="form.deviceId" placeholder="摄像头、虫情测报仪等设备序号" />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="图片宽度" prop="imageWidth">
              <el-input-number
                v-model="form.imageWidth"
                :min="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="图片高度" prop="imageHeight">
              <el-input-number
                v-model="form.imageHeight"
                :min="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="图片大小" prop="imageSize">
              <el-input-number
                v-model="form.imageSize"
                :min="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="图片格式" prop="imageFormat">
              <el-input v-model="form.imageFormat" placeholder="jpg / png / jpeg" />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="园区序号" prop="parkId">
              <el-input v-model="form.parkId" placeholder="请输入园区序号" />
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="地块序号" prop="plotId">
              <el-input v-model="form.plotId" placeholder="请输入地块序号" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="经度" prop="longitude">
              <el-input v-model="form.longitude" placeholder="请输入图片采集位置经度" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="纬度" prop="latitude">
              <el-input v-model="form.latitude" placeholder="请输入图片采集位置纬度" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="作物类型" prop="imageA">
              <el-input v-model="form.imageA" placeholder="如冬枣，可作为识别作物类型使用" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      title="图片详情"
      v-model="detailOpen"
      width="820px"
      append-to-body
      class="detail-dialog"
    >
      <div v-if="detailData" class="detail-content">
        <div class="detail-top">
          <el-image
            v-if="normalizeImageUrl(detailData.imageUrl)"
            :src="normalizeImageUrl(detailData.imageUrl)"
            :preview-src-list="[normalizeImageUrl(detailData.imageUrl)]"
            fit="cover"
            class="detail-image"
            preview-teleported
          />
          <div v-else class="detail-image-placeholder">无图</div>

          <div class="detail-summary">
            <h3>{{ detailData.imageName || '未命名图片' }}</h3>
            <p>图片ID：{{ detailData.imageId || '-' }}</p>
            <p>识别类型：{{ getAiTypeName(detailData.imageAiType) }}</p>
            <p>图片来源：{{ detailData.imageSource || '-' }}</p>
            <p>识别状态：{{ getStatusName(detailData.imageStatus) }}</p>
          </div>
        </div>

        <el-descriptions :column="1" border class="detail-desc">
          <el-descriptions-item label="图片地址">
            <div class="detail-url">
              <span>{{ detailData.imageUrl || '无' }}</span>
              <el-button
                v-if="detailData.imageUrl"
                link
                type="primary"
                @click="copyText(detailData.imageUrl, '图片地址')"
              >
                复制
              </el-button>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="结果图地址">
            <div class="detail-url">
              <span>{{ detailData.imageResultUrl || '无' }}</span>
              <el-button
                v-if="detailData.imageResultUrl"
                link
                type="primary"
                @click="copyText(detailData.imageResultUrl, '结果图地址')"
              >
                复制
              </el-button>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="Mask地址">
            <div class="detail-url">
              <span>{{ detailData.imageMaskUrl || '无' }}</span>
              <el-button
                v-if="detailData.imageMaskUrl"
                link
                type="primary"
                @click="copyText(detailData.imageMaskUrl, 'Mask地址')"
              >
                复制
              </el-button>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="图片尺寸">
            {{ getImageSizeText(detailData) }}
          </el-descriptions-item>

          <el-descriptions-item label="图片大小">
            {{ formatSize(detailData.imageSize) }}
          </el-descriptions-item>

          <el-descriptions-item label="设备/来源">
            来源序号：{{ detailData.imageSourceId || '-' }}；
            设备序号：{{ detailData.deviceId || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="园区/地块">
            园区序号：{{ detailData.parkId || '-' }}；
            地块序号：{{ detailData.plotId || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="采集位置">
            经度：{{ detailData.longitude || '-' }}；
            纬度：{{ detailData.latitude || '-' }}
          </el-descriptions-item>

          <el-descriptions-item label="作物类型">
            {{ detailData.imageA || '未设置' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup name="Image">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listImage, getImage, delImage, addImage, updateImage } from '@/api/binZhou/xwq/image'

const { proxy } = getCurrentInstance()

const imageList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const detailData = ref(null)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const pendingCount = computed(() => {
  return imageList.value.filter(item => Number(item.imageStatus) === 0).length
})

const recognizedCount = computed(() => {
  return imageList.value.filter(item => Number(item.imageStatus) === 2).length
})

const failedCount = computed(() => {
  return imageList.value.filter(item => Number(item.imageStatus) === 3).length
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    imageName: undefined,
    imageUrl: undefined,
    imageResultUrl: undefined,
    imageMaskUrl: undefined,
    imageAiType: undefined,
    imageSource: undefined,
    imageSourceId: undefined,
    imageWidth: undefined,
    imageHeight: undefined,
    imageSize: undefined,
    imageFormat: undefined,
    parkId: undefined,
    plotId: undefined,
    deviceId: undefined,
    longitude: undefined,
    latitude: undefined,
    imageStatus: undefined,
    imageA: undefined,
    imageB: undefined,
    imageC: undefined,
    imageD: undefined,
    imageE: undefined,
    imageF: undefined,
    imageG: undefined,
    imageH: undefined,
    imageI: undefined,
    imageJ: undefined
  },
  rules: {
    imageName: [
      { required: true, message: '图片名称不能为空', trigger: 'blur' }
    ],
    imageUrl: [
      { required: true, message: '图片地址不能为空', trigger: 'blur' }
    ],
    imageAiType: [
      { required: true, message: '识别业务类型不能为空', trigger: 'change' }
    ],
    imageSource: [
      { required: true, message: '图片来源不能为空', trigger: 'change' }
    ],
    imageStatus: [
      { required: true, message: '图片状态不能为空', trigger: 'change' }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询图片信息列表 */
function getList() {
  loading.value = true
  listImage(queryParams.value).then(response => {
    imageList.value = response.rows || []
    total.value = response.total || 0
    loading.value = false
  }).catch(() => {
    loading.value = false
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
    imageId: null,
    imageName: null,
    imageUrl: null,
    imageResultUrl: null,
    imageMaskUrl: null,
    imageAiType: 'unknown',
    imageSource: '手动上传',
    imageSourceId: null,
    imageWidth: null,
    imageHeight: null,
    imageSize: null,
    imageFormat: null,
    parkId: null,
    plotId: null,
    deviceId: null,
    longitude: null,
    latitude: null,
    imageStatus: 0,
    imageA: '小麦',
    imageB: null,
    imageC: null,
    imageD: null,
    imageE: null,
    imageF: null,
    imageG: null,
    imageH: null,
    imageI: null,
    imageJ: null
  }

  proxy.resetForm('imageRef')
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.imageId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = '新增图片信息'
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _imageId = row.imageId || ids.value

  getImage(_imageId).then(response => {
    form.value = response.data || {}
    open.value = true
    title.value = '修改图片信息'
  })
}

/** 查看详情 */
function handleView(row) {
  detailData.value = row
  detailOpen.value = true
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs.imageRef.validate(valid => {
    if (!valid) return

    if (form.value.imageId != null) {
      updateImage(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addImage(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _imageIds = row.imageId || ids.value

  proxy.$modal.confirm(`是否确认删除图片信息编号为 "${_imageIds}" 的数据项？`).then(() => {
    return delImage(_imageIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('xwq/image/export', {
    ...queryParams.value
  }, `image_${new Date().getTime()}.xlsx`)
}

/** 图片地址归一化 */
function normalizeImageUrl(url) {
  if (!url) return ''
  if (/^(http|https|data|blob):/.test(url)) return url

  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  if (url.startsWith('/')) return baseApi + url

  return `${baseApi}/${url}`
}

/** 文件大小格式化 */
function formatSize(size) {
  const num = Number(size || 0)
  if (!num) return '-'

  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  return `${(num / 1024 / 1024).toFixed(2)} MB`
}

/** 图片尺寸文本 */
function getImageSizeText(row) {
  if (!row || !row.imageWidth || !row.imageHeight) return '未知尺寸'
  return `${row.imageWidth} × ${row.imageHeight}`
}

/** 业务类型名称 */
function getAiTypeName(type) {
  if (type === 'disease') return '病虫害'
  if (type === 'pest') return '虫情'
  if (type === 'phenology') return '物候期'
  if (type === 'unknown') return '未知'
  if (!type) return '未设置'
  return type
}

/** 业务类型短名 */
function getTypeShortName(type) {
  if (type === 'disease') return '病'
  if (type === 'pest') return '虫'
  if (type === 'phenology') return '物'
  if (type === 'unknown') return '?'
  return '?'
}

/** 业务类型标签 */
function getAiTypeTag(type) {
  if (type === 'disease') return 'danger'
  if (type === 'pest') return 'warning'
  if (type === 'phenology') return 'success'
  return 'info'
}

/** 状态名称 */
function getStatusName(status) {
  const value = Number(status)

  if (value === 0) return '待识别'
  if (value === 1) return '识别中'
  if (value === 2) return '识别成功'
  if (value === 3) return '识别失败'

  return '未知状态'
}

/** 状态标签 */
function getStatusTag(status) {
  const value = Number(status)

  if (value === 0) return 'info'
  if (value === 1) return 'warning'
  if (value === 2) return 'success'
  if (value === 3) return 'danger'

  return 'info'
}

/** 复制文本 */
function copyText(text, label) {
  if (!text) return

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      proxy.$modal.msgSuccess(`${label}已复制`)
    })
  } else {
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    proxy.$modal.msgSuccess(`${label}已复制`)
  }
}

getList()
</script>

<style scoped>
.image-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部 Banner */
.page-hero {
  background: linear-gradient(135deg, #2f6f3e 0%, #52b052 58%, #9adf9a 100%);
  border-radius: 14px;
  padding: 26px 30px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.page-hero::after {
  content: "";
  position: absolute;
  right: -70px;
  top: -70px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
}

.hero-left {
  position: relative;
  z-index: 1;
}

.hero-tag {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  margin-bottom: 10px;
}

.hero-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
}

.hero-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.stat-card {
  min-width: 112px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  text-align: center;
  backdrop-filter: blur(4px);
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
}

.stat-label {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.85;
}

/* 卡片 */
.query-card,
.table-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}

.card-header,
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.table-subtitle {
  display: block;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.query-form {
  margin-bottom: -12px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 表格 */
.agri-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #2f6f3e;
}

.table-image {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.image-placeholder {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 12px;
}

.image-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.image-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f7e8, #d4f0d4);
  color: #2f6f3e;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.image-info {
  overflow: hidden;
}

.image-name {
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-meta {
  color: #909399;
  font-size: 12px;
  margin-top: 3px;
}

.mini-text {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}

.url-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.url-text {
  flex: 1;
  min-width: 0;
  color: #409eff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 弹窗 */
:deep(.image-dialog .el-dialog__header),
:deep(.detail-dialog .el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
  padding: 18px 22px;
}

:deep(.image-dialog .el-dialog__body) {
  padding: 22px 24px 6px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.upload-tip {
  width: 100%;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.component-upload-image .el-upload--picture-card),
:deep(.component-upload-image .el-upload-list--picture-card .el-upload-list__item) {
  width: 86px;
  height: 86px;
}

/* 详情 */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-top {
  display: flex;
  gap: 18px;
  align-items: stretch;
}

.detail-image,
.detail-image-placeholder {
  width: 210px;
  height: 150px;
  border-radius: 12px;
  border: 1px solid #ebeef5;
  flex-shrink: 0;
}

.detail-image-placeholder {
  background: #f5f7fa;
  color: #c0c4cc;
  display: flex;
  justify-content: center;
  align-items: center;
}

.detail-summary {
  flex: 1;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #ebeef5;
}

.detail-summary h3 {
  margin: 0 0 10px;
  color: #303133;
}

.detail-summary p {
  margin: 5px 0;
  color: #606266;
  font-size: 13px;
}

.detail-desc {
  margin-top: 4px;
}

.detail-url {
  display: flex;
  align-items: center;
  gap: 8px;
  word-break: break-all;
}

/* 响应式 */
@media screen and (max-width: 1200px) {
  .page-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .hero-stats {
    width: 100%;
  }

  .stat-card {
    flex: 1;
  }
}
</style>