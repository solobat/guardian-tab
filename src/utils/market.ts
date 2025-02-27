
const PlatformsMap: Record<string, string> = {
  raydium: 'orderly',
  woofi: 'orderly',
}

export const getRealPlatform = (platform: string) => {
  return PlatformsMap[platform.toLowerCase()] || platform
}
