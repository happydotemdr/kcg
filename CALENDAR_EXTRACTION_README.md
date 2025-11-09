# 📅 Intelligent Calendar Event Extraction

**Transform documents into calendar events in seconds!**

Upload a schedule, flyer, screenshot, or any document with dates/events, and Claude will automatically extract, organize, and add them to your calendar with intelligent duplicate detection and smart calendar selection.

---

## ✨ What It Does

This feature enables **magical calendar management** by:
- 🔍 **Extracting events** from uploaded images/documents (schedules, flyers, agendas, screenshots)
- 🧠 **Smart parsing** of dates, times, locations, and recurring patterns
- 🎯 **Intelligent calendar selection** (sports → Kids Sports, dentist → Family, meeting → Work)
- 🛡️ **Duplicate detection** with fuzzy matching to prevent redundant entries
- 📊 **Batch creation** with user confirmation before executing
- 🔄 **Recurring event recognition** (creates one recurring event vs. multiple individual ones)

---

## 🚀 Quick Start

### Example 1: Soccer Schedule

**Upload**: Photo of printed soccer schedule

**Say**: "Add these soccer games to my calendar"

**Claude responds**:
```
📅 PROPOSED CALENDAR UPDATES

✅ Add: 12 Soccer Practices (recurring: Tue/Thu 4-5:30pm, Jan 14 - May 15)
✅ Add: Championship Tournament (Sat Feb 22, 9am @ Regional Sports Complex)
✅ Add: Team Photos (Sun Feb 2, 10am @ Central Field)
🔄 Update: Existing "Soccer Season Kickoff" - adding location: Central Field

Total: 14 new events → Kids Sports calendar

Should I proceed?
```

**You reply**: "Yes"

**Result**: ✅ Added 14 events to Kids Sports calendar in 2 seconds!

---

### Example 2: School Events

**Upload**: Screenshot of school calendar from email

**Say**: "Put these on the family calendar"

**Claude responds**:
```
📅 PROPOSED CALENDAR UPDATES

✅ Add: Parent-Teacher Conference (Thu Jan 30, 6-8pm @ Lincoln Elementary)
⚠️ Possible Duplicate: "Spring Break" Mar 10-14 (you have "Kids Spring Break" same dates)
✅ Add: Science Fair (Fri Feb 28, 5-7pm @ School Gym)
✅ Add: Field Trip Permission Due (Wed Feb 5, all-day reminder)

Should I proceed? Reply "skip duplicates" to add only new events.
```

**You reply**: "Skip duplicates"

**Result**: ✅ Added 3 new events, skipped 1 duplicate

---

## 🎯 How It Works

### 1. **Upload & Request**
Upload any document containing calendar information:
- 📄 School schedules, sports calendars, appointment cards
- 📸 Photos of printed materials
- 🖥️ Screenshots of emails, websites, PDFs
- ✍️ Handwritten notes or agendas

Then ask Claude to extract and add events (or just say "add these to my calendar").

### 2. **Intelligent Extraction**
Claude analyzes the image and extracts:
- **Dates**: Handles various formats (Jan 15, 1/15/25, Monday Jan 15th)
- **Times**: Infers AM/PM if missing (1-7 → PM, 8-12 → AM)
- **Events**: Preserves original names with standardized format
- **Locations**: Addresses, room numbers, facility names
- **Recurrence**: "Every Tuesday" → Weekly recurring event

### 3. **Smart Calendar Selection**
Automatically routes events to the right calendar based on content:

| Event Type | Keywords | Target Calendar |
|-----------|----------|-----------------|
| **Kids/Family** | school, dentist, doctor, kids, soccer, practice, birthday, family | Family Calendar |
| **Sports** | game, tournament, practice, training, team, championship | Kids Sports |
| **Work** | meeting, client, deadline, presentation, conference call | Work Calendar |
| **Personal** | gym, hobby, friend, coffee, movie, study | Personal Calendar |

### 4. **Duplicate Detection**
Before creating events, Claude checks existing calendar and applies **fuzzy matching**:

```
"Soccer Practice"     ≈  "Soccer Training"
"Parent Teacher Conf" ≈  "PT Conference"
"Championship Game"   ≈  "Champ Game"
```

**Matching logic**:
- Name similarity (>70% match)
- Time tolerance (±2 hours)
- Date tolerance (±1 day)
- Recurring pattern awareness

**Actions**:
- ⚠️ **Possible duplicate**: Asks if you want to update existing or create new
- 🔄 **Update**: Merges information (adds missing details like location)
- ❌ **Skip**: Prevents duplicate creation

