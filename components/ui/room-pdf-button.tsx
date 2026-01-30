"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/bill-utils";
import { FileText } from "lucide-react";
import type { Profile, PaymentAccount, Activity } from "@/lib/types";

// Kita definisikan tipe data yang dibutuhkan
interface DebtCalculation {
  debtorId: string;
  debtor: Profile;
  creditorId: string;
  creditor: Profile;
  amount: number;
}

// Tipe khusus untuk Akun Bank yang ada Profilenya
type PaymentAccountWithProfile = PaymentAccount & {
  profile?: Profile | null;
};

interface RoomPdfButtonProps {
  roomName: string;
  debts: DebtCalculation[];
  paymentAccounts: PaymentAccountWithProfile[];
  activities: Activity[];
}

export function RoomPdfButton({
  roomName,
  debts,
  paymentAccounts,
  activities,
}: RoomPdfButtonProps) {
  function handleExportPDF() {
    // Hitung total pengeluaran
    const totalExpenses = activities.reduce(
      (sum, act) => sum + Number(act.total_amount),
      0,
    );

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Keuangan - ${roomName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #ec4899; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #ec4899; margin-bottom: 5px; }
          .room-name { font-size: 28px; font-weight: 800; margin: 10px 0; color: #111827; }
          .meta { font-size: 12px; color: #6b7280; }
          h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-top: 30px; font-size: 18px; color: #374151; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { text-align: left; background: #f9fafb; padding: 10px; font-weight: 600; color: #4b5563; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .settlement-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
          .settlement-card { background: #fafafa; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; page-break-inside: avoid; }
          .settlement-header { font-size: 14px; margin-bottom: 8px; line-height: 1.4; }
          .debtor { color: #ef4444; font-weight: 600; }
          .creditor { color: #10b981; font-weight: 600; }
          .amount { color: #ec4899; font-weight: 800; font-size: 16px; margin: 5px 0; }
          .bank-box { font-size: 11px; background: white; padding: 8px; border: 1px dashed #d1d5db; border-radius: 4px; color: #4b5563; margin-top: 5px; }
          .bank-name { font-weight: bold; color: #1f2937; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">BillBuddy</div>
          <div class="room-name">${roomName}</div>
          <div class="meta">
            Laporan dibuat pada: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <h2>Riwayat Pengeluaran</h2>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nama Aktivitas</th>
              <th>Dibayar Oleh</th>
              <th class="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${
              activities && activities.length > 0
                ? activities
                    .map(
                      (act) => `
              <tr>
                <td>${new Date(act.created_at).toLocaleDateString("id-ID")}</td>
                <td>${act.name}</td>
                <td>${act.payer?.full_name || "Member"}</td>
                <td class="text-right">${formatCurrency(Number(act.total_amount))}</td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="4" style="text-align:center; padding: 20px;">Belum ada aktivitas</td></tr>'
            }
            <tr>
              <td colspan="3" class="text-right font-bold" style="padding-top: 15px; font-size: 14px;">Total Pengeluaran Room</td>
              <td class="text-right font-bold" style="padding-top: 15px; font-size: 14px; color: #ec4899;">${formatCurrency(totalExpenses)}</td>
            </tr>
          </tbody>
        </table>

        <h2>Daftar Rekening Member</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
           ${
             paymentAccounts && paymentAccounts.length > 0
               ? paymentAccounts
                   .map(
                     (acc) => `
            <div style="border: 1px solid #eee; padding: 10px; border-radius: 6px; font-size: 12px;">
              <div style="font-weight: bold; color: #374151;">${acc.profile?.full_name || "Member Tanpa Nama"}</div>
              <div style="color: #6b7280; margin-top: 2px;">${acc.bank_name}</div>
              <div style="font-family: monospace; font-size: 14px; margin-top: 2px;">${acc.account_number}</div>
              <div style="font-size: 10px; color: #9ca3af;">a.n. ${acc.account_holder}</div>
            </div>
           `,
                   )
                   .join("")
               : '<p style="font-size: 12px; color: #9ca3af;">Belum ada data rekening.</p>'
           }
        </div>

        <h2>Rincian Pelunasan Hutang</h2>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 15px;">Daftar transfer yang harus dilakukan agar semua biaya terbagi rata.</p>
        
        <div class="settlement-grid">
          ${
            debts && debts.length > 0
              ? debts
                  .map((debt) => {
                    const account = paymentAccounts.find(
                      (a) => a.user_id === debt.creditorId,
                    );
                    const dName = debt.debtor?.full_name || "Member";
                    const cName = debt.creditor?.full_name || "Member";

                    return `
              <div class="settlement-card">
                <div class="settlement-header">
                  <span class="debtor">${dName}</span><br>
                  <span style="font-size: 12px; color: #6b7280;">membayar ke</span><br>
                  <span class="creditor">${cName}</span>
                </div>
                <div class="amount">${formatCurrency(debt.amount)}</div>
                
                ${
                  account
                    ? `
                  <div class="bank-box">
                    <div class="bank-name">${account.bank_name}</div>
                    <div>${account.account_number}</div>
                    <div>a.n. ${account.account_holder}</div>
                  </div>
                `
                    : '<div class="bank-box" style="font-style: italic; color: #999;">Rekening belum diisi</div>'
                }
              </div>
            `;
                  })
                  .join("")
              : "<p>Semua lunas!</p>"
          }
        </div>

        <div class="footer">
          <p>Dokumen ini dibuat otomatis oleh aplikasi BillBuddy</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  // TAMPILAN: Hanya tombol kecil dengan style "outline" agar cocok di header
  return (
    <Button
      variant="outline"
      onClick={handleExportPDF}
      className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
    >
      <FileText className="h-4 w-4 mr-2 text-primary" />
      PDF
    </Button>
  );
}
