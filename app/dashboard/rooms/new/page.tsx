import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Plus, Users, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/bill-utils";
import { cn } from "@/lib/utils";

// --- IMPORT KOMPONEN ---
import { DeleteButton } from "@/components/delete-button";
import { JoinRoomForm } from "@/components/join-room-form";
// DashboardNav & UserNav DIHAPUS DARI SINI (Sudah ada di Layout)

export const dynamic = "force-dynamic";

export default async function RoomsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Silakan login terlebih dahulu.</div>;
  }

  // --- SERVER ACTION: DELETE ROOM ---
  async function deleteRoomAction(roomId: string) {
    "use server";
    const supabaseAction = await createClient();

    // 1. Hapus Activity & Splits
    const { data: actIds } = await supabaseAction
      .from("activities")
      .select("id")
      .eq("room_id", roomId);
    if (actIds && actIds.length > 0) {
      const ids = actIds.map((a) => a.id);
      await supabaseAction.from("item_splits").delete().in("item_id", ids);
      await supabaseAction
        .from("activity_items")
        .delete()
        .in("activity_id", ids);
      await supabaseAction.from("activities").delete().eq("room_id", roomId);
    }
    // 2. Hapus Members & Room
    await supabaseAction.from("room_members").delete().eq("room_id", roomId);
    await supabaseAction.from("rooms").delete().eq("id", roomId);

    revalidatePath("/dashboard/rooms");
  }

  // 1. AMBIL DAFTAR ROOM
  const { data: myRooms } = await supabase
    .from("room_members")
    .select(
      `
      room:rooms ( *, host:profiles!rooms_host_id_fkey(*) )
    `,
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  // 2. LOOPING SETIAP ROOM UNTUK AMBIL TOTAL
  const roomsWithStatus = await Promise.all(
    (myRooms || []).map(async (item: any) => {
      const room = item.room;

      // QUERY PENTING: Ambil semua activity di room ini untuk dihitung totalnya
      const { data: activities } = await supabase
        .from("activities")
        .select(
          `
            total_amount, 
            items:activity_items ( splits:item_splits(is_paid) )
        `,
        )
        .eq("room_id", room.id);

      // --- HITUNG TOTAL PENGELUARAN ---
      // Kita jumlahkan kolom 'total_amount' dari setiap activity
      const totalSpent =
        activities?.reduce(
          (sum, act) => sum + (Number(act.total_amount) || 0),
          0,
        ) || 0;

      // --- CEK STATUS (ACTIVE/DONE) ---
      let hasUnpaid = false;
      let hasTransaction = false;

      if (activities && activities.length > 0) {
        hasTransaction = true;
        for (const act of activities) {
          if (act.items) {
            for (const itm of act.items) {
              if (itm.splits) {
                for (const split of itm.splits) {
                  // Jika ada yang belum bayar, tandai unpaid
                  if (split.is_paid === false) {
                    hasUnpaid = true;
                    break;
                  }
                }
              }
              if (hasUnpaid) break;
            }
          }
          if (hasUnpaid) break;
        }
      }

      // LOGIKA STATUS:
      // DONE = Ada transaksi DAN Semua lunas
      // ACTIVE = Belum ada transaksi ATAU Ada yang belum lunas
      const status = hasTransaction && !hasUnpaid ? "DONE" : "ACTIVE";

      return { ...room, status, totalSpent };
    }),
  );

  return (
    <div className="space-y-8 pb-20">
      {/* --- HEADER HALAMAN (Hanya Judul & Tombol) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Kelola keuangan bersama jadi lebih mudah.
          </p>
        </div>

        {/* AREA TOMBOL ACTION */}
        <div className="flex items-center gap-3">
          <JoinRoomForm />

          <Button
            asChild
            className="bg-gradient-to-r from-primary to-secondary shadow-md hover:shadow-lg transition-all text-white"
          >
            <Link href="/dashboard/rooms/new">
              <Plus className="mr-2 h-4 w-4" />
              Buat Room Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* --- DAFTAR ROOM --- */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Room Kamu
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomsWithStatus.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">
                Belum ada room
              </p>
              <p className="text-muted-foreground mb-6">
                Kamu belum bergabung atau membuat room apapun.
              </p>

              <div className="flex gap-3">
                <JoinRoomForm />
                <Button asChild>
                  <Link href="/dashboard/rooms/new">Buat Room Sekarang</Link>
                </Button>
              </div>
            </div>
          ) : (
            roomsWithStatus.map((room) => (
              <Link key={room.id} href={`/dashboard/rooms/${room.id}`}>
                <Card
                  className={cn(
                    "h-full hover:shadow-lg transition-all cursor-pointer group border-l-4 relative",
                    room.status === "DONE"
                      ? "hover:border-l-green-500 border-l-muted"
                      : "hover:border-l-primary border-l-primary",
                  )}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start pr-8">
                      <CardTitle className="line-clamp-1 text-xl">
                        {room.name}
                      </CardTitle>

                      {room.host_id === user.id && (
                        <div className="absolute top-4 right-4 z-20">
                          <DeleteButton
                            itemName={room.name}
                            itemType="room"
                            warningMessage="Semua data akan hilang."
                            onDelete={deleteRoomAction.bind(null, room.id)}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex mt-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1",
                          room.status === "DONE"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-blue-100 text-blue-700 border-blue-200",
                        )}
                      >
                        {room.status === "DONE" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> DONE
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> ACTIVE
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mt-2">
                      {room.description || "Tidak ada deskripsi"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Member</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserAvatar profile={room.host} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          Host: {room.host?.full_name?.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-between items-end">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Pengeluaran
                        </p>
                        {/* INI BAGIAN PENTING: MENAMPILKAN TOTAL */}
                        <p className="font-bold text-lg text-primary">
                          {formatCurrency(room.totalSpent)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/20 p-4 group-hover:bg-primary/5 transition-colors flex justify-end">
                    <div className="text-xs font-medium text-primary flex items-center">
                      Lihat Detail <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
