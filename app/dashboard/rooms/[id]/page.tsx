import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { formatCurrency } from "@/lib/bill-utils";
import { ArrowLeft, Plus, Users, Receipt, Calendar, Crown } from "lucide-react";
import type { Room, Profile, Activity, PaymentAccount } from "@/lib/types";

// --- IMPORTS KOMPONEN PENTING ---
import { CopyInviteCode } from "@/components/copy-invite-code"; // Share Kode
import { ShareWhatsApp } from "@/components/share-whatsapp"; // Share WA
import { RoomPdfButton } from "@/components/ui/room-pdf-button"; // PDF
import { SettlementChecklist } from "@/components/settlement-checklist"; // Ceklis Realtime
import { DeleteButton } from "@/components/delete-button"; // Tombol Delete Generic

interface RoomDetailPageProps {
  params: Promise<{ id: string }>;
}

interface MemberResult {
  user_id: string;
  profile: Profile | null;
}

// --- LOGIKA HITUNG UTANG (UNTUK PDF & SHARE WA) ---
function calculateDebts(members: MemberResult[], activities: Activity[]) {
  const balances: Record<string, number> = {};
  members.forEach((m) => {
    if (m.user_id) balances[m.user_id] = 0;
  });

  activities.forEach((activity) => {
    const payerId = activity.payer_id;
    const totalAmount = Number(activity.total_amount) || 0;
    if (payerId && balances[payerId] !== undefined)
      balances[payerId] += totalAmount;

    activity.items?.forEach((item: any) => {
      item.splits?.forEach((split: any) => {
        const splitAmount = Number(split.share_amount) || 0;
        const userId = split.user_id;
        if (userId && balances[userId] !== undefined)
          balances[userId] -= splitAmount;
      });
    });
  });

  let debtors: { id: string; amount: number }[] = [];
  let creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, amount]) => {
    const cleanAmount = Math.round(amount);
    if (cleanAmount < -50) debtors.push({ id, amount: cleanAmount });
    if (cleanAmount > 50) creditors.push({ id, amount: cleanAmount });
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i],
      creditor = creditors[j];
    const debtorMember = members.find((m) => m.user_id === debtor.id);
    const creditorMember = members.find((m) => m.user_id === creditor.id);

    if (debtorMember?.profile && creditorMember?.profile) {
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      if (amount > 0) {
        debts.push({
          debtorId: debtor.id,
          debtor: debtorMember.profile,
          creditorId: creditor.id,
          creditor: creditorMember.profile,
          amount: amount,
        });
      }
      debtor.amount += amount;
      creditors[j].amount -= amount;
    }
    if (Math.abs(debtor.amount) < 10) i++;
    if (creditors[j].amount < 10) j++;
  }
  return debts;
}

