import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { CallPage } from '@/pages/CallPage';
import { CallResultPage } from '@/pages/CallResultPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/call/:sessionId" element={<CallPage />} />
      <Route path="/call/:sessionId/result" element={<CallResultPage />} />
    </Routes>
  );
}
