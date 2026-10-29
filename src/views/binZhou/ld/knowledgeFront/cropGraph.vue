<template>
  <div class="kg-page">

    <!-- 搜索区域 -->
    <section class="hero-card">
      <!-- <div class="hero-title">知识检索</div>
      <div class="hero-subtitle">作物知识图谱</div> -->

      <div class="hero-search">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入关键词，例如：小麦赤霉病、玉米褐斑病"
          class="hero-input"
          clearable
          @keyup.enter="onSearch"
        >
          <template #append>
            <el-button type="primary" @click="onSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <div class="hot-words">
        <span>热门搜索：</span>
        <el-link type="primary" @click="setKeyword('小麦赤霉病')">小麦赤霉病</el-link>
        <el-link type="primary" @click="setKeyword('玉米褐斑病')">玉米褐斑病</el-link>
      </div>
    </section>

    <!-- 知识图谱主要区域 -->
    <section class="knowledge-shell">
      <!-- 工具栏 -->
      <div class="graph-toolbar">
        <div class="toolbar-search">
          <el-autocomplete
            v-model="graphSearchKeyword"
            :fetch-suggestions="querySearchSuggestions"
            placeholder="搜索作物或品种，例如：小麦、保麦"
            class="graph-search-input"
            @select="handleSuggestionSelect"
            @keyup.enter="handleGraphSearch"
            :debounce="300"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #default="{ item }">
              <div class="suggestion-item">
                <div class="suggestion-main">
                  <span class="suggestion-name">{{ item.name }}</span>
                  <el-tag :type="getSuggestionTagType(item.type)" size="small">
                    {{ getSuggestionTypeLabel(item.type) }}
                  </el-tag>
                </div>
                <div class="suggestion-desc">{{ item.description }}</div>
              </div>
            </template>
          </el-autocomplete>
          <el-button type="primary" :loading="searching" @click="handleGraphSearch">
            图谱搜索
          </el-button>
        </div>

        <div class="toolbar-actions">
          <el-button plain @click="toggleLayoutLock" :type="layoutLocked ? 'success' : 'warning'" size="small">
            <el-icon><Lock v-if="layoutLocked" /><Unlock v-else /></el-icon>
            {{ layoutLocked ? '布局已锁定' : '布局已解锁' }}
          </el-button>
          <el-button plain @click="resetGraph" type="info" size="small">重置图谱</el-button>
          <el-button plain @click="collapseAllNodes" type="warning" size="small">收缩所有</el-button>
        </div>
      </div>

      <!-- 图例 -->
      <div class="graph-legend">
        <div class="legend-list">
          <div class="legend-item"><i class="legend-dot crop"></i><span>作物</span></div>
          <div class="legend-item"><i class="legend-dot type"></i><span>类型</span></div>
          <div class="legend-item"><i class="legend-dot variety"></i><span>品种</span></div>
          <div class="legend-item"><i class="legend-dot disease"></i><span>病害</span></div>
          <div class="legend-item"><i class="legend-dot pest"></i><span>虫害</span></div>
          <div class="legend-item"><i class="legend-dot stress"></i><span>非生物胁迫</span></div>
          <div class="legend-item"><i class="legend-dot feature"></i><span>特征</span></div>
        </div>
        <!-- <div class="legend-tip">双击可展开节点，右键收缩，支持缩放拖动画布</div> -->
      </div>

      <div class="main-content">
        <!-- 左侧图谱 -->
        <div class="graph-left">
          <div class="graph-main" v-loading="loading">
            <div id="knowledge-graph" ref="graphContainer"></div>

            <!-- 节点信息面板 -->
            <div class="node-info-panel" v-if="selectedNode" :style="panelStyle">
              <div class="panel-header">
                <h4>{{ selectedNode.name }}</h4>
                <el-button text @click="selectedNode = null"><span>×</span></el-button>
              </div>
              <div class="panel-content">
                <p><strong>类型：</strong>{{ getNodeTypeLabel(selectedNode.type) }}</p>
                <p v-if="selectedNode.level"><strong>层级：</strong>L{{ selectedNode.level }}</p>
                <p v-if="selectedNode.category"><strong>分类：</strong>{{ selectedNode.category }}</p>
                <p v-if="selectedNode.description"><strong>描述：</strong>{{ selectedNode.description }}</p>
                <p v-if="selectedNode.hasChildren">
                  <strong>状态：</strong>
                  <el-tag :type="selectedNode.expanded ? 'success' : 'info'" size="small">
                    {{ selectedNode.expanded ? '已展开' : '可展开' }}
                  </el-tag>
                </p>

                <div class="panel-actions">
                  <el-button
                    v-if="selectedNode.type !== 'feature'"
                    type="primary"
                    size="small"
                    @click="viewNodeDetail(selectedNode)"
                  >
                    查看详情
                  </el-button>
                  <el-button
                    v-if="selectedNode.hasChildren && !selectedNode.expanded"
                    type="success"
                    size="small"
                    @click="expandNode(selectedNode)"
                  >
                    展开子节点
                  </el-button>
                  <el-button
                    v-if="selectedNode.hasChildren && selectedNode.expanded"
                    type="warning"
                    size="small"
                    @click="collapseNode(selectedNode)"
                  >
                    收缩子节点
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧统计与节点列表 -->
        <aside class="graph-right">
          <el-card class="side-card stats-card" shadow="never">
            <template #header>
              <div class="side-card-header">图谱数据统计</div>
            </template>

            <div class="data-stats">
              <div class="stat-item"><span>节点数量</span><strong>{{ graphData.nodes ? graphData.nodes.length : 0 }}</strong></div>
              <div class="stat-item"><span>关系数量</span><strong>{{ graphData.links ? graphData.links.length : 0 }}</strong></div>
              <div class="stat-item"><span>L1作物</span><strong class="crop">{{ getNodeCountByLevel(1) }}</strong></div>
              <div class="stat-item"><span>L2类型</span><strong class="type">{{ getNodeCountByLevel(2) }}</strong></div>
              <div class="stat-item"><span>L3具体项</span><strong class="variety">{{ getNodeCountByLevel(3) }}</strong></div>
              <div class="stat-item"><span>L4特征</span><strong class="feature">{{ getNodeCountByLevel(4) }}</strong></div>
            </div>
          </el-card>

          <el-card class="side-card nodes-card" shadow="never">
            <template #header>
              <div class="side-card-header">当前展示节点</div>
            </template>

            <el-table :data="graphData.nodes" style="width: 100%" max-height="400" size="small">
              <el-table-column prop="name" label="节点名称" min-width="110" show-overflow-tooltip />
              <el-table-column prop="type" label="类型" width="84">
                <template #default="scope">
                  <el-tag :type="getTypeTagType(scope.row.type)" size="small">
                    {{ getNodeTypeLabel(scope.row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="level" label="层级" width="62">
                <template #default="scope">
                  <el-tag size="small">L{{ scope.row.level }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="82">
                <template #default="scope">
                  <el-tag v-if="scope.row.hasChildren" :type="scope.row.expanded ? 'success' : 'info'" size="small">
                    {{ scope.row.expanded ? '已展开' : '可展开' }}
                  </el-tag>
                  <span v-else class="empty-status">-</span>
                </template>
              </el-table-column>
            </el-table>

            <div class="node-count" v-if="graphData.nodes && graphData.nodes.length > 0">
              当前展示 {{ graphData.nodes.length }} 个节点
            </div>
          </el-card>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Lock, Unlock } from '@element-plus/icons-vue';
import { useRouter, useRoute } from 'vue-router';
import * as d3 from 'd3';

// 导入API函数
import {
  getKnowledgeGraphData,
  searchGraphNodes,
  getSearchSuggestions,
  getNodeChildren
} from '@/api/binZhou/ld/knowledge/knowledgeGraph';

const router = useRouter();
const route = useRoute();

console.log('知识检索页面开始加载...');

// 响应式变量

const searchKeyword = ref('');
const graphSearchKeyword = ref('');
const searching = ref(false);
const loading = ref(false);
const graphContainer = ref(null);
const graphData = ref({ nodes: [], links: [] });
const selectedNode = ref(null);
const panelStyle = ref({});
const selectedSuggestion = ref(null);

// 展开状态管理
const expandedNodes = ref(new Set());

// 布局锁定状态
const layoutLocked = ref(true);

/**
 * 切换布局锁定状态
 */
const toggleLayoutLock = () => {
  layoutLocked.value = !layoutLocked.value;

  if (layoutLocked.value) {
    ElMessage.success('布局已锁定，节点位置固定');
    graphData.value.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        node.fx = node.x;
        node.fy = node.y;
        node.fixed = true;
      }
    });
  } else {
    ElMessage.info('布局已解锁，允许自由拖拽');
    graphData.value.nodes.forEach(node => {
      node.fx = null;
      node.fy = null;
      node.fixed = false;
    });
  }
};

