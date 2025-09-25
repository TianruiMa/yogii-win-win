import { createRouter, createWebHistory } from 'vue-router'
import TabNavigation from '../components/TabNavigation.vue'
import GameView from '../views/GameView.vue'
import ProfileView from '../views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: TabNavigation,
      children: [
        {
          path: '',
          redirect: '/game'
        },
        {
          path: '/game',
          name: 'Game',
          component: GameView
        },
        {
          path: '/profile',
          name: 'Profile',
          component: ProfileView
        }
      ]
    },
    // 捕获所有未匹配的路由并重定向到游戏页面
    {
      path: '/:pathMatch(.*)*',
      redirect: '/game'
    }
  ],
})

// 添加路由守卫来处理未知路由
router.beforeEach((to, from, next) => {
  // 如果访问的是已删除的 /room 路径，重定向到 /game
  if (to.path === '/room') {
    next('/game')
    return
  }
  next()
})

export default router
