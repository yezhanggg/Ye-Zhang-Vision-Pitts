import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { readHash, startHashSync } from './lib/hash';

readHash();
startHashSync();

createRoot(document.getElementById('root')!).render(<App />);
