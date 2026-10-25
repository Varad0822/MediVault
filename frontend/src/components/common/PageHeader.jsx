import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

function PageHeader({
  title,
  subtitle,
  buttonText,
  buttonLink,
  buttonIcon = <Plus size={18} />,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-2 text-gray-500">
            {subtitle}
          </p>
        )}
      </div>

      {buttonText && buttonLink && (
        <Link
          to={buttonLink}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition duration-300"
        >
          {buttonIcon}
          {buttonText}
        </Link>
      )}
    </div>
  );
}

export default PageHeader;