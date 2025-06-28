# Ibi-Voice - English to Ibibio Translation Platform

A professional English to Ibibio translation platform with local dictionary search and AI-powered online search capabilities.

## Features

- **Local Dictionary Search**: Fast, offline English to Ibibio translation using a comprehensive dictionary
- **AI-Enhanced Online Search**: Powered by Groq's Llama3 model for words not found in the local dictionary
- **Smart Caching**: Intelligent caching system for faster repeated searches
- **Multi-Source Search**: Combines local dictionary and online AI search
- **Voice Input**: Speech recognition for hands-free searching
- **Performance Monitoring**: Real-time performance metrics and optimization
- **Mobile Responsive**: Optimized for all device sizes

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Build Tool**: Vite
- **AI Integration**: Groq API with Llama3-8b-8192
- **Search Engine**: Custom fuzzy search with indexing
- **Caching**: Intelligent multi-layer caching system

## Environment Variables

This application uses environment variables for secure API key management.

### Production Deployment

For production deployments, set the following environment variable:

- **Name**: `VITE_GROQ_API_KEY`
- **Value**: Your Groq API key from [console.groq.com](https://console.groq.com)
- **Environment**: Production, Preview, Development

#### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `VITE_GROQ_API_KEY` with your API key
4. Set for Production, Preview, and Development environments
5. Redeploy your application

#### Other Platforms

Set the environment variable `VITE_GROQ_API_KEY` in your hosting platform's environment configuration.

### Local Development

1. Copy `.env.example` to `.env.local`
2. Get your Groq API key from [console.groq.com](https://console.groq.com)
3. Add your API key to `.env.local`:
   ```
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

**Important**: Never commit API keys to your repository. Always use environment variables for sensitive data.

## Getting Started

### Prerequisites

- Node.js (recommended: use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Set up environment variables (optional, for online search features)
cp .env.example .env.local
# Edit .env.local and add your Groq API key

# Start the development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Usage

### Basic Translation

1. Enter an English word or phrase in the search box
2. The system will first search the local dictionary for instant results
3. If not found locally, AI-enhanced online search will provide translations
4. View detailed results including pronunciation, cultural context, and examples

### Features Available

- **Without API Key**: Local dictionary search with 1000+ entries
- **With API Key**: Enhanced online search, cultural context, pronunciation guides, and alternative translations

## Architecture

### Core Services

- **Dictionary Service**: Manages local dictionary data and basic search
- **Enhanced Dictionary Service**: Provides advanced search with indexing
- **Parallel Search Service**: Orchestrates multi-source search (local + online)
- **Groq Service**: Handles AI-powered online translations
- **Cache Manager**: Intelligent caching for performance optimization

### Search Flow

1. **Cache Check**: First checks for cached results
2. **Local Search**: Searches local dictionary with fuzzy matching
3. **Online Search**: If no local results, uses AI for online translation
4. **Result Caching**: Caches successful results for future use

## Security

- API keys are managed through environment variables
- No sensitive data is stored in the repository
- Client-side caching uses localStorage for non-sensitive data only
- Production deployments use secure environment variable management

## Performance

- Local dictionary search: ~1-5ms response time
- Online AI search: ~500-2000ms response time
- Intelligent caching reduces repeated search times to ~1ms
- Fuzzy search with confidence scoring for accurate results

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Deployment

### Automatic Deployment

Deploy using your preferred hosting platform with environment variable support.

### Manual Deployment

1. Connect your GitHub repository to your hosting platform
2. Set up the required environment variables
3. Deploy

### Custom Domain

Configure custom domains through your hosting platform's domain management interface.

## License

This project is licensed under the MIT License.

## Support

For support and questions, please refer to the project documentation or create an issue in the repository.

---

**Ibi-Voice** - A product of JR Digital Insights | Made with ❤️ in Nigeria