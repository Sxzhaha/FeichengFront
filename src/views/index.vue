<template>
  <div class="admin-home">
    <section class="welcome-panel">
      <div class="welcome-mark">Welcome</div>
      <h1>欢迎使用后台管理系统</h1>
      <p>祝您工作顺利。</p>
    </section>
  </div>
</template>

<script setup name="Index">
</script>

<style scoped lang="scss">
.admin-home {
  min-height: calc(100vh - 84px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 18% 16%, rgba(50, 183, 112, 0.1), transparent 28%),
    linear-gradient(135deg, #f7fbf8 0%, #eef8f0 100%);
}

.welcome-panel {
  width: min(680px, 100%);
  padding: 46px 40px;
  text-align: center;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(71, 156, 99, 0.18);
  border-radius: 8px;
  box-shadow: 0 18px 42px rgba(34, 93, 52, 0.12);
}

.welcome-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 14px;
  margin-bottom: 18px;
  color: #247545;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  background: linear-gradient(135deg, rgba(218, 244, 225, 0.95), rgba(238, 249, 233, 0.95));
  border: 1px solid rgba(71, 156, 99, 0.18);
  border-radius: 999px;
}

h1 {
  margin: 0;
  color: #173c25;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0;
}

p {
  margin: 12px 0 0;
  color: #5d7b66;
  font-size: 15px;
}
</style>
