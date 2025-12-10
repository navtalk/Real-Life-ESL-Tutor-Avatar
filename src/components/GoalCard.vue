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
  <article class="goal-card pressable" role="button" tabindex="0" @click="handleClick" @keyup.enter="handleClick">
    <div class="goal-icon" :style="{ backgroundColor: goal.accent + '20', color: goal.accent }">
      {{ goal.icon }}
    </div>
    <h3>{{ goal.title }}</h3>
    <p>{{ goal.description }}</p>
    <div class="cta">
      <span>Get started</span>
      <span aria-hidden="true">-></span>
    </div>
  </article>
</template>

<style scoped>
.goal-card {
  border-radius: 28px;
  border: 1px solid rgba(29, 30, 44, 0.08);
  padding: 32px 28px;
  background: rgba(255, 255, 255, 0.9);
  min-height: 230px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
}

.goal-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  font-weight: 600;
}

h3 {
  margin: 0;
  font-size: 1.3rem;
}

p {
  margin: 0;
  color: #4f5662;
  flex: 1;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1d1e2c;
}
</style>
