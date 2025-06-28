# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/48bcfcac-3500-478b-9e1f-2a5af7fde1b9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/48bcfcac-3500-478b-9e1f-2a5af7fde1b9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables (optional, for AI features)
cp .env.example .env.local
# Edit .env.local and add your Groq API key

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables

This application uses environment variables for configuration. For AI-powered features, you'll need to set up a Groq API key.

### Local Development

1. Copy `.env.example` to `.env.local`
2. Get your Groq API key from [console.groq.com](https://console.groq.com)
3. Add your API key to `.env.local`:
   ```
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following environment variable:
   - **Name**: `VITE_GROQ_API_KEY`
   - **Value**: Your Groq API key
   - **Environment**: Production, Preview, Development
4. Redeploy your application

**Important**: Never commit API keys to your repository. Always use environment variables for sensitive data.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/48bcfcac-3500-478b-9e1f-2a5af7fde1b9) and click on Share → Publish.

For manual deployment to Vercel:

1. Connect your GitHub repository to Vercel
2. Set up the required environment variables (see above)
3. Deploy

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Features

- **Ibibio Dictionary Search**: Search for English to Ibibio translations using a comprehensive dictionary
- **AI-Powered Translation**: Enhanced translations using Groq's Llama3 model (requires API key)
- **Smart Caching**: Intelligent caching system for faster repeated searches
- **Multi-Source Search**: Combines local dictionary, online sources, and AI translation
- **Cultural Context**: Provides cultural background and context for translations
- **Voice Input**: Speech recognition for hands-free searching
- **Performance Monitoring**: Real-time performance metrics and optimization