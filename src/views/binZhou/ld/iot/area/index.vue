<template>
  <div class="app-container">
    <!-- 园区选择器 -->
    <el-card class="box-card mb8" shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <span>当前园区</span>
            <el-tag v-if="currentParkId" type="success" style="margin-left: 10px">{{ getCurrentParkName() }}</el-tag>
            <el-tag v-else type="info" style="margin-left: 10px">全部园区</el-tag>
          </div>
          <el-button type="primary" link icon="Refresh" @click="handleRefreshPark">刷新</el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-select v-model="currentParkId" placeholder="请选择园区" clearable style="width: 100%"
            @change="handleParkChange">
            <el-option v-for="park in parkOptions" :key="park.parkId" :label="park.parkName" :value="park.parkId" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 查询表单 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="地块名称" prop="areaName">
        <el-input v-model="queryParams.areaName" placeholder="请输入地块名称" clearable style="width: 240px"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="地块说明" prop="areaCode">
        <el-input v-model="queryParams.areaCode" placeholder="请输入地块说明" clearable style="width: 240px"
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd"
          v-hasPermi="['iot:area:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate"
          v-hasPermi="['iot:area:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete"
          v-hasPermi="['iot:area:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="info" plain icon="Back" @click="handleBackPark">返回园区</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="areaList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="所属园区" align="center">
        <template #default="scope">
          <span>{{ getParkName(scope.row.parkId) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="地块名称" align="center" prop="areaName" :show-overflow-tooltip="true" />
      <el-table-column label="经纬度坐标" align="center" prop="coordinate" width="150" />
      <el-table-column label="地块说明" align="center" prop="areaCode" :show-overflow-tooltip="true" />
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
              v-hasPermi="['iot:area:edit']"></el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)"
              v-hasPermi="['iot:area:remove']"></el-button>
          </el-tooltip>
          <el-tooltip content="查看位置" placement="top">
            <el-button link type="primary" icon="List" @click="handleViewLocation(scope.row)"></el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加或修改地块对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="areaRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="所属园区" prop="parkId">
              <el-select v-model="form.parkId" placeholder="请选择园区" style="width: 100%" :disabled="!!form.areaId">
                <el-option v-for="park in parkOptions" :key="park.parkId" :label="park.parkName" :value="park.parkId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="地块名称" prop="areaName">
              <el-input v-model="form.areaName" placeholder="请输入地块名称" maxlength="64" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="地块说明" prop="areaCode">
              <el-input v-model="form.areaCode" placeholder="请输入地块说明" maxlength="32" />
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

<script setup name="Area">
import { listPark } from "@/api/binZhou/ld/iot/park"
import { listArea, getArea, delArea, addArea, updateArea } from "@/api/binZhou/ld/iot/area"
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()

const userStore = useUserStore()
const isAdmin = computed(() => userStore.roles && userStore.roles.includes('admin'))

const areaList = ref([])
const parkOptions = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const currentParkId = ref(null)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    parkId: null,
    areaName: null,
    areaCode: null
  },
  rules: {
    parkId: [
      { required: true, message: "所属园区不能为空", trigger: "change" }
    ],
    areaName: [
      { required: true, message: "地块名称不能为空", trigger: "blur" }
    ],
    areaCode: [
      { required: true, message: "地块说明不能为空", trigger: "blur" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 获取当前园区名（辅助列映射） */
function getParkName(parkId) {
  if (!parkId || !parkOptions.value) return '-'
  const park = parkOptions.value.find(item => item.parkId === parkId)
  return park ? park.parkName : '-'
}

/** 查询园区列表 */
function getParkOptions() {
  const params = {}
  if (!isAdmin.value) {
    params.userId = userStore.id
  }
  return listPark(params).then(response => {
    parkOptions.value = response.data || []
  })
}

/** 查询地块列表 */
function getList() {
  loading.value = true
  const params = { ...queryParams.value }
  if (currentParkId.value) {
    params.parkId = currentParkId.value
  } else {
    params.parkId = null
  }
  listArea(params).then(response => {
    const list = response.data || []
    if (isAdmin.value) {
      areaList.value = list
    } else {
      areaList.value = list.filter(area => 
        parkOptions.value.some(p => p.parkId === area.parkId)
      )
    }
    total.value = areaList.value.length
    loading.value = false
  }).catch(() => {
    areaList.value = []
    total.value = 0
    loading.value = false
  })
}

/** 园区改变 */
function handleParkChange(parkId) {
  if (parkId) {
    queryParams.value.pageNum = 1
    getList()
  } else {
    areaList.value = []
    total.value = 0
  }
}

/** 刷新园区 */
function handleRefreshPark() {
  getParkOptions()
}

/** 获取当前园区名称 */
function getCurrentParkName() {
  if (!currentParkId.value || !parkOptions.value) {
    return ''
  }
  const park = parkOptions.value.find(item => item.parkId === currentParkId.value)
  return park ? park.parkName : ''
}

/** 返回园区 */
function handleBackPark() {
  router.push('/iot/park')
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    areaId: null,
    parkId: currentParkId.value,
    areaName: null,
    areaCode: null,
    coordinate: null
  }
  proxy.resetForm("areaRef")
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
  ids.value = selection.map(item => item.areaId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加地块"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const areaId = row.areaId || ids.value[0]
  getArea(areaId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改地块"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["areaRef"].validate(valid => {
    if (valid) {
      if (form.value.areaId != null) {
        updateArea(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addArea(form.value).then(response => {
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
  const areaIds = row.areaId || ids.value
  const name = row.areaName || '选中的'
  proxy.$modal.confirm('是否确认删除地块为"' + name + '"的数据项？').then(function () {
    return delArea(areaIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => { })
}

/** 查看位置 */
function handleViewLocation(row) {
  router.push({
    path: '/ld/basicinformation/location',
    query: { areaId: row.areaId, areaName: row.areaName, parkId: row.parkId }
  })
}

/** 初始化 */
function init() {
  getParkOptions().then(() => {
    // 从路由参数获取园区ID
    const parkId = route.query.parkId
    if (parkId) {
      currentParkId.value = Number(parkId)
    } else {
      // 默认展示全部的，即不限园区
      currentParkId.value = null
    }
    getList()
  })
}

init()
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
