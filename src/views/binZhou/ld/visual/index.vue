<template>
  <div class="visual-dashboard-container">
    <!-- Cesium 地图容器 -->
    <div id="cesiumContainer" class="cesium-container">
      <div v-if="mapError" class="map-error-overlay">
        <el-icon class="icon-error"><Warning /></el-icon>
        <span class="error-title">三维地图加载状态</span>
        <span class="error-msg">{{ mapError }}</span>
      </div>
    </div>
    <div class="cesium-overlay"></div>
    <transition name="fade">
      <div v-if="regionInfoVisible" class="region-info-panel">
        <div class="region-info-header">
          <div>
            <span class="region-level">{{ selectedRegionInfo.levelText }}</span>
            <span class="region-name" :title="selectedRegionInfo.name">{{ selectedRegionInfo.name }}</span>
          </div>
          <el-button link class="region-close-btn" @click="regionInfoVisible = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="region-info-body">
          <span class="region-desc-label">说明</span>
          <p :title="selectedRegionInfo.description">{{ selectedRegionInfo.description }}</p>
        </div>
      </div>
    </transition>

    <!-- 顶部导航和控制条 -->
    <header class="dashboard-header">
      <div class="header-shell">
        <span class="header-wing header-wing-left"></span>
        <div class="title-group">
          <span class="main-title">冬枣种植智慧大脑</span>
        </div>
        <span class="header-wing header-wing-right"></span>
      </div>

      <div class="header-right">
        <div class="clock-display">
          <span>{{ currentDateTime }}</span>
        </div>
      </div>
    </header>

    <!-- 主面板布局 -->
    <div class="dashboard-body" v-loading="globalLoading">
      <!-- 独立悬浮导航菜单 -->
      <div class="hover-nav-container">
        <div class="menu-trigger-btn">
          <el-icon class="menu-trigger-icon"><Menu /></el-icon>
        </div>
        <div class="nav-buttons-popover">
          <el-tooltip content="自由漫游" placement="top">
            <el-button 
              class="cyber-nav-btn"
              :class="{ active: !aiChatVisible && !monitorDialogOpen && !reportVisible }"
              circle
              size="small"
              @click="resetCamera"
            >
              <el-icon><Aim /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="实时监控" placement="top">
            <el-button 
              class="cyber-nav-btn"
              :class="{ active: monitorDialogOpen }"
              circle
              size="small"
              @click="openMonitorDialog"
            >
              <el-icon><VideoCamera /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="农事管理" placement="top">
            <el-button class="cyber-nav-btn" circle size="small" @click="openFarmerTask">
              <el-icon><Calendar /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 左侧面板 -->
      <div ref="leftPanelRef" class="side-panel left-panel">
        <!-- 庄园物联与实时天气 (合并版) -->
        <div class="cyber-card">
          <div class="card-header">
            <span class="card-title" style="align-items: center;">
              <el-icon class="icon-accent"><OfficeBuilding /></el-icon>
              <el-select
                v-model="activeParkId"
                placeholder="切换庄园"
                @change="handleParkChange"
                class="cyber-select-mini"
                popper-class="cyber-select-popper"
                style="width: 140px; margin-left: 8px;"
              >
                <el-option
                  v-for="park in parkList"
                  :key="park.parkId"
                  :label="park.parkName"
                  :value="park.parkId"
                />
              </el-select>
            </span>
            <span class="update-time" v-if="weatherInfo.reportTime">更新: {{ weatherInfo.reportTime }}</span>
          </div>
          <div class="card-body iot-weather-merged">
            <!-- 左半部分: 物联状态 -->
            <div class="merged-left">
              <div class="merged-stat-grid">
                <div class="stat-box-mini">
                  <span class="stat-label">设备数</span>
                  <span class="stat-value-mini text-cyan">{{ iotStats.total }}</span>
                </div>
                <div class="stat-box-mini">
                  <span class="stat-label">在线</span>
                  <span class="stat-value-mini text-emerald">{{ iotStats.online }}</span>
                </div>
                <div class="stat-box-mini">
                  <span class="stat-label">离线</span>
                  <span class="stat-value-mini text-amber">{{ iotStats.offline }}</span>
                </div>
              </div>
              <div class="progress-label-mini">
                <span>在线率</span>
                <span>{{ iotStats.onlineRate }}%</span>
              </div>
              <el-progress
                :percentage="iotStats.onlineRate"
                :stroke-width="6"
                :show-text="false"
                class="cyber-progress-mini"
                color="linear-gradient(90deg, #10b981 0%, #34d399 100%)"
              />
              <div class="device-type-overview">
                <div class="device-type-overview-header">
                  <span>设备类型占比</span>
                  <span>{{ deviceTypeStats.length }}类设备</span>
                </div>
                <div class="device-type-overview-body">
                  <div ref="deviceTypeChartRef" class="device-type-chart"></div>
                  <div class="device-type-list">
                    <div v-for="item in deviceTypeStats" :key="item.key" class="device-type-row">
                      <div class="device-type-row-main">
                        <span class="device-type-name" :title="item.name">{{ item.name }}</span>
                        <b>{{ item.total }}</b>
                      </div>
                      <div class="device-type-row-sub">
                        <span>在线 {{ item.online }}</span>
                        <span>在线率 {{ item.onlineRate }}%</span>
                      </div>
                    </div>
                    <div v-if="deviceTypeStats.length === 0" class="device-type-empty">暂无设备类型数据</div>
                    <div class="device-type-list-spacer" aria-hidden="true"></div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 分割线 -->
            <div class="merged-divider"></div>
            <!-- 右半部分: 实时天气 -->
            <div class="merged-right">
              <div class="merged-weather-main">
                <i v-if="weatherInfo.weatherCode" :class="'qi-' + weatherInfo.weatherCode" class="weather-code-icon"></i>
                <div class="weather-main-text">
                  <span class="temp-merged">{{ weatherInfo.temperature }}°C</span>
                  <span class="weather-text-merged" :title="weatherInfo.weatherText">{{ weatherInfo.weatherText }}</span>
                </div>
              </div>
            <div class="merged-weather-details">
                <div class="weather-item-mini">
                  <span class="label">湿度:</span>
                  <span class="val">{{ weatherInfo.humidity }}%</span>
                </div>
                <div class="weather-item-mini">
                  <span class="label">风向:</span>
                  <span class="val">{{ weatherInfo.windDirection }}</span>
                </div>
                <div class="weather-item-mini">
                  <span class="label">风力:</span>
                  <span class="val">{{ weatherInfo.windScale }}级</span>
                </div>
                <div class="weather-item-mini">
                  <span class="label">降水:</span>
                  <span class="val">{{ weatherInfo.precipitation }}mm</span>
                </div>
              </div>
              <div class="forecast-mini-list" v-if="forecastList.length > 0">
                <div
                  v-for="item in forecastList"
                  :key="item.id || item.forecastDate"
                  class="forecast-mini-item"
                >
                  <span class="forecast-date">{{ formatForecastDate(item.forecastDate) }}</span>
                  <span class="forecast-weather-line">
                    <i v-if="getForecastIcon(item)" :class="'qi-' + getForecastIcon(item)" class="forecast-icon"></i>
                    <strong class="forecast-text">{{ item.weatherTextDay || item.weatherText || '--' }}</strong>
                  </span>
                  <small class="forecast-temp">{{ item.tempMin ?? '--' }}° / {{ item.tempMax ?? '--' }}°</small>
                </div>
              </div>
            </div>
          </div>
        </div>



        <!-- 虫情趋势图表 -->
        <div class="cyber-card pest-trend-card">
          <div class="card-header">
            <span class="card-title">
              <el-icon class="icon-accent"><TrendCharts /></el-icon>虫情测报
            </span>
          </div>
          <div class="card-body pest-trend-body">
            <div id="trendChartContainer" class="trend-chart-container"></div>
          </div>
        </div>


        <!-- 智能感知环境指标趋势 -->
        <div class="cyber-card perception-card">
          <div class="card-header">
            <span class="card-title">
              <el-icon class="icon-accent"><DataAnalysis /></el-icon>智能感知
            </span>
          </div>
          <div class="card-body perception-card-body" v-loading="perceptionLoading">
            <div class="perception-selectors">
              <el-select v-model="perceptionAreaId" size="small" placeholder="地块" filterable @change="handlePerceptionAreaChange">
                <el-option v-for="area in areaList" :key="area.areaId" :label="area.areaName" :value="area.areaId" />
              </el-select>
              <el-select v-model="perceptionLocationId" size="small" placeholder="位置" filterable @change="handlePerceptionLocationChange">
                <el-option v-for="location in perceptionLocationOptions" :key="location.locationId" :label="location.locationName" :value="location.locationId" />
              </el-select>
              <el-select v-model="perceptionDeviceSn" size="small" placeholder="传感器" filterable @change="handlePerceptionDeviceChange">
                <el-option
                  v-for="device in perceptionDeviceOptions"
                  :key="device.deviceSn"
                  :label="device.deviceName || device.deviceSn"
                  :value="device.deviceSn"
                />
              </el-select>
            </div>
            <div ref="perceptionChartRef" class="perception-trend-chart"></div>
          </div>
        </div>
      </div>

      <!-- 右侧贴边智能顾问入口 -->
      <el-tooltip v-if="!aiChatVisible" content="智能顾问" placement="left">
        <button class="ai-advisor-launcher" type="button" aria-label="打开智能顾问" @click="toggleAiChat">
          <el-icon><ChatDotRound /></el-icon>
        </button>
      </el-tooltip>

      <!-- AI 种植智能问答挂件 -->
      <transition name="portal-chat">
        <div v-if="aiChatVisible" class="ai-chat-panel cyber-card" :style="aiChatPanelStyle">
          <div class="card-header chat-panel-header" @mousedown="startAiChatDrag">
            <span class="card-title">
              <el-icon class="icon-accent"><ChatDotRound /></el-icon>AI 种植问答顾问
            </span>
            <el-button link type="danger" @mousedown.stop @click="aiChatVisible = false" style="padding: 0;">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          
          <div class="chat-panel-body">
            <el-scrollbar ref="chatScrollbarRef" class="chat-scrollbar">
              <div class="chat-message-list">
                <div class="chat-msg ai-msg">
                  <div class="avatar-wrap">AI</div>
                  <div class="content-box">
                    您好！我是您的智能种植助手。有关枣树水肥管理、病虫害防治、生长状态等问题，您都可以随时问我！
                  </div>
                </div>
                
                <div 
                  v-for="(msg, idx) in aiMessages" 
                  :key="idx" 
                  class="chat-msg"
                  :class="msg.role === 'user' ? 'user-msg' : 'ai-msg'"
                >
                  <div class="avatar-wrap">{{ msg.role === 'user' ? '用户' : 'AI' }}</div>
                  <div class="content-box">
                    <span v-if="msg.isThinking" class="thinking-text">AI 正在思考并接入知识图谱...</span>
                    <span v-else>{{ msg.content }}</span>
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>
          
          <div class="chat-panel-footer">
            <el-input
              v-model="aiInputText"
              placeholder="提问枣树栽培或病害问题..."
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



      <!-- 右侧面板 -->
      <div ref="rightPanelRef" class="side-panel right-panel">
        <!-- 虫情识别结果 -->
        <div class="cyber-card pest-recognition-card">
          <div class="card-header">
            <span class="card-title">
              <el-icon class="icon-accent"><View /></el-icon>病虫识别
            </span>
            <div class="warn-tab-group pest-view-tabs">
              <button class="warn-tab-btn" :class="{ active: activePestView === 'report' }" @click="handlePestViewChange('report')">报表</button>
              <button class="warn-tab-btn" :class="{ active: activePestView === 'list' }" @click="handlePestViewChange('list')">列表</button>
            </div>
          </div>
          <div class="card-body pest-card-body">
            <div v-show="activePestView === 'list'" class="pest-list-wrapper">
              <div class="pest-item" v-for="item in pestList" :key="item.uniqueKey" @click="showPestDetail(item)">
                <div class="pest-thumbnail-wrap">
                  <el-image v-if="item.imageUrl" :src="normalizeImageUrl(item.imageUrl)" fit="cover" class="pest-img" loading="lazy" />
                  <div v-else class="img-placeholder"><el-icon><Picture /></el-icon></div>
                </div>
                <div class="pest-info">
                  <div class="pest-title-row">
                    <span class="pest-name">{{ item.name }}</span>
                    <el-tag :type="getWarningTag(item.warningLevel)" size="small" effect="dark">{{ item.warningLevel || '无' }}</el-tag>
                  </div>
                  <div class="pest-meta-row">
                    <span>作物: {{ item.crop || '--' }}</span>
                    <span>诊断类型: <b class="text-emerald">病害</b></span>
                  </div>
                  <div class="pest-meta-row">
                    <span>置信度: {{ toPercent(item.confidence) }}%</span>
                    <span>地块: {{ getPestAreaName(item) }}</span>
                  </div>
                  <div class="pest-meta-row">
                    <span>识别时间: {{ parseTime(item.createTime, '{m}-{d} {h}:{i}') || '--' }}</span>
                  </div>
                </div>
              </div>
              <el-empty v-if="pestList.length === 0" description="暂无病虫害识别记录" :image-size="60" />
            </div>
            <div v-show="activePestView === 'report'" ref="diseaseTrendChartRef" class="disease-trend-chart"></div>
          </div>
        </div>


        <!-- 庄园智能巡检抓拍 -->
        <div class="cyber-card phenology-monitor-card">
          <div class="card-header">
            <span class="card-title">
              <el-icon class="icon-accent"><Picture /></el-icon>物候监测
            </span>
            <div class="warn-tab-group phenology-view-tabs">
              <button class="warn-tab-btn" :class="{ active: activePhenologyView === 'report' }" @click="handlePhenologyViewChange('report')">报表</button>
              <button class="warn-tab-btn" :class="{ active: activePhenologyView === 'list' }" @click="handlePhenologyViewChange('list')">列表</button>
            </div>
          </div>
          <div class="card-body phenology-card-body">
            <div v-show="activePhenologyView === 'list'" class="phenology-list-wrapper">
              <div v-for="item in phenologyList" :key="item.uniqueKey" class="phenology-list-item">
                <div class="phenology-thumbnail-wrap">
                  <el-image
                    v-if="item.imageUrl"
                    :src="normalizeImageUrl(item.imageUrl)"
                    fit="cover"
                    class="phenology-img"
                    :preview-src-list="[normalizeImageUrl(item.imageUrl)]"
                    preview-teleported
                    loading="lazy"
                  />
                  <div v-else class="img-placeholder"><el-icon><Picture /></el-icon></div>
                </div>
                <div class="phenology-info">
                  <div class="phenology-title-row">
                    <span class="phenology-name">{{ item.name }}</span>
                    <span class="phenology-crop">{{ item.crop || '冬枣' }}</span>
                  </div>
                  <div class="phenology-description" :title="item.description || '暂无物候期说明'">
                    {{ item.description || '暂无物候期说明' }}
                  </div>
                  <div class="phenology-meta-row">
                    <span>地块: {{ getPhenologyAreaName(item) }}</span>
                    <span>{{ parseTime(item.createTime, '{m}-{d} {h}:{i}') || '--' }}</span>
                  </div>
                </div>
              </div>
              <el-empty v-if="phenologyList.length === 0" description="暂无物候期识别记录" :image-size="50" />
            </div>
            <div v-show="activePhenologyView === 'report'" ref="phenologyTrendChartRef" class="phenology-trend-chart"></div>
          </div>
        </div>

        <!-- 庄园物联网及天气预警 -->
        <div class="cyber-card decision-card">
          <div class="card-header alert-card-header">
            <span class="card-title">
              <el-icon class="icon-accent"><Warning /></el-icon>智能决策
            </span>
            <div class="warn-tab-group">
              <button class="warn-tab-btn" :class="{ active: activeWarnTab === 'report' }" @click="handleWarnTabChange('report')">
                报表
              </button>
              <button class="warn-tab-btn" :class="{ active: activeWarnTab === 'iot' }" @click="handleWarnTabChange('iot')">
                传感器预警
                <span class="warn-count-dot" v-if="iotAlertReportList.length > 0">{{ iotAlertReportList.length }}</span>
              </button>
              <button class="warn-tab-btn" :class="{ active: activeWarnTab === 'weather' }" @click="handleWarnTabChange('weather')">
                天气预警
                <span class="warn-count-dot" v-if="weatherAlertReportList.length > 0">{{ weatherAlertReportList.length }}</span>
              </button>
            </div>
          </div>
          <div class="card-body alert-list-wrapper decision-card-body">
            <div v-show="activeWarnTab === 'report'" ref="decisionAlertChartRef" class="decision-alert-chart"></div>
            <div v-if="activeWarnTab === 'iot'">
              <transition-group name="list" tag="div" class="alert-list" v-if="iotAlertList.length > 0">
                <div
                  v-for="alert in iotAlertList"
                  :key="alert.uniqueKey"
                  class="alert-item"
                  :class="`level-${alert.levelCode}`"
                >
                  <div class="alert-header-row">
                    <span class="alert-title" :title="alert.title">{{ alert.title }}</span>
                    <span class="alert-time">{{ alert.time }}</span>
                  </div>
                  <div class="alert-meta-row">
                    <span>{{ alert.deviceName }}</span>
                    <span>{{ alert.productName }}</span>
                  </div>
                  <div class="alert-field-grid" v-if="alert.fields.length > 0">
                    <span v-for="field in alert.fields" :key="field.key" class="alert-field-chip" :title="`${field.label}: ${field.value}`">
                      {{ field.label }}：{{ field.value }}
                    </span>
                  </div>
                  <p class="alert-content" :title="alert.content">{{ alert.content }}</p>
                  <div class="alert-footer-row" v-if="alert.advice">
                    <span class="advice-label">建议</span>
                    <p class="advice-content" :title="alert.advice">{{ alert.advice }}</p>
                  </div>
                </div>
              </transition-group>
              <div v-else class="flex-center no-alert">
                <el-icon class="icon-shield"><CircleCheck /></el-icon>
                <span>当前庄园无异常事件</span>
              </div>
            </div>

            <div v-else-if="activeWarnTab === 'weather'">
              <transition-group name="list" tag="div" class="alert-list" v-if="weatherAlertList.length > 0">
                <div
                  v-for="alert in weatherAlertList"
                  :key="alert.uniqueKey"
                  class="alert-item"
                  :class="`level-${alert.levelCode}`"
                >
                  <div class="alert-header-row">
                    <span class="alert-title" :title="alert.title">{{ alert.title }}</span>
                    <span class="alert-time">{{ alert.time }}</span>
                  </div>
                  <div class="alert-meta-row">
                    <span>{{ alert.levelText }}</span>
                    <span>{{ alert.parkName }}</span>
                  </div>
                  <p class="alert-content" :title="alert.content">{{ alert.content }}</p>
                  <div class="alert-footer-row" v-if="alert.advice">
                    <span class="advice-label">建议</span>
                    <p class="advice-content" :title="alert.advice">{{ alert.advice }}</p>
                  </div>
                </div>
              </transition-group>
              <div v-else class="flex-center no-alert">
                <el-icon class="icon-shield"><CircleCheck /></el-icon>
                <span>当前庄园无极端天气预警</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 病虫害详情 Dialog -->
    <el-dialog
      title="AI 病虫害智能诊断分析"
      v-model="pestDialogVisible"
      width="820px"
      append-to-body
      class="cyber-dialog"
    >
      <div class="pest-detail-dialog-body" v-if="selectedPest">
        <!-- 左侧：图像分析区域 -->
        <div class="pest-media-box">
          <div class="media-title">检测画面分析</div>
          <div class="pest-image-viewport">
            <el-image
              v-if="selectedPestImageUrl"
              :src="selectedPestImageUrl"
              fit="contain"
              class="pest-main-image"
              :preview-src-list="[selectedPestImageUrl]"
              preview-teleported
              @error="handlePestDetailImageError"
            />
            <el-empty v-else description="暂无图像数据" :image-size="80" class="dialog-empty" />
            <!-- 科幻扫描激光线线 -->
            <div class="laser-scanner" v-if="selectedPestImageUrl"></div>
            <!-- 角隅科技装饰 -->
            <div class="corner-decor tl"></div>
            <div class="corner-decor tr"></div>
            <div class="corner-decor bl"></div>
            <div class="corner-decor br"></div>
          </div>
        </div>

        <!-- 右侧：AI 识别指标报告 -->
        <div class="pest-report-box">
          <div class="report-header">
            <div class="pest-main-name">
              <span class="name-text">{{ selectedPest.pestName || selectedPest.diseaseName }}</span>
              <span class="confidence-tag">AI 置信度 {{ toPercent(selectedPest.pestConfidence || selectedPest.diseaseConfidence) }}%</span>
            </div>
            <div class="alert-status-badge" :class="`level-${selectedPest.warningLevel}`">
              <span class="pulse-dot"></span>
              <span>预警级别：{{ selectedPest.warningLevel || '无' }}</span>
            </div>
          </div>

          <div class="report-metrics-grid">
            <div class="metric-item">
              <div class="metric-icon"><el-icon><OfficeBuilding /></el-icon></div>
              <div class="metric-info">
                <span class="m-label">寄生作物</span>
                <span class="m-value">{{ selectedPest.pestCrop || selectedPest.diseaseCrop || '--' }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">
                <el-icon v-if="selectedPest.pestName"><Warning /></el-icon>
                <el-icon v-else><View /></el-icon>
              </div>
              <div class="metric-info">
                <span class="m-label">{{ selectedPest.pestName ? '危害数量' : '诊断结论' }}</span>
                <span class="m-value">
                  <template v-if="selectedPest.pestName">
                    {{ selectedPest.pestCount }} 头 <small>(总虫体 {{ selectedPest.pestTotalCount }} 头)</small>
                  </template>
                  <template v-else>
                    {{ selectedPest.diseaseResult || selectedPest.diseaseDesc || '--' }}
                  </template>
                </span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon"><el-icon><Calendar /></el-icon></div>
              <div class="metric-info">
                <span class="m-label">诊断时间</span>
                <span class="m-value monospace">{{ selectedPest.createTime }}</span>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon"><el-icon><Aim /></el-icon></div>
              <div class="metric-info">
                <span class="m-label">识别编号</span>
                <span class="m-value monospace">{{ selectedPest.recordNo }}</span>
              </div>
            </div>
          </div>

          <!-- 防治建议面板 -->
          <div class="advice-panel">
            <div class="advice-header">
              <el-icon><CircleCheck /></el-icon>
              <span>AI 防治处置建议</span>
            </div>
            <div class="advice-content-text">
              {{ selectedPest.pestAdvice || selectedPest.diseaseAdvice || '暂无详细防治建议' }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 实时视频监控弹窗 -->
    <el-dialog
      v-model="monitorDialogOpen"
      title="园区实时监控中心"
      width="850px"
      append-to-body
      destroy-on-close
      class="cyber-dialog"
      @closed="handleMonitorDialogClosed"
    >
      <div class="monitor-dialog-content">
        <!-- 左侧摄像头列表 -->
        <div class="monitor-sidebar">
          <div class="sidebar-title">摄像头设备 ({{ cameras.length }})</div>
          <div class="monitor-list-wrapper">
            <div 
              v-for="cam in cameras" 
              :key="cam.deviceId" 
              class="monitor-list-item"
              :class="{ active: activeDialogCameraSn === cam.deviceSn }"
              @click="switchDialogCamera(cam)"
            >
              <div class="status-indicator" :class="isDeviceOnline(cam.status) ? 'online' : 'offline'"></div>
              <span class="camera-name" :title="cam.deviceName">{{ cam.deviceName }}</span>
            </div>
            <el-empty 
              v-if="cameras.length === 0" 
              description="当前园区无摄像头设备" 
              :image-size="60"
              class="cyber-empty"
            />
          </div>
        </div>
        
        <!-- 右侧视频流播放器 -->
        <div class="monitor-viewport-panel">
          <div class="viewport-header" v-if="activeDialogCameraName">
            <span class="viewport-title">{{ activeDialogCameraName }}</span>
            <el-tag size="small" type="success" effect="dark">直播中</el-tag>
          </div>
          <div class="viewport-body" v-loading="dialogVideoLoading">
            <div id="ys7-dialog-player-container" class="ys7-dialog-player"></div>
            <div v-if="!activeDialogCameraSn" class="player-empty-state">
              <el-icon class="icon-camera-huge"><VideoCamera /></el-icon>
              <span>请选择在线摄像头进行浏览</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 物联设备智能感知报表弹窗 -->
    <el-dialog
      v-model="reportVisible"
      title="物联设备智能感知报表"
      width="920px"
      append-to-body
      destroy-on-close
      class="cyber-dialog"
      @opened="handleReportOpened"
      @closed="handleReportClosed"
    >
      <div v-loading="reportLoading" class="cyber-report-content" style="padding: 10px; max-height: 70vh; overflow-y: auto;">
        
        <!-- Area Selector Tabs -->
        <div class="report-area-filter" style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 13px; color: #94a3b8; font-weight: bold;">选择区域:</div>
          <el-radio-group v-model="activeAreaId" size="small" @change="handleAreaChange">
            <el-radio-button :value="null">全部区域</el-radio-button>
            <el-radio-button v-for="area in areaList" :key="area.areaId" :value="area.areaId">
              {{ area.areaName }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- Global Date Filter -->
        <div v-if="Object.keys(reportData).length > 0" class="report-date-filter">
          <span style="font-size: 13px; color: #047857; font-weight: bold;">历史时段检索:</span>
          <el-date-picker
            v-model="reportDateRange"
            value-format="YYYY-MM-DD"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            size="small"
            style="width: 220px;"
            class="cyber-date-picker"
            @change="handleReportOpened"
          ></el-date-picker>
        </div>

        <div v-if="Object.keys(reportData).length === 0" style="padding: 60px 0; text-align: center;">
          <el-empty description="当前区域下暂无可监测的物联网数值设备" />
        </div>
        
        <div v-else class="report-device-list" style="display: flex; flex-direction: column; gap: 16px;">
          <div 
            v-for="(devData, sn) in reportData" 
            :key="sn" 
            class="cyber-card report-device-card"
          >
            <div class="card-header report-device-header">
              <span class="card-title report-device-title">
                <el-icon class="icon-accent"><Opportunity /></el-icon>
                {{ devData.deviceName }}
                <span class="report-device-sn">(SN: {{ sn }})</span>
              </span>
              <el-tag :type="isDeviceOnline(devData.status) ? 'success' : 'danger'" size="small">
                {{ isDeviceOnline(devData.status) ? '在线' : '离线' }}
              </el-tag>
            </div>
            
            <div class="card-body" v-loading="devData.loading" style="padding: 15px;">
              <div v-if="devData.numericModels.length === 0" style="text-align: center; color: #64748b; font-size: 12px; padding: 10px;">
                (该设备暂无数值型属性配置)
              </div>
              <div v-else>
                <!-- Field switcher -->
                <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 12px; color: #1e293b;">监测指标:</span>
                  <el-radio-group v-model="devData.currentKey" size="small" @change="(val) => handleDevicePropertyChange(sn, val)">
                    <el-radio-button v-for="item in devData.numericModels" :key="item.identifier" :value="item.identifier">
                      {{ item.modelName }}
                    </el-radio-button>
                  </el-radio-group>
                </div>

                <el-row :gutter="15" align="middle">
                  <el-col :span="18">
                    <div :ref="el => setChartRef(el, sn)" style="height: 180px; width: 100%;"></div>
                  </el-col>
                  <el-col :span="6">
                    <div style="border-left: 1px solid rgba(4, 120, 87, 0.25); padding-left: 15px; display: flex; flex-direction: column; gap: 8px;">
                      <div>
                        <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">最新数值</div>
                        <div style="font-size: 20px; font-weight: bold; color: #047857; font-family: monospace;">
                          {{ devData.latestValue }} <span style="font-size: 11px; font-weight: normal; color: #475569; margin-left: 2px;">{{ devData.currentUnit }}</span>
                        </div>
                      </div>
                      
                      <div style="border-top: 1px solid rgba(4, 120, 87, 0.25); padding-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #1e293b;">
                        <div style="display: flex; justify-content: space-between;">
                          <span>日均值:</span>
                          <span style="font-family: monospace; font-weight: bold; color: #0f172a;">{{ devData.avgVal }}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span>最大值:</span>
                          <span style="font-family: monospace; font-weight: bold; color: #dc2626;">{{ devData.maxVal }}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span>最小值:</span>
                          <span style="font-family: monospace; font-weight: bold; color: #b45309;">{{ devData.minVal }}</span>
                        </div>
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </div>
          </div>
        </div>

      </div>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import EZUIKit from 'ezuikit-js';
import { getUserProfile } from "@/api/system/user";
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';
import {
  ArrowLeft, OfficeBuilding, Sunny, Warning, View, TrendCharts, Calendar,
  Aim, RefreshRight, Picture, CircleCheck, ChatDotRound, Close, Menu
} from '@element-plus/icons-vue';
import { listPark } from "@/api/binZhou/ld/iot/park";
import { listAreaByParkId } from "@/api/binZhou/ld/iot/area";
import { listLocationByAreaId } from "@/api/binZhou/ld/iot/location";
import { listWeatherLive } from "@/api/binZhou/ld/iot/weatherLive";
import { listWeatherForecast } from "@/api/binZhou/ld/iot/weatherForecast";
import { listWarnRecord } from "@/api/binZhou/ld/iot/warnRecord";
import { listWeatherWarn } from "@/api/binZhou/ld/iot/weatherWarn";
import { listPest } from '@/api/binZhou/xwq/pest';
import { listDisease } from '@/api/binZhou/xwq/disease';
import { listPhenology } from '@/api/binZhou/xwq/phenology';
import { listRecord as listAiRecord } from '@/api/binZhou/xwq/record';
import { listImage } from '@/api/binZhou/xwq/image';
import { listDevice, listDeviceLog } from "@/api/binZhou/ld/iot/device";
import { listProduct } from "@/api/binZhou/ld/iot/product";
import { listModel } from "@/api/binZhou/ld/iot/model";
import { parseTime } from '@/utils/ruoyi';
import useUserStore from '@/store/modules/user';
import { getToken } from '@/utils/auth';
import 'qweather-icons/font/qweather-icons.css';

const router = useRouter();
const userStore = useUserStore();

// ========================
// 状态定义
// ========================
const globalLoading = ref(false);
const activeParkId = ref(null);
const currentDateTime = ref('');
const timerId = ref(null);
const leftPanelRef = ref(null);
const rightPanelRef = ref(null);
let panelRowResizeObserver = null;

const parkList = ref([]);
const areaList = ref([]);
const locationList = ref([]);
const deviceList = ref([]);

const reportVisible = ref(false);
const reportLoading = ref(false);
const reportData = ref({});
const activeAreaId = ref(null);
const reportDateRange = ref([]);

const chartRefs = {};
const chartInstances = {};

function setChartRef(el, sn) {
  if (el) {
    chartRefs[sn] = el;
  }
}

const isAdmin = ref(false);
const currentUserId = ref(null);
const currentUsername = ref('');
const currentUserParkId = ref(null);

// 监控弹窗及播放器相关变量
const monitorDialogOpen = ref(false);
const activeDialogCameraSn = ref('');
const activeDialogCameraName = ref('');
const dialogVideoLoading = ref(false);
let ys7DialogPlayerInstance = null;
let latestDialogVideoSn = '';

const ys7Config = {
  appKey: '1e1a8eacfdbe4f6597c7d516085f0f7b',
  appSecret: 'e2a6b0c19c8cdcb671cb532e71a665c9',
  channelNo: 1
};

// 筛选出的摄像头设备
const cameras = computed(() => {
  return deviceList.value.filter(d => d.productId == 4 || String(d.productId) === '4');
});

// 在线摄像头设备
const onlineCameras = computed(() => {
  return cameras.value.filter(cam => isDeviceOnline(cam.status));
});

// 打开视频监控弹窗并播放首个摄像头
const openMonitorDialog = () => {
  monitorDialogOpen.value = true;
  if (cameras.value.length > 0) {
    // 优先播放首个在线摄像头，若均不在线则播放首个设备
    const defaultCam = onlineCameras.value.length > 0 ? onlineCameras.value[0] : cameras.value[0];
    activeDialogCameraSn.value = defaultCam.deviceSn;
    activeDialogCameraName.value = defaultCam.deviceName;
    nextTick(() => {
      initDialogVideoPlayer(defaultCam.deviceSn);
    });
  } else {
    activeDialogCameraSn.value = '';
    activeDialogCameraName.value = '';
  }
};

// 切换播放摄像头
const switchDialogCamera = (cam) => {
  if (activeDialogCameraSn.value === cam.deviceSn) return;
  activeDialogCameraSn.value = cam.deviceSn;
  activeDialogCameraName.value = cam.deviceName;
  initDialogVideoPlayer(cam.deviceSn);
};

// 弹窗内视频播放器加载
async function initDialogVideoPlayer(deviceSn) {
  if (!deviceSn) return;
  latestDialogVideoSn = deviceSn;
  dialogVideoLoading.value = true;
  try {
    const res = await fetch('https://open.ys7.com/api/lapp/token/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `appKey=${ys7Config.appKey}&appSecret=${ys7Config.appSecret}`
    });

    if (latestDialogVideoSn !== deviceSn) return;

    const data = await res.json();
    if (data.code !== '200') {
      dialogVideoLoading.value = false;
      return;
    }
    const token = data.data.accessToken;

    await nextTick();

    setTimeout(() => {
        if (latestDialogVideoSn !== deviceSn) return;

        const container = document.getElementById('ys7-dialog-player-container');
        if (!container) return;

        const realWidth = container.clientWidth || 550;
        const realHeight = container.clientHeight || 360;

        if (ys7DialogPlayerInstance) {
          try {
            if (typeof ys7DialogPlayerInstance.destroy === 'function') {
              ys7DialogPlayerInstance.destroy();
            } else {
              ys7DialogPlayerInstance.stop();
            }
          } catch (e) {
            console.error(e);
          }
          ys7DialogPlayerInstance = null;
        }

        container.innerHTML = '';

        ys7DialogPlayerInstance = new EZUIKit.EZUIKitPlayer({
            id: 'ys7-dialog-player-container',
            accessToken: token,
            url: `ezopen://open.ys7.com/${deviceSn}/${ys7Config.channelNo}.hd.live`,
            template: 'pcLive',
            autoplay: true,
            audio: 1,
            width: realWidth,
            height: realHeight,
            handleError: (err) => {
              console.warn("EZUIKit Dialog Player error intercepted:", err);
            },
            onError: (err) => {
              console.warn("EZUIKit Dialog Player onError intercepted:", err);
            }
        });
        dialogVideoLoading.value = false;
    }, 300);

  } catch (error) {
    if (latestDialogVideoSn === deviceSn) {
      dialogVideoLoading.value = false;
    }
  }
}

// 弹窗关闭回调，释放播放器资源
const handleMonitorDialogClosed = () => {
  latestDialogVideoSn = '';
  if (ys7DialogPlayerInstance) {
    try {
      if (typeof ys7DialogPlayerInstance.destroy === 'function') {
        ys7DialogPlayerInstance.destroy();
      } else {
        ys7DialogPlayerInstance.stop();
      }
    } catch (e) {
      console.error(e);
    }
    ys7DialogPlayerInstance = null;
  }
  const container = document.getElementById('ys7-dialog-player-container');
  if (container) container.innerHTML = '';
};

const handleReportOpened = async () => {
  reportLoading.value = true;
  reportData.value = {};
  
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) {
      try { chartInstances[key].dispose(); } catch(e){}
      delete chartInstances[key];
    }
  });

  let devices = [];
  if (activeAreaId.value) {
    devices = deviceList.value.filter(d => d.areaId == activeAreaId.value);
  } else {
    devices = deviceList.value || [];
  }

  devices = devices.filter(d => d.productId != 4 && d.productId != '4');

  if (devices.length === 0) {
    reportLoading.value = false;
    return;
  }

  if (!reportDateRange.value || reportDateRange.value.length === 0) {
    const end = new Date();
    const start = new Date();
    start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
    const format = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    };
    reportDateRange.value = [format(start), format(end)];
  }

  devices.forEach(device => {
    reportData.value[device.deviceSn] = {
      loading: true,
      deviceName: device.deviceName,
      deviceSn: device.deviceSn,
      productId: device.productId,
      status: device.status,
      numericModels: [],
      currentKey: "",
      latestValue: "-",
      maxVal: "-",
      minVal: "-",
      avgVal: "-",
      currentUnit: "",
      xData: [],
      yData: [],
      logs: []
    };
  });

  const promises = devices.map(async device => {
    try {
      const sn = device.deviceSn;
      if (!device.productId) {
        reportData.value[sn].loading = false;
        return;
      }

      const modelRes = await listModel({ productId: device.productId, pageSize: 100 });
      const numericModels = (modelRes.rows || []).filter(m => ["int", "float"].includes(m.type) && m.isMonitor == 1);
      
      reportData.value[sn].numericModels = numericModels;

      if (numericModels.length > 0) {
        const currentKey = numericModels[0].identifier;
        reportData.value[sn].currentKey = currentKey;

        const queryParams = { deviceSn: sn, pageSize: 100, orderByColumn: "createTime", isAsc: "asc" };
        
        const addDateRange = (params, dateRange) => {
          let search = params;
          search.params = typeof (search.params) === 'object' && search.params !== null && !Array.isArray(search.params) ? search.params : {};
          if (dateRange && dateRange.length === 2) {
            search.params['beginTime'] = dateRange[0].includes(' ') ? dateRange[0] : dateRange[0] + ' 00:00:00';
            search.params['endTime'] = dateRange[1].includes(' ') ? dateRange[1] : dateRange[1] + ' 23:59:59';
          }
          return search;
        };

        const logRes = await listDeviceLog(addDateRange(queryParams, reportDateRange.value));
        const logs = logRes.rows || [];
        reportData.value[sn].logs = logs;

        const xData = [], yData = [];
        const model = numericModels.find(m => m.identifier === currentKey);
        const specsObj = model?.specs ? JSON.parse(model.specs) : {};
        const unit = specsObj.unit || "";

        logs.forEach(log => {
          try {
            const payload = (typeof log.payload === "string") ? JSON.parse(log.payload) : log.payload;
            const val = payload[currentKey];
            if (val != null) {
              xData.push(log.createTime.substring(5, 16));
              yData.push(val);
            }
          } catch(e){}
        });

        reportData.value[sn].currentUnit = unit;
        reportData.value[sn].xData = xData;
        reportData.value[sn].yData = yData;
        reportData.value[sn].latestValue = yData.length > 0 ? yData[yData.length - 1] : "-";

        const numY = yData.map(Number).filter(n => !isNaN(n));
        if (numY.length > 0) {
          reportData.value[sn].maxVal = Math.max(...numY);
          reportData.value[sn].minVal = Math.min(...numY);
          reportData.value[sn].avgVal = (numY.reduce((a, b) => a + b, 0) / numY.length).toFixed(2);
        } else {
          reportData.value[sn].maxVal = "-";
          reportData.value[sn].minVal = "-";
          reportData.value[sn].avgVal = "-";
        }

        await nextTick();
        renderDeviceChart(sn);
      }
    } catch(err) {
      console.error("加载设备报告失败: " + device.deviceSn, err);
    } finally {
      if (reportData.value[device.deviceSn]) {
        reportData.value[device.deviceSn].loading = false;
      }
    }
  });

  await Promise.all(promises);
  reportLoading.value = false;
};

