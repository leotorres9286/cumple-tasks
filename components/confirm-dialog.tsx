"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createContext } from "react";
import { cn } from "@/lib/utils";

type ConfirmTone = "default" | "danger";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ConfirmState extends ConfirmOptions {
  id: number;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm debe usarse dentro de un ConfirmProvider.");
  }

  return context.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const idRef = useRef(0);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    // Si ya hay un dialogo abierto, lo cancelamos antes de mostrar el nuevo.
    resolverRef.current?.(false);
    idRef.current += 1;

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ id: idRef.current, ...options });
    });
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }

    confirmButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        settle(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, settle]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const isDanger = state?.tone === "danger";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state ? (
          <motion.div
            animate={{ opacity: 1 }}
            aria-modal="true"
            className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="confirm-backdrop"
            onClick={() => settle(false)}
            role="dialog"
            transition={{ duration: 0.15 }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-sm rounded-2xl border border-ink/10 bg-white p-5 shadow-soft"
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              key={state.id}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-base font-semibold text-ink">{state.title}</h2>
              {state.description ? (
                <p className="mt-2 text-sm text-ink/65">{state.description}</p>
              ) : null}

              <div className="mt-5 flex gap-2">
                <button
                  className="h-10 flex-1 rounded-lg border border-ink/15 bg-white text-sm font-semibold text-ink shadow-sm transition hover:bg-paper"
                  onClick={() => settle(false)}
                  type="button"
                >
                  {state.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  className={cn(
                    "h-10 flex-1 rounded-lg text-sm font-semibold text-white shadow-sm transition",
                    isDanger ? "bg-coral hover:bg-coral/90" : "bg-ink hover:bg-ink/90"
                  )}
                  onClick={() => settle(true)}
                  ref={confirmButtonRef}
                  type="button"
                >
                  {state.confirmLabel ?? "Confirmar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
