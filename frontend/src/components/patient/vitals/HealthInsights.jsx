import {
  Brain,
  CircleCheck,
  TriangleAlert,
  HeartPulse,
} from "lucide-react";

export default function HealthInsights({
  latestVitals,
  previousVitals,
  health,
}) {
  if (!latestVitals) return null;

  const insights = [];

  // Blood Pressure
  if (
    latestVitals.blood_pressure_sys < 120 &&
    latestVitals.blood_pressure_dia < 80
  ) {
    insights.push({
      icon: CircleCheck,
      color: "text-emerald-600",
      text: "Blood pressure is within the normal range.",
    });
  } else if (
    latestVitals.blood_pressure_sys >= 130 ||
    latestVitals.blood_pressure_dia >= 80
  ) {
    insights.push({
      icon: TriangleAlert,
      color: "text-amber-600",
      text: "Blood pressure is elevated. Continue monitoring regularly.",
    });
  }

  // Blood Sugar
  if (latestVitals.blood_sugar > 125) {
    insights.push({
      icon: TriangleAlert,
      color: "text-rose-600",
      text: "Blood sugar is above the recommended fasting range.",
    });
  } else {
    insights.push({
      icon: CircleCheck,
      color: "text-emerald-600",
      text: "Blood sugar is within the healthy range.",
    });
  }

  // Heart Rate
  if (
    latestVitals.heart_rate >= 60 &&
    latestVitals.heart_rate <= 100
  ) {
    insights.push({
      icon: HeartPulse,
      color: "text-blue-600",
      text: "Heart rate is within the normal resting range.",
    });
  }

  // Weight Change
  if (previousVitals?.weight_kg && latestVitals.weight_kg) {
    const diff =
      latestVitals.weight_kg -
      previousVitals.weight_kg;

    if (Math.abs(diff) >= 1) {
      insights.push({
        icon: diff > 0 ? TriangleAlert : CircleCheck,
        color:
          diff > 0
            ? "text-amber-600"
            : "text-emerald-600",
        text:
          diff > 0
            ? `Weight increased by ${diff.toFixed(1)} kg since your last reading.`
            : `Weight reduced by ${Math.abs(diff).toFixed(
                1
              )} kg since your last reading.`,
      });
    }
  }

  insights.push({
    icon: Brain,
    color: health.color,
    text: `Overall Health Score: ${health.score}/100 (${health.status})`,
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
      <div className="flex items-center gap-3 mb-5">
        <Brain className="text-blue-600" size={24} />

        <div>
          <h3 className="font-black text-slate-900">
            Health Insights
          </h3>

          <p className="text-sm text-slate-500">
            Personalized observations based on your latest
            health metrics.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={index}
              className="flex items-start gap-3"
            >
              <Icon
                size={20}
                className={item.color}
              />

              <p className="text-sm text-slate-700">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}