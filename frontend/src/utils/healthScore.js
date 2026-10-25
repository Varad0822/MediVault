export function calculateHealthScore(vitals) {
  if (!vitals) {
    return {
      score: 0,
      status: "No Data",
      color: "text-slate-500",
    };
  }

  let score = 100;

  // Blood Pressure
  if (
    vitals.blood_pressure_sys > 130 ||
    vitals.blood_pressure_dia > 85
  ) {
    score -= 15;
  }

  // Heart Rate
  if (
    vitals.heart_rate < 60 ||
    vitals.heart_rate > 100
  ) {
    score -= 10;
  }

  // Blood Sugar
  if (vitals.blood_sugar > 125) {
    score -= 20;
  }

  // Temperature
  if (
    vitals.temperature_f > 99.5 ||
    vitals.temperature_f < 97
  ) {
    score -= 5;
  }

  score = Math.max(score, 0);

  let status = "Excellent";
  let color = "text-emerald-600";

  if (score < 90) {
    status = "Good";
    color = "text-blue-600";
  }

  if (score < 75) {
    status = "Fair";
    color = "text-amber-600";
  }

  if (score < 60) {
    status = "Needs Attention";
    color = "text-rose-600";
  }

  return {
    score,
    status,
    color,
  };
}