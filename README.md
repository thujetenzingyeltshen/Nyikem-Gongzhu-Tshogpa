# Nyikem Gongzhu Tshogpa (NGT) Website

This project is a standalone responsive website and member record system for **Nyikem Gongzhu Tshogpa (NGT)**.

## Run Locally

1. Open the `NGT` folder.
2. Double-click `index.html` to open in a browser.
3. For best behavior, use a local static server (optional), for example:
   - `npx serve .` from inside `NGT`

## Secure Online Admin Setup

This project can now use **Supabase** for secure online member editing.

### 1. Create a Supabase project

- Create a project at `https://supabase.com`
- Open the SQL Editor
- Run [`supabase-setup.sql`](./supabase-setup.sql)

### 2. Add your project keys

Open [`supabase-config.js`](./supabase-config.js) and fill in:

- `url`: your Supabase project URL
- `anonKey`: your Supabase anon public key

Important:
- Use the **anon** key in the website, never the service role key.

### 3. Create an admin login

- In the Supabase dashboard, go to `Authentication` > `Users`
- Create a user for the admin email
- Copy that user ID
- Insert the user into `public.admin_users`

Example SQL:

```sql
insert into public.admin_users (user_id, email)
values ('YOUR-USER-UUID-HERE', 'admin@example.com');
```

### 4. Open the site

- Public visitors can view members from the online database
- Admin users can sign in at `admin.html`
- Only users listed in `admin_users` can add, edit, or delete members
- For the new member strength controls (`service_status` and `life_status`), run `supabase-setup.sql` again in SQL Editor to add missing columns on older projects
- For editable news tags/categories, run `supabase-setup.sql` again in SQL Editor to add the `category` column on older projects

## Features

- Informational pages (Home, About, News, Documents, Contact)
- Member records with add/edit/delete/search/filter
- Auto-generated member serial ID (`NGT-001`, `NGT-002`, ...)
- Secure online admin sign-in with Supabase
- Shared online member database for all users
- PDF upload and listing in Documents page
- Local browser fallback when Supabase is not configured
- Responsive Bhutan-theme design

## Notes

- When Supabase is configured, the member directory syncs from the online database.
- Without Supabase config, the site falls back to local browser data for offline use.
# Nyikem-Gongzhu-Tshogpa
