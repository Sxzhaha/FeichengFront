<template>
    <div class="variety-detail-container">
        <!-- 头部信息 -->
        <div class="detail-header">
            <el-breadcrumb separator="/">
                <el-breadcrumb-item>品种详情</el-breadcrumb-item>
                <el-breadcrumb-item>{{ varietyData.varietyName || '加载中...' }}</el-breadcrumb-item>
            </el-breadcrumb>

            <div class="header-content">
                <div class="title-section">
                    <h1>{{ varietyData.varietyName || '品种详情' }}</h1>
                    <el-tag type="success" size="large">
                        品种信息
                    </el-tag>
                </div>
            </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <el-skeleton :rows="8" animated />
        </div>

        <!-- 详情内容 - 两列布局 -->
        <div v-else-if="varietyData.id" class="detail-content">
            <div class="equal-height-container">
                <!-- 左侧列 - 基本信息 -->
                <div class="left-column">
                    <!-- 基本信息卡片 -->
                    <el-card class="info-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <el-icon class="card-icon">
                                    <InfoFilled />
                                </el-icon>
                                <span>基本信息</span>
                            </div>
                        </template>

                        <el-descriptions :column="1" border>
                            <el-descriptions-item label="品种名称">
                                {{ varietyData.varietyName }}
                            </el-descriptions-item>
                            <el-descriptions-item label="审定编号" v-if="varietyData.approvalNumber">
                                {{ varietyData.approvalNumber }}
                            </el-descriptions-item>
                            <el-descriptions-item label="审定年份" v-if="varietyData.approvalYear">
                                {{ varietyData.approvalYear }}
                            </el-descriptions-item>
                            <el-descriptions-item label="是否转基因" v-if="varietyData.isGmo !== null && varietyData.isGmo !== undefined">
                                <el-tag :type="varietyData.isGmo === 0 ? 'success' : 'warning'">
                                    {{ varietyData.isGmo === 0 ? '否' : '是' }}
                                </el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="审定机构" v-if="varietyData.approvalInstitution">
                                {{ varietyData.approvalInstitution }}
                            </el-descriptions-item>
                            <el-descriptions-item label="选育单位" v-if="varietyData.breedingUnit">
                                {{ varietyData.breedingUnit }}
                            </el-descriptions-item>
                            <el-descriptions-item label="状态">
                                <el-tag :type="varietyData.status === 1 ? 'success' : 'info'">
                                    {{ varietyData.status === 1 ? '正常' : '隐藏' }}
                                </el-tag>
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>

                    <!-- 特征特性 -->
                    <el-card class="info-card" shadow="hover" v-if="varietyData.characteristics">
                        <template #header>
                            <div class="card-header">
                                <el-icon class="card-icon characteristics-icon">
                                    <View />
                                </el-icon>
                                <span>特征特性</span>
                            </div>
                        </template>
                        <div class="content-text">
                            {{ varietyData.characteristics }}
                        </div>
                    </el-card>

                    <!-- 🔥 主要栽培措施 - 只有数据时才显示 -->
                    <el-card class="info-card" shadow="hover" v-if="varietyData.cultivationMeasures && varietyData.cultivationMeasures.trim()">
                        <template #header>
                            <div class="card-header">
                                <el-icon class="card-icon cultivation-icon">
                                    <Tools />
                                </el-icon>
                                <span>主要栽培措施</span>
                            </div>
                        </template>
                        <div class="content-text">
                            {{ varietyData.cultivationMeasures }}
                        </div>
                    </el-card>
                </div>

                <!-- 右侧列 - 适宜种植区域和其他信息 -->
                <div class="right-column">
                    <!-- 适宜种植区域 -->
                    <div class="right-section">
                        <el-card class="full-height-card" shadow="hover" v-if="varietyData.suitableArea">
                            <template #header>
                                <div class="card-header">
                                    <el-icon class="card-icon area-icon">
                                        <Location />
                                    </el-icon>
                                    <span>适宜种植区域</span>
                                </div>
                            </template>
                            <div class="card-content">
                                <div class="content-text area-text">
                                    {{ varietyData.suitableArea }}
                                </div>
                            </div>
                        </el-card>
                    </div>

                    <!-- 🔥 知识图谱 - 实现真实功能 -->
                    <div class="right-section">
                        <el-card class="full-height-card" shadow="hover">
                            <template #header>
                                <div class="card-header">
                                    <el-icon class="card-icon graph-icon">
                                        <DataBoard />
                                    </el-icon>
                                    <span>知识图谱</span>
                                    <el-button 
                                        v-if="!knowledgeGraphLoading && knowledgeGraphData.nodes && knowledgeGraphData.nodes.length > 0"
                                        type="text" 
                                        size="small"
                                        @click="goToFullGraph"
                                        style="margin-left: auto;">
                                        查看完整图谱
                                    </el-button>
                                </div>
                            </template>
                            <div class="card-content">
                                <div class="knowledge-graph-container" v-loading="knowledgeGraphLoading">
                                    <!-- 🔥 实际的知识图谱展示区域 -->
                                    <div 
                                        v-if="!knowledgeGraphLoading && knowledgeGraphData.nodes && knowledgeGraphData.nodes.length > 0"
                                        id="variety-knowledge-graph" 
                                        ref="varietyGraphContainer"
                                        class="variety-graph-display">
                                    </div>
                                    
                                    <!-- 🔥 加载状态 -->
                                    <div v-else-if="knowledgeGraphLoading" class="graph-loading">
                                        <el-icon class="is-loading" size="32"><Loading /></el-icon>
                                        <p>正在生成知识图谱...</p>
                                    </div>
                                    
                                    <!-- 🔥 无数据状态 -->
                                    <div v-else class="knowledge-graph-placeholder">
                                        <el-empty description="知识图谱数据加载失败" :image-size="100">
                                            <template #description>
                                                <p style="color: #909399; margin-top: 10px;">
                                                    无法加载相关知识图谱<br />
                                                    <el-button type="primary" size="small" @click="retryLoadGraph">
                                                        重新加载
                                                    </el-button>
                                                    <el-button type="info" size="small" @click="createTestGraphData" style="margin-left: 8px;">
                                                        测试数据
                                                    </el-button>
                                                </p>
                                            </template>
                                        </el-empty>
                                    </div>
                                </div>
                            </div>
                        </el-card>
                    </div>
                </div>
            </div>
        </div>

        <!-- 数据为空状态 -->
        <el-empty v-else-if="!loading" description="未找到相关品种信息" :image-size="200">
            <el-button type="primary" @click="goBack">返回列表</el-button>
        </el-empty>

        <!-- 操作按钮区域 -->
        <div class="action-bar" v-if="!loading && varietyData.id">
            <el-button @click="goBack">
                <el-icon>
                    <ArrowLeft />
                </el-icon>
                返回列表
            </el-button>
            <el-button type="primary" @click="printDetail">
                <el-icon>
                    <Printer />
                </el-icon>
                打印详情
            </el-button>
            <el-button type="success" @click="exportDetail">
                <el-icon>
                    <Download />
                </el-icon>
                导出详情
            </el-button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
    ArrowLeft,
    InfoFilled,
    View,
    Tools,
    Location,
    Printer,
    Download,
    WarningFilled
} from '@element-plus/icons-vue'

