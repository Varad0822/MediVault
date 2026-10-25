import { useEffect, useState } from "react";
import { FileText, ClipboardList, KeyRound, ShieldCheck, User, ArrowRight, Activity, Clock, Sparkles, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import DashboardCard from "../../components/common/DashboardCard";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";

import patientService from "../../services/patientService";

function PatientDashboard() {
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPrescriptions: 0,
    activeSessions: 0,
  });

  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [
        patient,
        dashboardStats,
        records,
        prescriptionList,
        sessions,
      ] = await Promise.all([
        patientService.getPatientProfile(),
        patientService.getDashboardStats(),
        patientService.getMedicalRecords(),
        patientService.getPrescriptions(),
        patientService.getAccessSessions(),
      ]);

      setProfile(patient);
      setStats(dashboardStats);
      setMedicalRecords(records);
      setPrescriptions(prescriptionList);
      setActiveSessions(sessions.filter((s) => s.is_active && new Date(s.expiry) > new Date()));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const copyPatientCode = () => {
    if (!profile?.patient_code) return;
    navigator.clipboard.writeText(profile.patient_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return <Loader fullScreen text="Securing patient data..." />;
  }

  const patientCode = profile?.patient_code || "PAT-PENDING";

  return (
    <PatientLayout title="Patient Portal">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <PageHeader
          title={`Welcome, ${profile?.full_name || "Patient"} 👋`}
          subtitle="Manage your personal electronic health records, active doctor access, and prescriptions."
        />

        {/* Unique Short Patient ID Badge Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-md shrink-0">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Patient Unique ID</span>
            <code className="text-sm font-mono font-black text-teal-300 tracking-wider">{patientCode}</code>
          </div>
          <button
            onClick={copyPatientCode}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700"
            title="Copy Patient ID"
          >
            {copiedCode ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Health Quick Info Banner */}
      {profile && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-200 text-xs font-bold uppercase tracking-wider">Health Profile Summary</span>
                <span className="bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold text-teal-200 border border-white/20">
                  ID: {patientCode}
                </span>
              </div>
              <h2 className="text-xl font-bold">
                Blood Group: <span className="underline decoration-teal-300 underline-offset-4">{profile.blood_group || "Not Set"}</span> | Age: {profile.age || "N/A"}
              </h2>
              <p className="text-sm text-blue-100 max-w-xl">
                Known Allergies: {profile.allergies || "None reported"}
              </p>
            </div>
            <Link
              to="/patient-profile"
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-semibold transition border border-white/30 flex items-center gap-2"
            >
              <User size={16} />
              Update Medical Profile
            </Link>
          </div>
          <Activity size={180} className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none" />
        </div>
      )}

      {/* Statistics KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Medical Records"
          value={stats.totalRecords}
          subtitle="Consultation & Lab Logs"
          icon={<FileText size={24} />}
          color="blue"
        />

        <StatCard
          title="Active Prescriptions"
          value={stats.totalPrescriptions}
          subtitle="Medication Prescriptions"
          icon={<ClipboardList size={24} />}
          color="emerald"
        />

        <StatCard
          title="Active Doctor Access OTPs"
          value={stats.activeSessions}
          subtitle="Live Secure Sessions"
          icon={<KeyRound size={24} />}
          color="purple"
        />
      </div>

      {/* Quick Action Shortcuts */}
      <div className="mb-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Scan & Import Record"
            description="Upload or paste past medical reports to auto-extract symptoms and diagnoses."
            icon={<Sparkles size={26} />}
            buttonText="Scan Record"
            link="/upload-past-record"
            color="amber"
          />

          <DashboardCard
            title="Generate Doctor OTP"
            description="Grant temporary, time-limited access to a doctor using a 6-digit OTP."
            icon={<KeyRound size={26} />}
            buttonText="Generate OTP"
            link="/generate-access"
            color="purple"
          />

          <DashboardCard
            title="Medical History"
            description="Review clinical diagnoses, doctor notes, and historical treatment records."
            icon={<FileText size={26} />}
            buttonText="View History"
            link="/medical-history"
            color="blue"
          />

          <DashboardCard
            title="Prescriptions Ledger"
            description="Access dosage instructions, duration, and doctor recommendations."
            icon={<ClipboardList size={26} />}
            buttonText="View Prescriptions"
            link="/prescriptions"
            color="emerald"
          />
        </div>
      </div>

      {/* Active Sessions Watcher */}
      {activeSessions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                You have {activeSessions.length} Active Doctor Access OTP Session(s)
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Doctors with your OTP can access records until expiration.
              </p>
            </div>
          </div>
          <Link
            to="/generate-access"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            Manage / Revoke Sessions
          </Link>
        </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Medical Records */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Recent Medical History
              </h3>
              <Link
                to="/medical-history"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {medicalRecords.length === 0 ? (
              <EmptyState
                title="No Medical Records"
                description="Your medical record history is currently empty."
              />
            ) : (
              <div className="space-y-3.5">
                {medicalRecords.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition bg-slate-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {record.diagnosis || "Medical Examination"}
                      </h4>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      <span className="font-semibold text-slate-700">Symptoms:</span> {record.symptoms}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-2">
                      Dr. {record.doctor?.full_name || "Assigned Medical Officer"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Prescriptions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Recent Prescriptions
              </h3>
              <Link
                to="/prescriptions"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {prescriptions.length === 0 ? (
              <EmptyState
                title="No Prescriptions"
                description="You have no prescribed medications on record."
              />
            ) : (
              <div className="space-y-3.5">
                {prescriptions.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition bg-slate-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {item.medicines}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Duration:</span> {item.duration}
                    </p>
                    <p className="text-xs text-blue-600 font-medium mt-2">
                      Prescribed by Dr. {item.doctor?.full_name || "Doctor"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}

export default PatientDashboard;