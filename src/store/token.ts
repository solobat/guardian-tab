import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Token } from '../types/token'

interface TokenState {
  tokens: Token[]
  loading: boolean
  editingToken: Token | null
  addToken: (token: Token) => void
  removeToken: (id: string) => void
  updateToken: (id: string, updates: Partial<Token>) => void
  fetchTokens: () => Promise<void>
  setEditingToken: (token: Token | null) => void
  reorderTokens: (fromIndex: number, toIndex: number) => void
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      tokens: [],
      loading: false,
      editingToken: null,
      
      addToken: (token) => {
        set((state) => ({
          tokens: [...state.tokens, { ...token, id: Date.now().toString() }],
        }))
      },
      
      removeToken: (id) => {
        set((state) => ({
          tokens: state.tokens.filter((token) => token.id !== id),
        }))
      },
      
      updateToken: (id, updates) => {
        set((state) => ({
          tokens: state.tokens.map((token) =>
            token.id === id ? { ...token, ...updates } : token
          ),
          editingToken: null,
        }))
      },
      
      fetchTokens: async () => {
        set({ loading: true })
        // 这里可以添加从API获取默认token的逻辑
        // 如果是第一次使用，可以添加一些默认的token
        const { tokens } = get()
        if (tokens.length === 0) {
          set({
            tokens: [
              { id: '1', name: 'Bitcoin', symbol: 'BTC', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
              { id: '2', name: 'Ethereum', symbol: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
              { id: '3', name: 'Solana', symbol: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
              { id: '4', name: 'Dogecoin', symbol: 'DOGE', icon: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
            ],
          })
        }
        set({ loading: false })
      },
      
      setEditingToken: (token) => {
        set({ editingToken: token })
      },
      
      reorderTokens: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newTokens = [...state.tokens]
          const [movedToken] = newTokens.splice(fromIndex, 1)
          newTokens.splice(toIndex, 0, movedToken)
          return { tokens: newTokens }
        })
      },
    }),
    {
      name: 'token-storage',
    }
  )
) 