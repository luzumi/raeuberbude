-- Erstelle die categories Tabelle
CREATE TABLE IF NOT EXISTS `categories` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `label` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `IDX_categories_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Erstelle die llm_instances Tabelle
CREATE TABLE IF NOT EXISTS `llm_instances` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `model` VARCHAR(255) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_active` BOOLEAN NOT NULL DEFAULT FALSE,
  `system_prompt` TEXT NULL,
  `health` ENUM('healthy', 'unhealthy', 'unknown') NOT NULL DEFAULT 'unknown',
  `last_health_check` DATETIME NULL,
  `config` JSON NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX `IDX_llm_instances_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

