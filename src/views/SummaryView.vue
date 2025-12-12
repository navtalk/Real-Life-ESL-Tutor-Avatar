<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findGoal } from '../data/goals'
import { findAvatar } from '../data/avatars'
import type { SessionFeedback } from '../types/sessionFeedback'

const route = useRoute()
const router = useRouter()

const goal = computed(() => findGoal(route.params.goalId as string))
const avatar = computed(() => findAvatar(route.params.avatarId as string))

const summary = computed<SessionFeedback>(() => {
  const encoded = typeof route.query.data === 'string' ? route.query.data : ''
  if (encoded) {
    try {
      const payload = JSON.parse(decodeURIComponent(encoded)) as SessionFeedback
      return {
        score: payload.score ?? 70,
        fluency: payload.fluency ?? 2,
        pronunciation: payload.pronunciation ?? 2,
        vocabulary: payload.vocabulary ?? 2,
        corrections: Array.isArray(payload.corrections) ? payload.corrections : [],
      }
    } catch {
      /* ignore */
    }
  }
  return {
    score: 90,
    fluency: 4,
    pronunciation: 4,
    vocabulary: 4,
    corrections: [],
  }
})

const metrics = computed(() => [
  { label: 'Fluency', value: summary.value.fluency ?? 4 },
  { label: 'Pronunciation', value: summary.value.pronunciation ?? 4 },
  { label: 'Vocabulary', value: summary.value.vocabulary ?? 4 },
])

const corrections = computed(() => {
  if (summary.value.corrections.length) {
    return summary.value.corrections
  }
  return [
    {
      wrong: 'No transcript captured for this attempt.',
      right: 'Start a new conversation and speak with the tutor to unlock personalized corrections.',
      note: 'We generate corrections from your actual turns. Once the transcript has content, feedback will appear here.',
    },
  ]
})

function goHome() {
  router.push({ name: 'home' })
}

function tryAgain() {
  if (goal.value && avatar.value) {
    router.push({ name: 'session', params: { goalId: goal.value.id, avatarId: avatar.value.id } })
  } else {
    goHome()
  }
}

watchEffect(() => {
  if (!goal.value || !avatar.value) {
    router.replace('/')
  }
})
</script>

<template>
  <section class="summary-screen" v-if="goal && avatar">
    <div class="summary-headline">
      <div>
        <p class="eyebrow">Great job! 🎉</p>
        <h1>Here’s your speaking overview with {{ avatar.name }}.</h1>
      </div>
      <button class="ghost-btn" @click="goHome">Go back home →</button>
    </div>

    <div class="score-card">
      <div class="score-row">
        <div class="score-pillar">
          <p class="label">Overall Score</p>
          <p class="score">{{ summary.score }}</p>
        </div>
        <div class="metric-row">
          <div v-for="metric in metrics" :key="metric.label" class="metric-chip">
            <span class="metric-label">{{ metric.label }}</span>
            <div class="stars">
              <span v-for="n in 5" :key="n" :class="{ filled: n <= metric.value }">★</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="corrections-card">
      <p class="label">Corrections</p>
      <div class="correction-grid">
        <article v-for="item in corrections" :key="item.wrong" class="correction">
          <div class="correction-pair">
            <div class="correction-side wrong-side">
              <span class="side-label">Learner</span>
              <p>{{ item.wrong }}</p>
            </div>
            <div class="pair-divider">
              <span>→</span>
            </div>
            <div class="correction-side right-side">
              <span class="side-label">Improved</span>
              <p>{{ item.right }}</p>
            </div>
          </div>
          <p class="note">{{ item.note }}</p>
        </article>
      </div>
    </div>

    <div class="summary-actions">
      <button class="cta-button" @click="tryAgain">Try again →</button>
    </div>
  </section>
</template>

<style scoped>
.summary-screen {
  height: 100%;
  padding: clamp(8px, 3vw, 28px) clamp(12px, 4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: flex-start;
}

.summary-headline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(17, 20, 39, 0.7);
  font-weight: 600;
  margin-bottom: 8px;
}

.summary-headline h1 {
  margin: 0;
  font-size: clamp(2.2rem, 3vw, 3rem);
}

.ghost-btn {
  border-radius: 999px;
  border: 1px solid rgba(17, 19, 39, 0.15);
  padding: 12px 28px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-weight: 600;
}

.score-card,
.corrections-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 30px;
  border: 1px solid rgba(17, 19, 39, 0.08);
  padding: clamp(18px, 2.8vw, 32px);
  box-shadow: 0 18px 45px rgba(17, 19, 39, 0.08);
}

.score-card {
  display: flex;
  flex-direction: column;
}

.score-row {
  display: flex;
  align-items: center;
  gap: clamp(18px, 3vw, 36px);
  flex-wrap: wrap;
  justify-content: space-between;
}

.score-pillar {
  min-width: 200px;
}

.label {
  font-weight: 600;
  margin-bottom: 8px;
}

.score {
  font-size: clamp(2.5rem, 4vw, 4rem);
  color: #22c55e;
  margin: 0;
}

.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: flex-end;
}

.metric-chip {
  border: 1px solid rgba(17, 19, 39, 0.12);
  border-radius: 999px;
  padding: 10px 18px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.metric-label {
  font-weight: 600;
}

.stars span {
  color: #e5e7eb;
  font-size: 1.2rem;
}

.stars span.filled {
  color: #f59e0b;
}

.correction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.correction {
  border-radius: 22px;
  border: 1px solid rgba(17, 19, 39, 0.08);
  padding: 16px 18px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.correction-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}

.correction-side {
  border-radius: 18px;
  padding: 12px 14px;
  background: rgba(249, 250, 251, 0.9);
  min-height: 72px;
}

.wrong-side {
  border: 1px solid rgba(185, 28, 28, 0.2);
  background: rgba(254, 226, 226, 0.4);
}

.right-side {
  border: 1px solid rgba(4, 120, 87, 0.18);
  background: rgba(209, 250, 229, 0.35);
}

.side-label {
  display: block;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(17, 19, 39, 0.7);
  margin-bottom: 6px;
  font-weight: 600;
}

.pair-divider {
  font-size: 1.4rem;
  color: rgba(17, 19, 39, 0.45);
  font-weight: 700;
}

.note {
  color: #6b7280;
  margin: 0;
  font-size: 0.9rem;
}

.summary-actions {
  display: flex;
  justify-content: center;
  margin-top: auto;
}

@media (max-width: 768px) {
  .summary-headline {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-row {
    justify-content: flex-start;
  }

  .correction-pair {
    grid-template-columns: 1fr;
  }

  .pair-divider {
    display: none;
  }
}
</style>
