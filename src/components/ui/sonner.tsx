"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
        classNames: {
          success: 'success-toast',
          error: 'error-toast',
          info: 'info-toast',
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "rgba(91, 140, 255, 0.1)",
          "--success-border": "rgba(91, 140, 255, 0.3)",
          "--error-bg": "rgba(239, 68, 68, 0.1)",
          "--error-border": "rgba(239, 68, 68, 0.3)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };