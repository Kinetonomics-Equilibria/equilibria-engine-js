// Mantine's PostCSS preset: it implements the `light-dark()` / `rem()` / `em()`
// functions and the `@mixin` rules that Mantine's own styles and the docs'
// examples are written against, so `.module.css` files here can use them.
//
// postcss-simple-vars supplies the `$mantine-breakpoint-*` variables used in
// media queries. The values are Mantine's defaults — keep them in step with
// `theme.breakpoints` in src/theme.ts if that is ever customised.
//
// This file also stops PostCSS's config search from walking up out of the repo
// and picking up an unrelated config in a parent directory.
export default {
    plugins: {
        'postcss-preset-mantine': {},
        'postcss-simple-vars': {
            variables: {
                'mantine-breakpoint-xs': '36em',
                'mantine-breakpoint-sm': '48em',
                'mantine-breakpoint-md': '62em',
                'mantine-breakpoint-lg': '75em',
                'mantine-breakpoint-xl': '88em'
            }
        }
    }
};
