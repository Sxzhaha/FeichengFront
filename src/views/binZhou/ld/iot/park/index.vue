<template>
  <div class="app-container">
    <!-- 查询表单 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="园区名称" prop="parkName">
        <el-input v-model="queryParams.parkName" placeholder="请输入园区名称" clearable style="width: 240px"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="园区说明" prop="parkCode">
        <el-input v-model="queryParams.parkCode" placeholder="请输入园区说明" clearable style="width: 240px"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作按钮 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['iot:park:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate"
          v-hasPermi="['iot:park:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete"
          v-hasPermi="['iot:park:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="parkList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="园区名称" align="center" prop="parkName" :show-overflow-tooltip="true" />
      <el-table-column label="行政区" align="center" prop="region" width="180" :show-overflow-tooltip="true" />
      <el-table-column label="经纬度坐标" align="center" prop="coordinate" width="150" />
      <el-table-column label="园区说明" align="center" prop="parkCode" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" align="center" prop="updateTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.updateTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="180">
        <template #default="scope">
          <el-tooltip content="修改" placement="top">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)"
              v-hasPermi="['iot:park:edit']"></el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)"
              v-hasPermi="['iot:park:remove']"></el-button>
          </el-tooltip>
          <el-tooltip content="查看区域" placement="top">
            <el-button link type="primary" icon="List" @click="handleViewArea(scope.row)"></el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加或修改园区对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="parkRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="园区名称" prop="parkName">
              <el-input v-model="form.parkName" placeholder="请输入园区名称" maxlength="64" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="园区说明" prop="parkCode">
              <el-input v-model="form.parkCode" placeholder="请输入园区说明" maxlength="32" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="行政区" prop="region">
              <el-input v-model="form.region" placeholder="请输入行政区（选填，如：山东省滨州市）" maxlength="64" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="位置代码" prop="regionCode">
              <el-input v-model="form.regionCode" placeholder="请输入位置代码（选填，如天气Location ID）" maxlength="32" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="经纬度坐标" prop="coordinate">
              <el-input v-model="form.coordinate" placeholder="请输入经纬度（选填，格式：经度,纬度）" maxlength="64" />
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

<script setup name="Park">
import { listPark, getPark, delPark, addPark, updatePark } from "@/api/binZhou/ld/iot/park"

const { proxy } = getCurrentInstance()

const parkList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    parkName: null,
    parkCode: null
  },
  rules: {
    parkName: [
      { required: true, message: "园区名称不能为空", trigger: "blur" }
    ],
    parkCode: [
      { required: true, message: "园区说明不能为空", trigger: "blur" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询园区列表 */
function getList() {
  loading.value = true
  listPark(queryParams.value).then(response => {
    parkList.value = response.data
    total.value = response.total
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
    parkId: null,
    parkName: null,
    parkCode: null,
    region: null,
    regionCode: null,
    coordinate: null
  }
  proxy.resetForm("parkRef")
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
  ids.value = selection.map(item => item.parkId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加园区"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const parkId = row.parkId || ids.value[0]
  getPark(parkId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改园区"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["parkRef"].validate(valid => {
    if (valid) {
      if (form.value.parkId != null) {
        updatePark(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addPark(form.value).then(response => {
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
  const parkIds = row.parkId || ids.value
  const name = row.parkName || '选中的'
  proxy.$modal.confirm('是否确认删除园区为"' + name + '"的数据项？').then(function () {
    return delPark(parkIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => { })
}

/** 查看区域 */
function handleViewArea(row) {
  proxy.$router.push({
    path: '/ld/basicinformation/area',
    query: { parkId: row.parkId, parkName: row.parkName }
  })
}

getList()
</script>
