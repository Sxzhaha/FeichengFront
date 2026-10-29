<template>
  <div>

    <!-- 搜索区域 -->
    <div class="search-section">
      <div class="headline">知识检索 - 标准象百科</div>
      
      <div class="search-bar">
        <el-autocomplete
          v-model="searchKeyword"
          :fetch-suggestions="querySearchSuggestions"
          placeholder="请输入品种名称搜索..."
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
          @select="handleSuggestionSelect"
          :debounce="300"
          :trigger-on-focus="false"
          highlight-first-item
          value-key="value"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #default="{ item }">
            <div class="suggestion-item">
              <div class="suggestion-main">
                <span class="suggestion-name">{{ item.value }}</span>
                <el-tag :type="getSuggestionTagType(item.type)" size="small">
                  {{ item.type }}
                </el-tag>
              </div>
              <div class="suggestion-desc" v-if="item.description">{{ item.description }}</div>
            </div>
          </template>
          <template #append>
            <el-button type="primary" @click="handleSearch" style="font-size:20px;color:#409EFF">
              搜索
            </el-button>
          </template>
        </el-autocomplete>
      </div>
      
      <div class="hot-words">
        热门搜索：
        <el-link type="primary" @click="setKeyword('济麦22')">济麦22</el-link>
        <el-link type="primary" @click="setKeyword('郑单958')">郑单958</el-link>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-section">
      <el-row :gutter="30">
        <!-- 左侧导航栏 -->
        <el-col :span="4" class="sidebar">
          <div class="sidebar-header">
            <h3>作物种类</h3>
          </div>

          <!-- 🔥 动态加载的作物分类菜单 -->
          <el-skeleton v-if="categoriesLoading" :rows="4" animated class="category-skeleton" />
          <el-menu 
            v-else 
            v-model:default-active="activeMenu" 
            :default-openeds="['禾本科']"
            class="sidebar-menu" 
            @select="handleMenuSelect"
          >
            <el-sub-menu v-for="(group, groupName) in groupedCategories" :key="groupName" :index="groupName">
              <template #title>
                <span>{{ groupName }}</span>
              </template>
              <el-menu-item v-for="category in group" :key="category.id" :index="`${groupName}-${category.id}`">
                {{ category.name }}
                <span class="category-count">({{ category.count }})</span>
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-col>

        <!-- 右侧内容展示区域 -->
        <el-col :span="20" class="main-content">
          <div class="content-wrapper">

            <!-- 🔥 搜索结果展示 -->
            <div v-if="isSearchMode" class="search-results-section">
              <h2 class="section-header">
                搜索结果 ({{ searchResults.length }}) 项
                <el-button @click="clearSearch" type="text" class="clear-search">
                  <el-icon>
                    <Close />
                  </el-icon>
                  清除搜索
                </el-button>
              </h2>
              <el-empty v-if="searchResults.length === 0" description="未找到相关品种信息" />
              <div v-else class="variety-grid">
                <div v-for="item in searchResults" :key="item.id" class="variety-item" @click="goToVarietyDetail(item)">
                  <div class="variety-name">{{ item.name }}</div>
                  <el-tag type="success" size="small">品种</el-tag>
                </div>
              </div>
            </div>

            <!-- 🔥 正常的分类展示 -->
            <div v-else>
              <!-- 品种展示区域 -->
              <div class="variety-section">
                <h2 class="section-header">
                  {{ currentCrop }}品种共有 ({{ varietyCount }}) 种
                  <el-skeleton v-if="dataLoading" animated class="count-skeleton" />
                </h2>
                <el-skeleton v-if="dataLoading" :rows="3" animated />
                <div v-else-if="varietyList.length === 0" class="empty-state">
                  <el-empty description="暂无品种数据" />
                </div>
                <div v-else class="variety-grid">
                  <div v-for="variety in varietyList" :key="variety.id" class="variety-item"
                    @click="goToVarietyDetail(variety)">
                    <div class="variety-name">{{ variety.name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Close, User, Search } from '@element-plus/icons-vue'

// 🔥 导入API函数
import {
  getCropCategoriesForDisplay,
  getVarietiesForDisplay,
  searchVarietiesForDisplay,
  getVarietyDetailByName
} from '@/api/binZhou/ld/knowledge/varietyDisplay'

const router = useRouter()
const route = useRoute()
const { proxy } = getCurrentInstance()

// 🔥 响应式数据
const searchKeyword = ref('')
const activeMenu = ref('禾本科-crop_1') // 🔥 默认选中小麦
const currentCrop = ref('小麦') // 🔥 默认显示小麦
const currentCropId = ref('crop_1')


// 🔥 加载状态
const categoriesLoading = ref(true)
const dataLoading = ref(false)
const searchLoading = ref(false)

// 🔥 数据存储
const categories = ref({})  // 作物分类数据
const varietyData = ref({     // 当前显示的品种数据
  varieties: [],
  varietyCount: 0
})

// 🔥 搜索相关
const isSearchMode = ref(false)
const searchResults = ref([])

// 🔥 路由列表映射
const routerList = [
  "",
  "CropIndex",                    // 1 - 首页
  "CropVarietyFront",             // 2 - 标准象百科
  "CropDiseasePest",         // 3 - 象差百科
  "CropGraph",               // 4 - 知识检索
  "QA"                       // 5 - 问答专区
];

// 🔥 计算属性 - 按组分类的分类数据
const groupedCategories = computed(() => {
  const groups = {}

  Object.entries(categories.value).forEach(([id, category]) => {
    let groupName = '其他'

    // 根据作物名称分组
    if (category.name.includes('小麦') || category.name.includes('玉米')) {
      groupName = '禾本科'
    } else if (category.name.includes('马铃薯') || category.name.includes('红薯')) {
      groupName = '薯类'
    } else if (category.name.includes('棉花') || category.name.includes('亚麻')) {
      groupName = '纤维类'
    }

    if (!groups[groupName]) {
      groups[groupName] = []
    }

    groups[groupName].push({
      id: id,
      name: category.name,
      count: category.varietyCount || category.count || 0
    })
  })

  return groups
})

// 🔥 计算属性 - 当前显示的数据
const varietyList = computed(() => varietyData.value.varieties || [])
const varietyCount = computed(() => varietyData.value.varietyCount || 0)

// 🔥 智能搜索建议功能
const querySearchSuggestions = async (queryString, callback) => {
  if (!queryString || queryString.length < 1) {
    callback([])
    return
  }
  
  try {
    const suggestions = []
    const keyword = queryString.toLowerCase()
    
    // 🔥 方案1: 作物相关建议
    const crops = ['小麦', '玉米']
    crops.forEach(crop => {
      if (crop.includes(keyword) || keyword.includes(crop.charAt(0))) {
        suggestions.push({
          value: crop,
          type: '作物',
          description: `查看${crop}的所有品种信息`,
          category: 'crop'
        })
        
        suggestions.push({
          value: `${crop}品种`,
          type: '品种',
          description: `查看${crop}的所有品种`,
          category: 'variety'
        })
      }
    })
    
    // 🔥 方案2: 从当前数据中匹配
    varietyList.value.forEach(variety => {
      if (variety.name.toLowerCase().includes(keyword)) {
        suggestions.push({
          value: variety.name,
          type: '品种',
          description: variety.description ? variety.description.substring(0, 30) + '...' : '点击查看详情',
          category: 'specific',
          data: variety
        })
      }
    })
    
    // 🔥 方案3: 常见品种建议
    const commonVarieties = [
      { name: '济麦22', type: '品种', desc: '高产优质小麦品种' },
      { name: '郑单958', type: '品种', desc: '经典玉米杂交种' },
      { name: '保麦1号', type: '品种', desc: '抗病小麦品种' },
      { name: '中麦170', type: '品种', desc: '优质小麦品种' }
    ]
    
    commonVarieties.forEach(variety => {
      if (variety.name.toLowerCase().includes(keyword)) {
        suggestions.push({
          value: variety.name,
          type: variety.type,
          description: variety.desc,
          category: 'common'
        })
      }
    })
    
    // 去重和排序
    const uniqueSuggestions = suggestions
      .filter((item, index, self) => 
        index === self.findIndex(t => t.value === item.value)
      )
      .slice(0, 8)
    
    console.log('🔍 生成搜索建议:', uniqueSuggestions.length, '个')
    callback(uniqueSuggestions)
    
  } catch (error) {
    console.error('获取搜索建议失败:', error)
    callback([])
  }
}

// 🔥 处理搜索建议选择
const handleSuggestionSelect = (item) => {
  console.log('🔍 选择搜索建议:', item)
  searchKeyword.value = item.value
  
  if (item.category === 'crop') {
    // 作物类型 - 切换到对应分类
    const cropName = item.value
    let targetCropId = null
    let targetMenuIndex = null
    
    Object.entries(categories.value).forEach(([id, categoryInfo]) => {
      if (categoryInfo.name.includes(cropName)) {
        targetCropId = id
        const groupName = cropName.includes('小麦') || cropName.includes('玉米') ? '禾本科' : '其他'
        targetMenuIndex = `${groupName}-${id}`
      }
    })
    
    if (targetCropId) {
      activeMenu.value = targetMenuIndex
      isSearchMode.value = false
      searchResults.value = []
      selectCrop(targetCropId)
      ElMessage.success(`已切换到${cropName}品种`)
    } else {
      handleSearch()
    }
  } else if (item.category === 'specific' && item.data) {
    // 具体品种 - 直接跳转到详情页
    goToVarietyDetail(item.data)
  } else {
    // 其他类型 - 执行搜索
    handleSearch()
  }
}

// 🔥 获取建议标签类型
const getSuggestionTagType = (type) => {
  const typeMap = {
    '作物': 'primary',
    '品种': 'success'
  }
  return typeMap[type] || 'info'
}


// 设置搜索关键词并搜索
const setKeyword = (word) => {
  searchKeyword.value = word;
  handleSearch();
};

// 🔥 方法：加载作物分类
const loadCategories = async () => {
  try {
    categoriesLoading.value = true
    console.log('🔍 开始加载作物分类...')

    const response = await getCropCategoriesForDisplay()

    if (response.code === 200) {
      categories.value = response.data
      console.log('✅ 作物分类加载成功:', categories.value)

      // 🔥 处理路由参数
      await handleRouteParams()

    } else {
      console.error('❌ 加载作物分类失败:', response.msg)
      ElMessage.error('加载作物分类失败')
    }
  } catch (error) {
    console.error('💥 加载作物分类出错:', error)
    ElMessage.error('加载作物分类失败，请检查网络连接')
  } finally {
    categoriesLoading.value = false
  }
}

// 🔥 处理路由参数
const handleRouteParams = async () => {
  const { cropId, cropName, varietyId, varietyName } = route.query
  
  console.log('🔍 处理路由参数:', { cropId, cropName, varietyId, varietyName })
  
  if (varietyName) {
    // 如果有品种名称，执行搜索
    searchKeyword.value = varietyName
    await handleSearch()
  } else if (cropId) {
    // 如果有作物ID，切换到对应分类
    await selectCrop(cropId)
  } else {
    // 🔥 默认选择第一个分类（小麦）
    const firstCropId = Object.keys(categories.value)[0] || 'crop_1'
    await selectCrop(firstCropId)
  }
}

// 🔥 方法：选择作物并加载数据
const selectCrop = async (cropId) => {
  try {
    dataLoading.value = true
    currentCropId.value = cropId

    const categoryInfo = categories.value[cropId]
    if (categoryInfo) {
      currentCrop.value = categoryInfo.name
    }

    console.log('🔍 开始加载品种数据，作物ID:', cropId)

    const response = await getVarietiesForDisplay(cropId)
console.log(response)
    if (response.code === 200) {
      varietyData.value = {
        varieties: response.data || [],
        varietyCount: response.data ? response.data.length : 0
      }
      console.log('✅ 品种数据加载成功:', varietyData.value)

      // 退出搜索模式
      isSearchMode.value = false
      searchResults.value = []

    } else {
      console.error('❌ 加载品种数据失败:', response)
      ElMessage.error(response.msg || '加载数据失败')
    }
  } catch (error) {
    console.error('💥 加载品种数据出错:', error)
    ElMessage.error('加载数据失败，请检查网络连接')
  } finally {
    dataLoading.value = false
  }
}

// 🔥 方法：处理菜单选择
const handleMenuSelect = (index) => {
  console.log('🔍 菜单选择:', index)
  activeMenu.value = index

  // 解析菜单索引获取作物ID
  const parts = index.split('-')
  if (parts.length >= 2) {
    const cropId = parts[1]
    selectCrop(cropId)
    
    // 获取分类名称用于提示
    const categoryInfo = categories.value[cropId]
    if (categoryInfo) {
      ElMessage.success(`已选择: ${categoryInfo.name}`)
    }
  }
}

// 🔥 搜索功能
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning("请输入搜索关键词")
    return
  }

  try {
    searchLoading.value = true
    isSearchMode.value = true

    console.log('🔍 开始搜索品种:', searchKeyword.value)

    let searchResults_local = []

    // 🔥 方法1: 直接API搜索
    try {
      const response = await searchVarietiesForDisplay(searchKeyword.value)
      if (response.code === 200 && response.data) {
        searchResults_local = response.data
        console.log('✅ API搜索结果:', searchResults_local.length)
      }
    } catch (error) {
      console.warn('API搜索失败，尝试本地搜索')
    }

    // 🔥 方法2: 本地搜索
    if (searchResults_local.length === 0) {
      const keyword = searchKeyword.value.toLowerCase()
      searchResults_local = varietyList.value.filter(variety => 
        variety.name.toLowerCase().includes(keyword) ||
        (variety.description && variety.description.toLowerCase().includes(keyword))
      )
      console.log('✅ 本地搜索结果:', searchResults_local.length)
    }

    searchResults.value = searchResults_local
    
    if (searchResults.value.length > 0) {
      ElMessage.success(`找到 ${searchResults.value.length} 个相关品种`)
    } else {
      ElMessage.warning(`未找到与"${searchKeyword.value}"相关的品种`)
    }
    
  } catch (error) {
    console.error('💥 搜索出错:', error)
    ElMessage.error('搜索失败，请检查网络连接')
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

// 🔥 方法：清除搜索
const clearSearch = () => {
  isSearchMode.value = false
  searchResults.value = []
  searchKeyword.value = ''
  
  // 🔥 如果有当前作物，重新加载当前作物数据
  if (currentCropId.value) {
    selectCrop(currentCropId.value)
  }
  
  ElMessage.info('已清除搜索结果，返回分类浏览')
}

// 🔥 方法：跳转到品种详情页面
const goToVarietyDetail = (variety) => {
  console.log('🔍 点击品种:', variety)
  ElMessage.success(`正在查看${variety.name}详情...`)

  try {
    router.push({
      path: '/ld/varietyDetail',
      query: {
        id: variety.id,
        name: variety.name  // 🔥 注意：这里使用 variety.name，后端通过 varietyName 参数查询
      }
    })
  } catch (error) {
    console.error('💥 路由跳转失败:', error)
    ElMessage.error('页面跳转失败，请检查路由配置')
  }
}

// 🔥 生命周期：页面加载时获取数据
onMounted(async () => {
  console.log('🚀 标准象百科页面已加载，开始初始化数据...')
  console.log('🔍 路由参数:', route.query)
  await loadCategories()
})

// 🔥 监听搜索关键词变化
watch(searchKeyword, (newVal, oldVal) => {
  console.log('🔍 搜索关键词变化:', { oldVal, newVal })
  
  if (newVal === '' && oldVal && oldVal.length > 0 && isSearchMode.value) {
    console.log('🧹 自动清除搜索模式')
    clearSearch()
  }
})

// 🔥 监听路由变化
watch(() => route.query, (newQuery, oldQuery) => {
  console.log('🔄 路由查询参数变化:', { oldQuery, newQuery })
  
  if (newQuery !== oldQuery) {
    console.log('🎯 检测到新的路由请求')
    handleRouteParams()
  }
}, { deep: true })
</script>

<style scoped>
/* 🔥 与象差百科完全一致的样式，只是更改了相关的类名 */

/* 顶部导航栏样式 */
.custom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  height: 60px;
  background: linear-gradient(90deg, #1bbc9b, #17c2e6);
  color: #fff;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo-title {
  font-weight: bold;
  font-size: 22px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

/* 分类导航样式 */
.custom-menu {
  border-bottom: 1px solid #e0e0e0;
  padding: 0 30px;
  font-size: 16px;
}

/* 搜索区域样式 */
.search-section {
  text-align: center;
  padding: 30px 20px;
  background-color: #f9f9f9;
}

.headline {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-input {
  width: 60vw;
  height: 50px;
}

/* 搜索建议样式 */
:deep(.el-autocomplete-suggestion) {
  max-height: 300px;
  overflow-y: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.el-autocomplete-suggestion li) {
  line-height: auto;
  padding: 10px 15px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

:deep(.el-autocomplete-suggestion li:hover) {
  background-color: #f8f9fa;
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.suggestion-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.suggestion-name {
  font-weight: 500;
  color: #333;
  flex: 1;
  text-align: left;
}

.suggestion-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  text-align: left;
}

.hot-words {
  font-size: 14px;
  color: #666;
}

.hot-words .el-link {
  margin-left: 10px;
}

/* 主内容区域样式 */
.content-section {
  padding: 25px;
}

/* 左侧导航栏样式 */
.sidebar {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.08);
  height: fit-content;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e8f4f8;
  background: linear-gradient(135deg, #f8fffe, #f0f9ff);
  border-radius: 12px 12px 0 0;
}

.sidebar-header h3 {
  margin: 0;
  color: #21911B;
  font-size: 16px;
  font-weight: 600;
}

.sidebar-menu {
  border-right: none;
}

.category-skeleton {
  padding: 20px;
}

.category-count {
  font-size: 12px;
  color: #999;
  margin-left: 5px;
}

/* 右侧主内容区域样式 */
.main-content {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.08);
}

.content-wrapper {
  padding: 0;
}

/* 品种区域样式 */
.variety-section,
.search-results-section {
  margin-bottom: 40px;
}

.section-header {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-search {
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-search:hover {
  color: #409eff;
}

.count-skeleton {
  width: 100px;
  height: 20px;
}

/* 品种网格布局 */
.variety-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.variety-item {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: #333;
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.variety-item:hover {
  background: #e8f5e8;
  border-color: #67c23a;
  color: #67c23a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
}

.variety-name {
  font-weight: 500;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .custom-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
    height: auto;
    padding: 15px;
  }

  .custom-menu {
    padding: 0 15px;
    font-size: 14px;
  }

  .search-section {
    padding: 20px;
  }

  .search-input {
    width: 90vw;
    height: 45px;
  }

  .content-section {
    padding: 10px;
  }

  .content-section .el-row {
    flex-direction: column;
  }

  .sidebar {
    margin-bottom: 20px;
  }

  .main-content {
    margin-bottom: 20px;
    padding: 15px;
  }

  .variety-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .variety-item {
    padding: 12px;
    font-size: 13px;
    min-height: 50px;
  }

  .section-header {
    font-size: 16px;
    margin-bottom: 15px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
/* FarmerTask 同系主题覆盖
   只修改视觉样式，不改动模板、方法、功能、接口及原有注释。 */
.custom-menu {
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
  min-height: 56px;
  padding: 0 20px;
  margin: 18px 18px 0;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(58,88,63,.08);
}

.custom-menu :deep(.el-menu-item) {
  min-width: 104px;
  color: var(--ft-text-secondary);
  font-weight: 650;
  border-bottom: 0;
}

.custom-menu :deep(.el-menu-item:hover) {
  color: var(--ft-green);
  background: #f1f7ef;
}

.custom-menu :deep(.el-menu-item.is-active) {
  color: var(--ft-green);
  background: #edf5e9;
  border-bottom: 3px solid var(--ft-green);
}

.search-section,
.content-section {
  --ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
}

.search-section {
  padding: 32px 20px 28px;
  margin: 14px 18px 0;
  text-align: center;
  background:
    radial-gradient(circle at 88% 10%, rgba(127,168,138,.16), transparent 30%),
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(244,249,241,.98));
  border: 1px solid var(--ft-border);
  border-radius: 16px;
  box-shadow: var(--ft-shadow);
}

.headline {
  margin-bottom: 18px;
  color: #294635;
  font-size: 24px;
  font-weight: 850;
  letter-spacing: 1px;
}

.search-bar {
  max-width: 760px;
  margin: 0 auto;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 48px;
  padding-left: 16px;
  background: #ffffff;
  border-radius: 12px 0 0 12px;
  box-shadow: 0 0 0 1px #cddfcd inset;
}

.search-input :deep(.el-input-group__append) {
  padding: 0;
  overflow: hidden;
  background: var(--ft-green);
  border: 0;
  border-radius: 0 12px 12px 0;
  box-shadow: none;
}

.search-input :deep(.el-input-group__append .el-button) {
  min-width: 88px;
  height: 48px;
  color: #ffffff !important;
  font-size: 14px !important;
  font-weight: 700;
  background: var(--ft-green);
  border: 0;
}

.hot-words {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 8px 14px;
  color: #7c8f80;
  font-size: 12px;
}

.content-section {
  min-height: calc(100vh - 295px);
  padding: 18px;
  margin: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(127,168,138,.13), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
}

.content-section > :deep(.el-row) {
  max-width: 1440px;
  margin: 0 auto !important;
}

.content-section .sidebar {
  overflow: hidden;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: var(--ft-shadow);
}

.sidebar-header {
  min-height: 62px;
  padding: 0 17px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.sidebar-header h3 {
  margin: 0;
  color: #294635;
  font-size: 17px;
}

.sidebar-menu {
  border-right: 0;
}

.sidebar-menu :deep(.el-sub-menu__title),
.sidebar-menu :deep(.el-menu-item) {
  color: #526b5c;
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu__title:hover) {
  color: var(--ft-green);
  background: #f0f6ee;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #24583f;
  font-weight: 700;
  background: #e7f1e5;
  box-shadow: inset 3px 0 0 var(--ft-green);
}

.category-count {
  margin-left: auto;
  color: #91a095;
  font-size: 11px;
}

.content-section .main-content {
  min-width: 0;
}

.content-wrapper {
  min-height: 520px;
  padding: 20px;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: var(--ft-shadow);
}

.section-header {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 16px;
  margin: 0 0 16px;
  color: #294635;
  font-size: 18px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border: 1px solid #dfe9dd;
  border-left: 4px solid var(--ft-green);
  border-radius: 11px;
}

.clear-search {
  margin-left: auto;
}

.variety-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 13px;
}

.variety-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 66px;
  padding: 12px 14px;
  gap: 9px;
  background:
    radial-gradient(circle at 100% 0%, rgba(127,168,138,.13), transparent 34%),
    linear-gradient(145deg, #ffffff, #f7faf5);
  border: 1px solid #dce8da;
  border-radius: 11px;
  box-shadow: 0 7px 16px rgba(58,88,63,.06);
  cursor: pointer;
  transition:
    transform .18s ease,
    border-color .18s ease,
    box-shadow .18s ease;
}

.variety-item:hover {
  border-color: #b8d0b9;
  box-shadow: 0 12px 23px rgba(58,88,63,.11);
  transform: translateY(-2px);
}

.variety-name {
  overflow: hidden;
  color: #355541;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .custom-menu,
  .search-section {
    margin-right: 10px;
    margin-left: 10px;
  }

  .content-section {
    padding: 10px;
  }

  .content-section .sidebar {
    margin-bottom: 14px;
  }

  .variety-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>

<style scoped>
/* FarmerTask 布局优化覆盖
   保持现有视觉主题，仅改善空间分配、对齐、滚动与响应式布局。 */
.custom-menu {
  width: min(1440px, calc(100% - 36px));
  margin: 18px auto 0;
}

.search-section {
  width: min(1440px, calc(100% - 36px));
  padding: 24px 24px 20px;
  margin: 14px auto 0;
}

.headline {
  margin-bottom: 16px;
  font-size: 22px;
}

.search-bar {
  width: min(720px, 100%);
  margin-right: auto;
  margin-bottom: 12px;
  margin-left: auto;
}

.hot-words {
  margin-top: 10px;
}

.content-section {
  padding: 18px;
}

.content-section > :deep(.el-row),
.content-section > .el-row {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  align-items: start;
  max-width: 1440px;
  margin: 0 auto !important;
  gap: 18px;
}

.content-section > :deep(.el-row) > .el-col,
.content-section > .el-row > .el-col {
  width: auto;
  max-width: none;
  padding: 0 !important;
  flex: none;
}

.content-section .sidebar {
  position: sticky;
  top: 16px;
  width: 248px;
  max-height: calc(100vh - 118px);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  height: 58px;
  padding: 0 16px;
}

.category-skeleton {
  padding: 16px;
}

.sidebar-menu {
  max-height: calc(100vh - 176px);
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu :deep(.el-sub-menu__title),
.sidebar-menu :deep(.el-menu-item) {
  min-height: 44px;
  height: auto;
  padding-right: 14px;
  line-height: 1.45;
}

.content-section .main-content {
  width: 100%;
  min-width: 0;
}

.content-wrapper {
  min-height: calc(100vh - 315px);
  padding: 18px;
}

.section-header {
  min-height: 54px;
  padding: 10px 16px;
  margin-bottom: 16px;
  line-height: 1.45;
}

.count-skeleton {
  width: 100px;
  margin-left: 12px;
}

.variety-grid {
  grid-template-columns: repeat(auto-fill, minmax(205px, 1fr));
  align-content: start;
  gap: 14px;
}

.variety-item {
  min-width: 0;
  min-height: 72px;
  padding: 13px 15px;
}

.variety-name {
  min-width: 0;
  line-height: 1.45;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

@media (max-width: 1120px) {
  .content-section > :deep(.el-row),
  .content-section > .el-row {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .content-section .sidebar {
    width: 220px;
  }

  .variety-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 820px) {
  .custom-menu,
  .search-section {
    width: calc(100% - 20px);
    margin-right: auto;
    margin-left: auto;
  }

  .custom-menu {
    overflow-x: auto;
    padding: 0 8px;
  }

  .custom-menu :deep(.el-menu-item) {
    flex: 0 0 auto;
    min-width: 92px;
  }

  .search-section {
    padding: 20px 14px 16px;
  }

  .content-section {
    padding: 10px;
  }

  .content-section > :deep(.el-row),
  .content-section > .el-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .content-section .sidebar {
    position: static;
    width: 100%;
    max-height: none;
  }

  .sidebar-menu {
    max-height: 280px;
  }

  .content-wrapper {
    min-height: 420px;
    padding: 14px;
  }
}

@media (max-width: 560px) {
  .headline {
    font-size: 19px;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .clear-search {
    margin-left: 0;
  }

  .variety-grid {
    grid-template-columns: 1fr;
  }
}
</style>
