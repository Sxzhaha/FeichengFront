<template>
  <el-col :span="24">
    <el-card class="video-card">
      <div class="video-container">
        <div class="main-layout">
          <div class="right-sidebar" ref="rightSidebar">
            
            <div class="controls">
              <el-tooltip content="截取当前浏览器画面保存在本地" placement="top">
                <el-button type="primary" plain @click="captureCurrentScreen" :loading="isCapturing">
                  <el-icon><Camera /></el-icon> <span>本地截图</span>
                </el-button>
              </el-tooltip>

              <el-tooltip content="发送指令给设备抓拍并上传云端" placement="top">
                <el-button type="warning" plain @click="handleServerCapture" :loading="isServerCapturing">
                  <el-icon><Aim /></el-icon> <span>云端抓拍</span>
                </el-button>
              </el-tooltip>

              <el-tooltip content="将当前摄像头位置保存为预置点" placement="top">
                <el-button type="success" plain @click="handleOpenAddPreset">
                  <el-icon><LocationInformation /></el-icon> <span>添加预置点</span>
                </el-button>
              </el-tooltip>

              <el-tooltip content="设置自动定时抓拍任务" placement="top">
                <el-button type="primary" @click="handleOpenSchedule">
                  <el-icon><Timer /></el-icon> <span>定时抓拍</span>
                </el-button>
              </el-tooltip>
              
              <el-button :type="showPhotoPanel ? 'success' : 'default'" @click="togglePhotoPanel">
                <el-icon><Picture /></el-icon> <span>{{ showPhotoPanel ? '隐藏相册' : '历史相册' }}</span>
              </el-button>
            </div>
            
            <div class="video-area">
              <el-skeleton v-if="loading" class="video-skeleton" :rows="3" animated />
              
              <div v-else-if="errorMsg" class="error-state">
                <el-icon :size="40"><Warning /></el-icon> 
                <span>{{ errorMsg }}</span>
                <el-button type="primary" link @click="fetchDeviceList">点击重试</el-button>
              </div>
              
              <el-empty v-else-if="deviceList.length === 0" description="暂无可用设备" />
              
              <div v-else class="aspect-ratio-container">
                <div class="video-grid" ref="videoGrid">
                  <div id="ezuikit-player-1" class="video-item"></div>
                </div>

                <div class="video-label" v-if="currentDeviceName">
                   <span class="device-name">{{ currentDeviceName }}</span>
                </div>
              </div>
              
              <transition name="el-zoom-in-bottom">
                <div class="photos-section" v-if="showPhotoPanel">
                   <div class="photos-header">
                     <div class="header-left">
                       <el-icon><Picture /></el-icon>
                       <span class="title">云端抓拍记录 ({{ galleryTotal }})</span>
                       <el-tag size="small" type="info" v-if="currentDeviceName" effect="plain">{{ currentDeviceName }}</el-tag>
                     </div>
                     <div class="header-right">
                        <el-button type="primary" link icon="Refresh" @click="fetchCloudPhotos" :loading="galleryLoading">刷新</el-button>
                        <el-button type="danger" link icon="Close" @click="showPhotoPanel = false"></el-button>
                     </div>
                   </div>
                   
                   <div class="photo-list" v-loading="galleryLoading">
                      <div class="photo-item" v-for="(photo, index) in galleryList" :key="photo.id || index">
                         <div class="img-wrapper" @click="openImageViewer(index)">
                            <img :src="photo.url" loading="lazy" @error="handleImageError($event)"/>
                            <div class="hover-mask"><el-icon><ZoomIn /></el-icon></div>
                         </div>
                         <div class="photo-meta">
                            <span class="time">{{ parseTime(photo.captureTime, '{m}-{d} {h}:{i}') }}</span>
                            <el-tag size="small" :type="photo.taskId ? 'success' : 'warning'" effect="dark" class="mini-tag">
                              {{ photo.taskId ? '定时' : '手动' }}
                            </el-tag>
                         </div>
                      </div>
                      <el-empty v-if="!galleryLoading && galleryList.length === 0" description="暂无记录" :image-size="60" />
                   </div>
                </div>
              </transition>
              
              <div class="zone-selection" v-if="!loading && deviceList.length > 0">
                <div class="camera-thumbnails">
                  <div 
                    class="camera-thumbnail"
                    v-for="item in deviceList"  
                    :key="item.serial"  
                    @click="selectCamera(item.serial)"  
                    :class="{ 'active': item.serial === selectedDevice }" 
                  >
                      <div class="thumbnail-icon-wrapper">
                        <el-icon :size="32" color="#909399" v-if="item.serial !== selectedDevice"><VideoCamera /></el-icon>
                        <el-icon :size="32" color="#409EFF" v-else><VideoPlay /></el-icon>
                      </div>
                      <div class="thumbnail-name" :title="item.name">{{ item.name }}</div>
                  </div>
                </div>        
              </div>

            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog title="新建定时抓拍任务" v-model="scheduleOpen" width="550px" append-to-body destroy-on-close>
       <el-form ref="scheduleRef" :model="scheduleForm" :rules="scheduleRules" label-width="100px">
          <el-form-item label="当前设备"><el-input v-model="currentDeviceName" disabled /></el-form-item>
          <el-form-item label="预置点" prop="presetId">
             <el-select v-model="scheduleForm.presetId" placeholder="选择预置点 (必选)" style="width: 100%" clearable>
                <el-option v-for="p in presetOptions" :key="p.id" :label="`[${p.pointIndex}] ${p.remark || '无备注'}`" :value="p.id">
                   <span style="float: left; font-weight: bold">#{{ p.pointIndex }}</span>
                   <span style="float: right; color: #8492a6; font-size: 13px">{{ p.remark }}</span>
                </el-option>
             </el-select>
             <div class="form-tip">必须指定预置点以确保抓拍位置准确。</div>
          </el-form-item>
          <el-form-item label="任务类型" prop="jobType">
             <el-radio-group v-model="scheduleForm.jobType">
                <el-radio label="ONCE">单次执行</el-radio>
                <el-radio label="CRON">周期循环</el-radio>
             </el-radio-group>
          </el-form-item>
          <el-form-item label="执行次数" prop="count">
             <el-input-number v-model="scheduleForm.count" :min="1" :max="99" controls-position="right" style="width: 120px" />
             <span style="margin-left: 10px; font-size: 12px; color: #909399">张 (每次任务连续抓拍数)</span>
          </el-form-item>
          <el-form-item label="执行时间" prop="executeTime" v-if="scheduleForm.jobType === 'ONCE'">
             <el-date-picker v-model="scheduleForm.executeTime" type="datetime" placeholder="选择日期时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%"/>
          </el-form-item>
          <template v-if="scheduleForm.jobType === 'CRON'">
             <el-form-item label="循环策略">
                <el-radio-group v-model="cronConfig.type">
                   <el-radio label="DAILY">每天</el-radio>
                   <el-radio label="WEEKLY">每周</el-radio>
                   <el-radio label="INTERVAL">间隔天数</el-radio>
                   <el-radio label="HOURLY">每小时指定分钟</el-radio>
                </el-radio-group>
             </el-form-item>
             <el-form-item label="选择星期" v-if="cronConfig.type === 'WEEKLY'">
                <el-checkbox-group v-model="cronConfig.weekDays">
                   <el-checkbox label="2">一</el-checkbox>
                   <el-checkbox label="3">二</el-checkbox>
                   <el-checkbox label="4">三</el-checkbox>
                   <el-checkbox label="5">四</el-checkbox>
                   <el-checkbox label="6">五</el-checkbox>
                   <el-checkbox label="7">六</el-checkbox>
                   <el-checkbox label="1">日</el-checkbox>
                </el-checkbox-group>
             </el-form-item>
             <el-form-item label="间隔天数" v-if="cronConfig.type === 'INTERVAL'">
                每 <el-input-number v-model="cronConfig.intervalDays" :min="2" :max="30" size="small" style="width: 100px" /> 天执行一次
             </el-form-item>
             <el-form-item label="抓拍分钟" v-if="cronConfig.type === 'HOURLY'">
                每小时第
                <el-input-number
                  v-model="cronConfig.hourMinute"
                  :min="0"
                  :max="59"
                  :step="1"
                  controls-position="right"
                  size="small"
                  style="margin: 0 10px; width: 120px"
                />
                分钟抓拍一次
             </el-form-item>
             <el-form-item label="执行时间" required v-if="cronConfig.type !== 'HOURLY'">
                <el-time-picker v-model="cronConfig.time" placeholder="选择具体时间" format="HH:mm:ss" value-format="HH:mm:ss" style="width: 100%" />
             </el-form-item>
             <el-form-item label="规则预览">
                <el-tag type="info" v-if="generateCronExpression()">{{ generateCronExpression() }}</el-tag>
                <span v-else class="text-muted">请完善时间配置</span>
             </el-form-item>
          </template>
          <el-form-item label="备注">
             <el-input v-model="scheduleForm.remark" type="textarea" :rows="2" placeholder="任务说明..." />
          </el-form-item>
       </el-form>
       <template #footer>
         <el-button @click="scheduleOpen = false">取消</el-button>
         <el-button type="primary" @click="submitSchedule">确定创建</el-button>
       </template>
    </el-dialog>

    <el-dialog title="添加预置点" v-model="presetOpen" width="400px" append-to-body destroy-on-close>
      <el-form ref="presetRef" :model="presetForm" :rules="presetRules" label-width="100px">
        <el-form-item label="当前设备"><span class="font-bold">{{ currentDeviceName }}</span></el-form-item>
        <el-form-item label="预置点编号" prop="pointIndex">
           <el-input-number v-model="presetForm.pointIndex" :min="1" :max="255" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
           <el-input v-model="presetForm.remark" placeholder="例如：大门口、育苗A区" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="presetOpen = false">取消</el-button>
          <el-button type="primary" @click="submitPreset" :loading="presetLoading">保存当前位置</el-button>
        </div>
      </template>
    </el-dialog>

    <el-image-viewer v-if="showViewer" :url-list="previewList" :initial-index="viewerIndex" @close="closeImageViewer" />
  </el-col>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed, reactive, watch } from 'vue'
