<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { assetUrl } from '../utils/assetUrl'
import { findGoal } from '../data/goals'
import { tutorAvatars, type TutorAvatar } from '../data/avatars'
import AvatarCard from '../components/AvatarCard.vue'

const props = defineProps<{
  goalId: string
}>()

const router = useRouter()
const selectedId = ref<string | null>(null)

const GROUP_BY_GOAL: Record<string, TutorAvatar['category']> = {
  'zero-beginner': 'beginner',
  'daily-conversation': 'daily',
  'exam-prep': 'exam',
  'business-communication': 'business',
}

const selectedGroup = computed<TutorAvatar['category']>(() => {
  const goalId = goal.value?.id ?? ''
  return GROUP_BY_GOAL[goalId] ?? 'beginner'
})

const visibleAvatars = computed(() => tutorAvatars.filter((avatar) => avatar.category === selectedGroup.value))

const goal = computed(() => findGoal(props.goalId))

watchEffect(() => {
  if (!goal.value) {
    router.replace('/')
  }
})

function handleSelect(avatar: TutorAvatar) {
  selectedId.value = avatar.id
}
const backIcon = assetUrl('images/left.png')

function goBack() {
  router.push({ name: 'home' })
}

function continueToSession() {
  if (!selectedId.value) return
  router.push({ name: 'session', params: { goalId: props.goalId, avatarId: selectedId.value } })
}

watch(
  () => selectedGroup.value,
  () => {
    if (!selectedId.value) return
    const stillVisible = visibleAvatars.value.some((avatar) => avatar.id === selectedId.value)
    if (!stillVisible) {
      selectedId.value = null
    }
  }
)
</script>

<template>
  <section v-if="goal" class="avatar-screen">
    <div class="avatar-header">
      <button class="back-link" @click="goBack">
        <img :src="backIcon" alt="Back" />
      </button>
      <div class="avatar-heading">
        <h2>Meet Your Avatar</h2>
        <p class="eyebrow">Choose Your AI Learning Partner</p>
      </div>
    </div>

    <div class="avatar-grid">
      <AvatarCard
        v-for="avatar in visibleAvatars"
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
  display: flex;
  align-items: center;
  gap: clamp(10px, 3vw, 14px);
  width: 100%;
  max-width: 1100px;
  margin: 0 auto 20px;
  flex-wrap: nowrap;
}

.avatar-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.back-link {
  border: none;
  background: none;
  color: #1d1e2c;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.5rem;
  padding: 0;
  margin-top: -25px;
}

.back-link img {
  width: 28px;
  height: 28px;
  display: block;
}

.avatar-heading h2 {
  margin: 0;
  font-size: clamp(1.9rem, 3.2vw, 2.25rem);
  letter-spacing: 0.02em;
  color: #111327;
  font-weight: 600;
  line-height: 1.1;
}

.eyebrow {
  letter-spacing: 0.15em;
  color: rgba(17, 20, 39, 0.75);
  font-weight: 600;
  margin: 0;
  font-size: 0.95rem;
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