// D3相关变量
let svg = null;
let simulation = null;
let nodePositions = new Map();

// 计算按层级统计的节点数量
const getNodeCountByLevel = (level) => {
  if (!graphData.value.nodes) return 0;
  return graphData.value.nodes.filter(node => node.level === level).length;
};

/**
 * 渲染D3图谱
 */
const renderGraph = () => {
  console.log('开始渲染稳定图谱...');

  const validNodes = graphData.value.nodes.filter(node => node && node.id && node.name);
  const validNodeIds = new Set(validNodes.map(node => node.id));

  const validLinks = graphData.value.links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source?.id || link.source);
    const targetId = typeof link.target === 'string' ? link.target : (link.target?.id || link.target);

    if (!sourceId || !targetId) return false;
    if (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId)) return false;

    return true;
  });

  console.log(`稳定渲染: ${validNodes.length}个节点, ${validLinks.length}个有效连接`);

  if (validNodes.length === 0) {
    console.warn('没有可显示的节点');
    return;
  }

  d3.select('#knowledge-graph').selectAll('*').remove();

  const container = document.getElementById('knowledge-graph');
  if (!container) {
    console.error('找不到图谱容器元素');
    return;
  }

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;
  console.log('容器尺寸:', { width, height });

  svg = d3.select('#knowledge-graph')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .call(d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

  const g = svg.append('g');

  const fixedNodes = new Set();
  validNodes.forEach(node => {
    if (node.fx !== undefined && node.fy !== undefined && node.fixed) {
      node.x = node.fx;
      node.y = node.fy;
      fixedNodes.add(node.id);
      console.log(`节点 ${node.name} 固定在位置: (${node.fx}, ${node.fy})`);
    }
  });

  const linksData = validLinks.map(link => ({
    source: typeof link.source === 'string' ? link.source : (link.source?.id || link.source),
    target: typeof link.target === 'string' ? link.target : (link.target?.id || link.target),
    type: link.type || '',
    label: link.label || ''
  }));

  const newNodes = validNodes.filter(node => !node.fixed);

  if (newNodes.length > 0) {
    simulation = d3.forceSimulation(newNodes)
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d.type, d.level) + 10))
      .alpha(0.3)
      .alphaDecay(0.1)
      .velocityDecay(0.9);

    setTimeout(() => {
      if (simulation) {
        simulation.stop();
        newNodes.forEach(node => {
          node.fx = node.x;
          node.fy = node.y;
          node.fixed = true;
          fixedNodes.add(node.id);
        });
      }
    }, 2000);
  } else {
    simulation = null;
  }

  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(linksData)
    .enter().append('line')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-opacity', 0.8)
    .attr('stroke-width', 1.8);

  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(validNodes)
    .enter().append('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', (event, d) => dragstarted(event, d, fixedNodes))
      .on('drag', (event, d) => dragged(event, d, fixedNodes))
      .on('end', (event, d) => dragended(event, d, fixedNodes)));

  node.append('circle')
    .attr('r', d => getNodeRadius(d.type, d.level))
    .attr('fill', d => getNodeColor(d.type, d.level))
    .attr('stroke', '#fff')
    .attr('stroke-width', d => d.hasChildren ? 3 : 2)
    .style('cursor', 'pointer')
    .style('stroke-dasharray', d => d.hasChildren && !d.expanded ? '5,5' : 'none');

  node.filter(d => d.hasChildren && !d.expanded)
    .append('text')
    .attr('class', 'expand-indicator')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#fff')
    .style('pointer-events', 'none')
    .text('+');

  node.append('text')
    .attr('class', 'node-label')
    .attr('dy', d => d.hasChildren && !d.expanded ? '2.15em' : '2em')
    .attr('text-anchor', 'middle')
    .style('font-size', d => getNodeFontSize(d.type, d.level))
    .style('font-weight', d => d.level <= 2 ? '700' : '600')
    .style('fill', '#0f172a')
    .style('paint-order', 'stroke')
    .style('stroke', '#ffffff')
    .style('stroke-width', 4)
    .style('stroke-linejoin', 'round')
    .style('pointer-events', 'none')
    .text(d => {
      const name = d.name || '未知';
      return name.length > 10 ? name.substring(0, 10) + '…' : name;
    });

  validNodes.forEach(node => {
    if (fixedNodes.has(node.id)) {
      node.fx = node.x;
      node.fy = node.y;
    }
  });

  node.filter(d => fixedNodes.has(d.id))
    .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);

  link.filter(d => {
    const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
    const targetId = typeof d.target === 'string' ? d.target : d.target.id;
    return fixedNodes.has(sourceId) && fixedNodes.has(targetId);
  })
    .attr('x1', d => {
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
      const sourceNode = validNodes.find(n => n.id === sourceId);
      return sourceNode ? sourceNode.x : 0;
    })
    .attr('y1', d => {
      const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
      const sourceNode = validNodes.find(n => n.id === sourceId);
      return sourceNode ? sourceNode.y : 0;
    })
    .attr('x2', d => {
      const targetId = typeof d.target === 'string' ? d.target : d.target.id;
      const targetNode = validNodes.find(n => n.id === targetId);
      return targetNode ? targetNode.x : 0;
    })
    .attr('y2', d => {
      const targetId = typeof d.target === 'string' ? d.target : d.target.id;
      const targetNode = validNodes.find(n => n.id === targetId);
      return targetNode ? targetNode.y : 0;
    });

  let clickTimer = null;
  node.on('click', (event, d) => {
    event.stopPropagation();
    event.sourceEvent?.stopPropagation();

    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      return;
    }

    clickTimer = setTimeout(() => {
      selectNode(d, event);
      clickTimer = null;
    }, 250);
  })
    .on('dblclick', (event, d) => {
      event.stopPropagation();
      event.sourceEvent?.stopPropagation();

      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }

      if (d.hasChildren && !d.expanded) {
        expandNode(d);
      } else if (d.hasChildren && d.expanded) {
        collapseNode(d);
      }
    })
    .on('contextmenu', (event, d) => {
      event.preventDefault();
      event.stopPropagation();
      if (d.hasChildren && d.expanded) {
        collapseNode(d);
      }
    });

  if (simulation) {
    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          const source = typeof d.source === 'object' ? d.source : validNodes.find(n => n.id === d.source);
          return source ? source.x : 0;
        })
        .attr('y1', d => {
          const source = typeof d.source === 'object' ? d.source : validNodes.find(n => n.id === d.source);
          return source ? source.y : 0;
        })
        .attr('x2', d => {
          const target = typeof d.target === 'object' ? d.target : validNodes.find(n => n.id === d.target);
          return target ? target.x : 0;
        })
        .attr('y2', d => {
          const target = typeof d.target === 'object' ? d.target : validNodes.find(n => n.id === d.target);
          return target ? target.y : 0;
        });

      node.filter(d => !fixedNodes.has(d.id))
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });
  }

  svg.on('click', () => {
    selectedNode.value = null;
  });

  console.log('稳定D3图谱渲染完成，固定节点数:', fixedNodes.size);
};

