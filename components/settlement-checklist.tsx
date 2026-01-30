"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatCurrency } from "@/lib/bill-utils";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

// Definisi Tipe Data untuk Props
interface DebtItem {
  splitId: string;
  itemName: string;
  amount: number;
  isPaid: boolean;
  debtor: Profile | null; // Orang yang ngutang (null jika itu kita sendiri)
}

interface SettlementChecklistProps {
  currentUserId: string;
  debtsOwedToMe: DebtItem[]; // Daftar orang hutang ke saya
  myDebts: DebtItem[]; // Daftar saya hutang ke orang
}

export function SettlementChecklist({
  currentUserId,
  debtsOwedToMe,
  myDebts,
}: SettlementChecklistProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  // --- 1. REALTIME LISTENER (LIVE UPDATE) ---
  // Ini rahasianya agar layar user lain ikut update otomatis
  useEffect(() => {
    const channel = supabase
      .channel("settlement_updates")
      .on(
        "postgres_changes",
        {
          event: "*", // Dengarkan Update/Insert/Delete
          schema: "public",
          table: "item_splits", // Pada tabel item_splits
        },
        (payload) => {
          // Jika ada perubahan database, refresh halaman ini
          startTransition(() => {
            router.refresh();
          });
        },
      )
      .subscribe();

    // Bersihkan listener saat pindah halaman
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  // --- 2. FUNGSI UPDATE STATUS BAYAR ---
  async function togglePaidStatus(splitId: string, currentStatus: boolean) {
    setLoadingId(splitId);
    try {
      // Update ke database
      const { error } = await supabase
        .from("item_splits")
        .update({ is_paid: !currentStatus }) // Balik status (True <-> False)
        .eq("id", splitId);

      if (error) throw error;

      // Router refresh akan dipanggil otomatis oleh Realtime Listener di atas
    } catch (error) {
      console.error("Gagal update status:", error);
      alert("Gagal mengupdate status pembayaran");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 mt-4">
      {/* KARTU KIRI: PEMASUKAN (Uang Masuk) */}
      <Card className="border-l-4 border-l-emerald-500 h-fit bg-emerald-50/10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
            <ArrowDownLeft className="h-5 w-5" />
            Teman Hutang ke Saya
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ceklis jika teman sudah membayar ke kamu.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {debtsOwedToMe.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              Semua aman! Tidak ada yang hutang padamu.
            </div>
          ) : (
            debtsOwedToMe.map((item) => (
              <div
                key={item.splitId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  item.isPaid
                    ? "bg-emerald-100/50 border-emerald-200"
                    : "bg-card border-border hover:shadow-sm",
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <UserAvatar profile={item.debtor} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {item.debtor?.full_name?.split(" ")[0]}
                    </p>
                    <p
                      className="text-xs text-muted-foreground truncate max-w-[120px]"
                      title={item.itemName}
                    >
                      {item.itemName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "font-bold text-sm",
                      item.isPaid
                        ? "text-emerald-600/70 line-through decoration-2"
                        : "text-emerald-600",
                    )}
                  >
                    {formatCurrency(item.amount)}
                  </span>

                  {/* TOMBOL CEKLIS (Action) */}
                  <button
                    onClick={() => togglePaidStatus(item.splitId, item.isPaid)}
                    disabled={loadingId === item.splitId}
                    className="transition-transform active:scale-95 focus:outline-none"
                    title={item.isPaid ? "Tandai belum lunas" : "Tandai lunas"}
                  >
                    {loadingId === item.splitId ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : item.isPaid ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-100" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground hover:text-emerald-500 hover:fill-emerald-50" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* KARTU KANAN: PENGELUARAN (Uang Keluar) */}
      <Card className="border-l-4 border-l-rose-400 h-fit bg-rose-50/10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-rose-600">
            <ArrowUpRight className="h-5 w-5" />
            Hutang Saya
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Menunggu konfirmasi (ceklis) dari teman yang menalangimu.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {myDebts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              Bersih! Kamu tidak punya hutang.
            </div>
          ) : (
            myDebts.map((item) => (
              <div
                key={item.splitId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  item.isPaid ? "bg-rose-100/30 opacity-70" : "bg-white/60",
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate max-w-[150px]">
                      {item.itemName}
                    </p>
                    {/* Status Badge */}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border font-bold inline-block mt-1",
                        item.isPaid
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-rose-100 text-rose-700 border-rose-200",
                      )}
                    >
                      {item.isPaid ? "LUNAS" : "BELUM BAYAR"}
                    </span>
                  </div>
                </div>
                <div className="font-bold text-sm text-rose-500">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
