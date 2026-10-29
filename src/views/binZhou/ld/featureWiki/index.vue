<template>
  <div class="wiki-container">
    <aside class="wiki-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-icon"></span>
        <span class="sidebar-title">防治百科</span>
      </div>

      <div class="sidebar-scroll">
        <div v-if="categoryLoading" class="tree-loading">
          加载中...
        </div>

        <ul v-else class="tree-root">
          <li
            v-for="first in categoryTree"
            :key="first.label"
            class="tree-node-first"
          >
            <div
              class="tree-label level-1"
              :class="{ active: activeFirst === first.label && !activeSecond }"
              @click="toggleFirst(first)"
            >
              <span class="tree-arrow">{{ first.expanded ? '▼' : '▶' }}</span>
              <span>{{ first.label }}</span>
            </div>

            <ul v-show="first.expanded" class="tree-children">
              <li
                v-for="second in first.children"
                :key="second.label"
                class="tree-node-second"
              >
                <div
                  class="tree-label level-2"
                  :class="{ active: activeSecond === second.label && !activeThird }"
                  @click="toggleSecond(first, second)"
                >
                  <span class="tree-arrow">{{ second.expanded ? '▼' : '▶' }}</span>
                  <span>{{ second.label }}</span>
                </div>

                <ul v-show="second.expanded" class="tree-children">
                  <li
                    v-for="third in second.children"
                    :key="third.label"
                    class="tree-node-third"
                  >
                    <div
                      class="tree-label level-3"
                      :class="{ active: activeThird === third.label }"
                      @click="selectThird(first, second, third)"
                    >
                      <span class="dot" />
                      {{ third.label }}
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </aside>

    <main class="wiki-main">
      <div class="main-header">
        <div class="breadcrumb">
          <span
            class="bread-item"
            :class="{ clickable: activeFirst }"
            @click="resetToAll"
          >
            全部
          </span>

          <template v-if="activeFirst">
            <span class="bread-sep">/</span>
            <span class="bread-item clickable" @click="resetToFirst">
              {{ activeFirst }}
            </span>
          </template>

          <template v-if="activeSecond">
            <span class="bread-sep">/</span>
            <span class="bread-item clickable" @click="resetToSecond">
              {{ activeSecond }}
            </span>
          </template>

          <template v-if="activeThird">
            <span class="bread-sep">/</span>
            <span class="bread-item current">
              {{ activeThird }}
            </span>
          </template>
        </div>

        <div class="search-bar">
          <span class="search-icon"></span>
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索病虫害名称..."
            @input="onSearch"
          />
          <button v-if="searchKeyword" class="search-clear" @click="clearSearch">
            ✕
          </button>
        </div>
      </div>

      <div class="result-info">
        共找到 <strong>{{ total }}</strong> 种病虫害
        <span v-if="searchKeyword">（关键词：{{ searchKeyword }}）</span>
      </div>

      <div v-if="listLoading" class="grid-loading">
        <div v-for="n in 8" :key="n" class="card-skeleton" />
      </div>

      <div v-else-if="knowledgeList.length === 0" class="empty-state">
        <img
          :src="defaultPestImg"
          alt="空"
        />
        <p>暂无相关数据</p>
      </div>

      <div v-else class="card-grid">
        <div
          v-for="item in knowledgeList"
          :key="item.id"
          class="pest-card"
          @click="openDetail(item)"
        >
          <div class="card-image-wrap">
            <img
              :src="getImageUrl(item.plusDsiPath)"
              :alt="item.plusDsiName"
              class="card-image"
              @error="onImgError"
            />
            <div
              class="card-type-tag"
              :class="Number(item.disPestType) === 1 ? 'tag-disease' : 'tag-pest'"
            >
              {{ Number(item.disPestType) === 1 ? '病害' : '虫害' }}
            </div>
          </div>

          <div class="card-body">
            <h3 class="card-name">{{ item.plusDsiName }}</h3>
            <p v-if="item.plusDsiNameeng" class="card-eng">
              {{ item.plusDsiNameeng }}
            </p>
            <p class="card-intro">
              {{
                item.plusDsiIntroduction
                  ? item.plusDsiIntroduction.slice(0, 60) +
                    (item.plusDsiIntroduction.length > 60 ? '...' : '')
                  : ''
              }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="total > pageSize" class="pagination-wrap">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="onPageChange"
        />
      </div>
    </main>

    <transition name="modal-fade">
      <div v-if="detailVisible" class="modal-overlay" @click.self="closeDetail">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <h2 class="modal-title">{{ currentItem.plusDsiName }}</h2>
              <p v-if="currentItem.plusDsiNameeng" class="modal-title-eng">
                {{ currentItem.plusDsiNameeng }}
              </p>
              <div class="modal-tags">
                <span v-if="currentItem.plusDsiSynonyms" class="modal-tag tag-alias">
                  别名：{{ currentItem.plusDsiSynonyms }}
                </span>
                <span
                  class="modal-tag"
                  :class="Number(currentItem.disPestType) === 1 ? 'tag-disease' : 'tag-pest'"
                >
                  {{ Number(currentItem.disPestType) === 1 ? '病害' : '虫害' }}
                </span>
              </div>
            </div>

            <button class="modal-close" @click="closeDetail">✕</button>
          </div>

          <div class="modal-body">
            <div class="modal-top">
              <div class="modal-image-wrap">
                <el-carousel
                  v-if="getImageList(currentItem.plusDsiPath).length > 1"
                  height="220px"
                  indicator-position="none"
                  arrow="hover"
                >
                  <el-carousel-item v-for="(img, idx) in getImageList(currentItem.plusDsiPath)" :key="idx">
                    <el-image
                      :src="img"
                      :preview-src-list="getImageList(currentItem.plusDsiPath)"
                      :initial-index="idx"
                      fit="cover"
                      class="modal-image"
                      preview-teleported
                    >
                      <template #error>
                        <img :src="defaultPestImg" class="modal-image" />
                      </template>
                    </el-image>
                  </el-carousel-item>
                </el-carousel>
                <el-image
                  v-else
                  :src="getImageUrl(currentItem.plusDsiPath)"
                  :preview-src-list="getImageList(currentItem.plusDsiPath)"
                  fit="cover"
                  class="modal-image"
                  preview-teleported
                >
                  <template #error>
                    <img :src="defaultPestImg" class="modal-image" />
                  </template>
                </el-image>
              </div>

              <div class="modal-intro-wrap">
                <div class="section-block">
                  <h4 class="section-title">
                    <span class="section-icon"></span> 简介
                  </h4>
                  <p class="section-text">
                    {{ currentItem.plusDsiIntroduction || '暂无数据' }}
                  </p>
                </div>

                <div v-if="currentItem.plusDsiDamagesym" class="section-block">
                  <h4 class="section-title">
                    <span class="section-icon"></span> 危害症状
                  </h4>
                  <p class="section-text">
                    {{ currentItem.plusDsiDamagesym }}
                  </p>
                </div>
              </div>
            </div>

            <div class="modal-tabs">
              <button
                v-for="tab in visibleTabs"
                :key="tab.key"
                class="tab-btn"
                :class="{ 'tab-active': activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="modal-tab-content">
              <template v-if="activeTab === 'pathogen'">
                <p class="section-text">{{ currentItem.plusDsiPathogen || '暂无数据' }}</p>
              </template>
              <template v-else-if="activeTab === 'cycle'">
                <p class="section-text">{{ currentItem.plusDsiCycle || '暂无数据' }}</p>
              </template>
              <template v-else-if="activeTab === 'ofactor'">
                <p class="section-text">{{ currentItem.plusDsiOfactor || '暂无数据' }}</p>
              </template>
              <template v-else-if="activeTab === 'morphology'">
                <p class="section-text">{{ currentItem.plusDsiMorphology || '暂无数据' }}</p>
              </template>
              <template v-else-if="activeTab === 'habits'">
                <p class="section-text">{{ currentItem.plusDsiHabits || '暂无数据' }}</p>
              </template>
              <template v-else-if="activeTab === 'cmethod'">
                <p class="section-text">
                  {{ currentItem.plusDsiCmethod || '暂无数据' }}
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCategoryTree, getKnowledgeList } from '@/api/binZhou/ld/knowledge'

