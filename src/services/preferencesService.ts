import { supabase, isSupabaseConfigured } from './supabase';
import type { Availability, Preferences } from '../types';

export const preferencesService = {
  async getPreferences(userId: string): Promise<{ availability: Availability; preferences: Preferences } | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    const availability: Availability = {
      dailyHours: Number(data.study_hours_per_day) || 4.0,
      slots: {
        morning: true,
        afternoon: false,
        evening: true,
        night: true,
      },
    };

    const preferences: Preferences = {
      sessionDuration: data.session_duration || 45,
      shortSessions: data.prefer_short_sessions || false,
      deepWork: data.prefer_deep_work ?? true,
      practiceSessions: data.include_practice ?? true,
      revisionSessions: data.include_revision ?? true,
      autoRescheduling: data.auto_reschedule_enabled ?? true,
      lightDays: ['Sunday'],
    };

    return { availability, preferences };
  },

  async savePreferences(
    userId: string,
    avail: Availability,
    pref: Preferences
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const payload = {
      user_id: userId,
      study_hours_per_day: avail.dailyHours,
      prefer_short_sessions: pref.shortSessions,
      prefer_deep_work: pref.deepWork,
      include_practice: pref.practiceSessions,
      include_revision: pref.revisionSessions,
      auto_reschedule_enabled: pref.autoRescheduling,
      session_duration: pref.sessionDuration,
      timezone: browserTz,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('[preferencesService] Error saving preferences:', error);
      return false;
    }
    return true;
  },
};
