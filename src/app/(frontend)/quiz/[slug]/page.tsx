import { notFound } from 'next/navigation'
import GlobeGame from '@/components/GlobeGame'
import { buildQuizRun, getQuiz } from '@/lib/quizzes'
import '../../styles.css'
import '../../play/play.css'

// Each visit deals a fresh random hand from the quiz pool.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const quiz = getQuiz(slug)
  if (!quiz) return {}
  return { title: quiz.title, description: quiz.description }
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const run = buildQuizRun(slug, Math.random)
  if (!run) notFound()
  return <GlobeGame run={run} />
}
