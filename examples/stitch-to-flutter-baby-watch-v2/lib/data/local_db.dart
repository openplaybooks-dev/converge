import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

class LocalDb {
  LocalDb._(this._db);

  final Database _db;

  Database get db => _db;

  static LocalDb? _instance;

  static LocalDb get instance {
    final i = _instance;
    if (i == null) {
      throw StateError('LocalDb.open() must be awaited before LocalDb.instance');
    }
    return i;
  }

  static Future<LocalDb> open() async {
    if (_instance != null) return _instance!;
    final dir = await getDatabasesPath();
    final path = p.join(dir, 'baby_watch.db');
    final db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE paired_beacons (
            id TEXT PRIMARY KEY,
            signature_json TEXT,
            name TEXT,
            paired_at INTEGER
          )
        ''');
        await db.execute('''
          CREATE TABLE safe_zones (
            id TEXT PRIMARY KEY,
            name TEXT,
            lat REAL,
            lng REAL,
            radius_m INTEGER,
            active INTEGER
          )
        ''');
        await db.execute('''
          CREATE TABLE alert_events (
            id TEXT PRIMARY KEY,
            beacon_id TEXT,
            kind TEXT,
            occurred_at INTEGER,
            duration_s INTEGER,
            suppressed_by_zone_id TEXT
          )
        ''');
      },
    );
    _instance = LocalDb._(db);
    return _instance!;
  }

  Future<void> close() async {
    await _db.close();
    _instance = null;
  }
}
