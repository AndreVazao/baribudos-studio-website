export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/auth-guards";

export default async function BibliotecaPage() {
  const user = await requirePageUser();

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      library: {
        include: {
          product: {
            include: {
              variant: {
                include: {
                  assets: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <main className="page-shell">
      <div className="page-intro">
        <h1>Biblioteca</h1>
        <p className="notice">Conteúdos comprados e atribuídos à tua conta.</p>
      </div>

      <div className="grid">
        {fullUser?.library.map((entry) => {
          const files = entry.product.variant.assets.filter(
            (a) => a.role === "DOWNLOADABLE_FILE"
          );

          return (
            <article key={entry.id} className="card">
              <h3>{entry.product.title}</h3>
              <p className="muted">{entry.product.type}</p>

              {files.length === 0 ? <p className="muted">Sem ficheiros disponíveis.</p> : null}

              {files.map((file) => (
                <p key={file.id}>
                  <a href={file.fileUrl} target="_blank">
                    Download ficheiro
                  </a>
                </p>
              ))}
            </article>
          );
        })}
      </div>
    </main>
  );
                }