// 🔥 导入API
import { getVarietyDetailByName } from '@/api/binZhou/ld/knowledge/varietyDetail'
import { getKnowledgeGraphDataWithSpecificNode } from '@/api/binZhou/ld/knowledge/knowledgeGraph'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(true)
const varietyData = ref({})

// 🔥 知识图谱相关数据
const knowledgeGraphLoading = ref(false)
const knowledgeGraphData = ref({ nodes: [], links: [] })
const varietyGraphContainer = ref(null)
let varietySvg = null

// 🔥 计算属性
const hasCharacteristics = computed(() => {
    return varietyData.value.characteristics && varietyData.value.characteristics.trim().length > 0
})

const hasCultivationMeasures = computed(() => {
    return varietyData.value.cultivationMeasures && varietyData.value.cultivationMeasures.trim().length > 0
})

const characteristicsLength = computed(() => {
    return hasCharacteristics.value ? varietyData.value.characteristics.trim().length : 0
})

// 方法
const fetchDetail = async () => {
    try {
        loading.value = true
        const varietyName = route.query.name

        console.log('🔍 开始获取品种详情，名称:', varietyName)

        if (!varietyName) {
            ElMessage.error('缺少品种名称参数')
            return
        }

        const response = await getVarietyDetailByName(varietyName)
        console.log('📡 API响应:', response)

        if (response.code === 200 && response.data) {
            varietyData.value = response.data
            console.log('✅ 获取品种详情成功:', varietyData.value)

            // 更新页面标题
            document.title = `${varietyData.value.varietyName} - 品种详情`
            
            // 🔥 加载知识图谱
            loadKnowledgeGraph()
            
            // 🔥 临时测试：如果API没有响应，创建测试数据
            setTimeout(() => {
                if (!knowledgeGraphData.value.nodes || knowledgeGraphData.value.nodes.length === 0) {
                    console.log('🧪 使用测试数据渲染图谱')
                    createTestGraphData()
                }
            }, 2000)
        } else {
            console.error('❌ API返回错误:', response)
            ElMessage.error(response.msg || '获取品种详情失败')
        }
    } catch (error) {
        console.error('💥 获取品种详情出错:', error)
        ElMessage.error('获取品种详情失败，请检查网络连接')
    } finally {
        loading.value = false
    }
}

