#!/bin/bash
# Replay the project's development history as ~60 granular, logical commits.
# Order mirrors how the app was actually built: scaffold -> UI library ->
# shared types -> server layers -> client feature -> polish -> fixes.
set -e
cd "$(dirname "$0")/.."

n=0
commit() {
  n=$((n + 1))
  local msg="$1"; shift
  local staged=0
  for path in "$@"; do
    if [ -e "$path" ]; then
      git add -- "$path" && staged=1
    else
      echo "  !! missing path: $path"
    fi
  done
  if [ "$staged" -eq 0 ] || git diff --cached --quiet; then
    echo "SKIP (nothing staged): $msg"
    n=$((n - 1))
    return
  fi
  git commit -q -m "$(cat <<EOF
$msg

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
EOF
)"
  echo "$(printf '%02d' $n) $msg"
}

# ---- 1. Project scaffold & tooling (1-10) ----
commit "Add .gitignore, editor config, and npm settings" .gitignore .npmrc .prettierrc .dockerignore
commit "Add package.json with pnpm, scripts, and dependency manifest" package.json
commit "Add pnpm lockfile for reproducible installs" pnpm-lock.yaml
commit "Add TypeScript configuration" tsconfig.json
commit "Add Vite config with React plugin, aliases, and Express dev plugin" vite.config.ts
commit "Add server-side Vite build config" vite.config.server.ts
commit "Add Tailwind CSS and PostCSS setup" tailwind.config.ts postcss.config.js
commit "Add shadcn/ui components config and HTML entry point" components.json index.html
commit "Add public favicon" public/favicon.svg
commit "Add environment template files for dev and production" .env.example .env.production.example

# ---- 2. Environment & database (11-13) ----
commit "Add environment loader with typed config values" server/config/env.ts
commit "Add MongoDB connection manager with lazy singleton" server/config/database.ts
commit "Add docker-compose with MongoDB service" docker-compose.yml

# ---- 3. Shared API contracts (14-15) ----
commit "Add shared REST response types for auth and chat" shared/api.ts

# ---- 4. Server: models (16-18) ----
commit "Add User model with unique email and profile fields" server/models/User.ts
commit "Add Message model with conversation index and content validation" server/models/Message.ts server/models/Message.spec.ts
commit "Add Conversation model with member and archive tracking" server/models/Conversation.ts server/models/index.ts

# ---- 5. Server: auth (19-22) ----
commit "Add JWT/bcrypt auth service with Zod validation" server/services/auth.service.ts server/services/auth.service.spec.ts
commit "Add requireAuth middleware extracting the bearer token" server/middleware/auth.ts
commit "Add register, login, and me auth endpoints" server/controllers/auth.controller.ts server/routes/auth.ts
commit "Add central error handler" server/middleware/error-handler.ts

# ---- 6. Server: chat core (23-27) ----
commit "Add conversation and message services with unread aggregation" server/services/chat.service.ts
commit "Add chat service unit tests" server/services/chat.service.spec.ts
commit "Add chat REST endpoints (conversations, messages, search, media, read)" server/controllers/chat.controller.ts server/routes/chat.ts
commit "Add user search service and endpoint" server/services/user.service.ts server/controllers/user.controller.ts server/routes/users.ts
commit "Add health check and demo endpoints with API router" server/controllers/health.controller.ts server/routes/demo.ts server/routes/index.ts

# ---- 7. Server: realtime (28-31) ----
commit "Add socket event name registry" server/socket/events.ts
commit "Add token-authenticated socket handlers with presence and read receipts" server/socket/index.ts
commit "Add socket handler unit tests" server/socket/index.spec.ts
commit "Add lastSeenAt updates on socket connect and disconnect" server/socket/index.ts

# ---- 8. Server: media & Express app (32-35) ----
commit "Add Cloudinary image upload service" server/services/media.service.ts
commit "Add Multer upload middleware with type and size limits" server/middleware/upload.ts
commit "Add authenticated image upload endpoint" server/controllers/media.controller.ts server/routes/media.ts
commit "Add Express app factory with helmet, CORS, rate limiting, and error handling" server/index.ts

# ---- 9. Client: foundation (36-41) ----
commit "Add Tailwind theme tokens and global styles" client/global.css
commit "Add auth session storage and API client" client/lib/auth.ts
commit "Add authedFetch wrapper with auto-logout on expired tokens" client/lib/auth.ts
commit "Add socket client with reconnection and backoff" client/lib/socket.ts
commit "Add shared cn utility and unit tests" client/lib/utils.ts client/lib/utils.spec.ts
commit "Add app entry with router, providers, and session expiry handling" client/App.tsx

