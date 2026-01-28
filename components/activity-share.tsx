'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/bill-utils'
import { Share2, MessageCircle, FileText, Copy } from 'lucide-react'
import type { Profile, ActivityItem, ItemSplit } from '@/lib/types'

interface ActivityShareProps {
  activityName: string
  activityDate: string
  payer: Profile
  items: (ActivityItem & { 
    splits: (ItemSplit & { profile?: Profile })[] 
  })[]
  subtotal: number
  tax: number
  serviceCharge: number
  discount: number
  total: number
  members: { profile: Profile }[]
}

export function ActivityShare({
  activityName,
  activityDate,
  payer,
  items,
  subtotal,
  tax,
  serviceCharge,
  discount,
  total,
  members,
}: ActivityShareProps) {
  function generateTextSummary(): string {
    let text = `*${activityName}*\n`
    text += `${new Date(activityDate).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })}\n\n`

    text += `Dibayar oleh: ${payer.full_name}\n\n`

    text += `*Items:*\n`
    for (const item of items) {
      text += `- ${item.name} x${item.quantity} @ ${formatCurrency(Number(item.price))}\n`
      const sharedBy = item.splits.map(s => {
        const member = members.find(m => m.profile.id === s.user_id)
        return member?.profile.full_name || 'Unknown'
      }).join(', ')
      text += `  (${sharedBy})\n`
    }

    text += `\n*Ringkasan:*\n`
    text += `Subtotal: ${formatCurrency(subtotal)}\n`
    if (tax > 0) text += `Pajak: ${formatCurrency(tax)}\n`
    if (serviceCharge > 0) text += `Service: ${formatCurrency(serviceCharge)}\n`
    if (discount > 0) text += `Diskon: -${formatCurrency(discount)}\n`
    text += `*Total: ${formatCurrency(total)}*\n\n`

    text += `*Bagian masing-masing:*\n`
    
    // Calculate each person's share
    const shares = new Map<string, number>()
    for (const item of items) {
      for (const split of item.splits) {
        let shareAmount = Number(split.share_amount) || 0
        if (subtotal > 0) {
          const ratio = shareAmount / subtotal
          shareAmount += tax * ratio
          shareAmount += serviceCharge * ratio
          shareAmount -= discount * ratio
        }
        shares.set(split.user_id, (shares.get(split.user_id) || 0) + shareAmount)
      }
    }

    for (const [userId, amount] of shares) {
      const member = members.find(m => m.profile.id === userId)
      if (member) {
        text += `${member.profile.full_name}: ${formatCurrency(amount)}\n`
      }
    }

    text += `\n_Dibuat dengan BillBuddy_`

    return text
  }

  function handleShareWhatsApp() {
    const text = generateTextSummary()
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  function handleCopyText() {
    const text = generateTextSummary()
    navigator.clipboard.writeText(text)
    alert('Teks berhasil disalin!')
  }

  function handleExportPDF() {
    // Calculate each person's share
    const shares = new Map<string, number>()
    for (const item of items) {
      for (const split of item.splits) {
        let shareAmount = Number(split.share_amount) || 0
        if (subtotal > 0) {
          const ratio = shareAmount / subtotal
          shareAmount += tax * ratio
          shareAmount += serviceCharge * ratio
          shareAmount -= discount * ratio
        }
        shares.set(split.user_id, (shares.get(split.user_id) || 0) + shareAmount)
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BillBuddy - ${activityName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #ec4899;
          }
          .logo {
            font-size: 32px;
            font-weight: 800;
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .activity-name {
            font-size: 24px;
            margin-top: 10px;
            color: #374151;
          }
          .date {
            color: #6b7280;
            margin-top: 5px;
          }
          .payer-info {
            background: linear-gradient(135deg, #fdf2f8, #fce7f3);
            padding: 15px 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            text-align: center;
          }
          .payer-info span {
            color: #ec4899;
            font-weight: 600;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin: 25px 0 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
          }
          .items-table th {
            text-align: left;
            padding: 12px;
            background: #f9fafb;
            border-bottom: 2px solid #e5e7eb;
            color: #6b7280;
            font-weight: 500;
            font-size: 14px;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .item-name {
            font-weight: 500;
          }
          .item-shared {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .text-right {
            text-align: right;
          }
          .summary {
            margin-top: 20px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 12px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          .summary-row.total {
            border-top: 2px solid #e5e7eb;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: 700;
          }
          .summary-row.total .value {
            color: #ec4899;
          }
          .shares {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .share-card {
            padding: 15px;
            background: white;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
          }
          .share-name {
            font-weight: 500;
            color: #374151;
          }
          .share-amount {
            font-size: 18px;
            font-weight: 700;
            color: #ec4899;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #9ca3af;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">BillBuddy</div>
          <div class="activity-name">${activityName}</div>
          <div class="date">${new Date(activityDate).toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}</div>
        </div>

        <div class="payer-info">
          Dibayar oleh <span>${payer.full_name}</span>
        </div>

        <div class="section-title">Daftar Item</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Harga</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const sharedBy = item.splits.map(s => {
                const member = members.find(m => m.profile.id === s.user_id)
                return member?.profile.full_name || 'Unknown'
              }).join(', ')
              return `
                <tr>
                  <td>
                    <div class="item-name">${item.name}</div>
                    <div class="item-shared">Dibagi: ${sharedBy}</div>
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(Number(item.price))}</td>
                  <td class="text-right">${formatCurrency(Number(item.price) * item.quantity)}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${tax > 0 ? `
            <div class="summary-row">
              <span>Pajak</span>
              <span>${formatCurrency(tax)}</span>
            </div>
          ` : ''}
          ${serviceCharge > 0 ? `
            <div class="summary-row">
              <span>Service Charge</span>
              <span>${formatCurrency(serviceCharge)}</span>
            </div>
          ` : ''}
          ${discount > 0 ? `
            <div class="summary-row">
              <span>Diskon</span>
              <span>-${formatCurrency(discount)}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Total</span>
            <span class="value">${formatCurrency(total)}</span>
          </div>
        </div>

        <div class="section-title">Bagian Masing-Masing</div>
        <div class="shares">
          ${Array.from(shares).map(([userId, amount]) => {
            const member = members.find(m => m.profile.id === userId)
            return member ? `
              <div class="share-card">
                <div class="share-name">${member.profile.full_name}</div>
                <div class="share-amount">${formatCurrency(amount)}</div>
              </div>
            ` : ''
          }).join('')}
        </div>

        <div class="footer">
          <p>Dokumen ini dibuat otomatis oleh BillBuddy</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Share2 className="h-4 w-4" />
          Bagikan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleShareWhatsApp} className="gap-2">
          <MessageCircle className="h-4 w-4 text-teal" />
          Share via WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyText} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
