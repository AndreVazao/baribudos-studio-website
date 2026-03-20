export const dynamic = "force-dynamic";

import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";
import { requirePageAdmin } from "@/lib/auth-guards";

export default async function AdminPage() {
  await requirePageAdmin();

  const [publications, variants, products, users, orders] = await Promise.all([
    prisma.publication.count(),
    prisma.publicationVariant.count(),
    prisma.product.count(),
    prisma.user.count(),
    prisma.checkout.count(),
  ]);

  return (
    <main className="admin-layout">
      <AdminNav />
      <section className="admin-stack">
        <div className="page-intro">
          <h1>Painel do Website</h1>
          <p className="notice">
            Gestão editorial, comercial e operacional do Baribudos Studio Website.
          </p>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card"><span className="muted">Publicações</span><strong>{publications}</strong></div>
          <div className="kpi-card"><span className="muted">Variantes</span><strong>{variants}</strong></div>
          <div className="kpi-card"><span className="muted">Produtos</span><strong>{products}</strong></div>
          <div className="kpi-card"><span className="muted">Utilizadores</span><strong>{users}</strong></div>
          <div className="kpi-card"><span className="muted">Pedidos</span><strong>{orders}</strong></div>
        </div>
      </section>
    </main>
  );
      }
