<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="90px">
      <el-form-item label="模板名称" prop="templateName">
        <el-input v-model="queryParams.templateName" placeholder="请输入模板名称" clearable @keyup.enter="handleQuery" style="width: 180px" />
      </el-form-item>
      
      <el-form-item label="所属园区" prop="parkId">
        <el-select v-model="queryParams.parkId" placeholder="请选择园区" clearable @change="handleQueryParkChange" style="width: 150px">
          <el-option v-for="item in parkList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属区域" prop="areaId">
        <el-select v-model="queryParams.areaId" placeholder="请选择区域" clearable @change="handleQueryAreaChange" style="width: 150px" :disabled="!queryParams.parkId">
          <el-option v-for="item in queryAreaList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="具体位置" prop="locationId">
        <el-select v-model="queryParams.locationId" placeholder="请选择位置" clearable style="width: 150px" :disabled="!queryParams.areaId">
          <el-option v-for="item in queryLocationList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wr:template:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['wr:template:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['wr:template:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['wr:template:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="templateList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="模板ID" align="center" prop="id" width="80" />
      <el-table-column label="模板名称" align="center" prop="templateName" min-width="120" />
      <el-table-column label="预警类型" align="center" prop="warningType">
        <template #default="scope">
          <dict-tag
            :options="wr_warning_type"
            :value="scope.row.warningType"
          />
        </template>
      </el-table-column>
      
      <el-table-column label="所属园区" align="center" prop="parkName" />
      <el-table-column label="所属区域" align="center" prop="areaName" />
      <el-table-column label="具体位置" align="center" prop="locationName" />
      <el-table-column label="作物名称" align="center" prop="cropName" />
      <el-table-column label="场景说明" align="center" prop="description" show-overflow-tooltip />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :options="wr_template_status" :value="scope.row.status"/>
        </template>
      </el-table-column>
      
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['wr:template:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['wr:template:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="templateRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="模板名称" prop="templateName">
              <el-input v-model="form.templateName" placeholder="请输入预警模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="灾害类型" prop="warningType">
              <el-select v-model="form.warningType" placeholder="请选择灾害类型" style="width: 100%;">
                <el-option
                  v-for="dict in wr_warning_type"
                  :key="dict.value"
                  :label="dict.label"
                  :value="parseInt(dict.value)"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="所属园区" prop="parkId">
              <el-select v-model="form.parkId" placeholder="请选择园区" @change="handleFormParkChange" clearable style="width: 100%;">
                <el-option v-for="item in parkList" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="所属区域" prop="areaId">
              <el-select v-model="form.areaId" placeholder="请选择区域" @change="handleFormAreaChange" clearable style="width: 100%;" :disabled="!form.parkId">
                <el-option v-for="item in areaList" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="具体位置" prop="locationId">
              <el-select v-model="form.locationId" placeholder="请选择具体位置" clearable style="width: 100%;" :disabled="!form.areaId">
                <el-option v-for="item in locationList" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="适用作物" prop="cropName">
              <el-input v-model="form.cropName" placeholder="请输入适用作物名称" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="场景说明" prop="description">
              <el-input v-model="form.description" type="textarea" placeholder="例如：冬枣花期低温冻害风险监测 / 高温低湿干热风风险监测" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%;">
                <el-option
                  v-for="dict in wr_template_status"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
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

<script setup name="Template">
import { ref, reactive, toRefs, getCurrentInstance } from 'vue'
import { listTemplate, getTemplate, delTemplate, addTemplate, updateTemplate } from "@/api/binZhou/wr/template"

// 引入真实的园区、地块、位置 API 请求方法
import { listPark } from "@/api/binZhou/ld/iot/park"
import { listArea } from "@/api/binZhou/ld/iot/area"
import { listLocation } from "@/api/binZhou/ld/iot/location"

const { proxy } = getCurrentInstance()

// 【修改点】：直接从后台加载字典，不再写死。请确保字典类型编码为预警类型的真实编码（图里看起来是预警类型，假设编码是 wr_warning_type）
const { wr_template_status, wr_warning_type } = proxy.useDict('wr_template_status', 'wr_warning_type');

const templateList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")

// 【公共】园区列表
const parkList = ref([])

// 【搜索框使用】的联动数据源
const queryAreaList = ref([])
const queryLocationList = ref([])

// 【表单弹窗使用】的联动数据源
const areaList = ref([])
const locationList = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    templateName: undefined,
    parkId: undefined, 
    areaId: undefined,
    locationId: undefined
  },
  rules: {
    templateName: [
      { required: true, message: "模板名称不能为空", trigger: "blur" }
    ],
    warningType: [
      { required: true, message: "预警类型不能为空", trigger: "blur" }
    ],
    parkId: [ 
      { required: true, message: "园区不能为空", trigger: "change" }
    ],
    status: [
      { required: true, message: "状态不能为空", trigger: "change" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 初始化获取第一级（园区）列表 */
function initParkList() {
  listPark({}).then(response => {
    const list = response.rows || response.data || [];
    parkList.value = list.map(item => ({
      id: item.parkId,
      name: item.parkName
    }));
  })
}

/* ================= 搜索框的联动事件 ================= */
/** 搜索框园区改变时 */
function handleQueryParkChange(parkId) {
  queryParams.value.areaId = undefined
  queryParams.value.locationId = undefined
  queryAreaList.value = []
  queryLocationList.value = []
  
  if (parkId) {
    listArea({ parkId: parkId }).then(response => {
      const list = response.rows || response.data || [];
      queryAreaList.value = list.map(item => ({
        id: item.areaId,
        name: item.areaName
      }));
    })
  }
}

/** 搜索框区域改变时 */
function handleQueryAreaChange(areaId) {
  queryParams.value.locationId = undefined
  queryLocationList.value = []
  
  if (areaId) {
    listLocation({ areaId: areaId }).then(response => {
      const list = response.rows || response.data || [];
      queryLocationList.value = list.map(item => ({
        id: item.locationId,
        name: item.locationName
      }));
    })
  }
}

/* ================= 表单弹窗的联动事件 ================= */
/** 表单园区改变时 */
function handleFormParkChange(parkId) {
  form.value.areaId = null
  form.value.locationId = null
  areaList.value = []
  locationList.value = []
  
  if (parkId) {
    listArea({ parkId: parkId }).then(response => {
      const list = response.rows || response.data || [];
      areaList.value = list.map(item => ({
        id: item.areaId,
        name: item.areaName
      }));
    })
  }
}

/** 表单区域改变时 */
function handleFormAreaChange(areaId) {
  form.value.locationId = null
  locationList.value = []
  
  if (areaId) {
    listLocation({ areaId: areaId }).then(response => {
      const list = response.rows || response.data || [];
      locationList.value = list.map(item => ({
        id: item.locationId,
        name: item.locationName
      }));
    })
  }
}

/** 查询预警模板列表 */
function getList() {
  loading.value = true
  listTemplate(queryParams.value).then(response => {
    templateList.value = response.rows
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
    id: null,
    templateName: null,
    warningType: null,
    parkId: null,        
    areaId: null,        
    locationId: null,    
    cropName: null,
    description: null,
    status: null
  }
  areaList.value = []    
  locationList.value = []
  proxy.resetForm("templateRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  // 清空搜索联动的下拉数据
  queryAreaList.value = []
  queryLocationList.value = []
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加预警模板"
}

/** 修改按钮操作 (支持真实数据回显) */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getTemplate(_id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改预警模板"
    
    // 真实接口回显逻辑
    if (form.value.parkId) {
      listArea({ parkId: form.value.parkId }).then(res => {
        const list = res.rows || res.data || [];
        areaList.value = list.map(item => ({
          id: item.areaId,
          name: item.areaName
        }));
      })
    }
    
    if (form.value.areaId) {
      listLocation({ areaId: form.value.areaId }).then(res => {
        const list = res.rows || res.data || [];
        locationList.value = list.map(item => ({
          id: item.locationId,
          name: item.locationName
        }));
      })
    }
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["templateRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateTemplate(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addTemplate(form.value).then(() => {
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
  const _ids = row.id || ids.value
  proxy.$modal.confirm('是否确认删除预警模板编号为"' + _ids + '"的数据项？').then(function() {
    return delTemplate(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('wr/template/export', {
    ...queryParams.value
  }, `template_${new Date().getTime()}.xlsx`)
}

// 页面加载时执行
getList()
initParkList() 
</script>