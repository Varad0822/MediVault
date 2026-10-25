import { ShieldCheck } from "lucide-react";

export default function HealthScoreCard({ health }) {
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="uppercase tracking-widest text-xs opacity-80">
            Overall Health Score
          </p>

          <h1 className="text-5xl font-black mt-2">
            {health.score}
          </h1>

          <p className="mt-2 text-lg font-semibold">
            {health.status}
          </p>
        </div>

        <ShieldCheck size={70} />
      </div>
    </div>
  );
}