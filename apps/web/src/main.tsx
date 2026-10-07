import { createToneAudioEngine } from '@dotproducer/audio';
import { createPixiScene } from '@dotproducer/scene';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { applyTokens, tokens } from './tokens';

// The composition root: the only place that knows the concrete audio engine and scene.
applyTokens(document.documentElement);
const audio = createToneAudioEngine();
const scene = createPixiScene(tokens);
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App audio={audio} scene={scene} />
  </StrictMode>,
);
