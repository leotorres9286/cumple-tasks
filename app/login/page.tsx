import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { signInWithGoogle, signInWithPassword } from "@/app/auth/actions";
import { ParamsToast } from "@/components/params-toast";
import { SubmitButton } from "@/components/submit-button";
import { isPublicSignupEnabled } from "@/lib/auth-settings";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
    redirectTo?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const publicSignupEnabled = isPublicSignupEnabled();
  const redirectTo =
    params.redirectTo?.startsWith("/") && !params.redirectTo.startsWith("//")
      ? params.redirectTo
      : "/";

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
          <h1 className="text-2xl font-semibold text-ink">Iniciar sesion</h1>
        </div>
      </div>

      <ParamsToast error={params.error} message={params.message} />

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
        <form action={signInWithPassword} className="space-y-4">
          <input name="redirectTo" type="hidden" value={redirectTo} />
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
              autoComplete="current-password"
              className="mt-1 h-11 w-full rounded-lg border border-ink/15 bg-paper px-3 text-ink outline-none ring-moss/25 transition focus:border-moss focus:ring-4"
              name="password"
              required
              type="password"
            />
          </label>

          <SubmitButton
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white"
            pendingLabel="Entrando..."
          >
            Entrar
          </SubmitButton>
        </form>

        <div className="my-4 h-px bg-ink/10" />

        <form action={signInWithGoogle}>
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <SubmitButton
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 text-sm font-semibold text-ink shadow-sm"
            pendingLabel="Conectando..."
          >
            Entrar con Google
          </SubmitButton>
        </form>
      </section>

      {publicSignupEnabled ? (
        <p className="mt-5 text-center text-sm text-ink/65">
          No tienes cuenta?{" "}
          <Link className="font-semibold text-moss" href="/registro">
            Crear cuenta
          </Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-ink/65">
          Las cuentas nuevas las crea un admin.
        </p>
      )}
    </main>
  );
}