// --- LOGIKA DATA CEKLIS PEMBAYARAN ---
function getSettlementData(activities: any[], currentUserId: string) {
  const debtsOwedToMe: any[] = [];
  const myDebts: any[] = [];

  activities.forEach((activity) => {
    const isPayer = activity.payer_id === currentUserId;

    activity.items?.forEach((item: any) => {
      item.splits?.forEach((split: any) => {
        // Skip jika bayar diri sendiri
        if (split.user_id === activity.payer_id) return;

        const amount = split.share_amount;

        // Orang lain hutang ke Saya
        if (isPayer) {
          debtsOwedToMe.push({
            splitId: split.id,
            itemName: item.name,
            amount: amount,
            isPaid: split.is_paid,
            debtor: split.user,
          });
        }

        // Saya hutang ke Orang Lain
        if (split.user_id === currentUserId) {
          myDebts.push({
            splitId: split.id,
            itemName: item.name,
            amount: amount,
            isPaid: split.is_paid,
            debtor: null,
          });
        }
      });
    });
  });

  return { debtsOwedToMe, myDebts };
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // --- SERVER ACTION: DELETE ACTIVITY ---
  async function deleteActivity(activityId: string) {
    "use server";
    const supabaseAction = await createClient();

    // Hapus data secara berurutan (Splits -> Items -> Activity)
    const { data: items } = await supabaseAction
      .from("activity_items")
      .select("id")
      .eq("activity_id", activityId);

    if (items && items.length > 0) {
      const itemIds = items.map((i) => i.id);
      await supabaseAction.from("item_splits").delete().in("item_id", itemIds);
    }

    await supabaseAction
      .from("activity_items")
      .delete()
      .eq("activity_id", activityId);
    await supabaseAction.from("activities").delete().eq("id", activityId);

    revalidatePath(`/dashboard/rooms/${id}`);
  }

  // 1. Get Room
  const { data: room } = (await supabase
    .from("rooms")
    .select(`*, host:profiles!rooms_host_id_fkey(*)`)
    .eq("id", id)
    .single()) as { data: (Room & { host: Profile }) | null };
  if (!room) notFound();

  // 2. Get Members
  const { data: rawMembers } = await supabase
    .from("room_members")
    .select(`user_id, profile:profiles(*)`)
    .eq("room_id", id);
  const members: MemberResult[] = (rawMembers || []).map((m: any) => ({
    user_id: m.user_id,
    profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
  }));

  // 3. Get Activities (Deep nested select untuk data lengkap)
  const { data: activities } = await supabase
    .from("activities")
    .select(
      `*, payer:profiles!activities_payer_id_fkey(*), items:activity_items(*, splits:item_splits(*, user:profiles(*)))`,
    )
    .eq("room_id", id)
    .order("created_at", { ascending: false });

  // 4. Get Payment Accounts
  const memberIds = members.map((m) => m.user_id);
  const { data: paymentAccounts } = await supabase
    .from("payment_accounts")
    .select(`*, profile:profiles(*)`)
    .in("user_id", memberIds);

  // 5. Calculations
  const debts = calculateDebts(
    members,
    (activities as unknown as Activity[]) || [],
  );
  const totalSpent =
    activities?.reduce((sum, a) => sum + Number(a.total_amount), 0) || 0;

  // 6. Siapkan Data Ceklis
  const { debtsOwedToMe, myDebts } = getSettlementData(
    activities || [],
    user.id,
  );

  return (
    <div className="space-y-6 pb-20">
      <Button variant="ghost" asChild>
        <Link href="/dashboard/rooms" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Room
        </Link>
      </Button>

      {/* --- HEADER (JUDUL & TOMBOL SHARE ADA DISINI) --- */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-primary to-secondary rounded-2xl">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">
                {room.name}
              </h1>
              {!room.is_active && (
                <span className="px-2 py-1 bg-muted text-xs rounded-full">
                  Selesai
                </span>
              )}
            </div>
            {room.description && (
              <p className="text-muted-foreground mt-1">{room.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(room.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-1">
                <Crown className="h-4 w-4 text-gold" /> {room.host?.full_name}
              </div>
            </div>
          </div>
        </div>

        {/* --- AREA TOMBOL ACTION & SHARE --- */}
        <div className="flex flex-wrap gap-3">
          {/* Tombol Copy Kode */}
          <CopyInviteCode inviteCode={room.invite_code} />

          {/* UPDATE: Tombol Share WA sekarang mengirim data lengkap */}
          <ShareWhatsApp
            roomName={room.name}
            inviteCode={room.invite_code}
            debts={debts}
            paymentAccounts={paymentAccounts as PaymentAccount[]}
            activities={activities as unknown as Activity[]}
          />

          {/* Tombol PDF */}
          <RoomPdfButton
            roomName={room.name}
            debts={debts}
            paymentAccounts={(paymentAccounts || []) as any}
            activities={(activities as unknown as Activity[]) || []}
          />

          {/* Tombol Tambah Activity */}
          {room.is_active && (
            <Button
              asChild
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Link href={`/dashboard/rooms/${id}/activities/new`}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Activity
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* --- STATISTIK --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Member</p>
            <p className="text-2xl font-bold text-primary">
              {members?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Activity</p>
            <p className="text-2xl font-bold text-secondary">
              {activities?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal/10 to-teal/5 col-span-2">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-teal">
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- SECTION CEKLIS PEMBAYARAN (REALTIME) --- */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground px-1">
          Status Pembayaran (Live Check)
        </h3>
        <SettlementChecklist
          currentUserId={user.id}
          debtsOwedToMe={debtsOwedToMe}
          myDebts={myDebts}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- MEMBER LIST (KANAN) --- */}
        <div className="lg:col-start-3 lg:row-start-1 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Members
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {members?.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <UserAvatar profile={member.profile} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {member.profile?.full_name || "Unknown"}
                    </p>
                    {member.user_id === room.host_id && (
                      <p className="text-xs text-gold flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Host
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* --- ACTIVITY LIST (KIRI) --- */}
        <Card className="border-0 shadow-lg lg:col-span-2 lg:row-start-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-secondary" /> Activities
              </CardTitle>
              <CardDescription>Semua transaksi dalam room ini</CardDescription>
            </div>
            {room.is_active && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/rooms/${id}/activities/new`}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {activities && activities.length > 0 ? (
              activities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors group relative"
                >
                  {/* Link ke Detail Activity */}
                  <Link
                    href={`/dashboard/rooms/${id}/activities/${activity.id}`}
                    className="flex-1 flex items-center gap-4 cursor-pointer"
                  >
                    <UserAvatar profile={activity.payer} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {activity.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dibayar oleh {activity.payer?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      {formatCurrency(Number(activity.total_amount))}
                    </p>
                  </Link>

                  {/* --- TOMBOL DELETE GENERIC --- */}
                  <DeleteButton
                    itemName={activity.name}
                    itemType="aktivitas"
                    warningMessage="Biaya total room akan berkurang otomatis."
                    onDelete={deleteActivity.bind(null, activity.id)}
                  />
                  {/* --------------------------- */}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto p-4 bg-muted rounded-full w-fit mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Belum ada activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