const goBack = () => {
    router.go(-1) // 返回上一页
}

const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
}

const printDetail = () => {
    window.print()
}

const exportDetail = () => {
    ElMessage.info('导出功能开发中...')
    // 这里可以实现导出为PDF或Word的功能
}

// 🔥 加载知识图谱数据
const loadKnowledgeGraph = async () => {
    if (!varietyData.value.varietyName) {
        console.log('品种名称为空，无法加载知识图谱')
        return
    }
    
    try {
        knowledgeGraphLoading.value = true
        console.log('🔍 开始加载知识图谱:', varietyData.value.varietyName)
        
        const response = await getKnowledgeGraphDataWithSpecificNode({
            centerNode: 'crop_1', // 默认小麦，API会自动判断
            specificNodeName: varietyData.value.varietyName,
            nodeType: '品种'
        })
        
        console.log('📊 知识图谱响应:', response)
        
        if (response.code === 200 && response.data) {
            knowledgeGraphData.value = {
                nodes: response.data.nodes || [],
                links: response.data.links || []
            }
            
            console.log('✅ 知识图谱数据加载成功:', knowledgeGraphData.value)
            
            // 🔥 修复：等待DOM完全更新后再渲染图谱
            knowledgeGraphLoading.value = false
            
            // 使用setTimeout确保DOM完全渲染
            setTimeout(() => {
                renderVarietyGraph()
            }, 100)
            
        } else {
            console.error('❌ 知识图谱加载失败:', response.msg)
            ElMessage.warning('知识图谱加载失败')
        }
    } catch (error) {
        console.error('💥 知识图谱加载出错:', error)
        ElMessage.error('知识图谱加载失败')
    } finally {
        // 如果没有成功加载数据，在这里设置loading为false
        if (!knowledgeGraphData.value.nodes || knowledgeGraphData.value.nodes.length === 0) {
            knowledgeGraphLoading.value = false
        }
    }
}

