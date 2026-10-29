<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="关联模板" prop="templateId">
        <el-select v-model="queryParams.templateId" placeholder="请选择关联模板" filterable clearable style="width: 200px;">
          <el-option
            v-for="item in templateOptions"
            :key="item.id"
            :label="item.templateName"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="监测指标" prop="indicatorCode">
        <el-select v-model="queryParams.indicatorCode" placeholder="请选择监测指标" clearable style="width: 200px;">
          <el-option
            v-for="item in indicatorOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="预警等级" prop="level">
        <el-select v-model="queryParams.level" placeholder="请选择预警等级" clearable style="width: 200px;">
          <el-option
            v-for="dict in wr_warning_level"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['wr:rule:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['wr:rule:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['wr:rule:remove']">删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['wr:rule:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="ruleList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="关联模板名称" align="center" prop="templateName" show-overflow-tooltip min-width="150" />
      <el-table-column label="监测指标" align="center" prop="indicatorCode" />
      <el-table-column label="比较操作" align="center" prop="operator" />
      <el-table-column label="阈值下限" align="center" prop="thresholdMin" />
      <el-table-column label="阈值上限" align="center" prop="thresholdMax" />
      
      <el-table-column label="预警等级" align="center" prop="level">
        <template #default="scope">
          <dict-tag :options="wr_warning_level" :value="scope.row.level"/>
        </template>
      </el-table-column>
      <el-table-column label="触发时间(秒)" align="center" prop="durationSeconds" />
      <el-table-column label="触发类型" align="center" prop="triggerType">
        <template #default="scope">
          <dict-tag :options="wr_trigger_type" :value="scope.row.triggerType"/>
        </template>
      </el-table-column>
      <el-table-column label="逻辑分组" align="center" prop="logicGroup" />
      <el-table-column label="逻辑运算" align="center" prop="logicOperator">
        <template #default="scope">
          <dict-tag :options="wr_logic_operator" :value="scope.row.logicOperator"/>
        </template>
      </el-table-column>
      <el-table-column label="排序号" align="center" prop="sortOrder" width="80" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="150">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['wr:rule:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['wr:rule:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <pagination v-show="total>0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="ruleRef" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="关联模板" prop="templateId">
              <el-select v-model="form.templateId" placeholder="请选择关联模板" filterable clearable style="width: 100%;">
                <el-option
                  v-for="item in templateOptions"
                  :key="item.id"
                  :label="item.templateName"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="监测指标" prop="indicatorCode">
              <el-select v-model="form.indicatorCode" placeholder="请选择监测指标" style="width: 100%;">
                <el-option
                  v-for="item in indicatorOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="比较操作符" prop="operator">
              <el-select v-model="form.operator" placeholder="请选择操作符" style="width: 100%;">
                <el-option
                  v-for="item in operatorOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="预警等级" prop="level">
              <el-select v-model="form.level" placeholder="请选择预警等级" style="width: 100%;">
                <el-option
                  v-for="dict in wr_warning_level"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item :label="'阈值下限' + (currentUnit ? ' (' + currentUnit + ')' : '')" prop="thresholdMin">
              <el-input-number v-model="form.thresholdMin" placeholder="请输入下限" style="width: 100%;" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'阈值上限' + (currentUnit ? ' (' + currentUnit + ')' : '')" prop="thresholdMax">
              <el-input-number v-model="form.thresholdMax" placeholder="请输入上限" style="width: 100%;" controls-position="right" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="触发类型" prop="triggerType">
              <el-select v-model="form.triggerType" placeholder="请选择触发类型" style="width: 100%;">
                <el-option
                  v-for="dict in wr_trigger_type"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="触发时间" prop="durationSeconds">
              <el-input-number v-model="form.durationSeconds" :min="0" placeholder="持续秒数" style="width: 100%;" controls-position="right" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="逻辑分组" prop="logicGroup">
              <el-input v-model="form.logicGroup" placeholder="多指标组合时用" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="逻辑运算符" prop="logicOperator">
              <el-select v-model="form.logicOperator" placeholder="请选择逻辑运算符" clearable style="width: 100%;">
                <el-option
                  v-for="dict in wr_logic_operator"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="排序号" prop="sortOrder">
              <el-input-number v-model="form.sortOrder" :min="1" placeholder="执行顺序" style="width: 100%;" controls-position="right" />
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

<script setup name="Rule">
import { computed, getCurrentInstance, reactive, ref, toRefs } from "vue"
import { listRule, getRule, delRule, addRule, updateRule } from "@/api/binZhou/wr/rule"
// 【新增】引入模板查询接口
import { listTemplate } from "@/api/binZhou/wr/template"

const { proxy } = getCurrentInstance()
const { wr_warning_level, wr_trigger_type, wr_logic_operator } = proxy.useDict('wr_warning_level', 'wr_trigger_type', 'wr_logic_operator');

// 气象灾害监测指标：低温冻害、干热风
const indicatorOptions = [
  { label: '气温 AIR_TEMP', value: 'AIR_TEMP', unit: '℃' },
  { label: '空气湿度 AIR_HUMIDITY', value: 'AIR_HUMIDITY', unit: '%' },
  { label: '风速 WIND_SPEED', value: 'WIND_SPEED', unit: 'm/s' }
];

// 根据监测指标自动显示单位
const currentUnit = computed(() => {
  const item = indicatorOptions.find(
    item => item.value === form.value.indicatorCode
  )
  return item ? item.unit : ''
})


// 根据监测指标自动匹配允许的比较操作符
const operatorOptions = computed(() => {
  const code = form.value.indicatorCode

  if (code === 'WIND_SPEED') {
    return [
      { label: '大于 (>)', value: '>' },
      { label: '大于等于 (>=)', value: '>=' }
    ]
  }

  if (code === 'AIR_HUMIDITY') {
    return [
      { label: '小于 (<)', value: '<' },
      { label: '小于等于 (<=)', value: '<=' },
      { label: '大于 (>)', value: '>' },
      { label: '大于等于 (>=)', value: '>=' }
    ]
  }

  // AIR_TEMP
  return [
    { label: '大于 (>)', value: '>' },
    { label: '小于 (<)', value: '<' },
    { label: '等于 (=)', value: '=' },
    { label: '大于等于 (>=)', value: '>=' },
    { label: '小于等于 (<=)', value: '<=' }
  ]
})

// 【新增】存储模板下拉框数据
const templateOptions = ref([]);

// 【新增】获取模板列表方法
function getTemplateOptions() {
  listTemplate().then(response => {
    templateOptions.value = response.rows;
  });
}
// 初始化时调用
getTemplateOptions();

const ruleList = ref([])
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
    templateId: undefined,
    indicatorCode: undefined,
    level: undefined
  },
  rules: {
    templateId: [
      { required: true, message: "关联模板不能为空", trigger: "change" }
    ],
    indicatorCode: [
      { required: true, message: "监测指标不能为空", trigger: "blur" }
    ],
    operator: [
      { required: true, message: "比较操作符不能为空", trigger: "change" }
    ],
    level: [
      { required: true, message: "预警等级不能为空", trigger: "change" }
    ],
    triggerType: [
      { required: true, message: "触发类型不能为空", trigger: "change" }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询预警模板规则列表 */
function getList() {
  loading.value = true
  listRule(queryParams.value).then(response => {
    ruleList.value = response.rows
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
    templateId: null,
    indicatorCode: null,
    operator: null,
    thresholdMin: null,
    thresholdMax: null,
    level: null,
    durationSeconds: null,
    triggerType: null,
    logicGroup: null,
    logicOperator: null,
    sortOrder: null
  }
  proxy.resetForm("ruleRef")
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
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加预警模板规则"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _id = row.id || ids.value
  getRule(_id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改预警模板规则"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["ruleRef"].validate(valid => {
    if (valid) {
      if (form.value.id != null) {
        updateRule(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addRule(form.value).then(() => {
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
  proxy.$modal.confirm('是否确认删除预警模板规则编号为"' + _ids + '"的数据项？').then(function() {
    return delRule(_ids)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('wr/rule/export', {
    ...queryParams.value
  }, `rule_${new Date().getTime()}.xlsx`)
}

getList()
</script>