const handleAreaChange = () => {
  handleReportOpened();
};

const handleDevicePropertyChange = (sn, key) => {
  const data = reportData.value[sn];
  if (!data || !data.logs) return;

  const numericModels = data.numericModels;
  const model = numericModels.find(m => m.identifier === key);
  const specsObj = model?.specs ? JSON.parse(model.specs) : {};
  data.currentUnit = specsObj.unit || "";

  const xData = [], yData = [];
  data.logs.forEach(log => {
    try {
      const payload = (typeof log.payload === "string") ? JSON.parse(log.payload) : log.payload;
      const val = payload[key];
      if (val != null) {
        xData.push(log.createTime.substring(5, 16));
        yData.push(val);
      }
    } catch(e){}
  });

  data.xData = xData;
  data.yData = yData;
  data.latestValue = yData.length > 0 ? yData[yData.length - 1] : "-";

  const numY = yData.map(Number).filter(n => !isNaN(n));
  if (numY.length > 0) {
    data.maxVal = Math.max(...numY);
    data.minVal = Math.min(...numY);
    data.avgVal = (numY.reduce((a, b) => a + b, 0) / numY.length).toFixed(2);
  } else {
    data.maxVal = "-";
    data.minVal = "-";
    data.avgVal = "-";
  }

  renderDeviceChart(sn);
};

const renderDeviceChart = (sn) => {
  const data = reportData.value[sn];
  if (!data || !chartRefs[sn]) return;

  if (chartInstances[sn]) {
    try { chartInstances[sn].dispose(); } catch(e){}
  }

  const chart = echarts.init(chartRefs[sn]);
  chartInstances[sn] = chart;

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "rgba(4, 120, 87, 0.3)",
      textStyle: { color: "#0f172a" }
    },
    grid: { top: "15%", left: "5%", right: "5%", bottom: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.xData,
      boundaryGap: false,
      axisLabel: { rotate: 30, fontSize: 9, color: "#334155", interval: "auto", hideOverlap: true },
      axisLine: { lineStyle: { color: "rgba(4, 120, 87, 0.25)" } }
    },
    yAxis: {
      type: "value",
      name: data.currentUnit,
      nameTextStyle: { color: "#334155" },
      axisLabel: { color: "#334155" },
      splitLine: { lineStyle: { color: "rgba(4, 120, 87, 0.1)", type: "dashed" } }
    },
    series: [{
      type: "line",
      data: data.yData,
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      areaStyle: {
        opacity: 0.2,
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#10b981" },
          { offset: 1, color: "rgba(16,185,129,0.01)" }
        ])
      },
      itemStyle: { color: "#10b981" }
    }]
  });
};

const handleReportClosed = () => {
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) {
      try { chartInstances[key].dispose(); } catch(e){}
      delete chartInstances[key];
    }
  });
  reportData.value = {};
};

// 统计信息
const iotStats = reactive({
  total: 0,
  online: 0,
  offline: 0,
  onlineRate: 0
});

const deviceTypeStats = computed(() => {
  const groups = new Map();
  deviceList.value.forEach(device => {
    const key = device?.productName || device?.product_name || String(device?.productId ?? 'unknown');
    const current = groups.get(key) || {
      key,
      name: getDeviceTypeName(device),
      total: 0,
      online: 0,
      offline: 0
    };
    current.name = getDeviceTypeName(device);
    current.total += 1;
    if (isDeviceOnline(device.status)) {
      current.online += 1;
    } else if (isDeviceOffline(device.status)) {
      current.offline += 1;
    }
    groups.set(key, current);
  });
  return Array.from(groups.values())
    .sort((a, b) => b.total - a.total)
    .map(item => ({
      ...item,
      onlineRate: item.total > 0 ? Math.round((item.online / item.total) * 100) : 0
    }));
});

// 天气信息
const weatherInfo = ref({
  temperature: '--',
  humidity: '--',
  windDirection: '--',
  windScale: '--',
  precipitation: '--',
  weatherText: '暂无数据',
  weatherCode: '',
  reportTime: ''
});
const forecastList = ref([]);
const deviceTypeChartRef = ref(null);

// 预警列表
const iotAlertList = ref([]);
const weatherAlertList = ref([]);
const iotAlertReportList = ref([]);
const weatherAlertReportList = ref([]);
const activeWarnTab = ref('report');
const decisionAlertChartRef = ref(null);
const modelList = ref([]);
const productOptions = ref([]);

// 虫害与事
const pestList = ref([]);
const pestTrendList = ref([]);
const diseaseTrendList = ref([]);
const activePestView = ref('report');
const diseaseTrendChartRef = ref(null);
const selectedPest = ref(null);
const selectedPestImageUrl = ref('');
const selectedPestImageCandidates = ref([]);
const pestDialogVisible = ref(false);

const phenologyList = ref([]);
const phenologyTrendList = ref([]);
const activePhenologyView = ref('report');
const phenologyTrendChartRef = ref(null);

const perceptionAreaId = ref(null);
const perceptionLocationId = ref(null);
const perceptionDeviceSn = ref('');
const perceptionModels = ref([]);
const perceptionLogs = ref([]);
const perceptionLoading = ref(false);
const perceptionChartRef = ref(null);
let perceptionRequestSequence = 0;

const perceptionLocationOptions = computed(() => locationList.value.filter(location => (
  String(location.areaId) === String(perceptionAreaId.value)
)));

const perceptionDeviceOptions = computed(() => deviceList.value.filter(device => (
  String(device.locationId) === String(perceptionLocationId.value)
  && device.productId != 4
  && Boolean(device.deviceSn)
)));

const modelNameMap = computed(() => {
  const map = new Map();
  modelList.value.forEach(item => {
    const productKey = item.productId === null || item.productId === undefined ? 'all' : String(item.productId);
    map.set(`${productKey}:${item.identifier}`, item.modelName);
    map.set(`all:${item.identifier}`, item.modelName);
  });
  return map;
});

// ECharts
let trendChart = null;
let deviceTypeChart = null;
let diseaseTrendChart = null;
let phenologyTrendChart = null;
let perceptionChart = null;
let decisionAlertChart = null;

// Cesium
let Cesium = null;
let viewer = null;
let obliqueTileset = null;
let hasFocusedObliqueTileset = false;
let obliqueLoadTimer = null;
let obliqueRefineTimer = null;
let tiandituLabelsTimer = null;
const isRotating = ref(false);
let rotationRemoveCallback = null;
const markersVisible = ref(true);
let areaEntities = [];
let parkEntities = [];
let clickHandler = null;
const mapError = ref('正在载入三维数字地球引擎...');
const regionInfoVisible = ref(false);
const selectedRegionInfo = ref({
  level: '',
  levelText: '',
  name: '',
  description: ''
});

