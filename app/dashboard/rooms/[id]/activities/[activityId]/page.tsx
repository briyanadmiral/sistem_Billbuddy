import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { formatCurrency } from '@/lib/bill-utils'
import { ArrowLeft, Receipt, Calendar, CreditCard, Users, Sparkles } from 'lucide-react'
import type { Activity, ActivityItem, Profile, RoomMember, ItemSplit } from '@/lib/types'
import { SplitBillInterface } from '@/components/split-bill-interface'
import { ActivityShare } from '@/components/activity-share'

interface ActivityDetailPageProps {
  params: Promise<{ id: string; activityId: string }>
}

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { id: roomId, activityId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get activity with payer
  const { data: activity } = await supabase
    .from('activities')
    .select(`
      *,
      payer:profiles!activities_payer_id_fkey(*)
    `)
    .eq('id', activityId)
    .single() as { data: Activity & { payer: Profile } | null }

  if (!activity) {
    notFound()
  }

  // Get room info
  const { data: room } = await supabase
    .from('rooms')
    .select('name, is_active')
    .eq('id', roomId)
    .single()

  // Get items with splits
  const { data: items } = await supabase
    .from('activity_items')
    .select(`
      *,
      splits:item_splits(
        *,
        user:profiles(*)
      )
    `)
    .eq('activity_id', activityId)
    .order('created_at') as { data: (ActivityItem & { splits: (ItemSplit & { user: Profile })[] })[] | null }

  // Get room members
  const { data: members } = await supabase
    .from('room_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('room_id', roomId) as { data: (RoomMember & { profile: Profile })[] | null }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button & Share */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={`/dashboard/rooms/${roomId}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke {room?.name}
          </Link>
        </Button>
        <ActivityShare
          activityName={activity.name}
          activityDate={activity.created_at}
          payer={activity.payer}
          items={items || []}
          subtotal={Number(activity.subtotal)}
          tax={Number(activity.tax_amount)}
          serviceCharge={Number(activity.service_charge)}
          discount={Number(activity.discount_amount)}
          total={Number(activity.total_amount)}
          members={members || []}
        />
      </div>

      {/* Activity Header */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-secondary to-teal p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-card/20 backdrop-blur-sm rounded-xl">
              <Receipt className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary-foreground">{activity.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-primary-foreground/80 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(activity.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payer Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <UserAvatar profile={activity.payer} size="lg" />
              <div>
                <p className="text-sm text-muted-foreground">Dibayar oleh</p>
                <p className="font-semibold text-foreground">{activity.payer?.full_name}</p>
              </div>
            </div>

            {/* Total Amount */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl">
              <div className="p-3 bg-primary/20 rounded-xl">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(Number(activity.total_amount))}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-6 p-4 bg-muted/30 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(Number(activity.subtotal))}</span>
            </div>
            {Number(activity.tax_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak</span>
                <span>+{formatCurrency(Number(activity.tax_amount))}</span>
              </div>
            )}
            {Number(activity.service_charge) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Charge</span>
                <span>+{formatCurrency(Number(activity.service_charge))}</span>
              </div>
            )}
            {Number(activity.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-teal">
                <span>Diskon</span>
                <span>-{formatCurrency(Number(activity.discount_amount))}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items & Split Bill */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Split Bill
              </CardTitle>
              <CardDescription>
                Pilih siapa yang ikut makan item ini
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Klik nama untuk toggle
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SplitBillInterface
            activity={activity}
            items={items || []}
            members={members || []}
            currentUserId={user.id}
            roomIsActive={room?.is_active ?? true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
