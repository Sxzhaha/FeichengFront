<template>
  <div class="jujube-gallery-container">
    <div class="gallery-header">
        <div class="header-content">
            <span class="header-badge">Natural Orchard</span>
            <h1 class="title">枣树品种百科</h1>
            <p class="subtitle">探索各类枣子的独特风味与生长奥秘</p>
            <div class="header-divider-wrapper">
            <span class="line"></span>
            <span class="dot"></span>
            <span class="line"></span>
            </div>
        </div>

        <div class="header-shapes">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,96L60,101.3C120,107,240,117,360,112C480,107,600,85,720,80C840,75,960,85,1080,90.7C1200,96,1320,96,1380,96L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
            </svg>
        </div>
    </div>

    <el-skeleton :loading="loading" animated>
      <template #template>
        <div class="jujube-grid">
          <div v-for="i in 8" :key="i" class="jujube-card skeleton-card">
            <el-skeleton-item variant="image" class="skeleton-img" />
            <div class="card-footer" style="padding: 15px;">
              <el-skeleton-item variant="h3" style="width: 60%; margin: 0 auto;" />
            </div>
          </div>
        </div>
      </template>

      <template #default>
        <div class="jujube-grid">
          <div
            v-for="item in jujubeList"
            :key="item.id"
            class="jujube-card"
            @click="openDetail(item.id)"
          >
            <div class="img-wrapper">
              <img 
                :src="formatBase64(item.picture)" 
                :alt="item.varietyName" 
                class="jujube-img" 
                loading="lazy" 
              />
              <div class="overlay">
                <div class="overlay-content">
                  <el-icon class="search-icon"><Search /></el-icon>
                  <span>探索详情</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <h3 class="variety-name">{{ item.varietyName }}</h3>
            </div>
          </div>
        </div>
      </template>
    </el-skeleton>

    <el-dialog
        v-model="dialogVisible"
        width="70%"
        class="jujube-detail-dialog"
        destroy-on-close
        align-center
        show-close       
        :close-on-click-modal="false"  
        :close-on-press-escape="false"
    >
      <div class="detail-container" v-loading="detailLoading">
        <template v-if="detailData">
          <div class="detail-left">
            <img :src="formatBase64(detailData.picture)" class="detail-hero-img" />
          </div>
          
          <div class="detail-right">
            <h2 class="detail-title">{{ detailData.varietyName }}</h2>
            <div class="title-underline"></div>
            
            <div class="tag-group">
              <el-tag size="large" effect="light" type="success" round class="custom-tag">
                适种地区：{{ detailData.plant || '暂无数据' }}
              </el-tag>
              <el-tag size="large" effect="light" type="warning" round class="custom-tag">
                成熟期：{{ detailData.mature || '暂无数据' }}
              </el-tag>
            </div>

            <el-scrollbar class="detail-scrollbar">
              <div class="info-section">
                <h4 class="section-title">介绍</h4>
                <p class="section-text">{{ detailData.description || '暂无详细介绍' }}</p>
              </div>

              <div class="info-section">
                <h4 class="section-title">性状</h4>
                <p class="section-text">{{ detailData.character || '暂无性状描述' }}</p>
              </div>
            </el-scrollbar>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getSimpleList, getJujubebaike } from '@/api/binZhou/ld/jujubebaike' 

const loading = ref(true)
const detailLoading = ref(false)
const jujubeList = ref([])
const dialogVisible = ref(false)
const detailData = ref(null)

// 格式化 Base64 图片，防止后端返回时缺少前缀
const formatBase64 = (base64Str) => {
  if (!base64Str) return 'https://via.placeholder.com/400x300?text=暂无图片' // 默认占位图
  if (base64Str.startsWith('data:image')) {
    return base64Str
  }
  return `data:image/jpeg;base64,${base64Str}`
}

// 获取简易列表
const fetchList = async () => {
  loading.value = true
  try {
    const res = await getSimpleList()
    // 假设后端返回的是标准 RuoYi TableDataInfo 格式 (res.rows 存放数据)
    jujubeList.value = res.rows || []
  } catch (error) {
    console.error('获取列表失败', error)
  } finally {
    loading.value = false
  }
}

