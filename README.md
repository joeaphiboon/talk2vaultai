# Talk2MyVault

A mobile-friendly Progressive Web App (PWA) that allows you to chat with your Obsidian vault using AI. Built with React, TypeScript, and Vite.

## Features

- 🤖 **AI-Powered Chat**: Chat with your Obsidian notes using Gemini AI
- 📱 **Mobile-First Design**: Optimized for mobile devices with responsive UI
- 🎤 **Voice Input**: Support for both Thai and English voice input
- 💾 **Persistent Storage**: Settings and vault files are saved locally
- 🔒 **Secure**: User-controlled API keys (no hardcoded keys)
- 📦 **PWA Support**: Install as an app on your device
- 🌐 **Fullscreen Mode**: Runs in fullscreen on mobile devices
- 📁 **Local File Support**: Select your own Obsidian vault folder

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JTIAPBNAI/Talk2Vault.git
cd Talk2Vault
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Usage

1. **Set up your API key**: Click the settings icon and enter your Gemini API key
2. **Select your vault**: Choose your local Obsidian vault folder (markdown files only)
3. **Start chatting**: Ask questions about your notes in either Thai or English
4. **Voice input**: Use the microphone button for voice input (supports both languages)

**Note**: This app works with your local Obsidian vault files. Simply select your vault folder containing markdown files, and the AI will be able to answer questions based on your notes.

## Deployment

### Railway (Recommended)

This app is configured for automatic deployment on Railway:

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Vite configuration
3. The app will be deployed and accessible via Railway's provided URL

### Manual Deployment

Build the app for production:
```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## PWA Installation

### Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Look for "Add to Home Screen" or "Install App" option
3. The app will be installed with its own icon and run in fullscreen

### Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. The app will be installed as a desktop application

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API
- **PWA**: Service Worker, Web App Manifest
- **Voice**: Web Speech API
- **Storage**: LocalStorage

## Features in Detail

### Voice Input
- Supports both Thai (`th-TH`) and English (`en-US`) languages
- Real-time transcription with interim results
- Visual feedback during recording

### Mobile Optimization
- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized for mobile keyboards
- Fullscreen PWA support

### Security
- No hardcoded API keys
- User-controlled API key management
- Local storage for settings and files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please open an issue on GitHub.