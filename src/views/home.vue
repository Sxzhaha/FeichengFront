<template>
  <div class="portal-container">
    <header class="portal-header">
      <div>
        <div class="logo-text-group">
          <span class="logo-text">滨州冬枣智慧种植平台</span>
          <span class="logo-subtext">Smart Jujube Planting Platform</span>
        </div>
      </div>

      <el-menu mode="horizontal" class="portal-nav-menu" :ellipsis="false">
        
          <el-menu-item index="1-1" @click="goToVisual">
            <el-icon><DataAnalysis /></el-icon>
            <span>智慧大脑</span>
          </el-menu-item>
          <el-menu-item index="1-2" @click="goToIot">
            <el-icon><MapLocation /></el-icon>
            <span>智能感知</span>
          </el-menu-item>


        <el-sub-menu index="2">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>智能监测</span>
          </template>
          <el-menu-item index="2-1" @click="goToDiseasemoitor">
            <el-icon><Warning /></el-icon>
            <span>病虫识别</span>
          </el-menu-item>
          <el-menu-item index="2-2" @click="goToPestMonitor">
            <el-icon><Aim /></el-icon>
            <span>虫情测报</span>
          </el-menu-item>
          <el-menu-item index="2-3" @click="goToPhenologyMonitor">
            <el-icon><Odometer /></el-icon>
            <span>物候监测</span>
          </el-menu-item>
        </el-sub-menu>
       <el-menu-item index="8" @click="goToFarmerDashboard">
          <el-icon><ChatDotRound /></el-icon>
          <span>智能决策</span>
        </el-menu-item>

        <el-menu-item index="3" @click="goToPark">
          <el-icon><OfficeBuilding /></el-icon>
          <span>园区管理</span>
        </el-menu-item>
         <el-menu-item index="5" @click="goToFarmerTask">
          <el-icon><Collection /></el-icon>
          <span>农事管理</span>
        </el-menu-item>
        <el-menu-item index="6" @click="goToFeatureQa">
          <el-icon><ChatDotRound /></el-icon>
          <span>专家问诊</span>
        </el-menu-item>


      </el-menu>

      <div>
        <el-dropdown trigger="click" @command="handleUserCommand">
          <div class="user-profile-btn">
            <el-avatar :size="28" :src="userStore.avatar" />
            <span class="user-nickname">{{ userStore.nickName }}</span>
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu class="home-dropdown-menu">
              <el-dropdown-item v-if="isAdmin" command="admin">
                <el-icon><Monitor /></el-icon>管理后台
              </el-dropdown-item>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>个人信息
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="portal-main">
    <section class="hero-banner">
      <el-carousel height="100%" class="banner-carousel" indicator-position="none" arrow="never">
        <el-carousel-item v-for="(img, index) in carouselImages" :key="index">
          <div
            class="carousel-bg"
            :style="{ backgroundImage: `url(${img})` }"
          />
        </el-carousel-item>
      </el-carousel>

      <div class="banner-content">
        <p class="banner-kicker">SMART JUJUBE ORCHARD</p>
        <h1 class="banner-title">赋能冬枣智慧种植</h1>
        <p class="banner-subtitle">感知、识别、决策与农事协同</p>

        <div class="banner-actions">
          <el-button type="primary" size="large" class="hero-btn primary" @click="goToFeature('/ld/featureWiki')">
            <el-icon><Reading /></el-icon>
            冬枣百科
          </el-button>
          <el-button size="large" class="hero-btn secondary" @click="goToFeature('/ld/featureQa')">
            <el-icon><ChatDotRound /></el-icon>
            专家问诊
          </el-button>
        </div>
      </div>

    </section>

    <section class="features-section">
      <div class="section-header">
        <div class="section-copy">
          <h2 class="section-title">核心功能场景</h2>
          <p class="section-desc">面向冬枣种植生产全过程，提供从生长监测、科学问答到品种归档的一体化管理服务。</p>
        </div>
        <span class="section-count">04</span>
      </div>

      <div class="scroll-reveal application-grid">
            <div
              class="application-item"
              v-for="(item, index) in features"
              :key="index"
            >
              <el-card
                class="feature-card"
                shadow="never"
                :body-style="{ padding: '0px' }"
                @click="goToFeature(item.path)"
              >
                <div class="feature-image">
                  <el-image :src="item.image" fit="cover" class="img-element">
                    <template #error>
                      <div class="image-placeholder">
                        <el-icon class="placeholder-icon">
                          <component :is="item.icon" />
                        </el-icon>
                      </div>
                    </template>
                  </el-image>
                </div>

                <div class="feature-content">
                  <div class="feature-heading">
                    <el-icon class="feature-icon"><component :is="item.icon" /></el-icon>
                    <span class="feature-number">0{{ index + 1 }}</span>
                  </div>
                  <h3 class="feature-title">{{ item.title }}</h3>
                  <p class="feature-desc">{{ item.desc }}</p>
                  <div class="feature-link">
                    <span>进入功能</span>
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </div>
              </el-card>
            </div>
      </div>
    </section>

    <section class="intro-section">
      <div class="intro-box">
        <div class="intro-left">
          <h3 class="intro-title">让枣园管理更高效，让种植决策更科学</h3>
          <p class="intro-text">
            平台聚焦冬枣生长分析、日常病虫防治及优良品种资源维护，通过信息化手段提升现场诊断、知识检索与果园经营的综合数字化水平。
          </p>
        </div>
        <div class="intro-right">
          <div class="intro-tag">病虫害辅助诊断</div>
          <div class="intro-tag">专家在线问答</div>
          <div class="intro-tag">防治百科检索</div>
          <div class="intro-tag">品种档案管理</div>
          <div class="intro-tag">智慧果园建设</div>
          <div class="intro-tag">绿色精准管护</div>
        </div>
      </div>
    </section>
    </main>

    <footer class="portal-footer">
      <div>
        <p>
          Copyright © {{ new Date().getFullYear() }}
          山东农业大学●多模态数据挖掘与应用创新团队. All Rights Reserved.
        </p>
      </div>
    </footer>

    <div class="portal-side-ai-trigger" @click="toggleAiChat" v-if="!aiChatVisible">
      <el-icon class="ai-trigger-icon"><ChatDotRound /></el-icon>
      <div class="ai-trigger-text">在线顾问</div>
    </div>

    <!-- 种植智能问答挂件 -->
    <transition name="slide-up">
      <div v-if="aiChatVisible" class="ai-chat-panel">
        <div class="chat-panel-header">
          <span class="card-title">
            <el-icon class="icon-accent"><ChatDotRound /></el-icon>种植问答顾问
          </span>
          <el-button link class="close-btn" @click="aiChatVisible = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="chat-panel-body">
          <el-scrollbar ref="chatScrollbarRef">
            <div class="chat-message-list">
              <div class="chat-msg ai-msg">
                <div class="avatar-wrap">顾问</div>
                <div class="content-box">
                  您好！我是您的种植技术助手。有关冬枣水肥管理、常见病虫害辅助防治、生长状态等日常种植问题，都可以随时向我咨询。
                </div>
              </div>
              
              <div 
                v-for="(msg, idx) in aiMessages" 
                :key="idx" 
                class="chat-msg"
                :class="msg.role === 'user' ? 'user-msg' : 'ai-msg'"
              >
                <div class="avatar-wrap">{{ msg.role === 'user' ? '用户' : '顾问' }}</div>
                <div class="content-box">
                  <span v-if="msg.isThinking" class="thinking-text">正在查询知识库，请稍候...</span>
                  <span v-else>{{ msg.content }}</span>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>
        
        <div class="chat-panel-footer">
          <el-input
            v-model="aiInputText"
            placeholder="请输入您遇到的栽培或病害问题..."
            @keyup.enter="sendAiMessage"
            :disabled="aiLoading"
            size="small"
            class="chat-input-mini"
          >
            <template #append>
              <el-button @click="sendAiMessage" :loading="aiLoading" size="small">发送</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </transition>

    <el-dialog
      title="个人中心"
      v-model="profileDialogVisible"
      width="500px"
      append-to-body
      class="cyber-dialog" 
    >
      <el-tabs v-model="activeProfileTab" class="cyber-tabs">
        <el-tab-pane label="修改个人信息" name="info">
          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-width="80px"
            class="cyber-form"
            style="margin-top: 15px;"
          >
            <el-form-item label="用户昵称" prop="nickName">
              <el-input v-model="profileForm.nickName" placeholder="请输入用户昵称" />
            </el-form-item>
            <el-form-item label="手机号码" prop="phonenumber">
              <el-input v-model="profileForm.phonenumber" placeholder="请输入手机号码" maxlength="11" />
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="profileForm.email" placeholder="请输入邮箱地址" maxlength="50" />
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="profileForm.sex">
                <el-radio label="0">男</el-radio>
                <el-radio label="1">女</el-radio>
                <el-radio label="2">未知</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item style="margin-top: 25px; margin-bottom: 0; text-align: right;">
              <el-button @click="profileDialogVisible = false" size="small">取消</el-button>
              <el-button type="success" @click="submitProfile" size="small" style="background-color: #2f7d32; border-color: #2f7d32;">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="重置密码" name="pwd">
          <el-form
            ref="pwdFormRef"
            :model="pwdForm"
            :rules="pwdRules"
            label-width="80px"
            class="cyber-form"
            style="margin-top: 15px;"
          >
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入旧密码" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="pwdForm.newPassword" type="password" placeholder="请输入新密码" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="请再次确认新密码" show-password />
            </el-form-item>
            <el-form-item style="margin-top: 25px; margin-bottom: 0; text-align: right;">
              <el-button @click="profileDialogVisible = false" size="small">取消</el-button>
              <el-button type="success" @click="submitPassword" size="small" style="background-color: #2f7d32; border-color: #2f7d32;">确定</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Monitor, ChatDotRound, Reading, Collection, DataAnalysis, OfficeBuilding, MapLocation, Close, ArrowDown, User, SwitchButton, Warning, Aim, Odometer, ArrowRight } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import useUserStore from '@/store/modules/user'
