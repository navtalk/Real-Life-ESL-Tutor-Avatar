<script setup lang="ts">
import type { LearningGoal } from '../data/goals'

const props = defineProps<{
  goal: LearningGoal
}>()

const emit = defineEmits<{
  (e: 'select', goal: LearningGoal): void
}>()

function handleClick() {
  emit('select', props.goal)
}
</script>

<template>
  <article
    class="goal-card pressable"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keyup.enter="handleClick"
  >
    <div class="goal-icon" :style="{ backgroundColor: goal.accent + '1a' }">
      <img :src="goal.icon" :alt="goal.title" loading="lazy" />
    </div>
    <div class="goal-copy">
      <h3>{{ goal.title }}</h3>
      <p>{{ goal.description }}</p>
    </div>
    <div class="cta">
      <span>Get started</span>
      <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
        <path
          d="M0 6h20m0 0-5-5m5 5-5 5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </article>
</template>

<style scoped>
.goal-card {
  border-radius: 32px;
  border: 1px solid rgba(18, 18, 24, 0.07);
  padding: 36px 32px;
  background: #fff;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  cursor: pointer;
  text-align: left;
}

.goal-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  padding: 6px;
}

.goal-icon img {
  width: 100%;
  height: 100%;
}

.goal-copy {
  flex: 1;
}

.goal-copy h3 {
  margin: 0 0 6px;
  font-size: 1.4rem;
}

.goal-copy p {
  margin: 0;
  color: #4b5563;
  line-height: 1.5;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: #1d1e2c;
}
</style>
