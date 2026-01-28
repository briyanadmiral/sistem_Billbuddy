import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { formatCurrency } from '@/lib/bill-utils'
import { Receipt, Calendar, ArrowRight, Users } from 'lucide-react'
import type { Activity, Profile, Room } from '@/lib/types'

export default async function ActivitiesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get user's room memberships
  const { data: roomMemberships } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', user.id)

  const roomIds = roomMemberships?.map(rm => rm.room_id) || []

  // Get all activities from user's rooms
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      payer:profiles!activities_payer_id_fkey(*),
      room:rooms(id, name)
    `)
    .in('room_id', roomIds.length > 0 ? roomIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false }) as { 
      data: (Activity & { payer: Profile; room: Pick<Room, 'id' | 'name'> })[] | null 
    }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Semua Activities</h1>
        <p className="text-muted-foreground mt-1">
          Riwayat semua transaksi di semua room kamu
        </p>
      </div>

      {/* Activities List */}
      {activities && activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Link 
              key={activity.id} 
              href={`/dashboard/rooms/${activity.room_id}/activities/${activity.id}`}
            >
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-secondary to-teal rounded-xl">
                      <Receipt className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground text-lg">{activity.name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {activity.room?.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(activity.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(Number(activity.total_amount))}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <UserAvatar profile={activity.payer} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            Dibayar oleh {activity.payer?.full_name}
                          </span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="mx-auto p-4 bg-muted rounded-full w-fit mb-4">
              <Receipt className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Activity</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Belum ada transaksi yang tercatat. Buat room dan tambahkan activity untuk mulai split bill.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
