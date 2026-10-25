import { useEffect, useState } from "react";
import { Search, Stethoscope, Building2, Calendar, Clock, CheckCircle2, ArrowRight, X, AlertCircle } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import appointmentService from "../../services/appointmentService";

function BookAppointment() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Booking Modal Form State
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("10:00 AM");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState(null);

  const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
  ];

  useEffect(() => {
    loadDoctors();
  }, []);

  async function loadDoctors() {
    try {
      setLoading(true);
      const docs = await appointmentService.getAvailableDoctors();
      setDoctors(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate || !reason.trim()) {
      setToast({ type: "error", text: "Please select a date, time slot, and specify visit reason." });
      return;
    }

    try {
      setBooking(true);
      await appointmentService.bookAppointment({
        doctorId: selectedDoctor.id,
        appointmentDate,
        appointmentTime,
        reason,
      });

      setToast({ type: "success", text: `Appointment request sent to Dr. ${selectedDoctor.full_name}!` });
      setSelectedDoctor(null);
      setAppointmentDate("");
      setReason("");

      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message || "Failed to book appointment." });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading Available Doctors Directory..." />;
  }

  return (
    <PatientLayout title="Book Appointment">
      <PageHeader
        title="Find & Book Doctor Appointment"
        subtitle="Search verified physicians by medical specialization, select your preferred date/time slot, and schedule an appointment."
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

      {/* Doctor Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doctor name, specialization (e.g. Cardiology), or clinic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-200/60">
          Available Doctors: {filteredDoctors.length}
        </div>
      </div>

      {/* Doctor Cards Directory Grid */}
      {filteredDoctors.length === 0 ? (
        <EmptyState
          title="No Doctors Available"
          description={searchQuery ? "No doctor matches your search query." : "No registered doctors found."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                    {doc.full_name?.charAt(0) || "D"}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                      Dr. {doc.full_name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 mt-0.5">
                      <Stethoscope size={12} />
                      {doc.specialization}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    <span>{doc.hospital_name}</span>
                  </div>
                  {doc.experience_years > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span>{doc.experience_years} Years Experience</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDoctor(doc);
                  setAppointmentDate(new Date().toISOString().split("T")[0]);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
              >
                <span>Book Appointment</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Booking Form Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Book Consultation
                </h3>
                <p className="text-xs text-blue-600 font-semibold">
                  Dr. {selectedDoctor.full_name} ({selectedDoctor.specialization})
                </p>
              </div>
            </div>

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Select Appointment Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Select Time Slot
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setAppointmentTime(slot)}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        appointmentTime === slot
                          ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Reason for Visit / Health Problem
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Routine cardiac checkup, persistent headache for 2 days..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  {booking ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default BookAppointment;
