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
        <style>{`
          :root {
            --bg: #f6efe1;
            --panel: rgba(255, 255, 255, 0.82);
            --panel-2: rgba(250, 244, 232, 0.92);
            --line: rgba(64, 89, 70, 0.12);
            --text: #203126;
            --muted: #65786a;
            --accent-1: #6fa86a;
            --accent-2: #d9b65d;
            --danger: #c65b5b;
          }
          body {
            background: linear-gradient(180deg, #fffaf0 0%, var(--bg) 58%, #f2eadc 100%);
            color: var(--text);
          }
          .nav a:hover {
            background: rgba(111, 168, 106, 0.12);
          }
          .hero-copy p {
            color: #546759;
          }
          .hero-visual,
          .card,
          .kpi-card,
          .sidebar {
            background: rgba(255, 255, 255, 0.82);
            border-color: rgba(64, 89, 70, 0.12);
          }
          input,
          select,
          textarea {
            background: rgba(255,255,255,0.9);
            color: var(--text);
            border-color: rgba(64,89,70,0.14);
          }
          .btn.secondary {
            background: var(--panel-2);
            color: var(--text);
            border: 1px solid rgba(64,89,70,0.14);
          }
          .sidebar a {
            color: #274632;
          }
        `}</style>
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
