'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, getAvatarColor } from '@/lib/bill-utils'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  profile: Profile | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function UserAvatar({ profile, size = 'md', className }: UserAvatarProps) {
  const colorClass = getAvatarColor(profile?.full_name || null)
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
      <AvatarFallback className={cn(colorClass, 'text-primary-foreground font-semibold')}>
        {getInitials(profile?.full_name || null)}
      </AvatarFallback>
    </Avatar>
  )
}