// ========================
// 动态加载 Cesium CDN
// ========================
const loadCesium = () => {
  return new Promise((resolve, reject) => {
    if (window.Cesium) {
      Cesium = window.Cesium;
      resolve(window.Cesium);
      return;
    }

    const appBase = import.meta.env.BASE_URL || '/';
    const localBases = [
      new URL('libs/cesium/', new URL(appBase, window.location.origin)).href,
      new URL('/libs/cesium/', window.location.origin).href
    ].filter((url, index, urls) => urls.indexOf(url) === index);
    const cdnList = [
      ...localBases.map((baseUrl) => ({
        js: `${baseUrl}Cesium.js`,
        css: `${baseUrl}Widgets/widgets.css`,
        baseUrl
      })),
      {
        js: 'https://cdn.bootcdn.net/ajax/libs/cesium/1.109.0/Cesium.js',
        css: 'https://cdn.bootcdn.net/ajax/libs/cesium/1.109.0/Widgets/widgets.min.css',
        baseUrl: 'https://cdn.bootcdn.net/ajax/libs/cesium/1.109.0/'
      },
      {
        js: 'https://cdn.jsdelivr.net/npm/cesium@1.115.0/Build/Cesium/Cesium.js',
        css: 'https://cdn.jsdelivr.net/npm/cesium@1.115.0/Build/Cesium/Widgets/widgets.css',
        baseUrl: 'https://cdn.jsdelivr.net/npm/cesium@1.115.0/Build/Cesium/'
      },
      {
        js: 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js',
        css: 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css',
        baseUrl: 'https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/'
      }
    ];

    let currentIndex = 0;

    const tryNext = () => {
      if (currentIndex >= cdnList.length) {
        reject(new Error('Cesium 所有 CDN 加载失败，请检查您的网络连接'));
        return;
      }

      const cdn = cdnList[currentIndex];
      currentIndex++;

      // 设置 Cesium 资源的基础 URL，防止从 localhost 加载资源产生 404
      window.CESIUM_BASE_URL = cdn.baseUrl;

      // 加载样式
      let link = document.getElementById('cesium-css');
      if (link) {
        link.href = cdn.css;
      } else {
        link = document.createElement('link');
        link.id = 'cesium-css';
        link.rel = 'stylesheet';
        link.href = cdn.css;
        document.head.appendChild(link);
      }

      // 加载脚本
      const script = document.createElement('script');
      script.src = cdn.js;
      script.async = true;

      let timer = setTimeout(() => {
        script.onload = null;
        script.onerror = null;
        console.warn(`Cesium loader (${cdn.js}) timed out. Trying next...`);
        tryNext();
      }, 4000);

      script.onload = () => {
        clearTimeout(timer);
        if (!window.Cesium) {
          console.warn(`Cesium loader (${cdn.js}) returned no Cesium object. Trying next...`);
          tryNext();
          return;
        }
        Cesium = window.Cesium;
        resolve(window.Cesium);
      };
      script.onerror = () => {
        clearTimeout(timer);
        console.warn(`Cesium CDN (${cdn.js}) failed to load. Trying next...`);
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  });
};

// ========================
// 初始化与生命周期
// ========================
onMounted(async () => {
  startClock();
  initChartResize();
  await nextTick();
  initPanelRowSync();

  try {
    globalLoading.value = true;
    await initUserPermissions();
    await fetchProductList();
    await fetchModelList();
    await fetchParks();

    // 默认加载第二个园区；权限范围内不足两个时回退到第一个。
    if (parkList.value.length > 0) {
      activeParkId.value = (parkList.value[1] || parkList.value[0]).parkId;
      await loadParkData(activeParkId.value);
    }

    // 异步加载 Cesium，避免阻塞 UI 数据渲染
    loadCesium().then(() => {
      nextTick(async () => {
        await initCesium();
        updateMapPosition();
        if (viewer) {
          viewer.resize();
        }
        if (!mapError.value.includes('失败') && !mapError.value.includes('故障')) {
          mapError.value = '';
        }
      });
    }).catch(err => {
      console.warn("Cesium 3D backdrop could not load:", err);
      mapError.value = `加载三维引擎失败: ${err.message || '网络连接超时'}`;
    });

    if (parkList.value.length === 0) {
      // 加载不依附特定园区的全局病虫害及农事历史，做趋势分析
      await Promise.all([fetchPestData(), fetchPhenologyData()]);
      initTrendChart();
      initDiseaseTrendChart();
      initPhenologyTrendChart();
    }

  } catch (error) {
    console.error("初始化大屏页面失败", error);
  } finally {
    globalLoading.value = false;
  }
});

onUnmounted(() => {
  if (timerId.value) clearInterval(timerId.value);
  if (obliqueLoadTimer) {
    clearTimeout(obliqueLoadTimer);
    obliqueLoadTimer = null;
  }
  if (obliqueRefineTimer) {
    clearTimeout(obliqueRefineTimer);
    obliqueRefineTimer = null;
  }
  if (tiandituLabelsTimer) {
    clearTimeout(tiandituLabelsTimer);
    tiandituLabelsTimer = null;
  }
  stopAiChatDrag();
  panelRowResizeObserver?.disconnect();
  panelRowResizeObserver = null;
  if (trendChart) {
    trendChart.dispose();
    trendChart = null;
  }
  if (deviceTypeChart) {
    deviceTypeChart.dispose();
    deviceTypeChart = null;
  }
  if (diseaseTrendChart) {
    diseaseTrendChart.dispose();
    diseaseTrendChart = null;
  }
  if (phenologyTrendChart) {
    phenologyTrendChart.dispose();
    phenologyTrendChart = null;
  }
  if (perceptionChart) {
    perceptionChart.dispose();
    perceptionChart = null;
  }
  if (decisionAlertChart) {
    decisionAlertChart.dispose();
    decisionAlertChart = null;
  }
  window.removeEventListener('resize', resizeChart);
  
  if (rotationRemoveCallback) {
    rotationRemoveCallback();
    rotationRemoveCallback = null;
  }
  latestDialogVideoSn = '';
  if (ys7DialogPlayerInstance) {
    try {
      if (typeof ys7DialogPlayerInstance.destroy === 'function') {
        ys7DialogPlayerInstance.destroy();
      } else {
        ys7DialogPlayerInstance.stop();
      }
    } catch (e) {
      console.error(e);
    }
    ys7DialogPlayerInstance = null;
  }
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
  obliqueTileset = null;
  hasFocusedObliqueTileset = false;
});

// ========================
// 时钟与公共辅助
// ========================
const startClock = () => {
  const updateClock = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const w = weekDays[now.getDay()];
    currentDateTime.value = `${y}-${m}-${d} ${hh}:${mm}:${ss} ${w}`;
  };
  updateClock();
  timerId.value = setInterval(updateClock, 1000);
};

const goHome = () => {
  router.push('/home');
};

const openFarmerTask = () => {
  const routeUrl = router.resolve({ path: '/farmerTask' });
  window.open(routeUrl.href, '_blank');
};

// ========================
// 数据拉取和处理
// ========================
async function initUserPermissions() {
  currentUsername.value = String(userStore.name || '').trim();
  try {
    const userRes = await getUserProfile();
    const user = userRes.data;
    isAdmin.value = user.admin || (user.roles && user.roles.some(r => r.roleKey === 'admin'));
    currentUserId.value = user.userId;
    currentUsername.value = user.userName || userStore.name || '';
    currentUserParkId.value = user.parkId || null;
  } catch (e) {
    console.error("加载权限配置失败", e);
  }
}

async function fetchModelList() {
  try {
    const res = await listModel({ pageNum: 1, pageSize: 1000 });
    modelList.value = res.rows || res.data || [];
  } catch (error) {
    modelList.value = [];
  }
}

async function fetchProductList() {
  try {
    const res = await listProduct({ pageNum: 1, pageSize: 1000 });
    productOptions.value = res.rows || res.data || [];
  } catch (error) {
    productOptions.value = [];
  }
}

async function fetchParks() {
  const params = {};
  if (!isAdmin.value && currentUserId.value) {
    params.userId = currentUserId.value;
  }
  const res = await listPark(params);
  let list = res.data || res.rows || [];
  if (!isAdmin.value && currentUserParkId.value) {
    list = list.filter(p => p.parkId == currentUserParkId.value);
  }
  parkList.value = list;
}

// 核心：一键加载所选园区的数据
async function loadParkData(parkId) {
  if (!parkId) return;
  resetParkScopedData();
  
  await Promise.all([
    fetchParkAreas(parkId),
    fetchParkDevices(parkId),
    fetchLiveWeather(parkId),
    fetchForecastWeather(parkId),
    fetchAlarms(parkId),
    fetchPhenologyData(parkId),
    fetchPestData(parkId),
    fetchPestTrendData(parkId)
  ]);

  calculateStats();
  await preparePerceptionData();

  // 如果监控弹窗处于打开状态，切换园区时自动重载当前园区的监控设备
  if (monitorDialogOpen.value) {
    openMonitorDialog();
  }
  
  // 重新渲染趋势图表，更新为当前园区的数据
  initTrendChart();
  initDeviceTypeChart();
  if (activePestView.value === 'report') {
    initDiseaseTrendChart();
  }
  if (activePhenologyView.value === 'report') {
    initPhenologyTrendChart();
  }
  await nextTick();
  requestAnimationFrame(resizeChart);
  
  // 地图飞行
  if (viewer) {
    updateMapPosition();
  }
}

function resetParkScopedData() {
  areaList.value = [];
  locationList.value = [];
  deviceList.value = [];
  forecastList.value = [];
  iotAlertList.value = [];
  weatherAlertList.value = [];
  iotAlertReportList.value = [];
  weatherAlertReportList.value = [];
  phenologyList.value = [];
  phenologyTrendList.value = [];
  pestTrendList.value = [];
  perceptionAreaId.value = null;
  perceptionLocationId.value = null;
  perceptionDeviceSn.value = '';
  perceptionModels.value = [];
  perceptionLogs.value = [];
  iotStats.total = 0;
  iotStats.online = 0;
  iotStats.offline = 0;
  iotStats.onlineRate = 0;
  resetWeather();
  if (trendChart) {
    trendChart.clear();
  }
  if (phenologyTrendChart) {
    phenologyTrendChart.clear();
  }
  if (perceptionChart) {
    perceptionChart.clear();
  }
  if (decisionAlertChart) {
    decisionAlertChart.clear();
  }
  if (deviceTypeChart) {
    deviceTypeChart.clear();
  }
}

async function fetchPhenologyData(parkId) {
  try {
    const params = {
      pageNum: 1,
      pageSize: 10000,
      orderByColumn: 'phenologyId',
      isAsc: 'desc'
    };
    if (!isAdmin.value && currentUserId.value) {
      params.userId = currentUserId.value;
    }
    if (parkId) {
      params.parkId = parkId;
    }
    const [phenologyRes, aiRecordRes] = await Promise.all([
      listPhenology(params).catch(() => ({ rows: [] })),
      listAiRecord({ pageNum: 1, pageSize: 10000, parkId }).catch(() => ({ rows: [] }))
    ]);
    const aiRecords = aiRecordRes.rows || aiRecordRes.data || [];
    const recordById = new Map(aiRecords.map(record => [
      String(record.recordId ?? record.record_id),
      record
    ]));
    const recordParkMap = new Map(aiRecords.map(record => [
      String(record.recordId ?? record.record_id),
      record.parkId ?? record.park_id
    ]));
    const rows = filterAiRowsByRecordPark(
      phenologyRes.rows || phenologyRes.data || [],
      parkId,
      recordParkMap
    );

    const imageIds = Array.from(new Set(rows.map(row => row.imageId ?? row.image_id ?? recordById.get(String(row.recordId ?? row.record_id))?.imageId).filter(Boolean)));
    const imageRows = imageIds.length ? ((await listImage({ pageNum: 1, pageSize: 10000 })).rows || []) : [];
    const imageById = new Map(imageRows.map(image => [String(image.imageId ?? image.image_id), image]));
    const normalizedRows = rows.map(row => {
      const recordId = row.recordId ?? row.record_id;
      const linkedRecord = recordById.get(String(recordId)) || null;
      const linkedImage = imageById.get(String(row.imageId ?? row.image_id ?? linkedRecord?.imageId ?? linkedRecord?.image_id)) || {};
      const phenologyId = row.phenologyId ?? row.phenology_id;
      return {
        uniqueKey: `phenology_${phenologyId ?? recordId}`,
        id: phenologyId,
        recordId,
        name: row.phenologyName ?? row.phenology_name ?? '未知物候期',
        crop: row.phenologyCrop ?? row.phenology_crop,
        confidence: row.phenologyConfidence ?? row.phenology_confidence,
        description: row.phenologyDesc ?? row.phenology_desc ?? row.phenologyResult ?? row.phenology_result,
        advice: row.phenologyAdvice ?? row.phenology_advice,
        imageUrl: row.phenologyResultImgUrl ?? row.phenology_result_img_url
          ?? row.imageUrl ?? row.image_url ?? linkedRecord?.imageUrl ?? linkedRecord?.image_url
          ?? linkedImage.imageUrl ?? linkedImage.image_url ?? linkedImage.imagePath ?? linkedImage.image_path,
        createTime: linkedRecord?.createTime ?? linkedRecord?.create_time ?? row.createTime ?? row.create_time,
        raw: { ...row, linkedRecord }
      };
    }).sort((a, b) => (new Date(b.createTime).getTime() || 0) - (new Date(a.createTime).getTime() || 0));

    phenologyTrendList.value = normalizedRows;
    phenologyList.value = normalizedRows.slice(0, 30);
  } catch (error) {
    console.error('加载物候期识别记录失败', error);
    phenologyList.value = [];
    phenologyTrendList.value = [];
  }
}

async function fetchParkAreas(parkId) {
  try {
    const res = await listAreaByParkId(parkId);
    areaList.value = res.data || [];
    await fetchAreaLocations();
  } catch (error) {
    areaList.value = [];
    locationList.value = [];
  }
}

async function fetchAreaLocations() {
  if (!areaList.value.length) {
    locationList.value = [];
    return;
  }
  const requests = areaList.value.map(area =>
    listLocationByAreaId(area.areaId)
      .then(res => (res.data || res.rows || []).map(item => ({
        ...item,
        parkId: item.parkId || area.parkId,
        areaName: item.areaName || area.areaName
      })))
      .catch(() => [])
  );
  const groups = await Promise.all(requests);
  locationList.value = groups.flat();
}

async function fetchParkDevices(parkId) {
  try {
    const params = { parkId: parkId, pageSize: 9999 };
    if (!isAdmin.value && currentUserId.value) {
      params.userId = currentUserId.value;
    }
    const res = await listDevice(params);
    deviceList.value = res.rows || [];
  } catch (error) {
    deviceList.value = [];
  }
}

function calculateStats() {
  const total = deviceList.value.length;
  const online = deviceList.value.filter(d => isDeviceOnline(d.status)).length;
  const offline = deviceList.value.filter(d => isDeviceOffline(d.status)).length;
  const rate = total > 0 ? Math.round((online / total) * 100) : 0;

  iotStats.total = total;
  iotStats.online = online;
  iotStats.offline = offline;
  iotStats.onlineRate = rate;
}

function getDeviceTypeName(device) {
  const product = productOptions.value.find(item => String(item.productId) === String(device?.productId));
  const productName = device?.productName || device?.product_name || product?.productName || product?.name;
  const productTypeName = formatProductTerminalType(device?.productType ?? product?.type);
  if (productName) return productTypeName ? `${productName}（${productTypeName}）` : productName;
  return device?.deviceTypeName || device?.typeName || '未知设备类型';
}

function formatProductTerminalType(type) {
  if (String(type) === '0') return '采集终端';
  if (String(type) === '1') return '控制终端';
  return '';
}

function normalizeDeviceStatus(status) {
  if (status === null || status === undefined) return '';
  return String(status).trim();
}

function isDeviceOnline(status) {
  return normalizeDeviceStatus(status) === '1';
}

function isDeviceOffline(status) {
  return normalizeDeviceStatus(status) === '0';
}

async function fetchLiveWeather(parkId) {
  try {
    const res = await listWeatherLive({
      parkId: parkId,
      pageNum: 1,
      pageSize: 1,
      orderByColumn: 'fetchTime',
      isAsc: 'desc'
    });
    if (res.rows && res.rows.length > 0) {
      const live = res.rows[0];
      weatherInfo.value = {
        temperature: live.temperature ?? '--',
        humidity: live.humidity ?? '--',
        windDirection: live.windDirection ?? '--',
        windScale: live.windScale ?? '--',
        precipitation: live.precipitation ?? '--',
        weatherText: live.weatherText || '未知',
        weatherCode: live.weatherCode || live.icon || live.nowIcon || '',
        // “更新时间”统一对应数据库 fetch_time，不再使用原始报文中的第三方时间。
        reportTime: live.fetchTime
          ? parseTime(live.fetchTime, '{m}-{d} {h}:{i}')
          : ''
      };
    } else {
      resetWeather();
    }
  } catch (error) {
    resetWeather();
  }
}

function resetWeather() {
  weatherInfo.value = {
    temperature: '--',
    humidity: '--',
    windDirection: '--',
    windScale: '--',
    precipitation: '--',
    weatherText: '暂无数据',
    weatherCode: '',
    reportTime: ''
  };
}

async function fetchForecastWeather(parkId) {
  try {
    const res = await listWeatherForecast({
      parkId: parkId,
      pageNum: 1,
      pageSize: 7,
      orderByColumn: 'forecastDate',
      isAsc: 'asc',
      params: { latest: 'true' }
    });
    forecastList.value = res.rows || [];
  } catch (error) {
    forecastList.value = [];
  }
}

// 庄园安全预警，分别获取设备报警（物联网预警）与极端天气预警
async function fetchAlarms(parkId) {
  try {
    const deviceRes = await listWarnRecord({
      parkId: parkId,
      pageNum: 1,
      pageSize: 1000,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    });
    const iotAlerts = [];
    if (deviceRes.rows && deviceRes.rows.length > 0) {
      deviceRes.rows.forEach(item => {
        const fields = getAlertPayloadItems(item);
        const primaryField = getPrimaryAlertField(item, fields);
        const deviceName = item.deviceName || item.device_name || item.deviceSn || '未知设备';
        const productName = item.productName || item.product_name || '未知产品';
        iotAlerts.push({
          uniqueKey: `device_${item.id}`,
          type: 'device',
          title: primaryField ? `${primaryField.label}异常` : '设备数据异常',
          typeText: productName,
          levelCode: (item.levelConfigId === 3 || item.levelConfigId === '3') ? 'high' : 'medium',
          time: parseTime(item.createTime, '{m}-{d} {h}:{i}'),
          rawTime: new Date(item.createTime).getTime(),
          deviceName,
          productName,
          fields,
          content: buildIotAlertContent(item, primaryField),
          advice: item.alertAdvice || '建议检查设备、传感器和现场环境，及时处理异常数据。'
        });
      });
    }
    iotAlertReportList.value = iotAlerts;
    iotAlertList.value = iotAlerts.slice(0, 50);

    // 2. 获取极端天气预警 (天气预警)
    const weatherRes = await listWeatherWarn({
      parkId: parkId,
      pageNum: 1,
      pageSize: 1000,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    });
    const weatherAlerts = [];
    if (weatherRes.rows && weatherRes.rows.length > 0) {
      weatherRes.rows.forEach(item => {
        weatherAlerts.push({
          uniqueKey: `weather_${item.id}`,
          type: 'weather',
          title: item.alertTitle || item.warnTitle || item.alertName || '天气预警',
          typeText: item.type == 1 ? '未来天气' : '实时天气',
          levelCode: item.alertLevel === '红色' || item.alertLevel === '橙色' ? 'high' : 'medium',
          time: parseTime(item.createTime, '{m}-{d} {h}:{i}'),
          rawTime: new Date(item.createTime).getTime(),
          levelText: item.alertLevel ? `等级：${item.alertLevel}` : (item.type == 1 ? '未来天气预警' : '实时天气预警'),
          parkName: item.parkName || getParkNameById(parkId),
          content: `${item.anomalyInfo || '突发极端气象预警'}`,
          advice: item.alertAdvice || '无进一步建议'
        });
      });
    }
    weatherAlertReportList.value = weatherAlerts;
    weatherAlertList.value = weatherAlerts.slice(0, 50);
    if (activeWarnTab.value === 'report') {
      await nextTick();
      initDecisionAlertChart();
    }

  } catch (error) {
    console.error("加载预警记录失败", error);
    iotAlertList.value = [];
    weatherAlertList.value = [];
    iotAlertReportList.value = [];
    weatherAlertReportList.value = [];
    if (activeWarnTab.value === 'report') {
      await nextTick();
      initDecisionAlertChart();
    }
  }
}

function parsePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(payload);
  } catch (e) {
    return {};
  }
}

function getPayloadSource(payload) {
  const parsed = parsePayload(payload);
  if (parsed && typeof parsed === 'object') {
    return parsed.params || parsed.properties || parsed.data || parsed;
  }
  return {};
}

function getAlertPayloadItems(row) {
  const source = getPayloadSource(row.payload);
  if (!source || typeof source !== 'object' || Array.isArray(source)) return [];
  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
    .map(([key, value]) => ({
      key,
      label: getModelName(row.productId, key),
      value
    }));
}

function getModelName(productId, identifier) {
  const productKey = productId === null || productId === undefined ? 'all' : String(productId);
  return modelNameMap.value.get(`${productKey}:${identifier}`) || modelNameMap.value.get(`all:${identifier}`) || identifier;
}

function getPrimaryAlertField(row, fields = []) {
  if (row.identifier) {
    const label = getModelName(row.productId, row.identifier);
    return { key: row.identifier, label, value: row.actualValue || fields.find(item => item.key === row.identifier)?.value };
  }
  if (row.fieldName || row.modelName) {
    return { key: row.fieldName || row.modelName, label: row.modelName || row.fieldName, value: row.actualValue };
  }
  if (fields.length > 0) {
    const matched = fields.find(item => String(item.value) === String(row.actualValue));
    return matched || fields[0];
  }
  return row.actualValue ? { key: 'actualValue', label: '预警值', value: row.actualValue } : null;
}

function buildIotAlertContent(row, primaryField) {
  const valueText = primaryField?.value !== undefined && primaryField?.value !== null && primaryField?.value !== ''
    ? `，预警值：${primaryField.value}`
    : '';
  const ruleText = row.configName || row.warnName || row.levelConfigName || '';
  return `${ruleText ? `${ruleText}，` : ''}${primaryField?.label || '监测数据'}触发物联网预警${valueText}`;
}

// 分页接口可能限制 pageSize，必须按 total 继续读取，不能把第一页当作全部记录。
async function loadAiListPages(listApi, query = {}) {
  const rows = [];
  let pageNum = 1;
  while (true) {
    const response = await listApi({ ...query, pageNum, pageSize: 100 });
    const pageRows = response.rows ?? response.data;
    if (!Array.isArray(pageRows)) throw new Error('识别列表接口返回格式异常');
    rows.push(...pageRows);
    const total = Number(response.total);
    if (pageRows.length === 0 || (Number.isFinite(total)
      ? rows.length >= total
      : pageRows.length < 100)) return rows;
    pageNum += 1;
  }
}

// 虫情测报来自 xwq_ai_pest，随园区切换，不使用病虫识别的用户名筛选。
async function fetchPestTrendData(parkId) {
  if (!parkId) {
    pestTrendList.value = [];
    return;
  }
  try {
    const params = { parkId, orderByColumn: 'pestA', isAsc: 'desc' };
    if (!isAdmin.value && currentUserId.value) {
      params.userId = currentUserId.value;
    }
    const rawPests = await loadAiListPages(listPest, params);
    const trendList = rawPests.flatMap(p => {
      const conclusion = p.pestResult || p.pest_result || p.result || '';
      const parsedItems = parsePestConclusion(conclusion);
      const items = parsedItems.length ? parsedItems : [{
        name: p.pestName || p.pest_name || '未知虫情',
        count: Number(p.pestCount ?? p.pest_count ?? 0)
      }];
      return items.map((parsed, parsedIndex) => ({
        type: 'pest',
        id: p.pestId || p.pest_id,
        name: parsed.name,
        crop: p.pestCrop || p.pest_crop,
        count: parsed.count,
        conclusion,
        confidence: p.pestConfidence ?? p.pest_confidence,
        recordNo: p.recordNo || p.record_no,
        imageUrl: p.imageUrl || p.image_url,
        warningLevel: p.warningLevel,
        createTime: getPestRowTimeValue(p),
        raw: p,
        uniqueKey: `pest_${p.pestId || p.pest_id}_${parsedIndex}`
      }));
    });
    trendList.sort((a, b) =>
      ((new Date(b.createTime).getTime() || 0) - (new Date(a.createTime).getTime() || 0)) || b.id - a.id
    );
    pestTrendList.value = trendList;
  } catch (error) {
    console.error('加载园区虫情测报失败', error);
    pestTrendList.value = [];
  }
}

