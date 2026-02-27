/**
 * IBM Watsonx Granite LLM Integration
 * Model: ibm/granite-3-8b-instruct (Frankfurt region)
 */

let cachedToken: { token: string; expiry: number } | null = null;

async function getIAMToken(): Promise<string | null> {
    const apiKey = process.env.WATSONX_API_KEY;
    if (!apiKey) return null;

    if (cachedToken && Date.now() < cachedToken.expiry - 300000) {
        return cachedToken.token;
    }

    try {
        const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "urn:ibm:params:oauth:grant-type:apikey",
                apikey: apiKey,
            }),
        });

        if (!response.ok) {
            console.error("IAM token request failed:", response.statusText);
            return null;
        }

        const data = (await response.json()) as {
            access_token: string;
            expiration: number;
        };
        cachedToken = {
            token: data.access_token,
            expiry: data.expiration * 1000,
        };
        return cachedToken.token;
    } catch (error) {
        console.error("IAM token error:", error);
        return null;
    }
}

function buildPrompt(query: string, context: string, language: string): string {
    const langNote =
        language !== "English"
            ? " Respond in " + language + ". After your response, add '---' and a brief English summary."
            : "";

    const systemMsg =
        "You are KrishiSahay, an expert agricultural advisor for Indian farmers. " +
        "Provide practical, actionable advice based on the Kisan Call Centre data below. " +
        "Be specific about dosages, timings, and methods. Mention safety precautions." +
        langNote;

    const userMsg =
        "Based on the following Kisan Call Centre knowledge base entries:\n\n" +
        context +
        "\n\nFarmer's Question: " +
        query +
        "\n\nProvide a comprehensive, practical answer:";

    return JSON.stringify([
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
    ]);
}

/**
 * Generate an enhanced response using IBM Watsonx Granite LLM.
 * Returns null if Watsonx is not configured or fails.
 */
export async function generateWithGranite(
    query: string,
    context: string,
    language: string
): Promise<string | null> {
    const token = await getIAMToken();
    const projectId = process.env.WATSONX_PROJECT_ID;

    if (!token || !projectId) {
        console.log("Watsonx not configured, skipping LLM enhancement");
        return null;
    }

    try {
        const messages = JSON.parse(buildPrompt(query, context, language));

        const response = await fetch(
            "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2024-05-31",
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    model_id: "ibm/granite-3-8b-instruct",
                    project_id: projectId,
                    messages: messages,
                    parameters: {
                        max_tokens: 800,
                        temperature: 0.3,
                        top_p: 0.9,
                        repetition_penalty: 1.1,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Watsonx API error:", response.status, errorText);
            return null;
        }

        const data = (await response.json()) as {
            choices?: { message?: { content?: string } }[];
            results?: { generated_text?: string }[];
        };

        // Handle both chat and text generation response formats
        const text =
            data.choices?.[0]?.message?.content ||
            data.results?.[0]?.generated_text ||
            null;

        return text;
    } catch (error) {
        console.error("Watsonx generation error:", error);
        return null;
    }
}

/**
 * Check if Watsonx is configured and available.
 */
export function isWatsonxAvailable(): boolean {
    return !!(process.env.WATSONX_API_KEY && process.env.WATSONX_PROJECT_ID);
}
