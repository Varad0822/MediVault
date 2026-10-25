import { useEffect, useState } from "react";
import { Calendar, Clock, User, CheckCircle2, XCircle, FileText, Pill, AlertCircle, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import appointmentService from "../../services/appointmentService";

function DoctorAppointments() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      const data = await appointmentService.getDoctorAppointments();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await appointmentService.updateAppointmentStatus(id, status);
      setToast({ type: "success", text: `Appointment status updated to ${status}!` });
      await loadAppointments();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message });
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (activeFilter === "all") return true;
    return app.status === activeFilter;
  });

  if (loading) {
    return <Loader fullScreen text="Loading Clinical Appointments Schedule..." />;
  }

  return (
    <DoctorLayout title="Doctor Appointments Schedule">
      <PageHeader
        title="Consultation Schedule & Appointments"
        subtitle="Manage patient consultation requests, confirm upcoming visits, and mark completed appointments."
      />

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm font-semibold border ${
            toast.type === "success"
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

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`pb-3 px-3 text-xs font-extrabold capitalize transition border-b-2 ${
              activeFilter === filter
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {filter} ({filter === "all" ? appointments.length : appointments.filter((a) => a.status === filter).length})
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="No Appointments Found"
          description={activeFilter === "all" ? "You have no scheduled appointments." : `No ${activeFilter} appointments.`}
        />
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((app) => {
            const patDetails = Array.isArray(app.patient?.details) ? app.patient?.details[0] : app.patient?.details;

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {app.patient?.full_name || "Patient Record"}
                    </h3>

                    {/* Status Badge */}
                    {app.status === "pending" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Approval
                      </span>
                    )}
                    {app.status === "confirmed" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 size={13} /> Confirmed
                      </span>
                    )}
                    {app.status === "completed" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    )}
                    {app.status === "cancelled" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        <XCircle size={13} /> Cancelled
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} className="text-blue-600" /> {app.appointment_date} @ {app.appointment_time}
                    </span>
                    {patDetails?.blood_group && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
                        Blood: {patDetails.blood_group}
                      </span>
                    )}
                    {patDetails?.age && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
                        Age: {patDetails.age}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-2xl">
                    <strong className="text-slate-900">Reason:</strong> {app.reason}
                  </p>
                </div>

                {/* Doctor Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {app.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(app.id, "confirmed")}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={15} /> Confirm
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(app.id, "cancelled")}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-semibold text-xs rounded-xl transition flex items-center gap-1"
                      >
                        <XCircle size={15} /> Cancel
                      </button>
                    </>
                  )}

                  {app.status === "confirmed" && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(app.id, "completed")}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={15} /> Complete
                      </button>
                      <Link
                        to={`/add-record?patientId=${app.patient_id}`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white font-semibold text-xs rounded-xl transition flex items-center gap-1"
                      >
                        <FileText size={15} /> Add Record
                      </Link>
                    </>
                  )}

                  {app.status === "completed" && (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/add-record?patientId=${app.patient_id}`}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 font-semibold text-xs rounded-lg hover:bg-blue-600 hover:text-white transition flex items-center gap-1"
                      >
                        <FileText size={14} /> Add Log
                      </Link>
                      <Link
                        to={`/add-prescription?patientId=${app.patient_id}`}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-lg hover:bg-emerald-600 hover:text-white transition flex items-center gap-1"
                      >
                        <Pill size={14} /> Issue Rx
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DoctorLayout>
  );
}

export default DoctorAppointments;
