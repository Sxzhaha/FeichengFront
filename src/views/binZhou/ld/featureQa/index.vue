<template>
  <div class="qa-page-wrapper">
    <div class="qa-container smart-agri-theme">
    <div class="sidebar">
      <div class="sidebar-header">
        <el-button type="primary" class="new-chat-btn" @click="handleCreateSession">
          <el-icon><Plus /></el-icon> 新建问答
        </el-button>
      </div>
      <el-scrollbar class="session-list" v-loading="loadingSessions">
        <div 
          v-for="session in sessions" 
          :key="session.sessionId" 
          class="session-item"
          :class="{ 'is-active': activeSessionId === session.sessionId }"
          @click="selectSession(session.sessionId)"
        >
          <el-icon class="chat-icon"><ChatDotRound /></el-icon>
          <span class="session-title" :title="session.title">{{ session.title }}</span>
          <el-icon class="delete-icon" @click.stop="handleDeleteSession(session.sessionId)"><Delete /></el-icon>
        </div>
      </el-scrollbar>
    </div>

    <div class="main-chat">
      <div class="chat-header">
        <span class="model-name">滨州冬枣种植专家</span>
        <el-tag type="success" size="small" effect="plain" round>深度思考与图像识别</el-tag>
      </div>

      <el-scrollbar class="message-area" ref="messageScrollbar">
        <div class="message-list">
          <div v-if="!currentSession || !currentSession.messages || currentSession.messages.length === 0" class="empty-welcome">
            <el-icon class="welcome-icon"><PictureRounded /></el-icon>
            <h2>我是滨州枣树种植AI助手</h2>
            <p>我可以进行深度逻辑思考。您可以上传病害图片让我帮您诊断，或直接提问农业相关问题。</p>
          </div>

          <div v-else>
            <div 
              v-for="(msg, index) in currentSession.messages" 
              :key="index" 
              class="message-wrapper"
              :class="msg.role === 'user' ? 'is-user' : 'is-ai'"
            >
              <div class="avatar">
                <span v-if="msg.role === 'user'">我</span>
                <el-icon v-else><Opportunity /></el-icon>
              </div>
              
              <div class="message-content">
                <div v-if="msg.images && msg.images.length > 0" class="msg-images">
                  <el-image 
                    v-for="(img, imgIdx) in msg.images" 
                    :key="imgIdx" 
                    :src="formatUrl(img)" 
                    :preview-src-list="msg.images.map(i => formatUrl(i))"
                    fit="cover" 
                    class="msg-img"
                  />
                </div>

                <div v-if="msg.role === 'ai' && (msg.reasoningContent || msg.isReasoning)" class="reasoning-block">
                  <details :open="msg.reasoningOpen !== false" @toggle="(e) => msg.reasoningOpen = e.target.open">
                    <summary>
                      <el-icon class="spin-icon" v-if="msg.isReasoning"><Loading /></el-icon>
                      <el-icon v-else><Cpu /></el-icon>
                      {{ msg.isReasoning ? '深度思考中...' : '已完成思考' }}
                    </summary>
                    <div class="reasoning-text">
                      {{ msg.reasoningContent }}
                      <span v-if="msg.isReasoning" class="cursor-blink"></span>
                    </div>
                  </details>
                </div>

                <div class="text-content" v-if="msg.content || (!msg.isReasoning && msg.role === 'ai')">
                  <span v-html="renderMarkdown(msg.content)" class="markdown-body"></span>
                  <span v-if="msg.isGenerating && !msg.isReasoning" class="cursor-blink"></span>
                </div>
                
                <div v-if="msg.role === 'ai' && msg.kgError" class="kg-error-text">
                  <el-icon><Warning /></el-icon> {{ msg.kgError }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>

      <div class="input-area">
        <div class="input-container" :class="{ 'is-focus': isInputFocus }">
          
          <div v-if="pendingImages.length > 0" class="pending-images">
            <div v-for="(img, idx) in pendingImages" :key="idx" class="pending-img-item">
              <el-image :src="img.previewUrl" fit="cover" />
              <el-icon class="remove-img" @click.stop="removePendingImage(idx)"><CircleCloseFilled /></el-icon>
            </div>
          </div>

          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 6 }"
            placeholder="描述您上传的图片，或直接提问（支持 Shift+Enter 换行）..."
            resize="none"
            class="chat-input"
            @focus="isInputFocus = true"
            @blur="isInputFocus = false"
            @keydown.enter.prevent="handleEnter"
          />
          
          <div class="input-actions">
            <div class="left-actions">
              <el-tooltip content="上传图片以供AI识别" placement="top">
                <el-button link class="action-btn" @click="triggerImageUpload">
                  <el-icon><Picture /></el-icon>
                </el-button>
              </el-tooltip>
              <input type="file" accept="image/*" multiple ref="imageInput" class="hidden-input" @change="handleImageSelected" />
              <span class="tech-tip" v-if="pendingImages.length === 0">支持上传病害图进行多模态深度分析</span>
            </div>
            <div class="right-actions">
              <el-button 
                type="primary" 
                class="send-btn" 
                :disabled="(!inputText.trim() && pendingImages.length === 0) || isGenerating || !activeSessionId"
                @click="sendMessage"
              >
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
        <div class="disclaimer">内容由大语言模型生成，推理过程及农业防治建议仅供参考。</div>
      </div>
    </div>

    <div class="kg-sidebar" v-loading="kgLoading">
      <div class="sidebar-header kg-header">
        <el-icon><Connection /></el-icon>
        <span>知识图谱关联</span>
      </div>
      
      <div class="kg-body">
        <div class="kg-content-wrapper" v-show="dbPestList.length > 0">
          <div class="kg-chart-container">
             <div ref="kgChartRef" style="width: 100%; height: 400px;"></div>
          </div>
          <el-descriptions v-if="kgData" class="kg-desc" :title="kgData.plusDsiName" :column="2" direction="vertical" border size="small">
            <el-descriptions-item label="英文名称" align="center" label-class-name="kg-label-bg">
              {{ kgData.plusDsiNameeng || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="所属类别" align="center" label-class-name="kg-label-bg">
              {{ kgData.plusDsiCategorythird || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="病害简介" :span="2" label-class-name="kg-label-bg">
              <div class="desc-scroll">{{ kgData.plusDsiIntroduction || '暂无' }}</div>
            </el-descriptions-item>
          </el-descriptions>
          
          <el-empty v-else description="在左侧发送图片诊断，获取病害详细特征" :image-size="80" />
        </div>
        
        <el-empty v-show="dbPestList.length === 0" description="正在加载图谱数据..." />
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, nextTick, reactive, onMounted, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus, ChatDotRound, Delete, Promotion, PictureRounded, Opportunity, Picture, CircleCloseFilled, Cpu, Loading, Warning, Connection } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'

// --- API ---
import { getSessionList, createSession, deleteSession, saveChatRound, updateSession, uploadImage } from '@/api/binZhou/ld/agriChat'
import { getKnowledgeList, getKnowledgeDetail } from '@/api/binZhou/ld/knowledge'
import { getToken } from '@/utils/auth'

const router = useRouter()
const route = useRoute()

const baseURL = import.meta.env.VITE_APP_BASE_API


const imageInput = ref(null)
const messageScrollbar = ref(null)
const isInputFocus = ref(false)
const inputText = ref('')
const pendingImages = ref([]) 
const isGenerating = ref(false)

const loadingSessions = ref(false)
const sessions = ref([])
const activeSessionId = ref(null)

const dbPestList = ref([])

const kgLoading = ref(false)
const kgData = ref(null)
const kgChartRef = ref(null)
let kgChartInstance = null

const currentSession = computed(() => {
  return sessions.value.find(s => s.sessionId === activeSessionId.value) || null
})

const formatUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:image') || url.startsWith('blob:')) return url
  return baseURL + url
}

onMounted(() => {
  loadSessions()
  loadPestDictionary()
})

const loadPestDictionary = async () => {
  try {
    console.log("开始加载枣树病虫害字典...")
    const res = await getKnowledgeList({ plusDsiCategorythird: "枣树", pageNum: 1, pageSize: 1000 })
    console.log("获取病虫害字典接口返回 res:", res)
    if (res.code === 200) {
      const rawRows = res.rows || res.data || []
      // 进行名称去重，避免重复节点造成 ECharts 渲染崩溃
      const uniqueList = []
      const seen = new Set()
      rawRows.forEach(item => {
        if (item.plusDsiName && !seen.has(item.plusDsiName)) {
          seen.add(item.plusDsiName)
          uniqueList.push(item)
        }
      })
      dbPestList.value = uniqueList
      console.log(`成功加载并去重后字典记录数: ${dbPestList.value.length}`)
      // 字典加载完成后，延迟渲染默认图谱，确保 DOM 容器已完全可见并计算好宽高
      setTimeout(() => {
        if (!kgData.value) {
          console.log("开始渲染默认图谱，kgChartRef.value exists:", !!kgChartRef.value)
          renderDefaultKgChart()
        }
      }, 250)
    } else {
      ElMessage.error(`获取字典失败，返回状态码: ${res.code}`)
    }
  } catch (e) {
    console.error("加载字典失败", e)
    ElMessage.error("加载枣树病虫害字典失败: " + e.message)
  }
}

const loadSessions = async () => {
  loadingSessions.value = true
  try {
    const res = await getSessionList()
    if (res.code === 200) {
      sessions.value = res.data.map(session => {
        if (session.messages) {
          session.messages.forEach(msg => {
            if (msg.images && typeof msg.images === 'string') {
              try { msg.images = JSON.parse(msg.images) } catch(e) { msg.images = [] }
            }
          })
        } else {
          session.messages = []
        }
        return session
      })
      if (sessions.value.length > 0) {
        activeSessionId.value = sessions.value[0].sessionId
        scrollToBottom()
      } else {
        handleCreateSession()
      }
    }
  } catch (error) {
    ElMessage.error('加载历史会话失败')
  } finally {
    loadingSessions.value = false
  }
}

const handleCreateSession = async () => {
  try {
    const res = await createSession({ title: '新建问答' })
    if (res.code === 200) {
      const newSession = res.data
      newSession.messages = []
      sessions.value.unshift(newSession)
      activeSessionId.value = newSession.sessionId
      kgData.value = null 
      nextTick(() => renderDefaultKgChart()) // 恢复默认图谱
    }
  } catch (error) {
    ElMessage.error('创建会话失败')
  }
}

const selectSession = (id) => {
  if (isGenerating.value) return ElMessage.warning('正在生成回复中，请稍后再切换')
  activeSessionId.value = id
  kgData.value = null 
  nextTick(() => renderDefaultKgChart()) // 恢复默认图谱
  scrollToBottom()
}

const handleDeleteSession = async (id) => {
  ElMessageBox.confirm('确认删除该问答记录吗？', '提示', { type: 'warning' }).then(async () => {
    try {
      const res = await deleteSession(id)
      if (res.code === 200) {
        sessions.value = sessions.value.filter(s => s.sessionId !== id)
        if (activeSessionId.value === id) {
          activeSessionId.value = sessions.value.length > 0 ? sessions.value[0].sessionId : null
        }
        if (sessions.value.length === 0) {
          handleCreateSession()
        } else {
          kgData.value = null
          nextTick(() => renderDefaultKgChart()) // 恢复默认图谱
        }
        ElMessage.success('删除成功')
      }
    } catch (error) {}
  }).catch(() => {})
}

const fileToBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
})

