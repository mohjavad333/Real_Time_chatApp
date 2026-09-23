
```
Realtime-chat-app
├─ .dockerignore
├─ .env
├─ .env.example
├─ .env.production.example
├─ .npmrc
├─ .prettierrc
├─ AGENTS.md
├─ builder.config.json
├─ client
│  ├─ App.tsx
│  ├─ components
│  │  ├─ auth
│  │  │  └─ ProtectedRoute.tsx
│  │  └─ ui
│  │     ├─ accordion.tsx
│  │     ├─ alert-dialog.tsx
│  │     ├─ alert.tsx
│  │     ├─ aspect-ratio.tsx
│  │     ├─ avatar.tsx
│  │     ├─ badge.tsx
│  │     ├─ breadcrumb.tsx
│  │     ├─ button.tsx
│  │     ├─ calendar.tsx
│  │     ├─ card.tsx
│  │     ├─ carousel.tsx
│  │     ├─ chart.tsx
│  │     ├─ checkbox.tsx
│  │     ├─ collapsible.tsx
│  │     ├─ command.tsx
│  │     ├─ context-menu.tsx
│  │     ├─ dialog.tsx
│  │     ├─ drawer.tsx
│  │     ├─ dropdown-menu.tsx
│  │     ├─ form.tsx
│  │     ├─ hover-card.tsx
│  │     ├─ input-otp.tsx
│  │     ├─ input.tsx
│  │     ├─ label.tsx
│  │     ├─ menubar.tsx
│  │     ├─ navigation-menu.tsx
│  │     ├─ pagination.tsx
│  │     ├─ popover.tsx
│  │     ├─ progress.tsx
│  │     ├─ radio-group.tsx
│  │     ├─ resizable.tsx
│  │     ├─ scroll-area.tsx
│  │     ├─ select.tsx
│  │     ├─ separator.tsx
│  │     ├─ sheet.tsx
│  │     ├─ sidebar.tsx
│  │     ├─ skeleton.tsx
│  │     ├─ slider.tsx
│  │     ├─ sonner.tsx
│  │     ├─ switch.tsx
│  │     ├─ table.tsx
│  │     ├─ tabs.tsx
│  │     ├─ textarea.tsx
│  │     ├─ toast.tsx
│  │     ├─ toaster.tsx
│  │     ├─ toggle-group.tsx
│  │     ├─ toggle.tsx
│  │     ├─ tooltip.tsx
│  │     └─ use-toast.ts
│  ├─ features
│  │  ├─ auth
│  │  │  └─ index.ts
│  │  └─ chat
│  │     ├─ Avatar.tsx
│  │     ├─ chat-utils.ts
│  │     ├─ ChatHeader.tsx
│  │     ├─ ChatWorkspace.tsx
│  │     ├─ ConversationList.tsx
│  │     ├─ DetailsPanel.tsx
│  │     ├─ ImageLightbox.tsx
│  │     ├─ index.ts
│  │     ├─ MessageComposer.tsx
│  │     ├─ MessageList.tsx
│  │     ├─ queries.ts
│  │     └─ Sidebar.tsx
│  ├─ global.css
│  ├─ hooks
│  │  ├─ use-mobile.tsx
│  │  └─ use-toast.ts
│  ├─ lib
│  │  ├─ api.ts
│  │  ├─ auth.ts
│  │  ├─ socket.ts
│  │  ├─ utils.spec.ts
│  │  └─ utils.ts
│  ├─ pages
│  │  ├─ Auth.tsx
│  │  ├─ Index.tsx
│  │  └─ NotFound.tsx
│  └─ vite-env.d.ts
├─ components.json
├─ docker-compose.yml
├─ Dockerfile.client
├─ Dockerfile.server
├─ index.html
├─ netlify
│  └─ functions
│     └─ api.ts
├─ netlify.toml
├─ nginx.conf
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.js
├─ scripts
│  ├─ disable-unsigned-preset.ts
│  ├─ probe-permissions.ts
│  ├─ split-cloudinary-url.ts
│  ├─ test-upload-http.ts
│  ├─ test-upload-raw.ts
│  ├─ test-upload.ts
│  └─ verify-env.ts
├─ server
│  ├─ config
│  │  ├─ database.ts
│  │  └─ env.ts
│  ├─ controllers
│  │  ├─ auth.controller.ts
│  │  ├─ chat.controller.ts
│  │  ├─ health.controller.ts
│  │  ├─ media.controller.ts
│  │  └─ user.controller.ts
│  ├─ index.spec.ts
│  ├─ index.ts
│  ├─ middleware
│  │  ├─ auth.ts
│  │  ├─ error-handler.ts
│  │  └─ upload.ts
│  ├─ models
│  │  ├─ Conversation.ts
│  │  ├─ index.ts
│  │  ├─ Message.ts
│  │  └─ User.ts
│  ├─ node-build.ts
│  ├─ routes
│  │  ├─ auth.ts
│  │  ├─ chat.ts
│  │  ├─ demo.ts
│  │  ├─ index.ts
│  │  ├─ media.ts
│  │  └─ users.ts
│  ├─ services
│  │  ├─ auth.service.spec.ts
│  │  ├─ auth.service.ts
│  │  ├─ chat.service.spec.ts
│  │  ├─ chat.service.ts
│  │  ├─ index.ts
│  │  ├─ media.service.ts
│  │  └─ user.service.ts
│  └─ socket
│     ├─ events.ts
│     ├─ index.spec.ts
│     └─ index.ts
├─ shared
│  └─ api.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ vite.config.server.ts
└─ vite.config.ts

```