import EZUIKit from 'ezuikit-js'
import { 
  Camera, Timer, Aim, Refresh, ZoomIn, LocationInformation, Picture, Warning, VideoCamera, VideoPlay, Close
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElLoading } from 'element-plus'
import { parseTime } from "@/utils/ruoyi"

// --- API 引入 ---
import { listDevice, getYs7Token, batchCapture } from '@/api/binZhou/ld/iot/device' 
import { addCameraTask } from '@/api/binZhou/ld/iot/cameraTask'
import { listRecord } from '@/api/binZhou/ld/iot/record' 
import { addCameraPreset, listCameraPreset } from "@/api/binZhou/ld/iot/cameraPreset"
import { getUserProfile } from "@/api/system/user" 

// --- 基础状态 ---
const deviceList = ref([]) 
const loading = ref(false) 
const errorMsg = ref(null) 
const selectedDevice = ref('')       
const cachedToken = ref(null)
const userInfo = ref({})

// --- 播放器实例 ---
const videoGrid = ref(null)         
const rightSidebar = ref(null)      
const players = new Map();             
let isInitializingPlayers = false;
let cleanupFunctions = [];

// --- 手机端检测 ---
const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// --- 抓拍与相册 ---
const isCapturing = ref(false) 
const isServerCapturing = ref(false) 
const showPhotoPanel = ref(false)   
const galleryList = ref([]) 
const galleryLoading = ref(false)
const galleryTotal = ref(0)
const showViewer = ref(false)
const viewerIndex = ref(0)

