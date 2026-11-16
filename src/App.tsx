import { createContext, useContext } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { Layout } from './components/Layout'
import { GarmentsProvider } from './lib/garments'
import { type ThemePref, useTheme } from './lib/theme'
import AddGarments from './pages/AddGarments'
import Closet from './pages/Closet'
import { Calendar, Outfits } from './pages/Placeholders'
import Profile from './pages/Profile'

const ThemeCtx = createContext<readonly [ThemePref, (t: ThemePref) => void]>(['system', () => {}])
export const useThemePref = () => useContext(ThemeCtx)

export default function App() {
  const theme = useTheme()
  return (
    <ThemeCtx.Provider value={theme}>
      <AuthGate>
        <GarmentsProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Closet />} />
                <Route path="outfits" element={<Outfits />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route path="add" element={<AddGarments />} />
            </Routes>
          </HashRouter>
        </GarmentsProvider>
      </AuthGate>
    </ThemeCtx.Provider>
  )
}
