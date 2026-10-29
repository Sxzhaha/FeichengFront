import { createWebHistory, createRouter } from 'vue-router'

/* Layout */
import Layout from '@/layout'

export const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index.vue')
      }
    ]
  },
  {
    path: '/disease-report',
    component: () => import('@/views/binZhou/sxz/diseaseReport/index.vue'),
    hidden: true
  },
  {
    path: '/login',
    component: () => import('@/views/login'),
    hidden: true
  },
  {
    path: '/register',
    component: () => import('@/views/register'),
    hidden: true
  },
  {
    path: '/xwq/featurePest',
    component: () => import('@/views/binZhou/xwq/featurePest/index.vue'),
    hidden: true
  },
  {
    path: '/disease-analysis',
    component: () => import('@/views/binZhou/sxz/diseaseAnalysis/index.vue'),
    name: 'DiseaseAnalysis',
    hidden: true,
    meta: {
      title: '病虫害数据分析'
    }
  },
  {
    path: '/disease-images',
    component: () =>
      import('@/views/binZhou/sxz/diseaseImage_front/index.vue'),
    name: 'DiseaseImages',
    hidden: true,
    meta: {
      title: '病虫害识别图片'
    }
  },
  {
    path: '/ld/featureQa',
    component: () => import('@/views/binZhou/ld/featureQa/index.vue'),
    hidden: true
  },
  {
    path: '/ld',
    component: () => import('@/views/binZhou/ld/knowledgeFront/Layout.vue'),
    hidden: true,
    children: [
      {
        path: 'cropVariety',
        component: () => import('@/views/binZhou/ld/knowledgeFront/cropVariety.vue'),
        name: 'CropVarietyFront'
      },
      {
        path: 'cropGraph',
        component: () => import('@/views/binZhou/ld/knowledgeFront/cropGraph.vue'),
        name: 'CropGraph'
      },
      {
        path: 'featureWiki',
        component: () => import('@/views/binZhou/ld/featureWiki/index.vue'),
        name: 'CropDiseasePest'
      },
      {
        path: 'varietyDetail',
        component: () => import('@/views/binZhou/ld/knowledgeFront/varietyDetail.vue'),
        name: 'VarietyDetail'
      }
    ]
  },
  {
    path: '/ld/featureVariety',
    component: () => import('@/views/binZhou/ld/featureVariety/index.vue'),
    hidden: true
  },
  {
    path: '/farmerTask',
    component: () => import('@/views/binZhou/ylm/farmerTask/index.vue'),
    roles: ['admin', 'common'],
    hidden: true,
    meta: {
      title: '农事管理'
    }
  },
  {
    path: '/ylm/farmerTask',
    redirect: '/farmerTask',
    roles: ['admin', 'common'],
    hidden: true
  },
  {
    path: '/ld/featureIdentification',
    component: () =>
      import('@/views/binZhou/ld/featureIdentification/index.vue'),
    hidden: true
  },
  {
    path: '/xwq/historyDiagnosis',
    component: () =>
      import('@/views/binZhou/xwq/historyDiagnosis/index.vue'),
    name: 'HistoryDiagnosis',
    hidden: true
  },
  {
    path: '/phenology',
    component: () =>
      import('@/views/binZhou/xwq/featurePhenology/index.vue'),
    hidden: true,
    meta: {
      title: '物候期智能识别'
    }
  },
  {
    path: '/ld/iot/index',
    component: () => import('@/views/binZhou/ld/iot/index/index.vue'),
    hidden: true
  },
  {
    path: '/ld/iot/intelligentPerception',
    component: () => import('@/views/binZhou/ld/iot/intelligentPerception/index.vue'),
    hidden: true,
    meta: {
      title: '智能感知'
    }
  },
  {
    path: '/ld/iot/hierarchy',
    component: () => import('@/views/binZhou/ld/iot/hierarchy/index.vue'),
    hidden: true
  },
  {
    path: '/ld/visual/index',
    component: () => import('@/views/binZhou/ld/visual/index.vue'),
    hidden: true
  },
  {
    path: '/xwq/pestMonitor/analysis',
    component: () =>
      import('@/views/binZhou/xwq/pestMonitor/analysis/index.vue'),
    hidden: true,
    meta: {
      title: '虫情分析'
    }
  },
  {
    path: '/xwq/pestMonitor/image',
    component: () =>
      import('@/views/binZhou/xwq/pestMonitor/image/index.vue'),
    hidden: true,
    meta: {
      title: '虫情图片'
    }
  },
  {
    path: '/xwq/pestMonitor/ai',
    component: () =>
      import('@/views/binZhou/xwq/pestMonitor/ai/index.vue'),
    hidden: true,
    meta: {
      title: '虫情预测'
    }
  },
  {
    path: '/xwq/pestMonitor/report',
    component: () =>
      import('@/views/binZhou/xwq/pestMonitor/report/index.vue'),
    hidden: true,
    meta: {
      title: '虫情报告'
    }
  },
  {
    path: '/xwq/phenologyMonitor/analysis',
    component: () =>
      import('@/views/binZhou/xwq/phenologyMonitor/analysis/index.vue'),
    hidden: true,
    meta: {
      title: '物候期分析'
    }
  },
  {
    path: '/xwq/phenologyMonitor/image',
    component: () =>
      import('@/views/binZhou/xwq/phenologyMonitor/image/index.vue'),
    hidden: true,
    meta: {
      title: '物候期图片'
    }
  },
  {
    path: '/xwq/phenologyMonitor/ai',
    component: () =>
      import('@/views/binZhou/xwq/phenologyMonitor/ai/index.vue'),
    hidden: true,
    meta: {
      title: '物候期预测'
    }
  },
  {
    path: '/xwq/phenologyMonitor/report',
    component: () =>
      import('@/views/binZhou/xwq/phenologyMonitor/report/index.vue'),
    hidden: true,
    meta: {
      title: '物候期报告'
    }
  },
  {
    path: '/featureDisease',
    component: () =>
      import('@/views/binZhou/sxz/featureDisease/index.vue'),
    hidden: true,
    meta: {
      title: '病虫害识别'
    }
  },
  {
  path: '/sxz/disease-auto-task',
  component: () => import('@/views/binZhou/sxz/diseaseAutoTask/index.vue'),
  name: 'sxz_DiseaseAutoTask',
  hidden: true,
  meta: { title: '病虫害自动识别任务' }
  },
  {
    path: '/diseaseHistory',
    component: () =>
      import('@/views/binZhou/xwq/diseaseHistory/index'),
    hidden: true,
    meta: {
      title: '病虫害识别历史结果'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/error/404'),
    hidden: true
  },
  {
    path: '/401',
    component: () => import('@/views/error/401'),
    hidden: true
  },
  {
    path: '/home',
    component: () => import('@/views/home'),
    hidden: true
  },
  {
    path: '',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: '/index',
        component: () => import('@/views/index'),
        name: 'Index',
        meta: {
          title: '首页',
          icon: 'dashboard',
          affix: true
        }
      }
    ]
  },
  {
    path: '/lock',
    component: () => import('@/views/lock'),
    hidden: true,
    meta: {
      title: '锁定屏幕'
    }
  },
  {
    path: '/user',
    component: Layout,
    hidden: true,
    redirect: 'noredirect',
    children: [
      {
        path: 'profile/:activeTab?',
        component: () =>
          import('@/views/system/user/profile/index'),
        name: 'Profile',
        meta: {
          title: '个人中心',
          icon: 'user'
        }
      }
    ]
  }
]