// --- 弹窗状态 ---
const scheduleOpen = ref(false)
const scheduleRef = ref(null)
const presetOptions = ref([]) 
const cronConfig = reactive({ type: 'DAILY', weekDays: [], intervalDays: 2, time: '08:00:00', hourMinute: 0 })
const scheduleForm = ref({ deviceId: null, jobType: 'ONCE', executeTime: null, cronExpression: null, remark: '', presetId: null, count: 1 })
const scheduleRules = { executeTime: [{ required: true, message: "请选择执行时间", trigger: "change" }], presetId: [{ required: true, message: "必须选择一个预置点", trigger: "change" }] }
const presetOpen = ref(false)
const presetLoading = ref(false)
const presetRef = ref(null)
const presetForm = ref({ pointIndex: 1, remark: '' })
const presetRules = { pointIndex: [{ required: true, message: "请输入编号", trigger: "blur" }] }

// --- 计算属性 ---
const currentDeviceName = computed(() => {
  const device = deviceList.value.find(d => d.serial === selectedDevice.value);
  return device ? device.name : '';
})
const currentDeviceId = computed(() => {
  const device = deviceList.value.find(d => d.serial === selectedDevice.value);
  return device ? device.deviceId : null;
})
const previewList = computed(() => galleryList.value.map(item => item.url))

