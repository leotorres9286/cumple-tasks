"use client";

import { useActionState, useEffect, useRef } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import type { ConfirmOptions } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import type { ActionResult } from "@/lib/types";

type Action = (
  prevState: ActionResult | null,
  formData: FormData
) => Promise<ActionResult>;

interface ActionFormProps {
  action: Action;
  children: React.ReactNode;
  className?: string;
  onSuccess?: () => void;
  confirm?: ConfirmOptions;
}

export function ActionForm({
  action,
  children,
  className,
  onSuccess,
  confirm
}: ActionFormProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null
  );
  const { toast } = useToast();
  const confirmDialog = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const handledRef = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (!state || state === handledRef.current) {
      return;
    }

    handledRef.current = state;
    toast(state.message, state.ok ? "success" : "error");

    if (state.ok) {
      onSuccess?.();
    }
  }, [state, toast, onSuccess]);

  // Si se configura `confirm`, interceptamos el envio: pedimos confirmacion y
  // solo entonces re-enviamos el formulario (marcando confirmedRef para dejar
  // pasar el segundo submit hacia la server action).
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!confirm || confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }

    event.preventDefault();

    if (await confirmDialog(confirm)) {
      confirmedRef.current = true;
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form action={formAction} className={className} onSubmit={handleSubmit} ref={formRef}>
      {children}
    </form>
  );
}
