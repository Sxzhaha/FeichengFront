<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="所属产品" prop="productId">
        <el-select 
          v-model="queryParams.productId" 
          placeholder="请选择产品" 
          clearable 
          filterable
          style="width: 200px"
        >
          <el-option
            v-for="item in productList"
            :key="item.productId"
            :label="item.productName"
            :value="item.productId"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="标识符" prop="identifier">
        <el-input
          v-model="queryParams.identifier"
          placeholder="JSON Key (如: temp)"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      
      <el-form-item label="属性名称" prop="modelName">
        <el-input
          v-model="queryParams.modelName"
          placeholder="显示名称 (如: 温度)"
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
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['iot:model:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['iot:model:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['iot:model:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['iot:model:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="modelList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="序号" align="center" prop="modelId" width="80" />
      
      <el-table-column label="所属产品" align="center" prop="productId" width="150">
        <template #default="scope">
          <el-tag effect="plain">{{ formatProductName(scope.row.productId) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="属性名称" align="center" prop="modelName" />
      
      <el-table-column label="标识符 (Key)" align="center" prop="identifier">
         <template #default="scope">
             <span style="font-family: monospace; color: #409EFF">{{ scope.row.identifier }}</span>
         </template>
      </el-table-column>

      <el-table-column label="数据类型" align="center" prop="type" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.type === 'int' || scope.row.type === 'float'" type="warning">{{ scope.row.type }}</el-tag>
          <el-tag v-else-if="scope.row.type === 'bool'" type="success">{{ scope.row.type }}</el-tag>
          <el-tag v-else-if="scope.row.type === 'enum'" type="danger">{{ scope.row.type }}</el-tag>
          <el-tag v-else type="info">{{ scope.row.type }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="定义详情 (Specs)" align="center" prop="specs" show-overflow-tooltip />
      
      <el-table-column label="列表展示" align="center" prop="isMonitor" width="100">
        <template #default="scope">
          <el-switch
             v-model="scope.row.isMonitor"
             :active-value="1"
             :inactive-value="0"
             disabled
          />
        </template>
      </el-table-column>

      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['iot:model:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['iot:model:remove']">删除</el-button>
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

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="modelRef" :model="form" :rules="rules" label-width="100px">
        
        <el-form-item label="关联产品" prop="productId">
          <el-select v-model="form.productId" placeholder="请选择关联产品" filterable style="width: 100%">
            <el-option
              v-for="item in productList"
              :key="item.productId"
              :label="item.productName"
              :value="item.productId"
            />
          </el-select>
        </el-form-item>

        <el-row>
            <el-col :span="12">
                <el-form-item label="属性名称" prop="modelName">
                  <el-input v-model="form.modelName" placeholder="例如：实时温度" />
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item label="标识符" prop="identifier">
                  <el-input v-model="form.identifier" placeholder="例如：temperature" />
                </el-form-item>
            </el-col>
        </el-row>

        <el-form-item label="数据类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择数据类型" style="width: 100%">
            <el-option label="整数 (int)" value="int" />
            <el-option label="浮点数 (float)" value="float" />
            <el-option label="布尔 (bool)" value="bool" />
            <el-option label="枚举 (enum)" value="enum" />
            <el-option label="字符串 (string)" value="string" />
          </el-select>
        </el-form-item>

        <el-form-item label="数据定义" prop="specs">
          <el-input 
            v-model="form.specs" 
            type="textarea" 
            :rows="4" 
            placeholder='请输入JSON格式配置，例如：{"unit": "°C", "min": -20, "max": 80}' 
          />
        </el-form-item>

        <el-form-item label="列表展示" prop="isMonitor">
          <el-radio-group v-model="form.isMonitor">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
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

<script setup name="Model">
import { listModel, getModel, delModel, addModel, updateModel } from "@/api/binZhou/ld/iot/model"
import { listProduct } from "@/api/binZhou/ld/iot/product"; // 【新增】引入产品API
import { getCurrentInstance, reactive, ref, toRefs } from "vue"; // 【新增】引入Vue核心

const { proxy } = getCurrentInstance()

const modelList = ref([])
const productList = ref([]) // 【新增】产品列表
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
    productId: null,
    identifier: null,
    modelName: null,
    isMonitor: null
  },
  rules: {
    productId: [
      { required: true, message: "请选择关联产品", trigger: "change" }
    ],
    identifier: [
      { required: true, message: "标识符不能为空", trigger: "blur" }
    ],
    modelName: [
      { required: true, message: "属性名称不能为空", trigger: "blur" }
    ],
    type: [
      { required: true, message: "数据类型不能为空", trigger: "change" }
    ],
    isMonitor: [
      { required: true, message: "请选择是否展示", trigger: "change" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 【新增】获取产品列表用于下拉框 */
function getProductList() {
   listProduct({ pageNum: 1, pageSize: 100 }).then(response => {
       productList.value = response.rows || [];
   });
}

/** 【新增】格式化产品名称 */
function formatProductName(productId) {
    if (!productId || productList.value.length === 0) return productId;
    const found = productList.value.find(p => p.productId === productId);
    return found ? found.productName : productId;
}

/** 查询物模型列表 */
function getList() {
  loading.value = true
  listModel(queryParams.value).then(response => {
    modelList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

// 取消按钮
function cancel() {
  open.value = false
  reset()
}

// 表单重置
function reset() {
  form.value = {
    modelId: null,
    productId: null,
    identifier: null,
    modelName: null,
    type: null,
    specs: null,
    isMonitor: 1 // 默认选中展示
  }
  proxy.resetForm("modelRef")
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

// 多选框选中数据
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.modelId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加物模型定义"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _modelId = row.modelId || ids.value
  getModel(_modelId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改物模型定义"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["modelRef"].validate(valid => {
    if (valid) {
      if (form.value.modelId != null) {
        updateModel(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addModel(form.value).then(response => {
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
  const _modelIds = row.modelId || ids.value
  proxy.$modal.confirm('是否确认删除物模型定义编号为"' + _modelIds + '"的数据项？').then(function() {
    return delModel(_modelIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('iot/model/export', {
    ...queryParams.value
  }, `model_${new Date().getTime()}.xlsx`)
}

// 初始化加载
getList();
getProductList(); // 加载产品下拉框数据
</script>