import { BrowserRouter } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AppRoutes } from './routes';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Header />
        <main className="flex-1">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
