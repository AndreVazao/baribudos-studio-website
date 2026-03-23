import "./globals.css";
import Link from "next/link";
import BrandLogos from "@/components/brand/BrandLogos";
import { getCurrentUser } from "@/lib/auth-session";

export const metadata = {
  title: "Baribudos Studio Website",
  description: "Plataforma editorial e comercial do Baribudos Studio.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const isAdmin =
    user && ["SUPER_ADMIN", "ADMIN", "EDITOR"].includes(user.role);

  return (
    <html lang="pt-PT">
      <body>
        <div className="wrapper">
          <header className="topbar">
            <div className="topbar-left">
              <BrandLogos variant="studio-primary" priority />
              <div className="topbar-brand-copy">
                <strong>Baribudos Studio</strong>
                <span>Editorial, IPs, eBooks, Audiobooks e séries</span>
              </div>
            </div>

            <nav className="nav">
              <Link href="/">Início</Link>
              <Link href="/studio">Studio</Link>
              <Link href="/ips">IPs</Link>
              <Link href="/loja">Loja</Link>

              {user ? <Link href="/conta">Conta</Link> : <Link href="/login">Entrar</Link>}

              {isAdmin ? <Link href="/admin">Admin</Link> : null}
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
