import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";

// Auth Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// Patient Pages
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientProfile from "./pages/patient/PatientProfile";
import MedicalHistory from "./pages/patient/MedicalHistory";
import PrescriptionHistory from "./pages/patient/PrescriptionHistory";
import GenerateAccess from "./pages/patient/GenerateAccess";
import BookAppointment from "./pages/patient/BookAppointment";
import MyAppointments from "./pages/patient/MyAppointments";
import LabReports from "./pages/patient/LabReports";
import VitalsTracker from "./pages/patient/VitalsTracker";
import UploadPreviousRecord from "./pages/patient/UploadPreviousRecord";

// Doctor Pages
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorProfilePage from "./pages/doctor/DoctorProfilePage";
import VisitedPatientRecords from "./pages/doctor/VisitedPatientRecords";
import DoctorAccess from "./pages/doctor/DoctorAccess";
import AddMedicalRecord from "./pages/doctor/AddMedicalRecord";
import AddPrescription from "./pages/doctor/AddPrescription";
import ViewPatientHistory from "./pages/doctor/ViewPatientHistory";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Patient Portal Routes */}
        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload-past-record"
          element={
            <ProtectedRoute>
              <UploadPreviousRecord />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vitals-tracker"
          element={
            <ProtectedRoute>
              <VitalsTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-appointment"
          element={
            <ProtectedRoute>
              <BookAppointment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-appointments"
          element={
            <ProtectedRoute>
              <MyAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lab-reports"
          element={
            <ProtectedRoute>
              <LabReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient-profile"
          element={
            <ProtectedRoute>
              <PatientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-history"
          element={
            <ProtectedRoute>
              <MedicalHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prescriptions"
          element={
            <ProtectedRoute>
              <PrescriptionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/generate-access"
          element={
            <ProtectedRoute>
              <GenerateAccess />
            </ProtectedRoute>
          }
        />

        {/* Doctor Portal Routes */}
        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor-appointments"
          element={
            <ProtectedRoute>
              <DoctorAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor-profile"
          element={
            <ProtectedRoute>
              <DoctorProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor-visited-patients"
          element={
            <ProtectedRoute>
              <VisitedPatientRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor-access"
          element={
            <ProtectedRoute>
              <DoctorAccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-record"
          element={
            <ProtectedRoute>
              <AddMedicalRecord />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-prescription"
          element={
            <ProtectedRoute>
              <AddPrescription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/view-patient/:patientId"
          element={
            <ProtectedRoute>
              <ViewPatientHistory />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;