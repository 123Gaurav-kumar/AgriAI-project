/**
 * AI Analysis Utility
 * ─────────────────────────────────────────────────────────────
 * This is the CORE of the project — integrates with Claude AI
 * (via Anthropic API) to analyze crop images for diseases.
 *
 * HOW IT WORKS:
 * 1. Takes a crop image URL and crop name as input
 * 2. Sends the image + a detailed prompt to Claude's vision model
 * 3. Claude analyzes the image and returns structured JSON
 * 4. We parse and validate the JSON
 * 5. Return structured analysis to the caller
 *
 * WHY CLAUDE:
 * - Excellent vision capabilities
 * - Can follow complex structured output instructions
 * - Reliable JSON generation
 * - Good agricultural domain knowledge
 */

const fetch = require('node-fetch');
const logger = require('./logger');

/**
 * Build the analysis prompt for Claude.
 * The prompt is carefully engineered to get structured, consistent output.
 *
 * @param {string} cropName - Name of the crop being analyzed
 * @returns {string} Detailed system prompt
 */
const buildAnalysisPrompt = (cropName) => `
You are an expert agricultural pathologist and plant disease specialist with 20+ years of experience diagnosing crop diseases across India. You analyze plant images with extreme precision.

Analyze the provided image of a ${cropName} plant/crop and provide a DETAILED, ACCURATE disease detection report.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanation):

{
  "overallStatus": "healthy|diseased|stressed|uncertain",
  "overallConfidence": <number 0-100>,
  "primaryDisease": "<disease name or null>",
  "urgentAction": <true|false>,
  "summary": "<2-3 sentence expert summary of what you see>",
  
  "diseases": [
    {
      "name": "<disease name>",
      "confidence": <0-100>,
      "severity": "none|mild|moderate|severe|critical",
      "affectedArea": "<leaves|stem|roots|fruit|whole plant>",
      "description": "<what makes you diagnose this disease>"
    }
  ],
  
  "environmentalFactors": ["<factor 1>", "<factor 2>"],
  
  "treatments": [
    {
      "type": "chemical|biological|cultural|preventive",
      "name": "<treatment/product name>",
      "description": "<how this treats the disease>",
      "applicationMethod": "<spray|soil application|seed treatment|etc>",
      "dosage": "<specific dosage>",
      "frequency": "<how often to apply>",
      "urgency": "immediate|within_week|preventive"
    }
  ],
  
  "preventionTips": [
    "<tip 1>",
    "<tip 2>",
    "<tip 3>"
  ]
}

CRITICAL RULES:
- If the image is unclear or not a plant, set overallStatus to "uncertain" with confidence < 30
- Always provide at least 2 treatment options
- Always provide at least 3 prevention tips
- Treatments must be specific to Indian agriculture context
- Include both chemical AND biological/organic options when possible
- If healthy, diseases array can be empty, but still provide preventive treatments
- All confidence values must be realistic (not all 95%+)
- Be medically accurate — farmers' livelihoods depend on this diagnosis
`;

/**
 * Analyze a crop image using Claude's vision API.
 * This is an async function that makes an HTTP request to the Anthropic API.
 *
 * @param {string} imageUrl - Public URL of the uploaded crop image
 * @param {string} cropName - Name of the crop (e.g., "Tomato", "Rice")
 * @returns {Promise<object>} Structured analysis object
 */
