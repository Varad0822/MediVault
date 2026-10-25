import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function DashboardCard({
  title,
  description,
  icon,
  link,
  buttonText = "Action",
  color = "blue",
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-200/60",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200/60",
    purple: "bg-purple-50 text-purple-600 border-purple-200/60",
    amber: "bg-amber-50 text-amber-600 border-amber-200/60",
  };

  const badgeStyle = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105 ${badgeStyle}`}
        >
          {icon}
        </div>

        <h2 className="text-lg font-bold mt-5 text-slate-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h2>

        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <Link
          to={link}
          className="inline-flex items-center justify-between w-full text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition"
        >
          <span>{buttonText}</span>
          <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export default DashboardCard;