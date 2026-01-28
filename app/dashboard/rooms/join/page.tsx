'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Hash, Users } from 'lucide-react'

export default function JoinRoomPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Anda harus login terlebih dahulu')
        setLoading(false)
        return
      }

      // Find room by invite code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, is_active')
        .eq('invite_code', inviteCode.toUpperCase())
        .single()

      if (roomError || !room) {
        setError('Kode invite tidak valid')
        setLoading(false)
        return
      }

      if (!room.is_active) {
        setError('Room ini sudah tidak aktif')
        setLoading(false)
        return
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        router.push(`/dashboard/rooms/${room.id}`)
        return
      }

      // Join room
      const { error: joinError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
        })

      if (joinError) throw joinError

      router.push(`/dashboard/rooms/${room.id}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Gagal bergabung ke room. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/dashboard/rooms" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </Button>

      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-4 bg-gradient-to-br from-teal to-secondary rounded-2xl w-fit mb-4">
            <Hash className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Join Room</CardTitle>
          <CardDescription>
            Masukkan kode invite untuk bergabung ke room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Kode Invite</Label>
              <Input
                id="inviteCode"
                placeholder="contoh: ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                maxLength={6}
                className="h-14 text-center text-2xl font-mono tracking-widest uppercase"
              />
              <p className="text-xs text-muted-foreground text-center">
                Minta kode invite dari host room
              </p>
            </div>

            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal/20 rounded-lg mt-0.5">
                  <Users className="h-5 w-5 text-teal" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Cara Mendapatkan Kode</p>
                  <p className="text-sm text-muted-foreground">
                    Minta teman yang sudah membuat room untuk membagikan kode invite 6 karakter.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-teal to-secondary hover:opacity-90"
              disabled={loading || inviteCode.length < 6}
            >
              {loading ? 'Bergabung...' : 'Join Room'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