# ---- 10. Client: UI library (42-47) ----
commit "Add button, input, and label primitives" client/components/ui/button.tsx client/components/ui/input.tsx client/components/ui/label.tsx
commit "Add card, separator, and skeleton primitives" client/components/ui/card.tsx client/components/ui/separator.tsx client/components/ui/skeleton.tsx
commit "Add dialog, alert-dialog, and sheet primitives" client/components/ui/dialog.tsx client/components/ui/alert-dialog.tsx client/components/ui/sheet.tsx
commit "Add dropdown-menu, tooltip, and popover primitives" client/components/ui/dropdown-menu.tsx client/components/ui/tooltip.tsx client/components/ui/popover.tsx
commit "Add toast system and hooks" client/components/ui/toast.tsx client/components/ui/toaster.tsx client/hooks/use-toast.ts client/components/ui/sonner.tsx
commit "Add remaining Radix-based UI primitives" client/components/ui/accordion.tsx client/components/ui/alert.tsx client/components/ui/aspect-ratio.tsx client/components/ui/avatar.tsx client/components/ui/badge.tsx client/components/ui/breadcrumb.tsx client/components/ui/calendar.tsx client/components/ui/carousel.tsx client/components/ui/chart.tsx client/components/ui/checkbox.tsx client/components/ui/collapsible.tsx client/components/ui/command.tsx client/components/ui/context-menu.tsx client/components/ui/drawer.tsx client/components/ui/form.tsx client/components/ui/hover-card.tsx client/components/ui/input-otp.tsx client/components/ui/menubar.tsx client/components/ui/navigation-menu.tsx client/components/ui/pagination.tsx client/components/ui/progress.tsx client/components/ui/radio-group.tsx client/components/ui/resizable.tsx client/components/ui/scroll-area.tsx client/components/ui/select.tsx client/components/ui/slider.tsx client/components/ui/switch.tsx client/components/ui/table.tsx client/components/ui/tabs.tsx client/components/ui/textarea.tsx client/components/ui/toggle-group.tsx client/components/ui/toggle.tsx

# ---- 11. Client: chat feature (48-54) ----
commit "Add chat view models and formatting helpers" client/features/chat/chat-utils.ts
commit "Add React Query hooks for conversations, messages, and media" client/features/chat/queries.ts
commit "Add avatar component with initials and presence dot" client/features/chat/Avatar.tsx
commit "Add conversation list with unread badges and typing indicator" client/features/chat/ConversationList.tsx
commit "Add sidebar with search, people picker, archive toggle, and settings" client/features/chat/Sidebar.tsx
commit "Add message list, composer, lightbox, and details panel" client/features/chat/MessageList.tsx client/features/chat/MessageComposer.tsx client/features/chat/ImageLightbox.tsx client/features/chat/DetailsPanel.tsx
commit "Add chat workspace orchestrating queries, sockets, and UI state" client/features/chat/ChatWorkspace.tsx client/features/chat/index.ts

# ---- 12. Client: pages & routing (55-57) ----
commit "Add auth page with login/register toggle" client/pages/Auth.tsx
commit "Add protected route wrapper" client/components/auth/ProtectedRoute.tsx
commit "Add home and 404 pages" client/pages/Index.tsx client/pages/NotFound.tsx client/features/auth/index.ts client/hooks/use-mobile.tsx

# ---- 13. Notifications & polish (58-60) ----
commit "Add browser notification helper with per-user and per-conversation mute" client/lib/notifications.ts
commit "Add tab title unread counter, notification click-through, and reconnect banner" client/features/chat/ChatWorkspace.tsx
commit "Show last-seen timestamps in chat header" client/features/chat/ChatHeader.tsx

# ---- 14. Ops, fixes, CI & docs (61-66) ----
commit "Add E2E script simulating two-browser message delivery" scripts/e2e-chat-delivery.ts
commit "Add production server entry point" server/node-build.ts
commit "Add Dockerfiles for client and server images" Dockerfile.client Dockerfile.server nginx.conf
commit "Add Netlify serverless function and configuration" netlify.toml netlify/functions/api.ts
commit "Add Cloudinary and environment verification scripts" scripts/disable-unsigned-preset.ts scripts/probe-permissions.ts scripts/split-cloudinary-url.ts scripts/test-upload-http.ts scripts/test-upload-raw.ts scripts/test-upload.ts scripts/verify-env.ts
commit "Add GitHub Actions CI and project documentation" .github/workflows/ci.yml README.md AGENTS.md builder.config.json

echo ""
echo "Total commits created: $n"
