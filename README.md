# Ibi-Voice - English to Ibibio Translation Platform

A professional English to Ibibio translation platform with local dictionary search and AI-powered online search capabilities using Hugging Face Spaces.

## Features

- **Local Dictionary Search**: Fast, offline English to Ibibio translation using a comprehensive dictionary
- **AI-Enhanced Online Search**: Powered by Hugging Face Spaces for words not found in the local dictionary
- **Smart Caching**: Intelligent caching system for faster repeated searches
- **Multi-Source Search**: Combines local dictionary and online AI search
- **Voice Input**: Speech recognition for hands-free searching
- **Performance Monitoring**: Real-time performance metrics and optimization
- **Mobile Responsive**: Optimized for all device sizes

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Build Tool**: Vite
- **AI Integration**: Hugging Face Spaces API
- **Search Engine**: Custom fuzzy search with indexing
- **Caching**: Intelligent multi-layer caching system

## Environment Variables

This application uses environment variables for secure API configuration.

### Production Deployment

For production deployments, set the following environment variables:

- **Name**: `VITE_HUGGINGFACE_SPACE_URL`
- **Value**: Your Hugging Face Space URL (e.g., `https://your-space-name.hf.space`)
- **Environment**: Production, Preview, Development

Optional for advanced features:
- **Name**: `VITE_GROQ_API_KEY`
- **Value**: Your Groq API key from [console.groq.com](https://console.groq.com)

#### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add `VITE_HUGGINGFACE_SPACE_URL` with your Hugging Face Space URL
4. Optionally add `VITE_GROQ_API_KEY` for advanced features
5. Set for Production, Preview, and Development environments
6. Redeploy your application

#### Other Platforms

Set the environment variable `VITE_HUGGINGFACE_SPACE_URL` in your hosting platform's environment configuration.

### Local Development

1. Copy `.env.example` to `.env.local`
2. Get your Hugging Face Space URL from [huggingface.co/spaces](https://huggingface.co/spaces)
3. Add your Space URL to `.env.local`:
   ```
   VITE_HUGGINGFACE_SPACE_URL=https://your-space-name.hf.space
   ```
4. Optionally add Groq API key for advanced features:
   ```
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

**Important**: Never commit API keys to your repository. Always use environment variables for sensitive data.

## Getting Started

### Prerequisites

- Node.js (recommended: use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- A Hugging Face Space with English to Ibibio translation model

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Hugging Face Space URL

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
3. If not found locally, AI-enhanced online search will provide translations via Hugging Face
4. View detailed results including pronunciation, cultural context, and examples

### Features Available

- **Without Hugging Face Space**: Local dictionary search with 1000+ entries
- **With Hugging Face Space**: Enhanced online search, AI-powered translations, and sentence processing
- **With Groq API Key**: Advanced cultural context, pronunciation guides, and alternative translations

## Architecture

### Core Services

- **Dictionary Service**: Manages local dictionary data and basic search
- **Enhanced Dictionary Service**: Provides advanced search with indexing
- **Parallel Search Service**: Orchestrates multi-source search (local + online)
- **Hugging Face Service**: Handles AI-powered online translations via Hugging Face Spaces
- **Cache Manager**: Intelligent caching for performance optimization

### Search Flow

1. **Cache Check**: First checks for cached results
2. **Local Search**: Searches local dictionary with fuzzy matching
3. **Online Search**: If no local results, uses Hugging Face AI for online translation
4. **Result Caching**: Caches successful results for future use

## Hugging Face Integration

The application integrates with Hugging Face Spaces to provide AI-powered translations:

### API Integration
```javascript
async function translateOnline(query) {
    const response = await fetch('https://your-space-url.hf.space/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: [query],
            fn_index: 0
        })
    });
    const result = await response.json();
    return result.data[0];
}
```

### Features
- **Automatic Retry**: Built-in retry mechanism for reliability
- **Timeout Handling**: Configurable timeout for API requests
- **Error Handling**: Comprehensive error handling and fallbacks
- **Batch Processing**: Efficient batch translation for multiple words
- **Type Safety**: Full TypeScript support with proper interfaces

## Security

- API configurations are managed through environment variables
- No sensitive data is stored in the repository
- Client-side caching uses localStorage for non-sensitive data only
- Production deployments use secure environment variable management

## Performance

- Local dictionary search: ~1-5ms response time
- Hugging Face AI search: ~500-2000ms response time
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