// ================= 核心业务逻辑 =================

const handleOpenSchedule = () => {
  if (!currentDeviceId.value) { ElMessage.warning("请先等待设备加载或选中一个设备"); return; }
  scheduleForm.value = { deviceId: currentDeviceId.value, jobType: 'ONCE', executeTime: null, cronExpression: null, remark: '', presetId: null, count: 1 }
  Object.assign(cronConfig, { type: 'DAILY', weekDays: [], intervalDays: 2, time: '08:00:00', hourMinute: 0 });
  loadPresets(currentDeviceId.value);
  scheduleOpen.value = true;
  nextTick(() => scheduleRef.value?.clearValidate());
}
const loadPresets = (deviceId) => {
    presetOptions.value = [];
    listCameraPreset({ deviceId: deviceId }).then(res => { presetOptions.value = res.rows || res.data || []; });
}
const submitSchedule = () => {
  scheduleRef.value.validate(valid => {
    if (valid) {
      if (scheduleForm.value.jobType === 'CRON') {
         if (cronConfig.type !== 'HOURLY' && !cronConfig.time) { ElMessage.error("请选择执行时间"); return; }
         if (cronConfig.type === 'HOURLY' && (!Number.isInteger(cronConfig.hourMinute) || cronConfig.hourMinute < 0 || cronConfig.hourMinute > 59)) { ElMessage.error("请输入0到59之间的抓拍分钟"); return; }
         if (cronConfig.type === 'WEEKLY' && cronConfig.weekDays.length === 0) { ElMessage.error("请至少选择一个星期"); return; }
         scheduleForm.value.cronExpression = generateCronExpression();
      }
      const postData = { ...scheduleForm.value, taskName: `${currentDeviceName.value}-${selectedDevice.value}-${dayjs().format('MMDDHHmm')}`, creatorId: userInfo.value.userId }
      addCameraTask(postData).then(() => { ElMessage.success("定时任务已创建"); scheduleOpen.value = false; });
    }
  })
}
const handleOpenAddPreset = () => {
  if (!selectedDevice.value) { ElMessage.warning("请先选中一个设备"); return; }
  presetForm.value = { pointIndex: 1, remark: '', creatorId: userInfo.value.userId }; presetOpen.value = true;
}
const submitPreset = () => {
  presetRef.value.validate(valid => {
    if (valid) {
      presetLoading.value = true;
      const data = { deviceId: currentDeviceId.value, pointIndex: presetForm.value.pointIndex, remark: presetForm.value.remark, creatorId: userInfo.value.userId };
      addCameraPreset(data).then(() => { ElMessage.success("当前位置已保存为预置点"); presetOpen.value = false; }).finally(() => { presetLoading.value = false; });
    }
  });
}
const generateCronExpression = () => {
  if (cronConfig.type === 'HOURLY') return `0 ${cronConfig.hourMinute} * * * ?`;
  const time = cronConfig.time; if (!time) return '';
  const [hh, mm, ss] = time.split(':');
  if (cronConfig.type === 'DAILY') return `${ss} ${mm} ${hh} * * ?`;
  if (cronConfig.type === 'WEEKLY') { const days = cronConfig.weekDays.join(','); return days ? `${ss} ${mm} ${hh} ? * ${days}` : ''; }
  if (cronConfig.type === 'INTERVAL') return `${ss} ${mm} ${hh} 1/${cronConfig.intervalDays} * ?`;
  return '';
}
const fetchUserProfile = async () => { try { const res = await getUserProfile(); if (res.code === 200) userInfo.value = res.data; } catch (e) {} }

