const API_URL = "http://127.0.0.1:8000";

const aiPredictionService = {

    async analyzeVitals(data) {

        const response = await fetch(

            `${API_URL}/ai-health-analysis`,

            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)
            }

        );

        return await response.json();
    }

};

export default aiPredictionService;