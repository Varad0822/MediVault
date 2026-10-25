import React from "react";

function StatCard({
  title,
  value,
  icon,
  subtitle,
  color = "blue",
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50/80 border-blue-200/60 text-blue-600",
      glow: "from-blue-600 to-indigo-600",
    },
    emerald: {
      bg: "bg-emerald-50/80 border-emerald-200/60 text-emerald-600",
      glow: "from-emerald-600 to-teal-600",
    },
    purple: {
      bg: "bg-purple-50/80 border-purple-200/60 text-purple-600",
      glow: "from-purple-600 to-indigo-600",
    },
    amber: {
      bg: "bg-amber-50/80 border-amber-200/60 text-amber-600",
      glow: "from-amber-500 to-orange-600",
    },
  };

  const selectedColor = colorMap[color] || colorMap.blue;

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h2 className="text-3xl font-black mt-2 text-slate-900 tracking-tight">
            {value}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105 ${selectedColor.bg}`}
        >
          {icon}
        </div>
      </div>

      {/* Decorative Gradient Bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${selectedColor.glow}`}></div>
    </div>
  );
}

export default StatCard;