// 🔥 渲染品种详情页面的知识图谱 - 原生DOM版本（不依赖d3）
const renderVarietyGraph = () => {
    if (!knowledgeGraphData.value.nodes || knowledgeGraphData.value.nodes.length === 0) {
        console.log('没有图谱数据可渲染')
        return
    }
    
    console.log('🎨 开始渲染品种详情页知识图谱...')
    
    // 🔥 增加多次尝试获取容器的机制
    const tryRender = (attempts = 0) => {
        const container = document.getElementById('variety-knowledge-graph')
        
        if (!container) {
            console.warn(`尝试 ${attempts + 1}: 找不到图谱容器`)
            
            if (attempts < 5) {
                setTimeout(() => {
                    tryRender(attempts + 1)
                }, 200)
                return
            } else {
                console.error('❌ 找不到图谱容器，放弃渲染')
                return
            }
        }
        
        console.log('✅ 找到图谱容器，开始渲染（原生SVG版本）')
        
        // 🔥 使用原生DOM方式 - 不依赖d3
        // 清除旧的SVG
        const existingSvg = container.querySelector('svg')
        if (existingSvg) {
            existingSvg.remove()
        }
        
        const width = container.clientWidth || 300
        const height = container.clientHeight || 250
        
        console.log('品种图谱容器尺寸:', { width, height })
        
        // 🔥 创建SVG - 使用原生DOM方式
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', width)
        svg.setAttribute('height', height)
        svg.style.border = '1px solid #eee'
        svg.style.borderRadius = '8px'
        svg.style.background = '#fafafa'
        
        container.appendChild(svg)
        
        // 准备数据
        const validNodes = knowledgeGraphData.value.nodes.filter(node => node && node.id && node.name)
        
        console.log(`品种图谱: ${validNodes.length}个节点`)
        
        // 🔥 如果没有有效数据，显示提示
        if (validNodes.length === 0) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            text.setAttribute('x', width / 2)
            text.setAttribute('y', height / 2)
            text.setAttribute('text-anchor', 'middle')
            text.style.fill = '#999'
            text.style.fontSize = '14px'
            text.textContent = '暂无图谱数据'
            svg.appendChild(text)
            return
        }
        
        // 应用预设位置（缩放到适合容器）
        const scaleX = width / 800
        const scaleY = height / 600
        
        validNodes.forEach(node => {
            if (node.fx !== undefined && node.fy !== undefined) {
                node.x = node.fx * scaleX
                node.y = node.fy * scaleY
            } else {
                node.x = width / 2 + (Math.random() - 0.5) * width * 0.6
                node.y = height / 2 + (Math.random() - 0.5) * height * 0.6
            }
        })
        
        // 绘制连线
        const validLinks = knowledgeGraphData.value.links.filter(link => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source?.id || link.source)
            const targetId = typeof link.target === 'string' ? link.target : (link.target?.id || link.target)
            const validNodeIds = new Set(validNodes.map(node => node.id))
            return sourceId && targetId && validNodeIds.has(sourceId) && validNodeIds.has(targetId)
        })
        
        validLinks.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source?.id || link.source)
            const targetId = typeof link.target === 'string' ? link.target : (link.target?.id || link.target)
            
            const sourceNode = validNodes.find(n => n.id === sourceId)
            const targetNode = validNodes.find(n => n.id === targetId)
            
            if (sourceNode && targetNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
                line.setAttribute('x1', sourceNode.x)
                line.setAttribute('y1', sourceNode.y)
                line.setAttribute('x2', targetNode.x)
                line.setAttribute('y2', targetNode.y)
                line.setAttribute('stroke', '#ccc')
                line.setAttribute('stroke-width', '1.5')
                line.setAttribute('stroke-opacity', '0.8')
                svg.appendChild(line)
            }
        })
        
        // 绘制节点
        validNodes.forEach(node => {
            // 创建节点组
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
            g.setAttribute('transform', `translate(${node.x},${node.y})`)
            
            // 创建圆圈
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            circle.setAttribute('r', getVarietyNodeRadius(node.level))
            circle.setAttribute('fill', getVarietyNodeColor(node.type, node.level, node.highlight))
            circle.setAttribute('stroke', '#fff')
            circle.setAttribute('stroke-width', '2')
            circle.style.cursor = 'pointer'
            
            // 添加点击事件
            circle.addEventListener('click', () => {
                console.log('点击品种图谱节点:', node)
                if (node.level > 2) {
                    ElMessage.info(`查看${node.name}详情...`)
                }
            })
            
            // 创建标签
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
            text.setAttribute('dy', '0.35em')
            text.setAttribute('text-anchor', 'middle')
            text.style.fontSize = getVarietyNodeFontSize(node.level)
            text.style.fontWeight = node.highlight ? 'bold' : 'normal'
            text.style.fill = node.highlight ? '#000' : '#333'
            text.style.pointerEvents = 'none'
            
            const name = node.name || '未知'
            text.textContent = name.length > 6 ? name.substring(0, 6) + '...' : name
            
            g.appendChild(circle)
            g.appendChild(text)
            svg.appendChild(g)
        })
        
        console.log('✅ 品种详情页知识图谱渲染完成（原生SVG版本）')
    }
    
    // 开始尝试渲染
    tryRender()
}

