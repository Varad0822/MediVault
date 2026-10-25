from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from predictor import predict_heart, predict_diabetes

app = FastAPI(title="Healthcare AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "running"}

@app.post("/predict/heart")
def heart_prediction(data: dict):
    return predict_heart(data)

@app.post("/predict/diabetes")
def diabetes_prediction(data: dict):
    return predict_diabetes(data)

@app.post("/ai-health-analysis")
def ai_health_analysis(data: dict):

    heart = predict_heart(data)
    diabetes = predict_diabetes(data)

    # -----------------------------
    # Overall Health Score
    # -----------------------------
    overall_score = round(
        (heart["confidence"] + diabetes["confidence"]) / 2
    )

    # -----------------------------
    # Overall Risk
    # -----------------------------
    if overall_score >= 85:
        overall_risk = "Low"
    elif overall_score >= 65:
        overall_risk = "Moderate"
    else:
        overall_risk = "High"

    # -----------------------------
    # AI Recommendations
    # -----------------------------
    recommendations = []

    # Heart
    if heart["prediction"] == "Healthy":
        recommendations.append(
            "Continue regular cardiovascular exercise."
        )

    elif heart["prediction"] == "Mild":
        recommendations.append(
            "Maintain a healthy diet and monitor blood pressure."
        )

    elif heart["prediction"] == "Moderate":
        recommendations.append(
            "Consult a cardiologist and monitor heart health regularly."
        )

    else:
        recommendations.append(
            "Immediate cardiac evaluation is recommended."
        )

    # Diabetes
    if diabetes["prediction"] == "Healthy":
        recommendations.append(
            "Maintain balanced nutrition and regular physical activity."
        )

    elif diabetes["prediction"] == "Prediabetes":
        recommendations.append(
            "Reduce sugar intake and increase daily exercise."
        )

    else:
        recommendations.append(
            "Consult an endocrinologist for diabetes management."
        )

    return {

        "overallScore": overall_score,

        "overallRisk": overall_risk,

        "heart": heart,

        "diabetes": diabetes,

        "recommendations": recommendations

    }