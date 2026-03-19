export const dynamic = "force-dynamic";

import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/pricing";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      variant: true,
    },
  });

  return (
    <main className="admin-layout">
      <AdminNav />
      <section>
        <div className="page-intro">
          <h1>Produtos</h1>
          <p className="notice">Camada comercial derivada das publication variants.</p>
        </div>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Preço</th>
                <th>Ativo</th>
                <th>Destaque</th>
                <th>Variant ID</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.title}</td>
                  <td>{product.type}</td>
                  <td>{centsToEuro(product.priceCents, product.currency)}</td>
                  <td>{product.active ? "Sim" : "Não"}</td>
                  <td>{product.featured ? "Sim" : "Não"}</td>
                  <td>{product.publicationVariantId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
