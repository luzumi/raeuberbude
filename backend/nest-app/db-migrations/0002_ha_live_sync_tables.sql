-- Migration: Erweiterte HA-Tabellen für Live-Sync
-- Erstellt strukturierte Tabellen für Areas, Devices und Entities

SET FOREIGN_KEY_CHECKS=0;

-- ====================================================================
-- ha_areas - Home Assistant Areas/Rooms
-- ====================================================================
CREATE TABLE IF NOT EXISTS `ha_areas` (
  `id` CHAR(36) NOT NULL,
  `area_id` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `aliases` JSON NULL,
  `floor` VARCHAR(100) NULL,
  `icon` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_ha_areas__area_id` (`area_id`),
  INDEX `ix_ha_areas__name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- ha_devices - Home Assistant Devices
-- ====================================================================
CREATE TABLE IF NOT EXISTS `ha_devices` (
  `id` CHAR(36) NOT NULL,
  `device_id` VARCHAR(255) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `manufacturer` VARCHAR(255) NULL,
  `model` VARCHAR(255) NULL,
  `sw_version` VARCHAR(100) NULL,
  `configuration_url` VARCHAR(500) NULL,
  `connections` JSON NULL,
  `identifiers` JSON NULL,
  `via_device_id` VARCHAR(255) NULL,
  `area_id` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_ha_devices__device_id` (`device_id`),
  INDEX `ix_ha_devices__area_id` (`area_id`),
  INDEX `ix_ha_devices__via_device_id` (`via_device_id`),
  CONSTRAINT `fk_ha_devices__ha_areas__area_id`
    FOREIGN KEY (`area_id`) REFERENCES `ha_areas` (`area_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ha_devices__ha_devices__via_device_id`
    FOREIGN KEY (`via_device_id`) REFERENCES `ha_devices` (`device_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- ha_entities - Home Assistant Entities (erweitert)
-- ====================================================================
CREATE TABLE IF NOT EXISTS `ha_entities` (
  `id` CHAR(36) NOT NULL,
  `entity_id` VARCHAR(255) NOT NULL UNIQUE,
  `friendly_name` VARCHAR(255) NULL,
  `device_class` VARCHAR(100) NULL,
  `area` VARCHAR(255) NULL,
  `domain` VARCHAR(100) NOT NULL,
  `platform` VARCHAR(100) NULL,
  `unique_id` VARCHAR(255) NULL,
  `supported_features` INT NULL,
  `entity_category` VARCHAR(100) NULL,
  `capabilities` JSON NULL,
  `original_name` VARCHAR(255) NULL,
  `object_id` VARCHAR(100) NULL,
  `entity_type` VARCHAR(100) NULL,
  `device_id` VARCHAR(36) NULL,
  `area_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_ha_entities__entity_id` (`entity_id`),
  INDEX `ix_ha_entities__domain` (`domain`),
  INDEX `ix_ha_entities__area` (`area`),
  INDEX `ix_ha_entities__device_id` (`device_id`),
  INDEX `ix_ha_entities__area_id` (`area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;

-- Ende der Migration