import { getToken } from '@/utils/auth'
import { getUserProfile, updateUserProfile, updateUserPwd } from "@/api/system/user"

const router = useRouter()
const userStore = useUserStore()

const isAdmin = computed(() => {
  return userStore.roles && userStore.roles.includes('admin')
})

const carouselImages = [
  '/bzhou/binZhou/ld/lunbo-1.png',
  '/bzhou/binZhou/ld/lunbo-2.png',
  '/bzhou/binZhou/ld/lunbo-3.png'
]

const features = [
  {
    title: '病虫害识别',
    desc: '冬枣常见病虫害图像快速辅助诊断，及时提供科学药剂与防治建议。',
    image: '/bzhou/binZhou/ld/feature-pest.png',
    icon: Monitor,
    path: '/sxz/disease-auto-task'
  },
  {
    title: '物候期识别',
    desc: '跟踪记录生长阶段，分析作物当前物候特征与田间生产进度。',
    image: '/bzhou/binZhou/ld/feature-variety.png',
    icon: Monitor,
    path: '/xwq/phenologyMonitor/ai'
  },
  {
    title: '智能问答',
    desc: '针对冬枣栽培、修剪、施肥等日常管护难题，提供即时的专家级解答。',
    image: '/bzhou/binZhou/ld/feature-qa.png',
    icon: ChatDotRound,
    path: '/ld/featureQa'
  },
  {
    title: '农事百科',
    desc: '全面结构化的冬枣病理、虫害数据及生理性病害档案，支持动态检索。',
    image: '/bzhou/binZhou/ld/feature-wiki.png',
    icon: Reading,
    path: '/ld/cropVariety'
  }
]

