import { createRouter, createWebHistory } from 'vue-router'
// @ts-ignore
import ConwayGame from '../views/ConwayGame.vue'
import GradientPlane from '@/views/GradientPlane.vue'
import MoonbowBasic from '@/views/MoonbowBasic.vue'
import AnimatedPlanks from '@/views/AnimatedPlanks.vue'
import BomberSet from '@/views/BomberSet.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/conway',
      name: 'conway',
      component: ConwayGame
    },
    {
      path: '/',
      name: 'Home',
      component: MoonbowBasic
    },
    {
      path: '/gradient',
      name: 'Gradient',
      component: GradientPlane
    },
    {
      path: '/planks',
      name: 'Planks',
      component: AnimatedPlanks
    },
    {
      path: '/bomber',
      name: 'Bomber',
      component: BomberSet
    }
  ]
})

export default router
