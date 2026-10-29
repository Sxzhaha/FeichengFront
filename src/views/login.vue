<template>
  <div class="login-container">
    <div class="login-left">
      <div class="left-overlay"></div>
      <div class="left-content">
        <h1 class="platform-title">{{ systemTitle }}</h1>
        <p class="platform-subtitle">智汇视觉 · 赋能未来农业</p>
        <ul class="features-list">
          <li><el-icon><Monitor /></el-icon> 实时监控与智能分析</li>
          <li><el-icon><Crop /></el-icon> 精准农业管理</li>
        </ul>
      </div>
    </div>

    <div class="login-right">
      <div class="login-form-wrapper">
        <h2 class="welcome-text">欢迎回来</h2>
        <p class="welcome-subtext">请登录您的账户以继续使用</p>

        <el-form ref="loginRef" :model="loginForm" :rules="loginRules" class="login-form" size="large">
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              type="text"
              auto-complete="off"
              placeholder="请输入账号"
            >
              <template #prefix><el-icon class="el-input__icon"><User /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              auto-complete="off"
              placeholder="请输入密码"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix><el-icon class="el-input__icon"><Lock /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="code" v-if="captchaEnabled">
            <div class="code-flex">
              <el-input
                v-model="loginForm.code"
                auto-complete="off"
                placeholder="验证码"
                style="flex: 1; margin-right: 15px;"
                @keyup.enter="handleLogin"
              >
                <template #prefix><el-icon class="el-input__icon"><Key /></el-icon></template>
              </el-input>
              <div class="login-code">
                <img :src="codeUrl" @click="getCode" class="login-code-img" alt="验证码"/>
              </div>
            </div>
          </el-form-item>

          <div class="remember-box">
            <el-checkbox v-model="loginForm.rememberMe">记住我</el-checkbox>
            </div>

          <el-form-item style="width:100%;">
            <el-button
              :loading="loading"
              type="primary"
              class="login-btn"
              @click.prevent="handleLogin"
              round
            >
              <span v-if="!loading">安全登录</span>
              <span v-else>登 录 中...</span>
            </el-button>
          </el-form-item>

          <div class="register-link" v-if="register">
            还没有账户？ <router-link class="link-type" :to="'/register'">立即注册</router-link>
          </div>
        </el-form>
      </div>

      <div class="login-footer">
        <span>Copyright © {{ new Date().getFullYear() }} 山东农业大学●多模态数据挖掘与应用创新团队. All Rights Reserved.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getCodeImg } from "@/api/login"
import Cookies from "js-cookie"
import { encrypt, decrypt } from "@/utils/jsencrypt"
import useUserStore from '@/store/modules/user'
// 引入 Element Plus 的图标
import { User, Lock, Key, Monitor, CameraFilled, DataAnalysis } from '@element-plus/icons-vue'

// 【修改点】硬编码新的系统名称，移除原有引用
const systemTitle = "滨州冬枣种植平台";
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()

const loginForm = ref({
  username: "",
  password: "",
  rememberMe: false,
  code: "",
  uuid: ""
})

const loginRules = {
  username: [{ required: true, trigger: "blur", message: "请输入您的账号" }],
  password: [{ required: true, trigger: "blur", message: "请输入您的密码" }],
  code: [{ required: true, trigger: "change", message: "请输入验证码" }]
}

const codeUrl = ref("")
const loading = ref(false)
const captchaEnabled = ref(true)
const register = ref(true)
const redirect = ref(undefined)

watch(route, (newRoute) => {
    redirect.value = newRoute.query && newRoute.query.redirect
}, { immediate: true })

function handleLogin() {
  proxy.$refs.loginRef.validate(valid => {
    if (valid) {
      loading.value = true
      if (loginForm.value.rememberMe) {
        Cookies.set("username", loginForm.value.username, { expires: 30 })
        Cookies.set("password", encrypt(loginForm.value.password), { expires: 30 })
        Cookies.set("rememberMe", loginForm.value.rememberMe, { expires: 30 })
      } else {
        Cookies.remove("username")
        Cookies.remove("password")
        Cookies.remove("rememberMe")
      }
      userStore.login(loginForm.value).then(() => {
        const query = route.query
        const otherQueryParams = Object.keys(query).reduce((acc, cur) => {
          if (cur !== "redirect") {
            acc[cur] = query[cur]
          }
          return acc
        }, {})
        router.push({ path: redirect.value || "/home", query: otherQueryParams })
      }).catch(() => {
        loading.value = false
        if (captchaEnabled.value) {
          getCode()
        }
      })
    }
  })
}

