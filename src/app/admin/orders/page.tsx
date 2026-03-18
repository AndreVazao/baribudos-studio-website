import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/pricing";

export default async function AdminOrdersPage() {
  const orders = await prisma.checkout.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return (
    <main className="admin-layout" style={{ marginTop: 24 }}>
      <AdminNav />
      <section>
        <h1>Pedidos</h1>

        <div className="card" style={{ marginTop: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
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
                  <td>{order.customer.email}</td>
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
