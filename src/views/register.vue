<template>
  <div class="register-container">
    <div class="register-left">
      <div class="left-overlay"></div>
      <div class="left-content">
        <h1 class="platform-title">滨州冬枣智慧种植平台</h1>
        <p class="platform-subtitle">加入我们 · 共创智慧农业新未来</p>
        <div class="intro-text">
          <p>注册成为平台用户，您将获得：</p>
          <ul>
            <li>冬枣知识百科</li>
            <li>定制化AI分析模型支持</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="register-right">
      <div class="register-form-wrapper">
        <h2 class="form-title">创建新账户</h2>
        <p class="form-subtitle">请填写以下信息完成注册</p>

        <el-form ref="registerRef" :model="registerForm" :rules="registerRules" class="register-form" size="large">
          <el-form-item prop="username">
            <el-input 
              v-model="registerForm.username" 
              type="text" 
              auto-complete="off" 
              placeholder="账号 (2-20位字符)"
            >
              <template #prefix><el-icon class="el-input__icon"><User /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              auto-complete="off"
              placeholder="密码 (5-20位字符)"
              show-password
              @keyup.enter="handleRegister"
            >
              <template #prefix><el-icon class="el-input__icon"><Lock /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              auto-complete="off"
              placeholder="确认密码"
              show-password
              @keyup.enter="handleRegister"
            >
              <template #prefix><el-icon class="el-input__icon"><CircleCheck /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="code" v-if="captchaEnabled">
            <div class="code-flex">
              <el-input
                v-model="registerForm.code"
                auto-complete="off"
                placeholder="验证码"
                style="flex: 1; margin-right: 15px;"
                @keyup.enter="handleRegister"
              >
                <template #prefix><el-icon class="el-input__icon"><Key /></el-icon></template>
              </el-input>
              <div class="register-code">
                <img :src="codeUrl" @click="getCode" class="register-code-img" alt="验证码"/>
              </div>
            </div>
          </el-form-item>

          <el-form-item style="width:100%; margin-top: 30px;">
            <el-button
              :loading="loading"
              type="primary"
              class="register-btn"
              @click.prevent="handleRegister"
            >
              <span v-if="!loading">立即注册</span>
              <span v-else>注 册 中...</span>
            </el-button>
          </el-form-item>

          <div class="login-link">
            已有账户？ <router-link class="link-type" :to="'/login'">直接登录</router-link>
          </div>
        </el-form>
      </div>

      <div class="register-footer">
        <span>Copyright © {{ new Date().getFullYear() }} 山东农业大学●多模态数据挖掘与应用创新团队. All Rights Reserved.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessageBox } from "element-plus"
import { getCodeImg, register } from "@/api/login"
// 引入 Element Plus 图标
import { User, Lock, Key, CircleCheck } from '@element-plus/icons-vue'

const router = useRouter()
const { proxy } = getCurrentInstance()

const registerForm = ref({
  username: "",
  password: "",
  confirmPassword: "",
  code: "",
  uuid: ""
})

const equalToPassword = (rule, value, callback) => {
  if (registerForm.value.password !== value) {
    callback(new Error("两次输入的密码不一致"))
  } else {
    callback()
  }
}