const triggerImageUpload = () => imageInput.value.click()

const handleImageSelected = async (e) => {
  const files = e.target.files
  if (!files) return
  for (let file of files) {
    if (file.type.startsWith('image/')) {
      const base64Str = await fileToBase64(file)
      pendingImages.value.push({ file: file, previewUrl: URL.createObjectURL(file), base64: base64Str })
    }
  }
  e.target.value = ''
}

const removePendingImage = (idx) => pendingImages.value.splice(idx, 1)

const handleEnter = (e) => {
  if (!e.ctrlKey && !e.shiftKey) sendMessage()
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageScrollbar.value) {
    const wrap = messageScrollbar.value.wrapRef
    if (wrap) wrap.scrollTop = wrap.scrollHeight
  }
}

// --- 渲染默认的枣树病虫害总览图谱 ---
const renderDefaultKgChart = () => {
  if (!kgChartRef.value || dbPestList.value.length === 0) return
  if (kgChartInstance) kgChartInstance.dispose()
  
  kgChartInstance = markRaw(echarts.init(kgChartRef.value))
  
  const nodes = [
    { name: '枣树', symbolSize: 70, itemStyle: { color: '#ef4444' }, tooltipContent: '枣树常见病虫害总览' }
  ]
  const links = []
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']
  
  dbPestList.value.forEach((item, index) => {
    nodes.push({
      name: item.plusDsiName,
      symbolSize: 40,
      itemStyle: { color: colors[index % colors.length] },
      tooltipContent: item.plusDsiIntroduction || '暂无'
    })
    links.push({
      source: '枣树',
      target: item.plusDsiName
    })
  })

  const option = {
    tooltip: {
      show: true,
      trigger: 'item',
      enterable: true, 
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      padding: 16,
      textStyle: { color: '#303133', fontSize: 13, lineHeight: 10 },
      extraCssText: 'box-shadow: 0 4px 20px rgba(0,0,0,0.15); width: 320px; max-height: 250px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;',
      position: function (point, params, dom, rect, size) {
        const x = (size.viewSize[0] - size.contentSize[0]) / 2
        const y = (size.viewSize[1] - size.contentSize[1]) / 2
        return [x, y]
      },
      formatter: function (params) {
        if (params.dataType === 'node') {
           const content = params.data.tooltipContent;
           return `<div style="font-weight:bold; margin-bottom:3px; color:${params.color}; border-bottom:2px solid ${params.color}; padding-bottom:4px; text-align:center; font-size:15px;">【${params.name}】信息</div>
                   <div style="font-size:13px; line-height: 1.6;">${content}</div>`;
        }
        return '';
      }
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        force: { repulsion: 250, edgeLength: [80, 140] },
        data: nodes,
        links: links,
        roam: true, 
        label: { show: true, position: 'right', fontSize: 12, color: '#303133' },
        lineStyle: { color: 'source', curveness: 0.3 }
      }
    ]
  }
  kgChartInstance.setOption(option)
}

