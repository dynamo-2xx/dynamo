
-- =====================================================
-- 1. Fix debates table: Drop all SELECT/UPDATE policies
-- =====================================================

DROP POLICY IF EXISTS "Public debates are viewable by everyone" ON public.debates;
DROP POLICY IF EXISTS "Participants can view their debates" ON public.debates;
DROP POLICY IF EXISTS "Creators can update their debates" ON public.debates;

-- New PERMISSIVE SELECT: any authenticated user can see debates
CREATE POLICY "Authenticated users can view debates"
ON public.debates
FOR SELECT
TO authenticated
USING (true);

-- New PERMISSIVE UPDATE: creator OR participant can update
CREATE POLICY "Creator or participant can update debates"
ON public.debates
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.debate_id = id AND dp.user_id = auth.uid()
  )
);

-- =====================================================
-- 2. Fix debate_participants SELECT to avoid recursion
-- =====================================================

DROP POLICY IF EXISTS "Participants visible with debate" ON public.debate_participants;

CREATE POLICY "Authenticated users can view participants"
ON public.debate_participants
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 3. Fix debate_sides SELECT to avoid recursion
-- =====================================================

DROP POLICY IF EXISTS "Sides visible with debate" ON public.debate_sides;

CREATE POLICY "Authenticated users can view sides"
ON public.debate_sides
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 4. Fix debate_subtopics SELECT to avoid recursion
-- =====================================================

DROP POLICY IF EXISTS "Subtopics visible with debate" ON public.debate_subtopics;

CREATE POLICY "Authenticated users can view subtopics"
ON public.debate_subtopics
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- 5. Fix arguments policies
-- =====================================================

DROP POLICY IF EXISTS "Arguments visible with debate" ON public.arguments;
DROP POLICY IF EXISTS "Participants can edit their arguments" ON public.arguments;

-- SELECT: any authenticated user
CREATE POLICY "Authenticated users can view arguments"
ON public.arguments
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: participant can edit only during edit window
CREATE POLICY "Authors can edit arguments during edit window"
ON public.arguments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.id = arguments.participant_id
      AND dp.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = arguments.debate_id
      AND d.status = 'completed'
      AND now() < d.edit_window_ends_at
  )
);

-- =====================================================
-- 6. Fix round_summaries SELECT to avoid recursion
-- =====================================================

DROP POLICY IF EXISTS "Round summaries visible with debate" ON public.round_summaries;

CREATE POLICY "Authenticated users can view round summaries"
ON public.round_summaries
FOR SELECT
TO authenticated
USING (true);

-- Fix round_summaries INSERT to avoid recursion
DROP POLICY IF EXISTS "System can insert summaries" ON public.round_summaries;

CREATE POLICY "Creator can insert summaries"
ON public.round_summaries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.debate_participants dp
    WHERE dp.debate_id = round_summaries.debate_id
      AND dp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.debates d
    WHERE d.id = round_summaries.debate_id
      AND d.created_by = auth.uid()
  )
);
