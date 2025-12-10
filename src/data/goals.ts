export interface LearningGoal {
  id: string
  title: string
  description: string
  icon: string
  accent: string
}

export const learningGoals: LearningGoal[] = [
  {
    id: 'zero-beginner',
    title: 'Zero-Beginner',
    description: 'Build confidence with structured, friendly lessons that start from the alphabet.',
    icon: 'ZB',
    accent: '#F6C255',
  },
  {
    id: 'daily-conversation',
    title: 'Daily Conversation',
    description: 'Practice casual speaking, understand idioms, and respond naturally in daily chats.',
    icon: 'DC',
    accent: '#8F7CEC',
  },
  {
    id: 'exam-prep',
    title: 'Language Exam Prep',
    description: 'Mock exams, targeted drills, and personalized feedback for TOEFL, IELTS, and more.',
    icon: 'EX',
    accent: '#6BA9FF',
  },
  {
    id: 'business-communication',
    title: 'Business Communication',
    description: 'Perfect your professional tone for interviews, presentations, and emails.',
    icon: 'BC',
    accent: '#5BC089',
  },
]

export function findGoal(goalId?: string) {
  if (!goalId) return undefined
  return learningGoals.find((goal) => goal.id === goalId)
}
