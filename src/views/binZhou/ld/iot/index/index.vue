<template>
  <div class="dashboard-container">
    <!-- 极光背景光晕 -->
    <div class="aurora-blob blob-1"></div>
    <div class="aurora-blob blob-2"></div>
    <div class="aurora-blob blob-3"></div>
    <div class="bg-grid-overlay"></div>

    <div class="header">
      <div class="header-left-info">
        <div class="header-left-top">
          <el-button 
            type="success" 
            circle 
            size="small" 
            class="back-btn" 
            @click="goHome" 
            title="返回门户首页"
          >
            <el-icon><HomeFilled /></el-icon>
          </el-button>
          <span class="sys-badge">◈ 智慧农业物联 v2.0</span>
        </div>
        <span class="sys-status"><i class="status-dot-anim"></i>生态监测在线</span>
      </div>
      <div class="header-center">
        <div class="header-en-title">MY MANOR DATA CENTER</div>
        <div class="header-title">我的庄园</div>
      </div>
      <div class="header-right-info">
        <div class="header-time">{{ currentTime }}</div>
        <div class="header-date-label">实时生态监测数据</div>
      </div>
    </div>

    <div class="main-content">
      <div class="panel left-panel">
        <div class="stats-wrapper">
            <div class="panel-box overview-list-card">
              <div class="card-header-sm">
                <div class="title-left">
                    <el-icon class="icon-global"><DataLine /></el-icon> 平台总览
                </div>
                <span class="header-tag">GLOBAL</span>
              </div>
              <div class="product-rows">
                <div class="prod-row total-row">
                   <span class="name">合计</span>
                   <div class="stat-pair">
                     <span class="val-label">总</span><span class="val">{{ globalStats.total }}</span>
                     <span class="divider">/</span>
                     <span class="val-label text-green">运</span><span class="val text-green">{{ globalStats.online }}</span>
                   </div>
                </div>
                <div v-for="item in globalStats.detail" :key="item.id" class="prod-row">
                   <span class="name text-ellipsis" :title="item.name">{{ item.name }}</span>
                   <div class="stat-pair">
                     <span class="val">{{ item.total }}</span>
                     <span class="divider">/</span>
                     <span class="val text-green">{{ item.online }}</span>
                   </div>
                </div>
              </div>
            </div>

            <div class="panel-box overview-list-card">
              <div class="card-header-sm">
                <div class="title-left">
                    <el-icon class="icon-park"><OfficeBuilding /></el-icon>
                    <span class="text-ellipsis" style="max-width: 120px;" :title="currentParkStats.name">{{ currentParkStats.name || '未选择园区' }}</span>
                </div>
                <span class="header-tag">PARK</span>
              </div>
              <div class="product-rows">
                <div class="prod-row total-row">
                   <span class="name">合计</span>
                   <div class="stat-pair">
                     <span class="val-label">总</span><span class="val">{{ currentParkStats.total }}</span>
                     <span class="divider">/</span>
                     <span class="val-label text-green">运</span><span class="val text-green">{{ currentParkStats.online }}</span>
                   </div>
                </div>
                <div v-if="currentParkStats.detail.length === 0" class="empty-row">暂无设备</div>
                <div v-else v-for="item in currentParkStats.detail" :key="item.id" class="prod-row">
                   <span class="name text-ellipsis" :title="item.name">{{ item.name }}</span>
                   <div class="stat-pair">
                     <span class="val">{{ item.total }}</span>
                     <span class="divider">/</span>
                     <span class="val text-green">{{ item.online }}</span>
                   </div>
                </div>
              </div>
            </div>

            <div class="panel-box overview-list-card">
              <div class="card-header-sm">
                <div class="title-left">
                    <el-icon class="icon-area"><Grid /></el-icon>
                    <span class="text-ellipsis" style="max-width: 120px;" :title="currentAreaStats.name">{{ currentAreaStats.name || '未选择区域' }}</span>
                </div>
                <span class="header-tag">AREA</span>
              </div>
              <div class="product-rows">
                <div class="prod-row total-row">
                   <span class="name">合计</span>
                   <div class="stat-pair">
                     <span class="val-label">总</span><span class="val">{{ currentAreaStats.total }}</span>
                     <span class="divider">/</span>
                     <span class="val-label text-green">运</span><span class="val text-green">{{ currentAreaStats.online }}</span>
                   </div>
                </div>
                <div v-if="currentAreaStats.detail.length === 0" class="empty-row">暂无设备</div>
                <div v-else v-for="item in currentAreaStats.detail" :key="item.id" class="prod-row">
                   <span class="name text-ellipsis" :title="item.name">{{ item.name }}</span>
                   <div class="stat-pair">
                     <span class="val">{{ item.total }}</span>
                     <span class="divider">/</span>
                     <span class="val text-green">{{ item.online }}</span>
                   </div>
                </div>
              </div>
            </div>
        </div>

        <div class="panel-box tree-panel-box">
          <div class="panel-title">
            <span class="title-icon">⬡</span> 位置导航
            <span class="title-en">LOCATION NAV</span>
          </div>
          <div class="location-tree">
             <el-tree
                v-if="isPermissionReady"
                ref="treeRef"
                :props="defaultProps"
                :load="loadNode"
                lazy
                node-key="uniqueId"
                highlight-current
                :expand-on-click-node="false"
                @node-click="handleNodeClick"
                class="agri-tree"
             >
                <template #default="{ node, data }">
                  <span class="custom-tree-node">
                    <el-icon v-if="data.type === 'park'" class="icon-park"><OfficeBuilding /></el-icon>
                    <el-icon v-else-if="data.type === 'area'" class="icon-area"><Grid /></el-icon>
                    <el-icon v-else-if="data.type === 'location'" class="icon-location"><MapLocation /></el-icon>
                    <span class="ml-2 node-label" :title="node.label">{{ node.label }}</span>
                  </span>
                </template>
             </el-tree>
             <div v-else class="tree-loading">
                <el-icon class="is-loading"><Loading /></el-icon> 正在加载权限...
             </div>
          </div>
        </div>
      </div>

      <div class="panel center-panel">
        <div class="device-bar panel-box">
          <div class="bar-loc-section">
            <span class="bar-label">◎ 位置:</span>
            <span class="current-location" :title="currentLocationName">{{ currentLocationName || '请选择位置' }}</span>
          </div>

          <div class="select-wrapper" style="flex: 1; margin-left: 20px;">
             <el-select
              v-model="currentDeviceSn"
              placeholder="请选择该位置下的设备"
              class="agri-select"
              popper-class="agri-select-popper"
              @change="handleDeviceChange"
              style="width: 100%"
              :disabled="locationDeviceList.length === 0"
            >
              <el-option
                v-for="dev in locationDeviceList"
                :key="dev.deviceSn"
                :label="dev.deviceName"
                :value="dev.deviceSn"
              >
                <span style="float: left">{{ dev.deviceName }}</span>
                <span class="device-product-type">{{ formatDeviceProductType(dev) }}</span>
                <span style="float: right; font-size: 12px">
                    <span :class="dev.status==='1'?'text-green':'text-gray'">●</span>
                </span>
              </el-option>
            </el-select>
          </div>
          <div class="status-tag" :class="currentDeviceStatus === '1' ? 'on' : 'off'">
            <i class="status-led"></i>{{ currentDeviceStatus === '1' ? '在线' : '离线' }}
          </div>
        </div>

        <div class="panel-box metric-section" v-if="currentProductId != 4 && currentProductId != '4'">
          <div class="panel-title">
            <span class="title-icon">◈</span> 实时监测指标
            <span class="title-en">REALTIME METRICS</span>
          </div>
          <div class="metric-row custom-scroll">
            <!-- 修改前后的对比：添加 @click 和 :class -->
<div v-for="(prop, index) in monitorProps" 
     :key="index" 
     class="metric-item" 
     :class="{ 'is-active': activePropIdentifier === prop.identifier }"
     @click="handlePropChange(prop.identifier)"
     style="cursor: pointer;">
   <div class="m-name">{{ prop.name }}</div>
   <div class="m-val-row">
     <span class="m-val">{{ getPropValue(prop.identifier) }}</span>
     <span class="m-unit">{{ prop.unit }}</span>
   </div>
