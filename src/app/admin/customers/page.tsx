export const dynamic = "force-dynamic";

import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";
import { requirePageAdmin } from "@/lib/auth-guards";

export default async function AdminCustomersPage() {
  await requirePageAdmin();

  const users = await prisma.user.findMany({
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
          <h1>Utilizadores</h1>
          <p className="notice">Clientes, admins e editores do sistema.</p>
        </div>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Papel</th>
                <th>Compras</th>
                <th>Biblioteca</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.checkouts.length}</td>
                  <td>{user.library.length}</td>
                  <td>{user.isActive ? "Sim" : "Não"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
    }
