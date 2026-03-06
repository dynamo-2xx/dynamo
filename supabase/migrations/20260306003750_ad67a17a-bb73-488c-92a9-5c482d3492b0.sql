-- Drop restrictive policies on profiles and recreate as permissive
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING ((is_public = true) OR (auth.uid() = user_id));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix debates policies
DROP POLICY IF EXISTS "Public debates are viewable by everyone" ON public.debates;
DROP POLICY IF EXISTS "Authenticated users can create debates" ON public.debates;
DROP POLICY IF EXISTS "Creators can update their debates" ON public.debates;
DROP POLICY IF EXISTS "Creators can delete their debates" ON public.debates;

CREATE POLICY "Public debates are viewable by everyone"
  ON public.debates FOR SELECT
  USING ((is_public = true) OR (auth.uid() = created_by));

CREATE POLICY "Authenticated users can create debates"
  ON public.debates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their debates"
  ON public.debates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their debates"
  ON public.debates FOR DELETE
  USING (auth.uid() = created_by);

-- Fix debate_sides policies
DROP POLICY IF EXISTS "Sides visible with debate" ON public.debate_sides;
DROP POLICY IF EXISTS "Debate creators can manage sides" ON public.debate_sides;
DROP POLICY IF EXISTS "Debate creators can update sides" ON public.debate_sides;
DROP POLICY IF EXISTS "Debate creators can delete sides" ON public.debate_sides;

CREATE POLICY "Sides visible with debate"
  ON public.debate_sides FOR SELECT
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_sides.debate_id AND (d.is_public = true OR auth.uid() = d.created_by)));

CREATE POLICY "Debate creators can manage sides"
  ON public.debate_sides FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_sides.debate_id AND auth.uid() = d.created_by));

CREATE POLICY "Debate creators can update sides"
  ON public.debate_sides FOR UPDATE
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_sides.debate_id AND auth.uid() = d.created_by));

CREATE POLICY "Debate creators can delete sides"
  ON public.debate_sides FOR DELETE
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_sides.debate_id AND auth.uid() = d.created_by));

-- Fix debate_subtopics policies
DROP POLICY IF EXISTS "Subtopics visible with debate" ON public.debate_subtopics;
DROP POLICY IF EXISTS "Debate creators can manage subtopics" ON public.debate_subtopics;
DROP POLICY IF EXISTS "Debate creators can update subtopics" ON public.debate_subtopics;
DROP POLICY IF EXISTS "Debate creators can delete subtopics" ON public.debate_subtopics;

CREATE POLICY "Subtopics visible with debate"
  ON public.debate_subtopics FOR SELECT
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_subtopics.debate_id AND (d.is_public = true OR auth.uid() = d.created_by)));

CREATE POLICY "Debate creators can manage subtopics"
  ON public.debate_subtopics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_subtopics.debate_id AND auth.uid() = d.created_by));

CREATE POLICY "Debate creators can update subtopics"
  ON public.debate_subtopics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_subtopics.debate_id AND auth.uid() = d.created_by));

CREATE POLICY "Debate creators can delete subtopics"
  ON public.debate_subtopics FOR DELETE
  USING (EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_subtopics.debate_id AND auth.uid() = d.created_by));

-- Fix debate_participants policies
DROP POLICY IF EXISTS "Participants visible with debate" ON public.debate_participants;
DROP POLICY IF EXISTS "Users can join debates" ON public.debate_participants;
DROP POLICY IF EXISTS "Users can leave debates" ON public.debate_participants;

CREATE POLICY "Participants visible with debate"
  ON public.debate_participants FOR SELECT
  USING ((EXISTS (SELECT 1 FROM debates d WHERE d.id = debate_participants.debate_id AND (d.is_public = true OR auth.uid() = d.created_by))) OR auth.uid() = user_id);

CREATE POLICY "Users can join debates"
  ON public.debate_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave debates"
  ON public.debate_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Fix arguments policies
DROP POLICY IF EXISTS "Arguments visible with debate" ON public.arguments;
DROP POLICY IF EXISTS "Participants can add arguments" ON public.arguments;
DROP POLICY IF EXISTS "Participants can edit their arguments" ON public.arguments;

CREATE POLICY "Arguments visible with debate"
  ON public.arguments FOR SELECT
  USING ((EXISTS (SELECT 1 FROM debates d WHERE d.id = arguments.debate_id AND (d.is_public = true OR auth.uid() = d.created_by))) OR (EXISTS (SELECT 1 FROM debate_participants dp WHERE dp.debate_id = arguments.debate_id AND dp.user_id = auth.uid())));

CREATE POLICY "Participants can add arguments"
  ON public.arguments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM debate_participants dp WHERE dp.id = arguments.participant_id AND dp.user_id = auth.uid()));

CREATE POLICY "Participants can edit their arguments"
  ON public.arguments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM debate_participants dp WHERE dp.id = arguments.participant_id AND dp.user_id = auth.uid()));

-- Fix debate_templates policies
DROP POLICY IF EXISTS "Public templates viewable by everyone" ON public.debate_templates;
DROP POLICY IF EXISTS "Users can create templates" ON public.debate_templates;
DROP POLICY IF EXISTS "Users can update their templates" ON public.debate_templates;
DROP POLICY IF EXISTS "Users can delete their templates" ON public.debate_templates;

CREATE POLICY "Public templates viewable by everyone"
  ON public.debate_templates FOR SELECT
  USING ((is_public = true) OR (auth.uid() = created_by));

CREATE POLICY "Users can create templates"
  ON public.debate_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their templates"
  ON public.debate_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their templates"
  ON public.debate_templates FOR DELETE
  USING (auth.uid() = created_by);