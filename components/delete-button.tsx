"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteButtonProps {
  itemName: string; // Nama item (misal: "Liburan Bali" atau "Beli Bensin")
  itemType: string; // Jenis item (misal: "room" atau "aktivitas")
  warningMessage?: string; // Pesan tambahan di popup
  onDelete: () => Promise<void>; // Server Action
}

export function DeleteButton({
  itemName,
  itemType,
  warningMessage = "Data ini akan hilang permanen.",
  onDelete,
}: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // --- VALIDASI POPUP DINAMIS ---
    const confirmed = window.confirm(
      `Yakin ingin menghapus ${itemType} "${itemName}"?\n\n${warningMessage}`,
    );

    if (confirmed) {
      setLoading(true);
      startTransition(async () => {
        try {
          await onDelete();
        } catch (error) {
          console.error(error);
          alert(`Gagal menghapus ${itemType}. Coba lagi.`);
        } finally {
          setLoading(false);
        }
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isPending || loading}
      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 z-20 relative"
      title={`Hapus ${itemType}`}
    >
      {isPending || loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
