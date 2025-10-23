
import ChatBox from '@/components/ChatBox'

export default function ChatPage({ params }: { params: { courseId: string } }){
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Chat del curso</h1>
      <ChatBox courseId={params.courseId} />
    </div>
  )
}
