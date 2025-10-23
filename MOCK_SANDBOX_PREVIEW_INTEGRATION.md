# Mock Sandbox Preview Integration - Implementation Summary

## Overview

Successfully integrated Mock Sandbox Core into the UI/UX Agent Platform to provide automatic preview with mock backend. When a user opens a React project, the system automatically discovers API calls, generates realistic mock data, and runs the app in an isolated Docker sandbox.

## What Was Built

### 1. Preview Service (`apps/web/src/lib/preview-service.ts`)

Singleton service that manages the preview lifecycle:

```typescript
export class PreviewService {
  async startPreview(projectPath: string): Promise<{ url: string; mockUrl: string }>
  async stopPreview(): Promise<void>
  isRunning(): boolean
  getUrls(): { url: string; mockUrl: string } | null
}
```

**Features:**
- Wraps Mock Sandbox Core's `runAll` function
- Manages Docker sandbox lifecycle
- Provides URLs for app and mock server
- Handles cleanup automatically

### 2. Preview API Route (`apps/web/src/app/api/preview/route.ts`)

Next.js API endpoint for preview control:

**Actions:**
- `start`: Start preview with mocks for a project path
- `stop`: Stop the current preview
- `status`: Get current preview status

**Error Handling:**
- Validates project path
- Returns detailed error messages
- Handles service failures gracefully

### 3. UI Integration (`apps/web/src/app/page.tsx`)

Updated main page with preview integration:

**State Management:**
- `previewUrl`: Current preview URL (from sandbox)
- `previewLoading`: Loading state during startup
- `previewError`: Error message if preview fails

**User Flow:**
1. User enters project path
2. Clicks "Open Project"
3. Preview service starts (with loading indicator)
4. Preview iframe displays running app with mocks
5. User can close project (stops preview automatically)

**UI States:**
- **Loading**: Spinner with "Starting preview with mocks..." message
- **Error**: Error message with retry button
- **Running**: Iframe displaying the app

**Cleanup:**
- Stops preview on project close
- Stops preview on component unmount
- Clears state properly

## Integration Flow

```
User Opens Project
       ↓
handleOpenProject()
       ↓
POST /api/preview { action: "start", projectPath: "..." }
       ↓
PreviewService.startPreview()
       ↓
runAll() from Mock Sandbox Core
       ↓
┌─────────────────────────────────┐
│ 1. Detect project (Vite/Next.js)│
│ 2. Discover API calls           │
│ 3. Synthesize mocks via DMR     │
│ 4. Generate Express mock server │
│ 5. Start Docker Compose         │
└─────────────────────────────────┘
       ↓
Returns { appUrl, mockUrl }
       ↓
Update iframe src to appUrl
       ↓
User sees app running with mocks!
```

## Technical Details

### Dependencies

Added to `apps/web/package.json`:
```json
{
  "dependencies": {
    "@the-artik-tao/mock-sandbox-core": "workspace:*"
  }
}
```

### Configuration

Preview service uses:
- **DMR Model**: `ai/smollm2` (configurable)
- **DMR URL**: `http://localhost:12434` (Docker Model Runner)
- **App Port**: `5173` (Vite dev server)
- **Mock Port**: `9000` (Express mock server)
- **Provider**: `docker` (isolated sandbox)

### Error Scenarios

1. **Docker Model Runner unavailable**
   - Shows error: "Failed to start preview"
   - Suggests starting DMR
   - Provides retry button

2. **Project detection fails**
   - Shows error with project requirements
   - User can try different project

3. **Sandbox fails to start**
   - Shows detailed error message
   - Offers retry option

4. **Preview crashes**
   - Error state displayed
   - Can restart preview

## Testing Strategy

### Manual Testing

1. ✅ Test with `examples/demo-app` (no API calls)
   - Should start preview without mocks
   - App should display correctly

2. ✅ Test with `examples/todo-app` (has API calls)
   - Should discover API endpoints
   - Should generate mocks
   - App should display with mock data

3. ✅ Test start/stop lifecycle
   - Open project → preview starts
   - Close project → preview stops
   - Open different project → old preview stops, new starts

4. ✅ Test error handling
   - Invalid project path → error displayed
   - DMR not running → error with instructions
   - Retry button works

5. ✅ Test cleanup
   - Navigate away → preview stops
   - Refresh page → preview stops
   - Close browser → Docker containers cleaned up

### Integration Testing

- Preview service integrates with agent
- Agent can modify code while preview is running
- Preview updates after code changes (hot reload)
- Screenshots captured from running preview

## Benefits

### For Users

1. **No Backend Required**: Preview UI changes without running real backends
2. **Realistic Data**: AI-generated mocks provide realistic data shapes
3. **Zero Configuration**: Works automatically, no manual setup
4. **Fast Iteration**: See changes immediately with mock data
5. **Isolated Environment**: Docker sandbox doesn't affect user's project

### For Development

1. **Library-First**: Uses Mock Sandbox Core as a library
2. **Event-Driven**: Can subscribe to progress events
3. **Extensible**: Easy to add custom detectors
4. **Framework-Agnostic**: Works with Vite, Next.js, CRA, Remix

## README Updates

Updated `README.md` to reflect integration:

1. **Architecture Diagram**: Added Mock Sandbox Core layer
2. **Agent Demo**: Updated to mention automatic preview with mocks
3. **Key Feature Callout**: Highlights preview with real mock data

## Future Enhancements

### Short Term

1. **Progress Indicators**: Show real-time status (detecting, discovering, generating mocks)
2. **Mock Editing**: UI to edit mock responses on-the-fly
3. **Network Inspector**: Show API calls and responses in UI

### Medium Term

1. **Multiple Scenarios**: Switch between different mock data sets
2. **Persistence**: Save mock configurations per project
3. **Mock Recording**: Record real API responses as mocks

### Long Term

1. **GraphQL Support**: Extend discovery to GraphQL operations
2. **Visual Regression**: Compare screenshots across changes
3. **Performance Metrics**: Track preview startup time and optimization

## Known Limitations

1. **Requires Docker**: Preview service needs Docker Desktop
2. **Requires DMR**: Mock generation needs Docker Model Runner
3. **Port Conflicts**: Uses fixed ports (5173, 9000)
4. **Vite-First**: Best support for Vite projects (Next.js/CRA work but less tested)

## Success Criteria ✅

All success criteria met:

- ✅ Preview service created with start/stop/status methods
- ✅ API route implemented for preview control
- ✅ UI integrated with loading and error states
- ✅ Cleanup logic added for project close and unmount
- ✅ README updated with integration details
- ✅ TypeScript compilation passes
- ✅ No linting errors

## Files Created/Modified

### Created
- `apps/web/src/lib/preview-service.ts` (Preview service implementation)
- `apps/web/src/app/api/preview/route.ts` (API endpoint)
- `MOCK_SANDBOX_PREVIEW_INTEGRATION.md` (This document)

### Modified
- `apps/web/package.json` (Added dependency)
- `apps/web/src/app/page.tsx` (UI integration)
- `README.md` (Architecture and demo updates)
- `pnpm-lock.yaml` (Dependency updates)

## Conclusion

The Mock Sandbox Preview Integration is complete and working. The preview section now automatically discovers APIs, generates mocks, and runs the app in an isolated sandbox. This provides a seamless development experience where users can preview UI changes with realistic data without needing to run real backends.

The integration is backward compatible (works without mocks for projects with no API calls) and gracefully handles errors. The system is ready for testing with real projects and further enhancements.

