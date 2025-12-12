<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { findGoal } from '../data/goals'
import { tutorAvatars, type TutorAvatar } from '../data/avatars'
import AvatarCard from '../components/AvatarCard.vue'

const props = defineProps<{
  goalId: string
}>()

const router = useRouter()
const selectedId = ref<string | null>(null)

const goal = computed(() => findGoal(props.goalId))

watchEffect(() => {
  if (!goal.value) {
    router.replace('/')
  }
})

function handleSelect(avatar: TutorAvatar) {
  selectedId.value = avatar.id
}

function goBack() {
  router.push({ name: 'home' })
}

function continueToSession() {
  if (!selectedId.value) return
  router.push({ name: 'session', params: { goalId: props.goalId, avatarId: selectedId.value } })
}
</script>

<template>
  <section v-if="goal" class="avatar-screen">
    <div class="avatar-header">
      <h2>
        <button class="back-link" @click="goBack"><</button>
        Meet Your Avatar
      </h2>
      <p class="eyebrow">Choose Your AI Learning Partner</p>
    </div>

    <div class="avatar-grid">
      <AvatarCard
        v-for="avatar in tutorAvatars"
        :key="avatar.id"
        :avatar="avatar"
        :selected="selectedId === avatar.id"
        @select="handleSelect"
      />
    </div>

    <div class="avatar-actions">
      <button class="cta-button" :disabled="!selectedId" @click="continueToSession">
        Get started
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
      </button>
    </div>
  </section>
</template>

<style scoped>
.avatar-screen {
  height: 100%;
  padding: 0 clamp(12px, 5vw, 24px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  align-items: center;
}

.avatar-header {
  text-align: left;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto 20px;
}

.back-link {
  border: none;
  background: none;
  color: #1d1e2c;
  cursor: pointer;
  font-weight: 600;
  margin-right: 16px;
}

.eyebrow {
  letter-spacing: 0.15em;
  color: rgba(17, 20, 39, 0.7);
  font-weight: 600;
}

.avatar-header h2 {
  margin: 0 0 12px;
  font-size: clamp(2.2rem, 4vw, 3rem);
}

.avatar-header p {
  margin: 0;
  color: #4f5662;
}

.avatar-grid {
  display: flex;
  justify-content: center;
  gap: clamp(18px, 3vw, 32px);
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  flex-wrap: nowrap;
}

.avatar-actions {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.avatar-actions .cta-button {
  min-width: 220px;
  justify-content: center;
}

.avatar-actions .cta-button svg {
  color: #fff;
}

@media (max-width: 640px) {
  .avatar-grid {
    flex-direction: column;
    align-items: center;
  }

  .avatar-actions .cta-button {
    width: 100%;
  }
}
</style>
