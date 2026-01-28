'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface CopyInviteCodeProps {
  inviteCode: string
}

export function CopyInviteCode({ inviteCode }: CopyInviteCodeProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" onClick={handleCopy} className="gap-2 bg-transparent">
      {copied ? (
        <>
          <Check className="h-4 w-4 text-teal" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {inviteCode}
        </>
      )}
    </Button>
  )
}
