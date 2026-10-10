import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApplicationProvider } from './context';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ApplicationProvider>
        <App />
      </ApplicationProvider>
    </BrowserRouter>
  </StrictMode>,
);
