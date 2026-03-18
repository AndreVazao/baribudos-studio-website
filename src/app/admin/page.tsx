import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [publications, variants, products, customers, orders] = await Promise.all([
    prisma.publication.count(),
    prisma.publicationVariant.count(),
    prisma.product.count(),
    prisma.customer.count(),
    prisma.checkout.count(),
  ]);

  return (
    <main className="admin-layout" style={{ marginTop: 24 }}>
      <AdminNav />
      <section>
        <h1>Painel do Website</h1>

        <div className="grid" style={{ marginTop: 24 }}>
          <div className="card">
            <h3>Publicações</h3>
            <p>{publications}</p>
          </div>
          <div className="card">
            <h3>Variantes</h3>
            <p>{variants}</p>
          </div>
          <div className="card">
            <h3>Produtos</h3>
            <p>{products}</p>
          </div>
          <div className="card">
            <h3>Clientes</h3>
            <p>{customers}</p>
          </div>
          <div className="card">
            <h3>Pedidos</h3>
            <p>{orders}</p>
          </div>
        </div>
      </section>
    </main>
  );
            }
