import { BadRequestException } from '@nestjs/common';
import { Currency } from '../enums/currency.enum';

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }

  return value.trim();
}

export function requireEmail(value: unknown): string {
  const email = requireString(value, 'email').toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('email must be valid');
  }

  return email;
}

export function requirePositiveAmount(value: unknown, field = 'amount'): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException(`${field} must be a positive number`);
  }

  return amount;
}

export function requireCurrency(value: unknown, field: string): Currency {
  const currency = requireString(value, field).toUpperCase() as Currency;

  if (!Object.values(Currency).includes(currency)) {
    throw new BadRequestException(`${field} must be one of ${Object.values(Currency).join(', ')}`);
  }

  return currency;
}

export function requireInteger(value: unknown, field: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }

  return parsed;
}

export function requireUuid(value: unknown, field: string): string {
  const parsed = requireString(value, field);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      parsed,
    )
  ) {
    throw new BadRequestException(`${field} must be a valid UUID`);
  }

  return parsed;
}