const router = useRouter()

const defaultPestImg =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
      <rect width="100%" height="100%" fill="#f2f4f7"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="#909399" font-size="18" font-family="Arial, Microsoft YaHei">
        暂无图片
      </text>
    </svg>
  `)

const BASE_URL = import.meta.env.VITE_APP_BASE_API || ''

const categoryTree = ref([])
const categoryLoading = ref(false)
const knowledgeList = ref([])
const listLoading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(16)
const searchKeyword = ref('')

const activeFirst = ref('果树')
const activeSecond = ref('杂果类')
const activeThird = ref('枣树')

const detailVisible = ref(false)
const currentItem = ref({})
const activeTab = ref('pathogen')

const allTabs = [
  { key: 'pathogen', label: '病原', types: [1] },
  { key: 'cycle', label: '侵染循环', types: [1] },
  { key: 'morphology', label: '形态特征', types: [2] },
  { key: 'habits', label: '生活习性', types: [2] },
  { key: 'ofactor', label: '发生规律', types: [1, 2] },
  { key: 'cmethod', label: '防治方法', types: [1, 2] }
]

const visibleTabs = computed(() => {
  const t = Number(currentItem.value.disPestType)
  return allTabs.filter(tab => !t || tab.types.includes(t))
})

function fetchCategoryTree() {
  categoryLoading.value = true
  getCategoryTree()
    .then(res => {
      categoryTree.value = addExpanded(res.data || [])

      // 自动展开默认路径：果树 > 核果类 > 枣树
      const targetFirst = categoryTree.value.find(f => f.label === activeFirst.value)
      if (targetFirst) {
        targetFirst.expanded = true
        const targetSecond = (targetFirst.children || []).find(s => s.label === activeSecond.value)
        if (targetSecond) {
          targetSecond.expanded = true
        }
      }
    })
    .finally(() => {
      categoryLoading.value = false
    })
}

function addExpanded(nodes) {
  return (nodes || []).map(node => ({
    ...node,
    expanded: false,
    children: addExpanded(node.children || [])
  }))
}

function fetchList() {
  listLoading.value = true
  const params = {
    pageNum: currentPage.value,
    pageSize: pageSize.value,
    plusDsiCategoryfirst: activeFirst.value || undefined,
    plusDsiCategorysecond: activeSecond.value || undefined,
    plusDsiCategorythird: activeThird.value || undefined,
    plusDsiName: searchKeyword.value || undefined
  }

  getKnowledgeList(params)
    .then(res => {
      knowledgeList.value = res.rows || []
      total.value = res.total || 0
    })
    .finally(() => {
      listLoading.value = false
    })
}

let searchTimer = null

function toggleFirst(first) {
  first.expanded = !first.expanded

  if (first.expanded) {
    categoryTree.value.forEach(f => {
      if (f.label !== first.label) f.expanded = false
    })
    activeFirst.value = first.label
    activeSecond.value = ''
    activeThird.value = ''
    currentPage.value = 1
    fetchList()
  } else {
    resetToAll()
  }
}

function toggleSecond(first, second) {
  second.expanded = !second.expanded

  if (second.expanded) {
    ;(first.children || []).forEach(s => {
      if (s.label !== second.label) s.expanded = false
    })
    activeFirst.value = first.label
    activeSecond.value = second.label
    activeThird.value = ''
    currentPage.value = 1
    fetchList()
  } else {
    activeSecond.value = ''
    activeThird.value = ''
    currentPage.value = 1
    fetchList()
  }
}

function selectThird(first, second, third) {
  activeFirst.value = first.label
  activeSecond.value = second.label
  activeThird.value = third.label
  currentPage.value = 1
  fetchList()
}

function resetToAll() {
  activeFirst.value = ''
  activeSecond.value = ''
  activeThird.value = ''

  categoryTree.value.forEach(f => {
    f.expanded = false
    ;(f.children || []).forEach(s => {
      s.expanded = false
    })
  })

  currentPage.value = 1
  fetchList()
}

function resetToFirst() {
  activeSecond.value = ''
  activeThird.value = ''
  currentPage.value = 1
  fetchList()
}

function resetToSecond() {
  activeThird.value = ''
  currentPage.value = 1
  fetchList()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchList()
  }, 400)
}

function clearSearch() {
  searchKeyword.value = ''
  currentPage.value = 1
  fetchList()
}

function onPageChange(page) {
  currentPage.value = page
  fetchList()
  document.querySelector('.wiki-main')?.scrollTo({ top: 0, behavior: 'smooth' })
}

function openDetail(item) {
  currentItem.value = item
  const t = Number(item.disPestType)
  activeTab.value = t === 2 ? 'morphology' : 'pathogen'
  detailVisible.value = true
  document.body.style.overflow = 'hidden'
}

function closeDetail() {
  detailVisible.value = false
  document.body.style.overflow = ''
}

function getImageUrl(path) {
  const list = getImageList(path)
  return list.length > 0 ? list[0] : defaultPestImg
}

function getImageList(path) {
  if (!path) return []
  return path.split(',').map(p => p.trim()).filter(Boolean).map(p => {
    if (p.startsWith('http')) return p
    if (p.startsWith('data:image')) return p
    if (p.includes('uploadPath')) {
      const fileName = p.split(/[/\\]/).pop()
      return `${BASE_URL}/profile/upload/knowledge/${fileName}`
    }
    if (p.startsWith('/profile/')) {
      return `${BASE_URL}${p}`
    }
    if (p.startsWith('upload/')) {
      return `${BASE_URL}/profile/${p}`
    }
    return `${BASE_URL}/profile/upload/knowledge/${p}`
  })
}

function onImgError(e) {
  const img = e.target
  if (img.dataset.errorHandled === '1') return
  img.dataset.errorHandled = '1'
  img.onerror = null
  img.src = defaultPestImg
}

onMounted(() => {
  fetchCategoryTree()
  fetchList()
})
</script>

<style scoped>
:root {
  --theme-color: #4e9f5b;
  --theme-color-dark: #357a42;
  --theme-color-light: #eef8f0;
  --theme-border: #dce9de;
  --theme-bg: #f6faf6;
  --text-main: #243126;
  --text-regular: #55645a;
  --text-secondary: #8a968d;
  --card-shadow: 0 8px 24px rgba(61, 122, 58, 0.08);
  --card-shadow-hover: 0 14px 30px rgba(61, 122, 58, 0.16);
}

/* ===== 整体布局 ===== */
.wiki-container {
  display: flex;
  height: calc(100vh - 140px);
  background: linear-gradient(180deg, #f8fbf7 0%, #f3f8f2 100%);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
  color: var(--text-main);
}

/* ===== 左侧目录 ===== */
.wiki-sidebar {
  width: 260px;
  min-width: 260px;
  background: #ffffff;
  border-right: 1px solid #e7efe8;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.03);
  z-index: 2;
}

.sidebar-header {
  padding: 20px 18px;
  background: linear-gradient(135deg, #3d7a3a 0%, #5ea95d 100%);
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.sidebar-icon::before {
  font-size: 22px;
  display: inline-block;
}

.sidebar-title {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdfb 100%);
}

.sidebar-scroll::-webkit-scrollbar {
  width: 5px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #c8d8c0;
  border-radius: 3px;
}

.tree-loading {
  padding: 28px 20px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

.tree-root,
.tree-children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree-node-first + .tree-node-first {
  margin-top: 4px;
}

.tree-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 9px 14px;
  font-size: 13px;
  color: #333;
  transition: all 0.18s ease;
  user-select: none;
  position: relative;
}

.tree-label:hover {
  background: #f4faf2;
  color: var(--theme-color-dark);
}

.tree-label.active {
  background: linear-gradient(90deg, #edf8ee 0%, #f8fcf8 100%);
  color: var(--theme-color-dark);
  font-weight: 700;
}

.tree-label.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 4px;
  background: linear-gradient(180deg, #5cad61 0%, #3b8447 100%);
  border-radius: 0 4px 4px 0;
}

.level-1 {
  font-weight: 700;
  font-size: 13.5px;
  color: #284f2b;
  padding-left: 14px;
}

.level-2 {
  padding-left: 28px;
  color: #44554a;
}

.level-3 {
  padding-left: 46px;
  color: #5a675d;
  font-size: 12.5px;
}

.tree-arrow {
  width: 14px;
  text-align: center;
  font-size: 11px;
  color: #91a090;
  flex-shrink: 0;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c4cec3;
  display: inline-block;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(76, 158, 74, 0.06);
}

.tree-label.active .dot {
  background: var(--theme-color);
}

/* ===== 右侧主区域 ===== */
.wiki-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  min-width: 0;
  background:
    radial-gradient(circle at top right, rgba(110, 180, 116, 0.08), transparent 22%),
    linear-gradient(180deg, #f8fbf7 0%, #f4f8f2 100%);
}

.wiki-main::-webkit-scrollbar {
  width: 7px;
}

.wiki-main::-webkit-scrollbar-thumb {
  background: #d0d9c8;
  border-radius: 4px;
}

/* ===== 顶部区域 ===== */
.main-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(220, 233, 222, 0.9);
  border-radius: 16px;
  padding: 16px 18px;
  box-shadow: 0 6px 20px rgba(70, 120, 70, 0.04);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
}

.bread-item {
  white-space: nowrap;
  transition: all 0.15s ease;
}

.bread-item.clickable {
  cursor: pointer;
  color: var(--theme-color);
  font-weight: 500;
}

.bread-item.clickable:hover {
  color: var(--theme-color-dark);
  text-decoration: underline;
}

.bread-item.current {
  color: var(--text-main);
  font-weight: 700;
}

.bread-sep {
  color: #c8d0c7;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border: 1.5px solid #dbe8db;
  border-radius: 999px;
  padding: 0 14px 0 16px;
  height: 42px;
  width: 320px;
  transition: all 0.22s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.search-bar:focus-within {
  border-color: var(--theme-color);
  box-shadow: 0 0 0 4px rgba(94, 169, 93, 0.12);
}

.search-icon::before {
  font-size: 14px;
  margin-right: 8px;
  opacity: 0.72;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: var(--text-main);
}

.search-input::placeholder {
  color: #b3beb6;
}

.search-clear {
  background: #f4f7f4;
  border: 1px solid #e4ebe3;
  cursor: pointer;
  color: #9aa59d;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  padding: 0;
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  transition: all 0.16s ease;
}

.search-clear:hover {
  color: #666;
  background: #edf3ed;
}

/* ===== 统计信息 ===== */
.result-info {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 16px 2px 18px;
}

.result-info strong {
  color: var(--theme-color-dark);
  font-size: 15px;
}

/* ===== 图片卡片 ===== */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}

.pest-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #e5eee5;
  transition: all 0.24s ease;
  box-shadow: var(--card-shadow);
  position: relative;
}

.pest-card::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 3px;
  background: linear-gradient(90deg, #7ecb83, #4e9f5b);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.22s ease;
}

.pest-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--card-shadow-hover);
  border-color: #cfe3d1;
}

.pest-card:hover::after {
  transform: scaleX(1);
}

.card-image-wrap {
  position: relative;
  height: 158px;
  overflow: hidden;
  background: linear-gradient(180deg, #f2f7f1 0%, #eaf2e8 100%);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.pest-card:hover .card-image {
  transform: scale(1.06);
}

.card-type-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 999px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(6px);
}

.tag-disease {
  background: rgba(231, 76, 60, 0.92);
  color: #fff;
}

.tag-pest {
  background: rgba(243, 156, 18, 0.92);
  color: #fff;
}

.card-body {
  padding: 14px 14px 16px;
}

.card-name {
  font-size: 15px;
  font-weight: 700;
  color: #233326;
  margin: 0 0 5px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-eng {
  font-size: 11px;
  color: #98a39b;
  font-style: italic;
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-intro {
  font-size: 12px;
  color: #728076;
  line-height: 1.7;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== 加载骨架 ===== */
.grid-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}

.card-skeleton {
  height: 236px;
  border-radius: 16px;
  background: linear-gradient(90deg, #f1f4f1 25%, #e7ece7 50%, #f1f4f1 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border: 1px solid #edf2ed;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 72px 20px;
  color: #a3ada4;
  background: rgba(255, 255, 255, 0.68);
  border: 1px dashed #d9e4da;
  border-radius: 18px;
}

.empty-state img {
  width: 120px;
  margin-bottom: 14px;
  opacity: 0.72;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* ===== 分页 ===== */
.pagination-wrap {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  padding-bottom: 6px;
}

/* ===== 详情弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 20, 0.52);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-container {
  background: #fff;
  border-radius: 20px;
  width: 920px;
  max-width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.24);
}

.modal-header {
  padding: 22px 26px 18px;
  border-bottom: 1px solid #edf1ed;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: linear-gradient(135deg, #f5fcf4 0%, #ffffff 100%);
}

.modal-title-wrap {
  flex: 1;
}

.modal-title {
  font-size: 24px;
  font-weight: 800;
  color: #203624;
  margin: 0 0 5px;
  line-height: 1.25;
}

.modal-title-eng {
  font-size: 13px;
  color: #9aa59d;
  font-style: italic;
  margin: 0 0 10px;
}

.modal-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.tag-alias {
  background: #f1f7ef;
  color: #578256;
  border: 1px solid #d4e4d1;
}

.modal-close {
  background: #f3f5f3;
  border: 1px solid #e3e8e3;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #6f776f;
  flex-shrink: 0;
  transition: all 0.16s ease;
}

.modal-close:hover {
  background: #e8eee8;
  color: #444;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 26px 24px;
}

.modal-body::-webkit-scrollbar {
  width: 5px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #d0ddc8;
  border-radius: 3px;
}

.modal-top {
  display: flex;
  gap: 24px;
  margin-bottom: 22px;
}

.modal-image-wrap {
  flex-shrink: 0;
  width: 280px;
  height: 220px;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(180deg, #f1f5ef 0%, #e9f0e7 100%);
  border: 1px solid #e2eadf;
  box-shadow: 0 8px 20px rgba(60, 100, 60, 0.06);
}

.modal-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-intro-wrap {
  flex: 1;
  min-width: 0;
}

.section-block {
  margin-bottom: 16px;
  background: #fafcf9;
  border: 1px solid #edf2ec;
  border-radius: 14px;
  padding: 14px 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--theme-color-dark);
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(180deg, #68b668 0%, #3d7a3a 100%);
}

.section-text {
  font-size: 13px;
  color: #55635a;
  line-height: 1.9;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ===== Tab 区域 ===== */
.modal-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e7ede6;
  margin-bottom: 18px;
  flex-wrap: wrap;
  padding-bottom: 8px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #e3eae3;
  background: #f9fbf9;
  cursor: pointer;
  font-size: 13px;
  color: #6f7d73;
  border-radius: 999px;
  transition: all 0.16s ease;
}

.tab-btn:hover {
  color: var(--theme-color-dark);
  background: #f2faf0;
  border-color: #d4e7d2;
}

.tab-active {
  color: #fff !important;
  font-weight: 700;
  background: linear-gradient(135deg, #5cad61 0%, #3d7a3a 100%);
  border-color: transparent !important;
  box-shadow: 0 6px 16px rgba(76, 158, 74, 0.22);
}

.modal-tab-content {
  min-height: 100px;
  background: #fcfdfc;
  border: 1px solid #edf1ec;
  border-radius: 14px;
  padding: 16px 18px;
}

.highlight-green {
  background: #f2faf0;
  border-left: 4px solid #5a9e57;
  padding: 12px 14px;
  border-radius: 0 10px 10px 0;
  color: #3a6038;
}

/* ===== 动画 ===== */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container {
  transition: transform 0.24s ease;
}

.modal-fade-enter-from .modal-container {
  transform: scale(0.95) translateY(18px);
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .wiki-sidebar {
    width: 220px;
    min-width: 220px;
  }

  .search-bar {
    width: 100%;
  }

  .main-header {
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .wiki-container {
    flex-direction: column;
    height: auto;
  }

  .wiki-sidebar {
    width: 100%;
    min-width: 100%;
    max-height: 280px;
    border-right: none;
    border-bottom: 1px solid #e8ede0;
  }

  .wiki-main {
    padding: 16px;
  }

  .card-grid,
  .grid-loading {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .modal-top {
    flex-direction: column;
  }

  .modal-image-wrap {
    width: 100%;
    height: 200px;
  }

  .modal-container {
    border-radius: 16px;
  }
}
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
.wiki-container {
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
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  min-height: calc(100vh - 84px);
  padding: 18px;
  gap: 18px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.17), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.wiki-container *,
.wiki-container *::before,
.wiki-container *::after {
  box-sizing: border-box;
}

.wiki-container .wiki-sidebar {
  position: sticky;
  top: 16px;
  height: calc(100vh - 116px);
  overflow: hidden;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 16px;
  box-shadow: var(--ft-shadow);
}

.wiki-container .sidebar-header {
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 0 17px;
  gap: 10px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.wiki-container .sidebar-icon {
  width: 34px;
  height: 34px;
  background:
    linear-gradient(135deg, var(--ft-green), #75a382);
  border-radius: 11px;
  box-shadow: 0 7px 14px rgba(47,125,92,.18);
}

.wiki-container .sidebar-title {
  color: #294635;
  font-size: 17px;
  font-weight: 800;
}

.wiki-container .sidebar-scroll {
  height: calc(100% - 64px);
  padding: 12px 10px 18px;
  overflow-y: auto;
}

.wiki-container .tree-root,
.wiki-container .tree-children {
  padding: 0;
  margin: 0;
  list-style: none;
}

.wiki-container .tree-children {
  padding-left: 15px;
}

.wiki-container .tree-label {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 0 9px;
  margin-bottom: 3px;
  gap: 7px;
  color: #526b5c;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: .18s ease;
}

.wiki-container .tree-label:hover {
  color: var(--ft-green);
  background: #f0f6ee;
  border-color: #dbe9d8;
}

.wiki-container .tree-label.active {
  color: #24583f;
  font-weight: 700;
  background: #e7f1e5;
  border-color: #c9dfc8;
}

.wiki-container .tree-arrow {
  color: #7d9983;
  font-size: 10px;
}

.wiki-container .tree-label .dot {
  width: 6px;
  height: 6px;
  background: #7ca98a;
  border-radius: 50%;
}

.wiki-container .wiki-main {
  min-width: 0;
  padding: 18px;
  background: rgba(255,255,255,.94);
  border: 1px solid var(--ft-border);
  border-radius: 16px;
  box-shadow: var(--ft-shadow);
}

.wiki-container .main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding-bottom: 15px;
  gap: 16px;
  border-bottom: 1px solid #e1ebe0;
}

.wiki-container .breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.wiki-container .bread-item {
  color: #718374;
  font-size: 13px;
}

.wiki-container .bread-item.clickable {
  color: var(--ft-green);
  cursor: pointer;
}

.wiki-container .bread-item.current {
  color: #294635;
  font-weight: 700;
}

.wiki-container .bread-sep {
  color: #acb8ae;
}

.wiki-container .search-bar {
  position: relative;
  display: flex;
  align-items: center;
  width: min(360px, 100%);
  height: 40px;
  padding: 0 12px;
  gap: 8px;
  background: #fbfcfa;
  border: 1px solid #d5e2d3;
  border-radius: 10px;
  transition: .18s ease;
}

.wiki-container .search-bar:focus-within {
  border-color: #7ca98a;
  box-shadow: 0 0 0 3px rgba(47,125,92,.09);
}

.wiki-container .search-icon {
  width: 16px;
  height: 16px;
  border: 2px solid #7d9983;
  border-radius: 50%;
}

.wiki-container .search-input {
  flex: 1;
  min-width: 0;
  color: #3f5848;
  background: transparent;
  border: 0;
  outline: none;
}

.wiki-container .search-clear {
  color: #9aa89d;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.wiki-container .result-info {
  padding: 14px 2px;
  color: #718374;
  font-size: 13px;
}

.wiki-container .result-info strong {
  color: var(--ft-green);
  font-size: 17px;
}

.wiki-container .card-grid,
.wiki-container .grid-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.wiki-container .pest-card,
.wiki-container .card-skeleton {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--ft-border-soft);
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(58,88,63,.07);
}

.wiki-container .pest-card {
  cursor: pointer;
  transition:
    transform .2s ease,
    border-color .2s ease,
    box-shadow .2s ease;
}

.wiki-container .pest-card:hover {
  border-color: #b8d0b9;
  box-shadow: 0 15px 28px rgba(58,88,63,.13);
  transform: translateY(-3px);
}

.wiki-container .card-image-wrap {
  position: relative;
  height: 160px;
  overflow: hidden;
  background: #edf3ea;
}

.wiki-container .card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .25s ease;
}

.wiki-container .pest-card:hover .card-image {
  transform: scale(1.035);
}

.wiki-container .card-type-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 9px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(40,70,48,.18);
}

.wiki-container .tag-disease {
  background: rgba(187, 83, 83, .9);
}

.wiki-container .tag-pest {
  background: rgba(47,125,92,.9);
}

.wiki-container .card-body {
  padding: 14px;
}

.wiki-container .card-name {
  margin: 0;
  color: #315440;
  font-size: 16px;
}

.wiki-container .card-eng {
  margin: 4px 0 8px;
  color: #8b998e;
  font-size: 11px;
}

.wiki-container .card-intro {
  display: -webkit-box;
  min-height: 42px;
  margin: 0;
  overflow: hidden;
  color: #637768;
  font-size: 12px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.wiki-container .pagination-wrap {
  display: flex;
  justify-content: center;
  padding-top: 20px;
}

.wiki-container .modal-overlay {
  padding: 24px;
  background: rgba(25, 48, 33, .48);
  backdrop-filter: blur(5px);
}

.wiki-container .modal-container {
  max-width: 980px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--ft-border);
  border-radius: 17px;
  box-shadow: 0 24px 56px rgba(26, 58, 38, .27);
}

.wiki-container .modal-header {
  padding: 20px 22px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.wiki-container .modal-title {
  color: #294635;
}

.wiki-container .modal-body {
  padding: 20px 22px 24px;
}

.wiki-container .modal-top {
  gap: 20px;
}

.wiki-container .modal-image-wrap {
  overflow: hidden;
  border: 1px solid #dce7da;
  border-radius: 12px;
}

.wiki-container .section-block {
  padding: 13px 14px;
  margin-bottom: 10px;
  background: #f8fbf5;
  border: 1px solid #dfeadd;
  border-radius: 10px;
}

.wiki-container .section-title {
  color: #355541;
}

.wiki-container .section-text {
  color: #5d7464;
  line-height: 1.8;
}

.wiki-container .modal-tabs {
  padding: 4px;
  background: #edf3ea;
  border-radius: 10px;
}

.wiki-container .tab-btn {
  color: #627767;
  background: transparent;
  border: 0;
  border-radius: 7px;
}

.wiki-container .tab-btn.tab-active {
  color: #ffffff;
  background: var(--ft-green);
}

.wiki-container :deep(.el-pagination.is-background .el-pager li.is-active) {
  background: var(--ft-green);
}

@media (max-width: 980px) {
  .wiki-container {
    grid-template-columns: 1fr;
  }

  .wiki-container .wiki-sidebar {
    position: static;
    height: auto;
    max-height: 340px;
  }
}

@media (max-width: 700px) {
  .wiki-container {
    padding: 10px;
  }

  .wiki-container .main-header {
    align-items: stretch;
    flex-direction: column;
  }

  .wiki-container .search-bar {
    width: 100%;
  }

  .wiki-container .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
