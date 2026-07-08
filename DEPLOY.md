# Deploying to Render

This guide outlines how to deploy this Node.js / Express registration portal to [Render](https://render.com) for free.

## Step 1: Sign Up / Sign In on Render
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Sign in using your **GitHub account** (this makes connecting your repository instant).

## Step 2: Create a New Web Service
1. Click the **New +** button in the top right corner.
2. Select **Web Service** from the dropdown menu.

## Step 3: Connect your GitHub Repository
1. Under **Connect a repository**, find your repository `FORM` (or search for `Nithingowda16/FORM`).
2. Click the **Connect** button next to it.

## Step 4: Configure Deployment Settings
Set the configuration fields as follows:

- **Name**: `subject-coaching-portal` (or any unique name you like)
- **Region**: Choose the region closest to you (e.g., `Singapore` or `Oregon`)
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Instance Type**: `Free`

## Step 5: Deploy
1. Scroll down to the bottom and click the **Deploy Web Service** button.
2. Render will spin up the container, install the dependencies from your `package.json`, and start the server.
3. Once the logs show `Server is running at http://localhost:...` and the status changes to **Live**, your application is ready! Click the URL at the top of the Render page to open your live website.

---

> [!NOTE]
> On the **Render Free Tier**, the application uses local JSON files to store student registrations. These files are stored in the server memory/disk, which resets whenever the server restarts or is redeployed. For a production environment, you can connect a SQL/NoSQL cloud database (like MongoDB or PostgreSQL).
