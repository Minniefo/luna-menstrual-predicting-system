const { GoogleGenerativeAI } = require('@google/generative-ai');
const SensorReading = require('../models/SensorReading');
const User          = require('../models/User');
const healthService = require('./health.service');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyPlaceholder');

/**
 * Luna Chat Service
 * Handles data aggregation and LLM communication.
 */
class ChatService {
  /**
   * Main query handler
   */
  async processQuery(userId, query) {
    // 1. Fetch relevant context
    const context = await this._buildContext(userId);

    // 2. Prepare the prompt
    const prompt = this._buildPrompt(query, context);

    // 3. Call Gemini
    try {
      // Use Gemini 2.0 Flash as per user's AI Studio availability
      const modelName = 'gemini-2.5-flash'; 
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.error('Gemini API Error:', err);
      if (err.message.includes('API_KEY_INVALID')) {
         return "I'm sorry, my AI brain (API Key) isn't configured correctly yet. Please check the backend settings!";
      }
      return "I'm having a bit of trouble processing that right now. Could you try asking in a different way?";
    }
  }

  /**
   * Gather user health data to ground the AI response
   */
  async _buildContext(userId) {
    const user = await User.findById(userId).lean();
    if (!user) return null;

    // Last 14 days of readings
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fromStr = fourteenDaysAgo.toISOString().split('T')[0];

    const readings = await SensorReading.find({ 
      userId, 
      date: { $gte: fromStr } 
    }).sort({ date: 1 }).lean();

    // Use health service to get current classification
    const snapshot = healthService.buildHealthSnapshot(user, readings);

    return {
      userName: user.name || 'User',
      currentPhase: snapshot.currentPhase.phase,
      cycleDay: snapshot.cycleDay,
      overallHealth: snapshot.overallHealth.status,
      recentInsights: snapshot.insights,
      vitals: readings.map(r => ({
        date: r.date,
        hr: r.heartRate,
        temp: r.temperature,
        sleep: r.sleepHours,
        disturbances: r.sleepDisturbances
      })),
      summary: {
        avgHR: snapshot.heartRate?.average,
        avgTemp: snapshot.temperature?.average,
        avgSleep: snapshot.sleep?.averageHours
      }
    };
  }

  /**
   * Construct the system + user prompt
   */
  _buildPrompt(query, context) {
    if (!context) return query;

    const dataJson = JSON.stringify(context.vitals, null, 2);
    
    return `
You are Luna, an empathetic and intelligent AI health assistant for the "Luna" menstrual health tracking app.
Your goal is to help the user understand their health data, explain trends, and guide them through the app's visual analytics.

USER PROFILE:
- Name: ${context.userName}
- Current Cycle Phase: ${context.currentPhase} (Day ${context.cycleDay})
- Overall Health Status: ${context.overallHealth}

RECENT ANALYTICS (Last 14 Days):
${dataJson}

HEALTH SUMMARY:
- Avg Heart Rate: ${context.summary.avgHR} bpm
- Avg Temperature: ${context.summary.avgTemp} °C
- Avg Sleep: ${context.summary.avgSleep} hours

APP NAVIGATION GUIDANCE:
1. "Health Screen": Shows live vitals, overall status, and charts for Heart Rate, Temperature, and Sleep.
2. "Trend Screen" (Health Analytics): Shows long-term correlations, cycle duration history, and clinical insights.
3. "Alerts Screen": Shows period predictions and medicine reminders.

CONSTRAINTS:
- Use REAL DATA from the context provided above.
- If the user asks about trends, refer to the specific numbers in the vitals list.
- Be supportive and empathetic, but NOT a medical doctor. Always suggest consulting a professional for serious concerns.
- Refer to the "Health Screen" or "Trend Screen" when the user asks where to find more charts.
- Keep responses concise but insightful.

USER QUERY: "${query}"

LUNA'S RESPONSE:`;
  }
}

module.exports = new ChatService();
