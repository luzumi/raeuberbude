-- Migration: Create Binding Tables
-- Erstellt User-Device, Device-Entity und Device-Area Binding Tabellen
-- Version: 1.0
-- Datum: 2025-12-16

-- ================================================
-- Table: user_device_bindings
-- ================================================
CREATE TABLE IF NOT EXISTS user_device_bindings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  ha_device_id VARCHAR(36) NOT NULL,
  custom_alias VARCHAR(255) NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_user_device_bindings__user_device UNIQUE (user_id, ha_device_id),
  CONSTRAINT fk_user_device_bindings__user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_device_bindings__device FOREIGN KEY (ha_device_id) REFERENCES ha_devices(id) ON DELETE CASCADE,
  INDEX ix_user_device_bindings__user_id (user_id),
  INDEX ix_user_device_bindings__ha_device_id (ha_device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Table: device_entity_bindings
-- ================================================
CREATE TABLE IF NOT EXISTS device_entity_bindings (
  id VARCHAR(36) PRIMARY KEY,
  ha_device_id VARCHAR(36) NOT NULL,
  ha_entity_id VARCHAR(255) NOT NULL,
  binding_type ENUM('auto', 'manual', 'suggested') DEFAULT 'manual',
  custom_category VARCHAR(100) NULL,
  display_order INT DEFAULT 100,
  is_visible BOOLEAN DEFAULT TRUE,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_device_entity_bindings__device_entity UNIQUE (ha_device_id, ha_entity_id),
  CONSTRAINT fk_device_entity_bindings__device FOREIGN KEY (ha_device_id) REFERENCES ha_devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_device_entity_bindings__entity FOREIGN KEY (ha_entity_id) REFERENCES ha_entities(entity_id) ON DELETE CASCADE,
  INDEX ix_device_entity_bindings__ha_device_id (ha_device_id),
  INDEX ix_device_entity_bindings__ha_entity_id (ha_entity_id),
  INDEX ix_device_entity_bindings__binding_type (binding_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Table: device_area_bindings
-- ================================================
CREATE TABLE IF NOT EXISTS device_area_bindings (
  id VARCHAR(36) PRIMARY KEY,
  ha_device_id VARCHAR(36) NOT NULL,
  ha_area_id VARCHAR(36) NOT NULL,
  is_primary BOOLEAN DEFAULT TRUE,
  is_temporary BOOLEAN DEFAULT FALSE,
  valid_from TIMESTAMP NULL,
  valid_until TIMESTAMP NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_device_area_bindings__device_area UNIQUE (ha_device_id, ha_area_id),
  CONSTRAINT fk_device_area_bindings__device FOREIGN KEY (ha_device_id) REFERENCES ha_devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_device_area_bindings__area FOREIGN KEY (ha_area_id) REFERENCES ha_areas(id) ON DELETE CASCADE,
  INDEX ix_device_area_bindings__ha_device_id (ha_device_id),
  INDEX ix_device_area_bindings__ha_area_id (ha_area_id),
  INDEX ix_device_area_bindings__is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- Insert Sample Data (Optional - für Testing)
-- ================================================

-- Beispiel User-Device Binding (auskommentiert)
-- INSERT INTO user_device_bindings (id, user_id, ha_device_id, custom_alias, is_primary)
-- VALUES (UUID(), 'user-uuid', 'device-uuid', 'Mein Handy', TRUE);

-- ================================================
-- Rollback Script
-- ================================================
-- DROP TABLE IF EXISTS device_area_bindings;
-- DROP TABLE IF EXISTS device_entity_bindings;
-- DROP TABLE IF EXISTS user_device_bindings;

