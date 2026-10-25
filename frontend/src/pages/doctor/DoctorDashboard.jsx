import { useEffect, useState } from "react";
import { FileText, ClipboardList, ShieldCheck, UserCheck, Stethoscope, Clock, ArrowRight, PlusCircle, AlertCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import DashboardCard from "../../components/common/DashboardCard";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import doctorService from "../../services/doctorService";

function DoctorDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalRecordsAdded: 0,
    totalPrescriptionsAdded: 0,
    totalVisitedPatients: 0,
    recentRecords: [],
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [docProfile, docStats] = await Promise.all([
        doctorService.getDoctorProfile(),
        doctorService.getDashboardStats(),
      ]);

      setProfile(docProfile);
      setStats(docStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loader fullScreen text="Loading Doctor Dashboard..." />;
  }

  const isProfileComplete = profile?.specialization && profile?.hospital_name && profile?.license_number;

  return (
    <DoctorLayout title="Doctor Portal">
      <PageHeader
        title={`Welcome, Dr. ${profile?.full_name || "Doctor"} 👋`}
        subtitle="Access authorized patient health records, write medical logs, and prescribe treatments."
      />

      {/* Profile Incomplete Banner */}
      {!isProfileComplete && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={28} className="text-amber-100" />
            <div>
              <h3 className="font-extrabold text-base">Complete Your Professional Doctor Profile</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Add your Specialization, Hospital Affiliation, and Medical License Number to issue prescriptions.
              </p>
            </div>
          </div>
          <Link
            to="/doctor-profile?tab=credentials"
            className="px-4 py-2 bg-white text-amber-900 font-extrabold text-xs rounded-xl shadow-xs hover:bg-amber-50 transition"
          >
            Update Profile Now
          </Link>
        </div>
      )}

      {/* Doctor KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Visited Patients"
          value={stats.totalVisitedPatients}
          subtitle="Patients Consulted"
          icon={<Users size={24} />}
          color="blue"
        />

        <StatCard
          title="Total Medical Logs"
          value={stats.totalRecordsAdded}
          subtitle="Diagnoses Logged"
          icon={<FileText size={24} />}
          color="purple"
        />

        <StatCard
          title="Prescriptions Issued"
          value={stats.totalPrescriptionsAdded}
          subtitle="Rx Prescriptions"
          icon={<ClipboardList size={24} />}
          color="emerald"
        />

        <StatCard
          title="Specialization"
          value={profile?.specialization || "General"}
          subtitle={profile?.hospital_name || "Clinic"}
          icon={<Stethoscope size={24} />}
          color="amber"
        />
      </div>

      {/* Doctor Action Center */}
      <div className="mb-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">
          Clinical Operations Shortcuts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Verify Patient OTP"
            description="Enter patient ID and 6-digit OTP code to unlock authorized medical records."
            icon={<ShieldCheck size={26} />}
            buttonText="Verify Access"
            link="/doctor-access"
            color="amber"
          />

          <DashboardCard
            title="Visited Patient Records"
            description="Stored records, diagnoses, and date/times of patients who visited you."
            icon={<Users size={26} />}
            buttonText="View Records"
            link="/doctor-profile?tab=records"
            color="purple"
          />

          <DashboardCard
            title="Add Medical Record"
            description="Record symptoms, clinical observations, physician notes, and formal diagnoses."
            icon={<FileText size={26} />}
            buttonText="Create Record"
            link="/add-record"
            color="blue"
          />

          <DashboardCard
            title="Issue Prescription"
            description="Prescribe medication regimens, dosage instructions, and treatment durations."
            icon={<ClipboardList size={26} />}
            buttonText="Write Rx"
            link="/add-prescription"
            color="emerald"
          />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-extrabold text-slate-900 text-base">
            Recently Added Medical Records
          </h3>
          <Link
            to="/doctor-profile?tab=records"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
          >
            <span>View All Visited Patients & Records</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {stats.recentRecords.length === 0 ? (
          <EmptyState
            title="No Recent Medical Records"
            description="Records created by you for patients will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                  <th className="p-3 rounded-l-xl">Patient Name</th>
                  <th className="p-3">Patient Code</th>
                  <th className="p-3">Diagnosis</th>
                  <th className="p-3">Symptoms</th>
                  <th className="p-3">Visit Date & Time</th>
                  <th className="p-3 rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {stats.recentRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">{rec.patient?.full_name || "Patient"}</td>
                    <td className="p-3 font-mono font-bold text-blue-600">{rec.patient?.patient_code || "--"}</td>
                    <td className="p-3 font-semibold text-emerald-700">{rec.diagnosis}</td>
                    <td className="p-3 max-w-xs truncate">{rec.symptoms}</td>
                    <td className="p-3 text-slate-500 font-semibold">{new Date(rec.created_at).toLocaleString()}</td>
                    <td className="p-3">
                      <Link
                        to="/doctor-profile?tab=records"
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition inline-block"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}

export default DoctorDashboard;