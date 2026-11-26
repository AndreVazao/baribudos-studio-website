import GuestLibraryClaimForm from "./claim-form"

export default async function GuestLibraryClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  return (
    <main className="page-shell" style={{ marginTop: 24 }}>
      <GuestLibraryClaimForm token={typeof token === "string" ? token : ""} />
    </main>
  )
}
