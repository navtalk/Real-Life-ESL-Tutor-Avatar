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
    <figure class="avatar-image">
      <img :src="avatar.photo" :alt="avatar.name" loading="lazy" />
    </figure>
    <div class="avatar-body">
      <h3>{{ avatar.name }}</h3>
      <p class="persona">{{ avatar.persona }}</p>
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
  border-radius: 38px;
  border: 2px solid transparent;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 24px;
  transition: border 0.2s ease, box-shadow 0.2s ease;
  min-height: 360px;
  max-width: 220px;
  width: 100%;
  align-items: center;
}

.avatar-card:hover,
.avatar-card.selected {
  border-color: rgba(18, 19, 29, 0.18);
  box-shadow: 0 28px 45px rgba(17, 20, 39, 0.18);
}

.avatar-image {
  width: 180px;
  border-radius: 28px;
  overflow: hidden;
  aspect-ratio: 3 / 4;
  margin: 0 0 18px;
}

.avatar-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-body h3 {
  margin: 0;
  font-size: 1.3rem;
}

.persona {
  margin: 6px 0 8px;
  color: #1d1e2c;
  font-weight: 600;
}

.avatar-description {
  margin: 0 0 16px;
  color: #4f5662;
}

.chip-list {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-list li {
  border-radius: 999px;
  padding: 6px 14px;
  background: rgba(29, 30, 44, 0.08);
  font-weight: 600;
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .avatar-card {
    min-height: auto;
  }
}
</style>
