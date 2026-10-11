import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  image: {
    // Default (sharp) image service. Raise the input-pixel ceiling so large
    // camera originals (e.g. 6000x4000) aren't rejected during optimization.
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: 268402689, // ~16384^2; comfortably above full-frame RAW exports
      },
    },
  },
});