// 🔥 获取品种图谱节点半径
const getVarietyNodeRadius = (level) => {
    const radiusMap = { 1: 20, 2: 16, 3: 12, 4: 10 }
    return radiusMap[level] || 12
}

// 🔥 获取品种图谱节点颜色
const getVarietyNodeColor = (type, level, highlight) => {
    if (highlight) {
        // 🔥 高亮节点使用绿色背景，符合品种特色
        return '#52c41a' // 绿色
    }
    
    if (level === 1) return '#1890ff' // 作物
    if (level === 2) return '#52c41a' // 类型
    
    const typeColorMap = {
        'variety': '#13c2c2',
        'disease': '#ff9c6e',
        'pest': '#fadb14',
        'stress': '#b37feb'
    }
    return typeColorMap[type] || '#8c8c8c'
}

// 🔥 获取品种图谱节点字体大小
const getVarietyNodeFontSize = (level) => {
    const sizeMap = { 1: '12px', 2: '10px', 3: '9px', 4: '8px' }
    return sizeMap[level] || '9px'
}

// 🔥 跳转到完整知识图谱
const goToFullGraph = () => {
    router.push({
        name: 'CropGraph',
        query: {
            searchKeyword: varietyData.value.varietyName
        }
    })
    ElMessage.success('正在跳转到完整知识图谱...')
}

// 🔥 创建测试图谱数据（用于调试）
const createTestGraphData = () => {
    console.log('📝 创建测试知识图谱数据')
    
    const currentName = varietyData.value.varietyName || '金丰麦1号'
    console.log('当前品种名称:', currentName)
    
    const testNodes = [
        {
            id: 'crop_1',
            name: '小麦',
            type: 'crop',
            level: 1,
            fx: 150,
            fy: 125,
            fixed: true
        },
        {
            id: 'type_variety_1',
            name: '小麦品种',
            type: 'variety_type',
            level: 2,
            fx: 75,
            fy: 75,
            fixed: true
        },
        {
            id: 'variety_1',
            name: currentName, // 🔥 确保使用当前品种名称
            type: 'variety',
            level: 3,
            fx: 25,
            fy: 50,
            fixed: true,
            highlight: true, // 🔥 高亮当前节点
            isSpecific: true
        },
        {
            id: 'variety_2',
            name: '济麦22',
            type: 'variety',
            level: 3,
            fx: 75,
            fy: 25,
            fixed: true
        },
        {
            id: 'variety_3',
            name: '保麦1号',
            type: 'variety',
            level: 3,
            fx: 125,
            fy: 50,
            fixed: true
        }
    ]
    
    const testLinks = [
        { source: 'crop_1', target: 'type_variety_1', type: '包含' },
        { source: 'type_variety_1', target: 'variety_1', type: '包含' },
        { source: 'type_variety_1', target: 'variety_2', type: '包含' },
        { source: 'type_variety_1', target: 'variety_3', type: '包含' }
    ]
    
    knowledgeGraphData.value = {
        nodes: testNodes,
        links: testLinks
    }
    
    // 渲染测试图谱
    setTimeout(() => {
        renderVarietyGraph()
    }, 100)
    
    ElMessage.success(`✨ "${currentName}" 已在知识图谱中高亮显示（绿色）`)
}

// 🔥 重试加载图谱
const retryLoadGraph = () => {
    console.log('🔄 重试加载知识图谱')
    knowledgeGraphData.value = { nodes: [], links: [] }
    loadKnowledgeGraph()
}