const registerRules = {
  username: [
    { required: true, trigger: "blur", message: "请输入您的账号" },
    { min: 2, max: 20, message: "用户账号长度必须介于 2 和 20 之间", trigger: "blur" }
  ],
  password: [
    { required: true, trigger: "blur", message: "请输入您的密码" },
    { min: 5, max: 20, message: "用户密码长度必须介于 5 和 20 之间", trigger: "blur" },
    { pattern: /^[^<>"'|\\]+$/, message: "不能包含非法字符：< > \" ' \\\ |", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, trigger: "blur", message: "请再次输入您的密码" },
    { required: true, validator: equalToPassword, trigger: "blur" }
  ],
  code: [{ required: true, trigger: "change", message: "请输入验证码" }]
}

const codeUrl = ref("")
const loading = ref(false)
const captchaEnabled = ref(true)

function handleRegister() {
  proxy.$refs.registerRef.validate(valid => {
    if (valid) {
      loading.value = true
      register(registerForm.value).then(res => {
        const username = registerForm.value.username
        ElMessageBox.alert("<font color='#2c5e4f'>恭喜你，您的账号 " + username + " 注册成功！</font>", "注册成功", {
          dangerouslyUseHTMLString: true,
          type: "success",
          confirmButtonText: "去登录",
          confirmButtonClass: "register-success-btn" // 自定义类名以匹配主题色
        }).then(() => {
          router.push("/login")
        }).catch(() => {})
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
      registerForm.value.uuid = res.uuid
    }
  })
}

getCode()
</script>

<style lang='scss' scoped>
/* 定义统一的主题色调 */
$theme-primary: #2c5e4f; /* 森绿色 */
$theme-dark: #1a3a32;
$text-main: #303133;
$text-sub: #606266;
$border-color: #dcdfe6;

.register-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f5f7fa;
}

/* --- 左侧区域 --- */
.register-left {
  position: relative;
  flex: 1.3;
  /* 【注意】复用登录页的背景图 */
  background-image: url("/binZhou/ld/register-bg-jujube.png");
  background-size: cover;
  background-position: center center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  overflow: hidden;

  .left-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    // 使用稍深一点的遮罩，区别于登录页
    background: linear-gradient(to right, rgba(10, 28, 22, 0.9), rgba(44, 94, 79, 0.6));
    z-index: 1;
  }

  .left-content {
    position: relative;
    z-index: 2;
    padding: 80px;
    max-width: 600px;

    .platform-title {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 15px;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    .platform-subtitle {
      font-size: 18px;
      margin-bottom: 40px;
      opacity: 0.9;
      font-weight: 400;
      letter-spacing: 1px;
    }

    .intro-text {
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 30px;
      font-size: 15px;
      line-height: 1.8;
      
      p { margin-bottom: 15px; font-weight: 500; }
      
      ul {
        list-style: none;
        padding: 0;
        li {
          position: relative;
          padding-left: 20px;
          margin-bottom: 10px;
          opacity: 0.85;
          &:before {
            content: "•";
            color: #42b983; /* 点缀一点亮绿 */
            position: absolute;
            left: 0;
            font-size: 20px;
            line-height: 18px;
          }
        }
      }
    }
  }
}

/* --- 右侧区域 --- */
.register-right {
  flex: 1;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 40px;
  box-shadow: -5px 0 20px rgba(0,0,0,0.05);

  .register-form-wrapper {
    width: 100%;
    max-width: 400px;
  }

  .form-title {
    font-size: 26px;
    color: $text-main;
    margin-bottom: 10px;
    font-weight: 600;
    text-align: center;
  }

  .form-subtitle {
    color: $text-sub;
    margin-bottom: 30px;
    text-align: center;
    font-size: 14px;
  }
}

/* 表单样式定制 */
.register-form {
  :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px $border-color inset !important;
    border-radius: 4px;
    padding-left: 10px;
    transition: all 0.3s;
    height: 46px;
    
    &.is-focus {
       box-shadow: 0 0 0 1px $theme-primary inset !important;
    }

    .el-input__icon {
      color: $text-sub;
    }
  }
}

.code-flex {
  display: flex;
  align-items: center;
  width: 100%;
}

.register-code {
  height: 46px;
  flex-shrink: 0;
  img {
    height: 100%;
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid $border-color;
    vertical-align: middle;
  }
}

/* 注册按钮定制 */
.register-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  background-color: $theme-primary;
  transition: all 0.3s;
  letter-spacing: 2px;
  
  &:hover {
    background-color: $theme-dark;
  }
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: $text-sub;
  font-size: 14px;
  .link-type {
    color: $theme-primary;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
}

/* 底部版权 */
.register-footer {
  position: absolute;
  bottom: 25px;
  width: 100%;
  text-align: center;
  color: $text-sub;
  font-size: 13px;
  font-family: Arial, sans-serif;
}

/* 响应式处理 */
@media (max-width: 768px) {
  .register-container {
    flex-direction: column;
  }
  .register-left {
    flex: 0 0 200px;
    .left-content {
       padding: 30px;
       text-align: center;
       .platform-title { font-size: 24px; margin-bottom: 5px; }
       .platform-subtitle { font-size: 14px; margin-bottom: 10px;}
       .intro-text { display: none; }
    }
  }
  .register-right {
    flex: 1;
    padding: 30px 20px;
  }
  .register-footer {
    position: relative;
    bottom: auto;
    margin-top: 30px;
  }
}
</style>

<style>
/* 全局样式覆盖，为了让Element的弹窗按钮也变色 */
.register-success-btn {
  background-color: #2c5e4f !important;
  border-color: #2c5e4f !important;
}
.register-success-btn:hover {
  background-color: #1a3a32 !important;
  border-color: #1a3a32 !important;
}
</style>