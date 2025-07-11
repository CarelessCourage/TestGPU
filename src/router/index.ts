import { createRouter, createWebHistory } from 'vue-router'
// @ts-ignore
import ConwayGame from '../views/ConwayGame.vue'
import GradientPlane from '@/views/GradientPlane.vue'
import MoonbowBasic from '@/views/MoonbowBasic.vue'
import MoonbowTypeGPU from '@/views/MoonbowTypeGPU.vue'
import AnimatedPlanks from '@/views/AnimatedPlanks.vue'
import BomberSet from '@/views/BomberSet.vue'
import MarblePlane from '@/views/MarblePlane.vue'
import ImpactPlane from '@/views/ImpactPlane.vue'
import EarthSphere from '@/views/EarthSphere.vue'

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
      path: '/typegpu',
      name: 'TypeGPU',
      component: MoonbowTypeGPU
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
    },
    {
      path: '/marbles',
      name: 'Marbles',
      component: MarblePlane
    },
    {
      path: '/impact',
      name: 'Impact',
      component: ImpactPlane
    },
    {
      path: '/earth',
      name: 'Earth',
      component: EarthSphere
    }
  ]
})

export default router