/**
 * 展开节点功能
 */
const expandNode = async (node) => {
  if (!node.hasChildren || node.expanded) {
    console.log('节点无法展开:', node);
    return;
  }

  try {
    loading.value = true;
    console.log('开始展开节点:', node.id);

    const response = await getNodeChildren(node.id);

    if (response.code === 200 && response.data) {
      const children = response.data.nodes || [];
      const childLinks = response.data.links || [];

      console.log(`获取到 ${children.length} 个子节点`);

      if (children.length === 0) {
        ElMessage.info('该节点没有子节点');
        return;
      }

      const parentX = node.x || node.fx || 400;
      const parentY = node.y || node.fy || 300;
      const childRadius = 60;

      children.forEach((child, index) => {
        const angle = (2 * Math.PI * index) / children.length;
        const x = parentX + childRadius * Math.cos(angle);
        const y = parentY + childRadius * Math.sin(angle);

        child.x = x;
        child.y = y;
        child.fx = x;
        child.fy = y;
        child.fixed = true;
        child.parentNodeId = node.id;

        console.log(`子节点 ${child.name} 固定在位置: (${x}, ${y})`);
      });

      graphData.value.nodes.push(...children);
      graphData.value.links.push(...childLinks);

      node.expanded = true;
      expandedNodes.value.add(node.id);

      nextTick(() => {
        renderGraph();
      });

      ElMessage.success(`已展开 ${children.length} 个子节点`);
    } else {
      ElMessage.error('获取子节点失败：' + (response.msg || '未知错误'));
    }
  } catch (error) {
    console.error('展开节点失败:', error);
    ElMessage.error('展开节点失败');
  } finally {
    loading.value = false;
  }
};

