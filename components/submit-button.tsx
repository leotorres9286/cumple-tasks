"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  pendingLabel?: string;
  spinnerSize?: number;
  title?: string;
}

export function SubmitButton({
  children,
  className,
  disabled,
  icon,
  pendingLabel,
  spinnerSize = 16,
  title
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      className={cn(className, pending && "cursor-progress opacity-75")}
      disabled={pending || disabled}
      title={title}
      type="submit"
    >
      {pending ? <Loader2 className="animate-spin" size={spinnerSize} /> : icon}
      {children ? (
        <span>{pending && pendingLabel ? pendingLabel : children}</span>
      ) : null}
    </button>
  );
}
