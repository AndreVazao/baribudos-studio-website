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
    <main className="admin-layout" style={{ marginTop: 24 }}>
      <AdminNav />
      <section>
        <h1>Clientes</h1>

        <div className="card" style={{ marginTop: 20 }}>
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
