# EcoPickup - Smart Waste Collection & Pickup Management System

A working web application where citizens request waste pickups, collectors
carry them out, and an admin manages everything, including smart bins that
report their fill level.

Built with plain **HTML, CSS and JavaScript**. No installation, no server and
no internet connection are needed. All data is saved in the browser's
`localStorage`, which acts as the database.

## How to run

1. Keep `index.html`, `style.css` and `app.js` in the same folder.
2. Double-click `index.html` (opens in Chrome / Edge / Firefox).

## Demo logins

| Role      | Email             | Password  |
|-----------|-------------------|-----------|
| Admin     | admin@demo.com    | admin123  |
| Collector | driver@demo.com   | driver123 |
| Citizen   | user@demo.com     | user123   |

A new citizen can also register from the Register page.

## Features

**Citizen**
- Register / login
- Request a pickup (waste type, quantity, address, zone, date, time slot, notes)
- Track status: Pending -> Assigned -> In Progress -> Completed (with timeline)
- Cancel a request, rate and review a completed pickup
- View smart bin fill levels (own zone shown first)

**Collector**
- Task list sorted in route order (date -> time slot -> zone)
- Start pickup, mark completed
- Dashboard with open tasks, due today, average rating

**Admin**
- Dashboard: totals, bar charts by waste type and status, full-bin alerts
- All requests with status filter
- Assign a collector manually, or press **Auto-assign** (same zone first, then lowest workload)
- Smart bins: simulate sensor updates, dispatch a collector to a full bin, mark emptied
- Add collectors, view all users, reset demo data

**Smart-system logic**
- Bins at or above 80% are flagged; "Dispatch" creates a request automatically and assigns the best collector
- Completing a bin-overflow task resets that bin's sensor reading

## Project structure

```
index.html   - page skeleton
style.css    - all styling (responsive)
app.js       - application logic: database, roles, views, router, handlers
README.md    - this file
```

## Limitations (mention in your report / viva)

- Data lives in the browser, so it is per-browser/per-device. A real system would use a
  backend (Node.js / Django / PHP) with a database such as MySQL or MongoDB.
- Passwords are stored as plain text for demo purposes. A real system must hash them (bcrypt).
- Smart-bin sensor data is simulated. A real system would receive it from IoT sensors
  (e.g. ultrasonic sensor + ESP32 / NodeMCU) through an API.

## Possible future enhancements

- Backend + real database and JWT authentication
- Google Maps route optimisation and live collector tracking
- SMS / email / push notifications
- Payment for bulk-waste pickups, multi-language support
