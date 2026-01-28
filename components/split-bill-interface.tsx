'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { formatCurrency } from '@/lib/bill-utils'
import { Check, Loader2, Users, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Activity, ActivityItem, Profile, RoomMember, ItemSplit } from '@/lib/types'

interface SplitBillInterfaceProps {
  activity: Activity & { payer: Profile }
  items: (ActivityItem & { splits: (ItemSplit & { user: Profile })[] })[]
  members: (RoomMember & { profile: Profile })[]
  currentUserId: string
  roomIsActive: boolean
}

export function SplitBillInterface({
  activity,
  items,
  members,
  currentUserId,
  roomIsActive,
}: SplitBillInterfaceProps) {
  const [isPending, startTransition] = useTransition()
  const [loadingItem, setLoadingItem] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Calculate who is splitting each item
  const getItemSplitters = (item: ActivityItem & { splits: (ItemSplit & { user: Profile })[] }) => {
    return item.splits?.map(s => s.user_id) || []
  }

  const isUserSplitting = (item: ActivityItem & { splits: (ItemSplit & { user: Profile })[] }, userId: string) => {
    return getItemSplitters(item).includes(userId)
  }

  async function toggleSplit(itemId: string, userId: string, currentlySplitting: boolean) {
    if (!roomIsActive) return
    
    setLoadingItem(`${itemId}-${userId}`)

    try {
      if (currentlySplitting) {
        // Remove split
        await supabase
          .from('item_splits')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', userId)
      } else {
        // Add split - calculate share amount
        const item = items.find(i => i.id === itemId)
        if (!item) return

        const currentSplitters = getItemSplitters(item)
        const newSplitCount = currentSplitters.length + 1
        const shareAmount = item.total_price / newSplitCount

        // Insert new split
        await supabase
          .from('item_splits')
          .insert({
            item_id: itemId,
            user_id: userId,
            share_amount: shareAmount,
          })

        // Update existing splits with new share amount
        if (currentSplitters.length > 0) {
          for (const splitterId of currentSplitters) {
            await supabase
              .from('item_splits')
              .update({ share_amount: shareAmount })
              .eq('item_id', itemId)
              .eq('user_id', splitterId)
          }
        }
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error toggling split:', error)
    } finally {
      setLoadingItem(null)
    }
  }

  // Recalculate shares when splitters change
  async function recalculateShares(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (!item || !item.splits || item.splits.length === 0) return

    const shareAmount = item.total_price / item.splits.length

    for (const split of item.splits) {
      await supabase
        .from('item_splits')
        .update({ share_amount: shareAmount })
        .eq('id', split.id)
    }
  }

  // Calculate user totals
  const calculateUserTotal = (userId: string) => {
    let total = 0
    for (const item of items) {
      const splitters = getItemSplitters(item)
      if (splitters.includes(userId) && splitters.length > 0) {
        total += item.total_price / splitters.length
      }
    }

    // Add proportional tax/service/discount
    if (activity.subtotal && activity.subtotal > 0) {
      const ratio = total / Number(activity.subtotal)
      total += Number(activity.tax_amount || 0) * ratio
      total += Number(activity.service_charge || 0) * ratio
      total -= Number(activity.discount_amount || 0) * ratio
    }

    return total
  }

  // Select all members for an item
  async function selectAllForItem(itemId: string) {
    if (!roomIsActive) return
    
    setLoadingItem(itemId)

    try {
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const shareAmount = item.total_price / members.length

      // Delete existing splits
      await supabase
        .from('item_splits')
        .delete()
        .eq('item_id', itemId)

      // Insert splits for all members
      await supabase
        .from('item_splits')
        .insert(
          members.map(m => ({
            item_id: itemId,
            user_id: m.user_id,
            share_amount: shareAmount,
          }))
        )

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error selecting all:', error)
    } finally {
      setLoadingItem(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Items */}
      <div className="space-y-4">
        {items.map((item) => {
          const splitters = getItemSplitters(item)
          const sharePerPerson = splitters.length > 0 ? item.total_price / splitters.length : item.total_price

          return (
            <div
              key={item.id}
              className="p-4 border rounded-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity}x @ {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(item.total_price)}</p>
                  {splitters.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(sharePerPerson)}/orang
                    </p>
                  )}
                </div>
              </div>

              {/* Member Selection */}
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const isSplitting = isUserSplitting(item, member.user_id)
                  const isLoading = loadingItem === `${item.id}-${member.user_id}`

                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleSplit(item.id, member.user_id, isSplitting)}
                      disabled={!roomIsActive || isPending || isLoading}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                        'border-2 hover:scale-105',
                        isSplitting
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-muted/50 text-muted-foreground hover:border-primary/50',
                        (!roomIsActive || isPending) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSplitting ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                      <UserAvatar profile={member.profile} size="sm" />
                      <span className="text-sm font-medium">
                        {member.profile?.full_name?.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
                
                {/* Select All Button */}
                {roomIsActive && splitters.length < members.length && (
                  <button
                    onClick={() => selectAllForItem(item.id)}
                    disabled={isPending || loadingItem === item.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                      'border-2 border-dashed border-muted-foreground/30 hover:border-primary/50',
                      'text-muted-foreground hover:text-primary'
                    )}
                  >
                    {loadingItem === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    <span className="text-sm">Semua</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary by Person */}
      {items.some(item => item.splits && item.splits.length > 0) && (
        <div className="p-4 bg-gradient-to-br from-gold/10 to-coral/10 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-gold" />
            <h3 className="font-semibold text-foreground">Ringkasan per Orang</h3>
          </div>
          <div className="space-y-3">
            {members.map((member) => {
              const userTotal = calculateUserTotal(member.user_id)
              if (userTotal === 0) return null

              const isPayer = member.user_id === activity.payer_id
              const owesToPayer = !isPayer && userTotal > 0

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar profile={member.profile} size="sm" />
                    <div>
                      <p className="font-medium text-foreground">
                        {member.profile?.full_name}
                      </p>
                      {isPayer && (
                        <p className="text-xs text-teal">Yang bayar</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      owesToPayer ? 'text-coral' : 'text-foreground'
                    )}>
                      {formatCurrency(userTotal)}
                    </p>
                    {owesToPayer && (
                      <p className="text-xs text-muted-foreground">
                        hutang ke {activity.payer?.full_name?.split(' ')[0]}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