// 手动病虫识别按 record.createBy 关联用户，摄像头定时分析按园区关联。
async function fetchPestData(parkId) {
  try {
    const username = String(currentUsername.value || userStore.name || '').trim();
    if (!username) throw new Error('未获取到当前登录用户名，无法关联病虫害识别记录');
    // 获取记录后分别判断手动识别归属和定时分析园区，不对全部记录使用同一筛选。
    const recordParams = {
      orderByColumn: 'recordId',
      isAsc: 'desc'
    };

    // 病害接口自身按 disease_id 倒序，避免额外排序参数覆盖接口 SQL。
    const [allDiseases, allRecords] = await Promise.all([
      loadAiListPages(listDisease),
      loadAiListPages(listAiRecord, recordParams)
    ]);

    const isAutomaticRecord = record => {
      const mode = String(record.recordMode ?? record.record_mode ?? '').trim().toLowerCase();
      return mode.includes('自动') || mode.includes('定时') || mode.includes('摄像头') || mode.includes('camera');
    };
    const manualRecords = allRecords.filter(record =>
      !isAutomaticRecord(record)
      && String(record.createBy ?? record.create_by ?? '').trim() === username
    );
    const automaticRecords = allRecords.filter(record =>
      isAutomaticRecord(record)
      && parkId
      && String(record.parkId ?? record.park_id ?? '') === String(parkId)
    );
    const aiRecords = [...manualRecords, ...automaticRecords];
    const recordById = new Map(aiRecords.map(record => [
      String(record.recordId ?? record.record_id),
      record
    ]));
    const recordByImageId = new Map();
    aiRecords.forEach(record => {
      const imageId = record.imageId ?? record.image_id;
      if (imageId !== undefined && imageId !== null && !recordByImageId.has(String(imageId))) {
        recordByImageId.set(String(imageId), record);
      }
    });
    const eligibleRecordIds = new Set(aiRecords
      .map(record => record.recordId ?? record.record_id)
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(value => String(value)));
    const eligibleImageIds = new Set(aiRecords
      .map(record => record.imageId ?? record.image_id)
      .filter(value => value !== undefined && value !== null && value !== '')
      .map(value => String(value)));
    const belongsToSelectedScope = (row = {}) => {
      const recordId = row.recordId ?? row.record_id ?? row.recordID ?? row.aiRecordId ?? row.ai_record_id;
      const imageId = row.imageId ?? row.image_id;
      if (recordId !== undefined && recordId !== null && recordId !== '') {
        return eligibleRecordIds.has(String(recordId));
      }
      return imageId !== undefined && imageId !== null && eligibleImageIds.has(String(imageId));
    };
    const rawDiseases = allDiseases.filter(belongsToSelectedScope);
    if (allDiseases.length > 0 && rawDiseases.length === 0) {
      const unownedRecordIds = new Set(allRecords
        .filter(record => !isAutomaticRecord(record) && !String(record.createBy ?? record.create_by ?? '').trim())
        .map(record => String(record.recordId ?? record.record_id)));
      if (allDiseases.some(row => unownedRecordIds.has(String(getAiRecordId(row))))) {
        ElMessage.warning('存在未填写 record.createBy 的病虫害记录，无法按当前用户名关联');
      }
    }
    const imageIds = Array.from(new Set(rawDiseases.map(row => {
      const record = recordById.get(String(getAiRecordId(row))) || {};
      return row.imageId ?? row.image_id ?? record.imageId ?? record.image_id;
    }).filter(Boolean)));
    const imageRows = imageIds.length ? await loadAiListPages(listImage).catch(error => {
      console.warn('补查病虫害图片失败，继续展示识别结果', error);
      return [];
    }) : [];
    const imageById = new Map(imageRows.map(image => [String(image.imageId ?? image.image_id), image]));

    const diseaseList = rawDiseases.map(d => {
      const linkedRecord = recordById.get(String(getAiRecordId(d)))
        || recordByImageId.get(String(d.imageId ?? d.image_id)) || null;
      const linkedImage = imageById.get(String(d.imageId ?? d.image_id ?? linkedRecord?.imageId ?? linkedRecord?.image_id)) || {};
      return {
        uniqueKey: `disease_${d.diseaseId}`,
        type: 'disease',
        id: d.diseaseId,
        name: d.diseaseName || '未知病害',
        crop: d.diseaseCrop,
        count: 0,
        confidence: d.diseaseConfidence,
        recordNo: d.recordNo,
        imageUrl: d.imageUrl || d.image_url || d.diseaseResultImgUrl || d.disease_result_img_url
          || linkedRecord?.imageUrl || linkedRecord?.image_url || linkedImage.imageUrl || linkedImage.imagePath,
        warningLevel: d.warningLevel,
        createTime: linkedRecord?.createTime ?? linkedRecord?.create_time ?? d.createTime ?? d.create_time,
        raw: { ...d, linkedRecord }
      };
    });

    const sortByTimeDesc = (a, b) => {
      const timeA = new Date(a.createTime).getTime() || 0;
      const timeB = new Date(b.createTime).getTime() || 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return b.id - a.id;
    };
    diseaseList.sort(sortByTimeDesc);

    diseaseTrendList.value = diseaseList;
    pestList.value = diseaseList.slice(0, 30);
  } catch (error) {
    console.error("加载病虫害识别记录失败", error);
    ElMessage.error('病虫害识别列表加载失败：' + (error.message || '请检查识别结果和记录列表接口'));
  }
}

function parsePestConclusion(value) {
  const text = String(value || '').replace(/\n/g, '；');
  const items = [];
  const pattern = /([^；;，,：:\n]+?)\s*[：:]\s*(\d+(?:\.\d+)?)\s*头/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim().replace(/^(识别结论|虫情结论)\s*[：:]?\s*/, '');
    const count = Number(match[2]);
    if (name && Number.isFinite(count)) items.push({ name, count });
  }
  return items;
}

function getPestAreaName(item = {}) {
  const row = item.raw || item;
  const linkedRecord = row.linkedRecord || {};
  const directName = row.areaName ?? row.area_name ?? linkedRecord.areaName ?? linkedRecord.area_name
    ?? linkedRecord.plotName ?? linkedRecord.plot_name;
  if (directName) return directName;

  const areaId = linkedRecord.plotId ?? linkedRecord.plot_id ?? row.areaId ?? row.area_id;
  const area = areaList.value.find(current => String(current.areaId ?? current.area_id) === String(areaId));
  return area?.areaName || area?.area_name || '未关联地块';
}

function getPhenologyAreaName(item = {}) {
  const row = item.raw || item;
  const linkedRecord = row.linkedRecord || {};
  const directName = row.areaName ?? row.area_name ?? linkedRecord.areaName ?? linkedRecord.area_name
    ?? linkedRecord.plotName ?? linkedRecord.plot_name;
  if (directName) return directName;

  const areaId = linkedRecord.plotId ?? linkedRecord.plot_id ?? row.areaId ?? row.area_id;
  const area = areaList.value.find(current => String(current.areaId ?? current.area_id) === String(areaId));
  return area?.areaName || area?.area_name || '未关联地块';
}

async function handlePestViewChange(view) {
  activePestView.value = view;
  if (view !== 'report') return;
  await nextTick();
  initDiseaseTrendChart();
}

async function handlePhenologyViewChange(view) {
  activePhenologyView.value = view;
  if (view !== 'report') return;
  await nextTick();
  initPhenologyTrendChart();
}

function filterAiRowsByRecordPark(rows = [], parkId, recordParkMap = new Map()) {
  if (!parkId) return rows;
  return rows.filter(row => {
    const directParkId = getAiParkId(row);
    if (directParkId !== undefined && directParkId !== null && directParkId !== '') {
      return String(directParkId) === String(parkId);
    }
    const recordId = getAiRecordId(row);
    if (recordId === undefined || recordId === null) return true;
    const recordParkId = recordParkMap.get(String(recordId));
    if (recordParkId === undefined || recordParkId === null || recordParkId === '') return true;
    return String(recordParkId) === String(parkId);
  });
}

function getAiRecordId(row = {}) {
  return row.recordId ?? row.record_id ?? row.recordID ?? row.aiRecordId ?? row.ai_record_id ?? row.id;
}

function getAiParkId(row = {}) {
  return row.parkId ?? row.park_id ?? row.parkID;
}

function getPestRowTimeValue(row = {}) {
  return row.pestA ?? row.pest_a ?? row.recognizeTime ?? row.recognize_time ?? row.createTime ?? row.create_time ?? row.updateTime ?? row.recordTime;
}

function normalizeDateKey(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const direct = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (direct) {
    return `${direct[1]}-${String(direct[2]).padStart(2, '0')}-${String(direct[3]).padStart(2, '0')}`;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTrendDateLabel(dateKey) {
  const parts = String(dateKey).split('-');
  if (parts.length !== 3) return dateKey;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

function buildPestTrendDates() {
  const dateKeys = Array.from(new Set(
    (pestTrendList.value || [])
      .map(item => normalizeDateKey(item.createTime))
      .filter(Boolean)
  )).sort();

  if (dateKeys.length > 0) {
    const rawDates = dateKeys.slice(-7);
    return {
      rawDates,
      dates: rawDates.map(formatTrendDateLabel)
    };
  }

  const dates = [];
  const rawDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const dateFullStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(formatTrendDateLabel(dateFullStr));
    rawDates.push(dateFullStr);
  }
  return { dates, rawDates };
}

function buildDiseaseTrendDates() {
  const dateKeys = Array.from(new Set(
    diseaseTrendList.value.map(item => normalizeDateKey(item.createTime)).filter(Boolean)
  )).sort();

  if (dateKeys.length > 0) {
    const rawDates = dateKeys;
    return { rawDates, dates: rawDates.map(formatTrendDateLabel) };
  }

  const rawDates = [];
  for (let index = 6; index >= 0; index--) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    rawDates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  }
  return { rawDates, dates: rawDates.map(formatTrendDateLabel) };
}

function buildPhenologyTrendDates() {
  const dateKeys = Array.from(new Set(
    phenologyTrendList.value.map(item => normalizeDateKey(item.createTime)).filter(Boolean)
  )).sort();

  if (dateKeys.length > 0) {
    const rawDates = dateKeys.slice(-7);
    return { rawDates, dates: rawDates.map(formatTrendDateLabel) };
  }

  const rawDates = [];
  for (let index = 6; index >= 0; index--) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    rawDates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  }
  return { rawDates, dates: rawDates.map(formatTrendDateLabel) };
}

async function preparePerceptionData() {
  if (!areaList.value.length) {
    perceptionAreaId.value = null;
    perceptionLocationId.value = null;
    perceptionDeviceSn.value = '';
    await nextTick();
    renderPerceptionChart();
    return;
  }
  if (!areaList.value.some(area => String(area.areaId) === String(perceptionAreaId.value))) {
    perceptionAreaId.value = areaList.value[0].areaId;
  }
  await handlePerceptionAreaChange(perceptionAreaId.value);
  await nextTick();
  renderPerceptionChart();
}

async function handlePerceptionAreaChange(areaId) {
  perceptionAreaId.value = areaId;
  const locations = perceptionLocationOptions.value;
  perceptionLocationId.value = locations[0]?.locationId || null;
  await handlePerceptionLocationChange(perceptionLocationId.value);
}

async function handlePerceptionLocationChange(locationId) {
  perceptionLocationId.value = locationId;
  const devices = perceptionDeviceOptions.value;
  perceptionDeviceSn.value = devices[0]?.deviceSn || '';
  await handlePerceptionDeviceChange(perceptionDeviceSn.value);
}

async function handlePerceptionDeviceChange(deviceSn) {
  const requestSequence = ++perceptionRequestSequence;
  perceptionDeviceSn.value = deviceSn || '';
  const device = deviceList.value.find(item => item.deviceSn === deviceSn);
  perceptionModels.value = [];
  perceptionLogs.value = [];
  renderPerceptionChart();
  if (!device) {
    perceptionLoading.value = false;
    return;
  }

  perceptionLoading.value = true;
  try {
    const [modelRes, logRes] = await Promise.all([
      listModel({ productId: device.productId, pageNum: 1, pageSize: 200 }),
      listDeviceLog({ deviceSn, pageNum: 1, pageSize: 120, orderByColumn: 'createTime', isAsc: 'desc' })
    ]);
    const models = modelRes.rows || modelRes.data || [];
    const logs = (logRes.rows || logRes.data || []).slice().sort((a, b) => (
      getPerceptionLogTimestamp(a) - getPerceptionLogTimestamp(b)
    ));
    if (requestSequence !== perceptionRequestSequence || perceptionDeviceSn.value !== deviceSn) return;
    perceptionLogs.value = logs;
    perceptionModels.value = models.filter(model => isPerceptionNumericModel(model, logs));
  } catch (error) {
    if (requestSequence !== perceptionRequestSequence) return;
    perceptionModels.value = [];
    perceptionLogs.value = [];
  } finally {
    if (requestSequence !== perceptionRequestSequence) return;
    perceptionLoading.value = false;
    await nextTick();
    renderPerceptionChart();
  }
}

function getParkNameById(parkId) {
  const park = parkList.value.find(item => String(item.parkId) === String(parkId));
  return park?.parkName || '当前园区';
}

function normalizePerceptionPayload(payload) {
  if (!payload) return {};
  let parsed = payload;
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed.params || parsed.properties || parsed.data || parsed;
}

function getPerceptionLogTime(log = {}) {
  return log.createTime ?? log.create_time ?? log.reportTime ?? log.timestamp;
}

function getPerceptionLogTimestamp(log = {}) {
  const value = getPerceptionLogTime(log);
  if (typeof value === 'number') return value;
  const timestamp = new Date(String(value || '').replace(/-/g, '/')).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getPerceptionValue(log, identifier) {
  const value = normalizePerceptionPayload(log?.payload)?.[identifier];
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

function isPerceptionNumericModel(model, logs = []) {
  if (!model?.identifier || String(model.isMonitor ?? '1') === '0') return false;
  const type = String(model.type || model.dataType || model.valueType || '').toLowerCase();
  if (['int', 'integer', 'float', 'double', 'number', 'decimal'].includes(type)) return true;
  return logs.some(log => getPerceptionValue(log, model.identifier) !== null);
}

function getPerceptionModelUnit(model) {
  if (!model?.specs) return '';
  try {
    const specs = typeof model.specs === 'string' ? JSON.parse(model.specs) : model.specs;
    return specs?.unit || '';
  } catch (error) {
    return '';
  }
}

function renderPerceptionChart() {
  const chartDom = perceptionChartRef.value;
  if (!chartDom) return;
  if (!perceptionChart) {
    perceptionChart = echarts.init(chartDom);
  } else {
    perceptionChart.clear();
  }

  const logs = perceptionLogs.value.slice(-60);
  const colors = ['#42ffd0', '#ffd166', '#5ddcff', '#ff8fa3', '#c4ff4d', '#b69cff'];
  const series = perceptionModels.value.map((model, index) => ({
    name: model.modelName || model.name || model.identifier,
    unit: getPerceptionModelUnit(model),
    type: 'line',
    smooth: true,
    connectNulls: true,
    showSymbol: logs.length <= 20,
    symbolSize: 4,
    data: logs.map(log => getPerceptionValue(log, model.identifier)),
    itemStyle: { color: colors[index % colors.length] },
    lineStyle: { width: 2, color: colors[index % colors.length] },
    areaStyle: index === 0 ? { color: `${colors[index % colors.length]}22` } : undefined
  })).filter(item => item.data.some(value => value !== null));

  if (!series.length || !logs.length) {
    perceptionChart.setOption({
      backgroundColor: 'transparent',
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: '暂无数据', fill: 'rgba(255, 255, 255, 0.68)', fontSize: 12 }
      }
    }, true);
    return;
  }

  const unitMap = new Map(series.map(item => [item.name, item.unit]));
  perceptionChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(66, 255, 208, 0.28)',
      textStyle: { color: '#ffffff', fontSize: 11 },
      formatter: params => {
        const rows = Array.isArray(params) ? params : [params];
        const values = rows.map(item => `${item.marker}${item.seriesName}: ${item.value ?? '--'}${unitMap.get(item.seriesName) || ''}`);
        return `${rows[0]?.axisValueLabel || ''}<br/>${values.join('<br/>')}`;
      }
    },
    legend: {
      data: series.map(item => item.name),
      type: 'scroll',
      top: 0,
      left: 4,
      right: 4,
      textStyle: { color: '#ffffff', fontSize: 10 },
      pageTextStyle: { color: '#ffffff' },
      pageIconColor: '#ffffff',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.38)'
    },
    grid: { left: 2, right: 2, top: 28, bottom: 2, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: logs.map(log => parseTime(getPerceptionLogTime(log), '{m}-{d} {h}:{i}') || '--'),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.28)' } },
      axisLabel: { color: '#ffffff', fontSize: 9, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: '#ffffff', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    series
  }, true);
  perceptionChart.resize();
}

// ========================
// ECharts 图表配置 (趋势分析)
// ========================
const initTrendChart = () => {
  const chartDom = document.getElementById('trendChartContainer');
  if (!chartDom) return;
  
  if (!trendChart) {
    trendChart = echarts.init(chartDom);
  } else {
    trendChart.clear();
  }

  const { dates, rawDates } = buildPestTrendDates();
  const pestNameSet = new Set();
  const pestCountMap = new Map();

  rawDates.forEach(date => pestCountMap.set(date, new Map()));

  // 统计最近7天每天的虫子数量，仅来自 xwq_ai_pest.pestCount
  if (pestTrendList.value && pestTrendList.value.length > 0) {
    pestTrendList.value.forEach(item => {
      if (item.createTime) {
        const pDate = normalizeDateKey(item.createTime);
        const dayMap = pestCountMap.get(pDate);
        if (dayMap) {
          const pestName = item.name || '未知虫情';
          pestNameSet.add(pestName);
          dayMap.set(pestName, (dayMap.get(pestName) || 0) + Number(item.count || 0));
        }
      }
    });
  }

  const pestNames = Array.from(pestNameSet);
  const colors = ['#42ffd0', '#8affb8', '#ffd166', '#5ddcff', '#ff8fa3', '#c4ff4d', '#b69cff'];
  const series = pestNames.map((name, index) => ({
    name,
    type: 'line',
    smooth: true,
    showSymbol: true,
    symbolSize: 5,
    data: rawDates.map(date => pestCountMap.get(date)?.get(name) || 0),
    label: { color: '#ffffff' },
    itemStyle: { color: colors[index % colors.length] },
    lineStyle: { width: 2, color: colors[index % colors.length] },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `${colors[index % colors.length]}55` },
        { offset: 1, color: 'rgba(52, 211, 153, 0)' }
      ])
    }
  }));
  if (pestNames.length === 0) {
    trendChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { show: false },
      grid: { left: 3, right: 2, bottom: 2, top: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.22)' } },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
        axisLabel: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 10 }
      },
      series: [],
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '暂无数据',
          fill: 'rgba(255, 255, 255, 0.68)',
          fontSize: 12
        }
      }
    }, true);
    return;
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#e2e8f0' },
      axisPointer: { type: 'line' },
      valueFormatter: value => `${value} 头`
    },
    legend: {
      data: pestNames,
      textStyle: { color: '#ffffff', fontSize: 11 },
      right: '4%',
      type: 'scroll',
      pageTextStyle: {
        color: '#ffffff',
        fontWeight: '600'
      },
      pageIconColor: '#ffffff',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.45)'
    },
    grid: { left: 3, right: 2, bottom: 2, top: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.34)' } },
      axisTick: { lineStyle: { color: 'rgba(255, 255, 255, 0.24)' } },
      axisLabel: { color: '#ffffff', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.14)' } },
      axisLabel: {
        color: '#ffffff',
        fontSize: 10,
        formatter: value => `${value}头`
      }
    },
    series: [
      {
        name: '害虫数量',
        type: 'line',
        smooth: true,
        showSymbol: true,
        data: [],
        label: { color: '#ffffff' },
        itemStyle: { color: '#34d399' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52, 211, 153, 0.4)' },
            { offset: 1, color: 'rgba(52, 211, 153, 0)' }
          ])
        }
      }
    ],
    series
  };

  trendChart.setOption(option, true);
};

const initDiseaseTrendChart = () => {
  const chartDom = diseaseTrendChartRef.value;
  if (!chartDom) return;

  if (!diseaseTrendChart) {
    diseaseTrendChart = echarts.init(chartDom);
  } else {
    diseaseTrendChart.clear();
  }

  const { dates, rawDates } = buildDiseaseTrendDates();
  const diseaseNames = Array.from(new Set(diseaseTrendList.value.map(item => item.name).filter(Boolean)));
  const countsByDate = new Map(rawDates.map(date => [date, new Map()]));

  diseaseTrendList.value.forEach(item => {
    const dayCounts = countsByDate.get(normalizeDateKey(item.createTime));
    if (!dayCounts || !item.name) return;
    dayCounts.set(item.name, (dayCounts.get(item.name) || 0) + 1);
  });

  const colors = ['#42ffd0', '#ffd166', '#5ddcff', '#ff8fa3', '#c4ff4d', '#b69cff'];
  const series = diseaseNames.map((name, index) => ({
    name,
    type: 'line',
    smooth: true,
    showSymbol: true,
    symbolSize: 5,
    data: rawDates.map(date => countsByDate.get(date)?.get(name) || 0),
    itemStyle: { color: colors[index % colors.length] },
    lineStyle: { width: 2, color: colors[index % colors.length] }
  }));

  diseaseTrendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(66, 255, 208, 0.28)',
      textStyle: { color: '#ffffff', fontSize: 11 },
      valueFormatter: value => `${value} 次`
    },
    legend: {
      data: diseaseNames,
      type: 'scroll',
      top: 0,
      right: 4,
      left: 4,
      textStyle: { color: '#ffffff', fontSize: 10 },
      pageTextStyle: { color: '#ffffff' },
      pageIconColor: '#ffffff',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.38)'
    },
    grid: { left: 8, right: 10, top: 38, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.28)' } },
      axisLabel: { color: '#ffffff', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#ffffff', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    series,
    graphic: diseaseNames.length === 0 ? {
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: '暂无病虫识别趋势数据', fill: 'rgba(255, 255, 255, 0.68)', fontSize: 12 }
    } : undefined
  }, true);
  diseaseTrendChart.resize();
};

const initPhenologyTrendChart = () => {
  const chartDom = phenologyTrendChartRef.value;
  if (!chartDom) return;

  if (!phenologyTrendChart) {
    phenologyTrendChart = echarts.init(chartDom);
  } else {
    phenologyTrendChart.clear();
  }

  const { dates, rawDates } = buildPhenologyTrendDates();
  const stageNames = Array.from(new Set(phenologyTrendList.value.map(item => item.name).filter(Boolean)));
  const countsByDate = new Map(rawDates.map(date => [date, new Map()]));

  phenologyTrendList.value.forEach(item => {
    const dayCounts = countsByDate.get(normalizeDateKey(item.createTime));
    if (!dayCounts || !item.name) return;
    dayCounts.set(item.name, (dayCounts.get(item.name) || 0) + 1);
  });

  const colors = ['#42ffd0', '#ffd166', '#5ddcff', '#ff8fa3', '#c4ff4d', '#b69cff'];
  const series = stageNames.map((name, index) => ({
    name,
    type: 'line',
    smooth: true,
    showSymbol: true,
    symbolSize: 5,
    data: rawDates.map(date => countsByDate.get(date)?.get(name) || 0),
    itemStyle: { color: colors[index % colors.length] },
    lineStyle: { width: 2, color: colors[index % colors.length] }
  }));

  phenologyTrendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(66, 255, 208, 0.28)',
      textStyle: { color: '#ffffff', fontSize: 11 },
      valueFormatter: value => `${value} 条`
    },
    legend: {
      data: stageNames,
      type: 'scroll',
      top: 0,
      right: 4,
      left: 4,
      textStyle: { color: '#ffffff', fontSize: 10 },
      pageTextStyle: { color: '#ffffff' },
      pageIconColor: '#ffffff',
      pageIconInactiveColor: 'rgba(255, 255, 255, 0.38)'
    },
    grid: { left: 12, right: 12, top: 38, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: stageNames.length === 0,
      data: dates,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.28)' } },
      axisLabel: { color: '#ffffff', fontSize: 10, showMinLabel: true, showMaxLabel: true }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#ffffff', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    series,
    graphic: stageNames.length === 0 ? {
      type: 'text',
      left: 'center',
      top: 'middle',
      style: { text: '暂无物候期趋势数据', fill: 'rgba(255, 255, 255, 0.68)', fontSize: 12 }
    } : undefined
  }, true);
  phenologyTrendChart.resize();
};

async function handleWarnTabChange(tab) {
  activeWarnTab.value = tab;
  if (tab !== 'report') return;
  await nextTick();
  initDecisionAlertChart();
}

function getAlertReportDates() {
  const allAlerts = [...iotAlertReportList.value, ...weatherAlertReportList.value];
  const dateKeys = Array.from(new Set(allAlerts.map(item => {
    const date = new Date(item.rawTime);
    return Number.isNaN(date.getTime()) ? '' : normalizeDateKey(date);
  }).filter(Boolean))).sort();
  if (dateKeys.length) return dateKeys.slice(-7);

  const dates = [];
  for (let index = 6; index >= 0; index--) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    dates.push(normalizeDateKey(date));
  }
  return dates;
}

function countAlertsByDate(alerts, dates) {
  const counts = new Map(dates.map(date => [date, 0]));
  alerts.forEach(item => {
    const date = new Date(item.rawTime);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = normalizeDateKey(date);
    if (counts.has(dateKey)) counts.set(dateKey, counts.get(dateKey) + 1);
  });
  return dates.map(date => counts.get(date) || 0);
}