const fetchDeviceList = async () => {
  loading.value = true; errorMsg.value = null;
  try {
    const response = await listDevice({ pageNum: 1, pageSize: 999,productId:4, creatorId: userInfo.value.admin == true?null:userInfo.value.userId });
    if (response.rows) {
      deviceList.value = response.rows.map(item => ({ serial: item.deviceSn, name: item.deviceName, deviceId: item.deviceId }));
    } else { deviceList.value = []; }
  } catch (error) { errorMsg.value = error.message || '获取设备失败'; } finally { loading.value = false; }
}
const fetchToken = async () => {
  if (cachedToken.value) return cachedToken.value;
  try { const res = await getYs7Token(); if (res.code === 200 && res.data) { cachedToken.value = res.data; return res.data; } } catch (e) { return null; }
}

// --- 播放控制逻辑 ---

const selectCamera = async (serial) => {
  if (selectedDevice.value === serial) return;
  selectedDevice.value = serial;
  await initMainPlayer();
};

const getPlayUrl = (serial) => `ezopen://open.ys7.com/${serial}/1.live`; 

const initMainPlayer = async () => {
  if (isInitializingPlayers || !selectedDevice.value) return;
  isInitializingPlayers = true;
  
  try {
    const containerId = 'ezuikit-player-1';
    await destroyPlayer(containerId);
    await nextTick();
    await initPlayerInstance(containerId, selectedDevice.value);
    if (showPhotoPanel.value) fetchCloudPhotos();
  } finally { isInitializingPlayers = false; }
};

const initPlayerInstance = async (containerId, deviceSerial) => {
  const container = document.getElementById(containerId); if (!container) return;
  container.innerHTML = ''; 
  try {
    const accessToken = await fetchToken();
    if (!accessToken) throw new Error('Token无效');
    
    // 【核心修复配置】
    const isMobileEnv = isMobile.value;

    const player = new EZUIKit.EZUIKitPlayer({
      id: containerId, 
      url: getPlayUrl(deviceSerial), 
      accessToken: accessToken,
      // 1. 手机必须用 simple 模板
      template: isMobileEnv ? "simple" : "pcLive", 
      // 2. 必须设为 '100%' 字符串，避免手机端计算像素失败
      width: '100%', 
      height: '100%',
      autoplay: true, 
      // 3. 手机端严禁 audio: 1，否则无法自动播放，必设为 0
      audio: isMobileEnv ? 0 : 1, 
    });
    
    if (!isMobileEnv && player.on) {
       player.on('fullscreenchange', handleFullscreenChange);
    }
    players.set(containerId, { instance: player });
    
    // 延迟调整一下，确保容器撑开
    setTimeout(() => { adjustPlayerSize(containerId); }, 200);
  } catch (error) {
    container.innerHTML = `<div style="color:#fff;display:flex;justify-content:center;align-items:center;height:100%">播放失败: ${error.message}</div>`;
    container.style.backgroundColor = '#000';
  }
};

