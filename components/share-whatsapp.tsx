"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/bill-utils";
import type { Activity, Profile, PaymentAccount } from "@/lib/types";

// Kita definisikan tipe data untuk Hutang (sesuai hasil kalkulasi di page.tsx)
interface DebtItem {
  debtorId: string;
  debtor: Profile | null;
  creditorId: string;
  creditor: Profile | null;
  amount: number;
}

interface ShareWhatsAppProps {
  roomName: string;
  inviteCode: string;
  // Props di bawah ini OPSIONAL.
  // Jika diisi, tombol akan share Laporan Keuangan.
  // Jika kosong, tombol hanya share Link Join.
  debts?: DebtItem[];
  paymentAccounts?: PaymentAccount[];
  activities?: Activity[];
}

export function ShareWhatsApp({
  roomName,
  inviteCode,
  debts,
  paymentAccounts,
  activities,
}: ShareWhatsAppProps) {
  function handleShare() {
    let text = "";

    // --- MODE 1: SHARE LAPORAN KEUANGAN (Jika data debts ada) ---
    if (debts && paymentAccounts) {
      text += `*LAPORAN KEUANGAN: ${roomName.toUpperCase()}*\n`;
      text += `_Powered by BillBuddy_\n\n`;

      // 1. Rincian Transfer (Siapa Bayar Siapa)
      text += `*📋 RINCIAN TRANSFER:*\n`;
      if (debts.length === 0) {
        text += "✅ Semua lunas! Tidak ada hutang.\n";
      } else {
        debts.forEach((debt) => {
          const debtorName = debt.debtor?.full_name?.split(" ")[0] || "Someone";
          const creditorName =
            debt.creditor?.full_name?.split(" ")[0] || "Someone";

          // Cari rekening si penerima uang (Creditor)
          const account = paymentAccounts.find(
            (acc) => acc.user_id === debt.creditorId,
          );

          text += `----------------------------------\n`;
          text += `🔴 *${debtorName}* ➡️ 🟢 *${creditorName}*\n`;
          text += `💰 Nominal: *${formatCurrency(debt.amount)}*\n`;

          if (account) {
            text += `🏦 Transfer: ${account.bank_name} - ${account.account_number}\n`;
            text += `   (a.n ${account.account_holder})\n`;
          } else {
            text += `⚠️ Rekening belum diinput\n`;
          }
        });
        text += `----------------------------------\n\n`;
      }

      // 2. Ringkasan Activity (Opsional, biar transparan)
      if (activities && activities.length > 0) {
        text += `*🧾 RIWAYAT PENGELUARAN:*\n`;
        activities.forEach((act) => {
          text += `• ${act.name}: ${formatCurrency(Number(act.total_amount))}\n`;
        });
        text += `\n`;
      }

      // Footer Kode Room
      text += `Mau cek detail? Join room pake kode: *${inviteCode}*`;
    }

    // --- MODE 2: SHARE INVITE LINK BIASA (Default) ---
    else {
      text = `Hey! Yuk join room "${roomName}" di BillBuddy buat split bill bareng.\n\nGunakan kode: *${inviteCode}*`;
    }

    // Kirim ke WA
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className="gap-2 text-teal-600 border-teal-200 hover:bg-teal-50 bg-white"
    >
      <MessageCircle className="h-4 w-4" />
      {debts ? "Share Laporan WA" : "Invite Teman"}
    </Button>
  );
}
