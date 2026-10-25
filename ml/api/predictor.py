from sklearn.metrics import _pairwise_distances_reduction
import joblib

import pandas as pd

heart_model = joblib.load(
    "../saved_models/heart_severity_model.pkl"
)

heart_features = joblib.load(
    "../saved_models/heart_features.pkl"
)

heart_labels = joblib.load(
    "../saved_models/heart_labels.pkl"
)

diabetes_model = joblib.load(
    "../saved_models/diabetes_model.pkl"
)

diabetes_features = joblib.load(
    "../saved_models/diabetes_features.pkl"
)

diabetes_labels = joblib.load(
    "../saved_models/diabetes_labels.pkl"
)

def predict_heart(data):

    df = pd.DataFrame([data])

    df = df.reindex(
        columns=heart_features,
        fill_value=0
    )

    prediction = heart_model.predict(df)[0]

    probabilities = heart_model.predict_proba(df)[0]

    confidence = float(max(probabilities) * 100)

    return {
    "prediction": heart_labels[prediction],
    "confidence": round(confidence, 2)
    }
    
def predict_diabetes(data):

    df = pd.DataFrame([data])

    df = df.reindex(
        columns=diabetes_features,
        fill_value=0
    )

    prediction = diabetes_model.predict(df)[0]

    confidence = None

    if hasattr(diabetes_model, "predict_proba"):
        probability = diabetes_model.predict_proba(df)[0]
        confidence = round(float(max(probability) * 100), 2)

    return {
        "prediction": diabetes_labels[prediction],
        "confidence": confidence
    }