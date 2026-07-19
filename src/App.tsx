import { Route, Routes } from 'react-router-dom';
import AppLayout from './pages/AppLayout';
import LandingPage from './pages/LandingPage';
import CityPage from './pages/CityPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="city/:placeId" element={<CityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
