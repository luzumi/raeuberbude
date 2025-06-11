export enum MediaPlayerFeature {
  TURN_ON = 128,
  TURN_OFF = 256,
  VOLUME_MUTE = 8,
  VOLUME_SET = 4,
  VOLUME_STEP = 1024,
  SELECT_SOURCE = 2048,
  PLAY = 16384,
  PAUSE = 1,
  STOP = 4096,
  NEXT_TRACK = 32,
  PREVIOUS_TRACK = 16,
  PLAY_MEDIA = 512,
  REPEAT_SET = 262144,
  SHUFFLE_SET = 131072,
  SELECT_SOUND_MODE = 65536,
  BROWSE_MEDIA = 32768,
  CLEAR_PLAYLIST = 8192,
  GROUPING = 524288,
  MEDIA_ANNOUNCE = 2097152,
  MEDIA_SEEK = 2
}

import { Entity } from './home-assistant.service';

export function getSupportedMediaPlayerFeatures(entity: Entity): string[] {
  const supported = entity.attributes?.supported_features ?? 0;

  return Object.entries(MediaPlayerFeature)
    .filter(([_, bit]) => typeof bit === 'number' && (supported & bit) === bit)
    .map(([name]) => name);
}

export function describeMediaPlayerFeatures(bitmask: number): string[] {
  return Object.entries(MediaPlayerFeature)
    .filter(([_, bit]) => typeof bit === 'number' && (bitmask & bit) === bit)
    .map(([name]) => name);
}