const goToFeature = (path) => {
  if (path) {
    const routeUrl = router.resolve({ path })
    window.open(routeUrl.href, '_blank')
  }
}

const goToIot = () => {
  const routeUrl = router.resolve({ path: '/ld/iot/intelligentPerception' })
  window.open(routeUrl.href, '_blank')
}

const goToVisual = () => {
  const routeUrl = router.resolve({ path: '/ld/visual/index' })
  window.open(routeUrl.href, '_blank')
}

const goToDiseasemoitor = () =>{
  const routeUrl = router.resolve({path:'/disease-analysis'})
  window.open(routeUrl.href,'_blank')
}

const goToPestMonitor = () => {
  const routeUrl = router.resolve({ path: '/xwq/pestMonitor/analysis' })
  window.open(routeUrl.href, '_blank')
}

const goToPhenologyMonitor = () => {
  const routeUrl = router.resolve({ path: '/xwq/phenologyMonitor/analysis' })
  window.open(routeUrl.href, '_blank')
}

const goToPark = () => {
  const routeUrl = router.resolve({ path: '/ld/iot/hierarchy' })
  window.open(routeUrl.href, '_blank')
}

const goToKnowledgeFront = () => {
  const routeUrl = router.resolve({ path: '/ld/cropVariety' })
  window.open(routeUrl.href, '_blank')
}

