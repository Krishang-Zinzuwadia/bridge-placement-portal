# Final design review

Applied `design-taste-frontend` and `redesign-existing-projects` from Leonxlnx/taste-skill. Mode: preserve the forest/ivory brand and all existing role workflows. Design read: a campus recruitment platform for students and institutional hiring teams, with a calm editorial public experience and task-focused role workspaces.

Design dials: DESIGN_VARIANCE 6, MOTION_INTENSITY 3, VISUAL_DENSITY 3 for the landing page; density 6 for operational tables. The product’s three role comparisons remain parallel because they describe three equal permission boundaries. Status colors preserve their semantic meanings. Native CSS remains the established styling system; React, Vite, Lucide, and Cloudflare Workers are retained.

Audit fixes: simplify hero to two lines and one primary intent; remove decorative hero captions/avatars and repeated eyebrows; use asymmetrical feature cells; unbox role comparisons; unify landing surfaces; use the same display family for emphasis; increase supporting text contrast/size; add tabular numerals, pressed states, skip navigation, helpful 404, theme controls, modal focus trapping and Escape; self-host variable fonts with licenses; reserve hero dimensions; preserve reduced-motion behavior and mobile stacking.

## Generated hero asset

Built-in imagegen output is copied to `public/hero-bridge.png`. It is an illustrative sculpture, not a photograph of an actual university. No external image service is required at runtime.

Final prompt: "Use case: stylized-concept. Asset type: square hero illustration for CampusBridge, a premium campus placement website. Create a sophisticated photorealistic 3D architectural sculpture: one monumental ivory travertine arch spanning an elegant broad staircase, connecting two forest-green landscaped platforms. The stairs lead upward through the arch to a sunlit future, with one tiny stylized student figure carrying a satchel for human scale, and restrained small sculptural olive trees. Isometric three-quarter view, softly bevelled stone, believable detailed surface texture, studio-quality global illumination and ambient shadows, serene editorial art direction. Pale sage green seamless background #e4ebce, ivory limestone, muted olive foliage, deep forest green platform. Entire sculpture comfortably centered with generous negative space, no cutoff. A single coherent architectural scene, premium Blender/Cinema4D product render, understated and believable, not a cartoon or vector. No text, no UI cards, no watermarks, no logos. Square composition."

Verification: TypeScript and Vite build; automated Worker/rule suite; browser checks covering login, student application persistence, direct role-route protection, recruiter batch updates, admin approval/audit attribution, mobile overflow and theme changes. Browser logs were checked for errors. Lighthouse/Core Web Vitals were not measured; no performance score is claimed.
