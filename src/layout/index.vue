<template>
  <div :class="classObj" class="app-wrapper" :style="{ '--current-color': theme, '--current-color-light': theme + '1a', '--current-color-dark-bg': theme + '33' }">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside"/>
    <sidebar v-if="!sidebar.hide" class="sidebar-container" />
    <div :class="{ hasTagsView: needTagsView, sidebarHide: sidebar.hide }" class="main-container">
      <div :class="{ 'fixed-header': fixedHeader }">
        <navbar @setLayout="setLayout" />
        <tags-view v-if="needTagsView" />
      </div>
      <app-main />
      <settings ref="settingRef" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { useWindowSize } from '@vueuse/core'
import Sidebar from './components/Sidebar/index.vue'
import { AppMain, Navbar, Settings, TagsView } from './components'
import useAppStore from '@/store/modules/app'
import useSettingsStore from '@/store/modules/settings'
import { ElNotification } from 'element-plus' // 【新增】引入 Element Plus 的通知组件

const settingsStore = useSettingsStore()
const theme = computed(() => settingsStore.theme)
const sidebar = computed(() => useAppStore().sidebar)
const device = computed(() => useAppStore().device)
const needTagsView = computed(() => settingsStore.tagsView)
const fixedHeader = computed(() => settingsStore.fixedHeader)

const classObj = computed(() => ({
  hideSidebar: !sidebar.value.opened,
  openSidebar: sidebar.value.opened,
  withoutAnimation: sidebar.value.withoutAnimation,
  mobile: device.value === 'mobile'
}))

const { width, height } = useWindowSize()
const WIDTH = 992 // refer to Bootstrap's responsive design

watch(() => device.value, () => {
  if (device.value === 'mobile' && sidebar.value.opened) {
    useAppStore().closeSideBar({ withoutAnimation: false })
  }
})

watchEffect(() => {
  if (width.value - 1 < WIDTH) {
    useAppStore().toggleDevice('mobile')
    useAppStore().closeSideBar({ withoutAnimation: true })
  } else {
    useAppStore().toggleDevice('desktop')
  }
})

function handleClickOutside() {
  useAppStore().closeSideBar({ withoutAnimation: false })
}

const settingRef = ref(null)
function setLayout() {
  settingRef.value.openSetting()
}

// ==================== 以下为 WebSocket 预警实时推送逻辑 ====================

const websock = ref(null)

// 1. 初始化 WebSocket 连接
function initWebSocket() {
  // 如果你本地运行报跨域或连接失败，可以直接先写死后端地址进行测试：
  // const wsUri = "ws://localhost:8080/ws/warning";
  
  // 动态获取地址 (适配 Vite 环境下的环境变量)
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://'
  const host = window.location.host
  // RuoYi-Vue3 Vite 环境一般用 import.meta.env 获取前缀
  const baseApi = import.meta.env.VITE_APP_BASE_API || ''
  const wsUri = protocol + host + baseApi + '/ws/warning'

  websock.value = new WebSocket(wsUri)
  websock.value.onmessage = websocketonmessage
  websock.value.onopen = websocketonopen
  websock.value.onerror = websocketonerror
  websock.value.onclose = websocketclose
}

// 2. 连接成功
function websocketonopen() {
  console.log("🔗 [前端] WebSocket 连接成功！等待接收预警指令...")
}

// 3. 连接异常
function websocketonerror() {
  console.error("❌ [前端] WebSocket 连接发生错误！请检查后端地址是否正确。")
}

// 4. 连接断开
function websocketclose(e) {
  console.log("🔌 [前端] WebSocket 连接断开", e)
}

// 5. 核心：收到后端消息时的回调
function websocketonmessage(e) {
  const msg = e.data
  // 触发 Element Plus 红色警告弹窗
  ElNotification({
    title: '🚨 物联网实时预警通知',
    message: msg,
    type: 'error',
    duration: 0, // 设置为 0，弹窗不会自动消失，强迫管理员手动查看关闭
    position: 'bottom-right'
  })
}

// 6. 生命周期管理
onMounted(() => {
  initWebSocket()
})

onUnmounted(() => {
  if (websock.value) {
    websock.value.close()
  }
})
</script>

<style lang="scss" scoped>
@use "@/assets/styles/mixin.scss" as mix;
@use "@/assets/styles/variables.module.scss" as vars;

.app-wrapper {
  @include mix.clearfix;
  position: relative;
  height: 100%;
  width: 100%;

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
  }
}

.main-container:has(.fixed-header) {
  height: 100vh;
  overflow: hidden;
}

.drawer-bg {
  background: #000;
  opacity: 0.3;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - #{vars.$base-sidebar-width});
  transition: width 0.28s;
}

.hideSidebar .fixed-header {
  width: calc(100% - 54px);
}

.sidebarHide .fixed-header {
  width: 100%;
}

.mobile .fixed-header {
  width: 100%;
}
</style>