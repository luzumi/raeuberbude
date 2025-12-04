/**
 * HomeAssistant Entity Domain Enum
 *
 * Available entity domains in HomeAssistant.
 */
export enum HaEntityDomain {
  /** Light entities */
  LIGHT = 'light',

  /** Switch entities */
  SWITCH = 'switch',

  /** Sensor entities */
  SENSOR = 'sensor',

  /** Binary sensor entities */
  BINARY_SENSOR = 'binary_sensor',

  /** Climate/HVAC entities */
  CLIMATE = 'climate',

  /** Media player entities */
  MEDIA_PLAYER = 'media_player',

  /** Cover/blind entities */
  COVER = 'cover',

  /** Fan entities */
  FAN = 'fan',

  /** Camera entities */
  CAMERA = 'camera',

  /** Lock entities */
  LOCK = 'lock',

  /** Alarm control panel entities */
  ALARM_CONTROL_PANEL = 'alarm_control_panel',

  /** Automation entities */
  AUTOMATION = 'automation',

  /** Person entities */
  PERSON = 'person',

  /** Zone entities */
  ZONE = 'zone',

  /** Other/unknown entities */
  OTHER = 'other',
}