// 动态路由，基于用户权限动态加载
export const dynamicRoutes = [
  {
    path: '/system/user-auth',
    component: Layout,
    hidden: true,
    permissions: ['system:user:edit'],
    children: [
      {
        path: 'role/:userId(\\d+)',
        component: () =>
          import('@/views/system/user/authRole'),
        name: 'AuthRole',
        meta: {
          title: '分配角色',
          activeMenu: '/system/user'
        }
      }
    ]
  },
  {
    path: '/system/role-auth',
    component: Layout,
    hidden: true,
    permissions: ['system:role:edit'],
    children: [
      {
        path: 'user/:roleId(\\d+)',
        component: () =>
          import('@/views/system/role/authUser'),
        name: 'AuthUser',
        meta: {
          title: '分配用户',
          activeMenu: '/system/role'
        }
      }
    ]
  },
  {
    path: '/system/dict-data',
    component: Layout,
    hidden: true,
    permissions: ['system:dict:list'],
    children: [
      {
        path: 'index/:dictId(\\d+)',
        component: () =>
          import('@/views/system/dict/data'),
        name: 'Data',
        meta: {
          title: '字典数据',
          activeMenu: '/system/dict'
        }
      }
    ]
  },
  {
    path: '/monitor/job-log',
    component: Layout,
    hidden: true,
    permissions: ['monitor:job:list'],
    children: [
      {
        path: 'index/:jobId(\\d+)',
        component: () =>
          import('@/views/monitor/job/log'),
        name: 'JobLog',
        meta: {
          title: '调度日志',
          activeMenu: '/monitor/job'
        }
      }
    ]
  },
  {
    path: '/tool/gen-edit',
    component: Layout,
    hidden: true,
    permissions: ['tool:gen:edit'],
    children: [
      {
        path: 'index/:tableId(\\d+)',
        component: () =>
          import('@/views/tool/gen/editTable'),
        name: 'GenEdit',
        meta: {
          title: '修改生成配置',
          activeMenu: '/tool/gen'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/bzhou/'),
  routes: constantRoutes,

  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    return {
      top: 0
    }
  }
})

export default router