"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/user-avatar";
import { formatCurrency } from "@/lib/bill-utils";
import { Check, Loader2, Users, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Activity,
  ActivityItem,
  Profile,
  RoomMember,
  ItemSplit,
} from "@/lib/types";

interface SplitBillInterfaceProps {
  activity: Activity & { payer: Profile };
  items: (ActivityItem & { splits: (ItemSplit & { user: Profile })[] })[];
  members: (RoomMember & { profile: Profile })[];
  currentUserId: string;
  roomIsActive: boolean;
}

export function SplitBillInterface({
  activity,
  items,
  members,
  currentUserId,
  roomIsActive,
}: SplitBillInterfaceProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // --- BAGIAN INI YANG BIKIN LIVE UPDATE ---
  // Kita pasang "CCTV" (Listener) ke tabel item_splits.
  // Kalau ada perubahan (Insert/Delete/Update) dari SIAPAPUN, halaman ini akan refresh otomatis.
  useEffect(() => {
    const channel = supabase
      .channel("realtime_splits")
      .on(
        "postgres_changes",
        {
          event: "*", // Dengarkan semua event (Insert, Update, Delete)
          schema: "public",
          table: "item_splits", // Hanya tabel splits
        },
        (payload) => {
          // Begitu ada perubahan data di server, paksa tampilan refresh
          startTransition(() => {
            router.refresh();
          });
        },
      )
      .subscribe();

    // Bersihkan listener saat keluar halaman
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);
  // -----------------------------------------

  // Helper
  const getItemSplitters = (
    item: ActivityItem & { splits: (ItemSplit & { user: Profile })[] },
  ) => {
    return item.splits?.map((s) => s.user_id) || [];
  };

  const isUserSplitting = (
    item: ActivityItem & { splits: (ItemSplit & { user: Profile })[] },
    userId: string,
  ) => {
    return getItemSplitters(item).includes(userId);
  };

  // --- FUNGSI 1: TOGGLE MEMBER INDIVIDUAL ---
  async function toggleSplit(
    itemId: string,
    targetUserId: string,
    currentlySplitting: boolean,
  ) {
    if (!roomIsActive) return;
    setLoadingItem(`${itemId}-${targetUserId}`);

    try {
      if (currentlySplitting) {
        // Hapus (Unselect)
        await supabase
          .from("item_splits")
          .delete()
          .eq("item_id", itemId)
          .eq("user_id", targetUserId);
      } else {
        // Pilih (Select)
        const item = items.find((i) => i.id === itemId);
        if (!item) return;

        const currentSplitters = getItemSplitters(item);
        const newSplitCount = currentSplitters.length + 1;
        const shareAmount = item.total_price / newSplitCount;

        // Masukkan data
        await supabase.from("item_splits").insert({
          item_id: itemId,
          user_id: targetUserId,
          share_amount: shareAmount,
        });

        // Update harga teman lain (biar adil)
        if (currentSplitters.length > 0) {
          // Update SEMUA member di item ini dengan harga baru
          // Kita ambil semua ID yang terlibat (current + target)
          const allUserIds = [...currentSplitters, targetUserId];

          // Cara efisien: Update berdasarkan item_id (semua yg ada di item ini kena update harganya)
          await supabase
            .from("item_splits")
            .update({ share_amount: shareAmount })
            .eq("item_id", itemId);
        }
      }
      // Router refresh akan dipanggil otomatis oleh Realtime Listener di atas
    } catch (error) {
      console.error("Error toggling:", error);
    } finally {
      setLoadingItem(null);
    }
  }

  // --- FUNGSI 2: TOMBOL "SEMUA" (LOGIKA UTAMA) ---
  async function toggleSelectAll(itemId: string) {
    if (!roomIsActive) return;
    setLoadingItem(itemId);

    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const currentSplitters = getItemSplitters(item);
      // Jika jumlah yang dipilih = jumlah total member, berarti sudah FULL
      const isAlreadyFull = currentSplitters.length === members.length;

      // 1. BERSIHKAN DULU SEMUA (RESET)
      // Ini penting agar tidak ada data ganda dan kalkulasi bersih
      await supabase.from("item_splits").delete().eq("item_id", itemId);

      // 2. JIKA BELUM FULL -> MASUKKAN SEMUA MEMBER SEKALIGUS
      if (!isAlreadyFull) {
        // Hitung harga rata: Total Harga / Jumlah Semua Member
        const shareAmount = item.total_price / members.length;

        // Siapkan array data untuk semua member
        const allSplitsData = members.map((member) => ({
          item_id: itemId,
          user_id: member.user_id,
          share_amount: shareAmount,
        }));

        // Insert Bulk (Sekaligus)
        await supabase.from("item_splits").insert(allSplitsData);
      }

      // Selesai. Realtime listener akan menangkap perubahan ini dan mengupdate layar Briyan & Ayunobel.
    } catch (error) {
      console.error("Error select all:", error);
    } finally {
      setLoadingItem(null);
    }
  }

  const calculateUserTotal = (userId: string) => {
    let total = 0;
    for (const item of items) {
      const splitters = getItemSplitters(item);
      if (splitters.includes(userId) && splitters.length > 0) {
        total += item.total_price / splitters.length;
      }
    }
    if (activity.subtotal && activity.subtotal > 0) {
      const ratio = total / Number(activity.subtotal);
      total += Number(activity.tax_amount || 0) * ratio;
      total += Number(activity.service_charge || 0) * ratio;
      total -= Number(activity.discount_amount || 0) * ratio;
    }
    return total;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {items.map((item) => {
          const splitters = getItemSplitters(item);
          const sharePerPerson =
            splitters.length > 0
              ? item.total_price / splitters.length
              : item.total_price;
          const isAllSelected =
            members.length > 0 && splitters.length === members.length;

          return (
            <div
              key={item.id}
              className="p-4 border rounded-xl space-y-3 bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity}x @ {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {formatCurrency(item.total_price)}
                  </p>
                  {splitters.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(sharePerPerson)} / orang
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Loop Member */}
                {members.map((member) => {
                  const isSplitting = isUserSplitting(item, member.user_id);
                  const isLoading =
                    loadingItem === `${item.id}-${member.user_id}`;

                  return (
                    <button
                      key={member.id}
                      onClick={() =>
                        toggleSplit(item.id, member.user_id, isSplitting)
                      }
                      disabled={!roomIsActive || isPending || isLoading}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                        "border-2 hover:scale-105",
                        isSplitting
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-muted/50 text-muted-foreground hover:border-primary/50",
                        (!roomIsActive || isPending) &&
                          "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSplitting ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                      <UserAvatar profile={member.profile} size="sm" />
                      <span className="text-sm font-medium">
                        {member.profile?.full_name?.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}

                {/* Tombol Semua */}
                {roomIsActive && (
                  <button
                    onClick={() => toggleSelectAll(item.id)}
                    disabled={isPending || loadingItem === item.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                      "border-2",
                      isAllSelected
                        ? "border-secondary bg-secondary/10 text-secondary border-solid"
                        : "border-dashed border-muted-foreground/30 hover:border-primary/50 text-muted-foreground hover:text-primary",
                    )}
                  >
                    {loadingItem === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAllSelected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">Semua</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ringkasan */}
      {items.some((item) => item.splits && item.splits.length > 0) && (
        <div className="p-4 bg-gradient-to-br from-gold/10 to-coral/10 rounded-xl mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-gold" />
            <h3 className="font-semibold text-foreground">
              Ringkasan per Orang
            </h3>
          </div>
          <div className="space-y-3">
            {members.map((member) => {
              const userTotal = calculateUserTotal(member.user_id);
              if (userTotal === 0) return null;
              const isPayer = member.user_id === activity.payer_id;
              const owesToPayer = !isPayer && userTotal > 0;

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
                    <p
                      className={cn(
                        "font-bold",
                        owesToPayer ? "text-coral" : "text-foreground",
                      )}
                    >
                      {formatCurrency(userTotal)}
                    </p>
                    {owesToPayer && (
                      <p className="text-xs text-muted-foreground">
                        hutang ke {activity.payer?.full_name?.split(" ")[0]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
