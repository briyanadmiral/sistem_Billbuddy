'use client'

import { useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/bill-utils'
import { MessageCircle, FileText, Download, Share2 } from 'lucide-react'
import type { Profile, PaymentAccount } from '@/lib/types'

interface DebtCalculation {
  debtorId: string
  debtor: Profile
  creditorId: string
  creditor: Profile
  amount: number
}

interface SettlementActionsProps {
  roomName: string
  debts: DebtCalculation[]
  paymentAccounts: PaymentAccount[]
}

export function SettlementActions({ roomName, debts, paymentAccounts }: SettlementActionsProps) {
  function generateWhatsAppMessage(): string {
    let message = `*BillBuddy - ${roomName}*\n\n`
    message += `Ringkasan Hutang:\n`
    message += `${'─'.repeat(20)}\n\n`

    for (const debt of debts) {
      const account = paymentAccounts.find(a => a.user_id === debt.creditorId)
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

    return message
  }

  function handleShareWhatsApp() {
    const message = generateWhatsAppMessage()
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  function handleCopyText() {
    const message = generateWhatsAppMessage()
    navigator.clipboard.writeText(message)
    alert('Teks berhasil disalin!')
  }

  function handleExportPDF() {
    // Create a printable version
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BillBuddy - ${roomName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            color: #ec4899;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #6b7280;
            margin: 10px 0 0;
          }
          .debt-item {
            padding: 20px;
            margin-bottom: 15px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fafafa;
          }
          .debt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .debt-names {
            font-size: 16px;
          }
          .debt-names .debtor {
            color: #f87171;
            font-weight: 600;
          }
          .debt-names .creditor {
            color: #34d399;
            font-weight: 600;
          }
          .debt-amount {
            font-size: 24px;
            font-weight: 700;
            color: #ec4899;
          }
          .bank-info {
            margin-top: 15px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .bank-info p {
            margin: 5px 0;
          }
          .bank-name {
            font-weight: 600;
            color: #374151;
          }
          .account-number {
            font-family: monospace;
            font-size: 18px;
            color: #111827;
          }
          .account-holder {
            color: #6b7280;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #9ca3af;
            font-size: 12px;
          }
          .total {
            text-align: right;
            font-size: 20px;
            margin-top: 20px;
            padding: 15px;
            background: linear-gradient(135deg, #fdf2f8, #fce7f3);
            border-radius: 12px;
          }
          .total span {
            color: #6b7280;
          }
          .total strong {
            color: #ec4899;
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BillBuddy</h1>
          <p>${roomName}</p>
          <p style="font-size: 12px; color: #9ca3af;">Dibuat: ${new Date().toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        
        <h2 style="color: #374151; margin-bottom: 20px;">Ringkasan Pembayaran</h2>
        
        ${debts.map(debt => {
          const account = paymentAccounts.find(a => a.user_id === debt.creditorId)
          return `
            <div class="debt-item">
              <div class="debt-header">
                <div class="debt-names">
                  <span class="debtor">${debt.debtor.full_name}</span>
                  <span style="color: #9ca3af;"> bayar ke </span>
                  <span class="creditor">${debt.creditor.full_name}</span>
                </div>
                <div class="debt-amount">${formatCurrency(debt.amount)}</div>
              </div>
              ${account ? `
                <div class="bank-info">
                  <p class="bank-name">${account.bank_name}</p>
                  <p class="account-number">${account.account_number}</p>
                  <p class="account-holder">a.n. ${account.account_holder}</p>
                </div>
              ` : ''}
            </div>
          `
        }).join('')}
        
        <div class="total">
          <span>Total Transaksi: </span>
          <strong>${formatCurrency(debts.reduce((sum, d) => sum + d.amount, 0))}</strong>
        </div>
        
        <div class="footer">
          <p>Dokumen ini dibuat otomatis oleh BillBuddy</p>
          <p>billbuddy.app</p>
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
    <Card className="border-0 shadow-xl">
      <CardContent className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Bagikan Ringkasan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button 
            onClick={handleShareWhatsApp}
            className="bg-teal hover:bg-teal/90 text-primary-foreground h-12"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Share WhatsApp
          </Button>
          <Button 
            onClick={handleCopyText}
            variant="outline"
            className="h-12 bg-transparent"
          >
            <Share2 className="h-5 w-5 mr-2" />
            Copy Text
          </Button>
          <Button 
            onClick={handleExportPDF}
            variant="outline"
            className="h-12 bg-transparent"
          >
            <FileText className="h-5 w-5 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
