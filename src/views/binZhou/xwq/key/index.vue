<template>
  <div class="key-page">
    <!-- 顶部概览 -->
    <!-- <div class="key-hero">
      <div class="hero-left">
        <el-tag effect="dark" class="hero-tag">智慧农业 · API 密钥管理</el-tag>
        <h2 class="hero-title">密钥管理中心</h2>
        <p class="hero-desc">
          统一维护第三方大模型、云服务、自建模型服务的 API Key、Secret Key 与基础调用地址。
        </p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat-card">
          <div class="stat-num">{{ total }}</div>
          <div class="stat-label">密钥总数</div>
        </div>

        <div class="hero-stat-card">
          <div class="stat-num">{{ providerCount }}</div>
          <div class="stat-label">服务商数量</div>
        </div>

        <div class="hero-stat-card">
          <div class="stat-num">{{ bindModelCount }}</div>
          <div class="stat-label">已关联模型</div>
        </div>
      </div>
    </div> -->

    <!-- 查询区 -->
    <el-card class="query-card" shadow="hover">
      <!-- <template #header>
        <div class="card-header">
          <span class="card-title">筛选条件</span>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
        </div>
      </template> -->

      <el-form
        :model="queryParams"
        ref="queryRef"
        :inline="true"
        v-show="showSearch"
        label-width="80px"
        class="query-form"
      >
        <el-form-item label="密钥名称" prop="keyName">
          <el-input
            v-model="queryParams.keyName"
            placeholder="请输入密钥名称"
            clearable
            style="width: 220px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="服务商" prop="keyProviderName">
          <el-input
            v-model="queryParams.keyProviderName"
            placeholder="如：阿里云、百度、自建模型"
            clearable
            style="width: 240px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="模型序号" prop="keyModelId">
          <el-input
            v-model="queryParams.keyModelId"
            placeholder="关联模型序号"
            clearable
            style="width: 160px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <!-- <div>
            <span class="card-title">密钥列表</span>
            <span class="table-subtitle">敏感字段默认脱敏展示，编辑时可查看完整内容</span>
          </div> -->

          <div class="table-actions">
            <el-button
              type="primary"
              plain
              icon="Plus"
              @click="handleAdd"
              v-hasPermi="['xwq:key:add']"
            >
              新增密钥
            </el-button>

            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['xwq:key:edit']"
            >
              修改
            </el-button>

            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['xwq:key:remove']"
            >
              删除
            </el-button>

            <el-button
              type="warning"
              plain
              icon="Download"
              @click="handleExport"
              v-hasPermi="['xwq:key:export']"
            >
              导出
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="keyList"
        border
        stripe
        class="key-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column label="序号" align="center" width="80">
          <template #default="{ $index }">
            {{ (queryParams.pageNum - 1) * queryParams.pageSize + $index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="密钥名称" prop="keyName" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="key-name-cell">
              <div class="key-icon">
                {{ getProviderShortName(row.keyProviderName) }}
              </div>
              <div class="key-name-info">
                <div class="key-name">{{ row.keyName || '-' }}</div>
                <div class="provider-name">{{ row.keyProviderName || '未设置服务商' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="服务商" prop="keyProviderName" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getProviderTag(row.keyProviderName)" effect="plain">
              {{ row.keyProviderName || '未设置' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="API Key" prop="keyApiKey" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="secret-cell">
              <span class="secret-text">{{ maskSecret(row.keyApiKey) }}</span>
              <el-button
                v-if="row.keyApiKey"
                link
                type="primary"
                size="small"
                @click="copyText(row.keyApiKey, 'API Key')"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Secret Key" prop="keySecret" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="secret-cell">
              <span class="secret-text">{{ maskSecret(row.keySecret) }}</span>
              <el-button
                v-if="row.keySecret"
                link
                type="primary"
                size="small"
                @click="copyText(row.keySecret, 'Secret Key')"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="基础地址" prop="keyBaseUrl" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="url-cell">
              <el-tooltip
                :content="row.keyBaseUrl || '未配置基础地址'"
                placement="top"
                effect="dark"
              >
                <span class="url-text">{{ row.keyBaseUrl || '未配置' }}</span>
              </el-tooltip>
              <el-button
                v-if="row.keyBaseUrl"
                link
                type="primary"
                size="small"
                @click="copyText(row.keyBaseUrl, '基础地址')"
              >
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="关联模型" prop="keyModelId" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.keyModelId" type="success" effect="plain">
              模型 {{ row.keyModelId }}
            </el-tag>
            <el-tag v-else type="info" effect="plain">未关联</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" prop="createTime" width="170" align="center" />

        <el-table-column label="操作" align="center" width="170" fixed="right">
          <template #default="scope">
            <el-button
              link
              type="primary"
              icon="Edit"
              @click="handleUpdate(scope.row)"
              v-hasPermi="['xwq:key:edit']"
            >
              修改
            </el-button>

            <el-button
              link
              type="danger"
              icon="Delete"
              @click="handleDelete(scope.row)"
              v-hasPermi="['xwq:key:remove']"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </el-card>

    <!-- 添加或修改密钥管理对话框 -->
    <el-dialog
      :title="title"
      v-model="open"
      width="780px"
      append-to-body
      class="key-dialog"
      destroy-on-close
    >
      <el-alert
        title="提示：API Key 与 Secret Key 属于敏感信息，请仅用于后端服务调用，避免在前端页面长期明文展示。"
        type="warning"
        show-icon
        :closable="false"
        class="key-alert"
      />

      <el-form ref="keyRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="密钥名称" prop="keyName">
              <el-input v-model="form.keyName" placeholder="请输入密钥名称" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="服务商" prop="keyProviderName">
              <el-select
                v-model="form.keyProviderName"
                placeholder="请选择或输入服务商"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option label="阿里云" value="阿里云" />
                <el-option label="百度" value="百度" />
                <el-option label="腾讯云" value="腾讯云" />
                <el-option label="OpenAI" value="OpenAI" />
                <el-option label="自建模型服务" value="自建模型服务" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="API Key" prop="keyApiKey">
              <el-input
                v-model="form.keyApiKey"
                placeholder="请输入 API Key"
                show-password
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="Secret Key" prop="keySecret">
              <el-input
                v-model="form.keySecret"
                placeholder="请输入 Secret Key"
                show-password
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="基础地址" prop="keyBaseUrl">
              <el-input
                v-model="form.keyBaseUrl"
                placeholder="请输入模型或第三方服务接口基础地址，如：https://dashscope.aliyuncs.com"
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="关联模型序号" prop="keyModelId">
              <el-input-number
                v-model="form.keyModelId"
                :min="1"
                :step="1"
                controls-position="right"
                placeholder="请输入模型序号"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="备用标识" prop="keyA">
              <el-input v-model="form.keyA" placeholder="如：default / main / backup" clearable />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <div class="form-tip">
              建议：如果该密钥服务于某个 AI 模型，请填写关联模型序号；如果是通用第三方服务密钥，可不关联模型。
            </div>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Key">
import { computed, getCurrentInstance, reactive, ref, toRefs } from 'vue'
import { listKey, getKey, delKey, addKey, updateKey } from '@/api/binZhou/xwq/key'

const { proxy } = getCurrentInstance()

const keyList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')

const providerCount = computed(() => {
  const set = new Set()
  keyList.value.forEach(item => {
    if (item.keyProviderName) set.add(item.keyProviderName)
  })
  return set.size
})

const bindModelCount = computed(() => {
  return keyList.value.filter(item => item.keyModelId !== null && item.keyModelId !== undefined && item.keyModelId !== '').length
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyName: undefined,
    keyProviderName: undefined,
    keyApiKey: undefined,
    keySecret: undefined,
    keyBaseUrl: undefined,
    keyModelId: undefined
  },
  rules: {
    keyName: [
      { required: true, message: '密钥名称不能为空', trigger: 'blur' }
    ],
    keyProviderName: [
      { required: true, message: '服务商不能为空', trigger: 'change' }
    ],
    keyApiKey: [
      { required: true, message: 'API Key 不能为空', trigger: 'blur' }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询密钥管理列表 */
function getList() {
  loading.value = true
  listKey(queryParams.value).then(response => {
    keyList.value = response.rows || []
    total.value = response.total || 0
    loading.value = false
  }).catch(() => {
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
    keyId: null,
    keyName: null,
    keyProviderName: null,
    keyApiKey: null,
    keySecret: null,
    keyBaseUrl: null,
    keyModelId: null,
    keyA: null,
    keyB: null,
    keyC: null,
    keyD: null,
    keyE: null,
    keyF: null,
    keyG: null,
    keyH: null,
    keyI: null,
    keyJ: null
  }

  proxy.resetForm('keyRef')
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.keyId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = '新增密钥'
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const _keyId = row.keyId || ids.value

  getKey(_keyId).then(response => {
    form.value = response.data || {}
    open.value = true
    title.value = '修改密钥'
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs.keyRef.validate(valid => {
    if (!valid) return

    if (form.value.keyId != null) {
      updateKey(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addKey(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const _keyIds = row.keyId || ids.value

  proxy.$modal.confirm(`是否确认删除密钥编号为 "${_keyIds}" 的数据项？`).then(() => {
    return delKey(_keyIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('xwq/key/export', {
    ...queryParams.value
  }, `key_${new Date().getTime()}.xlsx`)
}

/** 敏感字段脱敏 */
function maskSecret(value) {
  if (!value) return '未配置'

  const text = String(value)

  if (text.length <= 8) {
    return text.slice(0, 2) + '****' + text.slice(-2)
  }

  return text.slice(0, 4) + '****' + text.slice(-4)
}

/** 复制内容 */
function copyText(text, label) {
  if (!text) return

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      proxy.$modal.msgSuccess(`${label} 已复制`)
    })
  } else {
    const input = document.createElement('input')
    input.value = text
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    proxy.$modal.msgSuccess(`${label} 已复制`)
  }
}

function getProviderTag(provider) {
  if (!provider) return 'info'
  if (provider.includes('阿里')) return 'warning'
  if (provider.includes('百度')) return 'primary'
  if (provider.includes('腾讯')) return 'success'
  if (provider.includes('OpenAI')) return 'danger'
  if (provider.includes('自建')) return 'info'
  return 'info'
}

function getProviderShortName(provider) {
  if (!provider) return 'K'
  if (provider.includes('阿里')) return '阿'
  if (provider.includes('百度')) return '百'
  if (provider.includes('腾讯')) return '腾'
  if (provider.includes('OpenAI')) return 'O'
  if (provider.includes('自建')) return '自'
  return provider.substring(0, 1).toUpperCase()
}

getList()
</script>

<style scoped>
.key-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 顶部 Banner */
.key-hero {
  background: linear-gradient(135deg, #2f6f3e 0%, #52b052 58%, #9adf9a 100%);
  border-radius: 14px;
  padding: 26px 30px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.key-hero::after {
  content: "";
  position: absolute;
  right: -60px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
}

.hero-left {
  position: relative;
  z-index: 1;
}

.hero-tag {
  background: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  margin-bottom: 10px;
}

.hero-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
}

.hero-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.88;
}

.hero-stats {
  display: flex;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.hero-stat-card {
  min-width: 110px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.18);
  text-align: center;
  backdrop-filter: blur(4px);
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
}

.stat-label {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.82;
}

/* 卡片 */
.query-card,
.table-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}

.card-header,
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.table-subtitle {
  display: block;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.query-form {
  margin-bottom: -12px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 表格 */
.key-table {
  --el-table-header-bg-color: #f0f9f0;
  --el-table-header-text-color: #2f6f3e;
}

.key-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.key-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #e8f7e8, #d4f0d4);
  color: #2f6f3e;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.key-name-info {
  overflow: hidden;
}

.key-name {
  font-weight: 700;
  color: #303133;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-name {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.secret-cell,
.url-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.secret-text {
  flex: 1;
  min-width: 0;
  font-family: Consolas, Monaco, monospace;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 3px 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-text {
  flex: 1;
  min-width: 0;
  color: #409eff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 弹窗 */
.key-alert {
  margin-bottom: 18px;
}

:deep(.key-dialog .el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
  padding: 18px 22px;
}

:deep(.key-dialog .el-dialog__body) {
  padding: 20px 24px 8px;
}

.form-tip {
  background: #f0f9ff;
  color: #606266;
  border-left: 4px solid #409eff;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式 */
@media screen and (max-width: 1200px) {
  .key-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
  }

  .hero-stats {
    width: 100%;
  }

  .hero-stat-card {
    flex: 1;
  }
}
</style>