export const dynamic = "force-dynamic";
import AdminNav from "@/components/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminPublicationsPage() {
  const publications = await prisma.publication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      variants: true,
      ip: true,
      series: true,
    },
  });

  return (
    <main className="admin-layout" style={{ marginTop: 24 }}>
      <AdminNav />
      <section>
        <h1>Publicações</h1>

        <div className="card" style={{ marginTop: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Publication ID</th>
                <th>Projeto</th>
                <th>IP</th>
                <th>Idioma</th>
                <th>Canal</th>
                <th>Variantes</th>
              </tr>
            </thead>
            <tbody>
              {publications.map((publication) => (
                <tr key={publication.id}>
                  <td>{publication.publicationId}</td>
                  <td>{publication.projectSlug}</td>
                  <td>{publication.ip.name}</td>
                  <td>{publication.language}</td>
                  <td>{publication.channel}</td>
                  <td>{publication.variants.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
