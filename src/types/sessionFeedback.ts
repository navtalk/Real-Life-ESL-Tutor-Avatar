export interface CorrectionItem {
  wrong: string
  right: string
  note: string
}

export interface SessionFeedback {
  score: number
  fluency: number
  pronunciation: number
  vocabulary: number
  corrections: CorrectionItem[]
}
