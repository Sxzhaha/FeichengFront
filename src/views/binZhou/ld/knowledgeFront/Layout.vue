<template>
  <div class="wiki-layout-wrapper">
    <el-menu :default-active="activeIndex" class="custom-menu" mode="horizontal" router>
      <el-menu-item index="/ld/cropVariety">品种</el-menu-item>
      <el-menu-item index="/ld/cropGraph">知识检索</el-menu-item>
      <el-menu-item index="/ld/featureWiki">病虫害百科</el-menu-item>
    </el-menu>
    <div class="layout-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const activeIndex = computed(() => {
  if (route.path.startsWith('/ld/cropVariety') || route.path.startsWith('/ld/varietyDetail')) {
    return '/ld/cropVariety';
  }
  return route.path;
})
</script>

<style scoped>
.wiki-layout-wrapper {
  width: 100%;
  min-height: 100vh;
  background: #f8fbf7;
}

.wiki-layout-wrapper .custom-menu {
  border-bottom: 1px solid #e0e0e0;
  padding: 0 30px;
  font-size: 16px;
  background-color: #ffffff;
}

.layout-content {
  width: 100%;
}
</style>