</div>
            <div v-if="monitorProps.length === 0" class="empty-state flex-center" style="width: 100%;">
              <span class="empty-hint">{{ emptyText }}</span>
            </div>
          </div>
        </div>

        <div class="panel-box video-section">
          <div class="panel-title" style="display: flex; align-items: center; justify-content: space-between; padding-right: 15px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="title-icon"><el-icon><VideoCamera /></el-icon></span> 实时视频监控
              <span class="title-en">LIVE STREAM</span>
            </div>
            <div v-if="hasCamera && currentCameraSn" style="display: flex; gap: 10px;">
               <el-button type="warning" size="small" plain icon="Location" @click="handleAddPreset">添加预置点</el-button>
               <el-button type="primary" size="small" plain icon="Timer" @click="handleOpenSchedule">定时任务</el-button>
               <el-button type="success" size="small" plain icon="Picture" @click="handleViewGallery">相册</el-button>
            </div>
          </div>
          <div v-show="hasCamera" class="video-container" v-loading="videoLoading">
            <div class="video-reticle tl"></div>
            <div class="video-reticle tr"></div>
            <div class="video-reticle bl"></div>
            <div class="video-reticle br"></div>
            <div id="ys7-player-container" style="width: 100%; height: 100%;"></div>
          </div>
          <div v-show="!hasCamera" class="video-empty flex-center">
             <el-empty description="该位置暂无摄像头信息" :image-size="80"></el-empty>
          </div>
        </div>

        <div class="panel-box alert-section">
          <div class="panel-title" style="display: flex; align-items: center; gap: 8px;">
            <span class="title-icon" style="color: #f87171;"><el-icon><Warning /></el-icon></span> 实时预警信息
            <span class="title-en">ALERT CENTER</span>
            <span v-if="alertList.length > 0" class="alert-count-badge">{{ alertList.length }}</span>
          </div>
          <div class="alert-list custom-scroll">
            <template v-if="alertList.length > 0">
              <div v-for="alert in alertList" :key="alert.id" class="alert-item" :class="alert.level">
                <div class="alert-header-row">
                  <span class="alert-tag" :class="alert.level">{{ alert.levelText }}</span>
                  <div class="alert-time">{{ alert.time }}</div>
                </div>
                <div class="alert-desc" :title="alert.desc">{{ alert.desc }}</div>
              </div>
            </template>
            <div v-else class="flex-center" style="height: 100%; font-size: 13px; color: #4b5563;">
              暂无未处理的预警信息
            </div>
          </div>
        </div>
      </div>

      <div class="panel right-panel">
        <div class="panel-box weather-card">
          <div class="weather-header">
            <span class="city">
              <span class="title-text-row">
                <el-icon><Location /></el-icon> 园区实时气象
              </span>
              <span v-if="weatherInfo.reportTime" class="update-time">
                更新于 {{ weatherInfo.reportTime }}
              </span>
            </span>
            <span class="weather-status" style="display: flex; align-items: center; gap: 4px;">
              <i 
                v-if="weatherInfo.weatherCode"
                :class="'qi-' + weatherInfo.weatherCode" 
                style="font-size: 20px; vertical-align: middle; filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));"
              ></i>
              <el-icon v-else><Sunny /></el-icon>
              {{ weatherInfo.weatherText }}
            </span>
          </div>
          <div class="weather-body">
            <div class="temp-box">
              <span class="temp">{{ weatherInfo.temperature }}</span><span class="unit">°C</span>
            </div>
            <div class="weather-details">
              <div class="detail-item"><span class="label">相对湿度</span><span class="val">{{ weatherInfo.humidity }}%</span></div>
              <div class="detail-item"><span class="label">当前风力</span><span class="val">{{ weatherInfo.windDirection }} {{ weatherInfo.windScale }}级</span></div>
              <div class="detail-item"><span class="label">当前降水</span><span class="val text-green">{{ weatherInfo.precipitation }} mm</span></div>
            </div>
          </div>
          <!-- 七天天气预报 -->
          <div class="weather-forecast">
            <div class="forecast-title">
              <span class="title-text">未来7天预报</span>
              <span class="title-en">7-DAY FORECAST</span>
            </div>
            <div class="forecast-list">
              <div v-for="item in forecastList" :key="item.id" class="forecast-item">
                <span class="date">{{ formatForecastDate(item.forecastDate) }}</span>
                <span class="weather-info">
                  <i v-if="item.dayCode" :class="'qi-' + item.dayCode" class="forecast-icon"></i>
                  <span class="text">{{ item.weatherTextDay }}</span>
                </span>
                <span class="temp-range">
                  <span class="min">{{ item.tempMin }}°</span>
                  <span class="bar"></span>
                  <span class="max">{{ item.tempMax }}°</span>
                </span>
              </div>
              <div v-if="forecastList.length === 0" class="forecast-empty">
                暂无天气预报数据
              </div>
            </div>
          </div>
        </div>

        <template v-if="currentDeviceSn">
            <template v-if="currentProductId == 4 || currentProductId == '4'">
                <div class="panel-box">
                  <div class="panel-title">
                    <span class="title-icon">◷</span> 智能巡检任务
                    <span class="title-en">INSPECTION TASKS</span>
                  </div>
                  <div class="camera-tasks custom-scroll" style="height: 260px; padding: 15px; overflow-y: auto;" v-loading="tasksLoading">
                    <div v-if="cameraTasks.length === 0" class="flex-center" style="height: 100%; min-height: 100px; color: #4b5e54; font-size: 13px;">
                      暂无智能巡检任务
                    </div>
                    <el-timeline v-else>
                      <el-timeline-item 
                        v-for="task in cameraTasks" 
                        :key="task.taskId" 
                        :timestamp="task.jobType === 'ONCE' ? parseTime(task.executeTime, '{m}-{d} {h}:{i}') : `循环: ${task.cronExpression}`" 
                        placement="top" 
                        :type="getTaskTimelineType(task.status)"
                      >
                        <el-card shadow="hover">
                          <h4 style="margin: 0 0 5px 0; color: #ecfdf5; font-size: 13px; font-weight: 600;">{{ task.taskName }}</h4>
                          <p style="margin: 0; color: rgba(167, 243, 208, 0.65); font-size: 12px; line-height: 1.4;">
                            状态: <span :class="getTaskStatusClass(task.status)">{{ getTaskStatusText(task.status) }}</span>
                            <span v-if="task.remark" style="margin-left: 10px;">({{ task.remark }})</span>
                          </p>
                        </el-card>
                      </el-timeline-item>
                    </el-timeline>
                  </div>
                </div>

                <div class="panel-box flex-grow">
                  <div class="panel-title">
                    <span class="title-icon">◫</span> 实时抓拍与图像分析
                    <span class="title-en">IMAGE ANALYSIS</span>
                  </div>
                  <div class="camera-pictures custom-scroll" style="padding: 15px; height: 100%; overflow-y: auto;" v-loading="picturesLoading">
                    <div v-if="cameraPictures.length === 0" class="flex-center" style="height: 100%; color: #4b5e54; font-size: 13px;">
                      暂无抓拍分析记录
                    </div>
                    <div v-else class="capture-grid">
                       <div v-for="(img, index) in cameraPictures" :key="index" class="capture-item" @click="openCaptureViewer(index)">
                         <div class="img-wrapper">
                           <img :src="img.url" class="capture-img" loading="lazy" />
                           <div class="img-hover-overlay flex-center">
                             <el-icon><ZoomIn /></el-icon>
                           </div>
                         </div>
                         <div class="img-desc text-ellipsis" :title="parseTime(img.captureTime)">
                           {{ parseTime(img.captureTime, '{m}-{d} {h}:{i}') }}
                           <span class="type-tag" :class="img.taskId ? 'task' : 'manual'">
                             {{ img.taskId ? '定时' : '手动' }}
                           </span>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
            </template>

            <template v-else>
               <div class="panel-box">
  <div class="panel-title">
    <span class="title-icon">◉</span> 趋势分析 ({{ currentPropName || '暂无' }})

    <el-select
      v-model="activePropIdentifier"
      placeholder="切换指标"
      size="small"
      style="width: 120px; margin-left: auto;"
      class="agri-select"
      popper-class="agri-select-popper"
      @change="handlePropChange"
      :disabled="monitorProps.length === 0"
    >
      <el-option
        v-for="prop in monitorProps"
        :key="prop.identifier"
        :label="prop.name"
        :value="prop.identifier"
      />
    </el-select>
  </div>
  
  <div class="log-stats-bar" style="display: flex; justify-content: space-around; background: rgba(16, 185, 129, 0.04); border-bottom: 1px solid rgba(16, 185, 129, 0.1); padding: 8px 10px; font-size: 11px; color: #a7f3d0; border-top: 1px solid rgba(16, 185, 129, 0.05);">
    <div>平均值: <span style="font-family: monospace; font-weight: bold; color: #34d399; font-size: 12px; margin-left: 2px;">{{ logStats.avg }}</span> <span style="font-size: 9px; color: rgba(167, 243, 208, 0.65);">{{ currentUnit }}</span></div>
    <div>最大值: <span style="font-family: monospace; font-weight: bold; color: #f87171; font-size: 12px; margin-left: 2px;">{{ logStats.max }}</span> <span style="font-size: 9px; color: rgba(167, 243, 208, 0.65);">{{ currentUnit }}</span></div>
    <div>最小值: <span style="font-family: monospace; font-weight: bold; color: #fbbf24; font-size: 12px; margin-left: 2px;">{{ logStats.min }}</span> <span style="font-size: 9px; color: rgba(167, 243, 208, 0.65);">{{ currentUnit }}</span></div>
  </div>

  <div ref="lineChartRef" class="chart-box" style="height: 260px;"></div>
</div>
<div class="panel-box flex-grow">
  <div class="panel-title" style="display: flex; align-items: center; justify-content: space-between; padding-right: 15px; height: auto; min-height: 48px; flex-wrap: wrap; gap: 8px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="title-icon">▷</span> 实时上报日志
    </div>
    <el-date-picker
      v-model="logDateRange"
      value-format="YYYY-MM-DD HH:mm:ss"
      type="datetimerange"
      range-separator="-"
      start-placeholder="开始"
      end-placeholder="结束"
      size="small"
      style="width: 250px;"
      @change="handleLogDateRangeChange"
      popper-class="agri-date-popper"
    ></el-date-picker>
  </div>

  <div class="log-list custom-scroll">
    <template v-if="logList.length > 0">
      <transition-group name="list">
        <div v-for="(log, idx) in logList" :key="log.logId || idx" class="log-item">
          <div class="time">{{ parseTime(log.createTime, '{m}-{d} {h}:{i}') }}</div>
          <div class="content">
            <span class="key">DATA ›</span> {{ formatPayload(log.payload) }}
          </div>
        </div>
      </transition-group>
    </template>
    <div v-else class="flex-center" style="height: 100%; color: #4b5563; font-size: 13px;">
      暂无实时上报日志
    </div>
  </div>
