<template>
  <el-dialog
    :model-value="modelValue"
    title="批量导入农事记录"
    width="560px"
    append-to-body
    @update:model-value="updateOpen"
    @closed="resetImportFile"
  >
    <div class="import-dialog">
      <div class="import-section">
        <div class="import-section-main">
          <h4>下载模板</h4>
          <p>请先下载模板并按要求填写。任务编号可手动填写，也可留空由系统按 RWyyyyMMddNNNN 规则自动生成；手动填写的编号不得重复。</p>
        </div>
        <el-button type="primary" plain icon="Download" @click="downloadImportTemplate">下载模板</el-button>
      </div>
      <div class="import-section">
        <div class="import-section-main">
          <h4>上传本地文件</h4>
          <p>支持 .xls / .xlsx 文件。系统将校验任务编号格式、文件内重复及数据库重复；空白任务编号将在导入时自动生成。多名操作人请使用英文逗号分隔。</p>
        </div>
        <el-upload
          ref="importUploadRef"
          class="import-upload"
          accept=".xls,.xlsx"
          :auto-upload="false"
          :limit="1"
          :on-change="handleImportFileChange"
          :on-remove="handleImportFileRemove"
          :on-exceed="handleImportFileExceed"
        >
          <el-button icon="Upload">选择文件</el-button>
        </el-upload>
      </div>
      <el-alert
        title="农事图片不从 Excel 导入，导入成功后可在记录编辑页面上传图片。"
        type="success"
        :closable="false"
        show-icon
      />
    </div>

    <template #footer>
      <el-button @click="closeImportDialog">取消</el-button>
      <el-button type="primary" :loading="importUploading" :disabled="!importFile || importUploading" @click="submitImportFile">开始导入</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, nextTick, getCurrentInstance, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { importFarmerTask, downloadFarmerImportTemplate } from '@/api/binZhou/ylm/task'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const { proxy } = getCurrentInstance()
const importUploading = ref(false)
const importFile = ref(null)
const importUploadRef = ref(null)

watch(() => props.modelValue, value => {
  if (value) {
    resetImportFile()
  }
})

function updateOpen(value) {
  emit('update:modelValue', value)
  if (!value) {
    resetImportFile()
  }
}

function resetImportFile() {
  importFile.value = null
  nextTick(() => importUploadRef.value?.clearFiles())
}

function closeImportDialog() {
  emit('update:modelValue', false)
  resetImportFile()
}

async function downloadImportTemplate() {
  try {
    const response = await downloadFarmerImportTemplate()
    const blob = response?.data
    if (!(blob instanceof Blob)) {
      proxy.$modal.msgError('模板下载失败：响应数据异常')
      return
    }
    if (blob.type && blob.type.indexOf('application/json') !== -1) {
      proxy.$modal.msgError(await readBlobError(blob))
      return
    }
    const filename = getDownloadFilename(response.headers) || `农事记录导入模板_${new Date().getTime()}.xlsx`
    downloadBlob(blob, filename)
  } catch (error) {
    const errorBlob = error?.response?.data
    if (errorBlob instanceof Blob && errorBlob.type && errorBlob.type.indexOf('application/json') !== -1) {
      proxy.$modal.msgError(await readBlobError(errorBlob))
      return
    }
    proxy.$modal.msgError(error?.message || '模板下载失败，请稍后重试')
  }
}

function handleImportFileChange(uploadFile) {
  const file = uploadFile?.raw || null
  if (!validateImportFile(file)) {
    resetImportFile()
    return
  }
  importFile.value = file
}

function handleImportFileRemove() {
  importFile.value = null
}

function handleImportFileExceed(files) {
  const file = files?.[0]
  importUploadRef.value?.clearFiles()
  if (file) {
    importUploadRef.value?.handleStart(file)
  }
}

