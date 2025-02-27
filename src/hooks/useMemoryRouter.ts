import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Route =
  | 'dashboard'
  | 'positions'
  | 'position-detail'
  | 'position-edit'
  | 'platforms'
  | 'accounts'
  | 'markets'
  | 'lp-positions'
  | 'lp-detail'
  | 'lp-new'
  | 'token-detail'
  | 'funding-rates'

interface RouterState {
  route: Route
  params: Record<string, string>
  navigate: (route: Route, params?: Record<string, string>) => void
}

const useRouterStore = create<RouterState>()(
  persist(
    (set) => ({
      route: 'dashboard',
      params: {},
      navigate: (route, params = {}) => {
        set({ route, params })
      },
    }),
    {
      name: 'router-storage',
    },
  ),
)

export const useMemoryRouter = () => {
  const { route, params, navigate } = useRouterStore()

  return {
    currentRoute: route,
    params,
    navigate,
  }
}