const destroyPlayer = (containerId) => {
  return new Promise((resolve) => {
    const p = players.get(containerId);
    players.delete(containerId); 
    if (p?.instance) {
      if (typeof p.instance.stop === 'function') p.instance.stop().catch(()=>{});
      setTimeout(() => { if (typeof p.instance.destroy === 'function') p.instance.destroy().catch(()=>{}); resolve(); }, 100);
    } else { resolve(); }
  });
};

const adjustPlayerSize = (containerId) => {
  const p = players.get(containerId);
  const el = document.getElementById(containerId);
  if (p?.instance && el) {
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0 && p.instance.resize) {
       p.instance.resize(width, height);
    }
  }
};

const syncScreenSizes = () => {
  if (!rightSidebar.value || !videoGrid.value) return;
  // 手机端 CSS 设为 100% 即可，不需要 JS 强行计算像素
  if (isMobile.value) return; 
  const rect = rightSidebar.value.getBoundingClientRect();
  videoGrid.value.style.width = `${Math.floor(rect.width - 20)}px`; 
};

const handleFullscreenChange = () => { setTimeout(() => { syncScreenSizes(); adjustPlayerSize('ezuikit-player-1'); }, 100); };

// --- 抓拍与相册逻辑 ---
const togglePhotoPanel = () => { showPhotoPanel.value = !showPhotoPanel.value; if (showPhotoPanel.value) fetchCloudPhotos(); }
const fetchCloudPhotos = async () => {
  if (!currentDeviceId.value) return;
  galleryLoading.value = true;
  try {
    const res = await listRecord({ deviceId: currentDeviceId.value, pageNum: 1, pageSize: 20, orderByColumn: 'captureTime', isAsc: 'desc' });
    if (res.code === 200) { galleryList.value = res.rows || []; galleryTotal.value = res.total; }
  } finally { galleryLoading.value = false; }
}
const handleServerCapture = async () => {
  if (!selectedDevice.value) return ElMessage.warning("请先选择设备");
  const loadingInstance = ElLoading.service({ lock: true, text: '云端抓拍中...', background: 'rgba(0, 0, 0, 0.7)' });
  try {
    isServerCapturing.value = true;
    const res = await batchCapture({ snList: [selectedDevice.value], userId: userInfo.value.userId });
    if (res.code == 200) ElMessage.success(res.msg);
    if (showPhotoPanel.value) setTimeout(() => fetchCloudPhotos(), 3000); 
  } finally { isServerCapturing.value = false; loadingInstance.close(); }
}
const captureCurrentScreen = async () => {
  const playerData = players.get('ezuikit-player-1');
  if (!playerData?.instance) return ElMessage.error('播放器未初始化');
  isCapturing.value = true;
  try { await playerData.instance.capturePicture(dayjs().format('YYYY-MM-DD HH:mm:ss')); ElMessage.success('已保存到本地'); } 
  catch (error) { ElMessage.error('截图失败或浏览器不支持'); } finally { setTimeout(() => { isCapturing.value = false }, 1000); }
};
const handleImageError = (event) => { event.target.src = 'https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png'; };
const openImageViewer = (index) => { viewerIndex.value = index; showViewer.value = true; }
const closeImageViewer = () => { showViewer.value = false; }

// --- 生命周期 ---
watch(loading, (newVal) => {
  if (!newVal && deviceList.value.length > 0) {
    if (!selectedDevice.value) selectedDevice.value = deviceList.value[0].serial;
    initMainPlayer(); 
    // 【重要】已移除 initThumbnailPlayers()
  }
});

