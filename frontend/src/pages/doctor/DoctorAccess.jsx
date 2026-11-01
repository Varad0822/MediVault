import { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  FileText,
  Pill,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import doctorService from "../../services/doctorService";

function DoctorAccess() {
  const [patientIdInput, setPatientIdInput] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [ending, setEnding] = useState(false);

  const [accessSession, setAccessSession] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [resolvedUUID, setResolvedUUID] = useState("");

  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Verify patient access OTP
  const handleVerify = async (e) => {
    e.preventDefault();

    const patientIdentifier = patientIdInput.trim();
    const enteredOtp = otp.trim();

    if (!patientIdentifier || !enteredOtp) {
      setErrorMsg(
        "Please enter both Patient ID (PAT-XXXXXX or UUID) and the 6-digit OTP."
      );
      return;
    }

    if (!/^\d{6}$/.test(enteredOtp)) {
      setErrorMsg("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setVerifying(true);
      setErrorMsg(null);
      setToastMsg(null);

      // Call the updated OTP verification method.
      // The method accepts two arguments, not an object.
      const res = await doctorService.verifyAccessOtp(
        patientIdentifier,
        enteredOtp
      );

      if (!res || !res.patientId) {
        throw new Error(
          "OTP verification failed or returned an invalid response."
        );
      }

      // Store the verified patient UUID and access scope.
      setResolvedUUID(res.patientId);

      setAccessSession({
        id: res.patientId,
        scope: res.scope,
        expiry: res.expiry,
      });

      // The updated verifyAccessOtp method does not return
      // the complete patient profile.
      setPatientProfile(null);

      setToastMsg("Patient access authorized successfully.");
    } catch (err) {
      console.error("OTP verification error:", err);

      setErrorMsg(
        err.message ||
          "Invalid or expired OTP code for this Patient ID."
      );

      setAccessSession(null);
      setPatientProfile(null);
      setResolvedUUID("");
    } finally {
      setVerifying(false);
    }
  };

  // End the current patient access session.
  const handleEndSession = async () => {
    if (!accessSession || !resolvedUUID) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to end this patient consultation session now?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setEnding(true);
      setErrorMsg(null);
      setToastMsg(null);

      // Use the updated RPC-based service method.
      await doctorService.endPatientSessionByPatientId(resolvedUUID);

      setToastMsg(
        "Consultation session ended and patient access terminated."
      );

      setAccessSession(null);
      setPatientProfile(null);
      setResolvedUUID("");
      setPatientIdInput("");
      setOtp("");
    } catch (err) {
      console.error("End session error:", err);

      setErrorMsg(
        "Failed to end session: " +
          (err.message || "Unknown error")
      );
    } finally {
      setEnding(false);
    }
  };

  return (
    <DoctorLayout title="Patient Access Verification">
      <PageHeader
        title="Patient OTP Verification Portal"
        subtitle="Verify patient-generated access OTPs to securely view health records and prescribe treatment."
      />

      {/* Success Message */}
      {toastMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* OTP Verification Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold">
                <ShieldCheck size={26} />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Verify OTP Authorization Code
                </h3>

                <p className="text-xs text-slate-500">
                  Patient must provide their Short Patient ID
                  (e.g. PAT-849201) or UUID and 6-digit OTP.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-5">
              {/* Patient ID */}
              <div>
                <label
                  htmlFor="patientId"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2"
                >
                  Patient Unique ID / Short Code (e.g. PAT-839201)
                </label>

                <input
                  id="patientId"
                  type="text"
                  placeholder="e.g. PAT-839201 or patient UUID"
                  value={patientIdInput}
                  onChange={(e) => setPatientIdInput(e.target.value)}
                  autoComplete="off"
                  required
                  disabled={verifying}
                  className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-mono text-slate-900 font-bold"
                />
              </div>

              {/* OTP */}
              <div>
                <label
                  htmlFor="patientOtp"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2"
                >
                  6-Digit Patient Access OTP
                </label>

                <input
                  id="patientOtp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="e.g. 583921"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  autoComplete="one-time-code"
                  required
                  disabled={verifying}
                  className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-xl font-bold tracking-widest font-mono text-slate-900"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={verifying || ending}
                className="w-full py-3.5 bg-slate-900 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <KeyRound size={18} />

                {verifying
                  ? "Verifying Authorization..."
                  : "Verify Access Code"}
              </button>
            </form>
          </div>

          {/* Access Granted Card */}
          {accessSession && (
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30 animate-in fade-in zoom-in duration-200 space-y-5">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  Authorization Granted & Verified
                </span>

                <span className="text-xs text-emerald-200 bg-emerald-800/80 px-2.5 py-1 rounded-full font-semibold">
                  Scope: {accessSession.scope || "Authorized"}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-xl font-black text-white">
                    Patient:{" "}
                    {patientProfile?.full_name || "Authorized Patient"}
                  </h4>

                  <p className="text-xs text-emerald-200 font-mono mt-0.5 break-all">
                    ID: {patientProfile?.patient_code || resolvedUUID}
                  </p>

                  {accessSession.expiry && (
                    <p className="text-xs text-emerald-200 mt-2">
                      Access expiry:{" "}
                      {Number.isNaN(Date.parse(accessSession.expiry))
                        ? accessSession.expiry
                        : new Date(accessSession.expiry).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* End Session Button */}
                <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={ending}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
                >
                  <XCircle size={16} />

                  {ending
                    ? "Ending Session..."
                    : "End Consultation Session"}
                </button>
              </div>

              {/* Patient Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Link
                  to={`/view-patient/${resolvedUUID}`}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition flex items-center justify-between border border-white/10"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText size={15} />
                    View History
                  </span>

                  <ArrowRight size={14} />
                </Link>

                <Link
                  to={`/add-record?patientId=${encodeURIComponent(
                    resolvedUUID
                  )}`}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition flex items-center justify-between border border-white/10"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText size={15} />
                    Add Record
                  </span>

                  <ArrowRight size={14} />
                </Link>

                <Link
                  to={`/add-prescription?patientId=${encodeURIComponent(
                    resolvedUUID
                  )}`}
                  className="p-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-xs font-extrabold transition flex items-center justify-between shadow-md"
                >
                  <span className="flex items-center gap-1.5">
                    <Pill size={15} />
                    Write Rx
                  </span>

                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Session Control & Security Information */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <h4 className="font-extrabold text-white text-sm flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-amber-400" />
              Session Control & Security
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Patient access remains active for the period configured by
              the authorization service. Once your examination is finished,
              click <strong>"End Consultation Session"</strong> to request
              immediate access revocation.
            </p>

            <div className="text-xs text-amber-400 font-semibold bg-amber-400/10 p-3 rounded-xl border border-amber-400/20">
              Manual session termination requests immediate revocation of
              doctor access.
            </div>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
}

export default DoctorAccess;