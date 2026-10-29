<template>
  <div class="app-container dataset-page">
    <el-form
      v-show="showSearch"
      ref="queryRef"
      :model="queryParams"
      :inline="true"
      label-width="80px"
    >
      <el-form-item label="区域名称" prop="datasetName">
        <el-input
          v-model="queryParams.datasetName"
          clearable
          placeholder="请输入区域名称"
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
          v-hasPermi="['dxx:dataset:add']"
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
        >
          新增区域
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['dxx:dataset:edit']"
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
          v-hasPermi="['dxx:dataset:remove']"
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
        >
          删除
        </el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          v-hasPermi="['dxx:dataset:export']"
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
        >
          导出
        </el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="datasetList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="区域名称" min-width="180" prop="datasetName" show-overflow-tooltip />
      <el-table-column label="区域说明" min-width="240" prop="description" show-overflow-tooltip />
      <el-table-column label="排序" width="90" align="center" prop="sortNum" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.status === '0' ? 'success' : 'info'">
            {{ scope.row.status === '0' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="180" prop="remark" show-overflow-tooltip />
      <el-table-column label="创建时间" width="170" align="center" prop="createTime" />
      <el-table-column label="操作" width="190" align="center" fixed="right">
        <template #default="scope">
          <el-button
            v-hasPermi="['dxx:dataset:edit']"
            link
            type="primary"
            icon="Edit"
            @click="handleUpdate(scope.row)"
          >
            修改
          </el-button>
          <el-button
            v-hasPermi="['dxx:dataset:remove']"
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

    <el-dialog :title="title" v-model="open" width="640px" append-to-body>
      <el-alert
        title="区域用于归类 GeoJSON 存档。用户上传 GeoJSON 时，需要选择一个所属区域。"
        type="info"
        show-icon
        :closable="false"
        class="mb12 dxx-dialog-alert"
      />

      <el-form ref="datasetRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="区域名称" prop="datasetName">
          <el-input
            v-model="form.datasetName"
            maxlength="100"
            show-word-limit
            placeholder="请输入区域名"
          />
        </el-form-item>
        <el-form-item label="区域说明" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请输入这个区域用于存放哪些 GeoJSON 数据"
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="排序" prop="sortNum">
              <el-input-number v-model="form.sortNum" :min="0" :max="9999" controls-position="right" />
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
        </el-row>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="请输入备注"
          />
        </el-form-item>
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

<script setup name="Dataset">
import { getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { addDataset, delDataset, getDataset, listDataset, updateDataset } from '@/api/binZhou/dxx/dataset'

const { proxy } = getCurrentInstance()

const datasetList = ref([])
const open = ref(false)
const loading = ref(true)
const submitLoading = ref(false)
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
    datasetName: undefined,
    status: undefined
  },
  rules: {
    datasetName: [{ required: true, message: '请输入区域名称', trigger: 'blur' }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listDataset(queryParams.value).then(response => {
    datasetList.value = response.rows || []
    total.value = response.total || 0
  }).finally(() => {
    loading.value = false
  })
}

function cancel() {
  open.value = false
  reset()
}

function reset() {
  form.value = {
    datasetId: null,
    datasetName: null,
    datasetCode: null,
    description: null,
    sortNum: 0,
    status: '0',
    remark: null,
    delFlag: '0'
  }
  proxy.resetForm('datasetRef')
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
  ids.value = selection.map(item => item.datasetId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '新增地图区域'
}

function handleUpdate(row) {
  reset()
  const datasetId = row.datasetId || ids.value
  getDataset(datasetId).then(response => {
    form.value = {
      ...resetKeepDefaults(),
      ...response.data
    }
    open.value = true
    title.value = '修改地图区域'
  })
}

function resetKeepDefaults() {
  return {
    sortNum: 0,
    status: '0',
    delFlag: '0'
  }
}

function simpleCode(value) {
  const prefix = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${prefix || 'dataset'}_${Date.now()}`
}

function submitForm() {
  proxy.$refs.datasetRef.validate(valid => {
    if (!valid) return

    if (!form.value.datasetCode) {
      form.value.datasetCode = simpleCode(form.value.datasetName)
    }

    submitLoading.value = true
    const request = form.value.datasetId != null
      ? updateDataset(form.value)
      : addDataset(form.value)

    request.then(() => {
      proxy.$modal.msgSuccess(form.value.datasetId != null ? '修改成功' : '新增成功')
      open.value = false
      getList()
    }).finally(() => {
      submitLoading.value = false
    })
  })
}

function handleDelete(row) {
  const datasetIds = row.datasetId || ids.value
  proxy.$modal.confirm(
    `是否确认删除区域编号为 "${datasetIds}" 的数据项？如果该区域下已有 GeoJSON 存档，建议先处理存档后再删除。`
  ).then(() => {
    return delDataset(datasetIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleExport() {
  proxy.download('dxx/dataset/export', {
    ...queryParams.value
  }, `dataset_${new Date().getTime()}.xlsx`)
}

getList()
</script>

<style scoped lang="scss">
.dataset-page {
  .mb12 {
    margin-bottom: 12px;
  }

}

:global(.dxx-dialog-alert) {
  margin-bottom: 20px !important;
}
</style>
