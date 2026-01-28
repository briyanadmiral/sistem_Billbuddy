import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { formatCurrency } from '@/lib/bill-utils'
import { ArrowLeft, ArrowRight, Wallet, Check, MessageCircle, FileText } from 'lucide-react'
import type { Room, Profile, Activity, ActivityItem, ItemSplit, RoomMember, PaymentAccount } from '@/lib/types'
import { SettlementActions } from '@/components/settlement-actions'

interface SettlementPageProps {
  params: Promise<{ id: string }>
}

interface DebtCalculation {
  debtorId: string
  debtor: Profile
  creditorId: string
  creditor: Profile
  amount: number
}

export default async function SettlementPage({ params }: SettlementPageProps) {
  const { id: roomId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get room
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single() as { data: Room | null }

  if (!room) {
    notFound()
  }

  // Get room members with profiles
  const { data: members } = await supabase
    .from('room_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('room_id', roomId) as { data: (RoomMember & { profile: Profile })[] | null }

  // Get all activities with items and splits
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      payer:profiles!activities_payer_id_fkey(*),
      items:activity_items(
        *,
        splits:item_splits(*)
      )
    `)
    .eq('room_id', roomId) as { 
      data: (Activity & { 
        payer: Profile
        items: (ActivityItem & { splits: ItemSplit[] })[] 
      })[] | null 
    }

  // Get payment accounts for creditors
  const memberIds = members?.map(m => m.user_id) || []
  const { data: paymentAccounts } = await supabase
    .from('payment_accounts')
    .select('*')
    .in('user_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('is_primary', true) as { data: PaymentAccount[] | null }

  // Calculate debts
  const debtsMap = new Map<string, number>()

  for (const activity of activities || []) {
    const payerId = activity.payer_id
    const subtotal = Number(activity.subtotal) || 0

    for (const item of activity.items || []) {
      for (const split of item.splits || []) {
        if (split.user_id !== payerId) {
          // Calculate share with proportional extras
          let shareAmount = Number(split.share_amount) || 0
          
          if (subtotal > 0) {
            const ratio = shareAmount / subtotal
            shareAmount += (Number(activity.tax_amount) || 0) * ratio
            shareAmount += (Number(activity.service_charge) || 0) * ratio
            shareAmount -= (Number(activity.discount_amount) || 0) * ratio
          }

          const key = `${split.user_id}->${payerId}`
          debtsMap.set(key, (debtsMap.get(key) || 0) + shareAmount)
        }
      }
    }
  }

  // Simplify debts (net off mutual debts)
  const simplifiedDebts: DebtCalculation[] = []
  const processedPairs = new Set<string>()

  for (const [key, amount] of debtsMap) {
    const [debtorId, creditorId] = key.split('->')
    const pairKey = [debtorId, creditorId].sort().join('-')

    if (processedPairs.has(pairKey)) continue
    processedPairs.add(pairKey)

    const reverseKey = `${creditorId}->${debtorId}`
    const reverseAmount = debtsMap.get(reverseKey) || 0

    const netAmount = amount - reverseAmount

    if (Math.abs(netAmount) > 1) { // Ignore tiny amounts
      const debtor = members?.find(m => m.user_id === (netAmount > 0 ? debtorId : creditorId))?.profile
      const creditor = members?.find(m => m.user_id === (netAmount > 0 ? creditorId : debtorId))?.profile

      if (debtor && creditor) {
        simplifiedDebts.push({
          debtorId: netAmount > 0 ? debtorId : creditorId,
          debtor,
          creditorId: netAmount > 0 ? creditorId : debtorId,
          creditor,
          amount: Math.abs(netAmount),
        })
      }
    }
  }

  // Sort by amount descending
  simplifiedDebts.sort((a, b) => b.amount - a.amount)

  const totalDebt = simplifiedDebts.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/rooms/${roomId}`} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke {room.name}
        </Link>
      </Button>

      {/* Header */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gold to-coral p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-card/20 backdrop-blur-sm rounded-xl">
              <Wallet className="h-8 w-8 text-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Ringkasan Hutang</h1>
              <p className="text-foreground/80 mt-1">{room.name}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalDebt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Jumlah Pembayaran</p>
              <p className="text-2xl font-bold text-foreground">{simplifiedDebts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debt List */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Siapa Bayar Siapa</CardTitle>
          <CardDescription>
            Daftar pembayaran yang perlu dilakukan untuk melunasi semua hutang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {simplifiedDebts.length > 0 ? (
            simplifiedDebts.map((debt, index) => {
              const creditorAccount = paymentAccounts?.find(a => a.user_id === debt.creditorId)
              const isCurrentUserDebtor = debt.debtorId === user.id
              const isCurrentUserCreditor = debt.creditorId === user.id

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 ${
                    isCurrentUserDebtor 
                      ? 'border-coral/30 bg-coral/5' 
                      : isCurrentUserCreditor 
                        ? 'border-teal/30 bg-teal/5' 
                        : 'border-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar profile={debt.debtor} size="md" />
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <UserAvatar profile={debt.creditor} size="md" />
                    <div className="flex-1 ml-2">
                      <p className="font-medium text-foreground">
                        <span className={isCurrentUserDebtor ? 'text-coral font-bold' : ''}>
                          {debt.debtor.full_name}
                        </span>
                        {' '}bayar ke{' '}
                        <span className={isCurrentUserCreditor ? 'text-teal font-bold' : ''}>
                          {debt.creditor.full_name}
                        </span>
                      </p>
                      {creditorAccount && (
                        <p className="text-sm text-muted-foreground">
                          {creditorAccount.bank_name} - {creditorAccount.account_number}
                        </p>
                      )}
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(debt.amount)}
                    </p>
                  </div>

                  {isCurrentUserDebtor && creditorAccount && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-2">Transfer ke:</p>
                      <div className="p-3 bg-card rounded-lg">
                        <p className="font-semibold">{creditorAccount.bank_name}</p>
                        <p className="font-mono text-lg">{creditorAccount.account_number}</p>
                        <p className="text-sm text-muted-foreground">a.n. {creditorAccount.account_holder}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto p-4 bg-teal/10 rounded-full w-fit mb-4">
                <Check className="h-10 w-10 text-teal" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Semua Lunas!</h3>
              <p className="text-muted-foreground mt-2">
                Tidak ada hutang yang perlu dibayar dalam room ini.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {simplifiedDebts.length > 0 && (
        <SettlementActions 
          roomName={room.name}
          debts={simplifiedDebts}
          paymentAccounts={paymentAccounts || []}
        />
      )}
    </div>
  )
}