function submitImportFile() {
  if (importUploading.value) {
    return
  }
  if (!importFile.value) {
    proxy.$modal.msgWarning('请先选择需要导入的 Excel 文件')
    return
  }
  if (!validateImportFile(importFile.value)) {
    return
  }
  const formData = new FormData()
  formData.append('file', importFile.value)
  importUploading.value = true
  importFarmerTask(formData).then(res => {
    if (Number(res?.code) !== 200) {
      showImportErrors(res)
      return
    }
    proxy.$modal.msgSuccess(res.msg || `成功导入 ${res.count || 0} 条农事记录`)
    closeImportDialog()
    emit('success')
  }).catch(error => {
    proxy.$modal.msgError(error?.message || '导入失败，请稍后重试')
  }).finally(() => {
    importUploading.value = false
  })
}

function validateImportFile(file) {
  if (!file) {
    return false
  }
  const fileName = file.name || ''
  if (!/\.(xls|xlsx)$/i.test(fileName)) {
    proxy.$modal.msgWarning('请上传 .xls 或 .xlsx 格式的文件')
    return false
  }
  if (file.size <= 0) {
    proxy.$modal.msgWarning('上传文件不能为空')
    return false
  }
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    proxy.$modal.msgWarning('上传文件不能超过 10MB')
    return false
  }
  return true
}

function showImportErrors(res) {
  const errors = Array.isArray(res?.errors) ? res.errors : (Array.isArray(res?.data) ? res.data : [])
  if (!errors.length) {
    proxy.$modal.msgError(res?.msg || '导入失败')
    return
  }
  const visibleErrors = errors.slice(0, 50)
  const moreText = errors.length > visibleErrors.length ? `<br/>其余 ${errors.length - visibleErrors.length} 条错误请修正后重新导入。` : ''
  const content = `<div class="import-error-message"><p>${escapeImportHtml(res?.msg || '导入失败')}</p><p>${visibleErrors.map(item => escapeImportHtml(item)).join('<br/>')}</p>${moreText}</div>`
  ElMessageBox.alert(content, '导入失败', {
    type: 'error',
    dangerouslyUseHTMLString: true,
    customClass: 'import-error-alert',
    confirmButtonText: '知道了'
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getDownloadFilename(headers = {}) {
  const getHeader = name => headers?.[name] || headers?.get?.(name)
  const downloadFilename = getHeader('download-filename') || getHeader('Download-Filename')
  if (downloadFilename) {
    return decodeDownloadFilename(downloadFilename)
  }
  const disposition = getHeader('content-disposition') || getHeader('Content-Disposition')
  if (!disposition) {
    return ''
  }
  const utf8Match = disposition.match(/filename\*=utf-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeDownloadFilename(utf8Match[1])
  }
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] ? decodeDownloadFilename(filenameMatch[1]) : ''
}

function decodeDownloadFilename(filename) {
  try {
    return decodeURIComponent(filename)
  } catch (error) {
    return filename
  }
}

async function readBlobError(blob) {
  try {
    const text = await blob.text()
    const data = JSON.parse(text)
    return data.msg || '模板下载失败'
  } catch (error) {
    return '模板下载失败'
  }
}

function escapeImportHtml(value) {
  const text = value === undefined || value === null || value === '' ? '' : String(value)
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
</script>

<style scoped>
.import-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.import-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: #f7fbf6;
  border: 1px solid #d7e8d4;
  border-radius: 1px;
}

.import-section-main {
  min-width: 0;
}

.import-section-main h4 {
  margin: 0 0 6px;
  color: #214332;
  font-size: 15px;
  font-weight: 800;
}

.import-section-main p {
  margin: 0;
  color: #6f8374;
  font-size: 13px;
  line-height: 1.6;
}

.import-upload {
  flex: 0 0 auto;
}

.import-dialog :deep(.el-button) {
  border-radius: 1px;
}

:global(.import-error-alert) {
  max-width: 720px;
}

:global(.import-error-message) {
  max-height: 420px;
  overflow-y: auto;
  line-height: 1.8;
  color: #223f30;
}

:global(.import-error-message p) {
  margin: 0 0 10px;
}
</style>
