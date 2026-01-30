"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
import { ArrowLeft, Loader2, Users, Receipt } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/bill-utils";
// IMPORT TIPE ASLI DARI SINI
import type { Profile } from "@/lib/types";

export default function NewActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = use(params);

  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // State Form
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  // Gunakan tipe Profile yang asli di sini
  const [members, setMembers] = useState<Profile[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // 1. Fetch Data Member
  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user.id);

      const { data: memberData, error } = await supabase
        .from("room_members")
        .select(
          `
          user_id,
          profile:profiles(*)
        `,
        )
        .eq("room_id", roomId);

      if (!error && memberData) {
        // Ambil objek profile yang lengkap agar UserAvatar tidak error
        const validProfiles = memberData
          .map((m: any) =>
            Array.isArray(m.profile) ? m.profile[0] : m.profile,
          )
          .filter((p: any) => p !== null) as Profile[];

        setMembers(validProfiles);

        // Default: Select All
        setSelectedMemberIds(validProfiles.map((p) => p.id));
      }
      setLoading(false);
    }
    fetchData();
  }, [roomId, router, supabase]);

  // 2. Hitung Pembagian
  const totalAmount = Number(amount) || 0;
  const splitCount = selectedMemberIds.length;
  const amountPerPerson = splitCount > 0 ? totalAmount / splitCount : 0;

  // Logic Toggle Member
  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  // Logic Select All
  const toggleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  };

  // 3. Simpan Activity
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !name ||
      totalAmount <= 0 ||
      selectedMemberIds.length === 0 ||
      !currentUser
    ) {
      alert("Mohon lengkapi data.");
      return;
    }

    setSubmitting(true);

    try {
      // A. Activity Utama
      const { data: activity, error: actError } = await supabase
        .from("activities")
        .insert({
          room_id: roomId,
          name: name,
          total_amount: totalAmount,
          payer_id: currentUser,
        })
        .select()
        .single();

      if (actError) throw actError;

      // B. Item Generic
      const { data: item, error: itemError } = await supabase
        .from("activity_items")
        .insert({
          activity_id: activity.id,
          name: name,
          price: totalAmount,
          quantity: 1,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // C. Splits (Hutang)
      const splitsData = selectedMemberIds.map((memberId) => ({
        item_id: item.id,
        user_id: memberId,
        share_amount: amountPerPerson,
        is_paid: memberId === currentUser, // Lunas jika diri sendiri
      }));

      const { error: splitError } = await supabase
        .from("item_splits")
        .insert(splitsData);

      if (splitError) throw splitError;

      router.refresh();
      router.push(`/dashboard/rooms/${roomId}`);
    } catch (error: any) {
      console.error("Error:", error);
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <Button
        variant="ghost"
        asChild
        className="pl-0 hover:pl-2 transition-all"
      >
        <Link href={`/dashboard/rooms/${roomId}`} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Batal & Kembali
        </Link>
      </Button>

      <Card className="border-none shadow-xl bg-gradient-to-b from-card to-muted/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white">
            <Receipt className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Catat Pengeluaran
          </CardTitle>
          <CardDescription>
            Masukkan detail dan pilih siapa yang ikut patungan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Form Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Untuk keperluan apa?</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Beli Bensin, Makan Siang"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Berapa total biayanya?</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted-foreground font-semibold">
                    Rp
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="pl-10 h-12 text-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Pilih Member */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Pilih Anggota ({selectedMemberIds.length})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-primary hover:text-primary hover:bg-primary/10"
                >
                  {selectedMemberIds.length === members.length
                    ? "Batal Pilih Semua"
                    : "Pilih Semua"}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
                {members.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`
                                        flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                                        ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/50"}
                                    `}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(member.id)}
                        className="pointer-events-none"
                      />
                      {/* UserAvatar sekarang aman karena tipe data 'member' sudah sesuai Profile */}
                      <UserAvatar profile={member} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {member.full_name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-4 border flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Estimasi Per Orang
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(totalAmount)} ÷ {splitCount} orang
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(amountPerPerson)}
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md"
              disabled={
                submitting || totalAmount <= 0 || selectedMemberIds.length === 0
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Menyimpan...
                </>
              ) : (
                "Simpan Activity"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