/**
 * 收缩节点功能
 */
const collapseNode = (node) => {
  if (!node.hasChildren || !node.expanded) {
    console.log('节点无法收缩:', node);
    return;
  }

  console.log('开始收缩节点:', node.id);

  const childNodeIds = graphData.value.nodes
    .filter(n => n.parentNodeId === node.id)
    .map(n => n.id);

  console.log('要移除的子节点:', childNodeIds);

  graphData.value.nodes = graphData.value.nodes.filter(n => !childNodeIds.includes(n.id));

  graphData.value.links = graphData.value.links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source?.id || link.source);
    const targetId = typeof link.target === 'string' ? link.target : (link.target?.id || link.target);
    return !childNodeIds.includes(sourceId) && !childNodeIds.includes(targetId);
  });

  node.expanded = false;
  expandedNodes.value.delete(node.id);

  nextTick(() => {
    renderGraph();
  });

  ElMessage.success(`已收缩 ${childNodeIds.length} 个子节点`);
};

/**
 * 收缩所有已展开的节点
 */
const collapseAllNodes = () => {
  const expandedNodesList = graphData.value.nodes.filter(node => node.expanded);

  if (expandedNodesList.length === 0) {
    ElMessage.info('没有已展开的节点');
    return;
  }

  expandedNodesList.forEach(node => {
    collapseNode(node);
  });

  ElMessage.success(`已收缩 ${expandedNodesList.length} 个节点`);
};

/**
 * 页面导航处理
 */
const handleSelect = (key) => {
  activeIndex.value = key;
  if (key === '1') {
    router.push({ name: 'CropVarietyFront' });
  } else if (key === '2') {
    router.push({ name: 'CropGraph' });
  } else if (key === '3') {
    router.push({ path: '/ld/featureQa' });
  }
};

/**
 * 顶部搜索框搜索
 */
const onSearch = () => {
  console.log('关键词:', searchKeyword.value);
  graphSearchKeyword.value = searchKeyword.value;
  handleGraphSearch();
};

/**
 * 设置关键词并搜索
 */
const setKeyword = (word) => {
  searchKeyword.value = word;
  onSearch();
};

/**
 * 重置图谱到初始状态
 */
const resetGraph = () => {
  selectedNode.value = null;
  nodePositions.clear();
  expandedNodes.value.clear();
  nextTick(() => {
    loadGraphData('crop_1');
  });
  ElMessage.success('图谱已重置到初始状态');
};

/**
 * 初始化图谱
 */
const initGraph = async () => {
  loading.value = true;
  try {
    console.log('开始加载图谱数据...');

    const urlSearchKeyword = route.query.searchKeyword;
    if (urlSearchKeyword) {
      console.log('从URL获取搜索关键词:', urlSearchKeyword);
      searchKeyword.value = urlSearchKeyword;
      graphSearchKeyword.value = urlSearchKeyword;
      await handleGraphSearchWithKeyword(urlSearchKeyword);
    } else {
      await loadGraphData('crop_1');
    }

    console.log('图谱数据加载完成');
  } catch (error) {
    console.error('初始化图谱失败:', error);
    ElMessage.error('初始化图谱失败');
  } finally {
    loading.value = false;
  }
};

/**
 * 使用关键词搜索图谱
 */
