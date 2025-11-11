/**
 * Unit tests for Claude usage tracking service layer
 *
 * Tests focus on cost calculation logic with various token combinations
 * and pricing scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateCost } from '../lib/claude-usage-tracker.js';
import * as claudeUsageRepo from '../lib/db/repositories/claude-usage.js';

// Mock the repository layer
vi.mock('../lib/db/repositories/claude-usage.js', () => ({
  getModelPricing: vi.fn()
}));

describe('Cost Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Input/Output Token Pricing', () => {
    it('should calculate cost for Sonnet 4 with only input/output tokens', async () => {
      // Mock pricing data for Sonnet 4
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 1M input tokens = $3.00
      // 1M output tokens = $15.00
      // Total = $18.00
      const cost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 1_000_000, 0, 0);

      expect(cost).toBeCloseTo(18.0, 2);
      expect(claudeUsageRepo.getModelPricing).toHaveBeenCalledWith('claude-sonnet-4-20250514', undefined);
    });

    it('should calculate cost for small token counts accurately', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 500 input tokens = (500 / 1,000,000) * $3.00 = $0.0015
      // 1000 output tokens = (1000 / 1,000,000) * $15.00 = $0.015
      // Total = $0.0165
      const cost = await calculateCost('claude-sonnet-4-20250514', 500, 1000, 0, 0);

      expect(cost).toBeCloseTo(0.0165, 4);
    });
  });

  describe('Haiku Model Pricing', () => {
    it('should calculate cost for cheaper Haiku model', async () => {
      // Mock pricing data for Haiku (cheaper model)
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '2',
        model_name: 'claude-haiku-3-20240307',
        input_token_price_per_million: 0.25,
        output_token_price_per_million: 1.25,
        cache_write_token_price_per_million: 0.3,
        cache_read_token_price_per_million: 0.03,
        effective_from: new Date('2024-03-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 1M input tokens = $0.25
      // 1M output tokens = $1.25
      // Total = $1.50
      const cost = await calculateCost('claude-haiku-3-20240307', 1_000_000, 1_000_000, 0, 0);

      expect(cost).toBeCloseTo(1.5, 2);
    });
  });

  describe('Cache Write Token Pricing', () => {
    it('should calculate cost with cache write tokens (25% premium)', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 1M input tokens = $3.00
      // 1M output tokens = $15.00
      // 500K cache write tokens = (500,000 / 1,000,000) * $3.75 = $1.875
      // Total = $19.875
      const cost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 1_000_000, 500_000, 0);

      expect(cost).toBeCloseTo(19.875, 3);
    });

    it('should verify cache write is 25% more expensive than regular input', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // Cache write should be 1.25x the input price
      const inputCost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 0, 0, 0);
      const cacheWriteCost = await calculateCost('claude-sonnet-4-20250514', 0, 0, 1_000_000, 0);

      expect(cacheWriteCost).toBeCloseTo(inputCost * 1.25, 2);
    });
  });

  describe('Cache Read Token Pricing', () => {
    it('should calculate cost with cache read tokens (90% discount)', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 1M input tokens = $3.00
      // 1M output tokens = $15.00
      // 2M cache read tokens = (2,000,000 / 1,000,000) * $0.30 = $0.60
      // Total = $18.60
      const cost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 1_000_000, 0, 2_000_000);

      expect(cost).toBeCloseTo(18.6, 2);
    });

    it('should verify cache read is 90% cheaper than regular input', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // Cache read should be 0.1x the input price (10% of original)
      const inputCost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 0, 0, 0);
      const cacheReadCost = await calculateCost('claude-sonnet-4-20250514', 0, 0, 0, 1_000_000);

      expect(cacheReadCost).toBeCloseTo(inputCost * 0.1, 2);
    });
  });

  describe('Mixed Cache Usage', () => {
    it('should calculate cost with combination of all token types', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 500K input tokens = (500,000 / 1,000,000) * $3.00 = $1.50
      // 1M output tokens = (1,000,000 / 1,000,000) * $15.00 = $15.00
      // 250K cache write = (250,000 / 1,000,000) * $3.75 = $0.9375
      // 3M cache read = (3,000,000 / 1,000,000) * $0.30 = $0.90
      // Total = $18.3375
      const cost = await calculateCost('claude-sonnet-4-20250514', 500_000, 1_000_000, 250_000, 3_000_000);

      expect(cost).toBeCloseTo(18.3375, 4);
    });

    it('should handle realistic conversation with heavy cache usage', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // Realistic long conversation:
      // 5K input (new user message) = $0.015
      // 2K output (assistant response) = $0.030
      // 50K cache read (conversation history) = $0.015
      // Total = $0.060
      const cost = await calculateCost('claude-sonnet-4-20250514', 5_000, 2_000, 0, 50_000);

      expect(cost).toBeCloseTo(0.06, 3);
    });
  });

  describe('Fallback Pricing', () => {
    it('should use default Sonnet 4 pricing when model not found', async () => {
      // Mock returns null (model not in database)
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue(null);

      // Should use fallback: input=$3, output=$15, cache_write=$3.75, cache_read=$0.30
      // 1M input = $3.00
      // 1M output = $15.00
      // Total = $18.00
      const cost = await calculateCost('unknown-model-xyz', 1_000_000, 1_000_000, 0, 0);

      expect(cost).toBeCloseTo(18.0, 2);
    });

    it('should use fallback pricing on database error', async () => {
      // Mock throws error
      vi.mocked(claudeUsageRepo.getModelPricing).mockRejectedValue(new Error('Database connection failed'));

      // Should catch error and use fallback pricing
      const cost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 1_000_000, 0, 0);

      expect(cost).toBeCloseTo(18.0, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tokens', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      const cost = await calculateCost('claude-sonnet-4-20250514', 0, 0, 0, 0);

      expect(cost).toBe(0);
    });

    it('should handle very large token counts', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 10M input tokens = $30.00
      // 10M output tokens = $150.00
      // Total = $180.00
      const cost = await calculateCost('claude-sonnet-4-20250514', 10_000_000, 10_000_000, 0, 0);

      expect(cost).toBeCloseTo(180.0, 2);
    });

    it('should handle single token precision', async () => {
      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 3.0,
        output_token_price_per_million: 15.0,
        cache_write_token_price_per_million: 3.75,
        cache_read_token_price_per_million: 0.3,
        effective_from: new Date('2025-01-01'),
        effective_until: null,
        notes: null,
        created_at: new Date()
      });

      // 1 input token = (1 / 1,000,000) * $3.00 = $0.000003
      // 1 output token = (1 / 1,000,000) * $15.00 = $0.000015
      // Total = $0.000018
      const cost = await calculateCost('claude-sonnet-4-20250514', 1, 1, 0, 0);

      expect(cost).toBeCloseTo(0.000018, 6);
    });
  });

  describe('Effective Date Pricing', () => {
    it('should use pricing effective for a specific date', async () => {
      const specificDate = new Date('2024-12-15');

      vi.mocked(claudeUsageRepo.getModelPricing).mockResolvedValue({
        id: '1',
        model_name: 'claude-sonnet-4-20250514',
        input_token_price_per_million: 2.5, // Old pricing
        output_token_price_per_million: 12.5,
        cache_write_token_price_per_million: 3.0,
        cache_read_token_price_per_million: 0.25,
        effective_from: new Date('2024-01-01'),
        effective_until: new Date('2024-12-31'),
        notes: 'Old pricing',
        created_at: new Date()
      });

      const cost = await calculateCost('claude-sonnet-4-20250514', 1_000_000, 1_000_000, 0, 0, specificDate);

      // Old pricing: $2.5 + $12.5 = $15.00
      expect(cost).toBeCloseTo(15.0, 2);
      expect(claudeUsageRepo.getModelPricing).toHaveBeenCalledWith('claude-sonnet-4-20250514', specificDate);
    });
  });
});
