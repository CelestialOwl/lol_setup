# 🐛 VS Code Debugging Guide for Next.js League of Legends App

## 📁 VS Code Configuration Files Added

I've created a complete VS Code debugging setup in the `.vscode/` folder:

- **`launch.json`** - Debug configurations
- **`tasks.json`** - Build and development tasks
- **`settings.json`** - Project-specific VS Code settings
- **`extensions.json`** - Recommended extensions

## 🚀 Debug Configurations Available

### 1. **Next.js: debug server-side**

- **Purpose**: Debug API routes, server components, and server-side logic
- **What it does**: Starts Next.js dev server with Node.js debugger attached
- **Use for**:
  - Debugging `/api/summoner/route.ts`
  - Server-side Riot API calls
  - Environment variable issues
  - API error handling

### 2. **Next.js: debug client-side**

- **Purpose**: Debug React components and client-side JavaScript
- **What it does**: Launches Chrome browser with debugger attached
- **Use for**:
  - Debugging React components (`SearchComponent`, `MatchHistory`)
  - State management issues
  - Form submissions and UI interactions
  - Client-side fetch calls

### 3. **Next.js: debug full stack**

- **Purpose**: Debug both server and client simultaneously
- **What it does**: Starts server with debugger + automatically opens browser
- **Use for**: End-to-end debugging of user interactions

### 4. **Next.js: debug API routes**

- **Purpose**: Specifically debug API endpoints
- **What it does**: Focused debugging for `/src/app/api/` folder
- **Use for**: Debugging Riot API integration issues

### 5. **Next.js: debug client + server** (Compound)

- **Purpose**: Run both server and client debuggers together
- **What it does**: Launches both configurations simultaneously

## 🔧 How to Use the Debuggers

### **Step 1: Set Breakpoints**

- Open any `.ts` or `.tsx` file
- Click on the line number to set a red breakpoint dot
- For API routes: Set breakpoints in `/src/app/api/summoner/route.ts`
- For components: Set breakpoints in `/src/components/*.tsx`

### **Step 2: Start Debugging**

1. Press `F5` or go to Run and Debug panel (`Ctrl+Shift+D`)
2. Select your desired configuration from the dropdown:
   - Choose **"Next.js: debug server-side"** for API debugging
   - Choose **"Next.js: debug client-side"** for React debugging
   - Choose **"Next.js: debug full stack"** for both
3. Click the green play button or press `F5`

### **Step 3: Trigger Your Code**

- For **server-side**: Make API calls (search for a summoner)
- For **client-side**: Interact with the UI (click buttons, type in forms)
- Code will pause at your breakpoints

### **Step 4: Debug Features**

- **Variables panel**: See current variable values
- **Call stack**: See function call hierarchy
- **Debug console**: Execute code and inspect objects
- **Step controls**: Step over, step into, step out of functions

## 🛠 Debugging Scenarios

### **Debugging Riot API Issues**

```typescript
// Set breakpoint in /src/app/api/summoner/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName'); // <- Breakpoint here
    // ... rest of code
  }
}
```

### **Debugging Component State**

```typescript
// Set breakpoint in SearchComponent.tsx
const handleSearch = async (searchData: SearchFormData) => {
  setLoading(true); // <- Breakpoint here
  setError(null);
  // ... rest of code
};
```

### **Debugging API Service**

```typescript
// Set breakpoint in /src/services/riot-api.ts
async getSummonerData(gameName: string, tagLine: string, region: string) {
  const account = await this.getAccountByRiotId(gameName, tagLine, region); // <- Breakpoint here
  // ... rest of code
}
```

## 📋 Debug Console Commands

When debugging, you can use the debug console to:

```javascript
// Check variables
console.log(gameName, tagLine, region);

// Test API calls
await fetch("/api/summoner?gameName=test&tagLine=NA1&region=na1");

// Inspect React state
console.log(formData);

// Check environment variables
console.log(process.env.RIOT_API_KEY);
```

## 🔍 Common Debugging Use Cases

### **1. API Key Issues**

- Set breakpoint in API route
- Check if `process.env.RIOT_API_KEY` is loaded
- Verify API key format

### **2. Search Form Problems**

- Set breakpoint in `handleSearch` function
- Check form data values
- Verify form validation

### **3. Riot API Errors**

- Set breakpoint in `riot-api.ts` service
- Check API response status codes
- Inspect error messages

### **4. UI State Issues**

- Set breakpoints in component render functions
- Check state values
- Verify props being passed

## 🎯 Quick Start Debugging

1. **Open VS Code in your project folder**
2. **Install recommended extensions** (VS Code will prompt you)
3. **Set a breakpoint** in `/src/app/api/summoner/route.ts` at line with `const gameName`
4. **Press F5** and select **"Next.js: debug server-side"**
5. **Open browser** to `http://localhost:3000`
6. **Search for a summoner** - code will pause at your breakpoint!

## 🚨 Troubleshooting

- **Port already in use**: Stop any running Next.js servers first
- **Breakpoints not working**: Make sure source maps are enabled
- **Chrome not launching**: Install Chrome browser
- **TypeScript errors**: Run `npm run build` to check for compilation issues

Happy debugging! 🐛✨
