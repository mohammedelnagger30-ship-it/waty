import { AlarmSoundId } from '@/src/storage/entities';

export interface AlarmPreset {
  id: AlarmSoundId;
  /** File in android/app/src/main/res/raw (without extension). */
  sound: string;
  channelId: string;
  vibrationPattern: number[];
  labelKey: string;
  descKey: string;
  nameAr: string;
  nameEn: string;
  lightColor: string;
}

/**
 * Each alarm tone has its own Android channel with a matching vibration
 * signature. On Android 8+ the channel owns sound/vibration, so a per-tone
 * channel is the reliable way to get genuinely different alarms per task.
 */
export const ALARM_PRESETS: AlarmPreset[] = [
  {
    id: 'bell',
    sound: 'alarm_bell',
    channelId: 'alarm_bell',
    vibrationPattern: [0, 500, 200, 500, 200, 1200],
    labelKey: 'alarm.bell',
    descKey: 'alarm.bellDesc',
    nameAr: 'جرس كلاسيكي',
    nameEn: 'Classic bell',
    lightColor: '#1A9FE8',
  },
  {
    id: 'digital',
    sound: 'alarm_digital',
    channelId: 'alarm_digital',
    vibrationPattern: [0, 150, 120, 150, 120, 150, 120, 900],
    labelKey: 'alarm.digital',
    descKey: 'alarm.digitalDesc',
    nameAr: 'منبه رقمي سريع',
    nameEn: 'Fast digital',
    lightColor: '#F59E0B',
  },
  {
    id: 'siren',
    sound: 'alarm_siren',
    channelId: 'alarm_siren',
    vibrationPattern: [0, 900, 300, 900, 300, 900],
    labelKey: 'alarm.siren',
    descKey: 'alarm.sirenDesc',
    nameAr: 'صفارة إنذار',
    nameEn: 'Siren',
    lightColor: '#DC2626',
  },
  {
    id: 'chime',
    sound: 'alarm_chime',
    channelId: 'alarm_chime',
    vibrationPattern: [0, 300, 150, 300, 150, 300, 150, 700],
    labelKey: 'alarm.chime',
    descKey: 'alarm.chimeDesc',
    nameAr: 'أجراس لحنية',
    nameEn: 'Melodic chime',
    lightColor: '#A855F7',
  },
  {
    id: 'pulse',
    sound: 'alarm_pulse',
    channelId: 'alarm_pulse',
    vibrationPattern: [0, 250, 100, 250, 100, 900],
    labelKey: 'alarm.pulse',
    descKey: 'alarm.pulseDesc',
    nameAr: 'نبضات قوية',
    nameEn: 'Strong pulse',
    lightColor: '#10B981',
  },
];

export function getAlarmPreset(id?: AlarmSoundId): AlarmPreset {
  return ALARM_PRESETS.find((preset) => preset.id === id) ?? ALARM_PRESETS[0];
}

export function isAlarmSoundId(value: unknown): value is AlarmSoundId {
  return ALARM_PRESETS.some((preset) => preset.id === value);
}
