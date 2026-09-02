import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { guest: true } },

  // ── 独立页面（不走 Layout） ──
  {
    path: '/admin',
    name: 'Management',
    component: () => import('@/views/admin/Management.vue'),
    meta: { requiresAuth: true, roles: ['teacher', 'admin'] },
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: () => import('@/views/student/AnalyticsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/exam',
    name: 'Exam',
    component: () => import('@/views/student/ExamPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/discussion',
    name: 'DiscussionList',
    component: () => import('@/views/discussion/DiscussionList.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/discussion/:id',
    name: 'DiscussionDetail',
    component: () => import('@/views/discussion/DiscussionDetail.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/messages',
    name: 'MessageList',
    component: () => import('@/views/messages/MessageList.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/messages/:userId',
    name: 'MessageThread',
    component: () => import('@/views/messages/MessageList.vue'),
    meta: { requiresAuth: true },
  },

  // ── 答疑主页（Layout + 侧边栏） ──
  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/student/QAPage.vue'),
      },
      {
        path: 'teacher/analytics',
        name: 'ClassAnalytics',
        component: () => import('@/views/teacher/ClassAnalytics.vue'),
        meta: { roles: ['teacher', 'admin'] },
      },
      {
        path: 'teacher/questions',
        name: 'QuestionBank',
        component: () => import('@/views/teacher/QuestionBank.vue'),
        meta: { roles: ['teacher', 'admin'] },
      },
      {
        path: 'teacher/exercises/upload',
        name: 'ExerciseUpload',
        component: () => import('@/views/teacher/ExerciseUpload.vue'),
        meta: { roles: ['teacher', 'admin'] },
      },
      {
        path: 'teacher/test-bank',
        name: 'TestQuestionBank',
        component: () => import('@/views/teacher/TestQuestionBank.vue'),
        meta: { roles: ['teacher', 'admin'] },
      },
      {
        path: 'admin/test-bank',
        name: 'AdminTestQuestionBank',
        component: () => import('@/views/teacher/TestQuestionBank.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'teacher/materials/upload',
        name: 'MaterialUpload',
        component: () => import('@/views/teacher/MaterialUpload.vue'),
        meta: { roles: ['teacher', 'admin'] },
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagement.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/knowledge-tree',
        name: 'KnowledgeTreeEdit',
        component: () => import('@/views/admin/KnowledgeTreeEdit.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/knowledge-review',
        name: 'KnowledgeReview',
        component: () => import('@/views/admin/KnowledgeReview.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/knowledge-chunks',
        name: 'KnowledgeChunks',
        component: () => import('@/views/admin/KnowledgeChunks.vue'),
        meta: { roles: ['admin', 'teacher'] },
      },
      {
        path: 'admin/question-bank',
        name: 'AdminQuestionBank',
        component: () => import('@/views/admin/QuestionBankAdmin.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/parse-review',
        name: 'ParseReview',
        component: () => import('@/views/admin/ParseReview.vue'),
        meta: { roles: ['admin'] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return next('/login')
  if (to.meta.guest && auth.isAuthenticated) return next('/')
  if (to.meta.roles) {
    if (!to.meta.roles.includes(auth.user?.role)) return next('/')
  }
  next()
})

export default router