function getCode() {
  getCodeImg().then(res => {
    captchaEnabled.value = res.captchaEnabled === undefined ? true : res.captchaEnabled
    if (captchaEnabled.value) {
      codeUrl.value = "data:image/gif;base64," + res.img
      loginForm.value.uuid = res.uuid
    }
  })
}

function getCookie() {
  const username = Cookies.get("username")
  const password = Cookies.get("password")
  const rememberMe = Cookies.get("rememberMe")
  loginForm.value = {
    username: username === undefined ? loginForm.value.username : username,
    password: password === undefined ? loginForm.value.password : decrypt(password),
    rememberMe: rememberMe === undefined ? false : Boolean(rememberMe)
  }
}

getCode()
getCookie()
</script>

<style lang='scss' scoped>
/* 定义新主题色调：科技蓝青色系 */
$theme-blue: #005bea;
$theme-cyan: #00c6fb;
$dark-text: #2c3e50;
$light-text: #909399;

.login-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* --- 左侧区域 --- */
.login-left {
  position: relative;
  flex: 1.2; /* 左侧稍微宽一点 */
  /* 【修改点】确保图片路径正确 */
  background-image: url("/binZhou/ld/login-bg-jujube.png");
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  overflow: hidden;

  // 遮罩层，增强文字可读性，营造科技感蓝调
  .left-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, rgba(0, 30, 80, 0.85) 0%, rgba(0, 90, 140, 0.7) 100%);
    z-index: 1;
  }

  .left-content {
    position: relative;
    z-index: 2;
    padding: 60px;
    max-width: 600px;

    .platform-title {
      font-size: 42px;
      font-weight: 700;
      margin-bottom: 15px;
      letter-spacing: 2px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }

    .platform-subtitle {
      font-size: 20px;
      margin-bottom: 40px;
      opacity: 0.9;
      font-weight: 300;
    }

    .features-list {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        display: flex;
        align-items: center;
        font-size: 16px;
        margin-bottom: 20px;
        .el-icon {
          margin-right: 15px;
          font-size: 22px;
          background: rgba(255,255,255,0.15);
          padding: 8px;
          border-radius: 50%;
          color: $theme-cyan;
        }
      }
    }
  }
}

/* --- 右侧区域 --- */
.login-right {
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 40px;

  .login-form-wrapper {
    width: 100%;
    max-width: 420px;
  }

  .welcome-text {
    font-size: 32px;
    color: $dark-text;
    margin-bottom: 10px;
    font-weight: 600;
  }
  
  .welcome-subtext {
    color: $light-text;
    margin-bottom: 40px;
    font-size: 16px;
  }
}

/* 表单样式定制 */
.login-form {
  // 定制输入框样式，使其更现代（底部边框风格）
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    border-bottom: 2px solid #eee;
    border-radius: 0;
    padding-left: 0;
    transition: all 0.3s;
    
    &.is-focus {
       border-bottom-color: $theme-blue;
    }
    
    .el-input__inner {
      text-indent: 10px; // 输入文字缩进
    }

    // 图标颜色
    .el-input__icon {
      color: $light-text;
      font-size: 18px;
    }
  }
}

.code-flex {
  display: flex;
  align-items: center;
  width: 100%;
}

.login-code {
  height: 40px;
  flex-shrink: 0;
  img {
    height: 100%;
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid #eee;
    vertical-align: middle;
  }
}

.remember-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

/* 登录按钮定制 - 渐变色 */
.login-btn {
  width: 100%;
  height: 50px;
  font-size: 18px;
  font-weight: 500;
  border: none;
  box-shadow: 0 10px 20px -10px rgba($theme-blue, 0.5);
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 25px -10px rgba($theme-blue, 0.6);
  }
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: $light-text;
  font-size: 14px;
  .link-type {
    color: $theme-blue;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
}

/* 底部版权 */
.login-footer {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
  color: $light-text;
  font-size: 12px;
  font-family: Arial;
  letter-spacing: 1px;
}

/* 覆盖 Element Plus 复选框选中颜色 */
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: $theme-blue;
  border-color: $theme-blue;
}
:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: $theme-blue;
}

/* 响应式处理：小屏幕下变为上下结构 */
@media (max-width: 992px) {
  .login-container {
    flex-direction: column;
  }
  .login-left {
    flex: 0 0 35vh; /* 上部占 35% 高度 */
    .left-content {
       padding: 30px;
       text-align: center;
       .platform-title { font-size: 28px; }
       .platform-subtitle { font-size: 16px; margin-bottom: 20px;}
       .features-list { display: none; } /* 小屏隐藏特性列表 */
    }
  }
  .login-right {
    flex: 1;
    padding: 30px 20px;
  }
  .login-footer {
    position: relative;
    bottom: auto;
    margin-top: 30px;
  }
}
</style>