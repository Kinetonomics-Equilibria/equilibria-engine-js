import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';

// Mantine's styles must be imported before the app's own stylesheet: both are
// plain CSS of the same specificity, so import order is what lets index.css
// override Mantine rather than the other way round.
import '@mantine/core/styles.css';

import { App } from './App';
import { theme } from './theme';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root is missing from index.html');

createRoot(rootElement).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            <App />
        </MantineProvider>
    </StrictMode>
);