const handleGraphSearchWithKeyword = async (keyword) => {
  try {
    console.log('使用关键词搜索图谱:', keyword);
    const response = await searchGraphNodes(keyword);
    console.log('搜索结果:', response);

    if (response.code === 200 && response.data && response.data.centerNode) {
      await loadGraphData(response.data.centerNode);

      const searchType = response.data.searchType || 'crop';
      if (searchType === 'variety') {
        ElMessage.success(`已找到品种"${response.data.keyword}"并切换到对应的知识图谱`);
      } else {
        ElMessage.success(`已切换到${response.data.keyword}的知识图谱`);
      }
    } else {
      await loadGraphData('crop_1');
      ElMessage.warning(response.msg || '未找到相关节点，已加载默认图谱');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    await loadGraphData('crop_1');
    ElMessage.error('搜索失败，已加载默认图谱');
  }
};

/**
 * 加载图谱数据
 */
const loadGraphData = async (centerNode = 'crop_1') => {
  try {
    console.log('请求图谱数据，中心节点:', centerNode);
    const response = await getKnowledgeGraphData(centerNode);
    console.log('获取到的原始数据:', response);

    if (response.code === 200) {
      graphData.value = {
        nodes: response.data.nodes || [],
        links: response.data.links || []
      };

      expandedNodes.value.clear();

      console.log('数据详情:', {
        nodes: graphData.value.nodes.length,
        links: graphData.value.links.length
      });

      ElMessage.success(`图谱数据加载成功：${graphData.value.nodes.length}个节点（优化布局）`);

      selectedNode.value = null;
      nodePositions.clear();

      nextTick(() => {
        console.log('准备渲染优化图谱');
        renderGraph();
      });
    } else {
      ElMessage.error('获取图谱数据失败：' + response.msg);
    }
  } catch (error) {
    console.error('加载图谱数据失败:', error);
    ElMessage.error('加载图谱数据失败');
    throw error;
  }
};

/**
 * 获取节点半径
 */
const getNodeRadius = (type, level) => {
  const levelRadiusMap = {
    1: 34,
    2: 28,
    3: 23,
    4: 18
  };

  return levelRadiusMap[level] || 22;
};

/**
 * 获取节点颜色
 */
const getNodeColor = (type, level) => {
  if (level === 1) return '#3b82f6';
  if (level === 2) return '#60a5fa';

  if (level === 3) {
    const typeColorMap = {
      variety: '#14b8a6',
      disease: '#f97316',
      pest: '#eab308',
      stress: '#8b5cf6'
    };
    return typeColorMap[type] || '#22c55e';
  }

  if (level === 4) return '#22c55e';

  const typeColorMap = {
    crop: '#3b82f6',
    variety_type: '#60a5fa',
    disease_type: '#60a5fa',
    pest_type: '#60a5fa',
    stress_type: '#60a5fa',
    variety: '#14b8a6',
    disease: '#f97316',
    pest: '#eab308',
    stress: '#8b5cf6',
    feature: '#22c55e'
  };
  return typeColorMap[type] || '#94a3b8';
};

/**
 * 获取节点字体大小
 */
const getNodeFontSize = (type, level) => {
  const levelSizeMap = {
    1: '14px',
    2: '13px',
    3: '12px',
    4: '11px'
  };

  return levelSizeMap[level] || '12px';
};

/**
 * 选中节点
 */
const selectNode = (node, event) => {
  selectedNode.value = node;
  console.log('选中节点:', node);

  panelStyle.value = {
    position: 'fixed',
    left: (event.clientX + 10) + 'px',
    top: (event.clientY - 50) + 'px',
    zIndex: 1000
  };
};

/**
 * 获取节点类型标签
 */
const getNodeTypeLabel = (type) => {
  const labelMap = {
    crop: '作物',
    variety_type: '品种类型',
    disease_type: '病害类型',
    pest_type: '虫害类型',
    stress_type: '胁迫类型',
    variety: '品种',
    disease: '病害',
    pest: '虫害',
    stress: '非生物胁迫',
    feature: '特征'
  };
  return labelMap[type] || type || '未知';
};

/**
 * 获取标签类型样式
 */
const getTypeTagType = (type) => {
  const typeMap = {
    crop: 'primary',
    variety_type: 'primary',
    disease_type: 'primary',
    pest_type: 'primary',
    stress_type: 'primary',
    variety: 'info',
    disease: 'warning',
    pest: 'warning',
    stress: 'info',
    feature: 'success'
  };
  return typeMap[type] || 'info';
};

/**
 * 获取搜索建议
 */
const querySearchSuggestions = async (queryString, callback) => {
  if (!queryString || queryString.length < 1) {
    callback([]);
    return;
  }

  try {
    const response = await getSearchSuggestions(queryString);
    if (response.code === 200) {
      callback(response.data || []);
    } else {
      callback([]);
    }
  } catch (error) {
    console.error('获取搜索建议失败:', error);
    callback([]);
  }
};

/**
 * 处理搜索建议选择
 */
const handleSuggestionSelect = (item) => {
  console.log('选择搜索建议:', item);
  selectedSuggestion.value = item;
  graphSearchKeyword.value = item.name;
  handleGraphSearchWithNode(item.id);
};

/**
 * 使用指定节点ID搜索
 */
const handleGraphSearchWithNode = async (nodeId) => {
  searching.value = true;
  try {
    console.log('使用节点ID搜索:', nodeId);
    const response = await searchGraphNodes(graphSearchKeyword.value, nodeId);
    console.log('搜索结果:', response);

    if (response.code === 200 && response.data && response.data.centerNode) {
      await loadGraphData(response.data.centerNode);

      const searchType = response.data.searchType || 'crop';
      if (searchType === 'variety') {
        ElMessage.success(`已切换到品种"${graphSearchKeyword.value}"的知识图谱`);
      } else {
        ElMessage.success(`已切换到${graphSearchKeyword.value}的知识图谱`);
      }
    } else {
      ElMessage.warning(response.msg || '搜索失败');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    ElMessage.error('搜索失败');
  } finally {
    searching.value = false;
  }
};

/**
 * 获取建议项标签类型
 */
const getSuggestionTagType = (type) => {
  const typeMap = {
    crop: 'primary',
    variety: 'primary',
    disease: 'warning',
    pest: 'warning',
    feature: 'success'
  };
  return typeMap[type] || '';
};

/**
 * 获取建议项类型标签
 */
const getSuggestionTypeLabel = (type) => {
  const labelMap = {
    crop: '作物',
    variety: '品种',
    disease: '病害',
    pest: '虫害',
    feature: '特征'
  };
  return labelMap[type] || type;
};

/**
 * 查看节点详情
 */
const viewNodeDetail = (node) => {
  console.log('查看节点详情:', node);

  try {
    if (node.type === 'variety') {
      router.push({
        name: 'cropVarietyFront',
        query: {
          varietyId: node.id,
          varietyName: node.name
        }
      });
    } else if (['disease_type', 'pest_type', 'stress_type'].includes(node.type)) {
      let cropType = '';
      let categoryType = '';

      if (node.name.includes('小麦')) {
        cropType = '小麦';
      } else if (node.name.includes('玉米')) {
        cropType = '玉米';
      }

      if (node.type === 'disease_type') {
        categoryType = '病害';
      } else if (node.type === 'pest_type') {
        categoryType = '虫害';
      } else if (node.type === 'stress_type') {
        categoryType = '非生物胁迫';
      }

      console.log('🎯 跳转参数:', { cropType, categoryType });

      router.push({
        name: 'CropDiseasePest',
        query: {
          crop: cropType,
          category: categoryType,
          autoSearch: 'true'
        }
      });

      ElMessage.success(`正在查看${cropType}${categoryType}详情...`);
    } else if (['disease', 'pest', 'stress'].includes(node.type)) {
      router.push({
        path: '/pest-disease-detail',
        query: {
          name: node.name,
          type: getNodeTypeLabel(node.type)
        }
      });
    } else if (node.type === 'crop') {
      router.push({
        name: 'cropVarietyFront',
        query: {
          cropId: node.id,
          cropName: node.name
        }
      });
    } else {
      ElMessage.info(`${node.name} - ${getNodeTypeLabel(node.type)}节点暂无详情页面`);
    }
  } catch (error) {
    console.error('页面跳转失败:', error);
    ElMessage.error('页面跳转失败，请检查路由配置');
  }
};

const dragstarted = (event, d, fixedNodes) => {
  if (layoutLocked.value) {
    console.log(`布局已锁定，禁止拖拽节点 ${d.name}`);
    return;
  }

  if (fixedNodes && fixedNodes.has(d.id)) {
    console.log(`节点 ${d.name} 是固定节点，禁止拖拽`);
    return;
  }

  if (simulation && !event.active) {
    simulation.alphaTarget(0.3).restart();
  }
  d.fx = d.x;
  d.fy = d.y;
};

const dragged = (event, d, fixedNodes) => {
  if (layoutLocked.value) return;
  if (fixedNodes && fixedNodes.has(d.id)) return;

  d.fx = event.x;
  d.fy = event.y;
};

const dragended = (event, d, fixedNodes) => {
  if (layoutLocked.value) return;
  if (fixedNodes && fixedNodes.has(d.id)) return;

  if (simulation && !event.active) {
    simulation.alphaTarget(0);
  }

  nodePositions.set(d.id, { x: d.x, y: d.y });

  if (!layoutLocked.value) {
    d.fx = d.x;
    d.fy = d.y;
  }
};

/**
 * 图谱搜索处理
 */
const handleGraphSearch = async () => {
  if (!graphSearchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词');
    return;
  }

  if (selectedSuggestion.value && selectedSuggestion.value.name === graphSearchKeyword.value) {
    await handleGraphSearchWithNode(selectedSuggestion.value.id);
    return;
  }

  searching.value = true;
  try {
    console.log('搜索关键词:', graphSearchKeyword.value);
    const response = await searchGraphNodes(graphSearchKeyword.value);
    console.log('搜索结果:', response);

    if (response.code === 200 && response.data && response.data.centerNode) {
      await loadGraphData(response.data.centerNode);

      const searchType = response.data.searchType || 'crop';
      if (searchType === 'variety') {
        ElMessage.success(`已找到品种"${response.data.keyword}"并切换到对应的知识图谱`);
      } else {
        ElMessage.success(`已切换到${response.data.keyword}的知识图谱`);
      }
    } else {
      ElMessage.warning(response.msg || '未找到相关节点，请尝试搜索作物名称（如：小麦、玉米）或品种名称');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    ElMessage.error('搜索失败');
  } finally {
    searching.value = false;
  }
};

// 生命周期
onMounted(() => {
  console.log('组件已挂载，开始初始化...');
  nextTick(() => {
    initGraph();
  });
});

console.log('知识检索页面加载完成');
</script>

<style scoped>
.kg-page {
  min-height: 100vh;
  color: #1f2937;
  background: #f8fafc;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

.kg-menu {
  height: 56px;
  padding: 0 32px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.kg-menu :deep(.el-menu-item) {
  height: 56px;
  line-height: 56px;
  font-size: 15px;
}

.hero-card {
  margin: 18px 20px 0;
  padding: 30px 24px 26px;
  text-align: center;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.hero-title {
  color: #111827;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.hero-subtitle {
  margin-top: 6px;
  color: #64748b;
  font-size: 14px;
}

.hero-search {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

.hero-input {
  width: min(680px, 80vw);
}

.hero-input :deep(.el-input__wrapper),
.hero-input :deep(.el-input-group__append) {
  height: 44px;
  box-shadow: 0 0 0 1px #dbe3ef inset;
}

.hero-input :deep(.el-input-group__append) {
  padding: 0;
  overflow: hidden;
}

.hero-input :deep(.el-input-group__append .el-button) {
  height: 44px;
  padding: 0 22px;
  border-radius: 0;
}

.hot-words {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}

.knowledge-shell {
  margin: 16px 20px 20px;
  padding: 16px;
  border-radius: 18px;
  background: #eef4fb;
}

.graph-toolbar,
.graph-legend,
.graph-main,
.side-card {
  border: none;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
}

.graph-toolbar {
  min-height: 64px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-search {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.graph-search-input {
  width: min(460px, 42vw);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.suggestion-item {
  padding: 4px 0;
}

.suggestion-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.suggestion-name {
  color: #1f2937;
  font-weight: 600;
}

.suggestion-desc {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 12px;
}

.graph-legend {
  margin-top: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.legend-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot.crop { background: #3b82f6; }
.legend-dot.type { background: #60a5fa; }
.legend-dot.variety { background: #14b8a6; }
.legend-dot.disease { background: #f97316; }
.legend-dot.pest { background: #eab308; }
.legend-dot.stress { background: #8b5cf6; }
.legend-dot.feature { background: #22c55e; }

.legend-tip {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.main-content {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: stretch;
}

.graph-left {
  min-width: 0;
  display: flex;
}

.graph-main {
  position: relative;
  width: 100%;
  height: calc(100vh - 292px);
  min-height: 620px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

#knowledge-graph {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background:
    radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.22) 1px, transparent 0),
    #ffffff;
  background-size: 24px 24px;
  cursor: grab;
}

#knowledge-graph:active {
  cursor: grabbing;
}

.graph-right {
  min-width: 0;
  height: calc(100vh - 292px);
  min-height: 620px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
}

.side-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.side-card :deep(.el-card__header) {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
}

.side-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.side-card-header {
  color: #111827;
  font-size: 15px;
  font-weight: 700;
}

.data-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat-item {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.stat-item span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.stat-item strong {
  display: block;
  margin-top: 5px;
  color: #1f2937;
  font-size: 20px;
  line-height: 1;
}

.stat-item strong.crop { color: #3b82f6; }
.stat-item strong.type { color: #60a5fa; }
.stat-item strong.variety { color: #14b8a6; }
.stat-item strong.feature { color: #22c55e; }

.nodes-card {
  min-height: 0;
}

.nodes-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.nodes-card :deep(.el-table) {
  flex: 1;
  min-height: 0;
  font-size: 12px;
}

.nodes-card :deep(.el-table__inner-wrapper) {
  height: 100%;
}

.nodes-card :deep(.el-scrollbar__wrap) {
  max-height: none !important;
}

.empty-status {
  color: #94a3b8;
  font-size: 12px;
}

.node-count {
  margin-top: 10px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.node-info-panel {
  min-width: 220px;
  max-width: 320px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(8px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 1px solid #eef2f7;
}

.panel-header h4 {
  margin: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.panel-content p {
  margin: 8px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
}

.panel-content strong {
  color: #334155;
}

.panel-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

:deep(.expand-indicator) {
  font-family: monospace;
  font-size: 12px !important;
  font-weight: bold !important;
  fill: #fff !important;
}

:deep(.node-label) {
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  dominant-baseline: middle;
}

:deep(.links line) {
  stroke: #cbd5e1;
  stroke-opacity: 0.72;
  stroke-width: 1.6px;
}

:deep(.nodes circle) {
  cursor: pointer;
  transition: all 0.18s ease;
  filter: drop-shadow(0 3px 7px rgba(15, 23, 42, 0.14));
}

:deep(.nodes circle:hover) {
  stroke-width: 4px;
  filter: brightness(1.08) drop-shadow(0 6px 12px rgba(15, 23, 42, 0.24));
}

:deep(.nodes text) {
  pointer-events: none;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}

:deep(.nodes circle[stroke-dasharray]) {
  animation: dash 2s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

@media (max-width: 1200px) {
  .graph-toolbar,
  .graph-legend {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar-search,
  .toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .graph-search-input {
    width: min(520px, 100%);
  }

  .main-content {
    grid-template-columns: 1fr;
  }

  .graph-main {
    height: 620px;
    min-height: 620px;
  }

  .graph-right {
    height: auto;
    min-height: 0;
    grid-template-rows: auto auto;
  }

  .data-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .legend-tip {
    white-space: normal;
  }
}

@media (max-width: 768px) {
  .kg-menu {
    padding: 0 12px;
  }

  .hero-card,
  .knowledge-shell {
    margin-left: 12px;
    margin-right: 12px;
  }

  .hero-title {
    font-size: 23px;
  }

  .hero-input,
  .graph-search-input {
    width: 100%;
  }

  .toolbar-search,
  .toolbar-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions :deep(.el-button),
  .toolbar-search :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .data-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .graph-main {
    min-height: 520px;
    height: 520px;
  }
}
</style>

<style scoped>
/* FarmerTask 风格附加样式：仅覆盖视觉表现。 */
.kg-page {
--ft-green: #2f7d5c;
  --ft-green-deep: #245f47;
  --ft-green-mid: #4f8f6b;
  --ft-green-soft: #edf5e9;
  --ft-green-pale: #f8fbf5;
  --ft-text: #24352d;
  --ft-text-secondary: #526b5c;
  --ft-muted: #819184;
  --ft-border: #d8e8d9;
  --ft-border-soft: #e5eee2;
  --ft-shadow: 0 12px 28px rgba(58, 88, 63, 0.09);
  min-height: calc(100vh - 84px);
  padding: 18px;
  color: var(--ft-text);
  background:
    radial-gradient(circle at 10% 0%, rgba(127, 168, 138, 0.17), transparent 30%),
    linear-gradient(180deg, #f4f7ef 0%, #eef4e8 100%);
  box-sizing: border-box;
}

.kg-page *,
.kg-page *::before,
.kg-page *::after {
  box-sizing: border-box;
}

.kg-page .kg-menu {
  min-height: 56px;
  padding: 0 10px;
  margin-bottom: 14px;
  background: rgba(255,255,255,.94);
  border: 1px solid var(--ft-border);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(58,88,63,.08);
}

.kg-page .kg-menu :deep(.el-menu-item) {
  min-width: 104px;
  color: var(--ft-text-secondary);
  font-weight: 650;
  border-bottom: 0;
}

.kg-page .kg-menu :deep(.el-menu-item:hover) {
  color: var(--ft-green);
  background: #f1f7ef;
}

.kg-page .kg-menu :deep(.el-menu-item.is-active) {
  color: var(--ft-green);
  background: #edf5e9;
  border-bottom: 3px solid var(--ft-green);
}

.kg-page .hero-card {
  padding: 22px;
  margin-bottom: 16px;
  background:
    radial-gradient(circle at 90% 10%, rgba(127,168,138,.16), transparent 30%),
    rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 15px;
  box-shadow: 0 11px 27px rgba(58,88,63,.08);
}

.kg-page .hero-search {
  max-width: 820px;
  margin: 0 auto;
}

.kg-page .hero-input :deep(.el-input__wrapper) {
  min-height: 48px;
  padding-left: 16px;
  background: #ffffff;
  border-radius: 12px 0 0 12px;
  box-shadow: 0 0 0 1px #cddfcd inset;
}

.kg-page .hero-input :deep(.el-input-group__append) {
  padding: 0;
  overflow: hidden;
  background: var(--ft-green);
  border: 0;
  border-radius: 0 12px 12px 0;
  box-shadow: none;
}

.kg-page .hero-input :deep(.el-input-group__append .el-button) {
  min-width: 86px;
  height: 48px;
  color: #ffffff;
  background: var(--ft-green);
  border: 0;
}

.kg-page .hot-words {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 8px 14px;
  color: #7c8f80;
  font-size: 12px;
}

.kg-page .knowledge-shell {
  overflow: hidden;
  background: rgba(255,255,255,.95);
  border: 1px solid var(--ft-border);
  border-radius: 16px;
  box-shadow: var(--ft-shadow);
}

.kg-page .graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 66px;
  padding: 12px 16px;
  gap: 14px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
  border-bottom: 1px solid #e1ebe0;
}

.kg-page .toolbar-search,
.kg-page .toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.kg-page .graph-search-input {
  width: 360px;
}

.kg-page .graph-legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 8px 16px;
  background: #fafcf9;
  border-bottom: 1px solid #e6eee3;
}

.kg-page .legend-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px 15px;
}

.kg-page .legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #657a69;
  font-size: 11px;
}

.kg-page .legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(127,168,138,.10);
}

.kg-page .main-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  min-height: 650px;
}

.kg-page .graph-left {
  min-width: 0;
  padding: 14px;
  background:
    linear-gradient(rgba(66,102,76,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66,102,76,.03) 1px, transparent 1px),
    #f7faf5;
  background-size: 28px 28px;
  border-right: 1px solid #e1ebe0;
}

.kg-page .graph-main {
  position: relative;
  min-height: 620px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dce8da;
  border-radius: 12px;
}

.kg-page #knowledge-graph {
  width: 100%;
  min-height: 620px;
}

.kg-page .node-info-panel {
  overflow: hidden;
  background: rgba(255,255,255,.97);
  border: 1px solid #cddfcd;
  border-radius: 12px;
  box-shadow: 0 14px 30px rgba(43,79,51,.18);
  backdrop-filter: blur(8px);
}

.kg-page .panel-header {
  padding: 11px 13px;
  background: #edf5e9;
  border-bottom: 1px solid #dce8da;
}

.kg-page .panel-header h4 {
  color: #294635;
}

.kg-page .panel-content {
  padding: 13px;
  color: #5b7161;
}

.kg-page .panel-actions {
  display: flex;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 7px;
}

.kg-page .graph-right {
  padding: 14px;
  background: #f8fbf5;
}

.kg-page .side-card {
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid #dce8da;
  border-radius: 12px;
}

.kg-page .side-card :deep(.el-card__header) {
  padding: 13px 14px;
  background: linear-gradient(180deg, #ffffff, #f8fbf5);
}

.kg-page .side-card-header {
  color: #315440;
  font-weight: 800;
}

.kg-page .data-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 9px;
}

.kg-page .stat-item {
  min-height: 76px;
  padding: 11px;
  background: linear-gradient(145deg, #f8fbf5, #edf5e9);
  border: 1px solid #dce8da;
  border-radius: 10px;
}

.kg-page .stat-item span {
  display: block;
  color: #7c8f80;
  font-size: 11px;
}

.kg-page .stat-item strong {
  display: block;
  margin-top: 8px;
  color: var(--ft-green);
  font-size: 22px;
}

.kg-page .node-count {
  padding-top: 10px;
  color: #7c8f80;
  font-size: 11px;
  text-align: right;
}

.kg-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--ft-green);
  --el-button-border-color: var(--ft-green);
  --el-button-hover-bg-color: #3f8d69;
  --el-button-hover-border-color: #3f8d69;
}

.kg-page :deep(.el-table) {
  --el-table-header-bg-color: #f1f6ee;
  --el-table-row-hover-bg-color: #f4f8f1;
}

@media (max-width: 1100px) {
  .kg-page .main-content {
    grid-template-columns: 1fr;
  }

  .kg-page .graph-left {
    border-right: 0;
    border-bottom: 1px solid #e1ebe0;
  }
}

@media (max-width: 760px) {
  .kg-page {
    padding: 10px;
  }

  .kg-page .graph-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .kg-page .graph-search-input,
  .kg-page .toolbar-search {
    width: 100%;
  }

  .kg-page .toolbar-search {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
