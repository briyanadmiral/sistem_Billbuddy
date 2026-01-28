import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/10 via-coral/10 to-gold/10">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto p-4 bg-gradient-to-br from-destructive/20 to-coral/20 rounded-full w-fit">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Oops! Ada Masalah</CardTitle>
          <CardDescription className="text-base">
            Terjadi kesalahan saat proses autentikasi. Silakan coba lagi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full h-12 bg-gradient-to-r from-primary to-secondary">
            <Link href="/auth/login" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
