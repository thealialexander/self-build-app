# System Core: AI-Powered Dynamic Electron Environment

System Core is an experimental desktop application framework that combines **Electron**, **React**, and **Generative AI** into a self-evolving workspace. It allows users to modify the application's UI and Logic in real-time through a natural language interface.

## 🚀 Key Features

- **Blank Slate Start**: Begins as a clean, minimal window.
- **Hidden System Core**: A backend interface accessible via a secret button in the window controls.
- **Dynamic Injection**: Uses Babel and Blob modules to hot-swap UI components without restarting.
- **Main Process Codegen**: AI can generate Node.js code that runs with system-level privileges.
- **Persistent Memory**: All changes and configurations are saved locally in the user's data directory.
- **Native Packaging**: Integrated "Build DMG" functionality to export your custom creations.

## 📂 Project Structure

```text
├── src/
│   ├── main/                 # Electron Main Process (Node.js)
│   │   ├── main.js           # Window management & IPC handlers
│   │   └── preload.js        # Secure bridge for renderer APIs
│   └── renderer/             # Frontend React Application
│       ├── App.jsx           # Core layout & Injection logic
│       ├── components/       # UI Components (TitleBar, Backend, etc)
│       ├── services/         # Gemini API integration
│       └── index.css         # Tailwind CSS v4 styling
├── package.json              # Dependencies & Build scripts
└── vite.config.js            # Frontend build configuration
```

## 🛠 Technology Stack

- **Electron**: Desktop shell.
- **React 19**: Modern UI library.
- **Tailwind CSS v4**: Utility-first styling.
- **Google Gemini API**: Generative AI engine.
- **@babel/standalone**: On-the-fly JSX transpilation.

## 🔧 How It Works

1. **Ask**: Describe a feature in the Backend Interface.
2. **Generate**: Gemini produces the React or Node.js code.
3. **Approve**: Review and preview the code in the Approval Modal.
4. **Inject**: The app transpiles the code and injects it into the running environment using Blob modules.
5. **Persist**: The code is saved to the `userData` directory and reloaded on every startup.

## 📦 Build Instructions

To build a distributable version of this app:
1. Open the Backend Interface.
2. Go to the **Files** view.
3. Click **BUILD DMG**.
4. Find your packaged app in the `dist_electron` folder.

---
*Created with Jules & System Core*
