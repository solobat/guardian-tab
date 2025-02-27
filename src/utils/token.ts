/**
 * 判断两个 token 是否匹配
 * 规则：
 * 1. 忽略大小写
 * 2. 忽略 'k'(kilo) 和 'm'(milli) 前缀（仅限开头）
 * 3. 忽略特定数字后缀 (1000 或 1000000)
 * 例如: SHIB == kSHIB === mSHIB === SHIB1000 == SHIB1000000 == shib
 */
export function isTokenMatch(token1: string, token2: string): boolean {
  // 先进行直接比较
  if (token1.toUpperCase() === token2.toUpperCase()) {
    return true;
  }

  // 如果直接比较不相等，则进行标准化比较
  const normalizeToken = (token: string): string => {
    // 只移除开头的 'k' 和 'm' 前缀
    const withoutPrefix = token.toUpperCase().trim().replace(/^[KM](?=[A-Z])/, '');
    // 只移除 1000 或 1000000 后缀
    return withoutPrefix.replace(/(1000000|1000)$/, '');
  };

  return normalizeToken(token1) === normalizeToken(token2);
}

// 使用示例：
/*
console.log(isTokenMatch('SHIB', 'SHIB')); // true（直接匹配）
console.log(isTokenMatch('SHIB', 'kSHIB')); // true（标准化后匹配）
console.log(isTokenMatch('KMTOKEN', 'KMTOKEN')); // true（直接匹配）
console.log(isTokenMatch('SHIB1000', 'kSHIB')); // true（标准化后匹配）
*/
