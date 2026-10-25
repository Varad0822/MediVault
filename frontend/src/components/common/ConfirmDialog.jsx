import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "red",
}) {
  const buttonColors = {
    red: "bg-red-600 hover:bg-red-700",
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="flex flex-col items-center text-center">

        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-5">
          <AlertTriangle
            size={34}
            className="text-red-600"
          />
        </div>

        <p className="text-gray-600 mb-8">
          {message}
        </p>

        <div className="flex gap-4 w-full">

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
          >
            {cancelText}
          </button>

          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 rounded-xl text-white transition ${
              buttonColors[confirmColor] || buttonColors.red
            }`}
          >
            {confirmText}
          </button>

        </div>

      </div>
    </Modal>
  );
}

export default ConfirmDialog;