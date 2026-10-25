import os
import sys
import pytest

# Ensure ml/api is on the Python path
API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api'))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

# Switch working directory so joblib relative model loads succeed
os.chdir(API_DIR)

@pytest.fixture(scope="session")
def api_client():
    from app import app
    from fastapi.testclient import TestClient
    client = TestClient(app, raise_server_exceptions=False)
    return client

@pytest.fixture(scope="session")
def valid_heart_payload():
    return {
        "age": 55,
        "sex": 1,
        "trestbps": 130,
        "chol": 240,
        "thalch": 150,
        "oldpeak": 1.2
    }

@pytest.fixture(scope="session")
def valid_diabetes_payload():
    return {
        "HighBP": 1,
        "HighChol": 1,
        "BMI": 27,
        "Smoker": 0,
        "Age": 8,
        "Sex": 1
    }
