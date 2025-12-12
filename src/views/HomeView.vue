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
  <section class="hero-screen">
    <div class="hero-copy">
      <h1> Practice with Your AI Language Tutor</h1>
      <p class="eyebrow">Choose Your Learning Goal</p>
      
    </div>

    <div class="goal-grid">
      <GoalCard v-for="goal in learningGoals" :key="goal.id" :goal="goal" @select="handleSelect" />
    </div>
  </section>
</template>

<style scoped>
.hero-screen {
  height: 100%;
  text-align: center;
  padding: 0 clamp(12px, 6vw, 24px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 32px;
}

.hero-copy {
  max-width: 720px;
  margin: 0 auto;
}

.hero-copy .eyebrow {
  font-weight: bold;
  color: rgba(17, 20, 39, 0.7);
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(2rem, 3.2vw, 2.2rem);
}

.goal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(16px, 3vw, 24px);
  max-width: 1100px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .hero-screen {
    gap: 24px;
  }

  .goal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
