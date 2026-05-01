import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  // ─────────────────────────────────────────────────────────────────────────
  // SET YOUR SERVER URL HERE:
  //
  //   Android emulator      → http://10.0.2.2:5000/api   (default below)
  //   iOS simulator         → http://localhost:5000/api
  //   Physical device       → http://192.168.x.x:5000/api
  //                           (replace x.x with your PC's local IP)
  //                           Run: ipconfig (Windows) or ifconfig (Mac/Linux)
  // ─────────────────────────────────────────────────────────────────────────
  static const String baseUrl = 'http://127.0.0.1:5000/api';
  static const String mlUrl   = 'http://127.0.0.1:5001';
  static const bool devMode   = false;

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      resetOnError: true,
      encryptedSharedPreferences: true,
    ),
  );
  static const String _tokenKey = 'luna_token';

  // ── Token management ──────────────────────────────────────────────────────
  static Future<void> saveToken(String token) async =>
      _storage.write(key: _tokenKey, value: token);

  static Future<String?> getToken() async =>
      _storage.read(key: _tokenKey);

  static Future<void> clearToken() async =>
      _storage.delete(key: _tokenKey);

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // ── Generic request helpers ───────────────────────────────────────────────
  static Future<Map<String, dynamic>> _get(String path, {bool auth = true}) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(auth: auth),
    ).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body, {bool auth = true, int timeoutSeconds = 45}) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(auth: auth),
      body: jsonEncode(body),
    ).timeout(Duration(seconds: timeoutSeconds));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> _put(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> _delete(String path) async {
    final res = await http.delete(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    ).timeout(const Duration(seconds: 15));
    return jsonDecode(res.body);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) {
    return _post('/auth/login', {'email': email, 'password': password}, auth: false);
  }

  static Future<Map<String, dynamic>> register(Map<String, dynamic> data) =>
      _post('/auth/signup', data, auth: false);

  static Future<void> logout() async {
    await _post('/auth/logout', {});
    await clearToken();
  }

  // ── User ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getProfile()          => _get('/users');
  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> d) => _put('/users/profile', d);
  static Future<Map<String, dynamic>> updateCycleSettings(Map<String, dynamic> d) => _put('/users/cycle-settings', d);
  static Future<Map<String, dynamic>> updateSensors(Map<String, dynamic> d) => _put('/users/sensors', d);

  // ── Cycle ─────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getCycleOverview() => _get('/cycle/overview');
  static Future<Map<String, dynamic>> getCyclePhase()    => _get('/cycle/phase');
  static Future<Map<String, dynamic>> getPrediction()    => _get('/cycle/prediction');
  static Future<Map<String, dynamic>> getCalendar({int? year, int? month}) {
    final y = year  ?? DateTime.now().year;
    final m = month ?? DateTime.now().month;
    return _get('/cycle/calendar?year=$y&month=$m');
  }
  static Future<Map<String, dynamic>> getCycleHistory()  => _get('/cycle/history');
  static Future<Map<String, dynamic>> logPeriod(String startDate, {String? endDate}) =>
      _post('/cycle/log', {'startDate': startDate, if (endDate != null) 'endDate': endDate});
  static Future<Map<String, dynamic>> getOvulationWindow() => _get('/cycle/ovulation');

  // ── Health Insights ───────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getHealthSnapshot()           => _get('/health/snapshot');
  static Future<Map<String, dynamic>> getHeartRate({int days = 7})  => _get('/health/heart-rate?days=$days');
  static Future<Map<String, dynamic>> getTemperature({int days = 14})=> _get('/health/temperature?days=$days');
  static Future<Map<String, dynamic>> getSleep({int days = 7})      => _get('/health/sleep?days=$days');
  static Future<Map<String, dynamic>> getHealthInsights()           => _get('/health/insights');
  static Future<Map<String, dynamic>> getHealthStatus()             => _get('/health/status');

  // ── Alerts ────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getAlerts()             => _get('/alerts');
  static Future<Map<String, dynamic>> getUnreadAlerts()       => _get('/alerts/unread');
  static Future<Map<String, dynamic>> getPredictionSummary()  => _get('/alerts/prediction');
  static Future<Map<String, dynamic>> getNotifPrefs()         => _get('/alerts/preferences');
  static Future<Map<String, dynamic>> updateNotifPrefs(Map<String, dynamic> d) => _put('/alerts/preferences', d);
  static Future<Map<String, dynamic>> markAlertRead(String id)=> _put('/alerts/$id/read', {});
  static Future<Map<String, dynamic>> markAllRead()           => _put('/alerts/read-all', {});
  static Future<Map<String, dynamic>> dismissAlert(String id) => _delete('/alerts/$id');
  static Future<Map<String, dynamic>> evaluateAlerts()        => _post('/alerts/evaluate', {});

  // ── Trends ────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getTrendsOverview()       => _get('/trends/overview');
  static Future<Map<String, dynamic>> getCycleDurationTrend()   => _get('/trends/cycle-duration');
  static Future<Map<String, dynamic>> getCycleComparison({int n = 6}) => _get('/trends/cycle-comparison?n=$n');
  static Future<Map<String, dynamic>> getRegularity()           => _get('/trends/regularity');
  static Future<Map<String, dynamic>> getSleepTrend()           => _get('/trends/sleep');
  static Future<Map<String, dynamic>> getTemperatureTrend()     => _get('/trends/temperature');
  static Future<Map<String, dynamic>> getPatterns()             => _get('/trends/patterns');

  // ── Medicines ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getMedicines()           => _get('/medicines');
  static Future<Map<String, dynamic>> getMedicineSchedule()    => _get('/medicines/schedule');
  static Future<Map<String, dynamic>> addMedicine(Map<String, dynamic> d) => _post('/medicines', d);
  static Future<Map<String, dynamic>> updateMedicine(String id, Map<String, dynamic> d) => _put('/medicines/$id', d);
  static Future<Map<String, dynamic>> deleteMedicine(String id) => _delete('/medicines/$id');
  static Future<Map<String, dynamic>> takeDose(String id, {String? date}) =>
      _post('/medicines/$id/take', {if (date != null) 'date': date});

  // ── Wearable ──────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getLatestReading()  => _get('/wearable/readings/latest');
  static Future<Map<String, dynamic>> getSyncStatus()     => _get('/wearable/sync-status');
  static Future<Map<String, dynamic>> getDrilldown(String date) => _get('/wearable/drilldown?date=$date');
  static Future<Map<String, dynamic>> getReadings({String? from, String? to, String? range}) {
    var q = '';
    if (range != null) {
      q = '?range=$range';
    } else {
      if (from != null) q += '?from=$from';
      if (to   != null) q += '${q.isEmpty ? "?" : "&"}to=$to';
    }
    return _get('/wearable/readings$q');
  }

  // ── ML Predictions ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> mlPredictAuto()          => _get('/ml/predict/auto');
  static Future<Map<String, dynamic>> mlPredictFromWearable({String? deviceId, int days = 30}) {
    var q = '?days=$days';
    if (deviceId != null) q += '&device_id=$deviceId';
    return _get('/ml/predict/from-wearable$q');
  }
  static Future<Map<String, dynamic>> mlModelInfo()            => _get('/ml/model/info');

  // ── Predictions ───────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getNextPeriod()     => _get('/predictions/next-period');
  static Future<Map<String, dynamic>> getPhaseTimeline()  => _get('/predictions/phase-timeline');
  static Future<Map<String, dynamic>> getConfidence()     => _get('/predictions/confidence');

  // ── Chat AI ───────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> askLuna(String query) =>
      _post('/chat/query', {'query': query});
}
