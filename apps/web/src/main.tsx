import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';

// Mantine's styles must be imported before the app's own stylesheet: both are
// plain CSS of the same specificity, so import order is what lets index.css
// override Mantine rather than the other way round.
import '@mantine/core/styles.css';

import { App } from './App';
import { Embed } from './Embed';
import { readEmbed } from './links';
import { theme } from './theme';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root is missing from index.html');

// An address under `embed/` is a page in another site's page (`Embed`), with
// no rail and nothing written to the address; any other is the app's own.
const embedded = readEmbed(window.location, import.meta.env.BASE_URL);

createRoot(rootElement).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            {embedded ? <Embed {...embedded} /> : <App />}
        </MantineProvider>
    </StrictMode>
);
