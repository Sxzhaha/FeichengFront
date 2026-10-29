<template>
  <div class="app-container">
    <!-- 区域信息卡片 -->
    <el-card class="box-card mb8" shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <span>当前区域</span>
            <el-tag v-if="currentAreaId && currentAreaInfo" type="success" style="margin-left: 10px">{{ currentAreaInfo.areaName }}</el-tag>
            <el-tag v-else type="info" style="margin-left: 10px">全部区域</el-tag>
          </div>
          <el-button type="primary" link icon="Refresh" @click="handleRefreshArea">刷新</el-button>
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-select v-model="currentAreaId" placeholder="请选择区域" clearable style="width: 100%"
            @change="handleAreaChange">
            <el-option v-for="area in areaOptions" :key="area.areaId" :label="area.areaName" :value="area.areaId" />
          </el-select>
        </el-col>
      </el-row>
    </el-card>

    <!-- 查询表单 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="位置名称" prop="locationName">
        <el-input v-model="queryParams.locationName" placeholder="请输入位置名称" clearable style="width: 240px"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="位置说明" prop="locationCode">
        <el-input v-model="queryParams.locationCode" placeholder="请输入位置说明" clearable style="width: 240px"
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
          v-hasPermi="['iot:location:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate"
          v-hasPermi="['iot:location:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete"
          v-hasPermi="['iot:location:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="info" plain icon="Back" @click="handleBackArea">返回区域</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="locationList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="所属区域" align="center">
        <template #default="scope">
          <span>{{ getAreaName(scope.row.areaId) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="位置名称" align="center" prop="locationName" :show-overflow-tooltip="true" />
      <el-table-column label="经纬度坐标" align="center" prop="coordinate" width="150" />
      <el-table-column label="位置说明" align="center" prop="locationCode" :show-overflow-tooltip="true" />
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
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="120">
        <template #default="scope">
          <el-tooltip content="修改" placement="top">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)"
              v-hasPermi="['iot:location:edit']"></el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)"
              v-hasPermi="['iot:location:remove']"></el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 添加或修改位置对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="locationRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="所属区域" prop="areaId">
              <el-select v-model="form.areaId" placeholder="请选择区域" style="width: 100%" :disabled="!!form.locationId">
                <el-option v-for="area in areaOptions" :key="area.areaId" :label="area.areaName" :value="area.areaId" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="位置名称" prop="locationName">
              <el-input v-model="form.locationName" placeholder="请输入位置名称" maxlength="64" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="位置说明" prop="locationCode">
              <el-input v-model="form.locationCode" placeholder="请输入位置说明" maxlength="32" />
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

<script setup name="Location">
import { listArea, getArea } from "@/api/binZhou/ld/iot/area"
import { listLocation, getLocation, delLocation, addLocation, updateLocation } from "@/api/binZhou/ld/iot/location"
import { listPark } from "@/api/binZhou/ld/iot/park"
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()

const userStore = useUserStore()
const isAdmin = computed(() => userStore.roles && userStore.roles.includes('admin'))

const locationList = ref([])
const areaOptions = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const currentAreaId = ref(null)
const currentAreaInfo = ref(null)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    areaId: null,
    locationName: null,
    locationCode: null
  },
  rules: {
    areaId: [
      { required: true, message: "所属区域不能为空", trigger: "change" }
    ],
    locationName: [
      { required: true, message: "位置名称不能为空", trigger: "blur" }
    ],
    locationCode: [
      { required: true, message: "位置说明不能为空", trigger: "blur" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 获取当前区域名（辅助列映射） */
function getAreaName(areaId) {
  if (!areaId || !areaOptions.value) return '-'
  const area = areaOptions.value.find(item => item.areaId === areaId)
  return area ? area.areaName : '-'
}

/** 查询区域列表 */
function getAreaOptions() {
  return listArea({}).then(async response => {
    const allAreas = response.data || []
    if (isAdmin.value) {
      areaOptions.value = allAreas
    } else {
      try {
        const parkRes = await listPark({ userId: userStore.id })
        const userParks = parkRes.data || []
        areaOptions.value = allAreas.filter(area => 
          userParks.some(park => park.parkId === area.parkId)
        )
      } catch (err) {
        console.error("加载关联园区失败", err)
        areaOptions.value = []
      }
    }
  })
}

/** 查询位置列表 */
function getList() {
  loading.value = true
  const params = { ...queryParams.value }
  if (currentAreaId.value) {
    params.areaId = currentAreaId.value
  } else {
    params.areaId = null
  }
  listLocation(params).then(response => {
    const list = response.data || []
    if (isAdmin.value) {
      locationList.value = list
    } else {
      locationList.value = list.filter(loc => 
        areaOptions.value.some(a => a.areaId === loc.areaId)
      )
    }
    total.value = locationList.value.length
    loading.value = false
  }).catch(() => {
    locationList.value = []
    total.value = 0
    loading.value = false
  })
}

/** 区域改变 */
function handleAreaChange(areaId) {
  if (areaId) {
    queryParams.value.pageNum = 1
    currentAreaInfo.value = areaOptions.value.find(item => item.areaId === areaId)
    getList()
  } else {
    locationList.value = []
    total.value = 0
    currentAreaInfo.value = null
  }
}

/** 刷新区域 */
function handleRefreshArea() {
  getAreaOptions()
}

/** 返回区域 */
function handleBackArea() {
  router.push('/iot/area')
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    locationId: null,
    areaId: currentAreaId.value,
    locationName: null,
    locationCode: null,
    coordinate: null
  }
  proxy.resetForm("locationRef")
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
  ids.value = selection.map(item => item.locationId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加位置"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const locationId = row.locationId || ids.value[0]
  getLocation(locationId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改位置"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["locationRef"].validate(valid => {
    if (valid) {
      if (form.value.locationId != null) {
        updateLocation(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addLocation(form.value).then(response => {
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
  const locationIds = row.locationId || ids.value
  const name = row.locationName || '选中的'
  proxy.$modal.confirm('是否确认删除位置为"' + name + '"的数据项？').then(function () {
    return delLocation(locationIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => { })
}

/** 初始化 */
function init() {
  getAreaOptions().then(() => {
    // 从路由参数获取区域ID
    const areaId = route.query.areaId
    if (areaId) {
      currentAreaId.value = Number(areaId)
      currentAreaInfo.value = {
        areaName: route.query.areaName,
        parkName: route.query.parkName
      }
    } else {
      // 默认展示全部的，即不限区域
      currentAreaId.value = null
      currentAreaInfo.value = null
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