</div>
            </template>
        </template>

        <template v-else>
            <div class="panel-box flex-grow flex-center">
                 <el-empty description="请先在中间面板选择设备" :image-size="120"></el-empty>
            </div>
        </template>
      </div>
    </div>

    <el-dialog title="添加预置点" v-model="presetOpen" width="400px" append-to-body class="cyber-dialog">
      <el-form ref="presetRef" :model="presetForm" :rules="presetRules" label-width="90px">
        <el-form-item label="当前设备">
          <el-input v-model="currentCameraDeviceName" disabled />
        </el-form-item>
        <el-form-item label="预置点号" prop="pointIndex">
          <el-input-number v-model="presetForm.pointIndex" :min="1" :max="255" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="备注名称" prop="remark">
          <el-input v-model="presetForm.remark" placeholder="例如：大棚南门入口" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="presetOpen = false">取消</el-button>
          <el-button type="primary" @click="submitPreset">确定保存</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="新建定时任务" v-model="scheduleOpen" width="550px" append-to-body class="cyber-dialog">
      <el-form ref="scheduleRef" :model="scheduleForm" :rules="scheduleRules" label-width="100px">
        <el-form-item label="当前设备"><el-input v-model="currentCameraDeviceName" disabled /></el-form-item>

        <el-form-item label="预置点" prop="presetId" required>
           <el-select
             v-model="scheduleForm.presetId"
             placeholder="请选择预置点 (必选)"
             popper-class="agri-select-popper"
             style="width: 100%"
             clearable
           >
              <el-option
                 v-for="item in presetOptions"
                 :key="item.id"
                 :label="`[${item.pointIndex}] ${item.remark || '无备注'}`"
                 :value="item.id"
              >
                 <span style="float: left; font-weight: bold">#{{ item.pointIndex }}</span>
                 <span style="float: right; color: #8492a6; font-size: 13px">{{ item.remark || '无备注' }}</span>
              </el-option>
           </el-select>
           <div class="text-muted" style="font-size:12px; line-height:1.5; margin-top:5px; color: #e6a23c">
              <el-icon><Warning /></el-icon> 注意：为了保证抓拍位置准确，必须指定一个预置点。
           </div>
        </el-form-item>

        <el-form-item label="任务类型" prop="jobType">
           <el-radio-group v-model="scheduleForm.jobType">
              <el-radio label="ONCE">单次执行</el-radio>
              <el-radio label="CRON">周期循环</el-radio>
           </el-radio-group>
        </el-form-item>

        <el-form-item label="执行次数" prop="count">
           <el-input-number v-model="scheduleForm.count" :min="1" :max="9999" label="次数" />
           <span class="text-muted ml-5" style="font-size: 12px">次</span>
        </el-form-item>

        <el-form-item label="执行时间" prop="executeTime" v-if="scheduleForm.jobType === 'ONCE'">
           <el-date-picker v-model="scheduleForm.executeTime" type="datetime" placeholder="选择执行日期和时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" popper-class="agri-date-popper"/>
        </el-form-item>

        <template v-if="scheduleForm.jobType === 'CRON'">
           <el-form-item label="执行策略">
              <el-radio-group v-model="cronConfig.type">
                 <el-radio label="DAILY">每天</el-radio>
                 <el-radio label="WEEKLY">每周</el-radio>
                 <el-radio label="INTERVAL">按天间隔</el-radio>
              </el-radio-group>
           </el-form-item>
           <el-form-item label="选择星期" v-if="cronConfig.type === 'WEEKLY'">
              <el-checkbox-group v-model="cronConfig.weekDays">
                 <el-checkbox label="2">周一</el-checkbox>
                 <el-checkbox label="3">周二</el-checkbox>
                 <el-checkbox label="4">周三</el-checkbox>
                 <el-checkbox label="5">周四</el-checkbox>
                 <el-checkbox label="6">周五</el-checkbox>
                 <el-checkbox label="7">周六</el-checkbox>
                 <el-checkbox label="1">周日</el-checkbox>
              </el-checkbox-group>
           </el-form-item>
           <el-form-item label="间隔天数" v-if="cronConfig.type === 'INTERVAL'">
              每隔 <el-input-number v-model="cronConfig.intervalDays" :min="2" :max="30" size="small" style="margin: 0 10px; width: 100px" /> 天执行一次
           </el-form-item>
           <el-form-item label="执行时间" required>
              <el-time-picker v-model="cronConfig.time" placeholder="请选择具体时间点" format="HH:mm:ss" value-format="HH:mm:ss" style="width: 100%" popper-class="agri-date-popper" />
           </el-form-item>
           <el-form-item label="规则预览">
              <el-tag type="info" v-if="generateCronExpression()">{{ generateCronExpression() }}</el-tag>
              <span v-else class="text-muted">请完善上面的配置</span>
           </el-form-item>
        </template>

        <el-form-item label="任务备注">
           <el-input v-model="scheduleForm.remark" type="textarea" placeholder="例如：每日晨间自动巡检" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="scheduleOpen = false">取 消</el-button>
          <el-button type="primary" @click="submitSchedule">创建任务</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="galleryOpen" :title="`抓拍记录 - ${currentCameraDeviceName}`" size="600px" destroy-on-close>
      <div class="gallery-container" v-loading="galleryLoading">
        <el-empty v-if="galleryList.length === 0" description="暂无抓拍记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="(img, index) in galleryList"
            :key="index"
            :timestamp="parseTime(img.captureTime)"
            placement="top"
            :color="img.taskId ? '#4ade80' : '#fbbf24'"
          >
            <el-card shadow="hover" class="gallery-card">
              <div class="gallery-image-wrapper" @click="openImageViewer(index)">
                 <img :src="img.url" class="gallery-img-real" loading="lazy" />
                 <div class="zoom-hint"><el-icon><ZoomIn /></el-icon></div>
              </div>
              <div class="gallery-info">
                 <div class="mt-5 source-row">
                    <el-icon><User /></el-icon> <span class="mr-5">来源:</span>
                    <el-tag size="small" type="success" v-if="img.taskId">定时任务</el-tag>
                    <el-tag size="small" type="warning" v-else>手动抓拍</el-tag>
                    <span v-if="!img.taskId && img.createBy" class="text-muted ml-5" style="font-size: 12px">({{ img.createBy }})</span>
                 </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-drawer>

    <el-image-viewer v-if="showViewer" :url-list="previewList" :initial-index="initialIndex" @close="closeImageViewer" />
    <el-image-viewer v-if="showCaptureViewer" :url-list="capturePreviewList" :initial-index="initialCaptureIndex" @close="closeCaptureViewer" />


  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import EZUIKit from 'ezuikit-js';
import { ElImageViewer, ElMessage } from 'element-plus';
import 'qweather-icons/font/qweather-icons.css';

// 注意：以下 API 引入请确保与你的实际项目路径一致
import { listPark } from "@/api/binZhou/ld/iot/park";
import { listAreaByParkId } from "@/api/binZhou/ld/iot/area";
import { listLocationByAreaId } from "@/api/binZhou/ld/iot/location";
import { listDevice, listDeviceLog } from "@/api/binZhou/ld/iot/device";
import { listProduct } from "@/api/binZhou/ld/iot/product";
import { listModel } from "@/api/binZhou/ld/iot/model";
import { getUserProfile } from "@/api/system/user";
import { parseTime } from '@/utils/ruoyi';
// 引入预警API
import { listWarnRecord } from "@/api/binZhou/ld/iot/warnRecord";
import { listWeatherLive } from "@/api/binZhou/ld/iot/weatherLive";
import { listWeatherForecast } from "@/api/binZhou/ld/iot/weatherForecast";
import { listWeatherWarn } from "@/api/binZhou/ld/iot/weatherWarn";
// ==== 摄像头专用的 API 引入 ====
import { listCameraPreset, addCameraPreset } from "@/api/binZhou/ld/iot/cameraPreset";
import { listCameraTask, addCameraTask } from "@/api/binZhou/ld/iot/cameraTask";
import { listRecord } from "@/api/binZhou/ld/iot/record";

// 图标引入
import {
  OfficeBuilding, Grid, MapLocation, DataLine, Loading, Location,
  Sunny, Warning, VideoCamera, Timer, Picture, ZoomIn, User, HomeFilled
} from '@element-plus/icons-vue';

// === 路由与导航 ===
const router = useRouter();
const { proxy } = getCurrentInstance();
const goHome = () => {
  router.push('/home');
};

// === 变量定义 ===
const currentTime = ref('');
const timer = ref(null);
const currentParkId = ref(null);

const isPermissionReady = ref(false);
const isAdmin = ref(false);
const currentUserId = ref(null);
const currentUserParkId = ref(null);

const treeRef = ref(null);
const defaultProps = { label: 'label', children: 'children', isLeaf: 'leaf' };
const currentLocationName = ref('');
const currentLocationId = ref(null);
const currentAreaId = ref(null);

const allProducts = ref([]);
const globalStats = reactive({ total: 0, online: 0, detail: [] });
const currentParkStats = reactive({ name: '', total: 0, online: 0, detail: [] });
const currentAreaStats = reactive({ name: '', total: 0, online: 0, detail: [] });

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

const locationDeviceList = ref([]);
const currentDeviceSn = ref(null);
const currentDeviceStatus = ref('0');
const currentProductId = ref(null);
const currentUnit = ref('');
const monitorProps = ref([]);
const currentPropName = ref('');
const logList = ref([]);
const logDateRange = ref([]);
const logStats = reactive({ max: '-', min: '-', avg: '-' });

// 摄像头相关变量
const hasCamera = ref(false);
const currentCameraSn = ref('');
const cameraPictures = ref([]);
const picturesLoading = ref(false);
const cameraTasks = ref([]);
const tasksLoading = ref(false);

async function loadCameraTasks(deviceId) {
  if (!deviceId) return;
  tasksLoading.value = true;
  cameraTasks.value = [];
  try {
    const params = {
      deviceId: deviceId,
      pageNum: 1,
      pageSize: 10,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    };
    const res = await listCameraTask(params);
    cameraTasks.value = res.rows || [];
  } catch (e) {
    console.error("加载抓拍任务失败", e);
  } finally {
    tasksLoading.value = false;
  }
}

function getTaskTimelineType(status) {
  if (status == '0') return 'primary';
  if (status == '1') return 'warning';
  if (status == '2') return 'success';
  if (status == '3') return 'danger';
  return 'info';
}

function getTaskStatusText(status) {
  if (status == '0') return '正常';
  if (status == '1') return '暂停';
  if (status == '2') return '已完成';
  if (status == '3') return '失败';
  return '未知';
}

function getTaskStatusClass(status) {
  if (status == '0') return 'text-green';
  if (status == '1') return 'text-yellow';
  if (status == '2') return 'text-green';
  if (status == '3') return 'text-red';
  return '';
}

const showCaptureViewer = ref(false);
const initialCaptureIndex = ref(0);
const capturePreviewList = computed(() => cameraPictures.value.map(img => img.url));

function openCaptureViewer(index) {
  initialCaptureIndex.value = index;
  showCaptureViewer.value = true;
}

function closeCaptureViewer() {
  showCaptureViewer.value = false;
}

async function loadCameraPictures(deviceId) {
  if (!deviceId) return;
  picturesLoading.value = true;
  cameraPictures.value = [];
  try {
    const params = {
      deviceId: deviceId,
      pageNum: 1,
      pageSize: 6, // 展示最新6张照片
      orderByColumn: 'captureTime',
      isAsc: 'desc',
      userId: isAdmin.value ? null : currentUserId.value
    };
    const res = await listRecord(params);
    cameraPictures.value = res.rows || [];
  } catch (e) {
    console.error("加载抓拍相册失败", e);
  } finally {
    picturesLoading.value = false;
  }
}

// ================= 摄像头：添加预置点专有状态 =================
const presetOpen = ref(false);
const presetForm = ref({ deviceId: null, pointIndex: 1, remark: '' });
const presetRules = {
  pointIndex: [{ required: true, message: "请输入预置点号", trigger: "blur" }],
  remark: [{ required: true, message: "请输入备注名称", trigger: "blur" }]
};
const presetRef = ref(null);

// ================= 摄像头：定时任务 & 相册专有状态 =================
const scheduleOpen = ref(false);
const currentCameraDeviceName = ref("");
const presetOptions = ref([]);
const cronConfig = reactive({ type: 'DAILY', weekDays: [], intervalDays: 2, time: '08:00:00' });
const scheduleForm = ref({
  deviceId: null,
  jobType: 'ONCE',
  executeTime: null,
  cronExpression: null,
  remark: '',
  presetId: null,
  count: 1
});
const scheduleRules = {
  executeTime: [{ required: true, message: "请选择执行时间", trigger: "change" }],
  presetId: [{ required: true, message: "必须选择一个预置点", trigger: "change" }]
};
const scheduleRef = ref(null);

const galleryOpen = ref(false);
const galleryLoading = ref(false);
const galleryList = ref([]);
const showViewer = ref(false);
const initialIndex = ref(0);
const previewList = computed(() => galleryList.value.map(img => img.url));

// 1. 预警信息表
const alertList = ref([]);

