'use client'

import React from "react"

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/user-avatar'
import { User, Save, Loader2 } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
    }
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage({ type: 'error', text: 'Anda harus login terlebih dahulu' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Gagal menyimpan perubahan' })
    } else {
      setMessage({ type: 'success', text: 'Perubahan berhasil disimpan' })
      startTransition(() => {
        router.refresh()
      })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground mt-1">
          Kelola profil dan preferensi akun kamu
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Informasi dasar akun kamu</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-6">
              <UserAvatar profile={profile} size="xl" />
              <div>
                <p className="font-medium text-foreground">{profile?.full_name || 'Nama belum diatur'}</p>
                <p className="text-sm text-muted-foreground">
                  Bergabung sejak {new Date(profile?.created_at || '').toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="h-12"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-teal/10 border border-teal/20 text-teal' 
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}>
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <Button
              type="submit"
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-gold/10 to-coral/10">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Tips:</strong> Gunakan nama asli agar teman-teman mudah mengenali kamu di room split bill.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
