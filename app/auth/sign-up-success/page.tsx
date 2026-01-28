import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Wallet, ArrowLeft } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-teal/10">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto p-4 bg-gradient-to-br from-mint to-teal rounded-full w-fit">
            <Mail className="h-10 w-10 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Cek Email Kamu!</CardTitle>
          <CardDescription className="text-base">
            Kami sudah mengirimkan link konfirmasi ke email kamu. Klik link tersebut untuk mengaktifkan akun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gold/20 rounded-lg mt-0.5">
                <Wallet className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="font-medium text-foreground">Tips:</p>
                <p className="text-sm text-muted-foreground">
                  Jika tidak menemukan email di inbox, cek folder spam atau junk mail kamu.
                </p>
              </div>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full h-12 bg-transparent">
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
