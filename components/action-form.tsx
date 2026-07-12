"use client";

import { useActionState, useEffect, useRef } from "react";
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
}

export function ActionForm({
  action,
  children,
  className,
  onSuccess
}: ActionFormProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null
  );
  const { toast } = useToast();
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

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
