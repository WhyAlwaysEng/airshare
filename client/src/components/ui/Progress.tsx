interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: "indigo" | "cyan" | "green";
}

export function Progress({
  value,
  max = 100,
  className = "",
  showLabel = false,
  color = "indigo",
}: ProgressProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  const gradients = {
    indigo: "from-indigo-500 to-indigo-400",
    cyan: "from-cyan-500 to-cyan-400",
    green: "from-emerald-500 to-emerald-400",
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-2 rounded-full dark:bg-gray-800 bg-gray-200 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradients[color]} rounded-full
            transition-all duration-300 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs dark:text-gray-400 text-gray-500 mt-1 text-right">
          {Math.round(percent)}%
        </p>
      )}
    </div>
  );
}
