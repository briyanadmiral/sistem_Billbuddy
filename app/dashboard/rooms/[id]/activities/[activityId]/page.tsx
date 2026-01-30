"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import {
  ArrowLeft,
  Users,
  Check,
  Share2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/bill-utils";
import { cn } from "@/lib/utils";

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  // Unwrapping params (Next.js 15)
  const { id: roomId, activityId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [processingItems, setProcessingItems] = useState<string[]>([]); // Untuk loading per item
  const [activity, setActivity] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // --- 1. FETCH DATA (Load awal & Refresh) ---
  const fetchData = async () => {
    try {
      // A. Ambil Activity
      const { data: actData } = await supabase
        .from("activities")
        .select(`*, payer:profiles!activities_payer_id_fkey(*)`)
        .eq("id", activityId)
        .single();

      setActivity(actData);

      // B. Ambil Items & Splits
      const { data: itemsData } = await supabase
        .from("activity_items")
        .select(`*, splits:item_splits(*)`)
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true });

      setItems(itemsData || []);

      // C. Ambil Members Room
      const { data: memData } = await supabase
        .from("room_members")
        .select(`user_id, profile:profiles(*)`)
        .eq("room_id", roomId);

      // Ratakan struktur member agar mudah dipakai
      const mappedMembers =
        memData?.map((m: any) => ({
          id: m.user_id, // Gunakan user_id sebagai ID utama
          full_name: m.profile?.full_name,
          avatar_url: m.profile?.avatar_url,
        })) || [];

      setMembers(mappedMembers);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load pertama kali
  useEffect(() => {
    fetchData();
  }, [activityId, roomId]);

  // --- 2. LOGIKA TOGGLE MEMBER (Split Bill) ---
  const handleToggleMember = async (
    itemId: string,
    targetUserId: string,
    currentSplits: any[],
    itemPrice: number,
  ) => {
    // Tandai item sedang loading
    setProcessingItems((prev) => [...prev, itemId]);

    try {
      const isSelected = currentSplits.some((s) => s.user_id === targetUserId);

      // Tentukan siapa saja member barunya
      let newMemberIds: string[] = [];
      if (isSelected) {
        // Hapus (Unselect)
        newMemberIds = currentSplits
          .filter((s) => s.user_id !== targetUserId)
          .map((s) => s.user_id);
      } else {
        // Tambah (Select)
        newMemberIds = [...currentSplits.map((s) => s.user_id), targetUserId];
      }

      // Hitung harga baru
      const count = newMemberIds.length;
      const newShareAmount = count > 0 ? itemPrice / count : 0;

      // DATABASE OPERATION:
      // 1. Hapus semua split lama untuk item ini
      await supabase.from("item_splits").delete().eq("item_id", itemId);

      // 2. Masukkan split baru (jika ada member)
      if (count > 0) {
        const splitsToInsert = newMemberIds.map((uid) => ({
          item_id: itemId,
          user_id: uid,
          share_amount: newShareAmount,
          is_paid: false,
        }));
        await supabase.from("item_splits").insert(splitsToInsert);
      }

      // 3. Refresh data lokal agar UI update
      await fetchData();
    } catch (error) {
      console.error("Gagal update split:", error);
      alert("Gagal mengupdate. Cek koneksi internet.");
    } finally {
      setProcessingItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // --- 3. LOGIKA PILIH SEMUA (Select All) ---
  const handleSelectAll = async (itemId: string, itemPrice: number) => {
    setProcessingItems((prev) => [...prev, itemId]);
    try {
      const count = members.length;
      const shareAmount = count > 0 ? itemPrice / count : 0;

      // Hapus lama
      await supabase.from("item_splits").delete().eq("item_id", itemId);

      // Insert semua member
      const splitsToInsert = members.map((m) => ({
        item_id: itemId,
        user_id: m.id,
        share_amount: shareAmount,
        is_paid: false,
      }));

      await supabase.from("item_splits").insert(splitsToInsert);
      await fetchData();
    } catch (error) {
      console.error("Gagal select all:", error);
    } finally {
      setProcessingItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activity) return <div>Activity tidak ditemukan.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header Navigasi */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href={`/dashboard/rooms/${roomId}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Room
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fetchData()}
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Card Info Utama */}
      <Card className="bg-gradient-to-r from-teal-500 to-emerald-600 border-none text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{activity.name}</h1>
              <p className="text-teal-100 mt-1 opacity-90">
                {new Date(activity.created_at).toLocaleDateString("id-ID", {
                  dateStyle: "full",
                })}
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <span className="block text-xs uppercase tracking-wider opacity-80">
                Total
              </span>
              <span className="text-xl font-bold">
                {formatCurrency(Number(activity.total_amount))}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 bg-white/10 p-3 rounded-lg w-fit">
            <UserAvatar profile={activity.payer} size="sm" />
            <div className="text-sm">
              <span className="opacity-75">Dibayar oleh </span>
              <span className="font-semibold">
                {activity.payer?.full_name || "Unknown"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- LIST ITEM (SPLIT BILL) --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Split Bill</h2>
            <p className="text-sm text-muted-foreground">
              Klik nama member untuk membagi tagihan per item
            </p>
          </div>
        </div>

        {items && items.length > 0 ? (
          items.map((item: any) => {
            const isProcessing = processingItems.includes(item.id);
            const splitCount = item.splits?.length || 0;
            const pricePerPerson =
              splitCount > 0 ? item.total_price / splitCount : 0;

            return (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden border shadow-sm transition-all",
                  isProcessing ? "opacity-70 pointer-events-none" : "",
                )}
              >
                {/* Header Item */}
                <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      {item.name}
                      {isProcessing && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{item.quantity}x</span>
                      <span>•</span>
                      <span>{formatCurrency(Number(item.total_price))}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-muted-foreground">
                      Per Orang
                    </span>
                    <span className="font-bold text-primary">
                      {formatCurrency(pricePerPerson)}
                    </span>
                  </div>
                </div>

                {/* Tombol Member */}
                <CardContent className="p-4 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {/* Tombol Pilih Semua */}
                    <button
                      onClick={() =>
                        handleSelectAll(item.id, Number(item.total_price))
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors flex items-center gap-1"
                    >
                      <Users className="h-3 w-3" /> Semua
                    </button>

                    <div className="w-px h-6 bg-border mx-1 self-center" />

                    {/* List Member */}
                    {members.map((member: any) => {
                      // Cek apakah member ini ada di split item ini?
                      const isSelected = item.splits.some(
                        (s: any) => s.user_id === member.id,
                      );

                      return (
                        <button
                          key={member.id}
                          onClick={() =>
                            handleToggleMember(
                              item.id,
                              member.id,
                              item.splits,
                              Number(item.total_price),
                            )
                          }
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border select-none active:scale-95",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:bg-muted",
                          )}
                        >
                          <UserAvatar
                            profile={member}
                            size="sm"
                            className="w-4 h-4"
                          />
                          {member.full_name?.split(" ")[0]}
                          {isSelected && <Check className="h-3 w-3 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">
              Tidak ada item dalam activity ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
