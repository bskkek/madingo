# Implementation Plan - Professor Worksheet Challenge Extraction & Randomization

## User Requests & Requirements
1. **Empty Challenge Rooms by Default**: Challenge rooms must start completely empty without any pre-loaded or dummy default exercises. Exercises must be loaded exclusively from the professor's uploaded worksheet.
2. **Professor Worksheet Upload (Image or PDF)**: Professors can upload image or PDF files of their worksheets. The system uses Gemini multimodal processing to extract all exercises from the document.
3. **Randomized Correct Answer Shuffling**: Correct answers must not be fixed in the first box (`index 0`). They will be randomly shuffled across all 4 options for each question to prevent students from guessing based on position.
4. **Visual Progress Indicator**: Display a clear visual progress indicator in the challenge window showing remaining exercises from the loaded professor's sheet.

---

## Proposed Changes

### 1. Backend (`server.ts` & AI extraction endpoint)
- Update default room initialization or room creation endpoints so that newly created rooms start with `0` questions (`questions: []`), removing pre-seeded dummy sample questions (`room-madi-101`).
- Ensure `/api/arena/extract-worksheet` endpoint accepts uploaded worksheet images/PDFs (multipart form data or base64), sends them to Gemini 2.5/3.5 Flash with prompt instructions to:
  - Extract **all** exercises present in the document.
  - For each exercise, provide 4 options and randomly place the correct answer across indices 0, 3 (shuffling/randomizing `correctIndex`).
- Return the extracted array of exercises with randomized correct answer positions.

### 2. Frontend (`src/components/AIClassroomArenaView.tsx` & `src/lib/arenaEngine.ts`)
- **Worksheet Upload UI**: Add a dedicated upload zone in the Challenge Arena for professors to upload worksheet images (PNG/JPEG) or PDFs. Show parsing/loading state during extraction.
- **Empty State**: Display a clean empty state when no worksheet has been uploaded yet, explaining that the arena starts empty until the professor uploads a worksheet.
- **Randomization Assurance**: In `arenaEngine.ts` / extraction parser, verify that `correctIndex` is randomized so correct answers appear uniformly across indices 0, 1, 2, and 3.
- **Visual Progress Indicator**: Add a prominent progress bar and counter (e.g., "Exercise 2 of 5 remaining" or progress percentage) in the active challenge window.

---

## Verification Plan
- **Automated Tests**: Run existing arena unit tests (`npx tsx --test src/tests/arena.test.ts`) and add/verify new tests for worksheet extraction and option randomization.
- **Build & Lint**: Run `compile_applet` and `lint_applet` to verify zero TypeScript/lint errors.
