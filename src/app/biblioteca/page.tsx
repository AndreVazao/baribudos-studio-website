import { prisma } from "@/lib/prisma";
import { verifyLibraryToken } from "@/lib/library";

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <main style={{ marginTop: 24 }}>
        <div className="card">
          <h1>Biblioteca</h1>
          <p>Link de acesso inválido.</p>
        </div>
      </main>
    );
  }

  try {
    const payload = verifyLibraryToken(token);

    if (payload.email !== email.toLowerCase().trim()) {
      throw new Error("Email não corresponde.");
    }

    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
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
      <main style={{ marginTop: 24 }}>
        <h1>Biblioteca do Cliente</h1>
        <p className="muted">{email}</p>

        <div className="grid" style={{ marginTop: 24 }}>
          {customer?.library.map((entry) => {
            const files = entry.product.variant.assets.filter(
              (a) => a.role === "DOWNLOADABLE_FILE"
            );

            return (
              <article key={entry.id} className="card">
                <h3>{entry.product.title}</h3>
                <p className="muted">{entry.product.type}</p>

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
  } catch {
    return (
      <main style={{ marginTop: 24 }}>
        <div className="card">
          <h1>Biblioteca</h1>
          <p>Acesso inválido ou expirado.</p>
        </div>
      </main>
    );
  }
    }
