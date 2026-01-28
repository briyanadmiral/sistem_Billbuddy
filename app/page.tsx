import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Wallet, Users, Receipt, Calculator, 
  Smartphone, Share2, ArrowRight, CheckCircle2,
  Sparkles, CreditCard
} from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Receipt,
      title: 'Scan Struk Otomatis',
      description: 'AI membaca struk dan mengisi item secara otomatis. Hemat waktu input manual.',
      color: 'from-primary to-secondary',
    },
    {
      icon: Users,
      title: 'Room Kolaboratif',
      description: 'Buat room dan ajak teman dengan kode invite. Semua anggota bisa lihat transaksi.',
      color: 'from-secondary to-teal',
    },
    {
      icon: Calculator,
      title: 'Split Bill Adil',
      description: 'Pilih siapa yang ikut makan tiap item. Pajak dan service otomatis terbagi rata.',
      color: 'from-teal to-mint',
    },
    {
      icon: CreditCard,
      title: 'Rekap Hutang Lengkap',
      description: 'Lihat siapa yang hutang siapa. Nomor rekening otomatis tampil untuk transfer.',
      color: 'from-coral to-gold',
    },
    {
      icon: Share2,
      title: 'Share ke WhatsApp',
      description: 'Bagikan ringkasan hutang langsung ke grup WhatsApp dengan satu klik.',
      color: 'from-gold to-coral',
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Desain responsif yang nyaman digunakan di smartphone maupun desktop.',
      color: 'from-purple to-primary',
    },
  ]

  const steps = [
    {
      number: '1',
      title: 'Buat Room',
      description: 'Buat room baru dan dapatkan kode invite untuk teman-teman kamu.',
    },
    {
      number: '2',
      title: 'Tambah Activity',
      description: 'Scan struk atau input manual item-item yang dibeli.',
    },
    {
      number: '3',
      title: 'Split Bill',
      description: 'Pilih siapa yang ikut makan tiap item.',
    },
    {
      number: '4',
      title: 'Selesai!',
      description: 'Lihat ringkasan hutang dan share ke WhatsApp.',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                BillBuddy
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Masuk</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Link href="/auth/sign-up">Daftar Gratis</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Split bill jadi mudah dan adil
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
              Kelola Pengeluaran Bersama dengan{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-teal bg-clip-text text-transparent">
                BillBuddy
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mt-6 max-w-2xl mx-auto text-balance">
              Scan struk, split bill dengan adil, dan rekap hutang piutang otomatis. 
              Cocok untuk makan bareng, trip, atau pengeluaran kantor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button asChild size="lg" className="h-14 px-8 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg">
                <Link href="/auth/sign-up">
                  Mulai Gratis
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent">
                <Link href="/auth/login">
                  Sudah Punya Akun
                </Link>
              </Button>
            </div>
          </div>

          {/* Mock UI Preview */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-teal/20 blur-3xl" />
              <div className="relative bg-card border rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                      <Users className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Makan Siang Tim Marketing</p>
                      <p className="text-sm text-muted-foreground">4 anggota</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { name: 'Nasi Goreng Spesial', price: 45000, participants: ['A', 'B', 'C'] },
                    { name: 'Es Teh Manis', price: 8000, participants: ['A', 'B', 'C', 'D'] },
                    { name: 'Ayam Bakar', price: 55000, participants: ['B', 'D'] },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <div className="flex gap-1 mt-2">
                          {item.participants.map((p) => (
                            <span key={p} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs flex items-center justify-center font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="font-bold text-primary">Rp {item.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Fitur yang Bikin Hidup Lebih Mudah
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Semua yang kamu butuhkan untuk mengelola pengeluaran bersama dalam satu aplikasi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="group p-6 bg-card rounded-2xl border shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className={`p-3 bg-gradient-to-br ${feature.color} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Cara Kerja BillBuddy
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Hanya 4 langkah mudah untuk menyelesaikan urusan split bill
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-foreground mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full">
                    <ArrowRight className="h-6 w-6 text-muted-foreground/30 -translate-x-1/2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-primary via-secondary to-teal p-8 sm:p-12 rounded-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
              Siap Akhiri Drama Split Bill?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Daftar gratis sekarang dan mulai kelola pengeluaran bersama dengan lebih mudah.
            </p>
            <Button asChild size="lg" className="h-14 px-8 bg-card text-foreground hover:bg-card/90 text-lg">
              <Link href="/auth/sign-up">
                Daftar Gratis Sekarang
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl">
                <Wallet className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                BillBuddy
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Made with love for easier bill splitting
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
