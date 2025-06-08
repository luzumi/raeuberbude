import {Entity} from './home-assistant';

export class MediaPlayerFeatureHelper {
  static readonly FeatureFlags: Record<string, number> = {
    PAUSE: 1,
    VOLUME_SET: 4,
    VOLUME_MUTE: 8,
    TURN_ON: 16,
    TURN_OFF: 128,
    SELECT_SOURCE: 2048,
    STOP: 4096,
    PLAY_MEDIA: 16384,
    REPEAT_SET: 262144,
    PLAY: 524288,
  };

  static readonly FeatureToService: Record<string, { domain: string; service: string }> = {
    TURN_ON: { domain: 'media_player', service: 'turn_on' },
    TURN_OFF: { domain: 'media_player', service: 'turn_off' },
    VOLUME_SET: { domain: 'media_player', service: 'volume_set' },
    VOLUME_MUTE: { domain: 'media_player', service: 'volume_mute' },
    SELECT_SOURCE: { domain: 'media_player', service: 'select_source' },
    PLAY_MEDIA: { domain: 'media_player', service: 'play_media' },
    PAUSE: { domain: 'media_player', service: 'media_pause' },
    PLAY: { domain: 'media_player', service: 'media_play' },
    STOP: { domain: 'media_player', service: 'media_stop' },
    REPEAT_SET: { domain: 'media_player', service: 'repeat_set' },
  };

  static getSupportedFeatures(entity: Entity): string[] {
    const supported = entity.attributes['supported_features'] ?? 0;
    return Object.entries(this.FeatureFlags)
      .filter(([_, bit]) => (supported & bit) === bit)
      .map(([feature]) => feature);
  }

  static getServiceForFeature(feature: string): { domain: string; service: string } | undefined {
    return this.FeatureToService[feature];
  }
}