### 5. **User Confirmation**
Claude always presents a clear proposal before executing:

```
📅 PROPOSED CALENDAR UPDATES

✅ Add: [count] [event type] ([details])
🔄 Update: [existing event] - [changes]
⚠️ Possible Duplicate: [event name] ([conflict details])

Should I proceed? Reply:
- "Yes" or "Confirm" to add all
- "Skip duplicates" to add only new events
- "Show details" for full event breakdown
- "Cancel" to abort
```

### 6. **Batch Execution**
After confirmation, Claude:
- Creates all events in a single batch
- Uses recurring events when appropriate
- Provides success summary
- Reports any failures with details

---

## 🧠 Smart Features

### Date Intelligence
- **Relative dates**: "tomorrow", "next Monday", "first Tuesday of month"
- **Academic year awareness**: School events default to current school year (Aug-June)
- **Implicit years**: "Jan 15" → Infers 2025 based on current context
- **Time inference**: "Meeting at 3" → 3:00 PM

### Recurring Events
Instead of creating 20 individual "Soccer Practice" events, Claude creates:
- ✅ **One recurring event**: "Soccer Practice (Every Tuesday, 4-5:30pm, Jan-May)"
- Saves time and reduces calendar clutter

### Context Awareness
Claude understands:
- School events occur during school year (not summer)
- Kids activities go to Family/Kids calendars
- Medical appointments are family events
- Work meetings route to Work calendar

### Validation
- ❌ Rejects impossible dates (Feb 30, April 31)
- ⏰ Validates time formats
- 📍 Preserves location consistency
- 🗓️ Checks for past events (skips unless explicitly requested)

---

## 📋 Supported Document Types

| Type | Examples | Notes |
|------|----------|-------|
| **Images** | JPEG, PNG, GIF, WebP | Photos or screenshots |
| **Schedules** | Sports calendars, class schedules | Tables, lists, or prose |
| **Flyers** | Event flyers, announcements | Printed or digital |
| **Screenshots** | Email, website, app screenshots | Any text-based content |
| **Handwritten** | Notes, agendas, reminders | Legible handwriting |
| **Tables** | Spreadsheet screenshots, timetables | Structured data |

---

## 🎨 Best Practices

### For Best Results:

✅ **DO**:
- Use clear, legible images
- Include year if available (helps with accuracy)
- Mention which calendar if ambiguous ("add to work calendar")
- Say "skip duplicates" if you're unsure about existing events
- Review proposals before confirming

❌ **AVOID**:
- Very blurry or low-resolution images
- Documents with "TBD" dates (Claude will skip these)
- Historical events (unless you explicitly request them)
- Extremely complex multi-page documents (break into smaller uploads)

---

## 🔧 Configuration Requirements

Before using this feature:

1. **Connect Google Calendar**:
   - Set up OAuth2 authentication (see `CALENDAR_SETUP.md`)
   - Grant calendar read/write permissions

2. **Configure Calendar Mappings** at `/calendar-config`:
   - Add at least one calendar mapping (e.g., "Family Calendar" → family)
   - Optionally mark a default calendar
   - Supported types: `family`, `personal`, `work`

3. **Start Chatting**:
   - Navigate to `/chat`
   - Upload document with 📎 button
   - Ask Claude to extract events!

---

## 🧪 Example Use Cases

### Use Case 1: Parent Managing Kids Activities
**Scenario**: Received email with spring soccer schedule (12 games, 24 practices)

**Old way**: Manually create 36 calendar entries (20+ minutes)

**New way**:
1. Screenshot email
2. Upload to Claude
3. Say "Add these"
4. Confirm proposal
5. Done in 30 seconds! ⚡

---

### Use Case 2: Professional Managing Work Schedule
**Scenario**: Conference agenda with 8 sessions over 3 days

**Old way**: Type each session, time, room number manually

**New way**:
1. Upload conference PDF screenshot
2. Claude extracts all sessions with locations
3. Routes to Work calendar automatically
4. Confirm and done!

---

### Use Case 3: Student Managing Academic Deadlines
**Scenario**: Syllabus with assignment due dates, exams, office hours

**Old way**: Create separate reminders for 15 deadlines

**New way**:
1. Upload syllabus screenshot
2. Claude extracts all deadlines and recurring office hours
3. Creates recurring event for weekly office hours
4. Adds all-day reminders for assignments
5. Everything organized in seconds!

---

## 🛡️ Duplicate Detection Deep Dive

### How Fuzzy Matching Works

Claude uses multi-factor matching to detect duplicates:

#### 1. **Name Similarity**
```
Input:     "Soccer Practice"
Existing:  "Soccer Training"
Match:     85% similar → ⚠️ Possible duplicate
```

