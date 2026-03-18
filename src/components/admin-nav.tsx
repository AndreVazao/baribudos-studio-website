import Link from "next/link";

export default function AdminNav() {
  return (
    <aside className="sidebar">
      <h3 style={{ marginTop: 0 }}>Dashboard</h3>
      <Link href="/admin">Resumo</Link>
      <Link href="/admin/import">Importar</Link>
      <Link href="/admin/publications">Publicações</Link>
      <Link href="/admin/products">Produtos</Link>
      <Link href="/admin/orders">Pedidos</Link>
      <Link href="/admin/customers">Clientes</Link>
    </aside>
  );
}
