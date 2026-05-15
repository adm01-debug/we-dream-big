# Performance Optimization

## Frontend
- Code splitting with React.lazy()
- Image optimization (WebP)
- Implement virtual scrolling
- Use React Query for caching

## Backend
- Database indexing
- Redis caching layer
- CDN for static assets
- Compression enabled

## Monitoring
- Lighthouse CI score > 95
- Core Web Vitals: rastreamento e dashboard agora cobertos por sistema externo (não há mais dashboard interno em `/admin/performance` nem coleta via `web-vitals` no app).
- Error rate < 0.1%

## Targets (Google Core Web Vitals — official thresholds)
| Metric | Good | Needs Improv. | Poor |
|--------|------|---------------|------|
| LCP    | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP    | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB   | ≤ 800ms | ≤ 1800ms | > 1800ms |

