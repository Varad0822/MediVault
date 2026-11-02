## Project Overview

MediVault is an AI-driven healthcare platform designed to provide secure, patient-controlled management of medical records. The system allows patients to store and manage their medical information while granting doctors controlled access to relevant health records.

The platform integrates AI-assisted medical report extraction, machine learning-based disease risk prediction, and role-based access control to improve healthcare data management. It aims to address issues such as unauthorized access, fragmented medical records, and limited patient control over healthcare information.

## Setup

1. Clone the MediVault repository.
2. Install the required frontend and backend dependencies.
3. Configure the environment variables using the repository's environment configuration files.
4. Configure Supabase authentication, database tables, and Row-Level Security (RLS) policies.
5. Configure the required AI API key.
6. Ensure the trained machine learning models are available in the specified directory.
7. Start the frontend and backend servers.

Refer to the repository's environment configuration and dependency files for the exact setup requirements.

## Usage

1. Register or log in as a patient or doctor.
2. Patients can upload medical reports and manage their healthcare records.
3. Patients can grant doctors controlled access to their medical information.
4. Doctors can access authorized patient records and manage prescriptions.
5. Users can utilize AI-assisted medical report extraction.
6. Users can access heart disease severity and diabetes prediction features.
7. Doctors can view patient information according to the permissions granted.

## Reproducing the Results

1. Install the required dependencies and configure the project environment.
2. Access the heart disease and diabetes analysis notebooks available in the `ml/notebooks/` directory.
3. Run the notebooks to reproduce the data preprocessing, model training, and evaluation processes.
4. Evaluate the models using the same dataset splits and evaluation metrics.
5. Compare the results using accuracy, precision, recall, and F1-score.
6. Load the trained models from the `ml/saved_models/` directory.
7. Run the backend prediction APIs and verify the prediction outputs using test inputs.