#### 2. **Time Tolerance**
```
Input:     Meeting at 2:00 PM
Existing:  Meeting at 2:15 PM
Match:     Within ±2 hours → ⚠️ Possible duplicate
```

#### 3. **Date Tolerance**
```
Input:     Conference on Jan 15
Existing:  Conference on Jan 16
Match:     Within ±1 day → ⚠️ Possible duplicate
```

#### 4. **Recurring Pattern Awareness**
```
Input:     10 individual "Soccer Practice" events (Tuesdays)
Existing:  1 recurring "Soccer Practice" (Every Tuesday)
Match:     Recurring pattern detected → ⚠️ Skip creating duplicates
```

### Confidence Levels

| Confidence | Action |
|-----------|--------|
| **>90%** | Strong duplicate → Ask "Update existing or create new?" |
| **70-90%** | Possible duplicate → Flag in proposal, let user decide |
| **<70%** | Different events → Create both |

---

## 🎯 Advanced Features

### Batch Updates
Claude can also **update** existing events:
```
📅 PROPOSED CALENDAR UPDATES

🔄 Update: "Team Photos" (Feb 2)
   - Adding location: Central Field, Lot B
   - Adding description: Bring uniform, arrive 15 min early
```

### Conflict Detection
Claude identifies true conflicts:
```
⚠️ CONFLICT DETECTED

"Piano Recital" (Feb 15, 3-4pm)
overlaps with
"Basketball Game" (Feb 15, 3:30-5pm)

How should I proceed?
```

### Source Attribution
Events automatically include source in description:
```
Event: Soccer Practice
Description: Extracted from uploaded schedule on Nov 9, 2025
             Original source: "Spring Soccer Schedule 2025"
```

---

## 🔐 Privacy & Security

- ✅ All calendar operations require authentication (Clerk)
- ✅ Users can only access their own calendars
- ✅ Images processed in-memory (not stored permanently)
- ✅ OAuth tokens stored securely in PostgreSQL
- ✅ User confirmation required before any calendar modifications

---

## 🐛 Troubleshooting

### "No calendar mappings found"
**Solution**: Visit `/calendar-config` to set up calendar mappings

### "Failed to create event"
**Possible causes**:
- Calendar permissions insufficient (need write access)
- Invalid date/time format
- OAuth token expired (will auto-refresh)

### "Duplicate not detected"
**Note**: Fuzzy matching has a 70% threshold. If events differ significantly in name/time, they won't match.

### Image not recognized
**Tips**:
- Ensure image is clear and legible
- Try cropping to focus on calendar content
- Supported formats: JPEG, PNG, GIF, WebP

---

## 📚 Related Documentation

- **Setup Guide**: [`CALENDAR_SETUP.md`](./CALENDAR_SETUP.md) - Initial Google Calendar OAuth setup
- **CRUD Operations**: [`CALENDAR_CRUD_README.md`](./CALENDAR_CRUD_README.md) - Full calendar CRUD documentation
- **Project Overview**: [`CLAUDE.md`](./CLAUDE.md) - Complete application documentation

---

## 🚀 Future Enhancements

Potential future features:
- [ ] PDF document parsing (multi-page support)
- [ ] Excel/CSV import
- [ ] Email integration (auto-extract from Gmail)
- [ ] Conflict resolution strategies
- [ ] Undo/rollback batch operations
- [ ] Export extracted events to ICS format
- [ ] OCR improvements for handwritten notes
- [ ] Multi-language support

---

## 💡 Tips for Magical Experience

1. **Trust the intelligence**: Claude makes smart assumptions - you don't need to micro-manage
2. **Review proposals**: Always check the proposal before confirming (catch any misinterpretations)
3. **Use "skip duplicates"**: Safe default if unsure about existing events
4. **Break up large documents**: For 50+ events, upload in smaller batches
5. **Be specific about calendar**: Say "work calendar" if auto-selection might be ambiguous
6. **Include context**: "This is for next year" helps Claude infer correct years

---

## 🎉 Success Stories

> "I uploaded a crumpled flyer from my kid's backpack and had 30 soccer events on my calendar in under a minute. This is magic!" - Beta Tester

> "Conference schedule with 20 sessions across 3 days - done in 10 seconds instead of 20 minutes. Game changer!" - Professional User

> "The duplicate detection saved me from creating 'Soccer Practice' 15 times when I already had it as a recurring event. Smart!" - Parent User

---

**Built with ❤️ using Claude's vision and tool-use capabilities**

For questions or feedback, see the main project README.