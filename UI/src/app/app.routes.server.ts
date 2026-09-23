import { RenderMode, ServerRoute } from '@angular/ssr';

// Routes with an id in the path can't be prerendered at build time (there's no list of
// ids to render), so they render per request; everything else is prerendered as before.
export const serverRoutes: ServerRoute[] = [
  { path: 'customers/:customerId', renderMode: RenderMode.Server },
  { path: 'customers/update/:customerId', renderMode: RenderMode.Server },
  { path: 'products/:productId', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Prerender },
];
