import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { formatCurrency } from "@/lib/bill-utils";
import { UserAvatar } from "@/components/user-avatar";
import { JoinRoomForm } from "@/components/join-room-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Silakan login terlebih dahulu.</div>;
  }

  // 1. Ambil Profil User
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 2. Ambil Statistik: Room & Activities
  const { data: myRooms } = await supabase
    .from("room_members")
    .select(
      `
      room:rooms (
        id, name, host:profiles(*)
      )
    `,
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  // Ambil Activity Terbaru (Limit 5)
  const { data: recentActivities } = await supabase
    .from("activities")
    .select(
      `
      *,
      payer:profiles(*)
    `,
    )
    .in("room_id", myRooms?.map((m: any) => m.room.id) || [])
    .order("created_at", { ascending: false })
    .limit(5);

  // 3. Hitung Statistik Sederhana
  const totalRooms = myRooms?.length || 0;

  // Hitung total activity (fetch count only)
  const { count: totalActivities } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .in("room_id", myRooms?.map((m: any) => m.room.id) || []);

  // --- STATISTIK KARTU (Dummy Calculation untuk Hutang/Piutang) ---
  // Di real app, ini harus hitung dari tabel settlements/splits
  // Untuk sekarang kita set 0 dulu sesuai screenshot atau logika sederhana
  const harusBayar = 0;
  const akanDiterima = 0;

  const firstName = profile?.full_name?.split(" ")[0] || "User";

  return (
    <div className="space-y-8 pb-20">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Halo, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            Kelola pengeluaran bersama dengan mudah
          </p>
        </div>
        <div className="flex items-center gap-2">
          <JoinRoomForm />
          <Button
            asChild
            className="bg-gradient-to-r from-primary to-secondary text-white shadow-md"
          >
            <Link href="/dashboard/rooms/new">
              <Plus className="mr-2 h-4 w-4" /> Room Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Rooms */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rooms
            </CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRooms}</div>
          </CardContent>
        </Card>

        {/* Card 2: Total Activities */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities || 0}</div>
          </CardContent>
        </Card>

        {/* Card 3: Harus Bayar */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Harus Bayar
            </CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(harusBayar)}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Akan Diterima */}
        <Card className="bg-card text-card-foreground border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Akan Diterima
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(akanDiterima)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- SECTIONS TERBARU --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* ROOMS TERBARU (Kiri - Lebar 4) */}
        <div className="col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Rooms Terbaru</h2>
            <Link
              href="/dashboard/rooms"
              className="text-sm text-primary hover:underline"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {myRooms && myRooms.length > 0 ? (
              myRooms.slice(0, 3).map((item: any) => (
                <Link
                  key={item.room.id}
                  href={`/dashboard/rooms/${item.room.id}`}
                >
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm">
                    <div className="flex items-center gap-4">
                      <UserAvatar profile={item.room.host} />
                      <div>
                        <p className="font-semibold">{item.room.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Host: {item.room.host?.full_name?.split(" ")[0]}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center border rounded-xl bg-muted/10">
                <p className="text-muted-foreground">Belum ada room.</p>
              </div>
            )}
          </div>
        </div>

        {/* ACTIVITIES TERBARU (Kanan - Lebar 3) */}
        <div className="col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              Activities Terbaru
            </h2>
            <Link
              href="/dashboard/activities"
              className="text-sm text-primary hover:underline"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="space-y-4">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.map((act: any) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar profile={act.payer} size="sm" />
                    <div>
                      <p className="font-medium line-clamp-1">{act.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Dibayar: {act.payer?.full_name?.split(" ")[0]}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-primary text-sm">
                    {formatCurrency(Number(act.total_amount))}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center border rounded-xl bg-muted/10">
                <p className="text-muted-foreground">Belum ada aktivitas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
