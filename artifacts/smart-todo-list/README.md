# Smart To-Do List

A personal task dashboard built with React, Vite, and Supabase. It supports account sign-up and login, private task management, calendar and analytics views, search and filters, and light/dark themes.

## Supabase setup

1. Create a Supabase project, or use an existing one.
2. In the Supabase dashboard, open **SQL Editor** and run the complete script in [`supabase/schema.sql`](./supabase/schema.sql). It creates the profiles and tasks tables, indexes, signup and timestamp triggers, and row-level security policies.
3. In Supabase **Authentication → URL Configuration**, add the app's Replit preview URL and published app URL to **Redirect URLs**. Include the app's `/reset-password` path for password reset links.
4. In Supabase **Authentication → Providers → Email**, enable email/password sign-in. Configure email confirmation according to how you want new accounts verified.
5. In Replit **Tools → Secrets**, add:
   - `VITE_SUPABASE_URL` — the Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY` — the Supabase publishable key (or legacy anon key).

The publishable/anon key is intended for browser use; the database's row-level security policies are what isolate users' records. **Never put a Supabase service-role key in this app or in a `VITE_` variable.** The app does not use local storage or sample records as a substitute for Supabase. If either setting is missing or invalid, it should show a configuration or connection error instead of implying the app is connected.

## Run in Replit

The web preview starts through the `Smart To-Do List: web` workflow. To check the package manually:

```sh
pnpm --filter @workspace/smart-todo-list run typecheck
pnpm --filter @workspace/smart-todo-list run build
```

## Data and reminders

Tasks are owned by the signed-in Supabase user. RLS policies restrict reads and writes to `auth.uid()`, and task ownership is checked again on insert and update. The reminder option is saved on the task only; it does not deliver a push, email, or background notification.

## Verification checklist

- Create two separate test accounts and confirm each account can only see its own tasks.
- Create, edit, complete, and delete tasks; reload the app and confirm the changes persist.
- Try search, combined filters, sorting, date views, calendar navigation, analytics, and dark mode.
- Test signup, sign-in, sign-out, email confirmation (if enabled), forgot password, and the password reset link.