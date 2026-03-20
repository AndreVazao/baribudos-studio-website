export const dynamic = "force-dynamic";

import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/pricing";
import { requirePageAdmin } from "@/lib/auth-guards";

export default async function AdminOrdersPage() {
  await requirePageAdmin();

  const orders = await prisma.checkout.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return (
    <main className="admin-layout">
      <AdminNav />
      <section>
        <div className="page-intro">
          <h1>Pedidos</h1>
          <p className="notice">Histórico de compras e pagamentos.</p>
        </div>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Utilizador</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Itens</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{new Date(order.createdAt).toLocaleString("pt-PT")}</td>
                  <td>{order.user.email}</td>
                  <td>{order.provider}</td>
                  <td>{centsToEuro(order.amountCents, order.currency)}</td>
                  <td>{order.status}</td>
                  <td>{order.items.map((item) => item.product.title).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
      }
