import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { formatCurrency } from '@/lib/bill-utils'
import { 
  ArrowLeft, Plus, Users, Receipt, Copy, Share2, 
  Calendar, Crown, MoreVertical, Trash2, MessageCircle 
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import type { Room, Profile, Activity, RoomMember } from '@/lib/types'
import { CopyInviteCode } from '@/components/copy-invite-code'
import { ShareWhatsApp } from '@/components/share-whatsapp'

interface RoomDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get room with host
  const { data: room } = await supabase
    .from('rooms')
    .select(`
      *,
      host:profiles!rooms_host_id_fkey(*)
    `)
    .eq('id', id)
    .single() as { data: Room & { host: Profile } | null }

  if (!room) {
    notFound()
  }

  // Get members
  const { data: members } = await supabase
    .from('room_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('room_id', id) as { data: (RoomMember & { profile: Profile })[] | null }

  // Get activities
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      payer:profiles!activities_payer_id_fkey(*)
    `)
    .eq('room_id', id)
    .order('created_at', { ascending: false }) as { data: (Activity & { payer: Profile })[] | null }

  const isHost = room.host_id === user.id
  const totalSpent = activities?.reduce((sum, a) => sum + Number(a.total_amount), 0) || 0

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/dashboard/rooms" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </Button>

      {/* Room Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-primary to-secondary rounded-2xl">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">{room.name}</h1>
              {!room.is_active && (
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
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
                {new Date(room.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-1">
                <Crown className="h-4 w-4 text-gold" />
                {room.host?.full_name}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <CopyInviteCode inviteCode={room.invite_code} />
          <ShareWhatsApp roomName={room.name} inviteCode={room.invite_code} />
          {room.is_active && (
            <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Link href={`/dashboard/rooms/${id}/activities/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Activity
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Member</p>
            <p className="text-2xl font-bold text-primary">{members?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Activity</p>
            <p className="text-2xl font-bold text-secondary">{activities?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal/10 to-teal/5 col-span-2">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-teal">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members ({members?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members?.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <UserAvatar profile={member.profile} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {member.profile?.full_name || 'Unknown'}
                  </p>
                  {member.user_id === room.host_id && (
                    <p className="text-xs text-gold flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Host
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-secondary" />
                Activities
              </CardTitle>
              <CardDescription>Semua transaksi dalam room ini</CardDescription>
            </div>
            {room.is_active && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/rooms/${id}/activities/new`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {activities && activities.length > 0 ? (
              activities.map((activity) => (
                <Link 
                  key={activity.id} 
                  href={`/dashboard/rooms/${id}/activities/${activity.id}`}
                >
                  <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors group">
                    <UserAvatar profile={activity.payer} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Dibayar oleh {activity.payer?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <p className="font-bold text-primary">{formatCurrency(Number(activity.total_amount))}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto p-4 bg-muted rounded-full w-fit mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Belum ada activity</p>
                {room.is_active && (
                  <Button asChild variant="link" className="mt-2">
                    <Link href={`/dashboard/rooms/${id}/activities/new`}>
                      Tambah Activity Pertama
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settlement Summary Link */}
      {activities && activities.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gold/10 to-coral/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Ringkasan Hutang</h3>
                <p className="text-muted-foreground text-sm">
                  Lihat siapa yang harus bayar siapa
                </p>
              </div>
              <Button asChild className="bg-gradient-to-r from-gold to-coral text-foreground hover:opacity-90">
                <Link href={`/dashboard/rooms/${id}/settlement`}>
                  Lihat Ringkasan
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
