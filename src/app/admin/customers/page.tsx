export const dynamic = "force-dynamic";

import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminCustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      library: true,
      checkouts: true,
    },
  });

  return (
    <main className="admin-layout">
      <AdminNav />
      <section>
        <div className="page-intro">
          <h1>Clientes</h1>
          <p className="notice">Contas comerciais e atividade de compra.</p>
        </div>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Compras</th>
                <th>Biblioteca</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.email}</td>
                  <td>{customer.checkouts.length}</td>
                  <td>{customer.library.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
