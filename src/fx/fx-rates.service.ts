import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency } from '../common/enums/currency.enum';
import { requireCurrency, requireString } from '../common/utils/validation';

type RateCacheRecord = {
  fetchedAt: number;
  rates: Record<string, number>;
};

@Injectable()
export class FxRatesService {
  private readonly logger = new Logger(FxRatesService.name);
  private readonly cache = new Map<Currency, RateCacheRecord>();
  private readonly ttlMs: number;
  private readonly fallbackRates: Record<Currency, Record<Currency, number>> = {
    [Currency.NGN]: {
      [Currency.NGN]: 1,
      [Currency.USD]: 0.00064,
      [Currency.EUR]: 0.00059,
      [Currency.GBP]: 0.0005,
    },
    [Currency.USD]: {
      [Currency.NGN]: 1560,
      [Currency.USD]: 1,
      [Currency.EUR]: 0.92,
      [Currency.GBP]: 0.78,
    },
    [Currency.EUR]: {
      [Currency.NGN]: 1695,
      [Currency.USD]: 1.09,
      [Currency.EUR]: 1,
      [Currency.GBP]: 0.85,
    },
    [Currency.GBP]: {
      [Currency.NGN]: 1990,
      [Currency.USD]: 1.28,
      [Currency.EUR]: 1.17,
      [Currency.GBP]: 1,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = Number(this.configService.get('FX_CACHE_TTL_MS') ?? 300000);
  }

  async getRate(fromCurrencyInput: unknown, toCurrencyInput: unknown): Promise<number> {
    const fromCurrency = requireCurrency(fromCurrencyInput, 'fromCurrency');
    const toCurrency = requireCurrency(toCurrencyInput, 'toCurrency');

    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rates = await this.getRatesForBase(fromCurrency);
    const rate = rates[toCurrency];

    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      throw new ServiceUnavailableException(
        `FX rate for ${fromCurrency}/${toCurrency} is currently unavailable`,
      );
    }

    return rate;
  }

  async getRates(baseCurrencyInput: unknown, symbolsInput?: unknown) {
    const baseCurrency = requireCurrency(baseCurrencyInput, 'base');
    const rates = await this.getRatesForBase(baseCurrency);
    const symbols =
      typeof symbolsInput === 'string'
        ? symbolsInput
            .split(',')
            .map((symbol) => requireString(symbol, 'symbols').toUpperCase())
        : [];

    if (symbols.length === 0) {
      return {
        base: baseCurrency,
        fetchedAt: new Date(this.cache.get(baseCurrency)?.fetchedAt ?? Date.now()),
        rates,
      };
    }

    const filtered = symbols.reduce<Record<string, number>>((accumulator, symbol) => {
      if (rates[symbol] !== undefined) {
        accumulator[symbol] = rates[symbol];
      }
      return accumulator;
    }, {});

    return {
      base: baseCurrency,
      fetchedAt: new Date(this.cache.get(baseCurrency)?.fetchedAt ?? Date.now()),
      rates: filtered,
    };
  }

  private async getRatesForBase(baseCurrency: Currency): Promise<Record<string, number>> {
    const cached = this.cache.get(baseCurrency);
    if (cached && Date.now() - cached.fetchedAt < this.ttlMs) {
      return cached.rates;
    }

    try {
      const fetchedRates = await this.fetchRates(baseCurrency);
      this.cache.set(baseCurrency, {
        fetchedAt: Date.now(),
        rates: fetchedRates,
      });
      return fetchedRates;
    } catch (error) {
      if (cached) {
        this.logger.warn(`Using stale FX cache for ${baseCurrency}: ${(error as Error).message}`);
        return cached.rates;
      }

      this.logger.warn(`Using fallback FX rates for ${baseCurrency}: ${(error as Error).message}`);
      return this.fallbackRates[baseCurrency];
    }
  }

  private async fetchRates(baseCurrency: Currency): Promise<Record<string, number>> {
    const baseUrl =
      this.configService.get<string>('FX_API_URL') ?? 'https://open.er-api.com/v6/latest';
    const response = await fetch(`${baseUrl}/${baseCurrency}`);

    if (!response.ok) {
      throw new Error(`FX API returned ${response.status}`);
    }

    const payload = (await response.json()) as { rates?: Record<string, number> };
    if (!payload.rates) {
      throw new Error('FX API returned an invalid payload');
    }

    return payload.rates;
  }
}