// 生命周期
onMounted(() => {
    console.log('🚀 品种详情页面加载，路由参数:', route.query)
    fetchDetail()
})
</script>

<style scoped>
/* 使用与病虫害详情页相同的基础样式 */
.variety-detail-container {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
    min-height: calc(100vh - 120px);
}

.detail-header {
    margin-bottom: 20px;
}

.header-content {
    margin-top: 16px;
}

.title-section {
    display: flex;
    align-items: center;
    gap: 16px;
}

.title-section h1 {
    margin: 0;
    color: #303133;
    font-size: 28px;
    font-weight: 600;
}

.loading-container {
    padding: 40px;
}

.detail-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* 等高容器 */
.equal-height-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
    min-height: 600px;
}

/* 左侧列 */
.left-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 600px;
}

/* 右侧列 */
.right-column {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 20px;
    height: 600px;
    min-height: 600px;
}

/* 右侧每个区域 */
.right-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
}

/* 占满高度的卡片 */
.full-height-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    min-height: 0;
}

.full-height-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* 卡片内容区域 */
.card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: auto;
    min-height: 0;
}

/* 通用卡片样式 */
.info-card {
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    height: fit-content;
}

.info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #303133;
}

.card-icon {
    font-size: 18px;
}

.characteristics-icon {
    color: #e6a23c;
}

.cultivation-icon {
    color: #f56c6c;
}

.area-icon {
    color: #909399;
}

.graph-icon {
    color: #8b5cf6;
}

.content-text {
    line-height: 1.8;
    color: #606266;
    font-size: 14px;
    text-align: justify;
    white-space: pre-wrap;
    word-break: break-all;
}

.area-text {
    color: #67c23a;
    font-weight: 500;
}

/* 子章节样式 */
.sub-section {
    margin-bottom: 20px;
}

.sub-section:last-child {
    margin-bottom: 0;
}

.sub-title {
    color: #409eff;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 10px 0;
    padding-bottom: 5px;
    border-bottom: 2px solid #e8f4fd;
}

/* 🔥 知识图谱样式 */
.knowledge-graph-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.variety-graph-display {
    width: 100%;
    height: 250px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fafafa;
    position: relative;
    overflow: hidden;
}

.graph-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #909399;
    gap: 12px;
}

.graph-loading p {
    margin: 0;
    font-size: 14px;
}

.knowledge-graph-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fafafa;
    min-height: 250px;
}

/* 🔥 品种详情页D3图谱节点样式 */
.variety-graph-display :deep(.nodes circle) {
    cursor: pointer;
    transition: all 0.3s ease;
}

.variety-graph-display :deep(.nodes circle:hover) {
    stroke-width: 3px;
    filter: brightness(1.1);
}

.variety-graph-display :deep(.nodes text) {
    pointer-events: none;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    user-select: none;
}

.variety-graph-display :deep(.links line) {
    stroke: #ccc;
    stroke-opacity: 0.8;
}

/* 操作按钮 */
.action-bar {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    gap: 12px;
    background: white;
    padding: 12px 16px;
    border-radius: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    z-index: 100;
}

/* 响应式设计 */
@media (max-width: 1200px) {
    .equal-height-container {
        grid-template-columns: 1fr;
        gap: 20px;
    }

    .right-column {
        grid-template-rows: auto auto;
        height: auto;
    }
}

@media (max-width: 768px) {
    .variety-detail-container {
        padding: 16px;
    }

    .title-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .title-section h1 {
        font-size: 24px;
    }

    .action-bar {
        position: static;
        margin-top: 20px;
        justify-content: center;
        box-shadow: none;
        background: transparent;
    }
    
    .variety-graph-display {
        height: 200px;
    }
}

/* 打印样式 */
@media print {
    .detail-header .el-breadcrumb,
    .action-bar {
        display: none;
    }

    .variety-detail-container {
        padding: 0;
        max-width: none;
    }

    .info-card,
    .full-height-card {
        break-inside: avoid;
        box-shadow: none;
        border: 1px solid #ddd;
    }
}
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
.variety-detail-container {
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
  padding: 20px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127,168,138,.17), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.variety-detail-container *,
