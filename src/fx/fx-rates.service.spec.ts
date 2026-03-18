import { ConfigService } from '@nestjs/config';
import { FxRatesService } from './fx-rates.service';

describe('FxRatesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns cached or fetched rate values', async () => {
    const service = new FxRatesService(
      new ConfigService({
        FX_CACHE_TTL_MS: 300000,
        FX_API_URL: 'https://example.test/latest',
      }),
    );

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        rates: {
          USD: 0.5,
          NGN: 1,
        },
      }),
    } as Response);

    await expect(service.getRate('NGN', 'USD')).resolves.toBe(0.5);
  });

  it('falls back to built-in rates when fetch fails', async () => {
    const service = new FxRatesService(new ConfigService());
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(service.getRate('EUR', 'NGN')).resolves.toBe(1695);
  });
});
