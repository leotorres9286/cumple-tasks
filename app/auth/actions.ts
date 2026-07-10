"use server";

import { redirect } from "next/navigation";
import { isPublicSignupEnabled } from "@/lib/auth-settings";
import { createClient } from "@/lib/supabase/server";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getSafePath(value: FormDataEntryValue | string | null) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/";
}

function withMessage(path: string, key: "error" | "message", message: string) {
  const params = new URLSearchParams({ [key]: message });
  return `${path}?${params.toString()}`;
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafePath(formData.get("redirectTo"));

  if (!email || !password) {
    redirect(withMessage("/login", "error", "Introduce email y contrasena."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(withMessage("/login", "error", "No se pudo iniciar sesion."));
  }

  redirect(redirectTo);
}

export async function signUpWithPassword(formData: FormData) {
  if (!isPublicSignupEnabled()) {
    redirect(
      withMessage(
        "/login",
        "error",
        "El registro publico esta desactivado. Pide a un admin que cree tu usuario."
      )
    );
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || password.length < 6) {
    redirect(
      withMessage(
        "/registro",
        "error",
        "Completa los datos y usa una contrasena de al menos 6 caracteres."
      )
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "responsable"
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback`
    }
  });

  if (error) {
    redirect(withMessage("/registro", "error", "No se pudo crear la cuenta."));
  }

  if (data.session) {
    redirect("/");
  }

  redirect(
    withMessage(
      "/login",
      "message",
      "Cuenta creada. Revisa tu email si Supabase pide confirmacion."
    )
  );
}

export async function signInWithGoogle(formData: FormData) {
  const redirectTo = getSafePath(formData.get("redirectTo"));
  const callbackUrl = new URL("/auth/callback", getAppUrl());
  callbackUrl.searchParams.set("next", redirectTo);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString()
    }
  });

  if (error || !data.url) {
    redirect(withMessage("/login", "error", "No se pudo iniciar sesion con Google."));
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
