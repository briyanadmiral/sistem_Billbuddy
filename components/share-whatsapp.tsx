'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'

interface ShareWhatsAppProps {
  roomName: string
  inviteCode: string
  message?: string
}

export function ShareWhatsApp({ roomName, inviteCode, message }: ShareWhatsAppProps) {
  function handleShare() {
    const text = message || `Hey! Join room "${roomName}" di BillBuddy untuk split bill bareng. Gunakan kode: ${inviteCode}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <Button variant="outline" onClick={handleShare} className="gap-2 text-teal border-teal/30 hover:bg-teal/10 bg-transparent">
      <MessageCircle className="h-4 w-4" />
      Share via WhatsApp
    </Button>
  )
}
