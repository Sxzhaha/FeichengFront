<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="用户ID(sys_user.user_id)" prop="userId">
        <el-input
          v-model="queryParams.userId"
          placeholder="请输入用户ID(sys_user.user_id)"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="角色类型：farmer-农户, county-县级, city-市级" prop="userRole">
        <el-input
          v-model="queryParams.userRole"
          placeholder="请输入角色类型：farmer-农户, county-县级, city-市级"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="推送频率：daily-每日, weekly-每周, monthly-每月, realtime-即时" prop="pushFrequency">
        <el-input
          v-model="queryParams.pushFrequency"
          placeholder="请输入推送频率：daily-每日, weekly-每周, monthly-每月, realtime-即时"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="推送渠道：system-系统通知, sms-短信, wechat-微信公众号" prop="pushChannel">
        <el-input
          v-model="queryParams.pushChannel"
          placeholder="请输入推送渠道：system-系统通知, sms-短信, wechat-微信公众号"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="管辖区域编码(县市级用户有效)" prop="areaCode">
        <el-input
          v-model="queryParams.areaCode"
          placeholder="请输入管辖区域编码(县市级用户有效)"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['wr:pushConfig:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['wr:pushConfig:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['wr:pushConfig:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['wr:pushConfig:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="pushConfigList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="配置ID" align="center" prop="configId" />
      <el-table-column label="用户ID(sys_user.user_id)" align="center" prop="userId" />
      <el-table-column label="角色类型：farmer-农户, county-县级, city-市级" align="center" prop="userRole" />
      <el-table-column label="推送频率：daily-每日, weekly-每周, monthly-每月, realtime-即时" align="center" prop="pushFrequency" />
      <el-table-column label="推送渠道：system-系统通知, sms-短信, wechat-微信公众号" align="center" prop="pushChannel" />
      <el-table-column label="管辖区域编码(县市级用户有效)" align="center" prop="areaCode" />
      <el-table-column label="状态" align="center" prop="status" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['wr:pushConfig:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['wr:pushConfig:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination
      v-show="total>0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 添加或修改农情报推送配置对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="pushConfigRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="用户ID(sys_user.user_id)" prop="userId">
              <el-input v-model="form.userId" placeholder="请输入用户ID(sys_user.user_id)" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="角色类型：farmer-农户, county-县级, city-市级" prop="userRole">
              <el-input v-model="form.userRole" placeholder="请输入角色类型：farmer-农户, county-县级, city-市级" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="推送频率：daily-每日, weekly-每周, monthly-每月, realtime-即时" prop="pushFrequency">
              <el-input v-model="form.pushFrequency" placeholder="请输入推送频率：daily-每日, weekly-每周, monthly-每月, realtime-即时" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="推送渠道：system-系统通知, sms-短信, wechat-微信公众号" prop="pushChannel">
              <el-input v-model="form.pushChannel" placeholder="请输入推送渠道：system-系统通知, sms-短信, wechat-微信公众号" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="管辖区域编码(县市级用户有效)" prop="areaCode">
              <el-input v-model="form.areaCode" placeholder="请输入管辖区域编码(县市级用户有效)" />
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

<script setup name="PushConfig">
import { listPushConfig, getPushConfig, delPushConfig, addPushConfig, updatePushConfig } from "@/api/binZhou/wr/pushConfig"

const { proxy } = getCurrentInstance()

const pushConfigList = ref([])
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
    userId: undefined,
    userRole: undefined,
    pushFrequency: undefined,
    pushChannel: undefined,
    areaCode: undefined,
    status: undefined,
  },
  rules: {
    userId: [
      { required: true, message: "用户ID(sys_user.user_id)不能为空", trigger: "blur" }
    ],
    userRole: [
      { required: true, message: "角色类型：farmer-农户, county-县级, city-市级不能为空", trigger: "blur" }
    ],
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询农情报推送配置列表 */
function getList() {
  loading.value = true
  listPushConfig(queryParams.value).then(response => {
    pushConfigList.value = response.rows
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
    configId: null,
    userId: null,
    userRole: null,
    pushFrequency: null,
    pushChannel: null,
    areaCode: null,
    status: null,
    createBy: null,
    createTime: null,
    updateTime: null
  }
  proxy.resetForm("pushConfigRef")
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
  ids.value = selection.map(item => item.configId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加农情报推送配置"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _configId = row.configId || ids.value
  getPushConfig(_configId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改农情报推送配置"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["pushConfigRef"].validate(valid => {
    if (valid) {
      if (form.value.configId != null) {
        updatePushConfig(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addPushConfig(form.value).then(() => {
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
  const _configIds = row.configId || ids.value
  proxy.$modal.confirm('是否确认删除农情报推送配置编号为"' + _configIds + '"的数据项？').then(function() {
    return delPushConfig(_configIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('wr/pushConfig/export', {
    ...queryParams.value
  }, `pushConfig_${new Date().getTime()}.xlsx`)
}

getList()
</script>
