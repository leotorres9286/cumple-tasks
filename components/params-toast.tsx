"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/toast";

interface ParamsToastProps {
  error?: string;
  message?: string;
}

export function ParamsToast({ error, message }: ParamsToastProps) {
  const { toast } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) {
      return;
    }

    if (error) {
      shownRef.current = true;
      toast(error, "error");
    } else if (message) {
      shownRef.current = true;
      toast(message, "success");
    }
  }, [error, message, toast]);

  return null;
}
