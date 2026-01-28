'use client'

import React from "react"

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CreditCard, Plus, Trash2, Star, StarOff, Building2 } from 'lucide-react'
import type { PaymentAccount } from '@/lib/types'

export default function PaymentAccountsPage() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // Form state
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    setAccounts(data || [])
    setLoading(false)
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFormError('Anda harus login terlebih dahulu')
      return
    }

    const isPrimary = accounts.length === 0

    const { error } = await supabase
      .from('payment_accounts')
      .insert({
        user_id: user.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        is_primary: isPrimary,
      })

    if (error) {
      setFormError('Gagal menambahkan rekening')
      return
    }

    // Reset form
    setBankName('')
    setAccountNumber('')
    setAccountHolder('')
    setIsDialogOpen(false)
    
    startTransition(() => {
      fetchAccounts()
      router.refresh()
    })
  }

  async function handleSetPrimary(accountId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Set all accounts as non-primary
    await supabase
      .from('payment_accounts')
      .update({ is_primary: false })
      .eq('user_id', user.id)

    // Set selected as primary
    await supabase
      .from('payment_accounts')
      .update({ is_primary: true })
      .eq('id', accountId)

    startTransition(() => {
      fetchAccounts()
    })
  }

  async function handleDelete(accountId: string) {
    await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', accountId)

    startTransition(() => {
      fetchAccounts()
    })
  }

  const popularBanks = [
    'BCA', 'BRI', 'BNI', 'Mandiri', 'CIMB Niaga', 
    'Bank Jago', 'Jenius', 'OVO', 'GoPay', 'DANA', 'ShopeePay'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rekening Pembayaran</h1>
          <p className="text-muted-foreground mt-1">
            Kelola rekening untuk menerima pembayaran dari teman
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Rekening
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Rekening Baru</DialogTitle>
              <DialogDescription>
                Tambahkan rekening bank atau e-wallet untuk menerima pembayaran
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAccount} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nama Bank/E-Wallet</Label>
                <Input
                  id="bankName"
                  placeholder="contoh: BCA, GoPay, DANA"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {popularBanks.slice(0, 6).map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setBankName(bank)}
                      className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Nomor Rekening</Label>
                <Input
                  id="accountNumber"
                  placeholder="1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">Nama Pemilik Rekening</Label>
                <Input
                  id="accountHolder"
                  placeholder="Nama sesuai rekening"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  required
                />
              </div>

              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}

              <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary">
                Simpan Rekening
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="border-0 shadow-lg animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <Card 
              key={account.id} 
              className={`border-0 shadow-lg transition-all ${
                account.is_primary 
                  ? 'ring-2 ring-primary bg-gradient-to-br from-primary/5 to-secondary/5' 
                  : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      account.is_primary 
                        ? 'bg-gradient-to-br from-primary to-secondary' 
                        : 'bg-muted'
                    }`}>
                      <Building2 className={`h-6 w-6 ${
                        account.is_primary ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{account.bank_name}</p>
                        {account.is_primary && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-lg text-foreground mt-1">
                        {account.account_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        a.n. {account.account_holder}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  {!account.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(account.id)}
                      disabled={isPending}
                      className="flex-1"
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Jadikan Utama
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="mx-auto p-4 bg-muted rounded-full w-fit mb-4">
              <CreditCard className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Rekening</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Tambahkan rekening agar teman-teman bisa transfer pembayaran dengan mudah
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Rekening
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-mint/10 to-teal/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-teal/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-teal" />
            </div>
            <div>
              <p className="font-medium text-foreground">Tips</p>
              <p className="text-sm text-muted-foreground mt-1">
                Rekening utama akan ditampilkan di ringkasan hutang agar teman-teman bisa langsung transfer ke rekening yang benar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
