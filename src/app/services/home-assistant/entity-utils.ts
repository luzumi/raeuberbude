import { Entity } from './home-assistant.service';

const CONTROLLABLE_KEYS = [
  'volume_level',
  'brightness',
  'source',
  'source_list',
  'input_source',
  'color_temp'
];

export function getControllableAttributes(entity: Entity): Record<string, any> {
  const attrs = entity?.attributes ?? {};
  return Object.fromEntries(
    Object.entries(attrs).filter(([key, _]) => CONTROLLABLE_KEYS.includes(key))
  );
}

export function getPossibleServices(entityId: string): string[] {
  const domain = entityId.split('.')[0];
  switch (domain) {
    case 'media_player':
      return [
        'media_player.turn_on', 'media_player.turn_off',
        'media_player.volume_set', 'media_player.select_source',
        'media_player.media_play', 'media_player.media_pause'
      ];
    case 'light':
      return ['light.turn_on', 'light.turn_off', 'light.toggle'];
    case 'switch':
      return ['switch.turn_on', 'switch.turn_off', 'switch.toggle'];
    default:
      return [`${domain}.turn_on`, `${domain}.turn_off`];
  }
}

export function findEntitiesWithAttributes(entities: Entity[], ...keys: string[]): Entity[] {
  return entities.filter(e => keys.every(k => e.attributes?.[k] !== undefined));
}
