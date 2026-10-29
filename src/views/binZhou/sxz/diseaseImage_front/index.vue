<template>
  <div class="image-page">
    <header class="topbar">
      <div class="brand"></div>
      <nav class="nav-list" aria-label="病害功能导航">
        <router-link class="nav-item" to="/disease-analysis">病害分析</router-link>
        <div class="nav-dropdown">
          <button type="button" class="nav-item nav-trigger">
            <span>病害识别</span>
            <el-icon class="nav-caret"><ArrowDown /></el-icon>
          </button>
          <div class="nav-menu">
            <router-link class="nav-menu-item" to="/featureDisease">手动上传</router-link>
            <router-link class="nav-menu-item" to="/sxz/disease-auto-task">自动识别</router-link>
          </div>
        </div>
        <router-link class="nav-item active" to="/disease-images" aria-current="page">识别历史</router-link>
        <router-link class="nav-item" to="/disease-report">病害报告</router-link>
      </nav>
      <div class="top-actions">
        <!-- <button class="refresh" :disabled="loading" @click="loadImages"><el-icon><Refresh /></el-icon>刷新</button> -->
        <button type="button" class="home-button" @click="router.push('/home')">
          <el-icon><House /></el-icon>
          <span>返回首页</span>
        </button>
      </div>
    </header>

    <main>
      <section class="heading-row">
        <div><h1>{{ workspaceTitle }}</h1><p>{{ workspaceDescription }}</p></div>
      </section>

      <section class="workspace-bar">
        <div class="workspace-switch" role="tablist" aria-label="识别图片类型">
          <button type="button" :class="{ active: workspace === 'manual' }" role="tab" :aria-selected="workspace === 'manual'" @click="switchWorkspace('manual')">
            <span class="workspace-icon manual"><el-icon><UploadFilled /></el-icon></span>
            <span><b>手动识别图片</b><small>用户上传并主动识别</small></span>
          </button>
          <button type="button" :class="{ active: workspace === 'auto' }" role="tab" :aria-selected="workspace === 'auto'" @click="switchWorkspace('auto')">
            <span class="workspace-icon auto"><el-icon><CameraFilled /></el-icon></span>
            <span><b>自动识别图片</b><small>设备巡检与定时识别</small></span>
          </button>
        </div>
        <span class="workspace-tip">{{ workspaceTip }}</span>
      </section>

      <section class="filter-panel">
        <div class="filters">
          <el-input v-model="query.imageName" clearable placeholder="图片名称" @keyup.enter="search"><template #prefix><el-icon><Search /></el-icon></template></el-input>
          <el-input v-model="query.diseaseName" clearable placeholder="病虫害名称" @keyup.enter="search" />
          <template v-if="workspace === 'auto'">
            <el-input v-model="query.taskName" clearable placeholder="任务名称" @keyup.enter="search" />
            <el-input v-model="query.deviceName" clearable placeholder="设备名称" @keyup.enter="search" />
          </template>
          <el-date-picker v-model="dateRange" class="date-filter" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" @change="handleDateChange" />
          <el-button type="primary" :icon="Search" @click="search">查询</el-button>
          <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
        </div>
      </section>

      <section v-loading="loading" class="gallery" element-loading-text="正在加载识别图片">
        <el-empty v-if="!loading && !images.length" :description="emptyDescription" />
        <div v-else class="image-grid">
          <article v-for="item in images" :key="resultKey(item)" class="image-card" :class="workspace" @click="openDetail(item)">
            <div class="image-stage">
              <el-image :src="displayUrl(item)" fit="cover" lazy>
                <template #error><div class="image-error"><el-icon><Picture /></el-icon><span>图片无法加载</span></div></template>
              </el-image>
              <span :class="['result-status', isHealthy(item.diseaseName) ? 'healthy' : 'disease']">{{ isHealthy(item.diseaseName) ? '健康' : '检出病害' }}</span>
            </div>
            <div class="card-body">
              <div class="card-title"><strong>{{ item.diseaseName || '未知病虫害' }}</strong><b>{{ formatConfidence(item.confidence) }}</b></div>
              <p v-if="workspace === 'auto'"><el-icon><Camera /></el-icon>{{ item.deviceName || '未关联设备' }}</p>
              <p v-else><el-icon><UploadFilled /></el-icon>{{ item.imageName || '未命名图片' }}</p>
              <p><el-icon><Clock /></el-icon>{{ formatTime(item.recognitionTime || item.uploadTime) }}</p>
              <div class="card-footer">
                <span>{{ workspace === 'auto' ? (item.parkName || item.taskName || '未关联任务') : displayCropType(item.cropType) }}</span>
                <button type="button" @click.stop="openDetail(item)">查看详情 <el-icon><ArrowRight /></el-icon></button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <el-pagination v-if="total" v-model:current-page="query.pageNum" v-model:page-size="query.pageSize" class="pagination" background layout="total, sizes, prev, pager, next, jumper" :page-sizes="[12, 24, 48]" :total="total" @current-change="loadImages" @size-change="handleSizeChange" />
    </main>

    <el-drawer v-model="detailDrawer" title="识别图片详情" size="520px" destroy-on-close>
      <div v-if="activeImage" class="detail-content">
        <div class="detail-image-wrap">
          <el-image class="detail-image" :src="displayUrl(activeImage)" fit="contain" :preview-src-list="[displayUrl(activeImage)]" preview-teleported>
            <template #error><div class="image-error"><el-icon><Picture /></el-icon><span>图片暂不可用</span></div></template>
          </el-image>
          <el-radio-group v-if="hasResultImage(activeImage)" v-model="imageModes[resultKey(activeImage)]" class="detail-mode" size="small">
            <el-radio-button value="original">原始图片</el-radio-button><el-radio-button value="result">识别结果图</el-radio-button>
          </el-radio-group>
        </div>
        <div class="detail-title"><div><small>{{ workspace === 'manual' ? '手动上传识别' : '自动定时识别' }}</small><h3>{{ activeImage.diseaseName || '未知病虫害' }}</h3></div><strong>{{ formatConfidence(activeImage.confidence) }}</strong></div>
        <el-descriptions class="detail-descriptions" :column="1" border>
          <el-descriptions-item label="作物类型">{{ displayCropType(activeImage.cropType) }}</el-descriptions-item>
          <el-descriptions-item label="识别模型">{{ activeImage.modelName || '未记录' }}</el-descriptions-item>
          <el-descriptions-item v-if="workspace === 'auto'" label="自动任务">{{ activeImage.taskName || '未关联任务' }}</el-descriptions-item>
          <el-descriptions-item v-if="workspace === 'auto'" label="园区设备">{{ activeImage.parkName || '未关联园区' }} / {{ activeImage.deviceName || '未关联设备' }}</el-descriptions-item>
          <el-descriptions-item v-if="workspace === 'auto'" label="抓拍时间">{{ formatTime(activeImage.captureTime) }}</el-descriptions-item>
          <el-descriptions-item v-else label="上传时间">{{ formatTime(activeImage.uploadTime) }}</el-descriptions-item>
          <el-descriptions-item label="识别时间">{{ formatTime(activeImage.recognitionTime) }}</el-descriptions-item>
          <el-descriptions-item label="预警等级">{{ activeImage.warningLevel || '未标记' }}</el-descriptions-item>
          <el-descriptions-item label="识别结论">{{ activeImage.diseaseResult || '暂无结论' }}</el-descriptions-item>
          <el-descriptions-item label="症状描述">{{ activeImage.diseaseDesc || '暂无描述' }}</el-descriptions-item>
          <el-descriptions-item label="防治建议">{{ activeImage.diseaseAdvice || '暂无建议' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown, ArrowRight, Camera, CameraFilled, Clock, House, Picture, RefreshLeft, Search, UploadFilled } from '@element-plus/icons-vue'
import { listDiseaseImages } from '@/api/binZhou/sxz/diseaseImage'

const router = useRouter()
const loading = ref(false)
const images = ref([])
const total = ref(0)
const detailDrawer = ref(false)
const activeImage = ref(null)
const imageModes = reactive({})
const workspace = ref('manual')
const dateRange = ref([])
const query = reactive({ pageNum: 1, pageSize: 12, imageName: '', diseaseName: '', recordMode: '手动上传', taskName: '', deviceName: '', beginTime: '', endTime: '' })
const workspaceTitle = computed(() => workspace.value === 'manual' ? '手动识别图片' : '自动识别图片')
const workspaceDescription = computed(() => workspace.value === 'manual' ? '查看用户上传图片产生的病虫害识别成果' : '查看设备巡检与定时任务产生的病虫害识别成果')
const workspaceTip = computed(() => workspace.value === 'manual' ? '聚焦文件、作物和模型识别信息' : '聚焦任务、园区、设备和抓拍来源')
const emptyDescription = computed(() => workspace.value === 'manual' ? '暂无手动识别图片' : '暂无自动识别图片')

function normalizeUrl(url) {
  if (!url) return ''
  if (/^(https?|data|blob):/.test(url)) return url
  const base = import.meta.env.VITE_APP_BASE_API || ''
  return url.startsWith('/') ? base + url : `${base}/${url}`
}

function hasResultImage(item) { return Boolean(item.resultImageUrl && item.resultImageUrl !== item.imageUrl) }
function resultKey(item) { return item.diseaseId || `${item.recordId || 'record'}-${item.imageId || 'image'}` }
function displayUrl(item) {
  const resultMode = imageModes[resultKey(item)] === 'result' && hasResultImage(item)
  return normalizeUrl(resultMode ? item.resultImageUrl : item.imageUrl)
}
function formatConfidence(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number.toFixed(2)}%` : '--'
}
function isHealthy(name) { return ['健康', '健康叶片'].includes(String(name || '').trim()) }
function displayCropType(value) {
  const cropType = String(value || '').trim()
  return !cropType || cropType === '未知作物' || cropType === '小麦' ? '枣树' : cropType
}
function formatTime(value) { return value ? String(value).replace('T', ' ').slice(0, 19) : '暂无记录' }

async function loadImages() {
  loading.value = true
  try {
    const response = await listDiseaseImages(query)
    images.value = response.rows || []
    total.value = Number(response.total || 0)
    images.value.forEach(item => {
      const key = resultKey(item)
      if (!imageModes[key]) imageModes[key] = hasResultImage(item) ? 'result' : 'original'
    })
  } catch (error) {
    images.value = []
    total.value = 0
    ElMessage.error('病虫害识别图片加载失败')
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; loadImages() }
function reset() {
  Object.assign(query, { pageNum: 1, imageName: '', diseaseName: '', recordMode: workspace.value === 'manual' ? '手动上传' : '自动定时', taskName: '', deviceName: '', beginTime: '', endTime: '' })
  dateRange.value = []
  loadImages()
}
function switchWorkspace(value) {
  if (workspace.value === value) return
  workspace.value = value
  images.value = []
  total.value = 0
  reset()
}
function handleDateChange(value) {
  query.beginTime = value?.[0] || ''
  query.endTime = value?.[1] || ''
}
function handleSizeChange() { query.pageNum = 1; loadImages() }
function openDetail(item) { activeImage.value = item; detailDrawer.value = true }
onMounted(loadImages)
</script>

<style scoped>
.image-page { min-height: 100vh; background: #f5f7f8; color: #2d4039; }
.topbar { position: sticky; top: 0; z-index: 30; box-sizing: border-box; height: 88px; padding: 0 32px 0 50px; display: flex; align-items: center; justify-content: space-between; background: #fff; border-bottom: 1px solid #edf1f3; box-shadow: 0 2px 8px rgba(0, 0, 0, .02); }
.brand { width: 0; display: flex; align-items: center; gap: 0; overflow: hidden; font-size: 0; margin-right: 0; white-space: nowrap; }
.brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px; background: #21bd84; color: #fff; }
.nav-list { height: 88px; display: flex; align-items: center; gap: 46px; flex-shrink: 0; }
.nav-item { position: relative; height: 88px; display: flex; align-items: center; color: #65736f; font-size: 18px; font-weight: 500; line-height: 1; text-decoration: none; white-space: nowrap; cursor: pointer; transition: color 220ms ease, transform 220ms ease; touch-action: manipulation; }
.nav-dropdown { position: relative; height: 88px; display: flex; align-items: center; }
.nav-trigger { gap: 6px; padding: 0; border: 0; background: transparent; font-family: inherit; }
.nav-caret { font-size: 13px; transition: transform 200ms ease; }
.nav-dropdown:hover .nav-caret, .nav-dropdown:focus-within .nav-caret { transform: rotate(180deg); }
.nav-menu { position: absolute; top: 72px; left: 50%; z-index: 40; min-width: 150px; padding: 8px; display: grid; gap: 4px; border: 1px solid #ddebe5; border-radius: 8px; background: rgba(255,255,255,.98); box-shadow: 0 16px 34px rgba(32,78,58,.14); opacity: 0; pointer-events: none; visibility: hidden; transform: translate(-50%, 8px) scale(.98); transition: opacity 180ms ease, transform 180ms ease, visibility 180ms ease; }
.nav-menu::before { content: ""; position: absolute; top: -12px; right: 0; left: 0; height: 12px; }
.nav-dropdown:hover .nav-menu, .nav-dropdown:focus-within .nav-menu { opacity: 1; pointer-events: auto; visibility: visible; transform: translate(-50%, 0) scale(1); }
.nav-menu-item { min-height: 36px; padding: 0 14px; display: flex; align-items: center; color: #51635d; font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; border-radius: 6px; transition: color 180ms ease, background 180ms ease, transform 180ms ease; }
.nav-menu-item:hover, .nav-menu-item.active { color: #25794f; background: #eef9f4; }
.nav-menu-item:hover { transform: translateX(2px); }
.nav-item::after { content: ''; position: absolute; right: 8px; bottom: 0; left: 8px; height: 4px; border-radius: 4px 4px 0 0; background: linear-gradient(90deg, #50a879 0%, #5c85e8 100%); opacity: 0; transform: scaleX(.35); transform-origin: center; transition: opacity 220ms ease, transform 220ms cubic-bezier(.22, 1, .36, 1); }
.nav-item:hover { color: #347e59; transform: translateY(-1px); }
.nav-item:hover::after { opacity: .42; transform: scaleX(.6); }
.nav-item:focus-visible { outline: 2px solid rgba(79, 132, 225, .78); outline-offset: -6px; border-radius: 6px; }
.nav-item.active { color: #347e59; font-weight: 700; }
.nav-item.active::after { opacity: 1; transform: scaleX(1); }
.new-badge { font-size: 9px; color: #119b6c; background: #e8faf3; border: 1px solid #c8efdf; padding: 2px 5px; margin-right: 4px; border-radius: 4px; }
.top-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.refresh { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid #dce6e2; border-radius: 6px; background: #fff; color: #3f5d52; cursor: pointer; }
.home-button { min-width: 116px; height: 44px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; color: #2f7d58; font-size: 14px; font-weight: 600; border: 1px solid #c9e4d8; border-radius: 8px; background: linear-gradient(180deg, #fff 0%, #f5fbf8 100%); box-shadow: 0 4px 12px rgba(35,105,76,.08); cursor: pointer; white-space: nowrap; transition: color 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease, transform 200ms ease; }
.home-button .el-icon { font-size: 17px; }
.home-button:hover { color: #1f6f4a; border-color: #8fcbb1; background: #eef9f4; box-shadow: 0 8px 18px rgba(35,105,76,.14); transform: translateY(-1px); }
.home-button:active { box-shadow: 0 3px 8px rgba(35,105,76,.1); transform: translateY(0) scale(.98); }
.home-button:focus-visible { outline: 2px solid rgba(79,132,225,.78); outline-offset: 3px; }
main { padding: 20px 24px 28px; }
.heading-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
h1 { font-size: 22px; margin: 0 0 6px; } .heading-row p { margin: 0; color: #81908a; font-size: 13px; }
.workspace-bar { min-height: 84px; margin-top: 18px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border: 1px solid #e3ebe7; border-radius: 8px; background: #fff; }
.workspace-switch { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 8px; padding: 4px; border: 1px solid #e4ebe8; border-radius: 7px; background: #f4f7f6; }
.workspace-switch button { min-height: 56px; padding: 8px 14px; display: flex; align-items: center; gap: 11px; text-align: left; color: #687771; border: 1px solid transparent; border-radius: 5px; background: transparent; cursor: pointer; transition: color .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease; }
.workspace-switch button:hover { color: #347e59; background: rgba(255,255,255,.7); }
.workspace-switch button.active { color: #267b50; border-color: #c9e5d7; background: #fff; box-shadow: 0 4px 12px rgba(38,91,68,.08); }
.workspace-switch button b, .workspace-switch button small { display: block; letter-spacing: 0; }
.workspace-switch button b { margin-bottom: 4px; font-size: 14px; }
.workspace-switch button small { color: #96a19d; font-size: 11px; font-weight: 400; }
.workspace-icon { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 34px; border-radius: 6px; }
.workspace-icon.manual { color: #2e8a5d; background: #eaf7f0; }
.workspace-icon.auto { color: #4c73ca; background: #edf2fc; }
.workspace-tip { color: #87948f; font-size: 13px; white-space: nowrap; }
.filter-panel { margin-top: 12px; padding: 13px 16px; border: 1px solid #e6ece9; border-radius: 8px; background: #fff; }
.filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.filters :deep(.el-input) { width: 176px; }
.filters :deep(.date-filter) { width: 340px; }
.gallery { min-height: 420px; margin-top: 14px; }
.image-grid { display: grid; grid-template-columns: repeat(4, minmax(240px, 1fr)); gap: 16px; }
.image-card { overflow: hidden; display: flex; min-height: 350px; flex-direction: column; border: 1px solid #e2eae6; border-radius: 7px; background: #fff; box-shadow: 0 3px 12px rgba(35,64,53,.05); cursor: pointer; transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
.image-card:hover { transform: translateY(-3px); border-color: #d1e1da; box-shadow: 0 10px 24px rgba(35,64,53,.11); }
.image-stage { height: 220px; position: relative; flex: 0 0 220px; background: #f1f4f3; }
.image-stage .el-image { width: 100%; height: 100%; }
.result-status { position: absolute; left: 12px; bottom: 12px; padding: 5px 10px; border: 1px solid rgba(255,255,255,.75); border-radius: 4px; background: rgba(255,255,255,.94); box-shadow: 0 3px 10px rgba(39,68,56,.08); font-size: 12px; font-weight: 600; }
.result-status.healthy { color: #258c59; }
.result-status.disease { color: #c25951; }
.image-error { height: 100%; display: flex; gap: 8px; align-items: center; justify-content: center; color: #9aa7a2; }
.image-error .el-icon { font-size: 28px; }
.card-body { padding: 16px 18px 14px; display: flex; flex: 1; flex-direction: column; }
.card-title { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.card-title strong { overflow: hidden; color: #263d34; font-size: 17px; line-height: 24px; text-overflow: ellipsis; white-space: nowrap; }
.card-title b { flex: 0 0 auto; color: #3c8e60; font-size: 17px; font-variant-numeric: tabular-nums; }
.card-body > p { overflow: hidden; margin: 11px 0 0; display: flex; align-items: center; gap: 7px; color: #7f8d87; font-size: 13px; line-height: 19px; text-overflow: ellipsis; white-space: nowrap; }
.card-body > p + p { margin-top: 8px; }
.card-body > p .el-icon { flex: 0 0 auto; color: #899892; font-size: 16px; }
.card-footer { min-height: 32px; margin-top: 14px; padding-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid #edf1ef; color: #8b9792; font-size: 12px; }
.card-footer > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-footer button { padding: 0; display: inline-flex; align-items: center; gap: 3px; flex: 0 0 auto; color: #318b5d; border: 0; background: transparent; font: inherit; font-size: 13px; cursor: pointer; }
.card-footer button .el-icon { font-size: 14px; transition: transform .18s ease; }
.card-footer button:hover .el-icon { transform: translateX(2px); }
.detail-image-wrap { position: relative; min-height: 300px; overflow: hidden; border: 1px solid #e4ebe8; border-radius: 6px; background: #f3f6f5; }
.detail-image { width: 100%; height: 300px; }
.detail-mode { position: absolute; right: 12px; bottom: 12px; padding: 4px; border: 1px solid #e0e9e5; border-radius: 6px; background: rgba(255,255,255,.94); box-shadow: 0 5px 15px rgba(36,70,55,.1); }
.detail-title { margin: 18px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.detail-title small { color: #8b9792; font-size: 12px; }
.detail-title h3 { margin: 4px 0 0; color: #2b4038; font-size: 22px; }
.detail-title > strong { color: #328d5e; font-size: 22px; font-variant-numeric: tabular-nums; }
.detail-content { width: 100%; min-width: 0; overflow-x: hidden; }
.detail-descriptions { width: 100%; max-width: 100%; }
.detail-descriptions :deep(.el-descriptions__body),
.detail-descriptions :deep(.el-descriptions__table) { width: 100%; max-width: 100%; }
.detail-descriptions :deep(.el-descriptions__table) { table-layout: fixed; }
.detail-descriptions :deep(.el-descriptions__label) {
  width: 112px !important;
  min-width: 112px;
  color: #72817b;
  font-weight: 500;
  white-space: nowrap;
  word-break: keep-all;
  writing-mode: horizontal-tb;
}
.detail-descriptions :deep(.el-descriptions__content) {
  min-width: 0;
  color: #344b42;
  line-height: 22px;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.pagination { justify-content: flex-end; margin-top: 20px; }
@media (max-width: 1366px) { .topbar { padding-right: 24px; padding-left: 32px; } .nav-list { gap: 32px; } .nav-item { font-size: 17px; } }
@media (max-width: 1280px) { .image-grid { grid-template-columns: repeat(3,1fr); } }
@media (max-width: 900px) { .topbar { overflow-x: auto; } .heading-row { align-items: stretch; flex-direction: column; } .workspace-bar { align-items: stretch; flex-direction: column; } .workspace-tip { white-space: normal; } .filters { flex-wrap: wrap; } .filters :deep(.date-filter) { width: 100%; } .image-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 560px) { main { padding: 14px; } .workspace-switch { grid-template-columns: 1fr; width: 100%; } .filters :deep(.el-input) { width: 100%; } .image-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .nav-item, .nav-item::after, .nav-caret, .nav-menu, .nav-menu-item, .home-button { transition: none; } .nav-item:hover, .nav-menu-item:hover, .home-button:hover { transform: none; } }
</style>
