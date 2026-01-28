import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/bill-utils'
import { UserAvatar } from '@/components/user-avatar'
import { Plus, Users, Receipt, ArrowRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { Profile, Room, Activity, Settlement } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's rooms
  const { data: roomMemberships } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', user.id)

  const roomIds = roomMemberships?.map(rm => rm.room_id) || []

  // Get rooms with host info
  const { data: rooms } = await supabase
    .from('rooms')
    .select(`
      *,
      host:profiles!rooms_host_id_fkey(*)
    `)
    .in('id', roomIds.length > 0 ? roomIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(5) as { data: Room[] | null }

  // Get recent activities
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      payer:profiles!activities_payer_id_fkey(*)
    `)
    .in('room_id', roomIds.length > 0 ? roomIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })
    .limit(5) as { data: Activity[] | null }

  // Get settlements (debts)
  // 1. Hutang yang harus kamu bayar (Mencari nama pemberi hutang/creditor)
  const { data: debtsOwed } = await supabase
    .from('settlements')
    .select(`
      *,
      creditor:profiles!creditor_id(full_name, avatar_url)
    `)
    .eq('debtor_id', user.id)
    .eq('is_paid', false) as { data: any[] | null }

  // 2. Piutang yang akan kamu terima (Mencari nama orang yang berhutang/debtor)
  const { data: debtsToReceive } = await supabase
    .from('settlements')
    .select(`
      *,
      debtor:profiles!debtor_id(full_name, avatar_url)
    `)
    .eq('creditor_id', user.id)
    .eq('is_paid', false) as { data: any[] | null }

  const totalOwed = debtsOwed?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
  const totalToReceive = debtsToReceive?.reduce((sum, d) => sum + Number(d.amount), 0) || 0

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Halo, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola pengeluaran bersama dengan mudah
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Link href="/dashboard/rooms/new">
              <Plus className="h-4 w-4 mr-2" />
              Room Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Rooms</p>
                <p className="text-3xl font-bold text-primary">{rooms?.length || 0}</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-3xl font-bold text-secondary">{activities?.length || 0}</p>
              </div>
              <div className="p-3 bg-secondary/20 rounded-xl">
                <Receipt className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-coral/10 to-coral/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Harus Bayar</p>
                <p className="text-2xl font-bold text-coral">{formatCurrency(totalOwed)}</p>
              </div>
              <div className="p-3 bg-coral/20 rounded-xl">
                <TrendingDown className="h-6 w-6 text-coral" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal/10 to-teal/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Akan Diterima</p>
                <p className="text-2xl font-bold text-teal">{formatCurrency(totalToReceive)}</p>
              </div>
              <div className="p-3 bg-teal/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-teal" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Rooms */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Rooms Terbaru</CardTitle>
              <CardDescription>Room yang baru kamu akses</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/rooms" className="text-primary">
                Lihat Semua
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <Link key={room.id} href={`/dashboard/rooms/${room.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors group">
                    <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl group-hover:scale-105 transition-transform">
                      <Users className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{room.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        Host: {room.host?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto p-4 bg-muted rounded-full w-fit mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Belum ada room</p>
                <Button asChild variant="link" className="mt-2">
                  <Link href="/dashboard/rooms/new">Buat Room Baru</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Activities Terbaru</CardTitle>
              <CardDescription>Transaksi terakhir di semua room</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/activities" className="text-primary">
                Lihat Semua
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities && activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <UserAvatar profile={activity.payer || null} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Dibayar oleh {activity.payer?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <p className="font-bold text-primary">{formatCurrency(Number(activity.total_amount))}</p>
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

        {/* Debts Summary */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gold/20 rounded-lg">
                <Wallet className="h-5 w-5 text-gold" />
              </div>
              <div>
                <CardTitle className="text-lg">Ringkasan Hutang</CardTitle>
                <CardDescription>Status hutang piutang kamu</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debts to Pay */}
              <div className="space-y-3">
                <h3 className="font-semibold text-coral flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Harus Dibayar
                </h3>
                {debtsOwed && debtsOwed.length > 0 ? (
                  debtsOwed.slice(0, 3).map((debt) => (
                    <div key={debt.id} className="flex items-center gap-3 p-3 bg-coral/5 rounded-xl">
                      <UserAvatar profile={debt.creditor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{debt.creditor.full_name}</p>
                      </div>
                      <p className="font-bold text-coral">{formatCurrency(Number(debt.amount))}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">Tidak ada hutang</p>
                )}
              </div>

              {/* Debts to Receive */}
              <div className="space-y-3">
                <h3 className="font-semibold text-teal flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Akan Diterima
                </h3>
                {debtsToReceive && debtsToReceive.length > 0 ? (
                  debtsToReceive.slice(0, 3).map((debt) => (
                    <div key={debt.id} className="flex items-center gap-3 p-3 bg-teal/5 rounded-xl">
                      <UserAvatar profile={debt.debtor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{debt.debtor.full_name}</p>
                      </div>
                      <p className="font-bold text-teal">{formatCurrency(Number(debt.amount))}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center">Tidak ada piutang</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