.variety-detail-container *::before,
.variety-detail-container *::after {
  box-sizing: border-box;
}

.variety-detail-container .detail-header {
  padding: 18px 20px;
  margin-bottom: 16px;
  background:
    radial-gradient(circle at 92% 0%, rgba(127,168,138,.16), transparent 34%),
    rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: var(--ft-shadow);
}

.variety-detail-container .header-content {
  padding-top: 14px;
}

.variety-detail-container .title-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.variety-detail-container .title-section h1 {
  margin: 0;
  color: #294635;
  font-size: 28px;
  letter-spacing: 1px;
}

.variety-detail-container .loading-container {
  padding: 24px;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: var(--ft-shadow);
}

.variety-detail-container .detail-content {
  max-width: 1480px;
  margin: 0 auto;
}

.variety-detail-container .equal-height-container {
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  align-items: start;
  gap: 16px;
}

.variety-detail-container .left-column,
.variety-detail-container .right-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.variety-detail-container .right-section {
  min-width: 0;
}

.variety-detail-container .info-card,
.variety-detail-container .full-height-card {
  overflow: hidden;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 10px 24px rgba(58,88,63,.08);
}

.variety-detail-container .info-card:hover,
.variety-detail-container .full-height-card:hover {
  border-color: #bfd3c0;
  box-shadow: 0 14px 29px rgba(58,88,63,.11);
}