const goToFarmerTask = () => {
  const routeUrl = router.resolve({ path: '/farmerTask' })
  window.open(routeUrl.href, '_blank')
}

const goToFeatureQa = () => {
  const routeUrl = router.resolve({ path: '/ld/featureQa' })
  window.open(routeUrl.href, '_blank')
}
const goToFarmerDashboard = () => {
  
  const routeUrl = router.resolve({ path: '/frontend-dashboard' })
  window.open(routeUrl.href, '_blank')
}

const goToFarmerReport = () => {
  
  const routeUrl = router.resolve({ path: '/farmer-report' })
  window.open(routeUrl.href, '_blank')
}

const goToReport = () => {
  
  const routeUrl = router.resolve({ path: '/agri-report' })
  window.open(routeUrl.href, '_blank')
}

const goToDecision = () => {
  ElMessage.warning('智能决策模块正在建设中，敬请期待！')
  // const routeUrl = router.resolve({ path: '/ld/featureDecision' })
  // window.open(routeUrl.href, '_blank')
}


// 个人中心修改
const profileDialogVisible = ref(false)
const activeProfileTab = ref('info')

const profileForm = ref({ nickName: '', phonenumber: '', email: '', sex: '0' })
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })

const profileRules = {
  nickName: [{ required: true, message: "用户昵称不能为空", trigger: "blur" }],
  phonenumber: [
    { required: true, message: "手机号码不能为空", trigger: "blur" },
    { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码", trigger: "blur" }
  ],
  email: [
    { required: true, message: "邮箱地址不能为空", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱地址", trigger: "blur" }
  ]
}

const pwdRules = {
  oldPassword: [{ required: true, message: "旧密码不能为空", trigger: "blur" }],
  newPassword: [
    { required: true, message: "新密码不能为空", trigger: "blur" },
    { min: 6, max: 20, message: "长度在 6 到 20 个字符", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "确认密码不能为空", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.value.newPassword) {
          callback(new Error("两次输入的密码不一致"))
        } else {
          callback()
        }
      },
      trigger: "blur"
    }
  ]
}

const profileFormRef = ref(null)
const pwdFormRef = ref(null)

const openProfileDialog = () => {
  activeProfileTab.value = 'info'
  getUserProfile().then(response => {
    const user = response.data
    profileForm.value = {
      nickName: user.nickName || '',
      phonenumber: user.phonenumber || '',
      email: user.email || '',
      sex: user.sex || '0'
    }
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    profileDialogVisible.value = true
  })
}

const submitProfile = () => {
  profileFormRef.value.validate(valid => {
    if (valid) {
      updateUserProfile(profileForm.value).then(() => {
        ElMessage.success("修改个人信息成功")
        userStore.nickName = profileForm.value.nickName
        profileDialogVisible.value = false
      })
    }
  })
}

const submitPassword = () => {
  pwdFormRef.value.validate(valid => {
    if (valid) {
      updateUserPwd(pwdForm.value.oldPassword, pwdForm.value.newPassword).then(() => {
        ElMessage.success("修改密码成功，请重新登录")
        profileDialogVisible.value = false
        userStore.logOut().then(() => {
          router.push('/login')
        })
      })
    }
  })
}

const handleUserCommand = (command) => {
  if (command === 'admin') router.push('/index')
  else if (command === 'profile') openProfileDialog()
  else if (command === 'logout') {
    ElMessageBox.confirm('确定注销并退出系统吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }).then(() => {
      userStore.logOut().then(() => {
        router.push('/login')
        ElMessage.success('已成功退出登录')
      })
    })
  }
}

// 在线顾问挂件
const aiChatVisible = ref(false);
const aiInputText = ref('');
const aiLoading = ref(false);
const aiMessages = ref([]);
const chatScrollbarRef = ref(null);

const toggleAiChat = () => {
  aiChatVisible.value = !aiChatVisible.value;
  if (aiChatVisible.value) nextTick(() => { scrollToChatBottom(); });
};

const scrollToChatBottom = () => {
  if (chatScrollbarRef.value) {
    const wrap = chatScrollbarRef.value.wrapRef;
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }
};

