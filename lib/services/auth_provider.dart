import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _loading = false;
  String? _error;

  Map<String, dynamic>? get user    => _user;
  bool                   get loading => _loading;
  String?                get error   => _error;
  bool                   get isLoggedIn => _user != null;

  Future<bool> login(String email, String password) async {
    print('DEBUG: Attempting login for email: $email');
    if (ApiService.devMode) {
      print('WARNING: DEV_MODE is active. Submitting dummy credentials and bypassing database check.');
    }
    _loading = true; _error = null; notifyListeners();
    try {
      final res = await ApiService.login(email, password);
      print('DEBUG: Login response: $res');
      if (res['success'] == true) {
        print('DEBUG: Login success, saving token...');
        _user = res['user'];
        await ApiService.saveToken(res['token']);
        _loading = false; notifyListeners();
        return true;
      }
      _error = res['message'] ?? 'Login failed';
      print('DEBUG: Login failed with message: $_error');
    } catch (e) {
      print('DEBUG: Login exception caught: $e');
      _error = 'Connection error. Check your network.';
    }
    _loading = false; notifyListeners();
    return false;
  }

  Future<bool> register(Map<String, dynamic> data) async {
    print('DEBUG: Attempting register with data: $data');
    _loading = true; _error = null; notifyListeners();
    try {
      final res = await ApiService.register(data);
      print('DEBUG: Register response: $res');
      if (res['success'] == true) {
        print('DEBUG: Register success, saving token...');
        _user = res['user'];
        await ApiService.saveToken(res['token']);
        _loading = false; notifyListeners();
        return true;
      }
      _error = res['message'] ?? 'Registration failed';
      print('DEBUG: Register failed with message: $_error');
    } catch (e) {
      print('DEBUG: Register exception caught: $e');
      _error = 'Connection error. Check your network.';
    }
    _loading = false; notifyListeners();
    return false;
  }

  Future<void> logout() async {
    await ApiService.logout();
    _user = null;
    notifyListeners();
  }

  Future<bool> tryAutoLogin() async {
    final token = await ApiService.getToken();
    if (token == null) return false;
    try {
      final res = await ApiService.getProfile();
      if (res['success'] == true) {
        _user = res['user'];
        notifyListeners();
        return true;
      }
    } catch (_) {}
    return false;
  }

  void updateUser(Map<String, dynamic> updated) {
    _user = updated;
    notifyListeners();
  }
}
