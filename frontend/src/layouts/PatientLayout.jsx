import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

function PatientLayout({
  children,
  title = "Dashboard",
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* Sidebar */}
      <Sidebar role="patient" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        {/* Navbar */}
        <Navbar title={title} />

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>

      </div>

    </div>
  );
}

export default PatientLayout;