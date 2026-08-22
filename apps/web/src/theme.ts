import { createTheme } from '@mantine/core';

// The app's Mantine theme. Everything visual that is a *decision* rather than a
// one-off belongs here, not in inline styles: components read these values
// through CSS variables (`--mantine-color-*`, `--mantine-font-family`, …), so
// changing a token here changes the whole app.
//
// Kept deliberately small for now. `createTheme` merges over Mantine's default
// theme, so an empty override is a valid starting point and each addition is a
// considered one.
export const theme = createTheme({
    // Matches the font stack the app used before Mantine, so typography does
    // not shift; Mantine now owns it for every component.
    fontFamily:
        "system-ui, -apple-system, 'Segoe UI', sans-serif",

    // Used by `color="primary"` and by any component that does not name a
    // colour. Mantine's own default is `blue`; naming it explicitly means the
    // palette can be swapped in one place later.
    primaryColor: 'blue'
});
