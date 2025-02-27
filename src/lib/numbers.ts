import { BigNumberish, ethers } from "ethers";

export function expandDecimals(n: BigNumberish, decimals: number): bigint {
  return BigInt(n) * 10n ** BigInt(decimals);
}

const PRECISION_DECIMALS = 30;
export const PRECISION = expandDecimals(1, PRECISION_DECIMALS);

export function applyFactor(value: bigint, factor: bigint) {
  return (value * factor) / PRECISION;
}