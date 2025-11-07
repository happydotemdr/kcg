# Feature Breakdown Quick Reference

## 🚀 Quick Start

```
You: "I want to plan a new feature using the feature breakdown skill"
```

Answer 9 questions → Get detailed plan → Convert to todos → Start implementing

## 📝 The 9 Discovery Questions

| # | Topic | What to Think About |
|---|-------|-------------------|
| 1️⃣ | **Feature Overview** | What it does, problem it solves |
| 2️⃣ | **User Journey** | How users discover and use it |
| 3️⃣ | **Scope & Integration** | Which providers, UI changes, external APIs |
| 4️⃣ | **Data & Storage** | What to persist, per-user/global, DB/files |
| 5️⃣ | **Auth & Authorization** | Login required, permissions needed |
| 6️⃣ | **API Design** | New endpoints, RESTful/streaming |
| 7️⃣ | **UI/UX** | Modern/DOS theme, interactions, responsive |
| 8️⃣ | **Technical Constraints** | Performance, security, integrations |
| 9️⃣ | **Success Criteria** | How to know it works, what to test |

## 📦 What You Get

### Output File
`docs/features/[feature-name]-implementation-plan.md`

### Sections
- ✅ Acceptance criteria
- 🏗️ Architecture decisions
- 📦 Vertical slices (independently deliverable chunks)
- ✓ Atomic tasks (specific, testable actions)
- 🧪 Testing strategy
- 🤖 Agent recommendations
- 📋 TodoWrite format

## 🔄 Implementation Workflow

```
1. Generate Plan          → Answer 9 questions
2. Review Plan           → Understand slices & dependencies
3. Start with Slice 1    → Usually foundation/types
4. Convert to Todos      → Use TodoWrite format section
5. Implement Tasks       → One at a time, validate each
6. Test the Slice        → Verify user value delivered
7. Next Slice            → Repeat steps 4-6
```

## 🎯 Vertical Slice Structure

Each slice contains:

```markdown
### Slice N: [Name]
**Goal**: What this delivers
**Value**: User benefit
**Dependencies**: What comes first
**Can Run in Parallel With**: Other slices

#### Atomic Tasks
- [ ] Specific task
  - Why: Rationale
  - File: path/to/file.ts:123
  - Validation: How to verify
```

## ✅ Task Anatomy

Each atomic task has:
- **Clear Action**: Create, modify, delete
- **File Path**: Exact location
- **Rationale**: Why it's needed
- **Validation**: How to test

## 🤖 Agent Recommendations

| Agent | Use For |
|-------|---------|
| **Explore** | Research before slices, find patterns |
| **Task** | Complex multi-file changes |
| **Plan** | Refine complex slices |

## 📋 TodoWrite Format

From the plan, copy JSON and use TodoWrite:

```json
{
  "content": "Create API endpoint in src/pages/api/foo.ts",
  "status": "pending",
  "activeForm": "Creating API endpoint"
}
```

## 💡 Pro Tips

### During Discovery
- ✅ Be specific about workflows
- ✅ Mention existing features to integrate with
- ✅ Think about edge cases
- ✅ Reference similar features
- ❌ Don't rush or skip questions

### During Implementation
- ✅ Complete slices fully before moving on
- ✅ Test after each task and slice
- ✅ Follow dependency order
- ✅ Use recommended agents
- ❌ Don't skip ahead or batch todos

### Task Management
- ✅ One slice at a time
- ✅ One task in_progress
- ✅ Mark complete immediately
- ❌ Don't load all tasks upfront

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Vague questions | Provide more context in initial request |
| Plan doesn't match vision | Ask for revisions during/after discovery |
| Slices too large | Ask to split into smaller slices |
| Dependencies unclear | Ask for clarification |
| Tasks too abstract | Request specific file changes |

## 📐 Architecture Patterns

The skill understands these existing patterns:

### Provider Structure
- `/api/chat/*` for Claude
- `/api/gpt/*` for ChatGPT
- Separate storage per provider

### UI Themes
- `components/chat/*` - Modern theme (Claude)
- `components/gpt/*` - DOS theme (ChatGPT)

### Authentication
- All protected routes use Clerk
- `locals.auth()` function pattern

### Storage
- File-based JSON by default
- PostgreSQL for OAuth tokens
- Per-user data separation

## 📊 Complexity Guide

| Complexity | Slices | Time | Example |
|-----------|--------|------|---------|
| Low | 1-3 | Hours | Dark mode toggle |
| Medium | 4-6 | Days | Favorites feature |
| High | 7+ | Week+ | Real-time collaboration |

## 🎯 Feature Size Guidelines

### Small Enhancement (1-3 slices)
- UI tweaks
- Simple data additions
- Minor integrations

**Example**: Add timestamp to messages

### Medium Feature (4-6 slices)
- New user-facing feature
- API + UI components
- Moderate integration

**Example**: Export conversations to PDF

### Large Feature (7+ slices)
- Complex interactions
- Multiple system changes
- Significant architecture

**Example**: Multi-user collaboration

## 📚 Additional Resources

- **Full Guide**: [FEATURE-BREAKDOWN-GUIDE.md](./FEATURE-BREAKDOWN-GUIDE.md)
- **Example Plan**: [docs/features/EXAMPLE-favorite-responses-implementation-plan.md](./features/EXAMPLE-favorite-responses-implementation-plan.md)
- **Skill File**: `.claude/skills/feature-breakdown.md`
- **Project Docs**: [CLAUDE.md](../CLAUDE.md)

## 🔗 Key Commands

### Invoke Skill
```
"I want to plan a new feature using the feature breakdown skill"
```

### Request Revisions
```
"Can you revise Slice 3 to use WebSockets instead of polling?"
```

### Break Down Further
```
"Slice 4 seems complex. Can you split it into two smaller slices?"
```

### Convert to Todos
```
"Let's implement Slice 1. Convert those tasks to todos."
```

### Use Agents
```
"Use the Explore agent to research existing patterns before Slice 2."
```

## ⚡ Speed Tips

1. **Prepare Answers**: Think through questions before invoking skill
2. **Batch Questions**: If multiple features, plan them all in one session
3. **Reuse Patterns**: Reference the example plan structure
4. **Parallel Slices**: Identify and implement parallel slices concurrently
5. **Agent Usage**: Delegate research and complex tasks to specialized agents

## 🎓 Learning Path

1. **First Time**: Read the full guide, try a small feature
2. **Second Time**: Use this quick reference, try a medium feature
3. **Expert**: Customize questions, tackle large features

---

**Ready?** Just say: *"I want to plan a new feature"* 🚀
