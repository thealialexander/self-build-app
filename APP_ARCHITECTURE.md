# System Core: AI-Powered Dynamic Electron Environment

## 1. Project Vision & Overview
**System Core** is a "Self-Evolving Desktop Application" built on Electron and React. It starts as a minimal, blank slate—a literal "blank canvas." Hidden within the standard window controls is the **System Backend**, a powerful command center that allows the user to interact with the Gemini LLM to generate, inject, and persist code that modifies the application in real-time.

Unlike traditional apps where code is compiled and fixed, System Core treats its own source code as a fluid asset that can be rewritten while the application is running.

---

## 2. Core Architecture
The app follows a modern desktop architecture:
- **Runtime:** Electron (Multi-process architecture).
- **Frontend:** React 19 + Vite (for high-speed development/builds).
- **Styling:** Tailwind CSS v4 (using the latest `@import "tailwindcss"` engine).
- **Code Transformation:** `@babel/standalone` (running in-browser to transpile JSX on-the-fly).
- **AI Engine:** Google Gemini (Generative AI SDK).

---

## 3. The File System & Directory Structure

### **A. Source Directory (`/src`)**
The codebase is cleanly separated into the two Electron processes:

#### **1. Main Process (`/src/main`)**
Controls the system-level features, window creation, and native file access.
- `main.js`: The entry point. Handles window lifecycle, frameless window configuration, and IPC (Inter-Process Communication) handlers. It also contains the "persistent backend" logic which executes AI-generated Node.js code at startup.
- `preload.js`: The bridge between the secure Main process and the Renderer. It exposes the `electronAPI` to the window, allowing the UI to save code, build DMGs, and control window states safely.

#### **2. Renderer Process (`/src/renderer`)**
The React application that users see and interact with.
- `App.jsx`: The root component. It manages the dual-state of the app: the "Blank Slate" (where dynamic components are injected) and the "Backend Overlay" (the AI control panel).
- `/components`:
    - `TitleBar.jsx`: A custom macOS-style frameless title bar. It contains the "Hidden Button" (Terminal icon) to toggle the backend.
    - `BackendInterface.jsx`: The heart of the system. Contains the chat interface, settings, file management, and debug logs.
    - `CodeApproval.jsx`: A safety layer that previews generated code and allows the user to "Approve & Execute" changes.
- `/services/gemini.js`: Handles the streaming and communication with Google’s AI models.
- `main.jsx`: Initializes React and exposes `React` and `LucideIcons` to the global `window` object to support dynamic imports.

### **B. Persistent Storage (`userData`)**
When the AI generates code, it is not saved in the `/src` folder (which is read-only after packaging). Instead, it is stored in the Electron `userData` directory:
- `generated_code/renderer.js`: The latest approved UI code.
- `generated_code/backend.js`: The latest approved Main-process logic.

---

## 4. Core Mechanisms

### **A. The Dynamic Injection Engine**
This is the "magic" of the app. When Gemini returns a React component:
1. **Transpilation:** The app uses `@babel/standalone` to convert JSX/ES6 code into standard JavaScript that the browser can understand.
2. **Blob Module Injection:** The transpiled code is converted into a `Blob` and assigned a `URL.createObjectURL`.
3. **Dynamic Import:** The app calls `await import(blobUrl)`. This allows the new component to be loaded into memory without a page refresh.
4. **Global Provisioning:** To ensure generated code can use React or Icons, the app exposes these libraries globally (`window.React`, `window.LucideIcons`), which the dynamic module "requires" at runtime.

### **B. Main Process Execution**
If the AI generates "Backend" code, the Main process reads the file from the disk and uses a controlled `eval()` to execute logic within the Node.js environment. This allows the AI to create new API endpoints, system notifications, or file system watchers.

### **C. Frameless Window & Draggable Regions**
The app uses a custom `frame: false` configuration.
- **Draggability:** The `TitleBar` uses `-webkit-app-region: drag` to allow moving the window.
- **Interactivity:** All buttons, inputs, and the `BackendInterface` use `no-drag` to ensure they remain clickable and don't accidentally move the window.

### **D. Local Storage Strategy**
The app is entirely self-contained. It uses `localStorage` for:
- **API Keys:** Securely stored locally on the user's machine.
- **Chat History:** Persists conversations across restarts.
- **Model Preferences:** Remembers if you prefer Gemini Flash or Pro.

---

## 5. Interaction Workflow
1. **The Prompt:** User asks the backend to "Build a sleek pomodoro timer with a neon glow."
2. **The Response:** Gemini generates a single-file React component using Tailwind CSS.
3. **The Approval:** The `CodeApproval` modal pops up. The user can view the source or see a "Live Preview" of the component before it goes live.
4. **The Deployment:** Once approved, the code is saved to the disk. The `App.jsx` listens for an update event, clears the old component, and imports the new one.
5. **The Persistence:** The next time the app opens, it automatically checks the `generated_code` folder and restores the custom UI immediately.

---

## 6. Build System
The project includes a "Build DMG" feature.
- It triggers `electron-builder` via the Main process.
- It bundles the current React build and Electron main process into a distributable `.dmg` (macOS) or `.AppImage` (Linux) file, allowing the user to share their "self-created" app.
