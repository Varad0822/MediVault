function AIHealthAssessment({ prediction }) {
    if (!prediction) return null;

    const getBadgeColor = (value) => {
        switch (value?.toLowerCase()) {
            case "healthy":
            case "low":
                return "bg-green-100 text-green-700";

            case "mild":
            case "prediabetes":
            case "moderate":
                return "bg-yellow-100 text-yellow-700";

            case "severe":
            case "high":
            case "diabetes":
                return "bg-red-100 text-red-700";

            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const ProgressBar = ({ value, color }) => (
        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div
                className={`h-2 rounded-full ${color}`}
                style={{ width: `${value}%` }}
            />
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mt-8 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6">
                <h2 className="text-2xl font-bold">
                    🤖 AI Health Assessment
                </h2>

                <p className="text-blue-100 mt-1">
                    AI-powered analysis based on your latest vitals
                </p>
            </div>

            {/* Overall Score */}
            <div className="p-6 border-b">

                <div className="flex items-center justify-between">

                    <div>

                        <p className="text-slate-500 text-sm">
                            Overall AI Health Score
                        </p>

                        <h1 className="text-5xl font-black text-blue-600">
                            {prediction.overallScore}/100
                        </h1>

                    </div>

                    <span
                        className={`px-4 py-2 rounded-full font-semibold ${getBadgeColor(
                            prediction.overallRisk
                        )}`}
                    >
                        {prediction.overallRisk} Risk
                    </span>

                </div>

            </div>

            {/* Prediction Cards */}

            <div className="grid md:grid-cols-2 gap-6 p-6">

                {/* Heart */}

                <div className="border rounded-xl p-5">

                    <div className="flex justify-between items-center">

                        <h3 className="font-bold text-lg">
                            ❤️ Heart Disease
                        </h3>

                        <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor(
                                prediction.heart.prediction
                            )}`}
                        >
                            {prediction.heart.prediction}
                        </span>

                    </div>

                    <p className="mt-5 text-sm text-slate-500">

                        Confidence

                    </p>

                    <p className="text-xl font-bold">

                        {prediction.heart.confidence}%

                    </p>

                    <ProgressBar
                        value={prediction.heart.confidence}
                        color="bg-red-500"
                    />

                </div>

                {/* Diabetes */}

                <div className="border rounded-xl p-5">

                    <div className="flex justify-between items-center">

                        <h3 className="font-bold text-lg">
                            🩸 Diabetes
                        </h3>

                        <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getBadgeColor(
                                prediction.diabetes.prediction
                            )}`}
                        >
                            {prediction.diabetes.prediction}
                        </span>

                    </div>

                    <p className="mt-5 text-sm text-slate-500">

                        Confidence

                    </p>

                    <p className="text-xl font-bold">

                        {prediction.diabetes.confidence}%

                    </p>

                    <ProgressBar
                        value={prediction.diabetes.confidence}
                        color="bg-blue-500"
                    />

                </div>

            </div>

            {/* Recommendations */}

            <div className="border-t p-6">

                <h3 className="text-lg font-bold mb-4">

                    📋 AI Recommendations

                </h3>

                <ul className="space-y-3">

                    {prediction.recommendations.map((item, index) => (

                        <li
                            key={index}
                            className="flex items-start gap-3"
                        >

                            <span className="text-green-600 font-bold">

                                ✓

                            </span>

                            <span>{item}</span>

                        </li>

                    ))}

                </ul>

            </div>

        </div>
    );
}

export default AIHealthAssessment;