onMounted(async () => {
  window.addEventListener('resize', syncScreenSizes);
  cleanupFunctions.push(() => window.removeEventListener('resize', syncScreenSizes));
  const observer = new ResizeObserver(() => syncScreenSizes());
  if (rightSidebar.value) observer.observe(rightSidebar.value);
  cleanupFunctions.push(() => observer.disconnect());
  await fetchUserProfile(); await fetchDeviceList();
});

onBeforeUnmount(() => {
  cleanupFunctions.forEach(fn => fn());
  destroyPlayer('ezuikit-player-1');
});
</script>

<style scoped lang="scss">
.video-card { display: flex; flex-direction: column; height: 100%; border: none; }
.video-container { display: flex; flex-direction: column; height: 100%; }
.main-layout { display: flex; flex: 1; height: calc(100vh - 60px); }
.right-sidebar { flex: 1; display: flex; flex-direction: column; width: 100%; padding: 0 10px; box-sizing: border-box; }

/* 1. 顶部控制栏 */
.controls { 
  display: flex; justify-content: flex-start; align-items: center; margin-bottom: 8px; padding: 12px; 
  background: #fff; border-radius: 8px; gap: 12px; flex-wrap: wrap; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.video-area { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; position: relative; }

/* 2. 大屏幕播放器 */
.aspect-ratio-container { 
  width: 100%; display: flex; justify-content: center; align-items: center; background: #000; 
  border-radius: 8px; overflow: hidden; aspect-ratio: 16/9; max-height: 65vh; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  position: relative;
}
.video-grid { width: 100%; height: 100%; display: block; }
.video-item { width: 100%; height: 100%; position: relative; background-color: #000; }
.video-label { 
  position: absolute; top: 10px; left: 10px; color: white; background-color: rgba(0, 0, 0, 0.6); 
  padding: 4px 8px; border-radius: 4px; font-size: 13px; z-index: 10; pointer-events: none; 
}

/* 3. 底部缩略图 (纯净版，不加载视频) */
.zone-selection { 
  background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #ebeef5; margin-top: auto; 
  box-shadow: 0 -2px 8px rgba(0,0,0,0.03);
}
.camera-thumbnails { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; }
.camera-thumbnail { 
  width: 110px; flex-shrink: 0; cursor: pointer; padding: 8px; border: 2px solid transparent; 
  border-radius: 8px; transition: all 0.2s; display: flex; flex-direction: column; gap: 8px; 
  background: #f8f9fa; align-items: center;
}
.camera-thumbnail:hover { background: #ecf5ff; }
.camera-thumbnail.active { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }

.thumbnail-icon-wrapper {
  height: 50px; width: 100%; background: #fff; border-radius: 4px; border: 1px solid #eee;
  display: flex; align-items: center; justify-content: center;
}

.thumbnail-name { 
  font-size: 12px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; 
  color: #303133; font-weight: 500; width: 100%;
}

/* 相册面板 */
.photos-section { 
  background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; 
  height: 160px; display: flex; flex-direction: column; position: absolute; bottom: 120px; left: 0; right: 0; z-index: 20;
  box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
}
.photos-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; color: #606266; }
.header-left { display: flex; align-items: center; gap: 8px; }
.title { font-weight: bold; }
.photo-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; align-items: center; height: 100%; }
.photo-item { flex-shrink: 0; width: 160px; border-radius: 6px; overflow: hidden; position: relative; }
.img-wrapper { height: 90px; width: 100%; cursor: pointer; position: relative; }
.img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.hover-mask { 
  position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.4); 
  display: flex; justify-content: center; align-items: center; color: #fff; opacity: 0; transition: 0.3s;
}
.img-wrapper:hover .hover-mask { opacity: 1; }
.photo-meta { padding: 4px; background: #f5f7fa; display: flex; justify-content: space-between; align-items: center; }
.time { font-size: 12px; color: #909399; }
.mini-tag { transform: scale(0.85); transform-origin: right center; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4; }
.font-bold { font-weight: bold; }
</style>
