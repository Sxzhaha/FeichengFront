<template>
  <div class="app-container agri-theme">
    <el-card shadow="never" class="search-card mb-20">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
        
        <el-form-item label="所属设备" prop="deviceId">
          <el-select 
            v-model="queryParams.deviceId" 
            placeholder="请选择设备" 
            clearable 
            filterable 
            style="width: 240px"
            @change="handleQuery"
          >
             <el-option
                v-for="item in deviceOptions"
                :key="item.id"
                :label="item.deviceName"
                :value="item.id"
             >
                <span style="float: left">{{ item.deviceName }}</span>
                <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 10px">SN:{{ item.deviceSn }}</span>
             </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="预置点索引" prop="pointIndex" label-width="120px">
          <el-input 
            v-model="queryParams.pointIndex" 
            placeholder="输入索引(如: 1)" 
            clearable 
            @keyup.enter="handleQuery" 
            style="width: 150px"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" color="#42b983" icon="Search" @click="handleQuery">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="10" class="mb8 action-bar">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['iot:cameraPreset:add']">新增预置点</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['iot:cameraPreset:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['iot:cameraPreset:remove']">批量删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['iot:cameraPreset:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table 
      v-loading="loading" 
      :data="cameraPresetList" 
      @selection-change="handleSelectionChange"
      stripe
      border
    >
      <el-table-column type="selection" width="55" align="center" />
      
      <el-table-column label="所属设备" min-width="200" show-overflow-tooltip>
        <template #default="scope">
           <div class="info-group">
              <span class="main-text font-bold">{{ scope.row.deviceName || '未知设备' }}</span>
              <div class="sub-text text-muted">
                 <el-tag size="small" type="info" effect="plain">ID: {{ scope.row.deviceId }}</el-tag>
                 <span class="ml-5">SN: {{ scope.row.snCode || '--' }}</span>
              </div>
           </div>
        </template>
      </el-table-column>

      <el-table-column label="预置点索引" align="center" prop="pointIndex" width="120">
         <template #default="scope">
            <el-tag effect="dark" type="warning" size="large"># {{ scope.row.pointIndex }}</el-tag>
         </template>
      </el-table-column>

      <el-table-column label="备注说明" align="center" prop="remark" show-overflow-tooltip />
      
      <el-table-column label="创建人姓名" align="center" prop="creatorName" width="120" />
      
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
         <template #default="scope">
            <span>{{ parseTime(scope.row.createTime) }}</span>
         </template>
      </el-table-column>

      <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['iot:cameraPreset:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['iot:cameraPreset:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="cameraPresetRef" :model="form" :rules="rules" label-width="100px">
        
        <el-form-item label="所属设备" prop="deviceId">
           <el-select 
             v-model="form.deviceId" 
             placeholder="请选择设备" 
             style="width: 100%" 
             filterable 
             clearable
             :disabled="form.id != null" 
           >
              <el-option
                 v-for="item in deviceOptions"
                 :key="item.id"
                 :label="item.deviceName"
                 :value="item.id"
              >
                 <span style="float: left">{{ item.deviceName }}</span>
                 <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 10px">SN:{{ item.deviceSn }}</span>
              </el-option>
           </el-select>
        </el-form-item>

        <el-form-item label="预置点索引" prop="pointIndex">
           <el-input-number v-model="form.pointIndex" :min="1" :max="255" style="width: 100%" placeholder="1-255" />
           <div class="form-tip text-muted">请填写 1-255 之间的整数</div>
        </el-form-item>

        <el-form-item label="备注名称" prop="remark">
          <el-input v-model="form.remark" placeholder="例如: 大门口、育苗A区" type="textarea" />
        </el-form-item>
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

<script setup name="CameraPreset">
import { listCameraPreset, getCameraPreset, delCameraPreset, addCameraPreset, updateCameraPreset } from "@/api/binZhou/ld/iot/cameraPreset"
// 【新增】引入设备API
import { listDevice } from "@/api/binZhou/ld/iot/device"
import { parseTime } from "@/utils/ruoyi"
import { getUserProfile } from "@/api/system/user"
const { proxy } = getCurrentInstance()
import { ElLoading } from 'element-plus' // 确保引入了 ElLoading
const cameraPresetList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const userInfo = ref({})
// 【新增】设备下拉数据
const deviceOptions = ref([])
onMounted(() => {
  getUserProfile().then( res => {
    if(res.code == 200){
      userInfo.value = res.data;
      queryParams.value.creatorId = userInfo.value.admin == true?null:userInfo.value.userId; // 设置查询参数的创建者ID
      form.value.creatorId = userInfo.value.userId;
      // 初始化
      getList()
      getDeviceList() // 加载设备数据
    }
  })
})
const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceId: null,
    pointIndex: null,
    creatorId: userInfo.value.userId
  },
  rules: {
    deviceId: [
      { required: true, message: "必须选择一个设备", trigger: "change" }
    ],
    pointIndex: [
      { required: true, message: "预置点索引不能为空", trigger: "blur" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 【新增】加载设备列表 */
function getDeviceList() {
  listDevice({ pageNum: 1, pageSize: 1000, productId:4, creatorId: userInfo.value.admin == true?null:userInfo.value.userId }).then(res => {
    deviceOptions.value = res.rows || []
  })
}

/** 查询列表 */
function getList() {
  loading.value = true
  listCameraPreset(queryParams.value).then(response => {
    cameraPresetList.value = response.rows
    total.value = response.total
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
    deviceId: null,
    pointIndex: 1,
    remark: null,
    creatorId: userInfo.value.userId
  }
  proxy.resetForm("cameraPresetRef")
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
  ids.value = selection.map(item => item.id) // 注意：现在使用 id 作为主键
  single.value = selection.length != 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加预置点"
}

function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getCameraPreset(_id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改预置点"
  })
}

function submitForm() {
  proxy.$refs["cameraPresetRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateCameraPreset(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addCameraPreset(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

function handleDelete(row) {
  const _ids = row.id || ids.value
  
  proxy.$modal.confirm('确认删除选中的预置点数据？').then(() => {
    // 1. 开启遮罩层
    const loadingInstance = ElLoading.service({
      lock: true,
      text: '正在同步删除萤石云及本地数据，请稍候...',
      background: 'rgba(0, 0, 0, 0.7)',
    })

    // 2. 发起删除请求
    delCameraPreset(_ids)
      .then(() => {
        proxy.$modal.msgSuccess("删除成功")
        getList() // 刷新列表
        ids.value = [] // 清空选中
      })
      .catch((err) => {
        console.error(err) // 错误已经在 request.js 拦截器处理了，这里主要为了 finally
      })
      .finally(() => {
        // 3. 关闭遮罩层 (无论成功失败都会执行)
        loadingInstance.close()
      })
  }).catch(() => {
    // 取消确认不做任何操作
  })
}

function handleExport() {
  proxy.download('iot/cameraPreset/export', {
    ...queryParams.value
  }, `preset_${new Date().getTime()}.xlsx`)
}


</script>

<style scoped lang="scss">
$agri-green: #42b983;

.agri-theme {
  background-color: #f5f7fa;
  min-height: 100vh;
}

.search-card {
  border-radius: 8px;
  border: 1px solid #e1f3d8;
  :deep(.el-card__body) { padding-bottom: 2px; }
}

/* 信息组合样式 */
.info-group {
  display: flex; flex-direction: column;
  .main-text { font-size: 14px; margin-bottom: 4px; display: block; }
  .sub-text { font-size: 12px; display: flex; align-items: center; }
}

.font-bold { font-weight: 600; }
.text-muted { color: #909399; font-size: 12px; }
.ml-5 { margin-left: 5px; }
.form-tip { font-size: 12px; margin-top: 4px; }

:deep(.el-table__header) {
  background-color: #f8f8f9 !important;
  color: #515a6e;
  font-weight: 600;
}
</style>