const sendAiMessage = async () => {
  const text = aiInputText.value.trim();
  if (!text || aiLoading.value) return;

  aiInputText.value = '';
  aiMessages.value.push({ role: 'user', content: text });
  aiLoading.value = true;
  
  nextTick(() => { scrollToChatBottom(); });
  const aiMsg = reactive({ role: 'ai', content: '', isThinking: true });
  aiMessages.value.push(aiMsg);

  try {
    const response = await fetch(import.meta.env.VITE_APP_BASE_API + '/binZhou/ld/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ` + getToken(),
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ text: text, historyMessages: [], images: [] })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (let line of lines) {
        line = line.trim();
        if (!line || !line.startsWith('data:')) continue;
        const dataStr = line.substring(5).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const delta = JSON.parse(dataStr).choices?.[0]?.delta;
          if (delta && delta.content) {
            aiMsg.isThinking = false;
            aiMsg.content += delta.content;
            scrollToChatBottom();
          }
        } catch (e) {
          console.warn("流解析略过", e);
        }
      }
    }
  } catch (error) {
    aiMsg.isThinking = false;
    aiMsg.content = `暂未获取到数据，请稍后重试: ${error.message}`;
  } finally {
    aiLoading.value = false;
    nextTick(() => { scrollToChatBottom(); });
  }
};

let revealObserver = null;

onMounted(() => {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        revealObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })

  const reveals = document.querySelectorAll('.scroll-reveal')
  reveals.forEach((el) => { revealObserver.observe(el) })
})

onBeforeUnmount(() => {
  if (revealObserver) revealObserver.disconnect()
})
</script>

<style scoped>
.portal-container {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #edf5ef;
  color: #183a26;
}

/* 导航 */
.portal-header {
  height: 72px;
  background: #ffffff;
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 42px;
  box-shadow: 0 2px 12px rgba(23, 75, 45, 0.08);
  border-bottom: 1px solid #d8e9dc;
  position: sticky;
  top: 0;
  z-index: 100;
}

.portal-nav-menu {
  background: transparent !important;
  border-bottom: none !important;
  height: 100%;
  flex: 1;
  justify-content: center;
  margin: 0 40px;
}
.portal-nav-menu :deep(.el-sub-menu__title),
.portal-nav-menu :deep(.el-menu-item) {
  height: 72px !important;
  line-height: 72px !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #31523d !important;
  border-bottom: none !important;
}
.portal-nav-menu :deep(.el-sub-menu__title):hover,
.portal-nav-menu :deep(.el-menu-item):hover,
.portal-nav-menu :deep(.el-menu-item).is-active {
  color: #176b46 !important;
  background: #e5f3e9 !important;
}
.portal-nav-menu :deep(.el-sub-menu).is-active .el-sub-menu__title {
  color: #176b46 !important;
}

.logo-text-group {
  display: flex;
  flex-direction: column;
}
.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #145438;
  letter-spacing: 0.5px;
}
.logo-subtext {
  font-size: 11px;
  color: #6d8b78;
  margin-top: 1px;
}

.user-profile-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #edf7ef;
  padding: 5px 14px;
  border-radius: 20px;
  border: 1px solid #cfe4d4;
  transition: all 0.2s;
  cursor: pointer;
}
.user-profile-btn:hover {
  background: #dff0e3;
}
.user-nickname {
  font-size: 13px;
  color: #176b46;
  font-weight: 600;
}

:deep(.home-dropdown-menu) {
  background-color: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}
:deep(.home-dropdown-menu) .el-dropdown-menu__item {
  color: #4a5568 !important;
  font-size: 13px;
  padding: 9px 18px;
}
:deep(.home-dropdown-menu) .el-dropdown-menu__item:hover {
  background-color: #e5f3e9 !important;
  color: #176b46 !important;
}

.portal-main {
  flex: 1;
}

