'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, Sparkles, Users, Receipt } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-secondary to-teal p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-card/20 backdrop-blur-sm rounded-2xl">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-primary-foreground">BillBuddy</span>
          </div>
        </div>
        
        <div className="space-y-8">
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight text-balance">
            Split Bills dengan Teman Jadi Lebih Mudah
          </h1>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 p-4 bg-card/10 backdrop-blur-sm rounded-xl">
              <div className="p-2 bg-gold/30 rounded-lg">
                <Receipt className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-primary-foreground">Scan Struk Otomatis</p>
                <p className="text-sm text-primary-foreground/80">OCR canggih untuk membaca struk</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-card/10 backdrop-blur-sm rounded-xl">
              <div className="p-2 bg-mint/30 rounded-lg">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-primary-foreground">Room Kolaboratif</p>
                <p className="text-sm text-primary-foreground/80">Ajak teman untuk split bill bersama</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-card/10 backdrop-blur-sm rounded-xl">
              <div className="p-2 bg-coral/30 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-primary-foreground">Hitung Otomatis</p>
                <p className="text-sm text-primary-foreground/80">Pajak, servis, diskon terbagi rata</p>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-primary-foreground/60 text-sm">
          Dipercaya ribuan pengguna untuk mengelola pengeluaran bersama
        </p>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl w-fit lg:hidden">
              <Wallet className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Selamat Datang Kembali</CardTitle>
            <CardDescription>
              Masuk ke akun BillBuddy kamu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Belum punya akun?{' '}
                <Link href="/auth/sign-up" className="text-primary font-semibold hover:underline">
                  Daftar Sekarang
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
