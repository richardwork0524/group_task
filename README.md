# Task Tracker PWA

Personal task tracker for Richard's Group (6 companies). Mobile-first, offline-capable, installable.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The app (everything in one file) |
| `sw.js` | Service worker (caching, offline) |
| `manifest.json` | PWA manifest (install metadata) |
| `TaskTracker_GAS_Sync.gs` | Google Apps Script for Sheets sync (deploy separately) |

## Deploy to GitHub Pages

### 1. Create repo
```
Go to github.com → New repository
Name: task-tracker (or anything)
Visibility: Private (recommended — this is personal)
Check "Add a README file"
Create repository
```

### 2. Upload files
```
In the repo → Add file → Upload files
Drag in: index.html, sw.js, manifest.json
Commit to main branch
```

### 3. Enable GitHub Pages
```
Repo → Settings → Pages (left sidebar)
Source: Deploy from a branch
Branch: main, / (root)
Save
```

### 4. Access your PWA
```
URL will be: https://YOUR-USERNAME.github.io/task-tracker/
Wait 1-2 minutes for first deploy
```

### 5. Install on phone
```
Open the URL in Safari (iOS) or Chrome (Android)
iOS: Share → Add to Home Screen
Android: 3-dot menu → Add to Home Screen / Install app
```

## Google Sheets Sync Setup

1. Create a new Google Sheet
2. Extensions → Apps Script
3. Paste contents of `TaskTracker_GAS_Sync.gs`
4. Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone
5. Copy the URL
6. In the PWA → tap "R" avatar → paste URL → Save → Sync Now

## Notes

- IndexedDB is source of truth (local, survives browser close)
- Sheets sync is one-way push (PWA → Google)
- Private repo keeps your tasks out of public view
- GitHub Pages works with private repos on free plan
