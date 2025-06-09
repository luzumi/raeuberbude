
/**
 * Erweiterung des HomeAssistant-Services:
 * Liefert Methoden zum gezielten Zugriff auf steuerbare Attribute/Funktionen.
 */

import { Injectable } from '@angular/core';
import { Entity, HomeAssistant } from './home-assistant';

@Injectable({ providedIn: 'root' })
export class HomeAssistantEntityUtils {
  constructor(private ha: HomeAssistant, private hass:HomeAssistantEntityUtils) {}

  /**
   * Gibt alle steuerbaren Attribute (z.B. volume_level, source_list, etc.) einer Entity zurück.
   */
  public getControllableAttributes(entityId: string): Record<string, any> {
    const entity = this.ha.getEntity(entityId);
    if (!entity) return {};

    const attrs = entity.attributes;
    const controllable: Record<string, any> = {};

    for (const key of Object.keys(attrs)) {
      if (this.isControllableAttribute(key, attrs[key])) {
        controllable[key] = attrs[key];
      }
    }

    return controllable;
  }

  /**
   * Gibt die Liste möglicher Services für eine Entity basierend auf dem Domainnamen zurück.
   * Beispiel: media_player => media_player.turn_on, media_player.volume_set, etc.
   */
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
          'media_player.media_pause',
        ];
      case 'light':
        return ['light.turn_on', 'light.turn_off', 'light.toggle'];
      case 'switch':
        return ['switch.turn_on', 'switch.turn_off', 'switch.toggle'];
      default:
        return [`${domain}.turn_on`, `${domain}.turn_off`];
    }
  }

  /**
   * Gibt eine Liste aller steuerbaren Entitäten mit bestimmten Attributen zurück
   */
  public findEntitiesWithAttributes(...attributeKeys: string[]): Entity[] {
    const entities = this.ha.getEntitiesSnapshot();

    return this.ha.getEntitiesSnapshot()
      .filter((e: { attributes: { [x: string]: undefined; }; }) =>
        attributeKeys.every((key) => e.attributes[key] !== undefined)
      );
  }

  /**
   * Prüft, ob ein Attribut potentiell steuerbar ist.
   */
  private isControllableAttribute(key: string, value: any): boolean {
    const controllableKeys = [
      'volume_level',
      'brightness',
      'source',
      'source_list',
      'input_source',
      'color_temp',
    ];
    return controllableKeys.includes(key);
  }
}
