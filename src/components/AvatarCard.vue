<script setup lang="ts">
import type { TutorAvatar } from '../data/avatars'

const props = defineProps<{
  avatar: TutorAvatar
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', avatar: TutorAvatar): void
}>()

function handleClick() {
  emit('select', props.avatar)
}
</script>

<template>
  <article
    class="avatar-card pressable"
    :class="{ selected }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keyup.enter="handleClick"
  >
    <div class="avatar-image">
      <img :src="avatar.photo" :alt="avatar.name" loading="lazy" />
    </div>
    <div class="avatar-body">
      <div class="avatar-headline">
        <div>
          <h3>{{ avatar.name }}</h3>
          <p>{{ avatar.persona }}</p>
        </div>
        <span class="badge">AI Tutor</span>
      </div>
      <p class="avatar-description">{{ avatar.description }}</p>
      <ul class="chip-list">
        <li v-for="skill in avatar.expertise" :key="skill">{{ skill }}</li>
      </ul>
    </div>
  </article>
</template>

<style scoped>
.avatar-card {
  cursor: pointer;
  border-radius: 32px;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  gap: 24px;
  padding: 24px;
  transition: border 0.2s ease;
}

.avatar-card.selected {
  border-color: #1d1e2c;
  box-shadow: 0 18px 45px rgba(17, 20, 39, 0.15);
}

.avatar-image img {
  width: clamp(120px, 12vw, 168px);
  height: clamp(120px, 12vw, 168px);
  object-fit: cover;
  border-radius: 28px;
  box-shadow: inset 0 0 0 4px #fff;
}

.avatar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-headline {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
}

.avatar-headline h3 {
  margin: 0;
  font-size: 1.3rem;
}

.avatar-headline p {
  margin: 4px 0 0;
  color: #4f5662;
}

.badge {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  background: rgba(29, 30, 44, 0.08);
  font-weight: 600;
}

.avatar-description {
  margin: 0;
  color: #4f5662;
}

.chip-list {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 10px;
  flex-wrap: wrap;
}

.chip-list li {
  border-radius: 999px;
  padding: 8px 16px;
  background: rgba(29, 30, 44, 0.08);
  font-weight: 600;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .avatar-card {
    flex-direction: column;
    align-items: center;
  }

  .avatar-headline {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
