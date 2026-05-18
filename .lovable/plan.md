text
1. Problem Analysis & Strategic Proposal
The current inline customization approach in the Quote Builder is suffering from cognitive overload. Sellers need to focus on one thing at a time: either the overall quote structure or the technical details of a specific product.

Strategy: "Context-Isolated Configuration"
Instead of expanding a complex form inside the item list, we will implement a dedicated configuration modal/overlay. This follows the "Progressive Disclosure" design pattern—showing complex options only when necessary.

2. Design Changes
- Modal Interface: A full-screen or large dialog dedicated to a single product's customization.
- Layout: Split view in the modal. Left side for Product Preview/Basic Info, Right side for the 3-Step Customization Flow (Local -> Technique -> Size).
- Visual Hierarchy: The main quote screen stays "clean" with just a summary of the customization, while the modal handles the "heavy lifting".

3. Technical Implementation Steps
- Component Refactoring: Convert `ProductCustomizationOptions.tsx` into a modal-based component `ProductCustomizationModal.tsx`.
- State Management: Update `useQuoteItems.ts` to provide a clear way to trigger the "Configuration Mode" for a specific item.
- UI Update: In `QuoteProductCustomization.tsx`, replace the inline expansion with a "Customize" button that launches the modal.
- Transition: Use Framer Motion for a smooth "zoom-in" effect when opening the configuration for a product.

4. Deliverables
- ProductCustomizationModal.tsx: The new isolated configuration environment.
- Updated Quote Builder UI: Cleaner item list with clear call-to-actions for customization.
- UX Refinement: Auto-opening the modal for new items (optional based on preference) to maintain workflow speed.
