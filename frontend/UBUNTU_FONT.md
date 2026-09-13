# Ubuntu typography

The application now uses the Ubuntu typeface throughout the UI.

After extracting the project, run:

```bash
npm install
```

The project uses `@expo-google-fonts/ubuntu` with Ubuntu Regular, Medium, and Bold weights. The shared `components/Typography.tsx` wrapper automatically maps existing React Native font weights to the appropriate Ubuntu font face, so the existing screens do not need individual font changes.
