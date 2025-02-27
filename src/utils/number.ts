/**
 * 格式化数字，处理精度问题
 * @param num 需要格式化的数字
 * @param decimals 保留的小数位数，默认为4
 * @returns 格式化后的数字
 */
export const formatNumber = (num: number, decimals: number = 4): number => {
  return Number(Number(num).toFixed(decimals))
}

/**
 * 格式化数字为字符串，用于显示
 * @param num 需要格式化的数字
 * @param decimals 保留的小数位数，默认为4
 * @returns 格式化后的字符串
 */
export const formatNumberString = (num: number, decimals: number = 4): string => {
  return Number(num).toFixed(decimals)
} 