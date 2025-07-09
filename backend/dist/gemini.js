/**
* Wrapper around the Gemini REST endpoint that returns strongly typed JSON content.
* The caller specifies the expected shape via a generic parameter.
*/
export async function callGeminiAPI(prompt, chatHistory = []) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable not set.');
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const contents = [...chatHistory, { role: 'user', parts: [{ text: prompt }] }];
    const geminiRequestBody = {
        contents,
        generationConfig: {
            responseMimeType: 'application/json',
        },
    };
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequestBody),
    });
    if (!response.ok) {
        const errorData = await response.json();
        // eslint-disable-next-line no-console
        console.error('Error from Gemini API:', errorData);
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    // Gemini responses are JSON encoded within the first candidate
    return JSON.parse(data.candidates[0].content.parts[0].text);
}