// --- 渲染单个具体病害的知识图谱 ---
const renderKgChart = (data) => {
  if (!kgChartRef.value) return
  if (kgChartInstance) kgChartInstance.dispose()
  
  kgChartInstance = markRaw(echarts.init(kgChartRef.value))
  
  const nodes = [
    { name: data.plusDsiName, symbolSize: 60, itemStyle: { color: '#ef4444' }, tooltipContent: data.plusDsiIntroduction || '暂无' },
    { name: '病原', symbolSize: 45, itemStyle: { color: '#3b82f6' }, tooltipContent: data.plusDsiPathogen || '暂无' },
    { name: '危害症状', symbolSize: 45, itemStyle: { color: '#10b981' }, tooltipContent: data.plusDsiDamagesym || '暂无' },
    { name: '防治方法', symbolSize: 45, itemStyle: { color: '#f59e0b' }, tooltipContent: data.plusDsiCmethod || '暂无' },
    { name: '发生规律', symbolSize: 45, itemStyle: { color: '#8b5cf6' }, tooltipContent: data.plusDsiOfactor || '暂无' },
    { name: '侵染', symbolSize: 45, itemStyle: { color: '#06b6d4' }, tooltipContent: data.plusDsiCycle || '暂无' },
    { name: '形态', symbolSize: 45, itemStyle: { color: '#ec4899' }, tooltipContent: data.plusDsiMorphology || '暂无' },
    { name: '习性', symbolSize: 45, itemStyle: { color: '#f97316' }, tooltipContent: data.plusDsiHabits || '暂无' }
  ]
  
  const links = [
    { source: data.plusDsiName, target: '病原' },
    { source: data.plusDsiName, target: '危害症状' },
    { source: data.plusDsiName, target: '防治方法' },
    { source: data.plusDsiName, target: '发生规律' },
    { source: data.plusDsiName, target: '侵染' },
    { source: data.plusDsiName, target: '形态' },
    { source: data.plusDsiName, target: '习性' }
  ]

  const option = {
    tooltip: {
      show: true,
      trigger: 'item',
      enterable: true, 
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      padding: 16,
      textStyle: { color: '#303133', fontSize: 13, lineHeight: 10 },
      extraCssText: 'box-shadow: 0 4px 20px rgba(0,0,0,0.15); width: 320px; max-height: 250px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;',
      position: function (point, params, dom, rect, size) {
        const x = (size.viewSize[0] - size.contentSize[0]) / 2
        const y = (size.viewSize[1] - size.contentSize[1]) / 2
        return [x, y]
      },
      formatter: function (params) {
        if (params.dataType === 'node') {
           const content = params.data.tooltipContent;
           return `<div style="font-weight:bold; margin-bottom:3px; color:${params.color}; border-bottom:2px solid ${params.color}; padding-bottom:4px; text-align:center; font-size:15px;">【${params.name}】信息</div>
                   <div style="font-size:13px; line-height: 1.6;">${content}</div>`;
        }
        return '';
      }
    },
    animationDurationUpdate: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        force: { repulsion: 300, edgeLength: [70, 110] },
        data: nodes,
        links: links,
        roam: true, 
        label: { show: true, position: 'right', fontSize: 13, color: '#303133' },
        lineStyle: { color: 'source', curveness: 0.3 }
      }
    ]
  }
  kgChartInstance.setOption(option)
}

let lastScrollTime = 0
const throttleScrollToBottom = () => {
  const now = Date.now()
  if (now - lastScrollTime > 120) {
    scrollToBottom()
    lastScrollTime = now
  }
}

