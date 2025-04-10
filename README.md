# WorldDex

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
