<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="任务名称" prop="taskName">
        <el-input v-model="queryParams.taskName" placeholder="请输入任务名称" clearable @keyup.enter="handleQuery"/>
      </el-form-item>
      
      <el-form-item label="关联预置点" prop="presetId" label-width="90px">
        <el-select 
          v-model="queryParams.presetId" 
          placeholder="请选择预置点" 
          clearable 
          filterable 
          style="width: 260px"
        >
          <el-option
            v-for="item in presetOptions"
            :key="item.id"
            :label="`${item.deviceName} - [${item.pointIndex}]`"
            :value="item.id"
          >
            <span style="float: left; font-weight: bold">{{ item.deviceName }}</span>
            <span style="float: right; color: #8492a6; font-size: 12px;">
              <span style="color: #409EFF">[#{{ item.pointIndex }}]</span> 
              SN:{{ item.snCode }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="任务类型" prop="jobType">
        <el-select v-model="queryParams.jobType" placeholder="请选择类型" clearable style="width: 150px">
          <el-option label="单次执行" value="ONCE" />
          <el-option label="周期循环" value="CRON" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['iot:cameraTask:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['iot:cameraTask:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['iot:cameraTask:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="cameraTaskList" @selection-change="handleSelectionChange" stripe border>
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="任务序号" align="center" prop="taskId" width="80" />
      <el-table-column label="任务名称" align="center" prop="taskName" min-width="150" show-overflow-tooltip />
      
      <el-table-column label="设备名称" align="center" prop="deviceName" min-width="140" show-overflow-tooltip />
      
      <el-table-column label="设备序列号" align="center" prop="deviceSn" width="180">
        <template #default="scope">
          <span style="font-family: monospace;">{{ scope.row.snCode }}</span>
        </template>
      </el-table-column>
      <el-table-column label="执行次数" align="center" prop="count" width="80" />
      <el-table-column label="预置点" align="center" prop="pointIndex" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.pointIndex" effect="dark" type="warning" size="large">
            #{{ scope.row.pointIndex }}
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>

      <el-table-column label="类型" align="center" prop="jobType" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.jobType === 'ONCE'" type="info">单次</el-tag>
          <el-tag v-else type="success">循环</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="执行规则" align="center" min-width="180" show-overflow-tooltip>
        <template #default="scope">
          <div v-if="scope.row.jobType === 'ONCE'">
            <el-icon><Clock /></el-icon> {{ parseTime(scope.row.executeTime, '{y}-{m}-{d} {h}:{i}:{s}') }}
          </div>
          <div v-else class="text-primary font-bold">
            <el-icon><Refresh /></el-icon> {{ scope.row.cronExpression }}
          </div>
        </template>
      </el-table-column>

      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.status == '0'" type="primary">正常</el-tag>
          <el-tag v-else-if="scope.row.status == '1'" type="warning">暂停</el-tag>
          <el-tag v-else-if="scope.row.status == '2'" type="success">已完成</el-tag>
          <el-tag v-else-if="scope.row.status == '3'" type="danger">失败</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="创建人" align="center" prop="creatorName" width="100" show-overflow-tooltip />
      <el-table-column label="备注" align="center" prop="remark" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['iot:cameraTask:edit']">修改</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['iot:cameraTask:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList"/>

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="cameraTaskRef" :model="form" :rules="rules" label-width="100px">
        
        <el-form-item label="任务名称" prop="taskName">
          <el-input v-model="form.taskName" placeholder="例如: 1号大棚每日晨检" />
        </el-form-item>

        <el-form-item label="目标预置点" prop="presetId">
          <el-select 
            v-model="form.presetId" 
            placeholder="请选择抓拍位置 (必选)" 
            style="width: 100%" 
            filterable 
            clearable
          >
            <el-option 
              v-for="item in presetOptions" 
              :key="item.id" 
              :label="`${item.deviceName} - [${item.pointIndex}]`" 
              :value="item.id"
            >
              <span style="float: left">{{ item.deviceName }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px; margin-left: 10px">
                <span style="color: #e6a23c; font-weight: bold; margin-right: 5px">#{{ item.pointIndex }}</span>
                SN:{{ item.snCode }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="任务类型" prop="jobType">
          <el-radio-group v-model="form.jobType">
            <el-radio label="ONCE">单次执行</el-radio>
            <el-radio label="CRON">周期循环</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="执行时间" prop="executeTime" v-if="form.jobType === 'ONCE'">
          <el-date-picker 
            v-model="form.executeTime" 
            type="datetime" 
            value-format="YYYY-MM-DD HH:mm:ss" 
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择精确执行时间" 
            style="width: 100%"
          />
        </el-form-item>

        <template v-if="form.jobType === 'CRON'">
          <el-form-item label="执行策略">
            <el-radio-group v-model="cronConfig.type">
              <el-radio label="DAILY">每天</el-radio>
              <el-radio label="WEEKLY">每周</el-radio>
              <el-radio label="INTERVAL">按天间隔</el-radio>
              <el-radio label="HOURLY">每小时指定分钟</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="选择星期" v-if="cronConfig.type === 'WEEKLY'">
            <el-checkbox-group v-model="cronConfig.weekDays">
              <el-checkbox label="2">周一</el-checkbox>
              <el-checkbox label="3">周二</el-checkbox>
              <el-checkbox label="4">周三</el-checkbox>
              <el-checkbox label="5">周四</el-checkbox>
              <el-checkbox label="6">周五</el-checkbox>
              <el-checkbox label="7">周六</el-checkbox>
              <el-checkbox label="1">周日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="间隔天数" v-if="cronConfig.type === 'INTERVAL'">
            每隔 <el-input-number v-model="cronConfig.intervalDays" :min="2" :max="30" size="small" style="margin: 0 10px; width: 100px" /> 天执行一次
          </el-form-item>

          <el-form-item label="抓拍分钟" v-if="cronConfig.type === 'HOURLY'">
            每小时第
            <el-input-number
              v-model="cronConfig.hourMinute"
              :min="0"
              :max="59"
              :step="1"
              controls-position="right"
              size="small"
              style="margin: 0 10px; width: 120px"
            />
            分钟抓拍一次
          </el-form-item>

          <el-form-item label="执行时间" required v-if="cronConfig.type !== 'HOURLY'">
            <el-time-picker v-model="cronConfig.time" placeholder="请选择具体时间点" format="HH:mm:ss" value-format="HH:mm:ss" style="width: 100%"/>
          </el-form-item>
          
          <el-form-item label="规则预览">
            <el-tag type="info">{{ generateCronExpression() }}</el-tag>
          </el-form-item>
        </template>
        
        <el-form-item label="执行次数" prop="count">
          <el-input-number v-model="form.count" :min="0" controls-position="right" placeholder="请输入执行次数" style="width: 100%" />
        </el-form-item>

        <el-form-item label="任务状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="0">正常</el-radio>
            <el-radio label="1">暂停</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="备注信息" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注内容" />
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

<script setup name="CameraTask">
import { listCameraTask, getCameraTask, delCameraTask, addCameraTask, updateCameraTask } from "@/api/binZhou/ld/iot/cameraTask"
import { listCameraPreset } from "@/api/binZhou/ld/iot/cameraPreset" 
import { parseTime } from '@/utils/ruoyi' 
import { onMounted, reactive, ref, toRefs, getCurrentInstance } from "vue"
import { getUserProfile } from "@/api/system/user"

const { proxy } = getCurrentInstance()
const cameraTaskList = ref([])
const presetOptions = ref([]) 
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

const cronConfig = reactive({
  type: 'DAILY',      
  weekDays: [],       
  intervalDays: 2,    
  time: '08:00:00',
  hourMinute: 0
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    taskName: null,
    presetId: null, 
    jobType: null,
    status: null,
    creatorId: null
  },
  rules: {
    taskName: [{ required: true, message: "任务名称不能为空", trigger: "blur" }],
    jobType: [{ required: true, message: "请选择任务类型", trigger: "change" }],
    presetId: [{ required: true, message: "必须选择一个预置点", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)
const userInfo = ref({})

function getPresetList() {
  listCameraPreset({ pageNum: 1, pageSize: 2000, creatorId: userInfo.value.admin == true ? null : userInfo.value.userId }).then(response => {
    presetOptions.value = response.rows || [];
  });
}

function getList() {
  loading.value = true
  listCameraTask(queryParams.value).then(response => {
    cameraTaskList.value = response.rows
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
    taskId: null,
    taskName: null,
    deviceId: null, 
    presetId: null, 
    jobType: 'ONCE', 
    executeTime: null,
    cronExpression: null,
    count: 0, // 新增：重置执行次数
    status: '0',     
    remark: null,
    creatorId: userInfo.value.userId
  }
  
  cronConfig.type = 'DAILY'
  cronConfig.weekDays = []
  cronConfig.intervalDays = 2
  cronConfig.time = '08:00:00'
  cronConfig.hourMinute = 0
  
  proxy.resetForm("cameraTaskRef")
}

function generateCronExpression() {
  if (cronConfig.type === 'HOURLY') {
    return `0 ${cronConfig.hourMinute} * * * ?`
  }
  const time = cronConfig.time
  if (!time) return ''
  const [hh, mm, ss] = time.split(':')
  
  if (cronConfig.type === 'DAILY') {
    return `${ss} ${mm} ${hh} * * ?`
  } 
  else if (cronConfig.type === 'WEEKLY') {
    const days = cronConfig.weekDays.join(',')
    if (!days) return '' 
    return `${ss} ${mm} ${hh} ? * ${days}`
  } 
  else if (cronConfig.type === 'INTERVAL') {
    return `${ss} ${mm} ${hh} 1/${cronConfig.intervalDays} * ?`
  }
  return ''
}

function resolveCronToConfig(cron) {
  if (!cron) return;
  
  const parts = cron.split(' ');
  
  if(parts.length >= 3 && parts[2] !== '*') {
    cronConfig.time = `${parts[2]}:${parts[1]}:${parts[0]}`;
  }

  if (parts[1] !== '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && parts[5] === '?') {
    cronConfig.type = 'HOURLY';
    cronConfig.hourMinute = parseInt(parts[1], 10) || 0;
  } else if (parts[3] === '*' && parts[5] === '?') {
    cronConfig.type = 'DAILY';
  } else if (parts[3] === '?' && parts[5] !== '*') {
    cronConfig.type = 'WEEKLY';
    cronConfig.weekDays = parts[5].split(',');
  } else if (parts[3].includes('/')) {
    cronConfig.type = 'INTERVAL';
    const interval = parts[3].split('/')[1];
    cronConfig.intervalDays = parseInt(interval) || 2;
  }
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
  ids.value = selection.map(item => item.taskId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

function handleAdd() {
  reset()
  form.value.creatorId = userInfo.value.userId 
  open.value = true
  title.value = "添加定时任务"
}

function handleUpdate(row) {
  reset()
  const _taskId = row.taskId || ids.value
  getCameraTask(_taskId).then(response => {
    form.value = response.data 
    
    if (form.value.jobType === 'ONCE' && form.value.executeTime) {
      form.value.executeTime = parseTime(form.value.executeTime, '{y}-{m}-{d} {h}:{i}:{s}');
    }
    
    if (form.value.jobType === 'CRON' && form.value.cronExpression) {
      resolveCronToConfig(form.value.cronExpression);
    }
    
    open.value = true
    title.value = "修改定时任务"
  })
}

function submitForm() {
  proxy.$refs["cameraTaskRef"].validate(valid => {
    if (valid) {
      if (form.value.jobType === 'CRON') {
        if (cronConfig.type !== 'HOURLY' && !cronConfig.time) {
          proxy.$modal.msgError("请选择执行时间点")
          return
        }
        if (cronConfig.type === 'HOURLY' && (!Number.isInteger(cronConfig.hourMinute) || cronConfig.hourMinute < 0 || cronConfig.hourMinute > 59)) {
          proxy.$modal.msgError("请输入0到59之间的抓拍分钟")
          return
        }
        if (cronConfig.type === 'WEEKLY' && cronConfig.weekDays.length === 0) {
          proxy.$modal.msgError("请至少选择一个星期")
          return
        }
        form.value.cronExpression = generateCronExpression();
        form.value.executeTime = null; 
      } else {
        form.value.cronExpression = null;
      }

      if (form.value.taskId != null) {
        updateCameraTask(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addCameraTask(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

function handleDelete(row) {
  const _taskIds = row.taskId || ids.value
  proxy.$modal.confirm('确认删除？').then(function() {
    return delCameraTask(_taskIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

onMounted(() => {
  getUserProfile().then(res => {
    if(res.code == 200){
      userInfo.value = res.data;
      queryParams.value.creatorId = userInfo.value.admin == true ? null : userInfo.value.userId
      getPresetList() 
      getList()
    }
  })
})
</script>

<style scoped lang="scss">
.text-primary { color: #409EFF; font-family: monospace; }
.font-bold { font-weight: 600; }
.text-muted { color: #909399; font-size: 12px; }
.mt-5 { margin-top: 5px; }
.ml-5 { margin-left: 5px; }
.form-tip { font-size: 12px; color: #909399; margin-top: -5px; margin-bottom: 5px; }
</style>
