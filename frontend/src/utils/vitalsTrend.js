export function getTrend(current, previous) {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined
  ) {
    return {
      icon: "•",
      label: "No Trend",
      color: "text-slate-500",
    };
  }

  if (current > previous) {
    return {
      icon: "▲",
      label: "Increased",
      color: "text-rose-600",
    };
  }

  if (current < previous) {
    return {
      icon: "▼",
      label: "Improved",
      color: "text-emerald-600",
    };
  }

  return {
    icon: "→",
    label: "Stable",
    color: "text-blue-600",
  };
}