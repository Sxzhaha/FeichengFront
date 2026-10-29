<template>
  <div class="app-container hierarchy-farmer-page" :class="{ 'is-standalone': isStandalone }">
    <!-- FarmerTask 同系页面头部 -->
    <div v-if="isStandalone" class="agri-header farmer-page-header">
      <div class="header-left">
        <span class="header-symbol" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <div class="header-copy">
          <span class="header-eyebrow">SMART FARM MANAGEMENT</span>
          <div class="header-title-row">
            <span class="header-main-title">我的庄园</span>
            <small>园区层级、位置与设备统一管理</small>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button type="success" plain icon="HomeFilled" @click="goHome">
          返回门户首页
        </el-button>
      </div>
    </div>


    <el-row :gutter="20" class="agri-row">
      <el-col :span="8" :xs="24">
        <el-card shadow="never" class="box-card full-height navigation-card">
          <template #header>
            <div class="card-header navigation-header">
              <div
                class="navigation-title clickable-title"
                @click="handleResetToRoot"
                title="点击查看所有园区"
              >
                <span class="navigation-icon" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <div>
                  <strong>园区层级导航</strong>
                </div>
              </div>
              <div class="navigation-actions">
                <el-button link type="primary" icon="Plus" @click="handleAddPark">新增</el-button>
                <el-button link type="primary" icon="Refresh" @click="refreshTree">刷新</el-button>
              </div>
            </div>
          </template>

          <el-tree
            v-if="isReady"
            ref="treeRef"
            :props="defaultProps"
            :load="loadNode"
            lazy
            node-key="uniqueId"
            highlight-current
            :expand-on-click-node="true"
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span class="tree-node-main">
                  <el-icon v-if="data.type === 'park'" class="icon-park"><OfficeBuilding /></el-icon>
                  <el-icon v-else-if="data.type === 'area'" class="icon-area"><Grid /></el-icon>
                  <el-icon v-else-if="data.type === 'location'" class="icon-location"><MapLocation /></el-icon>
                  <span class="tree-node-label">{{ node.label }}</span>
                </span>
                
                <span v-if="data.type === 'park' || data.type === 'area'" class="tree-node-extra">
                  <el-tooltip content="设备总数 / 在线数量" placement="top" :enterable="false">
                    <span class="tree-badge">
                      <span class="badge-total">{{ getStats(data).total }}</span>
                      <span class="badge-sep">/</span>
                      <span class="badge-online">{{ getStats(data).online }}</span>
                    </span>
                  </el-tooltip>
                </span>
              </span>
            </template>
          </el-tree>

          <div v-else class="loading-text">
            <el-icon class="is-loading"><Loading /></el-icon> 加载中...
          </div>
        </el-card>
      </el-col>

      <el-col :span="16" :xs="24">
        <el-row :gutter="16" class="overview-stat-row">
          <el-col :xs="24" :sm="8">
            <el-card shadow="never" class="overview-stat-card scope-card">
              <div class="overview-stat-content">
                <div class="overview-stat-icon">
                  <el-icon><OfficeBuilding /></el-icon>
                </div>
                <div class="overview-stat-info">
                  <span>当前管理范围</span>
                  <strong :title="scopeSummary.name">{{ scopeSummary.name }}</strong>
                  <small>{{ scopeSummary.type }}</small>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="8">
            <el-card shadow="never" class="overview-stat-card data-card">
              <div class="overview-stat-content">
                <div class="overview-stat-icon">
                  <el-icon><List /></el-icon>
                </div>
                <div class="overview-stat-info">
                  <span>{{ scopeSummary.dataLabel }}</span>
                  <strong>{{ scopeSummary.dataCount }}<em>项</em></strong>
                  <small>随当前节点实时更新</small>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :xs="24" :sm="8">
            <el-card shadow="never" class="overview-stat-card device-stat-card">
              <div class="overview-stat-content">
                <div class="overview-stat-icon">
                  <el-icon><DataLine /></el-icon>
                </div>
                <div class="overview-stat-info">
                  <span>范围内设备</span>
                  <strong>{{ scopeSummary.deviceTotal }}<em>台</em></strong>
                  <small>在线 {{ scopeSummary.onlineTotal }} 台</small>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never" class="box-card full-height content-card">
          <div v-if="currentNode && currentNode.type === 'location'" class="device-view-wrapper">
            <el-form
              :model="deviceQueryParams"
              ref="deviceQueryRef"
              :inline="true"
              v-show="showSearch"
              label-width="68px"
              class="filter-form device-filter-form"
            >
              <el-form-item label="设备名称" prop="deviceName">
                <el-input
                  v-model="deviceQueryParams.deviceName"
                  placeholder="请输入设备名称"
                  clearable
                  @keyup.enter="handleDeviceQuery"
                />
              </el-form-item>
              <el-form-item label="设备编号" prop="deviceSn">
                <el-input
                  v-model="deviceQueryParams.deviceSn"
                  placeholder="请输入唯一SN"
                  clearable
                  @keyup.enter="handleDeviceQuery"
                />
              </el-form-item>
              <el-form-item label="产品类别" prop="productId">
                <el-select v-model="deviceQueryParams.productId" placeholder="请选择产品类别" clearable>
                  <el-option
                    v-for="item in productList"
                    :key="item.productId"
                    :label="item.productName"
                    :value="item.productId"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="产品类型" prop="productType">
                <el-select v-model="deviceQueryParams.productType" placeholder="请选择产品类型" clearable>
                  <el-option
                    v-for="item in productTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="状态" prop="status">
                <el-select v-model="deviceQueryParams.status" placeholder="请选择状态" clearable>
                  <el-option label="在线" value="1" />
                  <el-option label="离线" value="0" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" icon="Search" @click="handleDeviceQuery">搜索</el-button>
                <el-button icon="Refresh" @click="resetDeviceQuery">重置</el-button>
              </el-form-item>
            </el-form>

            <el-row :gutter="10" class="mb8 action-row device-action-row">
              <el-col :span="1.5">
                <el-button
                  type="primary"
                  plain
                  icon="Plus"
                  @click="handleDeviceAdd"
                  v-hasPermi="['iot:device:add']"
                >
                  新增设备
                </el-button>
              </el-col>
              <el-col :span="1.5">
                <el-button
                  type="success"
                  plain
                  icon="DataLine"
                  @click="handleViewLocationReport"
                >
                  位置设备报表
                </el-button>
              </el-col>
              
              <right-toolbar v-model:showSearch="showSearch" @queryTable="getDeviceList"></right-toolbar>
            </el-row>

            <div class="device-grid-wrapper" v-loading="deviceLoading">
              <el-row :gutter="14">
                <el-col
                  v-for="item in deviceList"
                  :key="item.deviceId"
                  :xs="24"
                  :sm="12"
                  :md="8"
                  :lg="8"
                  :xl="6"
                >
                  <el-card shadow="hover" class="device-card">
                    <div class="device-card-top">
                      <el-checkbox
                        :model-value="selectedDevices.some(d => d.deviceId === item.deviceId)"
                        @change="(v)=>toggleSelectDevice(item, v)"
                      />
                      <div class="device-title">
                        <span class="device-name" :title="item.deviceName">{{ item.deviceName }}</span>
                        <el-tag :type="item.status=='1'?'success':'danger'" size="small" class="ml-2">
                          {{ item.status=='1'?'在线':'离线' }}
                        </el-tag>
                      </div>
                    </div>

                    <div class="device-meta">
                      <div class="meta-row">
                        <span class="meta-label">SN</span>
                        <el-tag
                          type="info"
                          effect="plain"
                          class="meta-value cursor-pointer"
                          title="点击复制"
                          @click="handleCopy(item.deviceSn)"
                        >
                          {{ item.deviceSn }}
                        </el-tag>
                      </div>

                      <div class="meta-row">
                        <span class="meta-label">产品</span>
                        <el-tag v-if="item.productId" effect="plain" type="success" class="meta-value">
                          {{ formatProductName(item.productId) }}
                        </el-tag>
                        <span v-else class="meta-muted">未绑定</span>
                      </div>

                      <div class="meta-row">
                        <span class="meta-label">产品类型</span>
                        <el-tag effect="plain" :type="String(getDeviceProductType(item)) === '1' ? 'warning' : 'success'" class="meta-value">
                          {{ formatProductType(getDeviceProductType(item)) }}
                        </el-tag>
                      </div>

                      <div class="meta-row">
                        <span class="meta-label">协议</span>
                        <el-tag effect="plain" class="meta-value">{{ item.protocolType }}</el-tag>
                      </div>

                      <div class="meta-row">
                        <span class="meta-label">最后上线</span>
                        <span class="meta-muted">{{ parseTime(item.lastOnlineTime) || '-' }}</span>
                      </div>

                      <div class="meta-row meta-remark" v-if="item.remark">
                        <span class="meta-label">备注</span>
                        <span class="meta-remark-text" :title="item.remark">{{ item.remark }}</span>
                      </div>
                    </div>

                    <div class="device-card-actions">
                      <el-button
                        link
                        type="primary"
                        icon="Edit"
                        @click="handleDeviceUpdate(item)"
                        v-hasPermi="['iot:device:edit']"
                      >修改</el-button>

                      <el-button
                        v-if="item.productId != 4 && item.productId != '4'"
                        link
                        type="warning"
                        icon="Promotion"
                        @click="handleSimulate(item)"
                        v-hasPermi="['iot:device:simulate']"
                      >模拟</el-button>
                      <el-button
                        v-if="item.productId != 4 && item.productId != '4'"
                        link
                        type="info"
                        icon="Document"
                        @click="handleViewLogs(item)"
                        v-hasPermi="['iot:log:list']"
                      >日志</el-button>
                      <el-button
                        v-if="item.productId != 4 && item.productId != '4'"
                        link
                        type="success"
                        icon="DataLine"
                        @click="handleViewReport(item)"
                      >报表</el-button>

                      <el-button
                        v-if="isControlDevice(item)"
                        link
                        type="success"
                        icon="Operation"
                        @click="handleController(item)"
                      >控制器</el-button>

                      <el-button
                        v-if="item.productId == 4 || item.productId == '4'"
                        link
                        type="warning"
                        icon="Timer"
                        @click="handleOpenSchedule(item)"
                      >定时任务</el-button>
                      <el-button
                        v-if="item.productId == 4 || item.productId == '4'"
                        link
                        type="info"
                        icon="Picture"
                        @click="handleViewGallery(item)"
                      >相册</el-button>

                      <el-button
                        link
                        type="danger"
                        icon="Delete"
                        @click="handleDeviceDelete(item)"
                        v-hasPermi="['iot:device:remove']"
                      >删除</el-button>
                    </div>
                  </el-card>
                </el-col>
              </el-row>

              <div v-if="deviceList.length === 0" class="empty-state" style="margin-top: 10px;">
                <el-icon class="empty-ic"><InfoFilled /></el-icon>
                <div class="empty-title">该位置暂无设备</div>
                <div class="empty-sub">点击上方“新增设备”开始添加</div>
              </div>
            </div>

            <pagination
              v-show="deviceTotal > 0"
              :total="deviceTotal"
              v-model:page="deviceQueryParams.pageNum"
              v-model:limit="deviceQueryParams.pageSize"
              @pagination="getDeviceList"
            />
          </div>

          <div v-else class="crud-view-wrapper">
            <div class="panel-top">
              <div class="panel-left">
                <div class="panel-title">
                  <span v-if="!currentNode">所有园区列表</span>
                  <span v-else>{{ currentNode.label }} - 子级管理</span>
                  <el-tag v-if="currentNode" :type="getTypeTag(currentNode.type)" class="ml-2">
                    {{ getTypeName(currentNode.type) }}
                  </el-tag>
                </div>

                <div class="panel-path">
                  <el-tag effect="plain" type="info" class="path-chip">
                    <el-icon class="mr-1"><OfficeBuilding /></el-icon> 园区
                  </el-tag>
                  <span class="path-sep">/</span>
                  <el-tag effect="plain" type="success" class="path-chip">
                    <el-icon class="mr-1"><Grid /></el-icon> 区域
                  </el-tag>
                  <span class="path-sep">/</span>
                  <el-tag effect="plain" type="warning" class="path-chip">
                    <el-icon class="mr-1"><MapLocation /></el-icon> 位置
                  </el-tag>

                  <span class="path-tip" v-if="currentNode">
                    当前：<b>{{ currentNode.label }}</b>
                  </span>
                  <span class="path-tip" v-else>
                    当前：<b>全部园区</b>
                  </span>
                </div>
              </div>

              <div class="panel-actions">
                <el-button
                  v-if="!currentNode || currentNode.type !== 'location'"
                  type="primary"
                  icon="Plus"
                  @click="handleAddChild"
                  class="btn-primary-soft"
                >
                  新增{{ getChildTypeName() }}
                </el-button>

                <el-button-group v-if="currentNode" class="ml-2">
                  <el-button type="primary" icon="Edit" @click="handleEditNode(currentNode)">编辑当前</el-button>
                  <el-button type="danger" icon="Delete" @click="handleDeleteNode(currentNode)">删除当前</el-button>
                </el-button-group>

                <el-button
                  v-if="currentNode && (currentNode.type === 'park' || currentNode.type === 'area')"
                  type="success"
                  icon="DataLine"
                  @click="handleViewLocationReport"
                  class="ml-2"
                >
                  {{ currentNode.type === 'park' ? '园区设备报表' : '区域设备报表' }}
                </el-button>
              </div>
            </div>

            <div class="pretty-table">
              <el-table
                v-loading="loading"
                :data="tableData"
                class="pretty-el-table"
                stripe
                style="width: 100%; margin-top: 14px;"
              >
                <el-table-column label="名称" prop="name" min-width="180">
                  <template #default="scope">
                    <div class="name-cell">
                      <el-icon v-if="scope.row.type === 'park'" class="cell-ic park"><OfficeBuilding /></el-icon>
                      <el-icon v-else-if="scope.row.type === 'area'" class="cell-ic area"><Grid /></el-icon>
                      <el-icon v-else class="cell-ic loc"><MapLocation /></el-icon>
                      <span class="name-text">{{ scope.row.name }}</span>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column label="说明" prop="code" align="center" width="180">
                  <template #default="scope">
                    <el-tag
                      effect="plain"
                      type="info"
                      class="code-tag cursor-pointer"
                      title="点击复制"
                      @click="handleCopy(scope.row.code)"
                    >
                      {{ scope.row.code }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="类型" align="center" width="110">
                  <template #default="scope">
                    <el-tag :type="getTypeTag(scope.row.type)" effect="plain">
                      {{ getTypeName(scope.row.type) }}
                    </el-tag>
                  </template>
                </el-table-column>

                <el-table-column label="创建时间" prop="createTime" width="170" align="center">
                  <template #default="scope"><span class="time-muted">{{ parseTime(scope.row.createTime) }}</span></template>
                </el-table-column>

                <el-table-column label="操作" align="center" width="190" class-name="small-padding fixed-width">
                  <template #default="scope">
                    <el-button link type="primary" icon="Edit" @click="handleEditRow(scope.row)">修改</el-button>
                    <el-button link type="danger" icon="Delete" @click="handleDeleteRow(scope.row)">删除</el-button>
                  </template>
                </el-table-column>

                <template #empty>
                  <div class="empty-state">
                    <el-icon class="empty-ic"><InfoFilled /></el-icon>
                    <div class="empty-title">暂无数据</div>
                    <div class="empty-sub">可以点击右上角“新增{{ getChildTypeName() }}”快速创建</div>
                  </div>
                </template>
              </el-table>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog :title="dialog.title" v-model="dialog.visible" width="500px" append-to-body :class="isStandalone ? 'cyber-dialog' : 'agri-dialog'">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" maxlength="64" />
        </el-form-item>
        <el-form-item label="说明" prop="code">
          <el-input v-model="form.code" placeholder="请输入唯一说明" maxlength="32" />
        </el-form-item>
        <!-- 园区专属选填项 -->
        <template v-if="dialog.type === 'park'">
          <el-form-item label="行政区" prop="region">
            <el-input v-model="form.region" placeholder="请输入行政区（选填，如：山东省滨州市）" maxlength="64" />
          </el-form-item>
          <el-form-item label="位置代码" prop="regionCode">
            <el-input v-model="form.regionCode" placeholder="请输入位置代码（选填，如天气Location ID）" maxlength="32" />
          </el-form-item>
          <el-form-item label="经纬度" prop="coordinate">
            <el-input v-model="form.coordinate" placeholder="请输入经纬度（选填，格式：经度,纬度）" maxlength="64" />
          </el-form-item>
        </template>
        <!-- 区域与位置专属选填项 -->
        <template v-else-if="dialog.type === 'area' || dialog.type === 'location'">
          <el-form-item label="经纬度" prop="coordinate">
            <el-input v-model="form.coordinate" placeholder="请输入经纬度（选填，格式：经度,纬度）" maxlength="64" />
          </el-form-item>
        </template>
        <el-form-item label="上级园区" v-if="dialog.type === 'area'">
          <el-input :model-value="getParentName()" disabled />
        </el-form-item>
        <el-form-item label="上级区域" v-if="dialog.type === 'location'">
          <el-input :model-value="getParentName()" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog :title="deviceTitle" v-model="deviceOpen" width="500px" append-to-body :class="isStandalone ? 'cyber-dialog' : 'agri-dialog'">
      <el-form ref="deviceFormRef" :model="deviceForm" :rules="deviceRules" label-width="80px">
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="deviceForm.deviceName" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备编号" prop="deviceSn">
          <el-input v-model="deviceForm.deviceSn" placeholder="请输入唯一SN" />
        </el-form-item>
        <el-form-item label="产品类别" prop="productId">
          <el-select v-model="deviceForm.productId" placeholder="请选择产品类别" style="width: 100%">
            <el-option v-for="item in productList" :key="item.productId" :label="item.productName" :value="item.productId" />
          </el-select>
        </el-form-item>
        <el-form-item label="协议类型" prop="protocolType">
          <el-select v-model="deviceForm.protocolType" placeholder="请选择" style="width: 100%">
            <el-option label="MQTT" value="MQTT" />
            <el-option label="HTTP" value="HTTP" />
            <el-option label="MODBUS-TCP" value="MODBUS-TCP" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="deviceForm.remark" type="textarea" placeholder="请输入内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitDeviceForm">确 定</el-button>
          <el-button @click="deviceOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="模拟设备数据上报" v-model="openSimulate" width="700px" append-to-body :class="isStandalone ? 'cyber-dialog' : 'agri-dialog'">
      <el-alert title="系统已根据该设备所属产品的【物模型】自动生成了测试数据模板。" type="success" :closable="false" show-icon class="mb-4" />
      <el-form :model="simulateForm" label-width="80px">
        <el-form-item label="目标设备">
          <el-input v-model="simulateForm.deviceSn" disabled />
        </el-form-item>
        <el-form-item label="JSON报文">
          <el-input v-model="simulateForm.payload" type="textarea" :rows="8" placeholder="请输入JSON格式数据" />
        </el-form-item>
      </el-form>

      <div v-if="currentModels.length > 0" class="model-tips">
        <div class="tips-title"><el-icon class="mr-1"><InfoFilled /></el-icon> 属性对照表 (参考修改上方JSON数值)</div>
        <div class="table-scroll-wrapper">
          <el-table :data="currentModels" size="small" border style="width: 100%">
            <el-table-column prop="identifier" label="标识符 (Key)" width="150">
              <template #default="scope"><span style="color: #409EFF; font-weight: bold;">{{ scope.row.identifier }}</span></template>
            </el-table-column>
            <el-table-column prop="modelName" label="属性名称 (中文)" />
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
          <el-button @click="openSimulate = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer v-model="openLogDrawer" :title="'通信日志 - ' + logDrawerSn" direction="rtl" size="50%">
      <div class="p-4">
        <div v-if="currentModels.length > 0" class="log-model-tips mb-4">
          <el-collapse>
            <el-collapse-item title="点击查看属性对照表 (Key-Value说明)" name="1">
              <div class="table-scroll-wrapper" style="max-height: 200px;">
                <el-table :data="currentModels" size="small" border style="width: 100%">
                  <el-table-column prop="identifier" label="标识符 (Key)" width="140">
                    <template #default="scope"><span style="color: #409EFF; font-weight: bold;">{{ scope.row.identifier }}</span></template>
                  </el-table-column>
                  <el-table-column prop="modelName" label="属性名称" />
                  <el-table-column prop="type" label="类型" width="80" />
                  <el-table-column prop="specs" label="定义" show-overflow-tooltip />
                </el-table>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div style="text-align: right; margin-bottom: 10px;">
          <el-button icon="Refresh" circle @click="refreshLogs" title="刷新日志" />
        </div>

        <el-table :data="logList" border stripe v-loading="logLoading" height="500px">
          <el-table-column label="时间" prop="createTime" width="160" align="center" />
          <el-table-column label="类型" prop="logType" width="80" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.logType==1" size="small">属性</el-tag>
              <el-tag v-else type="warning" size="small">事件</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Payload" prop="payload" show-overflow-tooltip>
            <template #default="scope">
              <span style="font-family: monospace;">{{ formatPayload(scope.row.payload) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <el-dialog
      :title="'设备数据报表 - ' + reportDeviceName"
      v-model="openReport"
      width="800px"
      append-to-body
      :class="isStandalone ? 'cyber-dialog' : 'agri-dialog'"
      @closed="handleReportClose"
    >
      <div class="report-container" v-loading="reportLoading">
        <div class="report-header mb-4" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="mr-2 font-bold">查看属性:</span>
            <el-radio-group v-model="currentReportKey" size="small" @change="renderCharts">
              <el-radio-button v-for="item in numericModels" :key="item.identifier" :value="item.identifier">
                {{ item.modelName }}
              </el-radio-button>
            </el-radio-group>
            <div v-if="numericModels.length === 0" class="text-gray-400 text-sm ml-2" style="display:inline-block">
              (暂无可监控的数值属性，请检查物模型配置)
            </div>
          </div>
          <div>
            <el-date-picker
              v-model="reportDateRange"
              value-format="YYYY-MM-DD HH:mm:ss"
              type="datetimerange"
              range-separator="-"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              size="small"
              style="width: 320px;"
              @change="renderCharts"
            ></el-date-picker>
          </div>
        </div>
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="chart-wrapper">
              <div class="chart-title">实时监测</div>
              <div ref="gaugeRef" style="height: 250px; width: 100%;"></div>
              <div class="text-center value-display">
                {{ latestValue }} <span class="unit-display">{{ currentUnit }}</span>
              </div>
              <div class="stats-grid" style="display: flex; justify-content: space-around; margin-top: 15px; border-top: 1px solid #ebeef5; padding-top: 12px; font-size: 12px;">
                <div class="stat-item" style="text-align: center;">
                  <div style="color: #f56c6c; font-weight: bold; margin-bottom: 2px;">最高值</div>
                  <div style="font-family: monospace; font-weight: bold;">{{ maxVal }} {{ currentUnit }}</div>
                </div>
                <div class="stat-item" style="text-align: center; border-left: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; padding: 0 10px;">
                  <div style="color: #409eff; font-weight: bold; margin-bottom: 2px;">平均值</div>
                  <div style="font-family: monospace; font-weight: bold;">{{ avgVal }} {{ currentUnit }}</div>
                </div>
                <div class="stat-item" style="text-align: center;">
                  <div style="color: #e6a23c; font-weight: bold; margin-bottom: 2px;">最低值</div>
                  <div style="font-family: monospace; font-weight: bold;">{{ minVal }} {{ currentUnit }}</div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="16">
            <div class="chart-wrapper">
              <div class="chart-title">历史趋势 (近100条)</div>
              <div ref="lineRef" style="height: 280px; width: 100%;"></div>
            </div>
            </el-col>
          </el-row>
        </div>
      </el-dialog>

      <el-drawer
        v-model="openLocationReportDrawer"
        :title="(currentNode && currentNode.type === 'park' ? '园区' : currentNode && currentNode.type === 'area' ? '区域' : '位置') + '设备数据报表 - ' + (currentNode ? currentNode.label : '')"
        direction="rtl"
        size="50%"
        @opened="handleLocationReportOpened"
        @closed="handleLocationReportClosed"
        destroy-on-close
      >
        <div v-loading="locationReportLoading" class="location-report-drawer-content" style="padding: 15px;">
          <div v-if="Object.keys(locationReportData).length > 0" style="margin-bottom: 15px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 13px; color: #64748b; font-weight: bold;">全局时间筛选:</span>
            <el-date-picker
              v-model="drawerDateRange"
              value-format="YYYY-MM-DD HH:mm:ss"
              type="datetimerange"
              range-separator="-"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              size="small"
              style="width: 320px;"
              @change="handleDrawerDateRangeChange"
            ></el-date-picker>
          </div>
          
          <div v-if="Object.keys(locationReportData).length === 0" class="text-center py-10" style="text-align: center; padding: 40px 0;">
            <el-empty description="当前暂无可监测的数值属性设备" />
          </div>
          <div v-else class="device-report-list">
            <el-card 
              v-for="(devData, sn) in locationReportData" 
              :key="sn" 
              class="mb-4 device-report-card" 
              shadow="hover"
              style="border-radius: 8px; margin-bottom: 15px;"
            >
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 15px; font-weight: bold; color: #303133;">
                    {{ devData.deviceName }}
                    <span style="font-size: 12px; color: #909399; font-weight: normal; margin-left: 8px;">(SN: {{ sn }})</span>
                  </span>
                  <el-tag :type="devData.status == '1' ? 'success' : 'danger'" size="small">
                    {{ devData.status == '1' ? '在线' : '离线' }}
                  </el-tag>
                </div>
              </template>
              
              <div v-loading="devData.loading">
                <div v-if="devData.numericModels.length === 0" class="text-center py-4 text-gray-400 text-sm" style="text-align: center; padding: 20px 0; color: #909399; font-size: 14px;">
                  (无监控数值属性，请检查物模型配置)
                </div>
                <div v-else>
                  <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 13px; color: #606266; font-weight: bold;">查看属性:</span>
                    <el-radio-group v-model="devData.currentKey" size="small" @change="(val) => handleDevicePropertyChange(sn, val)">
                      <el-radio-button v-for="item in devData.numericModels" :key="item.identifier" :value="item.identifier">
                        {{ item.modelName }}
                      </el-radio-button>
                    </el-radio-group>
                  </div>
                  
                  <el-row :gutter="15" align="middle" style="display: flex; align-items: center;">
                    <el-col :span="18">
                      <div :ref="el => setChartRef(el, sn)" style="height: 180px; width: 100%;"></div>
                    </el-col>
                    <el-col :span="6" style="text-align: center;">
                      <div style="border-left: 1px solid #ebeef5; padding-left: 10px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div>
                          <div style="font-size: 11px; color: #909399; margin-bottom: 2px;">最新数值</div>
                          <div style="font-size: 20px; font-weight: bold; color: #409EFF; font-family: monospace; line-height: 1;">
                            {{ devData.latestValue }}
                          </div>
                          <div style="font-size: 11px; color: #606266; margin-top: 1px;">{{ devData.currentUnit }}</div>
                        </div>
                        
                        <div style="border-top: 1px solid #f1f5f9; width: 100%; padding-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
                          <div style="display: flex; justify-content: space-between; width: 100%; color: #64748b; gap: 8px;">
                            <span>均值:</span>
                            <span style="font-family: monospace; font-weight: bold; color: #334155;">{{ devData.avgVal }}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; width: 100%; color: #64748b; gap: 8px;">
                            <span>最高:</span>
                            <span style="font-family: monospace; font-weight: bold; color: #f56c6c;">{{ devData.maxVal }}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; width: 100%; color: #64748b; gap: 8px;">
                            <span>最低:</span>
                            <span style="font-family: monospace; font-weight: bold; color: #e6a23c;">{{ devData.minVal }}</span>
                          </div>
                        </div>
                      </div>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </el-card>
          </div>
        </div>
      </el-drawer>

    <el-dialog title="新建定时抓拍任务" v-model="scheduleOpen" width="550px" append-to-body :class="isStandalone ? 'cyber-dialog' : 'agri-dialog'">
      <el-form ref="scheduleRef" :model="scheduleForm" :rules="scheduleRules" label-width="100px">
        <el-form-item label="当前设备"><el-input v-model="currentDeviceName" disabled /></el-form-item>
        
        <el-form-item label="预置点" prop="presetId" required>
           <el-select 
             v-model="scheduleForm.presetId" 
             placeholder="请选择预置点 (必选)" 
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
           <el-date-picker v-model="scheduleForm.executeTime" type="datetime" placeholder="选择执行日期和时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%"/>
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
              <el-time-picker v-model="cronConfig.time" placeholder="请选择具体时间点" format="HH:mm:ss" value-format="HH:mm:ss" style="width: 100%" />
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

    <el-drawer v-model="galleryOpen" :title="`抓拍记录 - ${currentDeviceName}`" size="600px" destroy-on-close :class="isStandalone ? 'cyber-drawer' : 'agri-drawer'">
      <div class="gallery-container" v-loading="galleryLoading">
        <el-empty v-if="galleryList.length === 0" description="暂无抓拍记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="(img, index) in galleryList"
            :key="index"
            :timestamp="parseTime(img.captureTime)"
            placement="top"
            :color="img.taskId ? '#42b983' : '#e6a23c'" 
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

    <ControllerDrawer v-model="controllerDrawerOpen" :device="controllerDevice" />

    <el-image-viewer v-if="showViewer" :url-list="previewList" :initial-index="initialIndex" @close="closeImageViewer" />
  </div>
</template>

<script setup name="IotManager">
import { listPark, addPark, updatePark, delPark } from "@/api/binZhou/ld/iot/park"
import { listAreaByParkId, addArea, updateArea, delArea } from "@/api/binZhou/ld/iot/area"
import { listLocationByAreaId, addLocation, updateLocation, delLocation } from "@/api/binZhou/ld/iot/location"
import { listDevice, getDevice, delDevice, addDevice, updateDevice, simulateReport, listDeviceLog } from "@/api/binZhou/ld/iot/device"
import { listProduct } from "@/api/binZhou/ld/iot/product"
import { listModel } from "@/api/binZhou/ld/iot/model"
import { getUserProfile } from "@/api/system/user"
import * as echarts from "echarts"
import { ElMessageBox, ElImageViewer } from "element-plus"
import { getCurrentInstance, ref, reactive, onMounted, toRefs, nextTick, computed } from "vue"
import ControllerDrawer from "./ControllerDrawer.vue"

import { listCameraPreset } from "@/api/binZhou/ld/iot/cameraPreset" 
import { addCameraTask } from "@/api/binZhou/ld/iot/cameraTask"
import { listRecord } from "@/api/binZhou/ld/iot/record" 

import { useRoute, useRouter } from "vue-router"

import {
  List, Plus, Refresh, OfficeBuilding, Grid, MapLocation,
  Search, Edit, Delete, Promotion, Document, DataLine, InfoFilled, Loading,
  Timer, Picture, ZoomIn, User, Warning, HomeFilled
} from "@element-plus/icons-vue"

const { proxy } = getCurrentInstance()
const route = useRoute()
const router = useRouter()

const isStandalone = computed(() => {
  return route.path === '/ld/iot/hierarchy'
})

const goHome = () => {
  router.push('/home')
}

const isReady = ref(false)
const isAdmin = ref(false)
const currentUserId = ref(null)

const loading = ref(false)
const treeRef = ref(null)
const currentNode = ref(null)
const tableData = ref([])
const defaultProps = { label: "label", children: "children", isLeaf: "leaf" }

const dialog = reactive({ visible: false, title: "", type: "", isEdit: false })
const submitLoading = ref(false)
const formRef = ref()
const form = reactive({
  id: undefined,
  name: "",
  code: "",
  parentId: undefined,
  coordinate: "",
  region: "",
  regionCode: ""
})
const rules = {
  name: [{ required: true, message: "名称不能为空", trigger: "blur" }],
  code: [{ required: true, message: "说明不能为空", trigger: "blur" }]
}

const deviceList = ref([])
const productList = ref([])
const productTypeOptions = [
  { label: "采集终端", value: 0 },
  { label: "控制终端", value: 1 }
]
const deviceTotal = ref(0)
const deviceLoading = ref(false)
const showSearch = ref(true)
const deviceIds = ref([])
const single = ref(true)
const multiple = ref(true)
const deviceTitle = ref("")
const deviceOpen = ref(false)
const deviceFormRef = ref(null)
const controllerDrawerOpen = ref(false)
const controllerDevice = ref(null)

const deviceData = reactive({
  deviceForm: {},
  deviceRules: {
    deviceName: [{ required: true, message: "设备名称不能为空", trigger: "blur" }],
    deviceSn: [{ required: true, message: "设备编号不能为空", trigger: "blur" }],
    protocolType: [{ required: true, message: "协议类型不能为空", trigger: "change" }],
    productId: [{ required: true, message: "产品类别不能为空", trigger: "change" }]
  },
  deviceQueryParams: {
    pageNum: 1,
    pageSize: 10,
    deviceName: undefined,
    deviceSn: undefined,
    productId: undefined,
    productType: undefined,
    status: undefined,
    locationId: undefined
  }
})
const { deviceForm, deviceRules, deviceQueryParams } = toRefs(deviceData)

const selectedDevices = ref([])
function toggleSelectDevice(row, checked) {
  const exists = selectedDevices.value.some(d => d.deviceId === row.deviceId)
  if (checked && !exists) selectedDevices.value.push(row)
  if (!checked && exists) selectedDevices.value = selectedDevices.value.filter(d => d.deviceId !== row.deviceId)
  handleDeviceSelectionChange(selectedDevices.value)
}

const logList = ref([])
const currentModels = ref([])
const openSimulate = ref(false)
const simulateLoading = ref(false)
const simulateForm = ref({ deviceSn: "", payload: "" })

const openLogDrawer = ref(false)
const logLoading = ref(false)
const logDrawerSn = ref("")

const openReport = ref(false)
const reportLoading = ref(false)
const reportDeviceName = ref("")
const reportDeviceSn = ref("")
const numericModels = ref([])
const currentReportKey = ref("")
const latestValue = ref("-")
const currentUnit = ref("")
const gaugeRef = ref(null)
const lineRef = ref(null)
let gaugeChart = null
let lineChart = null

const openLocationReportDrawer = ref(false)
const locationReportLoading = ref(false)
const locationReportData = ref({})

const chartRefs = {}
const chartInstances = {}

function setChartRef(el, sn) {
  if (el) {
    chartRefs[sn] = el
  }
}

const reportDateRange = ref([])
const drawerDateRange = ref([])
const maxVal = ref("-")
const minVal = ref("-")
const avgVal = ref("-")

const allDevices = ref([])

const scopeSummary = computed(() => {
  const node = currentNode.value

  let devices = allDevices.value || []
  if (node?.type === "park") {
    devices = devices.filter(item => String(item.parkId) === String(node.id))
  } else if (node?.type === "area") {
    devices = devices.filter(item => String(item.areaId) === String(node.id))
  } else if (node?.type === "location") {
    devices = devices.filter(item => String(item.locationId) === String(node.id))
  }

  const dataCount = node?.type === "location"
    ? Number(deviceTotal.value || deviceList.value.length || 0)
    : Number(tableData.value.length || 0)

  return {
    name: node?.label || "全部园区",
    type: node ? getTypeName(node.type) : "全局范围",
    dataLabel: node?.type === "location" ? "当前位置设备" : `当前${getChildTypeName() || "数据"}`,
    dataCount,
    deviceTotal: devices.length,
    onlineTotal: devices.filter(item => String(item.status) === "1").length
  }
})

function fetchAllDevices() {
  listDevice({ pageNum: 1, pageSize: 10000 }).then(res => {
    allDevices.value = res.rows || []
  }).catch(err => {
    console.error("加载所有设备失败", err)
  })
}

function getStats(data) {
  let parkId = null
  let areaId = null
  if (data.type === 'park') {
    parkId = data.id
  } else if (data.type === 'area') {
    areaId = data.id
  }
  
  let total = 0
  let online = 0
  if (parkId) {
    total = allDevices.value.filter(d => d.parkId === parkId).length
    online = allDevices.value.filter(d => d.parkId === parkId && d.status == '1').length
  } else if (areaId) {
    total = allDevices.value.filter(d => d.areaId === areaId).length
    online = allDevices.value.filter(d => d.areaId === areaId && d.status == '1').length
  }
  
  return { total, online }
}

const scheduleOpen = ref(false)
const currentDeviceName = ref("")
const currentDeviceRef = ref(null)
const presetOptions = ref([]) 
const cronConfig = reactive({
  type: 'DAILY', weekDays: [], intervalDays: 2, time: '08:00:00'
})
const scheduleForm = ref({
  deviceId: null, 
  jobType: 'ONCE', 
  executeTime: null, 
  cronExpression: null, 
  remark: '',
  presetId: null,
  count: 1 
})
const scheduleRules = {
  executeTime: [{ required: true, message: "请选择执行时间", trigger: "change" }],
  presetId: [{ required: true, message: "必须选择一个预置点", trigger: "change" }]
}
const scheduleRef = ref(null)

const galleryOpen = ref(false)
const galleryLoading = ref(false)
const galleryList = ref([])
const showViewer = ref(false)
const initialIndex = ref(0)
const previewList = computed(() => galleryList.value.map(img => img.url))


onMounted(() => {
  getProductList()
  initUserPermissions().then(() => {
    isReady.value = true
    loadTableData({ type: "root" })
    fetchAllDevices()
  })
})

async function initUserPermissions() {
  try {
    const res = await getUserProfile()
    const user = res.data
    isAdmin.value = user.admin || (user.roles && user.roles.some(r => r.roleKey === "admin"))
    currentUserId.value = user.userId
  } catch (e) {
    console.error("获取用户信息失败", e)
  }
}

const loadNode = (node, resolve) => {
  if (node.level === 0) { loadParks(resolve); return }
  if (node.data.type === "park") { loadAreas(node.data.id, resolve); return }
  if (node.data.type === "area") { loadLocations(node.data.id, resolve); return }
  resolve([])
}

async function loadParks(resolve) {
  try {
    const params = {}
    if (!isAdmin.value && currentUserId.value) params.userId = currentUserId.value
    const res = await listPark(params)
    resolve(
      res.data.map(item => ({
        uniqueId: "park_" + item.parkId,
        id: item.parkId,
        label: item.parkName,
        code: item.parkCode,
        coordinate: item.coordinate,
        region: item.region,
        regionCode: item.regionCode,
        type: "park",
        createTime: item.createTime,
        leaf: false
      }))
    )
  } catch (e) {
    resolve([])
  }
}
async function loadAreas(parkId, resolve) {
  try {
    const res = await listAreaByParkId(parkId)
    resolve(
      res.data.map(item => ({
        uniqueId: "area_" + item.areaId,
        id: item.areaId,
        label: item.areaName,
        code: item.areaCode,
        coordinate: item.coordinate,
        parkId: item.parkId,
        type: "area",
        createTime: item.createTime,
        leaf: false
      }))
    )
  } catch (e) {
    resolve([])
  }
}
async function loadLocations(areaId, resolve) {
  try {
    const res = await listLocationByAreaId(areaId)
    resolve(
      res.data.map(item => ({
        uniqueId: "loc_" + item.locationId,
        id: item.locationId,
        label: item.locationName,
        code: item.locationCode,
        coordinate: item.coordinate,
        areaId: item.areaId,
        type: "location",
        createTime: item.createTime,
        leaf: true
      }))
    )
  } catch (e) {
    resolve([])
  }
}

function handleNodeClick(data) {
  currentNode.value = data
  if (data.type === "location") {
    deviceQueryParams.value.locationId = data.id
    deviceQueryParams.value.pageNum = 1
    getDeviceList()
  } else {
    loadTableData(data)
  }
}
function handleResetToRoot() {
  currentNode.value = null
  if (treeRef.value) treeRef.value.setCurrentKey(null)
  loadTableData({ type: "root" })
}
function refreshTree() {
  handleResetToRoot()
  fetchAllDevices()
  const root = treeRef.value.getNode(treeRef.value.root)
  root.loaded = false
  root.expand()
}

async function loadTableData(nodeData) {
  loading.value = true
  tableData.value = []
  try {
    let res, formattedData = []
    if (nodeData.type === "root") {
      const params = {}
      if (!isAdmin.value && currentUserId.value) params.userId = currentUserId.value
      res = await listPark(params)
      formattedData = res.data.map(item => ({
        id: item.parkId, name: item.parkName, code: item.parkCode, coordinate: item.coordinate, region: item.region, regionCode: item.regionCode, createTime: item.createTime, type: "park"
      }))
    } else if (nodeData.type === "park") {
      res = await listAreaByParkId(nodeData.id)
      formattedData = res.data.map(item => ({
        id: item.areaId, name: item.areaName, code: item.areaCode, coordinate: item.coordinate, createTime: item.createTime, parkId: item.parkId, type: "area"
      }))
    } else if (nodeData.type === "area") {
      res = await listLocationByAreaId(nodeData.id)
      formattedData = res.data.map(item => ({
        id: item.locationId, name: item.locationName, code: item.locationCode, coordinate: item.coordinate, createTime: item.createTime, areaId: item.areaId, type: "location"
      }))
    }
    tableData.value = formattedData
  } catch (err) {
    proxy.$modal.msgError("获取数据失败")
  } finally {
    loading.value = false
  }
}

function handleAddPark() {
  handleResetToRoot()
  resetForm()
  dialog.visible = true
  dialog.isEdit = false
  dialog.type = "park"
  dialog.title = "新增园区"
}

function handleAddChild() {
  resetForm()
  dialog.visible = true
  dialog.isEdit = false
  if (!currentNode.value) {
    dialog.type = "park"
    dialog.title = "新增园区"
  } else if (currentNode.value.type === "park") {
    dialog.type = "area"
    dialog.title = "新增区域"
    form.parentId = currentNode.value.id
  } else if (currentNode.value.type === "area") {
    dialog.type = "location"
    dialog.title = "新增位置"
    form.parentId = currentNode.value.id
  }
}

function submitForm() {
  proxy.$refs.formRef.validate(async valid => {
    if (!valid) return
    submitLoading.value = true
    try {
      const data = {}
      if (dialog.type === "park") {
        data.parkName = form.name
        data.parkCode = form.code
        data.coordinate = form.coordinate
        data.region = form.region
        data.regionCode = form.regionCode
        if (dialog.isEdit) { data.parkId = form.id; await updatePark(data) }
        else await addPark(data)
      } else if (dialog.type === "area") {
        data.areaName = form.name
        data.areaCode = form.code
        data.coordinate = form.coordinate
        data.parkId = form.parentId
        if (dialog.isEdit) { data.areaId = form.id; await updateArea(data) }
        else await addArea(data)
      } else if (dialog.type === "location") {
        data.locationName = form.name
        data.locationCode = form.code
        data.coordinate = form.coordinate
        data.areaId = form.parentId
        if (dialog.isEdit) { data.locationId = form.id; await updateLocation(data) }
        else await addLocation(data)
      }
      proxy.$modal.msgSuccess(dialog.isEdit ? "修改成功" : "新增成功")
      dialog.visible = false
      refreshData()
    } catch (e) {
    } finally {
      submitLoading.value = false
    }
  })
}

function handleEditRow(row) {
  resetForm()
  dialog.visible = true
  dialog.isEdit = true
  dialog.type = row.type
  dialog.title = `修改${getTypeName(row.type)}`
  form.id = row.id
  form.name = row.name
  form.code = row.code
  form.coordinate = row.coordinate || ""
  form.region = row.region || ""
  form.regionCode = row.regionCode || ""
  if (row.type === "area") form.parentId = row.parkId
  if (row.type === "location") form.parentId = row.areaId
}

function handleEditNode(nodeData) {
  resetForm()
  dialog.visible = true
  dialog.isEdit = true
  dialog.type = nodeData.type
  dialog.title = `修改${getTypeName(nodeData.type)}`
  form.id = nodeData.id
  form.name = nodeData.label
  form.code = nodeData.code
  form.coordinate = nodeData.coordinate || ""
  form.region = nodeData.region || ""
  form.regionCode = nodeData.regionCode || ""
  if (nodeData.type === "area") form.parentId = nodeData.parkId
  if (nodeData.type === "location") form.parentId = nodeData.areaId
}

function handleDeleteRow(row) {
  ElMessageBox.confirm(`确认删除?`, "警告", { type: "warning" }).then(async () => {
    if (row.type === "park") await delPark(row.id)
    else if (row.type === "area") await delArea(row.id)
    else if (row.type === "location") await delLocation(row.id)
    proxy.$modal.msgSuccess("删除成功")
    refreshData()
  })
}

function handleDeleteNode(nodeData) {
  ElMessageBox.confirm(`确认删除及下级?`, "警告", { type: "warning" }).then(async () => {
    if (nodeData.type === "park") await delPark(nodeData.id)
    else if (nodeData.type === "area") await delArea(nodeData.id)
    else if (nodeData.type === "location") await delLocation(nodeData.id)
    proxy.$modal.msgSuccess("删除成功")
    refreshTree()
  })
}

function resetForm() {
  form.id = undefined
  form.name = ""
  form.code = ""
  form.parentId = undefined
  form.coordinate = ""
  form.region = ""
  form.regionCode = ""
}
function cancel() {
  dialog.visible = false
  resetForm()
}

function refreshData() {
  if (dialog.type === "park" || !currentNode.value) {
    refreshTree()
  } else {
    loadTableData(currentNode.value)
    let treeKey = ""
    if (currentNode.value.type === "park") treeKey = "park_" + currentNode.value.id
    else if (currentNode.value.type === "area") treeKey = "area_" + currentNode.value.id
    else if (currentNode.value.type === "location") treeKey = "loc_" + currentNode.value.id
    const node = treeRef.value.getNode(treeKey)
    if (node) {
      if (dialog.isEdit && dialog.type === currentNode.value.type) {
        currentNode.value.label = form.name
        node.data.label = form.name
      } else {
        node.loaded = false
        node.expand()
      }
    }
  }
}

function getProductList() {
  listProduct({ pageNum: 1, pageSize: 100 }).then(res => { productList.value = res.rows || [] })
}
function formatProductName(id) {
  const found = productList.value.find(p => String(p.productId) === String(id))
  return found ? found.productName : id
}

function getProductById(id) {
  return productList.value.find(p => String(p.productId) === String(id))
}

function getDeviceProductType(device) {
  return device?.productType ?? getProductById(device?.productId)?.type
}

function isControlDevice(device) {
  return String(getDeviceProductType(device)) === '1'
}

function handleController(device) {
  if (!device?.deviceSn) {
    proxy.$modal.msgWarning('当前控制终端缺少SN，无法打开控制器')
    return
  }
  controllerDevice.value = device
  controllerDrawerOpen.value = true
}

function formatProductType(type) {
  const found = productTypeOptions.find(item => String(item.value) === String(type))
  return found ? found.label : "-"
}

function getDeviceList() {
  deviceLoading.value = true
  listDevice(deviceQueryParams.value).then(response => {
    deviceList.value = response.rows
    deviceTotal.value = response.total
    deviceLoading.value = false

    selectedDevices.value = []
    handleDeviceSelectionChange([])
  })
}

function handleDeviceQuery() {
  deviceQueryParams.value.pageNum = 1
  getDeviceList()
}
function resetDeviceQuery() {
  proxy.resetForm("deviceQueryRef")
  handleDeviceQuery()
}
function handleDeviceSelectionChange(selection) {
  deviceIds.value = selection.map(item => item.deviceId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}
function resetDeviceForm() {
  deviceForm.value = {
    deviceId: undefined,
    deviceName: undefined,
    deviceSn: undefined,
    productId: undefined,
    protocolType: "MQTT",
    status: "0",
    remark: undefined
  }
  proxy.resetForm("deviceFormRef")
}
function handleDeviceAdd() {
  resetDeviceForm()
  deviceOpen.value = true
  deviceTitle.value = "添加设备"
}
function handleDeviceUpdate(row) {
  resetDeviceForm()
  const deviceId = row?.deviceId || deviceIds.value
  getDevice(deviceId).then(response => {
    deviceForm.value = response.data
    deviceOpen.value = true
    deviceTitle.value = "修改设备"
  })
}
function submitDeviceForm() {
  proxy.$refs["deviceFormRef"].validate(valid => {
    if (!valid) return
    if (currentNode.value && currentNode.value.type === "location") {
      deviceForm.value.locationId = currentNode.value.id
    }
    if (deviceForm.value.deviceId != undefined) {
      updateDevice(deviceForm.value).then(() => {
        proxy.$modal.msgSuccess("修改成功")
        deviceOpen.value = false
        getDeviceList()
        fetchAllDevices()
      })
    } else {
      addDevice(deviceForm.value).then(() => {
        proxy.$modal.msgSuccess("新增成功")
        deviceOpen.value = false
        getDeviceList()
        fetchAllDevices()
      })
    }
  })
}
function handleDeviceDelete(row) {
  const ids = row?.deviceId || deviceIds.value
  proxy.$modal.confirm("确认删除?").then(() => delDevice(ids)).then(() => {
    getDeviceList()
    fetchAllDevices()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}
function handleCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    proxy.$modal.msgSuccess("复制成功")
  })
}

function handleSimulate(row) {
  simulateForm.value.deviceSn = row.deviceSn
  currentModels.value = []
  if (!row.productId) { simulateForm.value.payload = "{}"; openSimulate.value = true; return }
  const loadingInstance = proxy.$loading({ lock: true, text: "加载物模型...", background: "rgba(0, 0, 0, 0.7)" })
  listModel({ productId: row.productId, pageSize: 100 }).then(res => {
    const models = res.rows || []
    currentModels.value = models
    const template = {}
    models.forEach(model => { template[model.identifier] = generateMockValue(model) })
    simulateForm.value.payload = JSON.stringify(template, null, 4)
    loadingInstance.close()
    openSimulate.value = true
  }).catch(() => {
    loadingInstance.close()
    openSimulate.value = true
  })
}

function generateMockValue(model) {
  switch (model.type) {
    case "int": return Math.floor(Math.random() * 100)
    case "float": return parseFloat((Math.random() * 50).toFixed(2))
    case "bool": return 1
    default: return "data"
  }
}

function submitSimulate() {
  simulateLoading.value = true
  simulateReport(simulateForm.value.deviceSn, simulateForm.value.payload).then(() => {
    proxy.$modal.msgSuccess("指令发送成功")
    simulateLoading.value = false
    openSimulate.value = false
  }).catch(() => { simulateLoading.value = false })
}

function handleViewLogs(row) {
  logDrawerSn.value = row.deviceSn
  openLogDrawer.value = true
  if (row.productId) {
    listModel({ productId: row.productId, pageSize: 100 }).then(res => { currentModels.value = res.rows || [] })
  }
  refreshLogs()
}

function refreshLogs() {
  logLoading.value = true
  listDeviceLog({ deviceSn: logDrawerSn.value, pageSize: 20, orderByColumn: "createTime", isAsc: "desc" }).then(res => {
    logList.value = res.rows || []
    logLoading.value = false
  })
}

function formatPayload(payload) {
  if (typeof payload === "object") return JSON.stringify(payload)
  return payload
}

async function handleViewReport(row) {
  reportDeviceName.value = row.deviceName
  reportDeviceSn.value = row.deviceSn
  openReport.value = true
  reportLoading.value = true
  numericModels.value = []
  currentReportKey.value = ""
  latestValue.value = "-"
  if (row.productId) {
    const res = await listModel({ productId: row.productId, pageSize: 100 })
    numericModels.value = (res.rows || []).filter(m => ["int", "float"].includes(m.type) && m.isMonitor == 1)
    if (numericModels.value.length > 0) currentReportKey.value = numericModels.value[0].identifier
  }
  await renderCharts()
  reportLoading.value = false
}

async function renderCharts() {
  if (!currentReportKey.value) return
  const model = numericModels.value.find(m => m.identifier === currentReportKey.value)
  currentUnit.value = model?.specs ? JSON.parse(model.specs).unit || "" : ""
  const queryParams = { deviceSn: reportDeviceSn.value, pageSize: 100, orderByColumn: "createTime", isAsc: "asc" }
  const res = await listDeviceLog(proxy.addDateRange(queryParams, reportDateRange.value))
  const logs = res.rows || []
  const xData = [], yData = []
  logs.forEach(log => {
    try {
      const payload = (typeof log.payload === "string") ? JSON.parse(log.payload) : log.payload
      const val = payload[currentReportKey.value]
      if (val != null) { xData.push(log.createTime.substring(5, 16)); yData.push(val) }
    } catch (e) {}
  })
  latestValue.value = yData.length > 0 ? yData[yData.length - 1] : "-"
  
  const numY = yData.map(Number).filter(n => !isNaN(n))
  if (numY.length > 0) {
    maxVal.value = Math.max(...numY)
    minVal.value = Math.min(...numY)
    avgVal.value = (numY.reduce((a, b) => a + b, 0) / numY.length).toFixed(2)
  } else {
    maxVal.value = "-"
    minVal.value = "-"
    avgVal.value = "-"
  }
  
  await nextTick()
  initCharts(xData, yData)
}

function initCharts(xData, yData) {
  if (gaugeRef.value) {
    if (gaugeChart) gaugeChart.dispose()
    gaugeChart = echarts.init(gaugeRef.value)
    gaugeChart.setOption({
      series: [{
        type: "gauge",
        center: ["50%", "55%"],
        radius: "80%",
        title: { show: false },
        detail: { show: false },
        axisLine: { lineStyle: { width: 12, color: [[0.3, "#a7f3d0"], [0.7, "#10b981"], [1, "#047857"]] } },
        progress: { show: true, width: 12 },
        pointer: { width: 5, length: "60%" },
        itemStyle: { color: "#10b981" },
        axisTick: { show: false },
        splitLine: { length: 15, lineStyle: { width: 2, color: "#94a3b8" } },
        axisLabel: { distance: 20, fontSize: 10, color: "#64748b" },
        data: [{ value: parseFloat(latestValue.value) || 0 }]
      }]
    })
  }

  if (lineRef.value) {
    if (lineChart) lineChart.dispose()
    lineChart = echarts.init(lineRef.value)
    lineChart.setOption({
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "rgba(16, 185, 129, 0.3)",
        textStyle: { color: "#065f46" }
      },
      grid: { top: "15%", left: "5%", right: "5%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: xData,
        boundaryGap: false,
        axisLabel: { interval: "auto", hideOverlap: true, rotate: 40, fontSize: 10, color: "#64748b" },
        axisLine: { lineStyle: { color: "rgba(16, 185, 129, 0.15)" } }
      },
      yAxis: { 
        type: "value", 
        name: currentUnit.value, 
        nameTextStyle: { color: "#64748b" },
        splitLine: { lineStyle: { color: "rgba(16, 185, 129, 0.08)", type: "dashed" } },
        axisLabel: { color: "#64748b" }
      },
      series: [{
        type: "line",
        data: yData,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: true,
        areaStyle: { opacity: 0.15, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#10b981" }, { offset: 1, color: "rgba(16,185,129,0.01)" }]) },
        itemStyle: { color: "#10b981", borderColor: "#fff", borderWidth: 2 },
        lineStyle: { color: "#10b981", width: 2 }
      }]
    })
  }
}

function handleReportClose() {
  if (gaugeChart) gaugeChart.dispose()
  if (lineChart) lineChart.dispose()
  reportDateRange.value = []
}

function handleViewLocationReport() {
  if (!currentNode.value) {
    proxy.$modal.msgError("请先选择一个具体的园区、区域或位置")
    return
  }
  openLocationReportDrawer.value = true
}

async function handleLocationReportOpened() {
  locationReportLoading.value = true
  locationReportData.value = {}
  
  // Get devices belonging to selected node type
  let devices = []
  if (currentNode.value.type === 'location') {
    devices = deviceList.value || []
  } else if (currentNode.value.type === 'area') {
    devices = allDevices.value.filter(d => d.areaId === currentNode.value.id)
  } else if (currentNode.value.type === 'park') {
    devices = allDevices.value.filter(d => d.parkId === currentNode.value.id)
  }
  
  // Filter out cameras/productId=4 for numerical reports
  devices = devices.filter(d => d.productId != 4 && d.productId != '4')
  
  if (devices.length === 0) {
    locationReportLoading.value = false
    return
  }
  
  // Initialize data structure for each device
  devices.forEach(device => {
    locationReportData.value[device.deviceSn] = {
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
    }
  })
  
  // Load models and logs for all devices in parallel
  const promises = devices.map(async device => {
    try {
      const sn = device.deviceSn
      if (!device.productId) {
        locationReportData.value[sn].loading = false
        return
      }
      
      const modelRes = await listModel({ productId: device.productId, pageSize: 100 })
      const numericModels = (modelRes.rows || []).filter(m => ["int", "float"].includes(m.type) && m.isMonitor == 1)
      
      locationReportData.value[sn].numericModels = numericModels
      
      if (numericModels.length > 0) {
        const currentKey = numericModels[0].identifier
        locationReportData.value[sn].currentKey = currentKey
        
        const queryParams = { deviceSn: sn, pageSize: 100, orderByColumn: "createTime", isAsc: "asc" }
        const logRes = await listDeviceLog(proxy.addDateRange(queryParams, drawerDateRange.value))
        const logs = logRes.rows || []
        locationReportData.value[sn].logs = logs
        
        const xData = [], yData = []
        const model = numericModels.find(m => m.identifier === currentKey)
        const unit = model?.specs ? JSON.parse(model.specs).unit || "" : ""
        
        logs.forEach(log => {
          try {
            const payload = (typeof log.payload === "string") ? JSON.parse(log.payload) : log.payload
            const val = payload[currentKey]
            if (val != null) {
              xData.push(log.createTime.substring(5, 16))
              yData.push(val)
            }
          } catch (e) {}
        })
        
        locationReportData.value[sn].currentUnit = unit
        locationReportData.value[sn].xData = xData
        locationReportData.value[sn].yData = yData
        locationReportData.value[sn].latestValue = yData.length > 0 ? yData[yData.length - 1] : "-"
        
        const numY = yData.map(Number).filter(n => !isNaN(n))
        if (numY.length > 0) {
          locationReportData.value[sn].maxVal = Math.max(...numY)
          locationReportData.value[sn].minVal = Math.min(...numY)
          locationReportData.value[sn].avgVal = (numY.reduce((a, b) => a + b, 0) / numY.length).toFixed(2)
        } else {
          locationReportData.value[sn].maxVal = "-"
          locationReportData.value[sn].minVal = "-"
          locationReportData.value[sn].avgVal = "-"
        }
        
        await nextTick()
        renderDeviceChart(sn)
      }
    } catch (err) {
      console.error("加载设备数据失败: " + device.deviceSn, err)
    } finally {
      locationReportData.value[device.deviceSn].loading = false
    }
  })
  
  await Promise.all(promises)
  locationReportLoading.value = false
}

function renderDeviceChart(sn) {
  const data = locationReportData.value[sn]
  if (!data || !chartRefs[sn]) return
  
  if (chartInstances[sn]) {
    chartInstances[sn].dispose()
  }
  
  const chart = echarts.init(chartRefs[sn])
  chartInstances[sn] = chart
  
  chart.setOption({
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "rgba(64, 158, 255, 0.3)",
      textStyle: { color: "#333" }
    },
    grid: { top: "15%", left: "5%", right: "5%", bottom: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.xData,
      boundaryGap: false,
      axisLabel: { rotate: 30, fontSize: 9, color: "#64748b", interval: "auto", hideOverlap: true },
      axisLine: { lineStyle: { color: "rgba(64, 158, 255, 0.15)" } }
    },
    yAxis: { 
      type: "value", 
      name: data.currentUnit, 
      nameTextStyle: { color: "#64748b" },
      splitLine: { lineStyle: { color: "rgba(64, 158, 255, 0.08)", type: "dashed" } }
    },
    series: [{
      type: "line",
      data: data.yData,
      smooth: true,
      symbol: "circle",
      symbolSize: 4,
      areaStyle: { opacity: 0.1, color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#409EFF" }, { offset: 1, color: "rgba(64,158,255,0.01)" }]) },
      itemStyle: { color: "#409EFF" }
    }]
  })
}

function handleDevicePropertyChange(sn, key) {
  const data = locationReportData.value[sn]
  if (!data || !data.logs) return
  
  const numericModels = data.numericModels
  const model = numericModels.find(m => m.identifier === key)
  data.currentUnit = model?.specs ? JSON.parse(model.specs).unit || "" : ""
  
  const xData = [], yData = []
  data.logs.forEach(log => {
    try {
      const payload = (typeof log.payload === "string") ? JSON.parse(log.payload) : log.payload
      const val = payload[key]
      if (val != null) {
        xData.push(log.createTime.substring(5, 16))
        yData.push(val)
      }
    } catch(e) {}
  })
  
  data.xData = xData
  data.yData = yData
  data.latestValue = yData.length > 0 ? yData[yData.length - 1] : "-"
  
  const numY = yData.map(Number).filter(n => !isNaN(n))
  if (numY.length > 0) {
    data.maxVal = Math.max(...numY)
    data.minVal = Math.min(...numY)
    data.avgVal = (numY.reduce((a, b) => a + b, 0) / numY.length).toFixed(2)
  } else {
    data.maxVal = "-"
    data.minVal = "-"
    data.avgVal = "-"
  }
  
  renderDeviceChart(sn)
}

function handleLocationReportClosed() {
  Object.keys(chartInstances).forEach(sn => {
    if (chartInstances[sn]) {
      chartInstances[sn].dispose()
      delete chartInstances[sn]
    }
  })
  Object.keys(chartRefs).forEach(sn => {
    delete chartRefs[sn]
  })
  locationReportData.value = {}
  drawerDateRange.value = []
}

async function handleDrawerDateRangeChange() {
  const devices = Object.values(locationReportData.value)
  if (devices.length === 0) return
  
  locationReportLoading.value = true
  
  const promises = devices.map(async devData => {
    try {
      const sn = devData.deviceSn
      if (!devData.currentKey) return
      
      devData.loading = true
      
      const queryParams = { deviceSn: sn, pageSize: 100, orderByColumn: "createTime", isAsc: "asc" }
      const logRes = await listDeviceLog(proxy.addDateRange(queryParams, drawerDateRange.value))
      const logs = logRes.rows || []
      devData.logs = logs
      
      const xData = [], yData = []
      const currentKey = devData.currentKey
      const model = devData.numericModels.find(m => m.identifier === currentKey)
      devData.currentUnit = model?.specs ? JSON.parse(model.specs).unit || "" : ""
      
      logs.forEach(log => {
        try {
          const payload = (typeof log.payload === "string") ? JSON.parse(log.payload) : log.payload
          const val = payload[currentKey]
          if (val != null) {
            xData.push(log.createTime.substring(5, 16))
            yData.push(val)
          }
        } catch (e) {}
      })
      
      devData.xData = xData
      devData.yData = yData
      devData.latestValue = yData.length > 0 ? yData[yData.length - 1] : "-"
      
      const numY = yData.map(Number).filter(n => !isNaN(n))
      if (numY.length > 0) {
        devData.maxVal = Math.max(...numY)
        devData.minVal = Math.min(...numY)
        devData.avgVal = (numY.reduce((a, b) => a + b, 0) / numY.length).toFixed(2)
      } else {
        devData.maxVal = "-"
        devData.minVal = "-"
        devData.avgVal = "-"
      }
      
      await nextTick()
      renderDeviceChart(sn)
    } catch (err) {
      console.error("重新加载日志失败 Sn: " + devData.deviceSn, err)
    } finally {
      devData.loading = false
    }
  })
  
  await Promise.all(promises)
  locationReportLoading.value = false
}

function handleOpenSchedule(item) {
  scheduleForm.value = { 
      deviceId: item.deviceId, 
      jobType: 'ONCE', 
      executeTime: null, 
      cronExpression: null, 
      remark: '',
      presetId: null,
      count: 1 
  }
  if (scheduleRef.value) scheduleRef.value.resetFields()
  
  cronConfig.type = 'DAILY'; cronConfig.weekDays = []; cronConfig.intervalDays = 2; cronConfig.time = '08:00:00'
  
  currentDeviceRef.value = item
  currentDeviceName.value = item.deviceName
  
  loadPresets(item.deviceId)
  scheduleOpen.value = true
}

function loadPresets(deviceId) {
    presetOptions.value = []
    listCameraPreset({ deviceId: deviceId }).then(res => {
        presetOptions.value = res.rows || res.data || []
    })
}

function generateCronExpression() {
  const time = cronConfig.time
  if (!time) return ''
  const [hh, mm, ss] = time.split(':')
  if (cronConfig.type === 'DAILY') return `${ss} ${mm} ${hh} * * ?`
  else if (cronConfig.type === 'WEEKLY') {
    const days = cronConfig.weekDays.join(',')
    return days ? `${ss} ${mm} ${hh} ? * ${days}` : ''
  } else if (cronConfig.type === 'INTERVAL') return `${ss} ${mm} ${hh} 1/${cronConfig.intervalDays} * ?`
  return ''
}

function submitSchedule() {
  scheduleRef.value.validate(valid => {
    if (valid) {
      if (scheduleForm.value.jobType === 'CRON') {
         if (!cronConfig.time || (cronConfig.type === 'WEEKLY' && cronConfig.weekDays.length === 0)) {
            proxy.$modal.msgError("请完善配置")
            return
         }
         scheduleForm.value.cronExpression = generateCronExpression()
      }
      
      const postData = { 
        ...scheduleForm.value, 
        taskName: `${currentDeviceName.value}-${currentDeviceRef.value.deviceSn}-${new Date().getTime()}`,
        creatorId: currentUserId.value 
      }

      addCameraTask(postData).then(() => {
        proxy.$modal.msgSuccess("创建成功")
        scheduleOpen.value = false
      })
    }
  })
}

function handleViewGallery(item) {
  currentDeviceName.value = item.deviceName
  galleryOpen.value = true
  galleryLoading.value = true
  galleryList.value = []
  const params = { 
    deviceId: item.deviceId, 
    pageNum: 1, 
    pageSize: 50, 
    orderByColumn: 'captureTime', 
    isAsc: 'desc',
    userId: isAdmin.value ? null : currentUserId.value 
  }
  listRecord(params).then(res => {
    galleryList.value = res.rows
    galleryLoading.value = false
  }).catch(() => {
    galleryLoading.value = false
  })
}

function openImageViewer(index) {
  initialIndex.value = index
  showViewer.value = true
}

function closeImageViewer() {
  showViewer.value = false
}

function getTypeName(type) {
  const map = { park: "园区", area: "区域", location: "位置" }
  return map[type] || ""
}
function getTypeTag(type) {
  const map = { park: "", area: "success", location: "warning" }
  return map[type] || "info"
}
function getChildTypeName() {
  if (!currentNode.value) return "园区"
  if (currentNode.value.type === "park") return "区域"
  if (currentNode.value.type === "area") return "位置"
  return ""
}
function getParentName() {
  if (!currentNode.value) return ""
  return currentNode.value.label
}
function parseTime(time) {
  if (!time) return ""
  return time.replace("T", " ")
}
</script>

<style scoped>
.full-height { height: calc(100vh - 84px); display: flex; flex-direction: column; }
:deep(.el-card__body) { flex: 1; overflow: auto; display: flex; flex-direction: column; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-title { display: flex; align-items: center; font-weight: bold; }
.clickable-title { cursor: pointer; transition: color 0.3s; }
.clickable-title:hover { color: #409eff; }
.custom-tree-node { display: flex; align-items: center; font-size: 14px; }
.icon-park { color: #e6a23c; }
.icon-area { color: #67c23a; }
.icon-location { color: #409eff; }
.ml-2 { margin-left: 8px; }
.mr-1 { margin-right: 4px; }
.mb8 { margin-bottom: 8px; }
.loading-text { text-align: center; color: #909399; margin-top: 50px; font-size: 14px; }

.cursor-pointer { cursor: pointer; }
.cursor-pointer:hover { opacity: 0.8; color: #409EFF; }
.text-center { text-align: center; }
.font-bold { font-weight: bold; }
.text-xl { font-size: 1.25rem; }
.text-sm { font-size: 0.875rem; }
.text-gray-500 { color: #909399; }
.text-muted { color: #909399; font-size: 12px; }

.model-tips { margin-top: 10px; border-top: 1px solid #ebeef5; padding-top: 10px; }
.tips-title { font-size: 14px; font-weight: bold; color: #606266; margin-bottom: 10px; }
.table-scroll-wrapper { max-height: 250px; overflow-y: auto; border: 1px solid #EBEEF5; border-bottom: none; }

.chart-wrapper { background: #ffffff; border-radius: 8px; padding: 15px; border: 1px solid #ebeef5; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05); height: 100%; }
.chart-title { font-size: 15px; font-weight: bold; color: #303133; margin-bottom: 15px; border-left: 4px solid #409EFF; padding-left: 10px; }
.value-display { font-size: 28px; color: #409EFF; font-weight: bold; margin-top: -20px; position: relative; z-index: 10; }
.unit-display { font-size: 14px; color: #909399; font-weight: normal; }

.log-model-tips :deep(.el-collapse-item__header) { font-weight: bold; color: #606266; background-color: #f8f9fa; padding-left: 10px; }
.log-model-tips :deep(.el-collapse-item__content) { padding-bottom: 0; }

.panel-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  padding:16px 20px;
  border-radius:12px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border:1px solid #ebeef5;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.panel-left{ display:flex; flex-direction:column; gap:10px; }
.panel-title{
  font-size:18px;
  font-weight:800;
  color:#1e293b;
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  border-left: 4px solid #10b981;
  padding-left: 12px;
  line-height: 1.2;
}
.panel-path{ display:flex; align-items:center; flex-wrap:wrap; gap:10px; }
.path-chip{
  border: none !important;
  font-weight: 600;
  padding: 6px 14px;
  height: auto;
  font-size: 13px;
  border-radius: 8px !important;
}
.path-chip.el-tag--info {
  background: #f1f5f9 !important;
  color: #475569 !important;
}
.path-chip.el-tag--success {
  background: #ecfdf5 !important;
  color: #059669 !important;
}
.path-chip.el-tag--warning {
  background: #fffbeb !important;
  color: #d97706 !important;
}
.path-sep{ color:#cbd5e1; font-weight: 300; font-size: 14px; margin: 0 4px; }
.path-tip{ color:#64748b; margin-left:8px; font-size: 13px; }
.panel-actions{ display:flex; align-items:center; }
.btn-primary-soft{ border-radius:10px; font-weight:700; }

.pretty-table{ margin-top:12px; }
.pretty-el-table{ border-radius:12px; overflow:hidden; border:1px solid #ebeef5; }
:deep(.pretty-el-table .el-table__header th){ background:#f6f8fb !important; color:#303133; font-weight:800; }
:deep(.pretty-el-table .el-table__row:hover td){ background:#f8fafc !important; }
.time-muted{ color:#909399; }
.name-cell{ display:flex; align-items:center; gap:8px; }
.cell-ic{ font-size:16px; }
.cell-ic.park{ color:#409eff; }
.cell-ic.area{ color:#67c23a; }
.cell-ic.loc{ color:#e6a23c; }
.name-text{ font-weight:700; color:#303133; }
.code-tag{ border-radius:999px; }

.empty-state{ padding:22px 10px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#909399; }
.empty-ic{ font-size:22px; margin-bottom:6px; }
.empty-title{ font-weight:800; color:#606266; }
.empty-sub{ font-size:12px; margin-top:4px; }

.device-grid-wrapper{ margin-top:6px; }
.device-card{ border-radius:14px; border:1px solid #ebeef5; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
.device-card:hover{ transform: translateY(-2px); border-color:#dbeafe; }
.device-card-top{ display:flex; align-items:center; gap:10px; padding-bottom:10px; border-bottom:1px dashed #ebeef5; }
.device-title{ display:flex; align-items:center; flex:1; min-width:0; }
.device-name{ font-weight:900; color:#303133; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }
.device-meta{ padding-top:10px; display:flex; flex-direction:column; gap:8px; }
.meta-row{ display:flex; align-items:center; gap:10px; }
.meta-label{ width:64px; color:#909399; font-size:12px; }
.meta-value{ border-radius:999px; }
.meta-muted{ color:#606266; font-size:12px; }
.meta-remark{ align-items:flex-start; }
.meta-remark-text{ color:#303133; font-size:12px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.device-card-actions{ margin-top:10px; padding-top:10px; border-top:1px solid #ebeef5; display:flex; flex-wrap:wrap; gap:8px 14px; }

.gallery-container { padding: 0 20px; }
.gallery-card { margin-bottom: 5px; border-radius: 8px; }
.gallery-image-wrapper { 
  height: 180px; overflow: hidden; border-radius: 6px; background: #f5f7fa; 
  display: flex; align-items: center; justify-content: center;
  position: relative;
  cursor: pointer; 
}
.gallery-image-wrapper .gallery-img-real { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
.gallery-image-wrapper:hover .gallery-img-real { transform: scale(1.05); }
.gallery-image-wrapper .zoom-hint {
   position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2);
   display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;
   color: #fff; font-size: 24px;
}
.gallery-image-wrapper:hover .zoom-hint { opacity: 1; }
.gallery-info { margin-top: 10px; font-size: 13px; }
.source-row { display: flex; align-items: center; }
.mt-5 { margin-top: 5px; }
.mr-5 { margin-right: 5px; }
.ml-5 { margin-left: 5px; }

/* ===== Standalone Agriculture Theme (Smart Agriculture Green Oasis Redesign) ===== */
.standalone-agri {
  background-color: #f3f8f5 !important; /* 温润的植物灰绿背景 */
  background-image: radial-gradient(ellipse at 50% -20%, rgba(16, 185, 129, 0.12), transparent 85%) !important;
  color: #334155 !important;
  min-height: 100vh !important;
  padding: 16px !important;
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
  overflow: auto !important;

  .bg-grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(rgba(16, 185, 129, 0.04) 1px, transparent 0),
      radial-gradient(rgba(16, 185, 129, 0.02) 2px, transparent 0) !important;
    background-size: 32px 32px !important;
    pointer-events: none !important;
    z-index: 0 !important;
  }

  .agri-header {
    position: relative;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.9) !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(16, 185, 129, 0.12) !important;
    border-bottom: 2px solid #10b981 !important;
    border-radius: 12px;
    margin-bottom: 16px;
    padding: 0 20px;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.05) !important;
    z-index: 10;
    flex-shrink: 0;

    &::before {
      display: none !important;
    }

    .logo-title {
      font-size: 11px;
      font-weight: 700;
      color: #047857 !important;
      letter-spacing: 1.5px;
    }

    .header-main-title {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #065f46 30%, #10b981 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 2px;
    }
  }

  .agri-row {
    position: relative;
    z-index: 1;
    flex: 1;
  }

  .box-card {
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(16, 185, 129, 0.12) !important;
    border-top: 2px solid rgba(16, 185, 129, 0.4) !important;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.05) !important;
    color: #334155 !important;
    border-radius: 12px !important;

    :deep(.el-card__header) {
      border-bottom: 1px solid rgba(16, 185, 129, 0.08) !important;
      color: #065f46 !important;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.01) !important;
    }
  }

  :deep(.el-tree) {
    background: transparent !important;
    color: #334155 !important;
  }

  :deep(.el-tree-node__content:hover) {
    background: rgba(16, 185, 129, 0.08) !important;
    border-radius: 6px;
    color: #065f46;
  }

  :deep(.el-tree-node:focus > .el-tree-node__content) {
    background: rgba(16, 185, 129, 0.08) !important;
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background: rgba(16, 185, 129, 0.15) !important;
    border-left: 3px solid #10b981 !important;
    color: #047857 !important;
    font-weight: 700;
    border-radius: 0 6px 6px 0;
    
    &:hover {
      background: rgba(16, 185, 129, 0.18) !important;
    }
  }

  :deep(.el-form-item__label) {
    color: #334155 !important;
  }

  :deep(.el-input__wrapper), :deep(.el-select .el-input__wrapper), :deep(.el-input-number .el-input__wrapper) {
    background: #ffffff !important;
    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.15) inset !important;
    border-radius: 6px !important;
  }
  
  :deep(.el-input__wrapper.is-focus), :deep(.el-select .el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3) inset !important;
  }

  :deep(.el-input__inner), :deep(.el-select .el-input__inner) {
    color: #1e293b !important;
  }

  :deep(.el-table) {
    background: #ffffff !important;
    color: #334155 !important;
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
    border-radius: 8px;
    overflow: hidden;
  }

  :deep(.el-table th.el-table__cell) {
    background: rgba(16, 185, 129, 0.04) !important;
    color: #065f46 !important;
    font-weight: 700;
    border-bottom: 1px solid rgba(16, 185, 129, 0.1) !important;
  }
  
  :deep(.el-table tr) {
    background: #ffffff !important;
    color: #334155 !important;
  }

  :deep(.el-table td.el-table__cell) {
    background: transparent !important;
    border-bottom: 1px solid rgba(16, 185, 129, 0.06) !important;
  }

  :deep(.el-table--striped .el-table__row--striped td.el-table__cell) {
    background: rgba(16, 185, 129, 0.02) !important;
  }

  :deep(.pretty-el-table .el-table__row:hover td.el-table__cell) {
    background: rgba(16, 185, 129, 0.08) !important;
  }

  .panel-top {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 1px solid rgba(16, 185, 129, 0.12) !important;
    border-top: 2px solid rgba(16, 185, 129, 0.4) !important;
    color: #1e293b !important;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.04) !important;
  }

  .panel-title {
    color: #065f46 !important;
    font-weight: 800;
    border-left-color: #10b981 !important;
  }

  .path-chip {
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
  }

  .path-chip.el-tag--info {
    background: #f1f5f9 !important;
    color: #475569 !important;
    border-color: #cbd5e1 !important;
  }

  .path-chip.el-tag--success {
    background: #e6fcf5 !important;
    color: #047857 !important;
    border-color: rgba(16, 185, 129, 0.2) !important;
  }

  .path-chip.el-tag--warning {
    background: #fffbeb !important;
    color: #b45309 !important;
    border-color: rgba(245, 158, 11, 0.25) !important;
  }

  .path-sep {
    color: #cbd5e1 !important;
  }

  .path-tip {
    color: #64748b !important;
  }

  .name-text {
    color: #334155 !important;
    font-weight: 700;
  }

  .device-card {
    background: #ffffff !important;
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.04) !important;
    color: #334155 !important;
    border-radius: 12px !important;
    transition: all 0.3s ease;

    &:hover {
      border-color: #10b981 !important;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.12) !important;
      transform: translateY(-2px);
    }

    .device-name {
      color: #065f46 !important;
      font-weight: 700;
    }

    .device-card-top, .device-card-actions {
      border-color: rgba(16, 185, 129, 0.06) !important;
    }
  }

  .chart-wrapper {
    background: #ffffff !important;
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
    color: #334155 !important;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.04) !important;
    border-radius: 12px !important;

    .chart-title {
      color: #065f46 !important;
      border-left-color: #10b981 !important;
    }
    
    .value-display {
      color: #10b981 !important;
    }
  }
}

/* ===== Standalone Dialog and Drawer overrides to bright natural theme ===== */
.cyber-dialog {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(16, 185, 129, 0.18) !important;
  border-top: 3px solid #10b981 !important;
  box-shadow: 0 20px 50px rgba(16, 185, 129, 0.1) !important;
  border-radius: 12px !important;
  
  .el-dialog__title {
    color: #065f46 !important;
    font-weight: 700 !important;
    font-size: 15px !important;
  }
  
  .el-dialog__headerbtn .el-dialog__close {
    color: #64748b !important;
    &:hover { color: #10b981 !important; }
  }

  .el-form-item__label {
    color: #334155 !important;
    font-weight: 500 !important;
  }

  .el-input__wrapper, .el-select .el-input__wrapper, .el-input-number .el-input__wrapper {
    background: #ffffff !important;
    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.15) inset !important;
    border-radius: 6px !important;
  }

  .el-input__wrapper.is-focus, .el-select .el-input__wrapper.is-focus {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3) inset !important;
  }

  .el-input__inner, .el-select .el-input__inner {
    color: #1e293b !important;
  }
  
  .el-input-number__decrease, .el-input-number__increase {
    background: #f8fafc !important;
    border-color: rgba(16, 185, 129, 0.1) !important;
    color: #475569 !important;
    &:hover { color: #10b981 !important; }
  }

  .el-radio {
    color: #475569 !important;
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
    color: #475569 !important;
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
    background: #ffffff !important;
    border: 1px solid rgba(16, 185, 129, 0.15) !important;
    color: #1e293b !important;
    box-shadow: none !important;
    border-radius: 6px;
    &:focus {
      border-color: rgba(16, 185, 129, 0.3) !important;
    }
  }

  .text-muted {
    color: #64748b !important;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    
    .el-button {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      color: #475569 !important;
      border-radius: 6px;
      transition: all 0.25s;
      
      &:hover {
        background: #f1f5f9 !important;
        border-color: #94a3b8 !important;
        color: #1e293b !important;
      }
      
      &.el-button--primary {
        background: #10b981 !important;
        border-color: #10b981 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        
        &:hover {
          background: #059669 !important;
          border-color: #059669 !important;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
        }
      }
    }
  }
}

.cyber-drawer {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(16, 185, 129, 0.18) !important;
  box-shadow: -10px 0 30px rgba(16, 185, 129, 0.05) !important;
  
  .el-drawer__header {
    color: #065f46 !important;
    font-weight: 700 !important;
    border-bottom: 1px solid rgba(16, 185, 129, 0.1);
    margin-bottom: 20px;
    padding-bottom: 15px;
  }
  
  .gallery-card {
    background: #ffffff !important;
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
    border-radius: 8px !important;
    overflow: hidden;
  }
  
  .gallery-image-wrapper {
    background: #f0fdf4 !important;
  }
}

/* ===== 默认嵌套 RuoYi 时的精细化明亮风格覆盖 ===== */
.agri-dialog {
  background: rgba(255, 255, 255, 0.96) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(16, 185, 129, 0.18) !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 40px rgba(16, 185, 129, 0.08) !important;
  
  .el-dialog__title {
    color: #065f46 !important;
    font-weight: 700 !important;
  }
  
  .el-form-item__label {
    color: #334155 !important;
  }
  
  .el-input__wrapper, .el-select .el-input__wrapper, .el-input-number .el-input__wrapper {
    background: rgba(255, 255, 255, 0.9) !important;
    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.15) inset !important;
    border-radius: 8px !important;
  }
  
  .el-input__wrapper.is-focus, .el-select .el-input__wrapper.is-focus {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3) inset !important;
  }
  
  .el-input__inner {
    color: #1e293b !important;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

.agri-drawer {
  background: rgba(255, 255, 255, 0.96) !important;
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(16, 185, 129, 0.18) !important;
  box-shadow: -10px 0 30px rgba(16, 185, 129, 0.05) !important;
  
  .el-drawer__header {
    color: #065f46 !important;
    font-weight: 700 !important;
    border-bottom: 1px solid rgba(16, 185, 129, 0.1);
    margin-bottom: 20px;
    padding-bottom: 15px;
  }
  
  .gallery-card {
    background: rgba(255, 255, 255, 0.9) !important;
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
    border-radius: 12px !important;
    overflow: hidden;
  }
  
  .gallery-image-wrapper {
    background: #f0fdf4 !important;
  }
}

.cyber-dialog, .cyber-drawer {
  .el-table {
    background: #ffffff !important;
    color: #334155 !important;
    border: 1px solid rgba(16, 185, 129, 0.1) !important;
    border-radius: 8px;
    overflow: hidden;

    th.el-table__cell {
      background: rgba(16, 185, 129, 0.04) !important;
      color: #065f46 !important;
      font-weight: 700;
      border-bottom: 1px solid rgba(16, 185, 129, 0.1) !important;
    }

    tr {
      background: #ffffff !important;
      color: #334155 !important;
    }

    td.el-table__cell {
      background: transparent !important;
      border-bottom: 1px solid rgba(16, 185, 129, 0.06) !important;
    }

    &.el-table--striped .el-table__row--striped td.el-table__cell {
      background: rgba(16, 185, 129, 0.02) !important;
    }

    .el-table__row:hover td.el-table__cell {
      background: rgba(16, 185, 129, 0.08) !important;
    }
  }
}

.tree-badge {
  font-size: 10px;
  font-family: monospace;
  background-color: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 10px;
  padding: 1px 6px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.badge-total {
  color: #64748b;
  font-weight: 600;
}
.badge-sep {
  color: #cbd5e1;
}
.badge-online {
  color: #10b981;
  font-weight: 600;
}

/* ========================================================================
   FarmerTask 同系视觉覆盖：只调整页面布局和样式，不改变业务接口
   ======================================================================== */
.hierarchy-farmer-page {
  min-height: 100vh;
  padding: 22px;
  color: #24352d;
  background:
    radial-gradient(circle at 14% 4%, rgba(127, 168, 138, 0.18), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.hierarchy-farmer-page .farmer-page-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 12px 18px;
  margin-bottom: 18px;
  color: #24352d;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d8e8d9;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(58, 88, 63, 0.10);
  backdrop-filter: blur(8px);
}

.hierarchy-farmer-page .header-left,
.hierarchy-farmer-page .header-title-row {
  display: flex;
  align-items: center;
}

.hierarchy-farmer-page .header-left {
  min-width: 0;
  gap: 12px;
}

.hierarchy-farmer-page .header-symbol,
.hierarchy-farmer-page .navigation-icon {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: space-between;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  padding: 8px 9px 7px;
  background:
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.42), transparent 24px),
    linear-gradient(135deg, #2f7d5c 0%, #4f8f6b 58%, #8fb79a 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 12px;
  box-shadow:
    0 10px 18px rgba(47, 125, 92, 0.20),
    inset 0 1px 0 rgba(255, 255, 255, 0.36);
  box-sizing: border-box;
}

.hierarchy-farmer-page .header-symbol::after,
.hierarchy-farmer-page .navigation-icon::after {
  position: absolute;
  right: 7px;
  bottom: 6px;
  left: 7px;
  height: 1px;
  content: "";
  background: rgba(255, 255, 255, 0.48);
}

.hierarchy-farmer-page .header-symbol i,
.hierarchy-farmer-page .navigation-icon i {
  position: relative;
  z-index: 1;
  display: block;
  width: 3px;
  background: #ffffff;
  border-radius: 999px;
}

.hierarchy-farmer-page .header-symbol i:nth-child(1),
.hierarchy-farmer-page .navigation-icon i:nth-child(1) {
  height: 9px;
  opacity: 0.8;
}

.hierarchy-farmer-page .header-symbol i:nth-child(2),
.hierarchy-farmer-page .navigation-icon i:nth-child(2) {
  height: 14px;
}

.hierarchy-farmer-page .header-symbol i:nth-child(3),
.hierarchy-farmer-page .navigation-icon i:nth-child(3) {
  height: 19px;
}

.hierarchy-farmer-page .header-copy {
  min-width: 0;
}

.hierarchy-farmer-page .header-eyebrow {
  display: block;
  margin-bottom: 3px;
  color: #819184;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
}

.hierarchy-farmer-page .header-main-title {
  color: #243c2e;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 1px;
}

.hierarchy-farmer-page .header-title-row {
  min-width: 0;
  gap: 12px;
}

.hierarchy-farmer-page .header-title-row small {
  overflow: hidden;
  color: #7b9180;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-farmer-page .agri-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: nowrap;
  gap: 20px;
  margin-right: 0 !important;
  margin-left: 0 !important;
}

.hierarchy-farmer-page .agri-row > .el-col:first-child {
  position: sticky;
  top: 16px;
  flex: 0 0 310px;
  width: 310px;
  max-width: 310px;
  padding: 0 !important;
}

.hierarchy-farmer-page .agri-row > .el-col:nth-child(2) {
  flex: 1 1 auto;
  width: auto;
  max-width: none;
  min-width: 0;
  padding: 0 !important;
}

.hierarchy-farmer-page .navigation-card,
.hierarchy-farmer-page .content-card {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d8e8d9;
  border-radius: 16px;
  box-shadow: 0 14px 34px rgba(58, 88, 63, 0.10);
}

.hierarchy-farmer-page .navigation-card {
  min-height: calc(100vh - 116px);
  height: auto;
}

.hierarchy-farmer-page .content-card {
  height: auto;
  min-height: calc(100vh - 246px);
}

.hierarchy-farmer-page .navigation-card :deep(.el-card__header),
.hierarchy-farmer-page .content-card :deep(.el-card__header) {
  padding: 16px 18px;
  border-bottom-color: #e2ece0;
}

.hierarchy-farmer-page .navigation-card :deep(.el-card__body),
.hierarchy-farmer-page .content-card :deep(.el-card__body) {
  display: block;
  padding: 18px;
  overflow: visible;
}

.hierarchy-farmer-page .navigation-header {
  gap: 12px;
}

.hierarchy-farmer-page .navigation-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 11px;
}

.hierarchy-farmer-page .navigation-title > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.hierarchy-farmer-page .navigation-title strong {
  color: #243c2e;
  font-size: 16px;
  font-weight: 800;
}

.hierarchy-farmer-page .navigation-title small {
  margin-top: 3px;
  color: #7b9180;
  font-size: 11px;
}

.hierarchy-farmer-page .navigation-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.hierarchy-farmer-page :deep(.el-tree) {
  color: #365043;
  background: transparent;
}

.hierarchy-farmer-page :deep(.el-tree-node__content) {
  min-height: 42px;
  padding-right: 8px;
  margin-bottom: 4px;
  border: 1px solid transparent;
  border-radius: 9px;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.hierarchy-farmer-page :deep(.el-tree-node__content:hover) {
  background: #f0f6ee;
  border-color: #dbe9d8;
}

.hierarchy-farmer-page :deep(.el-tree-node.is-current > .el-tree-node__content) {
  color: #24583f;
  background: #e7f1e5;
  border-color: #c9dfc8;
}

.hierarchy-farmer-page .tree-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  color: #6b7f70;
  font-size: 11px;
  background: #f5f8f3;
  border: 1px solid #e0eadf;
  border-radius: 999px;
}

.hierarchy-farmer-page .badge-online {
  color: #2f7d5c;
  font-weight: 800;
}

.hierarchy-farmer-page .overview-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  margin: 0 0 18px !important;
}

.hierarchy-farmer-page .overview-stat-row :deep(.el-col) {
  width: 100%;
  max-width: none;
  padding: 0 !important;
  flex: initial;
}

.hierarchy-farmer-page .overview-stat-card {
  position: relative;
  overflow: hidden;
  min-height: 108px;
  color: #24352d;
  background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(246,250,242,.98));
  border: 1px solid #dbe8d8;
  border-radius: 14px;
  box-shadow: 0 10px 26px rgba(61, 91, 67, 0.09);
}

.hierarchy-farmer-page .overview-stat-card::after {
  position: absolute;
  right: -24px;
  bottom: -38px;
  width: 110px;
  height: 110px;
  content: "";
  background: rgba(79, 143, 107, 0.08);
  border-radius: 50%;
}

.hierarchy-farmer-page .overview-stat-card :deep(.el-card__body) {
  padding: 18px;
}

.hierarchy-farmer-page .overview-stat-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.hierarchy-farmer-page .overview-stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  color: #fff;
  font-size: 22px;
  background: linear-gradient(135deg, #2f7d5c, #6fa17e);
  border-radius: 13px;
  box-shadow: 0 10px 18px rgba(47, 125, 92, 0.18);
}

.hierarchy-farmer-page .data-card .overview-stat-icon {
  background: linear-gradient(135deg, #557b5f, #8ead91);
}

.hierarchy-farmer-page .device-stat-card .overview-stat-icon {
  background: linear-gradient(135deg, #376f59, #78a886);
}

.hierarchy-farmer-page .overview-stat-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.hierarchy-farmer-page .overview-stat-info > span {
  color: #758778;
  font-size: 12px;
}

.hierarchy-farmer-page .overview-stat-info strong {
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  color: #294635;
  font-size: 22px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-farmer-page .scope-card .overview-stat-info strong {
  font-size: 18px;
}

.hierarchy-farmer-page .overview-stat-info strong em {
  margin-left: 4px;
  color: #718374;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
}

.hierarchy-farmer-page .overview-stat-info small {
  margin-top: 5px;
  color: #8b9b8d;
  font-size: 11px;
}

.hierarchy-farmer-page .filter-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  padding: 16px 16px 4px;
  margin-bottom: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbf6 100%);
  border: 1px solid #dce9da;
  border-radius: 12px;
}

.hierarchy-farmer-page .filter-form :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 12px;
}

.hierarchy-farmer-page .filter-form :deep(.el-input),
.hierarchy-farmer-page .filter-form :deep(.el-select) {
  width: 180px;
}

.hierarchy-farmer-page .action-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 2px 0 12px;
  margin: 0 !important;
  gap: 8px;
}

.hierarchy-farmer-page .action-row :deep(.el-col) {
  width: auto;
  max-width: none;
  padding: 0 !important;
  flex: 0 0 auto;
}

.hierarchy-farmer-page .panel-top {
  padding: 18px 20px;
  background: linear-gradient(180deg, #fff 0%, #f8fbf5 100%);
  border: 1px solid #dcead9;
  border-radius: 14px;
  box-shadow: 0 8px 22px rgba(61, 91, 67, 0.07);
}

.hierarchy-farmer-page .panel-title {
  color: #294635;
  border-left-color: #4f8f6b;
}

.hierarchy-farmer-page .pretty-el-table {
  border-color: #dce8db;
  border-radius: 12px;
}

.hierarchy-farmer-page :deep(.pretty-el-table .el-table__header th) {
  color: #3d5848;
  background: #f2f7ef !important;
}

.hierarchy-farmer-page :deep(.pretty-el-table .el-table__row:hover td) {
  background: #f4f8f1 !important;
}

.hierarchy-farmer-page .device-grid-wrapper {
  margin-top: 10px;
}

.hierarchy-farmer-page .device-card {
  min-height: 248px;
  margin-bottom: 14px;
  background: linear-gradient(180deg, #fff 0%, #f8fbf5 100%);
  border: 1px solid #dcead9;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(61, 91, 67, 0.07);
}

.hierarchy-farmer-page .device-card:hover {
  border-color: #bcd4bd;
  box-shadow: 0 14px 28px rgba(61, 91, 67, 0.12);
  transform: translateY(-2px);
}

.hierarchy-farmer-page .device-card-top {
  min-height: 42px;
  border-bottom-color: #dfe9dd;
}

.hierarchy-farmer-page .device-name {
  color: #294635;
}

.hierarchy-farmer-page .device-card-actions {
  align-items: center;
  justify-content: flex-start;
  min-height: 38px;
  border-top-color: #dfe9dd;
}

.hierarchy-farmer-page :deep(.el-button--primary) {
  --el-button-bg-color: #2f7d5c;
  --el-button-border-color: #2f7d5c;
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
  --el-button-active-bg-color: #286c50;
  --el-button-active-border-color: #286c50;
}

.hierarchy-farmer-page :deep(.el-button--primary.is-plain) {
  --el-button-bg-color: #f1f7ef;
  --el-button-border-color: #b9d1bb;
  --el-button-text-color: #2f7d5c;
  --el-button-hover-bg-color: #2f7d5c;
  --el-button-hover-border-color: #2f7d5c;
  --el-button-hover-text-color: #fff;
}

.hierarchy-farmer-page :deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: #2f7d5c;
}

.hierarchy-farmer-page :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
.hierarchy-farmer-page :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner) {
  background-color: #2f7d5c;
  border-color: #2f7d5c;
}

@media (max-width: 1180px) {
  .hierarchy-farmer-page .agri-row {
    flex-direction: column;
  }

  .hierarchy-farmer-page .agri-row > .el-col:first-child,
  .hierarchy-farmer-page .agri-row > .el-col:nth-child(2) {
    position: static;
    width: 100%;
    max-width: none;
    flex: none;
  }

  .hierarchy-farmer-page .navigation-card {
    min-height: auto;
  }
}

@media (max-width: 820px) {
  .hierarchy-farmer-page {
    padding: 12px;
  }

  .hierarchy-farmer-page .overview-stat-row {
    grid-template-columns: 1fr;
  }

  .hierarchy-farmer-page .farmer-page-header,
  .hierarchy-farmer-page .header-title-row {
    align-items: flex-start;
  }

  .hierarchy-farmer-page .farmer-page-header {
    flex-direction: column;
    gap: 12px;
  }

  .hierarchy-farmer-page .header-title-row {
    flex-direction: column;
    gap: 3px;
  }

  .hierarchy-farmer-page .filter-form {
    align-items: stretch;
    flex-direction: column;
  }

  .hierarchy-farmer-page .filter-form :deep(.el-form-item),
  .hierarchy-farmer-page .filter-form :deep(.el-input),
  .hierarchy-farmer-page .filter-form :deep(.el-select) {
    width: 100%;
    margin-right: 0;
  }

  .hierarchy-farmer-page .panel-top {
    flex-direction: column;
    gap: 14px;
  }

  .hierarchy-farmer-page .panel-actions {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}

/* ===== Minimal smart-agriculture UI refresh ===== */
.hierarchy-farmer-page {
  padding: 16px;
  color: #26362d;
  background: #f4f7f3;
  letter-spacing: 0;
}

.hierarchy-farmer-page .farmer-page-header {
  min-height: 64px;
  padding: 10px 16px;
  margin-bottom: 12px;
  background: #ffffff;
  border: 1px solid #dce6dc;
  border-radius: 8px;
  box-shadow: none;
  backdrop-filter: none;
}

.hierarchy-farmer-page .header-symbol,
.hierarchy-farmer-page .navigation-icon {
  width: 32px;
  height: 32px;
  padding: 7px 8px 6px;
  background: #2f7d58;
  border: 0;
  border-radius: 7px;
  box-shadow: none;
}

.hierarchy-farmer-page .header-symbol::after,
.hierarchy-farmer-page .navigation-icon::after {
  display: none;
}

.hierarchy-farmer-page .header-eyebrow {
  margin-bottom: 2px;
  color: #789080;
  font-size: 10px;
  letter-spacing: 1.2px;
}

.hierarchy-farmer-page .header-main-title {
  color: #1f3b2d;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0;
}

.hierarchy-farmer-page .header-title-row small {
  color: #718477;
}

.hierarchy-farmer-page .agri-row {
  gap: 12px;
}

.hierarchy-farmer-page .agri-row > .el-col:first-child {
  top: 12px;
  flex-basis: 300px;
  width: 300px;
  max-width: 300px;
}

.hierarchy-farmer-page .navigation-card,
.hierarchy-farmer-page .content-card,
.hierarchy-farmer-page .overview-stat-card,
.hierarchy-farmer-page .panel-top,
.hierarchy-farmer-page .device-card {
  background: #ffffff;
  border: 1px solid #dce6dc;
  border-radius: 8px;
  box-shadow: none;
}

.hierarchy-farmer-page .navigation-card {
  min-height: calc(100vh - 104px);
}

.hierarchy-farmer-page .content-card {
  min-height: calc(100vh - 214px);
}

.hierarchy-farmer-page .navigation-card :deep(.el-card__header),
.hierarchy-farmer-page .content-card :deep(.el-card__header) {
  padding: 12px 14px;
  border-bottom: 1px solid #e5ece5;
}

.hierarchy-farmer-page .navigation-card :deep(.el-card__body),
.hierarchy-farmer-page .content-card :deep(.el-card__body) {
  padding: 12px;
}

.hierarchy-farmer-page .navigation-header {
  gap: 10px;
}

.hierarchy-farmer-page .navigation-title > div {
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
}

.hierarchy-farmer-page .navigation-title strong {
  color: #24372d;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.hierarchy-farmer-page .navigation-title small {
  margin-top: 0;
  color: #7b8d80;
  white-space: nowrap;
}

.hierarchy-farmer-page .navigation-actions :deep(.el-button) {
  padding: 4px 6px;
  font-weight: 600;
}

.hierarchy-farmer-page .custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
  gap: 8px;
  font-size: 13px;
}

.hierarchy-farmer-page .tree-node-main {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.hierarchy-farmer-page .tree-node-label {
  overflow: hidden;
  color: #34473b;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hierarchy-farmer-page .tree-node-extra {
  flex: 0 0 auto;
  margin-left: auto;
}

.hierarchy-farmer-page :deep(.el-tree-node__content) {
  min-height: 36px;
  padding: 0 8px;
  margin-bottom: 2px;
  border-radius: 6px;
}

.hierarchy-farmer-page :deep(.el-tree-node__content:hover) {
  background: #eef5ee;
  border-color: transparent;
}

.hierarchy-farmer-page :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: #e4f0e6;
  border-color: #c8dacb;
}

.hierarchy-farmer-page .icon-park {
  color: #4c8462;
}

.hierarchy-farmer-page .icon-area {
  color: #5b946f;
}

.hierarchy-farmer-page .icon-location {
  color: #6e8f73;
}

.hierarchy-farmer-page .tree-badge {
  padding: 1px 7px;
  color: #65776b;
  background: #f5f8f5;
  border-color: #dfe8df;
}

.hierarchy-farmer-page .badge-online {
  color: #2f7d58;
}

.hierarchy-farmer-page .overview-stat-row {
  gap: 12px;
  margin-bottom: 12px !important;
}

.hierarchy-farmer-page .overview-stat-card {
  min-height: 86px;
}

.hierarchy-farmer-page .overview-stat-card::after {
  display: none;
}

.hierarchy-farmer-page .overview-stat-card :deep(.el-card__body) {
  padding: 14px;
}

.hierarchy-farmer-page .overview-stat-icon {
  width: 40px;
  height: 40px;
  color: #2f7d58;
  font-size: 20px;
  background: #edf5ee;
  border-radius: 7px;
  box-shadow: none;
}

.hierarchy-farmer-page .data-card .overview-stat-icon,
.hierarchy-farmer-page .device-stat-card .overview-stat-icon {
  background: #edf5ee;
}

.hierarchy-farmer-page .overview-stat-info > span,
.hierarchy-farmer-page .overview-stat-info small {
  color: #788a7d;
}

.hierarchy-farmer-page .overview-stat-info strong {
  margin-top: 3px;
  color: #24372d;
  font-size: 20px;
  font-weight: 700;
}

.hierarchy-farmer-page .scope-card .overview-stat-info strong {
  font-size: 17px;
}

.hierarchy-farmer-page .filter-form {
  padding: 12px 12px 0;
  margin-bottom: 10px;
  background: #f8faf7;
  border: 1px solid #e1e9e1;
  border-radius: 8px;
}

.hierarchy-farmer-page .filter-form :deep(.el-form-item) {
  margin-right: 10px;
  margin-bottom: 10px;
}

.hierarchy-farmer-page .action-row {
  padding: 0 0 10px;
  gap: 6px;
}

.hierarchy-farmer-page .panel-top {
  align-items: center;
  padding: 14px;
}

.hierarchy-farmer-page .panel-title {
  padding-left: 10px;
  color: #24372d;
  font-size: 17px;
  font-weight: 700;
  border-left: 3px solid #2f7d58;
}

.hierarchy-farmer-page .panel-path {
  gap: 6px;
}

.hierarchy-farmer-page .path-chip {
  padding: 4px 9px;
  font-size: 12px;
  border-radius: 5px !important;
}

.hierarchy-farmer-page .path-tip {
  color: #718477;
}

.hierarchy-farmer-page .panel-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.hierarchy-farmer-page .pretty-table {
  margin-top: 10px;
}

.hierarchy-farmer-page .pretty-el-table {
  border-color: #e1e8e1;
  border-radius: 8px;
}

.hierarchy-farmer-page :deep(.pretty-el-table .el-table__header th) {
  color: #405348;
  background: #f5f8f5 !important;
  font-weight: 700;
}

.hierarchy-farmer-page :deep(.pretty-el-table .el-table__row:hover td) {
  background: #f7faf6 !important;
}

.hierarchy-farmer-page .name-text,
.hierarchy-farmer-page .device-name {
  color: #26362d;
  font-weight: 700;
}

.hierarchy-farmer-page .code-tag,
.hierarchy-farmer-page .meta-value {
  border-radius: 5px;
}

.hierarchy-farmer-page .device-card {
  min-height: 230px;
  margin-bottom: 12px;
  transition: border-color 0.18s ease, transform 0.18s ease;
}

.hierarchy-farmer-page .device-card:hover {
  border-color: #b7cfbc;
  box-shadow: none;
  transform: translateY(-1px);
}

.hierarchy-farmer-page .device-card :deep(.el-card__body) {
  padding: 14px;
}

.hierarchy-farmer-page .device-card-top {
  min-height: 36px;
  padding-bottom: 9px;
}

.hierarchy-farmer-page .meta-row {
  gap: 8px;
}

.hierarchy-farmer-page .meta-label {
  width: 56px;
  color: #819086;
}

.hierarchy-farmer-page .device-card-actions {
  gap: 4px 10px;
  min-height: 34px;
}

.hierarchy-farmer-page :deep(.el-button) {
  border-radius: 5px;
  font-weight: 600;
}

.hierarchy-farmer-page :deep(.el-button--success) {
  --el-button-bg-color: #3f8b5f;
  --el-button-border-color: #3f8b5f;
  --el-button-hover-bg-color: #4c986b;
  --el-button-hover-border-color: #4c986b;
}

.hierarchy-farmer-page :deep(.el-button--success.is-plain) {
  --el-button-bg-color: #f2f8f3;
  --el-button-border-color: #bfd5c4;
  --el-button-text-color: #2f7d58;
  --el-button-hover-bg-color: #2f7d58;
  --el-button-hover-border-color: #2f7d58;
  --el-button-hover-text-color: #fff;
}

.hierarchy-farmer-page :deep(.el-input__wrapper),
.hierarchy-farmer-page :deep(.el-select .el-input__wrapper),
.hierarchy-farmer-page :deep(.el-textarea__inner) {
  border-radius: 5px !important;
  box-shadow: 0 0 0 1px #d7e3d8 inset !important;
}

.hierarchy-farmer-page :deep(.el-input__wrapper.is-focus),
.hierarchy-farmer-page :deep(.el-select .el-input__wrapper.is-focus),
.hierarchy-farmer-page :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #2f7d58 inset !important;
}

@media (max-width: 1180px) {
  .hierarchy-farmer-page .agri-row > .el-col:first-child {
    width: 100%;
    max-width: none;
    flex: none;
  }

  .hierarchy-farmer-page .navigation-card {
    min-height: auto;
  }
}

@media (max-width: 820px) {
  .hierarchy-farmer-page {
    padding: 10px;
  }

  .hierarchy-farmer-page .navigation-title > div {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .hierarchy-farmer-page .navigation-title strong,
  .hierarchy-farmer-page .navigation-title small {
    white-space: normal;
  }

  .hierarchy-farmer-page .farmer-page-header,
  .hierarchy-farmer-page .panel-top {
    border-radius: 7px;
  }

  .hierarchy-farmer-page .panel-actions {
    justify-content: flex-start;
  }
}

</style>