function initDecisionAlertChart() {
  const chartDom = decisionAlertChartRef.value;
  if (!chartDom) return;
  if (!decisionAlertChart) {
    decisionAlertChart = echarts.init(chartDom);
  } else {
    decisionAlertChart.clear();
  }

  const dates = getAlertReportDates();
  const sensorCounts = countAlertsByDate(iotAlertReportList.value, dates);
  const weatherCounts = countAlertsByDate(weatherAlertReportList.value, dates);
  const hasData = sensorCounts.some(Boolean) || weatherCounts.some(Boolean);

  if (!hasData) {
    decisionAlertChart.setOption({
      backgroundColor: 'transparent',
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: '暂无数据', fill: 'rgba(255, 255, 255, 0.68)', fontSize: 12 }
      }
    }, true);
    return;
  }

  decisionAlertChart.setOption({
    backgroundColor: 'transparent',
    color: ['#42ffd0', '#ffd166'],
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(66, 255, 208, 0.28)',
      textStyle: { color: '#ffffff', fontSize: 11 },
      valueFormatter: value => `${value} 条`
    },
    legend: {
      data: ['传感器预警', '天气预警'],
      top: 0,
      right: 4,
      textStyle: { color: '#ffffff', fontSize: 10 }
    },
    grid: { left: 10, right: 2, top: 28, bottom: 2, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates.map(formatTrendDateLabel),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.28)' } },
      axisLabel: { color: '#ffffff', fontSize: 9 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#ffffff', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    series: [
      { name: '传感器预警', type: 'bar', barMaxWidth: 18, data: sensorCounts },
      { name: '天气预警', type: 'bar', barMaxWidth: 18, data: weatherCounts }
    ]
  }, true);
  decisionAlertChart.resize();
}

const initDeviceTypeChart = () => {
  const chartDom = deviceTypeChartRef.value;
  if (!chartDom) return;

  if (!deviceTypeChart) {
    deviceTypeChart = echarts.init(chartDom);
  } else {
    deviceTypeChart.clear();
  }

  const chartData = deviceTypeStats.value.map((item, index) => ({
    name: item.name,
    value: item.total,
    online: item.online,
    offline: item.offline,
    onlineRate: item.onlineRate,
      itemStyle: {
        color: ['#2bb673', '#4b9bd8', '#7cc43a', '#f0c94b', '#55b7a0', '#8a9bd4'][index % 6]
      }
  }));

  if (chartData.length === 0) {
    deviceTypeChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { show: false },
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '暂无设备类型数据',
          fill: 'rgba(30, 41, 59, 0.72)',
          fontSize: 12
        }
      }
    }, true);
    return;
  }

    deviceTypeChart.setOption({
      backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(148, 163, 184, 0.2)',
      textStyle: { color: '#e2e8f0' },
      formatter: params => {
        const data = params.data || {};
        return [
          `${params.name}`,
          `总数: ${data.value ?? 0}`,
          `在线: ${data.online ?? 0}`,
          `离线: ${data.offline ?? 0}`,
          `在线率: ${data.onlineRate ?? 0}%`
        ].join('<br/>');
      }
    },
    series: [
      {
        name: '设备类型',
        type: 'pie',
        radius: ['34%', '58%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 6,
        itemStyle: {
          borderColor: 'transparent',
          borderWidth: 0
        },
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  }, true);
};

const initChartResize = () => {
  window.addEventListener('resize', resizeChart);
};

const syncRightPanelRows = () => {
  const leftCards = leftPanelRef.value?.querySelectorAll(':scope > .cyber-card');
  const rightPanel = rightPanelRef.value;
  if (!rightPanel || leftCards?.length !== 3) return;

  leftCards.forEach((card, index) => {
    rightPanel.style.setProperty(`--matched-row-${index + 1}-height`, `${card.getBoundingClientRect().height}px`);
  });
  requestAnimationFrame(resizeChart);
};

const initPanelRowSync = () => {
  syncRightPanelRows();
  if (typeof ResizeObserver === 'undefined' || !leftPanelRef.value) return;

  panelRowResizeObserver = new ResizeObserver(syncRightPanelRows);
  panelRowResizeObserver.observe(leftPanelRef.value);
  leftPanelRef.value.querySelectorAll(':scope > .cyber-card').forEach(card => {
    panelRowResizeObserver.observe(card);
  });
};

const resizeChart = () => {
  if (trendChart) {
    trendChart.resize();
  }
  if (deviceTypeChart) {
    deviceTypeChart.resize();
  }
  if (diseaseTrendChart && activePestView.value === 'report') {
    diseaseTrendChart.resize();
  }
  if (phenologyTrendChart && activePhenologyView.value === 'report') {
    phenologyTrendChart.resize();
  }
  if (perceptionChart) {
    perceptionChart.resize();
  }
  if (decisionAlertChart && activeWarnTab.value === 'report') {
    decisionAlertChart.resize();
  }
  if (aiChatVisible.value && aiChatPosition.value) {
    aiChatPosition.value = clampAiChatPosition(aiChatPosition.value.left, aiChatPosition.value.top);
  }
};

// ========================
// Cesium 3D 地图控制与初始化
// ========================
// 三级区域坐标解析工具方法 (支持经纬度单点与多边形边界)
// ========================
const GCJ_PI = Math.PI;
const GCJ_AXIS = 6378245.0;
const GCJ_EE = 0.006693421622965943;

const isOutsideChina = (lon, lat) => lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;

const transformGcjLat = (x, y) => {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * GCJ_PI) + 20 * Math.sin(2 * x * GCJ_PI)) * 2 / 3;
  value += (20 * Math.sin(y * GCJ_PI) + 40 * Math.sin(y / 3 * GCJ_PI)) * 2 / 3;
  value += (160 * Math.sin(y / 12 * GCJ_PI) + 320 * Math.sin(y * GCJ_PI / 30)) * 2 / 3;
  return value;
};

const transformGcjLon = (x, y) => {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * GCJ_PI) + 20 * Math.sin(2 * x * GCJ_PI)) * 2 / 3;
  value += (20 * Math.sin(x * GCJ_PI) + 40 * Math.sin(x / 3 * GCJ_PI)) * 2 / 3;
  value += (150 * Math.sin(x / 12 * GCJ_PI) + 300 * Math.sin(x / 30 * GCJ_PI)) * 2 / 3;
  return value;
};

const gcj02ToWgs84 = (lon, lat) => {
  if (isOutsideChina(lon, lat)) return { lon, lat };
  let dLat = transformGcjLat(lon - 105, lat - 35);
  let dLon = transformGcjLon(lon - 105, lat - 35);
  const radLat = lat / 180 * GCJ_PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = dLat * 180 / ((GCJ_AXIS * (1 - GCJ_EE)) / (magic * sqrtMagic) * GCJ_PI);
  dLon = dLon * 180 / (GCJ_AXIS / sqrtMagic * Math.cos(radLat) * GCJ_PI);
  const gcjLon = lon + dLon;
  const gcjLat = lat + dLat;
  return { lon: lon * 2 - gcjLon, lat: lat * 2 - gcjLat };
};

const DEFAULT_MAP_CENTER = gcj02ToWgs84(117.989, 37.382);

const parseParkCoordinates = (coordinateStr) => {
  if (!coordinateStr) return null;
  const trimmed = String(coordinateStr).trim();
  
  // 1. 尝试解析 JSON 多边形边界格式 (e.g. [[117.9, 37.3], [118.0, 37.3], ...])
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length > 0) {
        const coords = arr.map(item => {
          if (Array.isArray(item) && item.length >= 2) {
            const lon = parseFloat(item[0]);
            const lat = parseFloat(item[1]);
            if (!isNaN(lon) && !isNaN(lat)) {
              return gcj02ToWgs84(lon, lat);
            }
          }
          return null;
        }).filter(item => !!item);
        
        if (coords.length > 0) {
          return { type: coords.length >= 3 ? 'polygon' : 'point', coords };
        }
      }
    } catch (e) {
      console.warn("解析多边形坐标 JSON 格式失败，尝试普通字符串兼容解析:", e);
    }
  }

  // 2. 兼容传统的 “经度,纬度” 单点坐标格式
  const parts = trimmed.split(',');
  if (parts.length === 2) {
    const lon = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    if (!isNaN(lon) && !isNaN(lat)) {
      return { type: 'point', coords: [gcj02ToWgs84(lon, lat)] };
    }
  }

  return null;
};

const parseRegionCoordinates = parseParkCoordinates;

const getCoordinatesCenter = (parsed) => {
  if (!parsed || parsed.coords.length === 0) {
    return { ...DEFAULT_MAP_CENTER };
  }
  if (parsed.type === 'point') {
    return parsed.coords[0];
  }
  
  // 计算所有顶点的平均值作为多边形几何中心
  let sumLon = 0;
  let sumLat = 0;
  parsed.coords.forEach(c => {
    sumLon += c.lon;
    sumLat += c.lat;
  });
  return {
    lon: sumLon / parsed.coords.length,
    lat: sumLat / parsed.coords.length
  };
};

const getParsedRowsCenter = (rows = []) => {
  const centers = rows
    .map(row => parseRegionCoordinates(row?.coordinate))
    .filter(Boolean)
    .map(parsed => getCoordinatesCenter(parsed));

  if (centers.length === 0) return null;

  return {
    lon: centers.reduce((sum, item) => sum + item.lon, 0) / centers.length,
    lat: centers.reduce((sum, item) => sum + item.lat, 0) / centers.length
  };
};

const getParkCenterById = (parkId) => {
  const park = parkList.value.find(p => p.parkId == parkId);
  const parkParsed = parseRegionCoordinates(park?.coordinate);
  if (parkParsed) {
    return getCoordinatesCenter(parkParsed);
  }

  const areaCenter = getParsedRowsCenter(areaList.value);
  if (areaCenter) return areaCenter;

  const locationCenter = getParsedRowsCenter(locationList.value);
  if (locationCenter) return locationCenter;

  return { ...DEFAULT_MAP_CENTER };
};

const getRegionRadius = (parsed, center) => {
  if (!Cesium || !parsed?.coords?.length) return 1400;
  const centerCartesian = Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 0);
  const maxDistance = parsed.coords.reduce((max, point) => {
    const pointCartesian = Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0);
    return Math.max(max, Cesium.Cartesian3.distance(centerCartesian, pointCartesian));
  }, 0);
  return Math.min(Math.max(maxDistance * 1.4, 900), 12000);
};

const getParkFocusById = (parkId) => {
  const park = parkList.value.find(p => p.parkId == parkId);
  const parkParsed = parseRegionCoordinates(park?.coordinate);
  if (parkParsed) {
    const center = getCoordinatesCenter(parkParsed);
    return { center, radius: getRegionRadius(parkParsed, center) };
  }

  const parsedRows = [...areaList.value, ...locationList.value]
    .map(row => parseRegionCoordinates(row?.coordinate))
    .filter(Boolean);
  if (parsedRows.length) {
    const allPoints = parsedRows.flatMap(item => item.coords || []);
    const center = getParsedRowsCenter([...areaList.value, ...locationList.value]) || getParkCenterById(parkId);
    return {
      center,
      radius: getRegionRadius({ coords: allPoints }, center)
    };
  }

  return { center: getParkCenterById(parkId), radius: 1800 };
};

const flyToParkCenter = (parkId, duration = 1.4) => {
  if (!viewer || !Cesium || !parkId) return;
  const { center, radius } = getParkFocusById(parkId);
  const target = new Cesium.BoundingSphere(
    Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 0),
    radius
  );
  viewer.camera.flyToBoundingSphere(target, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-48),
      Math.min(Math.max(radius * 2.8, 1800), 18000)
    ),
    duration
  });
};

const createRegionDescription = (title, description, actionText = '') => `
  <div style="padding: 10px; font-size: 12px; color: #f8fafc; line-height: 1.7;">
    <h4 style="margin: 0 0 6px 0; color: #34d399; font-size: 14px;">${escapeCesiumHtml(title || '未命名')}</h4>
    <div>${escapeCesiumHtml(description || '暂无说明')}</div>
    ${actionText ? `<div style="margin-top: 8px; color: #86efac; text-align: center;">${escapeCesiumHtml(actionText)}</div>` : ''}
  </div>
`;

const escapeCesiumHtml = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const getCesiumPropertyValue = (entity, key) => {
  if (!entity?.properties?.[key]) return undefined;
  const prop = entity.properties[key];
  return typeof prop.getValue === 'function' ? prop.getValue() : prop;
};

const getRegionLevelText = (level) => {
  const pureLevel = String(level || '').replace('_label', '');
  if (pureLevel === 'park') return '园区';
  if (pureLevel === 'area') return '地块';
  if (pureLevel === 'location') return '位置';
  return '区域';
};

const showRegionInfo = (entity) => {
  if (!entity?.properties) return;
  const type = getCesiumPropertyValue(entity, 'type');
  selectedRegionInfo.value = {
    level: String(type || '').replace('_label', ''),
    levelText: getCesiumPropertyValue(entity, 'levelText') || getRegionLevelText(type),
    name: getCesiumPropertyValue(entity, 'regionName') || entity.name || '未命名区域',
    description: getCesiumPropertyValue(entity, 'regionDescription') || '暂无说明'
  };
  regionInfoVisible.value = true;
};

const getTiandituImageryProviders = () => {
  const token = import.meta.env.VITE_TDT_TOKEN;
  if (!token) throw new Error('未配置 VITE_TDT_TOKEN');

  const createProvider = type => new Cesium.UrlTemplateImageryProvider({
    url: `https://t{s}.tianditu.gov.cn/DataServer?T=${type}&x={x}&y={y}&l={z}&tk=${token}`,
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    minimumLevel: 1,
    maximumLevel: 18,
    credit: '天地图'
  });

  return {
    imagery: createProvider('img_w'),
    labels: createProvider('cia_w')
  };
};

const loadObliqueTileset = async () => {
  if (!viewer || !Cesium?.Cesium3DTileset || obliqueTileset) return;

  const baseApi = String(import.meta.env.VITE_APP_BASE_API || '').replace(/\/$/, '');
  const tilesetUrl = `${baseApi}/profile/sanwei/models/pc/0/terra_b3dms/tileset.json`;

  try {
    const options = {
      // 先快速显示低层级瓦片，首屏稳定后再自动恢复清晰度。
      maximumScreenSpaceError: 5,
      dynamicScreenSpaceError: true,
      skipLevelOfDetail: true,
      baseScreenSpaceError: 1024,
      skipScreenSpaceErrorFactor: 16,
      skipLevels: 2,
      immediatelyLoadDesiredLevelOfDetail: false,
      loadSiblings: false,
      cullWithChildrenBounds: true,
      cullRequestsWhileMoving: true,
      cullRequestsWhileMovingMultiplier: 60,
      foveatedScreenSpaceError: true,
      foveatedConeSize: 0.2,
      progressiveResolutionHeightFraction: 0.2,
      preloadFlightDestinations: false,
      preloadWhenHidden: false,
      preferLeaves: false,
      cacheBytes: 384 * 1024 * 1024,
      maximumCacheOverflowBytes: 128 * 1024 * 1024
    };

    obliqueTileset = typeof Cesium.Cesium3DTileset.fromUrl === 'function'
      ? await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, options)
      : new Cesium.Cesium3DTileset({ url: tilesetUrl, ...options });

    obliqueTileset.maximumMemoryUsage = 512;
    viewer.scene.primitives.add(obliqueTileset);
    if (obliqueTileset.readyPromise) await obliqueTileset.readyPromise;

    const refineTileset = () => {
      if (obliqueTileset) obliqueTileset.maximumScreenSpaceError = 2.5;
    };
    if (obliqueTileset.initialTilesLoaded) {
      obliqueTileset.initialTilesLoaded.addEventListener(refineTileset);
    }
    obliqueRefineTimer = setTimeout(() => {
      obliqueRefineTimer = null;
      refineTileset();
    }, 2500);
    focusObliqueTilesetOnce();
    console.info('倾斜摄影瓦片已加载:', tilesetUrl);
  } catch (error) {
    obliqueTileset = null;
    console.error('倾斜摄影瓦片加载失败:', tilesetUrl, error);
  }
};

const scheduleObliqueTilesetLoad = () => {
  if (obliqueTileset || obliqueLoadTimer) return;
  obliqueLoadTimer = setTimeout(() => {
    obliqueLoadTimer = null;
    loadObliqueTileset();
  }, 900);
};

const focusObliqueTilesetOnce = () => {
  if (hasFocusedObliqueTileset || !viewer || !Cesium || !obliqueTileset?.boundingSphere) return;
  hasFocusedObliqueTileset = true;

  const radius = obliqueTileset.boundingSphere.radius || 260;
  viewer.camera.flyToBoundingSphere(obliqueTileset.boundingSphere, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(18),
      Cesium.Math.toRadians(-42),
      Math.max(radius * 1.8, 260)
    ),
    duration: 1.4
  });
};

const initCesium = async () => {
  if (viewer) return;
  if (!Cesium) {
    mapError.value = "三维地图引擎未成功载入 (Cesium 未定义，请检查网络是否能访问 CDN)";
    return;
  }

  try {
    // 设置用户申请的 Cesium ion Access Token
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNTFjZWYxNC02OGUyLTRhY2YtODM3MC1mNTIzZjdmNzQ4M2YiLCJpZCI6NDUwNTU5LCJzdWIiOiJ3YW55aTY2NiIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiLmu6jlt57mnqPnp43mpI3nmoTlubPlj7AiLCJpYXQiOjE3ODI3ODE0NzJ9.X7kqw3uk1IiwPI8F976qnA-QqbxksIXSi_6xxD0SIAU';

    const options = {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false,
      skyBox: false,
      skyAtmosphere: false,
      contextOptions: {
        webgl: { preserveDrawingBuffer: false }
      }
    };

    let tiandituLabelsProvider = null;
    // 天地图影像和中文注记分别叠加，坐标系与 Cesium 的 WGS84 地球一致。
    try {
      const providers = getTiandituImageryProviders();
      options.imageryProvider = providers.imagery;
      if (Cesium.ImageryLayer) {
        options.baseLayer = new Cesium.ImageryLayer(providers.imagery);
      }
      tiandituLabelsProvider = providers.labels;
    } catch (e) {
      console.warn('加载天地图失败，将使用 Cesium 默认底图:', e);
    }

    // 倾斜摄影瓦片自带场景高程，使用椭球地形避免额外请求 Cesium ion 地形服务。
    options.terrainProvider = new Cesium.EllipsoidTerrainProvider();

    viewer = new Cesium.Viewer('cesiumContainer', options);
    // 首屏按 CSS 像素渲染，避免高 DPI 设备放大 WebGL 和瓦片解码开销。
    viewer.resolutionScale = 1;
    // 标注不阻塞底图首屏，稍后叠加中文名称。
    scheduleObliqueTilesetLoad();
    if (tiandituLabelsProvider) {
      tiandituLabelsTimer = setTimeout(() => {
        tiandituLabelsTimer = null;
        if (viewer && !viewer.isDestroyed()) {
          viewer.imageryLayers.addImageryProvider(tiandituLabelsProvider);
        }
      }, 300);
    }

    // 美化地图：科技感深蓝滤镜背景
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#080d19');
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#eafaf0');
    
    // 禁用光照防止变黑
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.maximumScreenSpaceError = 4;
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.fog.enabled = false;
    viewer.scene.postProcessStages.fxaa.enabled = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 15;

    // 去除 Cesium 版权图标水印
    const creditContainer = viewer.bottomContainer;
    if (creditContainer) {
      creditContainer.style.display = 'none';
    }

    // 初始化地图点击与悬浮选择事件处理器 (用于在 3D 地球上直接交互点选切换园区)
    if (clickHandler) {
      clickHandler.destroy();
    }
    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // 监听左键点击，跳转对应的园区
    clickHandler.setInputAction((clickEvent) => {
      const pickedObject = viewer.scene.pick(clickEvent.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id;
        if (entity.properties) {
          const type = entity.properties.type?.getValue();
          const parkId = entity.properties.parkId?.getValue();
          if (type === 'park' || type === 'park_label' || type === 'area' || type === 'area_label' || type === 'location' || type === 'location_label') {
            showRegionInfo(entity);
          }
          if ((type === 'park' || type === 'park_label') && parkId) {
            if (activeParkId.value != parkId) {
              activeParkId.value = parkId;
              loadParkData(parkId);
            }
          } else if (type === 'area' || type === 'area_label' || type === 'location' || type === 'location_label') {
            const lon = entity.properties.centerLon?.getValue();
            const lat = entity.properties.centerLat?.getValue();
            if (lon !== undefined && lon !== null && lat !== undefined && lat !== null) {
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(Number(lon), Number(lat), type.startsWith('location') ? 900 : 1600),
                orientation: {
                  heading: Cesium.Math.toRadians(0.0),
                  pitch: Cesium.Math.toRadians(-42.0),
                  roll: 0.0
                },
                duration: 1.2
              });
            }
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 监听鼠标悬浮移动，改变鼠标形状
    clickHandler.setInputAction((moveEvent) => {
      const pickedObject = viewer.scene.pick(moveEvent.endPosition);
      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
        const type = pickedObject.id.properties.type?.getValue();
        if (type === 'park' || type === 'park_label' || type === 'area' || type === 'area_label' || type === 'location' || type === 'location_label') {
          viewer.scene.canvas.style.cursor = 'pointer';
          return;
        }
      }
      viewer.scene.canvas.style.cursor = 'default';
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  } catch (error) {
    console.error("WebGL or Cesium initialization failed:", error);
    mapError.value = `三维渲染故障: ${error.message || '浏览器不支持 WebGL 或显卡驱动不兼容'}`;
  }
};

// 庄园切换时更新地图焦点并打点
function addRegionEntity({ row, parsed, level, name, description, active = false, entityStore, parkId, areaId }) {
  if (!viewer || !Cesium || !parsed) return null;
  const center = getCoordinatesCenter(parsed);
  const styleMap = {
    park: {
      outline: active ? '#ff6b6b' : '#ef4444',
      point: active ? '#ff6b6b' : '#ef4444',
      label: active ? '#fecaca' : '#fee2e2',
      height: 12,
      labelHeight: 70,
      pointSize: active ? 18 : 13,
      font: active ? 'bold 13px sans-serif' : '11px sans-serif'
    },
    area: {
      outline: '#facc15',
      point: '#facc15',
      label: '#fef08a',
      height: 26,
      labelHeight: 96,
      pointSize: 11,
      font: '11px sans-serif'
    },
    location: {
      outline: '#3b82f6',
      point: '#3b82f6',
      label: '#bfdbfe',
      height: 42,
      labelHeight: 122,
      pointSize: 9,
      font: '10px sans-serif'
    }
  };
  const meta = styleMap[level] || styleMap.park;
  const pulseStart = Date.now() + Math.random() * 1200;
  const pulseProgress = () => ((Date.now() - pulseStart) % 2400 + 2400) % 2400 / 2400;
  const pulseWave = () => (Math.sin(pulseProgress() * Math.PI * 2) + 1) / 2;
  const pulsePoint = {
    pixelSize: new Cesium.CallbackProperty(() => meta.pointSize + pulseWave() * (active ? 12 : 8), false),
    color: new Cesium.CallbackProperty(() => {
      const alpha = 0.82 + pulseWave() * 0.18;
      return Cesium.Color.fromCssColorString(meta.point).withAlpha(alpha);
    }, false),
    outlineColor: Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.92),
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  };
  const typeName = level === 'park' ? '园区' : level === 'area' ? '地块' : '位置';
  const levelText = getRegionLevelText(level);
  const regionDescription = description || row?.parkCode || row?.areaCode || row?.locationCode || '暂无说明';
  const entityProps = {
    type: level,
    parkId,
    areaId,
    centerLon: center.lon,
    centerLat: center.lat,
    regionName: name,
    regionDescription,
    levelText
  };

  let entity = null;
  if (parsed.type === 'polygon' && parsed.coords.length >= 3) {
    const degreesArray = [];
    [...parsed.coords, parsed.coords[0]].forEach(c => degreesArray.push(c.lon, c.lat));
    entity = viewer.entities.add({
      name,
      description: createRegionDescription(`${typeName}：${name}`, regionDescription, level === 'park' ? '点击切换到该园区' : '点击定位到该区域'),
      properties: entityProps,
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(degreesArray),
        material: Cesium.Color.fromCssColorString(meta.outline),
        width: level === 'park' && active ? 4 : 2,
        clampToGround: true
      }
    });
  } else {
    entity = viewer.entities.add({
      name,
      description: createRegionDescription(`${typeName}：${name}`, regionDescription, level === 'park' ? '点击切换到该园区' : '点击定位到该位置'),
      position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, meta.height),
      properties: entityProps,
      point: pulsePoint
    });
  }

  if (entity) {
    entityStore.push(entity);
    if (parsed.type === 'polygon' && parsed.coords.length >= 3) {
      const pulseEntity = viewer.entities.add({
        name: `${name}-pulse`,
        position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, meta.height + 18),
        properties: entityProps,
        point: {
          ...pulsePoint,
          pixelSize: new Cesium.CallbackProperty(() => meta.pointSize + 8 + pulseWave() * (active ? 12 : 8), false)
        }
      });
      const pulseRingEntity = viewer.entities.add({
        name: `${name}-pulse-ring`,
        position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 0),
        properties: entityProps,
        ellipse: {
          height: 0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          semiMajorAxis: new Cesium.CallbackProperty(() => {
            const wave = pulseWave();
            return 18 + wave * (active ? 62 : 44);
          }, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => {
            const wave = pulseWave();
            return 18 + wave * (active ? 62 : 44);
          }, false),
          material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(meta.point).withAlpha(0.08)),
          outline: true,
          outlineColor: new Cesium.CallbackProperty(() => {
            return Cesium.Color.fromCssColorString(meta.point).withAlpha(0.28 + (1 - pulseWave()) * 0.48);
          }, false),
          outlineWidth: 2
        }
      });
      entityStore.push(pulseEntity);
      entityStore.push(pulseRingEntity);
    }
    const labelEntity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, meta.labelHeight),
      properties: {
        ...entityProps,
        type: `${level}_label`
      },
      label: {
        text: level === 'park' && active ? `★ ${name}` : name,
        font: meta.font,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.fromCssColorString(meta.label),
        outlineColor: Cesium.Color.fromCssColorString('#020617'),
        outlineWidth: 4,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    entityStore.push(labelEntity);
  }

  return { entity, center };
}

