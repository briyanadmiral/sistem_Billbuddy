'use client'

import React from "react"

import { useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, Camera, Upload, Plus, Trash2, 
  Receipt, Loader2, Sparkles, X, ImageIcon
} from 'lucide-react'
import { formatCurrency } from '@/lib/bill-utils'
import type { ParsedReceipt } from '@/lib/types'

interface NewActivityPageProps {
  params: Promise<{ id: string }>
}

interface ItemInput {
  name: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function NewActivityPage({ params }: NewActivityPageProps) {
  const { id: roomId } = use(params)
  const [name, setName] = useState('')
  const [items, setItems] = useState<ItemInput[]>([{ name: '', quantity: 1, unit_price: 0, total_price: 0 }])
  const [tax, setTax] = useState(0)
  const [serviceCharge, setServiceCharge] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
  const total = subtotal + tax + serviceCharge - discount

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Scan with OCR
    setScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to scan receipt')
      }

      const data: ParsedReceipt = await response.json()
      
      // Update form with scanned data
      if (data.items && data.items.length > 0) {
        setItems(data.items.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
        })))
      }
      if (data.tax) setTax(data.tax)
      if (data.service_charge) setServiceCharge(data.service_charge)
      if (data.discount) setDiscount(data.discount)
    } catch (err) {
      console.error(err)
      setError('Gagal scan struk. Silakan input manual.')
    } finally {
      setScanning(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
  })

  function addItem() {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, total_price: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemInput, value: string | number) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto-calculate total price
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
    }
    
    setItems(newItems)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Anda harus login terlebih dahulu')
        setLoading(false)
        return
      }

      // Create activity
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          room_id: roomId,
          name,
          payer_id: user.id,
          subtotal,
          tax_amount: tax,
          service_charge: serviceCharge,
          discount_amount: discount,
          total_amount: total,
        })
        .select()
        .single()

      if (activityError) throw activityError

      // Create items
      if (items.length > 0) {
        const validItems = items.filter(item => item.name && item.total_price > 0)
        if (validItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('activity_items')
            .insert(
              validItems.map(item => ({
                activity_id: activity.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
              }))
            )

          if (itemsError) throw itemsError
        }
      }

      router.push(`/dashboard/rooms/${roomId}/activities/${activity.id}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Gagal membuat activity. Silakan coba lagi.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href={`/dashboard/rooms/${roomId}`} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </Button>

      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto p-4 bg-gradient-to-br from-secondary to-teal rounded-2xl w-fit mb-4">
            <Receipt className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Tambah Activity Baru</CardTitle>
          <CardDescription>
            Scan struk atau input manual item-item pengeluaran
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Activity Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Activity</Label>
              <Input
                id="name"
                placeholder="contoh: Makan Siang di Restoran ABC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            {/* Receipt Scanner */}
            <div className="space-y-2">
              <Label>Scan Struk (Opsional)</Label>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}
                  ${scanning ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <input {...getInputProps()} />
                {scanning ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="font-medium">Scanning struk...</p>
                      <p className="text-sm text-muted-foreground">Mohon tunggu sebentar</p>
                    </div>
                  </div>
                ) : previewImage ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img 
                        src={previewImage || "/placeholder.svg"} 
                        alt="Receipt preview" 
                        className="max-h-32 rounded-lg mx-auto"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewImage(null)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Klik atau drop untuk ganti gambar
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-muted rounded-full">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Drop gambar struk di sini</p>
                      <p className="text-sm text-muted-foreground">
                        atau klik untuk upload
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>AI akan membaca struk dan mengisi item otomatis</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Item-item</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-12 gap-2 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <Input
                        placeholder="Nama item"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-8 sm:col-span-3">
                      <Input
                        type="number"
                        placeholder="Harga satuan"
                        min="0"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-10 sm:col-span-1 flex items-center text-sm font-medium">
                      {formatCurrency(item.total_price)}
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Charges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax">Pajak (PB1)</Label>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  value={tax || ''}
                  onChange={(e) => setTax(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Service Charge</Label>
                <Input
                  id="service"
                  type="number"
                  min="0"
                  value={serviceCharge || ''}
                  onChange={(e) => setServiceCharge(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Diskon</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Pajak</span>
                  <span>+{formatCurrency(tax)}</span>
                </div>
              )}
              {serviceCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Service</span>
                  <span>+{formatCurrency(serviceCharge)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-teal">
                  <span>Diskon</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-secondary to-teal hover:opacity-90"
              disabled={loading || !name || total <= 0}
            >
              {loading ? 'Menyimpan...' : 'Simpan Activity'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
