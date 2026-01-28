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
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Users, Sparkles } from 'lucide-react'

export default function NewRoomPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
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

      // Generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name,
          description: description || null,
          host_id: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single()

      if (roomError) throw roomError

      // Add creator as member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
        })

      if (memberError) throw memberError

      router.push(`/dashboard/rooms/${room.id}`)
      router.refresh()
    } catch (err: any) {
      // Kita bongkar isi error-nya di sini
      console.error("ALASAN ERROR:", err.message || err);
      if (err.details) console.error("DETAIL:", err.details);
      if (err.hint) console.error("HINT:", err.hint);

      setError(err.message || 'Gagal membuat room. Silakan coba lagi.');
      setLoading(false);
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
          <div className="mx-auto p-4 bg-gradient-to-br from-primary to-secondary rounded-2xl w-fit mb-4">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Buat Room Baru</CardTitle>
          <CardDescription>
            Buat room untuk mulai split bill dengan teman-teman
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Room</Label>
              <Input
                id="name"
                placeholder="contoh: Makan Siang Kantor, Trip Bali 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang room ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gold/20 rounded-lg mt-0.5">
                  <Sparkles className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Invite Code</p>
                  <p className="text-sm text-muted-foreground">
                    Setelah room dibuat, kamu akan mendapatkan kode unik untuk mengundang teman-teman bergabung.
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
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              disabled={loading}
            >
              {loading ? 'Membuat Room...' : 'Buat Room'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
