# WorldDex

## Getting Started (Backend)

Follow these steps to set up and run the backend server:

1. **Navigate to the backend directory:**

   ```bash
   cd worlddex/backend-worlddex
   ```

2. **Install Node modules:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the `backend-worlddex` directory with your Fireworks API key:

   ```
   FIREWORKS_API_KEY=your_fireworks_api_key_here
   ```

4. **Update API URL in frontend config:**

   In `frontend-worlddex/src/config.ts`, replace the IP address with your machine's local IP address:

   ```typescript
   export const API_URL = __DEV__ 
     ? 'http://YOUR_IP_ADDRESS:3000/api'  // e.g., 'http://192.168.1.5:3000/api'
     : 'https://backend-worlddex.fly.dev/api';
   ```

   This is necessary because mobile devices cannot access your computer via `localhost`.
   To test the production server, use `https://backend-worlddex.fly.dev/api`.

5. **Start the backend server:**

   ```bash
   npm run dev
   ```

   The server will start at http://localhost:3000

## Getting Started (Frontend - iOS)

Follow these steps to set up and run the React Native frontend application on an iOS simulator or device:

1.  **Navigate to the frontend directory:**

    ```bash
    cd worlddex/frontend-worlddex
    ```

2.  **Install Node modules:**

    ```bash
    npm install
    ```

3.  **Navigate to the iOS directory:**

    ```bash
    cd ios
    ```

4.  **Install CocoaPods dependencies:**

    ```bash
    pod install
    ```

    _Note: Ensure you have CocoaPods installed (`sudo gem install cocoapods`). You also need Xcode and its command-line tools configured._

5.  **Build and run via Xcode (Optional but recommended for first time):**

    - Open the `WorldDexApp.xcworkspace` file (located in `worlddex/frontend-worlddex/ios/`) in Xcode.
    - Select your target simulator or device.
    - Click the Run button (▶︎).

6.  **Start the Metro development server:**
    - Navigate back to the frontend root directory if you were in `ios`:
      ```bash
      cd ..
      ```
    - Run the Expo start command:
      ```bash
      npx expo start
      ```
    - This will start the Metro bundler. If you built and ran through Xcode in the previous step, the app should connect automatically. If you haven't built through Xcode yet, you can press `i` in the terminal where `expo start` is running to attempt building and launching on the iOS simulator.
    - Alternatively, you can directly build and run using:
      ```bash
      npx expo run:ios
      ```


Exp System:

Level Structure

  Level 1:     0 XP
  Level 2:    50 XP
  Level 3:   150 XP
  Level 4:   300 XP
  Level 5:   500 XP
  ...
  Level N: Previous + (N * 50)

  XP Sources

  1. Capture XP (based on rarity):
    - Common: 5 XP
    - Uncommon: 10 XP
    - Rare: 25 XP
    - Epic: 50 XP
    - Mythic: 100 XP
    - Legendary: 200 XP
  2. Bonus XP:
    - First capture of an item: 2x multiplier
    - Daily first capture: +10 XP
    - Social engagement: +1 XP per like received (daily cap: 50)
  3. Collection XP:
    - Adding item to collection: +5 XP
    - Completing collection: +100 XP

  Level Rewards

  - Every 5 levels: Unlock new camera effects/filters
  - Every 10 levels: Increase daily capture limit
  - Milestone levels (25, 50, 100): Special badges/titles
  - Level-based leaderboards for competitive players

  This system is simple to implement, leverages existing rarity
  calculations, and adds meaningful progression without disrupting
  current mechanics.