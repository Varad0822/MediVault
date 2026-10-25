import { useEffect, useState } from "react";
import { KeyRound, Copy, Check, ShieldAlert, ShieldCheck, Clock, RefreshCw, XCircle, UserCheck } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import patientService from "../../services/patientService";

function GenerateAccess() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scope, setScope] = useState("Full Medical History");
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentOTP, setCurrentOTP] = useState(null);
  const [patientCode, setPatientCode] = useState("");
  const [patientUUID, setPatientUUID] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      const profile = await patientService.getPatientProfile();
      setPatientCode(profile.patient_code || profile.id.substring(0, 8));
      setPatientUUID(profile.id);
      const sessions = await patientService.getAccessSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const generate6DigitOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const otpCode = generate6DigitOTP();
      const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      const newSession = await patientService.generateOTP({
        otp: otpCode,
        scope,
        expiry,
      });

      setCurrentOTP(newSession);
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    if (!window.confirm("Are you sure you want to revoke this doctor access session immediately?")) {
      return;
    }
    try {
      await patientService.revokeAccess(sessionId);
      await loadSessions();
      if (currentOTP?.id === sessionId) {
        setCurrentOTP(null);
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading Security Access Portal..." />;
  }

  return (
    <PatientLayout title="Generate Doctor Access OTP">
      <PageHeader
        title="Doctor Access Authorization"
        subtitle="Generate a temporary 6-digit security OTP to allow doctors access to your medical records."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Generator Form & Result */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center font-bold">
                  <KeyRound size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Generate Single-Use Access OTP
                  </h3>
                  <p className="text-xs text-slate-500">
                    OTP expires automatically after 30 minutes.
                  </p>
                </div>
              </div>

              {/* Patient Code Card */}
              <div className="bg-purple-50 border border-purple-200/60 px-4 py-2 rounded-xl text-right">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Your Short Patient ID</span>
                <span className="text-lg font-black font-mono text-purple-900">{patientCode}</span>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                  Access Scope Permission
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm bg-white font-medium text-slate-900"
                >
                  <option value="Full Medical History">Full Medical History & Prescriptions</option>
                  <option value="Prescriptions Only">Prescriptions Only</option>
                  <option value="Medical History Only">Medical Consultation Logs Only</option>
                  <option value="Emergency Basic Info">Emergency Basic Profile Only</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} className={generating ? "animate-spin" : ""} />
                {generating ? "Generating Secure OTP..." : "Generate 6-Digit Doctor OTP"}
              </button>
            </form>

            {/* Generated OTP Output Box */}
            {currentOTP && (
              <div className="mt-8 bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-2xl p-6 shadow-xl border border-purple-500/30 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Active Authorized Session
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={13} /> Expires in 30 mins
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Short Patient ID Copy */}
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Give This Patient ID To Your Doctor</span>
                    <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
                      <code className="text-lg font-mono font-bold text-teal-300 tracking-wider">{patientCode}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(patientCode, "id")}
                        className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 text-xs font-semibold rounded-lg transition flex items-center gap-1 shrink-0"
                      >
                        {copiedId ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId ? "Copied" : "Copy Patient ID"}
                      </button>
                    </div>
                    {patientUUID && patientUUID !== patientCode && (
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1.5 px-1">
                        <span className="font-mono truncate max-w-xs text-[11px] text-slate-400">Full UUID: {patientUUID}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(patientUUID, "id")}
                          className="text-purple-300 hover:text-white text-[11px] font-semibold underline shrink-0 ml-2"
                        >
                          Copy UUID
                        </button>
                      </div>
                    )}
                  </div>

                  {/* OTP Large Display */}
                  <div className="text-center bg-purple-900/40 p-4 rounded-xl border border-purple-500/20">
                    <span className="text-xs text-purple-300 block mb-1 font-semibold uppercase">
                      Share This 6-Digit Access OTP With Doctor
                    </span>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-4xl font-black tracking-widest font-mono text-teal-300">
                        {currentOTP.otp}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentOTP.otp, "otp")}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                        title="Copy OTP"
                      >
                        {copiedOtp ? <Check size={16} className="text-teal-300" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <span className="text-xs text-slate-400 mt-2 block">
                      Scope Granted: <strong className="text-white">{currentOTP.scope}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info & Advice Column */}
        <div className="space-y-6">
          <div className="bg-blue-50/80 border border-blue-200/60 rounded-2xl p-6">
            <h4 className="font-extrabold text-blue-900 text-sm flex items-center gap-2 mb-2">
              <ShieldAlert size={18} className="text-blue-600" />
              How Doctor Access Works
            </h4>
            <ul className="text-xs text-blue-800 space-y-2 leading-relaxed">
              <li>1. Provide your <strong>Short Patient ID ({patientCode})</strong> and <strong>6-digit OTP</strong> to your consulting physician.</li>
              <li>2. The physician enters both codes into their verified Doctor Access Portal.</li>
              <li>3. Access is strictly limited to the scope selected and expires automatically after 30 minutes.</li>
              <li>4. You can revoke access at any time below.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Sessions Ledger */}
      <div className="mt-10 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-lg font-extrabold text-slate-900 mb-4">
          All Access Sessions & History
        </h3>

        {activeSessions.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">No access OTPs have been generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                  <th className="p-3 rounded-l-xl">OTP Code</th>
                  <th className="p-3">Access Scope</th>
                  <th className="p-3">Expires At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activeSessions.map((session) => {
                  const isExpired = new Date(session.expiry) <= new Date();
                  const isActive = session.is_active && !isExpired;

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">{session.otp}</td>
                      <td className="p-3">{session.scope}</td>
                      <td className="p-3">{new Date(session.expiry).toLocaleTimeString()} ({new Date(session.expiry).toLocaleDateString()})</td>
                      <td className="p-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500">
                            {isExpired ? "Expired" : "Revoked"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isActive && (
                          <button
                            onClick={() => handleRevoke(session.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-semibold rounded-lg transition inline-flex items-center gap-1"
                          >
                            <XCircle size={14} /> Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}

export default GenerateAccess;