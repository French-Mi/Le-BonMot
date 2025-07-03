import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ChapterSelectionView from '../views/ChapterSelectionView.vue'
import AvatarSelectionView from '../views/AvatarSelectionView.vue'
import DashboardView from '../views/DashboardView.vue' // NEU: Diese Zeile muss vorhanden sein

const ChapterMenuView = () => import('../views/ChapterMenuView.vue')
const VocabListView = () => import('../views/VocabListView.vue')
const LearnOptionsView = () => import('../views/LearnOptionsView.vue')
const QuizView = () => import('../views/QuizView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/avatar-selection',
      name: 'avatar-selection',
      component: AvatarSelectionView
    },
    { // NEU: Dieser ganze Block muss vorhanden sein
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    },
    {
      path: '/level/:levelName',
      name: 'chapter-selection',
      component: ChapterSelectionView,
      props: true
    },
    {
      path: '/chapter-menu',
      name: 'chapter-menu',
      component: ChapterMenuView
    },
    {
      path: '/vocabulary-list',
      name: 'vocabulary-list',
      component: VocabListView
    },
    {
      path: '/learn-options',
      name: 'learn-options',
      component: LearnOptionsView
    },
    {
      path: '/quiz',
      name: 'quiz',
      component: QuizView
    }
  ]
})

export default router