// 打开详情弹窗
const openDetail = async (id) => {
  dialogVisible.value = true
  detailLoading.value = true
  detailData.value = null // 清空旧数据
  try {
    const res = await getJujubebaike(id)
    detailData.value = res.data // 假设后端返回 standard AjaxResult 格式
  } catch (error) {
    console.error('获取详情失败', error)
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
/* ====== 整体容器 ====== */
.jujube-gallery-container {
  padding: 40px;
  background-color: #fcfbf9; /* 温暖柔和的背景色 */
  min-height: 100vh;
}

/* ====== 头部标题增强版（自然草木绿主题） ====== */
.gallery-header {
  position: relative;
  padding: 50px 0 50px; 
  text-align: center;
  overflow: hidden;
  /* 绿色渐变背景，清新草木绿，贴合枣树植物主题 */
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%);
  /* 增加自然微光效果 */
  background-image: 
    linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%),
    radial-gradient(circle at 20% 20%, rgba(102, 187, 106, 0.2) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(76, 175, 80, 0.15) 0%, transparent 40%);
}

/* 内容层置顶 */
.header-content {
  position: relative;
  z-index: 2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

/* 小标签样式（绿色主题） */
.header-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(76, 175, 80, 0.12);
  color: #2e7d32;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 20px;
  border: 1px solid rgba(76, 175, 80, 0.25);
}

.gallery-header .title {
  font-size: 48px;
  font-weight: 900;
  letter-spacing: 6px;
  margin: 0 0 20px;
  /* 深绿文字，稳重清晰 */
  color: #1b5e20;
  background: none;
  -webkit-background-clip: initial;
  -webkit-text-fill-color: initial;
}

.gallery-header .subtitle {
  font-size: 18px;
  color: #376b3a;
  font-weight: 400;
  letter-spacing: 1px;
  max-width: 600px;
  margin: 0 auto;
}

/* 精美分割线（绿色系） */
.header-divider-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 30px;
}
.header-divider-wrapper .line {
  width: 60px;
  height: 2px;
  background: linear-gradient(to right, transparent, #388e3c);
}
.header-divider-wrapper .line:last-child {
  background: linear-gradient(to left, transparent, #388e3c);
}
.header-divider-wrapper .dot {
  width: 8px;
  height: 8px;
  background-color: #4caf50;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.5);
}

/* ====== 底部波浪融合装饰 ====== */
.header-shapes {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0px;
  z-index: 1;
  overflow: hidden;
  line-height: 0;
}

.header-shapes svg {
  position: relative;
  display: block;
  width: calc(100% + 1.3px);
  height: 100%;
}

.header-shapes path {
  fill: #fcfbf9; 
}

/* ====== 卡片网格 ====== */
.jujube-grid {
  padding: 30px 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
}

/* ====== 单个卡片 ====== */
.jujube-card {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  border: 1px solid #f0f0f0;
}
.jujube-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

/* ====== 图片区域 ====== */
.img-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 比例 */
  overflow: hidden;
}
.jujube-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保证图片不变形 */
  transition: transform 0.5s ease;
}
.jujube-card:hover .jujube-img {
  transform: scale(1.08);
}

/* ====== 遮罩层 ====== */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.jujube-card:hover .overlay {
  opacity: 1;
}
.overlay-content {
  color: white;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transform: translateY(20px);
  transition: transform 0.3s ease;
}
.jujube-card:hover .overlay-content {
  transform: translateY(0);
}

/* ====== 卡片底部 ====== */
.card-footer {
  padding: 13px 20px;
  text-align: center;
  background: #fff;
  border-top: 1px solid #f4f4f4;
}
.variety-name {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
  letter-spacing: 1px;
}

