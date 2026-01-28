import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { Plus, Users, ArrowRight, Calendar, Hash } from 'lucide-react'
import type { Room, Profile } from '@/lib/types'

export default async function RoomsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get user's room memberships
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
    .order('updated_at', { ascending: false }) as { data: (Room & { host: Profile })[] | null }

  // Get member counts for each room
  const memberCounts: Record<string, number> = {}
  if (roomIds.length > 0) {
    const { data: memberships } = await supabase
      .from('room_members')
      .select('room_id')
      .in('room_id', roomIds)

    if (memberships) {
      for (const m of memberships) {
        memberCounts[m.room_id] = (memberCounts[m.room_id] || 0) + 1
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rooms</h1>
          <p className="text-muted-foreground mt-1">
            Kelola semua room split bill kamu
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard/rooms/join">
              <Hash className="h-4 w-4 mr-2" />
              Join Room
            </Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Link href="/dashboard/rooms/new">
              <Plus className="h-4 w-4 mr-2" />
              Buat Room
            </Link>
          </Button>
        </div>
      </div>

      {/* Rooms Grid */}
      {rooms && rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Link key={room.id} href={`/dashboard/rooms/${room.id}`}>
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-xl group-hover:scale-105 transition-transform">
                      <Users className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      room.is_active 
                        ? 'bg-teal/10 text-teal' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {room.is_active ? 'Aktif' : 'Selesai'}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-3 line-clamp-1">{room.name}</CardTitle>
                  {room.description && (
                    <CardDescription className="line-clamp-2">
                      {room.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserAvatar profile={room.host} size="sm" />
                      <span className="truncate max-w-[120px]">{room.host?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{memberCounts[room.id] || 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(room.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Room</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Buat room baru untuk mulai split bill dengan teman-teman kamu
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline">
                <Link href="/dashboard/rooms/join">
                  <Hash className="h-4 w-4 mr-2" />
                  Join Room
                </Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-secondary">
                <Link href="/dashboard/rooms/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Room Baru
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
