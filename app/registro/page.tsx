import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { signUpWithPassword } from "@/app/auth/actions";

interface RegisterPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-ink text-white shadow-sm">
          <ClipboardList size={22} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-moss">
            Cumple Tasks
          </p>
          <h1 className="text-2xl font-semibold text-ink">Crear cuenta</h1>
        </div>
      </div>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        {params.error ? (
          <div className="mb-4 rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-medium text-ink">
            {params.error}
          </div>
        ) : null}

        <form action={signUpWithPassword} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Nombre</span>
            <input
              autoComplete="name"
              className="mt-1 h-11 w-full rounded-lg border border-ink/15 bg-paper px-3 text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
              name="fullName"
              required
              type="text"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Email</span>
            <input
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-lg border border-ink/15 bg-paper px-3 text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-ink">Contrasena</span>
            <input
              autoComplete="new-password"
              className="mt-1 h-11 w-full rounded-lg border border-ink/15 bg-paper px-3 text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
              minLength={6}
              name="password"
              required
              type="password"
            />
          </label>

          <button
            className="flex h-11 w-full items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white"
            type="submit"
          >
            Registrarme
          </button>
        </form>
      </section>

      <p className="mt-5 text-center text-sm text-ink/65">
        Ya tienes cuenta?{" "}
        <Link className="font-semibold text-moss" href="/login">
          Iniciar sesion
        </Link>
      </p>
    </main>
  );
}
