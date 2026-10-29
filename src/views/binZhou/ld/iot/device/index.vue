<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px" class="device-query-form">
      <el-form-item label="设备名称" prop="deviceName">
        <el-input v-model="queryParams.deviceName" placeholder="请输入设备名称" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="设备编号" prop="deviceSn">
        <el-input v-model="queryParams.deviceSn" placeholder="请输入设备SN" clearable @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="产品类别" prop="productId">
        <el-select v-model="queryParams.productId" placeholder="请选择产品类别" clearable>
          <el-option v-for="item in productList" :key="item.productId" :label="item.productName" :value="item.productId" />
        </el-select>
      </el-form-item>
      <el-form-item label="产品类型" prop="productType">
        <el-select v-model="queryParams.productType" placeholder="请选择产品类型" clearable>
          <el-option
            v-for="item in productTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="地理位置">
        <el-cascader
          v-model="locationFilterPath"
          :props="locationFilterProps"
          placeholder="请选择园区 / 区域 / 位置"
          clearable
          filterable
          style="width: 260px"
          @change="handleLocationFilterChange"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable>
          <el-option label="在线" value="1" />
          <el-option label="离线" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item class="query-action-item">
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="table-toolbar mb8">
      <div class="toolbar-left">
        <div class="main-action-group">
          <el-button
            class="toolbar-action-button"
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
            v-hasPermi="['iot:device:add']"
          >
            新增设备
          </el-button>
          <el-button
            class="toolbar-action-button"
            type="success"
            plain
            icon="Edit"
            :disabled="single"
            @click="handleUpdate"
            v-hasPermi="['iot:device:edit']"
          >
            修改设备
          </el-button>
          <el-button
            class="toolbar-action-button"
            type="danger"
            plain
            icon="Delete"
            :disabled="multiple"
            @click="handleDelete"
            v-hasPermi="['iot:device:remove']"
          >
            删除设备
          </el-button>
        </div>
      </div>

      <div class="toolbar-right">
        <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </div>
    </div>

    <div class="device-workspace">
      <section class="device-list-section">
        <el-table
          v-loading="loading"
          :data="deviceList"
          row-key="deviceId"
          highlight-current-row
          class="device-table"
          :row-class-name="getDeviceRowClass"
          @row-click="handleDeviceRowClick"
          @selection-change="handleSelectionChange"
        >
      <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="设备名称" align="left" prop="deviceName" min-width="150">
            <template #default="scope">
              <div class="device-name-cell">
                <span
                  class="device-status-dot"
                  :class="scope.row.status == '1' ? 'is-online' : 'is-offline'"
                ></span>
                <span class="device-name-text" :title="scope.row.deviceName">
                  {{ scope.row.deviceName || '-' }}
                </span>
              </div>
            </template>
          </el-table-column>
      
      <el-table-column label="设备编号 (SN)" align="center" prop="deviceSn" width="180">
        <template #default="scope">
           <el-tag type="info" class="cursor-pointer" title="点击复制" @click.stop="handleCopy(scope.row.deviceSn)">
             {{ scope.row.deviceSn }}
           </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="具体位置" align="center" min-width="200" show-overflow-tooltip>
        <template #default="scope">
          {{ formatLocation(scope.row) }}
        </template>
      </el-table-column>

      <el-table-column label="产品类别" align="center" prop="productId" width="140">
        <template #default="scope">
          <el-tag v-if="scope.row.productId" effect="plain" type="success">
              {{ formatProductName(scope.row.productId) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="产品类型" align="center" prop="productType" width="120">
        <template #default="scope">
          <el-tag effect="plain" :type="String(scope.row.productType) === '1' ? 'warning' : 'success'">
            {{ formatProductType(scope.row.productType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="协议类型" align="center" prop="protocolType" width="120">
         <template #default="scope">
           <el-tag effect="plain">{{ scope.row.protocolType }}</el-tag>
         </template>
      </el-table-column>

      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.status == '1'" type="success">在线</el-tag>
          <el-tag v-else type="danger">离线</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="备注" align="center" prop="remark" show-overflow-tooltip />

      <el-table-column label="最后上线" align="center" prop="lastOnlineTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.lastOnlineTime) }}</span>
        </template>
      </el-table-column>

          <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="370" fixed="right">
            <template #default="scope">
              <div class="row-action-group" @click.stop>
                <el-button class="table-action-button" link type="primary" icon="Edit" @click.stop="handleUpdate(scope.row)" v-hasPermi="['iot:device:edit']">
                  修改
                </el-button>
                <el-button class="table-action-button" link type="warning" icon="Promotion" @click.stop="handleSimulate(scope.row)" v-hasPermi="['iot:device:simulate']">
                  模拟
                </el-button>
                <el-button class="table-action-button" link type="info" icon="Document" @click.stop="handleViewLogs(scope.row)" v-hasPermi="['iot:log:list']">
                  日志
                </el-button>
                <el-button v-if="isControlDevice(scope.row)" class="table-action-button" link type="success" icon="Operation" @click.stop="handleController(scope.row)" v-hasPermi="['iot:log:list']">
                  控制器
                </el-button>
                <el-button class="table-action-button" link type="danger" icon="Delete" @click.stop="handleDelete(scope.row)" v-hasPermi="['iot:device:remove']">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
    </el-table>
    
        <pagination
          v-show="total > 0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="getList"
        />
      </section>

      <el-drawer
        v-model="openTrendDrawer"
        :title="`设备数据详情 - ${trendDeviceName || '-'}`"
        direction="rtl"
        size="54%"
        class="device-data-drawer"
        destroy-on-close
        @opened="scheduleTrendChartResize"
        @closed="handleTrendDrawerClosed"
      >
          <div class="bottom-drawer-body side-drawer-body" v-loading="trendLoading">
            <div class="trend-device-summary">
              <div class="summary-main">
                <div class="summary-title-row">
                  <div class="summary-title">{{ trendDeviceName || '-' }}</div>
                  <el-tag :type="trendDeviceStatus == '1' ? 'success' : 'danger'" size="small">
                    {{ trendDeviceStatus == '1' ? '在线' : '离线' }}
                  </el-tag>
                </div>
                <div class="summary-meta">
                  <span><b>设备编号</b>{{ trendDeviceSn || '-' }}</span>
                  <span><b>产品类别</b>{{ trendProductName || '-' }}</span>
                  <span><b>产品类型</b>{{ trendProductTypeName || '-' }}</span>
                  <span class="summary-location"><b>安装位置</b>{{ trendLocationName || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="trend-toolbar">
              <div class="trend-toolbar-item trend-property-selector">
                <span class="toolbar-label">监测属性</span>
                <el-select
                  v-model="currentTrendKey"
                  placeholder="请选择监测属性"
                  style="width: 100%"
                  @change="loadTrendData"
                >
                  <el-option
                    v-for="item in numericModels"
                    :key="item.identifier"
                    :label="item.modelName"
                    :value="item.identifier"
                  />
                </el-select>
              </div>

              <div class="trend-toolbar-item">
                <span class="toolbar-label">时间范围</span>
                <el-date-picker
                  v-model="trendDateRange"
                  type="datetimerange"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  clearable
                  style="width: 100%"
                  @change="loadTrendData"
                />
              </div>

              <div class="trend-toolbar-actions">
                <el-button
                  type="primary"
                  icon="Refresh"
                  :loading="trendLoading"
                  @click="loadTrendData"
                >
                  刷新数据
                </el-button>
              </div>
            </div>

            <template v-if="numericModels.length > 0">
              <div class="trend-stats-grid">
                <div class="trend-stat-card">
                  <span class="stat-label">最新值</span>
                  <div class="stat-value-row">
                    <strong>{{ trendStats.latest }}</strong>
                    <small>{{ currentTrendUnit }}</small>
                  </div>
                </div>
                <div class="trend-stat-card">
                  <span class="stat-label">平均值</span>
                  <div class="stat-value-row">
                    <strong>{{ trendStats.avg }}</strong>
                    <small>{{ currentTrendUnit }}</small>
                  </div>
                </div>
                <div class="trend-stat-card">
                  <span class="stat-label">最大值</span>
                  <div class="stat-value-row">
                    <strong>{{ trendStats.max }}</strong>
                    <small>{{ currentTrendUnit }}</small>
                  </div>
                </div>
                <div class="trend-stat-card">
                  <span class="stat-label">最小值</span>
                  <div class="stat-value-row">
                    <strong>{{ trendStats.min }}</strong>
                    <small>{{ currentTrendUnit }}</small>
                  </div>
                </div>
              </div>

              <div class="professional-trend-panel">
                <div class="trend-panel-header">
                  <div class="trend-panel-title">
                    <span class="trend-panel-icon">●</span>
                    历史数据趋势
                    <span v-if="currentTrendModelName">· {{ currentTrendModelName }}</span>
                  </div>
                  <span class="trend-point-count">{{ trendPointCount }} 条有效数据</span>
                </div>
                <div ref="trendChartRef" class="professional-trend-chart"></div>
              </div>

              <el-alert
                v-if="trendPointCount === 0 && !trendLoading"
                title="当前设备没有该属性的有效上报数据"
                type="info"
                :closable="false"
                show-icon
                class="trend-empty-alert"
              />
            </template>

            <el-empty
              v-else
              description="该产品暂无可展示的数值型物模型属性"
              :image-size="100"
            />
          </div>
      </el-drawer>
    </div>

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="deviceFormRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="form.deviceName" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备编号" prop="deviceSn">
          <el-input v-model="form.deviceSn" placeholder="请输入设备SN" />
        </el-form-item>
        <el-form-item label="产品类别" prop="productId">
          <el-select v-model="form.productId" placeholder="请选择产品类别" style="width: 100%">
            <el-option v-for="item in productList" :key="item.productId" :label="item.productName" :value="item.productId" />
          </el-select>
        </el-form-item>
        <el-form-item label="协议类型" prop="protocolType">
          <el-select v-model="form.protocolType" placeholder="请选择协议类型" style="width: 100%">
            <el-option label="MQTT" value="MQTT" />
            <el-option label="HTTP" value="HTTP" />
            <el-option label="MODBUS-TCP" value="MODBUS-TCP" />
          </el-select>
        </el-form-item>

        <el-row>
            <el-col :span="24">
                <el-form-item label="所属园区" prop="parkId">
                    <el-select 
                        v-model="form.parkId" 
                        placeholder="请选择园区" 
                        style="width: 100%" 
                        @change="handleParkChange"
                        :disabled="!isAdmin && parkOptions.length <= 1"
                    >
                        <el-option v-for="item in parkOptions" :key="item.parkId" :label="item.parkName" :value="item.parkId" />
                    </el-select>
                </el-form-item>
            </el-col>
            <el-col :span="24">
                <el-form-item label="所属区域" prop="areaId">
                    <el-select 
                        v-model="form.areaId" 
                        placeholder="请选择区域" 
                        style="width: 100%" 
                        @change="handleAreaChange"
                        :disabled="!form.parkId"
                    >
                        <el-option v-for="item in areaOptions" :key="item.areaId" :label="item.areaName" :value="item.areaId" />
                    </el-select>
                </el-form-item>
            </el-col>
            <el-col :span="24">
                <el-form-item label="具体位置" prop="locationId">
                    <el-select 
                        v-model="form.locationId" 
                        placeholder="请选择位置" 
                        style="width: 100%"
                        :disabled="!form.areaId"
                    >
                        <el-option v-for="item in locationOptions" :key="item.locationId" :label="item.locationName" :value="item.locationId" />
                    </el-select>
                </el-form-item>
            </el-col>
        </el-row>

        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确定</el-button>
          <el-button @click="cancel">取消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="模拟设备数据上报" v-model="openSimulate" width="700px" append-to-body>
        <el-alert title="系统已根据该设备所属产品的物模型自动生成测试数据模板。" type="success" :closable="false" show-icon class="mb-4" />
        <el-form :model="simulateForm" label-width="80px">
            <el-form-item label="目标设备">
                <el-input v-model="simulateForm.deviceSn" disabled />
            </el-form-item>
            <el-form-item label="JSON报文">
                <el-input v-model="simulateForm.payload" type="textarea" :rows="8" placeholder="请输入JSON格式数据" />
            </el-form-item>
        </el-form>
        <div v-if="currentModels.length > 0" class="model-tips">
            <div class="tips-title"><i class="el-icon-info"></i> 属性对照表（可参考修改上方JSON数值）</div>
            <div class="table-scroll-wrapper">
                <el-table :data="currentModels" size="small" border style="width: 100%">
                    <el-table-column prop="identifier" label="标识符(Key)" width="150">
                        <template #default="scope"><span style="color: #409EFF; font-weight: bold;">{{ scope.row.identifier }}</span></template>
                    </el-table-column>
                    <el-table-column prop="modelName" label="属性名称(中文)" />
                    <el-table-column prop="type" label="类型" width="100">
                        <template #default="scope"><el-tag size="small">{{ scope.row.type }}</el-tag></template>
                    </el-table-column>
                    <el-table-column prop="specs" label="定义详情" show-overflow-tooltip />
                </el-table>
            </div>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <el-button type="primary" :loading="simulateLoading" @click="submitSimulate">发送报文</el-button>
                <el-button @click="openSimulate = false">关闭</el-button>
            </div>
        </template>
    </el-dialog>

    <el-drawer v-model="openLogDrawer" :title="'通信日志 - ' + logDrawerSn" direction="rtl" size="50%" class="device-log-drawer">
        <div class="log-detail-body" v-loading="logLoading">
            <div class="log-detail-header">
                <div>
                    <div class="log-detail-title">日志详情</div>
                    <div class="log-detail-subtitle">
                        点击字段查看对应上报数据
                        <span v-if="currentLogUnit">，单位：{{ currentLogUnit }}</span>
                    </div>
                </div>
                <el-button icon="Refresh" circle @click="refreshLogs" title="刷新日志" />
            </div>

            <div v-if="logFieldOptions.length > 0" class="log-field-selector">
                <button
                    v-for="item in logFieldOptions"
                    :key="item.identifier"
                    type="button"
                    class="log-field-button"
                    :class="{ 'is-active': item.identifier === activeLogField }"
                    @click="selectLogField(item.identifier)"
                >
                    <span class="field-name">{{ getLogFieldName(item) }}</span>
                    <span class="field-meta">{{ getModelUnit(item) || '无单位' }}</span>
                </button>
            </div>

            <el-alert
                v-else
                title="暂无可选择字段"
                type="info"
                :closable="false"
                show-icon
                class="mb-4"
            />

            <el-table :data="selectedLogRows" border stripe height="500px" empty-text="当前字段暂无上报数据">
                <el-table-column label="时间" prop="createTime" width="170" align="center" />
                <el-table-column label="指标名称" prop="_fieldName" min-width="150" align="center" />
                <el-table-column label="上报数值" min-width="180" align="center">
                    <template #default="scope">
                        <span class="log-field-value">{{ scope.row._fieldDisplay }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="单位" prop="_fieldUnit" width="110" align="center" />
            </el-table>
        </div>
    </el-drawer>

    <el-drawer v-model="openControllerDrawer" :title="'控制器 - ' + (controllerDeviceName || controllerDeviceSn)" direction="rtl" size="62%" class="device-controller-drawer">
        <div class="controller-detail-body">
            <div class="controller-summary">
                <div>
                    <div class="controller-title">{{ controllerDeviceName || '-' }}</div>
                    <div class="controller-subtitle">
                        SN：{{ controllerDeviceSn || '-' }}
                        <span v-if="controllerLogTime"> / 最近上报：{{ parseTime(controllerLogTime) }}</span>
                    </div>
                </div>
                <el-button icon="Refresh" circle @click="refreshControllerData" title="刷新控制器数据" />
            </div>

            <el-tabs v-model="controllerActiveTab" class="controller-tabs">
                <el-tab-pane label="最新信息" name="status">
                    <div v-loading="controllerLoading" class="controller-tab-panel">
                        <el-alert
                            v-if="!controllerLoading && controllerItems.length === 0"
                            title="暂无控制器上报数据"
                            type="info"
                            :closable="false"
                            show-icon
                            class="mb-4"
                        />
                        <el-table :data="controllerItems" border stripe empty-text="暂无控制器上报数据">
                            <el-table-column label="控制项" prop="modelName" min-width="160" show-overflow-tooltip />
                            <el-table-column label="当前状态" min-width="130" align="center">
                                <template #default="scope">
                                    <el-tag v-if="scope.row.isSwitch" :type="scope.row.value === '1' ? 'success' : 'info'">
                                        {{ scope.row.displayValue }}
                                    </el-tag>
                                    <span v-else class="controller-value">{{ scope.row.displayValue }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="单位" prop="unit" width="100" align="center" />
                            <el-table-column label="标识符" prop="identifier" min-width="130" show-overflow-tooltip />
                        </el-table>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="下发控制" name="send">
                    <div class="controller-tab-panel controller-send-panel">
                        <div class="controller-section-title">
                            <span>控制字段</span>
                            <el-button type="primary" link icon="Plus" @click="addControllerCommandRow">新增字段</el-button>
                        </div>
                        <el-empty v-if="!controllerModels.length" description="当前产品暂无可下发的物模型" :image-size="80" />
                        <div v-else class="controller-command-list">
                            <div v-for="(item, index) in controllerCommandRows" :key="item.uid" class="controller-command-row">
                                <el-select
                                    v-model="item.identifier"
                                    placeholder="选择控制物模型"
                                    filterable
                                    class="controller-model-select"
                                    @change="handleControllerCommandModelChange(item)"
                                >
                                    <el-option
                                        v-for="model in controllerAvailableModels(index)"
                                        :key="model.identifier"
                                        :label="formatControllerModelLabel(model)"
                                        :value="model.identifier"
                                    />
                                </el-select>
                                <el-select
                                    v-if="isControllerSelectModel(item.identifier)"
                                    v-model="item.value"
                                    placeholder="选择控制状态"
                                    class="controller-value-input"
                                >
                                    <el-option
                                        v-for="option in getControllerSelectOptions(item.identifier)"
                                        :key="String(option.value)"
                                        :label="option.label"
                                        :value="option.value"
                                    />
                                </el-select>
                                <el-input v-else v-model="item.value" placeholder="输入下发值" class="controller-value-input">
                                    <template v-if="getControllerModelUnit(item.identifier)" #append>{{ getControllerModelUnit(item.identifier) }}</template>
                                </el-input>
                                <el-button type="danger" link icon="Delete" @click="removeControllerCommandRow(index)">删除</el-button>
                            </div>
                        </div>
                        <el-form label-width="82px" class="controller-send-form">
                            <el-form-item label="备注">
                                <el-input v-model="controllerSendForm.remark" type="textarea" :rows="3" placeholder="请输入本次控制说明" />
                            </el-form-item>
                        </el-form>
                        <div class="controller-send-actions">
                            <el-button type="primary" icon="Promotion" :loading="controllerSendLoading" @click="submitControllerCommand">立即下发</el-button>
                        </div>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="手动控制记录" name="manualRecords">
                    <div class="controller-tab-panel" v-loading="controllerRecordLoading">
                        <el-table :data="controllerRecordList" border stripe empty-text="暂无手动控制记录">
                            <el-table-column label="事件编号" prop="eventId" width="100" align="center" />
                            <el-table-column label="控制内容" min-width="250" show-overflow-tooltip>
                                <template #default="scope">{{ formatControllerRecordCommands(scope.row) }}</template>
                            </el-table-column>
                            <el-table-column label="响应码" prop="res" width="90" align="center" />
                            <el-table-column label="状态" width="90" align="center">
                                <template #default="scope">
                                    <el-tag :type="getControllerRecordStatusType(scope.row.status)">{{ getControllerRecordStatusText(scope.row.status) }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="下发时间" prop="sendTime" width="170" align="center">
                                <template #default="scope">{{ parseTime(scope.row.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</template>
                            </el-table-column>
                            <el-table-column label="响应说明" prop="responseDesc" min-width="150" show-overflow-tooltip />
                            <el-table-column label="操作" width="130" fixed="right" align="center">
                                <template #default="scope">
                                    <el-button link type="primary" icon="View" @click="viewControllerRecord(scope.row)">查看</el-button>
                                    <el-button link type="danger" icon="Delete" @click="deleteControllerRecord(scope.row)">删除</el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                        <div class="controller-pagination">
                            <el-pagination
                                v-model:current-page="controllerRecordQuery.pageNum"
                                v-model:page-size="controllerRecordQuery.pageSize"
                                :page-sizes="[5, 10, 20]"
                                layout="total, sizes, prev, pager, next"
                                :total="controllerRecordTotal"
                                @size-change="loadControllerRecords"
                                @current-change="loadControllerRecords"
                            />
                        </div>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="预警控制记录" name="alertRecords">
                    <div class="controller-tab-panel" v-loading="controllerAlertRecordLoading">
                        <el-table :data="controllerAlertRecordList" border stripe empty-text="暂无预警控制记录">
                            <el-table-column label="事件编号" prop="eventId" width="100" align="center" />
                            <el-table-column label="预警规则" min-width="240" show-overflow-tooltip>
                                <template #default="scope">
                                    <div class="controller-rule-cell">
                                        <el-tag :type="getControllerAlertLevelType(scope.row.alertLevel)" size="small">{{ getControllerAlertLevelText(scope.row.alertLevel) }}</el-tag>
                                        <span>{{ scope.row.ruleDescription || '-' }}</span>
                                    </div>
                                </template>
                            </el-table-column>
                            <el-table-column label="控制物模型" min-width="170" show-overflow-tooltip>
                                <template #default="scope">{{ scope.row.targetModelName || getControllerModelNameById(scope.row.targetModelId) || '-' }}</template>
                            </el-table-column>
                            <el-table-column label="状态" width="90" align="center">
                                <template #default="scope"><el-tag :type="getControllerRecordStatusType(scope.row.status)">{{ getControllerRecordStatusText(scope.row.status) }}</el-tag></template>
                            </el-table-column>
                            <el-table-column label="下发时间" width="170" align="center">
                                <template #default="scope">{{ parseTime(scope.row.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</template>
                            </el-table-column>
                            <el-table-column label="响应说明" prop="responseDesc" min-width="180" show-overflow-tooltip />
                            <el-table-column label="操作" width="80" fixed="right" align="center">
                                <template #default="scope"><el-button link type="primary" icon="View" @click="viewControllerAlertRecord(scope.row)">查看</el-button></template>
                            </el-table-column>
                        </el-table>
                        <div class="controller-pagination">
                            <el-pagination
                                v-model:current-page="controllerAlertRecordQuery.pageNum"
                                v-model:page-size="controllerAlertRecordQuery.pageSize"
                                :page-sizes="[5, 10, 20]"
                                layout="total, sizes, prev, pager, next"
                                :total="controllerAlertRecordTotal"
                                @size-change="loadControllerAlertRecords"
                                @current-change="loadControllerAlertRecords"
                            />
                        </div>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </el-drawer>

    <el-dialog v-model="controllerRecordDetailOpen" title="手动控制记录详情" width="760px" append-to-body>
        <el-descriptions :column="2" border>
            <el-descriptions-item label="事件编号">{{ controllerRecordDetail.eventId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
                <el-tag :type="getControllerRecordStatusType(controllerRecordDetail.status)">{{ getControllerRecordStatusText(controllerRecordDetail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="控制终端">{{ controllerRecordDetail.deviceName || controllerDeviceName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="设备SN">{{ controllerRecordDetail.deviceSn || '-' }}</el-descriptions-item>
            <el-descriptions-item label="控制内容" :span="2">{{ formatControllerRecordCommands(controllerRecordDetail) }}</el-descriptions-item>
            <el-descriptions-item label="响应码">{{ controllerRecordDetail.res || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下发主题">{{ controllerRecordDetail.topic || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下发时间">{{ parseTime(controllerRecordDetail.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
            <el-descriptions-item label="响应时间">{{ parseTime(controllerRecordDetail.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
            <el-descriptions-item label="响应说明" :span="2">{{ controllerRecordDetail.responseDesc || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ controllerRecordDetail.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="controller-payload-grid">
            <div class="controller-payload-card">
                <div class="controller-payload-title">下发内容</div>
                <pre>{{ formatControllerJson(controllerRecordDetail.payload) }}</pre>
            </div>
            <div class="controller-payload-card">
                <div class="controller-payload-title">响应内容</div>
                <pre>{{ formatControllerJson(controllerRecordDetail.responsePayload) }}</pre>
            </div>
        </div>
    </el-dialog>

    <el-dialog v-model="controllerAlertDetailOpen" title="预警控制记录详情" width="860px" append-to-body>
        <el-descriptions :column="2" border>
            <el-descriptions-item label="事件编号">{{ controllerAlertDetail.eventId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下发状态"><el-tag :type="getControllerRecordStatusType(controllerAlertDetail.status)">{{ getControllerRecordStatusText(controllerAlertDetail.status) }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="联动规则编号">{{ controllerAlertDetail.controlId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预警记录编号">{{ controllerAlertDetail.alertRecordId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预警规则" :span="2">
                <el-tag :type="getControllerAlertLevelType(controllerAlertDetail.alertLevel)">{{ getControllerAlertLevelText(controllerAlertDetail.alertLevel) }}</el-tag>
                <span class="controller-detail-inline">{{ controllerAlertDetail.ruleDescription || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="控制终端">{{ controllerAlertDetail.deviceName || controllerDeviceName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="控制物模型">{{ controllerAlertDetail.targetModelName || getControllerModelNameById(controllerAlertDetail.targetModelId) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="动作名称">{{ controllerAlertDetail.actionName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="目标标识符">{{ controllerAlertDetail.targetIdentifier || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下发时间">{{ parseTime(controllerAlertDetail.sendTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
            <el-descriptions-item label="响应时间">{{ parseTime(controllerAlertDetail.responseTime, '{y}-{m}-{d} {h}:{i}:{s}') || '-' }}</el-descriptions-item>
            <el-descriptions-item label="响应说明" :span="2">{{ controllerAlertDetail.responseDesc || '-' }}</el-descriptions-item>
            <el-descriptions-item label="下发主题" :span="2">{{ controllerAlertDetail.topic || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ controllerAlertDetail.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="controller-payload-grid">
            <div class="controller-payload-card"><div class="controller-payload-title">下发内容</div><pre>{{ formatControllerJson(controllerAlertDetail.payload) }}</pre></div>
            <div class="controller-payload-card"><div class="controller-payload-title">响应内容</div><pre>{{ formatControllerJson(controllerAlertDetail.responsePayload) }}</pre></div>
        </div>
    </el-dialog>


  </div>
</template>

<script setup name="IotDevice">
import * as echarts from 'echarts';
import { listDevice, getDevice, delDevice, addDevice, updateDevice, simulateReport, listDeviceLog } from "@/api/binZhou/ld/iot/device";
import { listProduct } from "@/api/binZhou/ld/iot/product";
import { listModel } from "@/api/binZhou/ld/iot/model"; 
import { listPark } from "@/api/binZhou/ld/iot/park";
import { listAreaByParkId, getArea } from "@/api/binZhou/ld/iot/area";
import { listLocationByAreaId, getLocation } from "@/api/binZhou/ld/iot/location"; 
import { getUserProfile } from "@/api/system/user";
import { listManualControl, getManualControl, sendManualControl, delManualControl } from "@/api/binZhou/ld/iot/manualControl";
import { listControlEvent, getControlEvent } from "@/api/binZhou/ld/iot/controlEvent";

import { getCurrentInstance, reactive, ref, toRefs, nextTick, onMounted, onBeforeUnmount, computed } from "vue";

const { proxy } = getCurrentInstance();

const deviceList = ref([]);
const productList = ref([]); 
const logList = ref([]);
const currentModels = ref([]); 
const activeLogField = ref("");

// 鑱斿姩鏁版嵁婧?
const parkOptions = ref([]);
const areaOptions = ref([]);
const locationOptions = ref([]);
const isAdmin = ref(false); 
const currentUserParkId = ref(null); 
const currentUserId = ref(null); // 銆愭柊澧炪€戝瓨鍌ㄥ綋鍓嶇敤鎴稩D

const open = ref(false);
const openSimulate = ref(false);
const openLogDrawer = ref(false);
const openControllerDrawer = ref(false);
const loading = ref(true);
const logLoading = ref(false);
const controllerLoading = ref(false);
const simulateLoading = ref(false);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const logDrawerSn = ref("");
const controllerDeviceName = ref("");
const controllerDeviceId = ref(undefined);
const controllerDeviceSn = ref("");
const controllerProductId = ref(undefined);
const controllerModels = ref([]);
const controllerItems = ref([]);
const controllerLogTime = ref("");
const controllerActiveTab = ref("status");
const controllerSendLoading = ref(false);
const controllerRecordLoading = ref(false);
const controllerAlertRecordLoading = ref(false);
const controllerRecordList = ref([]);
const controllerRecordTotal = ref(0);
const controllerAlertRecordList = ref([]);
const controllerAlertRecordTotal = ref(0);
const controllerRecordDetailOpen = ref(false);
const controllerRecordDetail = ref({});
const controllerAlertDetailOpen = ref(false);
const controllerAlertDetail = ref({});
const controllerCommandRows = ref([]);
const controllerRecordQuery = reactive({ pageNum: 1, pageSize: 10 });
const controllerAlertRecordQuery = reactive({ pageNum: 1, pageSize: 10 });
const controllerSendForm = reactive({ remark: "" });

// 涓夌骇鍦扮悊浣嶇疆绛涢€?
const locationFilterPath = ref([]);

// 璁惧瓒嬪娍鎶藉眽
const openTrendDrawer = ref(false);
const activeDeviceId = ref(null);
const trendLoading = ref(false);
const trendDeviceName = ref("");
const trendDeviceSn = ref("");
const trendDeviceStatus = ref("0");
const trendProductName = ref("");
const trendProductTypeName = ref("");
const trendLocationName = ref("");
const trendDateRange = ref([]);
const numericModels = ref([]);
const currentTrendKey = ref("");
const currentTrendUnit = ref("");
const trendPointCount = ref(0);
const trendChartRef = ref(null);
const trendStats = reactive({
  latest: "-",
  avg: "-",
  max: "-",
  min: "-"
});
let trendChart = null;

const productTypeOptions = [
  { label: "采集终端", value: 0 },
  { label: "控制终端", value: 1 }
];

const currentTrendModelName = computed(() => {
  const model = numericModels.value.find(item => item.identifier === currentTrendKey.value);
  return model ? model.modelName : "";
});

const logFieldOptions = computed(() => {
    const options = [];
    const seen = new Set();

    currentModels.value.forEach(model => {
        if (!model || !model.identifier || seen.has(model.identifier)) return;
        seen.add(model.identifier);
        options.push(model);
    });

    logList.value.forEach(log => {
        const payload = parseLogPayload(log.payload);
        if (!payload || typeof payload !== "object") return;

        Object.keys(payload).forEach(key => {
            if (!key || seen.has(key)) return;
            seen.add(key);
            options.push({
                identifier: key,
                modelName: key,
                type: typeof payload[key],
                specs: null
            });
        });
    });

    return options;
});

const currentLogFieldModel = computed(() => {
    if (!activeLogField.value) return null;
    return logFieldOptions.value.find(item => item.identifier === activeLogField.value) || null;
});

const currentLogFieldName = computed(() => getLogFieldName(currentLogFieldModel.value));

const currentLogUnit = computed(() => getModelUnit(currentLogFieldModel.value));

const currentLogValueLabel = computed(() => {
    const name = currentLogFieldName.value || "字段值";
    return currentLogUnit.value ? `${name} (${currentLogUnit.value})` : name;
});

const selectedLogRows = computed(() => {
    const field = activeLogField.value;
    if (!field) return [];

    return logList.value
        .map(log => {
            const payload = parseLogPayload(log.payload);
            const hasValue = payload && Object.prototype.hasOwnProperty.call(payload, field);
            const value = hasValue ? payload[field] : null;

            return {
                ...log,
                _fieldName: currentLogFieldName.value,
                _fieldUnit: currentLogUnit.value || "-",
                _fieldValue: value,
                _fieldDisplay: formatLogFieldValue(value),
                _hasFieldValue: hasValue
            };
        })
        .filter(item => item._hasFieldValue);
});

const deviceFormRef = ref(null);
const queryRef = ref(null);

const data = reactive({
  form: {
      parkId: undefined,
      areaId: undefined,
      locationId: undefined
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceName: undefined,
    deviceSn: undefined,
    productId: undefined, 
    productType: undefined,
    status: undefined,
    parkId: undefined,
    areaId: undefined,
    locationId: undefined,
    userId: undefined 
  },
  rules: {
    deviceName: [{ required: true, message: "设备名称不能为空", trigger: "blur" }],
    deviceSn: [{ required: true, message: "设备编号不能为空", trigger: "blur" }],
    protocolType: [{ required: true, message: "协议类型不能为空", trigger: "change" }],
    productId: [{ required: true, message: "产品类别不能为空", trigger: "change" }],
    locationId: [{ required: true, message: "请选择具体位置", trigger: "change" }]
  },
  simulateForm: { deviceSn: '', payload: '' }
});

const { queryParams, form, rules, simulateForm } = toRefs(data);

// 鍒濆鍖?
onMounted(() => {
    // 蹇呴』绛夊緟鏉冮檺鑾峰彇瀹屾瘯锛屾嬁鍒?userId 鍚庡啀鍔犺浇鍒楄〃
    initUserPermissions().then(() => {
        getList();
    });
    getProductList();
    window.addEventListener("resize", handleTrendResize);
});

onBeforeUnmount(() => {
    window.removeEventListener("resize", handleTrendResize);
    disposeTrendChart();
});

// 鍒濆鍖栫敤鎴锋潈闄愶紝骞跺姞杞藉垪琛?
async function initUserPermissions() {
    try {
        const userRes = await getUserProfile();
        const user = userRes.data;
        
        isAdmin.value = user.admin || (user.roles && user.roles.some(r => r.roleKey === 'admin'));
        
        currentUserParkId.value = user.parkId; 
        currentUserId.value = user.userId; // 銆愭牳蹇冦€戜繚瀛?UserId

        // 鍔犺浇鍥尯鍒楄〃
        const parkRes = await listPark({ pageNum: 1, pageSize: 999 });
        const allParks = parkRes.data || parkRes.rows || [];

        if (isAdmin.value) {
            parkOptions.value = allParks;
        } else {
            if (currentUserParkId.value) {
                parkOptions.value = allParks.filter(p => String(p.parkId) === String(currentUserParkId.value));
            } else {
                parkOptions.value = [];
            }
        }
    } catch (e) {
        console.error("获取用户信息失败", e);
    }
}

/**
 * 涓夌骇鍦扮悊浣嶇疆绛涢€夛細鍥尯 -> 鍖哄煙 -> 鍏蜂綋浣嶇疆
 * 浣跨敤甯︾被鍨嬪墠缂€鐨勫€硷紝閬垮厤涓嶅悓灞傜骇 ID 鐩稿悓瀵艰嚧娣锋穯銆?
 */
const locationFilterProps = {
  lazy: true,
  checkStrictly: true,
  emitPath: true,
  value: "value",
  label: "label",
  leaf: "leaf",
  async lazyLoad(node, resolve) {
    try {
      const level = node.level;
      const parentId = getLocationFilterId(node.value);

      if (level === 0) {
        if (!parkOptions.value.length) {
          await initUserPermissions();
        }

        resolve(parkOptions.value.map(item => ({
          value: buildLocationFilterValue("park", item.parkId),
          label: item.parkName,
          leaf: false
        })));
        return;
      }

      if (level === 1) {
        const res = await listAreaByParkId(parentId);
        const rows = res.data || res.rows || [];
        resolve(rows.map(item => ({
          value: buildLocationFilterValue("area", item.areaId),
          label: item.areaName,
          leaf: false
        })));
        return;
      }

      if (level === 2) {
        const res = await listLocationByAreaId(parentId);
        const rows = res.data || res.rows || [];
        resolve(rows.map(item => ({
          value: buildLocationFilterValue("location", item.locationId),
          label: item.locationName,
          leaf: true
        })));
        return;
      }

      resolve([]);
    } catch (error) {
      console.error("地理位置筛选加载失败", error);
      proxy.$modal.msgWarning("地理位置筛选加载失败");
      resolve([]);
    }
  }
};

function buildLocationFilterValue(type, id) {
  return `${type}:${id}`;
}

function getLocationFilterId(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const text = String(value);
  return text.includes(":") ? text.substring(text.indexOf(":") + 1) : text;
}

function handleLocationFilterChange(path) {
  queryParams.value.parkId = undefined;
  queryParams.value.areaId = undefined;
  queryParams.value.locationId = undefined;

  (path || []).forEach(value => {
    const text = String(value);
    const id = getLocationFilterId(text);

    if (text.startsWith("park:")) queryParams.value.parkId = id;
    if (text.startsWith("area:")) queryParams.value.areaId = id;
    if (text.startsWith("location:")) queryParams.value.locationId = id;
  });
}

// 鑾峰彇鍒楄〃锛氥€愭牳蹇冧慨澶嶃€?
function getList() {
  loading.value = true;
  
  // 娉ㄥ叆鏉冮檺鍙傛暟
  if (!isAdmin.value) {
      if (currentUserId.value) {
          queryParams.value.userId = currentUserId.value; // 浼犲叆 userId
      }
      if (currentUserParkId.value) {
          queryParams.value.parkId = currentUserParkId.value; // 浼犲叆 parkId
      }
  }
  
  listDevice(queryParams.value).then(response => {
    deviceList.value = response.rows || response.data || [];
    total.value = response.total || deviceList.value.length;
  }).catch(error => {
    console.error("查询设备列表失败", error);
    deviceList.value = [];
    total.value = 0;
  }).finally(() => {
    loading.value = false;
  });
}

function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

// 銆愭牳蹇冧慨澶嶃€戦噸缃椂淇濈暀鏉冮檺鍙傛暟
function resetQuery() {
  proxy.resetForm("queryRef");

  locationFilterPath.value = [];
  queryParams.value.areaId = undefined;
  queryParams.value.locationId = undefined;
  queryParams.value.parkId = undefined;

  // 閲嶇疆鍚庡繀椤婚噸鏂版敞鍏ユ潈闄愶紝鍚﹀垯浼氭煡璇㈡墍鏈夋暟鎹?
  if (!isAdmin.value) {
      if (currentUserId.value) queryParams.value.userId = currentUserId.value;
      if (currentUserParkId.value) queryParams.value.parkId = currentUserParkId.value;
  }

  handleQuery();
}

// 鍏朵粬閫昏緫淇濇寔涓嶅彉...
// 鑱斿姩锛氬洯鍖?-> 鍖哄煙
async function handleParkChange(val) {
    form.value.areaId = undefined;
    form.value.locationId = undefined;
    areaOptions.value = [];
    locationOptions.value = [];
    if (val) {
        const res = await listAreaByParkId(val);
        areaOptions.value = res.data || res.rows || [];
    }
}

// 鑱斿姩锛氬尯鍩?-> 浣嶇疆
async function handleAreaChange(val) {
    form.value.locationId = undefined;
    locationOptions.value = [];
    if (val) {
        const res = await listLocationByAreaId(val);
        locationOptions.value = res.data || res.rows || [];
    }
}

// 鏍煎紡鍖栧叿浣撲綅缃樉绀?
function formatLocation(row) {
  const parts = [row.parkName, row.areaName, row.locationName];
  return parts.filter(p => p && String(p).trim() !== '').join(' / ') || '-';
}

function getProductList() {
   listProduct({ pageNum: 1, pageSize: 100 }).then(response => {
        productList.value = response.rows || []; 
    });
}

function formatProductName(id) {
    if (!id || !productList.value || productList.value.length === 0) return id;
    const found = productList.value.find(p => String(p.productId) === String(id));
    return found ? found.productName : id;
}

function formatProductType(type) {
    const found = productTypeOptions.find(item => String(item.value) === String(type));
    return found ? found.label : "-";
}

function cancel() {
  open.value = false;
  reset();
}

function reset() {
  form.value = {
    deviceId: undefined,
    deviceName: undefined,
    deviceSn: undefined,
    productId: undefined, 
    protocolType: 'MQTT',
    status: "0",
    remark: undefined,
    parkId: undefined,
    areaId: undefined,
    locationId: undefined
  };
  proxy.resetForm("deviceFormRef");
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.deviceId);
  single.value = selection.length != 1;
  multiple.value = !selection.length;
}

/**
 * 鐐瑰嚮璁惧琛屽悗锛屽湪鏁版嵁鍒楄〃涓嬫柟灞曞紑璁惧鏁版嵁鎶藉眽銆?
 * 澶嶉€夋銆佹搷浣滄寜閽拰璁惧缂栧彿鏍囩鐨勭偣鍑讳笉浼氳Е鍙戣鎶藉眽銆?
 */
function handleDeviceRowClick(row, column, event) {
  if (!row) return;
  if (column?.type === "selection" || column?.label === "操作") return;

  const target = event?.target;
  if (target?.closest?.(".el-button, .el-checkbox, .el-tag, .el-input, .el-select, a, input")) {
    return;
  }

  openDeviceDataDrawer(row);
}

function getDeviceRowClass({ row }) {
  return String(row?.deviceId ?? "") === String(activeDeviceId.value ?? "")
    ? "is-data-active"
    : "";
}

function handleCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    proxy.$modal.msgSuccess("复制成功: " + text);
  }).catch(() => {
    proxy.$modal.msgError("复制失败，请手动复制");
  });
}

function handleAdd() {
  reset();
  open.value = true;
  title.value = "添加设备";
  
  if (!isAdmin.value && parkOptions.value.length === 1) {
      form.value.parkId = parkOptions.value[0].parkId;
      handleParkChange(form.value.parkId);
  }
}

async function handleUpdate(row) {
  reset();
  const deviceId = row.deviceId || ids.value;
  const response = await getDevice(deviceId);
  form.value = response.data;
  open.value = true;
  title.value = "修改设备";

  if (form.value.locationId) {
      try {
          const locRes = await getLocation(form.value.locationId);
          const loc = locRes.data;
          if (loc) {
              const areaRes = await getArea(loc.areaId);
              const area = areaRes.data;
              if (area) {
                  form.value.parkId = area.parkId;
                  await handleParkChange(area.parkId); 
                  form.value.areaId = loc.areaId;
                  await handleAreaChange(loc.areaId); 
                  form.value.locationId = loc.locationId;
              }
          }
      } catch (e) {
          console.error("回显位置失败", e);
      }
  }
}

function submitForm() {
  proxy.$refs["deviceFormRef"].validate(valid => {
    if (valid) {
      if (form.value.deviceId != undefined) {
        updateDevice(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addDevice(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功");
          open.value = false;
          getList();
        });
      }
    }
  });
}

function handleDelete(row) {
  const deviceIds = row.deviceId || ids.value;
  proxy.$modal.confirm('是否确认删除设备编号为"' + deviceIds + '"的数据项？').then(function() {
    return delDevice(deviceIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
}

// 妯℃嫙涓婃姤
function handleSimulate(row) {
    simulateForm.value.deviceSn = row.deviceSn;
    currentModels.value = []; 
    if (!row.productId) {
        simulateForm.value.payload = "{}";
        openSimulate.value = true;
        return;
    }
    const loadingInstance = proxy.$loading({ lock: true, text: '加载物模型...', background: 'rgba(0, 0, 0, 0.7)' });
    listModel({ productId: row.productId, pageSize: 100 }).then(res => {
        const models = res.rows || [];
        currentModels.value = models;
        const template = {};
        models.forEach(model => {
            template[model.identifier] = generateMockValue(model);
        });
        simulateForm.value.payload = JSON.stringify(template, null, 4);
        loadingInstance.close();
        openSimulate.value = true;
    }).catch(() => {
        loadingInstance.close();
        simulateForm.value.payload = "{}";
        openSimulate.value = true;
    });
}

function generateMockValue(model) {
    const type = model.type;
    switch (type) {
        case 'int': return Math.floor(Math.random() * 100);
        case 'float': return parseFloat((Math.random() * 50).toFixed(2));
        case 'bool': return Math.random() > 0.5 ? 1 : 0;
        case 'enum': return 0;
        case 'string': return "sample_data";
        default: return null;
    }
}

function submitSimulate() {
    simulateLoading.value = true;
    simulateReport(simulateForm.value.deviceSn, simulateForm.value.payload).then(() => {
        proxy.$modal.msgSuccess("指令发送成功");
        simulateLoading.value = false;
        openSimulate.value = false;
        const device = deviceList.value.find(d => d.deviceSn === simulateForm.value.deviceSn);
        handleViewLogs(device || { deviceSn: simulateForm.value.deviceSn }); 
    }).catch(() => {
        simulateLoading.value = false;
    });
}

// 鏌ョ湅鏃ュ織
async function handleViewLogs(row) {
    logDrawerSn.value = row.deviceSn;
    openLogDrawer.value = true;
    currentModels.value = [];
    activeLogField.value = "";

    let pid = row.productId;
    if (!pid) {
         const d = deviceList.value.find(item => item.deviceSn === row.deviceSn);
         if (d) pid = d.productId;
    }

    if (pid) {
         try {
             const res = await listModel({ productId: pid, pageSize: 100 });
             currentModels.value = res.rows || [];
         } catch (error) {
             currentModels.value = [];
         }
    }

    await refreshLogs();
}

async function refreshLogs() {
    logLoading.value = true;
    try {
        const res = await listDeviceLog({ 
            deviceSn: logDrawerSn.value, 
            pageSize: 20, 
            pageNum: 1,
            orderByColumn: 'createTime', 
            isAsc: 'desc'
        });
        logList.value = res.rows || [];
        ensureActiveLogField();
    } catch (err) {
        logList.value = [];
    } finally {
        logLoading.value = false;
    }
}

function formatPayload(payload) {
    if (typeof payload === 'object') { 
        return JSON.stringify(payload); 
    }
    return payload;
}

function getLogFieldName(model) {
    if (!model) return "";
    return model.modelName || model.name || model.identifier || "未命名字段";
}

function selectLogField(identifier) {
    activeLogField.value = identifier;
}

function ensureActiveLogField() {
    if (activeLogField.value && logFieldOptions.value.some(item => item.identifier === activeLogField.value)) {
        return;
    }

    activeLogField.value = logFieldOptions.value.length ? logFieldOptions.value[0].identifier : "";
}

function formatLogFieldValue(value, unit = "") {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    const text = String(value);
    return unit ? `${text} ${unit}` : text;
}

function isControlDevice(row) {
    if (!row) return false;
    if (String(row.productType) === "1") return true;

    const product = productList.value.find(item => String(item.productId) === String(row.productId));
    return !!product && (String(product.type) === "1" || String(product.productType) === "1");
}

async function handleController(row) {
    if (!row || !row.deviceSn) {
        proxy.$modal.msgWarning("当前控制终端缺少SN，无法读取控制器状态");
        return;
    }

    controllerDeviceName.value = row.deviceName || "";
    controllerDeviceId.value = row.deviceId;
    controllerDeviceSn.value = row.deviceSn;
    controllerProductId.value = row.productId;
    controllerModels.value = [];
    controllerItems.value = [];
    controllerLogTime.value = "";
    controllerActiveTab.value = "status";
    controllerCommandRows.value = [];
    controllerRecordList.value = [];
    controllerRecordTotal.value = 0;
    controllerAlertRecordList.value = [];
    controllerAlertRecordTotal.value = 0;
    controllerRecordQuery.pageNum = 1;
    controllerAlertRecordQuery.pageNum = 1;
    controllerSendForm.remark = "";
    openControllerDrawer.value = true;

    await Promise.all([refreshControllerStatus(), loadControllerRecords(), loadControllerAlertRecords()]);
}

async function refreshControllerData() {
    await Promise.all([refreshControllerStatus(), loadControllerRecords(), loadControllerAlertRecords()]);
}

async function refreshControllerStatus() {
    if (!controllerDeviceSn.value) return;
    controllerLoading.value = true;

    try {
        if (controllerProductId.value) {
            const modelRes = await listModel({ productId: controllerProductId.value, pageNum: 1, pageSize: 1000 });
            controllerModels.value = (modelRes.rows || modelRes.data || []).filter(item => item?.identifier);
            ensureControllerCommandRow();
        }

        const logRes = await listDeviceLog({
            deviceSn: controllerDeviceSn.value,
            pageSize: 1,
            pageNum: 1,
            orderByColumn: "createTime",
            isAsc: "desc"
        });

        const logRows = Array.isArray(logRes.rows)
            ? logRes.rows
            : (Array.isArray(logRes.data) ? logRes.data : (logRes.data ? [logRes.data] : []));
        const latestLog = logRows[0];
        controllerLogTime.value = latestLog?.createTime || "";
        const payload = parseLogPayload(latestLog?.payload);
        controllerItems.value = buildControllerItems(payload);
    } catch (error) {
        controllerItems.value = [];
        controllerLogTime.value = "";
    } finally {
        controllerLoading.value = false;
    }
}

function buildControllerItems(payload) {
    if (!payload || typeof payload !== "object") return [];

    const modelMap = new Map();
    controllerModels.value.forEach(model => {
        if (model?.identifier) modelMap.set(model.identifier, model);
    });

    return Object.keys(payload).filter(identifier => identifier.toLowerCase() !== "res").map(identifier => {
        const model = modelMap.get(identifier) || {
            identifier,
            modelName: identifier,
            specs: null
        };
        const value = payload[identifier];
        const specs = parseModelSpecs(model);
        const isSwitch = specs.type === "select";

        return {
            identifier,
            modelName: model.modelName || model.name || identifier,
            value: String(value),
            displayValue: formatControllerValue(value, model, isSwitch),
            unit: getModelUnit(model) || "-",
            isSwitch
        };
    });
}

function parseModelSpecs(model) {
    if (!model) return {};
    const specs = model.specs || model.modelSpecs || model.properties;
    if (!specs) return {};
    if (typeof specs === "object") return specs || {};
    try {
        return JSON.parse(specs) || {};
    } catch (error) {
        return {};
    }
}

function formatControllerValue(value, model, isSwitch) {
    if (value === null || value === undefined || value === "") return "-";
    if (isSwitch) {
        if (String(value) === "1") return "开启";
        if (String(value) === "0") return "关闭";
        const specs = parseModelSpecs(model);
        const uploadKey = Object.keys(specs).find(key => /^label\d+$/i.test(key) && String(specs[key]) === String(value));
        if (uploadKey) {
            const index = uploadKey.match(/\d+/)?.[0] || "";
            if (specs[`select${index}`]) return specs[`select${index}`];
        }
        const option = getControllerSelectOptions(model.identifier).find(item => String(item.value) === String(value));
        if (option) return option.label;
    }
    return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function ensureControllerCommandRow() {
    if (controllerModels.value.length && controllerCommandRows.value.length === 0) {
        addControllerCommandRow();
    }
}

function addControllerCommandRow() {
    if (!controllerModels.value.length) {
        proxy.$modal.msgWarning("当前产品暂无可下发的物模型");
        return;
    }
    if (controllerCommandRows.value.length >= controllerModels.value.length) {
        proxy.$modal.msgWarning("所有控制字段均已添加");
        return;
    }
    controllerCommandRows.value.push({
        uid: `${Date.now()}_${Math.random()}`,
        identifier: undefined,
        value: ""
    });
}

function removeControllerCommandRow(index) {
    controllerCommandRows.value.splice(index, 1);
}

function controllerAvailableModels(index) {
    const selected = controllerCommandRows.value
        .filter((_, rowIndex) => rowIndex !== index)
        .map(item => item.identifier)
        .filter(Boolean);
    return controllerModels.value.filter(item => !selected.includes(item.identifier));
}

function getControllerModel(identifier) {
    return controllerModels.value.find(item => item.identifier === identifier);
}

function formatControllerModelLabel(model) {
    if (!model) return "-";
    const name = model.modelName || model.name || model.identifier || "未命名物模型";
    const unit = getModelUnit(model);
    return unit ? `${name} / ${model.identifier} / ${unit}` : `${name} / ${model.identifier}`;
}

function getControllerModelUnit(identifier) {
    return getModelUnit(getControllerModel(identifier));
}

function isControllerSelectModel(identifier) {
    return parseModelSpecs(getControllerModel(identifier)).type === "select";
}

function getControllerSelectOptions(identifier) {
    const specs = parseModelSpecs(getControllerModel(identifier));
    const indexedOptions = Object.keys(specs)
        .filter(key => /^value\d+$/i.test(key))
        .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0))
        .map(valueKey => {
            const index = valueKey.match(/\d+/)?.[0] || "";
            const value = specs[valueKey];
            const label = specs[`select${index}`] || specs[`name${index}`];
            return {
                label: label || (String(value) === "1" ? "开启" : String(value) === "0" ? "关闭" : String(value)),
                value
            };
        });
    if (indexedOptions.length) return indexedOptions;

    const rawOptions = specs.options || specs.values || specs.enum || specs.data || [];
    if (Array.isArray(rawOptions) && rawOptions.length) {
        return rawOptions.map(item => typeof item === "object"
            ? { label: item.label || item.name || item.text || String(item.value), value: item.value ?? item.key ?? item.id }
            : { label: String(item), value: item });
    }
    if (rawOptions && typeof rawOptions === "object") {
        return Object.keys(rawOptions).map(key => ({ label: rawOptions[key], value: key }));
    }
    return [{ label: "关闭", value: 0 }, { label: "开启", value: 1 }];
}

function handleControllerCommandModelChange(row) {
    const options = getControllerSelectOptions(row.identifier);
    row.value = isControllerSelectModel(row.identifier) && options.length ? options[0].value : "";
}

function normalizeControllerCommandValue(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value !== "" && value !== null && value !== undefined && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return value;
}

function buildControllerCommands() {
    return controllerCommandRows.value.reduce((commands, item) => {
        if (item.identifier) commands[item.identifier] = normalizeControllerCommandValue(item.value);
        return commands;
    }, {});
}

async function submitControllerCommand() {
    const commands = buildControllerCommands();
    if (!Object.keys(commands).length) {
        proxy.$modal.msgWarning("请至少选择一个控制字段");
        return;
    }
    if (Object.values(commands).some(value => value === "" || value === null || value === undefined)) {
        proxy.$modal.msgWarning("请填写完整的下发值");
        return;
    }

    controllerSendLoading.value = true;
    try {
        await sendManualControl({
            deviceId: controllerDeviceId.value,
            deviceSn: controllerDeviceSn.value,
            commands,
            remark: controllerSendForm.remark
        });
        proxy.$modal.msgSuccess("控制指令已下发");
        controllerCommandRows.value = [];
        ensureControllerCommandRow();
        controllerSendForm.remark = "";
        controllerActiveTab.value = "manualRecords";
        controllerRecordQuery.pageNum = 1;
        await loadControllerRecords();
    } finally {
        controllerSendLoading.value = false;
    }
}

async function loadControllerRecords() {
    if (!controllerDeviceId.value && !controllerDeviceSn.value) return;
    controllerRecordLoading.value = true;
    try {
        const response = await listManualControl({
            deviceId: controllerDeviceId.value,
            deviceSn: controllerDeviceSn.value,
            pageNum: controllerRecordQuery.pageNum,
            pageSize: controllerRecordQuery.pageSize
        });
        controllerRecordList.value = Array.isArray(response.rows)
            ? response.rows
            : (Array.isArray(response.data) ? response.data : []);
        controllerRecordTotal.value = response.total || controllerRecordList.value.length;
    } catch (error) {
        controllerRecordList.value = [];
        controllerRecordTotal.value = 0;
    } finally {
        controllerRecordLoading.value = false;
    }
}

async function loadControllerAlertRecords() {
    if (!controllerDeviceId.value) return;
    controllerAlertRecordLoading.value = true;
    try {
        const response = await listControlEvent({
            deviceId: controllerDeviceId.value,
            pageNum: controllerAlertRecordQuery.pageNum,
            pageSize: controllerAlertRecordQuery.pageSize
        });
        controllerAlertRecordList.value = Array.isArray(response.rows)
            ? response.rows
            : (Array.isArray(response.data) ? response.data : []);
        controllerAlertRecordTotal.value = response.total || controllerAlertRecordList.value.length;
    } catch (error) {
        controllerAlertRecordList.value = [];
        controllerAlertRecordTotal.value = 0;
    } finally {
        controllerAlertRecordLoading.value = false;
    }
}

function getControllerRecordIdentifiers(row) {
    if (!row) return [];
    if (row.targetIdentifiers) {
        const identifiers = String(row.targetIdentifiers).split(",").map(item => item.trim()).filter(Boolean);
        if (identifiers.length) return identifiers;
    }
    const payload = parseLogPayload(row.payload);
    if (!payload || typeof payload !== "object") return [];
    return Object.keys(payload).filter(key => key.toLowerCase() !== "res");
}

function formatControllerRecordFields(row) {
    const identifiers = getControllerRecordIdentifiers(row);
    if (!identifiers.length) return "-";
    return identifiers.map(identifier => {
        const model = getControllerModel(identifier);
        return model ? `${model.modelName || model.name || identifier}(${identifier})` : identifier;
    }).join("、");
}

function formatControllerRecordCommands(row) {
    const payload = parseLogPayload(row?.payload);
    if (!payload || typeof payload !== "object") return "-";
    const entries = Object.entries(payload).filter(([identifier]) => identifier.toLowerCase() !== "res");
    if (!entries.length) return "-";
    return entries.map(([identifier, value]) => {
        const model = getControllerModel(identifier);
        const name = model?.modelName || model?.name || identifier;
        let displayValue = value === null || value === undefined || value === "" ? "-" : String(value);
        if (model && isControllerSelectModel(identifier)) {
            displayValue = getControllerSelectOptions(identifier)
                .find(option => String(option.value) === String(value))?.label || displayValue;
        } else {
            const unit = getModelUnit(model);
            if (unit && displayValue !== "-") displayValue = `${displayValue}${unit}`;
        }
        return `${name}：${displayValue}`;
    }).join("；");
}

function getControllerModelNameById(modelId) {
    return controllerModels.value.find(item => String(item.modelId) === String(modelId))?.modelName || "";
}

function getControllerRecordStatusText(status) {
    return ({ 0: "待下发", 1: "已下发", 2: "成功", 3: "失败", 4: "超时" })[status] || "-";
}

function getControllerRecordStatusType(status) {
    return ({ 0: "info", 1: "primary", 2: "success", 3: "danger", 4: "warning" })[status] || "info";
}

function getControllerAlertLevelType(level) {
    if (String(level) === "1") return "danger";
    if (String(level) === "2") return "warning";
    return "info";
}

function getControllerAlertLevelText(level) {
    if (String(level) === "1") return "一级预警";
    if (String(level) === "2") return "二级预警";
    if (String(level) === "3") return "三级预警";
    return level ? `${level}级预警` : "未分级";
}

async function viewControllerRecord(row) {
    const response = await getManualControl(row.eventId);
    controllerRecordDetail.value = response.data || {};
    controllerRecordDetailOpen.value = true;
}

async function viewControllerAlertRecord(row) {
    const response = await getControlEvent(row.eventId);
    controllerAlertDetail.value = response.data || {};
    controllerAlertDetailOpen.value = true;
}

function deleteControllerRecord(row) {
    proxy.$modal.confirm(`是否确认删除事件编号为“${row.eventId}”的控制记录？`).then(() => {
        return delManualControl(row.eventId);
    }).then(() => {
        proxy.$modal.msgSuccess("删除成功");
        if (controllerRecordList.value.length === 1 && controllerRecordQuery.pageNum > 1) {
            controllerRecordQuery.pageNum -= 1;
        }
        loadControllerRecords();
    }).catch(() => {});
}

function formatControllerJson(value) {
    if (!value) return "-";
    try {
        return JSON.stringify(typeof value === "string" ? JSON.parse(value) : value, null, 2);
    } catch (error) {
        return String(value);
    }
}

// === 琛岀偣鍑诲彸渚ц澶囨暟鎹娊灞?===

/**
 * 鎵撳紑璁惧鏁版嵁鎶藉眽銆傛娊灞変粠鍙充晶鎷夊嚭灞曠ず锛屼笉鍗犵敤鍒楄〃甯冨眬绌洪棿銆?
 */
async function openDeviceDataDrawer(row) {
    const target = row;

    if (!target || !target.deviceSn) {
        proxy.$modal.msgWarning("设备信息不完整，无法查看数据");
        return;
    }

    activeDeviceId.value = target.deviceId ?? null;
    trendDeviceName.value = target.deviceName || "";
    trendDeviceSn.value = target.deviceSn || "";
    trendDeviceStatus.value = String(target.status ?? "0");
    trendProductName.value = formatProductName(target.productId) || "-";
    trendProductTypeName.value = formatProductType(target.productType);
    trendLocationName.value = formatLocation(target);

    numericModels.value = [];
    currentTrendKey.value = "";
    currentTrendUnit.value = "";
    trendDateRange.value = [];
    resetTrendStats();
    trendPointCount.value = 0;

    openTrendDrawer.value = true;
    trendLoading.value = true;

    await nextTick();
    scheduleTrendChartResize();

    try {
        if (!target.productId) return;

        const modelRes = await listModel({
            productId: target.productId,
            pageNum: 1,
            pageSize: 200
        });

        const allModels = modelRes.rows || modelRes.data || [];
        const allNumericModels = allModels.filter(item =>
            ["int", "float"].includes(String(item.type || "").toLowerCase())
        );
        const monitorModels = allNumericModels.filter(item => Number(item.isMonitor) === 1);

        // 浼樺厛灞曠ず閰嶇疆涓衡€滃垪琛ㄥ睍绀衡€濈殑鏁板€煎睘鎬э紱鏈厤缃椂鍥為€€鍒板叏閮ㄦ暟鍊煎睘鎬с€?
        numericModels.value = monitorModels.length ? monitorModels : allNumericModels;

        if (numericModels.value.length) {
            currentTrendKey.value = numericModels.value[0].identifier;
            await loadTrendData();
        }
    } catch (error) {
        console.error("打开设备数据抽屉失败", error);
        proxy.$modal.msgError("设备数据加载失败");
    } finally {
        trendLoading.value = false;
        scheduleTrendChartResize();
    }
}

async function loadTrendData() {
    if (!trendDeviceSn.value || !currentTrendKey.value) {
        resetTrendStats();
        trendPointCount.value = 0;
        await nextTick();
        renderTrendChart([], []);
        return;
    }

    trendLoading.value = true;

    try {
        const currentModel = numericModels.value.find(
            item => item.identifier === currentTrendKey.value
        );
        currentTrendUnit.value = getModelUnit(currentModel);

        const logRes = await listDeviceLog({
            deviceSn: trendDeviceSn.value,
            pageNum: 1,
            pageSize: 500,
            orderByColumn: "createTime",
            isAsc: "asc"
        });

        let logs = logRes.rows || logRes.data || [];

        if (trendDateRange.value && trendDateRange.value.length === 2) {
            const startTime = new Date(trendDateRange.value[0]).getTime();
            const endTime = new Date(trendDateRange.value[1]).getTime();

            logs = logs.filter(item => {
                const currentTime = new Date(item.createTime).getTime();
                return Number.isFinite(currentTime)
                    && currentTime >= startTime
                    && currentTime <= endTime;
            });
        }

        logs = [...logs].sort((a, b) => {
            return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
        });

        const xData = [];
        const yData = [];

        logs.forEach(log => {
            const payload = parseLogPayload(log.payload);
            const value = Number(payload?.[currentTrendKey.value]);

            if (Number.isFinite(value)) {
                xData.push(formatTrendTime(log.createTime));
                yData.push(value);
            }
        });

        trendPointCount.value = yData.length;
        updateTrendStats(yData);

        await nextTick();
        renderTrendChart(xData, yData);
    } catch (error) {
        console.error("加载设备趋势数据失败", error);
        resetTrendStats();
        trendPointCount.value = 0;
        await nextTick();
        renderTrendChart([], []);
        proxy.$modal.msgError("趋势数据加载失败");
    } finally {
        trendLoading.value = false;
    }
}

function parseLogPayload(payload) {
    if (payload && typeof payload === "object") return payload;

    if (typeof payload === "string") {
        try {
            return JSON.parse(payload);
        } catch (error) {
            return {};
        }
    }

    return {};
}

function getModelUnit(model) {
    if (!model || !model.specs) return "";

    if (typeof model.specs === "object") {
        return model.specs.unit || "";
    }

    try {
        const specs = JSON.parse(model.specs);
        return specs.unit || "";
    } catch (error) {
        return "";
    }
}

function formatTrendTime(value) {
    if (!value) return "";

    try {
        const formatted = proxy.parseTime(value, "{m}-{d} {h}:{i}");
        if (formatted) return formatted;
    } catch (error) {
        // 椤圭洰鏈寕杞?parseTime 鏃朵娇鐢ㄥ瓧绗︿覆闄嶇骇鏍煎紡銆?
    }

    return String(value).replace("T", " ").substring(5, 16);
}

function updateTrendStats(values) {
    if (!values.length) {
        resetTrendStats();
        return;
    }

    const totalValue = values.reduce((sum, value) => sum + value, 0);
    const decimalLength = getTrendDecimalLength(values);

    trendStats.latest = formatTrendNumber(values[values.length - 1], decimalLength);
    trendStats.avg = formatTrendNumber(totalValue / values.length, decimalLength);
    trendStats.max = formatTrendNumber(Math.max(...values), decimalLength);
    trendStats.min = formatTrendNumber(Math.min(...values), decimalLength);
}

function getTrendDecimalLength(values) {
    return values.some(value => !Number.isInteger(value)) ? 2 : 0;
}

function formatTrendNumber(value, decimalLength = 2) {
    if (!Number.isFinite(Number(value))) return "-";
    return Number(value).toFixed(decimalLength);
}

function resetTrendStats() {
    trendStats.latest = "-";
    trendStats.avg = "-";
    trendStats.max = "-";
    trendStats.min = "-";
}

function renderTrendChart(xData, yData) {
    if (!trendChartRef.value) return;

    disposeTrendChart();
    trendChart = echarts.init(trendChartRef.value);

    if (!xData.length || !yData.length) {
        trendChart.setOption({
            backgroundColor: "transparent",
            title: {
                text: "暂无趋势数据",
                subtext: "请调整时间范围，或确认设备已上报该属性",
                left: "center",
                top: "center",
                textStyle: {
                    color: "#86efac",
                    fontSize: 17,
                    fontWeight: "normal"
                },
                subtextStyle: {
                    color: "#64748b",
                    fontSize: 12,
                    lineHeight: 24
                }
            }
        });
        return;
    }

    trendChart.setOption({
        backgroundColor: "transparent",
        animationDuration: 600,
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(15, 23, 42, 0.96)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            textStyle: { color: "#ffffff" },
            axisPointer: {
                type: "line",
                lineStyle: {
                    color: "rgba(52, 211, 153, 0.45)",
                    type: "dashed"
                }
            },
            formatter(params) {
                const point = params?.[0];
                if (!point) return "";
                const unit = currentTrendUnit.value ? ` ${currentTrendUnit.value}` : "";
                return `${point.axisValue}<br/>${point.marker}${currentTrendModelName.value}：${point.data}${unit}`;
            }
        },
        dataZoom: [
            {
                type: "inside",
                start: Math.max(0, 100 - Math.min(100, (40 / xData.length) * 100)),
                end: 100
            },
            {
                type: "slider",
                height: 18,
                bottom: 4,
                borderColor: "rgba(16, 185, 129, 0.2)",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                fillerColor: "rgba(16, 185, 129, 0.16)",
                handleStyle: {
                    color: "#10b981",
                    borderColor: "#34d399"
                },
                textStyle: { color: "#64748b" }
            }
        ],
        grid: {
            top: 45,
            left: 42,
            right: 28,
            bottom: 55,
            containLabel: true
        },
        xAxis: {
            type: "category",
            data: xData,
            boundaryGap: false,
            axisLine: {
                lineStyle: { color: "rgba(148, 163, 184, 0.2)" }
            },
            axisLabel: {
                color: "#94a3b8",
                rotate: 40,
                fontSize: 10,
                interval: "auto",
                hideOverlap: true
            },
            axisTick: { show: false }
        },
        yAxis: {
            type: "value",
            name: currentTrendUnit.value,
            nameTextStyle: {
                color: "#94a3b8",
                padding: [0, 0, 0, 8]
            },
            splitLine: {
                lineStyle: {
                    color: "rgba(148, 163, 184, 0.09)",
                    type: "dashed"
                }
            },
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: "#94a3b8" },
            scale: true
        },
        series: [
            {
                name: currentTrendModelName.value,
                data: yData,
                type: "line",
                smooth: true,
                connectNulls: false,
                symbol: "circle",
                symbolSize: 6,
                showSymbol: yData.length <= 100,
                itemStyle: {
                    color: "#080c14",
                    borderColor: "#10b981",
                    borderWidth: 2
                },
                lineStyle: {
                    color: "#10b981",
                    width: 2.5,
                    shadowColor: "rgba(16, 185, 129, 0.45)",
                    shadowBlur: 8
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "rgba(16, 185, 129, 0.30)" },
                        { offset: 1, color: "rgba(16, 185, 129, 0.01)" }
                    ])
                },
                emphasis: {
                    focus: "series"
                }
            }
        ]
    });
}

function scheduleTrendChartResize() {
    nextTick(() => {
        window.requestAnimationFrame(() => {
            if (trendChart) trendChart.resize();
        });
    });

    // 绛夊緟鍙充晶鎶藉眽瀹藉害杩囨浮缁撴潫鍚庡啀娆℃牎姝ｅ浘琛ㄥ昂瀵搞€?
    window.setTimeout(() => {
        if (trendChart) trendChart.resize();
    }, 320);
}

function handleTrendDrawerClosed() {
    openTrendDrawer.value = false;
    activeDeviceId.value = null;
    disposeTrendChart();
    numericModels.value = [];
    currentTrendKey.value = "";
    trendDateRange.value = [];
    trendPointCount.value = 0;
    trendProductTypeName.value = "";
    resetTrendStats();
}

function handleTrendResize() {
    if (trendChart) trendChart.resize();
}

function disposeTrendChart() {
    if (trendChart) {
        trendChart.dispose();
        trendChart = null;
    }
}

</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  color: #409eff;
  opacity: 0.82;
}

.mb8 {
  margin-bottom: 10px;
}

.mb-4 {
  margin-bottom: 1rem;
}

/* ==================== 鏌ヨ鍖哄煙 ==================== */
.device-query-form {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  align-items: end;
  gap: 14px 18px;
  padding: 16px 18px;
  margin-bottom: 14px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(31, 45, 61, 0.04);
}

.device-query-form :deep(.el-form-item) {
  display: flex;
  width: 100%;
  min-width: 0;
  margin: 0;
}

.device-query-form :deep(.el-form-item__label) {
  flex: 0 0 68px;
  justify-content: flex-end;
  padding-right: 10px;
  color: #606266;
  font-weight: 500;
}

.device-query-form :deep(.el-form-item__content) {
  flex: 1;
  min-width: 0;
}

.device-query-form :deep(.el-input),
.device-query-form :deep(.el-select),
.device-query-form :deep(.el-cascader) {
  width: 100% !important;
}

.device-query-form .query-action-item {
  justify-self: start;
}

.device-query-form .query-action-item :deep(.el-form-item__content) {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
}

.device-query-form .query-action-item :deep(.el-button) {
  min-width: 84px;
  margin-left: 0;
}

/* ==================== 椤堕儴鎿嶄綔鏍?==================== */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 42px;
  gap: 16px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  min-width: 0;
}

.toolbar-left {
  flex: 0 0 auto;
}

.toolbar-right {
  margin-left: auto;
  flex: 0 0 auto;
  justify-content: flex-end;
}

.main-action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.main-action-group :deep(.el-button) {
  margin-left: 0;
}

.toolbar-action-button {
  min-width: 104px;
  height: 34px;
  padding: 0 16px;
  font-weight: 500;
}

/* ==================== 璁惧鍒楄〃 ==================== */
.device-workspace {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 0;
  transition: gap 0.28s ease;
}

.device-list-section {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.device-table {
  width: 100%;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.device-table :deep(.el-table__header th.el-table__cell) {
  height: 48px;
  color: #303133;
  font-weight: 600;
  background: #f8fafc;
}

.device-table :deep(.el-table__body td.el-table__cell) {
  height: 52px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.device-table :deep(.cell) {
  line-height: 1.4;
}

.device-table :deep(.el-table__row) {
  cursor: pointer;
  transition: background-color 0.18s ease;
}

.device-table :deep(.el-table__row:hover > td.el-table__cell) {
  background: #f5f9ff !important;
}

.device-table :deep(.el-table__row.is-data-active > td.el-table__cell) {
  background: #ecf5ff !important;
}

.device-table :deep(.el-table__row.is-data-active > td.el-table__cell:first-child) {
  box-shadow: inset 3px 0 0 #409eff;
}

.device-name-cell {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 32px;
  gap: 9px;
}

.device-status-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.device-status-dot.is-online {
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.14);
}

.device-status-dot.is-offline {
  background: #c0c4cc;
  box-shadow: 0 0 0 3px rgba(192, 196, 204, 0.16);
}

.device-name-text {
  display: block;
  overflow: hidden;
  color: #303133;
  font-weight: 600;
  line-height: 32px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-action-group {
  display: grid;
  grid-template-columns: repeat(5, 62px);
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  width: 100%;
}

.row-action-group :deep(.el-button) {
  width: 62px;
  height: 30px;
  justify-content: center;
  margin-left: 0;
  padding: 4px 6px;
  border-radius: 4px;
}

.table-action-button {
  font-weight: 500;
}

.device-controller-drawer :deep(.el-drawer__body) {
  padding: 0;
  overflow: hidden;
  background: #f7f8fa;
}

.controller-detail-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 14px;
  overflow: hidden;
}

.controller-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.controller-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.controller-subtitle {
  margin-top: 4px;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.controller-value {
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.controller-tabs {
  flex: 1;
  min-height: 0;
  padding: 0 16px 14px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.controller-tabs :deep(.el-tabs__content),
.controller-tabs :deep(.el-tab-pane) {
  height: calc(100% - 28px);
}

.controller-tab-panel {
  height: 100%;
  padding: 2px;
  overflow: auto;
}

.controller-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.controller-command-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.controller-command-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f7f9fc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.controller-model-select {
  flex: 1 1 52%;
}

.controller-value-input {
  flex: 1 1 34%;
}

.controller-send-form {
  max-width: 720px;
  margin-top: 8px;
}

.controller-send-actions {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 8px;
}

.controller-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.controller-rule-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

.controller-rule-cell span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.controller-detail-inline {
  margin-left: 8px;
}

.controller-payload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.controller-payload-card {
  min-width: 0;
  overflow: hidden;
  background: #f7f9fc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.controller-payload-title {
  padding: 9px 12px;
  color: #303133;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
}

.controller-payload-card pre {
  min-height: 120px;
  max-height: 260px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  color: #303133;
  font-family: Consolas, monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 1100px) {
  .device-controller-drawer {
    width: 88% !important;
  }

  .controller-command-row {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .controller-model-select,
  .controller-value-input {
    flex-basis: calc(50% - 8px);
  }
}

/* ==================== 搴曢儴鎶藉眽 ==================== */
.bottom-data-drawer {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  box-shadow: 0 -5px 22px rgba(31, 45, 61, 0.09);
}

.bottom-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
  border-bottom: 1px solid #ebeef5;
}

.drawer-title-wrap {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
}

.drawer-title {
  flex: 0 0 auto;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.drawer-title::before {
  display: inline-block;
  width: 4px;
  height: 16px;
  margin-right: 8px;
  vertical-align: -2px;
  content: "";
  background: #409eff;
  border-radius: 2px;
}

.drawer-subtitle {
  overflow: hidden;
  color: #909399;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-close-button {
  flex: 0 0 auto;
  color: #606266;
}

.bottom-drawer-body {
  padding: 16px 18px 20px;
  background: #f7f8fa;
}

.device-data-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 16px 18px;
  border-bottom: 1px solid #ebeef5;
}

.device-data-drawer :deep(.el-drawer__body) {
  padding: 0;
  background: #f7f8fa;
}

.side-drawer-body {
  min-height: 100%;
  padding: 14px;
}

.side-drawer-body .summary-meta {
  grid-template-columns: 1fr;
  gap: 8px;
}

.side-drawer-body .summary-title {
  max-width: 72%;
}

.side-drawer-body .trend-toolbar {
  grid-template-columns: 1fr;
}

.side-drawer-body .trend-toolbar-actions {
  justify-content: flex-start;
}

.side-drawer-body .professional-trend-chart {
  height: 300px;
}

.trend-device-summary {
  margin-bottom: 14px;
  padding: 14px 18px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.summary-main {
  min-width: 0;
}

.summary-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-title {
  max-width: 50%;
  overflow: hidden;
  color: #303133;
  font-size: 17px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-meta {
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) minmax(190px, 0.8fr) minmax(280px, 1.4fr);
  align-items: center;
  gap: 12px 24px;
  color: #606266;
  font-size: 13px;
}

.summary-meta span {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.summary-meta b {
  flex: 0 0 auto;
  color: #909399;
  font-weight: 400;
}

.summary-location {
  grid-column: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(430px, 1.6fr) auto;
  align-items: end;
  gap: 14px 18px;
  margin-bottom: 14px;
  padding: 14px 18px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.trend-toolbar-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.toolbar-label {
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.trend-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.trend-toolbar-actions :deep(.el-button) {
  min-width: 100px;
  margin-left: 0;
}

.trend-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.trend-stat-card {
  min-width: 0;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.trend-stat-card .stat-label {
  display: block;
  margin-bottom: 8px;
  color: #909399;
  font-size: 12px;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 5px;
}

.trend-stat-card strong {
  overflow: hidden;
  color: #409eff;
  font-family: Consolas, Monaco, monospace;
  font-size: 23px;
  line-height: 1.15;
  text-overflow: ellipsis;
}

.trend-stat-card small {
  flex: 0 0 auto;
  color: #909399;
  font-size: 11px;
}

.professional-trend-panel {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.trend-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 18px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.trend-panel-title {
  min-width: 0;
  overflow: hidden;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-panel-icon {
  margin-right: 6px;
  color: #409eff;
}

.trend-point-count {
  flex: 0 0 auto;
  color: #909399;
  font-size: 12px;
}

.professional-trend-chart {
  width: 100%;
  height: 360px;
}

.trend-empty-alert {
  margin-top: 12px;
}

/* 浠庨〉闈笅鏂瑰悜涓婂睍寮€锛屼笉浣跨敤閬僵锛屼笉瑕嗙洊鍒楄〃 */
.bottom-drawer-enter-active,
.bottom-drawer-leave-active {
  overflow: hidden;
  transition:
    max-height 0.34s ease,
    opacity 0.24s ease,
    transform 0.34s ease,
    margin-top 0.34s ease;
}

.bottom-drawer-enter-from,
.bottom-drawer-leave-to {
  max-height: 0;
  margin-top: -14px;
  opacity: 0;
  transform: translateY(36px);
}

.bottom-drawer-enter-to,
.bottom-drawer-leave-from {
  max-height: 1100px;
  opacity: 1;
  transform: translateY(0);
}

/* ==================== 鍏朵粬鍘熸湁寮圭獥 ==================== */
.model-tips {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.tips-title {
  margin-bottom: 10px;
  color: #606266;
  font-size: 14px;
  font-weight: bold;
}

.table-scroll-wrapper {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-bottom: none;
}

.log-model-tips :deep(.el-collapse-item__header) {
  padding-left: 10px;
  color: #606266;
  font-weight: bold;
  background-color: #f8f9fa;
}

.log-model-tips :deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.device-log-drawer :deep(.el-drawer__body) {
  background: #f7f8fa;
}

.log-detail-body {
  padding: 14px;
}

.log-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.log-detail-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.log-detail-subtitle {
  margin-top: 4px;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.log-field-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.log-field-button {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 72px;
  padding: 12px 14px;
  text-align: left;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.log-field-button:hover {
  border-color: #409eff;
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.12);
}

.log-field-button.is-active {
  background: #ecf5ff;
  border-color: #409eff;
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.18);
}

.field-name {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-meta {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.3;
}

.log-field-value {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.payload-text {
  color: #303133;
}

.device-log-drawer :deep(.el-table__cell) {
  vertical-align: middle;
}

/* ==================== 鍝嶅簲寮?==================== */
@media (max-width: 1500px) {
  .device-query-form {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }

  .trend-toolbar {
    grid-template-columns: minmax(220px, 0.8fr) minmax(380px, 1.4fr);
  }

  .trend-toolbar-actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1050px) {
  .device-query-form {
    grid-template-columns: 1fr;
  }

  .device-query-form .query-action-item {
    justify-self: stretch;
  }

  .device-query-form .query-action-item :deep(.el-form-item__content) {
    justify-content: flex-end;
  }

  .table-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .toolbar-right {
    margin-left: auto;
  }

  .trend-toolbar {
    grid-template-columns: 1fr;
  }

  .trend-toolbar-actions {
    grid-column: auto;
  }

  .summary-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-location {
    grid-column: 1 / -1;
  }

  .trend-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .app-container {
    padding-right: 10px;
    padding-left: 10px;
  }

  .device-query-form {
    padding: 14px 12px;
  }

  .device-query-form :deep(.el-form-item) {
    align-items: flex-start;
    flex-direction: column;
  }

  .device-query-form :deep(.el-form-item__label) {
    justify-content: flex-start;
    width: auto !important;
    height: 26px;
    padding-right: 0;
    line-height: 26px;
  }

  .device-query-form :deep(.el-form-item__content) {
    width: 100%;
  }

  .table-toolbar,
  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .toolbar-right {
    justify-content: flex-end;
    margin-left: 0;
  }

  .main-action-group {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .toolbar-action-button {
    width: 100%;
    min-width: 0;
    padding: 0 8px;
  }

  .row-action-group {
    grid-template-columns: repeat(2, 62px);
  }

  .bottom-drawer-header {
    padding: 0 14px;
  }

  .drawer-title-wrap {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
  }

  .bottom-drawer-body {
    padding: 12px;
  }

  .summary-title {
    max-width: calc(100% - 70px);
  }

  .summary-meta,
  .trend-stats-grid {
    grid-template-columns: 1fr;
  }

  .summary-location {
    grid-column: auto;
  }

  .trend-toolbar-item {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .toolbar-label {
    text-align: left;
  }

  .professional-trend-chart {
    height: 320px;
  }
}
</style>