/* ====== 详情弹窗样式定制 ====== */
:deep(.jujube-detail-dialog) {
  border-radius: 20px;
  overflow: hidden;
}
:deep(.jujube-detail-dialog .el-dialog__header) {
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 100;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
}
:deep(.jujube-detail-dialog .el-dialog__close) {
  font-size: 26px;
  color: #555;
  transition: all 0.3s ease;
}
:deep(.jujube-detail-dialog .el-dialog__close:hover) {
  color: #ff9a9e;
  transform: scale(1.1);
}
:deep(.jujube-detail-dialog .el-dialog__body) {
  padding: 0;
}

.detail-container {
  display: flex;
  height: 60vh;
  min-height: 480px;
  max-height: 650px;
  background: #fff;
}

.detail-left {
  flex: 0 0 45%;
  height: 100%;
  background: #f5f5f5;
  overflow: hidden;
}

.detail-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-right {
  flex: 1;
  height: 100%;
  padding: 40px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.detail-title {
  font-size: 32px;
  color: #2c3e50;
  margin: 0 0 10px 0;
}
.title-underline {
  width: 40px;
  height: 3px;
  background: #ff9a9e;
  margin-bottom: 20px;
}
.tag-group {
  margin-bottom: 30px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
}
.custom-tag {
  font-size: 14px !important;
  white-space: normal !important;
  text-align: left;
  height: auto !important;
  line-height: 1.4 !important;
  padding: 8px 12px !important;
}

.detail-scrollbar {
  flex: 1;
  height: 0;
  padding-right: 15px;
}

:deep(.detail-scrollbar .el-scrollbar__view) {
  width: 100% !important;
  white-space: normal !important;
}

.info-section {
  margin-bottom: 25px;
}
.section-title {
  font-size: 18px;
  color: #34495e;
  margin-bottom: 10px;
  font-weight: 600;
  border-left: 4px solid #ff9a9e;
  padding-left: 10px;
}
.section-text {
  font-size: 16px;
  color: #667;
  line-height: 1.8;
  text-align: justify;
  word-wrap: break-word;
  word-break: break-all;
  overflow-wrap: break-word;
  white-space: normal;
}

/* 骨架屏占位 */
.skeleton-card {
  pointer-events: none;
}
.skeleton-img {
  width: 100%;
  height: 0;
  padding-top: 75%;
}
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
.jujube-gallery-container {
--ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-green-soft: #edf5e9;
  --ft-green-pale: #f8fbf5;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e5eee2;
  --ft-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
  min-height: calc(100vh - 84px);
  padding-bottom: 28px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 12% 0%, rgba(127, 168, 138, 0.18), transparent 31%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
}

.jujube-gallery-container .gallery-header {
  position: relative;
  min-height: 240px;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 28%, rgba(255,255,255,.26), transparent 26%),
    linear-gradient(135deg, #245f47 0%, #3d7f5e 55%, #78a486 100%);
  border-radius: 0 0 34px 34px;
  box-shadow: 0 18px 38px rgba(47, 92, 62, 0.17);
}

.jujube-gallery-container .header-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
  padding: 45px 24px 72px;
  margin: 0 auto;
  color: #ffffff;
  text-align: center;
}

.jujube-gallery-container .header-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 13px;
  margin-bottom: 13px;
  color: #eff8f1;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255,255,255,.32);
  border-radius: 999px;
  backdrop-filter: blur(7px);
}

.jujube-gallery-container .title {
  margin: 0;
  font-size: 36px;
  font-weight: 850;
  letter-spacing: 4px;
  text-shadow: 0 4px 14px rgba(17, 55, 34, 0.24);
}

.jujube-gallery-container .subtitle {
  margin: 12px 0 0;
  color: rgba(255,255,255,.82);
  font-size: 14px;
  letter-spacing: 1px;
}

.jujube-gallery-container .header-divider-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 19px;
  gap: 8px;
}

.jujube-gallery-container .header-divider-wrapper .line {
  width: 62px;
  height: 1px;
  background: rgba(255,255,255,.55);
}

.jujube-gallery-container .header-divider-wrapper .dot {
  width: 7px;
  height: 7px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgba(255,255,255,.12);
}

.jujube-gallery-container .header-shapes {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 76px;
}