/* 主视觉 */
.hero-banner {
  position: relative;
  height: clamp(390px, 47vh, 520px);
  overflow: hidden;
  background: #123b26;
}
.banner-carousel {
  width: 100%;
  height: 100%;
}
.banner-carousel :deep(.el-carousel__container) {
  height: 100%;
}
.carousel-bg {
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  transform: scale(1.01);
}
.banner-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #ffffff;
  z-index: 3;
  width: min(760px, calc(100% - 84px));
}
.banner-kicker {
  margin: 0 0 18px;
  color: #a9dbb7;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
}
.banner-title {
  margin: 0;
  font-size: 44px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: 0;
}
.banner-subtitle {
  margin: 18px 0 30px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 16px;
  line-height: 1.6;
  letter-spacing: 0;
}
.banner-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.hero-btn {
  min-width: 132px;
  height: 44px;
  border-radius: 4px;
  font-weight: 600;
}
.hero-btn.primary {
  --el-button-bg-color: #2b9663;
  --el-button-border-color: #2b9663;
  --el-button-hover-bg-color: #42ad76;
  --el-button-hover-border-color: #42ad76;
}
.hero-btn.secondary {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.48);
  background: rgba(10, 45, 27, 0.35);
}
.hero-btn.secondary:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.12);
}
/* 核心业务 */
.features-section {
  padding: 5px 42px;
  background: transparent;
  border-top: none;
  border-bottom: none;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
.section-header {
  min-height: 56px;
  margin-bottom: 5px;
  padding-bottom: 14px;
  border-bottom: 1px solid #b8d7c1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.section-title {
  margin: 16px 0 0;
  color: #17472e;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: 0;
}
.section-copy {
  min-width: 0;
}
.section-desc {
  margin: 8px 0 0;
  color: #5e7e69;
  font-size: 13px;
  line-height: 1.5;
}

.intro-section {
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 42px 44px;
  box-sizing: border-box;
}
.intro-box {
  display: flex;
  align-items: center;
  gap: 34px;
  padding: 24px 26px;
  border: 1px solid #d7ddd7;
  border-left: 3px solid #2b9663;
  background: #ffffff;
}
.intro-left { flex: 1.2; min-width: 0; }
.intro-title {
  margin: 0 0 9px;
  color: #1d4a30;
  font-size: 18px;
  line-height: 1.35;
  font-weight: 650;
}
.intro-text {
  margin: 0;
  color: #66826f;
  font-size: 13px;
  line-height: 1.7;
}
.intro-right {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.intro-tag {
  padding: 6px 10px;
  border: 1px solid #cfe4d4;
  color: #397152;
  background: #f2faf3;
  font-size: 12px;
}
.section-count {
  color: #2b9663;
  font-size: 30px;
  font-weight: 300;
  line-height: 1;
}
.application-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
}

.application-item {
  margin: 5px;
}

.feature-card {
  height: 100%;
  border: 1px solid #b8d7c1 !important;
  border-radius: 4px;
  background: #ffffff;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.feature-card:hover {
  transform: translateY(-3px);
  border-color: #2b9663 !important;
  box-shadow: 0 12px 24px rgba(23, 107, 70, 0.16);
}
.feature-image {
  height: 150px;
  width: 100%;
  background: #e6ebe6;
  overflow: hidden;
}
.img-element {
  width: 100%;
  height: 100%;
  transition: transform 0.35s ease;
}
.feature-card:hover .img-element {
  transform: scale(1.035);
}
.image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #508067;
  background: #e7ece7;
}
.placeholder-icon {
  font-size: 34px;
}
.feature-content {
  padding: 16px 17px 15px;
}
.feature-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.feature-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #176b46;
  background: #d9efdf;
  font-size: 18px;
}
.feature-number {
  color: #6f9a7c;
  font-size: 11px;
  font-weight: 600;
}
.feature-title {
  margin: 0 0 7px;
  color: #1d4a30;
  font-size: 17px;
  line-height: 1.3;
  font-weight: 650;
}
.feature-desc {
  height: 42px;
  margin: 0 0 14px;
  color: #66826f;
  font-size: 12px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feature-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #d4e9d9;
  color: #218657;
  font-size: 12px;
  font-weight: 600;
}

/* 动效 */
.scroll-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.portal-footer {
  background: #123b26;
  color: #a8c8b2;
  text-align: center;
  padding: 24px;
  font-size: 13px;
}

/* 弹窗样式 */
:deep(.cyber-dialog) {
  background: #ffffff !important;
  border-radius: 8px;
}
:deep(.cyber-tabs) .el-tabs__item.is-active {
  color: #2f7d32 !important;
}
:deep(.cyber-tabs) .el-tabs__active-bar {
  background-color: #2f7d32 !important;
}
:deep(.cyber-form) .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1.5px #2f7d32 inset !important;
}
:deep(.cyber-form) .el-radio__input.is-checked .el-radio__inner {
  border-color: #2f7d32 !important;
  background: #2f7d32 !important;
}
:deep(.cyber-form) .el-radio__input.is-checked + .el-radio__label {
  color: #2f7d32 !important;
}

