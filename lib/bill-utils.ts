import type { Activity, ActivityItem, ItemSplit, Profile, DebtSummary } from './types'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calculateItemShare(item: ActivityItem, totalParticipants: number): number {
  return item.total_price / totalParticipants
}

export function calculateUserTotal(
  activity: Activity,
  userId: string,
  items: ActivityItem[],
  splits: ItemSplit[]
): number {
  let userSubtotal = 0
  
  for (const item of items) {
    const itemSplits = splits.filter(s => s.item_id === item.id)
    const userSplit = itemSplits.find(s => s.user_id === userId)
    if (userSplit) {
      userSubtotal += userSplit.share_amount
    }
  }
  
  if (activity.subtotal === 0) return userSubtotal
  
  const ratio = userSubtotal / activity.subtotal
  const taxShare = activity.tax_amount * ratio
  const serviceShare = activity.service_charge * ratio
  const discountShare = activity.discount_amount * ratio
  
  return userSubtotal + taxShare + serviceShare - discountShare
}

export function calculateDebts(
  activities: Activity[],
  members: Profile[]
): DebtSummary[] {
  const debts: Map<string, number> = new Map()
  
  for (const activity of activities) {
    const payerId = activity.payer_id
    
    for (const item of activity.items || []) {
      for (const split of item.splits || []) {
        if (split.user_id !== payerId) {
          const key = `${split.user_id}-${payerId}`
          const current = debts.get(key) || 0
          
          const ratio = split.share_amount / (activity.subtotal || 1)
          const taxShare = (activity.tax_amount || 0) * ratio
          const serviceShare = (activity.service_charge || 0) * ratio
          const discountShare = (activity.discount_amount || 0) * ratio
          
          const totalShare = split.share_amount + taxShare + serviceShare - discountShare
          debts.set(key, current + totalShare)
        }
      }
    }
  }
  
  const netDebts: Map<string, number> = new Map()
  
  for (const [key, amount] of debts) {
    const [debtorId, creditorId] = key.split('-')
    const reverseKey = `${creditorId}-${debtorId}`
    const reverseAmount = debts.get(reverseKey) || 0
    
    if (amount > reverseAmount) {
      netDebts.set(key, amount - reverseAmount)
    }
  }
  
  const summaries: DebtSummary[] = []
  
  for (const [key, amount] of netDebts) {
    const [debtorId, creditorId] = key.split('-')
    const debtor = members.find(m => m.id === debtorId)
    const creditor = members.find(m => m.id === creditorId)
    
    if (debtor && creditor && amount > 0) {
      summaries.push({
        debtor,
        creditor,
        amount,
        settlements: [],
      })
    }
  }
  
  return summaries
}

export function generateWhatsAppMessage(
  roomName: string,
  debts: DebtSummary[],
  paymentAccounts: { user_id: string; bank_name: string; account_number: string; account_holder: string }[]
): string {
  let message = `*BillBuddy - ${roomName}*\n\n`
  message += `Ringkasan Hutang:\n`
  message += `${'─'.repeat(20)}\n\n`
  
  for (const debt of debts) {
    const account = paymentAccounts.find(a => a.user_id === debt.creditor.id)
    message += `${debt.debtor.full_name} -> ${debt.creditor.full_name}\n`
    message += `${formatCurrency(debt.amount)}\n`
    
    if (account) {
      message += `\nTransfer ke:\n`
      message += `${account.bank_name}\n`
      message += `${account.account_number}\n`
      message += `a.n. ${account.account_holder}\n`
    }
    message += `\n`
  }
  
  message += `${'─'.repeat(20)}\n`
  message += `_Dibuat dengan BillBuddy_`
  
  return encodeURIComponent(message)
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarColor(name: string | null): string {
  const colors = [
    'bg-primary',
    'bg-secondary', 
    'bg-coral',
    'bg-teal',
    'bg-purple',
    'bg-gold',
    'bg-mint',
  ]
  
  if (!name) return colors[0]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}
