# Testing Guide

## Running Tests

Unit tests:
```bash
npm test
```

E2E tests:
```bash
npm run test:e2e
```

Coverage:
```bash
npm run test:coverage
```

## Test Structure
- `tests/hooks/` - Hook tests
- `tests/components/` - Component tests
- `tests/services/` - Service tests
- `tests/e2e/` - End-to-end tests

## Writing Tests
Always include:
- Setup/teardown
- Edge cases
- Error handling
- Accessibility checks