/* 悬浮侧边按钮 */
.portal-side-ai-trigger {
  position: fixed;
  right: 0;
  top: 55%;
  transform: translateY(-50%);
  width: 34px;
  background: #2f7d32;
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
  cursor: pointer;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px;
  color: #ffffff;
}
.ai-trigger-icon { font-size: 16px; margin-bottom: 4px; }
.ai-trigger-text { font-size: 11px; writing-mode: vertical-rl; letter-spacing: 1px; }

/* 顾问聊天面板核心重构区 (深度调和果园绿色系) */
.ai-chat-panel {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 350px;
  height: 460px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #2f7d32; /* 面板主框线融入绿色 */
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(47, 125, 50, 0.15); /* 阴影融入微弱绿光 */
  overflow: hidden;
}

.chat-panel-header {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #3d9a50 0%, #2f7d32 100%) !important;
  border-bottom: none;
}
.chat-panel-header .card-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  font-size: 13px;
  color: #ffffff !important; /* 文字反白 */
}
.chat-panel-header .icon-accent {
  color: #ffffff !important; /* 图标反白 */
}
.chat-panel-header .close-btn {
  padding: 0;
  color: rgba(255, 255, 255, 0.8) !important;
}
.chat-panel-header .close-btn:hover {
  color: #ffffff !important;
}

.chat-panel-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  background: #f4f8f4;
}

.chat-message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chat-msg {
  display: flex;
  gap: 8px;
  max-width: 90%;
}
.chat-msg.ai-msg {
  align-self: flex-start;
}
.chat-msg.user-msg {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar-wrap {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  flex-shrink: 0;
}
.ai-msg .avatar-wrap {
  background: #eaf2ea;
  color: #2f7d32;
  border: 1px solid #c2dec2;
}
.user-msg .avatar-wrap {
  background: #2f7d32;
  color: #ffffff;
}

.content-box {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

/* 顾问气泡：纯白微框，与浅绿背景形成精美层级 */
.ai-msg .content-box {
  background: #ffffff;
  border: 1px solid #d4ebd4;
  color: #242c26;
}

/* 用户气泡：经典饱满绿底白字 */
.user-msg .content-box {
  background: #2f7d32;
  border: 1px solid #2f7d32;
  color: #ffffff;
}

.thinking-text {
  color: #556e5a;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.thinking-text::after {
  content: '';
  width: 4px;
  height: 4px;
  background-color: #556e5a;
  border-radius: 50%;
  animation: thinking-dot 1.2s infinite ease-in-out;
}
@keyframes thinking-dot {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* 页脚输入区：舒适浅绿底调 */
.chat-panel-footer {
  padding: 8px;
  border-top: 1px solid #e2eae2;
  background: #eef5ee;
}

/* 深度适配组件输入框，聚焦呈现绿色呼吸边框 */
.chat-input-mini :deep(.el-input__wrapper) {
  background-color: #ffffff !important;
  box-shadow: 0 0 0 1px #cbd5e1 inset !important;
}
.chat-input-mini :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px #2f7d32 inset !important;
}
.chat-input-mini :deep(.el-input-group__append) {
  background-color: #2f7d32 !important;
  color: #ffffff !important;
  border-color: #2f7d32 !important;
  font-weight: 600;
}

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(15px); opacity: 0; }

@media (max-width: 992px) {
  .portal-header { padding: 0 20px; }
  .banner-content { left: 50%; width: calc(100% - 56px); }
  .application-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .intro-box { flex-direction: column; align-items: flex-start; gap: 18px; }
}
@media (max-width: 768px) {
  .portal-header { height: auto; padding: 12px; flex-direction: column; gap: 8px; }
  .hero-banner { height: 360px; }
  .banner-content { left: 50%; width: calc(100% - 40px); }
  .banner-kicker { margin-bottom: 12px; font-size: 10px; }
  .banner-title { font-size: 30px; }
  .banner-subtitle { margin: 13px 0 24px; font-size: 14px; }
  .banner-actions { gap: 8px; }
  .hero-btn { min-width: 0; flex: 1; }
  .features-section { padding: 5px 16px; }
  .application-grid { grid-template-columns: 1fr; }
  .feature-image { height: 180px; }
  .intro-section { padding: 0 16px 32px; }
  .intro-box { padding: 20px; }
  .portal-footer { padding: 18px 14px; line-height: 1.6; }
  .ai-chat-panel { right: 12px; bottom: 16px; width: calc(100vw - 24px); height: min(520px, calc(100vh - 32px)); }
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal,
  .feature-card,
  .img-element {
    transition: none;
  }
}
</style>
