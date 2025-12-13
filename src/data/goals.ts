export interface LearningGoal {
  id: string
  title: string
  description: string
  icon: string
  accent: string
}

import { assetUrl } from '../utils/assetUrl'

export const learningGoals: LearningGoal[] = [
  {
    id: 'zero-beginner',
    title: 'Zero-Beginner',
    description: '',
    icon: assetUrl('icons/star.png'),
    accent: '#FBCB56',
  },
  {
    id: 'daily-conversation',
    title: 'Daily Conversation',
    description: '',
    icon: assetUrl('icons/sms.png'),
    accent: '#9C8BFF',
  },
  {
    id: 'exam-prep',
    title: 'Language Exam Prep',
    description: '',
    icon: assetUrl('icons/book.png'),
    accent: '#6FC3FF',
  },
  {
    id: 'business-communication',
    title: 'Business Communication',
    description: '',
    icon: assetUrl('icons/briefcase.png'),
    accent: '#66CA9F',
  },
]

export function findGoal(goalId?: string) {
  if (!goalId) return undefined
  return learningGoals.find((goal) => goal.id === goalId)
}
