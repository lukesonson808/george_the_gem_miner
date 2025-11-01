# 🚂 Railway Deployment Guide

Complete guide to deploy Georgie to Railway and connect to A1Zap for 24/7 availability.

## Step 1: Deploy to Railway

### 1.1 Create Railway Account & Project

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account (if not already connected)
5. Select your `george_the_gem_miner` repository
6. Railway will automatically detect Node.js and start building

### 1.2 Configure Environment Variables

In your Railway project dashboard:

1. Go to your project → **Variables** tab
2. Add the following environment variables:

```
# Required: API Keys
CLAUDE_API_KEY=your_claude_api_key
GEM_MINER_API_KEY=your_a1zap_api_key
GEM_MINER_AGENT_ID=your_agent_id

# Optional: API Keys (if using)
GEMINI_API_KEY=your_gemini_api_key

# Optional: Custom Base URL (Railway will set this automatically)
# But you can override if needed
BASE_URL=https://your-app-name.up.railway.app
```

**Important Notes:**
- Railway automatically sets `PORT` - you don't need to set it manually
- `BASE_URL` will be set automatically by Railway, but you can override it
- Never commit API keys to GitHub - use Railway's environment variables

### 1.3 Wait for Deployment

1. Railway will automatically:
   - Install dependencies (`npm install`)
   - Start your server (`node server.js`)
   - Expose it on a public URL

2. Check the **Deployments** tab to see build logs
3. Wait for status to show **"Success"**

## Step 2: Get Your Railway URL

### 2.1 Find Your Public URL

1. In Railway dashboard, go to your project
2. Click on your service (usually shows "web" or the project name)
3. Go to the **Settings** tab
4. Scroll down to **"Networking"** or **"Domains"**
5. You'll see a public URL like: `https://your-app-name.up.railway.app`

**OR**

1. Click the **"Settings"** tab in your project
2. Scroll to **"Domains"**
3. Railway provides a default domain: `https://your-project-name-production.up.railway.app`

### 2.2 Create Custom Domain (Optional)

If you want a custom domain:

1. In **Settings** → **Domains**
2. Click **"Generate Domain"** or **"Custom Domain"**
3. Railway will give you a URL like: `https://your-app.up.railway.app`
4. Copy this URL - you'll need it for A1Zap!

## Step 3: Configure A1Zap Webhook

### 3.1 Get Your Webhook URL

Your webhook URL will be:
```
https://YOUR-RAILWAY-URL/webhook/gem-miner
```

For example, if your Railway URL is `https://georgie-gem-miner.up.railway.app`, then:
```
https://georgie-gem-miner.up.railway.app/webhook/gem-miner
```

### 3.2 Set Up A1Zap Agent

1. Go to [A1Zap Dashboard](https://a1zap.com) (or your A1Zap instance)
2. Navigate to your **Georgie agent** settings
3. Find **"Webhook"** or **"Integration"** section
4. Enter your webhook URL:
   ```
   https://YOUR-RAILWAY-URL/webhook/gem-miner
   ```
5. Save the configuration

### 3.3 Test the Connection

1. In A1Zap, send a test message to your agent
2. Check Railway logs (in **Deployments** → click on latest deployment → **View Logs**)
3. You should see:
   ```
   ✅ Georgie the Gem Miner running on http://0.0.0.0:PORT
   ⛏️ Georgie: Processing conversation...
   ```
4. If you see errors, check:
   - Environment variables are set correctly
   - Webhook URL is correct in A1Zap
   - Railway deployment is successful

## Step 4: Verify 24/7 Availability

### 4.1 Check Railway Status

- Railway runs your app 24/7 automatically
- No need for tunnels or keeping your computer on
- Railway handles restarts if your app crashes

### 4.2 Monitor Your App

1. **Railway Dashboard:**
   - View real-time logs
   - See resource usage (CPU, Memory)
   - Monitor deployment status

2. **Health Check:**
   - Visit: `https://YOUR-RAILWAY-URL/health`
   - Should return: `{"status":"ok","agent":"gem-miner"}`
   - Visit: `https://YOUR-RAILWAY-URL/`
   - Should show: `Georgie the Gem Miner API - Available endpoints: /webhook/gem-miner`

### 4.3 Test A1Zap Integration

Send these test messages via A1Zap:
- "Hey Georgie, show me easy CS classes"
- "What are some GenEd gems?"
- "When does CS 50 meet?"

If Georgie responds, everything is working! 🎉

## Troubleshooting

### Issue: App not deploying

**Check:**
1. Railway build logs for errors
2. All required environment variables are set
3. `package.json` has correct `start` script
4. Node.js version is compatible (Railway auto-detects)

### Issue: Webhook not receiving messages

**Check:**
1. Webhook URL in A1Zap matches: `https://YOUR-URL/webhook/gem-miner`
2. Railway app is running (check logs)
3. Health endpoint returns 200: `https://YOUR-URL/health`
4. API keys are set correctly in Railway

### Issue: 502 Bad Gateway

**Check:**
1. Server is listening on the PORT Railway provides
2. Check Railway logs for startup errors
3. Verify `Procfile` exists and is correct

### Issue: Environment variables not working

**Check:**
1. Variables are set in Railway (not just `.env` file)
2. Variable names match exactly (case-sensitive)
3. No quotes around values in Railway
4. Redeploy after adding new variables

## Updating Your Deployment

When you push new code to GitHub:

1. Railway automatically detects the push
2. Triggers a new deployment
3. Builds and deploys the new version
4. Zero downtime deployment (traffic switches automatically)

**To manually redeploy:**
1. Go to Railway dashboard
2. Click **"Redeploy"** button
3. Or push a new commit to GitHub

## Cost

Railway offers:
- **Free tier:** $5 credit/month (usually enough for small apps)
- **Pro tier:** Pay-as-you-go ($0.000463 per GB RAM/hour)
- Georgie typically uses ~512MB RAM = very affordable

Your app runs 24/7 on the free tier for small to medium usage!

## Security Tips

1. ✅ Never commit API keys to GitHub
2. ✅ Use Railway's environment variables
3. ✅ Enable Railway's built-in HTTPS (automatic)
4. ✅ Regularly rotate API keys
5. ✅ Monitor Railway logs for suspicious activity

---

**That's it!** Your Georgie agent is now running 24/7 on Railway and connected to A1Zap! 🚀⛏️💎

