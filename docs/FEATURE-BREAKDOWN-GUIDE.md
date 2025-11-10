# Feature Breakdown System Guide

## Overview

The Feature Breakdown System is a repeatable, reliable workflow for transforming feature ideas into detailed, actionable implementation plans. It uses a Claude skill to guide you through discovery, analysis, and breakdown of features into atomic tasks ready for implementation.

## Table of Contents
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Using the Skill](#using-the-skill)
- [Understanding the Output](#understanding-the-output)
- [From Plan to Implementation](#from-plan-to-implementation)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- Claude Code session with the Keep Choosing Good codebase
- Feature idea or enhancement in mind
- 10-15 minutes for the guided discovery process

### Basic Usage

1. **Invoke the skill** (when skill system is available):
   ```
   You: "I want to plan a new feature using the feature breakdown skill"
   ```

2. **Answer discovery questions**: The skill will guide you through 9 key questions about your feature

3. **Review the generated plan**: A comprehensive markdown file will be created in `docs/features/`

4. **Convert to todos**: Use the generated atomic tasks to create Claude todo lists

5. **Start implementing**: Work through vertical slices one at a time

## How It Works

### The Four Phases

```mermaid
graph LR
    A[Discovery] --> B[Analysis]
    B --> C[Slicing]
    C --> D[Atomization]
    D --> E[Implementation]
```

#### Phase 1: Discovery (Interactive)
Claude asks you **9 strategic questions** to understand:
- What the feature does
- Who uses it and why
- How it integrates with existing systems
- What data it needs
- What UI/UX is required
- Technical constraints
- Success criteria

**Time**: 5-10 minutes
**Your Role**: Provide clear, thoughtful answers

#### Phase 2: Analysis (Automated)
Claude analyzes the codebase to determine:
- Which files need modification
- What new files to create
- Integration points with existing features
- Dependencies and breaking changes
- Patterns to reuse or establish

**Time**: 2-3 minutes
**Your Role**: Review findings, provide clarifications if needed

#### Phase 3: Vertical Slicing (Automated)
Claude breaks the feature into **independently deliverable slices**:
- Each slice delivers user value
- Slices follow dependency order
- Parallelizable slices are identified
- Typical structure: Foundation → API → UI → Integration → Polish

**Time**: 2-3 minutes
**Your Role**: Review slices, adjust priorities if needed

#### Phase 4: Task Atomization (Automated)
Each slice is broken into **atomic tasks**:
- Specific, testable, independent actions
- Clear file paths and line numbers
- Rationale and validation criteria
- Dependencies clearly marked

**Time**: 2-3 minutes
**Your Role**: Ready to implement!

## Using the Skill

### Invoking the Skill

**Method 1: Direct Request**
```
You: "I want to add a new feature. Let's use the feature breakdown skill to plan it."
```

**Method 2: Skill Command** (when available)
```
You: /skill feature-breakdown
```

### The Discovery Questions

You'll be asked 9 questions across different domains:

#### 1. Feature Overview
- What feature are you adding?
- What problem does it solve?

**Example Answer**:
```
I want to add the ability for users to export their chat conversations
to PDF format so they can save and share important discussions offline.
```

#### 2. User Journey
- How do users discover and use this feature?
- What triggers its use?

**Example Answer**:
```
Users would see an "Export" button in the conversation sidebar. When clicked,
it generates a PDF of the current conversation with formatting preserved.
They trigger this when they want to save or share a conversation.
```

#### 3. Scope & Integration
- Which AI provider(s)?
- New or modified UI components?
- External service integrations?

**Example Answer**:
```
Claude chat interface. We'll add a new button to the sidebar component.
We'll use a PDF library (probably jsPDF) to generate the PDFs client-side.
```

#### 4. Data & Storage
- What data needs persistence?
- Per-user, per-conversation, or global?
- Database or file storage?

**Example Answer**:
```
No new persistent data needed. The feature reads existing conversation data
and generates PDFs on-demand. Everything is per-conversation.
```

#### 5. Authentication & Authorization
- Requires authentication?
- Special permissions?

**Example Answer**:
```
Yes, users can only export their own conversations. Use existing Clerk auth.
No special permissions needed beyond being logged in.
```

#### 6. API Design
- New API endpoints?
- RESTful, streaming, or both?

**Example Answer**:
```
We could do client-side generation (no API) or server-side. Let's discuss
options - maybe POST /api/export/conversation with conversation ID in body.
```

#### 7. UI/UX Requirements
- Visual design (modern/DOS/both)?
- UI interactions?
- Mobile and desktop?

**Example Answer**:
```
Both themes. Modern theme: Clean "Export PDF" button with download icon.
DOS theme: ASCII art button that fits the terminal aesthetic.
Should work on mobile and desktop.
```

#### 8. Technical Constraints
- Performance requirements?
- Security/privacy considerations?
- Integration with existing features?

**Example Answer**:
```
PDFs should generate within 2-3 seconds for typical conversations.
Ensure user can't export other users' conversations.
Should preserve markdown formatting, code blocks, and message structure.
```

#### 9. Success Criteria
- How do we know it's working?
- What should we test?

**Example Answer**:
```
Success means:
- PDF generates correctly with all messages
- Formatting is preserved (code blocks, markdown)
- Both themes work
- Mobile and desktop work
- Can't export unauthorized conversations
```

### Tips for Great Answers

✅ **DO:**
- Be specific about user workflows
- Mention existing features to integrate with
- Think about edge cases
- Consider both happy path and error scenarios
- Reference similar features in the app

❌ **DON'T:**
- Give vague answers like "make it work"
- Skip questions (each informs the plan)
- Assume Claude knows your unstated requirements
- Rush through discovery

### After Discovery

Once all questions are answered, Claude will:

1. **Analyze the codebase** (you'll see tool usage)
2. **Generate the implementation plan**
3. **Save to** `docs/features/[feature-name]-implementation-plan.md`
4. **Present a summary**
5. **Ask if you want to convert the first slice to todos**

## Understanding the Output

### Implementation Plan Structure

The generated markdown file contains:

#### Executive Summary
Quick overview of the feature, complexity, and scope

```markdown
## Executive Summary
- **Feature**: Export Conversations to PDF
- **Problem**: Users want to save conversations offline
- **Scope**: Claude chat interface
- **Complexity**: Medium
- **Estimated Slices**: 4
```

#### Requirements Summary
User stories, acceptance criteria, technical requirements

#### Architecture Overview
Files to modify, files to create, architectural decisions

#### Vertical Slices (The Heart of the Plan)
Each slice contains:
- **Goal**: What this slice delivers
- **Value**: User-visible benefit
- **Dependencies**: What must be done first
- **Atomic Tasks**: 3-7 specific, testable tasks

**Example Slice**:
```markdown
### Slice 2: Export API Endpoint
**Goal**: Create backend API for PDF generation
**Value**: Server-side PDF generation with proper auth
**Dependencies**: Slice 1 (PDF generation utility)
**Can Run in Parallel With**: None (needed for slice 3)

#### Atomic Tasks
- [ ] Create POST /api/export/conversation endpoint
  - Why: Handle PDF generation requests
  - File: `src/pages/api/export/conversation.ts`
  - Validation: Returns PDF blob with correct headers

- [ ] Add Clerk authentication check
  - Why: Only allow exporting own conversations
  - File: `src/pages/api/export/conversation.ts:10`
  - Validation: Returns 401 for unauthorized requests

- [ ] Validate conversation ownership
  - Why: Prevent exporting other users' data
  - File: `src/pages/api/export/conversation.ts:25`
  - Validation: Returns 403 if user doesn't own conversation
```

#### Testing Strategy
Unit, integration, and manual testing checklists

#### Rollout Plan
Phased approach to implementation

#### Risk Assessment
Technical and UX risks with mitigations

#### Agent Assignment Recommendations
Which Claude agents to use for which tasks

#### TodoWrite Format
JSON format ready to paste into TodoWrite tool

## From Plan to Implementation

### Step 1: Review the Plan

Read through the entire plan:
- Understand the slice structure
- Note dependencies
- Identify slices that can run in parallel
- Question anything unclear

### Step 2: Choose Your Starting Slice

Usually **Slice 1** (Foundation), but consider:
- Can any slices truly run in parallel?
- Do you want to prototype the UI first?
- Are there research tasks to do first?

### Step 3: Convert to Todos

**Option A: Use TodoWrite Directly**
```javascript
// From the plan's TodoWrite Format section
TodoWrite({
  todos: [
    {
      content: "Create PDF generation utility in src/lib/pdf-export.ts",
      status: "pending",
      activeForm: "Creating PDF generation utility"
    },
    {
      content: "Add jsPDF and html2canvas dependencies",
      status: "pending",
      activeForm: "Adding PDF generation dependencies"
    },
    // ... more tasks
  ]
})
```

**Option B: Ask Claude**
```
You: "Let's implement Slice 1. Please convert those tasks to todos and start working on them."
```

### Step 4: Implement Tasks

Work through todos one at a time:
1. Read the task details from the plan
2. Implement the change
3. Validate according to the criteria
4. Mark as complete
5. Move to next task

### Step 5: Test the Slice

After completing all tasks in a slice:
- Run the validation steps from each task
- Test the user-facing value the slice delivers
- Check integration points
- Fix any issues before moving to next slice

### Step 6: Repeat for Next Slice

Continue with the next slice in dependency order

## Best Practices

### During Discovery

1. **Take Your Time**: Don't rush through questions
2. **Think Holistically**: Consider the entire user journey
3. **Reference Existing Patterns**: Mention similar features
4. **Be Realistic**: Acknowledge constraints and unknowns
5. **Ask for Clarification**: If a question is unclear, ask

### During Implementation

1. **Follow the Plan**: Trust the vertical slice structure
2. **Complete Slices Fully**: Don't skip ahead
3. **Test Incrementally**: Validate after each task and slice
4. **Update the Plan**: If you discover issues, note them
5. **Communicate Changes**: Tell Claude if you deviate from the plan

### Working with Agents

The plan includes agent recommendations. Use them!

**Explore Agent**: Research before slices
```
You: "Before starting Slice 3, let's use the Explore agent to find existing
button components with loading states."
```

**Task Agent**: Complex multi-file changes
```
You: "Use the Task agent to implement Slice 4, which touches multiple files."
```

**Plan Agent**: Refine complex slices
```
You: "Slice 5 seems complex. Use the Plan agent to break it down further."
```

### Todo Management

1. **One Slice at a Time**: Don't load all tasks upfront
2. **Mark Complete Immediately**: Don't batch completions
3. **One In Progress**: Only one task should be in_progress
4. **Clear Descriptions**: Task content should be actionable

## Examples

### Example 1: Small Enhancement

**Feature**: Add dark mode toggle to settings

**Discovery Time**: 5 minutes (simple feature)

**Generated Slices**: 3
1. Add dark mode state management
2. Create toggle component
3. Update existing components for theming

**Implementation Time**: ~2 hours

**Key Takeaway**: Even small features benefit from structured planning

### Example 2: Medium Feature

**Feature**: Favorite chat responses (see EXAMPLE file)

**Discovery Time**: 10 minutes

**Generated Slices**: 6
1. Types & storage foundation
2. API endpoints
3. Favorite button component
4. Favorites list components
5. Favorites pages
6. Navigation integration

**Implementation Time**: ~1 day

**Key Takeaway**: Vertical slices enable parallel work and incremental delivery

### Example 3: Large Feature

**Feature**: Multi-user collaboration on conversations

**Discovery Time**: 15 minutes (complex integration)

**Generated Slices**: 10+
- Real-time sync (WebSockets)
- Permissions system
- Conflict resolution
- UI indicators
- Notifications
- ... and more

**Implementation Time**: ~1 week

**Key Takeaway**: Complex features need careful architecture analysis

## Troubleshooting

### Problem: Questions are too vague

**Solution**: Provide more context in your initial request
```
Instead of: "I want a new feature"
Try: "I want to add real-time typing indicators to the chat, similar to
Slack's approach"
```

### Problem: Generated plan doesn't match my vision

**Solution**:
1. Clarify during discovery questions
2. After plan is generated, ask for revisions:
   ```
   You: "The plan looks good, but I'd like to use WebSockets instead of
   polling for Slice 3. Can you revise that slice?"
   ```

### Problem: Slices seem too large

**Solution**: Ask to break them down further
```
You: "Slice 4 has 10 tasks. Can you split it into two smaller slices?"
```

### Problem: Dependencies are unclear

**Solution**: Ask for clarification
```
You: "Why does Slice 5 depend on Slice 3? Can they run in parallel?"
```

### Problem: Tasks are too abstract

**Solution**: Ask for more specificity
```
You: "The task 'Update frontend' is vague. Can you break this into
specific file changes?"
```

## Advanced Usage

### Custom Discovery Questions

If the default 9 questions don't cover your needs:
```
You: "Before we start the standard questions, I need to address some
custom concerns about [topic]. Can we discuss those first?"
```

### Iterative Planning

For very large features, plan incrementally:
```
You: "Let's plan an MVP version first with just core functionality,
then plan enhancements separately."
```

### Collaborative Planning

Share the generated plan with your team:
1. Export to PDF
2. Get feedback on slices and priorities
3. Revise the plan based on input
4. Reconvert to todos

### Integration with Project Management

The vertical slices and atomic tasks map well to:
- **Jira Epics/Stories**: Each slice = Story
- **GitHub Issues**: Each slice = Issue with task checklist
- **Linear Issues**: Each slice = Issue

---

## Skill File Location

The skill is defined in:
```
.claude/skills/feature-breakdown.md
```

You can customize the skill by editing this file.

## Output Location

Generated plans are saved to:
```
docs/features/[feature-name]-implementation-plan.md
```

## Next Steps

Ready to try it out?

1. Think of a feature you want to add
2. Invoke the feature breakdown skill
3. Answer the discovery questions
4. Review the generated plan
5. Start implementing!

---

## Need Help?

- **Skill not working?**: Check that `.claude/skills/feature-breakdown.md` exists
- **Questions unclear?**: Ask for clarification during discovery
- **Plan doesn't fit?**: Request revisions after generation
- **Implementation issues?**: Refer back to the plan's validation criteria

Happy building! 🚀
