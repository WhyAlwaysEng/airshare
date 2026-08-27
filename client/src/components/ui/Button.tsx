import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25",
  secondary:
    "dark:bg-gray-800 dark:hover:bg-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 text-gray-700 border dark:border-gray-700 border-gray-200",
  ghost: "dark:bg-transparent dark:hover:bg-gray-800 bg-transparent hover:bg-gray-100 dark:text-gray-400 text-gray-500 hover:dark:text-white hover:text-gray-900",
  danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
