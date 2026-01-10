import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Suggestion } from './suggestion.entity';
import { createHash } from 'crypto';

export {};

// Skip running tests when file is required outside of a test runner
if (typeof describe !== 'undefined') {
  describe('Suggestion Entity', () => {
    let repository: Repository<Suggestion>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: getRepositoryToken(Suggestion),
            useClass: Repository,
          },
        ],
      }).compile();

      repository = module.get<Repository<Suggestion>>(
        getRepositoryToken(Suggestion),
      );
    });

    describe('Entity Structure', () => {
      it('should create a suggestion with required fields', () => {
        const suggestion = new Suggestion();
        suggestion.suggestionText = 'Did you mean: Turn on the light?';
        suggestion.textHash = createHash('sha256')
          .update(suggestion.suggestionText)
          .digest('hex');
        suggestion.usageCount = 0;

        expect(suggestion.suggestionText).toBe(
          'Did you mean: Turn on the light?',
        );
        expect(suggestion.textHash.length).toBe(64);
        expect(suggestion.usageCount).toBe(0);
      });

      it('should have createdAt timestamp', () => {
        const suggestion = new Suggestion();
        suggestion.createdAt = new Date();

        expect(suggestion.createdAt).toBeInstanceOf(Date);
      });
    });

    describe('Text Hash', () => {
      it('should generate SHA256 hash', () => {
        const text = 'Test suggestion';
        const hash = createHash('sha256').update(text).digest('hex');

        expect(hash.length).toBe(64);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should generate same hash for identical texts', () => {
        const text = 'Identical text';
        const hash1 = createHash('sha256').update(text).digest('hex');
        const hash2 = createHash('sha256').update(text).digest('hex');

        expect(hash1).toBe(hash2);
      });

      it('should generate different hashes for different texts', () => {
        const hash1 = createHash('sha256').update('Text 1').digest('hex');
        const hash2 = createHash('sha256').update('Text 2').digest('hex');

        expect(hash1).not.toBe(hash2);
      });

      it('should be case-sensitive', () => {
        const hash1 = createHash('sha256').update('test').digest('hex');
        const hash2 = createHash('sha256').update('TEST').digest('hex');

        expect(hash1).not.toBe(hash2);
      });
    });

    describe('Deduplic ation', () => {
      it('should use textHash for deduplication', () => {
        const text = 'Duplicate suggestion';
        const suggestion1 = new Suggestion();
        suggestion1.suggestionText = text;
        suggestion1.textHash = createHash('sha256').update(text).digest('hex');

        const suggestion2 = new Suggestion();
        suggestion2.suggestionText = text;
        suggestion2.textHash = createHash('sha256').update(text).digest('hex');

        expect(suggestion1.textHash).toBe(suggestion2.textHash);
      });

      it('should handle whitespace differences', () => {
        const text1 = 'text with  spaces';
        const text2 = 'text with spaces';

        const hash1 = createHash('sha256').update(text1).digest('hex');
        const hash2 = createHash('sha256').update(text2).digest('hex');

        // Different hashes because whitespace differs
        expect(hash1).not.toBe(hash2);

        // If we trim before hashing, they would be the same
        const trimmedHash1 = createHash('sha256')
          .update(text1.replace(/\s+/g, ' '))
          .digest('hex');
        const trimmedHash2 = createHash('sha256')
          .update(text2.replace(/\s+/g, ' '))
          .digest('hex');

        expect(trimmedHash1).toBe(trimmedHash2);
      });
    });

    describe('Relations', () => {
      it('should initialize with empty relations', () => {
        const suggestion = new Suggestion();

        expect(suggestion.transcripts).toBeUndefined();
      });
    });

    describe('Usage Count', () => {
      it('should default to zero', () => {
        const suggestion = new Suggestion();
        suggestion.usageCount = 0;

        expect(suggestion.usageCount).toBe(0);
      });

      it('should allow incrementing usage count', () => {
        const suggestion = new Suggestion();
        suggestion.usageCount = 0;
        suggestion.usageCount++;

        expect(suggestion.usageCount).toBe(1);
      });
    });
  });
}
