// @ts-nocheck
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { HaArea } from '../../src/modules/homeassistant/entities';
import { HaDevice } from '../../src/modules/homeassistant/entities';
import { HaEntity } from '../../src/modules/homeassistant/entities';
import { HaEntityState } from '../../src/modules/homeassistant/entities';
import { HaEntityDomain } from '../../src/modules/homeassistant/enums';

config({ path: '.env.test' });

describe('Home Assistant Entities CRUD & FK Behavior Tests', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5433'),
      username: process.env['DB_USERNAME'] || 'test',
      password: process.env['DB_PASSWORD'] || 'test',
      database: process.env['DB_DATABASE'] || 'raeuberbude_test',
      entities: ['src/**/*.entity.ts'],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test (order matters for FK constraints)
    await dataSource.query('DELETE FROM ha_entity_states CASCADE');
    await dataSource.query('DELETE FROM ha_entities CASCADE');
    await dataSource.query('DELETE FROM ha_devices CASCADE');
    await dataSource.query('DELETE FROM ha_areas CASCADE');
  });

  describe('HA Area CRUD Operations', () => {
    it('should create an area', async () => {
      const areaRepo = dataSource.getRepository(HaArea);

      const area = await areaRepo.save({
        areaId: 'living_room',
        name: 'Living Room',
        floor: 'ground_floor',
      } as any);

      expect((area as any).id).toBeDefined();
      expect((area as any).areaId).toBe('living_room');
      expect((area as any).name).toBe('Living Room');
    });

    it('should enforce unique area_id constraint', async () => {
      const areaRepo = dataSource.getRepository(HaArea);

      await areaRepo.save({
        areaId: 'kitchen',
        name: 'Kitchen',
      } as any);

      await expect(
        areaRepo.save({
          areaId: 'kitchen',
          name: 'Kitchen 2',
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('HA Device CRUD Operations', () => {
    it('should create a device', async () => {
      const deviceRepo = dataSource.getRepository(HaDevice);

      const device = await deviceRepo.save({
        deviceId: 'device_001',
        name: 'Smart Light Switch',
        manufacturer: 'Philips',
        model: 'Hue Switch',
      } as any);

      expect((device as any).id).toBeDefined();
      expect((device as any).deviceId).toBe('device_001');
      expect((device as any).manufacturer).toBe('Philips');
    });

    it('should create device linked to area', async () => {
      const areaRepo = dataSource.getRepository(HaArea);
      const deviceRepo = dataSource.getRepository(HaDevice);

      const area = await areaRepo.save({
        areaId: 'bedroom',
        name: 'Bedroom',
      } as any);

      const device = await deviceRepo.save({
        deviceId: 'device_002',
        name: 'Bedroom Light',
        areaId: (area as any).areaId,
      } as any);

      expect((device as any).areaId).toBe('bedroom');
    });
  });

  describe('HA Entity CRUD Operations', () => {
    it('should create an entity', async () => {
      const entityRepo = dataSource.getRepository(HaEntity);

      const entity: any = await entityRepo.save({
        entityId: 'light.living_room',
        domain: HaEntityDomain.LIGHT,
        objectId: 'living_room',
        friendlyName: 'Living Room Light',
      } as any);

      expect((entity as any).entityId).toBe('light.living_room');
      expect((entity as any).domain).toBe(HaEntityDomain.LIGHT);
    });

    it('should create entity with device and area references', async () => {
      const areaRepo = dataSource.getRepository(HaArea);
      const deviceRepo = dataSource.getRepository(HaDevice);
      const entityRepo = dataSource.getRepository(HaEntity);

      // Create area
      const area = await areaRepo.save({
        areaId: 'office',
        name: 'Office',
      } as any);

      // Create device
      const device = await deviceRepo.save({
        deviceId: 'device_003',
        name: 'Office Sensor',
        areaId: (area as any).areaId,
      } as any);

      // Create entity
      const entity: any = await entityRepo.save({
        entityId: 'sensor.office_temperature',
        domain: HaEntityDomain.SENSOR,
        objectId: 'office_temperature',
        friendlyName: 'Office Temperature',
        deviceId: (device as any).deviceId,
        areaId: (area as any).areaId,
      } as any);

      expect((entity as any).deviceId).toBe('device_003');
      expect((entity as any).areaId).toBe('office');
    });
  });

  describe('FK Behavior: ON DELETE SET NULL - area_id', () => {
    it('should set area_id to NULL in ha_devices when area is deleted', async () => {
      const areaRepo = dataSource.getRepository(HaArea);
      const deviceRepo = dataSource.getRepository(HaDevice);

      // Create area
      const area = await areaRepo.save({
        areaId: 'garage',
        name: 'Garage',
      } as any);

      // Create device in area
      const device = await deviceRepo.save({
        deviceId: 'device_004',
        name: 'Garage Door',
        areaId: (area as any).areaId,
      } as any);

      // Verify device has area
      const deviceBefore = await deviceRepo.findOne({ where: { deviceId: 'device_004' } });
      expect((deviceBefore as any)?.areaId).toBe('garage');

      // Delete area
      await areaRepo.remove(area as any);

      // Verify device still exists but area_id is NULL
      const deviceAfter = await deviceRepo.findOne({ where: { deviceId: 'device_004' } });
      expect(deviceAfter).toBeDefined();
      expect((deviceAfter as any)?.areaId).toBeNull();
    });

    it('should set area_id to NULL in ha_entities when area is deleted', async () => {
      const areaRepo = dataSource.getRepository(HaArea);
      const entityRepo = dataSource.getRepository(HaEntity);

      // Create area
      const area = await areaRepo.save({
        areaId: 'bathroom',
        name: 'Bathroom',
      } as any);

      // Create entity in area
      const entity = await entityRepo.save({
        entityId: 'light.bathroom',
        domain: HaEntityDomain.LIGHT,
        objectId: 'bathroom',
        friendlyName: 'Bathroom Light',
        areaId: (area as any).areaId,
      } as any);

      // Delete area
      await areaRepo.remove(area as any);

      // Verify entity still exists but area_id is NULL
      const entityAfter = await entityRepo.findOne({ where: { entityId: 'light.bathroom' } });
      expect(entityAfter).toBeDefined();
      expect((entityAfter as any)?.areaId).toBeNull();
    });
  });

  describe('FK Behavior: ON DELETE CASCADE - entity_states', () => {
    it('should cascade delete entity_states when entity is deleted', async () => {
      const entityRepo = dataSource.getRepository(HaEntity);
      const stateRepo = dataSource.getRepository(HaEntityState);

      // Create entity
      const entity: any = await entityRepo.save(<any>{
        entityId: 'switch.test',
        domain: HaEntityDomain.SWITCH,
        objectId: 'test',
        friendlyName: 'Test Switch',
      });

      // Create entity state
      await stateRepo.save({
        entityId: (entity as any).entityId,
        state: 'on',
        timestamp: new Date(),
      } as any);

      // Verify state exists
      const stateBefore = await stateRepo.findOne({ where: { entityId: 'switch.test' } });
      expect(stateBefore).toBeDefined();

      // Delete entity
      await entityRepo.remove(entity as any);

      // Verify state was cascade deleted
      const stateAfter = await stateRepo.findOne({ where: { entityId: 'switch.test' } });
      expect(stateAfter).toBeNull();
    });
  });

  describe('Complex Relationship Tests', () => {
    it('should handle full hierarchy: area -> device -> entity -> state', async () => {
      const areaRepo = dataSource.getRepository(HaArea);
      const deviceRepo = dataSource.getRepository(HaDevice);
      const entityRepo = dataSource.getRepository(HaEntity);
      const stateRepo = dataSource.getRepository(HaEntityState);

      // Create area
      const area = await areaRepo.save({
        areaId: 'living_room_test',
        name: 'Living Room Test',
      } as any);

      // Create device
      const device = await deviceRepo.save({
        deviceId: 'device_hierarchy',
        name: 'Test Device',
        areaId: (area as any).areaId,
      } as any);

      // Create entity
      const entity: any = await entityRepo.save({
        entityId: 'light.hierarchy_test',
        domain: HaEntityDomain.LIGHT,
        objectId: 'hierarchy_test',
        friendlyName: 'Hierarchy Test Light',
        deviceId: (device as any).deviceId,
        areaId: (area as any).areaId,
      } as any);

      // Create states
      await stateRepo.save([
        {
          entityId: (entity as any).entityId,
          state: 'off',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          entityId: (entity as any).entityId,
          state: 'on',
          timestamp: new Date('2024-01-01T11:00:00Z'),
        },
      ] as any);

      // Query with relations
      const entityWithRelations = await entityRepo.findOne({
        where: { entityId: 'light.hierarchy_test' },
        relations: ['states'],
      });
      expect(entityWithRelations?.states.length).toBe(2);

      // Verify entity exists
      const entityExists = await entityRepo.findOne({
        where: { entityId: 'light.hierarchy_test' },
      });
      expect(entityExists).toBeDefined();
    });

    it('should handle multiple entities per device', async () => {
      const deviceRepo = dataSource.getRepository(HaDevice);
      const entityRepo = dataSource.getRepository(HaEntity);

      // Create device
      const device = await deviceRepo.save({
        deviceId: 'multi_entity_device',
        name: 'Multi Sensor',
      } as any);

      // Create multiple entities for the same device
      await entityRepo.save([
        <Partial<HaEntity>>{
          entityId: 'sensor.temp',
          domain: 'sensor',
          objectId: 'temp',
          friendlyName: 'Temperature',
          deviceId: (device as any).deviceId,
          deviceClass: 'temperature',
        },
        <Partial<HaEntity>>{
          entityId: 'sensor.humidity',
          domain: 'sensor',
          objectId: 'humidity',
          friendlyName: 'Humidity',
          deviceId: (device as any).deviceId,
          deviceClass: 'humidity',
        },
        <Partial<HaEntity>>{
          entityId: 'sensor.pressure',
          domain: 'sensor',
          objectId: 'pressure',
          friendlyName: 'Pressure',
          deviceId: (device as any).deviceId,
          deviceClass: 'pressure',
        },
      ] as any);

      // Query entities by device
      const entities = await entityRepo.find({ where: { deviceId: (device as any).deviceId } });
      expect(entities.length).toBe(3);
    });
  });

  describe('Query Performance Tests', () => {
    it('should efficiently query entities by domain', async () => {
      const entityRepo = dataSource.getRepository(HaEntity);

      // Create test entities
      const entities = [];
      for (let i = 0; i < 20; i++) {
        entities.push({
          entityId: `light.test_${i}`,
          domain: HaEntityDomain.LIGHT,
          objectId: `test_${i}`,
          friendlyName: `Test Light ${i}`,
        });
      }

      for (let i = 0; i < 10; i++) {
        entities.push({
          entityId: `sensor.test_${i}`,
          domain: HaEntityDomain.SENSOR,
          objectId: `test_${i}`,
          friendlyName: `Test Sensor ${i}`,
        });
      }

      await entityRepo.save(entities as any);

      // Query by domain (should use index)
      const lights = await entityRepo.find({ where: { domain: HaEntityDomain.LIGHT } });
      expect(lights.length).toBe(20);

      const sensors = await entityRepo.find({ where: { domain: HaEntityDomain.SENSOR } });
      expect(sensors.length).toBe(10);
    });
  });
});
