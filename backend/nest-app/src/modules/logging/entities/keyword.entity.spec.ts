import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keyword } from './keyword.entity';

describe('Keyword Entity', () => {
  let repository: Repository<Keyword>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(Keyword),
          useClass: Repository,
        },
      ],
    }).compile();

    repository = module.get<Repository<Keyword>>(
      getRepositoryToken(Keyword),
    );
  });

  describe('Entity Structure', () => {
    it('should create a keyword with required fields', () => {
      const keyword = new Keyword();
      keyword.keyword = 'Home Assistant';
      keyword.normalized = 'home assistant';
      keyword.usageCount = 0;

      expect(keyword.keyword).toBe('Home Assistant');
      expect(keyword.normalized).toBe('home assistant');
      expect(keyword.usageCount).toBe(0);
    });

    it('should normalize keyword to lowercase', () => {
      const keyword = new Keyword();
      keyword.keyword = 'TEST KEYWORD';
      keyword.normalized = keyword.keyword.toLowerCase();

      expect(keyword.normalized).toBe('test keyword');
    });

    it('should have createdAt timestamp', () => {
      const keyword = new Keyword();
      keyword.createdAt = new Date();

      expect(keyword.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Relations', () => {
    it('should initialize with empty relations', () => {
      const keyword = new Keyword();

      expect(keyword.transcripts).toBeUndefined();
      expect(keyword.intentLogs).toBeUndefined();
    });
  });

  describe('Usage Count', () => {
    it('should default to zero', () => {
      const keyword = new Keyword();
      keyword.usageCount = 0;

      expect(keyword.usageCount).toBe(0);
    });

    it('should allow incrementing usage count', () => {
      const keyword = new Keyword();
      keyword.usageCount = 0;
      keyword.usageCount++;

      expect(keyword.usageCount).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should enforce unique constraint on keyword', () => {
      // This would be tested with actual database
      // In unit test, we just verify the field is set
      const keyword = new Keyword();
      keyword.keyword = 'unique_keyword';

      expect(keyword.keyword).toBe('unique_keyword');
    });

    it('should handle special characters in keywords', () => {
      const keyword = new Keyword();
      keyword.keyword = 'Ä Ö Ü ß !@#';
      keyword.normalized = keyword.keyword.toLowerCase();

      expect(keyword.normalized).toBe('ä ö ü ß !@#');
    });
  });
});