const renderMarkdown = (text) => {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  html = html.replace(/```(?:[a-zA-Z0-9_\-\+]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/^(?:\-\s|\*\s)(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>(?:\n<li>.*<\/li>)*)/g, '<ul>$1</ul>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\n*<\/?(ul|li|pre|code|h[1-3])>\n*/g, (match) => match.trim())
  return html
}

// 问答页面只服务于冬枣种植场景，纯文本问题先在前端拦截，避免无关问题消耗模型请求。
const jujubeTopicKeywords = [
  '冬枣', '枣树', '枣园', '枣农', '枣果', '沾化',
  '种植', '栽培', '农事', '施肥', '灌溉', '浇水', '修剪', '嫁接',
  '开花', '授粉', '坐果', '膨果', '采摘', '果实', '土壤', '墒情',
  '病虫害', '病害', '虫害', '害虫', '防治', '农药', '杀虫', '杀菌',
  '物候', '萌芽', '生长', '防灾', '预警', '气象', '天气', '温度', '湿度',
  '风向', '降水', '霜冻', '高温', '干旱', '大棚', '地块', '园区',
  '传感器', '设备', '物联网', '环境指标', '智能农业', '智慧农业'
]

const isJujubeRelatedQuestion = (text) => {
  const normalizedText = String(text || '').toLowerCase().replace(/\s+/g, '')
  return jujubeTopicKeywords.some(keyword => normalizedText.includes(keyword))
}

const appendOutOfScopeReply = async (text) => {
  const reply = '这个问题不属于冬枣种植相关范围，我暂时不能回答。请围绕冬枣种植、农事管理、病虫害防治、物候监测、气象预警或园区设备来提问。'
  currentSession.value.messages.push({ role: 'user', content: text, images: [] })
  currentSession.value.messages.push({ role: 'ai', content: reply, isGenerating: false, isReasoning: false })
  inputText.value = ''
  await nextTick()
  scrollToBottom()
  try {
    await saveChatRound({
      sessionId: activeSessionId.value,
      userMessage: { role: 'user', content: text, images: null },
      aiMessage: { role: 'ai', content: reply, reasoningContent: '', images: null }
    })
  } catch (error) {
    console.warn('保存范围提示失败:', error)
  }
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  const currentImages = [...pendingImages.value]
  
  if ((!text && currentImages.length === 0) || !activeSessionId.value) return

  // 有图片时仍允许进入病虫害识别；没有图片的无关文本直接给出引导提示。
  if (text && currentImages.length === 0 && !isJujubeRelatedQuestion(text)) {
    await appendOutOfScopeReply(text)
    return
  }

  let serverImageUrls = []

  if (currentSession.value.title === '新建问答') {
    let newTitle = '多模态图像诊断'
    if (text) {
      newTitle = text.length > 15 ? text.substring(0, 15) + '...' : text
    }
    currentSession.value.title = newTitle
    updateSession({ sessionId: activeSessionId.value, title: newTitle }).catch(() => {})
  }

  const historyMessages = currentSession.value.messages.map(m => {
    return { 
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content || "图片分析"
    }
  })

  const userMessageContent = text
  const userImageBase64List = currentImages.map(img => img.base64)
  
  currentSession.value.messages.push({
    role: 'user',
    content: userMessageContent,
    images: currentImages.map(img => img.previewUrl) 
  })

  inputText.value = ''
  pendingImages.value = []
  isGenerating.value = true
  
  // 恢复显示默认图谱
  kgData.value = null 
  nextTick(() => renderDefaultKgChart())

  scrollToBottom()

  // ✨ [优化点 1] 初始化时增加状态位和占位符文案
  const aiMessage = reactive({
    role: 'ai',
    reasoningContent: '正在连接农业图谱并分析特征...', // 缓冲占位提示
    content: '',
    isGenerating: true,
    isReasoning: true,
    reasoningOpen: true,
    kgError: '',
    _isFirstTokenReceived: false // 内部状态标识
  })
  currentSession.value.messages.push(aiMessage)

  try {
    // 上传图片并获取服务器端图片 URL 列表，用于保存至对话记录中
    for (let img of currentImages) {
      const formData = new FormData()
      formData.append('file', img.file)
      try {
        const uploadRes = await uploadImage(formData)
        const imgUrl = uploadRes.url || uploadRes.fileName
        if (imgUrl) {
          serverImageUrls.push(imgUrl)
        }
      } catch (uploadErr) {
        console.error('图片上传失败:', uploadErr)
      }
    }

    const requestBody = {
      text: text || "",
      historyMessages: historyMessages,
      images: userImageBase64List
    }

    const response = await fetch(baseURL + '/binZhou/ld/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ` + getToken(),
        'Accept': 'text/event-stream' // ✨ [优化点 2] 明确要求流式传输，防止Nginx/浏览器网关缓冲积压数据
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = '' 

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n'); buffer = lines.pop() 
      for (let line of lines) {
        line = line.trim()
        if (!line || !line.startsWith('data:')) continue 
        const dataStr = line.substring(5).trim()
        if (dataStr === '[DONE]') continue
        try {
          const delta = JSON.parse(dataStr).choices?.[0]?.delta
          if (delta) {
            
            // ✨ [优化点 3] 接收到真实的第一段有效流式数据时，清空之前设置的缓冲占位文案
            if (!aiMessage._isFirstTokenReceived) {
              aiMessage.reasoningContent = ''; 
              aiMessage._isFirstTokenReceived = true;
            }

            if (delta.reasoning_content) {
              aiMessage.reasoningContent += delta.reasoning_content
              aiMessage.isReasoning = true
            }
            if (delta.content) {
              aiMessage.isReasoning = false
              aiMessage.content += delta.content
            }
            throttleScrollToBottom()
          }
        } catch (e) {
          console.error("解析流数据异常", e)
        }
      }
    }
    scrollToBottom()

    const nameMatch = aiMessage.content.match(/一、\s*病害名称[:：]?\s*\n?\s*([^\n]+)/)
    if (nameMatch && nameMatch[1]) {
      const parsedName = nameMatch[1].trim().replace(/[。.]/g, '')
      const dictItem = dbPestList.value.find(item => parsedName.includes(item.plusDsiName) || item.plusDsiName.includes(parsedName))
      
      if (dictItem) {
        kgLoading.value = true
        try {
          const detailRes = await getKnowledgeDetail(dictItem.id)
          if (detailRes.code === 200) {
            kgData.value = detailRes.data
            nextTick(() => renderKgChart(detailRes.data))
          }
        } catch(e) {
          aiMessage.kgError = '获取知识图谱详情失败'
        } finally {
          kgLoading.value = false
        }
      } else {
        aiMessage.kgError = `当前识别结果 [${parsedName}] 暂无知识图谱信息录入。`
      }
    }

  } catch (error) {
    aiMessage.content += `\n\n⚠️ **请求失败:** ${error.message}`
  } finally {
    aiMessage.isGenerating = false
    aiMessage.isReasoning = false 
    isGenerating.value = false

    try {
      await saveChatRound({
        sessionId: activeSessionId.value,
        userMessage: { role: 'user', content: userMessageContent, images: serverImageUrls.length > 0 ? JSON.stringify(serverImageUrls) : null },
        aiMessage: { role: 'ai', content: aiMessage.content, reasoningContent: aiMessage.reasoningContent, images: null }
      })
    } catch (saveError) {}
  }
}
</script>

<style scoped>
.smart-agri-theme {
  --chat-bg: #f5f7fa;
  --sidebar-bg: #eef2f6;
  --primary-color: #2b4b29; 
  --highlight-color: #409eff; 
  --text-main: #303133;
  --text-regular: #606266;
  --border-color: #e4e7ed;
  --user-msg-bg: #e6f1fc;
  --ai-msg-bg: #ffffff;
}

.qa-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.custom-menu {
  border-bottom: 1px solid #e0e0e0;
  padding: 0 30px;
  font-size: 16px;
  flex-shrink: 0;
}

.qa-container {
  display: flex;
  flex: 1; 
  background-color: var(--chat-bg);
  overflow: hidden;
}

