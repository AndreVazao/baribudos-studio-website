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
          .sidebar,
          .footer-shell {
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
          .sidebar a,
          .footer-link {
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
              <Link href="/colecoes">Coleções</Link>
              <Link href="/loja">Loja</Link>
              <Link href="/em-breve">Em breve</Link>
              <Link href="/novidades">Novidades</Link>
              <Link href="/faq">FAQ</Link>

              {user ? <Link href="/conta">Conta</Link> : <Link href="/login">Entrar</Link>}

              {isAdmin ? <Link href="/admin">Admin</Link> : null}
            </nav>
          </header>

          {children}

          <footer className="footer-shell">
            <div className="footer-grid">
              <div className="footer-block">
                <strong>Baribudos Studio</strong>
                <p className="muted">Montra editorial e comercial preparada para crescer por universos, coleções, pré-lançamentos e produtos.</p>
              </div>

              <div className="footer-block">
                <strong>Explorar</strong>
                <div className="footer-links">
                  <Link href="/loja" className="footer-link">Loja</Link>
                  <Link href="/ips" className="footer-link">IPs</Link>
                  <Link href="/colecoes" className="footer-link">Coleções</Link>
                  <Link href="/em-breve" className="footer-link">Em breve</Link>
                  <Link href="/novidades" className="footer-link">Novidades</Link>
                  <Link href="/faq" className="footer-link">FAQ</Link>
                </div>
              </div>

              <div className="footer-block">
                <strong>Crescimento</strong>
                <div className="footer-links">
                  <a href="mailto:contacto@baribudos.pt?subject=Interesse%20em%20novidades%20Baribudos" className="footer-link">Receber novidades</a>
                  <Link href="/loja" className="footer-link">Comprar agora</Link>
                  <Link href="/em-breve" className="footer-link">Ver pré-lançamentos</Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
