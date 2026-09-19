import Link from "next/link";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialError = typeof params.error === "string" ? params.error : "";
  const initialNext = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <main className="shell auth-shell">
      <div className="page auth-page">
        <header className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">EP</span>
            <span>E-COMMERCE <b>PREMIUM</b></span>
          </Link>
          <Link href="/" className="button">Home</Link>
        </header>
        <LoginForm initialError={initialError} initialNext={initialNext} />
      </div>
    </main>
  );
}