.jujube-gallery-container .header-shapes svg {
  width: 100%;
  height: 100%;
}

.jujube-gallery-container .header-shapes path {
  fill: #eef4e8;
}

.jujube-gallery-container .jujube-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
  max-width: 1320px;
  padding: 0 24px;
  margin: -22px auto 0;
  gap: 18px;
}

.jujube-gallery-container .jujube-card {
  position: relative;
  z-index: 3;
  overflow: hidden;
  background: rgba(255,255,255,.96);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(58, 88, 63, 0.10);
  cursor: pointer;
  transition:
    transform .22s ease,
    box-shadow .22s ease,
    border-color .22s ease;
}

.jujube-gallery-container .jujube-card:hover {
  border-color: #afc9b2;
  box-shadow: 0 18px 34px rgba(58, 88, 63, 0.15);
  transform: translateY(-5px);
}

.jujube-gallery-container .img-wrapper {
  position: relative;
  height: 190px;
  overflow: hidden;
  background: #edf3ea;
}

.jujube-gallery-container .jujube-img,
.jujube-gallery-container .skeleton-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .28s ease;
}

.jujube-gallery-container .jujube-card:hover .jujube-img {
  transform: scale(1.045);
}

.jujube-gallery-container .overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(180deg, transparent 35%, rgba(29, 75, 49, .72));
  opacity: 0;
  transition: opacity .22s ease;
}

.jujube-gallery-container .jujube-card:hover .overlay {
  opacity: 1;
}

.jujube-gallery-container .overlay-content {
  display: flex;
  align-items: center;
  padding: 8px 13px;
  gap: 7px;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.35);
  border-radius: 999px;
  backdrop-filter: blur(6px);
}

.jujube-gallery-container .card-footer {
  min-height: 62px;
  padding: 17px 16px;
  text-align: center;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
}

.jujube-gallery-container .variety-name {
  margin: 0;
  color: #315440;
  font-size: 17px;
  font-weight: 800;
}

.jujube-gallery-container :deep(.jujube-detail-dialog) {
  --el-dialog-border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--ft-border);
  box-shadow: 0 22px 50px rgba(37, 74, 49, .22);
}

.jujube-gallery-container :deep(.jujube-detail-dialog .el-dialog__body) {
  padding: 0;
}

.jujube-gallery-container .detail-container {
  display: grid;
  grid-template-columns: minmax(320px, .9fr) minmax(400px, 1.1fr);
  min-height: 520px;
  background: #ffffff;
}

.jujube-gallery-container .detail-left {
  min-height: 520px;
  overflow: hidden;
  background: #edf3ea;
}

.jujube-gallery-container .detail-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.jujube-gallery-container .detail-right {
  padding: 34px 36px;
  background:
    radial-gradient(circle at 100% 0%, rgba(127,168,138,.13), transparent 33%),
    #ffffff;
}

.jujube-gallery-container .detail-title {
  margin: 0;
  color: #294635;
  font-size: 30px;
}

.jujube-gallery-container .title-underline {
  width: 54px;
  height: 4px;
  margin: 12px 0 18px;
  background: linear-gradient(90deg, var(--ft-green), #8db397);
  border-radius: 999px;
}

.jujube-gallery-container .tag-group {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
  gap: 9px;
}

.jujube-gallery-container .detail-scrollbar {
  height: 340px;
}

.jujube-gallery-container .info-section {
  padding: 15px 16px;
  margin-bottom: 12px;
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-radius: 11px;
}

.jujube-gallery-container .section-title {
  margin: 0 0 9px;
  color: #355541;
}

.jujube-gallery-container .section-text {
  margin: 0;
  color: #5d7464;
  line-height: 1.8;
}

@media (max-width: 820px) {
  .jujube-gallery-container .jujube-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    padding: 0 14px;
  }

  .jujube-gallery-container .detail-container {
    grid-template-columns: 1fr;
  }

  .jujube-gallery-container .detail-left {
    min-height: 260px;
    max-height: 320px;
  }

  .jujube-gallery-container .detail-right {
    padding: 24px 20px;
  }
}
</style>
