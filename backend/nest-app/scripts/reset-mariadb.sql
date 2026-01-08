-- Script to reset MariaDB tables for fresh import
-- Run this with: docker exec -i raueberbude-mariadb-1 mariadb -urb_user -prb_user_secret raueberbude < reset-mariadb.sql

USE raueberbude;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all tables
DROP TABLE IF EXISTS ha_entity_binding;
DROP TABLE IF EXISTS ha_entity;
DROP TABLE IF EXISTS ha_device;
DROP TABLE IF EXISTS ha_area;
DROP TABLE IF EXISTS ha_domain;
DROP TABLE IF EXISTS ha_person;
DROP TABLE IF EXISTS ha_zone;
DROP TABLE IF EXISTS ha_media_player;
DROP TABLE IF EXISTS ha_service;
DROP TABLE IF EXISTS ha_automation;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Tables will be recreated on next app start