// 庄园切换时更新地图焦点并打点
const updateMapPosition = () => {
  if (!viewer) return;

  // 如果正在旋转，先关闭旋转，恢复自由视角状态，避免视角冲突
  if (isRotating.value) {
    isRotating.value = false;
    if (rotationRemoveCallback) {
      rotationRemoveCallback();
      rotationRemoveCallback = null;
    }
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }

  // 1. 清除旧点位与旧园区绘制实体
  areaEntities.forEach(ent => viewer.entities.remove(ent));
  areaEntities = [];

  parkEntities.forEach(ent => viewer.entities.remove(ent));
  parkEntities = [];

  const activePark = parkList.value.find(p => p.parkId == activeParkId.value);

  // 2. 绘制所有园区边界或单点，并放置名称标签
  parkList.value.forEach(p => {
    const parsed = parseRegionCoordinates(p.coordinate);
    if (!parsed) return;

    const isCurrentActive = (p.parkId == activeParkId.value);
    addRegionEntity({
      row: p,
      parsed,
      level: 'park',
      name: p.parkName || '未命名园区',
      description: p.parkCode,
      active: isCurrentActive,
      entityStore: parkEntities,
      parkId: p.parkId
    });
  });

  // 3. 将视角平滑飞入定位到当前选中的园区中心
  if (activePark) {
    flyToParkCenter(activeParkId.value);
  }

  // 4. 对当前选中的园区的地块、位置进行层级三维展示
  if (markersVisible.value && areaList.value.length > 0) {
    areaList.value.forEach(area => {
      const parsed = parseRegionCoordinates(area.coordinate);
      if (!parsed) return;
      addRegionEntity({
        row: area,
        parsed,
        level: 'area',
        name: area.areaName || '未命名地块',
        description: area.areaCode,
        entityStore: areaEntities,
        parkId: area.parkId || activeParkId.value,
        areaId: area.areaId
      });
    });
  }

  if (markersVisible.value && locationList.value.length > 0) {
    locationList.value.forEach(location => {
      const parsed = parseRegionCoordinates(location.coordinate);
      if (!parsed) return;
      addRegionEntity({
        row: location,
        parsed,
        level: 'location',
        name: location.locationName || '未命名位置',
        description: location.locationCode,
        entityStore: areaEntities,
        parkId: location.parkId || activeParkId.value,
        areaId: location.areaId
      });
    });
  }
};

const handleParkChange = async (parkId) => {
  activeParkId.value = parkId;
  regionInfoVisible.value = false;
  await loadParkData(parkId);
};



const resetCamera = () => {
  updateMapPosition();
};

const toggleRotation = () => {
  if (!viewer) return;
  isRotating.value = !isRotating.value;

  if (isRotating.value) {
    // 1. 获取当前选中的园区中心坐标
    const park = parkList.value.find(p => p.parkId == activeParkId.value);
    let centerLon = DEFAULT_MAP_CENTER.lon;
    let centerLat = DEFAULT_MAP_CENTER.lat;
    if (park && park.coordinate) {
      const parsed = parseRegionCoordinates(park.coordinate);
      if (parsed) {
        const center = getCoordinatesCenter(parsed);
        centerLon = center.lon;
        centerLat = center.lat;
      }
    }

    const center = Cesium.Cartesian3.fromDegrees(centerLon, centerLat);
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);

    // 获取当前相机的航向角 (heading)、俯仰角 (pitch) 以及相机与目标的距离 (range)
    const currentHeading = viewer.camera.heading;
    const currentPitch = viewer.camera.pitch;
    const currentRange = Cesium.Cartesian3.distance(viewer.camera.position, center);

    let heading = currentHeading;
    let lastTime = Date.now();

    // 旋转渲染监听
    rotationRemoveCallback = viewer.scene.postRender.addEventListener(() => {
      const now = Date.now();
      const delta = (now - lastTime) / 1000.0;
      lastTime = now;
      
      // 慢速自增偏航角 (Heading) 旋转视角，每秒旋转约 1.5 度
      heading += delta * 0.026;
      
      viewer.camera.lookAtTransform(
        transform,
        new Cesium.HeadingPitchRange(heading, currentPitch, currentRange)
      );
    });
  } else {
    if (rotationRemoveCallback) {
      rotationRemoveCallback();
      rotationRemoveCallback = null;
    }
    // 释放相机的绑定变换矩阵，恢复用户的自由交互操作
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }
};

const toggleMarkers = () => {
  markersVisible.value = !markersVisible.value;
  updateMapPosition();
};

// ========================
// AI 种植智能问答挂件逻辑
// ========================
const aiChatVisible = ref(false);
const aiInputText = ref('');
const aiLoading = ref(false);
const aiMessages = ref([]);
const chatScrollbarRef = ref(null);
const aiChatPosition = ref(null);
const aiChatDragState = ref(null);

const aiChatPanelStyle = computed(() => {
  if (!aiChatPosition.value) return {};
  return {
    left: `${aiChatPosition.value.left}px`,
    top: `${aiChatPosition.value.top}px`,
    right: 'auto',
    bottom: 'auto'
  };
});

const toggleAiChat = () => {
  aiChatVisible.value = !aiChatVisible.value;
  if (aiChatVisible.value) {
    nextTick(() => {
      ensureAiChatPosition();
      scrollToChatBottom();
    });
  }
};

function ensureAiChatPosition() {
  const panel = document.querySelector('.ai-chat-panel');
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  const position = aiChatPosition.value || { left: rect.left, top: rect.top };
  aiChatPosition.value = clampAiChatPosition(position.left, position.top);
}

function clampAiChatPosition(left, top) {
  const panel = document.querySelector('.ai-chat-panel');
  const width = panel?.offsetWidth || 380;
  const height = panel?.offsetHeight || 520;
  return {
    left: Math.min(Math.max(6, left), Math.max(6, window.innerWidth - width - 6)),
    top: Math.min(Math.max(6, top), Math.max(6, window.innerHeight - height - 6))
  };
}

function startAiChatDrag(event) {
  if (event.button !== 0) return;
  const panel = event.currentTarget?.closest?.('.ai-chat-panel');
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  aiChatPosition.value = { left: rect.left, top: rect.top };
  aiChatDragState.value = {
    startX: event.clientX,
    startY: event.clientY,
    startLeft: rect.left,
    startTop: rect.top
  };
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', handleAiChatDrag);
  document.addEventListener('mouseup', stopAiChatDrag);
}

function handleAiChatDrag(event) {
  if (!aiChatDragState.value) return;
  const left = aiChatDragState.value.startLeft + event.clientX - aiChatDragState.value.startX;
  const top = aiChatDragState.value.startTop + event.clientY - aiChatDragState.value.startY;
  aiChatPosition.value = clampAiChatPosition(left, top);
}

function stopAiChatDrag() {
  aiChatDragState.value = null;
  document.body.style.userSelect = '';
  document.removeEventListener('mousemove', handleAiChatDrag);
  document.removeEventListener('mouseup', stopAiChatDrag);
}

const scrollToChatBottom = () => {
  if (chatScrollbarRef.value) {
    const wrap = chatScrollbarRef.value.wrapRef;
    if (wrap) {
      wrap.scrollTop = wrap.scrollHeight;
    }
  }
};

const sendAiMessage = async () => {
  const text = aiInputText.value.trim();
  if (!text || aiLoading.value) return;

  aiInputText.value = '';
  aiMessages.value.push({ role: 'user', content: text });
  aiLoading.value = true;
  
  nextTick(() => {
    scrollToChatBottom();
  });

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
      body: JSON.stringify({
        text: text,
        historyMessages: [], // 不保存历史记录
        images: []
      })
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
      buffer = lines.pop();
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
          console.error("解析流数据异常", e);
        }
      }
    }
  } catch (error) {
    aiMsg.isThinking = false;
    aiMsg.content = `发生错误: ${error.message}`;
  } finally {
    aiLoading.value = false;
    nextTick(() => {
      scrollToChatBottom();
    });
  }
};

// ========================
// 交互弹窗和格式化方法
// ========================
const showPestDetail = (pest) => {
  const raw = pest?.raw || pest || {};
  selectedPest.value = { ...raw, ...pest };
  selectedPestImageCandidates.value = Array.from(new Set([
    pest?.imageUrl,
    raw.imageUrl,
    raw.image_url,
    raw.diseaseResultImgUrl,
    raw.disease_result_img_url
  ].filter(Boolean).map(normalizeImageUrl)));
  selectedPestImageUrl.value = selectedPestImageCandidates.value.shift() || '';
  pestDialogVisible.value = true;
};

const handlePestDetailImageError = () => {
  selectedPestImageUrl.value = selectedPestImageCandidates.value.shift() || '';
};

const toPercent = (val) => {
  const num = Number(val || 0);
  if (num <= 1) return Math.round(num * 100);
  return Math.round(num);
};

const getWarningTag = (level) => {
  if (!level || level === '无') return 'success';
  if (level === '低') return 'info';
  if (level === '中') return 'warning';
  if (level === '高') return 'danger';
  return 'info';
};

const normalizeImageUrl = (url) => {
  if (!url) return '';
  const value = String(url).trim().replace(/\\/g, '/');
  if (/^(https?|data|blob):/i.test(value) || value.startsWith('//')) return value;

  const baseApi = String(import.meta.env.VITE_APP_BASE_API || '').replace(/\/$/, '');
  const addProxyPrefix = pathname => {
    const pathWithoutProxy = String(pathname || '')
      .replace(/^\/+/, '')
      .replace(/^(?:dev-api|prod-api|stage-api)(?=\/)/, '');
    const cleanPath = `/${pathWithoutProxy.replace(/^\/+/, '')}`;
    return `${baseApi}${cleanPath}`;
  };

  return addProxyPrefix(value);
};

const formatForecastDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${m}/${d} ${weekDays[date.getDay()]}`;
};

function getForecastIcon(item) {
  return item?.dayCode || item?.weatherCodeDay || item?.weatherCode || item?.iconDay || item?.icon || ''
}

const formatSimpleDate = (timeStr) => {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatTimelineDate = (timeStr) => {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<style scoped>
/* 核心容器 */
.visual-dashboard-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #020617;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Cesium 背景及其全屏科技蒙层 */
.cesium-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: #020617;
  background-image: 
    radial-gradient(circle at center, transparent 0%, #020617 85%),
    linear-gradient(rgba(52, 211, 153, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(52, 211, 153, 0.05) 1px, transparent 1px);
  background-size: 100% 100%, 40px 40px, 40px 40px;
  background-position: center;
}
.cesium-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.1) 0%, rgba(2, 6, 23, 0.5) 100%);
  pointer-events: none;
  z-index: 2;
}

/* 科技感 Select */
:deep(.cyber-select) .el-input__wrapper {
  background-color: rgba(15, 23, 42, 0.6) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset !important;
  border-radius: 6px;
}
:deep(.cyber-select) .el-input__inner {
  color: #34d399 !important;
  font-weight: bold;
}
:deep(.cyber-select-popper) {
  background-color: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px;
}
:deep(.cyber-select-popper) .el-select-dropdown__item {
  color: #94a3b8;
}
:deep(.cyber-select-popper) .el-select-dropdown__item.selected {
  color: #34d399;
  font-weight: bold;
}

.clock-display {
  display: flex;
  align-items: center;
  font-family: monospace;
  font-size: 14px;
  color: #047857;
  background: rgba(16, 185, 129, 0.15);
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

/* 大屏布局 */
.dashboard-body {
  position: absolute;
  top: 76px;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 5px;
  z-index: 5;
  pointer-events: none;
  overflow: hidden; /* 防止悬浮动画溢出导致出现垂直滚动条引起的页面抖动 */
}

/* 侧边面板通性 (深蓝科技玻璃态) */
.side-panel {
  width: 410px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;
}
.left-panel {
  margin-left: 10px;
  animation: slideInLeft 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
}
.left-panel .cyber-card:nth-child(1) {
  flex-shrink: 0;
}
.left-panel .cyber-card:nth-child(2) {
  flex-shrink: 0;
  height: 220px;
}
.left-panel .cyber-card:nth-child(3) {
  flex: 1;
  min-height: 0;
}

.right-panel {
  animation: slideInRight 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
}
.right-panel .cyber-card:nth-child(1) {
  flex: 1.2;
  min-height: 0;
}
.right-panel .cyber-card:nth-child(2) {
  flex-shrink: 0;
  height: 230px;
}
.right-panel .cyber-card:nth-child(3) {
  flex: 0.8;
  min-height: 0;
}

/* 卡片 */
.cyber-card {
  position: relative;
  background: linear-gradient(135deg, rgba(209, 250, 229, 0.8) 0%, rgba(167, 243, 208, 0.9) 100%) !important;
  backdrop-filter: blur(16px) saturate(180%);
  border: 1.5px solid rgba(4, 120, 87, 0.4) !important;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.cyber-card:hover {
  border-color: rgba(4, 120, 87, 0.7) !important;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
}



.card-header {
  padding: 12px 18px;
  border-bottom: 1px solid rgba(4, 120, 87, 0.2) !important;
  border-left: none !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, rgba(52, 211, 153, 0.25) 0%, transparent 100%);
}
.card-title {
  font-size: 15px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #064e3b;
}
.icon-accent {
  color: #047857;
}

.card-body {
  padding: 5px;
  flex: 1;
}

/* 合并版物联与天气样式 */
.iot-weather-merged {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 5px;
  padding: 5px;
}
.merged-left {
  flex: 1.15;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
  min-height: 0;
}
.merged-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}
.stat-box-mini {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 5px 2px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.stat-box-mini .stat-label {
  font-size: 10px;
  color: #334155;
}
.stat-box-mini .stat-value-mini {
  font-size: 15px;
  font-weight: 800;
  font-family: monospace;
  color: #0f172a;
}
.progress-label-mini {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #334155;
  margin-top: 5px;
  margin-bottom: 5px;
}
.cyber-progress-mini :deep(.el-progress-bar__runway) {
  background-color: rgba(0, 0, 0, 0.08) !important;
}

.merged-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 5px;
}

.merged-right {
  flex: 0.85;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 4px;
}
.merged-weather-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 2px;
}
.temp-merged {
  font-size: 22px;
  font-weight: 800;
  color: #0e7490;
  font-family: monospace;
}
.weather-text-merged {
  font-size: 12px;
  color: #0f172a;
  font-weight: bold;
}
.merged-weather-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
  margin-top: 5px;
}
.weather-item-mini {
  display: flex;
  justify-content: space-between;
}
.weather-item-mini .label {
  color: #334155;
}
.weather-item-mini .val {
  color: #0f172a;
  font-weight: bold;
}

/* 庄园统计网格 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.stat-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 800;
  font-family: monospace;
}
.stat-label {
  font-size: 12px;
  color: #64748b;
}

.text-cyan { color: #22d3ee; }
.text-emerald { color: #34d399; }
.text-amber { color: #fbbf24; }
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}
.cyber-progress :deep(.el-progress-bar__runway) {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

/* 实时天气 */
.weather-text {
  font-size: 14px;
  color: #f1f5f9;
  font-weight: bold;
}
.weather-item {
  display: flex;
  gap: 6px;
}
.weather-item .label { color: #64748b; }
.weather-item .val { color: #e2e8f0; font-weight: bold;}
.forecast-icon {
  font-size: 14px;
}
.forecast-text {
  color: #cbd5e1;
  width: 60px;
}

.cyber-nav-btn {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(52, 211, 153, 0.25) !important;
  color: #94a3b8 !important;
  transition: all 0.25s ease;
  width: 42px !important;
  height: 42px !important;
  font-size: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.cyber-nav-btn:hover {
  background: rgba(52, 211, 153, 0.15) !important;
  border-color: rgba(52, 211, 153, 0.5) !important;
  color: #34d399 !important;
  transform: scale(1.08);
}
.cyber-nav-btn.active {
  background: rgba(52, 211, 153, 0.25) !important;
  border-color: #34d399 !important;
  color: #34d399 !important;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
}

/* Standalone hover expand navigation */
.hover-nav-container {
  position: absolute;
  left: 430px;
  top: 6px;
  z-index: 100;
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  background: transparent !important;
  border: 1px solid transparent !important;
  padding: 0;
  box-shadow: none;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  max-width: 44px;
  white-space: nowrap;
  animation: slideInLeft 0.8s cubic-bezier(0.25, 1, 0.5, 1) both;
}

.hover-nav-container:hover {
  max-width: 320px;
  background: rgba(6, 18, 30, 0.75) !important;
  border: 1px solid rgba(52, 211, 153, 0.25) !important;
  padding: 6px 10px;
  border-radius: 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(52, 211, 153, 0.05);
}

.menu-trigger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34d399;
  font-size: 20px;
  cursor: pointer;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(6, 18, 30, 0.75) !important;
  border: 1px solid rgba(52, 211, 153, 0.25) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  user-select: none;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.menu-trigger-btn:hover {
  background: rgba(52, 211, 153, 0.15) !important;
  border-color: rgba(52, 211, 153, 0.5) !important;
}

.hover-nav-container:hover .menu-trigger-btn {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none;
}

.menu-trigger-icon {
  font-size: 20px;
  transition: transform 0.4s ease;
}

.hover-nav-container:hover .menu-trigger-icon {
  transform: rotate(90deg);
}

.nav-buttons-popover {
  display: flex;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: none;
  margin-left: 10px;
}

.hover-nav-container:hover .nav-buttons-popover {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

:deep(.cyber-date-picker) .el-range-input {
  color: #f1f5f9 !important;
}
:deep(.cyber-date-picker) .el-range-separator {
  color: #94a3b8 !important;
}
.alert-list-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
}
.alert-item {
  border-left: 3px solid;
  padding: 5px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 8px 8px 0;
  margin-bottom: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  transition: background 0.3s;
}
.alert-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.level-high {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.04);
}

.level-medium {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.04);
}

.alert-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.alert-time {
  font-size: 10px;
  color: #64748b;
}
.alert-content {
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
  margin: 0;
}
.alert-footer-row {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 5px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.advice-label {
  color: #10b981;
  font-weight: bold;
}
.advice-content {
  margin: 0;
  color: #a7f3d0;
}

.no-alert {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 0;
  color: #64748b;
  font-size: 13px;
  width: 100%;
}
.icon-shield {
  font-size: 32px;
  color: #10b981;
}

/* 地图控制工具栏 */

/* 虫情识别列表 */
.pest-card-body {
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.pest-list-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.disease-trend-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pest-view-tabs {
  flex-shrink: 0;
}
.pest-item {
  display: flex;
  gap: 5px;
  padding: 5px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.3s;
}
.pest-item:hover {
  background: rgba(52, 211, 153, 0.05);
  border-color: rgba(52, 211, 153, 0.2);
  transform: translateY(-2px);
}
.pest-thumbnail-wrap {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pest-img {
  width: 100%;
  height: 100%;
}
.img-placeholder {
  color: #475569;
  font-size: 20px;
}
.pest-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}
.pest-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pest-name {
  font-size: 13px;
  font-weight: bold;
  color: #f1f5f9;
}
.pest-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}

.phenology-card-body {
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: 2px !important;
}

.phenology-list-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
}

.phenology-list-item {
  display: flex;
  gap: 7px;
  padding: 5px;
  margin-bottom: 4px;
  background: rgba(6, 39, 78, 0.72);
  border: 1px solid rgba(58, 255, 189, 0.18);
  border-radius: 3px;
}

.phenology-thumbnail-wrap {
  flex: 0 0 88px;
  width: 88px;
  height: 66px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 24, 58, 0.82);
  border: 1px solid rgba(58, 255, 189, 0.2);
  border-radius: 2px;
}

.phenology-img {
  width: 100%;
  height: 100%;
}

.phenology-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.phenology-title-row,
.phenology-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.phenology-name {
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.phenology-crop {
  flex-shrink: 0;
  color: #42ffd0;
  font-size: 11px;
}

.phenology-description {
  color: rgba(234, 255, 255, 0.78);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.phenology-meta-row {
  margin-top: auto;
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
}

.phenology-trend-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.phenology-view-tabs {
  flex-shrink: 0;
}

/* ECharts 折线图 */
.trend-chart-container {
  height: 155px;
  width: 100%;
}

/* 农事指导时间轴 */
:deep(.el-timeline-item__node) {
  background-color: #3b82f6;
}
:deep(.el-timeline-item__tail) {
  border-left-color: rgba(255, 255, 255, 0.06);
}
:deep(.el-timeline-item__wrapper) {
  padding-left: 14px;
}
:deep(.el-timeline-item__timestamp) {
  color: #64748b;
  font-size: 11px;
  font-family: monospace;
}

/* 滚动条美化 */
/* 诊断弹窗 styles */
:deep(.cyber-dialog) {
  background-color: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(16px);
  border-radius: 12px;
}
:deep(.cyber-dialog) .el-dialog__title {
  color: #fff;
  font-weight: bold;
}
:deep(.cyber-dialog) .el-dialog__headerbtn .el-dialog__close {
  color: #cbd5e1;
}

/* 病虫害诊断详情弹窗重构样式 */
.pest-detail-dialog-body {
  display: flex;
  gap: 20px;
  color: #f1f5f9;
  height: 440px;
}

.pest-media-box {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pest-media-box .media-title {
  font-size: 13px;
  font-weight: bold;
  color: #34d399;
  letter-spacing: 0.5px;
}

.pest-image-viewport {
  position: relative;
  flex: 1;
  background: #020617;
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pest-main-image {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
}

/* 科幻激光扫描线 */
.laser-scanner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(180deg, rgba(52, 211, 153, 0.1) 0%, #34d399 70%, rgba(52, 211, 153, 0.1) 100%);
  box-shadow: 0 0 15px #34d399, 0 0 25px rgba(52, 211, 153, 0.5);
  animation: laserScan 3s linear infinite;
  pointer-events: none;
}

@keyframes laserScan {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}

/* 角隅科技装饰 */
.corner-decor {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 2px solid #34d399;
  pointer-events: none;
}

.corner-decor.tl { top: 6px; left: 6px; border-right: none; border-bottom: none; }
.corner-decor.tr { top: 6px; right: 6px; border-left: none; border-bottom: none; }
.corner-decor.bl { bottom: 6px; left: 6px; border-right: none; border-top: none; }
.corner-decor.br { bottom: 6px; right: 6px; border-left: none; border-top: none; }

.pest-report-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px dashed rgba(52, 211, 153, 0.15);
  padding-bottom: 12px;
}

.pest-main-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pest-main-name .name-text {
  font-size: 20px;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: 0.5px;
}

.confidence-tag {
  font-size: 11px;
  color: #34d399;
  font-weight: 600;
  background: rgba(52, 211, 153, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.alert-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.alert-status-badge.level-高 {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.alert-status-badge.level-中 {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.alert-status-badge.level-低 {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}

.alert-status-badge .pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
  animation: pulseLight 1.5s infinite;
}

@keyframes pulseLight {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}

.report-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(6, 18, 30, 0.4);
  border: 1px solid rgba(52, 211, 153, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
}

.metric-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(52, 211, 153, 0.08);
  color: #34d399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-label {
  font-size: 10px;
  color: #64748b;
}

.m-value {
  font-size: 12px;
  font-weight: bold;
  color: #cbd5e1;
}

.m-value small {
  font-size: 10px;
  font-weight: normal;
  color: #64748b;
}

.m-value.monospace {
  font-family: monospace;
}

/* 防治处置建议面板 */
.advice-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(16, 185, 129, 0.04);
  border: 1px solid rgba(16, 185, 129, 0.18);
  border-radius: 8px;
  overflow: hidden;
}

.advice-header {
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #34d399;
  font-size: 12px;
  font-weight: bold;
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
}

.advice-content-text {
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #a7f3d0;
  overflow-y: auto;
  flex: 1;
}

/* 动效 */
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.map-error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.85);
  color: #f87171;
  z-index: 10;
  padding: 20px;
  text-align: center;
}
.icon-error {
  font-size: 40px;
  color: #ef4444;
}
.error-title {
  font-size: 16px;
  font-weight: bold;
  color: #f1f5f9;
}
.error-msg {
  font-size: 12px;
  color: #94a3b8;
  max-width: 320px;
  word-break: break-all;
}
/* 智能巡检抓拍样式 */

/* 科技感 Select 迷你版 */
:deep(.cyber-select-mini) .el-input__wrapper {
  background-color: rgba(255, 255, 255, 0.03) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset !important;
  border-radius: 4px;
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
}
:deep(.cyber-select-mini) .el-input__inner {
  color: #34d399 !important;
  font-weight: bold;
  font-size: 12px;
}
:deep(.cyber-select-mini) .el-select__caret {
  font-size: 11px;
}

/* 滚动条美化扩展 */
/* 自定义 Cesium 信息悬浮窗样式 */
:deep(.cesium-infoBox) {
  background: rgba(15, 23, 42, 0.5) !important;
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}
:deep(.cesium-infoBox-title) {
  background: rgba(15, 23, 42, 0.7) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #34d399 !important;
}

/* 右上角用户下拉及个人信息弹窗样式 */

/* 下拉菜单科技绿 */

/* 科技绿弹窗内 Tabs 覆盖 */

/* 表单表项标签颜色 */

/* AI 种植智能问答挂件样式 */
.ai-chat-panel {
  position: absolute;
  bottom: 80px;
  right: 480px;
  width: 360px;
  height: 460px;
  z-index: 99;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.85) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(52, 211, 153, 0.3) !important;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  pointer-events: auto;
}

.chat-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.5);
}

.chat-panel-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
}

.chat-scrollbar {
  height: 100%;
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  flex-shrink: 0;
}

.ai-msg .avatar-wrap {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.4);
}

.user-msg .avatar-wrap {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.content-box {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #f1f5f9;
  word-break: break-all;
}

.ai-msg .content-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-top-left-radius: 2px;
  text-align: justify;
}

.user-msg .content-box {
  background: rgba(52, 211, 153, 0.15);
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-top-right-radius: 2px;
}

.thinking-text {
  color: #94a3b8;
  font-style: italic;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.thinking-text::after {
  content: '';
  width: 4px;
  height: 4px;
  background-color: #06b6d4;
  border-radius: 50%;
  animation: cyber-thinking-dot 1.2s infinite ease-in-out;
}
@keyframes cyber-thinking-dot {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.chat-panel-footer {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.95);
}

.chat-input-mini :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.03) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset !important;
}

.chat-input-mini :deep(.el-input-group__append) {
  background-color: rgba(52, 211, 153, 0.2) !important;
  border-color: rgba(52, 211, 153, 0.3) !important;
  color: #34d399 !important;
  font-weight: bold;
}

.chat-input-mini :deep(.el-input__inner) {
  color: #f1f5f9 !important;
}

/* 地图控制激活态 */

/* 预警 Tab 切换器样式 */
.alert-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.warn-tab-group {
  display: flex;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 2px;
  pointer-events: auto;
}

.warn-tab-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease-in-out;
}

.warn-tab-btn:hover {
  color: #cbd5e1;
}

.warn-tab-btn.active {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
}

.warn-count-dot {
  font-size: 9px;
  background: rgba(239, 68, 68, 0.85);
  color: #fff;
  border-radius: 10px;
  padding: 0px 4px;
  margin-left: 4px;
  font-family: monospace;
}

/* 视频监控弹窗样式 */
.monitor-dialog-content {
  display: flex;
  height: 420px;
  gap: 16px;
  color: #f1f5f9;
}

.monitor-sidebar {
  width: 240px;
  display: flex;
  flex-direction: column;
  background: rgba(6, 18, 30, 0.4);
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

.sidebar-title {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: bold;
  color: #34d399;
  border-bottom: 1px solid rgba(52, 211, 153, 0.15);
  background: rgba(52, 211, 153, 0.06);
  letter-spacing: 0.5px;
}

.monitor-list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.monitor-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(6, 18, 30, 0.3);
  border: 1px solid rgba(52, 211, 153, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.monitor-list-item:hover {
  background: rgba(52, 211, 153, 0.08);
  border-color: rgba(52, 211, 153, 0.25);
  transform: translateX(2px);
}

.monitor-list-item.active {
  background: rgba(52, 211, 153, 0.18);
  border-color: rgba(52, 211, 153, 0.5);
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.15);
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.status-indicator.offline {
  background: #64748b;
  box-shadow: none;
}

.monitor-list-item .camera-name {
  flex: 1;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.monitor-list-item.active .camera-name {
  color: #34d399;
  font-weight: bold;
}

.monitor-viewport-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

.viewport-header {
  padding: 10px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(52, 211, 153, 0.15);
  background: rgba(52, 211, 153, 0.05);
}

.viewport-title {
  font-size: 13px;
  font-weight: bold;
  color: #34d399;
}

.viewport-body {
  flex: 1;
  position: relative;
  background: #020617;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ys7-dialog-player {
  width: 100%;
  height: 100%;
}

.dialog-player-container {
  width: 100%;
  height: 100%;
}

.player-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
  pointer-events: none;
}

.icon-camera-huge {
  font-size: 48px;
  color: #334155;
}

/* 智慧农业浅绿主题覆盖 */
.visual-dashboard-container {
  background: #eafaf0;
  color: #12372a;
}

.cesium-container {
  background-color: #eafaf0;
  background-image:
    radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0) 0%, rgba(220, 252, 231, 0.18) 52%, rgba(6, 95, 70, 0.16) 100%),
    linear-gradient(rgba(22, 101, 52, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22, 101, 52, 0.06) 1px, transparent 1px);
}

.cesium-overlay {
  background:
    linear-gradient(90deg, rgba(236, 253, 245, 0.38) 0%, transparent 24%, transparent 76%, rgba(236, 253, 245, 0.38) 100%),
    radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, rgba(4, 120, 87, 0.18) 100%);
}

.clock-display {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

.cyber-card,
.ai-chat-panel,
.monitor-sidebar,
.monitor-viewport-panel,
.pest-image-viewport,
.advice-panel,
.hover-nav-container:hover,
.menu-trigger-btn,
.cyber-nav-btn,
.stat-box,
.stat-box-mini,
.alert-item,
.pest-item,
.pest-thumbnail-wrap,
.warn-tab-group,
.warn-tab-btn,
.metric-item,
.metric-icon,
.confidence-tag,
.alert-status-badge,
:deep(.cesium-infoBox),
:deep(.cyber-dialog),
:deep(.cyber-select) .el-input__wrapper,
:deep(.cyber-select-mini) .el-input__wrapper {
  border-radius: 5px !important;
}

.cyber-card {
  background: linear-gradient(145deg, rgba(248, 255, 250, 0.95) 0%, rgba(232, 250, 238, 0.93) 58%, rgba(218, 245, 228, 0.91) 100%) !important;
  border: 1px solid rgba(21, 128, 61, 0.28) !important;
  box-shadow: 0 10px 26px rgba(31, 91, 59, 0.17), 0 2px 7px rgba(31, 91, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.76);
}

.cyber-card::before {
  content: none;
}

.cyber-card:hover {
  border-color: rgba(21, 128, 61, 0.52) !important;
  box-shadow: 0 14px 32px rgba(31, 91, 59, 0.21), 0 3px 9px rgba(31, 91, 59, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.card-header {
  background: linear-gradient(90deg, rgba(187, 247, 208, 0.58) 0%, rgba(240, 253, 244, 0.18) 100%);
  border-bottom-color: rgba(21, 128, 61, 0.22) !important;
}

.card-title,
.pest-name,
.weather-text,
.weather-text-merged,
.alert-content,
.pest-main-name .name-text,
.m-value,
.monitor-list-item .camera-name {
  color: #12372a;
}

.icon-accent,
.advice-label,
.sidebar-title,
.viewport-title {
  color: #15803d;
}

.text-emerald { color: #15803d; }
.text-cyan { color: #0f766e; }
.text-amber { color: #b45309; }

.stat-box-mini,
.stat-box,
.pest-item,
.metric-item,
.monitor-list-item {
  background: rgba(255, 255, 255, 0.42);
  border-color: rgba(21, 128, 61, 0.14);
}

.stat-label,
.progress-label,
.progress-label-mini,
.alert-time,
.pest-meta-row,
.m-label,
.m-value small,
.weather-item .label,
.weather-item-mini .label,
.error-msg,
.thinking-text {
  color: #3f6212 !important;
}

.weather-item .val,
.weather-item-mini .val,
.stat-value-mini,
.forecast-text {
  color: #172554;
}

.merged-divider {
  background: rgba(21, 128, 61, 0.2);
}

.cyber-nav-btn,
.menu-trigger-btn {
  background: rgba(240, 253, 244, 0.86) !important;
  border-color: rgba(21, 128, 61, 0.36) !important;
  color: #166534 !important;
  box-shadow: 0 8px 18px rgba(22, 101, 52, 0.16);
}

.hover-nav-container:hover {
  background: rgba(240, 253, 244, 0.92) !important;
  border-color: rgba(21, 128, 61, 0.32) !important;
  box-shadow: 0 12px 30px rgba(22, 101, 52, 0.18);
}

.cyber-nav-btn:hover,
.cyber-nav-btn.active,
.menu-trigger-btn:hover {
  background: rgba(187, 247, 208, 0.72) !important;
  border-color: rgba(21, 128, 61, 0.62) !important;
  color: #065f46 !important;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.12), 0 8px 18px rgba(22, 101, 52, 0.18);
}

.alert-item {
  background: rgba(255, 255, 255, 0.46);
}

.alert-item:hover,
.pest-item:hover,
.monitor-list-item:hover,
.monitor-list-item.active {
  background: rgba(220, 252, 231, 0.72);
  border-color: rgba(21, 128, 61, 0.32);
}

.alert-footer-row,
.report-header {
  border-color: rgba(21, 128, 61, 0.18);
}

.advice-content,
.advice-content-text {
  color: #14532d;
}

.map-error-overlay,
.chat-panel-body,
.chat-panel-footer,
.viewport-body {
  background: rgba(236, 253, 245, 0.88);
}

.error-title {
  color: #12372a;
}

.pest-thumbnail-wrap,
.pest-image-viewport,
.viewport-body {
  background: rgba(236, 253, 245, 0.68);
}

.ai-chat-panel {
  background: rgba(240, 253, 244, 0.94) !important;
  border-color: rgba(21, 128, 61, 0.36) !important;
  box-shadow: 0 18px 42px rgba(22, 101, 52, 0.2);
}

.chat-panel-header,
.chat-panel-footer {
  background: rgba(220, 252, 231, 0.72);
  border-color: rgba(21, 128, 61, 0.18);
}

.content-box {
  color: #12372a;
  border-radius: 5px;
}

.ai-msg .content-box,
.user-msg .content-box {
  background: rgba(255, 255, 255, 0.58);
  border-color: rgba(21, 128, 61, 0.2);
}

.avatar-wrap {
  border-radius: 5px;
}

.warn-tab-group {
  background: rgba(255, 255, 255, 0.45);
  border-color: rgba(21, 128, 61, 0.18);
}

.warn-tab-btn {
  color: #166534;
}

.warn-tab-btn.active {
  background: rgba(187, 247, 208, 0.82);
  color: #065f46;
}

.monitor-dialog-content {
  color: #12372a;
}

.monitor-sidebar,
.monitor-viewport-panel {
  background: rgba(240, 253, 244, 0.68);
  border-color: rgba(21, 128, 61, 0.22);
}

.sidebar-title,
.viewport-header {
  background: rgba(187, 247, 208, 0.52);
  border-color: rgba(21, 128, 61, 0.18);
}

:deep(.el-timeline-item__tail) {
  border-left-color: rgba(21, 128, 61, 0.18);
}

:deep(.el-timeline-item__timestamp) {
  color: #166534;
}

:deep(.cyber-date-picker) .el-range-input,
.chat-input-mini :deep(.el-input__inner) {
  color: #12372a !important;
}

:deep(.cyber-date-picker) .el-range-separator,
:deep(.cyber-select-popper) .el-select-dropdown__item {
  color: #166534 !important;
}

:deep(.cyber-select) .el-input__wrapper,
:deep(.cyber-select-mini) .el-input__wrapper,
.chat-input-mini :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.68) !important;
  box-shadow: 0 0 0 1px rgba(21, 128, 61, 0.24) inset !important;
}

:deep(.cyber-select) .el-input__inner,
:deep(.cyber-select-mini) .el-input__inner,
.chat-input-mini :deep(.el-input-group__append) {
  color: #15803d !important;
}

:deep(.cesium-infoBox) {
  background: rgba(240, 253, 244, 0.94) !important;
  border-color: rgba(21, 128, 61, 0.28) !important;
  box-shadow: 0 18px 40px rgba(22, 101, 52, 0.22) !important;
}

:deep(.cesium-infoBox-title) {
  background: rgba(187, 247, 208, 0.82) !important;
  border-bottom-color: rgba(21, 128, 61, 0.2) !important;
  color: #065f46 !important;
}

/* ===== 简约农业大屏最终视觉覆盖 ===== */
.clock-display {
  height: 30px;
  padding: 0 11px;
  color: #334155;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.24);
  box-shadow: none;
}

.dashboard-body {
  top: 60px;
  padding: 6px;
}

.side-panel {
  width: clamp(360px, 23vw, 390px);
  gap: 6px;
}

.left-panel {
  margin-left: 0;
}

.left-panel .cyber-card:nth-child(1) {
  flex: 0 0 126px;
}

.left-panel .cyber-card:nth-child(2) {
  flex: 0 0 190px;
  height: auto;
}

.left-panel .cyber-card:nth-child(3) {
  flex: 1 1 0;
  min-height: 0;
}

.right-panel .cyber-card:nth-child(1) {
  flex: 1 1 0;
  min-height: 0;
}

.right-panel .cyber-card:nth-child(2) {
  flex: 0 0 188px;
  height: auto;
}

.right-panel .cyber-card:nth-child(3) {
  flex: 1 1 0;
  min-height: 0;
}

.cyber-card,
.ai-chat-panel,
.monitor-sidebar,
.monitor-viewport-panel {
  background: rgba(248, 250, 252, 0.88) !important;
  border: 1px solid rgba(203, 213, 225, 0.78) !important;
  border-radius: 5px !important;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(10px);
  color: #1e293b;
}

.cyber-card:hover {
  transform: none;
  border-color: rgba(148, 163, 184, 0.9) !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.cyber-card::before,
.cyber-card::after {
  content: none !important;
}

.card-header {
  min-height: 32px;
  padding: 6px 9px;
  background: rgba(241, 245, 249, 0.74) !important;
  border-bottom: 1px solid rgba(203, 213, 225, 0.62) !important;
}

.card-title {
  gap: 6px;
  font-size: 13px;
  line-height: 1.2;
  color: #1e293b;
  font-weight: 700;
}

.icon-accent {
  color: #2f6f73 !important;
}

.update-time {
  font-size: 11px;
  color: #2f6f73 !important;
}

.card-body {
  padding: 6px;
  min-height: 0;
  overflow: hidden;
}

.iot-weather-merged {
  gap: 6px;
  padding: 6px;
}

.stat-box-mini {
  padding: 5px 4px;
  gap: 3px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 5px;
}

.stat-value-mini {
  font-size: 16px;
  color: #1e293b !important;
}

.progress-label-mini {
  margin: 4px 0 2px;
  color: #64748b;
}

.merged-weather-main {
  gap: 4px;
}

.temp-merged {
  font-size: 23px;
  color: #2563eb;
}

.weather-text-merged,
.weather-item-mini .val,
.stat-label {
  color: #1e293b;
}

.weather-item-mini .label {
  color: #64748b;
}

.merged-weather-details {
  gap: 4px;
}

.trend-chart-container {
  height: 150px;
}

.pest-item,
.alert-item {
  margin-bottom: 0;
  padding: 6px;
  background: rgba(255, 255, 255, 0.86) !important;
  border: 1px solid rgba(226, 232, 240, 0.95) !important;
  border-radius: 5px !important;
  box-shadow: none !important;
}

.pest-item:hover,
.alert-item:hover {
  transform: none;
  background: rgba(248, 250, 252, 0.98) !important;
  border-color: rgba(148, 163, 184, 0.8) !important;
}

.pest-thumbnail-wrap {
  width: 50px;
  height: 50px;
  background: #f1f5f9;
}

.pest-name {
  font-size: 12px;
  color: #1e293b !important;
}

.pest-meta-row,
.alert-content {
  font-size: 11px;
  color: #475569 !important;
}

.alert-card-header {
  gap: 5px;
}

.warn-tab-group {
  gap: 3px;
  padding: 2px;
  background: rgba(226, 232, 240, 0.7);
  border: 1px solid rgba(203, 213, 225, 0.72);
  border-radius: 5px;
}

.warn-tab-btn {
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  color: #475569;
  background: transparent;
  border-radius: 4px;
}

.warn-tab-btn.active {
  color: #fff;
  background: #2f6f73;
  box-shadow: none;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alert-item {
  border-radius: 5px !important;
  border: 1px solid rgba(226, 232, 240, 0.95) !important;
  background: rgba(255, 255, 255, 0.9) !important;
  box-shadow: none;
}

.alert-item {
  margin: 0 !important;
  border-left: 3px solid #94a3b8 !important;
}

.alert-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.alert-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e293b;
  font-weight: 700;
}

.alert-time {
  flex-shrink: 0;
  color: #64748b;
  font-size: 11px;
}

.alert-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  color: #475569;
  font-size: 11px;
  line-height: 1.3;
}

.alert-meta-row span {
  min-width: 0;
  max-width: 100%;
  padding: 2px 5px;
  border-radius: 5px;
  background: #f1f5f9;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.alert-field-chip {
  max-width: 100%;
  padding: 2px 5px;
  border-radius: 5px;
  color: #334155;
  font-size: 11px;
  line-height: 1.35;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-content,
.advice-content {
  margin: 4px 0 0;
  color: #334155 !important;
  font-size: 11px;
  line-height: 1.45;
  white-space: normal;
  overflow: visible;
  display: block;
}

.alert-footer-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 4px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #e2e8f0;
}

.advice-label {
  color: #2f6f73;
  font-size: 11px;
  font-weight: 700;
}

.level-high {
  border-left-color: #ef4444 !important;
  background: rgba(255, 255, 255, 0.92) !important;
}

.level-medium {
  border-left-color: #f59e0b !important;
  background: rgba(255, 255, 255, 0.92) !important;
}

.no-alert {
  min-height: 130px;
  color: #64748b;
}

.icon-shield {
  color: #2f6f73;
}

.hover-nav-container {
  left: calc(clamp(360px, 23vw, 390px) + 12px);
  top: 6px;
}

.hover-nav-container:hover {
  padding: 5px 8px;
  background: rgba(248, 250, 252, 0.94) !important;
  border-color: rgba(203, 213, 225, 0.9) !important;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
}

.nav-buttons-popover {
  gap: 8px;
}

.menu-trigger-btn,
.cyber-nav-btn {
  color: #334155 !important;
  background: rgba(248, 250, 252, 0.94) !important;
  border: 1px solid rgba(203, 213, 225, 0.9) !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
}

.cyber-nav-btn:hover,
.cyber-nav-btn.active {
  color: #fff !important;
  background: #2f6f73 !important;
  border-color: #2f6f73 !important;
  transform: none;
}

.ai-chat-panel {
  right: calc(clamp(360px, 23vw, 390px) + 14px);
  bottom: 6px;
  width: 360px;
  height: 450px;
}

@media (max-width: 1400px) {
  .side-panel {
    width: 350px;
  }

  .hover-nav-container {
    left: 360px;
  }

  .ai-chat-panel {
    right: 365px;
  }
}

/* ===== 遥感大屏绿色主题覆盖：参考图风格 ===== */
.visual-dashboard-container {
  background: #031533;
  color: #d9fff2;
}

.cesium-container {
  background-color: #061a36;
  filter: saturate(1.08) contrast(1.04);
}

.cesium-overlay {
  background:
    linear-gradient(90deg, rgba(5, 22, 57, 0.72) 0%, rgba(5, 22, 57, 0.2) 24%, rgba(5, 22, 57, 0.08) 48%, rgba(5, 22, 57, 0.2) 76%, rgba(5, 22, 57, 0.72) 100%),
    radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.08) 0%, rgba(5, 22, 57, 0.12) 40%, rgba(2, 6, 23, 0.48) 100%);
}

.dashboard-body {
  top: 64px;
  padding: 6px;
}

.side-panel {
  width: clamp(365px, 24vw, 415px);
  gap: 6px;
}

.left-panel,
.right-panel {
  margin: 0;
}

.left-panel .cyber-card:nth-child(1) {
  flex: 0 0 286px;
}

.left-panel .cyber-card:nth-child(2) {
  flex: 0 0 214px;
}

.left-panel .cyber-card:nth-child(3),
.right-panel .cyber-card:nth-child(1),
.right-panel .cyber-card:nth-child(3) {
  flex: 1 1 0;
  min-height: 0;
}

.right-panel .cyber-card:nth-child(2) {
  flex: 0 0 190px;
}

.cyber-card,
.ai-chat-panel,
.monitor-sidebar,
.monitor-viewport-panel {
  background:
    linear-gradient(180deg, rgba(8, 41, 91, 0.72), rgba(5, 28, 69, 0.62)) !important;
  border: 1px solid rgba(26, 255, 219, 0.42) !important;
  border-radius: 0 !important;
  box-shadow:
    inset 0 0 22px rgba(29, 255, 204, 0.08),
    0 0 18px rgba(0, 229, 255, 0.12);
  backdrop-filter: blur(2px);
  color: #d9fff2;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px));
}

.cyber-card:hover {
  transform: none;
  border-color: rgba(32, 255, 229, 0.72) !important;
  box-shadow:
    inset 0 0 26px rgba(29, 255, 204, 0.12),
    0 0 20px rgba(0, 229, 255, 0.18);
}

.card-header {
  min-height: 31px;
  padding: 5px 18px 5px 9px;
  background:
    linear-gradient(90deg, rgba(21, 255, 213, 0.28), rgba(21, 255, 213, 0.08) 72%, transparent) !important;
  border-bottom: 1px solid rgba(20, 255, 224, 0.38) !important;
  position: relative;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 100%, 0 100%);
}

.card-title {
  color: #dfffee;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
  text-shadow: 0 0 8px rgba(24, 255, 224, 0.42);
}

.icon-accent,
.update-time {
  color: #22ffcf !important;
}

.card-body {
  padding: 6px;
  min-height: 0;
}

.iot-weather-merged {
  gap: 6px;
  padding: 6px;
  align-items: stretch;
}

.merged-divider {
  background: linear-gradient(180deg, transparent, rgba(24, 255, 224, 0.48), transparent);
}

.merged-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 6px;
  min-height: 0;
}

.merged-right {
  flex: 0 0 188px;
  min-width: 0;
  padding-left: 4px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-self: stretch;
  min-height: 0;
}

.device-type-overview {
  margin-top: 6px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
}

.device-type-overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #cbd5e1;
}

.device-type-overview-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 124px;
  gap: 8px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.device-type-chart {
  width: 100%;
  height: 118px;
  min-height: 118px;
}

.merged-weather-main {
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  margin-top: 0;
  min-width: 0;
}

.weather-code-icon {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #26ffe6;
  font-size: 29px;
  text-shadow: 0 0 10px rgba(38, 255, 230, 0.6);
}

.weather-main-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.temp-merged {
  font-size: 19px !important;
  line-height: 1;
  white-space: nowrap;
}

.weather-text-merged {
  max-width: 94px;
  font-size: 11px;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.merged-weather-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 8px;
  margin-top: 5px;
  font-size: 11px;
  align-content: start;
}

.weather-item-mini {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.weather-item-mini .label,
.weather-item-mini .val {
  min-width: 0;
  white-space: nowrap;
}

.weather-item-mini .val {
  overflow: hidden;
  text-overflow: ellipsis;
}

.forecast-mini-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
}

.forecast-mini-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  grid-template-rows: auto;
  align-items: center;
  gap: 4px 6px;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(8, 29, 54, 0.34);
  border: 1px solid rgba(20, 255, 224, 0.16);
}

.forecast-weather-line {
  grid-column: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.forecast-date,
.forecast-text,
.forecast-temp {
  min-width: 0;
  overflow: visible;
  text-overflow: clip;
}

.forecast-date,
.forecast-temp {
  color: rgba(226, 232, 240, 0.82);
  font-size: 10px;
}

.forecast-date {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  white-space: nowrap;
}

.forecast-icon {
  flex: 0 0 auto;
}

.forecast-text {
  flex: 1;
  color: #e2f7ff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.forecast-icon {
  color: #39ffbf;
  font-size: 16px;
  line-height: 1;
  text-align: center;
  filter: drop-shadow(0 0 4px rgba(57, 255, 191, 0.2));
}

.forecast-temp {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  align-self: center;
  white-space: nowrap;
  color: #ffffff;
}

.stat-box-mini,
.pest-item,
.alert-item,
.metric-item,
.monitor-list-item {
  background: rgba(8, 47, 98, 0.46) !important;
  border: 1px solid rgba(20, 255, 224, 0.22) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 0 16px rgba(20, 255, 224, 0.04) !important;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.stat-box-mini:hover,
.pest-item:hover,
.alert-item:hover {
  background: rgba(9, 64, 118, 0.56) !important;
  border-color: rgba(20, 255, 224, 0.48) !important;
}

.stat-label,
.weather-item-mini .label,
.progress-label-mini,
.pest-meta-row,
.alert-meta-row,
.alert-time,
.alert-content {
  color: rgba(216, 255, 245, 0.78) !important;
}

.stat-value-mini,
.temp-merged,
.weather-text-merged,
.weather-item-mini .val,
.pest-name,
.alert-title,
.advice-content {
  color: #eaffff !important;
}

.text-cyan,
.text-emerald,
.temp-merged {
  color: #26ffe6 !important;
  text-shadow: 0 0 10px rgba(38, 255, 230, 0.45);
}

.text-amber {
  color: #ffc857 !important;
  text-shadow: 0 0 8px rgba(255, 200, 87, 0.42);
}

.cyber-progress-mini :deep(.el-progress-bar__runway) {
  background: rgba(0, 20, 52, 0.72) !important;
}

.cyber-progress-mini :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #22c55e, #21ffe2) !important;
  box-shadow: 0 0 10px rgba(33, 255, 226, 0.55);
}

.trend-chart-container {
  height: 156px;
}

.alert-list-wrapper,
.pest-list-wrapper {
  padding: 6px;
  overflow-y: auto !important;
  min-height: 0;
}

.alert-list {
  gap: 6px;
}

.alert-item {
  border-left: 3px solid #18ffe0 !important;
}

.level-high {
  border-left-color: #ff5f6d !important;
}

.level-medium {
  border-left-color: #ffc857 !important;
}

.alert-meta-row span,
.alert-field-chip {
  background: rgba(10, 72, 123, 0.62) !important;
  border: 1px solid rgba(20, 255, 224, 0.18) !important;
  color: rgba(232, 255, 250, 0.88) !important;
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

.alert-footer-row {
  border-top: 1px dashed rgba(20, 255, 224, 0.26);
}

.advice-label {
  color: #35ffa7;
}

.warn-tab-group {
  background: rgba(0, 22, 58, 0.56);
  border: 1px solid rgba(20, 255, 224, 0.28);
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.warn-tab-btn {
  color: rgba(216, 255, 245, 0.76);
  border-radius: 0;
}

.warn-tab-btn.active {
  color: #00172f;
  background: linear-gradient(90deg, #35ffa7, #18ffe0);
  box-shadow: 0 0 10px rgba(24, 255, 224, 0.42);
}

.warn-count-dot {
  background: rgba(0, 22, 58, 0.42);
  color: #fff;
}

.pest-thumbnail-wrap {
  background: rgba(0, 24, 64, 0.72);
  border: 1px solid rgba(20, 255, 224, 0.2);
  border-radius: 2px;
}

:deep(.cyber-select-mini) .el-input__wrapper,
:deep(.cyber-select) .el-input__wrapper {
  background: rgba(0, 33, 78, 0.76) !important;
  box-shadow: 0 0 0 1px rgba(20, 255, 224, 0.42) inset !important;
  border-radius: 2px;
}

:deep(.cyber-select-mini) .el-input__inner,
:deep(.cyber-select) .el-input__inner {
  color: #dffff8 !important;
}

.hover-nav-container {
  left: calc(clamp(365px, 24vw, 415px) + 10px);
  top: 6px;
}

.hover-nav-container:hover {
  background: rgba(5, 31, 76, 0.84) !important;
  border-color: rgba(20, 255, 224, 0.45) !important;
  box-shadow: 0 0 18px rgba(20, 255, 224, 0.18);
}

.menu-trigger-btn,
.cyber-nav-btn {
  color: #18ffe0 !important;
  background: rgba(5, 31, 76, 0.84) !important;
  border: 1px solid rgba(20, 255, 224, 0.38) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 12px rgba(20, 255, 224, 0.16);
}

.cyber-nav-btn:hover,
.cyber-nav-btn.active {
  color: #00172f !important;
  background: linear-gradient(180deg, #35ffa7, #18ffe0) !important;
  border-color: rgba(20, 255, 224, 0.8) !important;
  transform: none;
}

@media (max-width: 1400px) {
  .side-panel {
    width: 360px;
  }

  .hover-nav-container {
    left: 370px;
  }

  .main-title {
    font-size: 24px;
  }
}

/* ===== 最终视觉修正：顶部改成参考图的“中间标题板 + 两侧横翼”结构 ===== */
.dashboard-header::before,
.dashboard-header::after,
.cyber-card::before,
.cyber-card::after,
.card-header::before,
.card-header::after {
  content: none !important;
  display: none !important;
}

.dashboard-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  padding: 0;
  background: transparent !important;
  border-bottom: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  overflow: visible;
  pointer-events: none;
  z-index: 10;
}

.header-shell {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: min(1240px, calc(100% - 340px));
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  pointer-events: none;
  z-index: 2;
}

.header-wing {
  position: relative;
  display: block;
  flex: 1 1 0;
  max-width: 360px;
  height: 18px;
  margin-top: -14px;
  background: rgba(8, 74, 92, 0.82);
  border: 1px solid rgba(42, 226, 206, 0.22);
  box-shadow: inset 0 -2px 0 rgba(18, 211, 200, 0.18);
}

.header-wing::after {
  content: "";
  position: absolute;
  top: 22px;
  width: 72%;
  height: 5px;
  background: rgba(22, 214, 190, 0.3);
  box-shadow: none;
}

.header-wing-left {
  clip-path: polygon(18px 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%, 14px 50%);
}

.header-wing-left::after {
  right: 18px;
  clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%);
}

.header-wing-right {
  clip-path: polygon(22px 0, calc(100% - 18px) 0, calc(100% - 14px) 50%, 100% 100%, 22px 100%, 0 50%);
}

.header-wing-right::after {
  left: 18px;
  clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%);
}

.title-group {
  position: relative;
  flex: 0 0 auto;
  min-width: 520px;
  width: auto;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 28px 3px;
  background: rgba(7, 55, 99, 0.96);
  border: 1px solid rgba(59, 228, 219, 0.22);
  clip-path: polygon(0 0, 100% 0, calc(100% - 16px) 100%, 16px 100%);
  box-shadow: none;
}

.title-group::before {
  content: none !important;
  display: none !important;
}

.cyber-card,
.ai-chat-panel,
.monitor-sidebar,
.monitor-viewport-panel,
.stat-box-mini,
.pest-item,
.alert-item,
.metric-item,
.monitor-list-item,
.alert-meta-row span,
.alert-field-chip,
.warn-tab-group,
.warn-tab-btn,
.card-header,
.pest-thumbnail-wrap,
.pest-image-viewport,
.advice-panel,
.hover-nav-container:hover,
.menu-trigger-btn,
.cyber-nav-btn {
  clip-path: none !important;
  border-radius: 5px !important;
}

.cyber-card,
.ai-chat-panel,
.monitor-sidebar,
.monitor-viewport-panel {
  background: linear-gradient(180deg, rgba(8, 45, 88, 0.68), rgba(5, 31, 69, 0.58)) !important;
  border: 1px solid rgba(58, 255, 189, 0.26) !important;
  box-shadow: 0 10px 24px rgba(0, 13, 40, 0.28), 0 0 18px rgba(27, 255, 205, 0.1) !important;
}

.card-header {
  padding: 6px 10px !important;
  background: rgba(10, 39, 76, 0.82) !important;
  border-bottom: 1px solid rgba(58, 255, 189, 0.22) !important;
}

.stat-box-mini,
.pest-item,
.alert-item,
.metric-item,
.monitor-list-item {
  background: rgba(8, 48, 91, 0.48) !important;
  border-color: rgba(58, 255, 189, 0.2) !important;
}

.pest-name,
.pest-meta-row,
.pest-meta-row span,
.pest-meta-row b,
.img-placeholder,
.pest-thumbnail-wrap,
.pest-thumbnail-wrap .el-icon,
.monitor-sidebar .sidebar-title,
.monitor-list-item .camera-name,
.monitor-list-item.active .camera-name,
.viewport-title {
  color: #ffffff !important;
}

.main-title {
  font-size: 30px !important;
  line-height: 1;
  letter-spacing: 1px;
  color: #f4fffb !important;
  background: none !important;
  -webkit-background-clip: initial !important;
  -webkit-text-fill-color: initial !important;
  text-shadow: 0 0 10px rgba(32, 255, 229, 0.2);
  font-weight: 900;
}

.header-right {
  position: absolute;
  right: 18px;
  top: 8px;
  pointer-events: auto;
  z-index: 3;
}

.clock-display {
  min-width: 136px;
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #eaffff;
  background: rgba(7, 34, 72, 0.68);
  border: 1px solid rgba(64, 255, 219, 0.18);
  box-shadow: 0 0 10px rgba(32, 255, 191, 0.08);
  font-size: 14px;
}

.monitor-sidebar .sidebar-title,
.monitor-list-item .camera-name,
.monitor-list-item.active .camera-name {
  font-weight: 700;
  text-shadow: 0 0 8px rgba(57, 255, 191, 0.35);
}

@media (max-width: 1400px) {
  .header-shell {
    width: min(980px, calc(100% - 300px));
  }

  .title-group {
    min-width: clamp(310px, 32vw, 520px);
  }

}

.pest-thumbnail-wrap {
  background: rgba(2, 24, 58, 0.82) !important;
  border-color: rgba(58, 255, 189, 0.22) !important;
}

.laser-scanner,
.corner-decor {
  display: none !important;
}

.pest-detail-dialog-body {
  gap: 12px !important;
  color: #eaffff !important;
}

.pest-media-box {
  gap: 8px !important;
}

.pest-media-box .media-title,
.advice-header,
.confidence-tag {
  color: #39ffbf !important;
}

.pest-image-viewport,
.advice-panel {
  background: rgba(3, 25, 59, 0.68) !important;
  border: 1px solid rgba(58, 255, 189, 0.22) !important;
  box-shadow: inset 0 0 18px rgba(58, 255, 189, 0.05);
}

.report-header {
  border-bottom-color: rgba(58, 255, 189, 0.18) !important;
}

.pest-main-name .name-text,
.m-value,
.advice-content-text {
  color: #ffffff !important;
}

.m-label,
.m-value small {
  color: rgba(229, 255, 246, 0.68) !important;
}

.advice-content-text {
  font-size: 12px;
  line-height: 1.55;
}

.perception-card-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 2px !important;
  overflow: hidden;
}

.left-panel .perception-card {
  order: 2;
  flex: 1.08 1 0 !important;
  height: auto !important;
  min-height: 0;
}

.left-panel .pest-trend-card {
  order: 3;
  flex: 1 1 0 !important;
  height: auto !important;
  min-height: 0;
}

.pest-trend-body {
  display: flex;
  min-height: 0;
  padding: 2px !important;
  overflow: hidden;
}

.pest-trend-body .trend-chart-container {
  flex: 1 1 0;
  width: 100%;
  height: 100% !important;
  min-height: 0;
}

.perception-selectors {
  flex: 0 0 32px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  min-width: 0;
}

.perception-selectors .el-select {
  width: 100%;
  min-width: 0;
}

.perception-selectors :deep(.el-select__wrapper) {
  min-height: 30px;
  padding: 2px 6px;
  background: rgba(4, 30, 68, 0.82);
  box-shadow: 0 0 0 1px rgba(58, 255, 189, 0.24) inset;
}

.perception-selectors :deep(.el-select__selected-item),
.perception-selectors :deep(.el-select__placeholder) {
  color: rgba(234, 255, 255, 0.88);
  font-size: 12px;
}

.perception-trend-chart {
  flex: 1 1 0;
  width: 100%;
  min-height: 0;
  margin-top: 2px;
}

.decision-card-body {
  min-height: 0;
  padding: 2px !important;
}

.decision-alert-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.ai-advisor-launcher {
  position: fixed;
  top: 50%;
  right: 0;
  width: 44px;
  height: 54px;
  padding: 0 4px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 22px;
  background: rgba(7, 55, 99, 0.96);
  border: 1px solid rgba(57, 255, 191, 0.5);
  border-right: 0;
  border-radius: 6px 0 0 6px;
  box-shadow: 0 0 16px rgba(32, 255, 191, 0.2);
  transform: translateY(-50%);
  cursor: pointer;
  pointer-events: auto;
  z-index: 121;
}

.ai-advisor-launcher:hover {
  width: 50px;
  color: #39ffbf;
  background: rgba(9, 71, 116, 0.98);
}

.ai-chat-panel {
  position: fixed !important;
  left: auto;
  top: auto;
  right: 12px;
  bottom: 18px;
  width: min(380px, calc(100vw - 24px)) !important;
  height: min(520px, calc(100vh - 92px)) !important;
  max-width: calc(100vw - 12px) !important;
  max-height: calc(100vh - 12px) !important;
  box-sizing: border-box;
  z-index: 120 !important;
}

.chat-panel-header {
  cursor: move;
  user-select: none;
}

.portal-chat-enter-active,
.portal-chat-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.portal-chat-enter-from,
.portal-chat-leave-to {
  transform: translateX(36px);
  opacity: 0;
}

</style>

<style>
/* 全局样式，用于定制挂载于 body 的科技感弹窗 */
.cyber-dialog .el-empty {
  margin: auto;
}

/* Dialog final theme override for visual large screen */
.cyber-dialog {
  background: linear-gradient(180deg, rgba(8, 45, 88, 0.96), rgba(4, 24, 61, 0.96)) !important;
  border: 1px solid rgba(58, 255, 189, 0.32) !important;
  border-radius: 5px !important;
  box-shadow: 0 18px 44px rgba(0, 10, 32, 0.46), 0 0 24px rgba(27, 255, 205, 0.14) !important;
  overflow: hidden;
}

.cyber-dialog .el-dialog__header {
  padding: 12px 16px 10px !important;
  background: linear-gradient(90deg, rgba(33, 255, 178, 0.16), rgba(33, 255, 178, 0.05)) !important;
  border-bottom: 1px solid rgba(58, 255, 189, 0.22) !important;
}

.cyber-dialog .el-dialog__title {
  color: #eaffff !important;
  font-size: 15px;
  letter-spacing: 0;
}

.cyber-dialog .el-dialog__headerbtn .el-dialog__close,
.cyber-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: #39ffbf !important;
}

.cyber-dialog .el-dialog__body {
  padding: 14px 16px 16px !important;
  background: transparent !important;
}

.cyber-dialog .el-empty__description p {
  color: rgba(234, 255, 255, 0.72) !important;
}

.region-info-panel {
  position: fixed;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  z-index: 18;
  width: min(420px, calc(100vw - 28px));
  color: #eaffff;
  background: linear-gradient(180deg, rgba(8, 45, 88, 0.82), rgba(4, 24, 61, 0.9));
  border: 1px solid rgba(58, 255, 189, 0.32);
  border-radius: 5px;
  box-shadow: 0 14px 36px rgba(0, 10, 32, 0.42), 0 0 22px rgba(27, 255, 205, 0.12);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

.region-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  background: linear-gradient(90deg, rgba(33, 255, 178, 0.16), rgba(33, 255, 178, 0.04));
  border-bottom: 1px solid rgba(58, 255, 189, 0.18);
}

.region-level {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  margin-right: 8px;
  color: #102a22;
  font-size: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, #6ee7b7, #22d3ee);
  border-radius: 5px;
}

.region-name {
  display: inline-block;
  max-width: 260px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.region-close-btn {
  color: #39ffbf !important;
  min-width: 24px;
  padding: 0 !important;
}

.region-info-body {
  padding: 10px 12px 12px;
}

.region-desc-label {
  display: block;
  margin-bottom: 5px;
  color: rgba(234, 255, 255, 0.62);
  font-size: 12px;
}

.region-info-body p {
  margin: 0;
  max-height: 84px;
  color: rgba(234, 255, 255, 0.92);
  font-size: 13px;
  line-height: 1.7;
  overflow-y: auto;
  word-break: break-word;
}

.report-date-filter {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(10, 38, 79, 0.72);
  border: 1px solid rgba(58, 255, 189, 0.2);
  border-radius: 5px;
}

.report-date-filter > span,
.report-area-filter > div {
  color: rgba(234, 255, 255, 0.82) !important;
}

.report-device-card {
  background: linear-gradient(180deg, rgba(8, 45, 88, 0.72), rgba(4, 24, 61, 0.82)) !important;
  border: 1px solid rgba(58, 255, 189, 0.24) !important;
  box-shadow: 0 12px 28px rgba(0, 10, 32, 0.32), inset 0 0 16px rgba(58, 255, 189, 0.04) !important;
}

.report-device-header {
  padding: 9px 12px !important;
  border-bottom: 1px solid rgba(58, 255, 189, 0.18) !important;
}

.report-device-title {
  color: #eaffff !important;
  font-size: 14px !important;
}

.report-device-sn {
  margin-left: 8px;
  color: rgba(234, 255, 255, 0.62);
  font-size: 11px;
}

.cyber-nav-btn.active,
.cyber-nav-btn.active .el-icon,
.cyber-nav-btn.active svg {
  color: #ffffff !important;
}

.cyber-nav-btn.active {
  text-shadow: 0 0 8px rgba(57, 255, 191, 0.72);
  box-shadow: 0 0 0 1px rgba(58, 255, 189, 0.46), 0 0 18px rgba(57, 255, 191, 0.34) !important;
}

.report-device-card .icon-accent,
.report-device-card .el-icon,
.report-device-card .report-device-title,
.report-device-card .report-device-sn {
  color: #ffffff !important;
  text-shadow: 0 0 8px rgba(57, 255, 191, 0.38);
}

.report-device-card .card-body,
.report-device-card .card-body span,
.report-device-card .card-body div {
  color: rgba(234, 255, 255, 0.86) !important;
}

.report-device-card .card-body div[style*="font-size: 20px"],
.report-device-card .card-body div[style*="font-family: monospace"],
.report-device-card .card-body span[style*="font-family: monospace"] {
  color: #ffffff !important;
  text-shadow: 0 0 10px rgba(57, 255, 191, 0.42);
}

.report-device-card .el-radio-button__inner {
  color: rgba(234, 255, 255, 0.82) !important;
  background: rgba(255, 255, 255, 0.04) !important;
  border-color: rgba(58, 255, 189, 0.22) !important;
}

.report-device-card .el-radio-button__original-radio:checked + .el-radio-button__inner {
  color: #ffffff !important;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.86), rgba(14, 165, 233, 0.76)) !important;
  border-color: rgba(167, 243, 208, 0.74) !important;
  box-shadow: 0 0 12px rgba(57, 255, 191, 0.22) !important;
}

.stat-box-mini .stat-label,
.stat-box-mini .stat-value-mini,
.progress-label-mini,
.progress-label-mini span {
  color: #ffffff !important;
  text-shadow: 0 0 8px rgba(57, 255, 191, 0.28);
}

.dashboard-body {
  padding: 3.5px !important;
}

.side-panel {
  gap: 3.5px !important;
}

.iot-weather-merged,
.merged-stat-grid,
.stat-box-mini,
.merged-weather-details,
.weather-item-mini,
.alert-card-header,
.alert-item,
.alert-footer-row,
.pest-item,
.chat-message-list {
  gap: 3.5px !important;
}

.alert-item,
.pest-item {
  margin-bottom: 3.5px !important;
}

.region-info-header {
  gap: 3.5px !important;
  padding: 6px 8px;
}

.region-info-body {
  padding: 8px;
}

.region-desc-label {
  margin-bottom: 3.5px;
}

.merged-right .temp-merged,
.merged-right .weather-item-mini .val,
.merged-right .forecast-temp {
  color: #ffffff !important;
  text-shadow: none !important;
}

/* Match the unchanged left-column row boundaries after reordering the right cards. */
.right-panel .decision-card {
  order: 1;
  flex: 0 0 var(--matched-row-1-height, 286px) !important;
  height: var(--matched-row-1-height, 286px) !important;
  min-height: 0 !important;
  max-height: var(--matched-row-1-height, 286px);
}

.right-panel .phenology-monitor-card {
  order: 2;
  flex: 0 0 var(--matched-row-2-height, 214px) !important;
  height: var(--matched-row-2-height, 214px) !important;
  min-height: 0 !important;
  max-height: var(--matched-row-2-height, 214px);
}

.right-panel .pest-recognition-card {
  order: 3;
  flex: 0 0 var(--matched-row-3-height, 0px) !important;
  height: var(--matched-row-3-height, 0px) !important;
  min-height: 0 !important;
  max-height: var(--matched-row-3-height, none);
}

.device-type-overview-body {
  display: flex !important;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 0 !important;
}

.device-type-chart {
  width: 100% !important;
  height: 138px !important;
  min-height: 138px !important;
  margin: 0 auto !important;
  transform: none !important;
}

.device-type-list {
  display: none !important;
}

/* All dashboard charts except device type use the same 3px panel spacing. */
.pest-trend-body,
.perception-card-body,
.pest-card-body,
.phenology-card-body,
.decision-card-body {
  padding: 3px !important;
  box-sizing: border-box;
}

.trend-chart-container,
.perception-trend-chart,
.disease-trend-chart,
.phenology-trend-chart,
.decision-alert-chart {
  width: 100% !important;
  max-width: 100%;
  margin: 0 !important;
  transform: none !important;
  box-sizing: border-box;
}

.perception-trend-chart {
  margin-top: 3px !important;
}

/* 滑动列表保留滚动能力，但隐藏原生和 Element Plus 自绘滚动条 */
.visual-dashboard-container *,
.cyber-dialog * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.visual-dashboard-container *::-webkit-scrollbar,
.cyber-dialog *::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.visual-dashboard-container .el-scrollbar__bar,
.visual-dashboard-container .el-scrollbar__thumb,
.cyber-dialog .el-scrollbar__bar,
.cyber-dialog .el-scrollbar__thumb {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}
</style>