.sidebar { width: 260px; background-color: var(--sidebar-bg); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; flex-shrink: 0; }
.main-chat { flex: 1; display: flex; flex-direction: column; background-color: #ffffff; min-width: 400px; border-right: 1px solid var(--border-color); }
.kg-sidebar { width: 450px; background-color: #fafafa; display: flex; flex-direction: column; flex-shrink: 0; border-left: 1px solid var(--border-color); }

.kg-header { padding: 0 20px; height: 60px; display: flex; align-items: center; gap: 8px; font-weight: bold; color: var(--primary-color); border-bottom: 1px solid var(--border-color); background: #fff;}
.kg-body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; }
.kg-content-wrapper { display: flex; flex-direction: column; gap: 16px; }
.kg-chart-container { background: #fff; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 2px 12px rgba(0,0,0,0.02); overflow: hidden; padding: 10px; position: relative; }
.desc-scroll { max-height: 120px; overflow-y: auto; white-space: pre-wrap; font-size: 12px; line-height: 1.5; color: #606266; }

:deep(.kg-label-bg) {
  background: #f5f7fa !important;
  color: #606266 !important;
  font-weight: bold;
  width: 90px;
}

.sidebar-header { padding: 20px; }
.new-chat-btn { width: 100%; background-color: var(--primary-color); border-color: var(--primary-color); color: white; }
.session-list { flex: 1; padding: 10px; }
.session-item { display: flex; align-items: center; padding: 12px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; color: var(--text-regular); transition: all 0.3s; }
.session-item:hover { background-color: #e0e6ed; }
.session-item.is-active { background-color: #ffffff; color: var(--primary-color); font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.chat-icon { margin-right: 10px; }
.session-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }
.delete-icon { display: none; color: #f56c6c; }
.session-item:hover .delete-icon { display: block; }

.chat-header { height: 60px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; padding: 0 24px; gap: 12px; }
.model-name { font-size: 16px; font-weight: 600; color: var(--text-main); }
.message-area { flex: 1; padding: 20px 0; background-color: var(--chat-bg); }
.message-list { max-width: 900px; margin: 0 auto; padding: 0 20px; }
.empty-welcome { text-align: center; margin-top: 10vh; color: var(--text-regular); }
.welcome-icon { font-size: 60px; color: var(--primary-color); opacity: 0.8; margin-bottom: 20px; }

.message-wrapper { display: flex; gap: 12px; margin-bottom: 30px; width: 100%; }
.is-user { flex-direction: row-reverse; }
.is-ai { flex-direction: row; }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 14px; flex-shrink: 0; }
.is-user .avatar { background-color: var(--highlight-color); color: #fff; }
.is-ai .avatar { background-color: var(--primary-color); color: #fff; font-size: 20px; }
.message-content { max-width: 80%; padding: 12px 16px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); line-height: 1.6; color: var(--text-main); font-size: 14px; word-break: break-word; }
.is-user .message-content { background-color: var(--user-msg-bg); border-top-right-radius: 2px; }
.is-ai .message-content { background-color: var(--ai-msg-bg); border-top-left-radius: 2px; }

.reasoning-block { margin-bottom: 12px; border-left: 3px solid #e4e7ed; background-color: #f8fafc; border-radius: 4px; padding: 4px 12px; }
.reasoning-block details summary { cursor: pointer; font-size: 12px; color: #909399; font-weight: bold; list-style: none; display: flex; align-items: center; gap: 6px; padding: 6px 0; }
.spin-icon { animation: spin 2s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.reasoning-text { font-size: 12px; color: #606266; padding-bottom: 8px; white-space: pre-wrap; opacity: 0.9; }

.kg-error-text { margin-top: 8px; font-size: 12px; color: #e6a23c; display: flex; align-items: center; gap: 4px; border-top: 1px dashed #e4e7ed; padding-top: 8px; }

.msg-images { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.is-user .msg-images { justify-content: flex-end; }
.msg-img { width: 150px; height: 150px; border-radius: 8px; border: 1px solid var(--border-color); }
.text-content { white-space: pre-wrap; }
.cursor-blink { display: inline-block; width: 2px; height: 15px; background-color: var(--text-main); vertical-align: middle; animation: blink 1s step-end infinite; margin-left: 4px; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

.input-area { background-color: var(--chat-bg); padding: 20px 0; display: flex; flex-direction: column; align-items: center; }
.input-container { width: 100%; max-width: 800px; background-color: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); transition: border-color 0.3s; }
.input-container.is-focus { border-color: var(--primary-color); }

.pending-images { 
  display: flex; 
  gap: 16px; 
  margin-bottom: 10px; 
  overflow-x: visible; 
  padding-top: 10px; 
  padding-right: 10px; 
}
.pending-img-item { 
  position: relative; 
  width: 64px; 
  height: 64px; 
  border-radius: 6px; 
  border: 1px solid var(--border-color); 
}
.pending-img-item .el-image { 
  width: 100%; 
  height: 100%; 
  border-radius: 6px; 
}
.remove-img { 
  position: absolute; 
  top: -10px;    
  right: -10px;  
  color: #f56c6c; 
  cursor: pointer; 
  background: #fff; 
  border-radius: 50%; 
  font-size: 24px; 
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  z-index: 10;
  transition: transform 0.2s ease;
}
.remove-img:hover {
  transform: scale(1.15);
}

.chat-input :deep(.el-textarea__inner) { border: none; box-shadow: none; padding: 0; background-color: transparent; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
.action-btn { font-size: 20px; color: var(--text-regular); margin-right: 10px; }
.action-btn:hover { color: var(--primary-color); }
.tech-tip { font-size: 12px; color: #a8abb2; }
.hidden-input { display: none; }
.send-btn { background-color: var(--primary-color); border-color: var(--primary-color); }
.disclaimer { margin-top: 12px; font-size: 12px; color: #909399; }
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
.qa-page-wrapper {
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
  padding: 18px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.17), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.qa-page-wrapper *,
.qa-page-wrapper *::before,
.qa-page-wrapper *::after {
  box-sizing: border-box;
}

.qa-page-wrapper .custom-menu {
  min-height: 56px;
  padding: 0 10px;
  margin-bottom: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(58, 88, 63, 0.08);
}

.qa-page-wrapper .custom-menu :deep(.el-menu-item) {
  min-width: 104px;
  color: var(--ft-text-secondary);
  font-weight: 650;
  border-bottom: 0;
}

.qa-page-wrapper .custom-menu :deep(.el-menu-item:hover) {
  color: var(--ft-green);
  background: #f1f7ef;
}

.qa-page-wrapper .custom-menu :deep(.el-menu-item.is-active) {
  color: var(--ft-green);
  background: #edf5e9;
  border-bottom: 3px solid var(--ft-green);
}

.qa-page-wrapper .qa-container {
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr) 340px;
  height: calc(100vh - 174px);
  min-height: 650px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--ft-border);
  border-radius: 16px;
  box-shadow: 0 15px 34px rgba(58, 88, 63, 0.11);
}

.qa-page-wrapper .sidebar,
.qa-page-wrapper .kg-sidebar {
  min-width: 0;
  background: #f8fbf5;
}

.qa-page-wrapper .sidebar {
  border-right: 1px solid #dfe9dd;
}

.qa-page-wrapper .kg-sidebar {
  border-left: 1px solid #dfe9dd;
}

.qa-page-wrapper .sidebar-header {
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 12px 14px;
  border-bottom: 1px solid #e1ebe0;
}

.qa-page-wrapper .new-chat-btn {
  width: 100%;
  height: 40px;
  border-radius: 10px;
}

.qa-page-wrapper .session-list {
  height: calc(100% - 64px);
  padding: 10px;
}

.qa-page-wrapper .session-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 22px;
  align-items: center;
  min-height: 45px;
  padding: 0 10px;
  margin-bottom: 6px;
  gap: 7px;
  color: #536a5a;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  transition: 0.18s ease;
}

.qa-page-wrapper .session-item:hover {
  background: #edf5e9;
  border-color: #d5e4d3;
}

.qa-page-wrapper .session-item.is-active {
  color: #285f45;
  background: #e3efdf;
  border-color: #bdd4be;
  box-shadow: inset 3px 0 0 var(--ft-green);
}

.qa-page-wrapper .chat-icon {
  color: #6f9579;
}

.qa-page-wrapper .session-title {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-page-wrapper .delete-icon {
  color: #a6b0a8;
}

.qa-page-wrapper .delete-icon:hover {
  color: #c65f5f;
}

.qa-page-wrapper .main-chat {
  display: flex;
  min-width: 0;
  flex-direction: column;
  background:
    linear-gradient(rgba(66, 102, 76, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 102, 76, 0.025) 1px, transparent 1px),
    #ffffff;
  background-size: 26px 26px;
}

.qa-page-wrapper .chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 18px;
  gap: 12px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.qa-page-wrapper .model-name {
  color: #294635;
  font-weight: 800;
}

.qa-page-wrapper .message-area {
  flex: 1 1 auto;
  min-height: 0;
}

.qa-page-wrapper .message-list {
  max-width: 920px;
  padding: 24px 24px 40px;
  margin: 0 auto;
}

.qa-page-wrapper .empty-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 460px;
  flex-direction: column;
  color: #7c8f80;
  text-align: center;
}

.qa-page-wrapper .welcome-icon {
  color: #5b9470;
  font-size: 58px;
}

.qa-page-wrapper .empty-welcome h2 {
  margin: 15px 0 8px;
  color: #2c503b;
}

.qa-page-wrapper .empty-welcome p {
  max-width: 560px;
  margin: 0;
  line-height: 1.8;
}

.qa-page-wrapper .message-wrapper {
  display: flex;
  align-items: flex-start;
  margin-bottom: 22px;
  gap: 11px;
}

.qa-page-wrapper .message-wrapper.is-user {
  flex-direction: row-reverse;
}

.qa-page-wrapper .avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--ft-green), #75a382);
  border-radius: 11px;
  box-shadow: 0 7px 14px rgba(47, 125, 92, 0.17);
}

.qa-page-wrapper .is-user .avatar {
  background: linear-gradient(135deg, #65786b, #8ca091);
}

.qa-page-wrapper .message-content {
  max-width: min(78%, 760px);
  min-width: 0;
}

.qa-page-wrapper .text-content,
.qa-page-wrapper .reasoning-block {
  padding: 13px 15px;
  color: #344b3c;
  line-height: 1.75;
  white-space: pre-wrap;
  background: #f6faf4;
  border: 1px solid #dce8da;
  border-radius: 4px 14px 14px 14px;
  box-shadow: 0 7px 16px rgba(58, 88, 63, 0.06);
}

.qa-page-wrapper .is-user .text-content {
  color: #ffffff;
  background: linear-gradient(135deg, #377d5c, #5c9670);
  border-color: transparent;
  border-radius: 14px 4px 14px 14px;
}

.qa-page-wrapper .reasoning-block {
  margin-bottom: 8px;
  color: #5d7464;
  background: #f9fbf7;
  border-style: dashed;
}

.qa-page-wrapper .reasoning-block summary {
  color: #42634e;
  font-weight: 700;
  cursor: pointer;
}

.qa-page-wrapper .reasoning-text {
  padding-top: 9px;
  margin-top: 9px;
  border-top: 1px solid #e2ebe0;
}

.qa-page-wrapper .msg-images,
.qa-page-wrapper .pending-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.qa-page-wrapper .msg-images {
  margin-bottom: 8px;
}

.qa-page-wrapper .msg-img,
.qa-page-wrapper .pending-img-item {
  overflow: hidden;
  border: 1px solid #dce7da;
  border-radius: 9px;
}

.qa-page-wrapper .msg-img {
  width: 120px;
  height: 92px;
}

.qa-page-wrapper .input-area {
  padding: 12px 18px 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.75), #ffffff);
  border-top: 1px solid #e1ebe0;
}

.qa-page-wrapper .input-container {
  max-width: 920px;
  padding: 10px 12px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #ceddcd;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(58, 88, 63, 0.08);
  transition: 0.18s ease;
}

.qa-page-wrapper .input-container.is-focus {
  border-color: #7ca98a;
  box-shadow: 0 0 0 3px rgba(47, 125, 92, 0.10), 0 12px 27px rgba(58, 88, 63, 0.10);
}

.qa-page-wrapper .chat-input :deep(.el-textarea__inner) {
  min-height: 42px !important;
  padding: 8px 4px;
  background: transparent;
  box-shadow: none;
}

.qa-page-wrapper .input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
}

.qa-page-wrapper .left-actions,
.qa-page-wrapper .right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qa-page-wrapper .action-btn {
  color: var(--ft-green);
  font-size: 20px;
}

.qa-page-wrapper .send-btn {
  width: 40px;
  height: 36px;
  border-radius: 10px;
}

.qa-page-wrapper .tech-tip,
.qa-page-wrapper .disclaimer {
  color: #8b998e;
  font-size: 11px;
}

.qa-page-wrapper .disclaimer {
  margin-top: 7px;
  text-align: center;
}

.qa-page-wrapper .kg-header {
  gap: 8px;
  color: #294635;
  font-weight: 800;
}

.qa-page-wrapper .kg-body {
  height: calc(100% - 64px);
  padding: 12px;
  overflow-y: auto;
}

.qa-page-wrapper .kg-chart-container {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dce8da;
  border-radius: 11px;
}

.qa-page-wrapper .kg-desc {
  margin-top: 12px;
}

.qa-page-wrapper :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
}

@media (max-width: 1280px) {
  .qa-page-wrapper .qa-container {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .qa-page-wrapper .kg-sidebar {
    display: none;
  }
}

@media (max-width: 820px) {
  .qa-page-wrapper {
    padding: 10px;
  }

  .qa-page-wrapper .qa-container {
    display: flex;
    height: auto;
    min-height: calc(100vh - 130px);
    flex-direction: column;
  }

  .qa-page-wrapper .sidebar {
    max-height: 210px;
    border-right: 0;
    border-bottom: 1px solid #dfe9dd;
  }

  .qa-page-wrapper .session-list {
    height: 140px;
  }

  .qa-page-wrapper .main-chat {
    min-height: 650px;
  }

  .qa-page-wrapper .message-content {
    max-width: 88%;
  }
}
</style>

<style scoped>
/* FarmerTask 布局优化覆盖
   保持现有视觉主题，仅改善三栏比例、可用高度和消息区域排版。 */
.qa-page-wrapper {
  width: 100%;
  height: calc(100vh - 84px);
  min-height: 700px;
  padding: 14px;
  overflow: hidden;
}

.qa-page-wrapper .custom-menu,
.qa-page-wrapper .qa-container {
  width: min(1640px, 100%);
  margin-right: auto;
  margin-left: auto;
}

.qa-page-wrapper .custom-menu {
  flex: 0 0 56px;
  min-height: 56px;
  margin-bottom: 12px;
}

.qa-page-wrapper .qa-container {
  grid-template-columns: 232px minmax(520px, 1fr) 320px;
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.qa-page-wrapper .sidebar,
.qa-page-wrapper .main-chat,
.qa-page-wrapper .kg-sidebar {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.qa-page-wrapper .sidebar-header {
  min-height: 60px;
  height: 60px;
  padding: 10px 12px;
}

.qa-page-wrapper .session-list {
  height: calc(100% - 60px);
  padding: 9px;
}

.qa-page-wrapper .session-item {
  min-height: 44px;
  margin-bottom: 5px;
}

.qa-page-wrapper .main-chat {
  min-width: 0;
}

.qa-page-wrapper .chat-header {
  flex: 0 0 60px;
  min-height: 60px;
  height: 60px;
  padding: 0 16px;
}

.qa-page-wrapper .model-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-page-wrapper .message-area {
  min-height: 0;
  flex: 1 1 auto;
}

.qa-page-wrapper .message-list {
  width: min(920px, 100%);
  max-width: none;
  padding: 22px 24px 32px;
}

.qa-page-wrapper .empty-welcome {
  min-height: 380px;
  padding: 30px 16px;
}

.qa-page-wrapper .message-wrapper {
  margin-bottom: 18px;
}

.qa-page-wrapper .message-content {
  max-width: min(82%, 760px);
}

.qa-page-wrapper .text-content,
.qa-page-wrapper .reasoning-block {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.qa-page-wrapper .msg-images {
  max-width: 100%;
}

.qa-page-wrapper .input-area {
  flex: 0 0 auto;
  padding: 10px 16px 12px;
}

.qa-page-wrapper .input-container {
  width: min(920px, 100%);
  max-width: none;
}

.qa-page-wrapper .pending-images {
  max-height: 150px;
  padding-bottom: 8px;
  overflow-y: auto;
}

.qa-page-wrapper .pending-img-item {
  position: relative;
  width: 82px;
  height: 62px;
  flex: 0 0 auto;
}

.qa-page-wrapper .pending-img-item :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.qa-page-wrapper .remove-img {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #ffffff;
  background: rgba(40, 69, 50, 0.62);
  border-radius: 50%;
  cursor: pointer;
}

.qa-page-wrapper .kg-sidebar .sidebar-header {
  padding: 0 14px;
}

.qa-page-wrapper .kg-body {
  height: calc(100% - 60px);
  padding: 10px;
}

.qa-page-wrapper .kg-content-wrapper {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 10px;
}

.qa-page-wrapper .kg-chart-container {
  flex: 0 0 auto;
}

.qa-page-wrapper .kg-chart-container > div {
  height: clamp(280px, 42vh, 400px) !important;
}

.qa-page-wrapper .kg-desc {
  min-width: 0;
  margin-top: 0;
}

.qa-page-wrapper .desc-scroll {
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.65;
}

@media (max-width: 1380px) {
  .qa-page-wrapper .qa-container {
    grid-template-columns: 218px minmax(500px, 1fr) 288px;
  }

  .qa-page-wrapper .message-list {
    padding-right: 18px;
    padding-left: 18px;
  }
}

@media (max-width: 1120px) {
  .qa-page-wrapper .qa-container {
    grid-template-columns: 216px minmax(0, 1fr);
  }

  .qa-page-wrapper .kg-sidebar {
    display: none;
  }

  .qa-page-wrapper .message-content {
    max-width: 86%;
  }
}

@media (max-width: 760px) {
  .qa-page-wrapper {
    height: auto;
    min-height: calc(100vh - 70px);
    padding: 8px;
    overflow: visible;
  }

  .qa-page-wrapper .custom-menu {
    width: 100%;
    overflow-x: auto;
    padding: 0 6px;
  }

  .qa-page-wrapper .custom-menu :deep(.el-menu-item) {
    flex: 0 0 auto;
    min-width: 90px;
  }

  .qa-page-wrapper .qa-container {
    display: flex;
    height: auto;
    min-height: 720px;
    flex-direction: column;
  }

  .qa-page-wrapper .sidebar {
    max-height: 200px;
    flex: 0 0 200px;
    border-right: 0;
    border-bottom: 1px solid #dfe9dd;
  }

  .qa-page-wrapper .session-list {
    height: 140px;
  }

  .qa-page-wrapper .main-chat {
    min-height: 640px;
  }

  .qa-page-wrapper .chat-header {
    align-items: flex-start;
    height: auto;
    min-height: 66px;
    padding: 10px 12px;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .qa-page-wrapper .model-name {
    white-space: normal;
  }

  .qa-page-wrapper .message-list {
    padding: 18px 12px 26px;
  }

  .qa-page-wrapper .message-content {
    max-width: 90%;
  }

  .qa-page-wrapper .input-area {
    padding: 9px;
  }

  .qa-page-wrapper .tech-tip {
    display: none;
  }
}
</style>

<style scoped>
/* ==========================================================================
   FarmerTask 防压缩布局优化
   仅覆盖布局与视觉尺寸，不修改模板、方法、功能、接口及原有注释。
   ========================================================================== */

/* 页面采用固定可用高度；桌面端空间不足时触发断点布局，而不是挤压三栏 */
.qa-page-wrapper {
  width: 100%;
  height: calc(100vh - 84px);
  min-height: 720px;
  padding: 14px;
  overflow: hidden;
}

/* 顶部导航和主工作区使用相同宽度基准 */
.qa-page-wrapper .custom-menu,
.qa-page-wrapper .qa-container {
  width: min(1680px, 100%);
  margin-right: auto;
  margin-left: auto;
}

/* 三栏桌面布局：
   左侧会话区固定、中央对话区保留足够宽度、右侧图谱区固定 */
.qa-page-wrapper .qa-container {
  display: grid;
  grid-template-columns: 230px minmax(660px, 1fr) 420px;
  grid-template-rows: minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* 三个主区域都禁止被 Grid 内容反向撑压 */
.qa-page-wrapper .sidebar,
.qa-page-wrapper .main-chat,
.qa-page-wrapper .kg-sidebar {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 左侧会话区 */
.qa-page-wrapper .sidebar {
  display: flex;
  flex-direction: column;
}

.qa-page-wrapper .sidebar-header {
  height: 60px;
  min-height: 60px;
  padding: 10px 12px;
  flex: 0 0 60px;
}

.qa-page-wrapper .new-chat-btn {
  height: 40px;
  margin: 0;
}

.qa-page-wrapper .session-list {
  height: auto;
  min-height: 0;
  padding: 9px;
  flex: 1 1 auto;
}

.qa-page-wrapper .session-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 20px;
  min-height: 44px;
  padding: 0 10px;
  margin-bottom: 5px;
  gap: 7px;
}

.qa-page-wrapper .chat-icon {
  margin-right: 0;
}

.qa-page-wrapper .session-title {
  min-width: 0;
}

/* 中间对话区 */
.qa-page-wrapper .main-chat {
  display: flex;
  flex-direction: column;
}

.qa-page-wrapper .chat-header {
  height: 60px;
  min-height: 60px;
  padding: 0 18px;
  flex: 0 0 60px;
}

.qa-page-wrapper .model-name {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-page-wrapper .chat-header .el-tag {
  flex: 0 0 auto;
}

.qa-page-wrapper .message-area {
  height: auto;
  min-height: 0;
  padding: 0;
  flex: 1 1 auto;
}

.qa-page-wrapper .message-list {
  width: min(960px, 100%);
  max-width: none;
  padding: 24px 28px 34px;
  margin: 0 auto;
}

.qa-page-wrapper .empty-welcome {
  min-height: 380px;
  margin-top: 0;
  padding: 36px 18px;
}

.qa-page-wrapper .message-wrapper {
  width: 100%;
  margin-bottom: 20px;
  gap: 12px;
}

.qa-page-wrapper .message-content {
  width: auto;
  min-width: 0;
  max-width: min(88%, 820px);
  padding: 0;
  box-shadow: none;
}

/* AI 内容允许更宽，用户消息保持适度宽度 */
.qa-page-wrapper .message-wrapper.is-ai .message-content {
  max-width: min(92%, 840px);
}

.qa-page-wrapper .message-wrapper.is-user .message-content {
  max-width: min(70%, 620px);
}

/* 文本与思考过程不参与横向撑宽 */
.qa-page-wrapper .text-content,
.qa-page-wrapper .reasoning-block,
.qa-page-wrapper .reasoning-text {
  width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.qa-page-wrapper .text-content {
  padding: 13px 15px;
}

.qa-page-wrapper .reasoning-block {
  padding: 10px 14px;
}

/* 超长思考过程在自身内部滚动，避免占满整个对话窗口 */
.qa-page-wrapper .reasoning-text {
  max-height: 260px;
  padding-right: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  line-height: 1.7;
}

.qa-page-wrapper .reasoning-text::-webkit-scrollbar,
.qa-page-wrapper .desc-scroll::-webkit-scrollbar {
  width: 6px;
}

.qa-page-wrapper .reasoning-text::-webkit-scrollbar-thumb,
.qa-page-wrapper .desc-scroll::-webkit-scrollbar-thumb {
  background: #c8d7c9;
  border-radius: 999px;
}

.qa-page-wrapper .msg-images {
  max-width: 100%;
}

.qa-page-wrapper .msg-img {
  width: 132px;
  height: 104px;
}

/* 输入区与消息内容保持同一中轴线 */
.qa-page-wrapper .input-area {
  width: 100%;
  padding: 10px 18px 12px;
  flex: 0 0 auto;
}

.qa-page-wrapper .input-container {
  width: min(960px, 100%);
  max-width: none;
  padding: 10px 13px;
  margin: 0 auto;
}

.qa-page-wrapper .chat-input {
  width: 100%;
}

.qa-page-wrapper .chat-input :deep(.el-textarea__inner) {
  width: 100%;
  min-height: 44px !important;
}

.qa-page-wrapper .input-actions {
  min-height: 38px;
  margin-top: 7px;
}

.qa-page-wrapper .left-actions {
  min-width: 0;
}

.qa-page-wrapper .tech-tip {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-page-wrapper .pending-images {
  max-width: 100%;
  max-height: 144px;
  padding: 6px 4px 9px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
}

.qa-page-wrapper .pending-img-item {
  position: relative;
  width: 82px;
  height: 64px;
  flex: 0 0 82px;
}

/* 右侧知识图谱区 */
.qa-page-wrapper .kg-sidebar {
  display: flex;
  flex-direction: column;
}

.qa-page-wrapper .kg-sidebar .sidebar-header {
  height: 60px;
  min-height: 60px;
  padding: 0 16px;
  flex: 0 0 60px;
}

.qa-page-wrapper .kg-body {
  height: auto;
  min-height: 0;
  padding: 10px;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1 1 auto;
}

.qa-page-wrapper .kg-content-wrapper {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 10px;
}

.qa-page-wrapper .kg-chart-container {
  width: 100%;
  min-width: 0;
  padding: 6px;
  flex: 0 0 auto;
}

.qa-page-wrapper .kg-chart-container > div {
  width: 100% !important;
  height: clamp(300px, 43vh, 410px) !important;
  min-width: 0 !important;
}

.qa-page-wrapper .kg-desc {
  width: 100%;
  min-width: 0;
  margin-top: 0;
}

.qa-page-wrapper .kg-desc :deep(.el-descriptions__table) {
  width: 100%;
  table-layout: fixed;
}

.qa-page-wrapper .kg-desc :deep(.el-descriptions__cell) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.qa-page-wrapper .desc-scroll {
  max-height: 155px;
  padding-right: 5px;
  overflow-y: auto;
}

/* 中等桌面：不压缩中央聊天区，改为隐藏右侧图谱 */
@media (max-width: 1460px) {
  .qa-page-wrapper .qa-container {
    grid-template-columns: 220px minmax(640px, 1fr);
  }

  .qa-page-wrapper .kg-sidebar {
    display: none;
  }

  .qa-page-wrapper .message-list,
  .qa-page-wrapper .input-container {
    width: min(980px, 100%);
  }
}

/* 笔记本宽度：进一步缩窄左栏，但确保中央区域不低于合理宽度 */
@media (max-width: 1100px) {
  .qa-page-wrapper .qa-container {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .qa-page-wrapper .message-list {
    padding-right: 18px;
    padding-left: 18px;
  }

  .qa-page-wrapper .message-wrapper.is-ai .message-content {
    max-width: 94%;
  }

  .qa-page-wrapper .message-wrapper.is-user .message-content {
    max-width: 78%;
  }
}

/* 移动端改为上下布局，不采用三栏挤压 */
@media (max-width: 760px) {
  .qa-page-wrapper {
    height: auto;
    min-height: calc(100vh - 70px);
    padding: 8px;
    overflow: visible;
  }

  .qa-page-wrapper .custom-menu {
    width: 100%;
    overflow-x: auto;
    padding: 0 6px;
  }

  .qa-page-wrapper .custom-menu :deep(.el-menu-item) {
    flex: 0 0 auto;
    min-width: 90px;
  }

  .qa-page-wrapper .qa-container {
    display: flex;
    width: 100%;
    height: auto;
    min-height: 720px;
    flex-direction: column;
  }

  .qa-page-wrapper .sidebar {
    max-height: 200px;
    flex: 0 0 200px;
    border-right: 0;
    border-bottom: 1px solid #dfe9dd;
  }

  .qa-page-wrapper .session-list {
    height: 140px;
  }

  .qa-page-wrapper .main-chat {
    min-height: 650px;
  }

  .qa-page-wrapper .chat-header {
    align-items: flex-start;
    height: auto;
    min-height: 70px;
    padding: 10px 12px;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .qa-page-wrapper .model-name {
    white-space: normal;
  }

  .qa-page-wrapper .message-list {
    padding: 18px 12px 26px;
  }

  .qa-page-wrapper .message-content,
  .qa-page-wrapper .message-wrapper.is-ai .message-content,
  .qa-page-wrapper .message-wrapper.is-user .message-content {
    max-width: 90%;
  }

  .qa-page-wrapper .input-area {
    padding: 9px;
  }

  .qa-page-wrapper .input-container {
    width: 100%;
  }

  .qa-page-wrapper .tech-tip {
    display: none;
  }
}

.qa-page-wrapper .markdown-body {
  display: inline;
}
.qa-page-wrapper .markdown-body h1,
.qa-page-wrapper .markdown-body h2,
.qa-page-wrapper .markdown-body h3 {
  margin-top: 10px;
  margin-bottom: 6px;
  color: #2c503b;
  font-weight: 750;
  display: block;
}
.qa-page-wrapper .markdown-body h1 { font-size: 1.4em; }
.qa-page-wrapper .markdown-body h2 { font-size: 1.25em; border-bottom: 1px solid rgba(47, 125, 92, 0.1); padding-bottom: 3px; }
.qa-page-wrapper .markdown-body h3 { font-size: 1.1em; }

.qa-page-wrapper .markdown-body p {
  margin: 6px 0;
  display: block;
}

.qa-page-wrapper .markdown-body ul {
  margin: 6px 0;
  padding-left: 20px;
  display: block;
}

.qa-page-wrapper .markdown-body li {
  margin: 4px 0;
  list-style-type: disc;
  display: list-item;
}

.qa-page-wrapper .markdown-body strong {
  color: #1a4a30;
  font-weight: 700;
}

.qa-page-wrapper .markdown-body code {
  background-color: rgba(47, 125, 92, 0.08);
  color: #245f47;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: monospace, Consolas, sans-serif;
  font-size: 0.9em;
}

.qa-page-wrapper .markdown-body pre {
  background-color: #f1f6ef;
  border: 1px solid #dce8da;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  margin: 10px 0;
  display: block;
}

.qa-page-wrapper .markdown-body pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.9em;
}

/* Desktop workspace fills AppMain exactly, without leaving an outer bottom gap. */
@media (min-width: 761px) {
  .qa-page-wrapper {
    width: 100%;
    height: 100%;
    min-height: inherit;
    padding: 0;
    overflow: hidden;
  }

  .qa-page-wrapper .qa-container {
    width: 100%;
    max-width: none;
    height: 100%;
    min-height: 0;
    margin: 0;
    border-radius: 0;
  }
}
</style>
