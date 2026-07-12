"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 3600;

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: React.ReactNode }
> = {
  success: {
    container: "border-moss/30 bg-white text-ink",
    icon: <CheckCircle2 className="text-moss" size={18} />
  },
  error: {
    container: "border-coral/40 bg-white text-ink",
    icon: <XCircle className="text-coral" size={18} />
  },
  info: {
    container: "border-ink/15 bg-ink text-white",
    icon: <Info className="text-white" size={18} />
  }
};

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider.");
  }

  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      idRef.current += 1;
      const id = idRef.current;

      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const styles = variantStyles[item.variant];

            return (
              <motion.div
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-soft",
                  styles.container
                )}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                key={item.id}
                layout
                transition={{ duration: 0.2 }}
              >
                {styles.icon}
                <span className="min-w-0 flex-1">{item.message}</span>
                <button
                  className={cn(
                    "grid size-6 place-items-center rounded-full transition",
                    item.variant === "info"
                      ? "text-white/70 hover:text-white"
                      : "text-ink/40 hover:text-ink"
                  )}
                  onClick={() => dismiss(item.id)}
                  title="Cerrar"
                  type="button"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
