import axios from 'axios'

// 使用 CoinGecko API 获取 token 价格
export const fetchTokenPrice = async (symbol: string) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${symbol.toLowerCase()}&order=market_cap_desc&per_page=1&page=1&sparkline=false`
    )
    
    if (response.data && response.data.length > 0) {
      return response.data[0]
    }
    
    // 如果没有找到精确匹配，尝试搜索
    const searchResponse = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${symbol}`
    )
    
    if (searchResponse.data && searchResponse.data.coins && searchResponse.data.coins.length > 0) {
      const coinId = searchResponse.data.coins[0].id
      const coinResponse = await axios.get(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false`
      )
      
      if (coinResponse.data && coinResponse.data.length > 0) {
        return coinResponse.data[0]
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching token price:', error)
    return null
  }
} 