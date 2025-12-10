<script setup lang="ts">
import { useRouter } from 'vue-router'
import GoalCard from '../components/GoalCard.vue'
import { learningGoals, type LearningGoal } from '../data/goals'

const router = useRouter()

function handleSelect(goal: LearningGoal) {
  router.push({ name: 'avatars', params: { goalId: goal.id } })
}
</script>

<template>
  <section class="app-panel hero">
    <p class="text-pill">Practice with Your AI Tutor</p>
    <h1 class="page-title">Choose Your Learning Goal</h1>
    <p class="page-subtitle">
      Built on the NavTalk realtime API, this experience pairs immersive video chat with
      personalized lesson plans. Start by telling us what you want to master.
    </p>

    <div class="grid goal-grid">
      <GoalCard v-for="goal in learningGoals" :key="goal.id" :goal="goal" @select="handleSelect" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  text-align: center;
}

.goal-grid {
  margin-top: 32px;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}
</style>
