import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'customers/:customerId', renderMode: RenderMode.Server },
  { path: 'customers/update/:customerId', renderMode: RenderMode.Server },
  { path: 'products/:productId', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Prerender },
];
