import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HeroUIProvider>
        <div className="w-screen h-screen p-8 flex items-start justify-center">
          <App />
        </div>
      </HeroUIProvider>
    </React.StrictMode>
  );
}