.variety-detail-container .info-card :deep(.el-card__header),
.variety-detail-container .full-height-card :deep(.el-card__header) {
  min-height: 58px;
  padding: 14px 17px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.variety-detail-container .card-header {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #315440;
  font-weight: 800;
}

.variety-detail-container .card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  color: #ffffff;
  font-size: 16px;
  background: linear-gradient(135deg, var(--ft-green), #75a382);
  border-radius: 9px;
  box-shadow: 0 6px 12px rgba(47,125,92,.16);
}

.variety-detail-container .characteristics-icon {
  background: linear-gradient(135deg, #527b61, #8eac94);
}

.variety-detail-container .cultivation-icon {
  background: linear-gradient(135deg, #657a5a, #94aa83);
}

.variety-detail-container .area-icon {
  background: linear-gradient(135deg, #3f7357, #79a282);
}

.variety-detail-container .graph-icon {
  background: linear-gradient(135deg, #365f4b, #698f77);
}

.variety-detail-container .content-text {
  color: #5d7464;
  line-height: 1.85;
  white-space: pre-wrap;
}

.variety-detail-container .area-text {
  min-height: 130px;
}

.variety-detail-container :deep(.el-descriptions__label) {
  width: 120px;
  color: #4f6757;
  font-weight: 650;
  background: #f1f6ee !important;
}

.variety-detail-container :deep(.el-descriptions__content) {
  color: #526b5c;
}

.variety-detail-container .knowledge-graph-container {
  min-height: 390px;
  overflow: hidden;
  background:
    linear-gradient(rgba(66,102,76,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66,102,76,.03) 1px, transparent 1px),
    #f7faf5;
  background-size: 26px 26px;
  border: 1px solid #dce8da;
  border-radius: 11px;
}

.variety-detail-container .variety-graph-display {
  width: 100%;
  min-height: 390px;
}

.variety-detail-container .graph-loading,
.variety-detail-container .knowledge-graph-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 390px;
  flex-direction: column;
  color: #819184;
}

.variety-detail-container .action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 1480px;
  padding: 15px 17px;
  margin: 16px auto 0;
  gap: 9px;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 13px;
  box-shadow: 0 9px 22px rgba(58,88,63,.07);
}

.variety-detail-container :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
}

@media (max-width: 960px) {
  .variety-detail-container .equal-height-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .variety-detail-container {
    padding: 10px;
  }

  .variety-detail-container .title-section,
  .variety-detail-container .action-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .variety-detail-container .action-bar :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>

<style scoped>
/* FarmerTask 布局优化覆盖
   保持现有视觉主题，仅改善两列比例、内容高度、滚动和操作区。 */
.variety-detail-container {
  width: 100%;
  max-width: none;
  padding: 20px;
}

.variety-detail-container .detail-header,
.variety-detail-container .detail-content,
.variety-detail-container .action-bar,
.variety-detail-container > .loading-container,
.variety-detail-container > .el-empty {
  width: min(1440px, 100%);
  margin-right: auto;
  margin-left: auto;
}

.variety-detail-container .detail-header {
  padding: 18px 22px;
  margin-bottom: 16px;
}

.variety-detail-container .header-content {
  padding-top: 13px;
}

.variety-detail-container .title-section {
  min-width: 0;
}

.variety-detail-container .title-section h1 {
  min-width: 0;
  overflow: hidden;
  font-size: clamp(23px, 2.2vw, 30px);
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variety-detail-container .equal-height-container {
  display: grid;
  grid-template-columns: minmax(360px, 0.82fr) minmax(520px, 1.18fr);
  align-items: start;
  gap: 18px;
}

.variety-detail-container .left-column,
.variety-detail-container .right-column {
  gap: 18px;
}

.variety-detail-container .info-card,
.variety-detail-container .full-height-card {
  width: 100%;
}

.variety-detail-container .info-card :deep(.el-card__body),
.variety-detail-container .full-height-card :deep(.el-card__body) {
  padding: 18px;
}

.variety-detail-container .card-header {
  min-width: 0;
}

.variety-detail-container .card-header > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variety-detail-container :deep(.el-descriptions__body) {
  overflow: hidden;
  border-radius: 9px;
}

.variety-detail-container :deep(.el-descriptions__table) {
  table-layout: fixed;
}

.variety-detail-container :deep(.el-descriptions__label) {
  width: 118px;
}

.variety-detail-container :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.variety-detail-container .content-text {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.variety-detail-container .area-text {
  min-height: 108px;
  max-height: 220px;
}

.variety-detail-container .knowledge-graph-container,
.variety-detail-container .variety-graph-display,
.variety-detail-container .graph-loading,
.variety-detail-container .knowledge-graph-placeholder {
  min-height: 500px;
}

.variety-detail-container .knowledge-graph-container {
  width: 100%;
}

.variety-detail-container .action-bar {
  position: sticky;
  z-index: 6;
  bottom: 12px;
  justify-content: flex-end;
  padding: 12px 16px;
  margin-top: 18px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
}

.variety-detail-container .action-bar :deep(.el-button) {
  min-width: 104px;
  margin-left: 0;
}

@media (max-width: 1180px) {
  .variety-detail-container .equal-height-container {
    grid-template-columns: minmax(330px, 0.9fr) minmax(430px, 1.1fr);
  }

  .variety-detail-container .knowledge-graph-container,
  .variety-detail-container .variety-graph-display,
  .variety-detail-container .graph-loading,
  .variety-detail-container .knowledge-graph-placeholder {
    min-height: 440px;
  }
}

@media (max-width: 920px) {
  .variety-detail-container .equal-height-container {
    grid-template-columns: 1fr;
  }

  .variety-detail-container .content-text {
    max-height: none;
  }

  .variety-detail-container .knowledge-graph-container,
  .variety-detail-container .variety-graph-display,
  .variety-detail-container .graph-loading,
  .variety-detail-container .knowledge-graph-placeholder {
    min-height: 420px;
  }
}

@media (max-width: 680px) {
  .variety-detail-container {
    padding: 10px;
  }

  .variety-detail-container .detail-header {
    padding: 15px;
  }

  .variety-detail-container .title-section {
    align-items: flex-start;
    flex-direction: column;
  }

  .variety-detail-container .title-section h1 {
    white-space: normal;
  }

  .variety-detail-container .info-card :deep(.el-card__body),
  .variety-detail-container .full-height-card :deep(.el-card__body) {
    padding: 14px;
  }

  .variety-detail-container :deep(.el-descriptions__label) {
    width: 96px;
  }

  .variety-detail-container .action-bar {
    position: static;
    align-items: stretch;
    flex-direction: column;
  }

  .variety-detail-container .action-bar :deep(.el-button) {
    width: 100%;
  }
}
</style>
