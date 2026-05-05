const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');
const logger = require('./logger');
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const generateWithRetry = async (model, parts, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(parts);
    } catch (err) {
      if (err.status === 429 && i < retries - 1) {
        const wait = (i + 1) * 25000;
        logger.warn(`Gemini rate limited. Retry ${i + 1}/${retries - 1} in ${wait / 1000}s`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
};

const analyzeCropImage = async (imageUrl, cropName) => {
  const startTime = Date.now();

  try {
    logger.info(`Starting Gemini AI analysis for crop: ${cropName}`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Convert image URL to base64
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const base64Image = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();

    const prompt = `You are an expert agricultural pathologist in India. Analyze this ${cropName} plant image.

Return ONLY a valid JSON object, no markdown, no extra text:

{
  "overallStatus": "healthy or diseased or stressed or uncertain",
  "overallConfidence": 85,
  "primaryDisease": "disease name or null",
  "urgentAction": false,
  "summary": "2-3 sentence summary",
  "diseases": [
    {
      "name": "disease name",
      "confidence": 80,
      "severity": "mild or moderate or severe or critical",
      "affectedArea": "leaves or stem or roots or fruit",
      "description": "description"
    }
  ],
  "environmentalFactors": ["factor1", "factor2"],
  "treatments": [
    {
      "type": "chemical or biological or cultural or preventive",
      "name": "treatment name",
      "description": "description",
      "applicationMethod": "spray or soil",
      "dosage": "dosage info",
      "frequency": "how often",
      "urgency": "immediate or within_week or preventive"
    }
  ],
  "preventionTips": ["tip1", "tip2", "tip3"]
}`;

    const result = await generateWithRetry(model, [
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
    ]);

    const rawText = result.response.text();
    logger.debug(`Gemini response: ${rawText.substring(0, 200)}`);

    // Clean and parse JSON
    const cleanedText = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
    } catch {
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = createFallbackAnalysis(cropName);
      }
    }

    const normalizedAnalysis = normalizeAnalysis(analysis, cropName);
    const processingTime = Date.now() - startTime;

    return { ...normalizedAnalysis, processingTime };

  } catch (error) {
    logger.error(`Gemini AI analysis failed: ${error.message}`);
    throw new Error(`Disease analysis failed: ${error.message}`);
  }
};

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

const createFallbackAnalysis = (cropName) => ({
  overallStatus: 'uncertain',
  overallConfidence: 30,
  primaryDisease: null,
  urgentAction: false,
  summary: `Unable to complete full analysis of ${cropName}. Please try with a clearer image.`,
  diseases: [],
  environmentalFactors: [],
  treatments: [{
    type: 'preventive',
    name: 'General Crop Care',
    description: 'Maintain proper watering, nutrition, and pest monitoring.',
    applicationMethod: 'Regular inspection',
    dosage: 'N/A',
    frequency: 'Weekly',
    urgency: 'preventive'
  }],
  preventionTips: [
    'Ensure proper field hygiene and crop rotation',
    'Monitor crops regularly for early signs of disease',
    'Consult your local agricultural extension officer'
  ]
});

module.exports = { analyzeCropImage };