const analyzeCropImage = async (imageUrl, cropName) => {
  const startTime = Date.now();

  try {
    logger.info(`Starting AI analysis for crop: ${cropName}, image: ${imageUrl}`);

    // ─── Call Anthropic API ─────────────────────────────────
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',         // Best vision model
        max_tokens: 2000,
        system: buildAnalysisPrompt(cropName),
        messages: [
          {
            role: 'user',
            content: [
              {
                // Pass the image as a URL
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: `Please analyze this ${cropName} plant image for diseases, stress, or health issues. Provide a complete diagnosis following the JSON format specified.`
              }
            ]
          }
        ]
      })
    });

    // Check for API errors
    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`Anthropic API error: ${JSON.stringify(errorData)}`);
      throw new Error(`AI API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // ─── Extract Text Response ──────────────────────────────
    const rawText = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    logger.debug(`Raw AI response: ${rawText.substring(0, 200)}...`);

    // ─── Parse JSON Response ────────────────────────────────
    // Strip any markdown code fences if Claude added them
    const cleanedText = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      logger.error(`Failed to parse AI response as JSON: ${parseError.message}`);
      logger.error(`Raw text was: ${rawText}`);

      // Fallback: return a safe default response
      analysis = createFallbackAnalysis(cropName);
    }

    // ─── Validate & Normalize Analysis ─────────────────────
    const normalizedAnalysis = normalizeAnalysis(analysis, cropName);

    const processingTime = Date.now() - startTime;
    logger.info(`AI analysis completed in ${processingTime}ms for ${cropName}`);

    return {
      ...normalizedAnalysis,
      processingTime
    };

  } catch (error) {
    logger.error(`AI analysis failed: ${error.message}`);
    throw new Error(`Disease analysis failed: ${error.message}`);
  }
};

/**
 * Normalize and validate the AI response to ensure it matches
 * our expected schema, filling in defaults for missing fields.
 *
 * @param {object} analysis - Raw parsed JSON from Claude
 * @param {string} cropName - Crop name for context
 * @returns {object} Validated and normalized analysis
 */
const normalizeAnalysis = (analysis, cropName) => {
  const validStatuses = ['healthy', 'diseased', 'stressed', 'uncertain'];
  const validSeverities = ['none', 'mild', 'moderate', 'severe', 'critical'];
  const validTreatmentTypes = ['chemical', 'biological', 'cultural', 'preventive'];
  const validUrgencies = ['immediate', 'within_week', 'preventive'];

  return {
    overallStatus: validStatuses.includes(analysis.overallStatus) ? analysis.overallStatus : 'uncertain',
    overallConfidence: Math.min(100, Math.max(0, Number(analysis.overallConfidence) || 50)),
    primaryDisease: analysis.primaryDisease || null,
    urgentAction: Boolean(analysis.urgentAction),
    summary: analysis.summary || `Analysis of ${cropName} plant completed.`,

    diseases: Array.isArray(analysis.diseases)
      ? analysis.diseases.map(d => ({
          name: d.name || 'Unknown Disease',
          confidence: Math.min(100, Math.max(0, Number(d.confidence) || 50)),
          severity: validSeverities.includes(d.severity) ? d.severity : 'mild',
          affectedArea: d.affectedArea || 'unknown',
          description: d.description || ''
        }))
      : [],

    environmentalFactors: Array.isArray(analysis.environmentalFactors)
      ? analysis.environmentalFactors.filter(f => typeof f === 'string')
      : [],

    treatments: Array.isArray(analysis.treatments)
      ? analysis.treatments.map(t => ({
          type: validTreatmentTypes.includes(t.type) ? t.type : 'cultural',
          name: t.name || 'General Treatment',
          description: t.description || '',
          applicationMethod: t.applicationMethod || '',
          dosage: t.dosage || '',
          frequency: t.frequency || '',
          urgency: validUrgencies.includes(t.urgency) ? t.urgency : 'within_week'
        }))
      : [],

    preventionTips: Array.isArray(analysis.preventionTips)
      ? analysis.preventionTips.filter(t => typeof t === 'string')
      : ['Monitor crops regularly', 'Maintain proper irrigation', 'Use certified seeds']
  };
};

/**
 * Create a fallback analysis when AI parsing fails.
 * This ensures the API always returns a valid response.
 *
 * @param {string} cropName - Crop name for context
 * @returns {object} Safe default analysis
 */
const createFallbackAnalysis = (cropName) => ({
  overallStatus: 'uncertain',
  overallConfidence: 30,
  primaryDisease: null,
  urgentAction: false,
  summary: `Unable to complete full analysis of ${cropName}. The image may be unclear or in an unsupported format. Please try with a clearer image.`,
  diseases: [],
  environmentalFactors: [],
  treatments: [
    {
      type: 'preventive',
      name: 'General Crop Care',
      description: 'Maintain proper watering, nutrition, and pest monitoring.',
      applicationMethod: 'Regular inspection',
      dosage: 'N/A',
      frequency: 'Weekly',
      urgency: 'preventive'
    }
  ],
  preventionTips: [
    'Ensure proper field hygiene and crop rotation',
    'Monitor crops regularly for early signs of disease',
    'Consult your local agricultural extension officer'
  ]
});

module.exports = { analyzeCropImage };