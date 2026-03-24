import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60000, retry: 1 }
  }
});

import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
    <QueryClientProvider client={queryClient}>
      <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#14141f',
          color: '#e8e8f0',
          border: '1px solid #2a2a45',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          borderRadius: '10px'
        },
        success: { iconTheme: { primary: '#22c55e', secondary: '#14141f' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#14141f' } }
      }}
    />
    </QueryClientProvider>
  </GoogleOAuthProvider>
);
