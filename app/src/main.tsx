import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App'
import Week from './views/Week'
import Day from './views/Day'
import Ingredients from './views/Ingredients'
import Prep from './views/Prep'
import Recipes from './views/Recipes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/week" replace />} />
          <Route path="/week" element={<Week />} />
          <Route path="/day" element={<Day />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/prep" element={<Prep />} />
          <Route path="/recipes" element={<Recipes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
