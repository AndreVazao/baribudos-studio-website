"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";

const starterJson = {
  ok: true,
  publication_id: "pub_001",
  variant_id: "project123:website:pt-PT:ebook",
  payload: {
    project_id: "project123",
    project_slug: "baribudos-na-floresta",
    ip_slug: "baribudos",
    ip_name: "Baribudos",
    series_name: "Aventuras dos Baribudos",
    language: "pt-PT",
    title: "Baribudos na Floresta",
    subtitle: "",
    description: "Uma aventura mágica...",
    short_description: "Uma aventura mágica para toda a família.",
    formats: ["ebook", "audiobook"],
    price: 4.99,
    currency: "EUR",
    channel: "website",
    assets: {
      cover: "https://example.com/cover.jpg",
      logos: [],
      gallery: [],
      sample_pages: [],
      audiobook_preview: null,
      video_trailer: null,
      downloadable_files: ["https://example.com/book.pdf"]
    },
    seo: {
      title: "Baribudos na Floresta",
      description: "Uma aventura mágica...",
      keywords: ["baribudos", "infantil", "aventura"],
      canonical_url: "",
      og_image: ""
    },
    characters: [],
    themes: [],
    values: [],
    authors: ["André Vazão"],
    badges: ["4-10", "família"],
    buy_links: []
  },
  related_variants: [],
  related_projects: []
};

export default function ImportPage() {
  const [adminKey, setAdminKey] = useState("");
  const [payload, setPayload] = useState(JSON.stringify(starterJson, null, 2));
  const [result, setResult] = useState("");

  async function submit() {
    setResult("A processar...");

    try {
      const response = await fetch("/api/admin/import-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: payload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha na importação.");
      }

      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Erro desconhecido.");
    }
  }

  return (
    <main style={{ marginTop: 24 }}>
      <h1>Importar publicação</h1>

      <div style={{ display: "grid", gap: 12, maxWidth: 900 }}>
        <input
          type="password"
          placeholder="Admin key"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />

        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={28}
          style={{ fontFamily: "monospace" }}
        />

        <button className="btn" onClick={submit}>
          Importar package
        </button>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            border: "1px solid #243228",
            padding: 16,
            borderRadius: 10,
          }}
        >
          {result}
        </pre>
      </div>
    </main>
  );
    }