// 2. 新增获取真实预警数据的方法
async function fetchAlertList() {
  try {
    let iotAlerts = [];
    let weatherAlerts = [];

    // 1. 获取物联预警
    const iotQuery = {
      pageNum: 1,
      pageSize: 30,
      orderByColumn: 'createTime',
      isAsc: 'desc'
    };
    if (currentDeviceSn.value) {
      iotQuery.deviceSn = currentDeviceSn.value;
    } else if (currentLocationId.value) {
      iotQuery.locationId = currentLocationId.value;
    } else if (currentAreaId.value) {
      iotQuery.areaId = currentAreaId.value;
    } else if (currentParkId.value) {
      iotQuery.parkId = currentParkId.value;
    }
    const iotRes = await listWarnRecord(iotQuery);
    iotAlerts = (iotRes.rows || []).map(item => {
      let levelClass = 'warning';
      let levelText = '二级预警';

      if (item.levelConfigId === 1 || item.levelConfigId === '1') {
        levelClass = 'info';
        levelText = '一级预警';
      } else if (item.levelConfigId === 2 || item.levelConfigId === '2') {
        levelClass = 'warning';
        levelText = '二级预警';
      } else if (item.levelConfigId === 3 || item.levelConfigId === '3') {
        levelClass = 'danger';
        levelText = '三级预警';
      }

      return {
        id: 'iot_' + item.id,
        rawTime: item.createTime,
        time: parseTime(item.createTime, '{y}-{m}-{d} {h}:{i}:{s}'),
        level: levelClass,
        levelText: '物联: ' + levelText,
        desc: item.alertAdvice || `传感器触发预警，当前实际读数: ${item.actualValue}`
      };
    });

    // 2. 获取天气预警
    if (currentParkId.value) {
      const weatherWarnRes = await listWeatherWarn({
        parkId: currentParkId.value,
        pageNum: 1,
        pageSize: 30,
        orderByColumn: 'createTime',
        isAsc: 'desc'
      });

      weatherAlerts = (weatherWarnRes.rows || []).map(item => {
        let levelClass = 'warning';
        let levelText = '气象预警';

        const lvl = String(item.alertLevel || '');
        if (lvl.includes('红') || lvl === '3') {
          levelClass = 'danger';
          levelText = '气象红色预警';
        } else if (lvl.includes('橙') || lvl.includes('黄') || lvl === '2') {
          levelClass = 'warning';
          levelText = `气象${lvl}预警`;
        } else if (lvl.includes('蓝') || lvl === '1') {
          levelClass = 'info';
          levelText = '气象蓝色预警';
        } else {
          levelText = `气象预警 (${lvl})`;
        }

        return {
          id: 'weather_' + item.id,
          rawTime: item.createTime,
          time: parseTime(item.createTime, '{y}-{m}-{d} {h}:{i}:{s}'),
          level: levelClass,
          levelText: levelText,
          desc: `[触发异常: ${item.anomalyInfo || '未知'}] ${item.alertAdvice || '无建议'}`
        };
      });
    }

    // 3. 合并与排序
    const combined = [...iotAlerts, ...weatherAlerts];
    combined.sort((a, b) => {
      const timeA = a.rawTime ? new Date(a.rawTime).getTime() : 0;
      const timeB = b.rawTime ? new Date(b.rawTime).getTime() : 0;
      return timeB - timeA;
    });

    alertList.value = combined.slice(0, 20);
  } catch (error) {
    console.error("获取预警数据失败", error);
  }
}

// 存储最新一次的有效设备上报数据
const latestPayload = ref({});
const lineChartRef = ref(null);
let lineChartInstance = null;

// === 萤石云视频流配置 ===
const videoLoading = ref(false);
let ys7PlayerInstance = null;
let latestVideoSn = '';
const ys7Config = {
  appKey: '1e1a8eacfdbe4f6597c7d516085f0f7b',
  appSecret: 'e2a6b0c19c8cdcb671cb532e71a665c9',
  channelNo: 1
};

const emptyText = computed(() => {
    if (locationDeviceList.value.length === 0) return "当前位置下无设备";
    if (!currentDeviceSn.value) return "请选择设备";
    return "该设备暂无数值型指标";
});



// === 初始化 ===
onMounted(() => {
  updateTime();
  timer.value = setInterval(updateTime, 1000);
  // 初始化加载预警数据
  fetchAlertList();
  // 建议：每30秒自动拉取一次最新预警信息，保证大屏数据的实时性
  setInterval(fetchAlertList, 30000);
  window.addEventListener('resize', handleResize);

  listProduct({ pageNum: 1, pageSize: 100 }).then(res => {
      allProducts.value = res.rows || [];
      initUserPermissions().then(() => {
          isPermissionReady.value = true;
          loadGlobalStats();
      });
  });
});

onUnmounted(() => {
  clearInterval(timer.value);
  window.removeEventListener('resize', handleResize);
  disposeCharts();
  latestVideoSn = '';
  if (ys7PlayerInstance) {
    try {
      if (typeof ys7PlayerInstance.destroy === 'function') {
        ys7PlayerInstance.destroy();
      } else {
        ys7PlayerInstance.stop();
      }
    } catch (e) {
      console.error(e);
    }
    ys7PlayerInstance = null;
  }
  const container = document.getElementById('ys7-player-container');
  if (container) container.innerHTML = '';
});

function updateTime() {
  currentTime.value = parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s}');
}

// === 视频播放器加载 ===
async function initVideoPlayer(deviceSn) {
  if (!deviceSn) return;
  latestVideoSn = deviceSn;
  videoLoading.value = true;
  try {
    const res = await fetch('https://open.ys7.com/api/lapp/token/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `appKey=${ys7Config.appKey}&appSecret=${ys7Config.appSecret}`
    });

    if (latestVideoSn !== deviceSn) return;

    const data = await res.json();
    if (data.code !== '200') {
      videoLoading.value = false;
      return;
    }
    const token = data.data.accessToken;

    await nextTick();

    setTimeout(() => {
        if (latestVideoSn !== deviceSn) return;

        const container = document.getElementById('ys7-player-container');
        if (!container) return;

        const realWidth = container.clientWidth || 400;
        const realHeight = container.clientHeight || 350;

        if (ys7PlayerInstance) {
          try {
            if (typeof ys7PlayerInstance.destroy === 'function') {
              ys7PlayerInstance.destroy();
            } else {
              ys7PlayerInstance.stop();
            }
          } catch (e) {
            console.error(e);
          }
          ys7PlayerInstance = null;
        }

        container.innerHTML = '';

        ys7PlayerInstance = new EZUIKit.EZUIKitPlayer({
            id: 'ys7-player-container',
            accessToken: token,
            url: `ezopen://open.ys7.com/${deviceSn}/${ys7Config.channelNo}.hd.live`,
            template: 'pcLive',
            autoplay: true,
            audio: 1,
            width: realWidth,
            height: realHeight,
            handleError: (err) => {
              console.warn("EZUIKit Player error intercepted:", err);
            },
            onError: (err) => {
              console.warn("EZUIKit Player onError intercepted:", err);
            }
        });
        videoLoading.value = false;
    }, 300);

  } catch (error) {
    if (latestVideoSn === deviceSn) {
      videoLoading.value = false;
    }
  }
}

// ========================
// 业务和图表数据逻辑
// ========================

async function initUserPermissions() {
    try {
        const userRes = await getUserProfile();
        const user = userRes.data;
        isAdmin.value = user.admin || (user.roles && user.roles.some(r => r.roleKey === 'admin'));
        currentUserId.value = user.userId;
        currentUserParkId.value = user.parkId || null;
    } catch (e) {}
}

function getCommonParams(baseParams = {}) {
    const params = { ...baseParams };
    if (!isAdmin.value && currentUserId.value) {
        params.userId = currentUserId.value;
    }
    return params;
}

function calculateStatsHelper(devices) {
    const total = devices.length;
    const online = devices.filter(d => d.status === '1').length;
    const detail = allProducts.value.map(prod => {
        const subDevices = devices.filter(d => d.productId === prod.productId);
        return {
            id: prod.productId,
            name: formatProductDisplayName(prod),
            total: subDevices.length,
            online: subDevices.filter(d => d.status === '1').length
        };
    }).filter(item => item.total > 0);
    return { total, online, detail };
}

function formatProductType(type) {
    if (String(type) === '0') return '采集终端';
    if (String(type) === '1') return '控制终端';
    return '';
}

function formatProductDisplayName(product) {
    const name = product?.productName || product?.name || '未知产品';
    const typeName = formatProductType(product?.type);
    return typeName ? `${name}（${typeName}）` : name;
}

function getProductById(productId) {
    return allProducts.value.find(item => String(item.productId) === String(productId));
}

function formatDeviceProductType(device) {
    const product = getProductById(device?.productId);
    return formatProductType(device?.productType ?? product?.type) || '未知类型';
}

async function loadGlobalStats() {
    let params = getCommonParams({ pageSize: 9999 });
    const res = await listDevice(params);
    const result = calculateStatsHelper(res.rows || []);
    globalStats.total = result.total;
    globalStats.online = result.online;
    globalStats.detail = result.detail;
}

async function updateParkStats(parkId, parkName) {
    currentParkId.value = parkId;
    currentParkStats.name = parkName;
    const params = getCommonParams({ parkId: parkId, pageSize: 9999 });
    const res = await listDevice(params);
    const result = calculateStatsHelper(res.rows || []);
    currentParkStats.total = result.total;
    currentParkStats.online = result.online;
    currentParkStats.detail = result.detail;
    fetchLiveWeather(parkId);
    fetchForecastWeather(parkId);
    fetchAlertList();
}

async function fetchForecastWeather(parkId) {
  if (!parkId) return;
  try {
    const res = await listWeatherForecast({
      parkId: parkId,
      pageNum: 1,
      pageSize: 7,
      orderByColumn: 'forecastDate',
      isAsc: 'asc',
      params: {
        latest: 'true'
      }
    });
    forecastList.value = res.rows || [];
  } catch (error) {
    console.error("获取天气预报失败", error);
  }
}

function formatForecastDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffTime = dDate.getTime() - dToday.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStrFormatted = `${month}/${day}`;

  if (diffDays === 0) return `今天 (${dateStrFormatted})`;
  if (diffDays === 1) return `明天 (${dateStrFormatted})`;
  if (diffDays === 2) return `后天 (${dateStrFormatted})`;
  
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${weekDays[date.getDay()]} (${dateStrFormatted})`;
}


async function fetchLiveWeather(parkId) {
  if (!parkId) return;
  try {
    const res = await listWeatherLive({
      parkId: parkId,
      pageNum: 1,
      pageSize: 1,
      orderByColumn: 'reportTime',
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
        weatherCode: live.weatherCode || '',
        reportTime: (() => {
          if (live.remark2) {
            try {
              const extra = JSON.parse(live.remark2);
              const qTime = extra.updateTime || (extra.now && extra.now.obsTime);
              if (qTime) {
                return parseTime(qTime, '{m}-{d} {h}:{i}');
              }
            } catch (e) {}
          }
          if (live.fetchTime) {
            return parseTime(live.fetchTime, '{m}-{d} {h}:{i}');
          }
          if (!live.reportTime) return '';
          const formattedReport = parseTime(live.reportTime, '{m}-{d} {h}:{i}');
          if (formattedReport.endsWith('00:00') && live.createTime) {
            return parseTime(live.createTime, '{m}-{d} {h}:{i}');
          }
          return formattedReport;
        })()
      };
    } else {
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
  } catch (error) {
    console.error("获取实时天气失败", error);
  }
}

async function updateAreaStats(areaId, areaName) {
    currentAreaStats.name = areaName;
    const params = getCommonParams({ areaId: areaId, pageSize: 9999 });
    const res = await listDevice(params);
    const result = calculateStatsHelper(res.rows || []);
    currentAreaStats.total = result.total;
    currentAreaStats.online = result.online;
    currentAreaStats.detail = result.detail;
}

const loadNode = (node, resolve) => {
  if (node.level === 0) { loadParks(resolve); return; }
  if (node.data.type === 'park') { loadAreas(node.data.id, resolve, node); return; }
  if (node.data.type === 'area') { loadLocations(node.data.id, resolve, node); return; }
  resolve([]);
}

async function loadParks(resolve) {
  try {
      const params = getCommonParams();
      const res = await listPark(params);
      let parkList = res.data || res.rows || [];
      if (!isAdmin.value && currentUserParkId.value) {
          parkList = parkList.filter(p => p.parkId == currentUserParkId.value);
      }
      const data = parkList.map(item => ({
          id: item.parkId, uniqueId: 'park_' + item.parkId, label: item.parkName, type: 'park', leaf: false
      }));
      resolve(data);
      if (data.length > 0) {
          const firstPark = data[0];
          updateParkStats(firstPark.id, firstPark.label);
          await nextTick();
          const rootNode = treeRef.value.getNode(firstPark.uniqueId);
          if (rootNode) rootNode.expand();
      }
  } catch (e) { resolve([]); }
}

async function loadAreas(parkId, resolve, parentNode) {
  try {
      updateParkStats(parkId, parentNode.data.label);
      currentAreaStats.name = '-'; currentAreaStats.total = 0; currentAreaStats.online = 0; currentAreaStats.detail = [];
      const res = await listAreaByParkId(parkId);
      const data = res.data.map(item => ({
          id: item.areaId, uniqueId: 'area_' + item.areaId, label: item.areaName, type: 'area', leaf: false
      }));
      resolve(data);
      if (data.length > 0) {
           const firstArea = data[0];
           await nextTick();
           const areaNode = treeRef.value.getNode(firstArea.uniqueId);
           if (areaNode) areaNode.expand();
      }
  } catch (e) { resolve([]) }
}

async function loadLocations(areaId, resolve, parentNode) {
  try {
      updateAreaStats(areaId, parentNode.data.label);
      const res = await listLocationByAreaId(areaId);
      const data = res.data.map(item => ({
          id: item.locationId, uniqueId: 'loc_' + item.locationId, label: item.locationName, type: 'location', leaf: true
      }));
      resolve(data);
      if (data.length > 0) {
          const firstLoc = data[0];
          treeRef.value.setCurrentKey(firstLoc.uniqueId);
          handleNodeClick(firstLoc, { parent: parentNode });
      } else {
           locationDeviceList.value = []; resetCenterAndRight();
      }
  } catch (e) { resolve([]) }
}

async function handleNodeClick(data, node) {
    if (data.type === 'location') {
        currentLocationName.value = data.label;
        currentLocationId.value = data.id;
        if(treeRef.value) {
            const currentNode = treeRef.value.getNode(data.uniqueId);
            if(currentNode) {
                 const areaNode = currentNode.parent;
                 if(areaNode && areaNode.data) {
                     currentAreaId.value = areaNode.data.id;
                     updateAreaStats(areaNode.data.id, areaNode.data.label);
                 }
                 const parkNode = areaNode ? areaNode.parent : null;
                 if(parkNode && parkNode.data) {
                     currentParkId.value = parkNode.data.id;
                     updateParkStats(parkNode.data.id, parkNode.data.label);
                 }
            }
        }
        await loadDevicesByLocation(data.id);
    } else if (data.type === 'area') {
        currentLocationId.value = null;
        currentAreaId.value = data.id;
        updateAreaStats(data.id, data.label);
        if (treeRef.value) {
            const currentNode = treeRef.value.getNode(data.uniqueId);
            const parkNode = currentNode ? currentNode.parent : null;
            if (parkNode && parkNode.data) {
                currentParkId.value = parkNode.data.id;
                updateParkStats(parkNode.data.id, parkNode.data.label);
            }
        }
        locationDeviceList.value = []; resetCenterAndRight();
    } else if (data.type === 'park') {
        currentLocationId.value = null;
        currentAreaId.value = null;
        currentParkId.value = data.id;
        updateParkStats(data.id, data.label); locationDeviceList.value = []; resetCenterAndRight();
    }
}

async function loadDevicesByLocation(locationId) {
    const params = getCommonParams({ locationId: locationId });
    const res = await listDevice(params);
    locationDeviceList.value = res.rows || [];

    // ====== 核心逻辑：判断当前位置下是否有摄像头 ======
    const cameras = locationDeviceList.value.filter(d => d.productId == 4 || String(d.productId) === '4');
    if (cameras.length > 0) {
        hasCamera.value = true;
        currentCameraSn.value = cameras[0].deviceSn; // 获取第一个摄像头的编号
        initVideoPlayer(currentCameraSn.value);
    } else {
        hasCamera.value = false;
        currentCameraSn.value = '';
        latestVideoSn = '';
        if (ys7PlayerInstance) {
            try {
              if (typeof ys7PlayerInstance.destroy === 'function') {
                ys7PlayerInstance.destroy();
              } else {
                ys7PlayerInstance.stop();
              }
            } catch (e) {
              console.error(e);
            }
            ys7PlayerInstance = null;
        }
        const container = document.getElementById('ys7-player-container');
        if (container) container.innerHTML = '';
    }

    if (locationDeviceList.value.length > 0) {
        currentDeviceSn.value = locationDeviceList.value[0].deviceSn;
        handleDeviceChange(currentDeviceSn.value);
    } else {
        resetCenterAndRight();
    }
}

async function handleDeviceChange(sn) {
  if (!sn) return;
  logDateRange.value = [];
  logStats.max = '-';
  logStats.min = '-';
  logStats.avg = '-';
  const device = locationDeviceList.value.find(d => d.deviceSn === sn);
  if (!device) return;

  currentDeviceStatus.value = device.status;
  currentProductId.value = device.productId;
  
  fetchAlertList();

  // === 核心修改：如果选中的是摄像头，清空之前的指标和图表数据，并直接返回 ===
  if (currentProductId.value == 4 || currentProductId.value == '4') {
      monitorProps.value = [];
      currentPropName.value = '';
      currentUnit.value = '';
      logList.value = [];
      latestPayload.value = {};
      if (lineChartInstance) {
          lineChartInstance.clear();
      }
      const deviceId = device.deviceId || device.id;
      loadCameraPictures(deviceId);
      loadCameraTasks(deviceId);
      return;
  }

  // 如果是普通传感器，正常获取对应的物模型指标
  const modelRes = await listModel({ productId: device.productId, pageSize: 100 });
  const allModels = modelRes.rows || [];

  monitorProps.value = allModels.filter(m => {
        const isNumeric = ['int', 'float', 'double', 'decimal'].includes(m.type.toLowerCase());
        const isMonitor = m.isMonitor == 1;
        return isNumeric && isMonitor;
    }).map(m => ({
      identifier: m.identifier,
      name: m.modelName,
      unit: m.specs ? (JSON.parse(m.specs).unit || '') : ''
    }));

  if (monitorProps.value.length > 0) {
    currentPropName.value = monitorProps.value[0].name;
    currentUnit.value = monitorProps.value[0].unit;
  } else {
    currentUnit.value = '';
  }
  fetchLogs(sn);
}

function handleLogDateRangeChange() {
  fetchLogs(currentDeviceSn.value);
}

function getPropValue(identifier) {
    if (latestPayload.value && latestPayload.value[identifier] !== undefined) {
        return latestPayload.value[identifier];
    }
    return '--';
}

// 在变量定义区添加
const activePropIdentifier = ref(''); // 当前选中的指标标识符

// 修改或新增以下两个函数
// 1. 处理指标切换
function handlePropChange(identifier) {
  activePropIdentifier.value = identifier;
  const prop = monitorProps.value.find(p => p.identifier === identifier);
  if (prop) {
    currentPropName.value = prop.name;
    currentUnit.value = prop.unit;
  }
  processLogMetricsAndChart();
}

// 2. 核心：数据聚合、去重与统计计算 (替代原有的 fetchLogs 计算逻辑)
function processLogMetricsAndChart() {
  const chartLogs = [...logList.value].reverse();

  // 指标互补聚合：从新到旧遍历，合并所有传感器最新值，解决展示不全
  const complementarySet = {};
  for (let i = logList.value.length - 1; i >= 0; i--) {
      let p = logList.value[i].payload;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
      if (p && typeof p === 'object') {
          Object.keys(p).forEach(key => {
              if (complementarySet[key] === undefined) complementarySet[key] = p[key];
          });
      }
  }
  latestPayload.value = complementarySet;

  // 统计计算
  if (activePropIdentifier.value) {
    const targetKey = activePropIdentifier.value;
    const yValues = chartLogs
      .map(log => {
        let p = log.payload;
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
        return p ? p[targetKey] : null;
      })
      .filter(val => val != null && val !== '')
      .map(Number)
      .filter(n => !isNaN(n));

    if (yValues.length > 0) {
      logStats.max = Math.max(...yValues);
      logStats.min = Math.min(...yValues);
      logStats.avg = (yValues.reduce((a, b) => a + b, 0) / yValues.length).toFixed(2);
    } else { logStats.max = '-'; logStats.min = '-'; logStats.avg = '-'; }
  }
  
  nextTick(() => { renderLineChart(chartLogs); });
}

// 修改 fetchLogs 方法，调用上面的聚合函数
async function fetchLogs(sn) {
  const isFiltered = logDateRange.value && logDateRange.value.length > 0;
  const res = await listDeviceLog(proxy.addDateRange({ deviceSn: sn, pageSize: isFiltered ? 1000 : 50, orderByColumn: 'createTime', isAsc: 'desc' }, logDateRange.value));
  logList.value = res.rows || [];
  
  // 初始化默认激活第一个指标
  if (monitorProps.value.length > 0 && !activePropIdentifier.value) {
    activePropIdentifier.value = monitorProps.value[0].identifier;
    currentPropName.value = monitorProps.value[0].name;
    currentUnit.value = monitorProps.value[0].unit;
  }
  processLogMetricsAndChart();
}

function resetCenterAndRight() {
  currentDeviceSn.value = null;
  currentDeviceStatus.value = '0';
  monitorProps.value = [];
  logList.value = [];
  logDateRange.value = [];
  logStats.max = '-';
  logStats.min = '-';
  logStats.avg = '-';
  latestPayload.value = {};
  hasCamera.value = false;
  latestVideoSn = '';
  if (ys7PlayerInstance) {
      try {
        if (typeof ys7PlayerInstance.destroy === 'function') {
          ys7PlayerInstance.destroy();
        } else {
          ys7PlayerInstance.stop();
        }
      } catch (e) {
        console.error(e);
      }
      ys7PlayerInstance = null;
  }
  const container = document.getElementById('ys7-player-container');
  if (container) container.innerHTML = '';
  disposeCharts();
  fetchAlertList();
}


function renderLineChart(chartLogs) {
  if (lineChartInstance) lineChartInstance.dispose();
  if (!lineChartRef.value) return;

  lineChartInstance = echarts.init(lineChartRef.value);

  // 定义统一符合大屏绿色生态风格的“暂无数据”提示
  const noDataOption = {
    backgroundColor: 'transparent',
    title: {
      text: '暂无数据',
      left: 'center',
      top: 'center',
      textStyle: {
        color: '#86efac', // 浅绿色主题文字
        fontSize: 14,
        fontWeight: 'normal'
      }
    }
  };

  // 场景1：如果没有物联网指标，或者当前没有激活/选中的指标
  if (!monitorProps.value.length || !activePropIdentifier.value) {
    lineChartInstance.setOption(noDataOption);
    return;
  }

  const targetKey = activePropIdentifier.value;
  const xData = [];
  const yData = [];

  chartLogs.forEach(log => {
      let p = log.payload;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) {} }
      const val = p ? p[targetKey] : null;
      // 只有上报了该指标有效值才计入序列，防止画出异常的 0 点或断线
      if (val != null && val !== '') {
          xData.push(parseTime(log.createTime, '{m}-{d} {h}:{i}'));
          yData.push(val);
      }
  });

  // 场景2：虽然有指标，但在选中的时间段（或最新日志）内该指标没有任何有效数据点
  if (xData.length === 0) {
    lineChartInstance.setOption(noDataOption);
    return;
  }

  // 场景3：正常有数据，渲染折线图
  lineChartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis', 
      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
      borderColor: 'rgba(16, 185, 129, 0.3)', 
      textStyle: { color: '#ffffff' }, 
      valueFormatter: (value) => value + ' ' + currentUnit.value 
    },
    grid: { top: 40, left: 40, right: 20, bottom: 20, containLabel: true },
    xAxis: { 
      type: 'category', 
      data: xData, 
      boundaryGap: false, 
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }, 
      axisLabel: { color: '#94a3b8', rotate: 45, fontSize: 10 }, 
      axisTick: { show: false } 
    },
    yAxis: { 
      type: 'value', 
      name: currentUnit.value, 
      nameTextStyle: { color: '#94a3b8' }, 
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } }, 
      axisLine: { show: false }, 
      axisLabel: { color: '#94a3b8' } 
    },
    series: [{
        name: currentPropName.value, 
        data: yData, 
        type: 'line', 
        smooth: true, 
        symbol: 'circle', 
        symbolSize: 6,
        itemStyle: { color: '#080c14', borderColor: '#10b981', borderWidth: 2 },
        lineStyle: { color: '#10b981', width: 2, shadowColor: 'rgba(16,185,129,0.4)', shadowBlur: 8 },
        areaStyle: { 
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.25)' }, 
            { offset: 1, color: 'rgba(16, 185, 129, 0)' }
          ])
        }
    }]
  });
}

function handleResize() { lineChartInstance && lineChartInstance.resize(); }
function disposeCharts() { if (lineChartInstance) lineChartInstance.dispose(); }
function formatPayload(payload) { if (typeof payload === 'object') return JSON.stringify(payload); return payload; }

// ========================
// 摄像头：预置点、定时任务 & 相册逻辑
// ========================

// 0. 打开添加预置点弹窗
function handleAddPreset() {
  const device = locationDeviceList.value.find(d => d.deviceSn === currentCameraSn.value);
  if (!device) return;

  const targetId = device.deviceId || device.id;
  currentCameraDeviceName.value = device.deviceName;

  presetForm.value = {
    deviceId: targetId,
    pointIndex: 1,
    remark: ''
  };

  if (presetRef.value) presetRef.value.resetFields();
  presetOpen.value = true;
}

// 提交预置点
function submitPreset() {
  presetRef.value.validate(valid => {
    if (valid) {
      addCameraPreset(presetForm.value).then(() => {
        ElMessage.success("预置点添加成功");
        presetOpen.value = false;
      });
    }
  });
}


// 1. 打开定时任务弹窗
function handleOpenSchedule() {
  const device = locationDeviceList.value.find(d => d.deviceSn === currentCameraSn.value);
  if (!device) return;

  const targetId = device.deviceId || device.id;
  scheduleForm.value = {
      deviceId: targetId,
      jobType: 'ONCE',
      executeTime: null,
      cronExpression: null,
      remark: '',
      presetId: null,
      count: 1
  };

  if (scheduleRef.value) scheduleRef.value.resetFields();
  cronConfig.type = 'DAILY';
  cronConfig.weekDays = [];
  cronConfig.intervalDays = 2;
  cronConfig.time = '08:00:00';

  currentCameraDeviceName.value = device.deviceName;
  loadPresets(targetId);
  scheduleOpen.value = true;
}

// 2. 加载当前摄像头的预置点
function loadPresets(deviceId) {
    presetOptions.value = [];
    listCameraPreset({ deviceId: deviceId }).then(res => {
        presetOptions.value = res.rows || res.data || [];
    });
}

// 3. 生成 CRON 表达式
function generateCronExpression() {
  const time = cronConfig.time;
  if (!time) return '';
  const [hh, mm, ss] = time.split(':');
  if (cronConfig.type === 'DAILY') return `${ss} ${mm} ${hh} * * ?`;
  else if (cronConfig.type === 'WEEKLY') {
    const days = cronConfig.weekDays.join(',');
    return days ? `${ss} ${mm} ${hh} ? * ${days}` : '';
  } else if (cronConfig.type === 'INTERVAL') return `${ss} ${mm} ${hh} 1/${cronConfig.intervalDays} * ?`;
  return '';
}

// 4. 提交定时任务
function submitSchedule() {
  scheduleRef.value.validate(valid => {
    if (valid) {
      if (scheduleForm.value.jobType === 'CRON') {
         if (!cronConfig.time || (cronConfig.type === 'WEEKLY' && cronConfig.weekDays.length === 0)) {
            ElMessage.error("请完善配置");
            return;
         }
         scheduleForm.value.cronExpression = generateCronExpression();
      }

      const device = locationDeviceList.value.find(d => d.deviceSn === currentCameraSn.value);
      const postData = {
        ...scheduleForm.value,
        taskName: `${currentCameraDeviceName.value}-${device.deviceSn}-${new Date().getTime()}`,
        creatorId: currentUserId.value
      };

      addCameraTask(postData).then(() => {
        ElMessage.success("任务创建成功");
        scheduleOpen.value = false;
      });
    }
  });
}

// 5. 查看相册
function handleViewGallery() {
  const device = locationDeviceList.value.find(d => d.deviceSn === currentCameraSn.value);
  if (!device) return;

  const targetId = device.deviceId || device.id;
  currentCameraDeviceName.value = device.deviceName;
  galleryOpen.value = true;
  galleryLoading.value = true;
  galleryList.value = [];

  const params = {
    deviceId: targetId,
    pageNum: 1,
    pageSize: 50,
    orderByColumn: 'captureTime',
    isAsc: 'desc',
    userId: isAdmin.value ? null : currentUserId.value
  };

  listRecord(params).then(res => {
    galleryList.value = res.rows || [];
    galleryLoading.value = false;
  }).catch(() => {
    galleryLoading.value = false;
  });
}

// 6. 图片预览相关
function openImageViewer(index) {
  initialIndex.value = index;
  showViewer.value = true;
}

function closeImageViewer() {
  showViewer.value = false;
}

</script>

<style scoped lang="scss">
/* ===== 智慧农业生态绿洲主题变量 ===== */
$bg-dark:        #041a10; /* 深邃林木绿 */
$bg-panel:       rgba(5, 34, 21, 0.65); /* 森林绿玻璃拟态 */
$bg-card:        rgba(255, 255, 255, 0.03); /* 轻透白 */
$accent-green:   #10b981; /* 嫩芽绿 */
$accent-cyan:    #34d399; /* 浅薄荷绿 */
$accent-yellow:  #fbbf24; /* 丰收金黄 */
$accent-red:     #f87171; /* 成熟果红 */
$border-green:   rgba(16, 185, 129, 0.22);
$border-cyan:    rgba(52, 211, 153, 0.18);
$text-bright:    #f0fdf4; /* 护眼有机白 */
$text-normal:    #cbd5e1; /* 灰白 */
$text-muted:     #86efac; /* 浅绿 */
$text-dim:       #047857; /* 深翠 */
$glow-green:     0 8px 32px 0 rgba(4, 28, 17, 0.45);

.header-left-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  background: rgba(16, 185, 129, 0.1) !important;
  border: 1px solid rgba(16, 185, 129, 0.3) !important;
  color: #34d399 !important;
  transition: all 0.3s !important;
  
  &:hover {
    background: rgba(16, 185, 129, 0.25) !important;
    border-color: #34d399 !important;
    color: #ffffff !important;
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  }
}

/* ===== 动画定义 ===== */
@keyframes status-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); opacity: 1; }
  50%       { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); opacity: 0.6; }
}

@keyframes list-fade {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes alert-pulse {
  0%, 100% { border-left-color: #ef4444; }
  50%       { border-left-color: rgba(239, 68, 68, 0.4); }
}

/* 温暖阳光与生态绿光晕动效 */
@keyframes drift-slow {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 20px) scale(1.15); }
}
@keyframes drift-medium {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-60px, -30px) scale(0.9); }
}
@keyframes drift-fast {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(20px, -40px) scale(1.05); }
}

/* 生态绿洲暖阳光晕 */
.aurora-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  z-index: 0;
  pointer-events: none;
  opacity: 0.28;
  transition: all 1s ease;
  mix-blend-mode: screen;

  &.blob-1 {
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%);
    top: -90px;
    left: -120px;
    animation: drift-slow 22s infinite alternate ease-in-out;
  }
  &.blob-2 {
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%);
    bottom: -120px;
    right: -90px;
    animation: drift-medium 28s infinite alternate ease-in-out;
  }
  &.blob-3 {
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%);
    top: 30%;
    left: 40%;
    animation: drift-fast 20s infinite alternate ease-in-out;
  }
}

/* ===== 核心容器 ===== */
.dashboard-container {
  position: relative;
  width: 100%;
  height: 100vh !important;
  box-sizing: border-box;
  background-color: $bg-dark;
  background-image: radial-gradient(ellipse at 50% -20%, rgba(16, 185, 129, 0.15), transparent 85%);
  color: $text-bright;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  z-index: 1;
}

/* 移除科技风格网格，使用温润的植物叶脉柔光纹理 */
.bg-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 0),
    radial-gradient(rgba(16, 185, 129, 0.02) 2px, transparent 0);
  background-size: 40px 40px;
  background-position: 0 0, 20px 20px;
  pointer-events: none;
  z-index: 0;
}

/* ===== 顶部标题栏 ===== */
.header {
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 12px;
  margin-bottom: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  z-index: 2;
  flex-shrink: 0;
}

.header-left-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding-left: 20px;
  min-width: 160px;

  .sys-badge {
    font-size: 11px;
    color: $accent-cyan;
    letter-spacing: 1.5px;
    font-weight: 600;
  }

  .sys-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: $accent-green;
    letter-spacing: 1px;
    font-weight: 500;
  }
}

.status-dot-anim {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: $accent-green;
  box-shadow: 0 0 8px $accent-green;
}

.header-center {
  text-align: center;
  flex: 1;

  .header-en-title {
    font-size: 9px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 2px;
    font-weight: 600;
  }

  .header-title {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 3px;
    background: linear-gradient(135deg, #ffffff 25%, #a7f3d0 65%, #10b981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

.header-right-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding-right: 20px;
  min-width: 160px;

  .header-time {
    font-size: 14px;
    color: $accent-cyan;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .header-date-label {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 1.5px;
  }
}

/* ===== 主内容区域 ===== */
.main-content {
  height: calc(100vh - 110px) !important;
  flex-shrink: 0 !important;
  display: flex;
  gap: 12px;
  min-height: 0;
  position: relative;
  z-index: 1;

  .panel { display: flex; flex-direction: column; gap: 12px; }
  .left-panel, .right-panel { width: 25%; min-width: 300px; }

  .center-panel {
    flex: 1;
    min-width: 400px;
    overflow-y: auto;
    &::-webkit-scrollbar { display: none; }
    -ms-overflow-style: none; scrollbar-width: none;
    .panel-box { flex-shrink: 0; }
  }
}

/* ===== 统一面板风格 ===== */
.panel-box {
  background: $bg-panel;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(16, 185, 129, 0.3);
    box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.06), 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  }

  &.flex-grow { flex: 1; min-height: 0; }
}

/* ===== 面板标题 ===== */
.panel-title {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13.5px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;

  .title-icon {
    color: $accent-green;
    font-size: 14px;
    display: flex;
    align-items: center;
  }

  .title-en {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 1px;
    margin-left: 6px;
  }
}

/* ===== 左侧面板 ===== */
.left-panel {
  height: 100%;
  overflow-y: auto;
  &::-webkit-scrollbar { display: none; }

  .stats-wrapper { flex: 0 0 auto; display: flex; flex-direction: column; gap: 12px; }
  .tree-panel-box { flex: 0 0 auto; min-height: 380px; display: flex; flex-direction: column; margin-bottom: 10px; }
}

/* ===== 概览统计卡片 ===== */
.overview-list-card {
  padding-bottom: 4px;

  .card-header-sm {
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    background: rgba(255, 255, 255, 0.01);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    .title-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
    }

    .header-tag {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.3);
      letter-spacing: 1px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.02);
    }

    .icon-global { color: $accent-cyan; }
    .icon-park   { color: $accent-yellow; }
    .icon-area   { color: $accent-green; }
  }

  .product-rows {
    padding: 6px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .prod-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 4px;
    font-size: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: all 0.2s;
    color: $text-normal;

    &:last-child { border-bottom: none; }

    &:hover { background: rgba(255, 255, 255, 0.03); color: #ffffff; }

    &.total-row {
      font-weight: 700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 2px;
      padding-bottom: 8px;
      color: $accent-green;
    }

    .name {
      flex: 1;
      margin-right: 10px;
    }

    .empty-row {
      color: $text-muted;
      text-align: center;
      padding: 8px;
      font-size: 11px;
      width: 100%;
    }

    .stat-pair {
      display: flex;
      align-items: baseline;
      gap: 3px;

      .val-label {
        font-size: 9px;
        color: $text-muted;
        &.text-green { color: $accent-green; }
      }

      .val {
        font-size: 13.5px;
        font-weight: 700;
        color: #ffffff;
        &.text-green {
          color: $accent-green;
        }
      }

      .divider { color: rgba(255, 255, 255, 0.15); font-size: 11px; margin: 0 2px; }
    }
  }
}

/* ===== 位置树 ===== */
.location-tree {
  flex: 1;
  padding: 8px;
  overflow: visible;

  .agri-tree {
    background: transparent;
    color: $text-normal;

    :deep(.el-tree-node__content) {
      height: 36px;
      border-radius: 6px;
      transition: background-color 0.2s;
      &:hover {
        background: rgba(16, 185, 129, 0.08) !important;
        color: #ffffff;
      }
    }

    :deep(.el-tree-node:focus > .el-tree-node__content) {
      background: rgba(16, 185, 129, 0.08) !important;
    }

    :deep(.el-tree-node.is-current > .el-tree-node__content) {
      background: rgba(16, 185, 129, 0.15) !important;
      border: 1px solid rgba(16, 185, 129, 0.25) !important;
      color: $accent-green !important;
      font-weight: 700;
      
      &:hover {
        background: rgba(16, 185, 129, 0.18) !important;
      }
    }

    :deep(.el-tree-node__expand-icon) { color: rgba(255, 255, 255, 0.3); }
  }

  .custom-tree-node {
    display: flex;
    align-items: center;
    font-size: 12.5px;

    .node-label {
      margin-left: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 170px;
    }

    .icon-park     { color: $accent-yellow; }
    .icon-area     { color: $accent-green; }
    .icon-location { color: $accent-cyan; }
  }

  .tree-loading {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: $text-muted;
    font-size: 12px;
    gap: 8px;
  }
}

/* ===== 中间面板 - 设备栏 ===== */
.device-bar {
  flex-direction: row;
  align-items: center;
  padding: 12px 18px;
  margin-bottom: 0;
  gap: 0;

  .bar-loc-section {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .bar-label {
    color: $accent-green;
    font-weight: 700;
    font-size: 13.5px;
    white-space: nowrap;
  }

  .current-location {
    color: #ffffff;
    font-weight: 700;
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-tag {
    margin-left: 14px;
    padding: 5px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    min-width: 76px;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;

    &.on {
      background: rgba(16, 185, 129, 0.1);
      color: $accent-green;
      border: 1px solid rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    }

    &.off {
      background: rgba(255, 255, 255, 0.05);
      color: $text-muted;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .status-led {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  }
}

/* ===== 实时指标 ===== */
.metric-section {
  margin-bottom: 0;

  .metric-row {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 10px;
    padding: 14px 16px;
    overflow-x: auto;
    background: transparent;

    &::-webkit-scrollbar { height: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
  }

  .metric-item {
    flex: 0 0 auto;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 100px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s;

    &:hover {
      background: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.25);
      transform: translateY(-2px);
      
      .m-val {
        color: $accent-green;
        text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
      }
    }

    .m-name {
      font-size: 11px;
      color: $text-muted;
      letter-spacing: 0.5px;
    }

    .m-val-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .m-val {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
      transition: all 0.2s;
    }

    .m-unit {
      font-size: 11px;
      color: $text-muted;
    }
  }

  .empty-hint {
    color: $text-muted;
    font-size: 12px;
  }
}

/* ===== 视频监控区域 ===== */
.video-section {
  flex: 1;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;

  .el-button {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: $text-normal !important;
    border-radius: 6px;
    transition: all 0.25s;
    
    &:hover {
      background: rgba(16, 185, 129, 0.15) !important;
      border-color: rgba(16, 185, 129, 0.3) !important;
      color: $accent-green !important;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
    }
    
    &.el-button--warning {
      &:hover {
        background: rgba(245, 158, 11, 0.15) !important;
        border-color: rgba(245, 158, 11, 0.3) !important;
        color: $accent-yellow !important;
        box-shadow: 0 0 8px rgba(245, 158, 11, 0.2);
      }
    }
    &.el-button--primary {
      &:hover {
        background: rgba(59, 130, 246, 0.15) !important;
        border-color: rgba(59, 130, 246, 0.3) !important;
        color: #60a5fa !important;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
      }
    }
    &.el-button--success {
      &:hover {
        background: rgba(16, 185, 129, 0.15) !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
        color: $accent-green !important;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
      }
    }
  }

  .video-container {
    flex: 1;
    width: 100%;
    min-height: 330px;
    background-color: #020617;
    position: relative;
    overflow: hidden;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .video-empty {
    flex: 1;
    min-height: 330px;
    background: rgba(15, 23, 42, 0.3);
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;

    :deep(.el-empty__description p) { color: $text-muted; }
  }
}

.video-reticle {
  position: absolute;
  width: 14px;
  height: 14px;
  z-index: 10;
  pointer-events: none;

  &.tl { top: 12px; left: 12px; border-top: 2px solid $accent-green; border-left: 2px solid $accent-green; }
  &.tr { top: 12px; right: 12px; border-top: 2px solid $accent-green; border-right: 2px solid $accent-green; }
  &.bl { bottom: 12px; left: 12px; border-bottom: 2px solid $accent-green; border-left: 2px solid $accent-green; }
  &.br { bottom: 12px; right: 12px; border-bottom: 2px solid $accent-green; border-right: 2px solid $accent-green; }
}

/* ===== 预警区域 ===== */
.alert-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  margin-bottom: 0;
}

.alert-count-badge {
  background: rgba(239, 68, 68, 0.1);
  color: $accent-red;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 6px;
  margin-left: 4px;
}

.alert-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;

  .alert-item {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-left: 3px solid $accent-red;
    padding: 10px 14px;
    margin-bottom: 10px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.25s;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
      transform: translateX(2px);
      border-color: rgba(255, 255, 255, 0.08);
    }

    &.warning {
      border-left-color: $accent-yellow;
    }
    
    &.info {
      border-left-color: $accent-cyan;
    }
    
    .alert-tag {
      font-size: 10px;
      padding: 0px 6px;
      border-radius: 4px;
      font-weight: 700;

      &.danger  { background: rgba(239, 68, 68, 0.15); color: $accent-red; border: 1px solid rgba(239, 68, 68, 0.25); }
      &.warning { background: rgba(245, 158, 11, 0.15);  color: $accent-yellow; border: 1px solid rgba(245, 158, 11, 0.25); }
      &.info    { background: rgba(6, 182, 212, 0.15);  color: $accent-cyan; border: 1px solid rgba(6, 182, 212, 0.25); }
    }

    .alert-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .alert-time {
      font-size: 10.5px;
      color: $text-muted;
      margin-left: auto;
    }

    .alert-desc {
      font-size: 12.5px;
      color: $text-normal;
      line-height: 1.5;
    }
  }
}

/* ===== 右侧面板 ===== */
.right-panel {
  height: 100%;
  overflow-y: auto;
  &::-webkit-scrollbar { display: none; }

  .panel-box { flex-shrink: 0; }
  .flex-grow { min-height: 260px; }
}

/* ===== 气象卡片 ===== */
.weather-card {
  padding: 14px 16px;
  background: rgba(15, 23, 42, 0.45);
  flex: 0 0 auto;

  .weather-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .city {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;

      .title-text-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .update-time {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.45);
        font-weight: normal;
        padding-left: 19px;
        white-space: nowrap;
      }
    }

    .weather-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: $accent-yellow;
    }
  }

  .weather-body {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .temp-box {
    display: flex;
    align-items: flex-start;

    .temp {
      font-size: 40px;
      font-weight: 800;
      color: $accent-green;
      line-height: 1;
    }

    .unit {
      font-size: 16px;
      font-weight: 600;
      color: $accent-green;
      margin-top: 4px;
      margin-left: 2px;
    }
  }

  .weather-details {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .detail-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 11.5px;

      .label { color: $text-muted; }

      .val {
        color: $text-normal;
        font-weight: 600;
        &.text-green { color: $accent-green; }
      }
    }
  }

  .weather-forecast {
    margin-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 12px;

    .forecast-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .title-text {
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
      }

      .title-en {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.25);
        letter-spacing: 0.5px;
      }
    }

    .forecast-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .forecast-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      font-size: 11px;
      color: $text-normal;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(16, 185, 129, 0.05);
        border-color: rgba(16, 185, 129, 0.2);
        transform: translateX(2px);
        
        .forecast-icon {
          color: $accent-green;
          filter: drop-shadow(0 0 3px rgba(16, 185, 129, 0.4));
        }
      }

      .date {
        width: 75px;
        font-weight: 500;
        color: $text-normal;
      }

      .weather-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-start;
        padding-left: 10px;

        .forecast-icon {
          font-size: 14px;
          color: $accent-yellow;
          vertical-align: middle;
        }

        .text {
          color: $text-normal;
        }
      }

      .temp-range {
        display: flex;
        align-items: center;
        gap: 4px;
        font-family: monospace;
        font-weight: 600;
        min-width: 70px;
        justify-content: flex-end;

        .min {
          color: $accent-cyan;
        }

        .bar {
          width: 8px;
          height: 1.5px;
          background: rgba(255, 255, 255, 0.15);
        }

        .max {
          color: $accent-green;
        }
      }
    }

    .forecast-empty {
      text-align: center;
      padding: 15px;
      font-size: 11.5px;
      color: $text-muted;
    }
  }
}

/* ===== 图表区域 ===== */
.chart-box {
  background: transparent;
  padding: 5px;
}

/* ===== 日志列表 ===== */
.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.1);

  .log-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    font-size: 11.5px;

    &:last-child { border-bottom: none; }

    .time {
      color: $accent-cyan;
      white-space: nowrap;
      flex-shrink: 0;
      opacity: 0.8;
    }

    .content {
      color: $text-normal;
      word-break: break-all;
      line-height: 1.4;

      .key {
        color: $accent-green;
        margin-right: 5px;
        font-weight: 600;
      }
    }
  }
}

/* ===== 编队/抓拍任务等 ===== */
.camera-tasks {
  :deep(.el-card) {
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    color: #ffffff;
    border-radius: 8px;
  }

  :deep(.el-card__body) { padding: 10px; }

  h4 { margin: 0 0 4px 0; color: #ffffff; font-size: 12.5px; font-weight: 700; }
  p  { margin: 0; color: $text-normal; font-size: 11px; }

  :deep(.el-timeline-item__tail)  { border-left-color: rgba(255, 255, 255, 0.1); }
  :deep(.el-timeline-item__node) { background: $bg-dark !important; border-color: $accent-green !important; }
}

.capture-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.capture-item {
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.01);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(16, 185, 129, 0.3);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
    transform: translateY(-2px);
    
    .capture-img {
      transform: scale(1.04);
    }
    
    .img-hover-overlay {
      opacity: 1;
    }
  }
}

.img-wrapper {
  height: 110px;
  overflow: hidden;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.capture-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.img-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: $accent-green;
  font-size: 18px;
}

.img-desc {
  padding: 8px;
  font-size: 11px;
  color: $text-normal;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  
  .type-tag {
    font-size: 9px;
    padding: 0px 4px;
    border-radius: 3px;
    line-height: 1.3;
    
    &.task {
      background: rgba(16, 185, 129, 0.1);
      color: $accent-green;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    
    &.manual {
      background: rgba(245, 158, 11, 0.1);
      color: $accent-yellow;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
  }
}

.gallery-container { padding: 0 16px; }
.gallery-card {
  margin-bottom: 5px;
  :deep(.el-card__body) { background: $bg-card !important; border: none; }
}

.gallery-image-wrapper {
  height: 140px;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;

  .gallery-img-real {
    width: 100%; height: 100%;
    object-fit: cover;
    transition: transform 0.25s;
  }

  &:hover .gallery-img-real { transform: scale(1.04); }

  .zoom-hint {
    position: absolute; inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s;
    color: $accent-green; font-size: 20px;
  }

  &:hover .zoom-hint { opacity: 1; }
}

.gallery-info  { margin-top: 10px; font-size: 12px; color: $text-normal; }
.source-row    { display: flex; align-items: center; gap: 6px; }

.custom-scroll {
  &::-webkit-scrollbar { width: 4px; height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
  &::-webkit-scrollbar-track { background: transparent; }
}

.flex-center { display: flex; justify-content: center; align-items: center; }
.text-green  { color: $accent-green !important; }
.text-gray   { color: $text-muted !important; }
.text-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.device-product-type {
  float: left;
  max-width: 96px;
  margin-left: 12px;
  overflow: hidden;
  color: #8ee7c4;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.agri-select .el-input__wrapper) {
  background: rgba(15, 23, 42, 0.8) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset !important;
  border-radius: 6px;
}

:deep(.agri-select .el-input__inner) { color: #ffffff !important; }

:deep(.agri-select .el-select__placeholder) { color: $text-muted !important; }

:deep(.el-empty__description p) { color: $text-muted; }

.list-enter-active { animation: list-fade 0.3s ease; }
.list-leave-active { transition: opacity 0.2s; }
.list-leave-to    { opacity: 0; }
</style>

<style lang="scss">
/* ===== 全局暗色极光科技感 Popper / Dialog 覆盖 ===== */
.el-popper.agri-select-popper {
  background: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
  border-radius: 8px;

  .el-select-dropdown__list {
    background: transparent !important;
    padding: 4px 0 !important;
  }

  .el-select-dropdown__item {
    color: #cbd5e1 !important;
    background: transparent !important;
    font-size: 12.5px !important;
    height: 34px !important;
    line-height: 34px !important;
    padding: 0 16px !important;

    &.hover, &:hover {
      background: rgba(16, 185, 129, 0.15) !important;
      color: #34d399 !important;
    }

    &.selected {
      color: #00f5a0 !important;
      background: rgba(16, 185, 129, 0.1) !important;
      font-weight: bold !important;
    }
  }

  .el-popper__arrow::before {
    background: rgba(15, 23, 42, 0.95) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
}

.el-popper.agri-date-popper {
  background: rgba(15, 23, 42, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
  color: #cbd5e1 !important;
  border-radius: 8px;

  .el-picker-panel {
    background: transparent !important;
    color: #cbd5e1 !important;
    border: none !important;
  }

  .el-date-picker__header {
    color: #cbd5e1 !important;
  }

  .el-picker-panel__icon-btn {
    color: #cbd5e1 !important;
    &:hover { color: #10b981 !important; }
  }

  .el-date-picker__header-label {
    color: #cbd5e1 !important;
    &:hover { color: #10b981 !important; }
  }

  .el-date-table th {
    color: rgba(255, 255, 255, 0.4) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }

  .el-date-table td.next-month, .el-date-table td.prev-month {
    color: #475569 !important;
  }

  .el-date-table td.normal {
    color: #cbd5e1 !important;
  }

  .el-date-table td.today .el-date-table-cell__text {
    color: #10b981 !important;
    font-weight: bold !important;
  }

  .el-date-table td.current:not(.disabled) .el-date-table-cell__text {
    background-color: #10b981 !important;
    color: #020617 !important;
  }

  .el-date-table td.available:hover {
    color: #34d399 !important;
  }

  .el-time-spinner__item {
    color: rgba(255, 255, 255, 0.5) !important;
    &:hover {
      background: rgba(16, 185, 129, 0.15) !important;
      color: #34d399 !important;
    }
    &.active {
      color: #10b981 !important;
      background: rgba(16, 185, 129, 0.1) !important;
      font-weight: bold !important;
    }
  }

  .el-time-panel {
    background: rgba(15, 23, 42, 0.96) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
  }

  .el-time-panel__footer {
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    background: transparent !important;
  }

  .el-time-panel__btn {
    color: #cbd5e1 !important;
    &.confirm { color: #10b981 !important; }
  }

  .el-picker-panel__footer {
    background: transparent !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    
    .el-button {
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      color: #cbd5e1 !important;
      &:hover {
        background: rgba(16, 185, 129, 0.15) !important;
        color: #fff !important;
      }
      &.is-text {
        border: none !important;
        background: transparent !important;
      }
    }
  }

  .el-popper__arrow::before {
    background: rgba(15, 23, 42, 0.95) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
}

/* cyber-dialog 曜石极光弹窗重构 */
.el-dialog.cyber-dialog {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-top: 2px solid rgba(16, 185, 129, 0.4) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
  border-radius: 12px !important;
  
  .el-dialog__title {
    color: #ffffff !important;
    font-weight: 700 !important;
    font-size: 15px !important;
  }
  
  .el-dialog__headerbtn .el-dialog__close {
    color: #cbd5e1 !important;
    &:hover { color: #10b981 !important; }
  }

  .el-form-item__label {
    color: #cbd5e1 !important;
    font-weight: 500 !important;
  }

  .el-input__wrapper, .el-select .el-input__wrapper, .el-input-number .el-input__wrapper {
    background: rgba(15, 23, 42, 0.8) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset !important;
    border-radius: 6px !important;
  }

  .el-input__wrapper.is-focus, .el-select .el-input__wrapper.is-focus {
    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.4) inset !important;
  }

  .el-input__inner, .el-select .el-input__inner {
    color: #ffffff !important;
  }
  
  .el-input-number__decrease, .el-input-number__increase {
    background: rgba(15, 23, 42, 0.95) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #cbd5e1 !important;
    &:hover { color: #10b981 !important; }
  }

  .el-radio {
    color: #cbd5e1 !important;
    &.is-checked {
      .el-radio__inner {
        border-color: #10b981 !important;
        background: #10b981 !important;
      }
      .el-radio__label {
        color: #10b981 !important;
      }
    }
  }

  .el-checkbox {
    color: #cbd5e1 !important;
    &.is-checked {
      .el-checkbox__inner {
        border-color: #10b981 !important;
        background: #10b981 !important;
      }
      .el-checkbox__label {
        color: #10b981 !important;
      }
    }
  }

  .el-textarea__inner {
    background: rgba(15, 23, 42, 0.8) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    color: #ffffff !important;
    box-shadow: none !important;
    border-radius: 6px;
    &:focus {
      border-color: rgba(16, 185, 129, 0.4) !important;
    }
  }

  .text-muted {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    
    .el-button {
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      color: #cbd5e1 !important;
      border-radius: 6px;
      transition: all 0.25s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(255, 255, 255, 0.15) !important;
        color: #ffffff !important;
      }
      
      &.el-button--primary {
        background: #10b981 !important;
        border-color: #10b981 !important;
        color: #020617 !important;
        font-weight: 600 !important;
        
        &:hover {
          background: #34d399 !important;
          border-color: #34d399 !important;
          color: #ffffff !important;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }
      }
    }
  }
}
.metric-item.is-active {
    background: rgba(16, 185, 129, 0.15) !important;
    border-color: rgba(52, 211, 153, 0.5) !important;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    .m-name { color: #ffffff !important; font-weight: bold; }
    .m-val { color: #34d399 !important; }
}

</style>

