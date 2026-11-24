import { DatabaseSync } from 'node:sqlite';
import { defaults, dayKey } from '../shared/defaults';
import { EngineState, EventRecord, Settings, DailyPlan } from '../shared/types';
import { randomUUID } from 'node:crypto';
import { updateDailyPlan } from './planner';
import { readStudyPresets, updateStudyPresets } from '../engine/study-presets';
export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, type TEXT NOT NULL, at INTEGER NOT NULL, day TEXT NOT NULL, value REAL NOT NULL DEFAULT 1, detail TEXT NOT NULL DEFAULT '');
      CREATE INDEX IF NOT EXISTS events_at ON events(at);
      CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY, at INTEGER NOT NULL, text TEXT NOT NULL);`);
  }
  get<T>(key: string): T | null {
    const row = this.db.prepare('SELECT value FROM state WHERE key = ?').get(key) as
      { value: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }
  set(key: string, value: unknown) {
    this.db
      .prepare('INSERT OR REPLACE INTO state(key,value) VALUES(?,?)')
      .run(key, JSON.stringify(value));
  }
  settings(): Settings {
    const s = this.get<Settings>('settings');
    const settings = { ...defaults, ...s, enabled: { ...defaults.enabled, ...s?.enabled } };
    // Version 1 used different geometry; asking for recalibration is safer than mixing units.
    if (settings.baseline?.version !== 2 || settings.baseline.model !== settings.visionMode)
      settings.baseline = null;
    if (settings.distanceBaseline?.version !== 2) settings.distanceBaseline = null;
    return settings;
  }
  engine() {
    return this.get<EngineState>('engine');
  }
  studyPresets() {
    return readStudyPresets(this.get<unknown>('study-presets'));
  }
  updateStudyPreset(input: unknown) {
    this.set('study-presets', updateStudyPresets(this.studyPresets(), input, randomUUID()));
  }
  plan(now = Date.now()): DailyPlan {
    const day = dayKey(now);
    return (
      this.get<DailyPlan>(`plan:${day}`) ?? {
        day,
        tasks: [],
        focusGoal: this.get<number>('focus-goal') ?? 90,
      }
    );
  }
  updatePlan(input: unknown, now = Date.now()) {
    const plan = updateDailyPlan(this.plan(now), input, randomUUID());
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.set(`plan:${plan.day}`, plan);
      this.set('focus-goal', plan.focusGoal);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return plan;
  }
  log(type: string, value = 1, detail = '', at = Date.now()) {
    this.db
      .prepare('INSERT INTO events(type,at,day,value,detail) VALUES(?,?,?,?,?)')
      .run(type, at, dayKey(at), value, detail);
  }
  events(days = 365): EventRecord[] {
    return this.db
      .prepare('SELECT * FROM events WHERE at >= ? ORDER BY at')
      .all(Date.now() - days * 86400000) as unknown as EventRecord[];
  }
  feedback(text: string) {
    this.db.prepare('INSERT INTO feedback(at,text) VALUES(?,?)').run(Date.now(), text);
  }
  clear() {
    this.db.exec(
      'BEGIN IMMEDIATE; DELETE FROM state; DELETE FROM events; DELETE FROM feedback; COMMIT; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;',
    );
  }
  close() {
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    this.db.close();
  }
}
