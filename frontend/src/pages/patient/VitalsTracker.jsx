import { useEffect, useState } from "react";
import { Activity, Heart, Thermometer, Weight, PlusCircle, CheckCircle2, Trash2, X, AlertCircle, Scale, Droplet } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import vitalsService from "../../services/vitalsService";
import HealthScoreCard from "../../components/patient/vitals/HealthScoreCard";
import { getTrend } from "../../utils/vitalsTrend";
import { calculateHealthScore } from "../../utils/healthScore";
import HealthInsights from "../../components/patient/vitals/HealthInsights";
import VitalsTrendChart from "../../components/patient/vitals/VitalsTrendChart";
import aiPredictionService from "../../services/aiPredictionService";
import AIHealthAssessment from "../../components/patient/vitals/AIHealthAssessment";

function VitalsTracker() {
  const [loading, setLoading] = useState(true);
  const [vitalsList, setVitalsList] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [sugar, setSugar] = useState("");
  const [weight, setWeight] = useState("");
  const [temp, setTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [aiPrediction, setAiPrediction] = useState(null);
  useEffect(() => {
    loadVitals();
  }, []);

  async function loadVitals() {
    try {

      setLoading(true);

      const data = await vitalsService.getPatientVitals();

      setVitalsList(data);

      const latest = data.length > 0 ? data[0] : null;

      setLatestVitals(latest);

      if (latest) {
        await analyzeHealth(latest);
      }

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }
  async function analyzeHealth(vitals) {
    try {
      const payload = {
        // Heart Model
        age: 45,
        sex: 1,
        trestbps: Number(vitals.blood_pressure_sys) || 0,
        chol: 200,
        thalch: Number(vitals.heart_rate) || 0,
        oldpeak: 0,
        fbs: Number(vitals.blood_sugar) > 120 ? 1 : 0,
        exang: 0,

        // Diabetes Model
        HighBP: Number(vitals.blood_pressure_sys) >= 140 ? 1 : 0,
        HighChol: 0,
        BMI: Number(vitals.weight_kg) || 0,
        Smoker: 0,
        Stroke: 0,
        HeartDiseaseorAttack: 0,
        PhysActivity: 1,
        Fruits: 1,
        Veggies: 1,
        HvyAlcoholConsump: 0,
        GenHlth: 2,
        PhysHlth: 0,
        DiffWalk: 0,
        Age: 8
      };

      const result = await aiPredictionService.analyzeVitals(payload);

      console.log(result);

      setAiPrediction(result);

    } catch (err) {

      console.error("AI Prediction Error:", err);

    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await vitalsService.logVitals({
        bloodPressureSys: sys,
        bloodPressureDia: dia,
        heartRate,
        bloodSugar: sugar,
        weightKg: weight,
        temperatureF: temp,
        notes,
      });

      setToast({ type: "success", text: "Health vitals recorded successfully!" });
      setShowModal(false);
      setSys("");
      setDia("");
      setHeartRate("");
      setSugar("");
      setWeight("");
      setTemp("");
      setNotes("");

      await loadVitals();
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message || "Failed to log vitals." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vitals entry?")) {
      return;
    }

    try {
      await vitalsService.deleteVitalsEntry(id);
      setToast({ type: "success", text: "Vitals log deleted." });
      await loadVitals();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message });
    }
  };

  // Helper functions for health status
  const getBPStatus = (s, d) => {
    if (!s || !d) return { label: "N/A", color: "bg-slate-100 text-slate-600" };
    if (s < 120 && d < 80) return { label: "Normal", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (s <= 129 && d < 80) return { label: "Elevated", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "High (Stage 1+)", color: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  const getSugarStatus = (val) => {
    if (!val) return { label: "N/A", color: "bg-slate-100 text-slate-600" };
    if (val < 100) return { label: "Normal Fasting", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (val <= 125) return { label: "Pre-diabetic", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "High Glucose", color: "bg-rose-50 text-rose-700 border-rose-200" };
  };

  if (loading) {
    return <Loader fullScreen text="Loading Vitals & Health Metrics..." />;
  }

  const bpInfo = getBPStatus(latestVitals?.blood_pressure_sys, latestVitals?.blood_pressure_dia);
  const sugarInfo = getSugarStatus(latestVitals?.blood_sugar);
  const health = calculateHealthScore(latestVitals);
  const previousVitals =
    vitalsList.length > 1 ? vitalsList[1] : null;
  const bpTrend = getTrend(
    latestVitals?.blood_pressure_sys,
    previousVitals?.blood_pressure_sys
  );

  const sugarTrend = getTrend(
    latestVitals?.blood_sugar,
    previousVitals?.blood_sugar
  );

  const heartTrend = getTrend(
    latestVitals?.heart_rate,
    previousVitals?.heart_rate
  );

  const weightTrend = getTrend(
    latestVitals?.weight_kg,
    previousVitals?.weight_kg
  );
  const chartData = [...vitalsList]
    .reverse()
    .map((v) => ({
      date: new Date(v.recorded_at).toLocaleDateString(),

      bloodPressure: v.blood_pressure_sys,

      sugar: v.blood_sugar,

      heartRate: v.heart_rate,

      weight: v.weight_kg,
    }));
  return (
    <PatientLayout title="Vitals & Health Metrics">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Personal Health Vitals Tracker"
          subtitle="Track your daily blood pressure readings, heart rate, blood glucose levels, weight, and body temperature."
        />
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 shrink-0"
        >
          <PlusCircle size={16} /> Log Vitals Reading
        </button>
      </div>

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm font-semibold border ${toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{toast.text}</span>
          </div>
        </div>
      )}
      <div className="mb-8">
        <HealthScoreCard health={health} />
      </div>
      <AIHealthAssessment prediction={aiPrediction} />
      {/* Latest Vitals Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Blood Pressure</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {latestVitals?.blood_pressure_sys ? `${latestVitals.blood_pressure_sys}/${latestVitals.blood_pressure_dia}` : "--/--"}
            <span className="text-xs font-semibold text-slate-400 ml-1">mmHg</span>
          </h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border mt-2 ${bpInfo.color}`}>
            <p className={`mt-2 text-xs font-bold ${bpTrend.color}`}>
              {bpTrend.icon} {bpTrend.label}
            </p>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Heart Rate</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {latestVitals?.heart_rate || "--"}
            <span className="text-xs font-semibold text-slate-400 ml-1">BPM</span>
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
            <p className={`mt-2 text-xs font-bold ${heartTrend.color}`}>
              {heartTrend.icon} {heartTrend.label}
            </p>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Blood Sugar</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Droplet size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {latestVitals?.blood_sugar || "--"}
            <span className="text-xs font-semibold text-slate-400 ml-1">mg/dL</span>
          </h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border mt-2 ${sugarInfo.color}`}>
            <p className={`mt-2 text-xs font-bold ${sugarTrend.color}`}>
              {sugarTrend.icon} {sugarTrend.label}
            </p>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Weight & Temp</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Scale size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-900">
            {latestVitals?.weight_kg || "--"} <span className="text-xs font-semibold text-slate-400">kg</span> | {latestVitals?.temperature_f || "--"} <span className="text-xs font-semibold text-slate-400">°F</span>
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 mt-2">
            <p className={`mt-2 text-xs font-bold ${weightTrend.color}`}>
              {weightTrend.icon} {weightTrend.label}
            </p>
          </span>
        </div>
      </div>
      <HealthInsights
        latestVitals={latestVitals}
        previousVitals={previousVitals}
        health={health}
      />
      <div className="grid lg:grid-cols-2 gap-6 mb-8">

        <VitalsTrendChart
          title="Blood Pressure Trend"
          data={chartData}
          dataKey="bloodPressure"
          color="#2563eb"
          unit="mmHg"
        />

        <VitalsTrendChart
          title="Blood Sugar Trend"
          data={chartData}
          dataKey="sugar"
          color="#9333ea"
          unit="mg/dL"
        />

        <VitalsTrendChart
          title="Heart Rate Trend"
          data={chartData}
          dataKey="heartRate"
          color="#dc2626"
          unit="BPM"
        />

        <VitalsTrendChart
          title="Weight Trend"
          data={chartData}
          dataKey="weight"
          color="#ca8a04"
          unit="kg"
        />

      </div>
      {/* Vitals History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="font-extrabold text-slate-900 text-base mb-4">
          Chronological Vitals Log Ledger
        </h3>

        {vitalsList.length === 0 ? (
          <EmptyState
            title="No Vitals Recorded"
            description="You haven't logged any health vitals yet. Click 'Log Vitals Reading' above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                  <th className="p-3.5 rounded-l-xl">Recorded Date & Time</th>
                  <th className="p-3.5">Blood Pressure</th>
                  <th className="p-3.5">Heart Rate</th>
                  <th className="p-3.5">Blood Glucose</th>
                  <th className="p-3.5">Weight (kg)</th>
                  <th className="p-3.5">Temp (°F)</th>
                  <th className="p-3.5">Notes</th>
                  <th className="p-3.5 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {vitalsList.map((v) => {
                  const status = getBPStatus(v.blood_pressure_sys, v.blood_pressure_dia);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-semibold text-slate-900">
                        {new Date(v.recorded_at).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        {v.blood_pressure_sys ? (
                          <span className="font-extrabold text-slate-900">
                            {v.blood_pressure_sys}/{v.blood_pressure_dia}{" "}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ml-1 ${status.color}`}>
                              {status.label}
                            </span>
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-rose-600">
                        {v.heart_rate ? `${v.heart_rate} BPM` : "--"}
                      </td>
                      <td className="p-3.5 font-bold text-purple-600">
                        {v.blood_sugar ? `${v.blood_sugar} mg/dL` : "--"}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {v.weight_kg ? `${v.weight_kg} kg` : "--"}
                      </td>
                      <td className="p-3.5 font-semibold text-amber-700">
                        {v.temperature_f ? `${v.temperature_f} °F` : "--"}
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-xs truncate">
                        {v.notes || "--"}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition"
                          title="Delete Reading"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Vitals Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Activity size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Log Health Vitals Reading
                </h3>
                <p className="text-xs text-slate-500">
                  Enter your latest physiological health metrics.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Blood Pressure Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={sys}
                    onChange={(e) => setSys(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 font-bold"
                  />
                </div>
              </div>

              {/* Heart Rate & Glucose Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 95"
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Weight & Temperature Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 70.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Body Temp (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98.6"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Reading Notes / Context
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Measured in morning before breakfast..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  {saving ? "Saving Log..." : "Save Vitals Reading"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default VitalsTracker;
