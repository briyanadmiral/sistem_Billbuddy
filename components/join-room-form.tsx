"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogIn, Loader2 } from "lucide-react";

export function JoinRoomForm() {
  const [open, setOpen] = useState(false); // State untuk buka/tutup popup
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleJoin = async (formData: FormData) => {
    const code = formData.get("code") as string;
    setErrorMsg(null);

    if (!code) {
      setErrorMsg("Masukkan kode dulu dong.");
      return;
    }

    startTransition(async () => {
      // 1. Cek User
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("Login dulu ya.");
        return;
      }

      // 2. Cari Room berdasarkan kode
      const { data: room, error } = await supabase
        .from("rooms")
        .select("id")
        .eq("invite_code", code)
        .single();

      if (error || !room) {
        setErrorMsg("Kode room salah atau tidak ditemukan.");
        return;
      }

      // 3. Masukkan ke tabel room_members
      const { error: joinError } = await supabase.from("room_members").insert({
        room_id: room.id,
        user_id: user.id,
      });

      // Abaikan error jika sudah join (duplicate key)
      if (joinError && joinError.code !== "23505") {
        setErrorMsg("Gagal join room.");
        return;
      }

      // 4. Berhasil! Tutup popup & pindah halaman
      setOpen(false); // Tutup popup otomatis
      router.refresh();
      router.push(`/dashboard/rooms/${room.id}`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* TOMBOL PEMICU (Yang tampil di halaman dashboard) */}
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-background border-primary/20 text-primary hover:bg-primary/5"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Join Room
        </Button>
      </DialogTrigger>

      {/* ISI POPUP */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gabung Room</DialogTitle>
          <DialogDescription>
            Masukkan kode unik dari temanmu untuk masuk ke room.
          </DialogDescription>
        </DialogHeader>

        <form action={handleJoin} className="flex flex-col gap-4 mt-2">
          <Input
            name="code"
            placeholder="Contoh: A1B2C3"
            className="text-center text-lg uppercase tracking-widest font-mono"
            required
            maxLength={10}
            autoComplete="off"
          />

          {errorMsg && (
            <p className="text-sm text-red-500 font-medium text-center animate-pulse">
              {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Masuk...
              </>
            ) : (
              "Gabung Sekarang"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
