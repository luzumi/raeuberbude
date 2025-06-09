import { Injectable } from '@angular/core';
import { Entity, HomeAssistant } from './home-assistant';

@Injectable({ providedIn: 'root' })
export class HomeAssistantEntityUtils {
  constructor(private ha: HomeAssistant) {}

  public getControllableAttributes(entityId: string): Record<string, any> {
    const entity = this.ha.getEntity(entityId);
    if (!entity) return {};
    const attrs = entity.attributes;
    const controllable: Record<string, any> = {};

    for (const key of Object.keys(attrs)) {
      if (this.isControllableAttribute(key)) {
        controllable[key] = attrs[key];
      }
    }

    return controllable;
  }

  public getPossibleServices(entityId: string): string[] {
    const domain = entityId.split('.')[0];
    switch (domain) {
      case 'media_player':
        return [
          'media_player.turn_on',
          'media_player.turn_off',
          'media_player.volume_set',
          'media_player.select_source',
          'media_player.media_play',
          'media_player.media_pause'
        ];
      case 'light':
        return ['light.turn_on', 'light.turn_off', 'light.toggle'];
      case 'switch':
        return ['switch.turn_on', 'switch.turn_off', 'switch.toggle'];
      default:
        return [`${domain}.turn_on`, `${domain}.turn_off`];
    }
  }

  public findEntitiesWithAttributes(...attributeKeys: string[]): Entity[] {
    return this.ha.getEntitiesSnapshot()
      .filter(e => attributeKeys.every(key => e.attributes[key] !== undefined));
  }

  private isControllableAttribute(key: string): boolean {
    const controllableKeys = [
      'volume_level',
      'brightness',
      'source',
      'source_list',
      'input_source',
      'color_temp'
    ];
    return controllableKeys.includes(key);
  }
}
