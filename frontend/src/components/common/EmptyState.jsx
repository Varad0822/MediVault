import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";

function EmptyState({
  title = "No Data Found",
  description = "There is nothing to display right now.",
  buttonText,
  buttonLink,
  icon = <SearchX size={60} className="text-gray-400" />,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-10 flex flex-col items-center justify-center text-center">

      {/* Icon */}
      <div className="mb-6">
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-gray-800">
        {title}
      </h2>

      {/* Description */}
      <p className="text-gray-500 mt-3 max-w-md">
        {description}
      </p>

      {/* Optional Button */}
      {buttonText && buttonLink && (
        <Link
          to={buttonLink}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition duration-300"
        >
          {buttonText}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;