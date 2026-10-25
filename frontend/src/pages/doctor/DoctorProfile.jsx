import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Stethoscope,
  Building2,
  Award,
  Phone,
  Clock,
  Save,
  CheckCircle2,
  UserCheck,
  Users,
  FileText,
  Pill,
  Calendar,
  Search,
  Filter,
  PlusCircle,
  Printer,
  X,
  Activity,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FolderOpen
} from "lucide-react";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import doctorService from "../../services/doctorService";

function DoctorProfile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "credentials" ? "credentials" : "records";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [toast, setToast] = useState(null);

  // Doctor Profile Form state
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    specialization: "",
    hospital_name: "",
    license_number: "",
    contact_number: "",
    experience_years: "",
  });

  // Visited Patients data state
  const [visitedData, setVisitedData] = useState({
    visits: [],
    uniquePatients: [],
    stats: { totalVisits: 0, uniquePatientCount: 0, totalPrescriptions: 0 },
  });

  // Search & Filter state for visited records
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // 'all', 'today', 'week', 'month'
  const [viewMode, setViewMode] = useState("timeline"); // 'timeline' or 'directory'

  // Modals state
  const [selectedVisit, setSelectedVisit] = useState(null); // For Visit Summary Slip Modal
  const [showLogVisitModal, setShowLogVisitModal] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [newVisitForm, setNewVisitForm] = useState({
    patientId: "",
    diagnosis: "",
    symptoms: "",
    notes: "",
    medicines: "",
    dosage: "1-0-1 (After Food)",
    duration: "5 Days",
    advice: "",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync tab with URL search parameter
  const switchTab = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  async function loadAllData() {
    try {
      setLoading(true);
      const [profileData, historyData] = await Promise.all([
        doctorService.getDoctorProfile(),
        doctorService.getVisitedPatientsHistory(),
      ]);

      setDoctorProfile(profileData);
      setForm({
        full_name: profileData.full_name || "",
        specialization: profileData.specialization || "",
        hospital_name: profileData.hospital_name || "",
        license_number: profileData.license_number || "",
        contact_number: profileData.contact_number || "",
        experience_years: profileData.experience_years || "",
      });

      setVisitedData(historyData);
    } catch (err) {
      console.error("Error loading doctor data:", err);
      showToast("error", err.message || "Failed to load doctor records");
    } finally {
      setLoading(false);
    }
  }

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Handle Credentials Save
  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    try {
      setSavingCredentials(true);
      await doctorService.updateDoctorProfile(form);
      setDoctorProfile((prev) => ({ ...prev, ...form }));
      showToast("success", "Doctor credentials and profile updated successfully!");
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Failed to save profile");
    } finally {
      setSavingCredentials(false);
    }
  };

  // Handle Log New Patient Visit
  const handleLogVisit = async (e) => {
    e.preventDefault();
    if (!newVisitForm.patientId.trim() || !newVisitForm.diagnosis.trim()) {
      showToast("error", "Please provide Patient ID and Diagnosis.");
      return;
    }

    try {
      setSavingVisit(true);
      await doctorService.logPatientVisit(newVisitForm);
      showToast("success", "Patient consultation visit record stored successfully!");
      setShowLogVisitModal(false);
      setNewVisitForm({
        patientId: "",
        diagnosis: "",
        symptoms: "",
        notes: "",
        medicines: "",
        dosage: "1-0-1 (After Food)",
        duration: "5 Days",
        advice: "",
      });

      // Reload history
      const updatedHistory = await doctorService.getVisitedPatientsHistory();
      setVisitedData(updatedHistory);
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Failed to record patient visit.");
    } finally {
      setSavingVisit(false);
    }
  };

  // Filtered visits
  const filteredVisits = useMemo(() => {
    const list = visitedData.visits || [];
    const term = searchTerm.toLowerCase().trim();
    const now = new Date();

    return list.filter((v) => {
      // 1. Text Search matching
      const matchesSearch =
        !term ||
        v.patient?.full_name?.toLowerCase().includes(term) ||
        v.patient?.patient_code?.toLowerCase().includes(term) ||
        v.diagnosis?.toLowerCase().includes(term) ||
        v.symptoms?.toLowerCase().includes(term) ||
        v.notes?.toLowerCase().includes(term) ||
        v.prescriptions?.some((p) => p.medicines?.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // 2. Date Filtering
      if (dateFilter === "all") return true;

      const visitDate = new Date(v.visitDateTime);
      if (dateFilter === "today") {
        return (
          visitDate.getDate() === now.getDate() &&
          visitDate.getMonth() === now.getMonth() &&
          visitDate.getFullYear() === now.getFullYear()
        );
      }
      if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return visitDate >= weekAgo;
      }
      if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return visitDate >= monthAgo;
      }

      return true;
    });
  }, [visitedData.visits, searchTerm, dateFilter]);

  // Filtered unique patients directory
  const filteredUniquePatients = useMemo(() => {
    const list = visitedData.uniquePatients || [];
    const term = searchTerm.toLowerCase().trim();

    return list.filter((p) => {
      if (!term) return true;
      return (
        p.patient?.full_name?.toLowerCase().includes(term) ||
        p.patient?.patient_code?.toLowerCase().includes(term) ||
        p.latestDiagnosis?.toLowerCase().includes(term) ||
        p.patient?.blood_group?.toLowerCase().includes(term) ||
        p.patient?.allergies?.toLowerCase().includes(term)
      );
    });
  }, [visitedData.uniquePatients, searchTerm]);

  const handlePrintSlip = () => {
    window.print();
  };

  if (loading) {
    return <Loader fullScreen text="Loading Doctor Profile & Visited Records..." />;
  }

  return (
    <DoctorLayout title="Doctor Profile & Visited Patient Records">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Doctor Profile & Visited Patient Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access stored consultation records of patients who visited you, including diagnosis, date, time, and medical history.
          </p>
        </div>

        {activeTab === "records" && (
          <button
            onClick={() => setShowLogVisitModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 self-start md:self-auto"
          >
            <PlusCircle size={16} />
            Record New Patient Visit
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-xs font-bold border animate-in fade-in ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 mb-8 pb-1">
        <button
          onClick={() => switchTab("records")}
          className={`pb-3 px-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition ${
            activeTab === "records"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Users size={18} />
          Visited Patients & Records ({visitedData.stats.uniquePatientCount})
        </button>

        <button
          onClick={() => switchTab("credentials")}
          className={`pb-3 px-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition ${
            activeTab === "credentials"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <UserCheck size={18} />
          Physician Credentials & Settings
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: VISITED PATIENT RECORDS (CORE REQUIREMENT) */}
      {/* ======================================================== */}
      {activeTab === "records" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users size={24} />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 block">
                  {visitedData.stats.uniquePatientCount}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Patients Visited
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FileText size={24} />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 block">
                  {visitedData.stats.totalVisits}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Stored Visit Consultations
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Pill size={24} />
              </div>
              <div>
                <span className="text-2xl font-black text-slate-900 block">
                  {visitedData.stats.totalPrescriptions}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Issued Prescriptions
                </span>
              </div>
            </div>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient name, PAT-XXXXXX, diagnosis, symptoms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Date Filters & View Mode */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setDateFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    dateFilter === "all" ? "bg-white text-slate-900 shadow-xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  All Visits
                </button>
                <button
                  onClick={() => setDateFilter("today")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    dateFilter === "today" ? "bg-white text-blue-600 shadow-xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter("week")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    dateFilter === "week" ? "bg-white text-blue-600 shadow-xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setDateFilter("month")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    dateFilter === "month" ? "bg-white text-blue-600 shadow-xs font-extrabold" : "text-slate-500"
                  }`}
                >
                  30 Days
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    viewMode === "timeline" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600"
                  }`}
                >
                  Visit History
                </button>
                <button
                  onClick={() => setViewMode("directory")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    viewMode === "directory" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600"
                  }`}
                >
                  Patients Directory
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* VIEW MODE 1: CHRONOLOGICAL VISIT TIMELINE */}
          {/* ======================================================= */}
          {viewMode === "timeline" && (
            <div className="space-y-4">
              {filteredVisits.length === 0 ? (
                <EmptyState
                  title="No Stored Visit Records Found"
                  description={
                    searchTerm || dateFilter !== "all"
                      ? "No visit records match your search or date filter."
                      : "When patients visit you and you record consultations or issue prescriptions, their records will automatically appear here."
                  }
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Stored Patient Consultations ({filteredVisits.length} visits)</span>
                    <span className="text-slate-400 font-mono">Records strictly linked to Dr. {doctorProfile?.full_name}</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredVisits.map((visit) => {
                      const visitDateObj = new Date(visit.visitDateTime);
                      const formattedDate = visitDateObj.toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                      const formattedTime = visitDateObj.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={visit.id}
                          className="p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          {/* Left: Patient Details & Visit Timestamp */}
                          <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                                {visit.patient?.full_name?.charAt(0) || "P"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-slate-900 text-sm">
                                    {visit.patient?.full_name || "Patient"}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200/60">
                                    {visit.patient?.patient_code || "PAT-ID"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                  <span className="flex items-center gap-1 font-medium text-slate-500">
                                    <Calendar size={13} className="text-blue-500" />
                                    {formattedDate} at {formattedTime}
                                  </span>
                                  <span>•</span>
                                  <span>Age: {visit.patient?.age || "--"}</span>
                                  <span>•</span>
                                  <span>Blood: <strong className="text-slate-700">{visit.patient?.blood_group || "--"}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Diagnosis & Symptoms */}
                            <div className="pl-13 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Diagnosis:</span>
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold text-xs border border-emerald-200">
                                  {visit.diagnosis}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600">
                                <strong className="text-slate-800">Reported Symptoms:</strong> {visit.symptoms}
                              </p>

                              {visit.notes && (
                                <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  "{visit.notes}"
                                </p>
                              )}

                              {/* Prescriptions summary if present */}
                              {visit.prescriptions && visit.prescriptions.length > 0 && (
                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <Pill size={12} className="text-purple-600" /> Prescribed:
                                  </span>
                                  {visit.prescriptions.map((rx, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200/60"
                                    >
                                      {rx.medicines} ({rx.dosage})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2.5 pl-13 lg:pl-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                            <button
                              onClick={() => setSelectedVisit(visit)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                            >
                              <FileText size={14} /> View Visit Slip
                            </button>

                            <Link
                              to={`/view-patient/${visit.patientId}`}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                            >
                              <span>Full Patient File</span>
                              <ExternalLink size={13} />
                            </Link>

                            <Link
                              to={`/add-prescription?patientId=${visit.patientId}`}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                            >
                              <Pill size={13} /> Follow-up Rx
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* VIEW MODE 2: UNIQUE VISITED PATIENTS DIRECTORY */}
          {/* ======================================================= */}
          {viewMode === "directory" && (
            <div>
              {filteredUniquePatients.length === 0 ? (
                <EmptyState
                  title="No Patients Found"
                  description="No patients match your search filter."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredUniquePatients.map((entry) => {
                    const pat = entry.patient;
                    const latestDate = entry.latestVisitDateTime
                      ? new Date(entry.latestVisitDateTime).toLocaleDateString()
                      : "N/A";

                    return (
                      <div
                        key={pat.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
                                {pat.full_name?.charAt(0) || "P"}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-sm">
                                  {pat.full_name}
                                </h4>
                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 inline-block mt-0.5">
                                  {pat.patient_code}
                                </span>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">
                              {entry.totalVisits} {entry.totalVisits === 1 ? "Visit" : "Visits"}
                            </span>
                          </div>

                          {/* Quick Clinical Bio */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mb-3">
                            <div>
                              <span className="text-slate-400 block font-bold uppercase text-[10px]">Age</span>
                              <span className="font-semibold text-slate-800">{pat.age || "Not Set"}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold uppercase text-[10px]">Blood Group</span>
                              <span className="font-bold text-blue-600">{pat.blood_group || "Not Set"}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/60">
                              <span className="text-slate-400 block font-bold uppercase text-[10px]">Known Allergies</span>
                              <span className="font-medium text-rose-600">{pat.allergies || "None"}</span>
                            </div>
                          </div>

                          {/* Last Visit Assessment */}
                          <div className="text-xs space-y-1 mb-4">
                            <p className="text-slate-400 font-semibold flex items-center gap-1">
                              <Calendar size={13} className="text-slate-400" /> Last Visited:{" "}
                              <strong className="text-slate-700">{latestDate}</strong>
                            </p>
                            <p className="text-slate-700">
                              <strong className="text-slate-900">Latest Diagnosis:</strong>{" "}
                              <span className="text-emerald-700 font-bold">{entry.latestDiagnosis}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSearchTerm(pat.patient_code || pat.full_name);
                              setViewMode("timeline");
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                          >
                            View All {entry.totalVisits} Visits
                          </button>

                          <Link
                            to={`/view-patient/${pat.id}`}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs"
                          >
                            <span>Open File</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PHYSICIAN CREDENTIALS & SETTINGS */}
      {/* ======================================================== */}
      {activeTab === "credentials" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 max-w-4xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Physician Credentials & Professional Profile
              </h3>
              <p className="text-xs text-slate-500">
                This information is displayed on patient prescriptions, consultation slips, and appointment agendas.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCredentials} className="space-y-6">
            {/* Readonly Name */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <UserCheck size={14} className="text-blue-600" />
                Verified Physician Name
              </label>
              <input
                type="text"
                value={`Dr. ${form.full_name || doctorProfile?.full_name || "Doctor"}`}
                disabled
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-700 font-bold cursor-not-allowed text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Specialization */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Stethoscope size={14} className="text-blue-600" />
                  Medical Specialization
                </label>
                <input
                  type="text"
                  name="specialization"
                  placeholder="e.g. Cardiology, Internal Medicine, Pediatrics"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>

              {/* Hospital Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Building2 size={14} className="text-blue-600" />
                  Hospital / Clinical Affiliation
                </label>
                <input
                  type="text"
                  name="hospital_name"
                  placeholder="e.g. Apollo Multi-Specialty Hospital, Pune"
                  value={form.hospital_name}
                  onChange={(e) => setForm({ ...form, hospital_name: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Award size={14} className="text-purple-600" />
                  Medical Board Registration Number
                </label>
                <input
                  type="text"
                  name="license_number"
                  placeholder="e.g. MMC-2018-84920"
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Phone size={14} className="text-emerald-600" />
                  Clinic Contact Telephone
                </label>
                <input
                  type="text"
                  name="contact_number"
                  placeholder="e.g. +91 98220 12345"
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <Clock size={14} className="text-amber-600" />
                Years of Clinical Practice Experience
              </label>
              <input
                type="number"
                name="experience_years"
                placeholder="e.g. 12"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingCredentials}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2"
              >
                <Save size={18} />
                {savingCredentials ? "Saving Credentials..." : "Save Professional Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: VIEW VISIT CONSULTATION SUMMARY SLIP */}
      {/* ======================================================== */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-blue-400" />
                <h3 className="text-base font-extrabold text-white">
                  Official Consultation Visit Record
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print Slip
                </button>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / OPD Slip Content */}
            <div className="p-6 space-y-6 text-slate-800 text-xs">
              {/* Hospital & Doctor Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    {doctorProfile?.hospital_name || "Healthcare Outpatient Clinic"}
                  </h2>
                  <p className="text-slate-500 font-semibold mt-0.5">
                    Attending Physician: Dr. {doctorProfile?.full_name} ({doctorProfile?.specialization || "Physician"})
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    Registration No: {doctorProfile?.license_number || "REG-VERIFIED"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold rounded-lg border border-blue-200 text-xs inline-block mb-1">
                    OPD Visit Record
                  </span>
                  <p className="text-slate-500 font-semibold">
                    {new Date(selectedVisit.visitDateTime).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {/* Patient Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedVisit.patient?.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Patient ID</span>
                  <span className="font-mono font-bold text-blue-600">{selectedVisit.patient?.patient_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Age / Blood</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVisit.patient?.age || "--"} Yrs • {selectedVisit.patient?.blood_group || "--"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Known Allergies</span>
                  <span className="font-semibold text-rose-600">{selectedVisit.patient?.allergies || "None"}</span>
                </div>
              </div>

              {/* Clinical Assessment */}
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1">
                    Primary Diagnosis / Assessment
                  </span>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-emerald-900 text-sm">
                    {selectedVisit.diagnosis}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1">
                    Reported Symptoms & Chief Complaints
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-800">
                    {selectedVisit.symptoms}
                  </div>
                </div>

                {selectedVisit.notes && (
                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1">
                      Physician Clinical Notes & Observations
                    </span>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-700 italic">
                      "{selectedVisit.notes}"
                    </div>
                  </div>
                )}
              </div>

              {/* Prescriptions Section if any */}
              {selectedVisit.prescriptions && selectedVisit.prescriptions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-400 uppercase font-bold text-[10px] flex items-center gap-1.5">
                    <Pill size={13} className="text-purple-600" /> Prescribed Medications (Rx)
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Medicine Name</th>
                          <th className="p-2.5">Dosage Regimen</th>
                          <th className="p-2.5">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {selectedVisit.prescriptions.map((rx, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-slate-900">{rx.medicines}</td>
                            <td className="p-2.5 text-blue-700 font-semibold">{rx.dosage}</td>
                            <td className="p-2.5 text-slate-600">{rx.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer Sign-off */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-slate-400 text-[11px]">
                <div>
                  <p className="font-semibold text-slate-600">MediVault Verified Electronic Health Record</p>
                  <p>Only authorized physicians can access or document this patient record.</p>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <span className="font-bold text-slate-700">Dr. {doctorProfile?.full_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RECORD NEW PATIENT VISIT ON THE SPOT */}
      {/* ======================================================== */}
      {showLogVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle size={20} />
                <h3 className="text-base font-extrabold text-white">
                  Record New Patient Consultation Visit
                </h3>
              </div>
              <button
                onClick={() => setShowLogVisitModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogVisit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold uppercase tracking-wider block mb-1.5">
                  Patient Unique ID / Short Code (e.g. PAT-839201 or UUID) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PAT-839201"
                  value={newVisitForm.patientId}
                  onChange={(e) => setNewVisitForm({ ...newVisitForm, patientId: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold uppercase tracking-wider block mb-1.5">
                  Clinical Diagnosis / Primary Assessment *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension Stage 1, Type 2 Diabetes, Acute Pharyngitis"
                  value={newVisitForm.diagnosis}
                  onChange={(e) => setNewVisitForm({ ...newVisitForm, diagnosis: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold uppercase tracking-wider block mb-1.5">
                  Reported Symptoms & Chief Complaints
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Mild headache, dizziness on standing for past 4 days..."
                  value={newVisitForm.symptoms}
                  onChange={(e) => setNewVisitForm({ ...newVisitForm, symptoms: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold uppercase tracking-wider block mb-1.5">
                  Physician Clinical Notes & Observations
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional medical notes, dietary advice, or lifestyle modifications..."
                  value={newVisitForm.notes}
                  onChange={(e) => setNewVisitForm({ ...newVisitForm, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Optional Medication */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <span className="font-bold text-purple-700 flex items-center gap-1.5">
                  <Pill size={14} /> Optional Prescribed Medication Regimen
                </span>
                <div>
                  <input
                    type="text"
                    placeholder="Medicine Name (e.g. Tab Telmisartan 40mg)"
                    value={newVisitForm.medicines}
                    onChange={(e) => setNewVisitForm({ ...newVisitForm, medicines: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 1-0-0 After Food)"
                    value={newVisitForm.dosage}
                    onChange={(e) => setNewVisitForm({ ...newVisitForm, dosage: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 14 Days)"
                    value={newVisitForm.duration}
                    onChange={(e) => setNewVisitForm({ ...newVisitForm, duration: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogVisitModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVisit}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2"
                >
                  <Save size={16} />
                  {savingVisit ? "Saving Visit..." : "Store Visit Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DoctorLayout>
  );
}

export default DoctorProfile;
