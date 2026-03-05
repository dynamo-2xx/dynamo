
-- =============================================
-- DYNAMO DATABASE SCHEMA
-- =============================================

-- 1. Utility: updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. App role enum for user roles
CREATE TYPE public.app_role AS ENUM ('personal', 'education', 'community');

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  affiliation TEXT,
  location TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  role app_role NOT NULL DEFAULT 'personal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Debate status enum
CREATE TYPE public.debate_status AS ENUM ('draft', 'scheduled', 'live', 'completed', 'archived');

-- 5. Debates table
CREATE TABLE public.debates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  status debate_status NOT NULL DEFAULT 'draft',
  turns_per_subtopic INT NOT NULL DEFAULT 2,
  time_per_turn TEXT NOT NULL DEFAULT '2 min',
  join_code TEXT UNIQUE,
  facilitator_type TEXT NOT NULL DEFAULT 'ai' CHECK (facilitator_type IN ('ai', 'human')),
  facilitator_user_id UUID REFERENCES auth.users(id),
  community_tag TEXT,
  institution_tag TEXT,
  topic_category TEXT,
  location TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  edit_window_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public debates are viewable by everyone"
  ON public.debates FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create debates"
  ON public.debates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their debates"
  ON public.debates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their debates"
  ON public.debates FOR DELETE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_debates_updated_at
  BEFORE UPDATE ON public.debates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Debate subtopics
CREATE TABLE public.debate_subtopics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debate_subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subtopics visible with debate"
  ON public.debate_subtopics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id
    AND (d.is_public = true OR auth.uid() = d.created_by)
  ));

CREATE POLICY "Debate creators can manage subtopics"
  ON public.debate_subtopics FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id AND auth.uid() = d.created_by
  ));

CREATE POLICY "Debate creators can update subtopics"
  ON public.debate_subtopics FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id AND auth.uid() = d.created_by
  ));

CREATE POLICY "Debate creators can delete subtopics"
  ON public.debate_subtopics FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id AND auth.uid() = d.created_by
  ));

-- 7. Debate sides
CREATE TABLE public.debate_sides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debate_sides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sides visible with debate"
  ON public.debate_sides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id
    AND (d.is_public = true OR auth.uid() = d.created_by)
  ));

CREATE POLICY "Debate creators can manage sides"
  ON public.debate_sides FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id AND auth.uid() = d.created_by
  ));

CREATE POLICY "Debate creators can update sides"
  ON public.debate_sides FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id AND auth.uid() = d.created_by
  ));

CREATE POLICY "Debate creators can delete sides"
  ON public.debate_sides FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id AND auth.uid() = d.created_by
  ));

-- 8. Debate participants
CREATE TABLE public.debate_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side_id UUID REFERENCES public.debate_sides(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(debate_id, user_id)
);

ALTER TABLE public.debate_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants visible with debate"
  ON public.debate_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id
    AND (d.is_public = true OR auth.uid() = d.created_by)
  ) OR auth.uid() = user_id);

CREATE POLICY "Users can join debates"
  ON public.debate_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave debates"
  ON public.debate_participants FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Arguments (argument map)
CREATE TABLE public.arguments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  subtopic_id UUID REFERENCES public.debate_subtopics(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES public.debate_participants(id) ON DELETE SET NULL,
  parent_argument_id UUID REFERENCES public.arguments(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  original_content TEXT,
  argument_type TEXT NOT NULL DEFAULT 'claim' CHECK (argument_type IN ('claim', 'counter', 'support', 'quote', 'stake')),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.arguments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arguments visible with debate"
  ON public.arguments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.debates d WHERE d.id = debate_id
    AND (d.is_public = true OR auth.uid() = d.created_by)
  ) OR EXISTS (
    SELECT 1 FROM public.debate_participants dp WHERE dp.debate_id = arguments.debate_id AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Participants can add arguments"
  ON public.arguments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.debate_participants dp WHERE dp.id = participant_id AND dp.user_id = auth.uid()
  ));

CREATE POLICY "Participants can edit their arguments"
  ON public.arguments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.debate_participants dp WHERE dp.id = participant_id AND dp.user_id = auth.uid()
  ));

-- 10. Debate templates
CREATE TABLE public.debate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopics JSONB NOT NULL DEFAULT '[]'::jsonb,
  sides JSONB NOT NULL DEFAULT '[]'::jsonb,
  turns_per_subtopic INT NOT NULL DEFAULT 2,
  time_per_turn TEXT NOT NULL DEFAULT '2 min',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.debate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public templates viewable by everyone"
  ON public.debate_templates FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create templates"
  ON public.debate_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their templates"
  ON public.debate_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their templates"
  ON public.debate_templates FOR DELETE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.debate_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Indexes for performance
CREATE INDEX idx_debates_status ON public.debates(status);
CREATE INDEX idx_debates_created_by ON public.debates(created_by);
CREATE INDEX idx_debates_is_public ON public.debates(is_public);
CREATE INDEX idx_debates_join_code ON public.debates(join_code);
CREATE INDEX idx_subtopics_debate_id ON public.debate_subtopics(debate_id);
CREATE INDEX idx_sides_debate_id ON public.debate_sides(debate_id);
CREATE INDEX idx_participants_debate_id ON public.debate_participants(debate_id);
CREATE INDEX idx_participants_user_id ON public.debate_participants(user_id);
CREATE INDEX idx_arguments_debate_id ON public.arguments(debate_id);
CREATE INDEX idx_arguments_parent ON public.arguments(parent_argument_id);
CREATE INDEX idx_templates_created_by ON public.debate_templates(created_by);
